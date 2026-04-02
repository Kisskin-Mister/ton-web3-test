# Architecture

## Product Shape

The app is a client-only Telegram Mini App for TON testnet. No backend is used for wallet creation, signing, balance reads, transaction history, or UX storage.

## Main Decisions

- `Vite` instead of `Next.js`: no SSR, no API routes, no SEO need, static deploy is enough.
- `WalletContractV5R1` on testnet: uses the explicit testnet `networkGlobalId = -3`.
- Browser vault: the mnemonic is encrypted with `PBKDF2 + AES-GCM` and only decrypted into memory after unlock.
- Decentralized RPC access: `@orbs-network/ton-access` provides a backend-free testnet endpoint.
- `HashRouter`: avoids static hosting rewrite requirements and works predictably inside a Mini App shell.

## Layers

- `src/telegram-shell`
  Telegram Web App integration, theme application, back button, haptics, clipboard helpers.
- `src/wallet-vault`
  Password-based encryption and local vault persistence.
- `src/ton-wallet`
  TON wallet derivation, blockchain client, overview fetches, transfer execution, transaction mapping.
- `src/address-risk`
  Risk engine for address substitution-like scenarios.
- `src/*-flow`, `src/*-home`
  Feature pages and screen-level logic.

## Data Model

### Persistent

- Encrypted mnemonic blob
- Wallet public metadata: address, public key, created timestamp
- Local recipient registry for trust/reuse heuristics

### In-Memory Only

- Decrypted mnemonic
- Secret key
- Wallet contract instance

## Send Flow

1. Parse and normalize the recipient address.
2. Fetch recipient contract state.
3. Run local risk analysis.
4. Require explicit confirmation for warning/danger states.
5. Sign and submit the transfer in-browser.
6. Poll wallet `seqno` and latest transactions for a clearer post-send result.

## Anti-Substitution Logic

- Warn on raw-format addresses.
- Warn when a friendly address does not carry the `testOnly` flag.
- Warn on self-transfer.
- Warn on uninitialized or frozen recipient state.
- Warn when the address is visually similar to a previously used recipient but not identical.
- Warn when the address is completely new.

## Known Trade-Offs

- No server verification of Telegram `initData`.
- No hardware-backed key storage.
- No multi-account support.
- No jettons, comments, or contact book yet.
- Clipboard malware cannot be fully defeated in a browser-only app, so the defense is UX-driven rather than absolute.
