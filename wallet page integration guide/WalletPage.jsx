import React, { useEffect, useMemo, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════════════
const COINS = {
  BTC:  { name: "Bitcoin",    icon: "₿", color: "#f7931a", decimals: 8, balance: 2.45831,   hold: 0 },
  ETH:  { name: "Ethereum",   icon: "Ξ", color: "#627eea", decimals: 4, balance: 34.2819,   hold: 0 },
  USDT: { name: "Tether",     icon: "₮", color: "#26a17b", decimals: 2, balance: 48750.00,  hold: 1300 },
  SOL:  { name: "Solana",     icon: "◎", color: "#9945ff", decimals: 3, balance: 312.485,   hold: 0 },
  BNB:  { name: "BNB",        icon: "◆", color: "#f0b90b", decimals: 4, balance: 18.753,    hold: 0 },
  XRP:  { name: "Ripple",     icon: "✕", color: "#00aae4", decimals: 4, balance: 5420.00,   hold: 0 },
  USDC: { name: "USD Coin",   icon: "$", color: "#2775ca", decimals: 2, balance: 12500.00,  hold: 0 },
  ADA:  { name: "Cardano",    icon: "₳", color: "#3d9fee", decimals: 6, balance: 0,         hold: 0 },
  DOGE: { name: "Dogecoin",   icon: "Ð", color: "#c2a633", decimals: 2, balance: 0,         hold: 0 },
  AVAX: { name: "Avalanche",  icon: "▲", color: "#e84142", decimals: 4, balance: 0,         hold: 0 },
  POL:  { name: "Polygon",    icon: "⬡", color: "#8247e5", decimals: 4, balance: 0,         hold: 0 },
};


const BASE_RATES = {
  "BTC/USDT": 67432.50, "ETH/USDT": 3521.80, "SOL/USDT": 142.65,
  "BNB/USDT": 612.40,   "XRP/USDT": 0.5214,  "USDC/USDT": 1.0001,
};

// PnL % change per period (1D is computed live from MOCK_CHANGES; others are mock)
const PERIOD_PNL_PCT = { "7D": 4.21, "1M": -8.73, "3M": 15.4 };

const MOCK_CHANGES = {
  BTC: 2.34, ETH: -1.12, USDT: 0.01, SOL: 5.67, BNB: -0.88, XRP: 3.21, USDC: 0.00,
};

const COLOR_UP   = "#4ade80";
const COLOR_DOWN = "#f87171";

const GRID_INTRO_MS = 3200;
const GRID_FADE_MS  = 600;
const LINE_DRAW_MS  = 2400;
const COUNTUP_MS    = 650;
const FLASH_MS      = 550;

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
  { cat: "trade",    coin: "ETH",  amount: "2.4000",    usd: "8,452.32",  time: "Today 1:05 AM",    status: "confirmed", hash: "f6g7h8i9j0", id: 2  },
  { cat: "withdraw", coin: "USDT", amount: "1,200.00",  usd: "1,200.00",  time: "Mar 17 11:44 PM",  status: "pending",   hash: "k1l2m3n4o5", id: 3  },
  { cat: "deposit",  coin: "SOL",  amount: "40.000",    usd: "5,706.00",  time: "Mar 17 9:30 PM",   status: "confirmed", hash: "p6q7r8s9t0", id: 4  },
  { cat: "trade",    coin: "BNB",  amount: "5.2000",    usd: "3,184.48",  time: "Mar 17 6:15 PM",   status: "confirmed", hash: "u1v2w3x4y5", id: 5  },
  { cat: "withdraw", coin: "BTC",  amount: "0.10000",   usd: "6,743.25",  time: "Mar 17 3:00 PM",   status: "failed",    hash: "z6a7b8c9d0", id: 6  },
  { cat: "deposit",  coin: "XRP",  amount: "500.0000",  usd: "260.70",    time: "Mar 16 8:22 PM",   status: "confirmed", hash: "e1f2g3h4i5", id: 7  },
  { cat: "trade",    coin: "ETH",  amount: "1.0000",    usd: "3,521.80",  time: "Mar 16 5:11 PM",   status: "rejected",  hash: "j6k7l8m9n0", id: 8  },
  { cat: "withdraw", coin: "USDC", amount: "800.00",    usd: "800.08",    time: "Mar 16 2:45 PM",   status: "error",     hash: "o1p2q3r4s5", id: 9  },
  { cat: "deposit",  coin: "BTC",  amount: "0.05000",   usd: "3,371.63",  time: "Mar 15 11:30 AM",  status: "confirmed", hash: "t6u7v8w9x0", id: 10 },
  { cat: "trade",    coin: "SOL",  amount: "20.000",    usd: "2,853.00",  time: "Mar 15 9:00 AM",   status: "confirmed", hash: "y1z2a3b4c5", id: 11 },
  { cat: "withdraw", coin: "ETH",  amount: "0.5000",    usd: "1,760.90",  time: "Mar 14 7:15 PM",   status: "pending",   hash: "d6e7f8g9h0", id: 12 },
  { cat: "deposit",  coin: "USDT", amount: "5,000.00",  usd: "5,000.00",  time: "Mar 14 4:30 PM",   status: "confirmed", hash: "i1j2k3l4m5", id: 13 },
  { cat: "trade",    coin: "BNB",  amount: "3.0000",    usd: "1,837.20",  time: "Mar 13 10:00 AM",  status: "confirmed", hash: "n6o7p8q9r0", id: 14 },
  { cat: "withdraw", coin: "XRP",  amount: "1,000.000", usd: "521.40",    time: "Mar 12 6:00 PM",   status: "confirmed", hash: "s1t2u3v4w5", id: 15 },
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

const WL_CSS_ID = "wl-styles";

// ═══════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════
function getUSDRate(rates, ticker) {
  if (ticker === "USDT") return 1;
  if (ticker === "USDC") return rates["USDC/USDT"] || 1;
  return rates[`${ticker}/USDT`] || 0;
}

function addCommas(intStr) {
  let r = "";
  for (let j = 0; j < intStr.length; j++) {
    if (j > 0 && (intStr.length - j) % 3 === 0) r += ",";
    r += intStr[j];
  }
  return r;
}

function fmtUSD(n, compact) {
  if (compact && n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (compact && n >= 10_000_000)    return "$" + (n / 1_000_000).toFixed(2) + "M";
  const [i, f] = n.toFixed(2).split(".");
  return "$" + addCommas(i) + "." + f;
}

function fmtPrice(n) {
  if (n >= 1000) return fmtUSD(n);
  if (n >= 1) return "$" + n.toFixed(4);
  return "$" + n.toFixed(6);
}

function fmtBal(n, decimals) {
  const [i, f] = n.toFixed(Math.min(decimals, 5)).split(".");
  const trimmed = f ? f.replace(/0+$/, "") : "";
  return trimmed ? addCommas(i) + "." + trimmed : addCommas(i);
}

// ═══════════════════════════════════════════════════════════════════
// Chart data helpers
// ═══════════════════════════════════════════════════════════════════
function genChartData(endVal, points, volatility) {
  // Walk backwards from endVal with noise
  const data = [endVal];
  for (let i = 1; i < points; i++) {
    const prev = data[0];
    const delta = prev * volatility * (Math.random() - 0.48);
    data.unshift(Math.max(prev - delta, endVal * 0.85));
  }
  return data;
}

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
.wl-container{max-width:460px;margin:0 auto;padding:16px 14px 48px}

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
.wl-tx-modal{max-width:520px;height:min(820px,90vh);display:flex;flex-direction:column}
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
.wl-sk{border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.04) 75%);background-size:400px 100%;animation:wlShimmer 1.4s ease-in-out infinite}
.wl-sk-circle{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.04) 75%);background-size:400px 100%;animation:wlShimmer 1.4s ease-in-out infinite}
.wl-sk-lines{flex:1;display:flex;flex-direction:column;gap:5px}
.wl-tx-list--loading{pointer-events:none}
.wl-tx-body{flex:1;overflow:hidden;position:relative;min-height:0}

/* Modals */
.wl-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;animation:wlFadeIn 200ms ease}
.wl-overlay--chart{background:rgba(0,0,0,.75);backdrop-filter:blur(12px)}
@keyframes wlFadeIn{from{opacity:0}to{opacity:1}}
@keyframes wlShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.wl-modal{background:#1a1a24;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:22px;width:100%;max-width:460px;animation:wlSlideUp 280ms cubic-bezier(.2,.8,.2,1);font-family:'JetBrains Mono',ui-monospace,monospace;color:#fff}
/* Enlarged chart modal — must come after .wl-modal to override max-width:460px */
.wl-big-chart-modal{max-width:960px;width:calc(100vw - 120px);padding:28px}
@keyframes wlSlideUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.wl-modal-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.wl-modal-title{font-size:15px;font-weight:700;color:rgba(255,255,255,.92)}
.wl-modal-close{background:transparent;border:0;color:rgba(255,255,255,.3);font-size:16px;cursor:pointer;line-height:1;padding:2px 4px;transition:color 120ms}
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

/* Coin detail modal */
.wl-coin-modal{max-width:340px}
.wl-cd-hero{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 0 20px}
.wl-cd-icon{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-size:28px;font-weight:700;margin-bottom:4px}
.wl-cd-ticker{font-size:11px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.35)}
.wl-cd-price{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.92);letter-spacing:-.5px}
.wl-cd-balance-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:center}
.wl-cd-bal-label{font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:6px}
.wl-cd-bal-coin{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.88);margin-bottom:3px}
.wl-cd-bal-usd{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.35)}
.wl-cd-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wl-cd-btn{height:42px;border-radius:10px;border:0;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all 150ms;letter-spacing:.03em}
.wl-cd-btn--send{background:rgba(220,60,60,.18);color:rgba(255,120,120,1);border:1px solid rgba(220,60,60,.35)}
.wl-cd-btn--send:hover{background:rgba(220,60,60,.28);color:#ff8080;border-color:rgba(220,60,60,.55)}
.wl-cd-btn--receive{background:rgba(74,222,128,.1);color:${COLOR_UP};border:1px solid rgba(74,222,128,.25)}
.wl-cd-btn--receive:hover{background:rgba(74,222,128,.18);border-color:rgba(74,222,128,.4)}

/* Portfolio history modal */
.wl-history-inline-btn{width:100%;margin-top:0;height:15px;border-radius:7px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.06);font-size:10px;font-weight:600;font-family:inherit;color:rgba(255,255,255,.78);cursor:pointer;letter-spacing:.05em;transition:all 150ms}
.wl-history-inline-btn:hover{color:rgba(255,255,255,.88);background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2)}
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

const SparkChart = React.memo(function SparkChart({ total, period, isUp, onToggle, height = 130, gridClip = 0.55 }) {
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

    const loop = (now) => {
      const elapsed = now - startTime;
      const rawPct  = Math.min(elapsed / GRID_INTRO_MS, 1);
      const opacity = Math.min(elapsed / GRID_FADE_MS, 1);

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

      // Price axis — 3 labels in the right margin, fade in with progress
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
        // labels
        const levels = [
          { v: max,             y: Math.max(cpy(max), 10) },
          { v: (max + min) / 2, y: cpy((max + min) / 2)   },
          { v: min,             y: Math.min(cpy(min), H - 10) },
        ];
        for (const { v, y } of levels) {
          ctx.fillStyle = `rgba(255,255,255,${0.28 * axisAlpha})`;
          ctx.fillText(fmtAxis(v), axisX, y);
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
      const startTime = performance.now();
      const animate = (now) => {
        const raw = Math.min((now - startTime) / LINE_DRAW_MS, 1);
        // ease-out — faster burst at start, longer tail at end
        const progress = 1 - Math.pow(1 - raw, 8);
        doDraw(progress);
        if (raw < 1) rafRef.current = requestAnimationFrame(animate);
        else rafRef.current = null;
      };
      rafRef.current = requestAnimationFrame(animate);
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
// Send Modal
// ═══════════════════════════════════════════════════════════════════
function SendModal({ onClose, onSent, rates, initialCoin, balances }) {
  const [coin, setCoin] = useState(initialCoin || "BTC");
  const [showDrop, setShowDrop] = useState(false);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [btnHover, setBtnHover] = useState(false);

  const info = COINS[coin];
  const step = info.decimals >= 4 ? 0.0001 : info.decimals >= 2 ? 0.01 : 1;
  const nudge = (dir) => {
    const cur = parseFloat(amount) || 0;
    const next = Math.max(0, parseFloat((cur + dir * step).toFixed(info.decimals)));
    setAmount(String(next));
  };
  const rate = getUSDRate(rates, coin);
  const usdVal = parseFloat(amount) > 0 ? parseFloat(amount) * rate : 0;
  const fee = { BTC: "0.000008", ETH: "0.00042", SOL: "0.000025" }[coin] || "0.50";
  const canSend = parseFloat(amount) > 0 && address.trim().length > 10;

  return (
    <div className="wl-modal">
      <div className="wl-modal-hd">
        <div className="wl-modal-title">Send</div>
          <button className="wl-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="wl-field-label">Asset</div>
        <div className="wl-coin-sel" onClick={() => setShowDrop(s => !s)}>
          <span className="wl-coin-sel-icon" style={{ background: info.color + "28", color: info.color }}>{info.icon}</span>
          <span className="wl-coin-sel-ticker">{coin}</span>
          <span className="wl-coin-sel-name">{info.name}</span>
          <span className="wl-coin-sel-arrow">{showDrop ? "▲" : "▼"}</span>
        </div>
        {showDrop && <CoinDropdown onSelect={k => { setCoin(k); setShowDrop(false); setAmount(""); }} />}

        <div className="wl-field-label">Amount</div>
        <div className="wl-amount-wrap">
          <input className="wl-amount-input" type="number" placeholder={"0." + "0".repeat(Math.min(info.decimals, 4))}
            value={amount} onChange={e => setAmount(e.target.value)} />
          <div className="wl-amount-steppers">
            <button className="wl-amount-step" onClick={() => nudge(1)}>▲</button>
            <button className="wl-amount-step" onClick={() => nudge(-1)}>▼</button>
          </div>
          <button className="wl-max-btn" onClick={() => setAmount(String(balances ? balances[coin] : info.balance))}>MAX</button>
        </div>
        <div className="wl-usd-hint">{usdVal > 0 ? "≈ " + fmtUSD(usdVal) : "\u00a0"}</div>

        <div className="wl-field-label">To Address</div>
        <input className="wl-addr-input" type="text" placeholder="Paste recipient address..."
          value={address} onChange={e => setAddress(e.target.value)} />

        <div className="wl-fee-box">
          <div className="wl-fee-row">
            <span className="wl-fee-label">Network fee</span>
            <span className="wl-fee-val">{fee} {coin}</span>
          </div>
          <div className="wl-fee-row">
            <span className="wl-fee-label">USD value</span>
            <span className="wl-fee-val">{usdVal > 0 ? fmtUSD(usdVal) : "—"}</span>
          </div>
        </div>

        <button className="wl-confirm-btn" disabled={!canSend}
          style={{
            background: canSend ? `linear-gradient(135deg,${info.color},${info.color}bb)` : "rgba(255,255,255,.07)",
            color: canSend ? "#fff" : "rgba(255,255,255,.25)",
            boxShadow: canSend ? `0 ${btnHover ? "6px 20px" : "4px 16px"} ${info.color}${btnHover ? "50" : "30"}` : "none",
            transform: canSend && btnHover ? "translateY(-1px)" : "",
            transition: "all 150ms",
          }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          onClick={() => { if (canSend) { onSent(coin, amount); onClose(); } }}>
          Confirm Send
        </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Receive Modal
// ═══════════════════════════════════════════════════════════════════
function ReceiveModal({ onClose, initialCoin }) {
  const [coin, setCoin] = useState(initialCoin || "BTC");
  const [showDrop, setShowDrop] = useState(false);
  const [copied, setCopied] = useState(false);
  const info = COINS[coin];
  const addr = MOCK_ADDRESSES[coin];

  const copy = () => {
    navigator.clipboard?.writeText(addr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="wl-modal">
      <div className="wl-modal-hd">
        <div className="wl-modal-title">Receive</div>
        <button className="wl-modal-close" onClick={onClose}>✕</button>
      </div>

      <div className="wl-field-label">Asset</div>
      <div className="wl-coin-sel" onClick={() => setShowDrop(s => !s)}>
        <span className="wl-coin-sel-icon" style={{ background: info.color + "28", color: info.color }}>{info.icon}</span>
        <span className="wl-coin-sel-ticker">{coin}</span>
        <span className="wl-coin-sel-name">{info.name}</span>
        <span className="wl-coin-sel-arrow">{showDrop ? "▲" : "▼"}</span>
      </div>
      {showDrop && <CoinDropdown onSelect={k => { setCoin(k); setShowDrop(false); }} />}

      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div className="wl-qr-box">
          <div>
            <div style={{ fontSize: 26, color: info.color, marginBottom: 2 }}>{info.icon}</div>
            <div style={{ fontSize: 9, letterSpacing: ".08em" }}>QR CODE</div>
          </div>
        </div>
      </div>

      <div className="wl-field-label">Your {coin} Address</div>
      <div className="wl-addr-display">{addr}</div>
      <button className="wl-copy-btn" onClick={copy}>{copied ? "✓  Copied!" : "Copy Address"}</button>
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
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 10, color: "rgba(255,255,255,.25)", fontWeight: 600 }}>
          <span>{period === "7D" ? "7 days ago" : period === "1M" ? "1 month ago" : "3 months ago"}</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Coin Detail Modal
// ═══════════════════════════════════════════════════════════════════
function CoinDetailModal({ onClose, coin, rates, onSend, onReceive, balances }) {
  const info = COINS[coin];
  const bal  = balances ? balances[coin] : info.balance;
  const usd  = bal * getUSDRate(rates, coin);

  return (
    <div className="wl-modal wl-coin-modal">
      <div className="wl-modal-hd">
        <div className="wl-modal-title">{info.name}</div>
        <button className="wl-modal-close" onClick={onClose}>✕</button>
      </div>

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

function AccountStatementModal({ onClose }) {
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

  const filtered = MOCK_ACTIVITY.filter(tx => {
    if (typeFilter !== "all" && tx.cat  !== typeFilter) return false;
    if (coinFilter !== "all" && tx.coin !== coinFilter) return false;
    return true;
  });

  const totalIn  = filtered.filter(t => t.cat === "deposit") .reduce((s,t) => s + parseUSD(t.usd), 0);
  const totalOut = filtered.filter(t => t.cat !== "deposit") .reduce((s,t) => s + parseUSD(t.usd), 0);
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
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
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
            ? <div style={{ textAlign:"center", padding:"20px 0", fontSize:11, color:"rgba(255,255,255,.2)" }}>No transactions match filters</div>
            : filtered.map(tx => (
              <div key={tx.id} className="wl-stmt-preview-row">
                <div style={{ display:"flex", alignItems:"center", gap:7, minWidth:0 }}>
                  <span style={{ fontSize:9, color:"rgba(255,255,255,.3)", flexShrink:0 }}>{tx.time}</span>
                  <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.55)", textTransform:"capitalize", flexShrink:0 }}>{tx.cat}</span>
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

// ═══════════════════════════════════════════════════════════════════
// Portfolio History Modal
// ═══════════════════════════════════════════════════════════════════
function WalletHistoryModal({ onClose, rates, balances }) {
  const [mainTab, setMainTab] = useState("transactions");
  const [showStatement, setShowStatement] = useState(false);

  // — Transaction tab state —
  const [txTab, setTxTab] = useState("all");
  const [page, setPage] = useState(0);
  const [txLoading, setTxLoading] = useState(true);
  const [txView, setTxView] = useState("minimal"); // "minimal" | "default" | "expanded"
  const txTimer = useRef(null);

  const PAGE_SIZES = { minimal: 7, default: 9, expanded: 18 };
  const pageSize   = PAGE_SIZES[txView];

  const triggerTxLoad = () => {
    setTxLoading(true);
    clearTimeout(txTimer.current);
    txTimer.current = setTimeout(() => setTxLoading(false), 650 + Math.random() * 300);
  };
  useEffect(() => { triggerTxLoad(); return () => clearTimeout(txTimer.current); }, []);

  const filtered = txTab === "all" ? MOCK_ACTIVITY : MOCK_ACTIVITY.filter(tx => tx.cat === txTab);
  const pages = Math.ceil(filtered.length / pageSize);
  const rows = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const onTxTab = (t) => { setTxTab(t); setPage(0); triggerTxLoad(); };
  const onPage = (delta) => { setPage(p => p + delta); triggerTxLoad(); };
  const onViewCycle = () => {
    setTxView(v => v === "minimal" ? "default" : v === "default" ? "expanded" : "minimal");
    setPage(0);
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
    balTimer.current = setTimeout(() => setBalLoading(false), 900 + Math.random() * 600);
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
          onClick={() => setMainTab("transactions")}>Transaction History</button>
        <button className={"wl-tx-tab" + (mainTab === "balance" ? " wl-tx-tab--active" : "")}
          onClick={() => {
            setMainTab("balance");
            if (!balVisited.current) {
              balVisited.current = true;
              setBalLoading(true);
              clearTimeout(balTimer.current);
              balTimer.current = setTimeout(() => setBalLoading(false), 900 + Math.random() * 600);
            }
          }}>Balance History</button>
      </div>

      {mainTab === "transactions" && (<>
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
            <div className="wl-tx-list">
              {rows.length === 0 && (
                <div style={{ textAlign: "center", padding: "28px 0", fontSize: 12, color: "rgba(255,255,255,.2)" }}>No transactions</div>
              )}
              {rows.map(tx => {
                const info = COINS[tx.coin];
                const sc = TX_STATUS_COLOR[tx.status];
                const sb = TX_STATUS_BG[tx.status];
                const statusIcon = tx.status === "confirmed" ? "✓" : tx.status === "pending" ? "◌" : "✕";

                // ── Expanded: 9 rows, single-line compact ──
                if (txView === "expanded") return (
                  <div key={tx.id} className="wl-tx-row" style={{ padding: "5px 2px" }}>
                    <span className="wl-tx-icon" style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0, background: info.color + "22", color: info.color, border: `1px solid ${info.color}30` }}>
                      {TX_CAT_ICON[tx.cat]}
                    </span>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.45)", textTransform: "capitalize", flexShrink: 0 }}>{tx.cat} · {tx.coin}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.65)", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.amount}</span>
                      <span style={{ fontSize: 9, color: sc, flexShrink: 0 }}>{statusIcon}</span>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,.6)" }}>${tx.usd}</span>
                    </div>
                  </div>
                );

                // ── Minimal: 4 rows, rich detail ──
                if (txView === "minimal") return (
                  <div key={tx.id} className="wl-tx-row" style={{ padding: "11px 2px", alignItems: "flex-start" }}>
                    <span className="wl-tx-icon" style={{ width: 34, height: 34, fontSize: 14, flexShrink: 0, background: info.color + "22", color: info.color, border: `1px solid ${info.color}30` }}>
                      {TX_CAT_ICON[tx.cat]}
                    </span>
                    <div className="wl-tx-info">
                      <div className="wl-tx-label" style={{ fontSize: 12 }}>{tx.cat} · {tx.coin}</div>
                      <div className="wl-tx-amount" style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{tx.amount} {tx.coin}</div>
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
                  <div key={tx.id} className="wl-tx-row">
                    <span className="wl-tx-icon" style={{ background: info.color + "22", color: info.color, border: `1px solid ${info.color}30` }}>
                      {TX_CAT_ICON[tx.cat]}
                    </span>
                    <div className="wl-tx-info">
                      <div className="wl-tx-label">{tx.cat} · {tx.coin}</div>
                      <div className="wl-tx-amount">{tx.amount} {tx.coin}</div>
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
      </>)}

      {mainTab === "balance" && (<>
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
      </>)}
    </div>
    {showStatement && <AccountStatementModal onClose={() => setShowStatement(false)} />}
  </>);
}

// ═══════════════════════════════════════════════════════════════════
// WalletPage Skeleton
// ═══════════════════════════════════════════════════════════════════
function WalletPageSkeleton() {
  return (
    <>
      {/* Chart section */}
      <div className="wl-chart-section">
        <div className="wl-chart-topbar">
          <div className="wl-sk" style={{ height: 24, width: 110, borderRadius: 6 }} />
          <div className="wl-sk" style={{ height: 24, width: 46, borderRadius: 7 }} />
        </div>
        <div className="wl-sk" style={{ height: 130, borderRadius: 0 }} />
      </div>

      {/* Token table */}
      <div className="wl-section">
        <div className="wl-section-head">
          <div className="wl-sk" style={{ height: 10, width: 55, borderRadius: 4 }} />
          <div className="wl-sk" style={{ height: 10, width: 42, borderRadius: 4 }} />
        </div>
        <div className="wl-table">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 100px", padding: "7px 12px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            {[55, 48, 40].map((w, i) => (
              <div key={i} className="wl-sk" style={{ height: 8, width: w, borderRadius: 4, marginLeft: i > 0 ? "auto" : 0 }} />
            ))}
          </div>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 130px 100px", alignItems: "center", padding: "9px 12px", borderBottom: i < 6 ? "1px solid rgba(255,255,255,.04)" : "none", animationDelay: `${i * 0.06}s` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div className="wl-sk-circle" style={{ width: 28, height: 28, animationDelay: `${i * 0.06}s` }} />
                <div>
                  <div className="wl-sk" style={{ height: 10, width: 32, borderRadius: 4, marginBottom: 5, animationDelay: `${i * 0.06}s` }} />
                  <div className="wl-sk" style={{ height: 8, width: 52, borderRadius: 4, animationDelay: `${i * 0.06 + 0.04}s` }} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                <div className="wl-sk" style={{ height: 10, width: 60, borderRadius: 4, animationDelay: `${i * 0.06}s` }} />
                <div className="wl-sk" style={{ height: 8, width: 24, borderRadius: 4, animationDelay: `${i * 0.06 + 0.04}s` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div className="wl-sk" style={{ height: 10, width: 55, borderRadius: 4, animationDelay: `${i * 0.06}s` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity link */}
      <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
        <div className="wl-sk" style={{ height: 10, width: 120, borderRadius: 4, margin: "0 auto" }} />
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Activity Modal
// ═══════════════════════════════════════════════════════════════════
const TX_CAT_ICON = { deposit: "↓", withdraw: "↑", trade: "⇄" };

function TxSkeleton() {
  const widths = [[55,80],[70,60],[50,90],[65,75],[60,85],[72,65]];
  return (
    <div className="wl-tx-list--loading" style={{height:"100%"}}>
      {widths.map((w, i) => (
        <div key={i} className="wl-tx-skeleton">
          <div className="wl-sk-circle" style={{ animationDelay: `${i * 0.08}s` }} />
          <div className="wl-sk-lines">
            <div className="wl-sk" style={{ height: 10, width: `${w[0]}%`, animationDelay: `${i * 0.08}s` }} />
            <div className="wl-sk" style={{ height: 8, width: `${w[1]}%`, animationDelay: `${i * 0.08 + 0.05}s` }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
            <div className="wl-sk" style={{ height: 10, width: 48, animationDelay: `${i * 0.08}s` }} />
            <div className="wl-sk" style={{ height: 8, width: 32, animationDelay: `${i * 0.08 + 0.04}s` }} />
          </div>
        </div>
      ))}
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
export default function WalletPage() {
  // ── State ──────────────────────────────────────────────────────
  const [rates, setRates]             = useState({ ...BASE_RATES });
  const [period, setPeriod]           = useState("7D");
  const [modal, setModal]             = useState(null);
  const [modalCoin, setModalCoin]     = useState("BTC");
  const [toast, setToast]             = useState(null);
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);
  const [showBigChart, setShowBigChart]     = useState(false);
  const [hideZero, setHideZero]             = useState(true);
  const [assetSearch, setAssetSearch]       = useState("");
  const [assetSort, setAssetSort]           = useState({ col: "value", dir: "desc" });
  // Loading / animation
  const [pageLoading, setPageLoading] = useState(true);
  const [countTotal, setCountTotal]   = useState(0);
  const [countDone, setCountDone]     = useState(false);
  const [barMounted, setBarMounted]   = useState(false);
  const [barExpand, setBarExpand]     = useState(false);
  const [otherHovered, setOtherHovered] = useState(false);
  // Flash
  const [flashKey, setFlashKey]   = useState(0);
  const [flashDir, setFlashDir]   = useState(null);
  const balances = useMemo(() =>
    Object.fromEntries(Object.entries(COINS).map(([t, info]) => [t, info.balance])),
  []);

  // ── Refs ───────────────────────────────────────────────────────
  const prevTotal = useRef(null);
  const countRef  = useRef(null);

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
  const topAssets  = showOther ? sortedAssets.slice(0, 4) : sortedAssets;
  const restAssets = showOther ? sortedAssets.slice(4) : [];
  const otherUsd   = restAssets.reduce((s, a) => s + a.usd, 0);
  const otherPct   = total > 0 ? (otherUsd / total) * 100 : 0;

  // ── Effects ────────────────────────────────────────────────────
  useEffect(injectWalletCSS, []);

  // Page load delay
  useEffect(() => {
    const t = setTimeout(() => setPageLoading(false), 350);
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
    const start  = performance.now();
    const tick = (now) => {
      const p    = Math.min((now - start) / COUNTUP_MS, 1);
      const ease = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
      setCountTotal(total * ease);
      if (p < 1) countRef.current = requestAnimationFrame(tick);
      else { setCountTotal(total); setCountDone(true); }
    };
    countRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(countRef.current);
  }, [pageLoading, total, countDone]);

  // Flash header on rate tick
  useEffect(() => {
    if (prevTotal.current === null) { prevTotal.current = total; return; }
    const dir = total > prevTotal.current ? "up" : "down";
    prevTotal.current = total;
    setFlashDir(dir);
    setFlashKey(k => k + 1);
    const t = setTimeout(() => setFlashDir(null), FLASH_MS + 50);
    return () => clearTimeout(t);
  }, [total]);

  // ── Handlers ───────────────────────────────────────────────────
  const openSend    = (coin) => { setModalCoin(coin); setModal("send"); };
  const openReceive = (coin) => { setModalCoin(coin); setModal("receive"); };

  return (
    <div className="wl-root">
      <NavBar active="wallet" />
      <div className="wl-container">

        {/* Header — always rendered; value counts up from skeleton */}
        <div className="wl-header">
          <div className="wl-total-label">Portfolio value</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ position: "relative" }}>
              <div className="wl-sk" style={{ height: 36, width: 200, borderRadius: 6, position: "absolute", top: 0, left: 0, opacity: pageLoading ? 1 : 0, transition: "opacity 300ms ease", pointerEvents: "none" }} />
              <div
                key={countDone ? flashKey : "counting"}
                className={"wl-total-value" + (flashDir === "up" ? " wl-flash-up" : flashDir === "down" ? " wl-flash-down" : "")}
                style={{ opacity: pageLoading ? 0 : 1, transition: "opacity 200ms ease" }}
              >
                {fmtUSD(countDone ? total : countTotal, true)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end", flexShrink: 0, opacity: pageLoading ? 0 : 1, transition: "opacity 400ms ease" }}>
              <button className="wl-history-inline-btn" onClick={() => openReceive(sortedAssets[0]?.ticker ?? "BTC")}
                style={{ color: COLOR_UP, borderColor: "rgba(74,222,128,.3)", background: "rgba(74,222,128,.08)", marginBottom: 3 }}>↓ Receive</button>
              <div style={{ display: "flex", gap: 4, width: "100%" }}>
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
              <div className="wl-sk" style={{ flex: 1, height: "100%", borderRadius: 3 }} />
            ) : (<>
              {showOther && (
                <div className="wl-breakdown-other"
                  style={{ flex: barExpand ? otherPct : 0, height: "100%", position: "relative", transition: `flex 600ms cubic-bezier(.2,.8,.2,1) 0ms` }}
                  onMouseEnter={() => setOtherHovered(true)} onMouseLeave={() => setOtherHovered(false)}>
                  <div style={{ width: "100%", height: "100%", background: otherHovered ? "rgba(255,255,255,.38)" : "rgba(255,255,255,.2)", transition: "background 150ms" }} />
                </div>
              )}
              {[...topAssets].reverse().map(({ ticker, info, usd }, i) => (
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
            {[...topAssets].reverse().map(({ ticker, info, usd }) => (
              <div key={ticker} className="wl-breakdown-item">
                <div className="wl-breakdown-dot" style={{ background: info.color }} />
                {ticker} {total > 0 ? ((usd / total) * 100).toFixed(1) : 0}%
              </div>
            ))}
          </div>
        </div>

        {pageLoading ? <WalletPageSkeleton /> : <>

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
              onToggle={() => setShowBigChart(true)} />
          </div>
        </div>

        {/* Token list */}
        <div className="wl-section">
          <div className="wl-section-head">
            <span className="wl-section-title">Assets</span>
            <span className="wl-section-sub">
              ({Object.entries(COINS).filter(([t]) => !hideZero || balances[t] > 0).filter(([t, info]) => !assetSearch || t.toLowerCase().includes(assetSearch.toLowerCase()) || info.name.toLowerCase().includes(assetSearch.toLowerCase())).length})
            </span>
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
            {Object.entries(COINS)
              .filter(([ticker]) => !hideZero || balances[ticker] > 0)
              .filter(([ticker, info]) => !assetSearch ||
                ticker.toLowerCase().includes(assetSearch.toLowerCase()) ||
                info.name.toLowerCase().includes(assetSearch.toLowerCase()))
              .sort(([aT, aI], [bT, bI]) => {
                const dir = assetSort.dir === "asc" ? 1 : -1;
                if (assetSort.col === "name")    return dir * aT.localeCompare(bT);
                if (assetSort.col === "balance") return dir * (balances[aT] - balances[bT]);
                if (assetSort.col === "hold")    return dir * (aI.hold - bI.hold);
                return dir * (balances[aT] * getUSDRate(rates, aT) - balances[bT] * getUSDRate(rates, bT));
              })
              .map(([ticker, info]) => {
                const rate = getUSDRate(rates, ticker);
                const usd = balances[ticker] * rate;
                const isZero = balances[ticker] === 0;
                return (
                  <div key={ticker} className={"wl-token-row" + (isZero ? " wl-token-row--zero" : "")}
                    onClick={() => { setModalCoin(ticker); setModal(isZero ? "receive" : "coin"); }}>
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
                        ? <button className="wl-deposit-cta" onClick={e => { e.stopPropagation(); setModalCoin(ticker); setModal("receive"); }}>+ Deposit</button>
                        : fmtUSD(usd, true)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        </>}
      </div>

      {showBigChart && (
        <EnlargedChartModal onClose={() => setShowBigChart(false)} total={total} defaultPeriod="3M" />
      )}
      {modal && (
        <div className="wl-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          {modal === "coin" && (
            <CoinDetailModal coin={modalCoin} rates={rates} onClose={() => setModal(null)}
              onSend={() => setModal("send")} onReceive={() => setModal("receive")} balances={balances} />
          )}
          {modal === "activity" && <WalletHistoryModal onClose={() => setModal(null)} rates={rates} balances={balances} />}
          {modal === "send" && (
            <SendModal onClose={() => setModal(null)} rates={rates} initialCoin={modalCoin}
              onSent={(coin, amt) => setToast(`Sent ${amt} ${coin}`)} balances={balances} />
          )}
          {modal === "receive" && <ReceiveModal onClose={() => setModal(null)} initialCoin={modalCoin} />}

        </div>
      )}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
