# HX Crypto Dashboard — Handoff Document

> **Audience:** An AI or developer integrating these standalone pages into a master project. Covers architecture, component trees, constants, localStorage contracts, and integration paths.

---

## 1. Project Overview

HX is a crypto dashboard with four standalone pages:

| Page | HTML | JSX | Role |
|------|------|-----|------|
| Convert | `index.html` | `CryptoConverter.jsx` | Main converter — stable, do not modify |
| Markets | `markets.html` | `MarketsPage.jsx` | Price table + cards with live ticking |
| Wallet | `wallet.html` | `WalletPage.jsx` | Holdings + Send/Receive modals |
| Settings | `settings.html` | `SettingsPage.jsx` | Preferences, profile, avatar showcase |

**Design system:** Background `#121218`, nav bg `#0e0e15`, font `'JetBrains Mono'`, gain `#4ade80`, loss `#f87171`.

---

## 2. Loading Architecture (Babel Standalone — no bundler)

Each HTML entry point:

1. Loads React 18, ReactDOM 18, and `@babel/standalone` from unpkg CDN
2. `fetch()`s the JSX file as plain text
3. Strips the React import line: `.replace(/^import\s+.*?from\s+["']react["'];?\s*/m, '')`
4. Strips `export default`: `.replace(/export\s+default\s+function\s+MarketsPage/, 'function MarketsPage')`
5. Prepends a preamble that destructures React hooks from the global: `const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React;`
6. Appends `ReactDOM.createRoot(...).render(React.createElement(PageComponent))`
7. Runs `Babel.transform(full, { presets: ['react'] }).code` then `new Function(compiled)()`

Example from `markets.html`:
```html
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
...
<script>
  fetch('MarketsPage.jsx')
    .then(r => r.text())
    .then(src => {
      const preamble = `const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React;`;
      let code = src
        .replace(/^import\s+.*?from\s+["']react["'];?\s*/m, '')
        .replace(/export\s+default\s+function\s+MarketsPage/, 'function MarketsPage');
      const full = preamble + code + `
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(MarketsPage));
      `;
      const compiled = Babel.transform(full, { presets: ['react'] }).code;
      new Function(compiled)();
    });
</script>
```

CSS is injected at runtime by `injectMarketsCSS()` / `injectSettingsCSS()` — each checks for an existing `<style id="...">` before inserting, so injection is idempotent.

---

## 3. Cross-Page Navigation (localStorage Handshake Keys)

| Key | Writer | Reader | Purpose |
|-----|--------|--------|---------|
| `hx_convert_coin` | MarketsPage (Buy button) | CryptoConverter | Pre-selects coin in converter on load |
| `hx_wallet_coin` | MarketsPage (Receive button in card) | WalletPage | Auto-opens the Receive modal for that coin |
| `hx_favorites` | MarketsPage | MarketsPage | Persists starred coins across sessions |
| `hx_settings` | SettingsPage | SettingsPage | Persists currency, defaultCoin, language, animLevel |

Navigation between pages uses `window.location.href = "pagename.html"` — no router.

---

## 4. MarketsPage Deep-Dive

### Component Tree

```
MarketsPage (root)
├── CoinDetailModal          — detail overlay (table view row click)
├── NavBar                   — fixed top nav, 4 tabs
├── SummaryBar               — total market cap / 24h volume / BTC dominance
├── FilterRow                — search input + filter pills + table/card view toggle
├── CardsView                — grid of coin cards
│   ├── ExpandedCard         — expanded card with ExpandedCardChart (1D/7D/1M/3M)
│   │   └── CardSparkline    — full-width canvas sparkline
│   └── MiniSparkline        — compact canvas sparkline (unexpanded cards)
└── MarketsTable             — sortable table
    ├── ChangeCell           — coloured % badge
    ├── MiniSparkline        — 7d sparkline per row
    └── CoinDetailModal trigger
```

### Data Constants (all module-level)

```js
const COINS = {
  BTC:  { name: "Bitcoin",     icon: "₿", color: "#f7931a", decimals: 8 },
  ETH:  { name: "Ethereum",    icon: "Ξ", color: "#627eea", decimals: 4 },
  USDT: { name: "Tether",      icon: "₮", color: "#26a17b", decimals: 2 },
  SOL:  { name: "Solana",      icon: "◎", color: "#9945ff", decimals: 3 },
  BNB:  { name: "BNB",         icon: "◆", color: "#f0b90b", decimals: 4 },
  XRP:  { name: "Ripple",      icon: "✕", color: "#00aae4", decimals: 4 },
  USDC: { name: "USD Coin",    icon: "$", color: "#2775ca", decimals: 2 },
  ADA:  { name: "Cardano",     icon: "₳", color: "#3d9fee", decimals: 6 },
  DOGE: { name: "Dogecoin",    icon: "Ð", color: "#c2a633", decimals: 2 },
  AVAX: { name: "Avalanche",   icon: "▲", color: "#e84142", decimals: 4 },
  POL:  { name: "Polygon",     icon: "⬡", color: "#8247e5", decimals: 4 },
  HYPE: { name: "Hyperliquid", icon: "H", color: "#00e5ff", decimals: 4 },
};

const BASE_RATES = {
  "BTC/USDT": 67432.50, "ETH/USDT": 3521.80, "SOL/USDT": 142.65,
  "BNB/USDT": 612.40,   "XRP/USDT": 0.5214,  "USDC/USDT": 1.0001,
};

const COLOR_UP   = "#4ade80";
const COLOR_DOWN = "#f87171";
```

Additional mock constants: `MOCK_CHANGES` (24h %), `MOCK_7D_CHANGE`, `MOCK_SUPPLY`, `MOCK_VOLUME`, `MOCK_ATH`, `MOCK_PRICES_STATIC` (static fallback prices for coins not in BASE_RATES), `COIN_RANKS` (display order array).

### CSS Prefix

All classes: `.mk-*`

### localStorage Keys (consumed/written)

- `hx_favorites` — read on mount (lazy init), written on star toggle
- `hx_convert_coin` — written by Buy button, then navigates to `index.html`
- `hx_wallet_coin` — written by Receive button in expanded card, then navigates to `wallet.html`

### Live Ticking

`setInterval` every 3500 ms updates `BASE_RATES` keys for BTC/ETH/SOL/BNB/XRP/USDC with small random deltas. Triggers a green/red flash on the cell for 550 ms.

---

## 5. SettingsPage Deep-Dive

### Component Tree

```
SettingsPage (root)
├── KycModal                 — overlay listing 3 KYC steps (all COMPLETE)
├── NavBar                   — fixed top nav (wl-nav-* CSS prefix)
├── Profile section
│   ├── Profile banner       — guilloche SVG texture + avatar SVG
│   └── Reveal/hide toggle   — masks name/email/phone/accountId/joined
├── Security section
│   ├── 2FA row              — Toggle component + warning strip when off
│   ├── Change Password row  — stub (no modal)
│   └── KYC / Identity row   — opens KycModal
├── Preferences section
│   ├── Currency select      — USD/EUR/GBP/JPY/CAD/AUD (st-select)
│   ├── Default Coin select  — COINS_LIST (st-select)
│   └── Language selector    — LangSelector (flag dropdown)
├── Animation Preferences
│   └── AnimSeg              — NONE / MEDIUM / HEAVY segmented control
├── Data & Privacy section   — Active Sessions row (stub)
├── Save Changes button      — persists to localStorage "hx_settings"
└── Profile Card Concepts showcase — 7 ProfileCardVariant components
```

### Avatar System

Seven variants, all seeded and deterministic (same seed → same output):

| Label | Style | Builder function |
|-------|-------|-----------------|
| Banknote | Guilloche wave lines | `buildAvatarSVG` |
| Hex Grid | Honeycomb cells | `buildAvatarHex` |
| Circuit | PCB trace + pads | `buildAvatarCircuit` |
| Topographic | Fingerprint contours | `buildAvatarTopo` |
| Mandala | Radial symmetry | `buildAvatarMandala` |
| Weave | Diagonal fabric | `buildAvatarWeave` |
| Starburst | Dense sunburst rays | `buildAvatarStarburst` |

All share `_avatarBase(seed, suffix)` for common setup (palette + seeded RNG) and `_avatarFinish(...)` for shared final rendering (clip circle, mesh overlay, initials text).

Palette selection: hash of seed string → index into `AV_PALETTES` (6 entries: indigo, green, violet, sky, coral + one more). Hash uses `Math.imul(37, ph)` for speed. Palette object shape: `{ c1, c2, thread, circle0, circle1, banner }`.

Seeded RNG: `makeSeededRand(seed)` — xorshift32-style, returns `rand()` → `[0, 1)`. Used for all randomized geometry within each avatar so output is reproducible.

Background texture: `buildTextureSVG(seed)` — generates a separate guilloche SVG used as the profile banner background image.

### CSS Prefixes

- `.st-*` — SettingsPage components
- `.wl-nav-*` / `.wl-toggle-*` — shared nav and toggle (same prefix as WalletPage)

### localStorage Key

`hx_settings` — JSON object written by Save button, read on mount:
```js
{ currency: "USD", defaultCoin: "BTC", language: "en", animLevel: "MEDIUM" }
```

---

## 6. Duplicated Constants (Critical for Master Project)

Both `MarketsPage.jsx` and `CryptoConverter.jsx` (and potentially `WalletPage.jsx`) define their own copies of `COINS` and `BASE_RATES`. They are identical in shape but independent — changes to one do not propagate.

**COINS shape:**
```js
{ [ticker: string]: { name: string, icon: string, color: string, decimals: number } }
```

**BASE_RATES shape:**
```js
{ ["TICKER/USDT"]: number }  // only liquid pairs; stablecoins use fallback logic
```

**COLOR_UP / COLOR_DOWN** (`"#4ade80"` / `"#f87171"`) are also duplicated across files.

When merging into a master project, extract these to a shared `constants.js` and import from there.

---

## 7. Known Placeholder Features (UI Stubs)

These UI elements exist and render but have no real functionality:

| Feature | Location | What it does |
|---------|----------|--------------|
| Language switching | SettingsPage Preferences | Updates `language` state + saves to localStorage, but UI text does not translate |
| Animation level | SettingsPage Preferences | Updates `animLevel` state + saves, but no animations are conditionally gated on it |
| Change Password | SettingsPage Security | Renders a tappable row with a `>` chevron; no modal or handler |
| Active Sessions | SettingsPage Data & Privacy | Static row showing "2 active" with a `>` chevron; no panel |
| KYC modal | SettingsPage | Opens a read-only modal; all steps show COMPLETE (no real verification flow) |

---

## 8. Integration Guide

### Path A — Babel Standalone (copy as-is)

1. Copy `*.jsx` and `*.html` files into your project root (or a subdirectory).
2. Ensure each HTML file's `fetch('XxxPage.jsx')` path resolves correctly relative to the HTML file.
3. Serve with any static file server that supports `fetch()` (i.e., not `file://` — must be `http://`).
4. No build step, no config needed. CDN loads React 18 + Babel automatically.
5. Keep CSS class prefixes (`.mk-*`, `.st-*`, `.wl-*`) to avoid conflicts if pages are ever co-rendered.

**Gotcha:** The loader strips exactly one import line matching `/^import\s+.*?from\s+["']react["'];?\s*/m`. If you add other imports they will not be stripped and will cause a parse error.

### Path B — Bundler (Vite / webpack)

1. **Add React import** at top of each JSX file:
   ```js
   import React, { useEffect, useRef, useState } from "react";
   ```
   MarketsPage already has this. SettingsPage already has `import React, { useState, useEffect } from "react"`.

2. **Convert export:** Replace `export default function XxxPage()` pattern — already present in source, just ensure it isn't double-exported.

3. **Extract shared constants** to `src/constants.js`:
   ```js
   export const COINS = { ... };
   export const BASE_RATES = { ... };
   export const COLOR_UP = "#4ade80";
   export const COLOR_DOWN = "#f87171";
   ```
   Then in each page: `import { COINS, BASE_RATES, COLOR_UP, COLOR_DOWN } from "./constants";`

4. **CSS:** Extract CSS template strings (`MK_STYLE`, `ST_STYLE`) into real `.css` files and import them. Remove `injectMarketsCSS()` / `injectSettingsCSS()` calls and their `useEffect` wrappers. Keep class name prefixes to avoid conflicts.

5. **Router:** Replace `window.location.href = "pagename.html"` calls with your router's navigation function (e.g., `navigate("/markets")`). The localStorage handshake keys (`hx_convert_coin`, etc.) still work — just ensure the target page reads them on mount.

6. **Hook preamble:** Remove the HTML loader's preamble (`const { useState, ... } = React`) since bundled code imports hooks directly.
