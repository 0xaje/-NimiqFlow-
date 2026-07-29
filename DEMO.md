# Nimiq Flow — Hackathon Judge Demo & Testing Guide

Welcome judges! This guide provides a step-by-step walkthrough to test and evaluate all core capabilities of **Nimiq Flow** (KorriPay).

---

## Quick-Start Demo Setup

1. Launch Nimiq Flow at [https://nimiq-flow.vercel.app](https://nimiq-flow.vercel.app) (or locally at `http://localhost:5173`).
2. Ensure network mode is set to **`TestAlbatross`** (visible via the blue pill badge at the top header).

---

## Step-by-Step Testing Script

### Step 1: Wallet Connection & Demo Quick-Fill
* Click **Connect Nimiq Pay** on the hero card.
* If testing outside a native Nimiq Pay wallet, click **Fill Demo Address** inside the connection modal.
* **Verification**: The top header and balance card update to show your formatted Nimiq address (`NQ86 6B83 U28U 1L6D G20S RFTX N622 174P J7BA`).

### Step 2: Testnet Faucet Claim (`TestAlbatross`)
* Click **Get Free Test NIM** on the balance card or inside **Settings** → **Developer Environment**.
* Click **Claim 10,000 Test NIM**.
* **Verification**: Faucet dispatch succeeds, and your balance credits `10,000.00 NIM` (or updates on-chain).

### Step 3: AI-Assisted Natural Language Invoice Builder
* Click **AI Invoice** on the action grid.
* Type a plain English prompt into the AI prompt box:
  > *"Bill Acme Corp 200 NIM for logo design and 50 NIM for web setup"*
* Click **Parse with AI**.
* **Verification**: The parser extracts client details, line items, computes totals, and generates a printable invoice with a scan-to-pay QR code.
* Click **Print / Save PDF** to test window print formatting.

### Step 4: Payment Request & Settlement Tracker
* Click **Request** on the action grid.
* Enter Amount: `150 NIM` and Memo: `Design Services`.
* Click **Generate Payment Link**.
* **Verification**: Creates a checkout deep-link and protocol QR code, and adds the request to the **Payment Request Tracker** card in the History tab with status `Pending`.

### Step 5: Actionable Analytics & CSV Export
* Switch to the **Analytics** tab.
* **Verification**: Observe the HTML5 canvas volume line chart and the 4 metric cards (**Total Transactions**, **Average Transfer**, **Largest Single Tx**, **Sent / Received Ratio**).
* Click **Export CSV** to download a formatted accounting spreadsheet.

### Step 6: Network Isolation Test (`MainAlbatross`)
* Go to **Settings** → **Developer Environment**.
* Switch network radio to **`MainAlbatross`**.
* **Verification**: 
  - Header & card badges change to **Amber** (`MainAlbatross`).
  - Faucet claim buttons ("Get Free Test NIM") automatically disappear.
  - Balance switches to Mainnet state (`0.00 NIM` for unfunded mainnet addresses), proving complete network state isolation.

---

## Key Evaluation Highlights

- **Native SDK Integration**: Built for `window.nimiqPay` with automated Hub fallback.
- **Zero Mock Data**: 100% live RPC data via public Nimiq Watch JSON-RPC nodes.
- **Strict Network Isolation**: Prevents testnet faucet tokens from bleeding into Mainnet balances.
