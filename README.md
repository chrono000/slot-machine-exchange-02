# slot-machine-exchange

A no-build, single-page **HollaEx-style crypto exchange** prototype — converter, wallet, markets, settings, onboarding, and an API-keys page. Built with React 18 + Babel Standalone loaded straight in the browser (no bundler, no install step).

## Running locally

From this folder:

```bash
npx serve -l 59365 .
```

> Do **not** use the `-s` flag — this is a multi-page app, not a SPA, and `-s` would rewrite every route to `index.html`.

Then open **http://localhost:59365/** — the app opens directly in demo
(paper-trading) mode. The onboarding/login demo lives at `/onboarding.html`,
and real exchange login (api.hollaex.com) is on the Trade page via the LIVE
toggle.

`run.bat` does the same thing.

## Pages

| Route | What it is |
|-------|------------|
| `onboarding.html` | Login (password → **required 2FA**), sign-up (email-code verification), recovery, reset |
| `index.html` | App shell — Convert + tabbed pages below |
| `index.html#wallet` | Balances, deposit, **withdraw** (chained 2FA → email) |
| `index.html#markets` | Markets list |
| `index.html#settings` | Profile, security (2FA, change password — chained email + 2FA), KYC, API link |
| `index.html#api` | **Generate / revoke API keys** — scoped permissions, optional IP allowlist, one-time secret, chained email + 2FA |

## Security flows (demo)

Every sensitive action is gated by a verification step. Demo codes:

| Step | Code |
|------|------|
| Login / withdrawal 2FA | `123456` |
| Email verification | `654321` |

## Architecture

- **No build step.** `index.html` fetches each `*.jsx` page, strips the `import`/`export`, Babel-compiles in the browser, and caches the compiled output in `localStorage` (`hxCompile` in `shared.js`) so repeat loads skip Babel entirely.
- **Page registry.** Each page registers itself via `AppPages.register(id, { component, label, ... })`. Adding a page = one new `*.jsx` file + one line in `PAGE_FILES` in `index.html`.
- **Isolated scopes.** Each page file is eval'd separately; cross-page sharing happens through `window` globals defined in `shared.js`.
- React / ReactDOM are vendored locally under `vendor/` so the app loads offline.

## Status

Prototype — all backend behavior (auth, email, 2FA, withdrawals, API issuance) is mocked client-side.
