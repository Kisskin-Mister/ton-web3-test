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
      return 'Активен'
    case 'frozen':
      return 'Заморожен'
    case 'uninitialized':
      return 'Не активен'
    default:
      return 'Обновление'
  }
}

function ActivityRow({ activity }: { activity: WalletActivity }) {
  const amountPrefix = activity.direction === 'in' ? '+' : activity.direction === 'out' ? '-' : ''
  const amountClass = activity.direction === 'system' ? 'system' : activity.direction
  const counterpartyLabel = activity.counterpartyFriendly
    ? shortAddress(activity.counterpartyFriendly, 7)
    : 'Обновление кошелька'
  const statusLabel = activity.status === 'failed' ? 'Ошибка' : 'Подтверждено'

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
            <p className="section-overline">TON Testnet</p>
            <h2 className="hero-value">
              {overviewQuery.data ? `${formatTonAmount(overviewQuery.data.balanceNano, 6)} TON` : '-- TON'}
            </h2>
          </div>
          <span className={`status-pill ${overviewQuery.data?.contractState ?? 'idle'}`}>
            {formatContractState(overviewQuery.data?.contractState)}
          </span>
        </div>

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
            <span className="detail-label">Адрес</span>
            <strong>{shortAddress(overviewQuery.data?.addressFriendly ?? 'Загрузка', 8)}</strong>
          </div>
          <span className="action-inline">
            <Copy size={16} />
            Копировать
          </span>
        </button>

        <div className="hero-footer">
          <span>
            {overviewQuery.data
              ? `Обновлено в ${syncTimeFormatter.format(new Date(overviewQuery.data.lastUpdatedAt))}`
              : 'Обновляем'}
          </span>
          <span>{overviewQuery.isFetching ? 'Загрузка…' : 'Готово'}</span>
        </div>
      </section>

      <section className="action-grid">
        <Link className="action-card primary" to="/receive">
          <QrCode size={22} weight="fill" />
          <div>
            <strong>Получить</strong>
            <span>QR и адрес</span>
          </div>
        </Link>

        <Link className="action-card" to="/send">
          <PaperPlaneTilt size={22} weight="fill" />
          <div>
            <strong>Отправить</strong>
            <span>Перевод</span>
          </div>
        </Link>

        <button className="action-card" onClick={() => void overviewQuery.refetch()} type="button">
          <ArrowsClockwise size={22} weight="fill" />
          <div>
            <strong>Обновить</strong>
            <span>Баланс</span>
          </div>
        </button>
      </section>

      <section className="sheet-card">
        <div className="section-heading">
          <div>
            <p className="section-overline">История</p>
            <h2 className="section-title">Транзакции</h2>
          </div>
          <span className="header-chip">{filteredActivities.length}</span>
        </div>

        <label className="search-field">
          <MagnifyingGlass size={18} />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по адресу или хэшу"
            type="search"
            value={search}
          />
        </label>

        {overviewQuery.isLoading ? <p className="helper-text">Загрузка…</p> : null}
        {overviewQuery.isError ? (
          <div className="notice-card warning">
            <p>Не удалось загрузить данные сети.</p>
          </div>
        ) : null}
        {!overviewQuery.isLoading && filteredActivities.length === 0 ? (
          <p className="helper-text">Ничего не найдено.</p>
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
