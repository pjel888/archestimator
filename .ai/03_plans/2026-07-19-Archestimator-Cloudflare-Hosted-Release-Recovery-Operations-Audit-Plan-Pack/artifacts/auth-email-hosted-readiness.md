# Auth + Email Hosted Readiness — O-09 / O-10

## O-09 — Better Auth, OAuth, magic link (hosted)

### Hosted route availability — HOSTED_CONFIRMED

- `GET https://archestimator.com/api/auth/get-session` returns `null` for a
  no-cookie request with `Cache-Control: private, no-cache, no-store, max-age=0,
  must-revalidate` and full security headers (HSTS preload, X-Frame DENY,
  X-Content-Type-Options nosniff, Referrer-Policy no-referrer).
- `GET https://archestimator.com/login` renders "Continue with Google" — the
  Better Auth social-login UI is present.
- `GET https://archestimator.com/api/auth/session` (wrong path) returns 404 —
  Better Auth's canonical path is `/api/auth/get-session`, not
  `/api/auth/session`. **Operational note**: any monitoring probe that targets
  `/api/auth/session` will false-positive. Use `/api/auth/get-session`.
- `/admin` and `/workshop` 307→`/login?next=…` for unauthenticated requests —
  auth gate enforced at the edge proxy.

### Google OAuth callback configuration presence — CURRENT_SOURCE_CONFIRMED + EVIDENCE_BLOCKED

- `src/lib/auth/better-auth-cloudflare.ts:234-246` resolves Google OAuth from
  `BETTER_AUTH_GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_ID` and
  `BETTER_AUTH_GOOGLE_CLIENT_SECRET`/`GOOGLE_CLIENT_SECRET`. If either is empty,
  Google is disabled (returns `undefined`).
- Worker **secret name presence** (not values): EVIDENCE_BLOCKED under AUTH-001.
  Operator continuation: `bunx wrangler secret list --env prod` (names only).
- Hosted OAuth callback round-trip (login → `/api/auth/callback/google` →
  session cookie → `/workshop`) was **not exercised** in this audit because no
  real test account was used. Finding `OPS-AUTH-OAUTH-010`.

### Trusted origins / hosts — CURRENT_SOURCE_CONFIRMED

- `src/lib/auth/cloudflare-better-auth-runtime.ts:91-103` resolves trusted
  origins as the deduplicated union of:
  - origin of `baseURL`
  - origin of the request URL
  - origin derived from the `Host` + `x-forwarded-proto` headers
  - comma-separated `BETTER_AUTH_TRUSTED_ORIGINS`
  - comma-separated `ARCHESTIMATOR_ALLOWED_APP_ORIGINS`
- `baseURL` resolution order (`cloudflare-better-auth-runtime.ts:82-89`):
  `BETTER_AUTH_URL` → `NEXT_PUBLIC_APP_URL` → `NEXT_PUBLIC_SITE_URL` → request
  URL origin → host-header origin → `http://localhost:3000`.
- Operator action required: confirm hosted Worker secret `BETTER_AUTH_URL` (or
  `NEXT_PUBLIC_APP_URL`) is set to `https://archestimator.com`. Mis-set value
  would allow the `Host` header to drive trusted-origin derivation.

### Magic-link readiness (without sending real mail) — CURRENT_SOURCE_CONFIRMED

- `src/lib/auth/better-auth-cloudflare.ts:256-296` configures Better Auth
  `magicLink({ storeToken: "hashed", expiresIn: 300, rateLimit: { window: 60,
  max: 10 }, sendMagicLink })`.
- `sendMagicLink` calls `sendCloudflareEmail` — which is **fail-closed** unless
  `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=1` and provider is `cloudflare` and
  `CLOUDFLARE_EMAIL_FROM` is set (`src/lib/email/cloudflare-email-client.ts:133-139`).
- No real mail sent in this audit. Operator continuation: confirm hosted
  secrets `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`, `ARCHESTIMATOR_EMAIL_PROVIDER`,
  `CLOUDFLARE_EMAIL_FROM`, `CLOUDFLARE_EMAIL_REPLY_TO`.

### Session creation / denial — HOSTED_CONFIRMED

- `GET /api/auth/get-session` returns `null` body when no session cookie is
  sent — fail-closed, no session leakage.
- `requireUserForBetterAuthRouteGate` returns `{ok:false, reason:
  "missing-session"}` on null session.

### Logout / revocation / expiry — CURRENT_SOURCE_CONFIRMED

- Standard Better Auth handlers (no custom code path). Session `expiresIn:
  60*60*24*7` (7 days) at `better-auth-cloudflare.ts:198-204`.
- `cookieCache.enabled: false` — every request hits D1 (Infosec `SEC-AUTH-001`
  compensating control).
- Quality Master UNIT-035 owns auth-read coalescing decisions without weakening
  revocation.

### Suspended / banned — CURRENT_SOURCE_CONFIRMED

- `src/lib/auth/session.ts:80-85`:
  `account_status === 'banned'` → `/access-required?reason=banned`;
  `=== 'suspended'` → `/access-required?reason=suspended`.
- Backed by `profiles.account_status TEXT NOT NULL DEFAULT 'active' CHECK
  (account_status IN ('active','suspended','banned'))` (migration `0051`).

### State-mismatch recovery — CURRENT_SOURCE_CONFIRMED + HOSTED_CONFIRMED

- Edge layer (`worker-route-optimizations.ts:236-300`) and proxy layer
  (`request-proxy.ts:131-155`) both detect `?error=state_mismatch` and clear
  OAuth state cookies + `Clear-Site-Data`.
- Hosted probe did not drive a real OAuth flow, so the hosted state-mismatch
  recovery path was not exercised end-to-end.

### Cross-domain cookie behavior — CURRENT_SOURCE_CONFIRMED + HOSTED_CONFIRMED

- Canonical-host redirect at `worker.ts:146` (`routeCanonicalHostRedirect`)
  308-redirects `www.archestimator.com` and the workers.dev subdomain to apex.
  Hosted probe confirmed both `www` and workers.dev 308 to apex.
- Better Auth session cookies use `__Secure-` prefixed names where applicable.

## O-10 — Cloudflare Email and notifications

### Binding presence — CURRENT_SOURCE_CONFIRMED

- `wrangler.jsonc:28-32`: `send_email: [{ "name": "EMAIL" }]`. Outbound Workers
  Send Email only.
- **No `email_routing` block** in `wrangler.jsonc`. No inbound Worker `email()`
  handler in `worker.ts` — `worker.ts:141-321` has only `fetch`, `scheduled`,
  and `queue` handlers. Confirmed: the EMAIL binding is outbound-only.

### Sender / domain readiness — MIXED (Finding OPS-EMAIL-MX-007 + OPS-EMAIL-DNS-008)

- **MX records** (`dig +short MX archestimator.com`):
  - `10 eforward1.registrar-servers.com.`
  - `10 eforward2.registrar-servers.com.`
  - `10 eforward3.registrar-servers.com.`
  - `15 eforward4.registrar-servers.com.`
  - `20 eforward5.registrar-servers.com.`
- **SPF**: `"v=spf1 include:spf.efwd.registrar-servers.com ~all"` — authorizes
  Namecheap's eforward only.
- **DMARC**: `"v=DMARC1; p=none;"` — monitor mode, no enforcement.
- **DKIM**: no record published under `default.`, `google.`, `cloudflare.`,
  `cf.`, or `mail._domainkey`.
- **Operational consequence**: outbound email from the Worker (Cloudflare
  Workers Send Email uses an account-verified address for `CLOUDFLARE_EMAIL_FROM`)
  will be DKIM-signed by Cloudflare, but `archestimator.com`'s SPF authorizes
  Namecheap only — so recipient SPF checks will likely **softfail** on Worker-
  sent mail. Replies to Worker-sent mail land in the Namecheap-forwarded mailbox
  (via `efoward`), not in a Worker `email()` handler. There is no path for the
  app to observe bounces or replies programmatically.
- Finding `OPS-EMAIL-MX-007` (Medium): inconsistent mail topology.
- Finding `OPS-EMAIL-DNS-008` (Medium): SPF/DMARC/DKIM hardening needed before
  controlled beta sends production mail.

### MIME construction — CURRENT_SOURCE_CONFIRMED

- `sendCloudflareEmail` (`src/lib/email/cloudflare-email-client.ts:151-158`)
  passes `{ to, from, subject, text, html, replyTo }` to `binding.send`. MIME
  construction is delegated to Cloudflare.
- **Infosec UNIT-004** owns the CRLF + HTML escape chokepoint (email boundary).
  Cross-reference, not duplicate.

### Failure behavior — CURRENT_SOURCE_CONFIRMED

- `cloudflare-email-client.ts:163-178` catches binding errors, emits
  `event: "cloudflare_email_send_error"` log, returns `{ok:false, error, code}`.
- `transactional-email-client.ts:60-97` adds a circuit breaker: opens for
  `EMAIL_CIRCUIT_COOLDOWN_MS = 10 min` when failure rate > 0.5 over ≥4 samples.

### Queue vs inline delivery — CURRENT_SOURCE_CONFIRMED

- Magic-link: inline via Better Auth background task.
- Client Portal notifications: via `CLIENT_PORTAL_NOTIFICATIONS_QUEUE` with
  10 retries + DLQ routing (`client-portal-notification-queue.ts:108-149`).
- Publication delivery queue: defined by Quality Master UNIT-024/055-057 (not
  yet implemented).

### Retry / dedupe — CURRENT_SOURCE_CONFIRMED

- Client Portal queue: exponential backoff capped at 60 minutes;
  `attempt_count >= 10` → `state='dead'`.
- Magic-link: no retry at the email layer (Better Auth surfaces failure to user).

### Bounce / failure visibility — CURRENT_SOURCE_CONFIRMED + finding

- No `email()` Worker handler → bounces are not ingested into D1.
- Cloudflare Workers Send Email does not natively expose bounce events to the
  Worker; bounce visibility depends on the receiving mailbox operator
  (Namecheap eforward for `@archestimator.com`).

### Support address / DNS — HOSTED_CONFIRMED

- No `support.archestimator.com` or `mail.archestimator.com` MX records.
- Inbound support path: `@archestimator.com` MX → Namecheap eforward → operator
  mailbox (out of app scope).

### Recipient privacy — CURRENT_SOURCE_CONFIRMED

- `redact.ts:27` `HASHED_ONLY_KEYS` includes `email`, `recipient_email`,
  `user_email`. Log emails are hashed `sha256:<16hex>`.

### Real-email safety gate — CURRENT_SOURCE_CONFIRMED

- `sendCloudflareEmail` returns `{ok:false, code:"EMAIL_NOT_CONFIGURED"}` unless
  `enabled && cloudflareProviderSelected && from`.
- `.env.example:64` ships `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false`.

### Operator runbook — NEW_OWNER_HERE

- Documented in `artifacts/recovery-scenario-matrix.csv` for the
  "email outage" scenario. No real outbound messages sent in this audit.

## Cross-reference notes

- **Infosec UNIT-004** owns the email-boundary chokepoint (CRLF + HTML escape
  at `cloudflare-email-client.ts`). This audit does NOT duplicate that
  remediation. The DNS topology findings here are operational deliverability,
  not Infosec's injection-defense scope.
- **Infosec UNIT-001** owns realtime token revocation. Hosted proof of
  revocation state in DO SQLite is unique to this audit.
- **Quality Master UNIT-035** owns session-read coalescing decisions; this
  audit's hosted OAuth round-trip finding does not duplicate that.
