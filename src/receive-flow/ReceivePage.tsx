import { Copy, QrCode } from '@phosphor-icons/react'
import { QRCodeSVG } from 'qrcode.react'
import { copyText, triggerHaptic } from '../telegram-shell/telegram'
import { useVaultStore } from '../wallet-vault/useVaultStore'

export function ReceivePage() {
  const session = useVaultStore((state) => state.session)

  if (!session) {
    return null
  }

  return (
    <div className="page-screen">
      <section className="page-hero">
        <p className="section-overline">Receive TON</p>
        <h2 className="page-title">Share your wallet</h2>
        <p className="page-copy">Use the friendly testnet address or let another wallet scan the QR code.</p>
      </section>

      <section className="sheet-card receive-layout">
        <div className="qr-shell">
          <div className="qr-frame">
            <QRCodeSVG
              bgColor="transparent"
              fgColor="currentColor"
              includeMargin
              level="M"
              size={200}
              value={session.addressFriendly}
            />
          </div>
        </div>

        <div className="receive-copy">
          <div className="section-heading">
            <div>
              <p className="section-overline">Friendly Address</p>
              <h2 className="section-title">TON testnet</h2>
              <p className="section-copy">Non-bounceable format, ready to paste into another testnet wallet.</p>
            </div>
          </div>

          <code className="mono-block">{session.addressFriendly}</code>

          <button
            className="primary-button"
            onClick={() => {
              void copyText(session.addressFriendly)
              triggerHaptic('success')
            }}
            type="button"
          >
            <Copy size={18} />
            Copy address
          </button>
        </div>
      </section>

      <section className="sheet-card">
        <div className="detail-list">
          <div className="detail-row">
            <span className="detail-label">Network</span>
            <strong>TON testnet</strong>
          </div>
          <div className="detail-row">
            <span className="detail-label">QR payload</span>
            <strong>Friendly wallet address</strong>
          </div>
          <div className="detail-row">
            <span className="detail-label">Tip</span>
            <strong>Send a small test amount first</strong>
          </div>
        </div>

        <div className="notice-card info">
          <div className="notice-title">
            <QrCode size={18} weight="fill" />
            <strong>Share flow</strong>
          </div>
          <p>When in doubt, copy the address instead of relying on screenshots to avoid truncation mistakes.</p>
        </div>
      </section>
    </div>
  )
}
