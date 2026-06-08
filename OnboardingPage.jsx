import React, { useState, useEffect, useRef } from "react";

// ─── Storage keys ─────────────────────────────────────────────────────────────
const KEY_ONBOARDED = "hx_onboarded";
const KEY_EMAIL     = "hx_user_email";
const KEY_IP_SEED   = "hx_ip_seed";
const DEFAULT_SEED  = "hx-onboarding-default";

// ─── Standalone CSS injection ─────────────────────────────────────────────────
const OB_CSS_ID = "ob-page-styles";

const OB_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(ellipse at 50% 50%, #181826 0%, #090912 40%, #020203 100%);font-family:'JetBrains Mono',ui-monospace,monospace;color:rgba(255,255,255,.88)}

@keyframes obFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes obShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes obSpin{to{transform:rotate(360deg)}}

.ob-root{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.ob-bg{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.35}
.ob-bg svg{width:100%;height:100%;object-fit:cover}
.ob-screen{position:relative;z-index:1;width:100%;max-width:520px;padding:24px 16px;animation:obFadeIn 300ms ease}

.ob-card{background:rgba(12,12,18,.75);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:40px 44px;backdrop-filter:blur(16px);aspect-ratio:1/1;display:flex;flex-direction:column;justify-content:center;box-shadow:0 24px 80px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.25)}

.ob-wordmark{text-align:center;margin-bottom:6px;margin-top:-24px}
.ob-logo{height:38px;width:auto;display:block;margin:0 auto;opacity:.85}
.ob-tagline{font-size:11px;color:rgba(255,255,255,.22);letter-spacing:.08em;text-align:center;margin-bottom:48px}

.ob-field{display:flex;flex-direction:column;gap:0;margin-bottom:24px;position:relative}
.ob-input{background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.18);border-radius:0;height:36px;padding:0 28px 0 2px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;color:rgba(255,255,255,.82);outline:none;transition:border-color 150ms;width:100%}
.ob-input:focus{border-bottom-color:rgba(255,255,255,.5)}
.ob-input--error{border-bottom-color:rgba(248,113,113,.6)!important}
.ob-err{font-size:11px;color:rgba(248,113,113,.7);letter-spacing:.02em;margin-top:4px}

.ob-eye-btn{position:absolute;right:2px;bottom:6px;background:none;border:none;padding:2px;cursor:pointer;color:rgba(255,255,255,.28);display:flex;align-items:center;line-height:0;transition:color 150ms}
.ob-eye-btn:hover{color:rgba(255,255,255,.6)}

.ob-submit{margin-top:36px;background:none;border:1px solid rgba(255,255,255,.18);border-radius:8px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;color:rgba(255,255,255,.55);cursor:pointer;letter-spacing:.10em;padding:10px 20px;transition:all 150ms;display:flex;align-items:center;gap:8px;width:100%;justify-content:center}
.ob-submit:hover{color:rgba(255,255,255,.88);border-color:rgba(255,255,255,.35)}
.ob-submit:disabled{opacity:.3;cursor:not-allowed}
.ob-spinner{width:12px;height:12px;border:1.5px solid rgba(255,255,255,.15);border-top-color:rgba(255,255,255,.6);border-radius:50%;animation:obSpin 600ms linear infinite}
.ob-shake{animation:obShake 350ms ease}
.ob-link-row{text-align:center;margin-top:20px;display:flex;flex-direction:column;gap:8px}
.ob-link{background:none;border:none;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;font-weight:600;color:rgba(255,255,255,.35);cursor:pointer;padding:0;letter-spacing:.03em;transition:color 150ms}
.ob-link:hover{color:rgba(255,255,255,.65)}

.ob-cred-err{font-size:11px;color:rgba(248,113,113,.75);text-align:center;letter-spacing:.02em;margin-top:10px}

.ob-tos-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;cursor:pointer}
.ob-tos-cb{margin-top:2px;accent-color:rgba(255,255,255,.5);cursor:pointer;flex-shrink:0}
.ob-tos-label{font-size:11px;color:rgba(255,255,255,.35);line-height:1.5;cursor:pointer;user-select:none}
.ob-tos-err{font-size:11px;color:rgba(248,113,113,.7);letter-spacing:.02em;margin-top:2px}

.ob-resend-row{text-align:center;margin-top:12px}
.ob-resend-timer{font-size:11px;color:rgba(255,255,255,.25);letter-spacing:.03em}

/* Narrow screens: the 1:1 card crushes the fields. Drop the square so the card
   height grows with content, and tighten spacing. Square is kept on wider screens. */
@media(max-width:420px){
  .ob-screen{padding:20px 12px}
  .ob-card{aspect-ratio:auto;padding:28px 22px}
  .ob-wordmark{margin-top:0}
  .ob-tagline{margin-bottom:24px}
  .ob-field{margin-bottom:18px}
  .ob-submit{margin-top:24px}
}
`;

function injectObCSS() {
  if (document.getElementById(OB_CSS_ID)) return;
  const el = document.createElement("style");
  el.id = OB_CSS_ID;
  el.textContent = OB_STYLE;
  document.head.appendChild(el);
}

// ─── Eye icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ─── Guilloche background ─────────────────────────────────────────────────────
// Onboarding loads standalone (no shared.js) so keep local copy of the seeded RNG.
function makeSeededRand(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function () {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return (h >>> 0) / 0xffffffff;
  };
}

const AV_PALETTES = [
  { thread: "74,222,128"  },
  { thread: "74,222,128"  },
  { thread: "255,220,100" },
  { thread: "255,180,180" },
  { thread: "200,255,220" },
  { thread: "220,180,255" },
  { thread: "180,240,255" },
  { thread: "255,220,200" },
];

function buildObBgSVG(seed) {
  let ph = 0;
  for (let i = 0; i < seed.length; i++) ph = (Math.imul(37, ph) + seed.charCodeAt(i)) | 0;
  const pal  = AV_PALETTES[Math.abs(ph) % AV_PALETTES.length];
  const rand = makeSeededRand(seed);
  const W = 900, H = 600;
  const parts = [];

  parts.push(`<defs>
    <pattern id="ob-mesh" width="5" height="5" patternUnits="userSpaceOnUse">
      <line x1="0" y1="5" x2="5" y2="0" stroke="rgba(255,255,255,0.18)" stroke-width="0.4"/>
      <line x1="-1" y1="1" x2="1" y2="-1" stroke="rgba(255,255,255,0.18)" stroke-width="0.4"/>
      <line x1="4" y1="6" x2="6" y2="4" stroke="rgba(255,255,255,0.18)" stroke-width="0.4"/>
    </pattern>
  </defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#ob-mesh)"/>`);

  for (let i = 0; i < 11; i++) {
    const y0 = (i / 10) * H;
    const f1 = 0.010 + rand() * 0.016, a1 = 2.5 + rand() * 5.5, p1 = rand() * Math.PI * 2;
    const f2 = 0.028 + rand() * 0.030, a2 = 0.8 + rand() * 2.2, p2 = rand() * Math.PI * 2;
    const pts = [];
    for (let x = 0; x <= W; x += 2) {
      pts.push(`${x},${(y0 + Math.sin(x*f1+p1)*a1 + Math.sin(x*f2+p2)*a2).toFixed(1)}`);
    }
    parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(255,255,255,${(0.18+rand()*0.12).toFixed(2)})" stroke-width="0.9"/>`);
  }

  for (let i = 0; i < 18; i++) {
    const y0 = (i / 17) * H;
    const f1 = 0.042 + rand() * 0.048, a1 = 0.9 + rand() * 2.4, p1 = rand() * Math.PI * 2;
    const pts = [];
    for (let x = 0; x <= W; x += 1.5) {
      pts.push(`${x},${(y0 + Math.sin(x*f1+p1)*a1).toFixed(1)}`);
    }
    parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.6"/>`);
  }

  for (let i = 0; i < 9; i++) {
    const x0 = (i / 8) * W;
    const f1 = 0.030 + rand() * 0.040, a1 = 1.5 + rand() * 3.5, p1 = rand() * Math.PI * 2;
    const pts = [];
    for (let y = 0; y <= H; y += 2) {
      pts.push(`${(x0 + Math.sin(y*f1+p1)*a1).toFixed(1)},${y}`);
    }
    parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(255,255,255,0.11)" stroke-width="0.6"/>`);
  }

  const cx = W * 0.62, cy = H * 0.45;
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const r1 = 22, r2 = 58 + rand() * 12;
    parts.push(`<line x1="${(cx+Math.cos(angle)*r1).toFixed(1)}" y1="${(cy+Math.sin(angle)*r1).toFixed(1)}" x2="${(cx+Math.cos(angle)*r2).toFixed(1)}" y2="${(cy+Math.sin(angle)*r2).toFixed(1)}" stroke="rgba(255,255,255,${(0.10+rand()*0.08).toFixed(2)})" stroke-width="0.5"/>`);
  }
  for (let r = 6; r <= 54; r += 5) {
    parts.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(r*1.08).toFixed(1)}" ry="${(r*0.92).toFixed(1)}" fill="none" stroke="rgba(255,255,255,${Math.max(0.02,0.08-r*0.001).toFixed(2)})" stroke-width="0.5"/>`);
  }

  [[10,10],[W-10,10],[10,H-10],[W-10,H-10]].forEach(([rcx,rcy]) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      parts.push(`<line x1="${(rcx+Math.cos(a)*2.5).toFixed(1)}" y1="${(rcy+Math.sin(a)*2.5).toFixed(1)}" x2="${(rcx+Math.cos(a)*8).toFixed(1)}" y2="${(rcy+Math.sin(a)*8).toFixed(1)}" stroke="rgba(255,255,255,0.10)" stroke-width="0.35"/>`);
    }
    [2.5, 5, 8, 11].forEach((r, ri) => {
      parts.push(`<circle cx="${rcx}" cy="${rcy}" r="${r}" fill="none" stroke="rgba(255,255,255,${(0.08-ri*0.015).toFixed(2)})" stroke-width="0.45"/>`);
    });
  });

  const micro = `HX • VERIFIED • ${seed} • SECURE • `;
  [60, 150, 240, 330, 420, 510, 580].forEach((y, ri) => {
    parts.push(`<text x="${ri%2===0?0:-38}" y="${y}" font-family="monospace" font-size="3.8" fill="rgba(255,255,255,0.14)" letter-spacing="1.4">${micro.repeat(4)}</text>`);
  });
  const thY = H - 6;
  const serial = `${seed.replace(/-/g,"")} SECURE `;
  parts.push(`<rect x="0" y="${thY-1}" width="${W}" height="2" fill="rgba(${pal.thread},0.15)"/>`);
  parts.push(`<text x="4" y="${thY+1.2}" font-family="monospace" font-size="3.2" fill="rgba(${pal.thread},0.35)" letter-spacing="1.8">${serial.repeat(8)}</text>`);

  parts.push(`<rect x="1" y="1" width="${W-2}" height="${H-2}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.8"/>`);
  parts.push(`<rect x="4" y="4" width="${W-8}" height="${H-8}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="0.5"/>`);
  for (let x = 18; x < W-14; x += 7) {
    const th = x%28<1 ? 5 : 2.5, a = x%28<1 ? "0.10" : "0.05";
    parts.push(`<line x1="${x}" y1="1" x2="${x}" y2="${1+th}" stroke="rgba(255,255,255,${a})" stroke-width="0.4"/>`);
    parts.push(`<line x1="${x}" y1="${H-1}" x2="${x}" y2="${H-1-th}" stroke="rgba(255,255,255,${a})" stroke-width="0.4"/>`);
  }
  for (let y = 18; y < H-14; y += 7) {
    const th = y%28<1 ? 5 : 2.5, a = y%28<1 ? "0.10" : "0.05";
    parts.push(`<line x1="1" y1="${y}" x2="${1+th}" y2="${y}" stroke="rgba(255,255,255,${a})" stroke-width="0.4"/>`);
    parts.push(`<line x1="${W-1}" y1="${y}" x2="${W-1-th}" y2="${y}" stroke="rgba(255,255,255,${a})" stroke-width="0.4"/>`);
  }

  seed.replace(/-/g,"").replace(/\./g,"").split("").forEach(ch => {
    const gx = 60 + rand()*(W-120), gy = 12 + rand()*(H-20);
    parts.push(`<text transform="translate(${gx.toFixed(0)},${gy.toFixed(0)}) rotate(${(rand()*30-15).toFixed(1)})" font-family="monospace" font-size="7" font-weight="bold" fill="rgba(255,255,255,${(0.04+rand()*0.04).toFixed(2)})" letter-spacing="0">${ch}</text>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${parts.join("")}</svg>`;
}

// memo'd so the (non-trivial) seeded SVG isn't rebuilt when the parent
// re-renders for unrelated reasons; only a changed seed triggers a rebuild.
const ObBackground = React.memo(function ObBackground({ seed }) {
  return <div className="ob-bg" dangerouslySetInnerHTML={{ __html: buildObBgSVG(seed) }} />;
});

// ─── LoginScreen ──────────────────────────────────────────────────────────────
function LoginScreen({ onSuccess, goTo }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [shaking,  setShaking]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [credErr,  setCredErr]  = useState("");
  // Second factor: 2FA is mandatory for every login. Password is verified first,
  // then we present a dedicated authenticator challenge (demo code 123456).
  const [twoFaStep, setTwoFaStep] = useState(false);
  const [otp,       setOtp]       = useState("");
  const [otpErr,    setOtpErr]    = useState("");

  function shake() { setShaking(true); setTimeout(() => setShaking(false), 400); }

  function handleSubmit(ev) {
    ev.preventDefault();
    setCredErr("");
    const e = {};
    if (!email.includes("@") || !email.includes(".")) e.email = "Invalid email";
    if (password.length < 8)                          e.password = "Min. 8 characters";
    if (Object.keys(e).length) { setErrors(e); shake(); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (password === "wrong") {
        setCredErr("Invalid email or password");
        shake();
      } else {
        setTwoFaStep(true);
        setOtp("");
        setOtpErr("");
      }
    }, 600);
  }

  function handleVerify(ev) {
    ev.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setOtpErr("Enter the 6-digit code from your authenticator"); shake(); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (otp !== "123456") { setOtpErr("Invalid code. Use 123456 for demo."); shake(); return; }
      onSuccess(email);
    }, 600);
  }

  if (twoFaStep) {
    return (
      <div className="ob-screen">
        <div className={"ob-card" + (shaking ? " ob-shake" : "")}>
          <div className="ob-wordmark"><img src="HollaEx network-icon-(L)-01 (4).svg" alt="HollaEx" className="ob-logo" /></div>
          <div className="ob-tagline">Two-Factor Authentication</div>
          <p style={{fontSize:"12px",color:"rgba(255,255,255,.35)",textAlign:"center",lineHeight:"1.7",marginBottom:"28px"}}>
            Enter the 6-digit code from your authenticator app to finish signing in.
          </p>
          <form onSubmit={handleVerify} noValidate>
            <div className="ob-field">
              <input
                className={"ob-input" + (otpErr ? " ob-input--error" : "")}
                type="text" inputMode="numeric" maxLength={6}
                value={otp} placeholder="6-Digit Code"
                onChange={ev => { setOtp(ev.target.value.replace(/\D/g,"")); setOtpErr(""); }}
                autoComplete="one-time-code" autoFocus />
              {otpErr && <span className="ob-err">{otpErr}</span>}
            </div>
            <button className="ob-submit" type="submit" disabled={loading}>
              {loading ? <div className="ob-spinner" /> : "Verify →"}
            </button>
          </form>
          <p style={{fontSize:"10px",color:"rgba(255,255,255,.22)",textAlign:"center",marginTop:"12px"}}>Demo code: 123456</p>
          <div className="ob-link-row">
            <button className="ob-link" type="button" onClick={() => { setTwoFaStep(false); setOtp(""); setOtpErr(""); }}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-screen">
      <div className={"ob-card" + (shaking ? " ob-shake" : "")}>
        <div className="ob-wordmark"><img src="HollaEx network-icon-(L)-01 (4).svg" alt="HollaEx" className="ob-logo" /></div>
        <div className="ob-tagline">Login to HX</div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="ob-field">
            <input
              className={"ob-input" + (errors.email ? " ob-input--error" : "")}
              type="email" value={email} placeholder="Email"
              onChange={ev => { setEmail(ev.target.value); setErrors(p => ({...p, email: ""})); setCredErr(""); }}
              autoComplete="email" />
            {errors.email && <span className="ob-err">{errors.email}</span>}
          </div>
          <div className="ob-field">
            <input
              className={"ob-input" + (errors.password ? " ob-input--error" : "")}
              type={showPw ? "text" : "password"} value={password} placeholder="Password"
              onChange={ev => { setPassword(ev.target.value); setErrors(p => ({...p, password: ""})); setCredErr(""); }}
              autoComplete="current-password" />
            <button type="button" className="ob-eye-btn" onClick={() => setShowPw(p => !p)} tabIndex={-1} aria-label={showPw ? "Hide password" : "Show password"}>
              <EyeIcon open={showPw} />
            </button>
            {errors.password && <span className="ob-err">{errors.password}</span>}
          </div>
          <button className="ob-submit" type="submit" disabled={loading}>
            {loading ? <div className="ob-spinner" /> : "Sign In →"}
          </button>
          {credErr && <p className="ob-cred-err">{credErr}</p>}
        </form>
        <div className="ob-link-row">
          <button className="ob-link" type="button" onClick={() => goTo("signup")}>Create Account</button>
          <button className="ob-link" type="button" onClick={() => goTo("recovery")}>Forgot Password</button>
          <button className="ob-link" type="button" style={{opacity:.45,fontSize:"11px",marginTop:"4px",textDecoration:"underline dotted",textUnderlineOffset:"3px"}} onClick={() => { window.location.href = "index.html#markets"; }}>Markets</button>
        </div>
      </div>
    </div>
  );
}

// ─── SignUpScreen ─────────────────────────────────────────────────────────────
function SignUpScreen({ onSuccess, goTo }) {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [errors,     setErrors]     = useState({});
  const [loading,    setLoading]    = useState(false);
  const [shaking,    setShaking]    = useState(false);
  const [verifyStep, setVerifyStep] = useState(false);
  const [code,       setCode]       = useState("");
  const [codeError,  setCodeError]  = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [showConfirm,setShowConfirm]= useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [tosErr,     setTosErr]     = useState("");
  const [secondsLeft,setSecondsLeft]= useState(60);
  const [resendCount,setResendCount]= useState(0);
  const timerRef = useRef(null);

  function shake() { setShaking(true); setTimeout(() => setShaking(false), 400); }

  // Start countdown whenever verifyStep becomes true or a resend happens
  useEffect(() => {
    if (!verifyStep) return;
    setSecondsLeft(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [verifyStep, resendCount]);

  function handleResend() {
    setResendCount(c => c + 1);
    setCode("");
    setCodeError("");
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    const e = {};
    if (!email.includes("@") || !email.includes(".")) e.email = "Invalid email";
    if (password.length < 8)                          e.password = "Min. 8 characters";
    if (confirm !== password)                         e.confirm = "Passwords don't match";
    if (Object.keys(e).length) { setErrors(e); shake(); return; }
    if (!tosChecked) { setTosErr("You must agree to continue"); shake(); return; }
    setTosErr("");
    setLoading(true);
    setTimeout(() => { setLoading(false); setVerifyStep(true); }, 600);
  }

  function handleVerify(ev) {
    ev.preventDefault();
    if (!/^\d{6}$/.test(code)) { setCodeError("Enter the 6-digit code from your email"); shake(); return; }
    setLoading(true);
    setTimeout(() => onSuccess(email), 600);
  }

  if (verifyStep) {
    return (
      <div className="ob-screen">
        <div className={"ob-card" + (shaking ? " ob-shake" : "")}>
          <div className="ob-wordmark"><img src="HollaEx network-icon-(L)-01 (4).svg" alt="HollaEx" className="ob-logo" /></div>
          <div className="ob-tagline">Verify Your Email</div>
          <p style={{fontSize:"12px",color:"rgba(255,255,255,.35)",textAlign:"center",lineHeight:"1.7",marginBottom:"28px"}}>
            A 6-digit code was sent to{" "}
            <span style={{color:"rgba(255,255,255,.6)"}}>{email}</span>
          </p>
          <form onSubmit={handleVerify} noValidate>
            <div className="ob-field">
              <input
                className={"ob-input" + (codeError ? " ob-input--error" : "")}
                type="text" inputMode="numeric" maxLength={6}
                value={code} placeholder="6-Digit Code"
                onChange={ev => { setCode(ev.target.value.replace(/\D/g,"")); setCodeError(""); }}
                autoComplete="one-time-code" autoFocus />
              {codeError && <span className="ob-err">{codeError}</span>}
            </div>
            <button className="ob-submit" type="submit" disabled={loading}>
              {loading ? <div className="ob-spinner" /> : "Verify →"}
            </button>
          </form>
          <div className="ob-resend-row">
            {secondsLeft > 0
              ? <span className="ob-resend-timer">Resend available in {secondsLeft}s</span>
              : <button className="ob-link" type="button" onClick={handleResend}>Resend Code</button>
            }
          </div>
          <div className="ob-link-row">
            <button className="ob-link" type="button" onClick={() => { setVerifyStep(false); setCode(""); setCodeError(""); }}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-screen">
      <div className={"ob-card" + (shaking ? " ob-shake" : "")}>
        <div className="ob-wordmark"><img src="HollaEx network-icon-(L)-01 (4).svg" alt="HollaEx" className="ob-logo" /></div>
        <div className="ob-tagline">Create Account</div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="ob-field">
            <input className={"ob-input"+(errors.email?" ob-input--error":"")}
              type="email" value={email} placeholder="Email"
              onChange={ev=>{setEmail(ev.target.value);setErrors(p=>({...p,email:""}))}}
              autoComplete="email" />
            {errors.email && <span className="ob-err">{errors.email}</span>}
          </div>
          <div className="ob-field">
            <input className={"ob-input"+(errors.password?" ob-input--error":"")}
              type={showPw ? "text" : "password"} value={password} placeholder="Password"
              onChange={ev=>{setPassword(ev.target.value);setErrors(p=>({...p,password:""}))}}
              autoComplete="new-password" />
            <button type="button" className="ob-eye-btn" onClick={() => setShowPw(p => !p)} tabIndex={-1} aria-label={showPw ? "Hide password" : "Show password"}>
              <EyeIcon open={showPw} />
            </button>
            {errors.password && <span className="ob-err">{errors.password}</span>}
          </div>
          <div className="ob-field">
            <input className={"ob-input"+(errors.confirm?" ob-input--error":"")}
              type={showConfirm ? "text" : "password"} value={confirm} placeholder="Confirm Password"
              onChange={ev=>{setConfirm(ev.target.value);setErrors(p=>({...p,confirm:""}))}}
              autoComplete="new-password" />
            <button type="button" className="ob-eye-btn" onClick={() => setShowConfirm(p => !p)} tabIndex={-1} aria-label={showConfirm ? "Hide password" : "Show password"}>
              <EyeIcon open={showConfirm} />
            </button>
            {errors.confirm && <span className="ob-err">{errors.confirm}</span>}
          </div>
          <label className="ob-tos-row">
            <input type="checkbox" className="ob-tos-cb" checked={tosChecked}
              onChange={ev => { setTosChecked(ev.target.checked); setTosErr(""); }} />
            <span className="ob-tos-label">I agree to the Terms of Service and Privacy Policy</span>
          </label>
          {tosErr && <span className="ob-tos-err">{tosErr}</span>}
          <button className="ob-submit" type="submit" disabled={loading}>
            {loading ? <div className="ob-spinner"/> : "Create Account →"}
          </button>
        </form>
        <div className="ob-link-row">
          <button className="ob-link" type="button" onClick={() => goTo("login")}>Sign In Instead</button>
        </div>
      </div>
    </div>
  );
}

// ─── RecoveryScreen ───────────────────────────────────────────────────────────
function RecoveryScreen({ goTo }) {
  const [email, setEmail] = useState("");
  const [sent,  setSent]  = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(ev) {
    ev.preventDefault();
    if (!email.includes("@") || !email.includes(".")) { setError("Invalid email"); return; }
    setSent(true);
  }

  return (
    <div className="ob-screen">
      <div className="ob-card">
        <div className="ob-wordmark"><img src="HollaEx network-icon-(L)-01 (4).svg" alt="HollaEx" className="ob-logo" /></div>
        <div className="ob-tagline">{sent ? "Check Your Email" : "Password Recovery"}</div>
        {sent ? (
          <p style={{fontSize:"12px",color:"rgba(255,255,255,.35)",textAlign:"center",lineHeight:"1.7",marginBottom:"24px"}}>
            If an account exists for{" "}
            <span style={{color:"rgba(255,255,255,.6)"}}>{email}</span>
            , a reset link has been sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="ob-field">
              <input className={"ob-input"+(error?" ob-input--error":"")}
                type="email" value={email} placeholder="Email"
                onChange={ev=>{setEmail(ev.target.value);setError("")}}
                autoComplete="email" />
              {error && <span className="ob-err">{error}</span>}
            </div>
            <button className="ob-submit" type="submit">Send Reset Link →</button>
          </form>
        )}
        <div className="ob-link-row">
          <button className="ob-link" type="button" onClick={() => goTo("login")}>Back to Sign In</button>
        </div>
      </div>
    </div>
  );
}

// ─── ResetScreen ──────────────────────────────────────────────────────────────
// Reached via onboarding.html?mode=reset (link in the password-reset email).
function ResetScreen({ goTo }) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [shaking,  setShaking]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done,     setDone]     = useState(false);

  function shake() { setShaking(true); setTimeout(() => setShaking(false), 400); }

  function handleSubmit(ev) {
    ev.preventDefault();
    const e = {};
    if (password.length < 8)       e.password = "Min. 8 characters";
    if (confirm !== password)      e.confirm  = "Passwords don't match";
    if (Object.keys(e).length) { setErrors(e); shake(); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 600);
  }

  if (done) {
    return (
      <div className="ob-screen">
        <div className="ob-card">
          <div className="ob-wordmark"><img src="HollaEx network-icon-(L)-01 (4).svg" alt="HollaEx" className="ob-logo" /></div>
          <div className="ob-tagline">Password Updated</div>
          <p style={{fontSize:"12px",color:"rgba(255,255,255,.35)",textAlign:"center",lineHeight:"1.7",marginBottom:"24px"}}>
            Your password has been reset successfully.
          </p>
          <div className="ob-link-row">
            <button className="ob-link" type="button" style={{fontSize:"13px",color:"rgba(255,255,255,.55)"}} onClick={() => goTo("login")}>Sign In →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-screen">
      <div className={"ob-card" + (shaking ? " ob-shake" : "")}>
        <div className="ob-wordmark"><img src="HollaEx network-icon-(L)-01 (4).svg" alt="HollaEx" className="ob-logo" /></div>
        <div className="ob-tagline">Set New Password</div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="ob-field">
            <input
              className={"ob-input"+(errors.password?" ob-input--error":"")}
              type={showPw ? "text" : "password"} value={password} placeholder="New Password"
              onChange={ev=>{setPassword(ev.target.value);setErrors(p=>({...p,password:""}))}}
              autoComplete="new-password" autoFocus />
            <button type="button" className="ob-eye-btn" onClick={() => setShowPw(p => !p)} tabIndex={-1} aria-label={showPw ? "Hide password" : "Show password"}>
              <EyeIcon open={showPw} />
            </button>
            {errors.password && <span className="ob-err">{errors.password}</span>}
          </div>
          <div className="ob-field">
            <input
              className={"ob-input"+(errors.confirm?" ob-input--error":"")}
              type={showConfirm ? "text" : "password"} value={confirm} placeholder="Confirm Password"
              onChange={ev=>{setConfirm(ev.target.value);setErrors(p=>({...p,confirm:""}))}}
              autoComplete="new-password" />
            <button type="button" className="ob-eye-btn" onClick={() => setShowConfirm(p => !p)} tabIndex={-1} aria-label={showConfirm ? "Hide password" : "Show password"}>
              <EyeIcon open={showConfirm} />
            </button>
            {errors.confirm && <span className="ob-err">{errors.confirm}</span>}
          </div>
          <button className="ob-submit" type="submit" disabled={loading}>
            {loading ? <div className="ob-spinner" /> : "Reset Password →"}
          </button>
        </form>
        <div className="ob-link-row">
          <button className="ob-link" type="button" onClick={() => goTo("login")}>Back to Sign In</button>
        </div>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [screen, setScreen] = useState("login");
  const [ipSeed, setIpSeed] = useState(
    () => localStorage.getItem(KEY_IP_SEED) || DEFAULT_SEED
  );

  useEffect(() => {
    injectObCSS();
    if (localStorage.getItem(KEY_ONBOARDED) === "1") {
      window.location.href = typeof window.consumeReturnUrl === "function"
        ? window.consumeReturnUrl("index.html")
        : "index.html";
      return;
    }
    // Check for password-reset link: onboarding.html?mode=reset
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "reset") {
      setScreen("reset");
    }
    fetch("https://api.ipify.org?format=json")
      .then(r => r.json())
      .then(d => { localStorage.setItem(KEY_IP_SEED, d.ip); setIpSeed(d.ip); })
      .catch(() => {});
  }, []);

  function handleLogin(email) {
    localStorage.setItem(KEY_ONBOARDED, "1");
    localStorage.setItem(KEY_EMAIL, email);
    window.location.href = typeof window.consumeReturnUrl === "function"
      ? window.consumeReturnUrl("index.html")
      : "index.html";
  }

  return (
    <div className="ob-root">
      <ObBackground seed={ipSeed} />
      {screen === "login"    && <LoginScreen    onSuccess={handleLogin} goTo={setScreen} />}
      {screen === "signup"   && <SignUpScreen   onSuccess={handleLogin} goTo={setScreen} />}
      {screen === "recovery" && <RecoveryScreen goTo={setScreen} />}
      {screen === "reset"    && <ResetScreen    goTo={setScreen} />}
    </div>
  );
}
