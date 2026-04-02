import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecipientRecord {
  addressFriendly: string
  addressRaw: string
  lastUsedAt: string
  timesSent: number
  trusted: boolean
}

interface RecipientRegistryState {
  entries: Record<string, RecipientRecord>
  rememberRecipient: (recipient: {
    addressFriendly: string
    addressRaw: string
    trusted: boolean
  }) => void
}

export const useRecipientRegistryStore = create<RecipientRegistryState>()(
  persist(
    (set) => ({
      entries: {},
      rememberRecipient(recipient) {
        set((state) => {
          const existing = state.entries[recipient.addressRaw]

          return {
            entries: {
              ...state.entries,
              [recipient.addressRaw]: {
                addressFriendly: recipient.addressFriendly,
                addressRaw: recipient.addressRaw,
                trusted: existing?.trusted ?? recipient.trusted,
                timesSent: (existing?.timesSent ?? 0) + 1,
                lastUsedAt: new Date().toISOString(),
              },
            },
          }
        })
      },
    }),
    {
      name: 'ton-testnet-mini-wallet:recipients',
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
)
