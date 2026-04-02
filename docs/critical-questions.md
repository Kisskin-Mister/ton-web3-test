# Critical Questions

## 1. Vite or Next.js?

Resolved: `Vite`

Why:

- The assignment explicitly forbids a custom backend.
- The app is a Telegram Mini App and does not need SSR or SEO.
- Static deployment is simpler to explain and evaluate.

## 2. External wallet via TON Connect or an in-app wallet?

Resolved: in-app self-custodial wallet

Why:

- The assignment asks to create or import a wallet inside the product.
- TON Connect would solve a different problem: connecting an already existing external wallet app.

## 3. Plain local storage or encrypted vault?

Resolved: encrypted vault

Why:

- Plain text mnemonic in browser storage is too weak even for a test task.
- Password-based encryption is a reasonable browser-only compromise.

## 4. Which TON wallet contract?

Resolved: `WalletContractV5R1` with `networkGlobalId = -3`

Why:

- Keeps the wallet explicitly pinned to testnet.
- Avoids accidental defaulting to mainnet wallet identity.

## 5. Telegram SDK package or direct WebApp API?

Resolved: direct `window.Telegram.WebApp`

Why:

- The app uses a thin subset of shell features: `ready`, `expand`, theming, haptics, and back button.
- A direct adapter keeps the dependency surface smaller and easier to justify.

Revisit if:

- The app grows into deeper Telegram-specific features such as cloud storage, biometry, or more complex shell orchestration.

## 6. How should light/dark theming work?

Resolved: Telegram theme first, system fallback outside Telegram

Why:

- In Telegram the host container is the authority.
- During local browser development we still need credible dark/light behavior.

## 7. How strict should the risk engine be?

Resolved: informative by default, hard-confirm for warning/danger states

Why:

- The UI must stay minimal.
- The warnings must be noticeable and not easy to ignore.

## 8. How much should be stored locally for UX?

Resolved:

- Persist the encrypted vault and recipient registry.
- Do not persist decrypted secret material.

## 9. Router choice?

Resolved: `HashRouter`

Why:

- Static hosting friendly.
- No server rewrite rules required.
- Safe default for a Mini App test task.
