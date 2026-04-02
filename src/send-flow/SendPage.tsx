import {
  CheckCircle,
  Copy,
  PaperPlaneTilt,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toNano } from '@ton/core'
import { z } from 'zod'
import { analyzeAddressRisk, requiresRiskConfirmation } from '../address-risk/addressRisk'
import { copyText, triggerHaptic } from '../telegram-shell/telegram'
import { fetchRecipientState, sendTonTransfer, type TransferResult } from '../ton-wallet/tonClient'
import { formatTonAmount } from '../ton-wallet/tonTransactions'
import { parseRecipientAddress, shortAddress } from '../ton-wallet/tonWallet'
import { useVaultStore } from '../wallet-vault/useVaultStore'
import { useWalletOverview } from '../wallet-home/useWalletOverview'
import { useRecipientRegistryStore } from './useRecipientRegistryStore'

const FEE_BUFFER_NANO = toNano('0.05')
const QUICK_AMOUNTS = ['0.2', '0.5', '1']

const sendSchema = z.object({
  recipient: z.string().trim().min(1, 'Введите адрес получателя'),
  amount: z
    .string()
    .trim()
    .min(1, 'Введите сумму')
    .refine((value) => {
      try {
        return toNano(value) > 0n
      } catch {
        return false
      }
    }, 'Некорректная сумма'),
})

function formatRecipientState(state?: 'active' | 'frozen' | 'uninitialized') {
  switch (state) {
    case 'active':
      return 'Активен'
    case 'frozen':
      return 'Заморожен'
    case 'uninitialized':
      return 'Не активен'
    default:
      return 'Проверка…'
  }
}

function formatTransferStatus(status: TransferResult['status']) {
  return status === 'confirmed' ? 'Подтверждено' : 'Отправлено'
}

export function SendPage() {
  const session = useVaultStore((state) => state.session)
  const overviewQuery = useWalletOverview()
  const rememberRecipient = useRecipientRegistryStore((state) => state.rememberRecipient)
  const recipientEntries = useRecipientRegistryStore((state) => state.entries)

  const recipients = useMemo(
    () =>
      Object.values(recipientEntries).sort((left, right) => right.lastUsedAt.localeCompare(left.lastUsedAt)),
    [recipientEntries],
  )

  const [recipientInput, setRecipientInput] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [trustRecipient, setTrustRecipient] = useState(false)
  const [riskConfirmed, setRiskConfirmed] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const parsedRecipient = (() => {
    try {
      return recipientInput.trim() ? parseRecipientAddress(recipientInput) : null
    } catch {
      return null
    }
  })()

  useEffect(() => {
    setRiskConfirmed(false)
  }, [recipientInput, amountInput])

  const recipientStateQuery = useQuery({
    queryKey: ['recipient-state', parsedRecipient?.addressRaw],
    enabled: Boolean(parsedRecipient),
    queryFn: async () => fetchRecipientState(parsedRecipient!),
    staleTime: 30_000,
  })

  const risks =
    parsedRecipient && session
      ? analyzeAddressRisk({
          selfAddressRaw: session.addressRaw,
          parsedRecipient,
          recipientState: recipientStateQuery.data?.state ?? null,
          registry: recipients,
        })
      : []

  const needsRiskConfirmation = requiresRiskConfirmation(risks)
  const recentRecipients = recipients.slice(0, 4)

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      amountNano: bigint
      recipient: NonNullable<typeof parsedRecipient>
      trustRecipient: boolean
    }) => {
      if (!session) {
        throw new Error('Сначала разблокируйте кошелек')
      }

      return sendTonTransfer({
        session,
        recipient: payload.recipient,
        amountNano: payload.amountNano,
        bounce: recipientStateQuery.data?.state === 'active',
      })
    },
    onSuccess: async (result, variables) => {
      rememberRecipient({
        addressFriendly: variables.recipient.addressFriendly,
        addressRaw: variables.recipient.addressRaw,
        trusted: variables.trustRecipient,
      })
      triggerHaptic(result.status === 'confirmed' ? 'success' : 'warning')
      await overviewQuery.refetch()
    },
    onError: () => {
      triggerHaptic('error')
    },
  })

  if (!session) {
    return null
  }

  const handleSubmit = async () => {
    const validation = sendSchema.safeParse({
      recipient: recipientInput,
      amount: amountInput,
    })

    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message ?? 'Проверьте форму')
      return
    }

    if (!parsedRecipient) {
      setFormError('Некорректный TON-адрес')
      return
    }

    const amountNano = toNano(validation.data.amount)
    const availableBalance = overviewQuery.data?.balanceNano ?? 0n

    if (amountNano + FEE_BUFFER_NANO > availableBalance) {
      setFormError('Недостаточно баланса с учетом комиссии')
      return
    }

    if (needsRiskConfirmation && !riskConfirmed) {
      setFormError('Подтвердите перевод после проверки предупреждений')
      return
    }

    setFormError(null)

    await sendMutation.mutateAsync({
      recipient: parsedRecipient,
      amountNano,
      trustRecipient,
    })
  }

  return (
    <div className="page-screen">
      <section className="page-hero">
        <p className="section-overline">Отправка</p>
        <h2 className="page-title">Перевод TON</h2>
      </section>

      <section className="sheet-card">
        <div className="section-heading">
          <div>
            <p className="section-overline">Перевод</p>
            <h2 className="section-title">Получатель и сумма</h2>
            <p className="section-copy">
              Баланс: {overviewQuery.data ? `${formatTonAmount(overviewQuery.data.balanceNano, 6)} TON` : '--'}
            </p>
          </div>
        </div>

        <label className="form-field">
          <span className="form-label">Адрес получателя</span>
          <input
            className="text-input"
            onChange={(event) => {
              setRecipientInput(event.target.value)
              setFormError(null)
            }}
            placeholder="EQ... или 0:..."
            spellCheck={false}
            type="text"
            value={recipientInput}
          />
        </label>

        {recentRecipients.length > 0 ? (
          <div className="chip-row">
            {recentRecipients.map((recipient) => (
              <button
                className="chip-button"
                key={recipient.addressRaw}
                onClick={() => {
                  setRecipientInput(recipient.addressFriendly)
                  setTrustRecipient(recipient.trusted)
                  setFormError(null)
                  triggerHaptic('impact')
                }}
                type="button"
              >
                {shortAddress(recipient.addressFriendly, 5)}
              </button>
            ))}
          </div>
        ) : null}

        {parsedRecipient ? (
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-label">Адрес</span>
              <strong>{shortAddress(parsedRecipient.addressFriendly, 8)}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Статус</span>
              <strong>
                {recipientStateQuery.isLoading
                  ? 'Проверка…'
                  : formatRecipientState(recipientStateQuery.data?.state)}
              </strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Флаг</span>
              <strong>{parsedRecipient.isTestOnly ? 'testOnly' : 'без флага'}</strong>
            </div>
          </div>
        ) : null}

        {parsedRecipient ? (
          <button
            className="secondary-button"
            onClick={() => {
              void copyText(parsedRecipient.addressFriendly)
              triggerHaptic('impact')
            }}
            type="button"
          >
            <Copy size={18} />
            Копировать адрес
          </button>
        ) : null}

        <label className="form-field">
          <span className="form-label">Сумма</span>
          <input
            className="text-input"
            inputMode="decimal"
            onChange={(event) => {
              setAmountInput(event.target.value)
              setFormError(null)
            }}
            placeholder="0.5"
            type="text"
            value={amountInput}
          />
        </label>

        <div className="chip-row">
          {QUICK_AMOUNTS.map((value) => (
            <button
              className={`chip-button ${amountInput === value ? 'active' : ''}`}
              key={value}
              onClick={() => {
                setAmountInput(value)
                setFormError(null)
              }}
              type="button"
            >
              {value} TON
            </button>
          ))}
        </div>

        <label className="check-row">
          <input
            checked={trustRecipient}
            onChange={(event) => setTrustRecipient(event.target.checked)}
            type="checkbox"
          />
          <span>Запомнить как доверенный адрес.</span>
        </label>

        {overviewQuery.isError ? (
          <div className="notice-card warning">
            <p>Не удалось обновить баланс.</p>
          </div>
        ) : null}
      </section>

      {risks.length > 0 ? (
        <section className="sheet-card danger-sheet">
          <div className="section-heading">
            <div>
              <p className="section-overline">Проверка</p>
              <h2 className="section-title">Предупреждения</h2>
            </div>
          </div>

          <div className="notice-stack">
            {risks.map((risk) => (
              <article className={`notice-card ${risk.severity}`} key={risk.code}>
                <div className="notice-title">
                  <WarningCircle size={18} weight="fill" />
                  <strong>{risk.title}</strong>
                </div>
                <p>{risk.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {needsRiskConfirmation ? (
        <label className="check-row warning-row">
          <input
            checked={riskConfirmed}
            onChange={(event) => setRiskConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span>Подтверждаю перевод.</span>
        </label>
      ) : null}

      {formError ? <p className="error-text">{formError}</p> : null}

      <button
        className="primary-button large-button"
        disabled={sendMutation.isPending || recipientStateQuery.isLoading || overviewQuery.isLoading}
        onClick={() => void handleSubmit()}
        type="button"
      >
        <PaperPlaneTilt size={18} weight="fill" />
        {sendMutation.isPending ? 'Отправка…' : 'Отправить'}
      </button>

      {sendMutation.data ? <TransferResultCard result={sendMutation.data} /> : null}
      {sendMutation.isError ? (
        <section className="sheet-card">
          <div className="notice-card danger">
            <p>Перевод не подтвердился.</p>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function TransferResultCard({ result }: { result: TransferResult }) {
  return (
    <section className="sheet-card">
      <div className="section-heading">
        <div>
          <p className="section-overline">Результат</p>
          <h2 className="section-title">Статус</h2>
        </div>
        <span className={`status-pill ${result.status}`}>{formatTransferStatus(result.status)}</span>
      </div>

      <div className="detail-list">
        <div className="detail-row">
          <span className="detail-label">Получатель</span>
          <strong>{shortAddress(result.recipientFriendly, 8)}</strong>
        </div>
        <div className="detail-row">
          <span className="detail-label">Хэш</span>
          <strong>{result.activity ? shortAddress(result.activity.hashHex, 8) : 'Ожидание'}</strong>
        </div>
      </div>

      <div className="button-row">
        {result.activity ? (
          <button
            className="secondary-button"
            onClick={() => {
              void copyText(result.activity!.hashHex)
              triggerHaptic('impact')
            }}
            type="button"
          >
            <Copy size={18} />
            Копировать хэш
          </button>
        ) : null}

        <span className="result-note">
          {result.status === 'confirmed' ? (
            <>
              <CheckCircle size={16} weight="fill" />
              Подтверждено
            </>
          ) : (
            <>
              <ShieldCheck size={16} weight="fill" />
              В ожидании
            </>
          )}
        </span>
      </div>
    </section>
  )
}
