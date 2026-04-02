import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVaultStore } from '../wallet-vault/useVaultStore'
import { SendPage } from './SendPage'
import { useRecipientRegistryStore } from './useRecipientRegistryStore'

const useWalletOverviewMock = vi.fn()

vi.mock('../wallet-home/useWalletOverview', () => ({
  useWalletOverview: () => useWalletOverviewMock(),
}))

describe('SendPage', () => {
  beforeEach(() => {
    localStorage.clear()

    useWalletOverviewMock.mockReturnValue({
      data: {
        balanceNano: 2_500_000_000n,
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    })

    useVaultStore.setState({
      session: {
        addressFriendly: 'EQ-test-wallet',
        addressRaw: '0:test-wallet',
      } as never,
      status: 'unlocked',
      error: null,
      isBusy: false,
    })

    useRecipientRegistryStore.setState({
      entries: {
        '0:recipient-one': {
          addressFriendly: 'addr-one',
          addressRaw: '0:recipient-one',
          trusted: true,
          lastUsedAt: '2026-04-02T10:00:00.000Z',
          timesSent: 2,
        },
        '0:recipient-two': {
          addressFriendly: 'addr-two',
          addressRaw: '0:recipient-two',
          trusted: false,
          lastUsedAt: '2026-04-02T09:00:00.000Z',
          timesSent: 1,
        },
      },
    })
  })

  it('renders recent recipients without crashing', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <SendPage />
      </QueryClientProvider>,
    )

    expect(screen.getByText('Transfer on testnet')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'addr-one' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'addr-two' })).toBeTruthy()
  })
})
