import { create } from 'zustand'
import { buildWalletFromMnemonic, type WalletSession } from '../ton-wallet/tonWallet'
import { clearStoredVault, readStoredVault, writeStoredVault } from './vault-storage'
import { decryptMnemonic, encryptMnemonic, type EncryptedMnemonicEnvelope } from './vault-crypto'

export type VaultStatus = 'checking' | 'empty' | 'locked' | 'unlocked'

interface VaultState {
  clearError: () => void
  clearVault: () => void
  createVault: (args: { mnemonic: string[]; password: string }) => Promise<void>
  envelope: EncryptedMnemonicEnvelope | null
  error: string | null
  initialize: () => Promise<void>
  isBusy: boolean
  lock: () => void
  session: WalletSession | null
  status: VaultStatus
  unlock: (password: string) => Promise<void>
}

function normalizeError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'checking',
  envelope: null,
  session: null,
  error: null,
  isBusy: false,
  async initialize() {
    const storedEnvelope = readStoredVault()

    set({
      envelope: storedEnvelope,
      session: null,
      error: null,
      status: storedEnvelope ? 'locked' : 'empty',
    })
  },
  async createVault({ mnemonic, password }) {
    set({ isBusy: true, error: null })

    try {
      const session = await buildWalletFromMnemonic(mnemonic)
      const envelope = await encryptMnemonic(session.mnemonic, password, {
        addressFriendly: session.addressFriendly,
        addressRaw: session.addressRaw,
        publicKeyHex: session.publicKeyHex,
        createdAt: new Date().toISOString(),
      })

      writeStoredVault(envelope)

      set({
        envelope,
        session,
        status: 'unlocked',
        error: null,
        isBusy: false,
      })
    } catch (error) {
      set({
        isBusy: false,
        error: normalizeError(error, 'Failed to create the encrypted vault'),
      })

      throw error
    }
  },
  async unlock(password) {
    const envelope = get().envelope ?? readStoredVault()

    if (!envelope) {
      set({
        status: 'empty',
        error: 'No local vault found on this device',
      })
      return
    }

    set({ isBusy: true, error: null })

    try {
      const mnemonic = await decryptMnemonic(envelope, password)
      const session = await buildWalletFromMnemonic(mnemonic)

      set({
        envelope,
        session,
        status: 'unlocked',
        error: null,
        isBusy: false,
      })
    } catch (error) {
      set({
        isBusy: false,
        status: 'locked',
        error: normalizeError(error, 'Failed to unlock the local vault'),
      })

      throw error
    }
  },
  lock() {
    if (!get().envelope) {
      set({
        session: null,
        status: 'empty',
      })
      return
    }

    set({
      session: null,
      status: 'locked',
      error: null,
    })
  },
  clearVault() {
    clearStoredVault()

    set({
      envelope: null,
      session: null,
      status: 'empty',
      error: null,
      isBusy: false,
    })
  },
  clearError() {
    set({ error: null })
  },
}))
