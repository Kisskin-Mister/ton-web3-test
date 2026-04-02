import { Copy } from '@phosphor-icons/react'
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
        <p className="section-overline">Получение</p>
        <h2 className="page-title">Ваш адрес</h2>
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
              <p className="section-overline">TON Testnet</p>
              <h2 className="section-title">Адрес кошелька</h2>
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
            Копировать
          </button>
        </div>
      </section>
    </div>
  )
}
