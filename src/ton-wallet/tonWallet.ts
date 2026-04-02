import { Address } from '@ton/core'
import { mnemonicNew, mnemonicToWalletKey, mnemonicValidate } from '@ton/crypto'
import { WalletContractV5R1 } from '@ton/ton'

export const TON_TESTNET_GLOBAL_ID = -3

export interface WalletSession {
  addressFriendly: string
  addressRaw: string
  mnemonic: string[]
  publicKey: Buffer
  publicKeyHex: string
  secretKey: Buffer
  wallet: WalletContractV5R1
}

export interface ParsedRecipientAddress {
  address: Address
  addressFriendly: string
  addressRaw: string
  input: string
  isBounceable: boolean
  isFriendly: boolean
  isRaw: boolean
  isTestOnly: boolean
}

export async function generateMnemonicWords() {
  return mnemonicNew(24)
}

export function normalizeMnemonicWords(input: string | string[]) {
  const words = Array.isArray(input) ? input : input.split(/\s+/)

  return words
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean)
}

export async function buildWalletFromMnemonic(mnemonicInput: string | string[]) {
  const mnemonic = normalizeMnemonicWords(mnemonicInput)

  if (mnemonic.length !== 24) {
    throw new Error('TON wallet mnemonic must contain exactly 24 words')
  }

  const isValid = await mnemonicValidate(mnemonic)

  if (!isValid) {
    throw new Error('Mnemonic phrase is invalid')
  }

  const keyPair = await mnemonicToWalletKey(mnemonic)
  const wallet = WalletContractV5R1.create({
    publicKey: keyPair.publicKey,
    walletId: {
      networkGlobalId: TON_TESTNET_GLOBAL_ID,
      context: {
        walletVersion: 'v5r1',
        workchain: 0,
        subwalletNumber: 0,
      },
    },
  })

  return {
    mnemonic,
    wallet,
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    publicKeyHex: keyPair.publicKey.toString('hex'),
    addressRaw: wallet.address.toRawString(),
    addressFriendly: wallet.address.toString({
      urlSafe: true,
      bounceable: false,
      testOnly: true,
    }),
  } satisfies WalletSession
}

export function parseRecipientAddress(input: string) {
  const trimmedInput = input.trim()

  if (!trimmedInput) {
    throw new Error('Recipient address is required')
  }

  if (Address.isFriendly(trimmedInput)) {
    const parsed = Address.parseFriendly(trimmedInput)

    return {
      input: trimmedInput,
      address: parsed.address,
      addressRaw: parsed.address.toRawString(),
      addressFriendly: parsed.address.toString({
        urlSafe: true,
        bounceable: false,
        testOnly: true,
      }),
      isFriendly: true,
      isRaw: false,
      isBounceable: parsed.isBounceable,
      isTestOnly: parsed.isTestOnly,
    } satisfies ParsedRecipientAddress
  }

  if (Address.isRaw(trimmedInput)) {
    const parsed = Address.parseRaw(trimmedInput)

    return {
      input: trimmedInput,
      address: parsed,
      addressRaw: parsed.toRawString(),
      addressFriendly: parsed.toString({
        urlSafe: true,
        bounceable: false,
        testOnly: true,
      }),
      isFriendly: false,
      isRaw: true,
      isBounceable: false,
      isTestOnly: false,
    } satisfies ParsedRecipientAddress
  }

  const parsed = Address.parse(trimmedInput)

  return {
    input: trimmedInput,
    address: parsed,
    addressRaw: parsed.toRawString(),
    addressFriendly: parsed.toString({
      urlSafe: true,
      bounceable: false,
      testOnly: true,
    }),
    isFriendly: false,
    isRaw: false,
    isBounceable: false,
    isTestOnly: false,
  } satisfies ParsedRecipientAddress
}

export function shortAddress(address: string, visibleChars = 6) {
  if (address.length <= visibleChars * 2 + 3) {
    return address
  }

  return `${address.slice(0, visibleChars)}...${address.slice(-visibleChars)}`
}
