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

const COINS_LIST = Object.keys(COINS);

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
.st-unverified-btn{display:inline-flex;align-items:center;gap:5px;background:rgba(0,0,0,.25);border:1px solid rgba(251,146,60,.45);border-radius:5px;color:rgba(251,191,36,.95);font-size:10px;font-family:'JetBrains Mono',monospace;padding:3px 9px;cursor:pointer;letter-spacing:.05em;backdrop-filter:blur(4px);transition:background 150ms}
.st-unverified-btn:hover{background:rgba(0,0,0,.4)}
.st-unverified-mark{font-size:9px;background:rgba(251,146,60,.2);border-radius:50%;width:13px;height:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700}

/* KYC modal */
.st-kyc-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px);animation:stFadeIn 200ms ease}
.st-kyc-modal{background:#0f0f16;border:1px solid rgba(255,255,255,.08);border-radius:16px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.6)}
.st-kyc-header{padding:20px 20px 16px;border-bottom:1px solid rgba(255,255,255,.05)}
.st-kyc-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:20px;padding:4px 12px;margin-bottom:12px}
.st-kyc-badge--warn{background:rgba(251,146,60,.08);border-color:rgba(251,146,60,.25)}
.st-kyc-badge-icon{width:16px;height:16px;border-radius:50%;background:rgba(74,222,128,.2);display:flex;align-items:center;justify-content:center;font-size:9px;color:rgba(74,222,128,.9)}
.st-kyc-badge-icon--warn{background:rgba(251,146,60,.2);color:rgba(251,191,36,.95)}
.st-kyc-badge-text{font-size:11px;font-weight:600;color:rgba(74,222,128,.8);letter-spacing:.06em}
.st-kyc-badge-text--warn{color:rgba(251,191,36,.95)}
.st-kyc-step-tag--pending{color:rgba(251,191,36,.85);background:rgba(251,146,60,.08);border-color:rgba(251,146,60,.2)}
.st-kyc-step-tag--required{color:rgba(248,113,113,.8);background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.18)}
.st-kyc-step-tag--locked{color:rgba(255,255,255,.25);background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)}
.st-kyc-step-icon--muted{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08);color:rgba(255,255,255,.25)}
.st-kyc-cta{width:calc(100% - 40px);margin:0 20px 18px;height:42px;border-radius:10px;border:0;font-family:inherit;font-size:12px;font-weight:700;letter-spacing:.04em;cursor:pointer;background:linear-gradient(135deg,rgba(251,146,60,.85),rgba(251,146,60,.55));color:#1a1208;transition:filter 150ms}
.st-kyc-cta:hover{filter:brightness(1.08)}
.st-kyc-level-val--warn{color:rgba(251,191,36,.75)}
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
.st-kyc-progress{display:flex;gap:5px;padding:14px 20px 4px}
.st-kyc-progress-dot{height:3px;flex:1;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}
.st-kyc-progress-dot--active{background:rgba(251,191,36,.65)}
.st-kyc-panel{padding:18px 20px 20px}
.st-kyc-copy{font-size:11px;color:rgba(255,255,255,.34);line-height:1.6;letter-spacing:.02em;margin-bottom:14px}
.st-kyc-form{display:flex;flex-direction:column;gap:12px}
.st-kyc-field-label{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:5px}
.st-kyc-input{width:100%;height:38px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:0 11px;font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(255,255,255,.82);outline:none;transition:border-color 150ms}
.st-kyc-input[type="date"]{color-scheme:dark}
.st-kyc-input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:.55;cursor:pointer}
.st-kyc-input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:.85}
.st-kyc-input:focus{border-color:rgba(251,191,36,.42)}
.st-kyc-input--error{border-color:rgba(248,113,113,.45)}
.st-kyc-error{font-size:10px;color:rgba(248,113,113,.78);margin-top:5px;letter-spacing:.02em}
.st-kyc-upload{display:flex;align-items:center;gap:10px;width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);font-family:inherit;text-align:left;cursor:pointer;transition:all 150ms}
.st-kyc-upload:hover{border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.055)}
.st-kyc-upload--done{border-color:rgba(74,222,128,.22);background:rgba(74,222,128,.06)}
.st-kyc-upload-icon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);color:rgba(255,255,255,.35);font-size:13px;flex-shrink:0}
.st-kyc-upload--done .st-kyc-upload-icon{background:rgba(74,222,128,.12);color:rgba(74,222,128,.8)}
.st-kyc-upload-title{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,.62);letter-spacing:.02em}
.st-kyc-upload-sub{display:block;font-size:10px;color:rgba(255,255,255,.24);margin-top:2px;letter-spacing:.02em}
.st-kyc-liveness{border:1px solid rgba(255,255,255,.08);background:radial-gradient(circle at 50% 42%,rgba(251,191,36,.11),rgba(255,255,255,.03) 58%);border-radius:12px;padding:22px 14px;text-align:center;margin-bottom:14px}
.st-kyc-liveness-ring{width:72px;height:72px;border-radius:50%;border:1px dashed rgba(251,191,36,.35);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;color:rgba(251,191,36,.72);font-size:20px}
.st-kyc-liveness--done .st-kyc-liveness-ring{border-style:solid;border-color:rgba(74,222,128,.36);color:rgba(74,222,128,.8)}
.st-kyc-review{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
.st-kyc-review-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.04);padding:8px 0;font-size:11px}
.st-kyc-review-label{color:rgba(255,255,255,.28)}
.st-kyc-review-val{color:rgba(255,255,255,.62);text-align:right}
.st-kyc-actions{display:flex;gap:8px;padding:0 20px 18px}
.st-kyc-actions .st-kyc-cta{margin:0;width:auto;flex:1}
.st-kyc-secondary{height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);font-family:inherit;font-size:12px;font-weight:700;letter-spacing:.04em;cursor:pointer;padding:0 14px}
.st-kyc-secondary:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.72)}
.st-kyc-submitted{text-align:center;padding:24px 20px 20px}
.st-kyc-submitted-icon{width:58px;height:58px;border-radius:50%;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:rgba(251,191,36,.9);font-size:22px}
.st-kyc-method-grid{display:flex;flex-direction:column;gap:10px;padding:4px 20px 16px}
.st-kyc-method-card{display:flex;align-items:flex-start;gap:12px;width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);font-family:inherit;text-align:left;cursor:pointer;transition:all 150ms}
.st-kyc-method-card:hover{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.055)}
.st-kyc-method-card--idenfy{border-color:rgba(99,102,241,.22);background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(255,255,255,.03))}
.st-kyc-method-card--idenfy:hover{border-color:rgba(99,102,241,.38)}
.st-kyc-method-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;font-weight:700;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5)}
.st-kyc-method-card--idenfy .st-kyc-method-icon{background:rgba(99,102,241,.18);border-color:rgba(99,102,241,.35);color:rgba(167,180,255,.95)}
.st-kyc-method-title{display:block;font-size:13px;font-weight:700;color:rgba(255,255,255,.72);letter-spacing:.02em;margin-bottom:3px}
.st-kyc-method-sub{display:block;font-size:10px;color:rgba(255,255,255,.32);line-height:1.55;letter-spacing:.02em}
.st-kyc-method-tag{display:inline-block;margin-top:8px;font-size:9px;font-weight:600;letter-spacing:.06em;padding:2px 7px;border-radius:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4)}
.st-kyc-method-tag--fast{color:rgba(167,180,255,.85);background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.25)}
.st-kyc-idenfy-panel{padding:18px 20px 8px;text-align:center}
.st-kyc-idenfy-brand{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(167,180,255,.75);margin-bottom:14px;padding:4px 10px;border-radius:20px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.22)}
.st-kyc-qr-wrap{display:inline-block;padding:12px;border-radius:14px;background:#fff;box-shadow:0 8px 28px rgba(0,0,0,.35);margin-bottom:14px}
.st-kyc-qr-grid{display:grid;grid-template-columns:repeat(21,8px);grid-template-rows:repeat(21,8px);gap:0;width:168px;height:168px}
.st-kyc-qr-cell{width:8px;height:8px;background:#111}
.st-kyc-qr-cell--on{background:#111}
.st-kyc-qr-cell--off{background:#fff}
.st-kyc-idenfy-link{font-size:10px;color:rgba(255,255,255,.28);word-break:break-all;line-height:1.5;margin-bottom:14px}
.st-kyc-idenfy-steps{text-align:left;font-size:11px;color:rgba(255,255,255,.38);line-height:1.65;margin:0 20px 16px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);list-style-position:inside;padding-left:14px;overflow:hidden;box-sizing:border-box}
.st-kyc-idenfy-steps li{margin:0 0 6px;padding:0}
.st-kyc-idenfy-steps li:last-child{margin-bottom:0}
.st-kyc-cta--idenfy{background:linear-gradient(135deg,rgba(99,102,241,.85),rgba(79,70,229,.7));color:#fff}
.st-kyc-cta--idenfy:hover{filter:brightness(1.08)}

/* 2FA warning */
.st-2fa-warning{display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(251,146,60,.07);border-top:1px solid rgba(251,146,60,.15)}
.st-2fa-warning-text{font-size:11px;color:rgba(251,146,60,.8);letter-spacing:.02em}

/* Select */
.st-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:rgba(255,255,255,.75);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;font-weight:500;padding:4px 22px 4px 8px;appearance:none;-webkit-appearance:none;cursor:pointer;outline:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,.3)'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;transition:border-color 150ms}
.st-select:hover{border-color:rgba(255,255,255,.18)}
.st-select option{background:#1a1a26}

/* Language selector */
.st-lang-wrap{position:relative}
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

/* Log Out */
.st-logout-btn{width:100%;height:44px;border-radius:10px;border:1px solid rgba(248,113,113,.18);background:rgba(248,113,113,.06);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;font-weight:600;letter-spacing:.06em;cursor:pointer;transition:all 200ms;color:rgba(248,113,113,.75);margin-top:10px}
.st-logout-btn:hover{background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.3);color:rgba(248,113,113,.95)}


.st-pw-input{width:100%;height:38px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:0 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(255,255,255,.85);outline:none;letter-spacing:.03em;transition:border-color 150ms}
.st-pw-input:focus{border-color:rgba(99,102,241,.5)}
.st-pw-input::placeholder{color:rgba(255,255,255,.2)}
.st-pw-label{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:5px}
.st-pw-error{font-size:11px;color:rgba(248,113,113,.8);margin-top:6px;letter-spacing:.02em}
.st-pw-btn{width:100%;height:40px;border-radius:8px;border:1px solid rgba(99,102,241,.3);background:rgba(99,102,241,.15);color:rgba(255,255,255,.85);font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;cursor:pointer;transition:all 150ms;letter-spacing:.04em}
.st-pw-btn:hover{background:rgba(99,102,241,.25);border-color:rgba(99,102,241,.45)}
.st-pw-btn--disabled{opacity:.4;cursor:default}
.st-pw-btn--success{background:rgba(74,222,128,.15);border-color:rgba(74,222,128,.3);color:rgba(74,222,128,.9)}

/* 2FA setup modal */
.st-2fa-step-num{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;letter-spacing:0}
.st-2fa-step-num--active{background:rgba(99,102,241,.2);color:rgba(99,102,241,.9);border:1px solid rgba(99,102,241,.35)}
.st-2fa-step-num--done{background:rgba(74,222,128,.15);color:rgba(74,222,128,.8);border:1px solid rgba(74,222,128,.25)}
.st-2fa-step-num--pending{background:rgba(255,255,255,.04);color:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.06)}
.st-2fa-qr{width:140px;height:140px;border-radius:10px;background:rgba(255,255,255,.95);display:flex;align-items:center;justify-content:center;margin:12px auto}
.st-2fa-secret{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.12em;color:rgba(99,102,241,.8);background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.15);border-radius:6px;padding:6px 10px;text-align:center;user-select:all}

.st-session-row{display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,.04)}
.st-session-row:last-child{border-bottom:none}
.st-session-icon{font-size:20px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border-radius:10px;flex-shrink:0}
.st-session-info{flex:1;min-width:0}
.st-session-device{font-size:12px;font-weight:600;color:rgba(255,255,255,.82);letter-spacing:.02em}
.st-session-detail{font-size:10px;color:rgba(255,255,255,.3);margin-top:2px;letter-spacing:.02em}
.st-session-tag{font-size:9px;font-weight:600;letter-spacing:.06em;color:rgba(74,222,128,.6);background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.15);border-radius:4px;padding:2px 7px}
.st-session-revoke{font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;color:rgba(248,113,113,.7);background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.15);border-radius:5px;padding:4px 10px;cursor:pointer;transition:all 150ms;letter-spacing:.04em}
.st-session-revoke:hover{background:rgba(248,113,113,.15);border-color:rgba(248,113,113,.3);color:rgba(248,113,113,.9)}
.st-signout-all{width:100%;height:36px;border-radius:8px;border:1px solid rgba(248,113,113,.15);background:rgba(248,113,113,.06);color:rgba(248,113,113,.7);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;cursor:pointer;transition:all 150ms;letter-spacing:.04em;margin-top:4px}
.st-signout-all:hover{background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.25);color:rgba(248,113,113,.9)}


@keyframes stFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

@media(max-width:520px){
  .st-container{padding:16px max(12px,env(safe-area-inset-right)) 32px max(12px,env(safe-area-inset-left))}
  .st-row{min-height:48px;padding:12px 14px}
  .st-toggle{width:44px;height:26px}
  .st-toggle-thumb{width:20px;height:20px;top:3px;left:3px}
  .st-toggle--on .st-toggle-thumb{left:21px}
  .st-save-btn,.st-logout-btn{min-height:48px}
  .st-kyc-backdrop{padding-top:max(16px,calc(env(safe-area-inset-top,0px) + 8px));padding-bottom:max(16px,calc(env(safe-area-inset-bottom,0px) + 8px));padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right));align-items:center}
  .st-kyc-modal{max-height:min(90dvh,calc(100dvh - env(safe-area-inset-top,0px) - 24px));overflow-y:auto;-webkit-overflow-scrolling:touch}
  .st-kyc-close{min-width:44px;min-height:44px}
  /* KYC action buttons: stack so the primary CTA sits full-width at the bottom */
  .st-kyc-actions{flex-direction:column}
  .st-kyc-actions>*{width:100%}
  /* Language dropdown: drop full-width onto its own line below the row (anchored to
     the row, not the button) so it doesn't break out of the card */
  .st-row{position:relative}
  .st-lang-wrap{position:static}
  .st-lang-dropdown{left:12px;right:12px;top:calc(100% + 6px);min-width:0;max-width:none}
}
/* Ultra-narrow (target: usable down to ~239px). Shrink fixed-size modal content
   (2FA inputs, QR) so it isn't clipped, and keep dropdowns on-screen. */
@media(max-width:300px){
  .st-kyc-modal{min-width:0}
  .st-2fa-qr{width:120px;height:120px}
  .st-kyc-qr-grid{grid-template-columns:repeat(21,6px);grid-template-rows:repeat(21,6px);width:126px;height:126px}
  .st-kyc-qr-cell{width:6px;height:6px}
  .st-lang-dropdown{max-width:calc(100vw - 24px)}
  .st-kyc-actions{flex-wrap:wrap}
}
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
// SettingsPageSkeleton
// ═══════════════════════════════════════════════════════════════════
const ST_SK_ROW = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,.04)" };
const ST_SK_TITLE = { padding: "10px 14px 6px" };

function StSkSection({ titleW, titleDelay, children }) {
  return (
    <div className="st-section">
      <div style={ST_SK_TITLE}>{hxSk(8, titleW, titleDelay)}</div>
      {children}
    </div>
  );
}

function StSkRow({ labelW, rightW, delay }) {
  return (
    <div style={ST_SK_ROW}>
      {hxSk(11, labelW, delay)}
      {hxSk(11, rightW, delay + 0.03, { borderRadius: 5 })}
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <>
      {/* Profile banner */}
      <div className="st-section">
        <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,.15), rgba(139,92,246,.1))", borderRadius: "14px 14px 0 0", padding: "16px 14px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {hxSkCircle(52, 0)}
            <div style={{ flex: 1 }}>
              {hxSk(13, 110, 0, { marginBottom: 6 })}
              {hxSk(10, 90, 0.04, { marginBottom: 5 })}
              {hxSk(10, 150, 0.08, { marginBottom: 5 })}
              {hxSk(10, 170, 0.12, { marginBottom: 7 })}
              <div style={{ display: "flex", gap: 6 }}>
                {hxSk(20, 62, 0.16, { borderRadius: 5 })}
                {hxSk(20, 52, 0.20, { borderRadius: 5 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <StSkSection titleW={55} titleDelay={0.10}>
        <StSkRow labelW={100} rightW={26} delay={0.12} />
        <StSkRow labelW={110} rightW={14} delay={0.18} />
      </StSkSection>

      {/* Preferences */}
      <StSkSection titleW={72} titleDelay={0.16}>
        <StSkRow labelW={105} rightW={42} delay={0.18} />
        <StSkRow labelW={82}  rightW={42} delay={0.24} />
        <StSkRow labelW={65}  rightW={60} delay={0.30} />
      </StSkSection>

      {/* Animation & Sound */}
      <StSkSection titleW={110} titleDelay={0.22}>
        <div style={ST_SK_ROW}>
          <div>
            {hxSk(11, 60, 0.24, { marginBottom: 5 })}
            {hxSk(8, 85, 0.28)}
          </div>
          {hxSk(28, 140, 0.26, { borderRadius: 8 })}
        </div>
        <div style={{ padding: "0 14px 10px" }}>
          {hxSk(8, "80%", 0.30)}
        </div>
        <StSkRow labelW={90} rightW={14} delay={0.32} />
      </StSkSection>

      {/* Active Sessions */}
      <StSkSection titleW={95} titleDelay={0.32}>
        <div style={{ ...ST_SK_ROW, borderBottom: "none" }}>
          <div>
            {hxSk(11, 115, 0.34, { marginBottom: 5 })}
            {hxSk(8, 130, 0.38)}
          </div>
          {hxSk(11, 55, 0.36)}
        </div>
      </StSkSection>

      {/* Save + Logout */}
      {hxSk(44, "100%", 0.38, { borderRadius: 10 })}
      {hxSk(44, "100%", 0.42, { borderRadius: 10, marginTop: 10 })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Seeded texture generator  (deterministic from accountId)
// ═══════════════════════════════════════════════════════════════════
// makeSeededRand from shared.js

function buildTextureSVG(seed) {
  const pal = paletteForSeed(seed);
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


// Deterministic palette pick from seed — stable across renders
function paletteForSeed(seed) {
  let ph = 0;
  for (let i = 0; i < seed.length; i++) ph = (Math.imul(37, ph) + seed.charCodeAt(i)) | 0;
  return AV_PALETTES[Math.abs(ph) % AV_PALETTES.length];
}

// Profile assets — accountId/name are constants, so derive once at module load
const USER_INITIALS    = MOCK_USER.name.split(" ").map(w => w[0]).join("");
const USER_BANNER_BG   = paletteForSeed(MOCK_USER.accountId).banner;
const USER_TEXTURE_URL = "data:image/svg+xml," + encodeURIComponent(buildTextureSVG(MOCK_USER.accountId));
const USER_AVATAR_URL  = "data:image/svg+xml," + encodeURIComponent(buildAvatarSVG(MOCK_USER.accountId, USER_INITIALS));

function buildAvatarSVG(seed, initials) {
  const pal = paletteForSeed(seed);

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
    <div className="st-lang-wrap">
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
// KYC data + modal
// ═══════════════════════════════════════════════════════════════════
const KYC_STEPS_VERIFIED = [
  { icon: "✉",  name: "Email address",         date: "Verified Jan 12, 2022",  tag: "COMPLETE", status: "complete" },
  { icon: "✆",  name: "Phone number",           date: "Verified Jan 12, 2022",  tag: "COMPLETE", status: "complete" },
  { icon: "◻",  name: "Government-issued ID",   date: "Verified Jan 14, 2022",  tag: "COMPLETE", status: "complete" },
  { icon: "⌂",  name: "Proof of address",       date: "Verified Jan 15, 2022",  tag: "COMPLETE", status: "complete" },
  { icon: "◉",  name: "Liveness check",         date: "Verified Jan 15, 2022",  tag: "COMPLETE", status: "complete" },
  { icon: "⬡",  name: "Enhanced due diligence", date: "Verified Mar 3, 2023",   tag: "COMPLETE", status: "complete" },
];

const KYC_STEPS_UNVERIFIED = [
  { icon: "✉",  name: "Email address",         date: "Verified Jan 12, 2022",     tag: "COMPLETE", status: "complete" },
  { icon: "✆",  name: "Phone number",           date: "Submitted · Under review", tag: "PENDING",  status: "pending" },
  { icon: "◻",  name: "Government-issued ID",   date: "Not submitted",            tag: "REQUIRED", status: "required" },
  { icon: "⌂",  name: "Proof of address",       date: "Not submitted",            tag: "REQUIRED", status: "required" },
  { icon: "◉",  name: "Liveness check",         date: "Complete previous steps",  tag: "LOCKED",   status: "locked" },
  { icon: "⬡",  name: "Enhanced due diligence", date: "Available after Tier 2",   tag: "LOCKED",   status: "locked" },
];

function KycStepTag({ status, label }) {
  const cls = "st-kyc-step-tag"
    + (status === "pending" ? " st-kyc-step-tag--pending" : "")
    + (status === "required" ? " st-kyc-step-tag--required" : "")
    + (status === "locked" ? " st-kyc-step-tag--locked" : "");
  return <span className={cls}>{label}</span>;
}

const KYC_WIZARD_STEPS = ["identity", "documents", "liveness", "review"];
const IDENFY_DEMO_URL = "https://ivs.idenfy.com/verify/demo-session";

function buildIdenfyQrCells(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const rand = () => {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return (h >>> 0) / 0xffffffff;
  };
  const grid = [];
  for (let y = 0; y < 21; y++) {
    const row = [];
    for (let x = 0; x < 21; x++) {
      const corner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const finder = corner && ((x === 0 || x === 6 || y === 0 || y === 6) || (x === 14 || y === 14));
      row.push(finder || rand() > 0.48);
    }
    grid.push(row);
  }
  return grid;
}

function IdenfyQrMock({ seed }) {
  const cells = buildIdenfyQrCells(seed);
  return (
    <div className="st-kyc-qr-wrap" aria-hidden>
      <div className="st-kyc-qr-grid">
        {cells.flatMap((row, y) =>
          row.map((on, x) => (
            <div key={`${x}-${y}`} className={"st-kyc-qr-cell" + (on ? " st-kyc-qr-cell--on" : " st-kyc-qr-cell--off")} />
          ))
        )}
      </div>
    </div>
  );
}

function KycProgress({ step }) {
  const idx = Math.max(0, KYC_WIZARD_STEPS.indexOf(step));
  return (
    <div className="st-kyc-progress" aria-hidden>
      {KYC_WIZARD_STEPS.map((s, i) => (
        <div key={s} className={"st-kyc-progress-dot" + (i <= idx ? " st-kyc-progress-dot--active" : "")} />
      ))}
    </div>
  );
}

function KycModal({ verified, status = "unverified", kycMethod = "manual", onClose, onSubmitted }) {
  const [flowStep, setFlowStep] = useState("choose");
  const [form, setForm] = useState({ legalName: MOCK_USER.name, dob: "", country: "" });
  const [docs, setDocs] = useState({ id: false, address: false });
  const [livenessDone, setLivenessDone] = useState(false);
  const [submitted, setSubmitted] = useState(status === "pending");
  const [errors, setErrors] = useState({});
  const steps = verified ? KYC_STEPS_VERIFIED : KYC_STEPS_UNVERIFIED;
  const isPending = submitted || status === "pending";
  const isWizardStep = KYC_WIZARD_STEPS.includes(flowStep);

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  };

  const goBack = () => {
    if (flowStep === "overview") setFlowStep("choose");
    else if (flowStep === "idenfy") setFlowStep("choose");
    else if (flowStep === "identity") setFlowStep("overview");
    else if (flowStep === "documents") setFlowStep("identity");
    else if (flowStep === "liveness") setFlowStep("documents");
    else if (flowStep === "review") setFlowStep("liveness");
  };

  const nextFromIdentity = () => {
    const next = {};
    if (!form.legalName.trim()) next.legalName = "Enter your legal name";
    if (!form.dob) next.dob = "Enter your date of birth";
    if (!form.country.trim()) next.country = "Enter your country of residence";
    if (Object.keys(next).length) { setErrors(next); return; }
    setFlowStep("documents");
  };

  const nextFromDocuments = () => {
    const next = {};
    if (!docs.id) next.id = "Upload a government-issued ID";
    if (!docs.address) next.address = "Upload a proof of address";
    if (Object.keys(next).length) { setErrors(next); return; }
    setFlowStep("liveness");
  };

  const submitVerification = (method = "manual") => {
    setSubmitted(true);
    onSubmitted?.(method);
  };

  return (
    <div className="st-kyc-backdrop" onClick={onClose}>
      <div className="st-kyc-modal" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button className="st-kyc-close" onClick={onClose}>✕</button>

        <div className="st-kyc-header">
          <div className={"st-kyc-badge" + (verified ? "" : " st-kyc-badge--warn")}>
            <span className={"st-kyc-badge-icon" + (verified ? "" : " st-kyc-badge-icon--warn")}>
              {verified ? "✓" : isPending ? "…" : "!"}
            </span>
            <span className={"st-kyc-badge-text" + (verified ? "" : " st-kyc-badge-text--warn")}>
              {verified ? "IDENTITY VERIFIED" : isPending ? "REVIEW PENDING" : "IDENTITY NOT VERIFIED"}
            </span>
          </div>
          <div className="st-kyc-title">KYC Verification</div>
          <div className="st-kyc-sub">
            {verified
              ? "All checks passed · Account fully verified"
              : isPending
                ? "Your verification is submitted and awaiting review"
              : "Complete verification to unlock withdrawals and higher limits"}
          </div>
        </div>

        {verified ? (
          <>
            <div className="st-kyc-body">
              {steps.map((step, i) => (
                <div className="st-kyc-step" key={i}>
                  <div className={"st-kyc-step-icon" + (step.status === "locked" ? " st-kyc-step-icon--muted" : "")}>
                    {step.icon}
                  </div>
                  <div className="st-kyc-step-info">
                    <div className="st-kyc-step-name">{step.name}</div>
                    <div className="st-kyc-step-date">{step.date}</div>
                  </div>
                  <KycStepTag status={step.status} label={step.tag} />
                </div>
              ))}
            </div>

            <div className="st-kyc-footer">
              <span className="st-kyc-level">
                Verification level <span className="st-kyc-level-val">TIER 3</span>
              </span>
              <span className="st-kyc-level">Account ID <span className="st-kyc-level-val">{MOCK_USER.accountId}</span></span>
            </div>
          </>
        ) : isPending ? (
          <div className="st-kyc-submitted">
            <div className="st-kyc-submitted-icon">◷</div>
            <div className="st-kyc-title" style={{ color: "rgba(255,255,255,.72)", marginBottom: 6 }}>Verification submitted</div>
            <div className="st-kyc-copy" style={{ marginBottom: 18 }}>
              {kycMethod === "idenfy"
                ? "We received your iDenfy session and are reviewing your automated verification. Most reviews complete within a few minutes in this demo."
                : "We are reviewing your identity details, documents, and liveness check. Most reviews complete within a few minutes in this demo."}
            </div>
            <button type="button" className="st-kyc-cta" style={{ margin: 0, width: "100%" }} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {isWizardStep && <KycProgress step={flowStep} />}

            {flowStep === "choose" && (
              <>
                <div className="st-kyc-panel" style={{ paddingBottom: 4 }}>
                  <div className="st-kyc-copy">Choose how you want to verify your identity.</div>
                </div>
                <div className="st-kyc-method-grid">
                  <button type="button" className="st-kyc-method-card" onClick={() => setFlowStep("overview")}>
                    <span className="st-kyc-method-icon">✎</span>
                    <span>
                      <span className="st-kyc-method-title">Manual KYC</span>
                      <span className="st-kyc-method-sub">Enter your details, upload documents, and complete a liveness check in this app.</span>
                      <span className="st-kyc-method-tag">Step-by-step wizard</span>
                    </span>
                  </button>
                  <button type="button" className="st-kyc-method-card st-kyc-method-card--idenfy" onClick={() => setFlowStep("idenfy")}>
                    <span className="st-kyc-method-icon">⎔</span>
                    <span>
                      <span className="st-kyc-method-title">Automated KYC</span>
                      <span className="st-kyc-method-sub">Verify with iDenfy on your phone — scan the QR code to start the guided flow.</span>
                      <span className="st-kyc-method-tag st-kyc-method-tag--fast">Powered by iDenfy</span>
                    </span>
                  </button>
                </div>
              </>
            )}

            {flowStep === "idenfy" && (
              <>
                <div className="st-kyc-idenfy-panel">
                  <div className="st-kyc-idenfy-brand">iDenfy · Automated verification</div>
                  <IdenfyQrMock seed={MOCK_USER.accountId} />
                  <div className="st-kyc-idenfy-link">{IDENFY_DEMO_URL}</div>
                  <ol className="st-kyc-idenfy-steps">
                    <li>Open your phone camera or the iDenfy app.</li>
                    <li>Scan the QR code above to open your verification session.</li>
                    <li>Follow the prompts on your phone to capture ID and selfie.</li>
                    <li>Return here when finished and confirm below.</li>
                  </ol>
                </div>
                <div className="st-kyc-actions">
                  <button type="button" className="st-kyc-secondary" onClick={goBack}>Back</button>
                  <button type="button" className="st-kyc-cta st-kyc-cta--idenfy" onClick={() => submitVerification("idenfy")}>
                    I&apos;ve completed on my phone
                  </button>
                </div>
              </>
            )}

            {flowStep === "overview" && (
              <>
                <div className="st-kyc-body">
                  {steps.map((step, i) => (
                    <div className="st-kyc-step" key={i}>
                      <div className={"st-kyc-step-icon" + (step.status === "locked" ? " st-kyc-step-icon--muted" : "")}>
                        {step.icon}
                      </div>
                      <div className="st-kyc-step-info">
                        <div className="st-kyc-step-name">{step.name}</div>
                        <div className="st-kyc-step-date">{step.date}</div>
                      </div>
                      <KycStepTag status={step.status} label={step.tag} />
                    </div>
                  ))}
                </div>

                <div className="st-kyc-footer">
                  <span className="st-kyc-level">
                    Verification level <span className="st-kyc-level-val st-kyc-level-val--warn">TIER 0</span>
                  </span>
                  <span className="st-kyc-level">Account ID <span className="st-kyc-level-val">{MOCK_USER.accountId}</span></span>
                </div>
                <button type="button" className="st-kyc-cta" onClick={() => setFlowStep("identity")}>Continue with manual verification</button>
                <button type="button" className="st-kyc-secondary" style={{ margin: "0 20px 16px", width: "calc(100% - 40px)" }} onClick={goBack}>Change verification method</button>
              </>
            )}

            {flowStep === "identity" && (
              <>
                <div className="st-kyc-panel">
                  <div className="st-kyc-copy">Confirm your legal identity exactly as it appears on your documents.</div>
                  <div className="st-kyc-form">
                    <div>
                      <div className="st-kyc-field-label">Legal name</div>
                      <input className={"st-kyc-input" + (errors.legalName ? " st-kyc-input--error" : "")} value={form.legalName} onChange={e => updateForm("legalName", e.target.value)} />
                      {errors.legalName && <div className="st-kyc-error">{errors.legalName}</div>}
                    </div>
                    <div>
                      <div className="st-kyc-field-label">Date of birth</div>
                      <input type="date" className={"st-kyc-input" + (errors.dob ? " st-kyc-input--error" : "")} value={form.dob} onChange={e => updateForm("dob", e.target.value)} />
                      {errors.dob && <div className="st-kyc-error">{errors.dob}</div>}
                    </div>
                    <div>
                      <div className="st-kyc-field-label">Country of residence</div>
                      <input className={"st-kyc-input" + (errors.country ? " st-kyc-input--error" : "")} value={form.country} onChange={e => updateForm("country", e.target.value)} placeholder="United States" />
                      {errors.country && <div className="st-kyc-error">{errors.country}</div>}
                    </div>
                  </div>
                </div>
                <div className="st-kyc-actions">
                  <button type="button" className="st-kyc-secondary" onClick={goBack}>Back</button>
                  <button type="button" className="st-kyc-cta" onClick={nextFromIdentity}>Continue</button>
                </div>
              </>
            )}

            {flowStep === "documents" && (
              <>
                <div className="st-kyc-panel">
                  <div className="st-kyc-copy">Upload your ID and proof of address. This prototype simulates a successful upload.</div>
                  <div className="st-kyc-form">
                    <button type="button" className={"st-kyc-upload" + (docs.id ? " st-kyc-upload--done" : "")} onClick={() => { setDocs(d => ({ ...d, id: true })); setErrors(e => ({ ...e, id: "" })); }}>
                      <span className="st-kyc-upload-icon">{docs.id ? "✓" : "◻"}</span>
                      <span>
                        <span className="st-kyc-upload-title">Government-issued ID</span>
                        <span className="st-kyc-upload-sub">{docs.id ? "passport_front.jpg attached" : "Passport, ID card, or driver license"}</span>
                      </span>
                    </button>
                    {errors.id && <div className="st-kyc-error">{errors.id}</div>}
                    <button type="button" className={"st-kyc-upload" + (docs.address ? " st-kyc-upload--done" : "")} onClick={() => { setDocs(d => ({ ...d, address: true })); setErrors(e => ({ ...e, address: "" })); }}>
                      <span className="st-kyc-upload-icon">{docs.address ? "✓" : "⌂"}</span>
                      <span>
                        <span className="st-kyc-upload-title">Proof of address</span>
                        <span className="st-kyc-upload-sub">{docs.address ? "utility_bill.pdf attached" : "Utility bill or bank statement"}</span>
                      </span>
                    </button>
                    {errors.address && <div className="st-kyc-error">{errors.address}</div>}
                  </div>
                </div>
                <div className="st-kyc-actions">
                  <button type="button" className="st-kyc-secondary" onClick={goBack}>Back</button>
                  <button type="button" className="st-kyc-cta" onClick={nextFromDocuments}>Continue</button>
                </div>
              </>
            )}

            {flowStep === "liveness" && (
              <>
                <div className="st-kyc-panel">
                  <div className={"st-kyc-liveness" + (livenessDone ? " st-kyc-liveness--done" : "")}>
                    <div className="st-kyc-liveness-ring">{livenessDone ? "✓" : "◉"}</div>
                    <div className="st-kyc-step-name" style={{ color: "rgba(255,255,255,.6)", marginBottom: 4 }}>
                      {livenessDone ? "Liveness check complete" : "Camera liveness check"}
                    </div>
                    <div className="st-kyc-upload-sub">Center your face and follow the on-screen prompts.</div>
                  </div>
                  <button type="button" className="st-kyc-cta" style={{ margin: 0, width: "100%" }} onClick={() => setLivenessDone(true)}>
                    {livenessDone ? "Check complete" : "Start check"}
                  </button>
                </div>
                <div className="st-kyc-actions">
                  <button type="button" className="st-kyc-secondary" onClick={goBack}>Back</button>
                  <button type="button" className="st-kyc-cta" onClick={() => setFlowStep("review")} disabled={!livenessDone} style={!livenessDone ? { opacity: 0.45, cursor: "not-allowed" } : undefined}>Continue</button>
                </div>
              </>
            )}

            {flowStep === "review" && (
              <>
                <div className="st-kyc-panel">
                  <div className="st-kyc-copy">Review your information before submitting it for verification.</div>
                  <div className="st-kyc-review">
                    <div className="st-kyc-review-row"><span className="st-kyc-review-label">Legal name</span><span className="st-kyc-review-val">{form.legalName}</span></div>
                    <div className="st-kyc-review-row"><span className="st-kyc-review-label">Date of birth</span><span className="st-kyc-review-val">{form.dob}</span></div>
                    <div className="st-kyc-review-row"><span className="st-kyc-review-label">Country</span><span className="st-kyc-review-val">{form.country}</span></div>
                    <div className="st-kyc-review-row"><span className="st-kyc-review-label">Documents</span><span className="st-kyc-review-val">ID + address uploaded</span></div>
                    <div className="st-kyc-review-row"><span className="st-kyc-review-label">Liveness</span><span className="st-kyc-review-val">Complete</span></div>
                  </div>
                </div>
                <div className="st-kyc-actions">
                  <button type="button" className="st-kyc-secondary" onClick={goBack}>Back</button>
                  <button type="button" className="st-kyc-cta" onClick={() => submitVerification("manual")}>Submit</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Change Password Modal
// ═══════════════════════════════════════════════════════════════════
function ChangePasswordModal({ onClose }) {
  const [pwForm, setPwForm] = useState({ current: "", new1: "", new2: "" });
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  function handleUpdate() {
    setPwError("");
    if (pwForm.new1.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.new1 !== pwForm.new2) {
      setPwError("New passwords do not match.");
      return;
    }
    if (!pwForm.current) {
      setPwError("Please enter your current password.");
      return;
    }
    setPwSaved(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  }

  return (
    <div className="st-kyc-backdrop" onClick={onClose}>
      <div className="st-kyc-modal" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button className="st-kyc-close" onClick={onClose}>✕</button>

        <div className="st-kyc-header">
          <div className="st-kyc-title">Change Password</div>
          <div className="st-kyc-sub">Enter your current and new password</div>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="st-pw-label">Current Password</div>
            <input
              type="password"
              className="st-pw-input"
              placeholder="Enter current password"
              value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
            />
          </div>
          <div>
            <div className="st-pw-label">New Password</div>
            <input
              type="password"
              className="st-pw-input"
              placeholder="At least 8 characters"
              value={pwForm.new1}
              onChange={e => setPwForm(f => ({ ...f, new1: e.target.value }))}
            />
          </div>
          <div>
            <div className="st-pw-label">Confirm New Password</div>
            <input
              type="password"
              className="st-pw-input"
              placeholder="Re-enter new password"
              value={pwForm.new2}
              onChange={e => setPwForm(f => ({ ...f, new2: e.target.value }))}
            />
          </div>

          {pwError && <div className="st-pw-error">{pwError}</div>}

          <button
            className={"st-pw-btn" + (pwSaved ? " st-pw-btn--success" : "")}
            onClick={handleUpdate}
            disabled={pwSaved}
          >
            {pwSaved ? "✓ Password Updated" : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Active Sessions Modal
// ═══════════════════════════════════════════════════════════════════
const MOCK_SESSIONS = [
  { device: "MacBook Pro", browser: "Chrome 122", location: "San Francisco, CA", lastActive: "Now (this device)", icon: "\uD83D\uDCBB", current: true },
  { device: "iPhone 15 Pro", browser: "Safari Mobile", location: "San Francisco, CA", lastActive: "2 hours ago", icon: "\uD83D\uDCF1", current: false },
];

function SessionsModal({ onClose }) {
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [fadingIdx, setFadingIdx] = useState(null);

  function handleRevoke(idx) {
    setFadingIdx(idx);
    setTimeout(() => {
      setSessions(s => s.filter((_, i) => i !== idx));
      setFadingIdx(null);
    }, 300);
  }

  function handleSignOutAll() {
    setSessions(s => s.filter(sess => sess.current));
  }

  return (
    <div className="st-kyc-backdrop" onClick={onClose}>
      <div className="st-kyc-modal" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button className="st-kyc-close" onClick={onClose}>✕</button>

        <div className="st-kyc-header">
          <div className="st-kyc-title">Active Sessions</div>
          <div className="st-kyc-sub">Devices currently signed in to your account</div>
        </div>

        <div className="st-kyc-body">
          {sessions.map((sess, i) => (
            <div
              className="st-session-row"
              key={sess.device + sess.browser}
              style={{
                opacity: fadingIdx === i ? 0 : 1,
                transition: "opacity 300ms ease",
              }}
            >
              <div className="st-session-icon">{sess.icon}</div>
              <div className="st-session-info">
                <div className="st-session-device">{sess.device} · {sess.browser}</div>
                <div className="st-session-detail">{sess.location} · {sess.lastActive}</div>
              </div>
              {sess.current ? (
                <span className="st-session-tag">Current</span>
              ) : (
                <button className="st-session-revoke" onClick={() => handleRevoke(i)}>Revoke</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 20px 16px" }}>
          <button className="st-signout-all" onClick={handleSignOutAll}>
            Sign out all other devices
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2FA Setup Modal
// ═══════════════════════════════════════════════════════════════════
const MOCK_2FA_SECRET = "JBSW Y3DP EHPK 3PXP";

// The 6-digit code input now lives in shared.js (window.HxCodeInput); the local
// TwoFaCodeInput was removed and TwoFaSetupModal's OTP step uses the shared one.

function TwoFaSetupModal({ onComplete, onClose }) {
  const HxCodeInput = window.HxCodeInput; // shared; resolved at render time
  const [step, setStep] = useState(1); // 1=scan, 2=confirm key, 3=OTP
  const [secretInput, setSecretInput] = useState("");
  const [secretError, setSecretError] = useState("");

  const STEP_LABELS = ["Scan", "Confirm key", "Auth code"];

  const stepClass = (n) =>
    step > n ? "st-2fa-step-num st-2fa-step-num--done" :
    step === n ? "st-2fa-step-num st-2fa-step-num--active" :
    "st-2fa-step-num st-2fa-step-num--pending";

  const verifySecret = () => {
    const normalized = secretInput.replace(/\s+/g, " ").trim().toUpperCase();
    if (normalized === MOCK_2FA_SECRET) {
      setSecretError("");
      setStep(3);
    } else {
      setSecretError("Key doesn't match. Check your entry and try again.");
    }
  };

  return (
    <div className="st-kyc-backdrop" onClick={onClose}>
      <div className="st-kyc-modal" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button className="st-kyc-close" onClick={onClose}>✕</button>

        <div className="st-kyc-header">
          <div className="st-kyc-badge">
            <div className="st-kyc-badge-icon" style={{ background: "rgba(99,102,241,.2)", color: "rgba(99,102,241,.9)" }}>🔒</div>
            <span className="st-kyc-badge-text" style={{ color: "rgba(99,102,241,.8)" }}>SETUP</span>
          </div>
          <div className="st-kyc-title">Enable Two-Factor Authentication</div>
          <div className="st-kyc-sub">Protect your account with an authenticator app</div>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 20px 6px" }}>
          {[1,2,3].map(n => (
            <React.Fragment key={n}>
              <div className={stepClass(n)}>
                {step > n ? "✓" : n}
              </div>
              <span style={{ fontSize: 10, color: step >= n ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.15)", fontWeight: step === n ? 600 : 400, whiteSpace: "nowrap" }}>
                {STEP_LABELS[n - 1]}
              </span>
              {n < 3 && <div style={{ flex: 1, height: 1, background: step > n ? "rgba(74,222,128,.2)" : "rgba(255,255,255,.06)" }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ padding: "12px 20px 20px" }}>

          {/* Step 1: Scan QR */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 10, lineHeight: 1.5, letterSpacing: ".02em" }}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </div>
              <div className="st-2fa-qr">
                <svg width="110" height="110" viewBox="0 0 110 110">
                  {[[5,5],[75,5],[5,75]].map(([x,y],i) => (
                    <g key={i}>
                      <rect x={x} y={y} width={30} height={30} rx={2} fill="#1a1a2e"/>
                      <rect x={x+4} y={y+4} width={22} height={22} rx={1} fill="#fff"/>
                      <rect x={x+8} y={y+8} width={14} height={14} rx={1} fill="#1a1a2e"/>
                    </g>
                  ))}
                  {Array.from({length:42},(_,i) => {
                    const seed = (i*7+13)%43;
                    const x = 40+(i%7)*5+((i*3)%8);
                    const y = 40+Math.floor(i/7)*5+((i*5)%6);
                    return seed%3!==0 ? <rect key={i} x={x%85+8} y={y%85+8} width={4} height={4} fill="#1a1a2e" rx={0.5}/> : null;
                  })}
                </svg>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", textAlign: "center", marginBottom: 10, letterSpacing: ".02em" }}>
                Or enter this key manually:
              </div>
              <div className="st-2fa-secret"><span style={{ opacity: 0.5, marginRight: 6 }}>🔑</span>{MOCK_2FA_SECRET}</div>
              <div style={{ fontSize: 10, color: "rgba(251,146,60,.6)", marginTop: 10, lineHeight: 1.5, letterSpacing: ".02em", textAlign: "center" }}>
                Write this key down — you'll need to re-enter it in the next step.
              </div>
              <button
                className="st-pw-btn"
                style={{ marginTop: 14 }}
                onClick={() => setStep(2)}
              >
                I've written down the key, Continue →
              </button>
            </div>
          )}

          {/* Step 2: Confirm secret key */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 14, lineHeight: 1.5, letterSpacing: ".02em" }}>
                Re-enter your secret key to confirm you have it saved. This is your only way to recover your account if you lose your device.
              </div>
              <div className="st-pw-label">Secret Key</div>
              <input
                type="text"
                className="st-pw-input"
                placeholder="e.g. JBSW Y3DP EHPK 3PXP"
                value={secretInput}
                onChange={e => { setSecretInput(e.target.value); setSecretError(""); }}
                autoFocus
                style={{ letterSpacing: ".1em", fontWeight: 600, textTransform: "uppercase" }}
                onKeyDown={e => { if (e.key === "Enter") verifySecret(); }}
              />
              {secretError && <div className="st-pw-error" style={{ marginTop: 8 }}>{secretError}</div>}
              <button
                className="st-pw-btn"
                style={{ marginTop: 16 }}
                onClick={verifySecret}
              >
                Verify Key
              </button>
              <button
                style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "rgba(255,255,255,.3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: ".02em" }}
                onClick={() => { setStep(1); setSecretInput(""); setSecretError(""); }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.55)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.3)"}
              >
                ← Back to QR code
              </button>
            </div>
          )}

          {/* Step 3: Enter OTP from authenticator */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 16, lineHeight: 1.5, letterSpacing: ".02em" }}>
                Enter the 6-digit code from your authenticator app to verify setup.
              </div>
              <HxCodeInput label="2FA enabled" onVerified={onComplete} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sound Settings Modal
// ═══════════════════════════════════════════════════════════════════
const SOUND_CHANNEL_META = [
  { key: "success",       label: "Purchase confirmation", sub: "plays on successful buy" },
  { key: "notifications", label: "Notifications",         sub: "deposit & trade alerts" },
  { key: "favorites",     label: "Favorites",             sub: "star / unstar sounds" },
  { key: "save",          label: "Save confirmation",     sub: "settings saved chime" },
];

function SoundSettingsModal({ sounds, onChange, onClose }) {
  return (
    <div className="st-kyc-backdrop" onClick={onClose}>
      <div className="st-kyc-modal" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button className="st-kyc-close" onClick={onClose}>✕</button>
        <div className="st-kyc-header">
          <div className="st-kyc-title">Sound Effects</div>
          <div className="st-kyc-sub">Choose which actions play audio feedback</div>
        </div>
        <div className="st-kyc-body" style={{ padding: "4px 20px 20px" }}>
          {SOUND_CHANNEL_META.map(ch => (
            <div key={ch.key} className="st-row" style={{ alignItems: "center" }}>
              <div className="st-row-left">
                <span className="st-row-label">{ch.label}</span>
                <span className="st-row-sub">{ch.sub}</span>
              </div>
              <div className="st-row-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => previewSound(ch.key)}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, padding: "2px 8px", fontSize: 10, color: "rgba(255,255,255,.4)", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.6 }}
                  onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.7)"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.4)"}
                >▶</button>
                <Toggle on={sounds[ch.key]} onChange={(v) => {
                  const next = { ...sounds, [ch.key]: v };
                  onChange(next);
                  if (v && ch.key === "notifications" && window._pushTestNotif) {
                    window._pushTestNotif();
                  }
                }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button style={{ flex: 1, fontSize: 11, padding: "7px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.7)", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => {
                const all = {}; SOUND_CHANNEL_META.forEach(ch => all[ch.key] = true);
                onChange(all);
              }}>Enable all</button>
            <button style={{ flex: 1, fontSize: 11, padding: "7px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", color: "rgba(255,255,255,.4)", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => {
                const none = {}; SOUND_CHANNEL_META.forEach(ch => none[ch.key] = false);
                onChange(none);
              }}>Disable all</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════
export default function SettingsPage({ embedded = false, onNavigate }) {
  useEffect(() => { injectSettingsCSS(); }, []);
  // Resolve the shared chained-verify modal at render time (shared.js has loaded
  // by now) so a script-order change can't leave it undefined at module eval.
  const ChainedVerifyModal = window.HxChainedVerify;

  const [pageLoading, setPageLoading] = useState(() => getAnimScale() > 0);
  useEffect(() => {
    const t = setTimeout(() => setPageLoading(false), animMs(350));
    return () => clearTimeout(t);
  }, []);

  const [twoFa,       setTwoFa]       = useState(true);
  const [currency,    setCurrency]    = useState("USD");
  const [defaultCoin, setDefaultCoin] = useState("BTC");
  const [language,    setLanguage]    = useState("en");
  const [animLevel,   setAnimLevel]   = useState("MEDIUM");
  const [sounds, setSounds] = useState({ success: true, notifications: false, favorites: false, save: false });
  const [soundsOpen,  setSoundsOpen]  = useState(false);
  const [revealed,    setRevealed]    = useState(false);
  const [kycOpen,     setKycOpen]     = useState(false);
  const [identityVerified, setIdentityVerified] = useState(true);
  const [kycStatus, setKycStatus] = useState("verified");
  const [kycMethod, setKycMethod] = useState("manual");
  const [previewFlowState, setPreviewFlowState] = useState("none");
  const [saved,       setSaved]       = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [twoFaModalOpen, setTwoFaModalOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState(null); // "disable-2fa" | "change-pw" | null
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("hx_settings") || "{}");
      if (s.currency)    setCurrency(s.currency);
      if (s.defaultCoin) setDefaultCoin(s.defaultCoin);
      if (s.language)    setLanguage(s.language);
      if (s.animLevel)   setAnimLevel(s.animLevel);
      if (s.sounds) setSounds(prev => ({ ...prev, ...s.sounds }));
      if (typeof s.identityVerified === "boolean") setIdentityVerified(s.identityVerified);
      if (s.kycStatus) setKycStatus(s.kycStatus);
      if (s.kycMethod === "idenfy" || s.kycMethod === "manual") setKycMethod(s.kycMethod);
      if (s.previewFlowState) setPreviewFlowState(s.previewFlowState);
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("hx_settings") || "{}");
      const nextStatus = identityVerified ? "verified" : kycStatus === "verified" ? "unverified" : kycStatus;
      localStorage.setItem("hx_settings", JSON.stringify({ ...s, identityVerified, kycStatus: nextStatus, kycMethod }));
    } catch (_) {}
  }, [identityVerified, kycStatus, kycMethod]);

  const dispName   = revealed ? MOCK_USER.name      : maskName(MOCK_USER.name);
  const dispEmail  = revealed ? MOCK_USER.email     : maskEmail(MOCK_USER.email);
  const dispPhone  = revealed ? MOCK_USER.phone     : maskPhone(MOCK_USER.phone);
  const dispId     = revealed ? MOCK_USER.accountId : maskId(MOCK_USER.accountId);
  const dispJoined = revealed ? MOCK_USER.joined    : maskJoined(MOCK_USER.joined);
  const kycPending = !identityVerified && kycStatus === "pending";

  function setIdentityPreview(next) {
    setIdentityVerified(next);
    setKycStatus(next ? "verified" : "unverified");
    if (!next) setKycMethod("manual");
  }

  function handleSave() {
    localStorage.setItem("hx_settings", JSON.stringify({ currency, defaultCoin, language, animLevel, sounds, identityVerified, kycStatus, kycMethod, previewFlowState }));
    window.setAnimLevel(animLevel);
    window.setSounds(sounds);
    playSaveSound();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="st-root" style={embedded ? { paddingTop: 0, minHeight: "auto" } : undefined}>
      {kycOpen && (
        <KycModal
          verified={identityVerified}
          status={kycStatus}
          kycMethod={kycMethod}
          onSubmitted={(method) => { setKycMethod(method || "manual"); setKycStatus("pending"); }}
          onClose={() => setKycOpen(false)}
        />
      )}
      {pwModalOpen && <ChangePasswordModal onClose={() => setPwModalOpen(false)} />}
      {sessionsOpen && <SessionsModal onClose={() => setSessionsOpen(false)} />}
      {soundsOpen && <SoundSettingsModal sounds={sounds} onChange={(next) => { setSounds(next); window.setSounds(next); }} onClose={() => setSoundsOpen(false)} />}
      {twoFaModalOpen && <TwoFaSetupModal onComplete={() => { setTwoFa(true); setTwoFaModalOpen(false); }} onClose={() => setTwoFaModalOpen(false)} />}
      {verifyAction && (
        <ChainedVerifyModal
          title={verifyAction === "disable-2fa" ? "Disable Two-Factor Auth" : "Change Password"}
          requireTwoFa={verifyAction === "disable-2fa" ? true : twoFa}
          onVerified={() => {
            const action = verifyAction;
            setVerifyAction(null);
            if (action === "disable-2fa") setTwoFa(false);
            if (action === "change-pw") setPwModalOpen(true);
          }}
          onClose={() => setVerifyAction(null)}
        />
      )}
      {!embedded && <NavBar active="settings" />}
      <div className="st-container">
        {pageLoading ? <SettingsPageSkeleton /> : <div style={{ animation: 'hxSkFadeIn 250ms ease' }}>
        {/* ── Profile ── */}
        <div className="st-section">
          <div className="st-profile-banner" style={{ background: USER_BANNER_BG }}>
            <img
              className="st-profile-banner-texture"
              src={USER_TEXTURE_URL}
              alt=""
              aria-hidden="true"
              style={{ objectFit: "cover", display: "block" }}
            />
            <div className="st-profile-inner">
              <img
                src={USER_AVATAR_URL}
                width="60"
                height="60"
                alt={USER_INITIALS}
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
                  {identityVerified ? (
                    <span className="st-verified-btn" onClick={() => setKycOpen(true)}>
                      <span className="st-verified-check">✓</span>
                      Verified
                    </span>
                  ) : (
                    <span className="st-unverified-btn" onClick={() => setKycOpen(true)}>
                      <span className="st-unverified-mark">{kycPending ? "…" : "!"}</span>
                      {kycPending ? "Review pending" : "Unverified"}
                    </span>
                  )}
                  <button className="st-reveal-btn" onClick={() => setRevealed(r => !r)}>
                    {revealed ? "⊗ hide" : "⊕ reveal"}
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
              <Toggle on={twoFa} onChange={(v) => { if (v) setTwoFaModalOpen(true); else setVerifyAction("disable-2fa"); }} />
            </div>
          </div>
          {!twoFa && (
            <div className="st-2fa-warning">
              <span className="st-2fa-warning-text">
                ⚠ Your account is at higher risk without 2FA enabled.
              </span>
            </div>
          )}

          <div className="st-row" onClick={() => setVerifyAction("change-pw")} style={{ cursor: "pointer" }}>
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

          <div className="st-row">
            <div className="st-row-left">
              <span className="st-row-label">Identity verified</span>
              <span className="st-row-sub">preview verified vs unverified KYC</span>
            </div>
            <div className="st-row-right">
              <Toggle on={identityVerified} onChange={setIdentityPreview} />
            </div>
          </div>

          <div className="st-row">
            <div className="st-row-left">
              <span className="st-row-label">Flow state preview</span>
              <span className="st-row-sub">offline, session, rate & quote errors</span>
            </div>
            <div className="st-row-right">
              <select
                className="st-select"
                value={previewFlowState}
                onChange={e => {
                  const v = e.target.value;
                  setPreviewFlowState(v);
                  window.setFlowPreview(v);
                }}
              >
                <option value="none">Normal</option>
                <option value="offline">Offline</option>
                <option value="session">Session expired</option>
                <option value="rate">Rate unavailable</option>
                <option value="quote">Failed quote</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Animation & Sound ── */}
        <div className="st-section">
          <div className="st-section-title">Animation & Sound</div>
          <div className="st-row" style={{ alignItems: "center" }}>
            <div className="st-row-left">
              <span className="st-row-label">Intensity</span>
              <span className="st-row-sub">affects all pages</span>
            </div>
            <div className="st-row-right">
              <AnimSeg value={animLevel} onChange={(lvl) => { setAnimLevel(lvl); window.setAnimLevel(lvl); }} />
            </div>
          </div>
          <div className="st-anim-note">
            {animLevel === "NONE"   && "All animations disabled — instant transitions everywhere."}
            {animLevel === "MEDIUM" && "Smooth fades and quick transitions — functional motion only."}
            {animLevel === "HEAVY"  && "Spring easings, staggered entrances, wobbles, and confetti."}
          </div>
          <div className="st-row" onClick={() => setSoundsOpen(true)} style={{ cursor: "pointer", marginTop: 6 }}>
            <div className="st-row-left">
              <span className="st-row-label">Sound Effects</span>
              <span className="st-row-sub">{SOUND_CHANNEL_META.filter(ch => sounds[ch.key]).length} of {SOUND_CHANNEL_META.length} enabled</span>
            </div>
            <div className="st-row-right">
              <span className="st-chevron">›</span>
            </div>
          </div>
        </div>

        {/* ── Active Sessions ── */}
        <div className="st-section">
          <div className="st-section-title">Active Sessions</div>
          <div className="st-row" onClick={() => setSessionsOpen(true)} style={{ cursor: "pointer" }}>
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

        {/* ── API ── */}
        <div className="st-section">
          <div className="st-section-title">API</div>
          <div
            className="st-row"
            style={{ cursor: onNavigate ? "pointer" : "default" }}
            onClick={() => { if (onNavigate) onNavigate("api"); else window.location.hash = "api"; }}
          >
            <div className="st-row-left">
              <span className="st-row-label">API keys</span>
              <span className="st-row-sub">Generate & revoke keys · email + 2FA secured</span>
            </div>
            <div className="st-row-right">
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

        <button
          className="st-logout-btn"
          onClick={() => {
            localStorage.removeItem("hx_onboarded");
            window.location.href = "onboarding.html";
          }}
        >
          Log Out
        </button>

        </div>}
      </div>
    </div>
  );
}

window.SettingsPage = SettingsPage;
AppPages.register("settings", {
  component: SettingsPage,
  label: "Settings",
  notchTab: false,
  fullWidth: true,
});
