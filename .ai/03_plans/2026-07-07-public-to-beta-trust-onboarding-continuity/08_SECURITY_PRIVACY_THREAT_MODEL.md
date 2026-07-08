# 08 — Security, Privacy, and Threat Model

## 1. Scope
Continuity-path security: the public surface up to and including the beta-request intake, the post-auth landing, and the welcome email. Deep auth/invite-token crypto is owned by sibling packs; this pack covers only the **continuity** security of the handoff and the new `requestBetaAccess` surface.

## 2. Trust boundaries
- **B1: Public internet → Worker.** All public pages + `/signup` + `/contact` + `requestBetaAccess` live here. No trusted client input.
- **B2: Worker → Better Auth.** `/api/auth/[...all]`.
- **B3: Proxy header → WorkshopLayout.** `x-archestimator-auth-verified`/`x-archestimator-terms-accepted` headers (stripped of inbound spoofing, set by proxy).
- **B4: Worker → D1.** Repository/app-authz layer.
- **B5: Worker → Cloudflare Email.** `EMAIL` binding.

## 3. Actor model
- **Anonymous visitor:** can hit public pages, `/login`, `/signup`, `/invite/[token]`, submit `requestBetaAccess`.
- **Closed-beta-enabled user:** has an allowlist row (`invited`/`active`).
- **Closed-beta-denied/revoked user:** Better Auth identity exists but allowlist denies.
- **Invited collaborator:** has a collaboration invite token.
- **Abuser:** attempts enumeration, spam, prompt-injection (n/a — no AI surface here), rate-limit evasion.

## 4. Attack surface inventory (mandated 8-column form, per Improve-Plan-Prompt §7)

`Entry point | Actor | Authn/authz and ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests`

| Entry point | Actor | Authn/authz + ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests |
|---|---|---|---|---|---|---|---|
| `requestBetaAccess` Server Action (`src/lib/landing/beta-request-actions.ts`) | anonymous public | **none** (public intake — no auth required); ownership n/a (creates no owned resource) | email regex + ≤320; name≤120; company≤120; honeypot `company_url` must be empty; normalized email | `{ ok: boolean; reason?: 'invalid' }` — uniform `ok:true` for success/dup/rate-limited/honeypot (SEC-CONT-03); **no allowlist-membership leak** | `Cache-Control: no-store` (mutation) | email 3/window + IP 10/window (`windowSeconds=3600`), fixed-window+TTL via `security_rate_limit_events`; honeypot fail-closed; IP stored only as CHECK-compliant `hmac-sha256:`+hex hash | `beta-request-intake.test.ts`: happy/honeypot/rate-limit/dup(uniform)/invalid/oversized + ip_hash-format denial |
| Welcome-email trigger (`src/lib/auth/welcome-email.ts`, fired from `completeOnboarding`) | authenticated user (self) | keyed by `user_id` from auth context; idempotency check on `account_security_events` | none (no user input; uses identity fields) | none (fire-and-monitor; no client DTO) | n/a (server-side side-effect) | once-only via idempotency row; circuit breaker in `transactional-email-client.ts` (5-min/10-min) | `welcome-email.test.ts`: once-only/skip-disabled/no-block-on-fail/no-token |
| Footer `mailto:support@archestimator.com` links | anonymous public | n/a (static public address) | n/a | n/a | static | email-harvesting risk accepted (public address by design) | none (existing) |
| `/cookies` page (`src/app/cookies/page.tsx`) | anonymous public | n/a (static) | n/a | HTML | `force-static` + marketing cache headers (must extend `public-static-route-contract.test.ts`) | n/a (static) | `cookies-page.test.tsx`: render + single-h1 + main landmark |
| Dashboard first-project CTA (`WorkshopDashboard`/`WorkshopHomebaseClient`) | authenticated, terms-accepted, closed-beta-allowed | existing workshop auth (`proxy` + `workshop/layout.tsx` + `session.ts`) | n/a (derived from `projectCount`) | n/a (navigates) | workshop `private,no-cache,no-store` | n/a | `first-project-empty-state.test.tsx`: present@0/absent@≥1 + focusable |
| `/workshop/onboarding` redirect | authenticated | existing workshop auth | n/a | redirect (`/workshop/projects` or `/workshop`) | `private,no-cache,no-store` | n/a | `workshop-onboarding-redirect.test.ts`: both branches |

**DTO minimization:** `requestBetaAccess` returns only `{ok, reason?}` — never echoes PII, never reveals allowlist state. The welcome email contains no credential/token (only a plain `/workshop` link). No other entry point returns user data beyond what existing surfaces already return.

## 5. `requestBetaAccess` threat analysis (the one genuinely new security surface)

**Threats:**
- **T1 Flooding/spam:** abuser submits thousands of requests → audit table pollution + owner inbox flood (if email-forwarded). → **Control:** per-email (3/hr) + per-IP-hash (10/hr) rate limit; honeypot; fail-closed on honeypot.
- **T2 Enumeration:** receipt reveals whether an email is already on the allowlist. → **Control:** uniform receipt message for success/duplicate/rate-limited/already-on-allowlist (SEC-CONT-03). Distinct messages only for clear input-validation failures (empty/invalid format).
- **T3 Direct POST bypass:** Server Action is a direct POST endpoint; abuser skips the UI. → **Control:** the action self-validates honeypot, rate-limit, and input regardless of caller; it does not trust the referer.
- **T4 PII over-collection:** collecting more than needed. → **Control:** email (required) + optional name/company, length-capped; no phone/address. IP stored only as HMAC-hash.
- **T5 XSS via submitted fields:** name/company rendered in an admin queue view. → **Control:** render as text, never `dangerouslySetInnerHTML`; the admin queue (`/workshop/settings/users`) already exists and must treat these as untrusted text.
- **T6 Injection (SQL/log):** email/name/company in SQL or logs. → **Control:** parameterized D1 queries (existing repository pattern); logs redact to email + truncated fields.

**Denial tests:** SEC-CONT-01 tests cover honeypot-trip (fail closed), rate-limit (throttle), duplicate (uniform receipt), invalid-email (validation), oversized-input (length cap).

## 6. Credential material taxonomy (continuity-path materials)

See `20_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md` for the full matrix. Continuity-path-relevant materials (all pre-existing, **none newly introduced except the welcome-email trigger which carries no new credential**):

| Material | Class | Stored | Client-visible? | Used for | Continuity impact |
|---|---|---|---|---|---|
| Better Auth session cookie (`better-auth.session_token`/`__Secure-`) | opaque session cred | D1 `session` + cookie | yes (HttpOnly cookie) | workshop auth | unchanged |
| Invite token (raw) | raw bearer | `collaboration_invitation_tokens.token_hash` (SHA-256+pepper) — raw never stored | yes (in `/invite/{raw}` URL) | collaboration access | unchanged (sibling pack) |
| Pending-invite bridge cookie (`archestimator_pending_invite`) | HMAC-signed marker | cookie only | yes | post-auth invite resume | unchanged |
| Terms-acceptance gate cookie | marker | cookie + D1 `legal_terms_acceptances` | yes | gate pass | unchanged |
| Closed-beta allowlist row | derived status | D1 `closed_beta_allowed_emails.status` | no | access decision | unchanged |
| Welcome email | contains no credential | n/a | recipient inbox | onboarding nudge | **NEW, no credential** |

**No raw tokens, hashes, encrypted secrets, or session material are newly exposed.** The welcome email deliberately contains only a plain `/workshop` link — no tokens, no magic-link reuse.

## 7. Privacy / data minimization
- `requestBetaAccess` collects email + optional name/company. **Purpose:** beta access triage. **Retention:** audit row in `account_security_events`, per its retention posture. **No new PII category.**
- IP stored only as HMAC-hash (reuse `invite-entry.ts` pepper pattern) — not raw IP.
- Terms-acceptance store already does **not** store raw IP/UA (per `0002` design) — unchanged.
- Welcome email recipient = the user's own email (Better Auth identity); no third-party disclosure.

## 8. CSP / frame / referrer / download
- Public pages already have landing-security-headers (`landing-security-headers.test.ts`). New `/cookies` page inherits the same headers via `PublicPageShell`.
- `requestBetaAccess` returns `no-store`.
- No new downloadable assets except optionally `public/.well-known/pgp-key.txt` (owner-gated; static file, no security risk).
- Referrer policy: unchanged.

## 9. Existing security posture preserved
- `/trust` "no SOC2/GDPR/HIPAA/DPA" stance: **must not soften** (DOC-CONT-02; `trust-page-overclaims.test.ts`).
- No testimonials/logos/overclaims: **must not introduce** (`landing-company-proof.test.ts`).
- Proxy→layout→session ordering: **unchanged** (ARCH-CONT-02).

## 10. Incident-response implications
- `beta_access_requested` audit rows give a triage trail if an abuser floods; rate-limit events are queryable.
- `welcome_email_sent` security event gives audit of email sends.
- No new alerting required for closed beta (existing observability posture); Phase 4 email failures are logged, not alerted (closed-beta scale).

## 11. Security testing
- `requestBetaAccess`: honeypot, rate-limit, duplicate, invalid, oversized — covered in SEC-CONT-01 / `12`.
- No new authz matrix needed (no new protected resource introduced).
- Existing `legal-terms-*.test.ts`, `trust-page-overclaims.test.ts`, `landing-company-proof.test.ts` must remain green.
