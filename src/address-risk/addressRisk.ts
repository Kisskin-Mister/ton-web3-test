import { distance } from 'fastest-levenshtein'
import type { ParsedRecipientAddress } from '../ton-wallet/tonWallet'
import type { RecipientRecord } from '../send-flow/useRecipientRegistryStore'

export type RiskSeverity = 'info' | 'warning' | 'danger'

export interface AddressRisk {
  code: string
  description: string
  severity: RiskSeverity
  title: string
}

interface AddressRiskInput {
  parsedRecipient: ParsedRecipientAddress
  recipientState: 'active' | 'frozen' | 'uninitialized' | null
  registry: RecipientRecord[]
  selfAddressRaw: string
}

function commonPrefixLength(left: string, right: string) {
  let index = 0

  while (index < left.length && index < right.length && left[index] === right[index]) {
    index += 1
  }

  return index
}

function commonSuffixLength(left: string, right: string) {
  let index = 0

  while (
    index < left.length &&
    index < right.length &&
    left[left.length - 1 - index] === right[right.length - 1 - index]
  ) {
    index += 1
  }

  return index
}

function findSuspiciouslySimilarRecipient(recipientRaw: string, registry: RecipientRecord[]) {
  return (
    registry.find((knownRecipient) => {
      if (knownRecipient.addressRaw === recipientRaw || knownRecipient.addressRaw.length !== recipientRaw.length) {
        return false
      }

      const diff = distance(knownRecipient.addressRaw, recipientRaw)
      const prefix = commonPrefixLength(knownRecipient.addressRaw, recipientRaw)
      const suffix = commonSuffixLength(knownRecipient.addressRaw, recipientRaw)

      return diff <= 6 && prefix >= 10 && suffix >= 8
    }) ?? null
  )
}

const severityOrder: Record<RiskSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
}

export function analyzeAddressRisk(input: AddressRiskInput) {
  const risks: AddressRisk[] = []
  const knownRecipient = input.registry.find(
    (recipient) => recipient.addressRaw === input.parsedRecipient.addressRaw,
  )
  const similarRecipient = findSuspiciouslySimilarRecipient(
    input.parsedRecipient.addressRaw,
    input.registry,
  )

  if (input.parsedRecipient.addressRaw === input.selfAddressRaw) {
    risks.push({
      code: 'self-transfer',
      severity: 'danger',
      title: 'Recipient is your own wallet',
      description: 'This address matches the currently unlocked wallet. Double-check that the send target was intentional.',
    })
  }

  if (input.parsedRecipient.isRaw) {
    risks.push({
      code: 'raw-address',
      severity: 'warning',
      title: 'Raw TON address pasted',
      description: 'Raw format is harder for humans to verify. Prefer the friendly testnet format when possible.',
    })
  }

  if (input.parsedRecipient.isFriendly && !input.parsedRecipient.isTestOnly) {
    risks.push({
      code: 'missing-testnet-flag',
      severity: 'warning',
      title: 'Friendly address is missing the testnet marker',
      description: 'The pasted address does not explicitly declare itself as testnet-safe. Verify the target before sending.',
    })
  }

  if (input.recipientState === 'uninitialized') {
    risks.push({
      code: 'recipient-not-active',
      severity: 'warning',
      title: 'Recipient wallet is not active yet',
      description: 'The destination contract is not deployed. The transfer may initialize a fresh wallet or may be unexpected.',
    })
  }

  if (input.recipientState === 'frozen') {
    risks.push({
      code: 'recipient-frozen',
      severity: 'danger',
      title: 'Recipient wallet is frozen',
      description: 'This destination is in a frozen state. Sending there is unusual and should be treated as high risk.',
    })
  }

  if (similarRecipient) {
    risks.push({
      code: 'similar-recipient',
      severity: 'danger',
      title: 'Recipient looks similar to a known address',
      description: `This address is close to ${similarRecipient.addressFriendly}. Clipboard substitution or manual copy mistakes are realistic here.`,
    })
  }

  if (!knownRecipient && !similarRecipient) {
    risks.push({
      code: 'new-recipient',
      severity: 'info',
      title: 'First time sending to this address',
      description: 'This target is not in the local recipient history yet.',
    })
  }

  return risks.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity])
}

export function requiresRiskConfirmation(risks: AddressRisk[]) {
  return risks.some((risk) => risk.severity !== 'info')
}
