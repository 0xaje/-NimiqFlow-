# Nimiq Flow — Changelog

All notable changes to the **Nimiq Flow** (KorriPay) codebase are documented in this file.

---

## [1.0.0] - 2026-07-29

### Added
- **Native Nimiq Pay Mini App SDK Integration**: Full account discovery (`listAccounts()`), checkout (`sendTransaction()`), and message signing (`signMessage()`) via `window.nimiqPay` with Hub API fallback.
- **AI-Assisted Natural Language Invoice Builder**: Plain text prompt parser extracting line items, client details, NIM/USD totals, scan-to-pay QR codes, and PDF print export (`window.print()`).
- **Payment Request Status Settlement Tracker**: Live request tracking component displaying real-time payment status badges (`Paid`, `Pending`, `Expired`), on-chain settlement checks via Nimiq Watch JSON-RPC, and block explorer deep-links.
- **Actionable Analytics Insights**: HTML5 canvas volume line chart with metrics for Total Transactions, Average Transfer Amount, Largest Single Tx, and Sent/Received ratio.
- **Accounting CSV Export**: 1-click download of transaction streams formatted for business record-keeping.
- **Network State Isolation Engine**: Complete state separation between `TestAlbatross` and `MainAlbatross` for balances, transaction feeds, and testnet faucet visibility.
- **Multilingual Support (i18n)**: Automatic locale detection with 1-tap switcher for English (`en`), German (`de`), and Spanish (`es`).
- **Privacy-Preserving Device Verification**: Mini App SDK device identifier (`requestDeviceIdentifier()`) utilizing SHA-256 Web Crypto API hashes.

### Fixed & Refined
- **RPC Parameter Validation**: Enforced 4-character IBAN space groupings (`NQxx xxxx...`) on all JSON-RPC parameters to resolve parameter checksum validation errors.
- **Testnet Faucet UI Scope**: Dynamic visibility rules automatically hide testnet faucet tools when operating in `MainAlbatross` mode.
- **Zero Mock Data Enforcement**: Purged hardcoded dummy items; replaced with real on-chain transaction state tracking and clean empty state messaging.
- **Dynamic Network Badging**: Header, hero card, and settings badges update color coding (Amber for `MainAlbatross`, Sky Blue for `TestAlbatross`).
