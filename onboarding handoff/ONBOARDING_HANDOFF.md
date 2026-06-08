# Onboarding Handoff — HX Crypto Dashboard

This folder contains everything needed to continue work on `OnboardingPage.jsx`, the auth/onboarding UI for the HX crypto dashboard. It is fully self-contained and was built separately from the main wallet/converter pages.

---

## 1. What This Is

`OnboardingPage.jsx` is a **4-screen auth UI** for the HX crypto dashboard:

| Screen | Purpose |
|--------|---------|
| **Login** | Email + password + optional 2FA code |
| **Sign Up** | Email + password + confirm + ToS checkbox → email verification step |
| **Recovery** | Enter email → receive reset link (mock) |
| **Reset** | Set new password (reached via `?mode=reset` URL param) |

It is a single React component (no router, no external dependencies) that renders into `onboarding.html`. On successful auth, it writes to `localStorage` and redirects to `index.html` (the main converter page).

---

## 2. How to Run It

**Start the local server** (from the project root — `rolling numbers/`):

```
npx serve -l 59365 .
```

> **Critical:** do NOT use the `-s` flag. This project has multiple HTML pages, not a SPA. The `-s` flag would rewrite all routes to `index.html` and break navigation.

**Open in browser:**

```
http://localhost:59365/onboarding.html
```

A `run.bat` in the project root does the same thing.

---

## 3. Loading Architecture

`onboarding.html` has **no build step**. It loads React 18 + Babel Standalone via CDN, then uses a fetch-based loader pattern:

```js
fetch('OnboardingPage.jsx')
  .then(r => r.text())
  .then(src => {
    // 1. Prepend React hook destructuring
    const preamble = `const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React;`;

    // 2. Strip: import React from 'react'
    let code = src.replace(/^import\s+.*?from\s+["']react["'];?\s*/m, '')
    // 3. Strip: export default function OnboardingPage  →  function OnboardingPage
               .replace(/export\s+default\s+function\s+OnboardingPage/, 'function OnboardingPage');

    // 4. Concatenate + mount
    const full = preamble + code + `
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(OnboardingPage));
    `;

    // 5. Babel-compile and execute
    const compiled = Babel.transform(full, { presets: ['react'] }).code;
    new Function(compiled)();
  })
  .catch(err => {
    document.getElementById('root').innerText = 'Error loading component: ' + err.message;
  });
```

**CSS:** `injectObCSS()` is called inside `useEffect` on first render. It creates a `<style id="ob-page-styles">` tag and appends it to `<head>`. It checks for the id first, so it is **idempotent** (safe to call multiple times).

**Key constraint:** Babel compile errors appear on screen (via the `.catch`). React render errors do NOT — they produce a blank page; check the browser console.

---

## 4. Screen Breakdown

### Login (`screen === "login"`)
- **State:** `email`, `password`, `otp`, `errors`, `loading`, `shaking`, `showPw`, `credErr`
- **Fields:** Email, Password (with show/hide toggle), 2FA Code (optional)
- **Validation:** email must contain `@` and `.`; password ≥ 8 chars; OTP must be 6 digits if provided
- **Flow:** submit → 600ms fake delay → if password is `"wrong"` show cred error + shake; otherwise call `onSuccess(email)` → redirects to `index.html`
- **Links:** "Create Account" → signup, "Forgot Password" → recovery, "Markets" → `markets.html`

### Sign Up (`screen === "signup"`)
Two internal steps controlled by `verifyStep` boolean:

**Step 1 — Registration form:**
- **Fields:** Email, Password, Confirm Password (both with show/hide), ToS checkbox
- **Validation:** email format, password ≥ 8, passwords must match, ToS must be checked
- **Flow:** submit → 600ms fake delay → sets `verifyStep = true`

**Step 2 — Email verification:**
- **State:** `code`, `codeError`, `secondsLeft` (countdown), `resendCount`
- **Field:** 6-digit code input
- **Validation:** must be exactly 6 digits (any 6 digits passes — mock)
- **Countdown:** 60-second timer before "Resend Code" button appears; restarted on each resend
- **Flow:** valid code → 600ms fake delay → call `onSuccess(email)` → redirects to `index.html`

### Recovery (`screen === "recovery"`)
- **State:** `email`, `sent`, `error`
- **Flow:** enter email → submit → `sent = true` → shows "check your email" message (no actual email sent)
- **Link:** "Back to Sign In" → login

### Reset (`screen === "reset"`)
- **Reached via:** `onboarding.html?mode=reset` (query param checked in root `useEffect`)
- **State:** `password`, `confirm`, `errors`, `loading`, `shaking`, `showPw`, `showConfirm`, `done`
- **Fields:** New Password, Confirm Password (both with show/hide)
- **Validation:** password ≥ 8 chars, passwords must match
- **Flow:** submit → 600ms fake delay → `done = true` → shows "Password Updated" confirmation + "Sign In →" link

---

## 5. Mock / Placeholder Behavior

Everything is currently mocked. Here is what needs real implementation:

| Behavior | Current Mock | Real Implementation Needed |
|----------|-------------|---------------------------|
| Login validation | Any non-empty password ≥ 8 chars logs in; password `"wrong"` triggers credential error | Call auth API with email + password + OTP |
| Email verification (signup) | Any 6-digit number passes | Validate code against a real email verification service |
| Email sending | Not sent at all | Send actual verification email on `verifyStep = true` |
| Recovery email | Always shows "check your email" regardless of whether account exists | Call password-reset API; send real email |
| 2FA validation | OTP field is present but not validated against anything real | Validate against TOTP/2FA service |
| Password reset | Immediately shows "Password Updated" with no token validation | Validate reset token from URL, call reset API |

---

## 6. localStorage Contract

Three keys are used by this component:

| Key | Value | When Set | When Read |
|-----|-------|----------|-----------|
| `hx_onboarded` | `"1"` | After successful login or signup (`handleLogin`) | On mount — if `"1"`, immediately redirect to `index.html` |
| `hx_user_email` | User's email string | After successful login or signup | Not read by this component (used by the rest of the dashboard) |
| `hx_ip_seed` | User's IP address string | After IP fetch from `api.ipify.org` | On mount as initial state for background SVG seed |

To **bypass the auth gate** during development, clear `hx_onboarded` from localStorage (or set it to anything other than `"1"`).

---

## 7. Design System Tokens

CSS prefix: **`.ob-*`** (onboarding namespace — avoids collisions with `.wl-*` wallet and `.cv-*` converter styles).

| Token | Value |
|-------|-------|
| Background | `radial-gradient(ellipse at 50% 50%, #181826, #090912, #020203)` |
| Card surface | `rgba(12,12,18,.75)` with `backdrop-filter: blur(16px)` |
| Card border | `rgba(255,255,255,.08)` |
| Card border-radius | `16px` |
| Input border (bottom only) | `rgba(255,255,255,.18)` → `.50` on focus |
| Input error | `rgba(248,113,113,.6)` |
| Button border-radius | `8px` |
| Font | `'JetBrains Mono', ui-monospace, monospace` |
| Text primary | `rgba(255,255,255,.88)` |
| Text secondary | `rgba(255,255,255,.60)` |
| Text muted | `rgba(255,255,255,.35)` |
| Text dimmed | `rgba(255,255,255,.22–.25)` |
| Error text | `rgba(248,113,113,.7–.75)` |
| Gain (used in rest of project) | `#4ade80` |
| Loss (used in rest of project) | `#f87171` |

**Animations:**
- `obFadeIn` — screen entry (300ms, opacity + Y translate)
- `obShake` — validation error (350ms, X translate oscillation)
- `obSpin` — submit button spinner (600ms, continuous rotate)

---

## 8. The Procedural Background

The background is a deterministic SVG guilloche pattern generated from a seed string (the user's IP address, or `"hx-onboarding-default"` as fallback).

**Functions involved:**

`makeSeededRand(seed: string) → () => number`
- Simple xorshift PRNG seeded from the string
- Returns a function that produces `[0, 1)` floats

`buildObBgSVG(seed: string) → string`
- Uses `makeSeededRand` for reproducible randomness
- Uses the seed hash to pick a color palette from `AV_PALETTES`
- Draws: diagonal mesh pattern, slow sine wave polylines, fast sine wave polylines, vertical sine wave polylines, rosette/sunburst, corner registration marks, micro-text strips, seed characters scattered across the canvas

`ObBackground({ seed })` component
- Renders a `<div className="ob-bg">` with `dangerouslySetInnerHTML` containing the SVG
- Fixed-positioned, `z-index: 0`, `opacity: .35`

**IP fetching:** on mount, fetches `https://api.ipify.org?format=json`, stores the IP in `localStorage.hx_ip_seed`, and updates the seed state. Failures are silently ignored (fallback seed remains).

---

## 9. Compile Check Command

Before serving, validate the JSX with:

```bash
cd "C:\Users\USER\Desktop\claude folder\rolling numbers"
node -e "
const babel = require('@babel/core');
const fs = require('fs');
const src = fs.readFileSync('OnboardingPage.jsx', 'utf8');
const code = src.replace(/^import.*react.*\n/m,'').replace(/export default function OnboardingPage/,'function OnboardingPage');
try {
  babel.transform('const {useEffect,useState,useRef}=React;\n'+code,{presets:['@babel/preset-react']});
  console.log('OK');
} catch(e) {
  console.error('LINE', e.loc?.line, e.message);
}
"
```

Requirements: `npm install` must have been run (needs `@babel/core` + `@babel/preset-react` from `package.json`).

**Workflow:**
1. Edit `OnboardingPage.jsx`
2. Run compile check → `OK`
3. Refresh browser (the serve process reads files fresh each request)
4. If page is blank → check browser console, then re-run compile check

---

## 10. What the Receiving AI May Be Asked to Do

Likely tasks, roughly in order of priority:

1. **Wire up real auth API** — replace the mock `setTimeout` in `LoginScreen.handleSubmit` with a real `POST /auth/login` call; handle token storage
2. **Real email verification** — trigger actual email send on signup, validate the code against the backend in `SignUpScreen.handleVerify`
3. **Real password reset** — extract reset token from `?token=...` URL param in `ResetScreen`, call `POST /auth/reset-password`
4. **Real 2FA** — validate the OTP field in login against a TOTP endpoint
5. **Connect to rest of dashboard** — ensure `hx_user_email` and any auth tokens are stored in a way the wallet/converter pages can use
6. **Error handling** — surface real API error messages (network errors, rate limits, invalid tokens)

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `ONBOARDING_HANDOFF.md` | This document |
| `OnboardingPage.jsx` | The complete component (copied from project root) |
| `onboarding.html` | HTML entry point showing exactly how the JSX is loaded |

**Other relevant files in the project root** (not copied here):
- `PROJECT.md` — compile check command, rules, full design system
- `HANDOFF.md` — broader project architecture (covers wallet + converter; does NOT cover onboarding)
- `HollaEx network-icon-(L)-01.svg` — logo used in `<img src="...">` inside the component

---

## Verification Checklist

- [ ] `npx serve -l 59365 .` starts without error (run from project root, not this subfolder)
- [ ] `http://localhost:59365/onboarding.html` loads with dark background + guilloche pattern
- [ ] Login screen → enter any valid email + 8+ char password → signs in, redirects to `index.html`
- [ ] Login screen → enter password `"wrong"` → shows "Invalid email or password" error + shake
- [ ] "Create Account" link → sign up form → submit → email verification step → any 6-digit code → signs in
- [ ] "Forgot Password" link → enter email → "check your email" confirmation
- [ ] `onboarding.html?mode=reset` → Reset screen → set new password → "Password Updated"
- [ ] No console errors on any screen
