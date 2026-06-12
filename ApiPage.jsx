import React, { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════
// ApiPage — generate / revoke API keys. Every mutating action is gated
// behind a chained verification (email code → authenticator code).
// Self-contained: each page file is eval'd in its own scope, so this
// keeps a local copy of the code-input + chained-verify primitives.
// ═══════════════════════════════════════════════════════════════════

// ─── Storage ────────────────────────────────────────────────────────────────
const API_KEYS_STORE = "hx_api_keys";

const SCOPES = [
  { id: "read",     label: "Read",     sub: "View balances, orders, and history",        risk: "low"  },
  { id: "trade",    label: "Trade",    sub: "Place and cancel orders",                    risk: "med"  },
  { id: "withdraw", label: "Withdraw", sub: "Move funds off the exchange — high risk",    risk: "high" },
];

const SEED_KEYS = [
  { id: "k_8f3a2c", label: "Trading bot", apiKey: "hx_live_8f3a2c91d4e6", scopes: ["read", "trade"], ips: [], created: "Feb 02, 2026", lastUsed: "2h ago" },
];

// ─── CSS ─────────────────────────────────────────────────────────────────────
const API_CSS_ID = "api-page-styles";
const API_STYLE = `
.api-root{font-family:'JetBrains Mono',ui-monospace,monospace;color:rgba(255,255,255,.88);padding:8px 0 40px}
.api-head{margin-bottom:18px}
.api-title{font-size:20px;font-weight:700;letter-spacing:.02em;color:rgba(255,255,255,.92)}
.api-sub{font-size:12px;color:rgba(255,255,255,.4);margin-top:4px;line-height:1.6}
.api-section{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:6px 4px;margin-bottom:16px}
.api-section-title{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);padding:12px 16px 8px}
.api-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.05)}
.api-row:first-of-type{border-top:none}
.api-key-label{font-size:13px;font-weight:600;color:rgba(255,255,255,.85)}
.api-key-meta{font-size:11px;color:rgba(255,255,255,.4);margin-top:3px;font-family:'JetBrains Mono',monospace}
.api-chip{display:inline-block;font-size:9px;letter-spacing:.06em;padding:2px 6px;border-radius:4px;margin-right:4px;text-transform:uppercase;border:1px solid}
.api-chip--read{color:rgba(129,140,248,.9);border-color:rgba(129,140,248,.3);background:rgba(129,140,248,.08)}
.api-chip--trade{color:rgba(74,222,128,.9);border-color:rgba(74,222,128,.3);background:rgba(74,222,128,.08)}
.api-chip--withdraw{color:rgba(251,146,60,.95);border-color:rgba(251,146,60,.35);background:rgba(251,146,60,.08)}
.api-btn{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.04em;border-radius:6px;padding:6px 12px;cursor:pointer;transition:all 150ms;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.7)}
.api-btn:hover{background:rgba(255,255,255,.09);color:rgba(255,255,255,.9)}
.api-btn--danger{border-color:rgba(248,113,113,.4);color:rgba(248,113,113,.9);background:rgba(248,113,113,.06)}
.api-btn--danger:hover{background:rgba(248,113,113,.12)}
.api-btn--primary{border-color:rgba(99,102,241,.5);color:#fff;background:rgba(99,102,241,.3)}
.api-btn--primary:hover{background:rgba(99,102,241,.45)}
.api-btn:disabled{opacity:.35;cursor:not-allowed}
.api-input{width:100%;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);border-radius:8px;height:38px;padding:0 12px;font-family:'JetBrains Mono',monospace;font-size:13px;color:rgba(255,255,255,.85);outline:none;transition:border-color 150ms}
.api-input:focus{border-color:rgba(99,102,241,.5)}
.api-field-label{font-size:11px;color:rgba(255,255,255,.45);margin:14px 16px 6px;letter-spacing:.04em}
.api-scope{display:flex;align-items:flex-start;gap:10px;margin:8px 16px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);cursor:pointer;transition:border-color 150ms}
.api-scope--on{border-color:rgba(99,102,241,.45);background:rgba(99,102,241,.06)}
.api-scope-cb{margin-top:2px;accent-color:rgba(99,102,241,.8);cursor:pointer;flex-shrink:0;width:15px;height:15px}
.api-scope-label{font-size:12px;font-weight:600;color:rgba(255,255,255,.82)}
.api-scope-sub{font-size:10px;color:rgba(255,255,255,.4);margin-top:2px;line-height:1.5}
.api-scope-risk{font-size:8px;letter-spacing:.06em;padding:1px 5px;border-radius:3px;text-transform:uppercase;margin-left:6px;vertical-align:middle}
.api-scope-risk--high{color:rgba(251,146,60,.95);background:rgba(251,146,60,.12);border:1px solid rgba(251,146,60,.3)}
.api-note{display:flex;gap:8px;align-items:flex-start;margin:10px 16px 14px;padding:10px 12px;border-radius:8px;font-size:11px;line-height:1.55}
.api-note--info{background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.15);color:rgba(165,180,252,.85)}
.api-note--warn{background:rgba(251,146,60,.07);border:1px solid rgba(251,146,60,.2);color:rgba(251,191,36,.9)}
.api-empty{text-align:center;padding:28px 16px;color:rgba(255,255,255,.35);font-size:12px}
/* modal */
.api-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;animation:apiFade 180ms ease}
@keyframes apiFade{from{opacity:0}to{opacity:1}}
.api-modal{position:relative;width:100%;max-width:380px;background:rgba(16,16,22,.96);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.5)}
.api-modal-close{position:absolute;top:14px;right:14px;background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:14px}
.api-modal-title{font-size:16px;font-weight:700;text-align:center;color:rgba(255,255,255,.9)}
.api-modal-sub{font-size:12px;color:rgba(255,255,255,.45);text-align:center;margin-top:6px;line-height:1.6}
.api-secret-box{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;letter-spacing:.04em;border-radius:8px;padding:10px 12px;text-align:center;word-break:break-all;user-select:all;margin-bottom:4px}
`;
function injectApiCSS() {
  if (document.getElementById(API_CSS_ID)) return;
  const el = document.createElement("style");
  el.id = API_CSS_ID;
  el.textContent = API_STYLE;
  document.head.appendChild(el);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function randHex(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}
function makeKey(label, scopes, ips) {
  return {
    id: "k_" + randHex(6),
    label: label || "Untitled key",
    apiKey: "hx_live_" + randHex(12),
    secret: "hx_sk_" + randHex(40),
    scopes,
    ips,
    created: "Today",
    lastUsed: "—",
  };
}
function maskKey(k) {
  return k ? k.slice(0, 11) + "••••" + k.slice(-4) : "";
}

// ─── Secret reveal modal (shown once) ────────────────────────────────────────
function SecretModal({ keyObj, onClose }) {
  const [copied, setCopied] = useState("");
  const copy = (text, which) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    setCopied(which); setTimeout(() => setCopied(""), 1500);
  };
  return (
    <div className="api-backdrop" onClick={onClose}>
      <div className="api-modal" onClick={e => e.stopPropagation()}>
        <button className="api-modal-close" onClick={onClose}>✕</button>
        <div className="api-modal-title" style={{ color: "rgba(74,222,128,.9)" }}>✓ Key created</div>
        <div className="api-modal-sub" style={{ color: "rgba(251,191,36,.85)" }}>
          Copy your secret now — for your security it will never be shown again.
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>API key</div>
          <div className="api-secret-box" style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", color: "rgba(165,180,252,.9)" }}>{keyObj.apiKey}</div>
          <button className="api-btn" style={{ width: "100%", marginBottom: 12 }} onClick={() => copy(keyObj.apiKey, "key")}>{copied === "key" ? "Copied ✓" : "Copy API key"}</button>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>Secret key</div>
          <div className="api-secret-box" style={{ background: "rgba(251,146,60,.08)", border: "1px solid rgba(251,146,60,.25)", color: "rgba(251,191,36,.9)" }}>{keyObj.secret}</div>
          <button className="api-btn" style={{ width: "100%" }} onClick={() => copy(keyObj.secret, "secret")}>{copied === "secret" ? "Copied ✓" : "Copy secret"}</button>
        </div>
        <button className="api-btn api-btn--primary" style={{ width: "100%", marginTop: 18 }} onClick={onClose}>I've saved my secret</button>
      </div>
    </div>
  );
}

// ─── Real verification modal (live exchange) ────────────────────────────────
// The real API requires BOTH an emailed code and an authenticator (2FA) code
// for key create/revoke. Opening this modal triggers the confirmation email.
function RealVerifyModal({ title, onSubmit, onClose, busy, error }) {
  const [emailCode, setEmailCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  useEffect(() => {
    window.HxApi.requestEmailConfirmation()
      .then(() => setEmailSent(true))
      .catch(() => setEmailSent(false));
  }, []);
  const canSubmit = emailCode.trim().length > 0 && otpCode.trim().length > 0 && !busy;
  return (
    <div className="api-backdrop" onClick={() => !busy && onClose()}>
      <div className="api-modal" onClick={e => e.stopPropagation()}>
        <button className="api-modal-close" onClick={onClose}>✕</button>
        <div className="api-modal-title">{title}</div>
        <div className="api-modal-sub">
          {emailSent
            ? "We emailed a confirmation code to your account email. Enter it with your authenticator code."
            : "Requesting an email confirmation code… enter it below with your authenticator code."}
        </div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="api-input" inputMode="numeric" placeholder="Email code" autoFocus
            value={emailCode} onChange={e => setEmailCode(e.target.value)} />
          <input className="api-input" inputMode="numeric" placeholder="Authenticator (2FA) code"
            value={otpCode} onChange={e => setOtpCode(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && canSubmit) onSubmit(emailCode.trim(), otpCode.trim()); }} />
          <button className="api-btn api-btn--primary" style={{ width: "100%", height: 40 }}
            disabled={!canSubmit} onClick={() => onSubmit(emailCode.trim(), otpCode.trim())}>
            {busy ? "Submitting…" : "Confirm"}
          </button>
          {error && <div style={{ fontSize: 11, color: "rgba(248,113,113,.85)", textAlign: "center", lineHeight: 1.5 }}>{error}</div>}
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", textAlign: "center", lineHeight: 1.5 }}>
            The exchange requires 2FA to be enabled on your account for API key changes.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ApiPage({ embedded, onNavigate }) {
  // Chained verify modal (email → authenticator) is shared from shared.js;
  // resolved at render time so script-order can't leave it undefined.
  const ChainedVerify = window.HxChainedVerify;
  const [keys, setKeys] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(API_KEYS_STORE) || "null");
      if (Array.isArray(s)) return s;
    } catch (_) {}
    return SEED_KEYS;
  });
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState(["read"]);
  const [ipText, setIpText] = useState("");
  const [verify, setVerify] = useState(null); // { type:'create' } | { type:'revoke', id }
  const [reveal, setReveal] = useState(null);

  useEffect(() => { injectApiCSS(); }, []);
  useEffect(() => {
    try { localStorage.setItem(API_KEYS_STORE, JSON.stringify(keys)); } catch (_) {}
  }, [keys]);

  // ── Real session: keys live on the exchange, not in localStorage ──
  const [real, setReal] = useState(() => window.hxIsRealSession());
  const [realKeys, setRealKeys] = useState(null);
  const [realBusy, setRealBusy] = useState(false);
  const [realErr, setRealErr] = useState("");
  const refreshRealKeys = () => {
    if (!window.hxIsRealSession()) return;
    window.HxApi.getTokens().then(d => {
      const rows = Array.isArray(d && d.data) ? d.data : Array.isArray(d) ? d : [];
      setRealKeys(rows.filter(r => !r.revoked).map(r => ({
        id: r.id,
        label: r.name || "Unnamed key",
        apiKey: r.apiKey || r.key || "",
        scopes: ["read", "trade", "withdraw"].filter(s => r["can_" + s] === true),
        ips: Array.isArray(r.whitelisted_ips) ? r.whitelisted_ips : [],
        created: r.created_at ? window.hxFmtWhen(r.created_at) : "—",
        lastUsed: "—",
      })));
    }).catch(() => setRealKeys([]));
  };
  useEffect(() => {
    const sync = () => {
      const r = window.hxIsRealSession();
      setReal(r);
      if (r) refreshRealKeys(); else setRealKeys(null);
    };
    sync();
    window.addEventListener("hx-live-change", sync);
    window.addEventListener("hx-auth-change", sync);
    return () => {
      window.removeEventListener("hx-live-change", sync);
      window.removeEventListener("hx-auth-change", sync);
    };
  }, []);

  // Submit handler for the real verify modal (email code + 2FA code)
  const onRealVerify = (emailCode, otpCode) => {
    const action = verify;
    if (!action) return;
    setRealBusy(true);
    setRealErr("");
    if (action.type === "create") {
      const ips = ipText.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
      window.HxApi.createToken(label.trim() || "Untitled key", otpCode, emailCode, ips)
        .then(res => {
          setVerify(null);
          setReveal({
            apiKey: res.apiKey || res.key || "(see exchange dashboard)",
            secret: res.secret || "(not returned)",
          });
          setLabel(""); setScopes(["read"]); setIpText("");
          refreshRealKeys();
        })
        .catch(e => setRealErr(e.message || "Failed to create key"))
        .then(() => setRealBusy(false));
    } else {
      window.HxApi.revokeToken(action.id, otpCode, emailCode)
        .then(() => { setVerify(null); refreshRealKeys(); })
        .catch(e => setRealErr(e.message || "Failed to revoke key"))
        .then(() => setRealBusy(false));
    }
  };

  const shownKeys = real ? (realKeys || []) : keys;

  const toggleScope = (id) =>
    setScopes(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const onVerified = () => {
    const action = verify;
    setVerify(null);
    if (action.type === "create") {
      const ips = ipText.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
      const k = makeKey(label.trim(), scopes, ips);
      setKeys(prev => [...prev, { id: k.id, label: k.label, apiKey: k.apiKey, scopes: k.scopes, ips: k.ips, created: k.created, lastUsed: k.lastUsed }]);
      setReveal(k);
      setLabel(""); setScopes(["read"]); setIpText("");
    } else if (action.type === "revoke") {
      setKeys(prev => prev.filter(k => k.id !== action.id));
    }
  };

  const canCreate = label.trim().length > 0 && scopes.length > 0;
  const hasWithdraw = scopes.includes("withdraw");

  return (
    <div className="api-root">
      <div className="api-head">
        <div className="api-title">
          API Keys
          {real && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", padding: "3px 7px", borderRadius: 5, marginLeft: 10, verticalAlign: "middle", background: "rgba(74,222,128,.12)", color: "#4ade80" }}>LIVE</span>}
        </div>
        <div className="api-sub">
          {real
            ? "Real HMAC keys on your exchange account. Creating or revoking requires an emailed code + your authenticator. Secrets are shown only once."
            : "Programmatic access to your HX account. Creating or revoking a key requires email + 2FA verification. Secret keys are shown only once."}
        </div>
      </div>

      {/* Existing keys */}
      <div className="api-section">
        <div className="api-section-title">Your keys · {shownKeys.length}</div>
        {real && realKeys === null ? (
          <div className="api-empty">Loading your keys…</div>
        ) : shownKeys.length === 0 ? (
          <div className="api-empty">No API keys yet. Create one below to get started.</div>
        ) : shownKeys.map(k => (
          <div className="api-row" key={k.id}>
            <div style={{ minWidth: 0 }}>
              <div className="api-key-label">{k.label}</div>
              <div className="api-key-meta">{maskKey(k.apiKey)} · created {k.created} · last used {k.lastUsed}</div>
              <div style={{ marginTop: 6 }}>
                {k.scopes.map(s => <span key={s} className={"api-chip api-chip--" + s}>{s}</span>)}
                {k.ips && k.ips.length > 0 && <span className="api-chip" style={{ color: "rgba(255,255,255,.5)", borderColor: "rgba(255,255,255,.15)" }}>IP-locked</span>}
              </div>
            </div>
            <button className="api-btn api-btn--danger" onClick={() => setVerify({ type: "revoke", id: k.id })}>Revoke</button>
          </div>
        ))}
      </div>

      {/* Create new key */}
      <div className="api-section">
        <div className="api-section-title">Create new key</div>
        <div className="api-field-label">Label</div>
        <div style={{ padding: "0 16px" }}>
          <input className="api-input" placeholder="e.g. Trading bot" value={label} onChange={e => setLabel(e.target.value)} />
        </div>

        <div className="api-field-label">Permissions (least privilege)</div>
        {SCOPES.map(s => (
          <label key={s.id} className={"api-scope" + (scopes.includes(s.id) ? " api-scope--on" : "")}>
            <input type="checkbox" className="api-scope-cb" checked={scopes.includes(s.id)} onChange={() => toggleScope(s.id)} />
            <span>
              <span className="api-scope-label">
                {s.label}
                {s.risk === "high" && <span className="api-scope-risk api-scope-risk--high">high risk</span>}
              </span>
              <span className="api-scope-sub">{s.sub}</span>
            </span>
          </label>
        ))}

        <div className="api-field-label">IP allowlist <span style={{ opacity: .6 }}>(optional · comma-separated)</span></div>
        <div style={{ padding: "0 16px" }}>
          <input className="api-input" placeholder="e.g. 203.0.113.4, 198.51.100.0" value={ipText} onChange={e => setIpText(e.target.value)} />
        </div>

        {hasWithdraw && (
          <div className="api-note api-note--warn">
            <span>⚠</span>
            <span>The <strong>Withdraw</strong> scope lets this key move funds off the exchange. Use an IP allowlist and store the secret in a vault.</span>
          </div>
        )}
        <div className="api-note api-note--info">
          <span>🔒</span>
          <span>You'll confirm with an email code and your authenticator before the key is issued.</span>
        </div>
        {real && (
          <div className="api-note api-note--warn">
            <span>ℹ</span>
            <span>Live keys are created with the exchange's default permissions — the checkboxes above don't apply yet (permission editing lands in a later update). The IP allowlist <strong>is</strong> applied.</span>
          </div>
        )}

        <div style={{ padding: "0 16px 14px" }}>
          <button className="api-btn api-btn--primary" style={{ width: "100%", height: 40 }}
            disabled={!canCreate} onClick={() => setVerify({ type: "create" })}>
            + Generate API key
          </button>
        </div>
      </div>

      {verify && (real ? (
        <RealVerifyModal
          title={verify.type === "create" ? "Create API Key" : "Revoke API Key"}
          onSubmit={onRealVerify}
          onClose={() => { if (!realBusy) { setVerify(null); setRealErr(""); } }}
          busy={realBusy}
          error={realErr}
        />
      ) : (
        <ChainedVerify
          title={verify.type === "create" ? "Create API Key" : "Revoke API Key"}
          onVerified={onVerified}
          onClose={() => setVerify(null)}
        />
      ))}
      {reveal && <SecretModal keyObj={reveal} onClose={() => setReveal(null)} />}
    </div>
  );
}

window.ApiPage = ApiPage;
AppPages.register("api", {
  component: ApiPage,
  label: "API",
  notchTab: false,
  fullWidth: true,
});
