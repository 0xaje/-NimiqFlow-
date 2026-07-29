# Nimiq Flow — Smart Crypto Payments, Simplified

**Nimiq Flow** (KorriPay) is a modern, native Mini App built for the **Nimiq Pay** ecosystem. It enables users to send, receive, request, and manage NIM payments with an AI-assisted natural language invoice builder, real-time transaction analytics, and an on-chain payment status settlement tracker.

---

## 📌 Overview

Nimiq Flow transforms crypto payments from complex address exchanges into an intuitive, human-friendly payment experience. Whether split-billing a dinner, requesting payment from a client, or parsing plain English text into itemized PDF invoices, Nimiq Flow bridges everyday commerce with the high-speed Nimiq Albatross PoS blockchain.

---

## ✨ Features

- **Native Nimiq Pay Mini App SDK (`window.nimiqPay`)**: Primary native integration for account discovery (`listAccounts()`), payment checkout (`sendTransaction()`), and message signing (`signMessage()`), with an automated Web Hub API fallback for desktop compatibility.
- **AI-Assisted Natural Language Invoice Builder**: Type plain English instructions (e.g., *"Bill Acme Corp 200 NIM for logo design and 50 NIM for web setup"*) to automatically parse client details, line items, and CoinGecko USD/NIM exchange rates with scan-to-pay QR codes and PDF export (`window.print()`).
- **Payment Request & On-Chain Status Tracker**: Live payment request management tool displaying real-time payment status badges (`Paid`, `Pending`, `Expired`), on-chain settlement checks via Nimiq Watch JSON-RPC, and block explorer deep-links.
- **Actionable Analytics & Insights**: Real-time transaction metrics including an HTML5 canvas volume chart, **Total Transactions**, **Average Transfer Amount**, **Largest Single Payment**, and **Sent vs Received Ratio**.
- **Network State Isolation Engine (`TestAlbatross` vs `MainAlbatross`)**: 100% separate state buckets for Testnet and Mainnet. Prevents testnet faucet tokens from bleeding into Mainnet balances. Context-aware UI hides testnet faucet tools when operating on Mainnet.
- **Privacy-Preserving Device Verification**: Uses the Nimiq Mini App SDK's privacy-preserving device identifier (`requestDeviceIdentifier()`) for spam prevention and preference persistence.
- **Safe Testnet Testing Environment**: Complete support for `TestAlbatross` with testnet Hub integration (`https://hub.nimiq-testnet.com`) and a 1-tap Testnet Faucet for zero-risk judge testing.
- **Native Web Share (`navigator.share`)**: 1-tap mobile link sharing for payment request links, receiving addresses, and checkout URLs directly via WhatsApp, Telegram, or system share sheets.
- **Accounting CSV Export**: 1-click download of full transaction history in formatted `.csv` for business record-keeping.
- **Multilingual Support (i18n)**: Automatic locale detection with one-tap switcher for English (`en`), German (`de`), and Spanish (`es`).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Core Framework** | HTML5, Vanilla JavaScript (ES2022+), Vite 5 |
| **Styling & Theme** | Tailwind CSS, Glassmorphic Design System, Material Symbols |
| **Blockchain SDK** | Native Nimiq Pay Mini App SDK (`window.nimiqPay`), `@nimiq/hub-api` |
| **Blockchain Data** | Nimiq Watch Public JSON-RPC (`https://rpc.nimiqwatch.com`), Nimiq Albatross Testnet |
| **Market Data** | CoinGecko API (`nimiq-2`) with 30s local caching |
| **QR Code Generation**| `qrcode` Canvas Library |

---

## 📐 Architecture

```
Nimiq Flow
│
├── config/
│   ├── config.js         # Network environment manager (TestAlbatross vs MainAlbatross)
│   ├── .env.development  # Development environment variables
│   └── .env.production   # Production environment variables
│
├── services/
│   ├── rpc.js            # Public Nimiq Watch JSON-RPC layer & address formatting
│   ├── wallet.js         # Native Nimiq Pay Mini App SDK & Hub API provider
│   ├── prices.js         # CoinGecko NIM/USD conversion rate service with caching
│   └── explorer.js       # Dynamic Albatross block explorer links
│
└── index.html & src/main.js
                          # Single Page Application core logic, i18n, & state management
```

For an in-depth breakdown of components and data flow, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 💻 Installation & Local Setup

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/0xaje/-NimiqFlow-.git
   cd -NimiqFlow-
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Local Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. **Build Production Bundle**:
   ```bash
   npm run build
   ```

For detailed configuration guidelines, see [SETUP.md](./SETUP.md).

---

## 🎬 Demo & Video Walkthrough

- **Live Mini App Web URL**: `http://localhost:5173`
- **GitHub Repository**: [https://github.com/0xaje/-NimiqFlow-](https://github.com/0xaje/-NimiqFlow-)
- **Testing Guide**: See [DEMO.md](./DEMO.md) for a step-by-step judge testing script.

---

## 🗺️ Roadmap

- [x] Native Nimiq Pay Mini App SDK Integration
- [x] AI-Assisted Natural Language Invoice Builder & PDF Export
- [x] Real-Time Payment Request Status Settlement Tracker
- [x] Network State Isolation (`TestAlbatross` vs `MainAlbatross`)
- [x] Transaction Analytics & Accounting CSV Export
- [ ] Merchant Webhook Notifications for On-Chain Settlement
- [ ] Multi-Currency Fiat Gateway Integration (EUR/GBP)
- [ ] Recurring Subscription Invoicing Protocol

---

## 📄 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.
