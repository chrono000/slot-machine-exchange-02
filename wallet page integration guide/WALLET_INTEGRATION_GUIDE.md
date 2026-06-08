# Wallet Page — Integration Guide
> For the AI working on other parts of the larger project.
> This document describes everything needed to integrate `WalletPage.jsx` cleanly.

---

## 1. What This File Is

`WalletPage.jsx` is a **self-contained React component** that renders a full crypto wallet UI.
It is currently running as a standalone page via `wallet.html` + Babel CDN (no build step needed).

**Stack:**
- React 18 (UMD / CDN, no JSX transform needed separately — Babel handles it)
- Pure CSS injected into the `<head>` at runtime (no external CSS file needed)
- No third-party UI libraries
- Font: JetBrains Mono (loaded from Google Fonts inside the CSS)

---

## 2. File Map

```
rolling numbers/
├── wallet.html          ← standalone HTML shell that loads WalletPage.jsx
├── WalletPage.jsx       ← THE component (2074 lines, fully self-contained)
├── index.html           ← the Convert page (separate page, same nav)
└── CryptoConverter.jsx  ← the Convert page component
```

---

## 3. How to Mount It

### Current standalone method (wallet.html)
```html
<script>
  fetch('WalletPage.jsx')
    .then(r => r.text())
    .then(src => {
      // strips the React import line and export default keyword
      // injects React hooks into scope, then compiles + runs via Babel
    });
</script>
```

### If integrating into a React project with a bundler (Vite/CRA/Next)
```jsx
import WalletPage from './WalletPage';

// Mount anywhere:
<WalletPage />
```
The component takes **zero props** — it is fully self-contained.
Just remove the `export default` transform trick in wallet.html and do a normal import.

---

## 4. Component Tree

```
WalletPage                        ← root, no props
├── NavBar                        ← top fixed nav bar
├── SparkChart (React.memo)       ← canvas-based animated price chart
├── EnlargedChartModal            ← full-screen chart popup (triggered by clicking chart)
└── Modal system (one at a time)
    ├── CoinDetailModal           ← click a token row → shows balance + Send/Receive buttons
    ├── SendModal                 ← send crypto form
    ├── ReceiveModal              ← deposit address + copy button
    └── WalletHistoryModal        ← transaction history + balance snapshot
        └── AccountStatementModal ← export statement (CSV/JSON/PDF/TXT)
```

**Shared sub-components:**
- `CoinDropdown` — reusable coin picker list used inside Send + Receive modals
- `DatePicker` — custom calendar picker used in AccountStatementModal + WalletHistoryModal
- `TxSkeleton` — shimmer loading skeleton for transaction list
- `Toast` — bottom center notification (auto-dismisses after 2.6s)

---

## 5. Modal System

A single state variable `modal` (string | null) controls which popup is open:

| `modal` value | Component shown        | Trigger                              |
|---------------|------------------------|--------------------------------------|
| `null`        | none                   | —                                    |
| `"coin"`      | CoinDetailModal        | Click a token row (non-zero balance) |
| `"send"`      | SendModal              | Click Send inside CoinDetailModal    |
| `"receive"`   | ReceiveModal           | Click Receive / click zero-balance row / "+ Deposit" button |
| `"activity"`  | WalletHistoryModal     | Click "Activity" header button       |

`showBigChart` is a separate boolean for the enlarged chart (sits outside `modal`).

**To add a new modal**, add a new string case:
```jsx
// In WalletPage return JSX:
{modal === "swap" && <SwapModal onClose={() => setModal(null)} ... />}

// To open it from anywhere:
setModal("swap");
```

---

## 6. Data Structures

### COINS
All supported assets. Hardcoded at the top of the file.
```js
const COINS = {
  BTC:  { name: "Bitcoin",  icon: "₿", color: "#f7931a", decimals: 8, balance: 2.45831, hold: 0 },
  ETH:  { name: "Ethereum", icon: "Ξ", color: "#627eea", decimals: 4, balance: 34.2819, hold: 0 },
  USDT: { ... hold: 1300 }, // hold = amount locked in pending orders
  // ... 11 coins total
};
```
**To wire up real balances:** replace `balance` and `hold` values with live data,
or pass them as props/context to WalletPage.

### BASE_RATES
```js
const BASE_RATES = {
  "BTC/USDT": 67432.50,
  "ETH/USDT": 3521.80,
  // ... 6 pairs
};
```
The component **simulates live ticking** — every 3.5 seconds it mutates rates ±0.4%.
To use real rates: replace the `setInterval` inside `WalletPage` (line ~1797) with a real API call.

### MOCK_ACTIVITY (transaction history)
```js
{
  id: 1,
  cat: "deposit" | "trade" | "withdraw",
  coin: "BTC",
  amount: "0.25000",   // string with formatting
  usd: "16,858.13",    // string with commas
  time: "Today 2:20 AM",
  status: "confirmed" | "pending" | "failed" | "rejected" | "error",
  hash: "a1b2c3d4e5",
}
```
Replace with real transaction data from your API.

### MOCK_ADDRESSES
```js
const MOCK_ADDRESSES = {
  BTC:  "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  ETH:  "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  // ...
};
```
Replace with real wallet addresses per coin per user.

### MOCK_USER (account info for statements)
```js
{
  name, email, phone, address, city, country, accountId, taxId, joined
}
```
Plug in real user profile data.

---

## 7. CSS

All CSS lives inside the `WL_STYLE` template string (~350 lines, lines 157–435).
It is injected into `<head>` at runtime via `injectWalletCSS()` using a style tag with id `wl-styles`.

**All class names are prefixed `wl-`** to avoid collisions with other page styles.

If integrating into a project that uses CSS modules or Tailwind, you can:
- Keep as-is (the injection approach works fine alongside any CSS system)
- Or extract into a `.css` file and import it normally

---

## 8. NavBar

```jsx
function NavBar({ active }) {
  // active = "wallet" | "convert"
  // Links: "Convert" → index.html, "Wallet" → wallet.html
  // Logo text: "HX"
}
```
**Integration note:** The nav currently uses hard-coded `href` links between two HTML files.
When integrating into a router-based app (React Router, Next.js, etc.), replace the `<a href>` tags
with `<Link>` or `<NavLink>` components and update the routes.

---

## 9. SparkChart Props

```jsx
<SparkChart
  total={number}        // current portfolio value in USD — drives chart data
  period="7D"|"1M"|"3M" // which time window to show
  isUp={boolean}        // green chart if true, red if false
  onToggle={fn}         // called on click (used to open enlarged chart)
  height={130}          // canvas height in px (default 130)
  gridClip={0.55}       // how much of the canvas bottom is the retro grid (0–1)
/>
```
Chart data is **generated procedurally** from `total` + period + volatility constants.
There is no real historical price data — replace `genChartData()` (line 143) for real charts.

---

## 10. Key Constants to Update

| Constant | Location | Purpose |
|---|---|---|
| `BASE_RATES` | line 21 | Starting exchange rates |
| `COINS[x].balance` | line 6 | Starting token balances |
| `COINS[x].hold` | line 6 | Locked/reserved amounts |
| `MOCK_ACTIVITY` | line 70 | Transaction history |
| `MOCK_ADDRESSES` | line 91 | Deposit addresses per coin |
| `MOCK_USER` | line 46 | Account holder info |
| `PERIOD_PNL_PCT` | line 27 | Fake 7D/1M/3M PnL % figures |
| `MOCK_CHANGES` | line 29 | Fake 24h % change per coin |

---

## 11. What Is NOT Yet Wired (Mock Only)

These features have full UI but no real backend logic:
- **Send button** — fires `onSent(coin, amount)` callback and closes the modal. No actual transaction.
- **Receive QR code** — shows a placeholder box. No real QR generation.
- **Statement download** — generates a real file from mock data. Switch `MOCK_ACTIVITY` for real data.
- **Balance history** — historical balances are calculated by reversing mock % changes. Not real.
- **Rate ticking** — simulated ±0.4% noise every 3.5s. Replace with WebSocket or API polling.

---

## 12. Integration Checklist

- [ ] Decide: standalone HTML pages vs. React Router SPA
- [ ] Update NavBar links to match your routing system
- [ ] Replace `MOCK_USER` with real auth/user data
- [ ] Replace `MOCK_ACTIVITY` with real transaction API
- [ ] Replace `MOCK_ADDRESSES` with real wallet addresses
- [ ] Replace `COINS[x].balance` / `hold` with real balance API
- [ ] Replace the rate ticker `setInterval` with real price feed (WebSocket / REST)
- [ ] Wire `SendModal` confirm button to real transaction submission
- [ ] Add real QR code generation to `ReceiveModal` (e.g. `qrcode.js`)
- [ ] Decide on CSS strategy (keep injection vs. extract to file)

---

## 13. Animation / Timing Constants

```js
const GRID_INTRO_MS = 3200;  // retro grid intro scroll duration
const GRID_FADE_MS  = 600;   // grid fade-in duration
const LINE_DRAW_MS  = 2400;  // chart line draw-on animation
const COUNTUP_MS    = 650;   // portfolio total count-up on load
const FLASH_MS      = 550;   // header value flash on rate tick
```
Adjust these to speed up / slow down intro animations if needed.

---

## 14. Color Palette

```js
const COLOR_UP   = "#4ade80";  // green — gains, deposits, confirmed
const COLOR_DOWN = "#f87171";  // red   — losses, withdrawals, failed

// Background layers:
// #121218  page background
// #0e0e15  navbar
// #131119  chart section
// #1a1a24  modals
// #1e1e2e  dropdowns, tooltips
```
