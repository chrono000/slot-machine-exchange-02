// ═══════════════════════════════════════════════════════════════════
// TradePage — pro trade terminal
// ───────────────────────────────────────────────────────────────────
// Hand-rolled canvas candlestick chart + volume, live order book ladder,
// recent-trades tape, market/limit order ticket, and open-orders panel
// with limit fills simulated off HxMarket ticks. All data is synthesized
// client-side from the shared HxMarket feed (no libraries, no network).
//
// Data:   HxMarket (shared.js) — prices/dirs/history
// Coins:  COINS, fmtPrice/fmtUSD/fmtBal/addCommas (shared.js)
// Reels:  HxRoll (shared.js)
// ═══════════════════════════════════════════════════════════════════

const HxRoll = window.HxRoll;

const TP_PAIRS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "POL", "HYPE", "XMR"];
const TP_PAIR_KEY = "hx_trade_pair";
const TP_ORDERS_KEY = "hx_trade_open_orders";
const TP_HISTORY_KEY = "hx_trade_order_history";
const TP_CANDLE_TICKS = 8;          // HxMarket ticks per candle (~28s "5m" demo candles)
const TP_BOOK_LEVELS = 11;
const TP_WHALE_USD = 50000;

// ── Price formatting helpers (book/ticket need consistent decimals) ──
function tpDecimals(p) {
  if (p >= 1000) return 2;
  if (p >= 1) return 4;
  return 6;
}
function tpFmt(p, decimals) {
  const d = decimals != null ? decimals : tpDecimals(p);
  const parts = p.toFixed(d).split(".");
  return addCommas(parts[0]) + (parts[1] ? "." + parts[1] : "");
}

// ── Seeded synthetic candle history, then live-extended by ticks ──
function tpSeedCandles(ticker, count) {
  const rand = makeSeededRand("tp-candles-" + ticker);
  const last = HxMarket.getPrice(ticker);
  let close = last;
  const out = [];
  for (let i = 0; i < count; i++) {
    const range = close * (0.0015 + rand() * 0.004);
    const open = close * (1 + (rand() - 0.5) * 0.004);
    const high = Math.max(open, close) + range * rand();
    const low = Math.min(open, close) - range * rand();
    const vol = 0.25 + rand() * 0.75;
    out.unshift({ open, high, low, close, vol });
    close = open * (1 + (rand() - 0.5) * 0.003);
  }
  return out;
}

// ── Seeded order-book level sizes (jittered per tick) ──
function tpBookSide(ticker, side, mid, tickN) {
  const rand = makeSeededRand("tp-book-" + ticker + side + (tickN % 7));
  const step = mid * 0.00042;
  const rows = [];
  let cum = 0;
  for (let i = 1; i <= TP_BOOK_LEVELS; i++) {
    const price = side === "ask" ? mid + step * i : mid - step * i;
    const size = (0.2 + rand() * 1.6) * (1 + i * 0.22) * (mid > 1000 ? 1 : mid > 1 ? 120 : 24000);
    cum += size;
    rows.push({ price, size, cum });
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════
(function injectTpCSS() {
  if (document.getElementById("tp-styles")) return;
  const st = document.createElement("style");
  st.id = "tp-styles";
  st.textContent = `
.tp-root{color:rgba(255,255,255,.85);font-family:'JetBrains Mono',ui-monospace,monospace}
.tp-panel{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden}
.tp-panel-title{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.35);padding:10px 14px 8px}

/* Header / stats bar */
.tp-head{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:12px 16px;margin-bottom:10px}
.tp-pair-btn{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:7px 12px;cursor:pointer;font-family:inherit;color:rgba(255,255,255,.9);font-size:14px;font-weight:700;letter-spacing:.02em;transition:background 140ms}
.tp-pair-btn:hover{background:rgba(255,255,255,.09)}
.tp-pair-icon{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.tp-pair-caret{font-size:9px;opacity:.45}
.tp-last{font-size:22px;font-weight:700;letter-spacing:-.5px}
.tp-last--up{color:#4ade80}.tp-last--down{color:#f87171}
.tp-stat{display:flex;flex-direction:column;gap:2px}
.tp-stat-label{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.3)}
.tp-stat-val{font-size:12px;font-weight:600;color:rgba(255,255,255,.78);font-variant-numeric:tabular-nums}
.tp-stat-val--up{color:#4ade80}.tp-stat-val--down{color:#f87171}

/* Live mode */
.tp-live-btn{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:7px 12px;cursor:pointer;font-family:inherit;color:rgba(255,255,255,.55);font-size:11px;font-weight:700;letter-spacing:.06em;transition:all 140ms}
.tp-live-btn:hover{background:rgba(255,255,255,.08)}
.tp-live-btn--on{background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.4);color:#4ade80}
.tp-live-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);flex-shrink:0}
.tp-live-btn--on .tp-live-dot{background:#4ade80;box-shadow:0 0 6px rgba(74,222,128,.7);animation:tpLivePulse 1.6s ease-in-out infinite}
@keyframes tpLivePulse{0%,100%{opacity:1}50%{opacity:.45}}
.tp-acct{display:flex;align-items:center;gap:8px;font-size:10px}
.tp-acct-email{color:rgba(255,255,255,.5);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tp-acct-out,.tp-acct-in{height:28px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.65);font-family:inherit;font-size:10px;font-weight:600;cursor:pointer;transition:all 130ms}
.tp-acct-out:hover,.tp-acct-in:hover{background:rgba(255,255,255,.09);color:rgba(255,255,255,.9)}
.tp-acct-in{border-color:rgba(74,222,128,.35);color:#4ade80}
.tp-src-badge{font-size:8px;font-weight:700;letter-spacing:.08em;padding:2px 6px;border-radius:5px;margin-left:8px;vertical-align:middle}
.tp-src-badge--live{background:rgba(74,222,128,.12);color:#4ade80}
.tp-src-badge--sim{background:rgba(255,255,255,.06);color:rgba(255,255,255,.35)}

/* Alerts */
.tp-alert-btn{position:relative;display:flex;align-items:center;gap:6px;margin-left:auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:7px 12px;cursor:pointer;font-family:inherit;color:rgba(255,255,255,.6);font-size:11px;font-weight:600;letter-spacing:.03em;transition:all 140ms}
.tp-alert-btn:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.85)}
.tp-alert-badge{min-width:15px;height:15px;border-radius:8px;background:rgba(255,210,80,.9);color:#1a1405;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}
.tp-alert-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:60;width:264px;background:rgba(16,16,24,.97);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;box-shadow:0 18px 60px rgba(0,0,0,.5)}
.tp-alert-title{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:10px}
.tp-alert-cond-row{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px}
.tp-alert-cond{height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);font-family:inherit;font-size:10px;font-weight:600;cursor:pointer;transition:all 120ms}
.tp-alert-cond--on{background:rgba(255,210,80,.12);border-color:rgba(255,210,80,.4);color:rgba(255,210,80,.95)}
.tp-alert-add-row{display:flex;gap:6px;margin-bottom:4px}
.tp-alert-input{flex:1;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);padding:0 10px;font-family:inherit;font-size:12px;font-weight:600;color:rgba(255,255,255,.9);outline:none;font-variant-numeric:tabular-nums;min-width:0}
.tp-alert-input:focus{border-color:rgba(255,210,80,.4)}
.tp-alert-add{height:32px;padding:0 12px;border-radius:8px;border:0;background:rgba(255,210,80,.85);color:#1a1405;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;transition:filter 130ms}
.tp-alert-add:hover{filter:brightness(1.08)}
.tp-alert-list{margin-top:10px;border-top:1px solid rgba(255,255,255,.07);padding-top:8px;max-height:170px;overflow-y:auto}
.tp-alert-row{display:flex;align-items:center;gap:8px;padding:5px 2px;font-size:11px;font-variant-numeric:tabular-nums}
.tp-alert-row-tk{font-weight:700;width:42px}
.tp-alert-row-cond{color:rgba(255,255,255,.45);flex:1}
.tp-alert-del{width:20px;height:20px;border-radius:6px;border:0;background:transparent;color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all 120ms;flex-shrink:0}
.tp-alert-del:hover{background:rgba(248,113,113,.12);color:rgba(248,113,113,.85)}
.tp-alert-empty{font-size:10px;color:rgba(255,255,255,.28);text-align:center;padding:8px 0 4px;line-height:1.5}

/* Pair dropdown */
.tp-pair-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:60;min-width:230px;background:rgba(16,16,24,.97);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:6px;box-shadow:0 18px 60px rgba(0,0,0,.5);max-height:320px;overflow-y:auto}
.tp-pair-row{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;cursor:pointer;font-family:inherit;color:rgba(255,255,255,.8);font-size:12px;transition:background 120ms}
.tp-pair-row:hover{background:rgba(255,255,255,.06)}
.tp-pair-row--on{background:rgba(255,255,255,.08)}
.tp-pair-row-name{flex:1;text-align:left;font-weight:600}
.tp-pair-row-price{font-size:11px;color:rgba(255,255,255,.45);font-variant-numeric:tabular-nums}

/* Grid */
.tp-grid{display:grid;grid-template-columns:minmax(0,1fr) 250px 230px;gap:10px;margin-bottom:10px}
.tp-grid-bottom{display:grid;grid-template-columns:330px minmax(0,1fr);gap:10px}
@media(max-width:1080px){.tp-grid{grid-template-columns:minmax(0,1fr) 230px}.tp-trades-panel{display:none}}
@media(max-width:840px){.tp-grid{grid-template-columns:minmax(0,1fr)}.tp-book-panel{display:none}.tp-grid-bottom{grid-template-columns:minmax(0,1fr)}}

/* Chart */
.tp-chart-wrap{position:relative;height:380px}
.tp-chart-canvas{display:block;width:100%;height:100%}
.tp-chart-hud{position:absolute;top:8px;left:12px;font-size:10px;color:rgba(255,255,255,.5);display:flex;gap:12px;pointer-events:none;font-variant-numeric:tabular-nums}
.tp-chart-hud b{color:rgba(255,255,255,.8);font-weight:600}

/* Order book */
.tp-book{padding:0 0 8px;font-variant-numeric:tabular-nums}
.tp-book-head,.tp-book-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:2px 14px;font-size:10.5px}
.tp-book-head{color:rgba(255,255,255,.28);letter-spacing:.05em;text-transform:uppercase;font-size:9px;padding-bottom:6px}
.tp-book-row{position:relative;line-height:1.7;cursor:pointer}
.tp-book-row:hover{background:rgba(255,255,255,.04)}
.tp-book-bar{position:absolute;top:1px;bottom:1px;right:0;opacity:.1;border-radius:2px;pointer-events:none}
.tp-book-row--ask .tp-book-bar{background:#f87171}
.tp-book-row--bid .tp-book-bar{background:#4ade80}
.tp-book-price{position:relative;z-index:1}
.tp-book-row--ask .tp-book-price{color:#f87171}
.tp-book-row--bid .tp-book-price{color:#4ade80}
.tp-book-size{position:relative;z-index:1;text-align:right;color:rgba(255,255,255,.55)}
.tp-book-mid{display:flex;align-items:center;justify-content:center;gap:7px;padding:7px 0;margin:4px 10px;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);font-size:14px;font-weight:700}
.tp-book-mid--up{color:#4ade80}.tp-book-mid--down{color:#f87171}
.tp-book-mid-arrow{font-size:11px}
.tp-spread{font-size:9px;color:rgba(255,255,255,.3);text-align:center;padding-bottom:4px;letter-spacing:.04em}

/* Trades tape */
.tp-trades{padding:0 0 8px;font-variant-numeric:tabular-nums;max-height:420px;overflow:hidden}
.tp-trade-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;padding:2.5px 14px;font-size:10.5px;line-height:1.6;animation:tpTradeIn 240ms ease}
@keyframes tpTradeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.tp-trade-row--whale{background:rgba(251,191,36,.06);box-shadow:inset 2px 0 0 rgba(251,191,36,.5)}
.tp-trade-price--buy{color:#4ade80}.tp-trade-price--sell{color:#f87171}
.tp-trade-size{color:rgba(255,255,255,.5);text-align:right}
.tp-trade-time{color:rgba(255,255,255,.25);text-align:right}
.tp-whale-ico{font-size:9px;margin-left:4px}

/* Ticket */
.tp-ticket{padding:14px}
.tp-side-toggle{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}
.tp-side-btn{height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:rgba(255,255,255,.45);font-family:inherit;font-size:12px;font-weight:700;letter-spacing:.05em;cursor:pointer;transition:all 140ms}
.tp-side-btn--buy-on{background:rgba(74,222,128,.14);border-color:rgba(74,222,128,.45);color:#4ade80}
.tp-side-btn--sell-on{background:rgba(248,113,113,.14);border-color:rgba(248,113,113,.45);color:#f87171}
.tp-type-row{display:flex;gap:6px;margin-bottom:12px}
.tp-type-btn{flex:1;height:26px;border-radius:7px;border:1px solid transparent;background:transparent;color:rgba(255,255,255,.35);font-family:inherit;font-size:10px;font-weight:600;letter-spacing:.06em;cursor:pointer;text-transform:uppercase;transition:all 130ms}
.tp-type-btn--on{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.85)}
.tp-field{margin-bottom:10px}
.tp-field-label{display:flex;justify-content:space-between;font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.32);margin-bottom:5px}
.tp-field-bal{cursor:pointer;color:rgba(255,255,255,.45)}
.tp-field-bal:hover{color:rgba(255,255,255,.7);text-decoration:underline}
.tp-input-wrap{position:relative}
.tp-input{width:100%;height:40px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);padding:0 52px 0 12px;font-family:inherit;font-size:14px;font-weight:600;color:rgba(255,255,255,.92);outline:none;font-variant-numeric:tabular-nums;box-sizing:border-box;transition:border-color 140ms}
.tp-input:focus{border-color:rgba(255,255,255,.25)}
.tp-input-suffix{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:10px;color:rgba(255,255,255,.3);font-weight:600;pointer-events:none}
.tp-pct-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:8px 0 12px}
.tp-pct-btn{height:24px;border-radius:6px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);font-family:inherit;font-size:10px;font-weight:600;cursor:pointer;transition:all 120ms}
.tp-pct-btn:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.75)}
.tp-total-row{display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.45);padding:9px 2px;border-top:1px solid rgba(255,255,255,.06);font-variant-numeric:tabular-nums}
.tp-total-val{color:rgba(255,255,255,.8);font-weight:600}
.tp-submit{width:100%;height:42px;border-radius:10px;border:0;font-family:inherit;font-size:13px;font-weight:700;letter-spacing:.05em;cursor:pointer;transition:filter 140ms,opacity 140ms;margin-top:4px}
.tp-submit--buy{background:linear-gradient(135deg,rgba(74,222,128,.92),rgba(74,222,128,.65));color:#06140b}
.tp-submit--sell{background:linear-gradient(135deg,rgba(248,113,113,.92),rgba(248,113,113,.65));color:#190808}
.tp-submit:hover{filter:brightness(1.07)}
.tp-submit:disabled{opacity:.35;cursor:default;filter:none}
.tp-ticket-err{font-size:10px;color:rgba(248,113,113,.85);margin-top:8px;text-align:center;min-height:13px}

/* Orders panel */
.tp-orders-tabs{display:flex;gap:4px;padding:10px 12px 0}
.tp-orders-tab{height:28px;padding:0 14px;border-radius:8px;border:1px solid transparent;background:transparent;color:rgba(255,255,255,.35);font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;letter-spacing:.03em;transition:all 130ms}
.tp-orders-tab--on{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.85)}
.tp-orders-count{font-size:9px;opacity:.6;margin-left:4px}
.tp-orders-head,.tp-order-row{display:grid;grid-template-columns:64px 56px 1fr 1fr 1fr 72px;gap:8px;padding:5px 16px;font-size:10.5px;align-items:center;font-variant-numeric:tabular-nums}
.tp-orders-head{color:rgba(255,255,255,.28);text-transform:uppercase;letter-spacing:.05em;font-size:9px;padding-top:10px}
.tp-order-row{border-top:1px solid rgba(255,255,255,.04);line-height:1.6}
.tp-order-side--buy{color:#4ade80;font-weight:700}.tp-order-side--sell{color:#f87171;font-weight:700}
.tp-order-num{color:rgba(255,255,255,.6)}
.tp-order-status{font-size:9px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
.tp-order-status--open{color:rgba(110,160,255,.85)}
.tp-order-status--filled{color:#4ade80}
.tp-order-status--cancelled{color:rgba(255,255,255,.3)}
.tp-order-cancel{height:22px;padding:0 10px;border-radius:6px;border:1px solid rgba(248,113,113,.3);background:transparent;color:rgba(248,113,113,.8);font-family:inherit;font-size:9px;font-weight:600;cursor:pointer;transition:all 120ms}
.tp-order-cancel:hover{background:rgba(248,113,113,.12)}
@media(max-width:700px){.tp-orders-head,.tp-order-row{grid-template-columns:54px 48px 1fr 1fr 64px;font-size:10px}.tp-order-col-total{display:none}}

/* Toast (sits above the ticker tape) */
.tp-toast{position:fixed;bottom:44px;left:50%;transform:translateX(-50%);background:#1e1e2e;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 16px;font-size:12px;font-weight:600;color:rgba(255,255,255,.88);z-index:1180;white-space:nowrap;animation:tpToastIn 240ms cubic-bezier(.2,.8,.2,1);font-family:'JetBrains Mono',ui-monospace,monospace}
@keyframes tpToastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.tp-toast--buy{box-shadow:inset 3px 0 0 #4ade80}
.tp-toast--sell{box-shadow:inset 3px 0 0 #f87171}
`;
  document.head.appendChild(st);
})();

// ═══════════════════════════════════════════════════════════════════
// CandleChart — hand-rolled canvas candlesticks + volume + crosshair
// ═══════════════════════════════════════════════════════════════════
const CandleChart = React.memo(function CandleChart({ ticker, candles, lastPrice }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const hoverRef = useRef(null);
  const [hover, setHover] = useState(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !candles.length) return;
    const dpr = window.devicePixelRatio || 1;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const padR = 64, padT = 26, padB = 6;
    const volH = Math.round(H * 0.16);
    const priceH = H - padT - padB - volH - 8;

    let lo = Infinity, hi = -Infinity, maxVol = 0;
    candles.forEach(c => {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
      if (c.vol > maxVol) maxVol = c.vol;
    });
    const span = (hi - lo) || 1;
    lo -= span * 0.05; hi += span * 0.05;

    const y = p => padT + (hi - p) / (hi - lo) * priceH;
    const n = candles.length;
    const slot = (W - padR) / n;
    const bw = Math.max(2, Math.floor(slot * 0.62));

    // gridlines + axis labels
    ctx.font = "9px 'JetBrains Mono',monospace";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const p = hi - (hi - lo) * (i / 4);
      const yy = y(p);
      ctx.strokeStyle = "rgba(255,255,255,.045)";
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W - padR + 4, yy); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.fillText(tpFmt(p), W - padR + 8, yy);
    }

    // candles + volume
    candles.forEach((c, i) => {
      const x = Math.round(i * slot + slot / 2);
      const up = c.close >= c.open;
      const col = up ? "#4ade80" : "#f87171";
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, y(c.high));
      ctx.lineTo(x + 0.5, y(c.low));
      ctx.stroke();
      const yo = y(c.open), yc = y(c.close);
      const bodyY = Math.min(yo, yc);
      const bodyH = Math.max(1, Math.abs(yo - yc));
      ctx.globalAlpha = up ? 0.9 : 0.9;
      ctx.fillRect(x - bw / 2, bodyY, bw, bodyH);
      ctx.globalAlpha = 0.32;
      const vh = (c.vol / maxVol) * volH;
      ctx.fillRect(x - bw / 2, H - padB - vh, bw, vh);
      ctx.globalAlpha = 1;
    });

    // last-price dashed line + tag
    const lp = lastPrice || candles[n - 1].close;
    if (lp >= lo && lp <= hi) {
      const yy = y(lp);
      const up = candles[n - 1].close >= candles[n - 1].open;
      ctx.strokeStyle = up ? "rgba(74,222,128,.55)" : "rgba(248,113,113,.55)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W - padR + 4, yy); ctx.stroke();
      ctx.setLineDash([]);
      const tag = tpFmt(lp);
      const tw = ctx.measureText(tag).width + 10;
      ctx.fillStyle = up ? "#173321" : "#331719";
      ctx.strokeStyle = up ? "rgba(74,222,128,.6)" : "rgba(248,113,113,.6)";
      ctx.beginPath();
      ctx.roundRect(W - padR + 4, yy - 8, tw, 16, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = up ? "#4ade80" : "#f87171";
      ctx.fillText(tag, W - padR + 9, yy);
    }

    // crosshair
    const hv = hoverRef.current;
    if (hv) {
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(hv.x + 0.5, padT - 8); ctx.lineTo(hv.x + 0.5, H - padB); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, hv.y + 0.5); ctx.lineTo(W - padR + 4, hv.y + 0.5); ctx.stroke();
      ctx.setLineDash([]);
      const p = hi - ((hv.y - padT) / priceH) * (hi - lo);
      if (p >= lo && p <= hi) {
        const tag = tpFmt(p);
        const tw = ctx.measureText(tag).width + 10;
        ctx.fillStyle = "#23232f";
        ctx.beginPath(); ctx.roundRect(W - padR + 4, hv.y - 8, tw, 16, 4); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.fillText(tag, W - padR + 9, hv.y);
      }
    }
  }, [candles, lastPrice]);

  useLayoutEffect(draw, [draw, hover]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  const onMove = e => {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, yy = e.clientY - rect.top;
    const n = candles.length;
    const slot = (rect.width - 64) / n;
    const idx = Math.min(n - 1, Math.max(0, Math.floor(x / slot)));
    hoverRef.current = { x, y: yy, idx };
    setHover({ x: Math.round(x), y: Math.round(yy), idx });
  };
  const onLeave = () => { hoverRef.current = null; setHover(null); };

  const hc = hover ? candles[hover.idx] : null;
  return (
    <div ref={wrapRef} className="tp-chart-wrap" onMouseMove={onMove} onMouseLeave={onLeave}>
      <canvas ref={canvasRef} className="tp-chart-canvas" />
      <div className="tp-chart-hud">
        {hc ? (
          <>
            <span>O <b>{tpFmt(hc.open)}</b></span>
            <span>H <b>{tpFmt(hc.high)}</b></span>
            <span>L <b>{tpFmt(hc.low)}</b></span>
            <span>C <b style={{ color: hc.close >= hc.open ? "#4ade80" : "#f87171" }}>{tpFmt(hc.close)}</b></span>
          </>
        ) : (
          <span>{ticker}/USDT · 5m · live</span>
        )}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// TradePage
// ═══════════════════════════════════════════════════════════════════
function TradePage({ embedded, onNavigate }) {
  const [pair, setPair] = useState(() => {
    try {
      const saved = localStorage.getItem(TP_PAIR_KEY);
      if (saved && TP_PAIRS.includes(saved)) return saved;
    } catch (e) {}
    return "BTC";
  });
  const [pairMenuOpen, setPairMenuOpen] = useState(false);
  const pairMenuRef = useRef(null);

  // Tick-driven snapshot of the feed
  const [tickN, setTickN] = useState(0);
  const [candles, setCandles] = useState(() => tpSeedCandles(pair, 64));
  const candleTickRef = useRef(0);
  const [trades, setTrades] = useState([]);
  const tradeIdRef = useRef(0);

  // Demo balances (session-local; market fills adjust them)
  const [balances, setBalances] = useState(() =>
    Object.fromEntries(Object.entries(COINS).map(([t, info]) => [t, info.balance]))
  );

  // Orders
  const [openOrders, setOpenOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TP_ORDERS_KEY) || "[]"); } catch (e) { return []; }
  });
  const [orderHistory, setOrderHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TP_HISTORY_KEY) || "[]"); } catch (e) { return []; }
  });
  const orderIdRef = useRef(
    [...(openOrders || []), ...(orderHistory || [])].reduce((m, o) => Math.max(m, o.id || 0), 0) + 1
  );
  useEffect(() => {
    try { localStorage.setItem(TP_ORDERS_KEY, JSON.stringify(openOrders)); } catch (e) {}
  }, [openOrders]);
  useEffect(() => {
    try { localStorage.setItem(TP_HISTORY_KEY, JSON.stringify(orderHistory.slice(0, 40))); } catch (e) {}
  }, [orderHistory]);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = useCallback((side, msg) => {
    setToast({ side, msg });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const M = window.HxMarket;
  const price = M.getPrice(pair);
  const dir = M.getDir(pair);
  const change = M.getChange(pair);
  const liveSymbol = pair.toLowerCase() + "-usdt";

  // ── Live exchange mode (HxApi → api.hollaex.com) ──
  const [live, setLive] = useState(() => window.HxApi.isLive());
  const liveTicker = live ? M.getLiveTicker(pair) : null;
  const [authed, setAuthed] = useState(() => window.HxApi.isAuthed());
  const [liveUser, setLiveUser] = useState(() => window.HxApi.getCachedUser());
  useEffect(() => {
    const onLive = () => setLive(window.HxApi.isLive());
    const onAuth = () => setAuthed(window.HxApi.isAuthed());
    window.addEventListener("hx-live-change", onLive);
    window.addEventListener("hx-auth-change", onAuth);
    return () => {
      window.removeEventListener("hx-live-change", onLive);
      window.removeEventListener("hx-auth-change", onAuth);
    };
  }, []);
  useEffect(() => {
    if (live && authed) window.HxApi.getUser().then(setLiveUser).catch(() => {});
    else setLiveUser(null);
  }, [live, authed]);

  // Real order book + trades for the current pair (poll while live)
  const [liveBook, setLiveBook] = useState(null);
  const [liveTrades, setLiveTrades] = useState(null);
  useEffect(() => {
    if (!live) { setLiveBook(null); setLiveTrades(null); return; }
    let stopped = false;
    const load = () => {
      window.HxApi.getOrderbook(liveSymbol)
        .then(d => { if (!stopped) setLiveBook(d && d[liveSymbol] && d[liveSymbol].bids ? d[liveSymbol] : null); })
        .catch(() => { if (!stopped) setLiveBook(null); });
      window.HxApi.getPublicTrades(liveSymbol)
        .then(d => { if (!stopped) setLiveTrades(d && Array.isArray(d[liveSymbol]) ? d[liveSymbol] : null); })
        .catch(() => { if (!stopped) setLiveTrades(null); });
    };
    load();
    const id = setInterval(load, 5000);
    return () => { stopped = true; clearInterval(id); };
  }, [live, liveSymbol]);

  // Real balances + open orders once signed in
  const [liveBalances, setLiveBalances] = useState(null);
  const [liveOrders, setLiveOrders] = useState(null);
  const refreshLiveAccount = useCallback(() => {
    if (!(window.HxApi.isLive() && window.HxApi.isAuthed())) return;
    window.HxApi.getBalance().then(setLiveBalances).catch(() => {});
    window.HxApi.getOrders(true)
      .then(d => setLiveOrders(Array.isArray(d && d.data) ? d.data : Array.isArray(d) ? d : []))
      .catch(err => { if (err && err.status === 401) window.HxApi.logout(); });
  }, []);
  useEffect(() => {
    if (live && authed) {
      refreshLiveAccount();
      const id = setInterval(refreshLiveAccount, 10000);
      return () => clearInterval(id);
    }
    setLiveBalances(null);
    setLiveOrders(null);
  }, [live, authed, refreshLiveAccount]);

  // Login modal
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const doLogin = () => {
    if (loginBusy) return;
    if (!loginEmail || !loginPassword) { setLoginErr("Email and password are required"); return; }
    setLoginBusy(true);
    setLoginErr("");
    window.HxApi.login(loginEmail.trim(), loginPassword, loginOtp.trim() || undefined)
      .then(() => {
        setLoginOpen(false);
        setLoginPassword(""); setLoginOtp("");
        showToast("buy", "Signed in to live exchange");
      })
      .catch(e => setLoginErr(e.message || "Login failed"))
      .then(() => setLoginBusy(false));
  };

  // Pair switch: reseed candles/trades
  useEffect(() => {
    setCandles(tpSeedCandles(pair, 64));
    setTrades([]);
    candleTickRef.current = 0;
    try { localStorage.setItem(TP_PAIR_KEY, pair); } catch (e) {}
  }, [pair]);

  // Reseed candle history when the first real price arrives (otherwise the
  // sim-seeded history shows a cliff down/up to the live price)
  const liveSeededRef = useRef(false);
  useEffect(() => { liveSeededRef.current = false; }, [pair]);

  // Live feed: extend candles, synthesize trades, fill limit orders
  useEffect(() => {
    return M.subscribe(m => {
      const p = m.getPrice(pair);
      setTickN(n => n + 1);

      if (window.HxApi && window.HxApi.isLive() && m.isLiveData(pair) && !liveSeededRef.current) {
        liveSeededRef.current = true;
        candleTickRef.current = 0;
        setCandles(tpSeedCandles(pair, 64));
        return;
      }

      // candles
      candleTickRef.current += 1;
      const newCandle = candleTickRef.current >= TP_CANDLE_TICKS;
      if (newCandle) candleTickRef.current = 0;
      setCandles(prev => {
        const next = prev.slice(newCandle ? 1 : 0);
        if (newCandle) {
          next.push({ open: p, high: p, low: p, close: p, vol: 0.15 + Math.random() * 0.5 });
        } else {
          const last = { ...next[next.length - 1] };
          last.close = p;
          if (p > last.high) last.high = p;
          if (p < last.low) last.low = p;
          last.vol += Math.random() * 0.18;
          next[next.length - 1] = last;
        }
        return next;
      });

      // trades tape (1-3 synthetic fills per tick)
      const burst = 1 + Math.floor(Math.random() * 3);
      const now = new Date();
      const stamp = now.toTimeString().slice(0, 8);
      const newTrades = [];
      for (let i = 0; i < burst; i++) {
        const tp = p * (1 + (Math.random() - 0.5) * 0.0006);
        const size = Math.random() ** 2.4 * (p > 1000 ? 1.4 : p > 1 ? 220 : 60000);
        newTrades.push({
          id: ++tradeIdRef.current,
          side: Math.random() > 0.5 ? "buy" : "sell",
          price: tp,
          size,
          usd: tp * size,
          time: stamp,
        });
      }
      setTrades(prev => [...newTrades, ...prev].slice(0, 26));

      // limit fills: buy fills when price drops to limit, sell when it rises to limit
      setOpenOrders(prev => {
        const still = [];
        const filled = [];
        prev.forEach(o => {
          const op = m.getPrice(o.pair);
          const hit = o.side === "buy" ? op <= o.price : op >= o.price;
          if (hit) filled.push(o); else still.push(o);
        });
        if (filled.length) {
          setOrderHistory(h => [
            ...filled.map(o => ({ ...o, status: "filled", filledAt: new Date().toTimeString().slice(0, 8) })),
            ...h,
          ]);
          setBalances(b => {
            const nb = { ...b };
            filled.forEach(o => {
              if (o.side === "buy") {
                nb[o.pair] = (nb[o.pair] || 0) + o.amount;
                nb.USDT = (nb.USDT || 0) - o.amount * o.price;
              } else {
                nb[o.pair] = (nb[o.pair] || 0) - o.amount;
                nb.USDT = (nb.USDT || 0) + o.amount * o.price;
              }
            });
            return nb;
          });
          filled.forEach(o =>
            showToast(o.side, `Limit ${o.side} filled · ${fmtBal(o.amount, 6)} ${o.pair} @ ${tpFmt(o.price)}`)
          );
          if (typeof playNotifSound === "function") playNotifSound();
        }
        return still;
      });
    });
  }, [pair, showToast]);

  // Close pair menu on outside click
  useEffect(() => {
    if (!pairMenuOpen) return;
    const h = e => { if (pairMenuRef.current && !pairMenuRef.current.contains(e.target)) setPairMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pairMenuOpen]);

  // 24h stats from candle window (volume scaled to plausible exchange figures)
  const stats = useMemo(() => {
    let hi = -Infinity, lo = Infinity, vol = 0;
    candles.forEach(c => { if (c.high > hi) hi = c.high; if (c.low < lo) lo = c.low; vol += c.vol; });
    return { hi, lo, vol: vol * (price > 1000 ? 8e8 : price > 1 ? 5e7 : 8e6) };
  }, [candles, price]);

  // Order book — real levels when live (and the exchange lists this pair)
  const asks = useMemo(() => {
    if (live && liveBook && Array.isArray(liveBook.asks) && liveBook.asks.length) {
      let cum = 0;
      return liveBook.asks.slice(0, TP_BOOK_LEVELS).map(l => { cum += l[1]; return { price: l[0], size: l[1], cum }; });
    }
    return tpBookSide(pair, "ask", price, tickN);
  }, [live, liveBook, pair, price, tickN]);
  const bids = useMemo(() => {
    if (live && liveBook && Array.isArray(liveBook.bids) && liveBook.bids.length) {
      let cum = 0;
      return liveBook.bids.slice(0, TP_BOOK_LEVELS).map(l => { cum += l[1]; return { price: l[0], size: l[1], cum }; });
    }
    return tpBookSide(pair, "bid", price, tickN);
  }, [live, liveBook, pair, price, tickN]);

  // Trades tape — real fills when live
  const tradeRows = useMemo(() => {
    if (live && liveTrades && liveTrades.length) {
      return liveTrades.slice(0, 26).map((t, i) => ({
        id: "lv" + i + (t.timestamp || ""),
        side: t.side,
        price: t.price,
        size: t.size,
        usd: t.price * t.size,
        time: (t.timestamp || "").slice(11, 19) || "—",
      }));
    }
    return trades;
  }, [live, liveTrades, trades]);
  const maxCum = Math.max(asks[asks.length - 1].cum, bids[bids.length - 1].cum);
  const spread = asks[0].price - bids[0].price;

  // ── Ticket state ──
  const [side, setSide] = useState("buy");
  const [type, setType] = useState("market");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [ticketErr, setTicketErr] = useState("");
  useEffect(() => { setAmount(""); setLimitPrice(""); setTicketErr(""); }, [pair]);
  useEffect(() => { setTicketErr(""); }, [side, type]);

  const effPrice = type === "limit" && parseFloat(limitPrice) > 0 ? parseFloat(limitPrice) : price;
  const amt = parseFloat(amount) || 0;
  const totalUsd = amt * effPrice;
  // Live + signed in → real available balances from /user/balance
  const usingLiveBalances = live && authed && liveBalances;
  const availBase = usingLiveBalances ? ((liveBalances[pair] || {}).available || 0) : (balances[pair] || 0);
  const availQuote = usingLiveBalances ? ((liveBalances.USDT || {}).available || 0) : (balances.USDT || 0);

  const setPct = pct => {
    if (side === "sell") {
      setAmount(availBase > 0 ? String(+(availBase * pct).toFixed(6)) : "");
    } else {
      const usd = availQuote * pct;
      setAmount(effPrice > 0 && usd > 0 ? String(+(usd / effPrice).toFixed(6)) : "");
    }
  };

  const placeOrder = () => {
    if (amt <= 0) { setTicketErr("Enter an amount"); return; }
    if (type === "limit" && !(parseFloat(limitPrice) > 0)) { setTicketErr("Enter a limit price"); return; }
    if (side === "buy" && totalUsd > availQuote) { setTicketErr("Insufficient USDT balance"); return; }
    if (side === "sell" && amt > availBase) { setTicketErr(`Insufficient ${pair} balance`); return; }
    setTicketErr("");

    // Live mode: place the order on the real exchange
    if (live) {
      if (!authed) { setLoginOpen(true); return; }
      const o = { symbol: liveSymbol, side, size: amt, type };
      if (type === "limit") o.price = parseFloat(limitPrice);
      window.HxApi.placeOrder(o)
        .then(() => {
          showToast(side, `${type === "market" ? (side === "buy" ? "Bought" : "Sold") : `Limit ${side} placed`} · ${fmtBal(amt, 6)} ${pair} (live)`);
          if (typeof playSaveSound === "function") playSaveSound();
          setAmount("");
          refreshLiveAccount();
        })
        .catch(e => setTicketErr(e.message || "Order failed"));
      return;
    }
    const id = orderIdRef.current++;
    const stamp = new Date().toTimeString().slice(0, 8);

    if (type === "market") {
      setBalances(b => ({
        ...b,
        [pair]: (b[pair] || 0) + (side === "buy" ? amt : -amt),
        USDT: (b.USDT || 0) + (side === "buy" ? -totalUsd : totalUsd),
      }));
      setOrderHistory(h => [
        { id, pair, side, type, price: effPrice, amount: amt, status: "filled", placedAt: stamp, filledAt: stamp },
        ...h,
      ]);
      showToast(side, `${side === "buy" ? "Bought" : "Sold"} ${fmtBal(amt, 6)} ${pair} @ ${tpFmt(effPrice)}`);
    } else {
      setOpenOrders(o => [
        { id, pair, side, type, price: parseFloat(limitPrice), amount: amt, status: "open", placedAt: stamp },
        ...o,
      ]);
      showToast(side, `Limit ${side} placed · ${fmtBal(amt, 6)} ${pair} @ ${tpFmt(parseFloat(limitPrice))}`);
    }
    if (typeof playSaveSound === "function") playSaveSound();
    setAmount("");
  };

  const cancelOrder = id => {
    setOpenOrders(prev => {
      const o = prev.find(x => x.id === id);
      if (o) {
        setOrderHistory(h => [
          { ...o, status: "cancelled", filledAt: new Date().toTimeString().slice(0, 8) },
          ...h,
        ]);
      }
      return prev.filter(x => x.id !== id);
    });
  };

  const [ordersTab, setOrdersTab] = useState("open");
  const info = COINS[pair];

  // ── Price alerts ──
  const [alerts, setAlerts] = useState(() => window.HxAlerts.getAll());
  const [alertMenuOpen, setAlertMenuOpen] = useState(false);
  const [alertCond, setAlertCond] = useState("above");
  const [alertPrice, setAlertPrice] = useState("");
  const alertMenuRef = useRef(null);
  useEffect(() => window.HxAlerts.onChange(setAlerts), []);
  useEffect(() => {
    if (!alertMenuOpen) return;
    const h = e => { if (alertMenuRef.current && !alertMenuRef.current.contains(e.target)) setAlertMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [alertMenuOpen]);
  const addAlert = () => {
    const p = parseFloat(alertPrice);
    if (!(p > 0)) return;
    window.HxAlerts.add(pair, alertCond, p);
    setAlertPrice("");
    if (typeof playSaveSound === "function") playSaveSound();
  };

  // Orders panel rows: real open orders when live + signed in, else the sim ones
  const openRows = (live && authed && liveOrders)
    ? liveOrders.map(o => ({
        id: o.id,
        side: o.side,
        type: o.type,
        price: o.price || 0,
        amount: o.size,
        pair: (o.symbol || "").split("-")[0].toUpperCase() || pair,
        isLive: true,
      }))
    : openOrders;
  const cancelOrderRow = (o) => {
    if (o.isLive) {
      window.HxApi.cancelOrder(o.id)
        .then(() => { showToast("sell", "Order cancelled (live)"); refreshLiveAccount(); })
        .catch(e => showToast("sell", "Cancel failed: " + (e.message || "error")));
    } else {
      cancelOrder(o.id);
    }
  };

  return (
    <div className="tp-root">
      {/* Header / stats */}
      <div className="tp-head tp-panel">
        <div style={{ position: "relative" }} ref={pairMenuRef}>
          <button className="tp-pair-btn" onClick={() => setPairMenuOpen(o => !o)}>
            <span className="tp-pair-icon" style={{ background: info.color + "22", color: info.color }}>{info.icon}</span>
            {pair}/USDT
            <span className="tp-pair-caret">▼</span>
          </button>
          {pairMenuOpen && (
            <div className="tp-pair-menu">
              {TP_PAIRS.map(t => (
                <button key={t} className={"tp-pair-row" + (t === pair ? " tp-pair-row--on" : "")}
                  onClick={() => { setPair(t); setPairMenuOpen(false); }}>
                  <span className="tp-pair-icon" style={{ background: COINS[t].color + "22", color: COINS[t].color, width: 18, height: 18, fontSize: 10 }}>{COINS[t].icon}</span>
                  <span className="tp-pair-row-name">{t}/USDT</span>
                  <span className="tp-pair-row-price">{fmtPrice(M.getPrice(t))}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={"tp-last " + (dir === "down" ? "tp-last--down" : "tp-last--up")}>
          <HxRoll value={tpFmt(price)} dir={dir} />
        </div>

        <div className="tp-stat">
          <span className="tp-stat-label">24h change</span>
          <span className={"tp-stat-val " + (change >= 0 ? "tp-stat-val--up" : "tp-stat-val--down")}>
            {(change >= 0 ? "+" : "") + change.toFixed(2)}%
          </span>
        </div>
        <div className="tp-stat">
          <span className="tp-stat-label">24h high</span>
          <span className="tp-stat-val">{tpFmt(liveTicker && liveTicker.high > 0 ? liveTicker.high : stats.hi)}</span>
        </div>
        <div className="tp-stat">
          <span className="tp-stat-label">24h low</span>
          <span className="tp-stat-val">{tpFmt(liveTicker && liveTicker.low > 0 ? liveTicker.low : stats.lo)}</span>
        </div>
        <div className="tp-stat">
          <span className="tp-stat-label">24h volume</span>
          <span className="tp-stat-val">{fmtUSD(liveTicker && liveTicker.volume > 0 ? liveTicker.volume * price : stats.vol, true)}</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            className={"tp-live-btn" + (live ? " tp-live-btn--on" : "")}
            onClick={() => window.HxApi.setLive(!live)}
            title={live ? "Real exchange data from api.hollaex.com — click to switch to simulation" : "Simulated data — click to switch to the live exchange"}>
            <span className="tp-live-dot" /> {live ? "LIVE" : "SIM"}
          </button>
          {live && (authed ? (
            <div className="tp-acct">
              <span className="tp-acct-email">{(liveUser && liveUser.email) || "signed in"}</span>
              <button className="tp-acct-out" onClick={() => window.HxApi.logout()}>Sign out</button>
            </div>
          ) : (
            <button className="tp-acct-in" onClick={() => { setLoginErr(""); setLoginOpen(true); }}>Sign in</button>
          ))}
        </div>

        <div style={{ position: "relative" }} ref={alertMenuRef}>
          <button className="tp-alert-btn" style={{ marginLeft: 0 }} onClick={() => { setAlertMenuOpen(o => !o); setAlertPrice(price.toFixed(tpDecimals(price))); }}>
            <span aria-hidden>🔔</span> Alerts
            {alerts.length > 0 && <span className="tp-alert-badge">{alerts.length}</span>}
          </button>
          {alertMenuOpen && (
            <div className="tp-alert-menu">
              <div className="tp-alert-title">Alert me when {pair} is</div>
              <div className="tp-alert-cond-row">
                <button className={"tp-alert-cond" + (alertCond === "above" ? " tp-alert-cond--on" : "")} onClick={() => setAlertCond("above")}>▲ Above</button>
                <button className={"tp-alert-cond" + (alertCond === "below" ? " tp-alert-cond--on" : "")} onClick={() => setAlertCond("below")}>▼ Below</button>
              </div>
              <div className="tp-alert-add-row">
                <input className="tp-alert-input" type="text" inputMode="decimal" placeholder="Price (USDT)"
                  value={alertPrice}
                  onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setAlertPrice(e.target.value); }}
                  onKeyDown={e => { if (e.key === "Enter") addAlert(); }} />
                <button className="tp-alert-add" onClick={addAlert}>Add</button>
              </div>
              <div className="tp-alert-list">
                {alerts.length === 0 && (
                  <div className="tp-alert-empty">No active alerts.<br />They fire once, into the top notch.</div>
                )}
                {alerts.map(a => (
                  <div key={a.id} className="tp-alert-row">
                    <span className="tp-alert-row-tk" style={{ color: COINS[a.ticker] ? COINS[a.ticker].color : undefined }}>{a.ticker}</span>
                    <span className="tp-alert-row-cond">{a.condition === "above" ? "≥" : "≤"} {tpFmt(a.price)}</span>
                    <button className="tp-alert-del" onClick={() => window.HxAlerts.remove(a.id)} title="Delete alert">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart + book + trades */}
      <div className="tp-grid">
        <div className="tp-panel">
          <CandleChart ticker={pair} candles={candles} lastPrice={price} />
        </div>

        <div className="tp-panel tp-book-panel">
          <div className="tp-panel-title">
            Order book
            {live && <span className={"tp-src-badge " + (liveBook ? "tp-src-badge--live" : "tp-src-badge--sim")}>{liveBook ? "LIVE" : "SIM"}</span>}
          </div>
          <div className="tp-book">
            <div className="tp-book-head"><span>Price</span><span style={{ textAlign: "right" }}>Size</span></div>
            {asks.slice().reverse().map((r, i) => (
              <div key={"a" + i} className="tp-book-row tp-book-row--ask" onClick={() => { setType("limit"); setLimitPrice(r.price.toFixed(tpDecimals(r.price))); }}>
                <span className="tp-book-bar" style={{ width: (r.cum / maxCum * 100) + "%" }} />
                <span className="tp-book-price">{tpFmt(r.price)}</span>
                <span className="tp-book-size">{fmtBal(r.size, 4)}</span>
              </div>
            ))}
            <div className={"tp-book-mid " + (dir === "down" ? "tp-book-mid--down" : "tp-book-mid--up")}>
              <span className="tp-book-mid-arrow">{dir === "down" ? "▼" : "▲"}</span>
              <HxRoll value={tpFmt(price)} dir={dir} />
            </div>
            <div className="tp-spread">Spread {tpFmt(spread)} ({(spread / price * 100).toFixed(3)}%)</div>
            {bids.map((r, i) => (
              <div key={"b" + i} className="tp-book-row tp-book-row--bid" onClick={() => { setType("limit"); setLimitPrice(r.price.toFixed(tpDecimals(r.price))); }}>
                <span className="tp-book-bar" style={{ width: (r.cum / maxCum * 100) + "%" }} />
                <span className="tp-book-price">{tpFmt(r.price)}</span>
                <span className="tp-book-size">{fmtBal(r.size, 4)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tp-panel tp-trades-panel">
          <div className="tp-panel-title">
            Recent trades
            {live && <span className={"tp-src-badge " + (liveTrades ? "tp-src-badge--live" : "tp-src-badge--sim")}>{liveTrades ? "LIVE" : "SIM"}</span>}
          </div>
          <div className="tp-trades">
            <div className="tp-book-head" style={{ gridTemplateColumns: "1fr auto auto" }}>
              <span>Price</span><span>Size</span><span style={{ textAlign: "right" }}>Time</span>
            </div>
            {tradeRows.length === 0 && window.EmptyState
              ? React.createElement(window.EmptyState, { compact: true, icon: "⏱", title: "Waiting for trades", message: "Live fills appear here." })
              : tradeRows.map(t => (
                <div key={t.id} className={"tp-trade-row" + (t.usd >= TP_WHALE_USD ? " tp-trade-row--whale" : "")}>
                  <span className={"tp-trade-price--" + t.side}>
                    {tpFmt(t.price)}
                    {t.usd >= TP_WHALE_USD && <span className="tp-whale-ico" title={"Whale · " + fmtUSD(t.usd, true)}>🐋</span>}
                  </span>
                  <span className="tp-trade-size">{fmtBal(t.size, 4)}</span>
                  <span className="tp-trade-time">{t.time}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Ticket + orders */}
      <div className="tp-grid-bottom">
        <div className="tp-panel tp-ticket">
          <div className="tp-side-toggle">
            <button className={"tp-side-btn" + (side === "buy" ? " tp-side-btn--buy-on" : "")} onClick={() => setSide("buy")}>BUY</button>
            <button className={"tp-side-btn" + (side === "sell" ? " tp-side-btn--sell-on" : "")} onClick={() => setSide("sell")}>SELL</button>
          </div>
          <div className="tp-type-row">
            <button className={"tp-type-btn" + (type === "market" ? " tp-type-btn--on" : "")} onClick={() => setType("market")}>Market</button>
            <button className={"tp-type-btn" + (type === "limit" ? " tp-type-btn--on" : "")} onClick={() => setType("limit")}>Limit</button>
          </div>

          {type === "limit" && (
            <div className="tp-field">
              <div className="tp-field-label">
                <span>Limit price</span>
                <span className="tp-field-bal" onClick={() => setLimitPrice(price.toFixed(tpDecimals(price)))}>last {tpFmt(price)}</span>
              </div>
              <div className="tp-input-wrap">
                <input className="tp-input" type="text" inputMode="decimal" placeholder="0.00"
                  value={limitPrice}
                  onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setLimitPrice(e.target.value); }} />
                <span className="tp-input-suffix">USDT</span>
              </div>
            </div>
          )}

          <div className="tp-field">
            <div className="tp-field-label">
              <span>Amount</span>
              <span className="tp-field-bal"
                onClick={() => setPct(1)}
                title="Use max">
                {side === "buy" ? `${fmtBal(availQuote, 2)} USDT` : `${fmtBal(availBase, 6)} ${pair}`} avail
              </span>
            </div>
            <div className="tp-input-wrap">
              <input className="tp-input" type="text" inputMode="decimal" placeholder="0.00"
                value={amount}
                onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setAmount(e.target.value); }} />
              <span className="tp-input-suffix">{pair}</span>
            </div>
          </div>

          <div className="tp-pct-row">
            {[0.25, 0.5, 0.75, 1].map(p => (
              <button key={p} className="tp-pct-btn" onClick={() => setPct(p)}>{p * 100}%</button>
            ))}
          </div>

          <div className="tp-total-row">
            <span>Total</span>
            <span className="tp-total-val">{totalUsd > 0 ? fmtUSD(totalUsd) : "—"}</span>
          </div>

          {live && !authed ? (
            <button className="tp-submit tp-submit--buy" onClick={() => { setLoginErr(""); setLoginOpen(true); }}>
              Sign in to trade live
            </button>
          ) : (
            <button className={"tp-submit tp-submit--" + side} onClick={placeOrder} disabled={amt <= 0}>
              {side === "buy" ? `Buy ${pair}` : `Sell ${pair}`}{live ? " · live" : ""}
            </button>
          )}
          <div className="tp-ticket-err">{ticketErr}</div>
        </div>

        <div className="tp-panel">
          <div className="tp-orders-tabs">
            <button className={"tp-orders-tab" + (ordersTab === "open" ? " tp-orders-tab--on" : "")} onClick={() => setOrdersTab("open")}>
              Open orders<span className="tp-orders-count">({openRows.length})</span>
              {live && authed && <span className="tp-src-badge tp-src-badge--live">LIVE</span>}
            </button>
            <button className={"tp-orders-tab" + (ordersTab === "history" ? " tp-orders-tab--on" : "")} onClick={() => setOrdersTab("history")}>
              History<span className="tp-orders-count">({orderHistory.length})</span>
            </button>
          </div>

          <div className="tp-orders-head">
            <span>Side</span><span>Type</span><span>Price</span><span>Amount</span><span className="tp-order-col-total">Total</span><span style={{ textAlign: "right" }}>{ordersTab === "open" ? "" : "Status"}</span>
          </div>

          {(ordersTab === "open" ? openRows : orderHistory.slice(0, 12)).map(o => (
            <div key={o.id} className="tp-order-row">
              <span className={"tp-order-side--" + o.side}>{o.side.toUpperCase()}</span>
              <span style={{ color: "rgba(255,255,255,.45)", textTransform: "capitalize" }}>{o.type}</span>
              <span className="tp-order-num">{tpFmt(o.price)}</span>
              <span className="tp-order-num">{fmtBal(o.amount, 6)} {o.pair}</span>
              <span className="tp-order-num tp-order-col-total">{fmtUSD(o.price * o.amount)}</span>
              {ordersTab === "open" ? (
                <button className="tp-order-cancel" onClick={() => cancelOrderRow(o)}>Cancel</button>
              ) : (
                <span className={"tp-order-status tp-order-status--" + o.status} style={{ textAlign: "right" }}>{o.status}</span>
              )}
            </div>
          ))}

          {(ordersTab === "open" ? openRows : orderHistory).length === 0 && window.EmptyState &&
            React.createElement(window.EmptyState, {
              icon: ordersTab === "open" ? "◷" : "≡",
              title: ordersTab === "open" ? "No open orders" : "No orders yet",
              message: ordersTab === "open"
                ? "Place a limit order and it will sit here until the price crosses it."
                : "Your filled and cancelled orders will appear here.",
            })}
        </div>
      </div>

      {toast && <div className={"tp-toast tp-toast--" + toast.side}>{toast.msg}</div>}

      {/* Live exchange sign-in (reuses the shared hxv modal chrome) */}
      {loginOpen && (
        <div className="hxv-backdrop" onClick={() => { if (!loginBusy) setLoginOpen(false); }}>
          <div className="hxv-modal" onClick={e => e.stopPropagation()}>
            <button className="hxv-close" onClick={() => setLoginOpen(false)}>✕</button>
            <div className="hxv-title">Live Exchange Sign In</div>
            <div className="hxv-sub">
              Sign in with your real HollaEx account ({window.HxApi.BASE.replace(/^https?:\/\//, "").replace(/\/v2$/, "")}).
              The session token stays in this browser only.
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <input className="tp-input" type="email" placeholder="Email" autoFocus
                value={loginEmail} style={{ paddingRight: 12 }}
                onChange={e => setLoginEmail(e.target.value)} />
              <input className="tp-input" type="password" placeholder="Password"
                value={loginPassword} style={{ paddingRight: 12 }}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") doLogin(); }} />
              <input className="tp-input" type="text" inputMode="numeric" placeholder="2FA code (only if enabled)"
                value={loginOtp} style={{ paddingRight: 12 }}
                onChange={e => setLoginOtp(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") doLogin(); }} />
              <button className="tp-submit tp-submit--buy" onClick={doLogin} disabled={loginBusy} style={{ marginTop: 2 }}>
                {loginBusy ? "Signing in…" : "Sign in"}
              </button>
              <div className="tp-ticket-err">{loginErr}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AppPages.register("trade", {
  component: TradePage,
  label: "Trade",
  notchTab: true,
  fullWidth: true,
});
