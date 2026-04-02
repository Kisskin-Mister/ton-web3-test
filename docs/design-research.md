# Design Research

## Target Direction

`Telegram Mini App shell + TON Space-inspired wallet UX + compact mobile-first layout`

The interface should feel native inside Telegram first. The goal is not decorative novelty, but a wallet layout that looks credible in a Mini App review: clear hierarchy, obvious actions, readable status states, and warnings that stand out.

## Sources

- Telegram Mini Apps theming docs:
  https://docs.telegram-mini-apps.com/platform/theming
- Telegram Mini Apps package docs:
  https://docs.telegram-mini-apps.com/packages/tma-js-sdk-react
- TON Space product direction as the closest wallet reference inside the Telegram ecosystem

## What We Take From Telegram

- Respect host-driven light and dark mode.
- Use Telegram theme variables as the primary palette source.
- Keep spacing compact and touch-first.
- Prefer grouped sections and bottom navigation over desktop-like layouts.

## What We Take From TON Space

- Large balance hero at the top.
- Strong primary actions for send and receive.
- Clean list-style transaction history.
- Wallet UI that feels trustworthy before it feels decorative.

## Implementation Decisions

- Static header with compact wallet identity.
- Bottom tab bar for core navigation.
- Flat Telegram-like section cards instead of glass-heavy surfaces.
- Short page enter animations only.
- High-contrast warning blocks for risky transfers.

## Explicit Constraint

The app still needs to feel like a testnet wallet, not a landing page. That means:

- readable address blocks
- immediate balance visibility
- obvious send and receive entry points
- warnings that do not blend into the rest of the interface

## Resulting Design Language

- `Background`: soft Telegram-driven gradient, subtle only
- `Surface`: rounded section cards with light borders and shadow
- `Typography`: system-native stack for Telegram familiarity
- `Motion`: restrained opacity and translate transitions
- `Warnings`: amber and red blocks with stronger contrast than default surfaces
