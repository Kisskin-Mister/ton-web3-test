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
      title: 'Это ваш адрес',
      description: 'Адрес совпадает с текущим кошельком.',
    })
  }

  if (input.parsedRecipient.isRaw) {
    risks.push({
      code: 'raw-address',
      severity: 'warning',
      title: 'Вставлен raw-адрес',
      description: 'Такой формат сложнее проверить глазами.',
    })
  }

  if (input.parsedRecipient.isFriendly && !input.parsedRecipient.isTestOnly) {
    risks.push({
      code: 'missing-testnet-flag',
      severity: 'warning',
      title: 'Нет флага testnet',
      description: 'Проверьте, что адрес точно относится к testnet.',
    })
  }

  if (input.recipientState === 'uninitialized') {
    risks.push({
      code: 'recipient-not-active',
      severity: 'warning',
      title: 'Кошелек не активирован',
      description: 'Контракт еще не развернут.',
    })
  }

  if (input.recipientState === 'frozen') {
    risks.push({
      code: 'recipient-frozen',
      severity: 'danger',
      title: 'Кошелек заморожен',
      description: 'Перевод на такой адрес рискован.',
    })
  }

  if (similarRecipient) {
    risks.push({
      code: 'similar-recipient',
      severity: 'danger',
      title: 'Адрес похож на знакомый',
      description: `Похож на ${similarRecipient.addressFriendly}. Проверьте внимательно.`,
    })
  }

  if (!knownRecipient && !similarRecipient) {
    risks.push({
      code: 'new-recipient',
      severity: 'info',
      title: 'Новый адрес',
      description: 'Вы еще не отправляли на него.',
    })
  }

  return risks.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity])
}

export function requiresRiskConfirmation(risks: AddressRisk[]) {
  return risks.some((risk) => risk.severity !== 'info')
}
