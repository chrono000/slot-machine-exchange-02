import React, { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════
const MOCK_USER = {
  name:      "Alex Johnson",
  email:     "alex.johnson@email.com",
  phone:     "+1 (415) 555-0182",
  accountId: "WLT-2847-9301",
  joined:    "Jan 12, 2022",
};

const COINS_LIST = ["BTC", "ETH", "USDT", "SOL", "BNB", "XRP", "USDC"];

const LANGUAGES = [
  { value: "en",    flag: "🇺🇸", label: "English"   },
  { value: "es",    flag: "🇪🇸", label: "Español"   },
  { value: "fr",    flag: "🇫🇷", label: "Français"  },
  { value: "de",    flag: "🇩🇪", label: "Deutsch"   },
  { value: "ja",    flag: "🇯🇵", label: "日本語"     },
  { value: "zh",    flag: "🇨🇳", label: "中文"       },
];

const ANIM_LEVELS = ["NONE", "MEDIUM", "HEAVY"];

const ST_CSS_ID = "settings-page-styles";

const ST_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
body{background:#121218;font-family:'JetBrains Mono',ui-monospace,monospace}

.wl-nav{position:fixed;top:0;left:0;right:0;height:44px;background:#0e0e15;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;padding:0 20px;gap:16px;z-index:200}
.wl-nav-logo{font-size:15px;font-weight:700;color:rgba(255,255,255,.92);letter-spacing:.05em;margin-right:8px}
.wl-nav-tab{text-decoration:none;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;color:rgba(255,255,255,.35);transition:all 150ms;letter-spacing:.03em}
.wl-nav-tab:hover{color:rgba(255,255,255,.65)}
.wl-nav-tab--active{color:rgba(255,255,255,.92);border-bottom:2px solid rgba(255,255,255,.8);border-radius:0;padding-bottom:2px}

.wl-toggle{width:26px;height:14px;border-radius:7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);position:relative;transition:all 150ms;flex-shrink:0}
.wl-toggle--on{background:rgba(99,102,241,.5);border-color:rgba(99,102,241,.6)}
.wl-toggle-thumb{position:absolute;top:2px;left:2px;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.35);transition:all 150ms}
.wl-toggle--on .wl-toggle-thumb{left:14px;background:#fff}

.st-root{min-height:100vh;padding-top:44px;animation:stFadeIn 350ms ease}
.st-container{max-width:460px;margin:0 auto;padding:20px 16px 40px}

.st-section{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;margin-bottom:14px}
.st-section>*:first-child{border-radius:14px 14px 0 0}
.st-section>*:last-child{border-radius:0 0 14px 14px}
.st-section-title{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.3);padding:10px 14px 6px}

.st-row{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.04)}
.st-row:last-child{border-bottom:none}
.st-row-left{display:flex;flex-direction:column;gap:2px}
.st-row-label{font-size:13px;font-weight:500;color:rgba(255,255,255,.82);letter-spacing:.02em}
.st-row-sub{font-size:11px;color:rgba(255,255,255,.3);letter-spacing:.02em}
.st-row-right{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.35);font-size:12px}

/* Profile banner */
.st-profile-banner{position:relative;overflow:hidden;border-radius:14px 14px 0 0}
.st-profile-banner-texture{position:absolute;inset:0;width:100%;height:100%}
.st-profile-inner{position:relative;display:flex;align-items:center;gap:12px;padding:16px 14px 14px}
.st-profile-info{flex:1;min-width:0}
.st-profile-name{font-size:14px;font-weight:700;color:#fff;letter-spacing:.03em;text-shadow:0 1px 4px rgba(0,0,0,.5)}
.st-profile-id{font-size:11px;color:rgba(255,255,255,.75);letter-spacing:.04em;margin-top:2px;font-family:'JetBrains Mono',monospace;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.st-profile-detail{font-size:11px;color:rgba(255,255,255,.72);letter-spacing:.02em;margin-top:3px;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.st-masked{letter-spacing:.08em;color:rgba(255,255,255,.2)}

.st-avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#fff;flex-shrink:0;letter-spacing:.04em;box-shadow:0 0 0 2px rgba(99,102,241,.3)}

.st-reveal-btn{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.25);border-radius:5px;color:rgba(255,255,255,.8);font-size:10px;font-family:'JetBrains Mono',monospace;padding:3px 8px;cursor:pointer;transition:all 150ms;letter-spacing:.04em;backdrop-filter:blur(4px)}
.st-reveal-btn:hover{background:rgba(0,0,0,.4);color:#fff;border-color:rgba(255,255,255,.45)}
.st-verified-btn{display:inline-flex;align-items:center;gap:5px;background:rgba(0,0,0,.25);border:1px solid rgba(74,222,128,.45);border-radius:5px;color:rgba(74,222,128,.9);font-size:10px;font-family:'JetBrains Mono',monospace;padding:3px 9px;cursor:pointer;letter-spacing:.05em;backdrop-filter:blur(4px);transition:background 150ms}
.st-verified-btn:hover{background:rgba(0,0,0,.4)}
.st-verified-check{font-size:9px;background:rgba(74,222,128,.2);border-radius:50%;width:13px;height:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}

/* KYC modal */
.st-kyc-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px);animation:stFadeIn 200ms ease}
.st-kyc-modal{background:#0f0f16;border:1px solid rgba(255,255,255,.08);border-radius:16px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.6)}
.st-kyc-header{padding:20px 20px 16px;border-bottom:1px solid rgba(255,255,255,.05)}
.st-kyc-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:20px;padding:4px 12px;margin-bottom:12px}
.st-kyc-badge-icon{width:16px;height:16px;border-radius:50%;background:rgba(74,222,128,.2);display:flex;align-items:center;justify-content:center;font-size:9px;color:rgba(74,222,128,.9)}
.st-kyc-badge-text{font-size:11px;font-weight:600;color:rgba(74,222,128,.8);letter-spacing:.06em}
.st-kyc-title{font-size:15px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:.02em}
.st-kyc-sub{font-size:11px;color:rgba(255,255,255,.25);margin-top:3px;letter-spacing:.02em}
.st-kyc-close{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.06);border:none;border-radius:50%;width:26px;height:26px;color:rgba(255,255,255,.4);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 150ms}
.st-kyc-close:hover{background:rgba(255,255,255,.12);color:rgba(255,255,255,.7)}
.st-kyc-body{padding:8px 0}
.st-kyc-step{display:flex;align-items:center;gap:12px;padding:11px 20px;border-bottom:1px solid rgba(255,255,255,.03)}
.st-kyc-step:last-child{border-bottom:none}
.st-kyc-step-icon{width:28px;height:28px;border-radius:50%;background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:rgba(74,222,128,.5)}
.st-kyc-step-info{flex:1;min-width:0}
.st-kyc-step-name{font-size:12px;font-weight:500;color:rgba(255,255,255,.35);letter-spacing:.02em}
.st-kyc-step-date{font-size:10px;color:rgba(255,255,255,.18);margin-top:2px;letter-spacing:.02em}
.st-kyc-step-tag{font-size:9px;font-weight:600;letter-spacing:.06em;color:rgba(74,222,128,.45);background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.12);border-radius:4px;padding:2px 6px;white-space:nowrap}
.st-kyc-footer{padding:14px 20px;border-top:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between;align-items:center}
.st-kyc-level{font-size:10px;color:rgba(255,255,255,.2);letter-spacing:.04em}
.st-kyc-level-val{color:rgba(74,222,128,.45);font-weight:600}

/* 2FA warning */
.st-2fa-warning{display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(251,146,60,.07);border-top:1px solid rgba(251,146,60,.15)}
.st-2fa-warning-text{font-size:11px;color:rgba(251,146,60,.8);letter-spacing:.02em}

/* Select */
.st-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:rgba(255,255,255,.75);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;font-weight:500;padding:4px 22px 4px 8px;appearance:none;-webkit-appearance:none;cursor:pointer;outline:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,.3)'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;transition:border-color 150ms}
.st-select:hover{border-color:rgba(255,255,255,.18)}
.st-select option{background:#1a1a26}

/* Language selector */
.st-lang-btn{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:rgba(255,255,255,.75);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;font-weight:500;padding:5px 10px;cursor:pointer;transition:border-color 150ms;position:relative}
.st-lang-btn:hover{border-color:rgba(255,255,255,.18)}
.st-lang-flag{font-size:14px;line-height:1}
.st-lang-dropdown{position:absolute;top:calc(100% + 4px);right:0;background:#1a1a26;border:1px solid rgba(255,255,255,.1);border-radius:8px;overflow:hidden;z-index:400;min-width:140px;box-shadow:0 8px 24px rgba(0,0,0,.5)}
.st-lang-option{display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;font-size:12px;color:rgba(255,255,255,.65);transition:background 100ms}
.st-lang-option:hover{background:rgba(255,255,255,.06)}
.st-lang-option--active{color:rgba(255,255,255,.92);background:rgba(99,102,241,.12)}

/* Animation segmented control */
.st-seg{display:flex;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:2px;gap:2px}
.st-seg-btn{flex:1;padding:5px 8px;border-radius:6px;border:none;background:none;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.06em;color:rgba(255,255,255,.3);cursor:pointer;transition:all 150ms}
.st-seg-btn:hover{color:rgba(255,255,255,.55)}
.st-seg-btn--active{background:rgba(99,102,241,.25);color:rgba(255,255,255,.9);border:1px solid rgba(99,102,241,.35)}
.st-seg-btn--active-none{background:rgba(255,255,255,.07);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.1)}
.st-seg-btn--active-heavy{background:rgba(139,92,246,.3);color:rgba(255,255,255,.92);border:1px solid rgba(139,92,246,.4)}

.st-anim-note{font-size:10px;color:rgba(255,255,255,.2);padding:0 14px 10px;letter-spacing:.02em;line-height:1.5}

/* Chevron */
.st-chevron{font-size:16px;color:rgba(255,255,255,.2);line-height:1}

/* Save */
.st-save-btn{width:100%;height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.1);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;font-weight:600;letter-spacing:.06em;cursor:pointer;transition:all 200ms;color:rgba(255,255,255,.75)}
.st-save-btn:hover{border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.9)}

/* Avatar showcase */
.st-showcase-title{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.2);margin:28px 0 12px}
.st-showcase-tag{font-size:8px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:rgba(255,255,255,.18);display:flex;justify-content:space-between;padding:8px 14px 0}

@keyframes stFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
`;

// ═══════════════════════════════════════════════════════════════════
// CSS injection
// ═══════════════════════════════════════════════════════════════════
function injectSettingsCSS() {
  if (document.getElementById(ST_CSS_ID)) return;
  const el = document.createElement("style");
  el.id = ST_CSS_ID;
  el.textContent = ST_STYLE;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════════
// Seeded texture generator  (deterministic from accountId)
// ═══════════════════════════════════════════════════════════════════
function makeSeededRand(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function() {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return (h >>> 0) / 0xFFFFFFFF;
  };
}

function buildTextureSVG(seed) {
  // same palette as avatar — derived from same seed hash
  let ph = 0;
  for (let i = 0; i < seed.length; i++) ph = (Math.imul(37, ph) + seed.charCodeAt(i)) | 0;
  const pal = AV_PALETTES[Math.abs(ph) % AV_PALETTES.length];

  const rand = makeSeededRand(seed);
  const W = 460, H = 108;
  const parts = [];

  // ── 0. defs: crosshatch mesh pattern ─────────────────────────────
  parts.push(`<defs>
    <pattern id="nt-mesh" width="5" height="5" patternUnits="userSpaceOnUse">
      <line x1="0" y1="5" x2="5" y2="0" stroke="rgba(255,255,255,0.07)" stroke-width="0.3"/>
      <line x1="-1" y1="1" x2="1" y2="-1" stroke="rgba(255,255,255,0.07)" stroke-width="0.3"/>
      <line x1="4" y1="6" x2="6" y2="4" stroke="rgba(255,255,255,0.07)" stroke-width="0.3"/>
    </pattern>
    <clipPath id="nt-clip"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  </defs>`);

  // ── 1. crosshatch fill ────────────────────────────────────────────
  parts.push(`<rect width="${W}" height="${H}" fill="url(#nt-mesh)" clip-path="url(#nt-clip)"/>`);

  // ── 2. guilloche layer A – slow rolling waves (USD portrait-oval feel)
  for (let i = 0; i < 11; i++) {
    const y0   = (i / 10) * H;
    const f1   = 0.010 + rand() * 0.016;
    const a1   = 2.5  + rand() * 5.5;
    const p1   = rand() * Math.PI * 2;
    const f2   = 0.028 + rand() * 0.030;
    const a2   = 0.8  + rand() * 2.2;
    const p2   = rand() * Math.PI * 2;
    const pts  = [];
    for (let x = 0; x <= W; x += 2) {
      const y = y0 + Math.sin(x*f1+p1)*a1 + Math.sin(x*f2+p2)*a2;
      pts.push(`${x},${y.toFixed(1)}`);
    }
    const alpha = (0.06 + rand() * 0.05).toFixed(2);
    parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(255,255,255,${alpha})" stroke-width="0.65"/>`);
  }

  // ── 3. guilloche layer B – tighter high-frequency lines ──────────
  for (let i = 0; i < 18; i++) {
    const y0   = (i / 17) * H;
    const f1   = 0.042 + rand() * 0.048;
    const a1   = 0.9  + rand() * 2.4;
    const p1   = rand() * Math.PI * 2;
    const pts  = [];
    for (let x = 0; x <= W; x += 1.5) {
      const y = y0 + Math.sin(x*f1+p1)*a1;
      pts.push(`${x},${y.toFixed(1)}`);
    }
    parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="0.4"/>`);
  }

  // ── 4. guilloche layer C – diagonal interference waves ───────────
  for (let i = 0; i < 9; i++) {
    const x0   = (i / 8) * W;
    const f1   = 0.030 + rand() * 0.040;
    const a1   = 1.5  + rand() * 3.5;
    const p1   = rand() * Math.PI * 2;
    const pts  = [];
    for (let y = 0; y <= H; y += 2) {
      const x = x0 + Math.sin(y*f1+p1)*a1;
      pts.push(`${x.toFixed(1)},${y}`);
    }
    parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="0.4"/>`);
  }

  // ── 5. radial sunburst – portrait oval behind avatar ─────────────
  const avX = 40, avY = H / 2;
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const r1    = 22;
    const r2    = 58 + rand() * 12;
    const x1    = avX + Math.cos(angle) * r1;
    const y1    = avY + Math.sin(angle) * r1;
    const x2    = avX + Math.cos(angle) * r2;
    const y2    = avY + Math.sin(angle) * r2;
    const alpha = (0.04 + rand() * 0.04).toFixed(2);
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(255,255,255,${alpha})" stroke-width="0.4"/>`);
  }

  // ── 6. concentric portrait oval ──────────────────────────────────
  for (let r = 6; r <= 54; r += 5) {
    const alpha = Math.max(0.02, 0.08 - r * 0.001).toFixed(2);
    const rX = r * 1.08, rY = r * 0.92;
    parts.push(`<ellipse cx="${avX}" cy="${avY}" rx="${rX.toFixed(1)}" ry="${rY.toFixed(1)}" fill="none" stroke="rgba(255,255,255,${alpha})" stroke-width="0.5"/>`);
  }

  // ── 7. corner rosettes ───────────────────────────────────────────
  [[10,10],[W-10,10],[10,H-10],[W-10,H-10]].forEach(([cx,cy]) => {
    for (let i = 0; i < 12; i++) {
      const a  = (i / 12) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * 2.5, y1 = cy + Math.sin(a) * 2.5;
      const x2 = cx + Math.cos(a) * 8,   y2 = cy + Math.sin(a) * 8;
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(255,255,255,0.10)" stroke-width="0.35"/>`);
    }
    [2.5, 5, 8, 11].forEach((r, ri) => {
      const a = (0.08 - ri * 0.015).toFixed(2);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,${a})" stroke-width="0.45"/>`);
    });
  });

  // ── 8. microprinting rows ─────────────────────────────────────────
  const micro = `VERIFIED • AUTHENTICATED • ${seed} • SECURE • `;
  [16, 37, 58, 79, 99].forEach((y, ri) => {
    const x = ri % 2 === 0 ? 0 : -38;
    parts.push(`<text x="${x}" y="${y}" font-family="monospace" font-size="3.8" fill="rgba(255,255,255,0.06)" letter-spacing="1.4">${micro.repeat(4)}</text>`);
  });

  // ── 9. security thread – horizontal, near bottom edge ───────────
  const thY = H - 6;
  const serial = `USA ${seed.replace(/-/g,"")} SECURE `;
  parts.push(`<rect x="0" y="${thY - 1}" width="${W}" height="2" fill="rgba(${pal.thread},0.06)"/>`);
  parts.push(`<text x="4" y="${thY + 1.2}" font-family="monospace" font-size="3.2" fill="rgba(${pal.thread},0.15)" letter-spacing="1.8">${serial.repeat(6)}</text>`);

  // ── 10. border + tick marks ───────────────────────────────────────
  parts.push(`<rect x="1" y="1" width="${W-2}" height="${H-2}" rx="13" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.6"/>`);
  parts.push(`<rect x="4" y="4" width="${W-8}" height="${H-8}" rx="11" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="0.4"/>`);
  for (let x = 18; x < W - 14; x += 7) {
    const tall = x % 28 < 1;
    const th = tall ? 5 : 2.5, a = tall ? "0.10" : "0.05";
    parts.push(`<line x1="${x}" y1="1"      x2="${x}" y2="${1+th}"    stroke="rgba(255,255,255,${a})" stroke-width="0.4"/>`);
    parts.push(`<line x1="${x}" y1="${H-1}" x2="${x}" y2="${H-1-th}"  stroke="rgba(255,255,255,${a})" stroke-width="0.4"/>`);
  }
  for (let y = 18; y < H - 14; y += 7) {
    const tall = y % 28 < 1;
    const th = tall ? 5 : 2.5, a = tall ? "0.10" : "0.05";
    parts.push(`<line x1="1"      y1="${y}" x2="${1+th}"    y2="${y}" stroke="rgba(255,255,255,${a})" stroke-width="0.4"/>`);
    parts.push(`<line x1="${W-1}" y1="${y}" x2="${W-1-th}"  y2="${y}" stroke="rgba(255,255,255,${a})" stroke-width="0.4"/>`);
  }

  // ── 11. scattered serial-number style glyphs ─────────────────────
  const glyphs = seed.replace(/-/g, "").split("");
  glyphs.forEach((ch, i) => {
    const gx = 60 + rand() * (W - 120);
    const gy = 12 + rand() * (H - 20);
    const rot = (rand() * 30 - 15).toFixed(1);
    const alpha = (0.04 + rand() * 0.04).toFixed(2);
    parts.push(`<text transform="translate(${gx.toFixed(0)},${gy.toFixed(0)}) rotate(${rot})" font-family="monospace" font-size="7" font-weight="bold" fill="rgba(255,255,255,${alpha})" letter-spacing="0">${ch}</text>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}

// ═══════════════════════════════════════════════════════════════════
// Avatar coin SVG  (all banknote elements inside the circle)
// ═══════════════════════════════════════════════════════════════════

// 8 distinct palettes — picked deterministically from seed hash
const AV_PALETTES = [
  { c1:"99,102,241",  c2:"139,92,246",  thread:"74,222,128",  circle0:"#2d1b69", circle1:"#0f0a28", banner:"linear-gradient(135deg,#111018 0%,#0c0b10 100%)" }, // indigo
  { c1:"20,184,166",  c2:"6,182,212",   thread:"74,222,128",  circle0:"#0b4a42", circle1:"#031a16", banner:"linear-gradient(135deg,#0e1312 0%,#0a0e0d 100%)" }, // teal
  { c1:"234,179,8",   c2:"251,146,60",  thread:"255,220,100", circle0:"#4a3200", circle1:"#1a1000", banner:"linear-gradient(135deg,#13110d 0%,#0e0c09 100%)" }, // amber
  { c1:"239,68,68",   c2:"244,114,182", thread:"255,180,180", circle0:"#4a0a14", circle1:"#1a030a", banner:"linear-gradient(135deg,#130e0f 0%,#0e0a0a 100%)" }, // rose
  { c1:"34,197,94",   c2:"74,222,128",  thread:"200,255,220", circle0:"#0a3d1a", circle1:"#031508", banner:"linear-gradient(135deg,#0e1310 0%,#0a0e0b 100%)" }, // green
  { c1:"168,85,247",  c2:"217,70,239",  thread:"220,180,255", circle0:"#3a0a5e", circle1:"#14021e", banner:"linear-gradient(135deg,#110f15 0%,#0c0b11 100%)" }, // violet
  { c1:"14,165,233",  c2:"56,189,248",  thread:"180,240,255", circle0:"#0a2d4a", circle1:"#031018", banner:"linear-gradient(135deg,#0f1114 0%,#0a0c0f 100%)" }, // sky
  { c1:"251,113,133", c2:"248,163,113", thread:"255,220,200", circle0:"#4a0c18", circle1:"#1a0409", banner:"linear-gradient(135deg,#130e0f 0%,#0e0a0b 100%)" }, // coral
];


function buildAvatarSVG(seed, initials) {
  // palette chosen via a plain hash — NOT from rand() so it's stable
  let ph = 0;
  for (let i = 0; i < seed.length; i++) ph = (Math.imul(37, ph) + seed.charCodeAt(i)) | 0;
  const pal = AV_PALETTES[Math.abs(ph) % AV_PALETTES.length];

  const rand = makeSeededRand(seed + "_av");
  const S = 72, CX = 36, CY = 36, R = 34;
  const p = [];

  // ── structural params — vary WIDELY per seed ──────────────────────
  const waveAmp    = 0.6 + rand() * 5.8;          // 0.6 → 6.4 px (tight vs wild)
  const waveFreq   = 0.08 + rand() * 0.55;         // slow rolls vs fast ripples
  const waveCount  = 8 + Math.floor(rand() * 26);  // 8 → 34 lines
  const vWaveAmp   = 0.4 + rand() * 4.0;
  const vWaveFreq  = 0.08 + rand() * 0.45;
  const vCount     = 6 + Math.floor(rand() * 18);
  const spokeCount = [12,18,24,36,48,60][Math.floor(rand() * 6)];
  const ringStep   = [3,4,5,6,8,10][Math.floor(rand() * 6)];
  const tickCount  = [48,60,72,90][Math.floor(rand() * 4)];

  // ── defs ──────────────────────────────────────────────────────────
  p.push(`<defs>
    <clipPath id="av-clip"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
    <pattern id="av-mesh" width="4" height="4" patternUnits="userSpaceOnUse">
      <line x1="0" y1="4" x2="4" y2="0" stroke="rgba(${pal.c1},0.09)" stroke-width="0.3"/>
      <line x1="-1" y1="1" x2="1" y2="-1" stroke="rgba(${pal.c1},0.09)" stroke-width="0.3"/>
      <line x1="3"  y1="5" x2="5" y2="3" stroke="rgba(${pal.c1},0.09)" stroke-width="0.3"/>
    </pattern>
    <radialGradient id="av-bg" cx="45%" cy="40%" r="65%">
      <stop offset="0%"   stop-color="${pal.circle0}"/>
      <stop offset="100%" stop-color="${pal.circle1}"/>
    </radialGradient>
  </defs>`);

  // ── base ──────────────────────────────────────────────────────────
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#av-bg)"/>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#av-mesh)" clip-path="url(#av-clip)"/>`);

  // ── guilloche A – horizontal ──────────────────────────────────────
  for (let i = 0; i < waveCount; i++) {
    const y0  = (i / Math.max(waveCount - 1, 1)) * S;
    const f1  = waveFreq + rand() * waveFreq * 0.6;
    const a1  = waveAmp  * (0.5 + rand() * 0.8);
    const ph1 = rand() * Math.PI * 2;
    const f2  = f1 * (1.8 + rand() * 1.4);         // second harmonic
    const a2  = a1 * (0.2 + rand() * 0.4);
    const ph2 = rand() * Math.PI * 2;
    const pts = [];
    for (let x = 0; x <= S; x++) {
      const y = y0 + Math.sin(x*f1+ph1)*a1 + Math.sin(x*f2+ph2)*a2;
      pts.push(`${x},${y.toFixed(1)}`);
    }
    const alpha = (0.10 + rand() * 0.14).toFixed(2);
    const col   = rand() > 0.5 ? pal.c1 : pal.c2;
    p.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(${col},${alpha})" stroke-width="0.55" clip-path="url(#av-clip)"/>`);
  }

  // ── guilloche B – vertical ────────────────────────────────────────
  for (let i = 0; i < vCount; i++) {
    const x0  = (i / Math.max(vCount - 1, 1)) * S;
    const f1  = vWaveFreq + rand() * vWaveFreq * 0.6;
    const a1  = vWaveAmp  * (0.5 + rand() * 0.8);
    const ph1 = rand() * Math.PI * 2;
    const pts = [];
    for (let y = 0; y <= S; y++) {
      const x = x0 + Math.sin(y*f1+ph1)*a1;
      pts.push(`${x.toFixed(1)},${y}`);
    }
    const alpha = (0.06 + rand() * 0.08).toFixed(2);
    p.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(${pal.c2},${alpha})" stroke-width="0.4" clip-path="url(#av-clip)"/>`);
  }

  // ── radial spokes ─────────────────────────────────────────────────
  const spokeR1 = 8 + rand() * 6, spokeR2 = R - 4 - rand() * 4;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const x1 = CX + Math.cos(angle) * spokeR1;
    const y1 = CY + Math.sin(angle) * spokeR1;
    const x2 = CX + Math.cos(angle) * spokeR2;
    const y2 = CY + Math.sin(angle) * spokeR2;
    const alpha = (0.05 + rand() * 0.08).toFixed(2);
    p.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(${pal.c1},${alpha})" stroke-width="0.35" clip-path="url(#av-clip)"/>`);
  }

  // ── concentric rings ──────────────────────────────────────────────
  for (let r = ringStep; r < R - 2; r += ringStep) {
    const alpha = Math.max(0.03, 0.14 - r * 0.002).toFixed(2);
    p.push(`<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="rgba(${pal.c2},${alpha})" stroke-width="0.45"/>`);
  }

  // ── microprinting ─────────────────────────────────────────────────
  const micro = seed.replace(/-/g,"") + "•";
  p.push(`<text x="${CX-R+2}" y="${CY-R+7}"  font-family="monospace" font-size="2.8" fill="rgba(${pal.c1},0.22)" letter-spacing="0.6" clip-path="url(#av-clip)">${micro.repeat(6)}</text>`);
  p.push(`<text x="${CX-R+2}" y="${CY+R-3}"  font-family="monospace" font-size="2.8" fill="rgba(${pal.c1},0.22)" letter-spacing="0.6" clip-path="url(#av-clip)">${micro.repeat(6)}</text>`);

  // ── security thread ───────────────────────────────────────────────
  const thX = CX + (rand() * 20 - 10);
  p.push(`<line x1="${thX.toFixed(1)}" y1="${CY-R}" x2="${thX.toFixed(1)}" y2="${CY+R}" stroke="rgba(${pal.thread},0.18)" stroke-width="1.4" clip-path="url(#av-clip)"/>`);
  p.push(`<text transform="translate(${(thX+2).toFixed(1)},${(CY+R-3).toFixed(1)}) rotate(-90)" font-family="monospace" font-size="2.6" fill="rgba(${pal.thread},0.30)" letter-spacing="1.2" clip-path="url(#av-clip)">${micro.repeat(3)}</text>`);

  // ── coin-edge tick marks ──────────────────────────────────────────
  for (let i = 0; i < tickCount; i++) {
    const angle  = (i / tickCount) * Math.PI * 2;
    const major  = i % Math.round(tickCount / 8) === 0;
    const medium = i % Math.round(tickCount / 24) === 0;
    const depth  = major ? 5 : medium ? 3 : 1.5;
    const r1 = R - depth;
    const x1 = CX + Math.cos(angle) * r1, y1 = CY + Math.sin(angle) * r1;
    const x2 = CX + Math.cos(angle) * R,  y2 = CY + Math.sin(angle) * R;
    const a  = major ? "0.40" : medium ? "0.22" : "0.11";
    const sw = major ? "0.6"  : medium ? "0.4"  : "0.25";
    p.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(${pal.c1},${a})" stroke-width="${sw}"/>`);
  }

  // ── border rings ──────────────────────────────────────────────────
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}"   fill="none" stroke="rgba(${pal.c1},0.35)" stroke-width="0.7"/>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R-4}" fill="none" stroke="rgba(${pal.c1},0.12)" stroke-width="0.4"/>`);

  // ── scattered account digits ──────────────────────────────────────
  seed.replace(/-/g,"").split("").forEach(ch => {
    const gx  = CX + (rand() * R * 1.5 - R * 0.75);
    const gy  = CY + (rand() * R * 1.5 - R * 0.75);
    const rot = (rand() * 50 - 25).toFixed(1);
    const a   = (0.07 + rand() * 0.09).toFixed(2);
    p.push(`<text transform="translate(${gx.toFixed(1)},${gy.toFixed(1)}) rotate(${rot})" font-family="monospace" font-size="6" font-weight="bold" fill="rgba(${pal.c2},${a})" clip-path="url(#av-clip)">${ch}</text>`);
  });

  // ── initials ──────────────────────────────────────────────────────
  p.push(`<circle cx="${CX}" cy="${CY}" r="13" fill="rgba(${pal.c1},0.14)"/>`);
  p.push(`<text x="${CX}" y="${CY+5.5}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="15" font-weight="700" fill="rgba(255,255,255,0.93)" letter-spacing="1.5">${initials}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${p.join("")}</svg>`;
}

// ═══════════════════════════════════════════════════════════════════
// Masking helpers
// ═══════════════════════════════════════════════════════════════════
function maskName(n)   { return n.split(" ").map(w => w.slice(0,2) + "•".repeat(Math.max(1, w.length - 2))).join(" "); }
function maskEmail(e)  { const [u, d] = e.split("@"); return u[0] + "•".repeat(u.length - 1) + "@" + d.replace(/[^.]/g, "•"); }
function maskPhone(p = MOCK_USER.phone) { return p.slice(0, 3) + "(•••) •••-" + p.slice(-2) + "••"; }
function maskId(id)    { const parts = id.split("-"); return parts[0] + "-" + "•".repeat(parts[1].length) + "-••" + parts[2].slice(-2); }
function maskJoined(j) { const [mon,, yr] = j.split(" "); return mon + " ••, ••" + yr.slice(-2); }

// ═══════════════════════════════════════════════════════════════════
// NavBar
// ═══════════════════════════════════════════════════════════════════
function NavBar({ active }) {
  return (
    <nav className="wl-nav">
      <span className="wl-nav-logo">HX</span>
      <a href="index.html"   className={"wl-nav-tab" + (active === "convert"  ? " wl-nav-tab--active" : "")}>Convert</a>
      <a href="markets.html" className={"wl-nav-tab" + (active === "markets"  ? " wl-nav-tab--active" : "")}>Markets</a>
      <a href="wallet.html"  className={"wl-nav-tab" + (active === "wallet"   ? " wl-nav-tab--active" : "")}>Wallet</a>
      <a href="settings.html" className={"wl-nav-tab" + (active === "settings" ? " wl-nav-tab--active" : "")}>Settings</a>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Toggle
// ═══════════════════════════════════════════════════════════════════
function Toggle({ on, onChange }) {
  return (
    <div
      className={"wl-toggle" + (on ? " wl-toggle--on" : "")}
      onClick={() => onChange(!on)}
      style={{ cursor: "pointer" }}
    >
      <div className="wl-toggle-thumb" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Language selector (custom dropdown for flag rendering)
// ═══════════════════════════════════════════════════════════════════
function LangSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.value === value) || LANGUAGES[0];
  return (
    <div style={{ position: "relative" }}>
      <button className="st-lang-btn" onClick={() => setOpen(o => !o)}>
        <span className="st-lang-flag">{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div className="st-lang-dropdown">
          {LANGUAGES.map(l => (
            <div
              key={l.value}
              className={"st-lang-option" + (l.value === value ? " st-lang-option--active" : "")}
              onClick={() => { onChange(l.value); setOpen(false); }}
            >
              <span style={{ fontSize: 15 }}>{l.flag}</span>
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Animation segmented control
// ═══════════════════════════════════════════════════════════════════
function AnimSeg({ value, onChange }) {
  return (
    <div className="st-seg">
      {ANIM_LEVELS.map(lvl => {
        const active = value === lvl;
        let cls = "st-seg-btn";
        if (active) {
          if      (lvl === "NONE")   cls += " st-seg-btn--active-none";
          else if (lvl === "HEAVY")  cls += " st-seg-btn--active-heavy";
          else                       cls += " st-seg-btn--active";
        }
        return (
          <button key={lvl} className={cls} onClick={() => onChange(lvl)}>
            {lvl}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Avatar design variants
// ═══════════════════════════════════════════════════════════════════

function _avatarBase(seed, suffix) {
  let ph = 0;
  for (let i = 0; i < seed.length; i++) ph = (Math.imul(37, ph) + seed.charCodeAt(i)) | 0;
  return {
    pal:  AV_PALETTES[Math.abs(ph) % AV_PALETTES.length],
    rand: makeSeededRand(seed + suffix),
    id:   (seed + suffix).replace(/[^a-zA-Z0-9]/g, ""),
    S: 72, CX: 36, CY: 36, R: 34,
  };
}

function _avatarFinish(p, pal, CX, CY, R, id, initials) {
  // coin-edge ticks
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const major = i % 9 === 0, med = i % 3 === 0;
    const d = major ? 5 : med ? 3 : 1.5;
    const r1 = R - d;
    const x1 = CX + Math.cos(a) * r1, y1 = CY + Math.sin(a) * r1;
    const x2 = CX + Math.cos(a) * R,  y2 = CY + Math.sin(a) * R;
    p.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(${pal.c1},${major?'0.38':med?'0.20':'0.10'})" stroke-width="${major?'0.6':med?'0.4':'0.25'}"/>`);
  }
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}"   fill="none" stroke="rgba(${pal.c1},0.32)" stroke-width="0.7"/>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R-4}" fill="none" stroke="rgba(${pal.c1},0.10)" stroke-width="0.4"/>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="13" fill="rgba(${pal.c1},0.13)"/>`);
  p.push(`<text x="${CX}" y="${CY+5.5}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="15" font-weight="700" fill="rgba(255,255,255,0.93)" letter-spacing="1.5">${initials}</text>`);
}

// 1 ── Hex grid
function buildAvatarHex(seed, initials) {
  const { pal, rand, id, S, CX, CY, R } = _avatarBase(seed, "_hex");
  const p = [];
  p.push(`<defs><clipPath id="${id}"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="${pal.circle1}"/>`);
  const hs = 6 + rand() * 3, sq3 = Math.sqrt(3);
  for (let row = -7; row <= 8; row++) {
    for (let col = -6; col <= 6; col++) {
      const x = CX + col * hs * 1.5;
      const y = CY + row * hs * sq3 + (Math.abs(col) % 2 === 1 ? hs * sq3 / 2 : 0);
      if (Math.hypot(x - CX, y - CY) > R + hs) continue;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 30) * Math.PI / 180;
        return `${(x + hs * Math.cos(a)).toFixed(1)},${(y + hs * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      const lit = rand() > 0.72;
      const fa  = lit ? (0.10 + rand() * 0.16).toFixed(2) : "0";
      p.push(`<polygon points="${pts}" fill="rgba(${pal.c1},${fa})" stroke="rgba(${pal.c1},0.18)" stroke-width="0.45" clip-path="url(#${id})"/>`);
    }
  }
  _avatarFinish(p, pal, CX, CY, R, id, initials);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${p.join("")}</svg>`;
}

// 2 ── Circuit board
function buildAvatarCircuit(seed, initials) {
  const { pal, rand, id, S, CX, CY, R } = _avatarBase(seed, "_cir");
  const p = [];
  p.push(`<defs><clipPath id="${id}"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="${pal.circle1}"/>`);
  const clip = `clip-path="url(#${id})"`;
  // horizontal traces
  for (let i = 0; i < 11; i++) {
    const y  = 8 + i * 5.5, x1 = 2 + rand() * 14, x2 = S - 2 - rand() * 14;
    const al = (0.10 + rand() * 0.12).toFixed(2);
    p.push(`<line x1="${x1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(${pal.c1},${al})" stroke-width="0.55" ${clip}/>`);
    if (rand() > 0.45) {
      const px = x1 + rand() * (x2 - x1);
      p.push(`<circle cx="${px.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8" fill="none" stroke="rgba(${pal.c1},0.30)" stroke-width="0.5" ${clip}/>`);
      p.push(`<circle cx="${px.toFixed(1)}" cy="${y.toFixed(1)}" r="0.6" fill="rgba(${pal.c1},0.50)" ${clip}/>`);
    }
  }
  // vertical traces
  for (let i = 0; i < 11; i++) {
    const x  = 8 + i * 5.5, y1 = 2 + rand() * 14, y2 = S - 2 - rand() * 14;
    const al = (0.06 + rand() * 0.08).toFixed(2);
    p.push(`<line x1="${x.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(${pal.c2},${al})" stroke-width="0.4" ${clip}/>`);
  }
  _avatarFinish(p, pal, CX, CY, R, id, initials);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${p.join("")}</svg>`;
}

// 3 ── Topographic / fingerprint contours
function buildAvatarTopo(seed, initials) {
  const { pal, rand, id, S, CX, CY, R } = _avatarBase(seed, "_top");
  const p = [];
  p.push(`<defs><clipPath id="${id}"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="${pal.circle1}"/>`);
  const clip = `clip-path="url(#${id})"`;
  const nc = 2 + Math.floor(rand() * 2);
  for (let ci = 0; ci < nc; ci++) {
    const ox = CX + (rand() - 0.5) * 18, oy = CY + (rand() - 0.5) * 18;
    const maxr = 22 + rand() * 10;
    for (let r = 2.5; r < maxr; r += 2.5 + rand() * 1.5) {
      const pts = Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        const w = 1 + (rand() - 0.5) * 0.35;
        return `${(ox + Math.cos(a) * r * w).toFixed(1)},${(oy + Math.sin(a) * r * w).toFixed(1)}`;
      }).join(" ");
      const al = (0.10 + rand() * 0.10).toFixed(2);
      p.push(`<polygon points="${pts}" fill="none" stroke="rgba(${pal.c1},${al})" stroke-width="0.5" ${clip}/>`);
    }
  }
  _avatarFinish(p, pal, CX, CY, R, id, initials);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${p.join("")}</svg>`;
}

// 4 ── Mandala / radial symmetry
function buildAvatarMandala(seed, initials) {
  const { pal, rand, id, S, CX, CY, R } = _avatarBase(seed, "_man");
  const p = [];
  p.push(`<defs><clipPath id="${id}"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="${pal.circle1}"/>`);
  const clip = `clip-path="url(#${id})"`;
  const folds  = [6, 8, 10, 12][Math.floor(rand() * 4)];
  const layers = 3 + Math.floor(rand() * 3);
  for (let l = 0; l < layers; l++) {
    const lr  = (l + 1) / (layers + 1) * R * 0.88;
    const al  = (0.10 + rand() * 0.12).toFixed(2);
    for (let i = 0; i < folds; i++) {
      const a0 = (i / folds) * Math.PI * 2;
      const a1 = ((i + 0.5) / folds) * Math.PI * 2;
      // spoke
      const sx = CX + Math.cos(a0) * lr, sy = CY + Math.sin(a0) * lr;
      p.push(`<line x1="${CX}" y1="${CY}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="rgba(${pal.c1},${al})" stroke-width="0.45" ${clip}/>`);
      // petal arc via midpoint
      const mx = CX + Math.cos(a1) * lr * 0.7, my = CY + Math.sin(a1) * lr * 0.7;
      const nx = CX + Math.cos((i + 1) / folds * Math.PI * 2) * lr;
      const ny = CY + Math.sin((i + 1) / folds * Math.PI * 2) * lr;
      p.push(`<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}" fill="none" stroke="rgba(${pal.c2},${al})" stroke-width="0.4" ${clip}/>`);
    }
    // ring
    p.push(`<circle cx="${CX}" cy="${CY}" r="${lr.toFixed(1)}" fill="none" stroke="rgba(${pal.c1},${(parseFloat(al)*0.5).toFixed(2)})" stroke-width="0.35" ${clip}/>`);
    // dots
    for (let i = 0; i < folds; i++) {
      const a = (i / folds) * Math.PI * 2;
      const dx = CX + Math.cos(a) * lr, dy = CY + Math.sin(a) * lr;
      p.push(`<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="1.0" fill="rgba(${pal.c1},0.40)" ${clip}/>`);
    }
  }
  _avatarFinish(p, pal, CX, CY, R, id, initials);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${p.join("")}</svg>`;
}

// 5 ── Woven diagonal fabric
function buildAvatarWeave(seed, initials) {
  const { pal, rand, id, S, CX, CY, R } = _avatarBase(seed, "_wea");
  const p = [];
  p.push(`<defs><clipPath id="${id}"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="${pal.circle1}"/>`);
  const clip = `clip-path="url(#${id})"`;
  const sp   = 3.5 + rand() * 3;
  for (let d = -S; d < S * 2; d += sp) {
    const al1 = (0.10 + rand() * 0.10).toFixed(2);
    const al2 = (0.07 + rand() * 0.07).toFixed(2);
    p.push(`<line x1="${d.toFixed(1)}" y1="0" x2="${(d+S).toFixed(1)}" y2="${S}" stroke="rgba(${pal.c1},${al1})" stroke-width="0.55" ${clip}/>`);
    p.push(`<line x1="${d.toFixed(1)}" y1="${S}" x2="${(d+S).toFixed(1)}" y2="0" stroke="rgba(${pal.c2},${al2})" stroke-width="0.4"  ${clip}/>`);
  }
  // horizontal accent lines every ~8px
  for (let y = 4; y < S; y += 8 + rand() * 4) {
    const al = (0.05 + rand() * 0.05).toFixed(2);
    p.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${S}" y2="${y.toFixed(1)}" stroke="rgba(${pal.c1},${al})" stroke-width="0.3" ${clip}/>`);
  }
  _avatarFinish(p, pal, CX, CY, R, id, initials);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${p.join("")}</svg>`;
}

// 6 ── Dense starburst / sunburst
function buildAvatarStarburst(seed, initials) {
  const { pal, rand, id, S, CX, CY, R } = _avatarBase(seed, "_str");
  const p = [];
  p.push(`<defs><clipPath id="${id}"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`);
  p.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="${pal.circle1}"/>`);
  const clip  = `clip-path="url(#${id})"`;
  const total = 72 + Math.floor(rand() * 72);
  for (let i = 0; i < total; i++) {
    const a  = (i / total) * Math.PI * 2;
    const r1 = 6 + rand() * 8;
    const r2 = R - 2 - rand() * 10;
    const x1 = CX + Math.cos(a) * r1, y1 = CY + Math.sin(a) * r1;
    const x2 = CX + Math.cos(a) * r2, y2 = CY + Math.sin(a) * r2;
    const al  = (0.06 + rand() * 0.14).toFixed(2);
    const sw  = (0.3 + rand() * 0.5).toFixed(1);
    p.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(${pal.c1},${al})" stroke-width="${sw}" ${clip}/>`);
  }
  // accent rings
  [10, 18, 26].forEach(r => {
    p.push(`<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="rgba(${pal.c2},0.14)" stroke-width="0.4" ${clip}/>`);
  });
  _avatarFinish(p, pal, CX, CY, R, id, initials);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${p.join("")}</svg>`;
}

const AVATAR_VARIANTS = [
  { label: "Banknote",    sub: "guilloche · current",   fn: buildAvatarSVG       },
  { label: "Hex Grid",    sub: "honeycomb cells",        fn: buildAvatarHex       },
  { label: "Circuit",     sub: "PCB trace + pads",       fn: buildAvatarCircuit   },
  { label: "Topographic", sub: "fingerprint contours",   fn: buildAvatarTopo      },
  { label: "Mandala",     sub: "radial symmetry",        fn: buildAvatarMandala   },
  { label: "Weave",       sub: "diagonal fabric",        fn: buildAvatarWeave     },
  { label: "Starburst",   sub: "dense sunburst rays",    fn: buildAvatarStarburst },
];

// ═══════════════════════════════════════════════════════════════════
// Profile card variant (showcase)
// ═══════════════════════════════════════════════════════════════════
function ProfileCardVariant({ seed, initials, label, sub, avatarFn, index }) {
  // each card gets its own palette slot and its own texture seed
  const pal        = AV_PALETTES[index % AV_PALETTES.length];
  const mixedSeed  = seed + "_" + label;
  const textureUrl = "data:image/svg+xml," + encodeURIComponent(buildTextureSVG(mixedSeed));
  const avatarUrl  = "data:image/svg+xml," + encodeURIComponent(avatarFn(seed, initials));

  return (
    <div className="st-section">
      <div className="st-showcase-tag">
        <span>{label}</span>
        <span style={{ color: "rgba(255,255,255,.10)" }}>{sub}</span>
      </div>
      <div className="st-profile-banner" style={{ background: pal.banner }}>
        <img className="st-profile-banner-texture" src={textureUrl} alt="" aria-hidden="true"
          style={{ objectFit: "cover", display: "block" }} />
        <div className="st-profile-inner">
          <img src={avatarUrl} width="60" height="60" alt={initials}
            style={{ borderRadius: "50%", flexShrink: 0, display: "block" }} />
          <div className="st-profile-info">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="st-profile-name">{maskName(MOCK_USER.name)}</span>
              <span className="st-profile-id">{maskId(MOCK_USER.accountId)}</span>
            </div>
            <div className="st-profile-detail">{maskEmail(MOCK_USER.email)}</div>
            <div className="st-profile-detail">{maskPhone(MOCK_USER.phone)} · Since {maskJoined(MOCK_USER.joined)}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 7, alignItems: "center" }}>
              <span className="st-verified-btn">
                <span className="st-verified-check">✓</span>
                Verified
              </span>
              <button className="st-reveal-btn" style={{ cursor: "default", opacity: 0.6 }}>⊕ reveal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KYC data + modal
// ═══════════════════════════════════════════════════════════════════
const KYC_STEPS = [
  { icon: "✉",  name: "Email address",         date: "Verified Jan 12, 2022",  tag: "COMPLETE" },
  { icon: "✆",  name: "Phone number",           date: "Verified Jan 12, 2022",  tag: "COMPLETE" },
  { icon: "◻",  name: "Government-issued ID",   date: "Verified Jan 14, 2022",  tag: "COMPLETE" },
  { icon: "⌂",  name: "Proof of address",       date: "Verified Jan 15, 2022",  tag: "COMPLETE" },
  { icon: "◉",  name: "Liveness check",         date: "Verified Jan 15, 2022",  tag: "COMPLETE" },
  { icon: "⬡",  name: "Enhanced due diligence", date: "Verified Mar 3, 2023",   tag: "COMPLETE" },
];

function KycModal({ onClose }) {
  return (
    <div className="st-kyc-backdrop" onClick={onClose}>
      <div className="st-kyc-modal" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button className="st-kyc-close" onClick={onClose}>✕</button>

        <div className="st-kyc-header">
          <div className="st-kyc-badge">
            <span className="st-kyc-badge-icon">✓</span>
            <span className="st-kyc-badge-text">IDENTITY VERIFIED</span>
          </div>
          <div className="st-kyc-title">KYC Verification</div>
          <div className="st-kyc-sub">All checks passed · Account fully verified</div>
        </div>

        <div className="st-kyc-body">
          {KYC_STEPS.map((step, i) => (
            <div className="st-kyc-step" key={i}>
              <div className="st-kyc-step-icon">{step.icon}</div>
              <div className="st-kyc-step-info">
                <div className="st-kyc-step-name">{step.name}</div>
                <div className="st-kyc-step-date">{step.date}</div>
              </div>
              <span className="st-kyc-step-tag">{step.tag}</span>
            </div>
          ))}
        </div>

        <div className="st-kyc-footer">
          <span className="st-kyc-level">Verification level <span className="st-kyc-level-val">TIER 3</span></span>
          <span className="st-kyc-level">Account ID <span className="st-kyc-level-val">{MOCK_USER.accountId}</span></span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  useEffect(() => { injectSettingsCSS(); }, []);

  const [twoFa,       setTwoFa]       = useState(true);
  const [currency,    setCurrency]    = useState("USD");
  const [defaultCoin, setDefaultCoin] = useState("BTC");
  const [language,    setLanguage]    = useState("en");
  const [animLevel,   setAnimLevel]   = useState("MEDIUM");
  const [revealed,    setRevealed]    = useState(false);
  const [kycOpen,     setKycOpen]     = useState(false);
  const [saved,       setSaved]       = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("hx_settings") || "{}");
      if (s.currency)    setCurrency(s.currency);
      if (s.defaultCoin) setDefaultCoin(s.defaultCoin);
      if (s.language)    setLanguage(s.language);
      if (s.animLevel)   setAnimLevel(s.animLevel);
    } catch (_) {}
  }, []);

  const [avatarSeed, setAvatarSeed] = useState(MOCK_USER.accountId);

  const initials    = MOCK_USER.name.split(" ").map(w => w[0]).join("");
  const textureSVG  = buildTextureSVG(avatarSeed);
  const textureUrl  = "data:image/svg+xml," + encodeURIComponent(textureSVG);
  const avatarSVG   = buildAvatarSVG(avatarSeed, initials);
  const avatarUrl   = "data:image/svg+xml," + encodeURIComponent(avatarSVG);

  function cycleSeed() {
    // generate a fake account-style ID to demo different patterns
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    const rand  = () => chars[Math.floor(Math.random() * chars.length)];
    const id    = `WLT-${rand()}${rand()}${rand()}${rand()}-${rand()}${rand()}${rand()}${rand()}`;
    setAvatarSeed(id);
  }

  const dispName   = revealed ? MOCK_USER.name      : maskName(MOCK_USER.name);
  const dispEmail  = revealed ? MOCK_USER.email     : maskEmail(MOCK_USER.email);
  const dispPhone  = revealed ? MOCK_USER.phone     : maskPhone(MOCK_USER.phone);
  const dispId     = revealed ? MOCK_USER.accountId : maskId(MOCK_USER.accountId);
  const dispJoined = revealed ? MOCK_USER.joined    : maskJoined(MOCK_USER.joined);

  function handleSave() {
    localStorage.setItem("hx_settings", JSON.stringify({ currency, defaultCoin, language, animLevel }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="st-root">
      {kycOpen && <KycModal onClose={() => setKycOpen(false)} />}
      <NavBar active="settings" />
      <div className="st-container">

        {/* ── Profile ── */}
        <div className="st-section">
          <div className="st-profile-banner" style={{ background: (() => { let ph = 0; for (let i = 0; i < avatarSeed.length; i++) ph = (Math.imul(37, ph) + avatarSeed.charCodeAt(i)) | 0; return AV_PALETTES[Math.abs(ph) % AV_PALETTES.length].banner; })() }}>
            <img
              className="st-profile-banner-texture"
              src={textureUrl}
              alt=""
              aria-hidden="true"
              style={{ objectFit: "cover", display: "block" }}
            />
            <div className="st-profile-inner">
              <img
                src={avatarUrl}
                width="60"
                height="60"
                alt={initials}
                style={{ borderRadius: "50%", flexShrink: 0, display: "block" }}
              />
              <div className="st-profile-info">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="st-profile-name">{dispName}</span>
                  <span className="st-profile-id">{dispId}</span>
                </div>
                <div className="st-profile-detail">{dispEmail}</div>
                <div className="st-profile-detail">{dispPhone} · Since {dispJoined}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 7, alignItems: "center" }}>
                  <span className="st-verified-btn" onClick={() => setKycOpen(true)}>
                    <span className="st-verified-check">✓</span>
                    Verified
                  </span>
                  <button className="st-reveal-btn" onClick={() => setRevealed(r => !r)}>
                    {revealed ? "⊗ hide" : "⊕ reveal"}
                  </button>
                  <button className="st-reveal-btn" onClick={cycleSeed} title="Cycle test pattern">
                    ⟳ id
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Security ── */}
        <div className="st-section">
          <div className="st-section-title">Security</div>

          <div className="st-row" style={!twoFa ? { background: "rgba(251,146,60,.04)" } : {}}>
            <div className="st-row-left">
              <span className="st-row-label" style={!twoFa ? { color: "rgba(251,146,60,.85)" } : {}}>
                {!twoFa && <span style={{ marginRight: 6 }}>⚠</span>}
                Two-factor auth
              </span>
            </div>
            <div className="st-row-right">
              <Toggle on={twoFa} onChange={setTwoFa} />
            </div>
          </div>
          {!twoFa && (
            <div className="st-2fa-warning">
              <span className="st-2fa-warning-text">
                ⚠ Your account is at higher risk without 2FA enabled.
              </span>
            </div>
          )}

          <div className="st-row">
            <div className="st-row-left">
              <span className="st-row-label">Change password</span>
            </div>
            <div className="st-row-right">
              <span className="st-chevron">›</span>
            </div>
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className="st-section">
          <div className="st-section-title">Preferences</div>

          <div className="st-row">
            <div className="st-row-left">
              <span className="st-row-label">Display currency</span>
            </div>
            <div className="st-row-right">
              <select className="st-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          <div className="st-row">
            <div className="st-row-left">
              <span className="st-row-label">Default coin</span>
            </div>
            <div className="st-row-right">
              <select className="st-select" value={defaultCoin} onChange={e => setDefaultCoin(e.target.value)}>
                {COINS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="st-row">
            <div className="st-row-left">
              <span className="st-row-label">Language</span>
            </div>
            <div className="st-row-right">
              <LangSelector value={language} onChange={setLanguage} />
            </div>
          </div>
        </div>

        {/* ── Animation Preferences ── */}
        <div className="st-section">
          <div className="st-section-title">Animation Preferences</div>
          <div className="st-row" style={{ alignItems: "center" }}>
            <div className="st-row-left">
              <span className="st-row-label">Intensity</span>
              <span className="st-row-sub">affects all pages</span>
            </div>
            <div className="st-row-right">
              <AnimSeg value={animLevel} onChange={setAnimLevel} />
            </div>
          </div>
          <div className="st-anim-note">
            {animLevel === "NONE"   && "All rolling counters, chart draws, and fade-ins are disabled."}
            {animLevel === "MEDIUM" && "Reduced durations on Convert counters and Wallet chart animations."}
            {animLevel === "HEAVY"  && "Full animations enabled — all effects at maximum intensity."}
          </div>
        </div>

        {/* ── Active Sessions ── */}
        <div className="st-section">
          <div className="st-section-title">Active Sessions</div>
          <div className="st-row">
            <div className="st-row-left">
              <span className="st-row-label">Signed-in devices</span>
              <span className="st-row-sub">MacBook Pro · iPhone 15</span>
            </div>
            <div className="st-row-right">
              <span>2 devices</span>
              <span className="st-chevron">›</span>
            </div>
          </div>
        </div>

        {/* ── Save ── */}
        <button
          className="st-save-btn"
          onClick={handleSave}
          style={{
            background:   saved ? "rgba(74,222,128,.15)"  : "rgba(255,255,255,.07)",
            color:        saved ? "rgba(74,222,128,.9)"   : "rgba(255,255,255,.75)",
            borderColor:  saved ? "rgba(74,222,128,.3)"   : "rgba(255,255,255,.1)",
          }}
        >
          {saved ? "✓  Saved" : "Save Changes"}
        </button>

        {/* ── Profile card design showcase ── */}
        <div className="st-showcase-title">Profile Card Concepts</div>
        {AVATAR_VARIANTS.map(({ label, sub, fn }, i) => (
          <ProfileCardVariant
            key={label}
            seed={avatarSeed}
            initials={initials}
            label={label}
            sub={sub}
            avatarFn={fn}
            index={i}
          />
        ))}

      </div>
    </div>
  );
}
