# TON Vault Testnet

Self-custodial кошелек для TON testnet в формате Telegram Mini App без собственного backend.

## Что реализовано

- создание нового кошелька TON testnet
- импорт существующего кошелька по seed-фразе из 24 слов
- локальное зашифрованное хранилище с паролем
- баланс и история последних транзакций
- поиск по истории
- экран получения с адресом и QR-кодом
- экран отправки с валидацией и понятным результатом
- предупреждения о рискованных адресах
- интеграция с Telegram theme, back button и haptics

## Стек

- `Vite`
- `React 19`
- `TypeScript`
- `@ton/ton`, `@ton/core`, `@ton/crypto`
- `@orbs-network/ton-access`
- `React Query`
- `Zustand`
- `Web Crypto API`

## Локальный запуск

```bash
npm install
npm run dev
```

После запуска открой локальный URL от Vite в браузере.

## Проверка production-сборки

```bash
npm run build
npm run preview
```

Это запускает локально уже собранный `dist`, а не dev-режим.

## Деплой

Приложение статическое и использует `HashRouter`, поэтому его можно выкладывать на любой HTTPS static hosting:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

Для Vercel:

1. Импортировать репозиторий в Vercel.
2. Оставить preset `Vite`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Использовать выданный HTTPS URL как Mini App URL в Telegram.

## Скрипты

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

## Что приложить при сдаче

1. Ссылку на репозиторий
2. Этот README с инструкцией по запуску
3. Описание архитектуры, компромиссов и логики проверок в `docs/`

## Проверка перед отправкой

```bash
npm run test
npm run lint
npm run build
```

## Документация

- [Архитектура](./docs/architecture.md)
- [Ключевые вопросы](./docs/critical-questions.md)
- [Дизайн](./docs/design-research.md)
