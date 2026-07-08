# 08 — Security, Privacy, and Threat Model

## 8.1 Trust boundaries

```
[Internet]
   │
   ▼
[Cloudflare Edge] ── WAF / DDoS / (optional) Cloudflare Access OTP allowlist ──┐
   │                                                                            │
   ▼                                                                            │
[proxy.ts] ── Next 16 edge gate: /admin protected + admin-role check ───────────┤
   │                                                                            │
   ▼                                                                            │
[Worker RSC + Route Handlers + Server Actions] ── per-call requireAdminContext() │
   │                                                                            │
   ▼                                                                            │
[D1 / DO / External APIs] ── bound resources only; secrets via Wrangler ────────┘
```

## 8.2 Actors and roles

| Actor | Capabilities |
|---|---|
| Anonymous | none on `/admin` or `/api/admin/*` |
| Authenticated non-admin | none on admin; redirected to `/access-required` |
| Authenticated admin (Philip) | full read + mutate (audited) |
| `SupportInbox`/`GlobalPresence` DO | internal; trusts Ed25519 tokens issued by Worker |
| Email Worker (P2) | writes support rows from inbound email; no other powers |

## 8.3 Threat model (STRIDE-style)

| Threat | Vector | Control | Evidence |
|---|---|---|---|
| **Spoofing** — non-admin impersonates admin | stolen cookie | session re-validated per request against D1 (`disableCookieCache:true`); optional CF Access OTP (2nd factor at edge) | FR-AUTH-01/03 |
| **Tampering** — direct POST to admin Server Action | action URL reachable | every action calls `requireAdminContext()` first (FR-AUTH-02) | denial tests TEST-AUTH-01 |
| **Repudiation** — admin denies an action | — | every mutation writes `admin_audit_events` (FR-AUDIT-01) | audit test |
| **Info disclosure** — PII in client bundle | over-fetching | Server Components render PII; DTOs minimal; `server-only` markers (SEC-PII-01) | bundle audit |
| **Info disclosure** — leaked secret | misconfig | secrets only via `wrangler secret put`; never `NEXT_PUBLIC_*`; tokens scoped read-only | SECRET-01 |
| **DoS / resource exhaustion** — flood admin endpoints | bot | `ratelimit` binding (free, GA) + optional CF Access drops unauth at edge (SEC-RATE-01) | OWASP API4 |
| **Elevation of privilege** — user becomes admin | role tampering | `profiles.role` is the only role source; no client-set role; `isPlatformAdminEmail` allowlist is additive | role-matrix test |
| **IDOR** — `/api/admin/users/:id` cross-tenant | guessed id | admin-only surface; user data visible to admin by design; no cross-workspace admin data exposed | scope by design |
| **Injection** — SQL/NoSQL | user input in search | parameterized queries via existing D1 repository helpers; `search` bound, not interpolated | repo conventions |
| **XSS** — support message body | user-generated HTML | render as plain text / sanitized subset; no raw `body_html` injection (DOMPurify-style allowlist if HTML shown) | render test |
| **CSRF** — cross-site POST to admin action | — | Better Auth same-site cookies + action authz; admin actions not idempotent-only | existing pattern |
| **SSRF** — admin pulls attacker URL | — | provider URLs hardcoded (CF/GA4/Clarity endpoints); no user-supplied fetch targets | static |
| **Replay** — WS token replay | captured token | Ed25519 tokens are short-lived + topic-bound (existing pattern) | realtime-token test |
| **Prompt injection** (if AI surfaces added later) | — | out of scope for MVP admin | n/a |

## 8.4 Authentication/authorization summary

- **AuthN:** Better Auth Google OAuth (+ magic link). Session re-checked per
  request (`disableCookieCache:true`).
- **AuthZ layers:** (1) `proxy.ts` `/admin` prefix + admin check; (2) RSC layout
  `requireAdminContext()`; (3) each route/action re-check; (4) optional CF Access.
- **Allowlist:** `PLATFORM_ADMIN_EMAILS` env (default `philipjonlewis@gmail.com`);
  consolidated `isPlatformAdminEmail()` replaces the 4 scattered literals.
- **No new `isAdmin` column** (research Q2: redundant, bug-prone).

## 8.5 Credential material taxonomy

| Material | Type | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Better Auth session token | raw/cookie | Better Auth | cookie + D1 `session.token` (hashed) | Worker only | no (httpOnly cookie) | session cookie | session expiry + revoke in D1 | existing BA tests |
| Realtime Ed25519 token | raw, short-lived | Worker (`realtime-identity-server`) | in-memory/WS only | DO + client | yes (WS payload) | WS auth | short TTL | existing realtime tests |
| `REALTIME_IDENTITY_SIGNING_KEY` | secret | owner | Wrangler secret | Worker only | no | signs tokens | `wrangler secret put` | — |
| Google OAuth client secret | secret | Google Cloud | Wrangler secret (`BETTER_AUTH_GOOGLE_CLIENT_SECRET`) | Worker only | no | OAuth | Google Cloud rotate | existing |
| GA4 service-account JSON | encrypted secret | Google Cloud | Wrangler secret (`GA4_DATA_API_CREDENTIALS_JSON`) | Worker only | no | GA4 Data API | Google Cloud rotate | OPEN-1 |
| Clarity Data API token | secret | Clarity | Wrangler secret (`CLARITY_DATA_API_TOKEN`) | Worker only | no | Clarity Export API | Clarity dashboard rotate | OPEN-2 |
| CF Analytics API token | secret | Cloudflare | Wrangler secret (`CF_ANALYTICS_API_TOKEN`) | Worker only | no | GraphQL Analytics API | Cloudflare rotate | OPEN-3 |
| `PLATFORM_ADMIN_EMAILS` | non-secret config | owner | `wrangler.jsonc` vars or `.env` | Worker | no (server) | admin allowlist | redeploy / env edit | — |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | public ID | GA4 | `process.env` | client | yes | GA snippet | GA4 property | existing |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | public ID | Clarity | `process.env` | client | yes | Clarity snippet | Clarity project | existing |
| `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | public token | CF | `process.env` | client | yes | beacon | CF Web Analytics | existing |

No raw bearer token is persisted where only a hash is needed (sessions hashed in D1).

## 8.6 Rate limiting & abuse

- `ratelimit` binding (free, GA Sep 2025): `ADMIN_LOGIN_LIMIT`,
  `ADMIN_WRITE_LIMIT`. Note Workers Free caps total requests at 100K/day — CF
  Access in front of `/admin` drops unauth traffic before it counts.
- Support inbox: per-user send throttle to prevent spam (e.g., 20 msgs/hour).

## 8.7 Privacy

- Admin user table shows emails/names — operator-only, audited access.
- Support conversations are user PII; covered by DSAR (extend `privacy_requests`).
- Presence payload is privacy-safe by design (count only on admin side; the
  existing `ProjectPresencePayload` carries only allowlisted surfaces).
- Analytics scripts remain consent-gated on public pages (unchanged). The admin
  dashboard does not re-inject analytics; it only reads/links.

## 8.8 CSP / frame / referrer

- Admin layout inherits root CSP. Confirm Clarity/GA/CF beacon domains already
  allowed (they are, per public-site wiring) — admin link-out/iframe of provider
  dashboards may need `frame-ancestors`/`frame-src` review per provider (most
  provider dashboards disallow iframing → prefer link-out + cached metrics).
- Referrer-Policy kept strict.

## 8.9 Security testing

- Role-matrix + denial tests (TEST-AUTH-01): anonymous, non-admin, admin across
  each `/admin` route and `/api/admin/*`.
- Bundle audit (SEC-PII-01): grep admin client chunks for email-like strings.
- Audit-write test (FR-AUDIT-01): every mutation produces exactly one audit row.
- (Hosted) CF Access proof is BLOCKED-EXTERNAL (OPEN-4).

## 8.10 Incident-response implications

- `operational_incidents` (migration `0040`) is the incident ledger; admin
  overview surfaces open incidents. Admin actions that affect users (e.g.,
  disabling a flag) are audited so incident timelines can cite them.
