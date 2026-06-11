// ═══════════════════════════════════════════════════════════════════
// shared.js — Shared constants, utilities, and page registry
// Loaded via <script> before the page files are fetched + compiled.
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// JSX compile cache — skip the in-browser Babel pass on repeat loads
// ───────────────────────────────────────────────────────────────────
// index.html / onboarding.html fetch the JSX sources, hand each to
// hxCompile(), and eval the result. hxCompile caches Babel's output in
// localStorage keyed by a content hash, so an unchanged file is served
// straight from cache and Babel is only downloaded + run on a cache miss.
// Editing any file changes its hash and transparently busts the cache.
// ═══════════════════════════════════════════════════════════════════

// Bump to invalidate every cached compile (e.g. if the loader/preamble changes).
window.HX_COMPILE_VERSION = "1";

// cyrb53 — fast, dependency-free, low-collision string hash.
window.hxHash = function hxHash(str) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (var i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

// Lazily download Babel only when a compile is actually needed. Deduped so
// concurrent cache-miss compiles share a single <script> load.
window._hxBabelPromise = null;
window.hxEnsureBabel = function hxEnsureBabel() {
  if (window.Babel) return Promise.resolve(window.Babel);
  if (window._hxBabelPromise) return window._hxBabelPromise;
  window._hxBabelPromise = new Promise(function (resolve, reject) {
    var s = document.createElement("script");
    s.src = "https://unpkg.com/@babel/standalone/babel.min.js";
    s.onload = function () { resolve(window.Babel); };
    s.onerror = function () { reject(new Error("Failed to load the Babel compiler")); };
    document.head.appendChild(s);
  });
  return window._hxBabelPromise;
};

// Compile `source` (already preamble-wrapped + stripped by the caller) to JS,
// returning a Promise<string>. Cache hit → no Babel at all; miss → load + run
// Babel, store the output, and prune any stale entries for the same file.
window.hxCompile = function hxCompile(name, source) {
  var filePrefix = "hxc:" + name + ":";
  var key = filePrefix + window.HX_COMPILE_VERSION + ":" + window.hxHash(source);
  try {
    var hit = localStorage.getItem(key);
    if (hit != null) return Promise.resolve(hit);
  } catch (e) {}
  return window.hxEnsureBabel().then(function (Babel) {
    var code = Babel.transform(source, { presets: ["react"] }).code;
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf(filePrefix) === 0 && k !== key) localStorage.removeItem(k);
      }
      localStorage.setItem(key, code);
    } catch (e) {}
    return code;
  });
};

// ── Coins (superset — WalletPage format with integer decimals) ──
window.COINS = {
  BTC:  { name: "Bitcoin",     icon: "₿", color: "#f7931a", decimals: 8, balance: 2.45831,   hold: 0 },
  ETH:  { name: "Ethereum",    icon: "Ξ", color: "#627eea", decimals: 4, balance: 34.2819,   hold: 0 },
  USDT: { name: "Tether",      icon: "₮", color: "#26a17b", decimals: 2, balance: 48750.00,  hold: 1300 },
  SOL:  { name: "Solana",      icon: "◎", color: "#9945ff", decimals: 3, balance: 312.485,   hold: 0 },
  BNB:  { name: "BNB",         icon: "◆", color: "#f0b90b", decimals: 4, balance: 18.753,    hold: 0 },
  XRP:  { name: "Ripple",      icon: "✕", color: "#00aae4", decimals: 4, balance: 5420.00,   hold: 0 },
  USDC: { name: "USD Coin",    icon: "$", color: "#2775ca", decimals: 2, balance: 12500.00,  hold: 0 },
  ADA:  { name: "Cardano",     icon: "₳", color: "#3d9fee", decimals: 6, balance: 0,         hold: 0 },
  DOGE: { name: "Dogecoin",    icon: "Ð", color: "#c2a633", decimals: 2, balance: 0,         hold: 0 },
  AVAX: { name: "Avalanche",   icon: "▲", color: "#e84142", decimals: 4, balance: 0,         hold: 0 },
  POL:  { name: "Polygon",     icon: "⬡", color: "#8247e5", decimals: 4, balance: 0,         hold: 0 },
  HYPE: { name: "Hyperliquid", icon: "H", color: "#00e5ff", decimals: 4, balance: 0,         hold: 0 },
  XMR:  { name: "Monero",      icon: "ɱ", color: "#ff6600", decimals: 4, balance: 0.00012,   hold: 0 },
};

// ── Base exchange rates ──
window.BASE_RATES = {
  "BTC/USDT": 67432.50, "ETH/USDT": 3521.80, "SOL/USDT": 142.65,
  "BNB/USDT": 612.40,   "XRP/USDT": 0.5214,  "USDC/USDT": 1.0001,
  "XMR/USDT": 162.50,
};

// ── Mock 24h changes (superset — includes MarketsPage extras) ──
window.MOCK_CHANGES = {
  BTC: 2.34, ETH: -1.12, USDT: 0.01, SOL: 5.67, BNB: -0.88, XRP: 3.21, USDC: 0.00,
  ADA: -2.15, DOGE: 4.32, AVAX: -3.87, POL: 1.94, HYPE: 6.81,
};

// ── Colors ──
window.COLOR_UP   = "#4ade80";
window.COLOR_DOWN = "#f87171";

// ── Shared utilities ──
// Inserts thousands separators. Accepts integer-only strings ("12345") or
// decimal-bearing strings ("12345.678") — only the integer portion is commaed.
window.addCommas = function addCommas(s) {
  if (!s) return s;
  const dot = s.indexOf(".");
  const intPart = dot === -1 ? s : s.slice(0, dot);
  const fracPart = dot === -1 ? "" : s.slice(dot);
  if (intPart.length <= 3) return intPart + fracPart;
  let r = "";
  for (let j = 0; j < intPart.length; j++) {
    if (j > 0 && (intPart.length - j) % 3 === 0) r += ",";
    r += intPart[j];
  }
  return r + fracPart;
};

window.getUSDRate = function getUSDRate(rates, ticker) {
  if (ticker === "USDT") return 1;
  if (ticker === "USDC") return rates["USDC/USDT"] || 1;
  return rates[ticker + "/USDT"] || 0;
};

window.fmtUSD = function fmtUSD(n, compact) {
  if (compact && n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (compact && n >= 10_000_000)    return "$" + (n / 1_000_000).toFixed(2) + "M";
  var parts = n.toFixed(2).split(".");
  return "$" + addCommas(parts[0]) + "." + parts[1];
};

window.fmtBal = function fmtBal(n, decimals) {
  var parts = n.toFixed(Math.min(decimals, 5)).split(".");
  var trimmed = parts[1] ? parts[1].replace(/0+$/, "") : "";
  return trimmed ? addCommas(parts[0]) + "." + trimmed : addCommas(parts[0]);
};

// Like fmtBal but with up to 8 decimals of precision and no minimum. Keeps
// dust amounts (sub-cent values, fractions of satoshis) actually visible.
window.fmtDust = function fmtDust(n) {
  if (!Number.isFinite(n) || n === 0) return "0";
  var s = n.toFixed(8);
  s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
};

window.fmtPrice = function fmtPrice(n) {
  if (n >= 1000) return fmtUSD(n);
  if (n >= 1) return "$" + n.toFixed(4);
  return "$" + n.toFixed(6);
};

// ── App deep links & remembered convert pair ──
window.HX_CONVERT_PAIR_KEY = "hx_convert_pair";
window.HX_RETURN_URL_KEY = "hx_return_url";
window.HX_WALLET_ACTIONS = new Set(["coin", "buy", "sell", "send", "receive"]);

window.saveReturnUrl = function saveReturnUrl() {
  var qs = window.location.search;
  var hash = window.location.hash;
  if (!qs && !hash) return;
  try {
    sessionStorage.setItem(window.HX_RETURN_URL_KEY, window.location.pathname + qs + hash);
  } catch (e) {}
};

window.consumeReturnUrl = function consumeReturnUrl(fallback) {
  fallback = fallback || "index.html";
  try {
    var ret = sessionStorage.getItem(window.HX_RETURN_URL_KEY);
    sessionStorage.removeItem(window.HX_RETURN_URL_KEY);
    return ret || fallback;
  } catch (e) {
    return fallback;
  }
};

window.parseAppLink = function parseAppLink(validTabs) {
  var params = new URLSearchParams(window.location.search);
  var tab = (params.get("tab") || "").toLowerCase();
  var hashRaw = window.location.hash.replace(/^#/, "").split("?")[0];
  if (!tab && hashRaw && validTabs.has(hashRaw)) tab = hashRaw;
  if (!tab || !validTabs.has(tab)) tab = "convert";
  var action = (params.get("action") || "coin").toLowerCase();
  if (!window.HX_WALLET_ACTIONS.has(action)) action = "coin";
  return {
    tab: tab,
    buy: params.get("buy") ? params.get("buy").toUpperCase() : null,
    spend: params.get("spend") ? params.get("spend").toUpperCase() : null,
    coin: params.get("coin") ? params.get("coin").toUpperCase() : null,
    action: action,
  };
};

window.buildAppLink = function buildAppLink(state) {
  var tab = state.tab || "convert";
  var params = new URLSearchParams();
  if (tab !== "convert") params.set("tab", tab);
  if (tab === "convert") {
    if (state.buy) params.set("buy", state.buy);
    if (state.spend) params.set("spend", state.spend);
  }
  if (tab === "wallet" && state.coin) {
    params.set("coin", state.coin);
    if (state.action && state.action !== "coin") params.set("action", state.action);
  }
  var qs = params.toString();
  var path = window.location.pathname || "/";
  if (tab === "convert") return qs ? path + "?" + qs : path;
  return qs ? path + "?" + qs + "#" + tab : path + "#" + tab;
};

window.loadConvertPair = function loadConvertPair(validTickers) {
  try {
    var raw = localStorage.getItem(window.HX_CONVERT_PAIR_KEY);
    if (!raw) return null;
    var p = JSON.parse(raw);
    if (validTickers.has(p.buy) && validTickers.has(p.spend) && p.buy !== p.spend) return { buy: p.buy, spend: p.spend };
  } catch (e) {}
  return null;
};

window.saveConvertPair = function saveConvertPair(buy, spend) {
  try {
    localStorage.setItem(window.HX_CONVERT_PAIR_KEY, JSON.stringify({ buy: buy, spend: spend }));
  } catch (e) {}
};

// Seeded xor-shift RNG — same seed always yields same sequence. Used for deterministic SVG art.
window.makeSeededRand = function makeSeededRand(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function() {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return (h >>> 0) / 0xffffffff;
  };
};

// Mock chart data — walks backwards from endVal with noise. Used for sparklines/charts.
window.genChartData = function genChartData(endVal, points, volatility) {
  const data = [endVal];
  for (let i = 1; i < points; i++) {
    const prev = data[0];
    const delta = prev * volatility * (Math.random() - 0.48);
    data.unshift(Math.max(prev - delta, endVal * 0.85));
  }
  return data;
};

// ═══════════════════════════════════════════════════════════════════
// HxMarket — the single live mock price feed
// ───────────────────────────────────────────────────────────────────
// One seeded random-walk engine for every coin in COINS. Pages used to run
// their own unsynchronized jitter intervals (Converter 7s, Wallet 3.5s,
// Markets 3.5s) so prices disagreed across tabs; now everything subscribes
// here and stays consistent. 24h changes are kept coherent with the walk by
// deriving them from a fixed 24h-open price (and MOCK_CHANGES is updated in
// place so existing badge code stays correct). Ticks pause while the tab is
// hidden; the interval only runs while at least one subscriber is mounted.
// ═══════════════════════════════════════════════════════════════════
window.HxMarket = (function () {
  var STATIC_PRICES = { ADA: 0.4521, DOGE: 0.1234, AVAX: 35.42, POL: 0.5831, HYPE: 22.14 };
  var VOL = { default: 0.0014, USDC: 0.00004 };
  var TICK_MS = 3500;
  var HISTORY_LEN = 120;

  var prices = {}, basePrices = {}, open24h = {}, dirs = {}, history = {};

  Object.keys(window.COINS).forEach(function (t) {
    var p = t === "USDT" ? 1 : (window.BASE_RATES[t + "/USDT"] || STATIC_PRICES[t] || 0);
    prices[t] = p;
    basePrices[t] = p;
    var ch = (window.MOCK_CHANGES && typeof window.MOCK_CHANGES[t] === "number") ? window.MOCK_CHANGES[t] : 0;
    open24h[t] = ch === 0 ? p : p / (1 + ch / 100);
    dirs[t] = null;
    // Seeded backstory so per-coin history is stable across reloads
    var rand = window.makeSeededRand("hxm-" + t);
    var h = [p];
    for (var i = 1; i < HISTORY_LEN; i++) {
      var prev = h[0];
      h.unshift(Math.max(prev * (1 - (rand() - 0.48) * 0.008), p * 0.88));
    }
    history[t] = h;
  });

  var listeners = new Set();
  var timer = null;

  // ── Live mode (HxApi) ──
  // Coins present on the real exchange get their price from /tickers polls
  // (~7s) and stop random-walking; coins the exchange doesn't list keep
  // simulating so the UI stays fully populated either way.
  var liveSymbols = {};
  var liveTickers = {};
  var liveFetching = false;
  var liveTickCount = 0;

  function applyLiveTickers(data) {
    Object.keys(prices).forEach(function (t) {
      if (t === "USDT") return;
      var tk = data[t.toLowerCase() + "-usdt"];
      if (!tk || !(tk.last > 0)) return;
      var old = prices[t];
      prices[t] = tk.last;
      liveSymbols[t] = true;
      liveTickers[t] = tk;
      dirs[t] = tk.last > old ? "up" : tk.last < old ? "down" : null;
      if (tk.open > 0) open24h[t] = tk.open;
      var h = history[t];
      h.push(tk.last);
      if (h.length > HISTORY_LEN) h.shift();
      if (window.MOCK_CHANGES && typeof window.MOCK_CHANGES[t] === "number") {
        window.MOCK_CHANGES[t] = (prices[t] / open24h[t] - 1) * 100;
      }
    });
    listeners.forEach(function (fn) { try { fn(api); } catch (e) {} });
  }

  function tick() {
    if (document.hidden) return;
    var live = window.HxApi && window.HxApi.isLive();
    if (live) {
      liveTickCount += 1;
      if (!liveFetching && liveTickCount % 2 === 1) {
        liveFetching = true;
        window.HxApi.getTickers()
          .then(applyLiveTickers)
          .catch(function () {})
          .then(function () { liveFetching = false; });
      }
    } else if (Object.keys(liveSymbols).length) {
      liveSymbols = {};
    }
    Object.keys(prices).forEach(function (t) {
      if (t === "USDT") return;
      if (live && liveSymbols[t]) { dirs[t] = null; return; }
      var old = prices[t];
      if (!old) return;
      // Random walk with a gentle pull back toward the base price so the
      // demo can run for hours without drifting into nonsense.
      var vol = VOL[t] || VOL.default;
      var drift = (Math.random() - 0.48) * vol + ((basePrices[t] - old) / basePrices[t]) * 0.002;
      var nv = old * (1 + drift);
      prices[t] = nv;
      dirs[t] = nv > old ? "up" : nv < old ? "down" : null;
      var h = history[t];
      h.push(nv);
      if (h.length > HISTORY_LEN) h.shift();
      if (window.MOCK_CHANGES && typeof window.MOCK_CHANGES[t] === "number") {
        window.MOCK_CHANGES[t] = (nv / open24h[t] - 1) * 100;
      }
    });
    listeners.forEach(function (fn) { try { fn(api); } catch (e) {} });
  }

  var api = {
    TICK_MS: TICK_MS,
    getPrice: function (t) { return prices[t] || 0; },
    getDir: function (t) { return dirs[t] || null; },
    getDirs: function () { return Object.assign({}, dirs); },
    // True once this coin's price is coming from the real exchange feed
    isLiveData: function (t) { return !!liveSymbols[t]; },
    // Latest raw exchange ticker (open/high/low/last/volume) or null
    getLiveTicker: function (t) { return liveTickers[t] || null; },
    getChange: function (t) {
      if (prices[t] && open24h[t]) return (prices[t] / open24h[t] - 1) * 100;
      return (window.MOCK_CHANGES && window.MOCK_CHANGES[t]) || 0;
    },
    getHistory: function (t) { return (history[t] || []).slice(); },
    // BASE_RATES-shaped object ("BTC/USDT": price) covering every coin —
    // a drop-in replacement for each page's `rates` state.
    getRates: function () {
      var r = {};
      Object.keys(prices).forEach(function (t) { if (t !== "USDT") r[t + "/USDT"] = prices[t]; });
      return r;
    },
    subscribe: function (fn) {
      listeners.add(fn);
      if (!timer) timer = setInterval(tick, TICK_MS);
      return function () {
        listeners.delete(fn);
        if (listeners.size === 0 && timer) { clearInterval(timer); timer = null; }
      };
    },
  };
  return api;
})();

// ═══════════════════════════════════════════════════════════════════
// HxApi — live HollaEx exchange client (api.hollaex.com/v2)
// ───────────────────────────────────────────────────────────────────
// Mirrors the Exchange Lite semantics: POST /login returns a user JWT
// (stored as "hollaex_token", the JWT *is* the session), authenticated
// calls send `Authorization: Bearer <token>`. Direct browser calls —
// the HollaEx API serves `Access-Control-Allow-Origin: *`. Live mode
// ("hx_live_mode") makes HxMarket poll real tickers and the Trade page
// use real orderbook/trades/orders.
// ═══════════════════════════════════════════════════════════════════
window.HxApi = (function () {
  var TOKEN_KEY = "hollaex_token";
  var LIVE_KEY = "hx_live_mode";
  var BASE = "https://api.hollaex.com/v2";
  try { BASE = localStorage.getItem("hx_api_base") || BASE; } catch (e) {}

  var cachedUser = null;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || null; } catch (e) { return null; }
  }

  function request(path, options) {
    options = options || {};
    var token = getToken();
    var headers = Object.assign(
      {},
      options.body ? { "Content-Type": "application/json" } : {},
      token ? { Authorization: "Bearer " + token } : {},
      options.headers || {}
    );
    return fetch(BASE + path, Object.assign({}, options, { headers: headers })).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var msg = (data && (data.message || data.error)) || res.statusText || "Request failed";
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  var api = {
    BASE: BASE,
    request: request,
    isLive: function () {
      try { return localStorage.getItem(LIVE_KEY) === "1"; } catch (e) { return false; }
    },
    setLive: function (on) {
      try { localStorage.setItem(LIVE_KEY, on ? "1" : "0"); } catch (e) {}
      window.dispatchEvent(new Event("hx-live-change"));
    },
    isAuthed: function () { return !!getToken(); },
    getCachedUser: function () { return cachedUser; },

    // POST /login → JWT. Token shape varies across kit versions.
    login: function (email, password, otpCode) {
      var body = { email: email, password: password, long_term: true };
      if (otpCode) body.otp_code = otpCode;
      return request("/login", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "custom-device": "terminal" },
      }).then(function (res) {
        var token = res.token
          || (res.data && res.data.token)
          || (typeof res.data === "string" ? res.data : null);
        if (!token) throw new Error("Login succeeded but no token returned");
        try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
        window.dispatchEvent(new Event("hx-auth-change"));
        return api.getUser();
      });
    },
    logout: function () {
      var had = getToken();
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      cachedUser = null;
      window.dispatchEvent(new Event("hx-auth-change"));
      if (had) request("/logout").catch(function () {});
    },
    getUser: function () {
      return request("/user").then(function (u) { cachedUser = u; return u; });
    },

    // Public market data
    getConstants: function () { return request("/constants"); },
    getTickers: function () { return request("/tickers"); },
    getOrderbook: function (symbol) { return request("/orderbook?symbol=" + encodeURIComponent(symbol)); },
    getPublicTrades: function (symbol) { return request("/trades?symbol=" + encodeURIComponent(symbol)); },
    getChart: function (symbol, resolution, from, to) {
      return request("/chart?symbol=" + encodeURIComponent(symbol)
        + "&resolution=" + encodeURIComponent(resolution)
        + "&from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to));
    },

    // Balances: flat {btc_balance, btc_available, ...} → {BTC: {balance, available, hold}}
    getBalance: function () {
      return request("/user/balance").then(function (raw) {
        var out = {};
        Object.keys(raw || {}).forEach(function (k) {
          var m = k.match(/^([a-z0-9]+)_balance$/);
          if (!m) return;
          var sym = m[1];
          var balance = Number(raw[sym + "_balance"]) || 0;
          var available = Number(raw[sym + "_available"]);
          if (!Number.isFinite(available)) available = balance;
          out[sym.toUpperCase()] = {
            balance: balance,
            available: available,
            hold: Math.max(0, balance - available),
          };
        });
        return out;
      });
    },

    // Orders
    getOrders: function (open) {
      return request("/orders?open=" + (open === false ? "false" : "true"));
    },
    placeOrder: function (o) {
      return request("/order", { method: "POST", body: JSON.stringify(o) });
    },
    cancelOrder: function (orderId) {
      return request("/order?order_id=" + encodeURIComponent(orderId), { method: "DELETE" });
    },

    // Quick trade (quote token → execute), for the Convert page later
    getQuickQuote: function (spendingCurrency, receivingCurrency, spendingAmount) {
      return request("/quick-trade?spending_currency=" + encodeURIComponent(spendingCurrency)
        + "&receiving_currency=" + encodeURIComponent(receivingCurrency)
        + "&spending_amount=" + encodeURIComponent(spendingAmount));
    },
    executeQuote: function (quoteToken) {
      return request("/order/execute", { method: "POST", body: JSON.stringify({ token: quoteToken }) });
    },
  };
  return api;
})();

// ═══════════════════════════════════════════════════════════════════
// HxAlerts — one-shot price alerts checked against the HxMarket feed
// ───────────────────────────────────────────────────────────────────
// Alerts persist in localStorage and fire once when the live price
// crosses the target ("above": price >= target, "below": price <=
// target). Fired alerts are removed and broadcast to listeners — the
// app shell forwards them into the notch notification queue.
// ═══════════════════════════════════════════════════════════════════
window.HxAlerts = (function () {
  var KEY = "hx_price_alerts";
  var alerts = [];
  var nextId = 1;
  try {
    alerts = JSON.parse(localStorage.getItem(KEY) || "[]");
    nextId = alerts.reduce(function (m, a) { return Math.max(m, a.id || 0); }, 0) + 1;
  } catch (e) { alerts = []; }

  var listeners = new Set();
  var changeListeners = new Set();
  var unsub = null;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(alerts)); } catch (e) {}
    changeListeners.forEach(function (fn) { try { fn(alerts.slice()); } catch (e) {} });
  }

  function check(m) {
    if (!alerts.length) return;
    var fired = [];
    alerts = alerts.filter(function (a) {
      var p = m.getPrice(a.ticker);
      if (!p) return true;
      var hit = a.condition === "above" ? p >= a.price : p <= a.price;
      if (hit) { fired.push(Object.assign({ firedPrice: p }, a)); return false; }
      return true;
    });
    if (fired.length) {
      save();
      fired.forEach(function (a) {
        listeners.forEach(function (fn) { try { fn(a); } catch (e) {} });
      });
    }
  }

  function ensureWatching() {
    if (!unsub && alerts.length) unsub = window.HxMarket.subscribe(check);
    if (unsub && !alerts.length) { unsub(); unsub = null; }
  }
  ensureWatching();

  return {
    getAll: function () { return alerts.slice(); },
    add: function (ticker, condition, price) {
      alerts.push({ id: nextId++, ticker: ticker, condition: condition, price: price });
      save();
      ensureWatching();
    },
    remove: function (id) {
      alerts = alerts.filter(function (a) { return a.id !== id; });
      save();
      ensureWatching();
    },
    // fn(alert) on fire; returns unsubscribe
    onFire: function (fn) {
      listeners.add(fn);
      return function () { listeners.delete(fn); };
    },
    // fn(alerts) whenever the set changes; returns unsubscribe
    onChange: function (fn) {
      changeListeners.add(fn);
      return function () { changeListeners.delete(fn); };
    },
  };
})();

// ═══════════════════════════════════════════════════════════════════
// HxRoll — lightweight rolling-digit display for live numbers
// ───────────────────────────────────────────────────────────────────
// A slimmed-down cousin of the converter's DigitRoll for places that show
// many small live numbers (ticker tape, markets rows, card prices). Each
// digit that changes does a one-cell vertical reel slide in the tick
// direction; punctuation stays static. Em-based so it inherits font size.
// props: value (string), dir ("up" | "down" | null), className.
// ═══════════════════════════════════════════════════════════════════
(function injectHxRollCSS() {
  if (document.getElementById("hx-roll-css")) return;
  var st = document.createElement("style");
  st.id = "hx-roll-css";
  st.textContent =
    ".hx-roll{display:inline-flex;align-items:center;font-variant-numeric:tabular-nums;line-height:1}" +
    ".hx-roll__digit{display:inline-block;width:1ch;height:1em;overflow:hidden;position:relative}" +
    ".hx-roll__track{display:block;transition-property:transform;transition-timing-function:var(--hx-easing,cubic-bezier(.2,.8,.2,1));will-change:transform}" +
    ".hx-roll__track--no{transition:none}" +
    ".hx-roll__cell{display:grid;place-items:center;height:1em;width:1ch}" +
    ".hx-roll__static{display:inline-grid;place-items:center;height:1em}";
  var add = function () { document.head.appendChild(st); };
  if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
})();

window.HxRollDigit = React.memo(function HxRollDigit(props) {
  var ch = props.ch, dir = props.dir || null;
  var st = React.useState({ stack: [props.ch], pos: 0, anim: false });
  var state = st[0], setState = st[1];
  var prevRef = React.useRef(props.ch);
  var rafRef = React.useRef(null);

  React.useLayoutEffect(function () {
    var prev = prevRef.current;
    if (prev === ch) return;
    prevRef.current = ch;
    if (!dir || !window.isAnimOn || !window.isAnimOn()) {
      setState({ stack: [ch], pos: 0, anim: false });
      return;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (dir === "up") {
      // Reel rolls upward: old digit on top, new slides in from below
      setState({ stack: [prev, ch], pos: 0, anim: false });
      rafRef.current = requestAnimationFrame(function () {
        setState({ stack: [prev, ch], pos: 1, anim: true });
      });
    } else {
      // Reel rolls downward: new digit on top, old slides out below
      setState({ stack: [ch, prev], pos: 1, anim: false });
      rafRef.current = requestAnimationFrame(function () {
        setState({ stack: [ch, prev], pos: 0, anim: true });
      });
    }
  }, [ch, dir]);

  React.useEffect(function () {
    return function () { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  function settle() { setState({ stack: [prevRef.current], pos: 0, anim: false }); }

  return React.createElement("span", { className: "hx-roll__digit" },
    React.createElement("span", {
      className: "hx-roll__track" + (state.anim ? "" : " hx-roll__track--no"),
      style: { transform: "translateY(" + (-state.pos) + "em)", transitionDuration: window.animMs(360) + "ms" },
      onTransitionEnd: settle,
    }, state.stack.map(function (c, i) {
      return React.createElement("span", { key: i, className: "hx-roll__cell" }, c);
    }))
  );
});

window.HxRoll = React.memo(function HxRoll(props) {
  var value = String(props.value == null ? "" : props.value);
  var dir = props.dir || null;
  var chars = value.split("");
  var n = chars.length;
  return React.createElement("span", { className: "hx-roll" + (props.className ? " " + props.className : "") },
    chars.map(function (c, i) {
      // Key from the right so prices keep digit identity when length changes
      var key = "p" + (n - 1 - i);
      if (c >= "0" && c <= "9") return React.createElement(window.HxRollDigit, { key: key, ch: c, dir: dir });
      return React.createElement("span", { key: key + c, className: "hx-roll__static" }, c);
    })
  );
});

// ── Page Registry ──
window.AppPages = {
  _pages: [],
  register: function(id, config) {
    this._pages = this._pages.filter(function(p) { return p.id !== id; });
    this._pages.push(Object.assign({ id: id }, config));
  },
  getAll: function() { return this._pages; },
  get: function(id) { return this._pages.find(function(p) { return p.id === id; }); },
  getOrder: function() { return this._pages.map(function(p) { return p.id; }); }
};

// ── Animation level system ──
window._animLevel = "MEDIUM";

window.getAnimLevel = function() { return window._animLevel; };
window.getAnimScale = function() {
  return window._animLevel === "NONE" ? 0 : window._animLevel === "MEDIUM" ? 0.5 : 1;
};
window.animMs = function(ms) { return Math.round(ms * window.getAnimScale()); };

window.isHeavy = function() { return window._animLevel === "HEAVY"; };
window.isAnimOn = function() { return window._animLevel !== "NONE"; };
window.EASE_SPRING = "cubic-bezier(.34,1.56,.64,1)";
window.EASE_SMOOTH = "cubic-bezier(.2,.8,.2,1)";
window.getEasing = function() { return window.isHeavy() ? window.EASE_SPRING : window.EASE_SMOOTH; };

// ── Sound system ──
// Per-channel defaults: only success (buy confirmation) is on by default
window._sounds = { success: true, notifications: false, favorites: false, save: false };
window.SOUND_CHANNELS = ["success", "notifications", "favorites", "save"];

window.isSoundOn = function(ch) { return !!window._sounds[ch]; };
window.setSounds = function(obj) {
  window.SOUND_CHANNELS.forEach(function(ch) {
    if (typeof obj[ch] === "boolean") window._sounds[ch] = obj[ch];
  });
};

// Synthesized micro-sounds via Web Audio API — no files to load
window._sndCtx = null;
window._getSndCtx = function() {
  if (!window._sndCtx) {
    try { window._sndCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { return null; }
  }
  return window._sndCtx;
};

// Soft ascending two-note pop — for notification arrival
window.playNotifSound = function() {
  if (!isSoundOn("notifications")) return;
  var ctx = window._getSndCtx(); if (!ctx) return;
  var t = ctx.currentTime;
  var play = function(freq, start, dur, vol) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t + start);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + start); osc.stop(t + start + dur);
  };
  play(660, 0, 0.1, 0.08);
  play(880, 0.07, 0.15, 0.07);
};

// Quick ascending chime — for adding favorite
window.playStarSound = function() {
  if (!isSoundOn("favorites")) return;
  var ctx = window._getSndCtx(); if (!ctx) return;
  var t = ctx.currentTime;
  var play = function(freq, start, dur, vol) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t + start);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + start); osc.stop(t + start + dur);
  };
  play(784, 0, 0.1, 0.08);
  play(1047, 0.07, 0.15, 0.09);
};

// Soft descending tone — for removing favorite
window.playUnstarSound = function() {
  if (!isSoundOn("favorites")) return;
  var ctx = window._getSndCtx(); if (!ctx) return;
  var t = ctx.currentTime;
  var osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = "triangle"; osc.frequency.value = 1400;
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.12);
};

// Gentle confirmation chord — for settings save
window.playSaveSound = function() {
  if (!isSoundOn("save")) return;
  var ctx = window._getSndCtx(); if (!ctx) return;
  var t = ctx.currentTime;
  var play = function(freq, start, dur, vol) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t + start);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + start); osc.stop(t + start + dur);
  };
  play(523, 0, 0.15, 0.06);
  play(659, 0.06, 0.15, 0.06);
  play(784, 0.12, 0.22, 0.07);
};

// Preview a sound (bypasses channel toggle — for settings test button)
window.previewSound = function(channel) {
  var ctx = window._getSndCtx();
  if (!ctx) return;
  var t = ctx.currentTime;
  var tone = function(type, freq, start, dur, vol) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t + start);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + start); osc.stop(t + start + dur);
  };
  if (channel === "success") {
    try { var a = new Audio("success-bought-snap.mp4.mp4"); a.volume = 0.5; a.play(); } catch {}
  } else if (channel === "notifications") {
    tone("sine", 660, 0, 0.1, 0.08);
    tone("sine", 880, 0.07, 0.15, 0.07);
  } else if (channel === "favorites") {
    tone("sine", 784, 0, 0.1, 0.08);
    tone("sine", 1047, 0.07, 0.15, 0.09);
  } else if (channel === "save") {
    tone("sine", 523, 0, 0.15, 0.06);
    tone("sine", 659, 0.06, 0.15, 0.06);
    tone("sine", 784, 0.12, 0.22, 0.07);
  }
};

window.setAnimLevel = function(level) {
  window._animLevel = level;
  var b = document.body;
  if (!b) return;
  b.classList.remove("anim-none", "anim-medium", "anim-heavy");
  b.classList.add("anim-" + level.toLowerCase());

  b.style.setProperty('--hx-easing', level === 'HEAVY' ? window.EASE_SPRING : window.EASE_SMOOTH);

  // Inject override stylesheet once
  if (!document.getElementById("hx-anim-overrides")) {
    var st = document.createElement("style");
    st.id = "hx-anim-overrides";
    st.textContent =
      "body.anim-none *,body.anim-none *::before,body.anim-none *::after{" +
      "animation:none!important;transition:none!important}" +
      "body.anim-none .wl-tx-row--highlight{animation:wlTxHighlight 2.2s ease-out!important}";
    document.head.appendChild(st);
  }

  // Inject shared tab-transition keyframes once
  if (!document.getElementById("hx-tab-anims")) {
    var st2 = document.createElement("style");
    st2.id = "hx-tab-anims";
    st2.textContent =
      "@keyframes tabFadeIn{from{opacity:0}to{opacity:1}}" +
      "@keyframes tabSlideInLeft{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}" +
      "@keyframes tabSlideInRight{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}" +
      "@keyframes rowStaggerIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}";
    document.head.appendChild(st2);
  }

  // Inject shared skeleton shimmer styles once (used by all pages)
  if (!document.getElementById("hx-skeleton-css")) {
    var st3 = document.createElement("style");
    st3.id = "hx-skeleton-css";
    st3.textContent =
      ".hx-sk{border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.04) 75%);background-size:400px 100%;animation:hxShimmer 1.4s ease-in-out infinite}" +
      ".hx-sk-circle{border-radius:50%;flex-shrink:0;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.04) 75%);background-size:400px 100%;animation:hxShimmer 1.4s ease-in-out infinite}" +
      ".hx-sk-lines{flex:1;display:flex;flex-direction:column;gap:5px}" +
      "@keyframes hxShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}" +
      "@keyframes hxSkFadeIn{from{opacity:0}to{opacity:1}}";
    document.head.appendChild(st3);
  }
};

// ── Shared skeleton element helpers ──
window.hxSk = function(h, w, delay, extra) {
  return React.createElement("div", {
    className: "hx-sk",
    style: Object.assign({ height: h, width: w, animationDelay: (delay * getAnimScale()) + "s" }, extra)
  });
};

window.hxSkCircle = function(size, delay) {
  return React.createElement("div", {
    className: "hx-sk-circle",
    style: { width: size, height: size, animationDelay: (delay * getAnimScale()) + "s" }
  });
};

// ── Flow / empty / error dead-end UI ──
(function injectFlowStateCSS() {
  if (document.getElementById("hx-flow-css")) return;
  var st = document.createElement("style");
  st.id = "hx-flow-css";
  st.textContent =
    ".hx-empty{padding:28px 16px;text-align:center}" +
    ".hx-empty--compact{padding:12px 10px}" +
    ".hx-empty__icon{font-size:22px;line-height:1;margin-bottom:8px;opacity:.45}" +
    ".hx-empty--compact .hx-empty__icon{font-size:14px;margin-bottom:4px}" +
    ".hx-empty__title{font-size:12px;font-weight:600;color:rgba(255,255,255,.45);letter-spacing:.03em;margin-bottom:4px}" +
    ".hx-empty--compact .hx-empty__title{font-size:11px;margin-bottom:2px}" +
    ".hx-empty__msg{font-size:11px;color:rgba(255,255,255,.22);line-height:1.45;max-width:260px;margin:0 auto}" +
    ".hx-dead{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 24px;min-height:280px}" +
    ".hx-dead--fill{min-height:min(420px,calc(100vh - 200px));width:100%}" +
    ".hx-dead--overlay{position:absolute;inset:0;z-index:800;background:rgba(22,22,30,.92);backdrop-filter:blur(6px);border-radius:14px;min-height:100%}" +
    ".hx-dead__icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.5)}" +
    ".hx-dead__icon--warn{background:rgba(251,146,60,.08);border-color:rgba(251,146,60,.2);color:rgba(251,191,36,.9)}" +
    ".hx-dead__icon--err{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.2);color:rgba(248,113,113,.9)}" +
    ".hx-dead__title{font-size:15px;font-weight:700;color:rgba(255,255,255,.75);letter-spacing:.02em;margin-bottom:6px}" +
    ".hx-dead__msg{font-size:12px;color:rgba(255,255,255,.28);line-height:1.5;max-width:300px;margin-bottom:20px}" +
    ".hx-dead__btn{height:40px;padding:0 20px;border-radius:10px;border:0;font-family:inherit;font-size:12px;font-weight:600;letter-spacing:.04em;cursor:pointer;background:rgba(255,255,255,.1);color:rgba(255,255,255,.85);transition:background 150ms}" +
    ".hx-dead__btn:hover{background:rgba(255,255,255,.16)}" +
    ".hx-dead__btn--primary{background:linear-gradient(135deg,rgba(110,160,255,.9),rgba(110,160,255,.65));color:#0d1118}" +
    ".hx-dead__btn--primary:hover{filter:brightness(1.06)}" +
    ".hx-banner{margin-top:12px;padding:10px 14px;border-radius:10px;display:flex;align-items:flex-start;gap:10px;font-size:11px;line-height:1.45}" +
    ".hx-banner--err{background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.18);color:rgba(252,165,165,.9)}" +
    ".hx-banner--warn{background:rgba(251,146,60,.06);border:1px solid rgba(251,146,60,.18);color:rgba(251,191,36,.9)}" +
    ".hx-banner__icon{flex-shrink:0;font-size:13px;opacity:.85;margin-top:1px}" +
    ".hx-banner__body{flex:1;min-width:0}" +
    ".hx-banner__title{font-weight:600;margin-bottom:2px}" +
    ".hx-banner__btn{margin-top:8px;height:30px;padding:0 12px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);font-family:inherit;font-size:10px;font-weight:600;cursor:pointer;letter-spacing:.03em}" +
    ".hx-banner__btn:hover{background:rgba(255,255,255,.1)}";
  document.head.appendChild(st);
})();

window.FLOW_DEAD_END_PRESETS = {
  offline: {
    icon: "⌁", iconTone: "warn",
    title: "You're offline",
    message: "Check your connection and try again. Balances and quotes won't update until you're back online.",
    actionLabel: "Try again",
  },
  session: {
    icon: "⏱", iconTone: "warn",
    title: "Session expired",
    message: "For your security, sign in again to continue trading and managing your wallet.",
    actionLabel: "Back to sign in",
    primary: true,
  },
  rate: {
    icon: "↯", iconTone: "err",
    title: "Rates unavailable",
    message: "We couldn't load exchange rates right now. Quotes and conversions are paused.",
    actionLabel: "Retry",
  },
  quote: {
    icon: "✕", iconTone: "err",
    title: "Quote failed",
    message: "We couldn't get a price for this pair. Check your amount and try again.",
    actionLabel: "Try again",
  },
  search: {
    icon: "⌕", iconTone: "",
    title: "No results",
    message: "Try a different search term or clear the filter.",
  },
};

window.getFlowPreview = function() {
  try {
    var s = JSON.parse(localStorage.getItem("hx_settings") || "{}");
    var v = s.previewFlowState || "none";
    return ["none", "offline", "session", "rate", "quote"].indexOf(v) !== -1 ? v : "none";
  } catch (e) { return "none"; }
};

window.setFlowPreview = function(state) {
  try {
    var s = JSON.parse(localStorage.getItem("hx_settings") || "{}");
    s.previewFlowState = state || "none";
    localStorage.setItem("hx_settings", JSON.stringify(s));
  } catch (e) {}
  window.dispatchEvent(new Event("hx-flow-preview"));
};

window.EmptyState = function EmptyState(props) {
  var p = props || {};
  var compact = !!p.compact;
  return React.createElement("div", {
    className: "hx-empty" + (compact ? " hx-empty--compact" : ""),
  },
    p.icon ? React.createElement("div", { className: "hx-empty__icon" }, p.icon) : null,
    React.createElement("div", { className: "hx-empty__title" }, p.title || "Nothing here"),
    p.message ? React.createElement("div", { className: "hx-empty__msg" }, p.message) : null
  );
};

window.FlowDeadEnd = function FlowDeadEnd(props) {
  var p = props || {};
  var preset = window.FLOW_DEAD_END_PRESETS[p.variant] || {};
  var icon = p.icon || preset.icon || "○";
  var title = p.title || preset.title || "Something went wrong";
  var message = p.message || preset.message || "";
  var actionLabel = p.actionLabel || preset.actionLabel;
  var iconTone = p.iconTone || preset.iconTone || "";
  var fill = p.fill ? " hx-dead--fill" : "";
  var overlay = p.overlay ? " hx-dead--overlay" : "";
  return React.createElement("div", {
    className: "hx-dead" + fill + overlay,
    role: p.role || "status",
  },
    React.createElement("div", { className: "hx-dead__icon" + (iconTone ? " hx-dead__icon--" + iconTone : "") }, icon),
    React.createElement("div", { className: "hx-dead__title" }, title),
    message ? React.createElement("div", { className: "hx-dead__msg" }, message) : null,
    actionLabel && p.onAction
      ? React.createElement("button", {
          type: "button",
          className: "hx-dead__btn" + (preset.primary || p.primary ? " hx-dead__btn--primary" : ""),
          onClick: p.onAction,
        }, actionLabel)
      : null
  );
};

window.FlowBanner = function FlowBanner(props) {
  var p = props || {};
  var tone = p.tone === "warn" ? "warn" : "err";
  return React.createElement("div", { className: "hx-banner hx-banner--" + tone },
    React.createElement("span", { className: "hx-banner__icon" }, p.icon || (tone === "warn" ? "!" : "✕")),
    React.createElement("div", { className: "hx-banner__body" },
      p.title ? React.createElement("div", { className: "hx-banner__title" }, p.title) : null,
      p.message ? React.createElement("span", null, p.message) : null,
      p.actionLabel && p.onAction
        ? React.createElement("button", { type: "button", className: "hx-banner__btn", onClick: p.onAction }, p.actionLabel)
        : null
    )
  );
};

// ── Shared verification primitives ───────────────────────────────────────────
// Single home for the 6-digit code input and the chained (email → authenticator)
// verification modal, reused by Settings (disable 2FA, change password) and the
// API page (create / revoke keys). Demo codes live here so there's one source.
window.HX_CODES = { email: "654321", twoFa: "123456" };

function injectHxvCSS() {
  if (document.getElementById("hxv-styles")) return;
  var st = document.createElement("style");
  st.id = "hxv-styles";
  st.textContent =
    ".hxv-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;animation:hxvFade 180ms ease}" +
    "@keyframes hxvFade{from{opacity:0}to{opacity:1}}" +
    ".hxv-modal{position:relative;width:100%;max-width:380px;background:rgba(16,16,22,.96);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.5);font-family:'JetBrains Mono',ui-monospace,monospace}" +
    ".hxv-close{position:absolute;top:14px;right:14px;background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:14px}" +
    ".hxv-title{font-size:16px;font-weight:700;text-align:center;color:rgba(255,255,255,.9)}" +
    ".hxv-sub{font-size:12px;color:rgba(255,255,255,.45);text-align:center;margin-top:6px;line-height:1.6}" +
    ".hxv-dots{display:flex;gap:8px;justify-content:center;align-items:center;margin-top:10px}" +
    ".hxv-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}" +
    ".hxv-code-row{display:flex;gap:6px;justify-content:center;margin:18px 0 4px}" +
    ".hxv-code-input{width:36px;height:44px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;color:rgba(255,255,255,.9);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:8px;outline:none;transition:border-color 150ms}" +
    ".hxv-code-input:focus{border-color:rgba(99,102,241,.6)}" +
    "@media(max-width:480px){.hxv-code-input{width:30px;height:40px;font-size:15px}}";
  document.head.appendChild(st);
}

// 6-digit boxed code input.
// props: expected (optional — omit to accept any complete 6-digit code), onVerified, label.
window.HxCodeInput = function HxCodeInput(props) {
  var p = props || {};
  var expected = p.expected, onVerified = p.onVerified, label = p.label || "Verified";
  var cs = React.useState(["", "", "", "", "", ""]); var code = cs[0], setCode = cs[1];
  var es = React.useState("");    var error = es[0], setError = es[1];
  var oks = React.useState(false); var ok = oks[0], setOk = oks[1];
  var refs = React.useRef([]);
  var resetT = React.useRef(null);
  var successT = React.useRef(null);
  // Clear both timers on unmount so a pending success callback can't fire after
  // the host modal has been closed (would otherwise run the gated action anyway).
  React.useEffect(function () {
    return function () {
      if (resetT.current) clearTimeout(resetT.current);
      if (successT.current) clearTimeout(successT.current);
    };
  }, []);

  function tryVerify(digits) {
    var full = digits.join("");
    if (full.length < 6) return;
    // expected omitted → permissive (any complete 6-digit code passes).
    if (expected && full !== expected) {
      setError("Incorrect code. Try again.");
      resetT.current = setTimeout(function () {
        setCode(["", "", "", "", "", ""]); setError("");
        if (refs.current[0]) refs.current[0].focus();
      }, 800);
      return;
    }
    setOk(true);
    successT.current = setTimeout(function () { if (onVerified) onVerified(); }, 450);
  }
  function onChange(i, v) {
    if (ok) return;
    if (v.length > 1) v = v.slice(-1);
    if (v && !/^\d$/.test(v)) return;
    setError("");
    var next = code.slice(); next[i] = v; setCode(next);
    if (v && i < 5 && refs.current[i + 1]) refs.current[i + 1].focus();
    if (v && i === 5) tryVerify(next);
  }
  function onKey(i, e) {
    if (!ok && e.key === "Backspace" && !code[i] && i > 0 && refs.current[i - 1]) refs.current[i - 1].focus();
  }
  function onPaste(e) {
    if (ok) return;
    e.preventDefault();
    var pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    var next = code.slice();
    for (var i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setCode(next);
    if (pasted.length === 6) tryVerify(next);
    else if (refs.current[Math.min(pasted.length, 5)]) refs.current[Math.min(pasted.length, 5)].focus();
  }
  var style = ok ? { borderColor: "rgba(74,222,128,.5)", color: "rgba(74,222,128,.9)" }
            : error ? { borderColor: "rgba(248,113,113,.6)" } : {};
  return React.createElement("div", null,
    React.createElement("div", { className: "hxv-code-row", onPaste: onPaste },
      code.map(function (d, i) {
        return React.createElement("input", {
          key: i,
          ref: function (el) { refs.current[i] = el; },
          className: "hxv-code-input",
          type: "text", inputMode: "numeric", maxLength: 1, value: d, disabled: ok,
          autoFocus: i === 0, style: style,
          onChange: function (e) { onChange(i, e.target.value); },
          onKeyDown: function (e) { onKey(i, e); },
        });
      })
    ),
    error ? React.createElement("div", { style: { textAlign: "center", fontSize: 11, color: "rgba(248,113,113,.85)", marginTop: 6 } }, error) : null,
    ok ? React.createElement("div", { style: { textAlign: "center", fontSize: 12, color: "rgba(74,222,128,.85)", marginTop: 8, fontWeight: 600 } }, "✓ " + label) : null
  );
};

// Chained verify modal: email code → authenticator code → onVerified().
// props: title, onVerified, onClose, codes (defaults to window.HX_CODES),
//        requireTwoFa (default true; false = email step only, for when the
//        account has 2FA disabled).
window.HxChainedVerify = function HxChainedVerify(props) {
  var p = props || {};
  var codes = p.codes || window.HX_CODES;
  var requireTwoFa = p.requireTwoFa !== false;
  var ss = React.useState(1); var step = ss[0], setStep = ss[1];
  function dot(n) {
    return step > n ? { background: "rgba(74,222,128,.15)", color: "rgba(74,222,128,.8)", border: "1px solid rgba(74,222,128,.25)" }
         : step === n ? { background: "rgba(99,102,241,.2)", color: "rgba(99,102,241,.9)", border: "1px solid rgba(99,102,241,.35)" }
         : { background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.06)" };
  }
  var sub = !requireTwoFa
    ? "Step 1 of 1 · Enter the 6-digit code we emailed you"
    : step === 1 ? "Step 1 of 2 · Enter the 6-digit code we emailed you"
                 : "Step 2 of 2 · Enter the code from your authenticator app";
  var dots = requireTwoFa
    ? React.createElement("div", { className: "hxv-dots" },
        React.createElement("span", { className: "hxv-dot", style: dot(1) }, step > 1 ? "✓" : "✉"),
        React.createElement("span", { style: { color: "rgba(255,255,255,.18)" } }, "—"),
        React.createElement("span", { className: "hxv-dot", style: dot(2) }, "🔑"))
    : React.createElement("div", { className: "hxv-dots" },
        React.createElement("span", { className: "hxv-dot", style: dot(1) }, "✉"));
  var emailInput = React.createElement(window.HxCodeInput, {
    key: "email", expected: codes.email, label: "Email verified",
    onVerified: requireTwoFa ? function () { setStep(2); } : p.onVerified,
  });
  var twoFaInput = React.createElement(window.HxCodeInput, {
    key: "2fa", expected: codes.twoFa, label: "Verified", onVerified: p.onVerified,
  });
  return React.createElement("div", { className: "hxv-backdrop", onClick: p.onClose },
    React.createElement("div", { className: "hxv-modal", onClick: function (e) { e.stopPropagation(); } },
      React.createElement("button", { className: "hxv-close", onClick: p.onClose }, "✕"),
      React.createElement("div", { className: "hxv-title" }, p.title || "Confirm It's You"),
      React.createElement("div", { className: "hxv-sub" }, sub),
      dots,
      (requireTwoFa && step === 2) ? twoFaInput : emailInput,
      React.createElement("div", { style: { textAlign: "center", marginTop: 12, fontSize: 10, color: "rgba(255,255,255,.25)" } },
        requireTwoFa ? ("Demo · email " + codes.email + " · authenticator " + codes.twoFa)
                     : ("Demo · email " + codes.email))
    )
  );
};

// Inject the shared verify CSS once at load (rather than on every modal render).
injectHxvCSS();

// ── Global mobile / touch polish ──
(function injectMobileCSS() {
  if (document.getElementById("hx-mobile-css")) return;
  var st = document.createElement("style");
  st.id = "hx-mobile-css";
  st.textContent =
    "html{overflow-x:hidden;-webkit-text-size-adjust:100%}" +
    "body{overscroll-behavior-y:none}" +
    "button,a,input,select,textarea,[role=button]{-webkit-tap-highlight-color:transparent}" +
    "button,.cv-tab,.mk-pill,.mk-trade-btn,.mk-view-btn,.wl-cd-btn,.wl-confirm-btn,.wl-copy-btn,.st-save-btn,.st-toggle{touch-action:manipulation}";
  document.head.appendChild(st);
})();

// Init from localStorage
(function() {
  try {
    var s = JSON.parse(localStorage.getItem("hx_settings") || "{}");
    if (s.animLevel && ["NONE","MEDIUM","HEAVY"].indexOf(s.animLevel) !== -1)
      window._animLevel = s.animLevel;
    if (s.sounds) window.setSounds(s.sounds);
  } catch(e) {}
  if (document.body) window.setAnimLevel(window._animLevel);
  else document.addEventListener("DOMContentLoaded", function() {
    window.setAnimLevel(window._animLevel);
  });
})();
