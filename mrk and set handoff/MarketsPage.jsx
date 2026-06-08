import React, { useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════
// Data Constants
// ═══════════════════════════════════════════════════════════════════
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

const MOCK_CHANGES = {
  BTC: 2.34, ETH: -1.12, USDT: 0.01, SOL: 5.67, BNB: -0.88, XRP: 3.21, USDC: 0.00,
  ADA: -2.15, DOGE: 4.32, AVAX: -3.87, POL: 1.94, HYPE: 6.81,
};

const MOCK_7D_CHANGE = {
  BTC: 5.21, ETH: -2.34, USDT: 0.02, SOL: 12.45, BNB: 1.87,
  XRP: 8.93, USDC: 0.01, ADA: -3.21, DOGE: 7.82, AVAX: -5.43, POL: 3.14, HYPE: 14.22,
};

const MOCK_SUPPLY = {
  BTC:  19_700_000,
  ETH:  120_000_000,
  USDT: 100_000_000_000,
  SOL:  460_000_000,
  BNB:  150_000_000,
  XRP:  57_000_000_000,
  USDC: 35_000_000_000,
  ADA:  35_000_000_000,
  DOGE: 145_000_000_000,
  AVAX: 410_000_000,
  POL:  9_300_000_000,
  HYPE: 333_000_000,
};

const MOCK_VOLUME = {
  BTC:  30_000_000_000,
  ETH:  15_000_000_000,
  USDT: 80_000_000_000,
  SOL:  3_000_000_000,
  BNB:  1_500_000_000,
  XRP:  2_000_000_000,
  USDC: 8_000_000_000,
  ADA:  500_000_000,
  DOGE: 1_200_000_000,
  AVAX: 400_000_000,
  POL:  350_000_000,
  HYPE: 280_000_000,
};

const MOCK_ATH = {
  BTC: 73737, ETH: 4891, USDT: 1.32, SOL: 260, BNB: 717,
  XRP: 3.84, USDC: 1.17, ADA: 3.10, DOGE: 0.74, AVAX: 146, POL: 2.92, HYPE: 38.50,
};

const MOCK_PRICES_STATIC = {
  ADA: 0.4521, DOGE: 0.1234, AVAX: 35.42, POL: 0.5831, HYPE: 22.14,
};

const COIN_RANKS = ["BTC","ETH","USDT","SOL","BNB","XRP","USDC","ADA","DOGE","AVAX","POL","HYPE"];


const COLOR_UP   = "#4ade80";
const COLOR_DOWN = "#f87171";

// ═══════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════
function getUSDRate(rates, ticker) {
  if (ticker === "USDT") return 1;
  if (ticker === "USDC") return rates["USDC/USDT"] || 1;
  return rates[`${ticker}/USDT`] || 0;
}

function getMkPrice(rates, ticker) {
  const live = getUSDRate(rates, ticker);
  return live > 0 ? live : (MOCK_PRICES_STATIC[ticker] || 0);
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
  if (n >= 1)    return "$" + n.toFixed(4);
  return "$" + n.toFixed(6);
}

function fmtSupply(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(2) + "K";
  return String(n);
}

function genChartData(endVal, points, volatility) {
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
const MK_CSS_ID = "mk-styles";

const MK_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#121218;font-family:'JetBrains Mono',ui-monospace,monospace;color:rgba(255,255,255,.92);min-height:100vh}

.mk-nav{position:fixed;top:0;left:0;right:0;height:44px;background:#0e0e15;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;padding:0 20px;gap:16px;z-index:200}
.mk-nav-logo{font-size:15px;font-weight:700;color:rgba(255,255,255,.92);letter-spacing:.05em;margin-right:8px}
.mk-nav-tab{text-decoration:none;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;color:rgba(255,255,255,.35);transition:all 150ms;letter-spacing:.03em}
.mk-nav-tab:hover{color:rgba(255,255,255,.65)}
.mk-nav-tab--active{color:rgba(255,255,255,.92);border-bottom:2px solid rgba(255,255,255,.8);border-radius:0;padding-bottom:2px}

.mk-root{padding-top:44px;min-height:100vh}
.mk-container{max-width:1100px;margin:0 auto;padding:24px 20px 60px}

.mk-page-header{margin-bottom:20px}
.mk-page-title{font-size:24px;font-weight:700;letter-spacing:-.5px;color:rgba(255,255,255,.95);margin-bottom:4px}
.mk-page-sub{font-size:12px;color:rgba(255,255,255,.3);letter-spacing:.03em}

.mk-summary-bar{display:flex;margin-bottom:20px;background:#131119;border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden}
.mk-summary-item{flex:1;padding:14px 20px;border-right:1px solid rgba(255,255,255,.06)}
.mk-summary-item:last-child{border-right:none}
.mk-summary-label{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:5px}
.mk-summary-value{font-size:18px;font-weight:700;color:rgba(255,255,255,.92);font-variant-numeric:tabular-nums;letter-spacing:-.3px}
.mk-summary-sub{font-size:10px;color:rgba(255,255,255,.3);margin-top:2px}

.mk-filter-row{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.mk-filter-title{font-size:16px;font-weight:700;color:rgba(255,255,255,.88);letter-spacing:-.2px;white-space:nowrap}
.mk-filter-spacer{flex:1}
.mk-search-wrap{position:relative;flex:none;width:93px}
.mk-search-icon{position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:12px;color:rgba(255,255,255,.28);pointer-events:none;line-height:1}
.mk-search-input{width:100%;height:34px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:0 10px 0 26px;font-family:inherit;font-size:12px;color:rgba(255,255,255,.88);outline:none;letter-spacing:.02em}
.mk-search-input::placeholder{color:rgba(255,255,255,.2)}
.mk-search-input:focus{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.07)}
.mk-pills{display:flex;gap:6px;flex-wrap:wrap}
.mk-pill{font-size:11px;font-weight:600;font-family:inherit;padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);cursor:pointer;transition:all 140ms;letter-spacing:.03em}
.mk-pill:hover{color:rgba(255,255,255,.72);border-color:rgba(255,255,255,.22)}
.mk-pill--active{background:rgba(255,255,255,.1);color:rgba(255,255,255,.9);border-color:rgba(255,255,255,.25)}

.mk-table-wrap{background:#131119;border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden}
.mk-table-head{display:grid;grid-template-columns:2fr 1.2fr 0.8fr 0.8fr 1.2fr 1.2fr 110px 80px;padding:0 16px;height:38px;align-items:center;border-bottom:1px solid rgba(255,255,255,.06)}
.mk-th{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.25)}
.mk-th--right{text-align:right}
.mk-th--center{text-align:center}
.mk-row{display:grid;grid-template-columns:2fr 1.2fr 0.8fr 0.8fr 1.2fr 1.2fr 110px 80px;padding:0 16px;height:56px;align-items:center;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;transition:background 120ms}
.mk-row:last-child{border-bottom:none}
.mk-row:hover{background:rgba(255,255,255,.03)}

.mk-rank{font-size:11px;color:rgba(255,255,255,.22);font-weight:600}
.mk-star-btn{background:none;border:0;cursor:pointer;font-size:15px;padding:0;line-height:1;color:rgba(255,255,255,.18);transition:color 140ms,transform 140ms;display:flex;align-items:center}
.mk-star-btn:hover{color:rgba(255,200,60,.7);transform:scale(1.2)}
.mk-star-btn--on{color:#f5c518}
.mk-star-btn--on:hover{color:#ffd740;transform:scale(1.15)}
.mk-coin-cell{display:flex;align-items:center;gap:10px}
.mk-coin-icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0}
.mk-coin-name{font-size:13px;font-weight:600;color:rgba(255,255,255,.88);letter-spacing:.01em}
.mk-coin-ticker{font-size:10px;color:rgba(255,255,255,.3);font-weight:500;letter-spacing:.05em;margin-top:1px}
.mk-cell-right{text-align:right;font-variant-numeric:tabular-nums}
.mk-price{font-size:13px;font-weight:600;color:rgba(255,255,255,.88);padding:4px 6px;border-radius:5px;transition:background 80ms}
.mk-cap{font-size:12px;color:rgba(255,255,255,.55)}
.mk-vol{font-size:12px;color:rgba(255,255,255,.45)}

.mk-change{display:inline-flex;align-items:center;justify-content:flex-end;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
.mk-change--up{color:${COLOR_UP}}
.mk-change--down{color:${COLOR_DOWN}}
.mk-change--flat{color:rgba(255,255,255,.3)}

@keyframes mkFlashUp{0%{background:rgba(74,222,128,.22)}100%{background:transparent}}
@keyframes mkFlashDown{0%{background:rgba(248,113,113,.22)}100%{background:transparent}}
.mk-flash-up{animation:mkFlashUp 550ms ease forwards}
.mk-flash-down{animation:mkFlashDown 550ms ease forwards}

.mk-trade-btn{font-size:11px;font-weight:600;font-family:inherit;padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:rgba(255,255,255,.65);cursor:pointer;transition:all 140ms;letter-spacing:.03em;white-space:nowrap}
.mk-trade-btn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.28);color:rgba(255,255,255,.9)}

.mk-chart-cell{display:flex;align-items:center;justify-content:center}

.mk-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px;animation:mkFadeIn 150ms ease}
@keyframes mkFadeIn{from{opacity:0}to{opacity:1}}
.mk-modal{background:#1a1a26;border:1px solid rgba(255,255,255,.1);border-radius:18px;width:100%;max-width:420px;padding:24px;position:relative;animation:mkSlideUp 180ms cubic-bezier(.2,.9,.2,1)}
@keyframes mkSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.mk-modal-close{margin-left:auto;flex-shrink:0;background:rgba(255,255,255,.07);border:0;color:rgba(255,255,255,.45);font-size:14px;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 140ms;font-family:inherit}
.mk-modal-close:hover{background:rgba(255,255,255,.13);color:rgba(255,255,255,.8)}
.mk-modal-coin-head{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.mk-modal-icon{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0}
.mk-modal-coin-text{min-width:0}
.mk-modal-coin-name{font-size:16px;font-weight:700;color:rgba(255,255,255,.95);margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
.mk-modal-coin-ticker{font-size:10px;color:rgba(255,255,255,.35);font-weight:500;letter-spacing:.06em}
.mk-modal-sparkline{flex-shrink:0}
.mk-modal-price-row{display:flex;align-items:baseline;gap:10px;margin-bottom:18px;flex-wrap:wrap}
.mk-modal-price{font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.5px;color:rgba(255,255,255,.95)}
.mk-modal-badge{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:6px}
.mk-modal-badge--up{color:${COLOR_UP};background:rgba(74,222,128,.1)}
.mk-modal-badge--down{color:${COLOR_DOWN};background:rgba(248,113,113,.1)}
.mk-modal-badge--flat{color:rgba(255,255,255,.3);background:rgba(255,255,255,.06)}
.mk-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.mk-stat-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px}
.mk-stat-label{font-size:9px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:5px}
.mk-stat-value{font-size:14px;font-weight:600;color:rgba(255,255,255,.82);font-variant-numeric:tabular-nums}
.mk-modal-actions{display:flex;gap:10px}
.mk-modal-btn{flex:1;height:40px;border-radius:10px;border:0;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all 140ms;letter-spacing:.03em}
.mk-modal-btn--primary{background:rgba(255,255,255,.12);color:rgba(255,255,255,.9)}
.mk-modal-btn--primary:hover{background:rgba(255,255,255,.2)}
.mk-modal-btn--secondary{background:rgba(255,255,255,.05);color:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.09)}
.mk-modal-btn--secondary:hover{background:rgba(255,255,255,.1);color:rgba(255,255,255,.82)}

.mk-empty{padding:40px;text-align:center;color:rgba(255,255,255,.25);font-size:13px}

/* Expanded card */
@keyframes mkExpCardIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.mk-exp-card{background:#1a1a28;border:1px solid rgba(255,255,255,.13);border-radius:18px;padding:24px 26px 22px;margin:2px 0 6px;animation:mkExpCardIn 200ms cubic-bezier(.2,.9,.2,1)}
.mk-exp-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px}
.mk-exp-coin{display:flex;align-items:center;gap:14px}
.mk-exp-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;flex-shrink:0}
.mk-exp-coin-name{font-size:18px;font-weight:700;color:rgba(255,255,255,.92);margin-bottom:2px}
.mk-exp-ticker{font-size:11px;color:rgba(255,255,255,.3);letter-spacing:.07em}
.mk-exp-close{background:rgba(255,255,255,.07);border:0;color:rgba(255,255,255,.45);font-size:14px;width:30px;height:30px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 140ms;font-family:inherit;flex-shrink:0}
.mk-exp-close:hover{background:rgba(255,255,255,.14);color:rgba(255,255,255,.85)}
.mk-exp-price{font-size:38px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-1px;color:rgba(255,255,255,.96);line-height:1;margin-bottom:8px;margin-top:14px}
.mk-exp-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:6px;margin-bottom:20px}
.mk-exp-badge--up{color:#4ade80;background:rgba(74,222,128,.12)}
.mk-exp-badge--down{color:#f87171;background:rgba(248,113,113,.12)}
.mk-exp-badge--flat{color:rgba(255,255,255,.3);background:rgba(255,255,255,.06)}
.mk-exp-periods{display:flex;gap:3px;margin-bottom:10px}
.mk-exp-period-btn{font-size:11px;font-weight:600;font-family:inherit;padding:4px 10px;border-radius:7px;border:0;background:transparent;color:rgba(255,255,255,.3);cursor:pointer;transition:all 120ms;letter-spacing:.04em}
.mk-exp-period-btn:hover{color:rgba(255,255,255,.65)}
.mk-exp-period-btn--active{background:rgba(255,255,255,.1);color:rgba(255,255,255,.88)}
.mk-exp-chart-wrap{position:relative;margin:0 -4px 18px;border-radius:10px;overflow:hidden}
.mk-exp-canvas{display:block;width:100%;height:290px;cursor:crosshair}
.mk-exp-hover-box{position:absolute;top:8px;right:10px;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.88);pointer-events:none;display:flex;align-items:center;gap:8px}
.mk-card--active{border-color:rgba(255,255,255,.38) !important;background:#1c1c2c !important;box-shadow:0 0 0 1px rgba(255,255,255,.13)}
.mk-exp-hover-pct{font-size:11px;font-weight:600;padding:2px 7px;border-radius:5px}
.mk-exp-hover-pct--up{color:#4ade80;background:rgba(74,222,128,.14)}
.mk-exp-hover-pct--down{color:#f87171;background:rgba(248,113,113,.14)}
.mk-exp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
.mk-exp-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px}
.mk-exp-stat-label{font-size:9px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.22);margin-bottom:4px}
.mk-exp-stat-val{font-size:14px;font-weight:600;color:rgba(255,255,255,.78);font-variant-numeric:tabular-nums}
.mk-exp-footer{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
.mk-exp-buy-btn{height:28px;padding:0 12px;border-radius:7px;border:0;font-family:inherit;font-size:11px;font-weight:600;background:rgba(255,255,255,.12);color:rgba(255,255,255,.9);cursor:pointer;transition:all 140ms;letter-spacing:.03em;white-space:nowrap}
.mk-exp-buy-btn:hover{background:rgba(255,255,255,.2)}
.mk-exp-wallet-btn{height:28px;padding:0 12px;border-radius:7px;border:1px solid rgba(255,255,255,.1);font-family:inherit;font-size:11px;font-weight:600;background:transparent;color:rgba(255,255,255,.45);cursor:pointer;transition:all 140ms;letter-spacing:.03em;white-space:nowrap}
.mk-exp-wallet-btn:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.82)}
@media(max-width:700px){.mk-exp-stats{grid-template-columns:repeat(2,1fr)}}

/* View toggle */
.mk-view-toggle{display:flex;gap:2px;background:rgba(255,255,255,.05);border-radius:8px;padding:3px}
.mk-view-btn{width:32px;height:28px;border:0;border-radius:6px;background:transparent;color:rgba(255,255,255,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;transition:all 130ms;font-family:inherit}
.mk-view-btn:hover{color:rgba(255,255,255,.7)}
.mk-view-btn--active{background:rgba(255,255,255,.12);color:rgba(255,255,255,.92)}

/* Cards grid */
.mk-cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.mk-card{background:#131119;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:20px 18px 16px;cursor:pointer;transition:border-color 150ms,background 150ms}
.mk-card:hover{background:#1a1a26;border-color:rgba(255,255,255,.16)}
.mk-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:8px}
.mk-card-coin{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.mk-card-icon-wrap{position:relative;flex-shrink:0}
.mk-card-icon{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700}
.mk-card-icon-star{position:absolute;top:-5px;left:-5px;width:22px;height:22px;border-radius:50%;background:#1a1a26;border:1px solid rgba(255,255,255,.14);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;padding:0;color:rgba(255,255,255,.3);transition:color 140ms,transform 140ms}
.mk-card-icon-star:hover{color:rgba(255,200,60,.8);transform:scale(1.15)}
.mk-card-icon-star--on{color:#f5c518}
.mk-card-icon-star--on:hover{color:#ffd740}
.mk-row .mk-card-icon-star{width:15px;height:15px;font-size:9px;top:-3px;left:-3px}
.mk-card-coin-text{min-width:0}
.mk-card-name{font-size:13px;font-weight:600;color:rgba(255,255,255,.82);letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px}
.mk-card-ticker{font-size:10px;color:rgba(255,255,255,.28);font-weight:500;letter-spacing:.07em;margin-top:2px}
.mk-card-head-right{display:flex;align-items:center;gap:6px;flex-shrink:0}
.mk-card-price-row{display:flex;align-items:baseline;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.mk-card-price{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.8px;line-height:1}
.mk-card-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px}
.mk-card-badge--up{color:#4ade80;background:rgba(74,222,128,.12)}
.mk-card-badge--down{color:#f87171;background:rgba(248,113,113,.12)}
.mk-card-badge--flat{color:rgba(255,255,255,.3);background:rgba(255,255,255,.06)}
.mk-card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:4px}
.mk-card-cap-label{font-size:9px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:3px}
.mk-card-cap-val{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);font-variant-numeric:tabular-nums}
.mk-card-buy-btn{font-size:12px;font-weight:600;font-family:inherit;padding:8px 14px;border-radius:10px;border:0;background:rgba(255,255,255,.1);color:rgba(255,255,255,.82);cursor:pointer;transition:all 140ms;letter-spacing:.03em;display:flex;align-items:center;gap:4px}
.mk-card-buy-btn:hover{background:rgba(255,255,255,.18);color:#fff}
.mk-card-buy-arrow{font-size:14px;opacity:.7}
@keyframes mkCardFlashUp{0%,20%{color:#86efac}100%{color:#4ade80}}
@keyframes mkCardFlashDown{0%,20%{color:#fca5a5}100%{color:#f87171}}
.mk-card-flash-up{animation:mkCardFlashUp 550ms ease}
.mk-card-flash-down{animation:mkCardFlashDown 550ms ease}
.mk-price-up{color:#4ade80}
.mk-price-down{color:#f87171}
.mk-price-neutral{color:rgba(255,255,255,.88)}

@keyframes mkCardExpand{from{transform:scaleY(0.72) scaleX(0.96);opacity:0;transform-origin:top center}50%{opacity:0.85}to{transform:scaleY(1) scaleX(1);opacity:1}}
@keyframes mkCardCollapse{from{transform:scaleY(1) scaleX(1);opacity:1}to{transform:scaleY(0.72) scaleX(0.96);opacity:0}}
.mk-card--expanded{grid-column:1/-1;cursor:default;animation:mkCardExpand 420ms cubic-bezier(.16,.9,.3,1);transform-origin:top center;border-color:rgba(255,255,255,.18) !important;background:#1a1a26 !important}
.mk-card--expanded:hover{background:#1a1a26 !important;border-color:rgba(255,255,255,.18) !important}
.mk-card--closing{grid-column:1/-1;cursor:default;pointer-events:none;animation:mkCardCollapse 280ms cubic-bezier(.4,0,.55,1) forwards;transform-origin:top center;border-color:rgba(255,255,255,.18) !important;background:#1a1a26 !important}
.mk-card-close-btn{background:rgba(255,255,255,.07);border:0;color:rgba(255,255,255,.45);font-size:14px;width:30px;height:30px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 140ms;font-family:inherit;flex-shrink:0}
.mk-card-close-btn:hover{background:rgba(255,255,255,.14);color:rgba(255,255,255,.85)}
.mk-card-expanded-price{font-size:34px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-1px;line-height:1}

@media(max-width:700px){
  .mk-col-7d,.mk-col-vol{display:none}
  .mk-table-head,.mk-row{grid-template-columns:2fr 1.2fr 0.8fr 1.2fr 110px 80px}
}
`;

function injectMarketsCSS() {
  if (document.getElementById(MK_CSS_ID)) return;
  const el = document.createElement("style");
  el.id = MK_CSS_ID;
  el.textContent = MK_STYLE;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════════
// MiniSparkline
// ═══════════════════════════════════════════════════════════════════
function MiniSparkline({ points, isUp, fullWidth = false, h = 36 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !points || points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const W = fullWidth ? (canvas.clientWidth || 100) : 100, H = h;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const pad = 4;
    const toY = v => H - pad - ((v - min) / range) * (H - pad * 2);
    const toX = i => (i / (points.length - 1)) * W;

    const color = isUp ? COLOR_UP : COLOR_DOWN;

    // Filled area
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(points[0]));
    for (let i = 1; i < points.length; i++) {
      const cpx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpx, toY(points[i - 1]), cpx, toY(points[i]), toX(i), toY(points[i]));
    }
    ctx.lineTo(toX(points.length - 1), H);
    ctx.lineTo(toX(0), H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, isUp ? "rgba(74,222,128,.22)" : "rgba(248,113,113,.22)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(points[0]));
    for (let i = 1; i < points.length; i++) {
      const cpx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpx, toY(points[i - 1]), cpx, toY(points[i]), toX(i), toY(points[i]));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [points]); // redraw when points data changes

  return <canvas ref={ref} style={{ display: "block", width: fullWidth ? "100%" : "100px", height: `${h}px` }} />;
}

// ═══════════════════════════════════════════════════════════════════
// NavBar
// ═══════════════════════════════════════════════════════════════════
function NavBar({ active }) {
  return (
    <nav className="mk-nav">
      <span className="mk-nav-logo">HX</span>
      <a href="index.html"   className={"mk-nav-tab" + (active === "convert"  ? " mk-nav-tab--active" : "")}>Convert</a>
      <a href="markets.html" className={"mk-nav-tab" + (active === "markets"  ? " mk-nav-tab--active" : "")}>Markets</a>
      <a href="wallet.html"  className={"mk-nav-tab" + (active === "wallet"   ? " mk-nav-tab--active" : "")}>Wallet</a>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SummaryBar
// ═══════════════════════════════════════════════════════════════════
function SummaryBar({ rates }) {
  const totalCap = COIN_RANKS.reduce((sum, t) => sum + getMkPrice(rates, t) * MOCK_SUPPLY[t], 0);
  const totalVol = COIN_RANKS.reduce((sum, t) => sum + MOCK_VOLUME[t], 0);
  const btcDom   = totalCap > 0
    ? ((getMkPrice(rates, "BTC") * MOCK_SUPPLY["BTC"] / totalCap) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="mk-summary-bar">
      <div className="mk-summary-item">
        <div className="mk-summary-label">Total Market Cap</div>
        <div className="mk-summary-value">{fmtUSD(totalCap, true)}</div>
        <div className="mk-summary-sub">All 11 assets</div>
      </div>
      <div className="mk-summary-item">
        <div className="mk-summary-label">24h Volume</div>
        <div className="mk-summary-value">{fmtUSD(totalVol, true)}</div>
        <div className="mk-summary-sub">Across all pairs</div>
      </div>
      <div className="mk-summary-item">
        <div className="mk-summary-label">BTC Dominance</div>
        <div className="mk-summary-value">{btcDom}%</div>
        <div className="mk-summary-sub">By market cap</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FilterRow
// ═══════════════════════════════════════════════════════════════════
function FilterRow({ search, setSearch, filter, setFilter, view, setView, favorites }) {
  const pills = [
    { id: "all",         label: "All"         },
    { id: "favorites",   label: "★ Favorites" },
    { id: "gainers",     label: "Top Gainers" },
    { id: "losers",      label: "Top Losers"  },
    { id: "volume",      label: "Volume"      },
  ];
  return (
    <div className="mk-filter-row">
      <span className="mk-filter-title">Top 10</span>
      <div className="mk-pills">
        {pills.map(p => (
          <button
            key={p.id}
            className={"mk-pill" + (filter === p.id ? " mk-pill--active" : "")}
            onClick={() => setFilter(p.id)}
          >
            {p.label}
            {p.id === "favorites" && favorites.length > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, opacity: .65 }}>{favorites.length}</span>
            )}
          </button>
        ))}
      </div>
      <div className="mk-filter-spacer" />
      <div className="mk-search-wrap">
        <span className="mk-search-icon">🔍</span>
        <input
          className="mk-search-input"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="mk-view-toggle">
        <button className={"mk-view-btn" + (view === "table" ? " mk-view-btn--active" : "")} onClick={() => setView("table")} title="Table view">☰</button>
        <button className={"mk-view-btn" + (view === "cards" ? " mk-view-btn--active" : "")} onClick={() => setView("cards")} title="Cards view">⊞</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ChangeCell
// ═══════════════════════════════════════════════════════════════════
function ChangeCell({ pct }) {
  const cls    = pct > 0 ? "mk-change--up" : pct < 0 ? "mk-change--down" : "mk-change--flat";
  const prefix = pct > 0 ? "+" : "";
  return <span className={"mk-change " + cls}>{prefix}{pct.toFixed(2)}%</span>;
}

// ═══════════════════════════════════════════════════════════════════
// MarketRow
// ═══════════════════════════════════════════════════════════════════
const MarketRow = React.memo(function MarketRow({ ticker, rates, flash, sparkData, onRowClick, onTrade, isFav, onStar }) {
  const info     = COINS[ticker];
  const price    = getMkPrice(rates, ticker);
  const change24 = MOCK_CHANGES[ticker]   ?? 0;
  const change7d = MOCK_7D_CHANGE[ticker] ?? 0;
  const marketCap = price * MOCK_SUPPLY[ticker];
  const volume    = MOCK_VOLUME[ticker];
  const isUp7d    = change7d >= 0;

  const priceCls = "mk-price mk-cell-right" +
    (flash === "up" ? " mk-flash-up" : flash === "down" ? " mk-flash-down" : "");

  return (
    <div className="mk-row" onClick={() => onRowClick(ticker)}>
      <div className="mk-coin-cell">
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div className="mk-coin-icon" style={{ background: info.color + "22", color: info.color }}>
            {info.icon}
          </div>
          <button
            className={"mk-card-icon-star" + (isFav ? " mk-card-icon-star--on" : "")}
            onClick={e => onStar(ticker, e)}
          >{isFav ? "★" : "☆"}</button>
        </div>
        <div>
          <div className="mk-coin-name">{info.name}</div>
          <div className="mk-coin-ticker">{ticker}</div>
        </div>
      </div>
      <div className={priceCls}>{fmtPrice(price)}</div>
      <div className="mk-cell-right"><ChangeCell pct={change24} /></div>
      <div className="mk-cell-right mk-col-7d"><ChangeCell pct={change7d} /></div>
      <div className="mk-cap mk-cell-right">{fmtUSD(marketCap, true)}</div>
      <div className="mk-vol mk-cell-right mk-col-vol">{fmtUSD(volume, true)}</div>
      <div className="mk-chart-cell">
        {sparkData[ticker] && <MiniSparkline points={sparkData[ticker]} isUp={isUp7d} />}
      </div>
      <div className="mk-cell-right">
        <button
          className="mk-trade-btn"
          onClick={e => { e.stopPropagation(); onTrade(ticker); }}
        >Buy</button>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// CardSparkline — full-width, taller chart for card view
// ═══════════════════════════════════════════════════════════════════
function CardSparkline({ points, isUp }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !points || points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 230;
    const H = 82;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const pad = 4;
    const toY = v => H - pad - ((v - min) / range) * (H - pad * 2);
    const toX = i => (i / (points.length - 1)) * W;
    const color = isUp ? COLOR_UP : COLOR_DOWN;

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(points[0]));
    for (let i = 1; i < points.length; i++) {
      const cpx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpx, toY(points[i - 1]), cpx, toY(points[i]), toX(i), toY(points[i]));
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, isUp ? "rgba(74,222,128,.28)" : "rgba(248,113,113,.28)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(points[0]));
    for (let i = 1; i < points.length; i++) {
      const cpx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpx, toY(points[i - 1]), cpx, toY(points[i]), toX(i), toY(points[i]));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  return <canvas ref={ref} style={{ display: "block", width: "100%", height: "82px" }} />;
}

// ═══════════════════════════════════════════════════════════════════
// CoinCard
// ═══════════════════════════════════════════════════════════════════
const CoinCard = React.memo(function CoinCard({ ticker, rates, flash, sparkData, onCardClick, onTrade, isExpanded, isClosing, onCloseAnimEnd, isFav, onStar }) {
  const info      = COINS[ticker];
  const price     = getMkPrice(rates, ticker);
  const change24  = MOCK_CHANGES[ticker]   ?? 0;
  const change7d  = MOCK_7D_CHANGE[ticker] ?? 0;
  const marketCap = price * MOCK_SUPPLY[ticker];
  const isUp7d    = change7d >= 0;

  const badgeCls      = change24 > 0 ? "mk-card-badge--up" : change24 < 0 ? "mk-card-badge--down" : "mk-card-badge--flat";
  const prefix        = change24 > 0 ? "+" : "";
  const priceColorCls = change24 > 0 ? " mk-price-up" : change24 < 0 ? " mk-price-down" : " mk-price-neutral";
  const priceCls      = "mk-card-price" + priceColorCls + (flash === "up" ? " mk-card-flash-up" : flash === "down" ? " mk-card-flash-down" : "");

  // Snapshot price once for chart baseline — never updated
  const initPriceRef = useRef(price);

  const cardRef = useRef(null);
  useEffect(() => {
    if (isExpanded && cardRef.current) {
      setTimeout(() => cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" }), 40);
    }
  }, [isExpanded]);

  return (
    <div
      ref={cardRef}
      className={"mk-card" + (isExpanded ? " mk-card--expanded" : "") + (isClosing ? " mk-card--closing" : "")}
      onClick={!isExpanded && !isClosing ? () => onCardClick(ticker) : undefined}
      onAnimationEnd={isClosing ? onCloseAnimEnd : undefined}
    >
      {/* Header — always visible */}
      <div className="mk-card-head">
        <div className="mk-card-coin">
          <div className="mk-card-icon-wrap">
            <div className="mk-card-icon" style={{ background: info.color + "22", color: info.color }}>
              {info.icon}
            </div>
            <button
              className={"mk-card-icon-star" + (isFav ? " mk-card-icon-star--on" : "")}
              onClick={e => onStar(ticker, e)}
            >{isFav ? "★" : "☆"}</button>
          </div>
          <div className="mk-card-coin-text">
            <div className="mk-card-name" title={info.name}>{info.name}</div>
            <div className="mk-card-ticker">{ticker}</div>
          </div>
        </div>
        <div className="mk-card-head-right">
          {!isExpanded && sparkData[ticker] && <MiniSparkline points={sparkData[ticker]} isUp={isUp7d} />}
          {isExpanded && (
            <button className="mk-card-close-btn" onClick={e => { e.stopPropagation(); onCardClick(ticker); }}>✕</button>
          )}
        </div>
      </div>

      {/* Price row — always visible */}
      <div className="mk-card-price-row">
        {isExpanded
          ? <div className={"mk-card-expanded-price" + priceColorCls}>{fmtPrice(price)}</div>
          : <div className={priceCls}>{fmtPrice(price)}</div>
        }
        <span className={"mk-card-badge " + badgeCls}>{prefix}{change24.toFixed(2)}% <span style={{opacity:.6,fontSize:9,marginLeft:2}}>24h</span></span>
      </div>

      {isExpanded ? (
        /* Expanded: interactive chart + stats + action buttons */
        <>
          <ExpandedCardChart ticker={ticker} initPrice={initPriceRef.current} />
          <div className="mk-exp-stats">
            <div className="mk-exp-stat">
              <div className="mk-exp-stat-label">Market Cap</div>
              <div className="mk-exp-stat-val">{fmtUSD(marketCap, true)}</div>
            </div>
            <div className="mk-exp-stat">
              <div className="mk-exp-stat-label">Volume 24h</div>
              <div className="mk-exp-stat-val">{fmtUSD(MOCK_VOLUME[ticker], true)}</div>
            </div>
            <div className="mk-exp-stat">
              <div className="mk-exp-stat-label">7d Change</div>
              <div className="mk-exp-stat-val" style={{ color: change7d >= 0 ? COLOR_UP : COLOR_DOWN }}>
                {change7d >= 0 ? "+" : ""}{change7d}%
              </div>
            </div>
            <div className="mk-exp-stat">
              <div className="mk-exp-stat-label">All-Time High</div>
              <div className="mk-exp-stat-val">{fmtPrice(MOCK_ATH[ticker])}</div>
            </div>
          </div>
          <div className="mk-exp-footer">
            <button className="mk-exp-buy-btn" onClick={() => onTrade(ticker)}>Buy ›</button>
            <button className="mk-exp-wallet-btn" onClick={() => { localStorage.setItem("hx_wallet_coin", ticker); window.location.href = "wallet.html"; }}>Wallet Actions</button>
          </div>
        </>
      ) : (
        /* Compact: market cap + buy button */
        <div className="mk-card-footer">
          <div>
            <div className="mk-card-cap-label">Mkt Cap</div>
            <div className="mk-card-cap-val">{fmtUSD(marketCap, true)}</div>
          </div>
          <button
            className="mk-card-buy-btn"
            onClick={e => { e.stopPropagation(); onTrade(ticker); }}
          >Buy <span className="mk-card-buy-arrow">›</span></button>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// CardsView
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// ExpandedCardChart — interactive canvas with hover crosshair
// ═══════════════════════════════════════════════════════════════════
function ExpandedCardChart({ ticker, initPrice }) {
  const [period, setPeriod] = useState("7D");
  const [hoverInfo, setHoverInfo] = useState(null);
  const canvasRef = useRef(null);
  const dataRef   = useRef({});
  const hoverRef  = useRef(null);

  // Build chart data for all periods once on mount
  useEffect(() => {
    dataRef.current = {
      "1D": genChartData(initPrice, 60,  0.007),
      "7D": genChartData(initPrice, 80,  0.018),
      "1M": genChartData(initPrice, 80,  0.042),
      "3M": genChartData(initPrice, 80,  0.085),
    };
    redraw(period, null);
  }, []);

  const redraw = (p, hIdx) => {
    const canvas = canvasRef.current;
    const data   = dataRef.current[p];
    if (!canvas || !data || !data.length) return;
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth || 700;
    const H   = 240;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const padT = 24, padB = 24, padL = 66;
    const toY = v => H - padB - ((v - min) / range) * (H - padT - padB);
    const toX = i => padL + (i / (data.length - 1)) * (W - padL);
    const isUp = data[data.length - 1] >= data[0];
    const color = isUp ? COLOR_UP : COLOR_DOWN;

    // Price labels on left axis (drawn first, behind chart)
    ctx.fillStyle = "rgba(255,255,255,.22)";
    ctx.font = `500 10px 'JetBrains Mono', monospace`;
    for (let g = 0; g <= 4; g++) {
      const val = min + ((4 - g) / 4) * range;
      const y   = padT + (g / 4) * (H - padT - padB);
      ctx.fillText(fmtPrice(val), 4, y + 4);
    }

    // Subtle grid lines — only in the chart area (right of axis)
    ctx.strokeStyle = "rgba(255,255,255,.045)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = padT + (g / 4) * (H - padT - padB);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Thin separator between axis and chart
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H - padB); ctx.stroke();

    // Fill
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    for (let i = 1; i < data.length; i++) {
      const cx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cx, toY(data[i - 1]), cx, toY(data[i]), toX(i), toY(data[i]));
    }
    ctx.lineTo(W, H); ctx.lineTo(padL, H); ctx.closePath();
    const grad = ctx.createLinearGradient(padL, padT, padL, H);
    grad.addColorStop(0, isUp ? "rgba(74,222,128,.22)" : "rgba(248,113,113,.22)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    for (let i = 1; i < data.length; i++) {
      const cx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cx, toY(data[i - 1]), cx, toY(data[i]), toX(i), toY(data[i]));
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

    // Hover crosshair
    if (hIdx !== null && hIdx >= 0 && hIdx < data.length) {
      const x = toX(hIdx), y = toY(data[hIdx]);
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
      ctx.setLineDash([]);
      // Dot outer
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      // Dot inner
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a28"; ctx.fill();
    }
  };

  useEffect(() => {
    hoverRef.current = null;
    setHoverInfo(null);
    redraw(period, null);
  }, [period]);

  const handleMouseMove = e => {
    const canvas = canvasRef.current;
    const data   = dataRef.current[period];
    if (!canvas || !data) return;
    const rect = canvas.getBoundingClientRect();
    const idx  = Math.round(((e.clientX - rect.left) / rect.width) * (data.length - 1));
    const ci   = Math.max(0, Math.min(data.length - 1, idx));
    hoverRef.current = ci;
    redraw(period, ci);
    const pct = ((data[ci] - data[0]) / data[0]) * 100;
    setHoverInfo({ price: data[ci], pct });
  };

  const handleMouseLeave = () => {
    hoverRef.current = null;
    setHoverInfo(null);
    redraw(period, null);
  };

  return (
    <div>
      <div className="mk-exp-periods">
        {["1D","7D","1M","3M"].map(p => (
          <button
            key={p}
            className={"mk-exp-period-btn" + (period === p ? " mk-exp-period-btn--active" : "")}
            onClick={() => setPeriod(p)}
          >{p}</button>
        ))}
      </div>
      <div className="mk-exp-chart-wrap">
        <canvas
          ref={canvasRef}
          className="mk-exp-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {hoverInfo && (
          <div className="mk-exp-hover-box">
            <span>{fmtPrice(hoverInfo.price)}</span>
            <span className={"mk-exp-hover-pct" + (hoverInfo.pct >= 0 ? " mk-exp-hover-pct--up" : " mk-exp-hover-pct--down")}>
              {hoverInfo.pct >= 0 ? "+" : ""}{hoverInfo.pct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ExpandedCard — full-width inline detail card
// ═══════════════════════════════════════════════════════════════════
function ExpandedCard({ ticker, rates, onClose, onTrade }) {
  const info     = COINS[ticker];
  const price    = getMkPrice(rates, ticker);
  const change24 = MOCK_CHANGES[ticker]   ?? 0;
  const change7d = MOCK_7D_CHANGE[ticker] ?? 0;
  const marketCap = price * MOCK_SUPPLY[ticker];
  const badgeCls  = change24 > 0 ? "mk-exp-badge--up" : change24 < 0 ? "mk-exp-badge--down" : "mk-exp-badge--flat";
  const prefix    = change24 > 0 ? "+" : "";

  // snapshot price at mount for chart baseline
  const initPrice = useRef(price).current;

  return (
    <div className="mk-exp-card">
      <div className="mk-exp-header">
        <div className="mk-exp-coin">
          <div className="mk-exp-icon" style={{ background: info.color + "22", color: info.color }}>
            {info.icon}
          </div>
          <div>
            <div className="mk-exp-coin-name">{info.name}</div>
            <div className="mk-exp-ticker">{ticker}</div>
          </div>
        </div>
        <button className="mk-exp-close" onClick={onClose}>✕</button>
      </div>
      <div className={"mk-exp-price" + (change24 > 0 ? " mk-price-up" : change24 < 0 ? " mk-price-down" : " mk-price-neutral")}>{fmtPrice(price)}</div>
      <div className={"mk-exp-badge " + badgeCls}>
        {prefix}{change24.toFixed(2)}%
        <span style={{ fontSize: 10, opacity: .6 }}>24h</span>
      </div>
      <ExpandedCardChart ticker={ticker} initPrice={initPrice} />
      <div className="mk-exp-stats">
        <div className="mk-exp-stat">
          <div className="mk-exp-stat-label">Market Cap</div>
          <div className="mk-exp-stat-val">{fmtUSD(marketCap, true)}</div>
        </div>
        <div className="mk-exp-stat">
          <div className="mk-exp-stat-label">Volume 24h</div>
          <div className="mk-exp-stat-val">{fmtUSD(MOCK_VOLUME[ticker], true)}</div>
        </div>
        <div className="mk-exp-stat">
          <div className="mk-exp-stat-label">7d Change</div>
          <div className="mk-exp-stat-val" style={{ color: change7d >= 0 ? COLOR_UP : COLOR_DOWN }}>
            {change7d >= 0 ? "+" : ""}{change7d}%
          </div>
        </div>
        <div className="mk-exp-stat">
          <div className="mk-exp-stat-label">All-Time High</div>
          <div className="mk-exp-stat-val">{fmtPrice(MOCK_ATH[ticker])}</div>
        </div>
      </div>
      <div className="mk-exp-footer">
        <button className="mk-exp-buy-btn" onClick={() => onTrade(ticker)}>Buy on Convert ›</button>
        <button className="mk-exp-wallet-btn" onClick={() => { window.location.href = "wallet.html"; }}>View in Wallet</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function CardsView({ coins, rates, flashMap, sparkData, favorites, onStar, onTrade }) {
  const [expandedCoin, setExpandedCoin] = useState(null);
  const [closingCoin, setClosingCoin] = useState(null);
  const [colCount, setColCount] = useState(4);
  const gridRef = useRef(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const cols = getComputedStyle(el).gridTemplateColumns.split(' ').length;
      setColCount(cols);
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleCardClick = ticker => {
    if (expandedCoin === ticker) {
      setClosingCoin(ticker);
    } else {
      setClosingCoin(null);
      setExpandedCoin(ticker);
    }
  };

  const handleCloseAnimEnd = () => {
    setExpandedCoin(null);
    setClosingCoin(null);
  };

  // Move expanded card to appear after the end of the row it was originally in
  const orderedCoins = useMemo(() => {
    if (!expandedCoin || !coins.includes(expandedCoin)) return coins;
    const rest = coins.filter(t => t !== expandedCoin);
    const originalIndex = coins.indexOf(expandedCoin);
    const rowIndex = Math.floor(originalIndex / colCount);
    const insertAt = Math.min((rowIndex + 1) * colCount, rest.length);
    return [...rest.slice(0, insertAt), expandedCoin, ...rest.slice(insertAt)];
  }, [coins, expandedCoin, colCount]);

  if (coins.length === 0) return <div className="mk-empty">No coins match your search.</div>;

  return (
    <div className="mk-cards-grid" ref={gridRef}>
      {orderedCoins.map(ticker => (
        <CoinCard
          key={ticker}
          ticker={ticker}
          rates={rates}
          flash={flashMap[ticker] || null}
          sparkData={sparkData}
          onCardClick={handleCardClick}
          onTrade={onTrade}
          isExpanded={expandedCoin === ticker}
          isClosing={closingCoin === ticker}
          onCloseAnimEnd={handleCloseAnimEnd}
          isFav={favorites.includes(ticker)}
          onStar={onStar}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MarketsTable
// ═══════════════════════════════════════════════════════════════════
function MarketsTable({ coins, rates, flashMap, sparkData, favorites, onStar, onRowClick, onTrade }) {
  return (
    <div className="mk-table-wrap">
      <div className="mk-table-head">
        <div className="mk-th">Coin</div>
        <div className="mk-th mk-th--right">Price</div>
        <div className="mk-th mk-th--right">24h %</div>
        <div className="mk-th mk-th--right mk-col-7d">7d %</div>
        <div className="mk-th mk-th--right">Market Cap</div>
        <div className="mk-th mk-th--right mk-col-vol">Volume 24h</div>
        <div className="mk-th mk-th--center">7d Chart</div>
        <div className="mk-th"></div>
      </div>
      {coins.length === 0
        ? <div className="mk-empty">No coins match your search.</div>
        : coins.map(ticker => (
          <MarketRow
            key={ticker}
            ticker={ticker}
            rates={rates}
            flash={flashMap[ticker] || null}
            sparkData={sparkData}
            isFav={favorites.includes(ticker)}
            onStar={onStar}
            onRowClick={onRowClick}
            onTrade={onTrade}
          />
        ))
      }
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ModalTrendChart — full-width hoverable 7d sparkline for modal
// ═══════════════════════════════════════════════════════════════════
function ModalTrendChart({ points, isUp }) {
  const canvasRef = useRef(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const color = isUp ? COLOR_UP : COLOR_DOWN;

  const redraw = hIdx => {
    const canvas = canvasRef.current;
    if (!canvas || !points || points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 360, H = 60;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
    const min = Math.min(...points), max = Math.max(...points);
    const range = max - min || 1, pad = 4;
    const toY = v => H - pad - ((v - min) / range) * (H - pad * 2);
    const toX = i => (i / (points.length - 1)) * W;
    // Fill
    ctx.beginPath(); ctx.moveTo(toX(0), toY(points[0]));
    for (let i = 1; i < points.length; i++) { const cx = (toX(i-1)+toX(i))/2; ctx.bezierCurveTo(cx, toY(points[i-1]), cx, toY(points[i]), toX(i), toY(points[i])); }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, isUp ? "rgba(74,222,128,.22)" : "rgba(248,113,113,.22)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad; ctx.fill();
    // Line
    ctx.beginPath(); ctx.moveTo(toX(0), toY(points[0]));
    for (let i = 1; i < points.length; i++) { const cx = (toX(i-1)+toX(i))/2; ctx.bezierCurveTo(cx, toY(points[i-1]), cx, toY(points[i]), toX(i), toY(points[i])); }
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    // Crosshair + dot
    if (hIdx !== null && hIdx >= 0 && hIdx < points.length) {
      const x = toX(hIdx), y = toY(points[hIdx]);
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fillStyle = "#1a1a28"; ctx.fill();
    }
  };

  useEffect(() => { redraw(null); }, []);

  const handleMouseMove = e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ci = Math.max(0, Math.min(points.length - 1, Math.round(((e.clientX - rect.left) / rect.width) * (points.length - 1))));
    redraw(ci);
    setHoverInfo({ price: points[ci], pct: ((points[ci] - points[0]) / points[0]) * 100 });
  };

  const handleMouseLeave = () => { redraw(null); setHoverInfo(null); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, minHeight: 16 }}>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".1em", color: "rgba(255,255,255,.3)" }}>7 DAY TREND</span>
        {hoverInfo && (
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,.88)" }}>{fmtPrice(hoverInfo.price)}</span>
            <span className={"mk-exp-hover-pct" + (hoverInfo.pct >= 0 ? " mk-exp-hover-pct--up" : " mk-exp-hover-pct--down")}>
              {hoverInfo.pct >= 0 ? "+" : ""}{hoverInfo.pct.toFixed(2)}%
            </span>
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "60px", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CoinDetailModal
// ═══════════════════════════════════════════════════════════════════
function CoinDetailModal({ ticker, rates, sparkData, isFav, onStar, onClose, onTrade }) {
  const info      = COINS[ticker];
  const price     = getMkPrice(rates, ticker);
  const change24  = MOCK_CHANGES[ticker]   ?? 0;
  const change7d  = MOCK_7D_CHANGE[ticker] ?? 0;
  const marketCap = price * MOCK_SUPPLY[ticker];
  const volume    = MOCK_VOLUME[ticker];
  const supply    = MOCK_SUPPLY[ticker];
  const ath       = MOCK_ATH[ticker];
  const isUp7d    = change7d >= 0;

  const badgeCls   = change24 > 0 ? "mk-modal-badge--up" : change24 < 0 ? "mk-modal-badge--down" : "mk-modal-badge--flat";
  const prefix     = change24 > 0 ? "+" : "";
  const priceColor = change24 > 0 ? COLOR_UP : change24 < 0 ? COLOR_DOWN : "rgba(255,255,255,.95)";

  return (
    <div className="mk-overlay" onClick={onClose}>
      <div className="mk-modal" onClick={e => e.stopPropagation()}>
        {/* Header: icon + name (truncated) + sparkline + close */}
        <div className="mk-modal-coin-head">
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div className="mk-modal-icon" style={{ background: info.color + "22", color: info.color }}>
              {info.icon}
            </div>
            <button
              className={"mk-card-icon-star" + (isFav ? " mk-card-icon-star--on" : "")}
              onClick={e => onStar(ticker, e)}
            >{isFav ? "★" : "☆"}</button>
          </div>
          <div className="mk-modal-coin-text">
            <div className="mk-modal-coin-name" title={info.name}>{info.name}</div>
            <div className="mk-modal-coin-ticker">{ticker}</div>
          </div>
          <button className="mk-modal-close" onClick={onClose}>✕</button>
        </div>
        {/* Price + change on same line */}
        <div className="mk-modal-price-row">
          <div className="mk-modal-price" style={{ color: priceColor }}>{fmtPrice(price)}</div>
          <div className={"mk-modal-badge " + badgeCls}>
            {prefix}{change24.toFixed(2)}%
            <span style={{ marginLeft: 4, opacity: .65, fontSize: 10 }}>24h</span>
          </div>
        </div>
        {sparkData && sparkData[ticker] && (
          <div style={{ width: "100%", marginBottom: 16 }}>
            <ModalTrendChart points={sparkData[ticker]} isUp={isUp7d} />
          </div>
        )}
        <div className="mk-stats-grid">
          <div className="mk-stat-box">
            <div className="mk-stat-label">Market Cap</div>
            <div className="mk-stat-value">{fmtUSD(marketCap, true)}</div>
          </div>
          <div className="mk-stat-box">
            <div className="mk-stat-label">Volume 24h</div>
            <div className="mk-stat-value">{fmtUSD(volume, true)}</div>
          </div>
          <div className="mk-stat-box">
            <div className="mk-stat-label">Circulating Supply</div>
            <div className="mk-stat-value">{fmtSupply(supply)}</div>
          </div>
          <div className="mk-stat-box">
            <div className="mk-stat-label">All-Time High</div>
            <div className="mk-stat-value">{fmtPrice(ath)}</div>
          </div>
        </div>
        <div className="mk-modal-actions">
          <button className="mk-modal-btn mk-modal-btn--primary" onClick={() => onTrade(ticker)}>
            Buy on Convert ›
          </button>
          <button className="mk-modal-btn mk-modal-btn--secondary" onClick={() => { localStorage.setItem("hx_wallet_coin", ticker); window.location.href = "wallet.html"; }}>
            Wallet Actions
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MarketsPage (root)
// ═══════════════════════════════════════════════════════════════════
const CONVERTER_COINS = ["BTC","ETH","USDT","SOL","BNB","XRP","USDC"];

export default function MarketsPage() {
  useEffect(() => { injectMarketsCSS(); }, []);

  const [rates, setRates] = useState(BASE_RATES);
  const [flashMap, setFlashMap] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [view, setView] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.has("card") ? "cards" : p.has("list") ? "table" : "table";
  });

  const handleSetView = v => {
    setView(v);
    const url = new URL(window.location.href);
    url.searchParams.delete("card");
    url.searchParams.delete("list");
    url.searchParams.set(v === "cards" ? "card" : "list", "");
    window.history.replaceState(null, "", url);
  };
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hx_favorites") || "[]"); } catch { return []; }
  });

  const toggleFav = (ticker, e) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker];
      localStorage.setItem("hx_favorites", JSON.stringify(next));
      return next;
    });
  };

  // Spark data generated once on mount, never changes
  const [sparkData] = useState(() => {
    const data = {};
    COIN_RANKS.forEach(ticker => {
      const price = getMkPrice(BASE_RATES, ticker);
      data[ticker] = genChartData(price, 30, 0.02);
    });
    return data;
  });

  // Live ticking — same 3500ms interval as WalletPage
  const ratesRef = useRef(BASE_RATES);
  useEffect(() => {
    const TICK_KEYS = { BTC: "BTC/USDT", ETH: "ETH/USDT", SOL: "SOL/USDT", BNB: "BNB/USDT", XRP: "XRP/USDT", USDC: "USDC/USDT" };
    const id = setInterval(() => {
      const prev = ratesRef.current;
      const next = { ...prev };
      const newFlash = {};
      Object.entries(TICK_KEYS).forEach(([ticker, key]) => {
        const old = prev[key] || 1;
        const delta = old * 0.0012 * (Math.random() - 0.48);
        const nv = Math.max(old + delta, old * 0.9);
        next[key] = nv;
        newFlash[ticker] = nv > old ? "up" : nv < old ? "down" : null;
      });
      ratesRef.current = next;
      setRates(next);
      setFlashMap(newFlash);
      setTimeout(() => setFlashMap({}), 550);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Trade: navigate to Convert with coin pre-selected
  const handleTrade = ticker => {
    const target = CONVERTER_COINS.includes(ticker) ? ticker : "BTC";
    localStorage.setItem("hx_convert_coin", target);
    window.location.href = "index.html";
  };

  // Apply filter + search
  const visibleCoins = (() => {
    let list = [...COIN_RANKS];
    if (filter === "favorites") {
      list = list.filter(t => favorites.includes(t));
    } else if (filter === "gainers") {
      list = list.sort((a, b) => (MOCK_CHANGES[b] ?? 0) - (MOCK_CHANGES[a] ?? 0));
    } else if (filter === "losers") {
      list = list.sort((a, b) => (MOCK_CHANGES[a] ?? 0) - (MOCK_CHANGES[b] ?? 0));
    } else if (filter === "volume") {
      list = list.sort((a, b) => (MOCK_VOLUME[b] ?? 0) - (MOCK_VOLUME[a] ?? 0));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(t => t.toLowerCase().includes(q) || COINS[t].name.toLowerCase().includes(q));
    }
    return list;
  })();

  return (
    <div className="mk-root">
      <NavBar active="markets" />
      <div className="mk-container">
        <FilterRow
          search={search} setSearch={setSearch}
          filter={filter} setFilter={setFilter}
          view={view} setView={handleSetView}
          favorites={favorites}
        />
        {view === "table" ? (
          <MarketsTable
            coins={visibleCoins}
            rates={rates}
            flashMap={flashMap}
            sparkData={sparkData}
            favorites={favorites}
            onStar={toggleFav}
            onRowClick={ticker => setSelectedCoin(ticker)}
            onTrade={handleTrade}
          />
        ) : (
          <CardsView
            coins={visibleCoins}
            rates={rates}
            flashMap={flashMap}
            sparkData={sparkData}
            favorites={favorites}
            onStar={toggleFav}
            onTrade={handleTrade}
          />
        )}
      </div>
      {selectedCoin && (
        <CoinDetailModal
          ticker={selectedCoin}
          rates={rates}
          sparkData={sparkData}
          isFav={favorites.includes(selectedCoin)}
          onStar={toggleFav}
          onClose={() => setSelectedCoin(null)}
          onTrade={ticker => { setSelectedCoin(null); handleTrade(ticker); }}
        />
      )}
    </div>
  );
}
