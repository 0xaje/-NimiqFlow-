# Nimiq Flow — Setup & Development Guide

This guide provides instructions for setting up, building, and running **Nimiq Flow** locally or in a production environment.

---

## Prerequisites

Ensure your system meets the following requirements:
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* **Git**: `v2.30.0` or higher
* **Modern Web Browser**: Chrome, Firefox, Safari, or Edge with ES2022 support.

---

## Environment Configuration

Nimiq Flow uses Vite environment variables for environment switching. Two configuration files are provided in the repository:

### `.env.development` (Default Local Environment)
```env
VITE_APP_ENV=development
VITE_NIMIQ_NETWORK=TestAlbatross
VITE_EVM_NETWORK=Sepolia
VITE_RPC_URL=https://rpc.pos.nimiq-testnet.com
VITE_EXPLORER_URL=https://albatross.nimiqscan.com
VITE_COINGECKO=https://api.coingecko.com/api/v3
```

### `.env.production` (Production Environment)
```env
VITE_APP_ENV=production
VITE_NIMIQ_NETWORK=MainAlbatross
VITE_EVM_NETWORK=Polygon
VITE_RPC_URL=https://rpc.nimiqwatch.com
VITE_EXPLORER_URL=https://albatross.nimiqscan.com
VITE_COINGECKO=https://api.coingecko.com/api/v3
```

---

## Quickstart

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/0xaje/-NimiqFlow-.git
   cd -NimiqFlow-
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Local Development Server**:
   ```bash
   npm run dev
   ```
   The local dev server will start at `http://localhost:5173`.

---

## Production Build & Testing

1. **Build Production Bundle**:
   ```bash
   npm run build
   ```
   This generates optimized production assets in the `dist/` directory.

2. **Preview Production Build Locally**:
   ```bash
   npm run preview
   ```
   Serves the static production bundle at `http://localhost:4173`.

---

## Diagnostics & Network Switching

Nimiq Flow includes a built-in **Developer Environment** panel inside the app under **Settings** → **Developer Environment**:

* **Toggle Network**: Select `TestAlbatross` or `MainAlbatross`.
* **RPC Status**: View real-time RPC node connectivity and consensus status.
* **Block Height**: Query current block height from the active Nimiq chain.
* **Testnet Faucet**: Request free test NIM tokens when operating on `TestAlbatross`.
