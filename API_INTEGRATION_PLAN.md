# HollaEx API Integration Plan

Source of truth: `swagger.zip` (HollaEx Kit 2.17.7, `https://api.hollaex.com/v2`) +
https://apidocs.hollaex.com. Standing rule: **live mode + signed in → only real
data; signed out → demo data stays** (gate: `window.hxIsRealSession()`).

Auth model: `POST /login` → user JWT stored as `hollaex_token`; authenticated
calls send `Authorization: Bearer`. CORS is `*`, so direct browser calls work.
All client functions live in `HxApi` (shared.js).

Status legend: ✅ done · 🔜 next · ⬜ planned

---

## Done so far

✅ Login/JWT session, balances + holds, tickers/orderbook/trades/1h candles,
place/cancel orders, open + closed orders, wallet activity, balance-history
portfolio chart, real Markets volumes, demo-data suppression on sign-in.

---

## 1. Real Convert execution — quick trade ⬜

**Endpoints:** `GET /quick-trade?spending_currency&receiving_currency&spending_amount|receiving_amount`
(works signed out for indicative quotes; authenticated quotes respect user limits),
`POST /order/execute { token }`.
**UI:** CryptoConverter — already has quote loading, TTL countdown, review modal.
**Steps:**
1. In real session, replace the local rate math for the *quoted* amount: on amount
   entry (debounced), call `/quick-trade`; show `receiving_amount` from the response.
2. Store the quote `token` + `expiry`; drive the existing TTL countdown from `expiry`.
3. Review modal "Confirm" → `POST /order/execute {token}`; success → refresh balances
   (dispatch `hx-live-change`), show existing success animation; error → existing
   quote-failed banner.
4. Expired quote → re-quote (UI already has a requote banner).
**Watch out:** execute the **returned token**, never the typed amount; both
`spending_amount` and `receiving_amount` directions are supported.
**Effort:** M.

## 2. Real deposit + withdraw ⬜

**Endpoints:** `GET /user/create-address?crypto=btc&network=btc`,
`GET /user/withdrawal/fee?currency=`, `GET /user/withdrawal/max?currency&network`,
`POST /user/request-withdrawal {address, amount, currency, network, version:'v4', otp_code?}`,
`POST /user/confirm-withdrawal {token}`, `GET /user/deposits|withdrawals` (history — done).
**UI:** Wallet Receive modal (address + QR), Send modal (address, network, fee row,
chained email confirm — matches the real request→email→confirm flow exactly).
**Steps:**
1. Receive: in real session fetch `create-address` per coin/network; show real address
   (+ QR from existing QR builder); cache per coin.
2. Send: populate fee from `/withdrawal/fee`, cap by `/withdrawal/max`;
   submit `request-withdrawal` (include `otp_code` if 2FA enabled);
   the email-code step feeds `confirm-withdrawal {token}`.
3. Refresh balances + activity after confirm.
**Watch out:** network parameter must come from `/constants` coin networks (see #3);
withdrawal requires verified email; errors must surface verbatim.
**Effort:** L. **Risk:** moves real funds — needs careful manual testing with tiny amounts.

## 3. Constants-driven coin/pair universe ⬜

**Endpoints:** `GET /constants` (coins: fullname, active, allow_deposit/withdrawal,
withdrawal_fee, min/max, increment_unit, networks; pairs: increments, min/max size),
`GET /kit` (exchange branding/config).
**UI:** every page (COINS/BASE_RATES are hardcoded today).
**Steps:**
1. On live-mode enable, fetch `/constants` once; build a runtime coin/pair registry
   (fall back to built-in COINS for icons/colors; generic icon for unknown coins).
2. Markets/Trade pair lists from real pairs (adds XHT etc.); order ticket validates
   size against `increment_unit`/min/max before submitting.
3. Deposit/withdraw network pickers from coin networks.
**Watch out:** keep demo COINS for signed-out mode; icons/colors need a fallback map.
**Effort:** M–L (touches many surfaces; do before #2 ideally).

## 4. Real security center ⬜

**Endpoints:** `GET /user/sessions`, `POST /user/revoke-session`, `GET /user/logins`,
`GET /user/request-otp` (returns secret for QR), `POST /user/activate-otp {code}`,
`POST /user/deactivate-otp {code}`, `POST /user/change-password {old_password, new_password}`.
**UI:** SettingsPage — Sessions modal, 2FA toggle flow, change-password flow (all mocked).
**Steps:**
1. Sessions modal lists real sessions; revoke calls the API; "sign out all others".
2. Login history panel from `/user/logins` (real IPs/timestamps/status).
3. 2FA enable: request-otp → render secret as QR (existing QR builder) → activate-otp.
   Disable: deactivate-otp with code. Drive the "2FA enabled" state from `GET /user`.
4. Change password: real call; handle "incorrect password" errors inline.
**Effort:** M. **Note:** affects login (OTP becomes genuinely required after enabling).

## 5. Real sparklines — minicharts ⬜

**Endpoints:** `GET /minicharts?assets=btc,eth&quote=usdt&period=7d` (public).
**UI:** Markets rows + cards sparklines; converter mini pair chart; wallet coin sparkline.
**Steps:** fetch once per live-mode session (+hourly refresh); map per-asset price
arrays into the existing sparkData shape; fall back to synthetic for missing assets.
**Effort:** S.

## 6. Real API key management 🔜 (this batch)

**Endpoints:** `GET /user/tokens`, `GET /user/request-email-confirmation`,
`POST /user/token {name, otp_code, email_code, whitelisted_ips?}` (returns key+secret once),
`DELETE /user/token {token_id, otp_code, email_code}`, `PUT /user/token` (permissions/IPs — later).
**UI:** ApiPage — full UI exists (list, scopes, IP allowlist, chained verify, one-time secret).
**Steps:**
1. Real session → list from `/user/tokens` (demo keys hidden).
2. Create/revoke opens a real verify modal: trigger `request-email-confirmation`,
   collect the emailed code + authenticator code, submit to the API.
3. Show returned key/secret in the existing one-time SecretModal.
**Watch out:** the API **requires 2FA enabled** on the account — show a clear notice
if not. Scope checkboxes are display-only at create time (permissions editing is a
PUT we'll wire later).
**Effort:** S–M.

## 7. Real dust converter 🔜 (this batch)

**Endpoints:** `POST /order/dust/estimate {assets:[...]}`, `POST /order/dust {assets:[...]}`.
**UI:** Wallet DusterModal (detect, review, convert phases — exists).
**Steps:**
1. Real session → estimate via API on open (fall back to local estimate display).
2. Confirm → `POST /order/dust`; success → refresh real balances; skip the demo
   balance mutation.
**Watch out:** conversion target is exchange-configured (often XHT, not USDT) —
label accordingly from the estimate response when possible.
**Effort:** S.

## 8. Recurring buy (DCA) ⬜

**Endpoints:** `GET|POST|PUT|DELETE /user/autotrade`.
**UI:** new card in Wallet or Convert ("Recurring buy") — roadmap item.
**Steps:** list/create/edit/delete auto-trades (spend amount, pair, frequency);
real session only (no demo equivalent needed initially).
**Effort:** M.

## 9. Real PnL ⬜

**Endpoints:** `GET /user/balance-pl` (+ `/user/balance-history` — done).
**UI:** Wallet PnL badges (7D/1M/3M currently fake percentages when no history).
**Steps:** fetch PnL on real session; replace `PERIOD_PNL_PCT`; keep series-derived
fallback.
**Effort:** S.

## 10. Real signup + email verify in onboarding ⬜

**Endpoints:** `POST /signup {email, password, version:'v4'}`,
`POST /verify {email, verification_code}`, `GET /verify?email&resend=true&version=v4`,
`POST /login` (already in HxApi), `POST /reset-password` / `GET /password` for recovery.
**UI:** OnboardingPage — signup with 6-digit email code UI matches the v4 short-code flow.
**Steps:** add a "Live exchange" toggle on onboarding; route signup/verify/login/reset
to the real API; demo path unchanged.
**Watch out:** captcha may be enforced on some exchanges (Cloudflare Turnstile param
exists); surface API errors verbatim.
**Effort:** M.

## 11. WebSocket streams ⬜

**Endpoints:** `wss://api.hollaex.com/stream` (apidocs; not in swagger zip) —
subscribe to orderbook/trades/ticker/user streams with the bearer token.
**UI:** replaces 3.5–5s polling in HxMarket + Trade page; instant book/trade updates.
**Steps:** HxStream module (connect, auth, subscribe per topic, reconnect/backoff);
HxMarket consumes ticker stream when available, falls back to polling.
**Effort:** M–L. Big perceived-quality win.

## 12. Announcements / status ⬜

**Endpoints:** `GET /announcements`, `GET /health`.
**UI:** planned status/announcements surface (roadmap) — could start as a notch feed
or Settings card.
**Effort:** S.

## 13. Earn / staking ⬜

**Endpoints:** `GET /stake` (pools), `GET|POST|DELETE /stakes` (positions),
`GET /stake/slash-estimate`.
**UI:** new Earn page (roadmap item — now real instead of mock).
**Steps:** pools list with APY, stake/unstake flows with slash estimate warning,
positions with accrued rewards.
**Effort:** L.

## 14. Fee schedule + tiers ⬜

**Endpoints:** `GET /tier`, `GET /user/trading-volume`, `GET /user/stats`.
**UI:** new fee schedule page/card (roadmap item).
**Effort:** S.

## 15. Referral program ⬜

**Endpoints:** `GET /user/referral/code|realized|unrealized|history`, `GET /user/affiliation`,
`GET /referral/check`.
**UI:** new referral card/page with real code + earnings.
**Effort:** M.

## 16. Account settings sync ⬜

**Endpoints:** `GET /user` (settings included), `PUT /user/settings`, `POST /user/username`.
**UI:** SettingsPage profile/preferences — sync language/notification prefs to account.
**Effort:** S–M.

## 17. Address book sync ⬜

**Endpoints:** `GET|PUT /user/addressbook`.
**UI:** Wallet Send modal's address book — merge with server-side entries.
**Effort:** S.

## 18. Cancel-all orders ⬜

**Endpoints:** `DELETE /order/all?symbol=`.
**UI:** one button in the Trade page open-orders header.
**Effort:** XS.

## 19. Fiat ramps ⬜

**Endpoints:** `POST /fiat/deposit`, `POST /fiat/withdrawal`.
**UI:** "Add cash" flow (roadmap) — only if the exchange has fiat enabled (check `/kit`).
**Effort:** M (depends on exchange config).

## 20. P2P trading ⬜

**Endpoints:** `/p2p/deal`, `/p2p/order`, `/p2p/order/chat`, `/p2p/feedback`.
**UI:** entirely new surface (deal list, order flow, chat). Largest item; last.
**Effort:** XL.
