import { LockSimple, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { triggerHaptic } from '../telegram-shell/telegram'
import { shortAddress } from '../ton-wallet/tonWallet'
import { useVaultStore } from '../wallet-vault/useVaultStore'

export function UnlockPage() {
  const envelope = useVaultStore((state) => state.envelope)
  const unlock = useVaultStore((state) => state.unlock)
  const clearVault = useVaultStore((state) => state.clearVault)
  const error = useVaultStore((state) => state.error)
  const clearError = useVaultStore((state) => state.clearError)
  const isBusy = useVaultStore((state) => state.isBusy)

  const [password, setPassword] = useState('')

  const handleUnlock = async () => {
    clearError()

    try {
      await unlock(password)
      setPassword('')
      triggerHaptic('success')
    } catch {
      triggerHaptic('error')
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card auth-hero">
        <div className="auth-icon" aria-hidden="true">
          <LockSimple size={28} weight="fill" />
        </div>
        <p className="section-overline">Encrypted Local Vault</p>
        <h1 className="auth-title">Unlock wallet</h1>
        <p className="auth-subtitle">The mnemonic stays encrypted on this device and is decrypted only in memory.</p>
        <div className="header-chip">{shortAddress(envelope?.meta.addressFriendly ?? 'Unknown wallet', 8)}</div>
      </section>

      <section className="auth-card">
        <label className="form-field">
          <span className="form-label">Password</span>
          <input
            autoComplete="current-password"
            className="text-input"
            onChange={(event) => {
              setPassword(event.target.value)
              clearError()
            }}
            placeholder="Enter vault password"
            type="password"
            value={password}
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button className="primary-button large-button" disabled={isBusy} onClick={() => void handleUnlock()} type="button">
          <LockSimple size={18} weight="fill" />
          {isBusy ? 'Unlocking…' : 'Unlock'}
        </button>

        <button
          className="secondary-button destructive-button"
          onClick={() => {
            const confirmed = window.confirm('Delete the local encrypted vault from this device?')

            if (confirmed) {
              clearVault()
            }
          }}
          type="button"
        >
          <Trash size={18} />
          Reset local vault
        </button>
      </section>
    </div>
  )
}
