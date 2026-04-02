import { useQuery } from '@tanstack/react-query'
import { fetchWalletOverview } from '../ton-wallet/tonClient'
import { useVaultStore } from '../wallet-vault/useVaultStore'

export function useWalletOverview() {
  const session = useVaultStore((state) => state.session)

  return useQuery({
    queryKey: ['wallet-overview', session?.addressRaw],
    enabled: Boolean(session),
    queryFn: async () => fetchWalletOverview(session!),
    refetchInterval: 15_000,
    staleTime: 10_000,
  })
}
