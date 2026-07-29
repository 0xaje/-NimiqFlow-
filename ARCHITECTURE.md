# Nimiq Flow — System Architecture Document

This document outlines the technical architecture, component design, data flow, and network isolation strategy of **Nimiq Flow** (KorriPay).

---

## 1. System Overview

Nimiq Flow is designed as a lightweight, zero-dependency Single Page Application (SPA) optimized for embedded execution within the **Nimiq Pay Mini App ecosystem**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Nimiq Pay Native Mini App                       │
├────────────────────────────────────────────────────────────────────────┤
│                           UI Presentation Layer                        │
│                (index.html / Tailwind CSS / Glassmorphism)             │
├────────────────────────────────────────────────────────────────────────┤
│                          Application State Manager                     │
│               (src/main.js - Isolated Network Stores & i18n)           │
├───────────────────────────────────┬────────────────────────────────────┤
│         Blockchain Layer          │            Service Layer           │
│  - Native SDK (window.nimiqPay)   │  - CoinGecko Market Feed           │
│  - Web Hub API Fallback           │  - SHA-256 Web Crypto Device ID    │
│  - Nimiq Watch JSON-RPC           │  - Albatross Explorer Links        │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Service Layer Specifications

### 2.1 Wallet & SDK Provider (`src/services/wallet.js`)
* **Primary**: `window.nimiqPay` — Native Nimiq Pay Mini App SDK interface providing `listAccounts()`, `sendTransaction()`, and `signMessage()`.
* **Fallback**: `@nimiq/hub-api` — Instantiated dynamically (`https://hub.nimiq-testnet.com` or `https://hub.nimiq.com`) when running outside a native app environment.

### 2.2 Public JSON-RPC Layer (`src/services/rpc.js`)
* Queries public Nimiq Albatross JSON-RPC nodes (`https://rpc.nimiqwatch.com` / `https://rpc.pos.nimiq-testnet.com`).
* Enforces address parameter formatting into 4-character IBAN space groupings (`NQxx xxxx xxxx...`).
* Exposes balance fetching (`fetchRpcAccountBalance`), transaction streams (`fetchRpcTransactions`), block height (`fetchRpcBlockNumber`), and consensus status (`fetchRpcConsensusStatus`).

### 2.3 Market Data Service (`src/services/prices.js`)
* Queries CoinGecko API for real-time NIM/USD exchange rates (`nimiq-2`).
* Implements a 30-second `localStorage` cache (`nimiqflow_cached_usd_price`) to minimize API requests and prevent rate-limiting.

### 2.4 Block Explorer Resolver (`src/services/explorer.js`)
* Generates network-aware deep-links to the Albatross Block Explorer (`https://albatross.nimiqscan.com`) for transactions (`/transaction/{hash}`) and accounts (`/account/{address}`).

---

## 3. Network Isolation Architecture

To ensure strict separation between testnet faucet claims and mainnet account state, Nimiq Flow enforces network-isolated state storage:

```
state = {
    balances: {
        TestAlbatross: <Testnet Faucet & RPC Balance>,
        MainAlbatross: <Live Mainnet RPC Balance>
    },
    transactions: {
        TestAlbatross: [<Testnet Transactions>],
        MainAlbatross: [<Mainnet Transactions>]
    }
}
```

* **Testnet Mode (`TestAlbatross`)**: Faucet claims (10,000 Test NIM) credit `state.balances.TestAlbatross`. Testnet faucet tools are active.
* **Mainnet Mode (`MainAlbatross`)**: Reads strictly from `state.balances.MainAlbatross` via `https://rpc.nimiqwatch.com`. Testnet faucet tools are automatically hidden.

---

## 4. Payment Settlement & Request Tracker

1. **Request Generation**: When a user generates a payment request or AI invoice, a request record is stored in `state.trackedRequests`.
2. **On-Chain Settlement Verification**: During periodic or event-driven RPC refreshes, `renderPaymentRequestTracker()` compares incoming transactions in `getActiveTransactions()` against pending requests.
3. **Status Resolution**: If an incoming transaction matches the requested amount within a 0.1 NIM tolerance, its status transitions from `Pending` to `Paid`, associating the transaction hash for 1-tap block explorer inspection.

---

## 5. Security & Privacy Controls

* **Privacy-Preserving Device Verification**: Uses `window.nimiqPay.requestDeviceIdentifier()` to generate pseudonymous SHA-256 Web Crypto API hashes for preference persistence without collecting personally identifiable information (PII).
* **No Private Key Storage**: All transaction signing occurs securely within the Nimiq Pay wallet container or Nimiq Hub iframe; Nimiq Flow never accesses or stores user private keys.
* **Content Security & CORS**: All RPC queries target official, TLS-secured Nimiq RPC endpoints.
