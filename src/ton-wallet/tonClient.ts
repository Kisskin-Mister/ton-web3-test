import { Address, SendMode, internal } from '@ton/core'
import { getHttpEndpoint } from '@orbs-network/ton-access'
import { TonClient } from '@ton/ton'
import { findMatchingOutgoingActivity, mapTransactionsToActivities, type WalletActivity } from './tonTransactions'
import type { ParsedRecipientAddress, WalletSession } from './tonWallet'

export interface WalletOverview {
  addressFriendly: string
  addressRaw: string
  balanceNano: bigint
  contractState: 'active' | 'frozen' | 'uninitialized'
  lastUpdatedAt: string
  transactions: WalletActivity[]
}

export interface RecipientInspection {
  balanceNano: bigint
  isDeployed: boolean
  state: 'active' | 'frozen' | 'uninitialized'
}

export interface TransferResult {
  activity: WalletActivity | null
  recipientFriendly: string
  status: 'confirmed' | 'submitted'
}

let tonClientPromise: Promise<TonClient> | null = null

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function getTonClient() {
  if (!tonClientPromise) {
    tonClientPromise = (async () => {
      const endpoint = await getHttpEndpoint({ network: 'testnet' })
      return new TonClient({ endpoint })
    })()
  }

  return tonClientPromise
}

export async function fetchWalletOverview(session: WalletSession): Promise<WalletOverview> {
  const client = await getTonClient()

  const [balanceNano, contractState, transactions] = await Promise.all([
    client.getBalance(session.wallet.address),
    client.getContractState(session.wallet.address),
    client
      .getTransactions(session.wallet.address, {
        limit: 20,
        archival: true,
      })
      .catch(() => []),
  ])

  return {
    addressFriendly: session.addressFriendly,
    addressRaw: session.addressRaw,
    balanceNano,
    contractState: contractState.state,
    lastUpdatedAt: new Date().toISOString(),
    transactions: mapTransactionsToActivities(session.wallet.address, transactions),
  }
}

export async function fetchRecipientState(recipient: ParsedRecipientAddress): Promise<RecipientInspection> {
  const client = await getTonClient()
  const [state, isDeployed] = await Promise.all([
    client.getContractState(recipient.address),
    client.isContractDeployed(recipient.address),
  ])

  return {
    state: state.state,
    balanceNano: state.balance,
    isDeployed,
  }
}

async function waitForSeqnoChange(session: WalletSession, initialSeqno: number) {
  const client = await getTonClient()
  const wallet = client.open(session.wallet)

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await sleep(1_500)

    const currentSeqno = await wallet.getSeqno()

    if (currentSeqno > initialSeqno) {
      return true
    }
  }

  return false
}

export async function sendTonTransfer(args: {
  amountNano: bigint
  bounce: boolean
  recipient: ParsedRecipientAddress
  session: WalletSession
}) {
  const client = await getTonClient()
  const wallet = client.open(args.session.wallet)
  const startingSeqno = await wallet.getSeqno()

  await wallet.sendTransfer({
    seqno: startingSeqno,
    secretKey: args.session.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    messages: [
      internal({
        to: args.recipient.address,
        value: args.amountNano,
        bounce: args.bounce,
      }),
    ],
  })

  const confirmed = await waitForSeqnoChange(args.session, startingSeqno)

  if (!confirmed) {
    return {
      status: 'submitted',
      recipientFriendly: args.recipient.addressFriendly,
      activity: null,
    } satisfies TransferResult
  }

  const latestTransactions = await client.getTransactions(args.session.wallet.address, {
    limit: 10,
    archival: true,
  })
  const latestActivities = mapTransactionsToActivities(args.session.wallet.address, latestTransactions)

  return {
    status: 'confirmed',
    recipientFriendly: args.recipient.addressFriendly,
    activity: findMatchingOutgoingActivity(
      latestActivities,
      args.recipient.addressRaw,
      args.amountNano,
    ),
  } satisfies TransferResult
}

export function normalizeRecipientState(recipientState?: RecipientInspection | null) {
  return recipientState?.state ?? null
}

export function addressFromRaw(rawAddress: string) {
  return Address.parseRaw(rawAddress)
}
