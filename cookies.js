// ─────────────────────────────────────────────────────────────────────────────
// cookies.js — reusable cookie-consent banner + settings modal.
// Drop <script src="cookies.js"></script> before </body> on any page.
// Footer "Cookies" links call window.hxCookies.open(). Choice persists in
// localStorage ("hx_cookie_consent"); the banner auto-shows until a choice is made.
// Self-contained: injects its own styles + DOM, uses literal brand colors.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  var KEY = "hx_cookie_consent";

  var CSS = "" +
  ".hxck-bar{position:fixed;left:0;right:0;bottom:0;z-index:1000;background:rgba(20,20,28,.97);backdrop-filter:blur(10px);border-top:1px solid rgba(255,255,255,.08);font-family:'JetBrains Mono',ui-monospace,monospace}" +
  ".hxck-bar-in{max-width:1080px;margin:0 auto;display:flex;align-items:center;gap:18px;justify-content:space-between;padding:14px 24px}" +
  ".hxck-text{font-size:12.5px;color:rgba(255,255,255,.55);line-height:1.55;max-width:640px}" +
  ".hxck-text a{color:#6ea0ff;text-decoration:underline;text-underline-offset:2px}" +
  ".hxck-actions{display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap}" +
  ".hxck-btn{font-family:inherit;font-size:12px;font-weight:700;letter-spacing:.03em;border-radius:9px;padding:9px 14px;cursor:pointer;border:1px solid transparent;transition:filter 150ms,background 150ms,border-color 150ms;white-space:nowrap}" +
  ".hxck-btn--p{background:linear-gradient(135deg,#4ade80,#36c46b);color:#06140b}" +
  ".hxck-btn--p:hover{filter:brightness(1.06)}" +
  ".hxck-btn--g{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.85)}" +
  ".hxck-btn--g:hover{border-color:rgba(255,255,255,.28)}" +
  ".hxck-ov{position:fixed;inset:0;z-index:1001;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'JetBrains Mono',ui-monospace,monospace}" +
  ".hxck-modal{background:#1a1a24;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:22px;width:100%;max-width:440px;box-shadow:0 24px 64px rgba(0,0,0,.6);color:rgba(255,255,255,.92)}" +
  ".hxck-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}" +
  ".hxck-head h3{font-size:16px;font-weight:700;margin:0}" +
  ".hxck-close{background:rgba(255,255,255,.06);border:0;color:rgba(255,255,255,.45);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;font-family:inherit;line-height:1}" +
  ".hxck-close:hover{background:rgba(255,255,255,.12);color:#fff}" +
  ".hxck-sub{font-size:12px;color:rgba(255,255,255,.45);margin-bottom:14px;line-height:1.5}" +
  ".hxck-opt{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;border-top:1px solid rgba(255,255,255,.08)}" +
  ".hxck-opt-name{font-size:13px;font-weight:600}" +
  ".hxck-opt-desc{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;line-height:1.45}" +
  ".hxck-pill{font-size:10px;font-weight:700;letter-spacing:.06em;color:#4ade80;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.22);border-radius:999px;padding:3px 9px;white-space:nowrap}" +
  ".hxck-sw{width:18px;height:18px;accent-color:#4ade80;cursor:pointer;flex-shrink:0}" +
  ".hxck-modal-act{display:flex;gap:8px;margin-top:18px}" +
  ".hxck-modal-act .hxck-btn{flex:1}" +
  "@media(max-width:600px){.hxck-bar-in{flex-direction:column;align-items:flex-start}.hxck-actions{width:100%}.hxck-actions .hxck-btn{flex:1}}";

  var HTML = "" +
  '<div class="hxck-bar" id="hxckBar" role="region" aria-label="Cookie consent" hidden>' +
    '<div class="hxck-bar-in">' +
      '<p class="hxck-text">We use cookies to operate the exchange, remember your preferences, and improve HollaEx. See our <a href="privacy.html">Privacy Policy</a>.</p>' +
      '<div class="hxck-actions">' +
        '<button class="hxck-btn hxck-btn--g" type="button" data-ck="open">Manage</button>' +
        '<button class="hxck-btn hxck-btn--g" type="button" data-ck="reject">Reject non-essential</button>' +
        '<button class="hxck-btn hxck-btn--p" type="button" data-ck="acceptAll">Accept all</button>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div class="hxck-ov" id="hxckModal" hidden>' +
    '<div class="hxck-modal" role="dialog" aria-modal="true" aria-label="Cookie settings">' +
      '<div class="hxck-head"><h3>Cookie settings</h3><button class="hxck-close" type="button" data-ck="close" aria-label="Close">×</button></div>' +
      '<p class="hxck-sub">Manage how HollaEx uses cookies. Necessary cookies are always on.</p>' +
      '<div class="hxck-opt"><div><div class="hxck-opt-name">Necessary</div><div class="hxck-opt-desc">Required for the site and exchange to function.</div></div><span class="hxck-pill">Always on</span></div>' +
      '<label class="hxck-opt"><div><div class="hxck-opt-name">Analytics</div><div class="hxck-opt-desc">Help us understand usage to improve the product.</div></div><input type="checkbox" class="hxck-sw" id="hxckAnalytics" /></label>' +
      '<label class="hxck-opt"><div><div class="hxck-opt-name">Marketing</div><div class="hxck-opt-desc">Personalize offers and measure campaigns.</div></div><input type="checkbox" class="hxck-sw" id="hxckMarketing" /></label>' +
      '<div class="hxck-modal-act"><button class="hxck-btn hxck-btn--g" type="button" data-ck="reject">Reject all</button><button class="hxck-btn hxck-btn--p" type="button" data-ck="save">Save preferences</button></div>' +
    '</div>' +
  '</div>';

  function get() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  function init() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var holder = document.createElement("div");
    holder.innerHTML = HTML;
    document.body.appendChild(holder);

    var bar = document.getElementById("hxckBar");
    var modal = document.getElementById("hxckModal");
    var an = document.getElementById("hxckAnalytics");
    var mk = document.getElementById("hxckMarketing");

    function openM() { var c = get() || {}; an.checked = !!c.analytics; mk.checked = !!c.marketing; modal.hidden = false; }
    function closeM() { modal.hidden = true; }
    function persist(a, m) { store({ necessary: true, analytics: a, marketing: m, ts: Date.now() }); bar.hidden = true; closeM(); }

    window.hxCookies = {
      open: openM,
      close: closeM,
      acceptAll: function () { persist(true, true); },
      reject: function () { persist(false, false); },
      save: function () { persist(an.checked, mk.checked); },
    };

    holder.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ck]");
      if (!b) return;
      var k = b.getAttribute("data-ck");
      if (k === "open") openM();
      else if (k === "close") closeM();
      else if (k === "acceptAll") window.hxCookies.acceptAll();
      else if (k === "reject") window.hxCookies.reject();
      else if (k === "save") window.hxCookies.save();
    });
    modal.addEventListener("click", function (e) { if (e.target === modal) closeM(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeM(); });

    if (!get()) bar.hidden = false;
  }

  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
