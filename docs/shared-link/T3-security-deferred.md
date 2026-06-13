# Shared Link — Track T3 Security: shipped vs. deferred

Branch: `claude/2026-06-13-Shared-Link-Improvement-Plan`. Spec: `.ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/06_SECURITY_AUDIT.md`.

## Shipped
**P-Sec-1** (`fix(share-security): HMAC ip/ua hashes ... (T3 P-Sec-1)`)
- **SEC-02** — `ip_hash`/`user_agent_hash` now keyed HMAC with an env pepper (`ARCHESTIMATOR_TELEMETRY_HASH_PEPPER`, falls back to the token-hash secret). No bare `sha256(ip)`.
- **SEC-06** — comment/decision recipient lookups are publication-scoped (`.eq("publication_id", …)`) at the app layer; a recipient id can't cross publications.
- **SEC-15** — comment/decision routes return a generic envelope on unexpected errors; details logged server-side only.
- **SEC-08** — regression guard: no `dangerouslySetInnerHTML` in the comment/decision/activity render paths.

**P-Sec-2 (safe subset)** (`fix(share-security): no-referrer + HSTS + noindex headers, unsubscribe interstitial (T3 P-Sec-2)`)
- **SEC-01 (header half)** — `Referrer-Policy: no-referrer` on `/share/:path*` and `/api/share/:path*`, so the `?recipient=` token is never leaked via the `Referer` header.
- **SEC-05 (safe subset)** — `Strict-Transport-Security` (HSTS) + `X-Robots-Tag: noindex, nofollow` + `X-Content-Type-Options: nosniff` + `X-Frame-Options: DENY` on the share page and API.
- **SEC-14** — unsubscribe is now read-only on GET (renders a confirmation interstitial); the mutation happens only on an explicit **same-origin POST**, so an email-client prefetch / scanner can't silently unsubscribe a recipient.

## Deferred — design-ready (NOT shipped), need a live runtime / threat-model sign-off

### SEC-01 (transport half) — move the recipient token off the URL
`Referrer-Policy: no-referrer` (shipped) already closes the practical `Referer`-leak vector. The deeper change — replacing the `?recipient=<rawToken>` URL param with a POST-claim / single-use exchange code that is rotated/invalidated after the first successful session establishment — is a transport redesign touching the email-link builder, the `/share/[token]` page, and the session route. It is deferred because it changes the recipient onboarding flow and must be validated end-to-end in a live environment (real email link → first-open session establishment → rotation). Approach: issue a one-time exchange code in the email link; on first GET, the page POSTs it to `/api/share/[token]/session` which mints the HttpOnly session cookie and invalidates the code; subsequent visits use the cookie (no token in the URL).

### SEC-05 (CSP tightening) — remove `unsafe-inline` / `unsafe-eval`
The share CSP still allows `script-src 'unsafe-inline' 'unsafe-eval'` and `style-src 'unsafe-inline'` (unchanged from the P11 enforced policy). Removing them requires a **per-request nonce** pipeline (middleware that generates a nonce, threads it into Next's inline runtime/style tags, and into the CSP header) — Next 16's inline hydration runtime + styled output otherwise breaks. This cannot be verified without a live browser (a wrong nonce wiring white-screens the page — a worse outcome than the current weakness). Deferred: implement a nonce-based CSP via middleware and verify in-browser that `/share` renders with no CSP violations, then drop `unsafe-inline`/`unsafe-eval`. AC-SEC-05's nonce alternative is explicitly the intended path.

### SEC-03 — durable multi-instance password lockout
Already implemented on `main` (durable rate limiting via `security_rate_limit_events`) per the audit's verified-fixed list; AC-SEC-03's `x-forwarded-for` spoof assertion is a live-platform verification step.
