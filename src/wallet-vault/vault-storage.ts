import type { EncryptedMnemonicEnvelope } from './vault-crypto'

const VAULT_STORAGE_KEY = 'ton-testnet-mini-wallet:vault'

export function readStoredVault() {
  const rawValue = localStorage.getItem(VAULT_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as EncryptedMnemonicEnvelope
  } catch {
    localStorage.removeItem(VAULT_STORAGE_KEY)
    return null
  }
}

export function writeStoredVault(envelope: EncryptedMnemonicEnvelope) {
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(envelope))
}

export function clearStoredVault() {
  localStorage.removeItem(VAULT_STORAGE_KEY)
}
