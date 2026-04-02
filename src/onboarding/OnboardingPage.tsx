import { ArrowsClockwise, DownloadSimple, ShieldCheck, Wallet } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { triggerHaptic } from '../telegram-shell/telegram'
import { generateMnemonicWords, normalizeMnemonicWords } from '../ton-wallet/tonWallet'
import { MIN_PASSWORD_LENGTH } from '../wallet-vault/vault-crypto'
import { useVaultStore } from '../wallet-vault/useVaultStore'

const createVaultSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH, `Минимум ${MIN_PASSWORD_LENGTH} символов`),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  })

const importVaultSchema = createVaultSchema.extend({
  mnemonic: z.string().min(1, 'Вставьте seed-фразу'),
})

type TabKey = 'create' | 'import'

function FieldError({ message }: { message: string | null }) {
  if (!message) {
    return null
  }

  return <p className="error-text">{message}</p>
}

export function OnboardingPage() {
  const createVault = useVaultStore((state) => state.createVault)
  const vaultError = useVaultStore((state) => state.error)
  const clearError = useVaultStore((state) => state.clearError)
  const isBusy = useVaultStore((state) => state.isBusy)

  const [tab, setTab] = useState<TabKey>('create')
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string[]>([])
  const [createPassword, setCreatePassword] = useState('')
  const [createConfirmPassword, setCreateConfirmPassword] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createConfirmed, setCreateConfirmed] = useState(false)

  const [importMnemonic, setImportMnemonic] = useState('')
  const [importPassword, setImportPassword] = useState('')
  const [importConfirmPassword, setImportConfirmPassword] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    if (generatedMnemonic.length > 0) {
      return
    }

    void generateMnemonicWords().then(setGeneratedMnemonic)
  }, [generatedMnemonic.length])

  const handleGenerateMnemonic = async () => {
    clearError()
    setCreateError(null)
    setCreateConfirmed(false)
    setGeneratedMnemonic(await generateMnemonicWords())
    triggerHaptic('impact')
  }

  const handleCreateVault = async () => {
    clearError()

    const validation = createVaultSchema.safeParse({
      password: createPassword,
      confirmPassword: createConfirmPassword,
    })

    if (!validation.success) {
      setCreateError(validation.error.issues[0]?.message ?? 'Проверьте форму')
      return
    }

    if (generatedMnemonic.length !== 24) {
      setCreateError('Сначала сгенерируйте seed-фразу')
      return
    }

    if (!createConfirmed) {
      setCreateError('Подтвердите, что сохранили seed-фразу')
      return
    }

    setCreateError(null)

    try {
      await createVault({
        mnemonic: generatedMnemonic,
        password: validation.data.password,
      })
      triggerHaptic('success')
    } catch {
      triggerHaptic('error')
    }
  }

  const handleImportVault = async () => {
    clearError()

    const validation = importVaultSchema.safeParse({
      mnemonic: importMnemonic,
      password: importPassword,
      confirmPassword: importConfirmPassword,
    })

    if (!validation.success) {
      setImportError(validation.error.issues[0]?.message ?? 'Проверьте форму')
      return
    }

    const normalizedMnemonic = normalizeMnemonicWords(validation.data.mnemonic)

    setImportError(null)

    try {
      await createVault({
        mnemonic: normalizedMnemonic,
        password: validation.data.password,
      })
      triggerHaptic('success')
    } catch {
      triggerHaptic('error')
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card auth-hero">
        <div className="auth-icon" aria-hidden="true">
          <Wallet size={28} weight="fill" />
        </div>
        <p className="section-overline">TON Testnet</p>
        <h1 className="auth-title">Создание кошелька</h1>
      </section>

      <section className="auth-card">
        <div className="segment-control" role="tablist">
          <button
            className={`segment-button ${tab === 'create' ? 'active' : ''}`}
            onClick={() => {
              clearError()
              setTab('create')
            }}
            role="tab"
            type="button"
          >
            <ShieldCheck size={18} />
            Создать
          </button>
          <button
            className={`segment-button ${tab === 'import' ? 'active' : ''}`}
            onClick={() => {
              clearError()
              setTab('import')
            }}
            role="tab"
            type="button"
          >
            <DownloadSimple size={18} />
            Импорт
          </button>
        </div>

        {tab === 'create' ? (
          <div className="auth-stack">
            <div className="section-heading">
              <div>
                <p className="section-overline">Seed-фраза</p>
                <h2 className="section-title">Новый кошелек</h2>
              </div>

              <button className="secondary-button" onClick={() => void handleGenerateMnemonic()} type="button">
                <ArrowsClockwise size={18} />
                Обновить
              </button>
            </div>

            <div className="seed-grid">
              {Array.from({ length: 24 }, (_, index) => {
                const word = generatedMnemonic[index]

                return (
                  <div className={`seed-chip ${word ? '' : 'loading'}`} key={`${word ?? 'placeholder'}-${index}`}>
                    <span className="seed-index">{index + 1}</span>
                    <strong className="seed-word">{word ?? '...'}</strong>
                  </div>
                )
              })}
            </div>

            <div className="notice-card warning">
              <p>Сохраните фразу офлайн.</p>
            </div>

            <label className="form-field">
              <span className="form-label">Пароль</span>
              <input
                autoComplete="new-password"
                className="text-input"
                onChange={(event) => setCreatePassword(event.target.value)}
                placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
                type="password"
                value={createPassword}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Повтор пароля</span>
              <input
                autoComplete="new-password"
                className="text-input"
                onChange={(event) => setCreateConfirmPassword(event.target.value)}
                placeholder="Повторите пароль"
                type="password"
                value={createConfirmPassword}
              />
            </label>

            <label className="check-row">
              <input
                checked={createConfirmed}
                onChange={(event) => setCreateConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>Я сохранил seed-фразу.</span>
            </label>

            <FieldError message={createError ?? vaultError} />

            <button className="primary-button large-button" disabled={isBusy} onClick={() => void handleCreateVault()} type="button">
              <Wallet size={18} weight="fill" />
              {isBusy ? 'Создание…' : 'Создать'}
            </button>
          </div>
        ) : (
          <div className="auth-stack">
            <div className="section-heading">
              <div>
                <p className="section-overline">Импорт</p>
                <h2 className="section-title">Существующий кошелек</h2>
              </div>
            </div>

            <label className="form-field">
              <span className="form-label">Seed-фраза</span>
              <textarea
                className="text-area"
                onChange={(event) => setImportMnemonic(event.target.value)}
                placeholder="word1 word2 word3 ..."
                rows={5}
                value={importMnemonic}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Пароль</span>
              <input
                autoComplete="new-password"
                className="text-input"
                onChange={(event) => setImportPassword(event.target.value)}
                placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
                type="password"
                value={importPassword}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Повтор пароля</span>
              <input
                autoComplete="new-password"
                className="text-input"
                onChange={(event) => setImportConfirmPassword(event.target.value)}
                placeholder="Повторите пароль"
                type="password"
                value={importConfirmPassword}
              />
            </label>

            <FieldError message={importError ?? vaultError} />

            <button className="primary-button large-button" disabled={isBusy} onClick={() => void handleImportVault()} type="button">
              <DownloadSimple size={18} weight="fill" />
              {isBusy ? 'Импорт…' : 'Импортировать'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
