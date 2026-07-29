# Nimiq Flow — Smart Crypto Payments, Simplified ⚡

A modern, native **Mini App inside Nimiq Pay** that lets users send, receive, request, and manage NIM payments with an AI-powered invoicing generator and real-time transaction insights.

---

## 🌟 Key Features

- **⚡ Native Nimiq Pay SDK (`window.nimiqPay`)**: Real account discovery (`listAccounts()`), payment checkout (`sendTransaction()`), and message signing (`signMessage()`).
- **🛡️ Trusted Device Verification**: Privacy-preserving Mini App SDK device identifier (`requestDeviceIdentifier()`) for spam prevention & preference persistence.
- **📩 Shareable Payment Requests**: Generate Nimiq Hub checkout deep links (`https://hub.nimiq.com/checkout?...`), protocol URI QR codes (`nimiq:...`), and custom payment memos.
- **✒️ Cryptographic Message Signing**: Challenge authentication statement signing modal using Nimiq Pay key pairs with live signature hash outputs (`0x...`).
- **🤖 AI Smart Invoice Generator**: Exclusive AI feature for drafting and itemizing invoices with CoinGecko exchange calculations, scan-to-pay QR codes, and PDF export (`window.print()`).
- **🌐 Multilingual Support (i18n)**: Auto locale detection with one-tap switcher for English (`en`), German (`de`), and Spanish (`es`).
- **🛠️ Settings → Developer Mode**: Live network toggle between `TestAlbatross` and `MainAlbatross` with real-time RPC node status, consensus tracking, and block height queries.

---

## 🏗️ Architecture & Services

```
Nimiq Flow
│
├── config/
│   ├── config.js
│   ├── .env.development
│   └── .env.production
│
├── services/
│   ├── rpc.js         # Nimiq Watch JSON-RPC calls
│   ├── wallet.js      # Native Nimiq Pay Mini App SDK
│   ├── prices.js      # CoinGecko market conversion API
│   └── explorer.js    # Dynamic Albatross block explorer links
│
└── index.html & src/main.js
```

---

## ⚙️ Environment Configuration

Nimiq Flow uses environment variables for environment switching:

### `.env.development`
```env
VITE_APP_ENV=development
VITE_NIMIQ_NETWORK=TestAlbatross
VITE_EVM_NETWORK=Sepolia
VITE_RPC_URL=https://rpc.nimiqwatch.com
VITE_EXPLORER_URL=https://albatross.nimiqscan.com
VITE_COINGECKO=https://api.coingecko.com/api/v3
```

### `.env.production`
```env
VITE_APP_ENV=production
VITE_NIMIQ_NETWORK=MainAlbatross
VITE_EVM_NETWORK=Polygon
VITE_RPC_URL=https://rpc.nimiqwatch.com
VITE_EXPLORER_URL=https://albatross.nimiqscan.com
VITE_COINGECKO=https://api.coingecko.com/api/v3
```

---

## 🚀 Development Setup & Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Local Development Server**:
   ```bash
   npm run dev
   ```

3. **Build Production Bundle**:
   ```bash
   npm run build
   ```

---

## 🔒 Security & Privacy

- Environment variables and credentials are listed in `.gitignore`.
- Device identifiers use pseudonymous hashes via Web Crypto API for privacy preservation.
- All blockchain data is fetched directly via public mainnet JSON-RPC (`https://rpc.nimiqwatch.com`).

---

## 📜 License

MIT License. Developed for Nimiq Pay Mini App Hackathon.
