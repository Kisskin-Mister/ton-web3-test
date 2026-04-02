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
  recipient: z.string().trim().min(1, 'Recipient address is required'),
  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required')
    .refine((value) => {
      try {
        return toNano(value) > 0n
      } catch {
        return false
      }
    }, 'Enter a valid TON amount'),
})

function formatRecipientState(state?: 'active' | 'frozen' | 'uninitialized') {
  switch (state) {
    case 'active':
      return 'Active contract'
    case 'frozen':
      return 'Frozen contract'
    case 'uninitialized':
      return 'Not deployed'
    default:
      return 'Checking…'
  }
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
        throw new Error('Unlock the wallet first')
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
      setFormError(validation.error.issues[0]?.message ?? 'Form is invalid')
      return
    }

    if (!parsedRecipient) {
      setFormError('Recipient address is not valid TON format')
      return
    }

    const amountNano = toNano(validation.data.amount)
    const availableBalance = overviewQuery.data?.balanceNano ?? 0n

    if (amountNano + FEE_BUFFER_NANO > availableBalance) {
      setFormError('Balance is too low for the amount plus a small fee buffer')
      return
    }

    if (needsRiskConfirmation && !riskConfirmed) {
      setFormError('Review the warnings and confirm the risky transfer before sending')
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
        <p className="section-overline">Send TON</p>
        <h2 className="page-title">Transfer on testnet</h2>
        <p className="page-copy">The wallet normalizes the address, checks recipient state, and keeps risky sends explicit.</p>
      </section>

      <section className="sheet-card">
        <div className="section-heading">
          <div>
            <p className="section-overline">Transfer Details</p>
            <h2 className="section-title">Recipient and amount</h2>
            <p className="section-copy">
              Available balance: {overviewQuery.data ? `${formatTonAmount(overviewQuery.data.balanceNano, 6)} TON` : '--'}
            </p>
          </div>
        </div>

        <label className="form-field">
          <span className="form-label">Recipient address</span>
          <input
            className="text-input"
            onChange={(event) => {
              setRecipientInput(event.target.value)
              setFormError(null)
            }}
            placeholder="EQ... or 0:..."
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
              <span className="detail-label">Normalized</span>
              <strong>{shortAddress(parsedRecipient.addressFriendly, 8)}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Recipient state</span>
              <strong>
                {recipientStateQuery.isLoading
                  ? 'Checking…'
                  : formatRecipientState(recipientStateQuery.data?.state)}
              </strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Network marker</span>
              <strong>{parsedRecipient.isTestOnly ? 'testOnly' : 'not explicit'}</strong>
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
            Copy normalized
          </button>
        ) : null}

        <label className="form-field">
          <span className="form-label">Amount</span>
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
          <span>Mark this recipient as trusted after a successful transfer on this device.</span>
        </label>

        {overviewQuery.isError ? (
          <div className="notice-card warning">
            <p>Wallet balance could not be refreshed. Verify the testnet RPC before sending.</p>
          </div>
        ) : null}
      </section>

      {risks.length > 0 ? (
        <section className="sheet-card danger-sheet">
          <div className="section-heading">
            <div>
              <p className="section-overline">Risk Checks</p>
              <h2 className="section-title">Review before sending</h2>
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
          <span>I reviewed the warnings above and still want to send this testnet transfer.</span>
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
        {sendMutation.isPending ? 'Sending…' : 'Send TON'}
      </button>

      {sendMutation.data ? <TransferResultCard result={sendMutation.data} /> : null}
      {sendMutation.isError ? (
        <section className="sheet-card">
          <div className="notice-card danger">
            <p>The transfer failed before confirmation. Check the recipient, balance, and testnet RPC availability.</p>
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
          <p className="section-overline">Transfer Result</p>
          <h2 className="section-title">Status</h2>
          <p className="section-copy">
            {result.status === 'confirmed'
              ? 'Seqno changed and the latest transaction list was refreshed.'
              : 'The transfer was submitted, but chain confirmation is still pending.'}
          </p>
        </div>
        <span className={`status-pill ${result.status}`}>{result.status}</span>
      </div>

      <div className="detail-list">
        <div className="detail-row">
          <span className="detail-label">Recipient</span>
          <strong>{shortAddress(result.recipientFriendly, 8)}</strong>
        </div>
        <div className="detail-row">
          <span className="detail-label">Tx hash</span>
          <strong>{result.activity ? shortAddress(result.activity.hashHex, 8) : 'Pending lookup'}</strong>
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
            Copy hash
          </button>
        ) : null}

        <span className="result-note">
          {result.status === 'confirmed' ? (
            <>
              <CheckCircle size={16} weight="fill" />
              Confirmed
            </>
          ) : (
            <>
              <ShieldCheck size={16} weight="fill" />
              Awaiting confirmation
            </>
          )}
        </span>
      </div>
    </section>
  )
}
