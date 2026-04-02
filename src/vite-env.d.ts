/// <reference types="vite/client" />

import type { Buffer } from 'buffer'

declare global {
  interface TelegramWebAppThemeParams {
    accent_text_color?: string
    bg_color?: string
    button_color?: string
    button_text_color?: string
    destructive_text_color?: string
    header_bg_color?: string
    hint_color?: string
    link_color?: string
    secondary_bg_color?: string
    section_bg_color?: string
    section_header_text_color?: string
    subtitle_text_color?: string
    text_color?: string
  }

  interface TelegramWebAppBackButton {
    hide(): void
    show(): void
    offClick?(callback: () => void): void
    onClick(callback: () => void): void
  }

  interface TelegramWebAppHapticFeedback {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
  }

  interface TelegramWebApp {
    BackButton?: TelegramWebAppBackButton
    HapticFeedback?: TelegramWebAppHapticFeedback
    colorScheme?: 'dark' | 'light'
    expand(): void
    isExpanded?: boolean
    platform?: string
    ready(): void
    setBackgroundColor?(color: string): void
    setHeaderColor?(color: string): void
    themeParams?: TelegramWebAppThemeParams
  }

  interface Window {
    Buffer?: typeof Buffer
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export {}
