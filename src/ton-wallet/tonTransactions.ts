import { fromNano, type Address, type Message, type Transaction } from '@ton/core'

export type WalletActivityDirection = 'in' | 'out' | 'system'
export type WalletActivityStatus = 'confirmed' | 'failed'

export interface WalletActivity {
  amountNano: bigint
  counterpartyFriendly: string | null
  counterpartyRaw: string | null
  direction: WalletActivityDirection
  feeNano: bigint
  hashHex: string
  id: string
  lt: string
  status: WalletActivityStatus
  summary: string
  timestamp: number
}

function trimTonDecimals(value: string, maximumFractionDigits = 4) {
  const [integerPart, fractionPart] = value.split('.')

  if (!fractionPart) {
    return integerPart
  }

  const trimmedFraction = fractionPart.slice(0, maximumFractionDigits).replace(/0+$/, '')

  return trimmedFraction ? `${integerPart}.${trimmedFraction}` : integerPart
}

function formatAddress(address: Address) {
  return {
    raw: address.toRawString(),
    friendly: address.toString({
      urlSafe: true,
      bounceable: false,
      testOnly: true,
    }),
  }
}

function isAbortedTransaction(transaction: Transaction) {
  return 'aborted' in transaction.description && transaction.description.aborted
}

function getFirstInternalOutgoingMessage(transaction: Transaction) {
  return transaction.outMessages.values().find((message) => message.info.type === 'internal')
}

function getInternalValue(message: Message | undefined) {
  return message?.info.type === 'internal' ? message.info.value.coins : 0n
}

export function formatTonAmount(amountNano: bigint, maximumFractionDigits = 4) {
  return trimTonDecimals(fromNano(amountNano), maximumFractionDigits)
}

export function mapTransactionsToActivities(walletAddress: Address, transactions: Transaction[]) {
  return transactions.map((transaction) => {
    const incomingMessage = transaction.inMessage
    const outgoingMessage = getFirstInternalOutgoingMessage(transaction)
    const base = {
      id: `${transaction.lt.toString(10)}-${transaction.hash().toString('hex')}`,
      lt: transaction.lt.toString(10),
      hashHex: transaction.hash().toString('hex'),
      feeNano: transaction.totalFees.coins,
      timestamp: transaction.now,
      status: isAbortedTransaction(transaction) ? 'failed' : 'confirmed',
    } satisfies Omit<WalletActivity, 'amountNano' | 'counterpartyFriendly' | 'counterpartyRaw' | 'direction' | 'summary'>

    if (outgoingMessage?.info.type === 'internal') {
      const counterparty = formatAddress(outgoingMessage.info.dest)

      return {
        ...base,
        direction: 'out',
        amountNano: outgoingMessage.info.value.coins,
        counterpartyFriendly: counterparty.friendly,
        counterpartyRaw: counterparty.raw,
        summary: `Sent to ${counterparty.friendly}`,
      } satisfies WalletActivity
    }

    if (
      incomingMessage?.info.type === 'internal' &&
      !incomingMessage.info.src.equals(walletAddress)
    ) {
      const counterparty = formatAddress(incomingMessage.info.src)

      return {
        ...base,
        direction: 'in',
        amountNano: incomingMessage.info.value.coins,
        counterpartyFriendly: counterparty.friendly,
        counterpartyRaw: counterparty.raw,
        summary: `Received from ${counterparty.friendly}`,
      } satisfies WalletActivity
    }

    return {
      ...base,
      direction: 'system',
      amountNano: getInternalValue(incomingMessage ?? undefined),
      counterpartyFriendly: null,
      counterpartyRaw: null,
      summary: 'Wallet state update',
    } satisfies WalletActivity
  })
}

export function findMatchingOutgoingActivity(
  activities: WalletActivity[],
  recipientRaw: string,
  amountNano: bigint,
) {
  return (
    activities.find(
      (activity) =>
        activity.direction === 'out' &&
        activity.counterpartyRaw === recipientRaw &&
        activity.amountNano === amountNano,
    ) ?? null
  )
}
