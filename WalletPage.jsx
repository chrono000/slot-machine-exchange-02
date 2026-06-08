import React, { useEffect, useMemo, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════
// Data  (COINS, BASE_RATES, MOCK_CHANGES, COLOR_UP, COLOR_DOWN,
//         getUSDRate, fmtUSD, fmtBal, fmtPrice, addCommas
//         are loaded from shared.js)
// ═══════════════════════════════════════════════════════════════════

// PnL % change per period (1D is computed live from MOCK_CHANGES; others are mock)
const PERIOD_PNL_PCT = { "7D": 4.21, "1M": -8.73, "3M": 15.4 };

const GRID_INTRO_MS = 3200;
const GRID_FADE_MS  = 600;
const LINE_DRAW_MS  = 2400;
const COUNTUP_MS    = 650;
const FLASH_MS      = 550;

// Dust = any non-BTC holding worth less than this many USD.
const MIN_DUST_USD = 1;

// Tx-history helpers — kept module-scope so DusterModal doesn't reinvent them.
function formatNowForTx() {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `Today ${h12}:${m} ${ampm}`;
}
function makeTxHash() {
  return Array.from({ length: 10 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
}

const TX_STATUS ={ confirmed: "Confirmed", pending: "Pending", failed: "Failed", rejected: "Rejected", error: "Error" };
const TX_STATUS_COLOR = { confirmed: COLOR_UP, pending: "#f0b90b", failed: COLOR_DOWN, rejected: COLOR_DOWN, error: COLOR_DOWN };
const TX_STATUS_BG = { confirmed: "rgba(74,222,128,.1)", pending: "rgba(240,185,11,.1)", failed: "rgba(248,113,113,.1)", rejected: "rgba(248,113,113,.08)", error: "rgba(248,113,113,.08)" };

const MOCK_USER = {
  name:      "Alex Johnson",
  email:     "alex.johnson@email.com",
  phone:     "+1 (415) 555-0182",
  address:   "142 Blockchain Avenue, Suite 400",
  city:      "San Francisco, CA  94105",
  country:   "United States",
  accountId: "WLT-2847-9301",
  taxId:     "***-**-4821",
  joined:    "Jan 12, 2022",
};

const INFO_FIELDS = [
  { key:"name",      label:"Full Name"    },
  { key:"email",     label:"Email"        },
  { key:"phone",     label:"Phone"        },
  { key:"address",   label:"Address"      },
  { key:"city",      label:"City"         },
  { key:"country",   label:"Country"      },
  { key:"accountId", label:"Account ID"   },
  { key:"taxId",     label:"Tax ID"       },
  { key:"joined",    label:"Member Since" },
];

const MOCK_ACTIVITY = [
  { cat: "deposit",  coin: "BTC",  amount: "0.25000",   usd: "16,858.13", time: "Today 2:20 AM",    status: "confirmed", hash: "a1b2c3d4e5", id: 1  },
  { cat: "buy",      coin: "ETH",  amount: "0.2500",    usd: "820.00",    time: "Today 1:45 AM",    status: "confirmed", hash: "b2y3u4i5o6", id: 19 },
  { cat: "trade",    coin: "ETH",  amount: "2.4000",    usd: "8,452.32",  time: "Today 1:05 AM",    status: "confirmed", hash: "f6g7h8i9j0", id: 2  },
  { cat: "swap",     coin: "ETH",  amount: "1.5000",    usd: "5,282.70",  time: "Today 12:30 AM",   status: "confirmed", hash: "s7w8a9p0q1", id: 20, detail: "→ 0.065 BTC" },
  { cat: "withdraw", coin: "USDT", amount: "1,200.00",  usd: "1,200.00",  time: "Mar 17 11:44 PM",  status: "pending",   hash: "k1l2m3n4o5", id: 3  },
  { cat: "sell",     coin: "SOL",  amount: "150.000",   usd: "22,500.00", time: "Mar 17 10:15 PM",   status: "confirmed", hash: "s3l4l5s6o7", id: 21 },
  { cat: "deposit",  coin: "SOL",  amount: "40.000",    usd: "5,706.00",  time: "Mar 17 9:30 PM",   status: "confirmed", hash: "p6q7r8s9t0", id: 4  },
  { cat: "send",     coin: "BTC",  amount: "0.01000",   usd: "674.33",    time: "Mar 17 8:00 PM",   status: "confirmed", hash: "s8e9n0d1a2", id: 22, detail: "to 0x7f…3a2" },
  { cat: "receive",  coin: "ETH",  amount: "3.0000",    usd: "10,565.40", time: "Mar 17 7:00 PM",   status: "confirmed", hash: "r3c4v5e6f7", id: 23 },
  { cat: "trade",    coin: "BNB",  amount: "5.2000",    usd: "3,184.48",  time: "Mar 17 6:15 PM",   status: "confirmed", hash: "u1v2w3x4y5", id: 5  },
  { cat: "stake",    coin: "ETH",  amount: "32.0000",   usd: "112,697.60",time: "Mar 17 5:00 PM",   status: "confirmed", hash: "s1t2k3e4d5", id: 24 },
  { cat: "withdraw", coin: "BTC",  amount: "0.10000",   usd: "6,743.25",  time: "Mar 17 3:00 PM",   status: "failed",    hash: "z6a7b8c9d0", id: 6  },
  { cat: "reward",   coin: "ETH",  amount: "0.0008",    usd: "2.82",      time: "Mar 17 12:00 PM",  status: "confirmed", hash: "r6w7d8e9f0", id: 25 },
  { cat: "deposit",  coin: "XRP",  amount: "500.0000",  usd: "260.70",    time: "Mar 16 8:22 PM",   status: "confirmed", hash: "e1f2g3h4i5", id: 7  },
  { cat: "trade",    coin: "ETH",  amount: "1.0000",    usd: "3,521.80",  time: "Mar 16 5:11 PM",   status: "rejected",  hash: "j6k7l8m9n0", id: 8  },
  { cat: "unstake",  coin: "SOL",  amount: "50.000",    usd: "7,132.50",  time: "Mar 16 4:00 PM",   status: "confirmed", hash: "u1n2s3t4k5", id: 26 },
  { cat: "withdraw", coin: "USDC", amount: "800.00",    usd: "800.08",    time: "Mar 16 2:45 PM",   status: "error",     hash: "o1p2q3r4s5", id: 9  },
  { cat: "buy",      coin: "BTC",  amount: "0.05000",   usd: "3,371.63",  time: "Mar 16 1:00 PM",   status: "pending",   hash: "b8u9y0a1b2", id: 27 },
  { cat: "deposit",  coin: "BTC",  amount: "0.05000",   usd: "3,371.63",  time: "Mar 15 11:30 AM",  status: "confirmed", hash: "t6u7v8w9x0", id: 10 },
  { cat: "trade",    coin: "SOL",  amount: "20.000",    usd: "2,853.00",  time: "Mar 15 9:00 AM",   status: "confirmed", hash: "y1z2a3b4c5", id: 11 },
  { cat: "sell",     coin: "BNB",  amount: "2.0000",    usd: "1,224.80",  time: "Mar 15 7:30 AM",   status: "rejected",  hash: "s5l6l7b8n9", id: 28 },
  { cat: "withdraw", coin: "ETH",  amount: "0.5000",    usd: "1,760.90",  time: "Mar 14 7:15 PM",   status: "pending",   hash: "d6e7f8g9h0", id: 12 },
  { cat: "send",     coin: "USDT", amount: "500.00",    usd: "500.00",    time: "Mar 14 6:00 PM",   status: "error",     hash: "s2n3d4u5t6", id: 29, detail: "to 0x3b…9f1" },
  { cat: "deposit",  coin: "USDT", amount: "5,000.00",  usd: "5,000.00",  time: "Mar 14 4:30 PM",   status: "confirmed", hash: "i1j2k3l4m5", id: 13 },
  { cat: "swap",     coin: "BNB",  amount: "10.0000",   usd: "6,124.00",  time: "Mar 14 2:00 PM",   status: "confirmed", hash: "s7w8p9b0n1", id: 30, detail: "→ 4,200 USDT" },
  { cat: "trade",    coin: "BNB",  amount: "3.0000",    usd: "1,837.20",  time: "Mar 13 10:00 AM",  status: "confirmed", hash: "n6o7p8q9r0", id: 14 },
  { cat: "receive",  coin: "BTC",  amount: "0.00500",   usd: "337.16",    time: "Mar 13 8:00 AM",   status: "confirmed", hash: "r4c5v6b7t8", id: 31 },
  { cat: "stake",    coin: "SOL",  amount: "100.000",   usd: "14,265.00", time: "Mar 13 6:00 AM",   status: "pending",   hash: "s3t4k5s6l7", id: 32 },
  { cat: "withdraw", coin: "XRP",  amount: "1,000.000", usd: "521.40",    time: "Mar 12 6:00 PM",   status: "confirmed", hash: "s1t2u3v4w5", id: 15 },
  { cat: "reward",   coin: "SOL",  amount: "0.250",     usd: "35.66",     time: "Mar 12 4:00 PM",   status: "confirmed", hash: "r8w9d0s1l2", id: 33 },
  { cat: "deposit",  coin: "USDC", amount: "2,500.00",  usd: "2,500.25",  time: "Mar 12 3:20 PM",   status: "confirmed", hash: "x6y7z8a9b0", id: 16 },
  { cat: "trade",    coin: "BTC",  amount: "0.01500",   usd: "1,011.49",  time: "Mar 11 11:00 AM",  status: "failed",    hash: "c1d2e3f4g5", id: 17 },
  { cat: "deposit",  coin: "ETH",  amount: "5.0000",    usd: "17,609.00", time: "Mar 10 9:45 AM",   status: "confirmed", hash: "h6i7j8k9l0", id: 18 },
];

const MOCK_ADDRESSES = {
  BTC:  "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  ETH:  "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  USDT: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  SOL:  "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
  BNB:  "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2",
  XRP:  "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  USDC: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
};

const CONVERTER_TICKERS = new Set(["BTC", "ETH", "USDT", "SOL", "BNB", "XRP", "USDC"]);
const DEFAULT_SPEND_STABLE = "USDT";
const MODAL_COIN = "coin";

/** Spend/buy pair when routing wallet Buy/Sell into the converter. */
function getWalletTradeRoute(coin, side) {
  const spend = side === "buy" ? (coin === "USDT" ? "USDC" : DEFAULT_SPEND_STABLE) : coin;
  const buy = side === "buy" ? coin : (coin === "USDT" ? "USDC" : DEFAULT_SPEND_STABLE);
  const tradable = CONVERTER_TICKERS.has(coin) && CONVERTER_TICKERS.has(spend) && CONVERTER_TICKERS.has(buy);
  return { spend, buy, tradable };
}

function coinAccentStyle(color) {
  return { borderColor: color + "35", background: color + "12" };
}


const DEPOSIT_NETWORKS = {
  BTC:  [{ id: "btc", label: "Bitcoin", prefix: "bc1", min: "0.0001", confirms: 2, fee: "0.000008", tag: null }],
  ETH:  [
    { id: "erc20", label: "Ethereum (ERC-20)", prefix: "0x", min: "0.001", confirms: 12, fee: "0.00042", tag: null },
    { id: "arb", label: "Arbitrum One", prefix: "0x", min: "0.001", confirms: 20, fee: "0.00012", tag: null },
  ],
  USDT: [
    { id: "trc20", label: "Tron (TRC-20)", prefix: "T", min: "1", confirms: 19, fee: "1", tag: null },
    { id: "erc20", label: "Ethereum (ERC-20)", prefix: "0x", min: "10", confirms: 12, fee: "5", tag: null },
    { id: "bep20", label: "BNB Smart Chain", prefix: "0x", min: "1", confirms: 15, fee: "0.5", tag: null },
  ],
  USDC: [
    { id: "erc20", label: "Ethereum (ERC-20)", prefix: "0x", min: "10", confirms: 12, fee: "5", tag: null },
    { id: "sol", label: "Solana (SPL)", prefix: "", min: "1", confirms: 32, fee: "0.01", tag: null },
  ],
  SOL:  [{ id: "sol", label: "Solana", prefix: "", min: "0.01", confirms: 32, fee: "0.000025", tag: null }],
  BNB:  [{ id: "bep20", label: "BNB Smart Chain", prefix: "bnb", min: "0.01", confirms: 15, fee: "0.0003", tag: null }],
  XRP:  [{ id: "xrp", label: "XRP Ledger", prefix: "r", min: "10", confirms: 1, fee: "0.1", tag: "required", tagLabel: "Destination Tag", mockTag: "483920184" }],
  ADA:  [{ id: "ada", label: "Cardano", prefix: "addr", min: "5", confirms: 15, fee: "0.8", tag: null }],
  DOGE: [{ id: "doge", label: "Dogecoin", prefix: "D", min: "5", confirms: 6, fee: "2", tag: null }],
  AVAX: [{ id: "avax", label: "Avalanche C-Chain", prefix: "0x", min: "0.1", confirms: 12, fee: "0.002", tag: null }],
  POL:  [{ id: "polygon", label: "Polygon", prefix: "0x", min: "1", confirms: 128, fee: "0.05", tag: null }],
  HYPE: [{ id: "hype", label: "Hyperliquid", prefix: "0x", min: "0.1", confirms: 8, fee: "0.001", tag: null }],
  XMR:  [{ id: "xmr", label: "Monero", prefix: "4", min: "0.01", confirms: 10, fee: "0.0001", tag: null }],
};

const DEPOSIT_ADDR_BY_NET = {
  btc: MOCK_ADDRESSES.BTC,
  erc20: MOCK_ADDRESSES.ETH,
  arb: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  trc20: "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf",
  bep20: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  sol: MOCK_ADDRESSES.SOL,
  xrp: MOCK_ADDRESSES.XRP,
  ada: "addr1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  doge: "D7Y55LdC3H3vJ8K2mN9pQrS4tU6vW1xYzA",
  avax: MOCK_ADDRESSES.ETH,
  polygon: MOCK_ADDRESSES.ETH,
  hype: MOCK_ADDRESSES.ETH,
  xmr: "48edfHu7V9Z84Yzzk7KBVft6uvrrNZKVx9Q2P7kKj7Z8Y9aBcDeFgHiJkLmNoPqRsTuVwXyZ",
};

const WITHDRAW_NETWORKS = DEPOSIT_NETWORKS;

const WITHDRAW_MIN_USD = 10;

const MOCK_ADDRESS_BOOK = [
  { id: 1, label: "Cold storage", coin: "BTC", networkId: "btc", address: "bc1q9vza2e8x73ncmq4kdzau9a9t6x8w2k3m4n5p6q7r8s9t0u" },
  { id: 2, label: "Trading desk", coin: "ETH", networkId: "erc20", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0" },
  { id: 3, label: "Partner payout", coin: "USDT", networkId: "trc20", address: "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf" },
  { id: 4, label: "Exchange hot", coin: "SOL", networkId: "sol", address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" },
];

function getDepositNetworks(ticker) {
  return DEPOSIT_NETWORKS[ticker] || [{
    id: "default", label: `${ticker} Network`, prefix: "", min: "0.01", confirms: 12, fee: "0.001", tag: null,
  }];
}

function getDepositAddress(ticker, networkId) {
  return DEPOSIT_ADDR_BY_NET[networkId] || MOCK_ADDRESSES[ticker] || MOCK_ADDRESSES.ETH;
}

function validateWithdrawAddress(address, network) {
  const a = address.trim();
  if (!a) return { ok: false, code: "empty", msg: "Enter a recipient address" };
  if (a.length < 12) return { ok: false, code: "short", msg: "Address looks too short" };
  if (network.prefix && !a.startsWith(network.prefix)) {
    return { ok: false, code: "prefix", msg: `This network expects addresses starting with “${network.prefix}”` };
  }
  if (a.includes(" ")) return { ok: false, code: "space", msg: "Address cannot contain spaces" };
  return { ok: true };
}

// Every withdrawal requires the full second-factor chain (2FA → email),
// regardless of size. Kept as a function so a size threshold could be
// reintroduced here later without touching the SendModal flow.
function is2faRequired(usdVal) {
  return true;
}

const WL_CSS_ID = "wl-styles";

// Utilities (getUSDRate, addCommas, fmtUSD, fmtPrice, fmtBal from shared.js)

// genChartData from shared.js

// ═══════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════
const WL_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#121218;font-family:'JetBrains Mono',ui-monospace,monospace;color:rgba(255,255,255,.92);min-height:100vh}

.wl-nav{position:fixed;top:0;left:0;right:0;height:44px;background:#0e0e15;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;padding:0 20px;gap:16px;z-index:200}
.wl-nav-logo{font-size:15px;font-weight:700;color:rgba(255,255,255,.92);letter-spacing:.05em;margin-right:8px}
.wl-nav-tab{text-decoration:none;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;color:rgba(255,255,255,.35);transition:all 150ms;letter-spacing:.03em}
.wl-nav-tab:hover{color:rgba(255,255,255,.65)}
.wl-nav-tab--active{color:rgba(255,255,255,.92);border-bottom:2px solid rgba(255,255,255,.8);border-radius:0;padding-bottom:2px}

.wl-root{padding-top:44px;min-height:100vh}
.wl-container{max-width:860px;margin:0 auto;padding:16px 14px 48px}

/* Portfolio header */
.wl-header{padding:18px 0 10px}
.wl-total-label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:6px}
.wl-total-value{font-size:36px;font-weight:700;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.95);line-height:1;margin-bottom:6px;letter-spacing:-.5px}
.wl-pnl-badge{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600;padding:3px 8px;border-radius:6px}
.wl-pnl-badge--up{color:${COLOR_UP};background:rgba(74,222,128,.1)}
.wl-pnl-badge--down{color:${COLOR_DOWN};background:rgba(248,113,113,.1)}
.wl-pnl-badge--flat{color:rgba(255,255,255,.3);background:rgba(255,255,255,.05)}
.wl-pnl-badge--action{cursor:pointer;transition:background 150ms,box-shadow 150ms}
.wl-pnl-badge--action::after{content:"›";margin-left:0;max-width:0;overflow:hidden;display:inline-block;opacity:0;transition:max-width 220ms cubic-bezier(.2,.9,.2,1),margin-left 220ms cubic-bezier(.2,.9,.2,1),opacity 180ms ease;font-size:14px;vertical-align:middle;line-height:1;font-weight:400}
.wl-pnl-badge--action:hover::after{max-width:12px;margin-left:5px;opacity:.65}
.wl-pnl-badge--up.wl-pnl-badge--action:hover{background:rgba(74,222,128,.2);box-shadow:0 0 0 1px rgba(74,222,128,.22)}
.wl-pnl-badge--down.wl-pnl-badge--action:hover{background:rgba(248,113,113,.2);box-shadow:0 0 0 1px rgba(248,113,113,.22)}

/* Chart */
.wl-chart-section{background:#131119;border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden;margin-bottom:10px}
.wl-chart-topbar{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 4px;gap:8px}
.wl-chart-canvas{display:block;width:100%;height:130px}
/* Desktop: container widens, so give the chart more height for a better aspect ratio */
@media(min-width:600px){.wl-chart-canvas{height:200px}}
.wl-period-row{display:flex;align-items:center;gap:2px}
.wl-period-btn{font-size:11px;font-weight:600;font-family:inherit;padding:4px 9px;border-radius:7px;border:0;background:transparent;color:rgba(255,255,255,.3);cursor:pointer;transition:all 120ms;letter-spacing:.04em}
.wl-period-btn--active{background:rgba(255,255,255,.1);color:rgba(255,255,255,.85)}
.wl-period-btn:hover:not(.wl-period-btn--active){color:rgba(255,255,255,.6)}

/* Section */
.wl-section{margin-bottom:14px}
.wl-section-head{display:flex;align-items:center;gap:7px;margin-bottom:8px}
.wl-section-title{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.4)}
.wl-section-sub{font-size:10px;color:rgba(255,255,255,.2)}

/* Compact header action buttons */
.wl-header-btn{font-size:10px;font-weight:600;font-family:inherit;color:rgba(255,255,255,.62);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.11);border-radius:7px;height:15px;padding:0 9px;cursor:pointer;letter-spacing:.04em;transition:filter 150ms,transform 150ms,border-color 150ms;display:inline-flex;align-items:center;gap:4px}
.wl-header-btn:hover{filter:brightness(1.4);transform:scale(1.05);border-color:rgba(255,255,255,.3)}

/* Asset breakdown bar */
.wl-breakdown{margin-bottom:8px}
.wl-breakdown-bar{display:flex;height:6px;border-radius:4px;overflow:visible;gap:1px;margin-bottom:8px}
.wl-breakdown-seg{height:100%;transition:flex 600ms cubic-bezier(.2,.8,.2,1);border-radius:2px}
.wl-breakdown-legend{display:flex;justify-content:space-between;align-items:center;width:100%}
.wl-breakdown-item{display:flex;align-items:center;gap:4px;font-size:9px;color:rgba(255,255,255,.4);font-weight:600;letter-spacing:.04em}
.wl-breakdown-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
/* Period dropdown */
.wl-period-drop{position:relative}
.wl-period-menu{position:absolute;top:calc(100% + 5px);right:0;background:#1e1e2e;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:4px;min-width:130px;z-index:50;animation:wlFadeIn 150ms ease}
.wl-period-menu-item{display:flex;align-items:center;gap:7px;width:100%;padding:7px 10px;border-radius:7px;border:0;background:transparent;font-family:inherit;font-size:11px;font-weight:600;color:rgba(255,255,255,.55);cursor:pointer;transition:all 120ms;text-align:left;letter-spacing:.03em}
.wl-period-menu-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.88)}
.wl-period-menu-item--active{color:rgba(255,255,255,.92);background:rgba(255,255,255,.06)}
.wl-period-menu-divider{height:1px;background:rgba(255,255,255,.07);margin:3px 4px}
.wl-big-chart-tabs{display:flex;gap:2px;margin-bottom:14px;background:rgba(255,255,255,.04);border-radius:9px;padding:3px;width:fit-content}
.wl-breakdown-other{position:relative;cursor:default}
.wl-breakdown-tooltip{position:absolute;top:calc(100% + 6px);left:0;background:#1e1e2e;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:7px 10px;white-space:nowrap;opacity:0;pointer-events:none;transform:translateY(-4px);transition:all 150ms;z-index:60;display:flex;flex-direction:column;gap:4px}
.wl-breakdown-tooltip-row{display:flex;align-items:center;gap:5px;font-size:9px;font-weight:600;color:rgba(255,255,255,.55)}

.wl-th-hold{position:relative;display:inline-flex;align-items:center;gap:3px;cursor:default}
.wl-th-hold-tip{position:absolute;top:calc(100% + 6px);right:0;background:#1e1e2e;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:6px 10px;white-space:nowrap;font-size:9px;font-weight:500;letter-spacing:.03em;color:rgba(255,255,255,.55);text-transform:none;opacity:0;pointer-events:none;transform:translateY(-4px);transition:all 150ms;z-index:60;line-height:1.5}
.wl-th-hold:hover .wl-th-hold-tip{opacity:1;transform:translateY(0)}

/* Token table */
.wl-table{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden}
.wl-table-head{display:grid;grid-template-columns:1fr 150px 110px 90px;align-items:center;padding:7px 12px;border-bottom:1px solid rgba(255,255,255,.06)}
.wl-th{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.2);cursor:pointer;user-select:none;transition:color 120ms;position:relative;padding-right:12px}
.wl-th:not(:first-child){text-align:right}
.wl-th:hover{color:rgba(255,255,255,.45)}
.wl-th--active{color:rgba(255,255,255,.7) !important}
.wl-th-sort{position:absolute;right:0;top:50%;transform:translateY(-50%);display:inline-flex;flex-direction:column;gap:1px;line-height:1}
.wl-th-sort-up,.wl-th-sort-dn{font-size:6px;line-height:1;color:rgba(255,255,255,.2);transition:color 120ms}
.wl-th-sort-up--on,.wl-th-sort-dn--on{color:rgba(255,255,255,.8)}
.wl-token-row{display:grid;grid-template-columns:1fr 150px 110px 90px;align-items:center;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.04);transition:background 120ms;cursor:pointer}
.wl-token-row:last-child{border-bottom:none}
.wl-token-row:hover{background:rgba(255,255,255,.035)}
.wl-token-row--zero{opacity:.38}
.wl-token-row--zero:hover{opacity:.55;background:rgba(255,255,255,.025)}
.wl-deposit-cta{font-size:9px;font-weight:700;font-family:inherit;letter-spacing:.05em;padding:3px 8px;border-radius:5px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(255,255,255,.35);cursor:pointer;transition:all 120ms;white-space:nowrap}
.wl-deposit-cta:hover{background:rgba(255,255,255,.1);color:rgba(255,255,255,.75);border-color:rgba(255,255,255,.25)}
.wl-asset-search{width:80px;height:20px;border-radius:5px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);padding:0 6px 0 20px;font-size:9px;font-family:inherit;color:rgba(255,255,255,.7);outline:none;transition:border-color 150ms,width 200ms}
.wl-asset-search:focus{border-color:rgba(255,255,255,.18);width:120px}
.wl-asset-search::placeholder{color:rgba(255,255,255,.2)}
.wl-asset-search-wrap{position:relative;margin-left:auto}
.wl-asset-search-icon{position:absolute;left:6px;top:50%;transform:translateY(-50%);font-size:9px;color:rgba(255,255,255,.2);pointer-events:none}
.wl-hide-zero{display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none;white-space:nowrap}
.wl-hide-zero-label{font-size:9px;font-weight:600;letter-spacing:.04em;color:rgba(255,255,255,.25);transition:color 120ms}
.wl-hide-zero:hover .wl-hide-zero-label{color:rgba(255,255,255,.5)}
.wl-toggle{width:26px;height:14px;border-radius:7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);position:relative;transition:all 150ms;flex-shrink:0}
.wl-toggle--on{background:rgba(99,102,241,.5);border-color:rgba(99,102,241,.6)}
.wl-toggle-thumb{position:absolute;top:2px;left:2px;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.35);transition:all 150ms}
.wl-toggle--on .wl-toggle-thumb{left:14px;background:#fff}
.wl-token-left{display:flex;align-items:center;gap:9px;min-width:0}
.wl-token-icon{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;flex-shrink:0}
.wl-token-name{font-size:12px;font-weight:700;color:rgba(255,255,255,.88);white-space:nowrap}
.wl-token-sub{font-size:9px;color:rgba(255,255,255,.28);margin-top:1px}
.wl-td{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;text-align:right;color:rgba(255,255,255,.7)}
.wl-td--val{color:rgba(255,255,255,.88)}
.wl-td--up{color:${COLOR_UP}}
.wl-td--down{color:${COLOR_DOWN}}

/* Transaction history modal */
.wl-tx-modal{max-width:520px;height:min(820px,calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 120px));max-height:min(820px,calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 120px));display:flex;flex-direction:column}
.wl-tx-tabs{display:flex;gap:2px;margin-bottom:14px;background:rgba(255,255,255,.04);border-radius:9px;padding:3px}
.wl-tx-tab{flex:1;font-size:10px;font-weight:700;font-family:inherit;padding:5px 4px;border-radius:7px;border:0;background:transparent;color:rgba(255,255,255,.3);cursor:pointer;transition:all 150ms;letter-spacing:.04em}
.wl-tx-tab--active{background:rgba(255,255,255,.1);color:rgba(255,255,255,.88)}
.wl-tx-list{height:100%;overflow-y:auto;margin:0 -4px;padding:0 4px}
.wl-tx-list::-webkit-scrollbar{width:3px}
.wl-tx-list::-webkit-scrollbar-track{background:transparent}
.wl-tx-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.wl-tx-row{display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.05);transition:background 120ms;border-radius:6px}
.wl-tx-row:last-child{border-bottom:none}
.wl-tx-row:hover{background:rgba(255,255,255,.03)}
.wl-tx-icon{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;flex-shrink:0}
.wl-tx-info{flex:1;min-width:0}
.wl-tx-label{font-size:11px;font-weight:600;color:rgba(255,255,255,.5);text-transform:capitalize}
.wl-tx-amount{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.88)}
.wl-tx-right{text-align:right;flex-shrink:0}
.wl-tx-usd{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.6)}
.wl-tx-time{font-size:9px;color:rgba(255,255,255,.22);margin-top:2px}
.wl-tx-status{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;letter-spacing:.04em;margin-top:2px}
.wl-tx-hash{font-size:9px;color:rgba(255,255,255,.2);font-variant-numeric:tabular-nums;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:90px}
.wl-tx-pagination{display:flex;align-items:center;justify-content:space-between;padding-top:12px;margin-top:4px;border-top:1px solid rgba(255,255,255,.06)}
.wl-tx-pg-btn{font-size:11px;font-weight:600;font-family:inherit;padding:5px 12px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);cursor:pointer;transition:all 120ms}
.wl-tx-pg-btn:hover:not(:disabled){background:rgba(255,255,255,.09);color:rgba(255,255,255,.85)}
.wl-tx-pg-btn:disabled{opacity:.25;cursor:not-allowed}
.wl-tx-pg-info{font-size:10px;color:rgba(255,255,255,.3);font-weight:600}
.wl-tx-skeleton{display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.05)}
.wl-tx-skeleton:last-child{border-bottom:none}
/* Skeleton classes: use shared .hx-sk, .hx-sk-circle, .hx-sk-lines from shared.js */
.wl-tx-list--loading{pointer-events:none}
.wl-tx-body{flex:1;overflow:hidden;position:relative;min-height:0}

/* Modals */
.wl-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;padding-top:max(88px,calc(env(safe-area-inset-top,0px) + 72px));padding-bottom:max(24px,calc(env(safe-area-inset-bottom,0px) + 16px));animation:wlFadeIn 200ms ease}
.wl-overlay--chart{background:rgba(0,0,0,.75);backdrop-filter:blur(12px)}
@keyframes wlFadeIn{from{opacity:0}to{opacity:1}}
/* shimmer keyframe moved to shared.js (hxShimmer) */
.wl-modal{background:#1a1a24;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:22px;width:100%;max-width:460px;animation:wlSlideUp 280ms cubic-bezier(.2,.8,.2,1);font-family:'JetBrains Mono',ui-monospace,monospace;color:#fff}
/* Enlarged chart modal — must come after .wl-modal to override max-width:460px */
.wl-big-chart-modal{max-width:960px;width:calc(100vw - 120px);padding:28px}
@keyframes wlSlideUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.wl-modal-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:18px}
.wl-modal-title{font-size:15px;font-weight:700;color:rgba(255,255,255,.92);flex:1;min-width:0}
.wl-modal-back{flex-shrink:0;background:rgba(255,255,255,.06);border:0;color:rgba(255,255,255,.55);font-size:16px;width:32px;height:32px;border-radius:50%;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 140ms;font-family:inherit;line-height:1}
.wl-modal-back:hover{background:rgba(255,255,255,.12);color:rgba(255,255,255,.9)}
.wl-modal-close{flex-shrink:0;background:transparent;border:0;color:rgba(255,255,255,.3);font-size:16px;cursor:pointer;line-height:1;padding:2px 4px;transition:color 120ms}
.wl-modal-close:hover{color:rgba(255,255,255,.7)}
.wl-field-label{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:5px}
.wl-coin-sel{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 11px;cursor:pointer;margin-bottom:12px;transition:all 150ms}
.wl-coin-sel:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18)}
.wl-coin-sel-icon{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;flex-shrink:0}
.wl-coin-sel-ticker{font-size:13px;font-weight:700;flex:1}
.wl-coin-sel-name{font-size:10px;color:rgba(255,255,255,.3)}
.wl-coin-sel-arrow{font-size:10px;color:rgba(255,255,255,.25)}
.wl-coin-dropdown{background:#1e1e2e;border:1px solid rgba(255,255,255,.09);border-radius:10px;overflow:hidden;margin-bottom:12px}
.wl-coin-option{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;transition:background 100ms}
.wl-coin-option:hover{background:rgba(255,255,255,.06)}
.wl-amount-wrap{position:relative;margin-bottom:5px}
.wl-amount-input{width:100%;height:48px;border-radius:11px;border:1px solid rgba(255,255,255,.12);padding:0 104px 0 14px;font-size:18px;font-family:inherit;font-variant-numeric:tabular-nums;font-weight:600;color:rgba(255,255,255,.92);background:rgba(255,255,255,.04);outline:none;transition:border-color 150ms}
.wl-amount-input:focus{border-color:rgba(255,255,255,.25);box-shadow:0 0 0 3px rgba(255,255,255,.06)}
.wl-amount-input::placeholder{color:rgba(255,255,255,.18);font-size:15px}
.wl-amount-input::-webkit-inner-spin-button,.wl-amount-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.wl-amount-input{-moz-appearance:textfield}
.wl-amount-steppers{position:absolute;right:52px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:2px}
.wl-amount-step{display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:rgba(255,255,255,.45);cursor:pointer;font-size:9px;line-height:1;transition:all 120ms;user-select:none}
.wl-amount-step:hover{background:rgba(255,255,255,.12);color:rgba(255,255,255,.85);border-color:rgba(255,255,255,.22)}
.wl-max-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:9px;font-weight:700;font-family:inherit;color:rgba(255,255,255,.4);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:3px 6px;cursor:pointer;transition:all 120ms;letter-spacing:.05em}
.wl-max-btn:hover{background:rgba(255,255,255,.12);color:rgba(255,255,255,.8)}
.wl-usd-hint{font-size:10px;color:rgba(255,255,255,.3);margin-bottom:12px;padding-left:2px}
.wl-addr-input{width:100%;height:42px;border-radius:11px;border:1px solid rgba(255,255,255,.12);padding:0 12px;font-size:11px;font-family:inherit;color:rgba(255,255,255,.85);background:rgba(255,255,255,.04);outline:none;transition:border-color 150ms;margin-bottom:12px}
.wl-addr-input:focus{border-color:rgba(255,255,255,.25);box-shadow:0 0 0 3px rgba(255,255,255,.06)}
.wl-addr-input::placeholder{color:rgba(255,255,255,.18)}
.wl-fee-box{background:rgba(255,255,255,.03);border-radius:9px;padding:9px 12px;margin-bottom:14px}
.wl-fee-row{display:flex;justify-content:space-between;align-items:center;padding:3px 0}
.wl-fee-label{font-size:10px;color:rgba(255,255,255,.35);font-weight:500}
.wl-fee-val{font-size:10px;color:rgba(255,255,255,.7);font-weight:600;font-variant-numeric:tabular-nums}
.wl-confirm-btn{width:100%;height:44px;border-radius:10px;border:0;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all 150ms;letter-spacing:.03em}
.wl-confirm-btn:disabled{opacity:.3;cursor:not-allowed}
.wl-addr-display{font-size:10px;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.6);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:10px 12px;word-break:break-all;line-height:1.7;margin-bottom:12px}
.wl-qr-box{width:120px;height:120px;border:2px dashed rgba(255,255,255,.12);border-radius:10px;display:grid;place-items:center;color:rgba(255,255,255,.18);margin:0 auto 14px}
.wl-copy-btn{width:100%;height:38px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-family:inherit;font-size:12px;font-weight:600;color:rgba(255,255,255,.75);cursor:pointer;transition:all 150ms}
.wl-copy-btn:hover{background:rgba(255,255,255,.1)}
.wl-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1e1e2e;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 16px;font-size:12px;font-weight:600;color:rgba(255,255,255,.88);z-index:400;white-space:nowrap;animation:wlToastIn 240ms cubic-bezier(.2,.8,.2,1)}
@keyframes wlToastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes wlFlashUp{0%,100%{opacity:1}50%{color:${COLOR_UP}}}
@keyframes wlFlashDown{0%,100%{opacity:1}50%{color:${COLOR_DOWN}}}
.wl-flash-up{animation:wlFlashUp ${FLASH_MS}ms ease}
.wl-flash-down{animation:wlFlashDown ${FLASH_MS}ms ease}
@keyframes wlTxHighlight{0%{background:rgba(110,200,160,.28);box-shadow:inset 0 0 0 1px rgba(110,200,160,.25)}50%{background:rgba(110,200,160,.14);box-shadow:inset 0 0 0 1px rgba(110,200,160,.12)}100%{background:transparent;box-shadow:none}}
.wl-tx-row--highlight{animation:wlTxHighlight 2.2s ease-out!important}

/* Coin detail modal */
.wl-coin-modal{max-width:420px}
.wl-cd-hero{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 0 20px}
.wl-cd-icon{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-size:28px;font-weight:700;margin-bottom:4px}
.wl-cd-ticker{font-size:11px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.35)}
.wl-cd-price{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.92);letter-spacing:-.5px}
.wl-cd-balance-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:center}
.wl-cd-bal-label{font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:6px}
.wl-cd-bal-coin{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.88);margin-bottom:3px}
.wl-cd-bal-usd{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.35)}
.wl-cd-actions{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
.wl-cd-btn{height:42px;border-radius:10px;border:0;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;transition:all 150ms;letter-spacing:.03em;white-space:nowrap}
.wl-cd-btn--send{background:rgba(220,60,60,.18);color:rgba(255,120,120,1);border:1px solid rgba(220,60,60,.35)}
.wl-cd-btn--send:hover{background:rgba(220,60,60,.28);color:#ff8080;border-color:rgba(220,60,60,.55)}
.wl-cd-btn--receive{background:rgba(74,222,128,.1);color:${COLOR_UP};border:1px solid rgba(74,222,128,.25)}
.wl-cd-btn--receive:hover{background:rgba(74,222,128,.18);border-color:rgba(74,222,128,.4)}
.wl-cd-btn--buy{background:rgba(100,200,240,.12);color:rgba(100,200,240,1);border:1px solid rgba(100,200,240,.3)}
.wl-cd-btn--buy:hover{background:rgba(100,200,240,.22);color:rgba(120,210,250,1);border-color:rgba(100,200,240,.5)}
.wl-cd-btn--sell{background:rgba(255,180,100,.12);color:rgba(255,180,100,1);border:1px solid rgba(255,180,100,.3)}
.wl-cd-btn--sell:hover{background:rgba(255,180,100,.22);color:rgba(255,200,120,1);border-color:rgba(255,180,100,.5)}

/* Portfolio history modal */
.wl-history-inline-btn{width:100%;margin-top:0;height:15px;border-radius:7px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.06);font-size:10px;font-weight:600;font-family:inherit;color:rgba(255,255,255,.78);cursor:pointer;letter-spacing:.05em;transition:all 150ms}
.wl-history-inline-btn:hover{color:rgba(255,255,255,.88);background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2)}
.wl-dust-link{background:none;border:0;cursor:pointer;font-family:inherit;font-size:10px;font-weight:500;color:rgba(255,255,255,.32);padding:0;letter-spacing:.02em;text-decoration:underline;text-decoration-style:dotted;text-decoration-color:rgba(255,255,255,.22);text-underline-offset:2px;transition:color 120ms,text-decoration-color 120ms;line-height:1}
.wl-dust-link:hover{color:rgba(255,255,255,.7);text-decoration-color:rgba(255,255,255,.45)}
.wl-history-modal{max-width:420px}
.wl-history-summary{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 16px;margin-bottom:12px;text-align:center}
.wl-history-sum-label{font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:6px}
.wl-history-sum-val{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.92);letter-spacing:-.5px;margin-bottom:8px}
.wl-history-rows{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;max-height:260px;overflow-y:auto}
.wl-history-rows::-webkit-scrollbar{width:3px}
.wl-history-rows::-webkit-scrollbar-track{background:transparent}
.wl-history-rows::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.wl-history-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.04)}
.wl-history-row:last-child{border-bottom:none}
.wl-history-row-left{display:flex;align-items:center;gap:8px;min-width:0}
.wl-history-row-usd{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.7);text-align:right;white-space:nowrap}
/* Duster Modal */
.wl-duster-modal{max-width:420px}
.wl-duster-list{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;max-height:300px;overflow-y:auto;margin:12px 0}
.wl-duster-item{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.04)}
.wl-duster-item:last-child{border-bottom:none}
.wl-duster-item-left{display:flex;align-items:center;gap:8px;min-width:0}
.wl-duster-item-icon{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.wl-duster-item-info{min-width:0}
.wl-duster-item-coin{font-size:11px;font-weight:700;color:rgba(255,255,255,.85)}
.wl-duster-item-amount{font-size:10px;color:rgba(255,255,255,.35);margin-top:2px}
.wl-duster-item-usd{font-size:11px;font-weight:600;color:rgba(255,255,255,.5);text-align:right;white-space:nowrap}
.wl-duster-note{font-size:11px;color:rgba(255,255,255,.4);margin:12px 0;padding:0 14px}
.wl-duster-action{display:flex;gap:8px;margin-top:14px}
.wl-duster-action-btn{flex:1;height:36px;border-radius:8px;border:1px solid rgba(200,160,255,.3);background:rgba(200,160,255,.12);color:rgba(200,160,255,.9);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;transition:all 150ms}
.wl-duster-action-btn:hover{background:rgba(200,160,255,.22);border-color:rgba(200,160,255,.5)}
.wl-duster-action-btn--primary{background:rgba(74,222,128,.15);border-color:rgba(74,222,128,.4);color:${COLOR_UP}}
.wl-duster-action-btn--primary:hover{background:rgba(74,222,128,.25);border-color:rgba(74,222,128,.6)}
.wl-duster-summary{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;flex-direction:column;gap:6px}
.wl-duster-summary-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.wl-duster-summary-row--out{padding-top:6px;border-top:1px solid rgba(255,255,255,.05)}
.wl-duster-summary-label{font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3)}
.wl-duster-summary-val{font-size:13px;font-weight:700;color:rgba(255,255,255,.85);font-variant-numeric:tabular-nums}
.wl-duster-spinner{width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.1);border-top-color:${COLOR_UP};animation:wlDusterSpin 700ms linear infinite;margin:0 auto}
@keyframes wlDusterSpin{to{transform:rotate(360deg)}}
.wl-duster-check{width:44px;height:44px;border-radius:50%;background:rgba(74,222,128,.15);color:${COLOR_UP};font-size:22px;font-weight:700;display:inline-grid;place-items:center;margin:0 auto;animation:wlDusterCheckIn 360ms cubic-bezier(.22,1.4,.36,1) both}
@keyframes wlDusterCheckIn{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}
/* Account Statement Modal */
.wl-stmt-modal{max-width:480px}
.wl-stmt-btn{background:none;border:none;cursor:pointer;font-family:inherit;font-size:9px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.2);padding:3px 7px;border-radius:5px;border:1px solid rgba(255,255,255,.1);transition:all 150ms}
.wl-stmt-btn:hover{color:rgba(255,255,255,.55);border-color:rgba(255,255,255,.25)}
.wl-stmt-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:6px}
.wl-stmt-select{width:100%;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#1c1c2a;color:rgba(255,255,255,.75);font-family:inherit;font-size:11px;font-weight:600;padding:0 10px 0 10px;outline:none;cursor:pointer;transition:border-color 150ms;color-scheme:dark;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.wl-stmt-select:focus{border-color:rgba(255,255,255,.25);background-color:#20202e}
.wl-stmt-select option{background:#1c1c2a;color:rgba(255,255,255,.8)}
.wl-stmt-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px}
.wl-stmt-stat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 10px 8px}
.wl-stmt-stat-label{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.22);margin-bottom:5px}
.wl-stmt-stat-val{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.85)}
.wl-stmt-formats{display:flex;gap:6px;margin-bottom:18px}
.wl-stmt-fmt{flex:1;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.4);font-family:inherit;font-size:10px;font-weight:700;letter-spacing:.05em;cursor:pointer;transition:all 150ms}
.wl-stmt-fmt:hover{color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.2)}
.wl-stmt-fmt--on{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.9)}
.wl-stmt-preview{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden;max-height:180px;overflow-y:auto;margin-bottom:16px}
.wl-stmt-preview::-webkit-scrollbar{width:3px}
.wl-stmt-preview::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.wl-stmt-preview-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px}
.wl-stmt-preview-row:last-child{border-bottom:none}
/* Custom date picker */
.wl-dp-wrap{position:relative;display:inline-block}
.wl-dp-trigger{height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#1c1c2a;color:rgba(255,255,255,.75);font-family:inherit;font-size:11px;font-weight:600;padding:0 10px;cursor:pointer;display:inline-flex;align-items:center;gap:10px;white-space:nowrap;transition:border-color 150ms;width:100%}
.wl-dp-trigger:hover,.wl-dp-trigger:focus{border-color:rgba(255,255,255,.25);outline:none}
.wl-dp-panel{position:absolute;top:calc(100% + 6px);left:0;width:232px;background:#1c1c2a;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;z-index:400;box-shadow:0 10px 40px rgba(0,0,0,.6);animation:wlFadeIn 120ms ease}
.wl-dp-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.wl-dp-nav-btn{background:none;border:none;color:rgba(255,255,255,.35);font-size:15px;cursor:pointer;padding:3px 8px;border-radius:6px;font-family:inherit;transition:all 100ms;line-height:1}
.wl-dp-nav-btn:hover{color:rgba(255,255,255,.85);background:rgba(255,255,255,.08)}
.wl-dp-nav-label{font-size:11px;font-weight:700;color:rgba(255,255,255,.8);letter-spacing:.02em}
.wl-dp-dow{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:3px}
.wl-dp-dow-cell{text-align:center;font-size:8px;font-weight:700;letter-spacing:.07em;color:rgba(255,255,255,.18);padding:3px 0}
.wl-dp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.wl-dp-day{background:none;border:none;border-radius:6px;font-size:10px;font-weight:600;font-family:inherit;color:rgba(255,255,255,.5);cursor:pointer;padding:5px 0;text-align:center;transition:background 100ms,color 100ms;line-height:1}
.wl-dp-day:hover:not(:disabled){background:rgba(255,255,255,.1);color:rgba(255,255,255,.9)}
.wl-dp-day--today{color:rgba(255,255,255,.9);background:rgba(255,255,255,.06)}
.wl-dp-day--sel{background:rgba(99,102,241,.65) !important;color:#fff !important}
.wl-dp-day--outside{visibility:hidden;pointer-events:none}
.wl-dp-day--dis{color:rgba(255,255,255,.15) !important;cursor:not-allowed !important;background:none !important}
/* Info badge on HOLD column header */
.wl-th-info-badge{display:inline-flex;align-items:center;justify-content:center;width:9px;height:9px;border-radius:50%;border:1px solid rgba(255,255,255,.18);font-size:6px;font-style:italic;font-weight:300;line-height:1;color:rgba(255,255,255,.25);vertical-align:middle;margin-left:2px}
/* Sub-label above date/filter pickers in Account Statement modal */
.wl-stmt-sublabel{font-size:9px;color:rgba(255,255,255,.25);margin-bottom:4px;letter-spacing:.06em}
/* All / None toggle buttons in field selector */
.wl-stmt-ctrl-btn{font-size:9px;font-weight:700;letter-spacing:.06em;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:rgba(255,255,255,.35);padding:2px 8px;cursor:pointer;transition:all 120ms}
.wl-stmt-ctrl-btn--on{background:rgba(255,255,255,.12);color:rgba(255,255,255,.8)}
/* Field selection pills */
.wl-stmt-field-pill{font-size:10px;font-weight:600;padding:4px 9px;border-radius:6px;cursor:pointer;transition:all 120ms;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.3)}
.wl-stmt-field-pill--on{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.85)}
.wl-flow-steps{display:flex;gap:4px;margin-bottom:16px}
.wl-flow-step{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.08);transition:background 250ms}
.wl-flow-step--on{background:rgba(99,102,241,.75)}
.wl-flow-step--done{background:rgba(74,222,128,.55)}
.wl-net-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.wl-net-chip{font-size:10px;font-weight:600;font-family:inherit;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.45);cursor:pointer;transition:all 140ms;letter-spacing:.02em}
.wl-net-chip:hover{border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.72)}
.wl-net-chip--on{background:rgba(99,102,241,.18);border-color:rgba(99,102,241,.45);color:rgba(255,255,255,.9)}
.wl-qr-wrap{display:flex;justify-content:center;margin:14px 0 12px}
.wl-qr-img{width:132px;height:132px;border-radius:12px;background:#fff;padding:8px;box-shadow:0 8px 28px rgba(0,0,0,.35)}
.wl-warn-box{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.22);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:10px;line-height:1.55;color:rgba(251,191,36,.88);letter-spacing:.02em}
.wl-warn-box strong{color:rgba(255,220,140,.95);font-weight:700}
.wl-tag-input{width:100%;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.12);padding:0 12px;font-size:12px;font-family:inherit;font-weight:600;color:rgba(255,255,255,.85);background:rgba(255,255,255,.04);outline:none;margin-bottom:12px}
.wl-tag-input:focus{border-color:rgba(255,255,255,.28);box-shadow:0 0 0 3px rgba(255,255,255,.06)}
.wl-addr-book{margin-bottom:10px}
.wl-addr-book-toggle{font-size:10px;font-weight:600;font-family:inherit;color:rgba(255,255,255,.4);background:none;border:0;cursor:pointer;padding:0;letter-spacing:.04em;text-decoration:underline;text-underline-offset:3px}
.wl-addr-book-toggle:hover{color:rgba(255,255,255,.75)}
.wl-addr-book-list{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;overflow:hidden;margin-bottom:12px;max-height:140px;overflow-y:auto}
.wl-addr-book-item{display:flex;align-items:center;gap:10px;padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;transition:background 120ms}
.wl-addr-book-item:last-child{border-bottom:none}
.wl-addr-book-item:hover{background:rgba(255,255,255,.05)}
.wl-addr-book-label{font-size:11px;font-weight:700;color:rgba(255,255,255,.82)}
.wl-addr-book-addr{font-size:9px;color:rgba(255,255,255,.28);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px}
.wl-field-err{font-size:10px;color:rgba(248,113,113,.85);margin:-6px 0 10px;letter-spacing:.02em}
.wl-review-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;margin-bottom:14px}
.wl-review-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:11px}
.wl-review-row:last-child{border-bottom:none}
.wl-review-lbl{color:rgba(255,255,255,.35);font-weight:500;flex-shrink:0}
.wl-review-val{color:rgba(255,255,255,.82);font-weight:600;text-align:right;font-variant-numeric:tabular-nums;word-break:break-all}
.wl-2fa-row{display:flex;gap:6px;justify-content:center;margin:14px 0}
.wl-2fa-digit{width:38px;height:44px;text-align:center;font-family:inherit;font-size:18px;font-weight:700;color:rgba(255,255,255,.9);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:9px;outline:none}
.wl-2fa-digit:focus{border-color:rgba(99,102,241,.5)}
.wl-pending{text-align:center;padding:20px 8px}
.wl-pending-icon{width:52px;height:52px;border-radius:50%;background:rgba(240,185,11,.12);border:1px solid rgba(240,185,11,.3);display:grid;place-items:center;margin:0 auto 14px;font-size:22px}
.wl-pending-title{font-size:14px;font-weight:700;color:rgba(255,255,255,.88);margin-bottom:6px}
.wl-pending-sub{font-size:11px;color:rgba(255,255,255,.35);line-height:1.5}
.wl-back-link{background:none;border:0;font-family:inherit;font-size:11px;font-weight:600;color:rgba(255,255,255,.35);cursor:pointer;padding:0;margin-bottom:12px;letter-spacing:.03em}
.wl-back-link:hover{color:rgba(255,255,255,.7)}
.wl-trade-preview{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;margin-bottom:14px;text-align:center}
.wl-trade-row{margin-bottom:2px}
.wl-trade-row-label{font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:6px}
.wl-trade-row--receive{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 14px;margin-top:4px}
.wl-trade-row--receive .wl-trade-pair{font-size:14px}
.wl-trade-preview--loading .wl-trade-row{padding:4px 0}
.wl-trade-preview--loading .hx-sk{margin-left:auto;margin-right:auto;display:block}
.wl-trade-arrow{font-size:18px;color:rgba(255,255,255,.25);margin:8px 0}
.wl-trade-pair{display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;font-weight:700}
.wl-modal--tall{max-height:min(90vh,calc(100dvh - 120px));overflow-y:auto}
.wl-modal--tall::-webkit-scrollbar{width:3px}
.wl-modal--tall::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
/* Email-code verification step (withdraw) */
.wl-email-verify{text-align:center;padding:6px 0 4px;margin-bottom:14px}
.wl-email-icon{width:48px;height:48px;border-radius:50%;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);display:grid;place-items:center;margin:0 auto 12px;font-size:22px;color:rgba(160,170,255,.92)}
.wl-email-msg{font-size:12px;color:rgba(255,255,255,.55);line-height:1.5;margin-bottom:14px;padding:0 10px}
.wl-email-input{width:170px;max-width:100%;height:48px;text-align:center;letter-spacing:.42em;font-family:inherit;font-size:20px;font-weight:700;color:rgba(255,255,255,.92);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:10px;outline:none;display:block;margin:0 auto;padding-left:.42em}
.wl-email-input:focus{border-color:rgba(99,102,241,.5);box-shadow:0 0 0 3px rgba(99,102,241,.12)}
.wl-email-input::placeholder{color:rgba(255,255,255,.2);letter-spacing:.3em}
/* Slide-to-confirm */
.wl-slide-track{position:relative;height:54px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);overflow:hidden;user-select:none;touch-action:none;margin-top:8px}
.wl-slide-fill{position:absolute;left:0;top:0;bottom:0;background:var(--slide-accent,#6366f1);opacity:.26;border-radius:14px;pointer-events:none}
.wl-slide-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;letter-spacing:.04em;color:rgba(255,255,255,.6);pointer-events:none;font-family:inherit;padding:0 52px}
.wl-slide-thumb{position:absolute;left:4px;top:4px;width:46px;height:44px;border-radius:11px;background:var(--slide-accent,#6366f1);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;cursor:grab;box-shadow:0 2px 12px rgba(0,0,0,.35);will-change:transform}
.wl-slide-thumb:active{cursor:grabbing}

@media(max-width:520px){
  .wl-container{padding:12px max(12px,env(safe-area-inset-right)) 40px max(12px,env(safe-area-inset-left))}
  .wl-overlay{padding-top:max(16px,calc(env(safe-area-inset-top,0px) + 8px));padding-bottom:max(16px,calc(env(safe-area-inset-bottom,0px) + 8px));padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right));align-items:center}
  .wl-modal,.wl-tx-modal{width:100%;max-height:min(92dvh,calc(100dvh - env(safe-area-inset-top,0px) - 48px));overflow-y:auto;-webkit-overflow-scrolling:touch;border-bottom-left-radius:20px;border-bottom-right-radius:20px}
  .wl-big-chart-modal{width:calc(100vw - 24px);max-width:none;padding:16px}
  .wl-cd-btn{min-height:44px;font-size:12px;padding:0 12px}
  .wl-confirm-btn,.wl-copy-btn{min-height:48px}
  .wl-section-head{flex-wrap:wrap;row-gap:10px}
  .wl-hide-zero{margin-left:auto}
  .wl-asset-search-wrap{order:5;flex-basis:100%;margin-left:0}
  .wl-asset-search{height:36px;width:100%;font-size:12px;padding-left:24px}
  .wl-asset-search:focus{width:100%}
  .wl-token-row{min-height:52px;padding:10px 0}
  .wl-header-btn{min-height:36px;height:auto;padding:8px 12px;font-size:11px}
  .wl-history-inline-btn{min-height:44px;height:auto;padding:12px 10px}
  .wl-head-main{flex-wrap:wrap;row-gap:14px}
  .wl-head-actions{flex-direction:row!important;width:100%;align-items:stretch!important;gap:6px!important}
  .wl-head-actions .wl-history-inline-btn{flex:1;margin-bottom:0!important}
  .wl-head-actions-sub{flex:2;width:auto!important;gap:6px}
  .wl-head-actions-sub .wl-header-btn{flex:1;justify-content:center}
  .wl-modal-close,.wl-modal-back{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center}
  .wl-amount-step{width:20px;height:20px;min-width:0;min-height:0;font-size:10px}
  .wl-2fa-digit{width:42px;height:48px}
  .wl-tx-row{min-height:44px}
}

/* Ultra-narrow (target: usable down to ~239px; below that we don't care) */
@media(max-width:300px){
  .wl-container{padding:10px max(8px,env(safe-area-inset-right)) 36px max(8px,env(safe-area-inset-left))}
  /* Portfolio value: shrink so 7-figure balances never clip */
  .wl-total-value{font-size:24px;letter-spacing:-.3px}
  /* Action buttons: wrap onto their own lines, smaller text */
  .wl-head-actions{flex-wrap:wrap}
  .wl-head-actions .wl-history-inline-btn{flex:1 1 100%}
  .wl-head-actions-sub{flex:1 1 100%!important;width:100%!important}
  .wl-header-btn{font-size:10px;padding:8px 6px}
  /* Breakdown legend: flow onto multiple lines instead of cramming with space-between */
  .wl-breakdown-legend{flex-wrap:wrap;justify-content:flex-start;gap:4px 9px}
  /* P&L badge: smaller, allowed to wrap inside the chart card */
  .wl-pnl-badge{font-size:10px;padding:3px 6px}
  /* Asset table: three numeric columns can't fit, so stack Value (top) + Balance
     (below) on the right and drop the secondary "Hold" column. Name truncates. */
  .wl-table-head{grid-template-columns:1fr auto;padding:7px 10px}
  .wl-table-head .wl-th:nth-child(2),
  .wl-table-head .wl-th:nth-child(3){display:none}
  .wl-token-row{grid-template-columns:1fr auto;row-gap:1px;padding:9px 10px;align-items:center}
  .wl-token-row>.wl-token-left{grid-row:1/span 2;min-width:0}
  .wl-token-row>.wl-td:nth-child(2){grid-column:2;grid-row:2}  /* balance, below */
  .wl-token-row>.wl-td:nth-child(3){display:none}              /* hold, hidden */
  .wl-token-row>.wl-td:nth-child(4){grid-column:2;grid-row:1}  /* value, on top */
  .wl-token-icon{width:24px;height:24px;font-size:11px}
  .wl-token-left{gap:7px}
  .wl-token-left>div{min-width:0}
  .wl-token-name,.wl-token-sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .wl-td{font-size:10px}
  .wl-td--val{font-size:11px}
  /* Chart topbar: let P&L badge + period button wrap instead of colliding */
  .wl-chart-topbar{flex-wrap:wrap;row-gap:4px}
  /* Modals: tighter padding so fixed-size controls fit the viewport */
  .wl-modal,.wl-tx-modal{padding-left:16px;padding-right:16px}
  /* Coin-detail actions: 4 nowrap buttons can't fit — go 2x2 */
  .wl-cd-actions{grid-template-columns:1fr 1fr}
  /* 2FA: shrink the six digit boxes so the row fits */
  .wl-2fa-row{gap:4px}
  .wl-2fa-digit{width:26px;height:38px;font-size:14px;border-radius:7px}
  /* Statement stats: 4 columns too tight — go 2x2 */
  .wl-stmt-stats{grid-template-columns:1fr 1fr}
  /* Modals are flex children — let them shrink to the viewport */
  .wl-modal,.wl-tx-modal{min-width:0}
  /* Date picker popup: clamp so the 232px panel never exceeds the viewport */
  .wl-dp-panel{width:min(232px,calc(100vw - 24px))}
  /* Statement From/To pickers: stack so each panel aligns left */
  .wl-stmt-daterange{flex-direction:column}
  /* Tooltips/menus that are nowrap + absolute: keep on-screen */
  .wl-breakdown-tooltip{max-width:calc(100vw - 24px);white-space:normal}
  .wl-period-menu{max-width:calc(100vw - 24px)}
}
`;

function injectWalletCSS() {
  if (typeof document === "undefined" || document.getElementById(WL_CSS_ID)) return;
  const s = document.createElement("style");
  s.id = WL_CSS_ID;
  s.textContent = WL_STYLE;
  document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════════════
// Nav
// ═══════════════════════════════════════════════════════════════════
function NavBar({ active }) {
  return (
    <nav className="wl-nav">
      <span className="wl-nav-logo">HX</span>
      <a href="index.html" className={"wl-nav-tab" + (active === "convert" ? " wl-nav-tab--active" : "")}>Convert</a>
      <a href="wallet.html" className={"wl-nav-tab" + (active === "wallet" ? " wl-nav-tab--active" : "")}>Wallet</a>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sparkline chart
// ═══════════════════════════════════════════════════════════════════
const PERIODS = ["7D", "1M", "3M"];
const PERIOD_POINTS = { "7D": 80, "1M": 80, "3M": 80 };
const PERIOD_VOL    = { "7D": 0.012, "1M": 0.035, "3M": 0.06 };

const SparkChart = React.memo(function SparkChart({ total, period, isUp, onToggle, height = null, gridClip = 0.55 }) {
  const canvasRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const dataRef = useRef({});
  const prevTotal = useRef(total);
  const [hover, setHover] = useState(null); // { idx, x, value }
  const hoverRef = useRef(null);
  const rafRef = useRef(null);
  const gridRafRef = useRef(null);
  const gridTimeRef = useRef(0);
  const gridLastRef = useRef(null);
  const prevPeriod = useRef(null);
  const pulseRef = useRef(null);       // { startTime }
  const valueTickedRef = useRef(false);
  const doDrawRef = useRef(null);      // () => doDraw(1) — for hover redraws

  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;

    const gridSizeRef = { current: { w: 0, h: 0 } };
    const gridRO = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      if (w !== gridSizeRef.current.w || h !== gridSizeRef.current.h) {
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        gridSizeRef.current = { w, h };
      }
    });
    gridRO.observe(canvas);

    const drawGrid = (t, opacity = 1) => {
      const { w: W, h: H } = gridSizeRef.current;
      if (!W || !H) return;
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = opacity * 0.6;
      ctx.clearRect(0, 0, W, H);

      const clipY  = H * gridClip;
      const VPX   = W / 2;
      const VPY   = clipY;
      const floorH = H - clipY;
      const numCols = 10;
      const numRows = 50;
      const NR = [200, 80, 190];  // desaturated magenta
      const NC = [80, 160, 210];  // desaturated cyan

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, clipY, W, floorH + 1);
      ctx.clip();

      // Dark floor fill
      const floorFill = ctx.createLinearGradient(0, clipY, 0, H);
      floorFill.addColorStop(0,    "rgba(12,6,30,0)");
      floorFill.addColorStop(0.18, "rgba(12,6,30,.82)");
      floorFill.addColorStop(1,    "rgba(25,4,45,.88)");
      ctx.fillStyle = floorFill;
      ctx.fillRect(0, clipY, W, floorH + 1);


      // Neon line helper — 3-pass glow
      const neonLine = (x1, y1, x2, y2, a) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.lineWidth = 9; ctx.strokeStyle = `rgba(${NR},${a * 0.04})`; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${NR},${a * 0.12})`; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.lineWidth = 0.7; ctx.strokeStyle = `rgba(${NR},${a * 0.6})`; ctx.stroke();
      };

      // Vertical lines — extend beyond canvas edges so sides are covered
      const convergence = 0.5;
      const bxMin = -W * 0.4;
      const bxMax =  W * 1.4;
      for (let i = 0; i <= numCols; i++) {
        const bx   = bxMin + (i / numCols) * (bxMax - bxMin);
        const topX = bx + (VPX - bx) * convergence;
        neonLine(topX, VPY, bx, H, 0.7);
      }

      // Horizontal lines — full width, perspective-spaced, scrolling
      let lastY = -Infinity;
      for (let j = 0; j < numRows; j++) {
        let depth = numRows - ((j + t) % numRows);
        if (depth <= 0) depth += numRows;
        const y = VPY + floorH / (depth * 0.5 + 1);
        if (y > H + 1 || y < VPY) continue;
        if (y - lastY < 5) continue;  // skip lines too close together
        lastY = y;
        const pct = (y - VPY) / floorH;
        neonLine(0, y, W, y, 0.1 + pct * 0.5);
      }

      ctx.restore();

      // Horizon line — drawn outside clip so it sits on top of the grid
      const hy = VPY + 6;  // offset by half glow-width so it aligns with visible line tops
      ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy);
      ctx.lineWidth = 1;  ctx.strokeStyle = `rgba(${NC},0.35)`; ctx.stroke();

    };

    const startTime = performance.now();

    if (getAnimScale() === 0) {
      drawGrid(0, 1);
    } else {
      const gridDuration = animMs(GRID_INTRO_MS);
      const fadeDuration = animMs(GRID_FADE_MS);
      const loop = (now) => {
        const elapsed = now - startTime;
        const rawPct  = Math.min(elapsed / gridDuration, 1);
        const opacity = Math.min(elapsed / fadeDuration, 1);

        // ease-out cubic on scroll speed so it glides to a stop
        const speedEase = 1 - Math.pow(rawPct, 2);
        gridTimeRef.current += (now - (gridLastRef.current ?? now)) * 0.001 * 2.2 * speedEase;
        gridLastRef.current = now;

        drawGrid(gridTimeRef.current, opacity);

        if (rawPct < 1) {
          gridRafRef.current = requestAnimationFrame(loop);
        }
        // at rawPct === 1 the loop simply stops — final frame stays drawn
      };

      gridRafRef.current = requestAnimationFrame(loop);
    }
    return () => { cancelAnimationFrame(gridRafRef.current); gridRO.disconnect(); };
  }, []);

  useEffect(() => {
    if (!dataRef.current[period]) {
      dataRef.current[period] = genChartData(total, PERIOD_POINTS[period], PERIOD_VOL[period]);
    }
    if (prevTotal.current !== total) {
      prevTotal.current = total;
      const arr = dataRef.current[period];
      arr.push(total);
      if (arr.length > PERIOD_POINTS[period] + 40) arr.shift();
      valueTickedRef.current = true;
    }
  }, [total, period]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const shouldAnimate = prevPeriod.current !== period;
    prevPeriod.current = period;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const chartSizeRef = { current: { w: 0, h: 0 } };
    const chartRO = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      if (w !== chartSizeRef.current.w || h !== chartSizeRef.current.h) {
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        chartSizeRef.current = { w, h };
      }
    });
    chartRO.observe(canvas);

    const doDraw = (progress) => {
      const { w: W, h: H } = chartSizeRef.current;
      if (!W || !H) return;
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const arr = dataRef.current[period] || [total];
      const min = Math.min(...arr) * 0.997;
      const max = Math.max(...arr) * 1.003;
      const range = max - min || 1;
      const cpx = (i) => (i / (arr.length - 1)) * (W - 72) + 2;
      const cpy = (v) => H - ((v - min) / range) * (H - 28) - 12;

      const lineColor = isUp ? COLOR_UP : COLOR_DOWN;
      const clipX = progress * W;

      // Clip to revealed portion
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, clipX, H);
      ctx.clip();

      const topY = cpy(max);
      const grad = ctx.createLinearGradient(0, topY, 0, H);
      grad.addColorStop(0,    isUp ? "rgba(74,222,128,.45)" : "rgba(248,113,113,.45)");
      grad.addColorStop(0.25, isUp ? "rgba(74,222,128,.04)" : "rgba(248,113,113,.04)");
      grad.addColorStop(0.45, "rgba(0,0,0,0)");

      // Fill
      ctx.beginPath();
      ctx.moveTo(cpx(0), cpy(arr[0]));
      for (let i = 1; i < arr.length; i++) {
        const x0 = cpx(i-1), y0 = cpy(arr[i-1]), x1 = cpx(i), y1 = cpy(arr[i]);
        ctx.bezierCurveTo(x0+(x1-x0)*.5, y0, x0+(x1-x0)*.5, y1, x1, y1);
      }
      ctx.lineTo(cpx(arr.length - 1), H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(cpx(0), cpy(arr[0]));
      for (let i = 1; i < arr.length; i++) {
        const x0 = cpx(i-1), y0 = cpy(arr[i-1]), x1 = cpx(i), y1 = cpy(arr[i]);
        ctx.bezierCurveTo(x0+(x1-x0)*.5, y0, x0+(x1-x0)*.5, y1, x1, y1);
      }
      ctx.strokeStyle = lineColor; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();

      // Price axis — labels in the right margin, fade in with progress
      {
        const fmtAxis = (v) => v >= 1e6 ? "$" + (v/1e6).toFixed(2) + "M" : "$" + (v/1e3).toFixed(1) + "K";
        const axisAlpha = Math.min(progress * 4, 1);
        const axisX = W - 4;
        ctx.save();
        ctx.font = "500 9px ui-monospace,'Courier New',monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        // subtle separator
        ctx.strokeStyle = `rgba(255,255,255,${0.05 * axisAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(W - 68, 8); ctx.lineTo(W - 68, H - 8); ctx.stroke();
        // labels — scale count based on available height (10 for enlarged, fewer for small)
        const labelCount = Math.max(3, Math.min(10, Math.floor(H / 28)));
        const tickX = W - 68;
        const levels = [];
        for (let i = 0; i < labelCount; i++) {
          const t = i / (labelCount - 1);
          const v = max - t * (max - min);
          const y = cpy(v);
          levels.push({ v, y: Math.max(10, Math.min(y, H - 10)) });
        }
        // Major tick marks at each price label
        for (const { v, y } of levels) {
          ctx.strokeStyle = `rgba(255,255,255,${0.12 * axisAlpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(tickX, y); ctx.lineTo(tickX + 8, y); ctx.stroke();
          ctx.fillStyle = `rgba(255,255,255,${0.28 * axisAlpha})`;
          ctx.fillText(fmtAxis(v), axisX, y);
        }
        // Minor tick marks between each pair of labels
        const minorCount = 4; // ticks between each major level
        for (let i = 0; i < levels.length - 1; i++) {
          const y0 = levels[i].y, y1 = levels[i + 1].y;
          for (let j = 1; j <= minorCount; j++) {
            const my = y0 + (y1 - y0) * (j / (minorCount + 1));
            ctx.strokeStyle = `rgba(255,255,255,${0.05 * axisAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(tickX, my); ctx.lineTo(tickX + 4, my); ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Dot at the leading edge — hidden while user is hovering
      const clipIdx = Math.min(progress * (arr.length - 1), arr.length - 1);
      const i0 = Math.min(Math.floor(clipIdx), arr.length - 2);
      const i1 = Math.min(i0 + 1, arr.length - 1);
      const t = clipIdx - i0;
      const st = t * t * (3 - 2 * t); // smoothstep
      const dotX = cpx(i0) + (cpx(i1) - cpx(i0)) * t;
      const dotY = cpy(arr[i0]) + (cpy(arr[i1]) - cpy(arr[i0])) * st;
      ctx.beginPath(); ctx.arc(dotX, dotY, 3.5, 0, Math.PI*2); ctx.fillStyle = lineColor; ctx.fill();
      ctx.beginPath(); ctx.arc(dotX, dotY, 6, 0, Math.PI*2); ctx.fillStyle = isUp ? "rgba(74,222,128,.2)" : "rgba(248,113,113,.2)"; ctx.fill();

      // Pulse ring on value tick
      if (pulseRef.current) {
        const pct = Math.min((performance.now() - pulseRef.current.startTime) / 700, 1);
        const ringR = 6 + pct * 16;
        const ringA = (1 - pct) * 0.6;
        ctx.beginPath(); ctx.arc(dotX, dotY, ringR, 0, Math.PI*2);
        ctx.strokeStyle = isUp ? `rgba(74,222,128,${ringA})` : `rgba(248,113,113,${ringA})`;
        ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Hover crosshair — ring style, distinct from the end dot
      if (hoverRef.current !== null && progress >= 1) {
        const hx = cpx(hoverRef.current.idx), hy = cpy(arr[hoverRef.current.idx]);
        ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, H);
        ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
        // outer colored ring
        ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI*2);
        ctx.strokeStyle = lineColor; ctx.lineWidth = 1.5; ctx.stroke();
        // white center dot
        ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, Math.PI*2);
        ctx.fillStyle = "#fff"; ctx.fill();
      }
    };

    doDrawRef.current = () => doDraw(1);

    if (shouldAnimate) {
      if (getAnimScale() === 0) {
        doDraw(1);
      } else {
        const drawDuration = animMs(LINE_DRAW_MS);
        const startTime = performance.now();
        const animate = (now) => {
          const raw = Math.min((now - startTime) / drawDuration, 1);
          // ease-out — faster burst at start, longer tail at end
          const progress = 1 - Math.pow(1 - raw, 8);
          doDraw(progress);
          if (raw < 1) rafRef.current = requestAnimationFrame(animate);
          else rafRef.current = null;
        };
        rafRef.current = requestAnimationFrame(animate);
      }
    } else {
      if (valueTickedRef.current) {
        valueTickedRef.current = false;
        pulseRef.current = { startTime: performance.now() };
        const PULSE_MS = 700;
        const pulseLoop = (now) => {
          doDraw(1);
          if (now - pulseRef.current.startTime < PULSE_MS) {
            rafRef.current = requestAnimationFrame(pulseLoop);
          } else {
            pulseRef.current = null;
            rafRef.current = null;
            doDraw(1);
          }
        };
        rafRef.current = requestAnimationFrame(pulseLoop);
      } else {
        doDraw(1);
      }
    }

    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } chartRO.disconnect(); };
  }, [total, period, isUp]);

  const onMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const arr = dataRef.current[period] || [];
    if (!arr.length) return;
    // Mirror the cpx mapping: data spans from x=2 to x=(width-72)
    const idx = Math.max(0, Math.min(Math.round((x - 2) / (rect.width - 72) * (arr.length - 1)), arr.length - 1));
    // Use the actual drawn x position for the tooltip so it tracks the dot
    const drawnX = (idx / (arr.length - 1)) * (rect.width - 72) + 2;
    hoverRef.current = { idx, x: drawnX, value: arr[idx] };
    setHover({ idx, x: drawnX, value: arr[idx] });
    if (!rafRef.current) doDrawRef.current?.();
  };

  const arr = dataRef.current[period] || [];
  const W = canvasRef.current ? canvasRef.current.offsetWidth : 460;

  return (
    <div style={{ position: "relative", cursor: "crosshair" }} onClick={onToggle}>
      <canvas ref={gridCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />
      <canvas ref={canvasRef} className="wl-chart-canvas" style={{ height, display: "block", position: "relative", zIndex: 1 }}
        onMouseMove={onMouseMove} onMouseLeave={() => { hoverRef.current = null; setHover(null); doDrawRef.current?.(); }} />
      {hover && (
        <div style={{
          position: "absolute", top: 6, pointerEvents: "none", zIndex: 60,
          left: Math.max(4, Math.min(hover.x - 36, W - 90)),
          background: "#1e1e2e", border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 7, padding: "3px 9px",
          fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums",
          color: "rgba(255,255,255,.88)", whiteSpace: "nowrap",
        }}>
          {fmtUSD(hover.value)}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
function WalletModalHeader({ title, onClose, onBack }) {
  return (
    <div className="wl-modal-hd">
      {onBack
        ? <button type="button" className="wl-modal-back" onClick={onBack} aria-label="Back">←</button>
        : null}
      <div className="wl-modal-title">{title}</div>
      <button type="button" className="wl-modal-close" onClick={onClose} aria-label="Close">✕</button>
    </div>
  );
}

// Shared modal components
// ═══════════════════════════════════════════════════════════════════
function CoinDropdown({ onSelect }) {
  return (
    <div className="wl-coin-dropdown">
      {Object.entries(COINS).map(([k, v]) => (
        <div key={k} className="wl-coin-option" onClick={() => onSelect(k)}>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: v.color + "28", color: v.color, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{v.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{k}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{v.name}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Shared flow UI
// ═══════════════════════════════════════════════════════════════════
function FlowSteps({ steps, current }) {
  return (
    <div className="wl-flow-steps">
      {steps.map((_, i) => (
        <div key={i} className={"wl-flow-step" + (i < current ? " wl-flow-step--done" : i === current ? " wl-flow-step--on" : "")} />
      ))}
    </div>
  );
}

function NetworkChips({ networks, value, onChange }) {
  return (
    <div className="wl-net-row">
      {networks.map(n => (
        <button key={n.id} type="button" className={"wl-net-chip" + (value === n.id ? " wl-net-chip--on" : "")}
          onClick={() => onChange(n.id)}>{n.label}</button>
      ))}
    </div>
  );
}

function DepositQr({ payload, size = 116 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !payload) return;
    const n = 29, pad = 4, cell = (size - pad * 2) / n;
    const ctx = canvas.getContext("2d");
    let seed = 0;
    for (let i = 0; i < payload.length; i++) seed = (Math.imul(31, seed) + payload.charCodeAt(i)) | 0;
    const rnd = () => { seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5; return (seed >>> 0) / 0xffffffff; };
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    const drawFinder = (r0, c0) => {
      ctx.fillStyle = "#0d0d12";
      for (let dr = 0; dr < 7; dr++)
        for (let dc = 0; dc < 7; dc++) {
          const edge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          if (edge || inner) ctx.fillRect(pad + (c0 + dc) * cell, pad + (r0 + dr) * cell, cell - 0.2, cell - 0.2);
        }
    };
    drawFinder(0, 0); drawFinder(0, n - 7); drawFinder(n - 7, 0);
    ctx.fillStyle = "#0d0d12";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (inFinder(r, c)) continue;
        if (rnd() > 0.52) ctx.fillRect(pad + c * cell, pad + r * cell, cell - 0.15, cell - 0.15);
      }
  }, [payload, size]);
  return <canvas ref={ref} width={size} height={size} className="wl-qr-img" aria-label="Deposit QR code" />;
}

function TwoFaInputs({ value, onChange, error }) {
  const refs = useRef([]);
  const digits = (value + "      ").slice(0, 6).split("");
  const setAt = (i, ch) => {
    const d = ch.replace(/\D/g, "").slice(-1);
    const next = digits.map((x, j) => (j === i ? d : x)).join("").replace(/\s/g, "");
    onChange(next.slice(0, 6));
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <>
      <div className="wl-2fa-row">
        {digits.map((d, i) => (
          <input key={i} ref={el => refs.current[i] = el} className="wl-2fa-digit" maxLength={1} inputMode="numeric"
            value={d.trim() ? d : ""} onChange={e => setAt(i, e.target.value)}
            onKeyDown={e => { if (e.key === "Backspace" && !digits[i].trim() && i > 0) refs.current[i - 1]?.focus(); }} />
        ))}
      </div>
      {error && <div className="wl-field-err" style={{ textAlign: "center" }}>{error}</div>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SlideToConfirm — drag the thumb to the end to confirm
// ═══════════════════════════════════════════════════════════════════
function SlideToConfirm({ onConfirm, label = "Slide to confirm", color = "#6366f1" }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const [x, setX] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const THUMB = 46;
  const maxX = () => {
    const t = trackRef.current;
    return t ? Math.max(0, t.clientWidth - THUMB - 8) : 0;
  };
  const onDown = (e) => {
    if (confirmed) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!draggingRef.current || confirmed) return;
    const t = trackRef.current;
    if (!t) return;
    const rect = t.getBoundingClientRect();
    const nx = Math.max(0, Math.min(e.clientX - rect.left - THUMB / 2, maxX()));
    setX(nx);
  };
  const onUp = () => {
    if (!draggingRef.current || confirmed) return;
    draggingRef.current = false;
    if (x >= maxX() - 4) {
      setX(maxX());
      setConfirmed(true);
      setTimeout(() => onConfirm?.(), 180);
    } else {
      setX(0);
    }
  };
  const pct = maxX() > 0 ? x / maxX() : 0;
  return (
    <div ref={trackRef} className="wl-slide-track" style={{ "--slide-accent": color }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="wl-slide-fill" style={{ width: x + THUMB }} />
      <div className="wl-slide-label" style={{ opacity: confirmed ? 0 : 1 - pct * 0.9 }}>{label}</div>
      <div className="wl-slide-thumb"
        style={{ transform: `translateX(${x}px)`, transition: draggingRef.current ? "none" : "transform 220ms cubic-bezier(.2,.8,.2,1)" }}>
        {confirmed ? "✓" : "›"}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Withdraw (Send) Modal
// ═══════════════════════════════════════════════════════════════════
function SendModal({ onClose, onBack, onSubmitted, rates, initialCoin, balances }) {
  const [coin, setCoin] = useState(initialCoin || "BTC");
  const [networkId, setNetworkId] = useState(() => getDepositNetworks(initialCoin || "BTC")[0]?.id);
  const [showDrop, setShowDrop] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [phase, setPhase] = useState("form");
  const [twoFa, setTwoFa] = useState("");
  const [twoFaErr, setTwoFaErr] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [fieldErr, setFieldErr] = useState("");
  const pendingTimer = useRef(null);

  const info = COINS[coin];
  const nets = getDepositNetworks(coin);
  const network = nets.find(n => n.id === networkId) || nets[0];
  useEffect(() => { setNetworkId(getDepositNetworks(coin)[0]?.id); }, [coin]);

  const step = info.decimals >= 4 ? 0.0001 : info.decimals >= 2 ? 0.01 : 1;
  const nudge = (dir) => {
    const cur = parseFloat(amount) || 0;
    setAmount(String(Math.max(0, parseFloat((cur + dir * step).toFixed(info.decimals)))));
  };
  const bal = balances ? balances[coin] : info.balance;
  const rate = getUSDRate(rates, coin);
  const amtNum = parseFloat(amount) || 0;
  const usdVal = amtNum * rate;
  const fee = network?.fee || "0.001";
  const need2fa = is2faRequired(usdVal);
  const flowSteps = need2fa
    ? ["Details", "Review", "2FA", "Email", "Confirm"]
    : ["Details", "Review", "Email", "Confirm"];
  const stepIdx = (() => {
    if (phase === "form") return 0;
    if (phase === "review") return 1;
    if (need2fa) {
      if (phase === "2fa") return 2;
      if (phase === "email") return 3;
      return 4; // confirm / pending / done
    }
    if (phase === "email") return 2;
    return 3; // confirm / pending / done
  })();

  const validateForm = () => {
    if (!amtNum) { setFieldErr("Enter an amount"); return false; }
    if (amtNum > bal) { setFieldErr("Insufficient balance"); return false; }
    if (usdVal > 0 && usdVal < WITHDRAW_MIN_USD) { setFieldErr(`Minimum withdrawal is ${fmtUSD(WITHDRAW_MIN_USD)}`); return false; }
    const addrVal = validateWithdrawAddress(address, network || {});
    if (!addrVal.ok) { setFieldErr(addrVal.msg); return false; }
    if (network?.tag === "required" && !memo.trim()) { setFieldErr(`${network.tagLabel || "Memo"} is required`); return false; }
    setFieldErr("");
    return true;
  };

  const submitWithdraw = () => {
    setPhase("pending");
    pendingTimer.current = setTimeout(() => {
      onSubmitted({ coin, amount, address: address.trim(), network: network?.label || networkId, fee, usd: usdVal, memo: memo.trim() || null });
      setPhase("done");
      setTimeout(onClose, 1200);
    }, 2200);
  };

  useEffect(() => () => clearTimeout(pendingTimer.current), []);

  const bookEntries = MOCK_ADDRESS_BOOK.filter(e => e.coin === coin);
  const receiveEst = amtNum > 0 ? Math.max(0, amtNum - parseFloat(fee)) : 0;

  return (
    <div className="wl-modal wl-modal--tall">
      <WalletModalHeader title={"Withdraw " + coin} onClose={onClose} onBack={onBack} />
      <FlowSteps steps={flowSteps} current={stepIdx} />

      {phase === "form" && (<>
        <div className="wl-field-label">Asset</div>
        <div className="wl-coin-sel" onClick={() => setShowDrop(s => !s)}>
          <span className="wl-coin-sel-icon" style={{ background: info.color + "28", color: info.color }}>{info.icon}</span>
          <span className="wl-coin-sel-ticker">{coin}</span>
          <span className="wl-coin-sel-name">{info.name}</span>
          <span className="wl-coin-sel-arrow">{showDrop ? "▲" : "▼"}</span>
        </div>
        {showDrop && <CoinDropdown onSelect={k => { setCoin(k); setShowDrop(false); setAmount(""); setAddress(""); }} />}

        <div className="wl-field-label" style={{ marginTop: 12 }}>Network</div>
        <NetworkChips networks={nets} value={networkId} onChange={setNetworkId} />

        <div className="wl-field-label">Amount</div>
        <div className="wl-amount-wrap">
          <input className="wl-amount-input" type="number" placeholder={"0." + "0".repeat(Math.min(info.decimals, 4))}
            value={amount} onChange={e => { setAmount(e.target.value); setFieldErr(""); }} />
          <div className="wl-amount-steppers">
            <button type="button" className="wl-amount-step" onClick={() => nudge(1)}>▲</button>
            <button type="button" className="wl-amount-step" onClick={() => nudge(-1)}>▼</button>
          </div>
          <button type="button" className="wl-max-btn" onClick={() => setAmount(String(bal))}>MAX</button>
        </div>
        <div className="wl-usd-hint">{usdVal > 0 ? `≈ ${fmtUSD(usdVal)} · Available ${fmtBal(bal, info.decimals)}` : "\u00a0"}</div>

        <div className="wl-addr-book">
          <button type="button" className="wl-addr-book-toggle" onClick={() => setShowBook(s => !s)}>
            {showBook ? "Hide" : "Show"} address book
          </button>
          {showBook && bookEntries.length > 0 && (
            <div className="wl-addr-book-list">
              {bookEntries.map(e => (
                <div key={e.id} className="wl-addr-book-item" onClick={() => { setAddress(e.address); setNetworkId(e.networkId); setShowBook(false); }}>
                  <div>
                    <div className="wl-addr-book-label">{e.label}</div>
                    <div className="wl-addr-book-addr">{e.address}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wl-field-label">Recipient address</div>
        <input className="wl-addr-input" type="text" placeholder="Paste address..."
          value={address} onChange={e => { setAddress(e.target.value); setFieldErr(""); }} />
        {network?.tag === "required" && (<>
          <div className="wl-field-label" style={{ marginTop: 10 }}>{network.tagLabel || "Memo / Tag"}</div>
          <input className="wl-tag-input" placeholder="Required for this network" value={memo}
            onChange={e => { setMemo(e.target.value); setFieldErr(""); }} />
        </>)}

        <div className="wl-fee-box">
          <div className="wl-fee-row"><span className="wl-fee-label">Network fee (est.)</span><span className="wl-fee-val">{fee} {coin}</span></div>
          <div className="wl-fee-row"><span className="wl-fee-label">Recipient receives (est.)</span>
            <span className="wl-fee-val">{amtNum > 0 ? `${fmtBal(receiveEst, info.decimals)} ${coin}` : "—"}</span></div>
          <div className="wl-fee-row"><span className="wl-fee-label">Min. withdrawal</span><span className="wl-fee-val">{fmtUSD(WITHDRAW_MIN_USD)}</span></div>
        </div>
        {fieldErr && <div className="wl-field-err">{fieldErr}</div>}
        {need2fa && <div className="wl-warn-box">Every withdrawal requires <strong>2FA</strong> and <strong>email</strong> verification.</div>}

        <button type="button" className="wl-confirm-btn" onClick={() => validateForm() && setPhase("review")}
          style={{ background: `linear-gradient(135deg,${info.color},${info.color}bb)`, color: "#fff", marginTop: 8 }}>
          Review withdrawal
        </button>
      </>)}

      {phase === "review" && (<>
        <button type="button" className="wl-back-link" onClick={() => setPhase("form")}>← Edit details</button>
        <div className="wl-review-box">
          <div className="wl-review-row"><span className="wl-review-lbl">Asset</span><span className="wl-review-val">{coin}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">Network</span><span className="wl-review-val">{network?.label}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">Amount</span><span className="wl-review-val">{amount} {coin}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">Value</span><span className="wl-review-val">{fmtUSD(usdVal)}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">Fee</span><span className="wl-review-val">{fee} {coin}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">To</span><span className="wl-review-val">{address}</span></div>
          {memo && <div className="wl-review-row"><span className="wl-review-lbl">{network?.tagLabel || "Memo"}</span><span className="wl-review-val">{memo}</span></div>}
        </div>
        <button type="button" className="wl-confirm-btn" onClick={() => need2fa ? (setPhase("2fa"), setTwoFa(""), setTwoFaErr("")) : (setPhase("email"), setEmailCode(""), setEmailErr(""))}
          style={{ background: `linear-gradient(135deg,${info.color},${info.color}bb)`, color: "#fff" }}>
          {need2fa ? "Continue to 2FA" : "Continue"}
        </button>
      </>)}

      {phase === "2fa" && (<>
        <button type="button" className="wl-back-link" onClick={() => setPhase("review")}>← Back</button>
        <div style={{ textAlign: "center", marginBottom: 8, fontSize: 12, color: "rgba(255,255,255,.5)" }}>
          Enter the 6-digit code from your authenticator app
        </div>
        <TwoFaInputs value={twoFa} onChange={v => { setTwoFa(v); setTwoFaErr(""); }} error={twoFaErr} />
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", textAlign: "center", marginBottom: 14 }}>Demo code: {window.HX_CODES.twoFa}</div>
        <button type="button" className="wl-confirm-btn" onClick={() => {
          if (twoFa.length < 6) { setTwoFaErr("Enter your 6-digit code"); return; }
          if (twoFa !== window.HX_CODES.twoFa) { setTwoFaErr(`Invalid code. Try ${window.HX_CODES.twoFa} for demo.`); return; }
          setPhase("email"); setEmailCode(""); setEmailErr("");
        }} style={{ background: "rgba(99,102,241,.35)", color: "#fff", border: "1px solid rgba(99,102,241,.5)" }}>
          Verify & continue
        </button>
      </>)}

      {phase === "email" && (<>
        <button type="button" className="wl-back-link" onClick={() => setPhase(need2fa ? "2fa" : "review")}>← Back</button>
        <div className="wl-email-verify">
          <div className="wl-email-icon">✉</div>
          <div className="wl-email-msg">Enter the 6-digit code we emailed to confirm this withdrawal.</div>
          <input className="wl-email-input" inputMode="numeric" maxLength={6} placeholder="••••••"
            value={emailCode} onChange={e => { setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setEmailErr(""); }} />
          {emailErr && <div className="wl-field-err" style={{ textAlign: "center" }}>{emailErr}</div>}
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", textAlign: "center", marginTop: 8 }}>Demo code: {window.HX_CODES.email}</div>
        </div>
        <button type="button" className="wl-confirm-btn" onClick={() => {
          if (emailCode.length < 6) { setEmailErr("Enter the 6-digit email code"); return; }
          if (emailCode !== window.HX_CODES.email) { setEmailErr(`Invalid code. Try ${window.HX_CODES.email} for demo.`); return; }
          setPhase("confirm");
        }} style={{ background: "rgba(99,102,241,.35)", color: "#fff", border: "1px solid rgba(99,102,241,.5)" }}>
          Verify email code
        </button>
      </>)}

      {phase === "confirm" && (<>
        <button type="button" className="wl-back-link" onClick={() => setPhase("email")}>← Back</button>
        <div className="wl-review-box">
          <div className="wl-review-row"><span className="wl-review-lbl">Amount</span><span className="wl-review-val">{amount} {coin}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">Value</span><span className="wl-review-val">{fmtUSD(usdVal)}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">Network</span><span className="wl-review-val">{network?.label}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">Fee</span><span className="wl-review-val">{fee} {coin}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">Receives</span><span className="wl-review-val">{fmtBal(receiveEst, info.decimals)} {coin}</span></div>
          <div className="wl-review-row"><span className="wl-review-lbl">To</span><span className="wl-review-val">{address}</span></div>
        </div>
        <SlideToConfirm color={info.color} label={`Slide to withdraw ${amount} ${coin}`} onConfirm={submitWithdraw} />
      </>)}

      {phase === "pending" && (
        <div className="wl-pending">
          <div className="wl-pending-icon">◌</div>
          <div className="wl-pending-title">Processing withdrawal</div>
          <div className="wl-pending-sub">Broadcasting to {network?.label}…<br />This usually takes a few minutes.</div>
        </div>
      )}

      {phase === "done" && (
        <div className="wl-pending">
          <div className="wl-pending-icon" style={{ background: "rgba(74,222,128,.12)", borderColor: "rgba(74,222,128,.35)", color: COLOR_UP }}>✓</div>
          <div className="wl-pending-title">Withdrawal submitted</div>
          <div className="wl-pending-sub">{amount} {coin} is on its way.</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Deposit (Receive) Modal
// ═══════════════════════════════════════════════════════════════════
function ReceiveModal({ onClose, onBack, initialCoin }) {
  const [coin, setCoin] = useState(initialCoin || "BTC");
  const [showDrop, setShowDrop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedTag, setCopiedTag] = useState(false);
  const nets = getDepositNetworks(coin);
  const [networkId, setNetworkId] = useState(() => getDepositNetworks(initialCoin || "BTC")[0]?.id);
  const info = COINS[coin];
  const network = nets.find(n => n.id === networkId) || nets[0];
  const addr = getDepositAddress(coin, networkId);
  const qrPayload = network?.tag === "required" ? `${addr}?dt=${network.mockTag}` : addr;

  useEffect(() => { setNetworkId(getDepositNetworks(coin)[0]?.id); }, [coin]);

  const copy = (text, which) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    if (which === "addr") { setCopied(true); setTimeout(() => setCopied(false), 1800); }
    else { setCopiedTag(true); setTimeout(() => setCopiedTag(false), 1800); }
  };

  return (
    <div className="wl-modal wl-modal--tall">
      <WalletModalHeader title={"Deposit " + coin} onClose={onClose} onBack={onBack} />

      <div className="wl-field-label">Asset</div>
      <div className="wl-coin-sel" onClick={() => setShowDrop(s => !s)}>
        <span className="wl-coin-sel-icon" style={{ background: info.color + "28", color: info.color }}>{info.icon}</span>
        <span className="wl-coin-sel-ticker">{coin}</span>
        <span className="wl-coin-sel-name">{info.name}</span>
        <span className="wl-coin-sel-arrow">{showDrop ? "▲" : "▼"}</span>
      </div>
      {showDrop && <CoinDropdown onSelect={k => { setCoin(k); setShowDrop(false); }} />}

      <div className="wl-field-label" style={{ marginTop: 12 }}>Network</div>
      <NetworkChips networks={nets} value={networkId} onChange={setNetworkId} />

      <div className="wl-warn-box">
        Send only <strong>{coin}</strong> on <strong>{network?.label}</strong>.
        {network?.tag === "required"
          ? <> A <strong>{network.tagLabel}</strong> is required — deposits without it may be lost.</>
          : " Other assets sent to this address may be lost."}
      </div>

      <div className="wl-qr-wrap">
        <DepositQr payload={qrPayload} size={116} />
      </div>

      <div className="wl-field-label">Deposit address</div>
      <div className="wl-addr-display">{addr}</div>
      <button type="button" className="wl-copy-btn" onClick={() => copy(addr, "addr")}>
        {copied ? "✓  Copied!" : "Copy address"}
      </button>

      {network?.tag === "required" && (<>
        <div className="wl-field-label" style={{ marginTop: 14 }}>{network.tagLabel}</div>
        <div className="wl-addr-display" style={{ marginBottom: 10 }}>{network.mockTag}</div>
        <button type="button" className="wl-copy-btn" onClick={() => copy(network.mockTag, "tag")}>
          {copiedTag ? "✓  Copied!" : `Copy ${network.tagLabel}`}
        </button>
      </>)}

      <div className="wl-fee-box" style={{ marginTop: 14 }}>
        <div className="wl-fee-row"><span className="wl-fee-label">Min. deposit</span><span className="wl-fee-val">{network?.min} {coin}</span></div>
        <div className="wl-fee-row"><span className="wl-fee-label">Confirmations</span><span className="wl-fee-val">~{network?.confirms}</span></div>
        <div className="wl-fee-row"><span className="wl-fee-label">Est. arrival</span><span className="wl-fee-val">{network?.confirms <= 6 ? "5–15 min" : "10–30 min"}</span></div>
      </div>
    </div>
  );
}

function TradeRoutePreviewSkeleton() {
  return (
    <div className="wl-trade-preview wl-trade-preview--loading" aria-busy="true" aria-label="Loading rates">
      <div className="wl-trade-row">
        <div className="hx-sk" style={{ width: 52, height: 9, marginBottom: 6 }} />
        <div className="hx-sk" style={{ width: 108, height: 16 }} />
      </div>
      <div className="wl-trade-arrow" style={{ opacity: 0.35 }}>↓</div>
      <div className="wl-trade-row wl-trade-row--receive" style={{ borderColor: "rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)" }}>
        <div className="hx-sk" style={{ width: 64, height: 9, marginBottom: 6 }} />
        <div className="hx-sk" style={{ width: 120, height: 18 }} />
      </div>
      <div className="hx-sk" style={{ width: 140, height: 10, marginTop: 12 }} />
    </div>
  );
}

function TradeRouteModal({ coin, side, rates, ratesLoading, onClose, onBack, onContinue }) {
  const info = COINS[coin];
  const { spend, buy, tradable } = getWalletTradeRoute(coin, side);
  const rate = getUSDRate(rates, coin);
  const buyInfo = COINS[buy];
  const spendInfo = COINS[spend];
  const title = (side === "buy" ? "Buy" : "Sell") + " " + coin;

  return (
    <div className="wl-modal">
      <WalletModalHeader title={title} onClose={onClose} onBack={onBack} />
      {!tradable ? (
        <div style={{ padding: "16px 4px", fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.6, textAlign: "center" }}>
          {coin} is not available on the converter yet. Try BTC, ETH, or USDT.
        </div>
      ) : ratesLoading ? (<>
        <TradeRoutePreviewSkeleton />
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.35)", lineHeight: 1.55, marginBottom: 14, textAlign: "center" }}>
          Fetching live rate…
        </p>
        <button type="button" className="wl-confirm-btn" disabled
          style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.35)", cursor: "not-allowed" }}>
          Open in Converter
        </button>
      </>) : (<>
        <div className="wl-trade-preview">
          <div className="wl-trade-row">
            <div className="wl-trade-row-label">Pay with</div>
            <div className="wl-trade-pair" style={{ opacity: 0.72 }}>
              <span style={{ color: spendInfo?.color }}>{spendInfo?.icon} {spend}</span>
            </div>
          </div>
          <div className="wl-trade-arrow">↓</div>
          <div className="wl-trade-row wl-trade-row--receive" style={coinAccentStyle(buyInfo.color)}>
            <div className="wl-trade-row-label">You receive</div>
            <div className="wl-trade-pair">
              <span style={{ color: buyInfo?.color }}>{buyInfo?.icon} {buy}</span>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 12 }}>
            1 {coin} ≈ {fmtPrice(rate)} · Instant convert
          </div>
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.4)", lineHeight: 1.55, marginBottom: 14, textAlign: "center" }}>
          Continue in the <strong style={{ color: "rgba(255,255,255,.7)" }}>Convert</strong> tab with this pair pre-selected.
        </p>
        <button type="button" className="wl-confirm-btn" onClick={() => onContinue({ buyAsset: buy, spendAsset: spend })}
          style={{ background: `linear-gradient(135deg,${info.color},${info.color}bb)`, color: "#fff" }}>
          Open in Converter
        </button>
      </>)}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// Duster Modal
// ═══════════════════════════════════════════════════════════════════
// Dust source coins are filtered: must have a USD value > 0 but below the
// threshold, and must not be the consolidation target (USDT).
const DUST_TARGET = "USDT";

function DusterModal({ onClose, balances, rates, onConvert }) {
  const { items, totalUsd } = useMemo(() => {
    const items = Object.entries(COINS)
      .map(([ticker, info]) => {
        const bal = balances[ticker] || 0;
        const usd = bal * getUSDRate(rates, ticker);
        return { ticker, info, balance: bal, usd };
      })
      .filter(it => it.usd > 0 && it.usd < MIN_DUST_USD && it.ticker !== DUST_TARGET)
      .sort((a, b) => b.usd - a.usd);
    return { items, totalUsd: items.reduce((s, it) => s + it.usd, 0) };
  }, [balances, rates]);

  // USDT is 1:1 with USD by design, so received = total. The divide is left in
  // case DUST_TARGET ever swaps to a non-stable coin.
  const targetRate = getUSDRate(rates, DUST_TARGET) || 1;
  const targetReceived = totalUsd / targetRate;

  const [phase, setPhase] = useState("review"); // "review" | "converting" | "done"
  const convertTimerRef = useRef(null);
  const closeTimerRef   = useRef(null);
  // Snapshot at the moment of conversion — the parent's `balances` will zero
  // these out, so we can't recompute from props once we're past "review".
  const resultRef = useRef(null);

  useEffect(() => () => {
    if (convertTimerRef.current) clearTimeout(convertTimerRef.current);
    if (closeTimerRef.current)   clearTimeout(closeTimerRef.current);
  }, []);

  const handleConfirm = () => {
    if (phase !== "review" || !items.length) return;
    resultRef.current = { targetReceived, totalUsd, items };
    setPhase("converting");
    convertTimerRef.current = setTimeout(() => {
      setPhase("done");
      onConvert(resultRef.current);
      closeTimerRef.current = setTimeout(() => onClose(), 1500);
    }, 700);
  };

  return (
    <div className="wl-modal wl-duster-modal">
      <div className="wl-modal-hd">
        <div className="wl-modal-title">Convert Dust</div>
        <button className="wl-modal-close" onClick={onClose}>✕</button>
      </div>

      {phase === "converting" && (
        <div style={{ padding: "32px 16px", textAlign: "center" }}>
          <div className="wl-duster-spinner" />
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 14, fontWeight: 600 }}>Converting…</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 4 }}>Consolidating {items.length} coin{items.length > 1 ? "s" : ""} to {DUST_TARGET}</div>
        </div>
      )}

      {phase === "done" && resultRef.current && (
        <div style={{ padding: "28px 16px 24px", textAlign: "center" }}>
          <div className="wl-duster-check">✓</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.92)", marginTop: 12 }}>
            Converted {resultRef.current.items.length} coin{resultRef.current.items.length > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 12, color: COLOR_UP, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            + {fmtDust(resultRef.current.targetReceived)} {DUST_TARGET}
          </div>
        </div>
      )}

      {phase === "review" && (items.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "rgba(255,255,255,.4)" }}>
          <div style={{ fontSize: 12, marginBottom: 4 }}>No dust to convert</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>You have no coins below ${MIN_DUST_USD} USD</div>
        </div>
      ) : (
        <>
          <div className="wl-duster-list">
            {items.map(item => (
              <div key={item.ticker} className="wl-duster-item">
                <div className="wl-duster-item-left">
                  <div className="wl-duster-item-icon" style={{ background: item.info.color + "22", color: item.info.color }}>
                    {item.info.icon}
                  </div>
                  <div className="wl-duster-item-info">
                    <div className="wl-duster-item-coin">{item.ticker}</div>
                    <div className="wl-duster-item-amount">{fmtDust(item.balance)} {item.ticker}</div>
                  </div>
                </div>
                <div className="wl-duster-item-usd">{fmtUSD(item.usd)}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "0 16px" }}>
            <div className="wl-duster-summary">
              <div className="wl-duster-summary-row">
                <span className="wl-duster-summary-label">Total dust</span>
                <span className="wl-duster-summary-val">{fmtUSD(totalUsd)}</span>
              </div>
              <div className="wl-duster-summary-row wl-duster-summary-row--out">
                <span className="wl-duster-summary-label">You receive</span>
                <span className="wl-duster-summary-val" style={{ color: COLOR_UP, fontVariantNumeric: "tabular-nums" }}>
                  + {fmtDust(targetReceived)} {DUST_TARGET}
                </span>
              </div>
            </div>

            <div className="wl-duster-note">
              Consolidate all small amounts into Tether ({DUST_TARGET}) automatically.
            </div>

            <div className="wl-duster-action">
              <button className="wl-duster-action-btn" onClick={onClose}>Cancel</button>
              <button className="wl-duster-action-btn wl-duster-action-btn--primary" onClick={handleConfirm}>
                Convert to {DUST_TARGET}
              </button>
            </div>
          </div>
        </>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Enlarged Chart Modal
// ═══════════════════════════════════════════════════════════════════
function EnlargedChartModal({ onClose, total, defaultPeriod }) {
  const [period, setPeriod] = useState(defaultPeriod || "7D");
  const pct = PERIOD_PNL_PCT[period] || 0;
  const pnl = total * (pct / 100);
  const isUp = pnl >= 0;
  const dir = isUp ? "up" : "down";
  return (
    <div className="wl-overlay wl-overlay--chart" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wl-modal wl-big-chart-modal">
        <div className="wl-modal-hd">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="wl-modal-title">Portfolio Chart</div>
            <div className={"wl-pnl-badge wl-pnl-badge--" + dir} style={{ fontSize: 11 }}>
              {isUp ? "▲" : "▼"} {fmtUSD(Math.abs(pnl))} ({Math.abs(pct).toFixed(2)}%)
            </div>
          </div>
          <button className="wl-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="wl-big-chart-tabs">
          {PERIODS.map(p => (
            <button key={p} className={"wl-period-btn" + (period === p ? " wl-period-btn--active" : "")}
              onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
        <div style={{ borderRadius: 10, overflow: "hidden", background: "#0d0814", border: "1px solid rgba(255,255,255,.06)" }}>
          <SparkChart total={total} period={period} isUp={isUp}
            height={Math.min(600, Math.max(280, Math.round(window.innerHeight * 0.55)))}
            gridClip={0.8} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 9, color: "rgba(255,255,255,.25)", fontWeight: 600, fontFamily: "ui-monospace,'Courier New',monospace", paddingRight: 68 }}>
          {(() => {
            const now = new Date();
            const days = period === "7D" ? 7 : period === "1M" ? 30 : 90;
            const count = period === "7D" ? 8 : period === "1M" ? 6 : 7;
            const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return Array.from({ length: count }, (_, i) => {
              const d = new Date(now);
              d.setDate(d.getDate() - Math.round(days * (1 - i / (count - 1))));
              return <span key={i} style={{ opacity: i === count - 1 ? 0.9 : 0.6 }}>{i === count - 1 ? "Now" : fmt(d)}</span>;
            });
          })()}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Coin Detail Modal
// ═══════════════════════════════════════════════════════════════════
function CoinDetailModal({ onClose, coin, rates, onSend, onReceive, onBuy, onSell, balances }) {
  const info = COINS[coin];
  const bal  = balances ? balances[coin] : info.balance;
  const usd  = bal * getUSDRate(rates, coin);

  return (
    <div className="wl-modal wl-coin-modal">
      <WalletModalHeader title={info.name} onClose={onClose} />

      <div className="wl-cd-hero">
          <div className="wl-cd-icon"
            style={{ background: info.color + "22", color: info.color, border: `1px solid ${info.color}40` }}>
            {info.icon}
          </div>
          <div className="wl-cd-ticker">{coin}</div>
        </div>

        <div className="wl-cd-balance-box">
          <div className="wl-cd-bal-label">Your balance</div>
          <div className="wl-cd-bal-coin">{fmtBal(bal, info.decimals)} {coin}</div>
          <div className="wl-cd-bal-usd">{fmtUSD(usd)}</div>
        </div>

      <div className="wl-cd-actions">
        <button className="wl-cd-btn wl-cd-btn--send" onClick={onSend}>↑ Send</button>
        <button className="wl-cd-btn wl-cd-btn--receive" onClick={onReceive}>↓ Receive</button>
        <button className="wl-cd-btn wl-cd-btn--buy" onClick={onBuy}>＋ Buy</button>
        <button className="wl-cd-btn wl-cd-btn--sell" onClick={onSell}>− Sell</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DatePicker
// ═══════════════════════════════════════════════════════════════════
function DatePicker({ value, min, max, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + "T12:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const wrapRef = useRef(null);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DOW    = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const selected = value ? new Date(value + "T12:00:00") : null;
  const today    = new Date();
  const minDate  = min ? new Date(min + "T12:00:00") : null;
  const maxDate  = max ? new Date(max + "T12:00:00") : null;

  const firstDow   = new Date(view.year, view.month, 1).getDay();
  const daysInMo   = new Date(view.year, view.month + 1, 0).getDate();
  const cells      = Array.from({ length: 42 }, (_, i) => {
    const day  = i - firstDow + 1;
    return { day, date: new Date(view.year, view.month, day), outside: day < 1 || day > daysInMo };
  });

  const same = (a, b) => a && b && a.toDateString() === b.toDateString();
  const disabled = d => (minDate && d < minDate) || (maxDate && d > maxDate);

  const pick = d => { if (disabled(d)) return; onChange(d.toISOString().split("T")[0]); setOpen(false); };
  const prev = () => setView(v => v.month === 0  ? { year:v.year-1, month:11 } : { year:v.year, month:v.month-1 });
  const next = () => setView(v => v.month === 11 ? { year:v.year+1, month:0  } : { year:v.year, month:v.month+1 });

  const display = value
    ? new Date(value + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
    : "Select date";

  return (
    <div ref={wrapRef} className="wl-dp-wrap" style={style}>
      <button type="button" className="wl-dp-trigger" onClick={() => setOpen(v => !v)}>
        <span>{display}</span>
        <span style={{ fontSize:9, color:"rgba(255,255,255,.3)" }}>▾</span>
      </button>
      {open && (
        <div className="wl-dp-panel">
          <div className="wl-dp-nav">
            <button type="button" className="wl-dp-nav-btn" onClick={prev}>‹</button>
            <span className="wl-dp-nav-label">{MONTHS[view.month]} {view.year}</span>
            <button type="button" className="wl-dp-nav-btn" onClick={next}>›</button>
          </div>
          <div className="wl-dp-dow">{DOW.map(d => <span key={d} className="wl-dp-dow-cell">{d}</span>)}</div>
          <div className="wl-dp-grid">
            {cells.map((c, i) => c.outside
              ? <span key={i} className="wl-dp-day wl-dp-day--outside" />
              : <button key={i} type="button" disabled={disabled(c.date)}
                  className={"wl-dp-day" + (same(c.date,selected) ? " wl-dp-day--sel" : same(c.date,today) ? " wl-dp-day--today" : "") + (disabled(c.date) ? " wl-dp-day--dis" : "")}
                  onClick={() => pick(c.date)}>{c.day}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Account Statement Modal
// ═══════════════════════════════════════════════════════════════════
const parseUSD = s => parseFloat(String(s).replace(/,/g, "")) || 0;
const STMT_COINS = ["all", ...Array.from(new Set(MOCK_ACTIVITY.map(t => t.coin)))];

function AccountStatementModal({ onClose, activity }) {
  const todayStr   = new Date().toISOString().split("T")[0];
  const monthAgo   = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(monthAgo);
  const [toDate,   setToDate]   = useState(todayStr);
  const [typeFilter, setTypeFilter] = useState("all");
  const [coinFilter, setCoinFilter] = useState("all");
  const [format,        setFormat]        = useState("csv");
  const [includeInfo,   setIncludeInfo]   = useState(false);
  const [enabledFields, setEnabledFields] = useState(() => new Set(["name","address","city","country"]));
  const [done,          setDone]          = useState(false);

  const allOn  = enabledFields.size === INFO_FIELDS.length;
  const noneOn = enabledFields.size === 0;
  const toggleField = key => setEnabledFields(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  const activeUser  = includeInfo
    ? Object.fromEntries(INFO_FIELDS.filter(f => enabledFields.has(f.key)).map(f => [f.key, MOCK_USER[f.key]]))
    : null;

  const filtered = activity.filter(tx => {
    if (typeFilter !== "all" && TX_TAB_GROUP[tx.cat] !== typeFilter) return false;
    if (coinFilter !== "all" && tx.coin !== coinFilter) return false;
    return true;
  });

  const totalIn  = filtered.filter(t => TX_INFLOW_CATS.has(t.cat)) .reduce((s,t) => s + parseUSD(t.usd), 0);
  const totalOut = filtered.filter(t => !TX_INFLOW_CATS.has(t.cat)).reduce((s,t) => s + parseUSD(t.usd), 0);
  const net      = totalIn - totalOut;

  const handleGenerate = () => {
    const fmt2 = n => n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
    let blob, filename;

    if (format === "csv") {
      const header = includeInfo
        ? [`# CryptoWallet Account Statement`, ...(activeUser ? Object.entries(activeUser).map(([k,v]) => `# ${k}: ${v}`) : []), `# Period: ${fromDate} to ${toDate}`,`# Generated: ${new Date().toLocaleString()}`,``]
        : [];
      const rows = [
        ["Date","Type","Coin","Amount","USD","Status","Hash"],
        ...filtered.map(t => [t.time, t.cat, t.coin, t.amount, t.usd, t.status, t.hash]),
      ].map(r => r.join(","));
      blob = new Blob([[...header, ...rows].join("\n")], { type: "text/csv" });
      filename = `statement_${fromDate}_${toDate}.csv`;

    } else if (format === "json") {
      const data = {
        institution: "CryptoWallet",
        generated: new Date().toISOString(),
        period: { from: fromDate, to: toDate },
        filters: { type: typeFilter, coin: coinFilter },
        ...(includeInfo && { accountHolder: MOCK_USER }),
        summary: { count: filtered.length, totalIn, totalOut, net },
        transactions: filtered,
      };
      blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      filename = `statement_${fromDate}_${toDate}.json`;

    } else if (format === "pdf") {
      const statusColor = s => s==="confirmed" ? "#16a34a" : s==="pending" ? "#d97706" : "#dc2626";
      const txRows = filtered.map(t => `<tr>
        <td>${t.time}</td><td style="text-transform:capitalize">${t.cat}</td><td>${t.coin}</td>
        <td style="font-variant-numeric:tabular-nums">${t.amount}</td>
        <td style="font-variant-numeric:tabular-nums">$${t.usd}</td>
        <td style="color:${statusColor(t.status)};font-weight:600">${t.status}</td>
        <td style="color:#aaa;font-size:10px">${t.hash}</td>
      </tr>`).join("");
      const holderBlock = includeInfo ? `
        <div class="section">
          <div class="section-title">Account Holder</div>
          <div class="info-grid">
            ${activeUser ? INFO_FIELDS.filter(f=>enabledFields.has(f.key)).map(f=>`<div><span class="info-label">${f.label}</span><span class="info-val">${MOCK_USER[f.key]}</span></div>`).join("") : ""}
          </div>
        </div>` : "";
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Account Statement · CryptoWallet</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:system-ui,sans-serif;color:#111;font-size:13px;background:#fff}
          .page{max-width:800px;margin:0 auto;padding:48px 40px}
          .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #111;margin-bottom:28px}
          .brand{font-size:22px;font-weight:800;letter-spacing:-.5px}
          .brand span{color:#6366f1}
          .header-right{text-align:right;font-size:11px;color:#666;line-height:1.6}
          .header-right strong{display:block;font-size:14px;font-weight:700;color:#111;margin-bottom:2px}
          .section{margin-bottom:24px}
          .section-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#999;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #eee}
          .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
          .info-label{font-size:11px;color:#888;margin-right:6px}
          .info-val{font-size:11px;font-weight:600;color:#111}
          .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
          .stat{border:1px solid #e5e5e5;border-radius:8px;padding:12px}
          .stat-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#aaa;margin-bottom:5px}
          .stat-val{font-size:17px;font-weight:700}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th{text-align:left;padding:7px 10px;background:#f8f8f8;font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#999;border-bottom:1px solid #e5e5e5}
          td{padding:8px 10px;border-bottom:1px solid #f2f2f2;color:#333}
          tr:last-child td{border-bottom:none}
          .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:10px;color:#bbb;text-align:center}
          @media print{.page{padding:24px 20px}}
        </style></head><body><div class="page">
        <div class="header">
          <div>
            <div class="brand">Crypto<span>Wallet</span></div>
            <div style="font-size:11px;color:#888;margin-top:4px">Digital Asset Statement</div>
          </div>
          <div class="header-right">
            <strong>Account Statement</strong>
            Period: ${fromDate} → ${toDate}<br>
            Generated: ${new Date().toLocaleString()}<br>
            Filters: ${typeFilter} · ${coinFilter}
          </div>
        </div>
        ${holderBlock}
        <div class="section">
          <div class="section-title">Summary</div>
          <div class="stats">
            <div class="stat"><div class="stat-label">Transactions</div><div class="stat-val">${filtered.length}</div></div>
            <div class="stat"><div class="stat-label">Total In</div><div class="stat-val" style="color:#16a34a">$${fmt2(totalIn)}</div></div>
            <div class="stat"><div class="stat-label">Total Out</div><div class="stat-val" style="color:#dc2626">$${fmt2(totalOut)}</div></div>
            <div class="stat"><div class="stat-label">Net</div><div class="stat-val" style="color:${net>=0?"#16a34a":"#dc2626"}">${net>=0?"+":"-"}$${fmt2(Math.abs(net))}</div></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Transactions</div>
          <table><thead><tr><th>Date</th><th>Type</th><th>Coin</th><th>Amount</th><th>USD Value</th><th>Status</th><th>Tx Hash</th></tr></thead>
          <tbody>${txRows}</tbody></table>
        </div>
        <div class="footer">CryptoWallet · Digital Asset Services · This statement is for informational purposes only and does not constitute financial advice.</div>
        </div><script>window.onload=()=>{window.print()}<\/script></body></html>`;
      const w = window.open("", "_blank");
      w.document.write(html);
      w.document.close();
      setDone(true);
      setTimeout(() => setDone(false), 2500);
      return;

    } else {
      const infoLines = includeInfo ? [
        "ACCOUNT HOLDER",
        ...(activeUser ? INFO_FIELDS.filter(f=>enabledFields.has(f.key)).map(f=>`  ${f.label.padEnd(14)}: ${MOCK_USER[f.key]}`) : []),
        "",
      ] : [];
      const lines = [
        "CRYPTOWALLET — ACCOUNT STATEMENT",
        "═".repeat(72),
        `Period     : ${fromDate} → ${toDate}`,
        `Generated  : ${new Date().toLocaleString()}`,
        `Filters    : type=${typeFilter}  coin=${coinFilter}`,
        "",
        ...infoLines,
        `Transactions : ${filtered.length}`,
        `Total in     : $${fmt2(totalIn)}`,
        `Total out    : $${fmt2(totalOut)}`,
        `Net          : ${net>=0?"+":"-"}$${fmt2(Math.abs(net))}`,
        "",
        "─".repeat(72),
        ...filtered.map(t => `${t.time.padEnd(22)} ${t.cat.padEnd(10)} ${t.coin.padEnd(6)} ${t.amount.padEnd(16)} $${t.usd.padEnd(12)} ${t.status}`),
      ];
      blob = new Blob([lines.join("\n")], { type: "text/plain" });
      filename = `statement_${fromDate}_${toDate}.txt`;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  return (
    <div className="wl-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wl-modal wl-stmt-modal">
        <div className="wl-modal-hd">
          <div className="wl-modal-title">Account Statement</div>
          <button className="wl-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Date range */}
        <div className="wl-stmt-label">Date Range</div>
        <div className="wl-stmt-daterange" style={{ display:"flex", gap:8, marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <div className="wl-stmt-sublabel">FROM</div>
            <DatePicker value={fromDate} max={toDate} onChange={setFromDate} style={{ width:"100%" }} />
          </div>
          <div style={{ flex:1 }}>
            <div className="wl-stmt-sublabel">TO</div>
            <DatePicker value={toDate} min={fromDate} max={todayStr} onChange={setToDate} style={{ width:"100%" }} />
          </div>
        </div>

        {/* Filters */}
        <div className="wl-stmt-label">Filters</div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <div className="wl-stmt-sublabel">TYPE</div>
            <select className="wl-stmt-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="deposit">Deposits</option>
              <option value="withdraw">Withdrawals</option>
              <option value="trade">Trades</option>
            </select>
          </div>
          <div style={{ flex:1 }}>
            <div className="wl-stmt-sublabel">COIN</div>
            <select className="wl-stmt-select" value={coinFilter} onChange={e => setCoinFilter(e.target.value)}>
              {STMT_COINS.map(c => <option key={c} value={c}>{c === "all" ? "All coins" : c}</option>)}
            </select>
          </div>
        </div>

        {/* Personal info toggle */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: includeInfo ? 10 : 16 }}>
          <div className="wl-stmt-label" style={{ marginBottom:0 }}>Include Account Holder Info</div>
          <div className={"wl-toggle" + (includeInfo ? " wl-toggle--on" : "")} onClick={() => setIncludeInfo(v => !v)} style={{ cursor:"pointer", flexShrink:0 }}>
            <div className="wl-toggle-thumb" />
          </div>
        </div>
        {includeInfo && (
          <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:"10px 12px", marginBottom:16 }}>
            {/* All / None controls */}
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
              <span style={{ fontSize:9, color:"rgba(255,255,255,.25)", flex:1 }}>{enabledFields.size} of {INFO_FIELDS.length} fields</span>
              <button className={"wl-stmt-ctrl-btn" + (allOn  ? " wl-stmt-ctrl-btn--on" : "")} onClick={() => setEnabledFields(new Set(INFO_FIELDS.map(f=>f.key)))}>All</button>
              <button className={"wl-stmt-ctrl-btn" + (noneOn ? " wl-stmt-ctrl-btn--on" : "")} onClick={() => setEnabledFields(new Set())}>None</button>
            </div>
            {/* Field pills */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {INFO_FIELDS.map(f => {
                const on = enabledFields.has(f.key);
                return (
                  <button key={f.key} className={"wl-stmt-field-pill" + (on ? " wl-stmt-field-pill--on" : "")} onClick={() => toggleField(f.key)}>
                    {on ? "✓ " : ""}{f.label}
                  </button>
                );
              })}
            </div>
            {/* Preview of enabled values */}
            {enabledFields.size > 0 && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,.06)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"5px 16px" }}>
                {INFO_FIELDS.filter(f => enabledFields.has(f.key)).map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize:8, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.2)", marginBottom:1 }}>{f.label}</div>
                    <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.65)" }}>{MOCK_USER[f.key]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="wl-stmt-label">Summary</div>
        <div className="wl-stmt-stats">
          {[
            { label: "Transactions", val: filtered.length, color: null },
            { label: "Total In",  val: "$" + totalIn.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}),  color: COLOR_UP },
            { label: "Total Out", val: "$" + totalOut.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}), color: "rgba(240,170,170,.9)" },
            { label: "Net",       val: (net>=0?"+":"-")+"$"+Math.abs(net).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}), color: net>=0 ? COLOR_UP : "rgba(240,170,170,.9)" },
          ].map(({ label, val, color }) => (
            <div key={label} className="wl-stmt-stat">
              <div className="wl-stmt-stat-label">{label}</div>
              <div className="wl-stmt-stat-val" style={color ? { color } : {}}>{val}</div>
            </div>
          ))}
        </div>

        {/* Transaction preview */}
        <div className="wl-stmt-label">Preview <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"rgba(255,255,255,.2)" }}>({filtered.length} rows)</span></div>
        <div className="wl-stmt-preview">
          {filtered.length === 0
            ? (window.EmptyState
              ? window.EmptyState({ compact: true, icon: "⌕", title: "No matches", message: "No transactions match your filters. Try widening the date range or type." })
              : <div style={{ textAlign:"center", padding:"20px 0", fontSize:11, color:"rgba(255,255,255,.2)" }}>No transactions match filters</div>)
            : filtered.map(tx => (
              <div key={tx.id} className="wl-stmt-preview-row">
                <div style={{ display:"flex", alignItems:"center", gap:7, minWidth:0 }}>
                  <span style={{ fontSize:9, color:"rgba(255,255,255,.3)", flexShrink:0 }}>{tx.time}</span>
                  <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.55)", flexShrink:0 }}>{TX_CAT_LABEL[tx.cat] || tx.cat}</span>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,.7)", fontVariantNumeric:"tabular-nums", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.amount} {tx.coin}</span>
                </div>
                <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.65)", fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>${tx.usd}</span>
              </div>
            ))
          }
        </div>

        {/* Format + generate */}
        <div className="wl-stmt-label">Export Format</div>
        <div className="wl-stmt-formats">
          {[["csv","CSV"],["json","JSON"],["text","Plain Text"],["pdf","PDF"]].map(([val,lbl]) => (
            <button key={val} className={"wl-stmt-fmt" + (format===val?" wl-stmt-fmt--on":"")} onClick={() => setFormat(val)}>{lbl}</button>
          ))}
        </div>
        <button className="wl-confirm-btn" onClick={handleGenerate}
          style={{ background: done ? "rgba(74,222,128,.15)" : "rgba(255,255,255,.08)", color: done ? COLOR_UP : "rgba(255,255,255,.8)", border: `1px solid ${done ? "rgba(74,222,128,.3)" : "rgba(255,255,255,.12)"}`, transition:"all 200ms" }}>
          {done ? "✓ Downloaded" : `↓ Generate ${format.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}

// ── Tab index orders for directional animation ──
const WL_TX_TAB_ORDER = ["all", "deposit", "withdraw", "trade"];

// ═══════════════════════════════════════════════════════════════════
// Portfolio History Modal
// ═══════════════════════════════════════════════════════════════════
function WalletHistoryModal({ onClose, rates, balances, activity, highlightTxId, onHighlightDone }) {
  const [mainTab, setMainTab] = useState("transactions");
  const [showStatement, setShowStatement] = useState(false);

  // — Transaction tab state —
  const [txTab, setTxTab] = useState("all");
  const [page, setPage] = useState(0);
  const [txLoading, setTxLoading] = useState(true);
  const [txView, setTxView] = useState("minimal"); // "minimal" | "default" | "expanded"
  const txTimer = useRef(null);

  // — Tab transition tracking —
  const prevMainTab = useRef(null);
  const prevTxTab = useRef(null);
  const prevPage = useRef(0);
  const [viewKey, setViewKey] = useState(0);

  const PAGE_SIZES = { minimal: 7, default: 9, expanded: 18 };
  const pageSize   = PAGE_SIZES[txView];

  // Auto-scroll to highlighted tx row when opened from notification
  const highlightTimerRef = useRef(null);
  useEffect(() => {
    if (!highlightTxId) return;
    // Ensure we're on the right tab/page so the row is visible
    setTxTab("all");
    const idx = activity.findIndex(tx => tx.id === highlightTxId);
    setPage(idx >= 0 ? Math.floor(idx / pageSize) : 0);
    // Poll for the element — loading skeleton must finish before rows exist
    let attempts = 0;
    let foundTime = 0;
    const scrollInterval = setInterval(() => {
      const el = document.querySelector(`[data-tx-id="${highlightTxId}"]`);
      if (el) {
        // Force-restart CSS animation (ensures it plays even if class was set before paint)
        el.classList.remove("wl-tx-row--highlight");
        void el.offsetWidth; // reflow trigger
        el.classList.add("wl-tx-row--highlight");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        clearInterval(scrollInterval);
        foundTime = Date.now();
        // Clear highlight after animation finishes (2.2s from when element was found)
        highlightTimerRef.current = setTimeout(() => {
          if (onHighlightDone) onHighlightDone();
        }, 2500);
      }
      if (++attempts > 30) clearInterval(scrollInterval); // give up after ~3s
    }, 100);
    return () => { clearInterval(scrollInterval); clearTimeout(highlightTimerRef.current); };
  }, [highlightTxId]);

  const triggerTxLoad = () => {
    setTxLoading(true);
    clearTimeout(txTimer.current);
    txTimer.current = setTimeout(() => setTxLoading(false), animMs(650) + Math.random() * 300);
  };
  useEffect(() => { triggerTxLoad(); return () => clearTimeout(txTimer.current); }, []);

  const filtered = txTab === "all" ? activity : activity.filter(tx => TX_TAB_GROUP[tx.cat] === txTab);
  const pages = Math.ceil(filtered.length / pageSize);
  const rows = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const onTxTab = (t) => { prevTxTab.current = txTab; setTxTab(t); setPage(0); triggerTxLoad(); };
  const onPage = (delta) => { prevPage.current = page; setPage(p => p + delta); triggerTxLoad(); };
  const onViewCycle = () => {
    setTxView(v => v === "minimal" ? "default" : v === "default" ? "expanded" : "minimal");
    setViewKey(k => k + 1);
    setPage(0);
  };

  // — Tab transition animation helpers —
  const getMainTabAnim = () => {
    if (!isAnimOn() || prevMainTab.current === null) return {};
    const goRight = (mainTab === "balance");
    if (isHeavy()) return { animation: `${goRight ? "tabSlideInLeft" : "tabSlideInRight"} 260ms ${EASE_SPRING} both` };
    return { animation: `tabFadeIn 180ms ${EASE_SMOOTH} both` };
  };
  const getTxContentAnim = () => {
    if (!isAnimOn() || prevTxTab.current === null) return {};
    // Direction priority: tab change > page change > view change (fade only)
    if (txTab !== prevTxTab.current) {
      const goRight = WL_TX_TAB_ORDER.indexOf(txTab) > WL_TX_TAB_ORDER.indexOf(prevTxTab.current);
      if (isHeavy()) return { animation: `${goRight ? "tabSlideInLeft" : "tabSlideInRight"} 260ms ${EASE_SPRING} both` };
      return { animation: `tabFadeIn 180ms ${EASE_SMOOTH} both` };
    }
    if (page !== prevPage.current) {
      const goRight = page > prevPage.current;
      if (isHeavy()) return { animation: `${goRight ? "tabSlideInLeft" : "tabSlideInRight"} 260ms ${EASE_SPRING} both` };
      return { animation: `tabFadeIn 180ms ${EASE_SMOOTH} both` };
    }
    // View change — just fade
    if (isHeavy()) return { animation: `tabFadeIn 200ms ${EASE_SPRING} both` };
    return { animation: `tabFadeIn 150ms ${EASE_SMOOTH} both` };
  };
  const getRowStagger = (i) => {
    if (!isHeavy()) return {};
    return { animation: `rowStaggerIn 220ms ${EASE_SPRING} both`, animationDelay: `${Math.min(i * 35, 300)}ms` };
  };

  // — Balance history tab state —
  const todayStr = new Date().toISOString().split("T")[0];
  const minStr   = new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [balLoading, setBalLoading] = useState(false);
  const balTimer = useRef(null);
  const balVisited = useRef(false);

  const daysAgo = Math.max(0, Math.round(
    (Date.now() - new Date(date + "T12:00:00").getTime()) / 86400000
  ));
  const historicalAssets = useMemo(() => {
    return Object.entries(COINS).map(([ticker, info]) => {
      const currentRate = getUSDRate(rates, ticker);
      const bal = balances ? balances[ticker] : info.balance;
      if (daysAgo === 0) return { ticker, info, bal, usd: bal * currentRate };
      const daily = (MOCK_CHANGES[ticker] ?? 0) / 100;
      const hash  = ticker.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0) + daysAgo) & 0xfffffff, 0);
      const noise = ((hash % 400) - 200) / 100000;
      const histRate = currentRate / Math.pow(1 + daily + noise, daysAgo);
      return { ticker, info, bal, usd: bal * histRate };
    });
  }, [date, rates]);
  const histTotal = historicalAssets.reduce((s, a) => s + a.usd, 0);
  const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US",
    { month: "short", day: "numeric", year: "numeric" });
  const onDateChange = (val) => {
    if (!val) return;
    setDate(val);
    setBalLoading(true);
    clearTimeout(balTimer.current);
    balTimer.current = setTimeout(() => setBalLoading(false), animMs(900) + Math.random() * 600);
  };
  useEffect(() => () => clearTimeout(balTimer.current), []);

  return (<>
    <div className="wl-modal wl-tx-modal">
      <div className="wl-modal-hd">
        <div className="wl-modal-title">Wallet History</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button className="wl-stmt-btn" onClick={() => setShowStatement(true)}>⬇ Statement</button>
          <button className="wl-modal-close" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="wl-tx-tabs">
        <button className={"wl-tx-tab" + (mainTab === "transactions" ? " wl-tx-tab--active" : "")}
          onClick={() => { prevMainTab.current = mainTab; setMainTab("transactions"); }}>Transaction History</button>
        <button className={"wl-tx-tab" + (mainTab === "balance" ? " wl-tx-tab--active" : "")}
          onClick={() => {
            prevMainTab.current = mainTab;
            setMainTab("balance");
            if (!balVisited.current) {
              balVisited.current = true;
              setBalLoading(true);
              clearTimeout(balTimer.current);
              balTimer.current = setTimeout(() => setBalLoading(false), animMs(900) + Math.random() * 600);
            }
          }}>Balance History</button>
      </div>

      {mainTab === "transactions" && (<div key="main-transactions" style={getMainTabAnim()}>
        <div className="wl-tx-tabs" style={{ marginTop: 2, display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 2, flex: 1 }}>
            {[["all","All"],["deposit","Deposits"],["withdraw","Withdrawals"],["trade","Trades"]].map(([k,l]) => (
              <button key={k} className={"wl-tx-tab" + (txTab === k ? " wl-tx-tab--active" : "")} onClick={() => onTxTab(k)}>{l}</button>
            ))}
          </div>
          <button onClick={onViewCycle} title={txView === "minimal" ? "Minimal" : txView === "default" ? "Default" : "Expanded"}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,.3)", padding: "2px 4px", lineHeight: 1, transition: "color 150ms", flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.6)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.3)"}>
            {txView === "minimal" ? "⊟" : txView === "default" ? "⊞" : "⊠"}
          </button>
        </div>
        <div className="wl-tx-body">
          {txLoading ? <TxSkeleton /> : (
            <div key={txTab + "-" + viewKey + "-" + page} className="wl-tx-list" style={getTxContentAnim()}>
              {rows.length === 0 && (
                window.EmptyState
                  ? window.EmptyState({ compact: true, icon: "↔", title: "No transactions", message: "Activity will appear here once you trade, deposit, or withdraw." })
                  : <div style={{ textAlign: "center", padding: "28px 0", fontSize: 12, color: "rgba(255,255,255,.2)" }}>No transactions</div>
              )}
              {rows.map((tx, i) => {
                const info = COINS[tx.coin];
                const sc = TX_STATUS_COLOR[tx.status];
                const sb = TX_STATUS_BG[tx.status];
                const statusIcon = tx.status === "confirmed" ? "✓" : tx.status === "pending" ? "◌" : "✕";
                const catColor = TX_CAT_COLOR[tx.cat] || info.color;
                const catLabel = TX_CAT_LABEL[tx.cat] || tx.cat;

                // ── Expanded: 9 rows, single-line compact ──
                if (txView === "expanded") return (
                  <div key={tx.id} data-tx-id={tx.id} className={"wl-tx-row" + (highlightTxId === tx.id ? " wl-tx-row--highlight" : "")} style={{ padding: "5px 2px", ...getRowStagger(i) }}>
                    <span className="wl-tx-icon" style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0, background: catColor + "22", color: catColor, border: `1px solid ${catColor}30` }}>
                      {TX_CAT_ICON[tx.cat]}
                    </span>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.45)", flexShrink: 0 }}>{catLabel} · {tx.coin}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.65)", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.amount}{tx.detail ? ` ${tx.detail}` : ""}</span>
                      <span style={{ fontSize: 9, color: sc, flexShrink: 0 }}>{statusIcon}</span>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,.6)" }}>${tx.usd}</span>
                    </div>
                  </div>
                );

                // ── Minimal: 4 rows, rich detail ──
                if (txView === "minimal") return (
                  <div key={tx.id} data-tx-id={tx.id} className={"wl-tx-row" + (highlightTxId === tx.id ? " wl-tx-row--highlight" : "")} style={{ padding: "11px 2px", alignItems: "flex-start", ...getRowStagger(i) }}>
                    <span className="wl-tx-icon" style={{ width: 34, height: 34, fontSize: 14, flexShrink: 0, background: catColor + "22", color: catColor, border: `1px solid ${catColor}30` }}>
                      {TX_CAT_ICON[tx.cat]}
                    </span>
                    <div className="wl-tx-info">
                      <div className="wl-tx-label" style={{ fontSize: 12 }}>{catLabel} · {tx.coin}</div>
                      <div className="wl-tx-amount" style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{tx.amount} {tx.coin}{tx.detail ? ` ${tx.detail}` : ""}</div>
                      <div className="wl-tx-hash" style={{ maxWidth: "none" }}>#{tx.hash}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,.2)", marginTop: 2 }}>{tx.time}</div>
                    </div>
                    <div className="wl-tx-right">
                      <div className="wl-tx-usd" style={{ fontSize: 13 }}>${tx.usd}</div>
                      <div className="wl-tx-status" style={{ color: sc, background: sb }}>{statusIcon} {TX_STATUS[tx.status]}</div>
                    </div>
                  </div>
                );

                // ── Default: 5 rows ──
                return (
                  <div key={tx.id} data-tx-id={tx.id} className={"wl-tx-row" + (highlightTxId === tx.id ? " wl-tx-row--highlight" : "")} style={getRowStagger(i)}>
                    <span className="wl-tx-icon" style={{ background: catColor + "22", color: catColor, border: `1px solid ${catColor}30` }}>
                      {TX_CAT_ICON[tx.cat]}
                    </span>
                    <div className="wl-tx-info">
                      <div className="wl-tx-label">{catLabel} · {tx.coin}</div>
                      <div className="wl-tx-amount">{tx.amount} {tx.coin}{tx.detail ? ` ${tx.detail}` : ""}</div>
                      <div className="wl-tx-hash">#{tx.hash}</div>
                    </div>
                    <div className="wl-tx-right">
                      <div className="wl-tx-usd">${tx.usd}</div>
                      <div className="wl-tx-time">{tx.time}</div>
                      <div className="wl-tx-status" style={{ color: sc, background: sb }}>{statusIcon} {TX_STATUS[tx.status]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="wl-tx-pagination">
          <button className="wl-tx-pg-btn" disabled={page === 0 || txLoading} onClick={() => onPage(-1)}>← Prev</button>
          <span className="wl-tx-pg-info">
            {txLoading ? "Loading…" : `Page ${page + 1} of ${pages || 1} · ${filtered.length} txns`}
          </span>
          <button className="wl-tx-pg-btn" disabled={page >= pages - 1 || txLoading} onClick={() => onPage(1)}>Next →</button>
        </div>
      </div>)}

      {mainTab === "balance" && (<div key="main-balance" style={getMainTabAnim()}>
        <div className="wl-field-label" style={{ marginTop: 8 }}>Select date</div>
        <DatePicker value={date} min={minStr} max={todayStr} onChange={onDateChange} />
        {balLoading ? <TxSkeleton /> : (<>
          <div className="wl-history-summary">
            <div className="wl-history-sum-label">Est. value on {fmtDate(date)}</div>
            <div className="wl-history-sum-val">{fmtUSD(histTotal)}</div>
          </div>
          <div className="wl-history-rows">
            {historicalAssets.map(({ ticker, info, bal, usd }) => (
              <div key={ticker} className="wl-history-row">
                <div className="wl-history-row-left">
                  <span className="wl-token-icon"
                    style={{ width: 24, height: 24, fontSize: 10, background: info.color + "22", color: info.color, border: `1px solid ${info.color}30` }}>
                    {info.icon}
                  </span>
                  <div>
                    <div className="wl-token-name" style={{ fontSize: 11 }}>{ticker}</div>
                    <div className="wl-token-sub">{fmtBal(bal, info.decimals)} {ticker}</div>
                  </div>
                </div>
                <div className="wl-history-row-usd">{fmtUSD(usd, true)}</div>
              </div>
            ))}
          </div>
        </>)}
      </div>)}
    </div>
    {showStatement && <AccountStatementModal onClose={() => setShowStatement(false)} activity={activity} />}
  </>);
}

// ═══════════════════════════════════════════════════════════════════
// WalletPage Skeleton
// ═══════════════════════════════════════════════════════════════════
const WL_SK_GRID = { display: "grid", gridTemplateColumns: "1fr 130px 100px", alignItems: "center", padding: "9px 12px" };
const WL_SK_COL_END = { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 };

function WalletPageSkeleton() {
  return (
    <>
      {/* Chart section */}
      <div className="wl-chart-section">
        <div className="wl-chart-topbar">
          {hxSk(24, 110, 0, { borderRadius: 6 })}
          {hxSk(24, 46, 0, { borderRadius: 7 })}
        </div>
        {hxSk(130, "100%", 0, { borderRadius: 0 })}
      </div>

      {/* Token table */}
      <div className="wl-section">
        <div className="wl-section-head">
          {hxSk(10, 55, 0, { borderRadius: 4 })}
          {hxSk(10, 42, 0, { borderRadius: 4 })}
        </div>
        <div className="wl-table">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 100px", padding: "7px 12px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            {[55, 48, 40].map((w, i) => (
              <div key={i}>{hxSk(8, w, 0, { borderRadius: 4, marginLeft: i > 0 ? "auto" : 0 })}</div>
            ))}
          </div>
          {Array.from({ length: 7 }, (_, i) => {
            const d = i * 0.06;
            return (
              <div key={i} style={{ ...WL_SK_GRID, borderBottom: i < 6 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  {hxSkCircle(28, d)}
                  <div>
                    {hxSk(10, 32, d, { borderRadius: 4, marginBottom: 5 })}
                    {hxSk(8, 52, d + 0.04, { borderRadius: 4 })}
                  </div>
                </div>
                <div style={WL_SK_COL_END}>
                  {hxSk(10, 60, d, { borderRadius: 4 })}
                  {hxSk(8, 24, d + 0.04, { borderRadius: 4 })}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {hxSk(10, 55, d, { borderRadius: 4 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity link */}
      <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
        {hxSk(10, 120, 0, { borderRadius: 4, margin: "0 auto" })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Activity Modal
// ═══════════════════════════════════════════════════════════════════
const TX_CAT_ICON  = { deposit: "↓", withdraw: "↑", trade: "⇄", buy: "＋", sell: "−", swap: "⇄", send: "↗", receive: "↙", stake: "⊙", unstake: "◎", reward: "★", failed: "✕", rejected: "⊘", error: "⚠" };
const TX_CAT_LABEL = { deposit: "Deposit", withdraw: "Withdrawal", trade: "Trade", buy: "Buy", sell: "Sell", swap: "Swap", send: "Send", receive: "Receive", stake: "Stake", unstake: "Unstake", reward: "Reward", failed: "Failed", rejected: "Rejected", error: "Error" };
const TX_CAT_COLOR = { deposit: "#4ade80", withdraw: "#f87171", trade: "#a78bfa", buy: "#64c8f0", sell: "#ffb464", swap: "#be8cff", send: "#8ca0ff", receive: "#4ade80", stake: "#c8a0ff", unstake: "#c8a0ff", reward: "#ffd250", failed: "#dc5a5a", rejected: "#dc5a5a", error: "#dc5a5a" };
const TX_INFLOW_CATS = new Set(["deposit", "receive", "reward", "buy"]);
const TX_TAB_GROUP = { deposit:"deposit", receive:"deposit", reward:"deposit", withdraw:"withdraw", send:"withdraw", trade:"trade", buy:"trade", sell:"trade", swap:"trade", stake:"trade", unstake:"trade", failed:"trade", rejected:"trade", error:"trade" };

function TxSkeleton() {
  const widths = [[55,80],[70,60],[50,90],[65,75],[60,85],[72,65]];
  return (
    <div className="wl-tx-list--loading" style={{height:"100%"}}>
      {widths.map((w, i) => {
        const d = i * 0.08;
        return (
          <div key={i} className="wl-tx-skeleton">
            {hxSkCircle(28, d)}
            <div className="hx-sk-lines">
              {hxSk(10, `${w[0]}%`, d)}
              {hxSk(8, `${w[1]}%`, d + 0.05)}
            </div>
            <div style={{ ...WL_SK_COL_END, flexShrink: 0 }}>
              {hxSk(10, 48, d)}
              {hxSk(8, 32, d + 0.04)}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════════════
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  return <div className="wl-toast">{msg}</div>;
}

// ═══════════════════════════════════════════════════════════════════
// WalletPage
// ═══════════════════════════════════════════════════════════════════
// Map notification phases to MOCK_ACTIVITY categories
const NOTIF_PHASE_TO_CAT = {
  deposit: "deposit", incoming: "deposit", buy: "buy", sell: "sell", swap: "swap",
  sent: "send", receive: "receive", trade: "trade", staked: "stake", unstaked: "unstake",
  reward: "reward", withdrawn: "withdraw", failed: "failed", rejected: "rejected", error: "error"
};

export default function WalletPage({ embedded = false, onNavigate, initialCoin, initialAction, initialRouteKey = 0, highlightNotif, onNavigateToConvert, onRouteChange }) {
  // ── State ──────────────────────────────────────────────────────
  const [rates, setRates]             = useState({ ...BASE_RATES });
  const [period, setPeriod]           = useState("7D");
  const [modal, setModal]             = useState(null);
  const [modalReturn, setModalReturn] = useState(null);
  const [modalCoin, setModalCoin]     = useState("BTC");
  const [toast, setToast]             = useState(null);
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);
  const [showBigChart, setShowBigChart]     = useState(false);
  // Stable handler so SparkChart's React.memo isn't defeated by a fresh arrow each render.
  const openBigChart = useCallback(() => setShowBigChart(true), []);
  const [hideZero, setHideZero]             = useState(true);
  const [assetSearch, setAssetSearch]       = useState("");
  const [assetSort, setAssetSort]           = useState({ col: "value", dir: "desc" });
  // Loading / animation
  const [pageLoading, setPageLoading] = useState(() => getAnimScale() > 0);
  const [tradeRouteLoading, setTradeRouteLoading] = useState(false);
  const [countTotal, setCountTotal]   = useState(0);
  const [countDone, setCountDone]     = useState(false);
  const [barMounted, setBarMounted]   = useState(false);
  const [barExpand, setBarExpand]     = useState(false);
  const [otherHovered, setOtherHovered] = useState(false);
  // Flash
  const [flashKey, setFlashKey]   = useState(0);
  const [flashDir, setFlashDir]   = useState(null);
  const [balances, setBalances] = useState(() =>
    Object.fromEntries(Object.entries(COINS).map(([t, info]) => [t, info.balance]))
  );
  // Activity log is appendable (dust conversion prepends a row). MOCK_ACTIVITY
  // is the initial seed; subsequent rows get IDs from nextTxIdRef.
  const [activity, setActivity] = useState(MOCK_ACTIVITY);
  const nextTxIdRef = useRef(MOCK_ACTIVITY.reduce((m, t) => Math.max(m, t.id), 0) + 1);
  // Mirror to a ref so the highlight effect can read the latest list without
  // depending on it (we only want highlight to retrigger on a new notification).
  const activityRef = useRef(activity);
  activityRef.current = activity;

  // ── Refs ───────────────────────────────────────────────────────
  const prevTotal = useRef(null);
  const countRef  = useRef(null);
  const pendingInitialRouteRef = useRef(false);

  // ── Auto-open coin modal from Markets "Wallet Actions" ────────
  useEffect(() => {
    if (!initialCoin || !COINS[initialCoin]) return;
    pendingInitialRouteRef.current = true;
    setModalCoin(initialCoin);
    if (initialAction && ["buy", "sell", "send", "receive"].includes(initialAction)) {
      setModalReturn(MODAL_COIN);
      setModal(initialAction);
    } else {
      setModal(MODAL_COIN);
    }
  }, [initialCoin, initialAction, initialRouteKey]);

  useEffect(() => {
    if (!onRouteChange) return;
    if (pendingInitialRouteRef.current && !modal) return;
    if (pendingInitialRouteRef.current && modal) pendingInitialRouteRef.current = false;
    onRouteChange({
      coin: modal ? modalCoin : null,
      action: modal === MODAL_COIN ? "coin" : modal || null,
    });
  }, [modal, modalCoin, onRouteChange]);

  useEffect(() => {
    if (modal !== "buy" && modal !== "sell") {
      setTradeRouteLoading(false);
      return;
    }
    setTradeRouteLoading(true);
    const t = setTimeout(() => setTradeRouteLoading(false), animMs(360));
    return () => clearTimeout(t);
  }, [modal, modalCoin]);

  // ── Highlight tx row from notification click ─────────────────
  const [highlightTxId, setHighlightTxId] = useState(null);
  useEffect(() => {
    if (!highlightNotif) return;
    const cat = NOTIF_PHASE_TO_CAT[highlightNotif.phase];
    if (!cat) return;
    // Extract coin ticker from notification amount (e.g. "0.25 ETH" → "ETH")
    const words = highlightNotif.amount.split(/\s+/);
    const coin = words.find(w => COINS[w]) || "";
    // Find first matching tx
    const match = activityRef.current.find(tx => {
      // Exact: category + coin
      if (cat === tx.cat && coin && tx.coin === coin) return true;
      // Status match (failed/rejected/error are statuses, not categories)
      if (["failed","rejected","error"].includes(highlightNotif.phase) && tx.status === highlightNotif.phase && coin && tx.coin === coin) return true;
      // Status match without coin (when coin is unknown or doesn't match)
      if (["failed","rejected","error"].includes(highlightNotif.phase) && tx.status === highlightNotif.phase) return true;
      // Category match without coin (for KRW, USD, etc.)
      if (cat === tx.cat && !coin) return true;
      return false;
    });
    if (match) {
      // Clear first so React always sees a state change (re-triggers modal highlight
      // effect even if the same tx is matched while the modal is already open)
      setHighlightTxId(null);
      setTimeout(() => {
        setHighlightTxId(match.id);
        setModal("activity");
      }, 0);
    }
  }, [highlightNotif]);

  // ── Derived ────────────────────────────────────────────────────
  const total = useMemo(() =>
    Object.entries(COINS).reduce((s, [t, info]) => s + balances[t] * getUSDRate(rates, t), 0),
  [rates, balances]);

  const activePnlPct = PERIOD_PNL_PCT[period] || 0;
  const activePnl    = total * (activePnlPct / 100);
  const pnlDir       = activePnl > 0.005 ? "up" : activePnl < -0.005 ? "down" : "flat";

  // Breakdown bar data
  const sortedAssets = useMemo(() =>
    Object.entries(COINS)
      .map(([ticker, info]) => ({ ticker, info, usd: balances[ticker] * getUSDRate(rates, ticker) }))
      .filter(a => a.usd > 0)
      .sort((a, b) => b.usd - a.usd),
  [rates, balances]);
  const showOther  = sortedAssets.length > 4;
  const topAssets  = useMemo(() => showOther ? sortedAssets.slice(0, 4) : sortedAssets, [sortedAssets, showOther]);
  const restAssets = useMemo(() => showOther ? sortedAssets.slice(4) : [], [sortedAssets, showOther]);
  const topAssetsReversed = useMemo(() => [...topAssets].reverse(), [topAssets]);
  const otherUsd   = restAssets.reduce((s, a) => s + a.usd, 0);
  const otherPct   = total > 0 ? (otherUsd / total) * 100 : 0;

  // Count of coins eligible for dust conversion — drives whether the trigger
  // link in the section header is rendered at all.
  const dustCount = useMemo(() => {
    let n = 0;
    for (const ticker of Object.keys(COINS)) {
      if (ticker === DUST_TARGET) continue;
      const usd = (balances[ticker] || 0) * getUSDRate(rates, ticker);
      if (usd > 0 && usd < MIN_DUST_USD) n++;
    }
    return n;
  }, [balances, rates]);

  // Token table — filter/search/sort computed once per relevant change
  const visibleTokens = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    const dir = assetSort.dir === "asc" ? 1 : -1;
    return Object.entries(COINS)
      .filter(([ticker]) => !hideZero || balances[ticker] > 0)
      .filter(([ticker, info]) => !q || ticker.toLowerCase().includes(q) || info.name.toLowerCase().includes(q))
      .sort(([aT, aI], [bT, bI]) => {
        if (assetSort.col === "name")    return dir * aT.localeCompare(bT);
        if (assetSort.col === "balance") return dir * (balances[aT] - balances[bT]);
        if (assetSort.col === "hold")    return dir * (aI.hold - bI.hold);
        return dir * (balances[aT] * getUSDRate(rates, aT) - balances[bT] * getUSDRate(rates, bT));
      });
  }, [hideZero, assetSearch, assetSort, balances, rates]);

  // ── Effects ────────────────────────────────────────────────────
  useEffect(injectWalletCSS, []);

  // Page load delay
  useEffect(() => {
    const t = setTimeout(() => setPageLoading(false), animMs(350));
    return () => clearTimeout(t);
  }, []);

  // Live rate ticker (every 3.5s)
  useEffect(() => {
    const id = setInterval(() => {
      setRates(prev => {
        const next = {};
        for (const [k, v] of Object.entries(prev)) {
          next[k] = Math.round(v * (1 + (Math.random() - 0.48) * 0.004) * 100) / 100;
        }
        return next;
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Bar segments: mount at flex:0, expand on next frame
  useEffect(() => {
    if (pageLoading) return;
    setBarMounted(true);
    const id = requestAnimationFrame(() => setBarExpand(true));
    return () => cancelAnimationFrame(id);
  }, [pageLoading]);

  // Portfolio value count-up on load
  useEffect(() => {
    if (pageLoading || countDone) return;
    if (getAnimScale() === 0) {
      setCountTotal(total); setCountDone(true);
    } else {
      const countDuration = animMs(COUNTUP_MS);
      const start  = performance.now();
      const tick = (now) => {
        const p    = Math.min((now - start) / countDuration, 1);
        const ease = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
        setCountTotal(total * ease);
        if (p < 1) countRef.current = requestAnimationFrame(tick);
        else { setCountTotal(total); setCountDone(true); }
      };
      countRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(countRef.current);
  }, [pageLoading, total, countDone]);

  // Flash header on rate tick
  useEffect(() => {
    if (prevTotal.current === null) { prevTotal.current = total; return; }
    const dir = total > prevTotal.current ? "up" : "down";
    prevTotal.current = total;
    setFlashDir(dir);
    setFlashKey(k => k + 1);
    const t = setTimeout(() => setFlashDir(null), animMs(FLASH_MS) + 50);
    return () => clearTimeout(t);
  }, [total]);

  // ── Handlers ───────────────────────────────────────────────────
  const closeAllModals = () => { setModal(null); setModalReturn(null); };
  const openModalDirect = (next, coin) => {
    if (coin) setModalCoin(coin);
    setModalReturn(null);
    setModal(next);
  };
  const openSubFromCoin = next => { setModalReturn(MODAL_COIN); setModal(next); };
  const backToCoinModal = () => {
    if (modalReturn) setModal(modalReturn);
    setModalReturn(null);
  };
  const subModalBack = modalReturn ? backToCoinModal : undefined;

  const openSend    = (coin) => openModalDirect("send", coin);
  const openReceive = (coin) => openModalDirect("receive", coin);

  useEffect(() => {
    if (!modal) return;
    const onKey = e => { if (e.key === "Escape") closeAllModals(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  return (
    <div className="wl-root" style={embedded ? { paddingTop: 0, minHeight: "auto" } : undefined}>
      {!embedded && <NavBar active="wallet" />}
      <div className="wl-container" style={embedded ? { paddingTop: 0 } : undefined}>

        {/* Header — always rendered; value counts up from skeleton */}
        <div className="wl-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="wl-total-label">Portfolio value</div>
            {onNavigate && (
              <button onClick={() => onNavigate("settings")}
                style={{ width: 10, height: 10, border: "none", background: "none", padding: 0, cursor: "pointer", transition: "all 150ms", flexShrink: 0, color: "rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,.7)"; e.currentTarget.style.transform = "scale(1.1) rotate(30deg)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,.35)"; e.currentTarget.style.transform = "scale(1) rotate(0deg)"; }}
                title="Profile & Settings">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H10a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V10a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
                </svg>
              </button>
            )}
          </div>
          <div className="wl-head-main" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ position: "relative" }}>
              <div className="hx-sk" style={{ height: 36, width: 200, borderRadius: 6, position: "absolute", top: 0, left: 0, opacity: pageLoading ? 1 : 0, transition: "opacity 300ms ease", pointerEvents: "none" }} />
              <div
                key={countDone ? flashKey : "counting"}
                className={"wl-total-value" + (flashDir === "up" ? " wl-flash-up" : flashDir === "down" ? " wl-flash-down" : "")}
                style={{ opacity: pageLoading ? 0 : 1, transition: "opacity 200ms ease" }}
              >
                {fmtUSD(countDone ? total : countTotal, true)}
              </div>
            </div>
            <div className="wl-head-actions" style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end", flexShrink: 0, opacity: pageLoading ? 0 : 1, transition: "opacity 400ms ease" }}>
              <button className="wl-history-inline-btn" onClick={() => openReceive(sortedAssets[0]?.ticker ?? "BTC")}
                style={{ color: COLOR_UP, borderColor: "rgba(74,222,128,.3)", background: "rgba(74,222,128,.08)", marginBottom: 3 }}>↓ Receive</button>
              <div className="wl-head-actions-sub" style={{ display: "flex", gap: 4, width: "100%" }}>
                <button className="wl-header-btn" onClick={() => openSend(sortedAssets[0]?.ticker ?? "BTC")}
                  style={{ color: "rgba(240,170,170,.95)", borderColor: "rgba(220,130,130,.35)", background: "rgba(220,130,130,.12)" }}>Send</button>
                <button className="wl-header-btn" onClick={() => setModal("activity")}
                  style={{ flex: 1 }}>◷ History</button>
              </div>
            </div>
          </div>
        </div>

        {/* Asset breakdown bar */}
        <div className="wl-breakdown">
          <div className="wl-breakdown-bar">
            {!barMounted ? (
              <div className="hx-sk" style={{ flex: 1, height: "100%", borderRadius: 3 }} />
            ) : (<>
              {showOther && (
                <div className="wl-breakdown-other"
                  style={{ flex: barExpand ? otherPct : 0, height: "100%", position: "relative", transition: `flex 600ms cubic-bezier(.2,.8,.2,1) 0ms` }}
                  onMouseEnter={() => setOtherHovered(true)} onMouseLeave={() => setOtherHovered(false)}>
                  <div style={{ width: "100%", height: "100%", background: otherHovered ? "rgba(255,255,255,.38)" : "rgba(255,255,255,.2)", transition: "background 150ms" }} />
                </div>
              )}
              {topAssetsReversed.map(({ ticker, info, usd }, i) => (
                <div key={ticker} className="wl-breakdown-seg"
                  style={{ flex: barExpand ? (total > 0 ? (usd / total) * 100 : 0) : 0, background: info.color, transition: `flex 600ms cubic-bezier(.2,.8,.2,1) ${(i + (showOther ? 1 : 0)) * 130}ms` }} />
              ))}
            </>)}
          </div>
          <div className="wl-breakdown-legend" style={{ opacity: barExpand ? 1 : 0, transition: "opacity 400ms ease 400ms" }}>
            {showOther && (
              <div className="wl-breakdown-item wl-breakdown-other"
                style={{ color: otherHovered ? "rgba(255,255,255,.75)" : undefined }}
                onMouseEnter={() => setOtherHovered(true)} onMouseLeave={() => setOtherHovered(false)}>
                <div className="wl-breakdown-dot" style={{ background: otherHovered ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.3)", transition: "background 150ms" }} />
                Other {otherPct.toFixed(1)}%
                <div className="wl-breakdown-tooltip" style={{ opacity: otherHovered ? 1 : 0, pointerEvents: otherHovered ? "auto" : "none", transform: otherHovered ? "translateY(0)" : "translateY(-4px)" }}>
                  {restAssets.map(({ ticker, info, usd }) => (
                    <div key={ticker} className="wl-breakdown-tooltip-row">
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: info.color, flexShrink: 0 }} />
                      {ticker} {total > 0 ? ((usd / total) * 100).toFixed(1) : 0}%
                    </div>
                  ))}
                </div>
              </div>
            )}
            {topAssetsReversed.map(({ ticker, info, usd }) => (
              <div key={ticker} className="wl-breakdown-item">
                <div className="wl-breakdown-dot" style={{ background: info.color }} />
                {ticker} {total > 0 ? ((usd / total) * 100).toFixed(1) : 0}%
              </div>
            ))}
          </div>
        </div>

        {pageLoading ? <WalletPageSkeleton /> : <div style={{ animation: 'hxSkFadeIn 250ms ease' }}>

        {/* Chart */}
        <div className="wl-chart-section" onClick={() => setShowPeriodDrop(false)}>
          <div className="wl-chart-topbar">
            <div className={"wl-pnl-badge wl-pnl-badge--" + pnlDir + " wl-pnl-badge--action"}
              onClick={e => { e.stopPropagation(); setShowBigChart(true); }}>
              {pnlDir === "up" ? "▲" : pnlDir === "down" ? "▼" : "–"}
              {" "}{fmtUSD(Math.abs(activePnl))} ({Math.abs(activePnlPct).toFixed(2)}%)
            </div>
            <div className="wl-period-drop">
              <button className="wl-period-btn wl-period-btn--active" style={{ fontSize: 10 }}
                onClick={e => { e.stopPropagation(); setShowPeriodDrop(s => !s); }}>
                {period} ▾
              </button>
              {showPeriodDrop && (
                <div className="wl-period-menu" onClick={e => e.stopPropagation()}>
                  <button className="wl-period-menu-item"
                    onClick={() => { setShowBigChart(true); setShowPeriodDrop(false); }}>
                    <span style={{ width: 14 }}>⤢</span>Enlarge Chart
                  </button>
                </div>
              )}
            </div>
          </div>
          <div onMouseEnter={() => setShowPeriodDrop(false)}>
            <SparkChart total={total} period={period} isUp={pnlDir !== "down"}
              onToggle={openBigChart} />
          </div>
        </div>

        {/* Token list */}
        <div className="wl-section">
          <div className="wl-section-head">
            <span className="wl-section-title">Assets</span>
            <span className="wl-section-sub">({visibleTokens.length})</span>
            {dustCount > 0 && (
              <button className="wl-dust-link" onClick={() => setModal("duster")}
                title={`${dustCount} coin${dustCount > 1 ? "s" : ""} below $${MIN_DUST_USD}`}>
                Convert dust
              </button>
            )}
            <div className="wl-asset-search-wrap">
              <span className="wl-asset-search-icon">⌕</span>
              <input className="wl-asset-search" placeholder="Search…"
                value={assetSearch} onChange={e => setAssetSearch(e.target.value)} />
            </div>
            <label className="wl-hide-zero" onClick={() => setHideZero(v => !v)}>
              <span className="wl-hide-zero-label">Hide zero</span>
              <div className={"wl-toggle" + (hideZero ? " wl-toggle--on" : "")}>
                <div className="wl-toggle-thumb" />
              </div>
            </label>
          </div>
          <div className="wl-table">
            <div className="wl-table-head">
              {[
                { col: "name",    label: "Crypto Assets", first: true },
                { col: "balance", label: "Balance" },
                { col: "hold",    label: "Hold", info: true },
                { col: "value",   label: "Value" },
              ].map(({ col, label, first, info: hasInfo }) => {
                const active = assetSort.col === col;
                const toggleSort = () => setAssetSort(s => s.col === col ? { col, dir: s.dir === "desc" ? "asc" : "desc" } : { col, dir: col === "name" ? "asc" : "desc" });
                return (
                  <span key={col} className={"wl-th" + (active ? " wl-th--active" : "")}
                    onClick={toggleSort}>
                    {hasInfo ? (
                      <span className="wl-th-hold">
                        {label} <span className="wl-th-info-badge">i</span>
                        <span className="wl-th-hold-tip">
                          Reserved for pending deposits, withdrawals,<br />or open limit orders.
                        </span>
                      </span>
                    ) : label}
                    <span className="wl-th-sort">
                      <span className={"wl-th-sort-up" + (active && assetSort.dir === "asc"  ? " wl-th-sort-up--on" : "")}>▲</span>
                      <span className={"wl-th-sort-dn" + (active && assetSort.dir === "desc" ? " wl-th-sort-dn--on" : "")}>▼</span>
                    </span>
                  </span>
                );
              })}
            </div>
            {visibleTokens.length === 0 && (
              window.EmptyState
                ? window.EmptyState({
                    compact: true,
                    icon: "⌕",
                    title: assetSearch.trim() ? "No assets found" : "No assets",
                    message: assetSearch.trim()
                      ? "Try a different search term or clear the filter."
                      : hideZero ? "All balances are zero. Deposit to get started." : "No assets match the current view.",
                  })
                : <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: "rgba(255,255,255,.2)" }}>No assets found</div>
            )}
            {visibleTokens.map(([ticker, info]) => {
                const rate = getUSDRate(rates, ticker);
                const usd = balances[ticker] * rate;
                const isZero = balances[ticker] === 0;
                return (
                  <div key={ticker} className={"wl-token-row" + (isZero ? " wl-token-row--zero" : "")}
                    onClick={() => openModalDirect(isZero ? "receive" : MODAL_COIN, ticker)}>
                    <div className="wl-token-left">
                      <span className="wl-token-icon"
                        style={{ background: info.color + "22", color: info.color, border: `1px solid ${info.color}35` }}>
                        {info.icon}
                      </span>
                      <div>
                        <div className="wl-token-name">{ticker}</div>
                        <div className="wl-token-sub">{info.name}</div>
                      </div>
                    </div>
                    <div className="wl-td" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {isZero ? <span style={{ color: "rgba(255,255,255,.2)", fontSize: 11 }}>—</span>
                        : <>{fmtBal(balances[ticker], info.decimals)} <span style={{ fontSize: 9, color: "rgba(255,255,255,.25)" }}>{ticker}</span></>}
                    </div>
                    <div className="wl-td" style={{ textAlign: "right", whiteSpace: "nowrap", color: info.hold > 0 ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.2)" }}>
                      {info.hold > 0 ? <>{fmtBal(info.hold, info.decimals)} <span style={{ fontSize: 9, opacity: 0.7 }}>{ticker}</span></> : "—"}
                    </div>
                    <div className="wl-td wl-td--val" style={{ textAlign: "right" }}>
                      {isZero
                        ? <button className="wl-deposit-cta" onClick={e => { e.stopPropagation(); openModalDirect("receive", ticker); }}>+ Deposit</button>
                        : fmtUSD(usd, true)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        </div>}
      </div>

      {showBigChart && (
        <EnlargedChartModal onClose={() => setShowBigChart(false)} total={total} defaultPeriod="3M" />
      )}
      {modal && (
        <div className="wl-overlay" onClick={e => e.target === e.currentTarget && closeAllModals()}>
          {modal === "coin" && (
            <CoinDetailModal coin={modalCoin} rates={rates} onClose={closeAllModals}
              onSend={() => openSubFromCoin("send")} onReceive={() => openSubFromCoin("receive")}
              onBuy={() => openSubFromCoin("buy")} onSell={() => openSubFromCoin("sell")} balances={balances} />
          )}
          {modal === "activity" && <WalletHistoryModal onClose={() => { setModal(null); setHighlightTxId(null); }} rates={rates} balances={balances} activity={activity} highlightTxId={highlightTxId} onHighlightDone={() => setHighlightTxId(null)} />}
          {modal === "send" && (
            <SendModal onClose={closeAllModals} onBack={subModalBack} rates={rates} initialCoin={modalCoin} balances={balances}
              onSubmitted={({ coin: c, amount: amt, address: addr, network: net, fee, usd, memo }) => {
                const n = parseFloat(amt) || 0;
                setBalances(b => ({ ...b, [c]: Math.max(0, (b[c] || 0) - n) }));
                setActivity(prev => [{
                  cat: "withdraw", coin: c, amount: amt, usd: usd.toFixed(2),
                  time: formatNowForTx(), status: "pending", hash: makeTxHash(),
                  id: nextTxIdRef.current++, detail: net + (memo ? ` · ${memo}` : ""),
                }, ...prev]);
                setToast(`Withdrawal submitted · ${amt} ${c}`);
              }} />
          )}
          {modal === "receive" && <ReceiveModal onClose={closeAllModals} onBack={subModalBack} initialCoin={modalCoin} />}
          {modal === "buy" && (
            <TradeRouteModal coin={modalCoin} side="buy" rates={rates} ratesLoading={pageLoading || tradeRouteLoading} onClose={closeAllModals} onBack={subModalBack}
              onContinue={({ buyAsset, spendAsset }) => { closeAllModals(); onNavigateToConvert?.({ buyAsset, spendAsset }); }} />
          )}
          {modal === "sell" && (
            <TradeRouteModal coin={modalCoin} side="sell" rates={rates} ratesLoading={pageLoading || tradeRouteLoading} onClose={closeAllModals} onBack={subModalBack}
              onContinue={({ buyAsset, spendAsset }) => { closeAllModals(); onNavigateToConvert?.({ buyAsset, spendAsset }); }} />
          )}
          {modal === "duster" && (
            <DusterModal
              onClose={() => setModal(null)}
              balances={balances}
              rates={rates}
              onConvert={({ targetReceived, totalUsd, items }) => {
                setBalances(b => {
                  const next = { ...b, USDT: b.USDT + targetReceived };
                  items.forEach(it => { next[it.ticker] = 0; });
                  return next;
                });
                setActivity(prev => [{
                  cat: "swap",
                  coin: "USDT",
                  amount: fmtDust(targetReceived),
                  usd: totalUsd.toFixed(2),
                  time: formatNowForTx(),
                  status: "confirmed",
                  hash: makeTxHash(),
                  id: nextTxIdRef.current++,
                  detail: `← ${items.length} dust coin${items.length > 1 ? "s" : ""}`,
                }, ...prev]);
                setToast("Dust converted to USDT!");
              }}
            />
          )}

        </div>
      )}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

window.WalletPage = WalletPage;
AppPages.register("wallet", {
  component: WalletPage,
  label: "Wallet",
  notchTab: true,
  fullWidth: true,
});
