import { useEffect } from 'react'
import { initializeTelegramShell } from '../telegram-shell/telegram'
import { useVaultStore } from '../wallet-vault/useVaultStore'
import { AppProviders } from './AppProviders'
import { AppRouter } from './app-router'

export function App() {
  const initialize = useVaultStore((state) => state.initialize)
  const lock = useVaultStore((state) => state.lock)

  useEffect(() => {
    initializeTelegramShell()
    void initialize()
  }, [initialize])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [lock])

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
