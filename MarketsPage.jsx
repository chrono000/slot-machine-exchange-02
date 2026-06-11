import React, { useEffect, useMemo, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════
// Data Constants  (COINS, BASE_RATES, MOCK_CHANGES, COLOR_UP, COLOR_DOWN,
//                   getUSDRate, fmtUSD, fmtPrice, addCommas from shared.js)
// ═══════════════════════════════════════════════════════════════════

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


// Utilities (getUSDRate, addCommas, fmtUSD, fmtPrice from shared.js)
const HxRoll = window.HxRoll; // rolling-digit price display (shared.js)

function getMkPrice(rates, ticker) {
  const live = getUSDRate(rates, ticker);
  return live > 0 ? live : (MOCK_PRICES_STATIC[ticker] || 0);
}

function getMarketCap(rates, ticker) {
  const supply = MOCK_SUPPLY[ticker];
  if (!supply) return 0;
  return getMkPrice(rates, ticker) * supply;
}

function fmtSupply(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(2) + "K";
  return String(n);
}

function getSparkPeriodChange(series, period) {
  const pts = series?.[period];
  if (!pts || pts.length < 2) return null;
  return ((pts[pts.length - 1] - pts[0]) / pts[0]) * 100;
}

function getPeriodChangePct(ticker, period, series) {
  const fromSpark = getSparkPeriodChange(series, period);
  if (fromSpark !== null) return fromSpark;
  if (period === "7D") return MOCK_7D_CHANGE[ticker] ?? 0;
  return MOCK_CHANGES[ticker] ?? 0;
}

const MK_CHART_PERIODS = ["1D", "7D", "1M", "3M"];

// genChartData from shared.js

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
.mk-search-toggle{display:flex;align-items:center;gap:8px;flex:none;position:relative}
.mk-search-wrap{position:relative;flex:none;width:93px}
.mk-search-icon{position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:12px;color:rgba(255,255,255,.28);pointer-events:none;line-height:1}
.mk-search-clear{position:absolute;right:5px;top:50%;transform:translateY(-50%);background:none;border:0;color:rgba(255,255,255,.4);font-size:15px;line-height:1;cursor:pointer;padding:2px;font-family:inherit}
.mk-search-clear:hover{color:rgba(255,255,255,.8)}
.mk-search-input{width:100%;height:34px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:0 22px 0 26px;font-family:inherit;font-size:12px;color:rgba(255,255,255,.88);outline:none;letter-spacing:.02em}
.mk-search-input::placeholder{color:rgba(255,255,255,.2)}
.mk-search-input:focus{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.07)}
.mk-pills{display:flex;gap:6px;flex-wrap:wrap}
.mk-pill{font-size:11px;font-weight:600;font-family:inherit;padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);cursor:pointer;transition:all 140ms;letter-spacing:.03em}
.mk-pill:hover{color:rgba(255,255,255,.72);border-color:rgba(255,255,255,.22)}
.mk-pill--active{background:rgba(255,255,255,.1);color:rgba(255,255,255,.9);border-color:rgba(255,255,255,.25)}

.mk-table-wrap{background:#131119;border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden}
.mk-table-head,.mk-row{display:grid;grid-template-columns:28px 1.35fr minmax(92px,.95fr) minmax(68px,.7fr) minmax(56px,.65fr) 76px minmax(96px,.85fr) minmax(96px,.85fr) minmax(64px,72px);padding:0 14px;align-items:center}
.mk-col-7d-pct{padding-right:2px}
.mk-col-chart{padding-left:6px;border-left:1px solid rgba(255,255,255,.05)}
.mk-table-head{height:32px;border-bottom:1px solid rgba(255,255,255,.06)}
.mk-th{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.25)}
.mk-th--right{text-align:right}
.mk-th--center{text-align:center}
.mk-row{height:62px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;transition:background 120ms}
.mk-col-rank{font-size:11px;font-weight:600;color:rgba(255,255,255,.22);font-variant-numeric:tabular-nums;text-align:center}
.mk-col-num{font-size:12px;font-variant-numeric:tabular-nums}
.mk-row:last-child{border-bottom:none}
.mk-row:hover{background:rgba(255,255,255,.03)}

.mk-rank{font-size:11px;color:rgba(255,255,255,.22);font-weight:600}
.mk-star-btn{background:none;border:0;cursor:pointer;font-size:15px;padding:0;line-height:1;color:rgba(255,255,255,.18);transition:color 140ms,transform 140ms;display:flex;align-items:center}
.mk-star-btn:hover{color:rgba(255,200,60,.7);transform:scale(1.2)}
.mk-star-btn--on{color:#f5c518}
.mk-star-btn--on:hover{color:#ffd740;transform:scale(1.15)}
.mk-coin-cell{display:flex;align-items:center;gap:8px}
.mk-coin-icon{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.mk-coin-name{font-size:12px;font-weight:600;color:rgba(255,255,255,.88);letter-spacing:.01em}
.mk-coin-ticker{font-size:10px;color:rgba(255,255,255,.3);font-weight:500;letter-spacing:.05em;margin-top:1px}
.mk-cell-right{text-align:right;font-variant-numeric:tabular-nums}
.mk-price{font-size:13px;font-weight:600;color:rgba(255,255,255,.88);padding:4px 6px;border-radius:5px;transition:background 80ms}
.mk-cap{font-size:12px;color:rgba(255,255,255,.55)}
.mk-vol{font-size:12px;color:rgba(255,255,255,.45)}

.mk-change{display:inline-flex;align-items:center;justify-content:flex-end;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
.mk-change--up{color:${COLOR_UP}}
.mk-change--down{color:${COLOR_DOWN}}
.mk-change--flat{color:rgba(255,255,255,.3)}

@keyframes mkFlashUp{0%{background:rgba(74,222,128,.22)}100%{background:transparent}}
@keyframes mkFlashDown{0%{background:rgba(248,113,113,.22)}100%{background:transparent}}
.mk-flash-up{animation:mkFlashUp 550ms ease forwards}
.mk-flash-down{animation:mkFlashDown 550ms ease forwards}

.mk-trade-btn{font-size:11px;font-weight:600;font-family:inherit;padding:6px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:rgba(255,255,255,.65);cursor:pointer;transition:all 140ms;letter-spacing:.03em;white-space:nowrap;flex-shrink:0;line-height:1.2}
.mk-col-action{display:flex;justify-content:flex-end;align-items:center;padding-left:10px}
.mk-trade-btn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.28);color:rgba(255,255,255,.9)}

.mk-chart-cell{display:flex;align-items:center;justify-content:center}
.mk-chart-cell.mk-col-chart{min-height:32px}

.mk-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px;animation:mkFadeIn 150ms ease}
@keyframes mkFadeIn{from{opacity:0}to{opacity:1}}
.mk-modal{background:#1a1a26;border:1px solid rgba(255,255,255,.1);border-radius:18px;width:100%;min-width:0;max-width:420px;padding:24px;position:relative;animation:mkSlideUp 180ms cubic-bezier(.2,.9,.2,1)}
.mk-modal--detail{max-width:620px;padding:22px 24px 20px}
.mk-modal--detail .mk-modal-icon{width:44px;height:44px;font-size:20px}
.mk-modal--detail .mk-modal-coin-name{max-width:280px;font-size:17px}
.mk-modal--detail .mk-modal-coin-ticker{font-size:11px}
.mk-modal--detail .mk-modal-coin-head{margin-bottom:14px}
.mk-modal-price-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 14px;margin-bottom:10px}
.mk-modal-price-main{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px 10px;min-width:0;flex:1 1 200px}
.mk-modal--detail .mk-modal-price{font-size:30px;white-space:nowrap}
.mk-modal--detail .mk-modal-badge{font-size:13px;padding:4px 11px;white-space:nowrap}
.mk-modal-periods{display:flex;gap:3px;flex:0 0 auto;margin-left:auto}
.mk-modal-periods .mk-exp-period-btn{padding:4px 11px}
.mk-modal--detail .mk-modal-chart-area .mk-exp-chart-wrap{margin:0 -4px 14px}
.mk-modal--detail .mk-modal-chart-area .mk-exp-canvas{height:220px}
.mk-modal--detail .mk-exp-stats{grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.mk-modal--detail .mk-exp-stat{padding:11px 12px}
.mk-modal--detail .mk-exp-stat-label{font-size:9px;margin-bottom:4px}
.mk-modal--detail .mk-exp-stat-val{font-size:14px}
.mk-modal--detail .mk-exp-footer{margin-top:0;justify-content:stretch}
.mk-modal--detail .mk-exp-buy-btn,.mk-modal--detail .mk-exp-wallet-btn{flex:1;height:40px;font-size:13px}
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
.mk-card{background:#131119;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:20px 18px 16px;cursor:pointer;transition:border-color 150ms,background 150ms;overflow:hidden}
.mk-card:hover{background:#1a1a26;border-color:rgba(255,255,255,.16)}
.mk-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:8px}
.mk-card-coin{display:flex;align-items:center;gap:10px;min-width:0;flex-shrink:0}
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
.mk-card-head-right{display:flex;align-items:center;gap:6px;flex:1;justify-content:flex-end;min-width:0;position:relative;overflow:hidden}
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

/* Morph price */
.mk-card-price-morph{font-weight:700;font-variant-numeric:tabular-nums;line-height:1;transition:font-size 300ms cubic-bezier(.2,.9,.2,1),letter-spacing 300ms cubic-bezier(.2,.9,.2,1)}
.mk-card-price-morph--compact{font-size:26px;letter-spacing:-.8px}
.mk-card-price-morph--expanded{font-size:34px;letter-spacing:-1px}

/* Sparkline morph */
.mk-spark-morph{position:absolute;right:0;top:50%;transform:translateY(-50%);pointer-events:none;width:100%}
@keyframes mkSparkMorphOut{0%{opacity:1;transform:translateY(-50%) scale(1)}50%{opacity:.5;transform:translateY(6px) scale(1.02,1.15)}100%{opacity:0;transform:translateY(20px) scale(1.04,1.3)}}
@keyframes mkSparkMorphIn{0%{opacity:0;transform:translateY(20px) scale(1.04,1.3)}50%{opacity:.5;transform:translateY(6px) scale(1.02,1.15)}100%{opacity:1;transform:translateY(-50%) scale(1)}}
@keyframes mkCloseBtnIn{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}
@keyframes mkCloseBtnOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.6)}}

/* Chart morph */
@keyframes mkChartMorphIn{0%{opacity:0;transform:translateY(-12px)}100%{opacity:1;transform:translateY(0)}}
@keyframes mkChartMorphOut{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-12px)}}
.mk-card--expanded .mk-chart-morph{animation:mkChartMorphIn 300ms cubic-bezier(.2,.9,.2,1) 200ms both;transform-origin:top center}
.mk-card--closing .mk-chart-morph{animation:mkChartMorphOut 180ms cubic-bezier(.4,0,.55,1) both;transform-origin:top center}

/* Stagger in/out */
@keyframes mkStaggerIn{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
@keyframes mkStaggerOut{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(10px)}}
.mk-card--expanded .mk-exp-periods-wrap{animation:mkStaggerIn 220ms ease 200ms both}
.mk-card--expanded .mk-exp-stats > :nth-child(1){animation:mkStaggerIn 220ms ease 350ms both}
.mk-card--expanded .mk-exp-stats > :nth-child(2){animation:mkStaggerIn 220ms ease 400ms both}
.mk-card--expanded .mk-exp-stats > :nth-child(3){animation:mkStaggerIn 220ms ease 450ms both}
.mk-card--expanded .mk-exp-stats > :nth-child(4){animation:mkStaggerIn 220ms ease 500ms both}
.mk-card--expanded .mk-exp-footer{animation:mkStaggerIn 220ms ease 550ms both}

.mk-card--closing .mk-exp-footer{animation:mkStaggerOut 150ms ease 0ms both}
.mk-card--closing .mk-exp-stats > :nth-child(4){animation:mkStaggerOut 150ms ease 30ms both}
.mk-card--closing .mk-exp-stats > :nth-child(3){animation:mkStaggerOut 150ms ease 60ms both}
.mk-card--closing .mk-exp-stats > :nth-child(2){animation:mkStaggerOut 150ms ease 90ms both}
.mk-card--closing .mk-exp-stats > :nth-child(1){animation:mkStaggerOut 150ms ease 120ms both}
.mk-card--closing .mk-exp-periods-wrap{animation:mkStaggerOut 150ms ease 60ms both}

.mk-card--expanded{grid-column:1/-1;cursor:default;border-color:rgba(255,255,255,.18) !important;background:#1a1a26 !important;transition:border-color 200ms,background 200ms}
.mk-card--expanded:hover{background:#1a1a26 !important;border-color:rgba(255,255,255,.18) !important}
.mk-card--closing{grid-column:1/-1;cursor:default;pointer-events:none;border-color:rgba(255,255,255,.18) !important;background:#1a1a26 !important}
.mk-card-close-btn{background:rgba(255,255,255,.07);border:0;color:rgba(255,255,255,.45);font-size:14px;width:30px;height:30px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 140ms;font-family:inherit;flex-shrink:0}
.mk-card-close-btn:hover{background:rgba(255,255,255,.14);color:rgba(255,255,255,.85)}


.mk-table-scroll{min-width:0}
@media(max-width:720px){
  .mk-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
  .mk-table-scroll{min-width:920px}
  .mk-row{min-height:56px}
  .mk-trade-btn{min-height:40px;padding:10px 14px}
  .mk-star-btn{min-width:40px;min-height:40px}
}
@media(max-width:640px){
  .mk-container{padding:16px max(12px,env(safe-area-inset-right)) 48px max(12px,env(safe-area-inset-left))}
  .mk-page-title{font-size:20px}
  .mk-summary-bar{flex-direction:column}
  .mk-summary-item{border-right:none;border-bottom:1px solid rgba(255,255,255,.06)}
  .mk-summary-item:last-child{border-bottom:none}
  .mk-filter-row{gap:8px}
  /* Keep search + view-toggle together and let the search shrink instead of
     wrapping the toggle onto a second line. */
  .mk-search-toggle{flex:1;min-width:0}
  .mk-search-wrap{flex:1;min-width:0;width:auto;max-width:none}
  .mk-search-input{height:40px;font-size:13px}
  .mk-pill{min-height:36px;padding:8px 14px}
  .mk-view-btn{width:40px;height:36px}
  .mk-cards-grid{grid-template-columns:1fr}
  .mk-overlay{padding-top:max(16px,calc(env(safe-area-inset-top,0px) + 8px));padding-bottom:max(16px,calc(env(safe-area-inset-bottom,0px) + 8px));padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right));align-items:center}
  .mk-modal{max-height:min(90dvh,calc(100dvh - env(safe-area-inset-top,0px) - 32px));overflow-y:auto;-webkit-overflow-scrolling:touch}
  .mk-modal-btn,.mk-modal-close{min-height:44px;min-width:44px}
  .mk-exp-card{padding:18px 16px}
  .mk-exp-canvas{height:220px}
}
@media(max-width:500px){
  /* Drop the horizontal-scroll table (most columns were off-screen and felt cut
     off). Switch to a fit-to-viewport row: Coin | Price over 24h% | Buy. */
  .mk-table-wrap{overflow-x:visible}
  .mk-table-scroll{min-width:0}
  .mk-table-head{display:none}
  .mk-col-rank,.mk-col-7d-pct,.mk-col-chart,.mk-col-7d-chart,.mk-col-mcap,.mk-col-vol{display:none}
  .mk-row{grid-template-columns:minmax(0,1fr) auto auto;grid-template-rows:auto auto;column-gap:10px;row-gap:1px;padding:8px 12px;height:auto;min-height:60px;align-items:center}
  .mk-row>.mk-coin-cell{grid-column:1;grid-row:1/3;min-width:0}
  .mk-coin-cell>div{min-width:0}
  .mk-coin-name,.mk-coin-ticker{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mk-row>.mk-price{grid-column:2;grid-row:1;justify-self:end}
  .mk-row>.mk-col-24h{grid-column:2;grid-row:2;justify-self:end}
  .mk-row>.mk-col-action{grid-column:3;grid-row:1/3}
  .mk-modal--detail .mk-exp-stats{grid-template-columns:repeat(2,1fr)}
  /* Detail modal: shrink so price + stats + buttons fit the viewport */
  .mk-modal--detail{padding:16px 14px 14px}
  .mk-modal--detail .mk-modal-price{font-size:22px;white-space:normal}
  .mk-modal-periods{margin-left:0}
  .mk-modal-price-toolbar{gap:8px 10px}
  .mk-modal--detail .mk-exp-stat{padding:9px 10px}
  .mk-modal--detail .mk-exp-stat-val{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mk-modal--detail .mk-exp-footer{flex-wrap:wrap}
  .mk-modal--detail .mk-exp-buy-btn,.mk-modal--detail .mk-exp-wallet-btn{flex:1 1 calc(50% - 4px)}
  /* Inline expanded card: same treatment */
  .mk-exp-card{padding:18px 16px}
  .mk-exp-price{font-size:28px}
  .mk-exp-stats{grid-template-columns:repeat(2,1fr)}
  .mk-exp-stat-val{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mk-exp-footer{flex-wrap:wrap}
  .mk-exp-buy-btn,.mk-exp-wallet-btn{flex:1 1 calc(50% - 4px)}
}
@media(max-width:360px){
  /* Compact view toggle so search + toggle share one line; when the search is
     focused it expands and the toggle collapses out of the way (returns on blur). */
  .mk-view-btn{width:30px;height:30px}
  .mk-view-toggle{transition:width 220ms ease,opacity 150ms ease,padding 220ms ease,margin 220ms ease}
  .mk-search-toggle:focus-within .mk-view-toggle{width:0;min-width:0;padding:0;margin:0;opacity:0;overflow:hidden;pointer-events:none;border-width:0}
  .mk-search-toggle:focus-within{gap:0}
}
@media(max-width:320px){
  /* Ultra-narrow: drop the Buy button too (row tap opens detail with trade) */
  .mk-row{grid-template-columns:minmax(0,1fr) auto}
  .mk-row>.mk-col-action{display:none}
  /* Single-column stats so values never clip */
  .mk-modal--detail .mk-exp-stats,.mk-exp-stats{grid-template-columns:1fr}
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
// MarketsPageSkeleton
// ═══════════════════════════════════════════════════════════════════
const MK_SK_ROW_GRID = { display: "grid", gridTemplateColumns: "28px 1.35fr minmax(92px,.95fr) minmax(68px,.7fr) minmax(56px,.65fr) 76px minmax(96px,.85fr) minmax(96px,.85fr) 52px", padding: "0 14px", alignItems: "center" };

function MkSkTable() {
  return (
    <div style={{ background: "#131119", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ ...MK_SK_ROW_GRID, height: 32, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        {[12, 40, 35, 28, 28, 40, 40, 50, 36].map((w, i) => (
          <div key={i}>{hxSk(8, w, i * 0.04, { marginLeft: i > 1 ? "auto" : 0 })}</div>
        ))}
      </div>
      {Array.from({ length: 10 }, (_, i) => {
        const d = i * 0.06;
        return (
          <div key={i} style={{ ...MK_SK_ROW_GRID, height: 62, borderBottom: i < 9 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {hxSkCircle(32, d)}
              <div>
                {hxSk(11, 55, d, { marginBottom: 5 })}
                {hxSk(8, 30, d + 0.03)}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>{hxSk(11, 52, d)}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>{hxSk(8, 36, d + 0.02)}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>{hxSk(8, 36, d + 0.03)}</div>
            <div style={{ display: "flex", justifyContent: "center" }}>{hxSk(24, 56, d + 0.04)}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>{hxSk(11, 48, d + 0.05)}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>{hxSk(11, 44, d + 0.06)}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>{hxSk(24, 36, d + 0.07, { borderRadius: 6 })}</div>
          </div>
        );
      })}
    </div>
  );
}

function MkSkCards() {
  return (
    <div className="mk-cards-grid">
      {Array.from({ length: 6 }, (_, i) => {
        const d = i * 0.07;
        return (
          <div key={i} style={{ background: "#131119", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 16, height: 130, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {hxSkCircle(32, d)}
              <div>
                {hxSk(11, 55, d, { marginBottom: 5 })}
                {hxSk(8, 30, d + 0.03)}
              </div>
            </div>
            <div>{hxSk(12, 80, d + 0.04)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {hxSk(20, "60%", d + 0.05, { borderRadius: 4 })}
              {hxSk(24, 50, d + 0.06, { borderRadius: 6 })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MarketsPageSkeleton({ view }) {
  return (
    <>
      {/* Filter row */}
      <div className="mk-filter-row">
        {hxSk(18, 56, 0, { borderRadius: 5 })}
        <div style={{ display: "flex", gap: 6 }}>
          {[38, 22, 52, 46, 50].map((w, i) => (
            <div key={i}>{hxSk(28, w, i * 0.05, { borderRadius: 14 })}</div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {hxSk(34, 93, 0, { borderRadius: 8 })}
        {hxSk(30, 58, 0, { borderRadius: 8 })}
      </div>

      {view === "cards" ? <MkSkCards /> : <MkSkTable />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MiniSparkline
// ═══════════════════════════════════════════════════════════════════
function MiniSparkline({ points, isUp, fullWidth = false, w = 60, h = 32 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !points || points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const W = fullWidth ? (canvas.clientWidth || 100) : w, H = h;
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

  return <canvas ref={ref} style={{ display: "block", width: fullWidth ? "100%" : `${w}px`, height: `${h}px` }} />;
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
  const searchRef = useRef(null);
  const pills = [
    { id: "all",         label: "All"      },
    { id: "favorites",   label: "★"        },
    { id: "gainers",     label: "Gainers"  },
    { id: "losers",      label: "Losers"   },
    { id: "volume",      label: "Volume"   },
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
          </button>
        ))}
      </div>
      <div className="mk-filter-spacer" />
      <div className="mk-search-toggle">
        <div className="mk-search-wrap">
          <span className="mk-search-icon">🔍</span>
          <input
            ref={searchRef}
            className="mk-search-input"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="mk-search-clear" title="Clear" onClick={() => { setSearch(""); searchRef.current?.blur(); }}>×</button>
          )}
        </div>
        <div className="mk-view-toggle">
          <button className={"mk-view-btn" + (view === "table" ? " mk-view-btn--active" : "")} onClick={() => setView("table")} title="Table view">☰</button>
          <button className={"mk-view-btn" + (view === "cards" ? " mk-view-btn--active" : "")} onClick={() => setView("cards")} title="Cards view">⊞</button>
        </div>
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
// Receives the already-derived `price`/`mcap` numbers (not the whole rates
// object) so React.memo skips re-rendering the ~half of rows whose price is
// unchanged on each live tick.
const MarketRow = React.memo(function MarketRow({ ticker, rank, price, mcap, flash, sparkData, onRowClick, onTrade, isFav, onStar }) {
  const info      = COINS[ticker];
  const change24h = MOCK_CHANGES[ticker] ?? 0;
  const change7d  = MOCK_7D_CHANGE[ticker] ?? 0;
  const volume    = MOCK_VOLUME[ticker] ?? 0;
  const isUp7d    = change7d >= 0;

  const priceCls = "mk-price mk-cell-right mk-col-num" +
    (flash === "up" ? " mk-flash-up" : flash === "down" ? " mk-flash-down" : "");

  return (
    <div className="mk-row" onClick={() => onRowClick(ticker)}>
      <div className="mk-col-rank">{rank}</div>
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
      <div className={priceCls}><HxRoll value={fmtPrice(price)} dir={flash} /></div>
      <div className="mk-cell-right mk-col-num mk-col-24h">
        <ChangeCell pct={change24h} />
      </div>
      <div className="mk-cell-right mk-col-num mk-col-7d-pct">
        <ChangeCell pct={change7d} />
      </div>
      <div className="mk-col-chart mk-chart-cell mk-col-7d-chart">
        {sparkData[ticker]?.["7D"] && <MiniSparkline points={sparkData[ticker]["7D"]} isUp={isUp7d} />}
      </div>
      <div className="mk-cell-right mk-col-num mk-col-mcap">
        <div className="mk-cap">{fmtUSD(mcap, true)}</div>
      </div>
      <div className="mk-cell-right mk-col-num mk-col-vol">
        <div className="mk-vol">{fmtUSD(volume, true)}</div>
      </div>
      <div className="mk-cell-right mk-col-action">
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
// Receives the already-derived `price` number (not the whole rates object) so
// React.memo skips cards whose price is unchanged on each live tick.
const CoinCard = React.memo(function CoinCard({ ticker, price, flash, sparkData, onCardClick, onTrade, isExpanded, isClosing, isFav, onStar, onWalletAction }) {
  const info      = COINS[ticker];
  const change24  = MOCK_CHANGES[ticker]   ?? 0;
  const change7d  = MOCK_7D_CHANGE[ticker] ?? 0;
  const marketCap = price * MOCK_SUPPLY[ticker];
  const isUp7d    = change7d >= 0;

  const badgeCls      = change24 > 0 ? "mk-card-badge--up" : change24 < 0 ? "mk-card-badge--down" : "mk-card-badge--flat";
  const prefix        = change24 > 0 ? "+" : "";
  const priceColorCls = change24 > 0 ? " mk-price-up" : change24 < 0 ? " mk-price-down" : " mk-price-neutral";
  const flashCls      = flash === "up" ? " mk-card-flash-up" : flash === "down" ? " mk-card-flash-down" : "";

  // Snapshot price once for chart baseline — never updated
  const initPriceRef = useRef(price);

  // isExpanding: true for 350ms after expand starts, controls sparkline morph overlay
  const [isExpanding, setIsExpanding] = useState(false);
  const expandTimerRef = useRef(null);
  useEffect(() => {
    if (isExpanded) {
      setIsExpanding(true);
      expandTimerRef.current = setTimeout(() => setIsExpanding(false), 350);
    } else {
      setIsExpanding(false);
      if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
    }
    return () => { if (expandTimerRef.current) clearTimeout(expandTimerRef.current); };
  }, [isExpanded]);

  const cardRef = useRef(null);
  useEffect(() => {
    if (isExpanded && cardRef.current) {
      setTimeout(() => cardRef.current.scrollIntoView({ behavior: getAnimScale() === 0 ? "auto" : "smooth", block: "nearest" }), 40);
    }
  }, [isExpanded]);

  // Show sparkline morph during expanding or closing transitions
  const showSparkMorph = (isExpanding || isClosing) && sparkData[ticker]?.["7D"];
  const showCompactSparkline = !isExpanded && !isClosing && !isExpanding && sparkData[ticker]?.["7D"];

  return (
    <div
      ref={cardRef}
      className={"mk-card" + (isExpanded ? " mk-card--expanded" : "") + (isClosing ? " mk-card--closing" : "")}
      onClick={!isExpanded && !isClosing ? () => onCardClick(ticker) : undefined}
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
          {showCompactSparkline && <MiniSparkline points={sparkData[ticker]?.["7D"]} isUp={isUp7d} fullWidth h={38} />}
          {showSparkMorph && (
            <div className="mk-spark-morph" style={{ animation: isClosing ? 'mkSparkMorphIn 220ms cubic-bezier(.25,.8,.25,1) 80ms both' : 'mkSparkMorphOut 220ms cubic-bezier(.25,.8,.25,1) both' }}>
              <MiniSparkline points={sparkData[ticker]?.["7D"]} isUp={isUp7d} fullWidth h={38} />
            </div>
          )}
          {(isExpanded || isClosing) && (
            <button
              className="mk-card-close-btn"
              style={{ animation: isClosing ? 'mkCloseBtnOut 150ms ease both' : 'mkCloseBtnIn 200ms ease 150ms both' }}
              onClick={e => { e.stopPropagation(); onCardClick(ticker); }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Price row — always visible */}
      <div className="mk-card-price-row">
        <div className={"mk-card-price-morph" + (isExpanded && !isClosing ? " mk-card-price-morph--expanded" : " mk-card-price-morph--compact") + priceColorCls + flashCls}><HxRoll value={fmtPrice(price)} dir={flash} /></div>
        <span className={"mk-card-badge " + badgeCls}>{prefix}{change24.toFixed(2)}% <span style={{opacity:.6,fontSize:9,marginLeft:2}}>24h</span></span>
      </div>

      {(isExpanded || isClosing) ? (
        /* Expanded: interactive chart + stats + action buttons */
        <div className="mk-card-exp-content">
          <div className="mk-chart-morph">
            <ExpandedCardChart ticker={ticker} initPrice={initPriceRef.current} chartData={sparkData[ticker]} />
          </div>
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
            <button className="mk-exp-wallet-btn" onClick={() => { if (onWalletAction) { onWalletAction(ticker); } else { localStorage.setItem("hx_wallet_coin", ticker); window.location.href = "wallet.html"; } }}>Wallet Actions</button>
          </div>
        </div>
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
function ExpandedCardChart({ ticker, initPrice, chartData, compact = false, period: periodProp, onPeriodChange, hidePeriods = false }) {
  const [periodInternal, setPeriodInternal] = useState("7D");
  const period = periodProp !== undefined ? periodProp : periodInternal;
  const setPeriod = p => {
    if (onPeriodChange) onPeriodChange(p);
    else setPeriodInternal(p);
  };
  const [hoverInfo, setHoverInfo] = useState(null);
  const canvasRef = useRef(null);
  const dataRef   = useRef(chartData || {});
  const hoverRef  = useRef(null);

  useEffect(() => {
    if (chartData) dataRef.current = chartData;
    redraw(period, null);
  }, [chartData, compact]);

  const redraw = (p, hIdx) => {
    const canvas = canvasRef.current;
    const data   = dataRef.current[p];
    if (!canvas || !data || !data.length) return;
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth || 700;
    const H   = canvas.offsetHeight || (compact ? 220 : 240);
    const padT = compact ? 20 : 24;
    const padB = compact ? 20 : 24;
    const padL = compact ? 58 : 66;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const toY = v => H - padB - ((v - min) / range) * (H - padT - padB);
    const toX = i => padL + (i / (data.length - 1)) * (W - padL);
    const isUp = data[data.length - 1] >= data[0];
    const color = isUp ? COLOR_UP : COLOR_DOWN;

    // Price labels on left axis (drawn first, behind chart)
    ctx.fillStyle = "rgba(255,255,255,.22)";
    ctx.font = `500 ${compact ? 9 : 10}px 'JetBrains Mono', monospace`;
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
  }, [period, compact]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => redraw(period, hoverRef.current));
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [period, compact, chartData]);

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
      {!hidePeriods && (
        <div className="mk-exp-periods-wrap">
          <div className="mk-exp-periods">
            {MK_CHART_PERIODS.map(p => (
              <button
                key={p}
                type="button"
                className={"mk-exp-period-btn" + (period === p ? " mk-exp-period-btn--active" : "")}
                onClick={() => setPeriod(p)}
              >{p}</button>
            ))}
          </div>
        </div>
      )}
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
function ExpandedCard({ ticker, rates, onClose, onTrade, onWalletAction }) {
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
        <button className="mk-exp-wallet-btn" onClick={() => { if (onWalletAction) { onWalletAction(ticker); } else { window.location.href = "wallet.html"; } }}>View in Wallet</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function mkListEmpty(filter, search, favorites) {
  if (filter === "favorites") {
    if (!favorites.length) return { title: "No favorites yet", message: "Star coins on the list to track them here." };
    return { title: "No matching favorites", message: "Try a different search or clear the filter." };
  }
  if (search.trim()) return { title: "No results", message: "No coins match your search. Try another symbol or name." };
  return { title: "No coins", message: "Nothing matches the current filter." };
}

function CardsView({ coins, rates, flashMap, sparkData, favorites, onStar, onTrade, onWalletAction, enterStagger, emptyTitle, emptyMessage }) {
  const [expandedCoin, setExpandedCoin] = useState(null);
  const [closingCoin, setClosingCoin] = useState(null);
  const gridRef = useRef(null);

  const closeTimerRef = useRef(null);

  // useCallback so CoinCard's onCardClick prop stays referentially stable across
  // live ticks (CardsView re-renders every tick) — otherwise the memo is defeated.
  const handleCardClick = useCallback(ticker => {
    if (expandedCoin === ticker) {
      setClosingCoin(ticker);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        setExpandedCoin(null);
        setClosingCoin(null);
        closeTimerRef.current = null;
      }, 350);
    } else {
      // If another card is closing, clear it immediately
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setClosingCoin(null);
      setExpandedCoin(ticker);
    }
  }, [expandedCoin]);

  // Cards stay in their original position — expanded card spans full width via grid-column: 1/-1

  if (coins.length === 0) {
    return window.EmptyState
      ? window.EmptyState({ icon: "⌕", title: emptyTitle || "No results", message: emptyMessage || "No coins match your search." })
      : <div className="mk-empty">No coins match your search.</div>;
  }

  return (
    <div className="mk-cards-grid" ref={gridRef}>
      {coins.map((ticker, i) => {
        const isExp = expandedCoin === ticker || closingCoin === ticker;
        const wrapStyle = {
          ...(enterStagger ? { animation: `rowStaggerIn 220ms ${EASE_SPRING} both`, animationDelay: `${Math.min(i * 30, 250)}ms` } : undefined),
          ...(isExp ? { gridColumn: "1 / -1" } : undefined),
        };
        return (
          <div key={ticker} style={Object.keys(wrapStyle).length ? wrapStyle : undefined}>
            <CoinCard
              ticker={ticker}
              price={getMkPrice(rates, ticker)}
              flash={flashMap[ticker] || null}
              sparkData={sparkData}
              onCardClick={handleCardClick}
              onTrade={onTrade}
              isExpanded={expandedCoin === ticker}
              isClosing={closingCoin === ticker}
              isFav={favorites.includes(ticker)}
              onStar={onStar}
              onWalletAction={onWalletAction}
            />
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MarketsTable
// ═══════════════════════════════════════════════════════════════════
function MarketsTable({ coins, rates, flashMap, sparkData, favorites, onStar, onRowClick, onTrade, enterStagger, emptyTitle, emptyMessage }) {
  return (
    <div className="mk-table-wrap">
      <div className="mk-table-scroll">
      <div className="mk-table-head">
        <div className="mk-th mk-th--center">#</div>
        <div className="mk-th">Coin</div>
        <div className="mk-th mk-th--right">Price</div>
        <div className="mk-th mk-th--right">24h</div>
        <div className="mk-th mk-th--right mk-col-7d-pct">7d %</div>
        <div className="mk-th mk-th--center mk-col-chart mk-col-7d-chart" title="7-day price trend">7d chart</div>
        <div className="mk-th mk-th--right mk-col-mcap">Market cap</div>
        <div className="mk-th mk-th--right mk-col-vol">Volume</div>
        <div className="mk-th mk-col-action"></div>
      </div>
      {coins.length === 0
        ? (window.EmptyState
          ? window.EmptyState({ icon: "⌕", title: emptyTitle || "No results", message: emptyMessage || "No coins match your search." })
          : <div className="mk-empty">No coins match your search.</div>)
        : coins.map((ticker, i) => (
          <div key={ticker} style={enterStagger ? { animation: `rowStaggerIn 220ms ${EASE_SPRING} both`, animationDelay: `${Math.min(i * 30, 250)}ms` } : undefined}>
            <MarketRow
              ticker={ticker}
              rank={i + 1}
              price={getMkPrice(rates, ticker)}
              mcap={getMarketCap(rates, ticker)}
              flash={flashMap[ticker] || null}
              sparkData={sparkData}
              isFav={favorites.includes(ticker)}
              onStar={onStar}
              onRowClick={onRowClick}
              onTrade={onTrade}
            />
          </div>
        ))
      }
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// CoinDetailModal — compact table-row detail (same controls as card expand)
// ═══════════════════════════════════════════════════════════════════
function CoinDetailModal({ ticker, rates, sparkData, isFav, onStar, onClose, onTrade, onWalletAction }) {
  const info      = COINS[ticker];
  const price     = getMkPrice(rates, ticker);
  const marketCap = price * MOCK_SUPPLY[ticker];
  const initPriceRef = useRef(price);
  const [period, setPeriod] = useState("7D");
  const series = sparkData?.[ticker];
  const changePct = getPeriodChangePct(ticker, period, series);

  const badgeCls   = changePct > 0 ? "mk-modal-badge--up" : changePct < 0 ? "mk-modal-badge--down" : "mk-modal-badge--flat";
  const prefix     = changePct > 0 ? "+" : "";
  const priceColor = changePct > 0 ? COLOR_UP : changePct < 0 ? COLOR_DOWN : "rgba(255,255,255,.95)";

  return (
    <div className="mk-overlay" onClick={onClose}>
      <div className="mk-modal mk-modal--detail" onClick={e => e.stopPropagation()}>
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
        <div className="mk-modal-price-toolbar">
          <div className="mk-modal-price-main">
            <div className="mk-modal-price" style={{ color: priceColor }}>{fmtPrice(price)}</div>
            <div className={"mk-modal-badge " + badgeCls}>
              {prefix}{changePct.toFixed(2)}%
              <span style={{ marginLeft: 4, opacity: .65, fontSize: 10 }}>{period}</span>
            </div>
          </div>
          <div className="mk-modal-periods mk-exp-periods">
            {MK_CHART_PERIODS.map(p => (
              <button
                key={p}
                type="button"
                className={"mk-exp-period-btn" + (period === p ? " mk-exp-period-btn--active" : "")}
                onClick={e => { e.stopPropagation(); setPeriod(p); }}
              >{p}</button>
            ))}
          </div>
        </div>
        {series && (
          <div className="mk-modal-chart-area">
            <ExpandedCardChart
              ticker={ticker}
              initPrice={initPriceRef.current}
              chartData={series}
              compact
              period={period}
              onPeriodChange={setPeriod}
              hidePeriods
            />
          </div>
        )}
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
            <div className="mk-exp-stat-label">{period} Change</div>
            <div className="mk-exp-stat-val" style={{ color: changePct >= 0 ? COLOR_UP : COLOR_DOWN }}>
              {prefix}{changePct.toFixed(2)}%
            </div>
          </div>
          <div className="mk-exp-stat">
            <div className="mk-exp-stat-label">All-Time High</div>
            <div className="mk-exp-stat-val">{fmtPrice(MOCK_ATH[ticker])}</div>
          </div>
        </div>
        <div className="mk-exp-footer">
          <button className="mk-exp-buy-btn" onClick={() => onTrade(ticker)}>Buy ›</button>
          <button className="mk-exp-wallet-btn" onClick={() => { if (onWalletAction) { onWalletAction(ticker); } else { localStorage.setItem("hx_wallet_coin", ticker); window.location.href = "wallet.html"; } }}>Wallet Actions</button>
        </div>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════
// MarketsPage (root)
// ═══════════════════════════════════════════════════════════════════
const CONVERTER_COINS = ["BTC","ETH","USDT","SOL","BNB","XRP","USDC"];
const MK_PILL_ORDER = ["all", "favorites", "gainers", "losers", "volume"];

export default function MarketsPage({ embedded = false, onWalletAction, onBuyConvert }) {
  useEffect(() => { injectMarketsCSS(); }, []);

  const [pageLoading, setPageLoading] = useState(() => getAnimScale() > 0);
  useEffect(() => {
    const t = setTimeout(() => setPageLoading(false), animMs(350));
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onFlow = () => setFlowPreview(typeof window.getFlowPreview === "function" ? window.getFlowPreview() : "none");
    window.addEventListener("hx-flow-preview", onFlow);
    return () => window.removeEventListener("hx-flow-preview", onFlow);
  }, []);

  const [rates, setRates] = useState(() => window.HxMarket.getRates());
  const [flashMap, setFlashMap] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [flowPreview, setFlowPreview] = useState(() => (typeof window.getFlowPreview === "function" ? window.getFlowPreview() : "none"));
  const prevFilter = useRef(null);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [view, setView] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.has("card") ? "cards" : p.has("list") ? "table" : "table";
  });
  const prevView = useRef(null);

  const handleSetView = v => {
    prevView.current = view;
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

  const toggleFav = useCallback((ticker, e) => {
    e.stopPropagation();
    const removing = favorites.includes(ticker);
    if (removing) playUnstarSound(); else playStarSound();
    setFavorites(prev => {
      const next = removing ? prev.filter(t => t !== ticker) : [...prev, ticker];
      localStorage.setItem("hx_favorites", JSON.stringify(next));
      return next;
    });
  }, [favorites]);

  // Spark data generated once on mount, never changes
  const [sparkData] = useState(() => {
    const data = {};
    COIN_RANKS.forEach(ticker => {
      const price = getMkPrice(BASE_RATES, ticker);
      data[ticker] = {
        "1D": genChartData(price, 60,  0.007),
        "7D": genChartData(price, 80,  0.018),
        "1M": genChartData(price, 80,  0.042),
        "3M": genChartData(price, 80,  0.085),
      };
    });
    return data;
  });

  // Live ticking — single shared HxMarket feed (all coins, all pages in sync)
  const flashTimerRef = useRef(null);
  useEffect(() => {
    const unsub = window.HxMarket.subscribe((m) => {
      setRates(m.getRates());
      setFlashMap(m.getDirs());
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashMap({}), animMs(550));
    });
    return () => {
      unsub();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Trade: navigate to Convert with coin pre-selected
  const handleTrade = useCallback(ticker => {
    const target = CONVERTER_COINS.includes(ticker) ? ticker : "BTC";
    if (onBuyConvert) {
      onBuyConvert(target);
    } else {
      localStorage.setItem("hx_convert_coin", target);
      window.location.href = "index.html";
    }
  }, [onBuyConvert]);

  // Stable row-click handler (passed to memo'd MarketRow).
  const handleRowClick = useCallback(ticker => setSelectedCoin(ticker), []);

  // Apply filter + search
  const visibleCoins = useMemo(() => {
    let list = [...COIN_RANKS];
    if (filter === "favorites") {
      list = list.filter(t => favorites.includes(t));
    } else if (filter === "gainers") {
      list.sort((a, b) => (MOCK_CHANGES[b] ?? 0) - (MOCK_CHANGES[a] ?? 0));
    } else if (filter === "losers") {
      list.sort((a, b) => (MOCK_CHANGES[a] ?? 0) - (MOCK_CHANGES[b] ?? 0));
    } else if (filter === "volume") {
      list.sort((a, b) => (MOCK_VOLUME[b] ?? 0) - (MOCK_VOLUME[a] ?? 0));
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(t => t.toLowerCase().includes(q) || COINS[t].name.toLowerCase().includes(q));
    return list;
  }, [filter, search, favorites]);

  const listEmpty = mkListEmpty(filter, search, favorites);
  const flowRetry = () => { if (typeof window.setFlowPreview === "function") window.setFlowPreview("none"); };

  return (
    <div className="mk-root" style={embedded ? { paddingTop: 0, minHeight: "auto" } : undefined}>
      {!embedded && <NavBar active="markets" />}
      <div className="mk-container" style={embedded ? { maxWidth: "none", padding: "0 0 40px" } : undefined}>
        {pageLoading ? <MarketsPageSkeleton view={view} /> : <div style={{ animation: 'hxSkFadeIn 250ms ease' }}>
        <FilterRow
          search={search} setSearch={setSearch}
          filter={filter} setFilter={(f) => { prevFilter.current = filter; setFilter(f); }}
          view={view} setView={handleSetView}
          favorites={favorites}
        />
        {(() => {
          const pf = prevFilter.current;
          const pv = prevView.current;
          const isFirstRender = (pf === null && pv === null);
          const filterChanged = pf !== null && pf !== filter;
          const goRight = filterChanged && MK_PILL_ORDER.indexOf(filter) > MK_PILL_ORDER.indexOf(pf);
          let contentAnim = {};
          if (!isFirstRender && isAnimOn()) {
            if (filterChanged && isHeavy()) {
              contentAnim = { animation: `${goRight ? "tabSlideInLeft" : "tabSlideInRight"} 280ms ${EASE_SPRING} both` };
            } else if (filterChanged) {
              contentAnim = { animation: `tabFadeIn 180ms ${EASE_SMOOTH} both` };
            } else {
              // View toggle — always fade, no directional slide
              contentAnim = { animation: `tabFadeIn ${isHeavy() ? 220 : 150}ms ${getEasing()} both` };
            }
          }
          return (
            <div key={filter + "-" + view} style={contentAnim}>
              {flowPreview === "rate" && window.FlowDeadEnd ? (
                window.FlowDeadEnd({ variant: "rate", fill: true, onAction: flowRetry })
              ) : view === "table" ? (
                <MarketsTable
                  coins={visibleCoins}
                  rates={rates}
                  flashMap={flashMap}
                  sparkData={sparkData}
                  favorites={favorites}
                  onStar={toggleFav}
                  onRowClick={handleRowClick}
                  onTrade={handleTrade}
                  enterStagger={isHeavy()}
                  emptyTitle={listEmpty.title}
                  emptyMessage={listEmpty.message}
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
                  onWalletAction={onWalletAction}
                  enterStagger={isHeavy()}
                  emptyTitle={listEmpty.title}
                  emptyMessage={listEmpty.message}
                />
              )}
            </div>
          );
        })()}
        </div>}
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
          onWalletAction={onWalletAction}
        />
      )}
    </div>
  );
}

window.MarketsPage = MarketsPage;
AppPages.register("markets", {
  component: MarketsPage,
  label: "Markets",
  notchTab: false,
  fullWidth: true,
});
