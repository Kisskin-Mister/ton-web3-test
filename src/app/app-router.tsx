import { House, LockSimple, PaperPlaneTilt, QrCode, Wallet } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { HashRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { bindTelegramBackButton, isTelegramMiniApp } from '../telegram-shell/telegram'
import { OnboardingPage } from '../onboarding/OnboardingPage'
import { ReceivePage } from '../receive-flow/ReceivePage'
import { SendPage } from '../send-flow/SendPage'
import { shortAddress } from '../ton-wallet/tonWallet'
import { UnlockPage } from '../unlock-flow/UnlockPage'
import { useVaultStore } from '../wallet-vault/useVaultStore'
import { WalletHomePage } from '../wallet-home/WalletHomePage'

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Кошелек',
    icon: House,
    end: true,
  },
  {
    to: '/receive',
    label: 'Получить',
    icon: QrCode,
    end: false,
  },
  {
    to: '/send',
    label: 'Отправить',
    icon: PaperPlaneTilt,
    end: false,
  },
] as const

function AppLoadingScreen() {
  return (
    <div className="auth-shell loading-shell">
      <section className="auth-card loading-card">
        <div className="loading-spinner" aria-hidden="true" />
        <p className="section-overline">TON Testnet</p>
        <h1 className="auth-title">Загрузка</h1>
        <p className="auth-subtitle">Проверяем локальное хранилище.</p>
      </section>
    </div>
  )
}

function WalletShell() {
  const session = useVaultStore((state) => state.session)
  const lock = useVaultStore((state) => state.lock)
  const navigate = useNavigate()
  const location = useLocation()
  const showBackButton = location.pathname !== '/'
  const modeLabel = isTelegramMiniApp() ? 'Telegram' : 'Браузер'

  useEffect(() => bindTelegramBackButton(showBackButton, () => navigate(-1)), [navigate, showBackButton])

  if (!session) {
    return <Navigate replace to="/unlock" />
  }

  return (
    <div className="wallet-shell">
      <header className="wallet-header">
        <div className="wallet-header-main">
          <div className="wallet-avatar" aria-hidden="true">
            <Wallet size={20} weight="fill" />
          </div>
          <div className="wallet-header-copy">
            <p className="wallet-header-kicker">{modeLabel}</p>
            <h1 className="wallet-header-title">TON Кошелек</h1>
          </div>
        </div>

        <div className="wallet-header-side">
          <span className="header-chip">{shortAddress(session.addressFriendly, 5)}</span>
          <button
            aria-label="Заблокировать кошелек"
            className="icon-button"
            onClick={lock}
            type="button"
          >
            <LockSimple size={18} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="page-motion" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <nav className="tab-bar" aria-label="Навигация">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
              end={item.end}
              to={item.to}
            >
              <Icon size={20} weight="fill" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

export function AppRouter() {
  const status = useVaultStore((state) => state.status)

  if (status === 'checking') {
    return <AppLoadingScreen />
  }

  return (
    <HashRouter>
      {status === 'empty' ? (
        <Routes>
          <Route element={<OnboardingPage />} path="*" />
        </Routes>
      ) : null}

      {status === 'locked' ? (
        <Routes>
          <Route element={<UnlockPage />} path="*" />
        </Routes>
      ) : null}

      {status === 'unlocked' ? (
        <Routes>
          <Route element={<WalletShell />}>
            <Route element={<WalletHomePage />} path="/" />
            <Route element={<ReceivePage />} path="/receive" />
            <Route element={<SendPage />} path="/send" />
          </Route>
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      ) : null}
    </HashRouter>
  )
}
