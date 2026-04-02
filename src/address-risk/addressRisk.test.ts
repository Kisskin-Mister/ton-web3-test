import { describe, expect, it } from 'vitest'
import { analyzeAddressRisk, requiresRiskConfirmation } from './addressRisk'

describe('analyzeAddressRisk', () => {
  it('flags self-transfer as a danger scenario', () => {
    const risks = analyzeAddressRisk({
      selfAddressRaw: '0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      recipientState: 'active',
      registry: [],
      parsedRecipient: {
        input: 'EQ-test',
        address: {} as never,
        addressFriendly: 'kQ-test',
        addressRaw: '0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        isBounceable: false,
        isFriendly: true,
        isRaw: false,
        isTestOnly: true,
      },
    })

    expect(risks[0]?.code).toBe('self-transfer')
    expect(requiresRiskConfirmation(risks)).toBe(true)
  })

  it('flags raw addresses and missing testnet marker', () => {
    const risks = analyzeAddressRisk({
      selfAddressRaw: '0:1111111111111111111111111111111111111111111111111111111111111111',
      recipientState: 'active',
      registry: [],
      parsedRecipient: {
        input: '0:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        address: {} as never,
        addressFriendly: 'EQ-another',
        addressRaw: '0:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        isBounceable: false,
        isFriendly: true,
        isRaw: true,
        isTestOnly: false,
      },
    })

    expect(risks.map((risk) => risk.code)).toContain('raw-address')
    expect(risks.map((risk) => risk.code)).toContain('missing-testnet-flag')
  })

  it('warns when an address is suspiciously similar to a known recipient', () => {
    const risks = analyzeAddressRisk({
      selfAddressRaw: '0:1111111111111111111111111111111111111111111111111111111111111111',
      recipientState: 'active',
      registry: [
        {
          addressFriendly: 'kQknown-recipient',
          addressRaw: '0:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          trusted: true,
          lastUsedAt: '2026-04-02T00:00:00.000Z',
          timesSent: 3,
        },
      ],
      parsedRecipient: {
        input: 'EQ-lookalike',
        address: {} as never,
        addressFriendly: 'kQ-lookalike',
        addressRaw: '0:1234567890abcdef1234567890abccef1234567890abcdef1234567890abcdef',
        isBounceable: false,
        isFriendly: true,
        isRaw: false,
        isTestOnly: true,
      },
    })

    expect(risks.some((risk) => risk.code === 'similar-recipient')).toBe(true)
    expect(risks[0]?.severity).toBe('danger')
  })

  it('adds a low-severity note for brand new recipients', () => {
    const risks = analyzeAddressRisk({
      selfAddressRaw: '0:1111111111111111111111111111111111111111111111111111111111111111',
      recipientState: 'active',
      registry: [],
      parsedRecipient: {
        input: 'EQ-new',
        address: {} as never,
        addressFriendly: 'kQ-new',
        addressRaw: '0:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        isBounceable: false,
        isFriendly: true,
        isRaw: false,
        isTestOnly: true,
      },
    })

    expect(risks.some((risk) => risk.code === 'new-recipient')).toBe(true)
    expect(requiresRiskConfirmation(risks)).toBe(false)
  })
})
