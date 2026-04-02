import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowsClockwise,
  Copy,
  MagnifyingGlass,
  PaperPlaneTilt,
  QrCode,
} from '@phosphor-icons/react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { copyText, triggerHaptic } from '../telegram-shell/telegram'
import { formatTonAmount, type WalletActivity } from '../ton-wallet/tonTransactions'
import { shortAddress } from '../ton-wallet/tonWallet'
import { useWalletOverview } from './useWalletOverview'

const activityDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const syncTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
})

function formatContractState(state?: 'active' | 'frozen' | 'uninitialized') {
  switch (state) {
    case 'active':
      return 'Active'
    case 'frozen':
      return 'Frozen'
    case 'uninitialized':
      return 'Not deployed'
    default:
      return 'Updating'
  }
}

function ActivityRow({ activity }: { activity: WalletActivity }) {
  const amountPrefix = activity.direction === 'in' ? '+' : activity.direction === 'out' ? '-' : ''
  const amountClass = activity.direction === 'system' ? 'system' : activity.direction
  const counterpartyLabel = activity.counterpartyFriendly
    ? shortAddress(activity.counterpartyFriendly, 7)
    : 'Wallet state update'
  const statusLabel = activity.status === 'failed' ? 'Failed' : 'Confirmed'

  return (
    <article className="activity-row">
      <div className={`activity-icon ${amountClass}`} aria-hidden="true">
        {activity.direction === 'in' ? <ArrowDownLeft size={20} weight="bold" /> : null}
        {activity.direction === 'out' ? <ArrowUpRight size={20} weight="bold" /> : null}
        {activity.direction === 'system' ? <ArrowsClockwise size={20} weight="bold" /> : null}
      </div>

      <div className="activity-copy">
        <div className="activity-head">
          <strong className="activity-title">{counterpartyLabel}</strong>
          <strong className={`activity-amount ${amountClass}`}>
            {amountPrefix}
            {formatTonAmount(activity.amountNano, 6)} TON
          </strong>
        </div>

        <p className="activity-subtitle">
          {activityDateFormatter.format(new Date(activity.timestamp * 1_000))} · {statusLabel}
        </p>
      </div>
    </article>
  )
}

export function WalletHomePage() {
  const overviewQuery = useWalletOverview()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())

  const filteredActivities =
    overviewQuery.data?.transactions.filter((activity) => {
      if (!deferredSearch) {
        return true
      }

      return [activity.summary, activity.counterpartyFriendly, activity.counterpartyRaw, activity.hashHex]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(deferredSearch))
    }) ?? []

  return (
    <div className="page-screen">
      <section className="hero-card">
        <div className="hero-head">
          <div>
            <p className="section-overline">TON Testnet Wallet</p>
            <h2 className="hero-value">
              {overviewQuery.data ? `${formatTonAmount(overviewQuery.data.balanceNano, 6)} TON` : '-- TON'}
            </h2>
          </div>
          <span className={`status-pill ${overviewQuery.data?.contractState ?? 'idle'}`}>
            {formatContractState(overviewQuery.data?.contractState)}
          </span>
        </div>

        <p className="hero-subtitle">
          Balance, address, and the latest activity in a Telegram-style wallet shell.
        </p>

        <button
          className="address-strip"
          onClick={() => {
            if (!overviewQuery.data) {
              return
            }

            void copyText(overviewQuery.data.addressFriendly)
            triggerHaptic('impact')
          }}
          type="button"
        >
          <div className="address-main">
            <span className="detail-label">Wallet address</span>
            <strong>{shortAddress(overviewQuery.data?.addressFriendly ?? 'Loading address', 8)}</strong>
          </div>
          <span className="action-inline">
            <Copy size={16} />
            Copy
          </span>
        </button>

        <div className="hero-footer">
          <span>
            {overviewQuery.data
              ? `Updated ${syncTimeFormatter.format(new Date(overviewQuery.data.lastUpdatedAt))}`
              : 'Updating wallet overview'}
          </span>
          <span>{overviewQuery.isFetching ? 'Refreshing…' : 'Synced'}</span>
        </div>
      </section>

      <section className="action-grid">
        <Link className="action-card primary" to="/receive">
          <QrCode size={22} weight="fill" />
          <div>
            <strong>Receive</strong>
            <span>Address and QR</span>
          </div>
        </Link>

        <Link className="action-card" to="/send">
          <PaperPlaneTilt size={22} weight="fill" />
          <div>
            <strong>Send</strong>
            <span>Transfer TON</span>
          </div>
        </Link>

        <button className="action-card" onClick={() => void overviewQuery.refetch()} type="button">
          <ArrowsClockwise size={22} weight="fill" />
          <div>
            <strong>Refresh</strong>
            <span>Pull latest data</span>
          </div>
        </button>
      </section>

      <section className="sheet-card">
        <div className="section-heading">
          <div>
            <p className="section-overline">Recent Activity</p>
            <h2 className="section-title">Transactions</h2>
            <p className="section-copy">Search by address, hash, or summary.</p>
          </div>
          <span className="header-chip">{filteredActivities.length}</span>
        </div>

        <label className="search-field">
          <MagnifyingGlass size={18} />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by address or tx hash"
            type="search"
            value={search}
          />
        </label>

        {overviewQuery.isLoading ? <p className="helper-text">Loading wallet overview…</p> : null}
        {overviewQuery.isError ? (
          <div className="notice-card warning">
            <p>Failed to load blockchain data. Check the testnet RPC and try refreshing again.</p>
          </div>
        ) : null}
        {!overviewQuery.isLoading && filteredActivities.length === 0 ? (
          <p className="helper-text">No transactions matched the current filter.</p>
        ) : null}

        <div className="activity-list">
          {filteredActivities.map((activity) => (
            <ActivityRow activity={activity} key={activity.id} />
          ))}
        </div>
      </section>
    </div>
  )
}
