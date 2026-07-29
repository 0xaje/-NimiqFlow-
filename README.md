# Nimiq Flow — Smart Crypto Payments, Simplified

A modern, native Mini App inside Nimiq Pay that enables users to send, receive, request, and manage NIM payments with an AI-powered invoicing generator and real-time transaction insights.

---

## Key Features

- **Native Nimiq Pay SDK (`window.nimiqPay`)**: Account discovery (`listAccounts()`), payment checkout (`sendTransaction()`), and message signing (`signMessage()`).
- **AI Natural Language Invoice Assist**: Type plain English instructions (e.g., *"Bill Acme Corp 200 NIM for logo design and 50 NIM for web setup"*) to automatically parse client details, line items, and CoinGecko USD/NIM exchange rates with scan-to-pay QR codes and PDF export (`window.print()`).
- **Native Web Share (`navigator.share`)**: 1-tap mobile sharing for payment request links, receiving addresses, and checkout links directly via WhatsApp, Telegram, or system share sheets.
- **Transaction Accounting CSV Export**: 1-click download of full transaction history in formatted `.csv` for business accounting and record-keeping.
- **Live Nimiq Address Checksum Validation**: Real-time visual checksum verification (`NQxx...`) with instant Demo Address quick-fill for fast judge testing.
- **Trusted Device Verification**: Privacy-preserving Mini App SDK device identifier (`requestDeviceIdentifier()`) for spam prevention and preference persistence.
- **Shareable Payment Requests**: Generates Nimiq Hub checkout deep links (`https://hub.nimiq.com/checkout?...`), protocol URI QR codes (`nimiq:...`), and custom payment memos.
- **Cryptographic Message Signing**: Challenge authentication statement signing using Nimiq Pay key pairs with cryptographic signature verification (`0x...`).
- **Multilingual Support (i18n)**: Automatic locale detection with one-tap switcher for English (`en`), German (`de`), and Spanish (`es`).
- **Developer Settings**: Network toggle between `TestAlbatross` and `MainAlbatross` with real-time RPC node status, consensus tracking, block height queries, and empirical Testnet Faucet integration.

---

## Architecture & Service Layer

```
Nimiq Flow
│
├── config/
│   ├── config.js
│   ├── .env.development
│   └── .env.production
│
├── services/
│   ├── rpc.js         # Nimiq Watch JSON-RPC status and data queries
│   ├── wallet.js      # Native Nimiq Pay Mini App SDK
│   ├── prices.js      # CoinGecko market conversion service
│   └── explorer.js    # Dynamic Albatross block explorer links
│
└── index.html & src/main.js
```

---

## Environment Configuration

Nimiq Flow utilizes environment variables for configuration switching:

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

## Development Setup & Running Locally

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

## Security & Privacy

- Environment variables and credentials are excluded via `.gitignore`.
- Device identifiers utilize pseudonymous hashes via Web Crypto API for privacy preservation.
- All blockchain data is fetched directly via public mainnet JSON-RPC (`https://rpc.nimiqwatch.com`).

---

## License

MIT License. Developed for Nimiq Pay Mini App Hackathon.
