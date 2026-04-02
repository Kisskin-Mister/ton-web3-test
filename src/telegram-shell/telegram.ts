const THEME_PARAM_TO_CSS_VAR: Record<keyof TelegramWebAppThemeParams, string> = {
  accent_text_color: '--telegram-accent-text',
  bg_color: '--telegram-bg',
  button_color: '--telegram-button',
  button_text_color: '--telegram-button-text',
  destructive_text_color: '--telegram-destructive',
  header_bg_color: '--telegram-header-bg',
  hint_color: '--telegram-hint',
  link_color: '--telegram-link',
  secondary_bg_color: '--telegram-secondary-bg',
  section_bg_color: '--telegram-section-bg',
  section_header_text_color: '--telegram-section-header',
  subtitle_text_color: '--telegram-subtitle',
  text_color: '--telegram-text',
}

export interface TelegramShellInfo {
  isTelegram: boolean
  platform: string
}

function getTelegramWebApp() {
  return window.Telegram?.WebApp
}

function getPreferredScheme() {
  if (getTelegramWebApp()?.colorScheme) {
    return getTelegramWebApp()!.colorScheme!
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeParams(themeParams?: TelegramWebAppThemeParams) {
  const root = document.documentElement

  root.dataset.colorScheme = getPreferredScheme()

  if (!themeParams) {
    return
  }

  for (const [themeParam, cssVar] of Object.entries(THEME_PARAM_TO_CSS_VAR)) {
    const value = themeParams[themeParam as keyof TelegramWebAppThemeParams]

    if (value) {
      root.style.setProperty(cssVar, value)
    }
  }
}

export function initializeTelegramShell(): TelegramShellInfo {
  const webApp = getTelegramWebApp()

  applyThemeParams(webApp?.themeParams)

  if (!webApp) {
    return {
      isTelegram: false,
      platform: 'browser',
    }
  }

  webApp.ready()
  webApp.expand()
  webApp.setHeaderColor?.(webApp.themeParams?.secondary_bg_color ?? webApp.themeParams?.bg_color ?? '#0f1729')
  webApp.setBackgroundColor?.(webApp.themeParams?.bg_color ?? '#0f1729')

  return {
    isTelegram: true,
    platform: webApp.platform ?? 'telegram',
  }
}

export function bindTelegramBackButton(enabled: boolean, onBack: () => void) {
  const backButton = getTelegramWebApp()?.BackButton

  if (!backButton) {
    return () => undefined
  }

  if (!enabled) {
    backButton.hide()
    return () => undefined
  }

  backButton.show()
  backButton.onClick(onBack)

  return () => {
    backButton.offClick?.(onBack)
    backButton.hide()
  }
}

export function triggerHaptic(type: 'success' | 'warning' | 'error' | 'impact') {
  const haptics = getTelegramWebApp()?.HapticFeedback

  if (!haptics) {
    return
  }

  if (type === 'impact') {
    haptics.impactOccurred('light')
    return
  }

  haptics.notificationOccurred(type)
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const temp = document.createElement('textarea')
  temp.value = value
  temp.setAttribute('readonly', '')
  temp.style.position = 'absolute'
  temp.style.left = '-9999px'
  document.body.appendChild(temp)
  temp.select()
  document.execCommand('copy')
  document.body.removeChild(temp)
}

export function isTelegramMiniApp() {
  return Boolean(getTelegramWebApp())
}
