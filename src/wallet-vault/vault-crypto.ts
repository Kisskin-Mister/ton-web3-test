import { Buffer } from 'buffer'

export const MIN_PASSWORD_LENGTH = 8
const KDF_ITERATIONS = 210_000
const SALT_LENGTH = 16
const IV_LENGTH = 12

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export interface VaultPublicMeta {
  addressFriendly: string
  addressRaw: string
  createdAt: string
  publicKeyHex: string
}

export interface EncryptedMnemonicEnvelope {
  cipher: 'AES-GCM'
  ciphertext: string
  iv: string
  kdf: {
    hash: 'SHA-256'
    iterations: number
    name: 'PBKDF2'
  }
  meta: VaultPublicMeta
  salt: string
  version: 1
}

function getCryptoOrThrow() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available in this environment')
  }

  return globalThis.crypto
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length)
  getCryptoOrThrow().getRandomValues(bytes)
  return bytes
}

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64')
}

function base64ToBytes(value: string) {
  return Uint8Array.from(Buffer.from(value, 'base64'))
}

async function deriveAesKey(password: string, salt: Uint8Array, usages: KeyUsage[]) {
  const cryptoApi = getCryptoOrThrow()
  const normalizedPassword = encoder.encode(password.normalize('NFKC'))
  const keyMaterial = await cryptoApi.subtle.importKey('raw', normalizedPassword, 'PBKDF2', false, ['deriveKey'])

  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: KDF_ITERATIONS,
      salt: salt as BufferSource,
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    usages,
  )
}

export async function encryptMnemonic(words: string[], password: string, meta: VaultPublicMeta) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
  }

  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const key = await deriveAesKey(password, salt, ['encrypt'])
  const payload = encoder.encode(JSON.stringify({ mnemonic: words }))
  const encrypted = await getCryptoOrThrow().subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    payload,
  )

  return {
    version: 1,
    cipher: 'AES-GCM',
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: KDF_ITERATIONS,
    },
    meta,
  } satisfies EncryptedMnemonicEnvelope
}

export async function decryptMnemonic(envelope: EncryptedMnemonicEnvelope, password: string) {
  const iv = base64ToBytes(envelope.iv)
  const salt = base64ToBytes(envelope.salt)
  const ciphertext = base64ToBytes(envelope.ciphertext)
  const key = await deriveAesKey(password, salt, ['decrypt'])

  try {
    const decrypted = await getCryptoOrThrow().subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    )
    const parsed = JSON.parse(decoder.decode(decrypted)) as { mnemonic?: unknown }

    if (!Array.isArray(parsed.mnemonic) || parsed.mnemonic.some((word) => typeof word !== 'string')) {
      throw new Error('Vault payload is malformed')
    }

    return parsed.mnemonic
  } catch {
    throw new Error('Wrong password or corrupted vault payload')
  }
}
