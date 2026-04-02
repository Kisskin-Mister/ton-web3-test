# TON Vault Testnet

Self-custodial TON testnet wallet built as a Telegram Mini App without a custom backend.

## What Is Included

- create a new TON testnet wallet
- import an existing 24-word wallet
- local encrypted vault with password unlock
- balance and recent transaction history
- search across recent transactions
- receive screen with address copy and QR code
- send flow with validation and async result states
- address-risk warnings for substitution-like scenarios
- Telegram theme integration, back button support, haptics, mobile-first UI

## Stack

- `Vite`
- `React 19`
- `TypeScript`
- `@ton/ton`, `@ton/core`, `@ton/crypto`
- `@orbs-network/ton-access`
- `React Query`
- `Zustand`
- `Web Crypto API`

## Local Run

```bash
npm install
npm run dev
```

Open the local Vite URL in a browser.

## Production Build Check

```bash
npm run build
npm run preview
```

This serves the production `dist` build locally and is the fastest way to verify that the app works after minification.

## Deploy As Mini App

The app is static and uses `HashRouter`, so it can be deployed to any HTTPS static hosting:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

For Vercel:

1. Import the repository into Vercel.
2. Keep framework preset as `Vite`.
3. Use build command `npm run build`.
4. Use output directory `dist`.
5. Deploy and use the produced HTTPS URL as the Telegram Mini App URL.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

## Submission Checklist

Before sending the solution:

```bash
npm run test
npm run lint
npm run build
```

What to include:

1. Repository link
2. This README with run instructions
3. Architecture and tradeoff notes in `docs/`

## Documentation

- [Architecture](./docs/architecture.md)
- [Critical Questions](./docs/critical-questions.md)
- [Design Research](./docs/design-research.md)
