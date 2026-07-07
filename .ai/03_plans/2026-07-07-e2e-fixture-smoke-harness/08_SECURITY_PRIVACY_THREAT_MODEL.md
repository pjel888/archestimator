# 08 — Security, Privacy, and Threat Model

## Scope

This pack plans a **test harness**. The security work is: (a) ensure the harness itself is safe to run (doesn't weaken auth, leak secrets, or mutate real data), and (b) specify the security-flavored **smoke assertions** (auth-gate denial, IDOR denial, publication password lockout, upload auth). It is **not** a pen test or a security audit of the app.

## Trust boundaries

```
[CI/local runner] ──env──> [Playwright + globalSetup]
        │                            │
        │                      injects dev-auth cookie (localhost only)
        ▼                            ▼
[local preview D1/R2] <──── [next dev @ 127.0.0.1:3020] <──── [Playwright browser]
                                   │
                            dev-auth-gate validates:
                            NODE_ENV!=production, localhost, secret ≥32 chars
```

- **Boundary 1:** dev-auth bypass must NEVER cross to a deployed/preview/prod env. Enforced by `isDevAuthBypassEnabled()` (`NODE_ENV!=='production'`) + `isLocalDevHostname()` (`localhost`/`127.0.0.1`/`::1`/`*.localhost`). The harness must not defeat these.
- **Boundary 2:** local preview D1/R2 vs remote `ARCH_DB`/production R2. Enforced by seed/reset scripts using `wrangler … --local` and the preview ids only.
- **Boundary 3:** smoke secrets vs real provider secrets. Enforced by `.env.e2e.example` using local-only placeholders + a loud warning block; never real `BETTER_AUTH_*` / `PUBLICATION_TOKEN_*` / OAuth secrets.

## Actor model

| Actor | Capability | Goal |
|---|---|---|
| Anonymous visitor | reach public routes | smoke: `/workshop` redirects to login (FR-S1) |
| Dev-authenticated smoke user | local dev-auth cookie | smoke: workshop flows (FR-S2+) |
| Share recipient (open) | recipient session cookie | smoke: view/comment/accept (FR-S10) |
| Share recipient (password) | password gate | smoke: unlock + lockout (FR-S11) |
| Cross-workspace attacker (simulated) | dev-auth as user A | smoke: assert user A cannot read user B's project (FR-SHADOW) |

## Threat model (harness-focused)

| T-ID | Threat | Mitigation |
|---|---|---|
| T-1 | Dev-auth bypass secret committed or leaked | `.env.e2e.example` uses placeholder; real secret git-ignored in `.env.local`; secret ≥32 chars; CI injects via Actions secret, not committed value |
| T-2 | Dev-auth bypass enabled against remote/preview/prod | Hard loud warning in `.env.e2e.example`; smoke CI job uses local `next dev` only (no `wrangler deploy`/`--remote`); seed/reset scripts are `--local`-only by construction |
| T-3 | Seed writes remote `ARCH_DB` | Seed/reset scripts call `wrangler d1 … --local` only; no `--remote` flag anywhere; sentinel-scoped so even a misfire can't touch real data broadly |
| T-4 | Smoke fixtures contain real user data / real tokens | Sentinel UUIDs + a dedicated smoke email (`e2e-smoke@example.test`), never a real profile; publication password is a known test value |
| T-5 | Lockout test pollutes global rate-limit state | FR-S11 uses a **fresh password publication per run**; never resets the global limiter; lockout row tied to that token |
| T-6 | Upload test pushes malicious/oversized object | Tiny decodable PNG fixture (<1KB); admission-control + body limits (`ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES`) still apply; preview bucket only |
| T-7 | Publication snapshot leaks totals/client name to anonymous | FR-S10/S11 assert review renders for authorized recipient; anonymous-without-session path is an existing app concern (CSP/OG redaction already in `generateMetadata`) — smoke does not assert OG leak (covered by vitest) |
| T-8 | Console errors / stack traces leak in smoke | Smoke asserts "no console errors" on covered flows; existing `workshop-route-error-boundaries.spec.ts` (untouched) covers sanitized error UI |
| T-9 | Storage-state file leaks a real session | The deferred `storageState` path (OPEN-1) must, if ever implemented, git-ignore the storage-state JSON and never commit it |

## Credential material taxonomy (publication + auth surface — full boundary-visibility table)

The Improve-Plan-Prompt mandates this table distinguish raw-bearer vs hash vs encrypted vs derived vs public-marker, and enumerate every boundary each value may cross. Smoke touches auth + publication, so the full set:

| Material | Raw / hash / encrypted / derived / public-marker | Created by | Stored in (DB/server/env) | Read by (server-only code / Server Action / Route Handler) | Client-visible? (browser URL / cookie / props / DOM / network / logs / analytics / test artifact) | Used for URL / cookie / session? | Rotation / revocation | Lookup-key vs accepted-by-public-route | Smoke handling |
|---|---|---|---|---|---|---|---|---|---|
| Publication token (`/share/<token>`) | **raw bearer** (in URL path) | `createProjectPublication` (server) | D1: **hash** of token (lookup); URL carries the **raw** value | `/share/[token]/page.tsx` + `/api/share/[token]/*` resolve the raw token → hash-compare | **YES — URL path** (visible to recipient, browser history, referer to same-origin, OG fetcher). NOT in props/DOM/logs by design. | URL (bearer) | revoke/rotate action (`revokeProjectPublication`, `rotateProjectPublicationLink`) | hash is a **lookup key**; the **raw URL value is what the public route accepts** — a hash alone cannot authorize | sentinel raw token from seed; **fresh per run** for the lockout test |
| Publication password | **raw** (user-supplied) → stored as **hash** | manager (Server Action) | D1: **hash** (`project_publication_password`) | `/api/share/[token]/password/route.ts` verifies raw→hash | NO (never returned; only pass/fail) | gate verification only | manager update / publication revoke | hash is verified, never a bearer | known test value `e2e-smoke-pw`; fresh publication per run; never a real credential |
| Recipient session cookie | **derived** (signed/encrypted marker) | `/api/share/[token]/session` (server) | cookie only (no DB row; resolves via token hash) | share route handlers read cookie → resolve recipient | **YES — cookie** (httpOnly; same-origin) | session | token revoke clears the basis | cookie is a derived session marker, not a raw token | per-run recipient token; established via the session route, never forged |
| PUBLICATION_TOKEN_ENCRYPTION_SECRET / HASH_SECRET / ACCESS_COOKIE_SECRET | **raw server secret** | operator | env (Worker secret) | server-only (token mint/validate, cookie sign) | NO (server-only; never in client bundle, DTO, or logs) | indirectly (mints/validates tokens+cookies) | rotate + re-mint tokens (rotation invalidates outstanding share links — owner op) | n/a (secret, not a route input) | local-only 32+ char placeholders in `.env.e2e.example`; **never real values committed** |
| Dev-auth bypass secret (`ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`) | **raw server secret** used as a **raw cookie/header value** | operator | env | `dev-auth-gate.ts:39-43` compares raw==raw | **the cookie VALUE equals the secret** (httpOnly:false, sameSite:Lax, domain `127.0.0.1`) — visible to local browser/Playwright, but localhost-only + NODE_ENV!=production | cookie/header | rotate env + re-run | n/a | local-only ≥32 char; **must never be set in any deployed/preview/prod env or CI runner pointed at remote bindings** (SEC-1) |
| Better Auth session cookie (`better-auth.session_token`) | **raw opaque session id** (Better Auth managed) | Better Auth (`/api/auth/*`) | D1 session table + cookie | proxy + auth runtime validate per-request | YES — cookie (httpOnly, Secure in prod) | session | sign-out / session expiry | lookup key in D1 session table | **smoke does NOT use this path** (dev-auth bypass instead); OPEN-1 would add it |
| `profiles.id` / `email` | **public-ish identifiers** (not secrets) | signup/seed | D1 `profiles` | many server readers | email may appear in UI; id is a stable identifier | not a credential | n/a | n/a | sentinel smoke email `e2e-smoke@example.test`; never a real user's email |

**Key rules honored (per Improve-Plan-Prompt §SOT):**
1. A stored **hash is not a substitute** for a raw bearer token. The publication token's raw URL value is what `/share/[token]` accepts; the D1 hash is only a lookup. Smoke mints the **raw** token locally (via the publication action with local secrets); it never reconstructs a bearer from a hash.
2. A derived/encrypted cookie (recipient session) is **not** a raw token. Smoke establishes it via the `/session` route, never by forging a cookie value.
3. The dev-auth secret crosses to a **client-visible cookie value**, but only on `127.0.0.1` with `NODE_ENV!=='production'`. This is the one material with elevated client visibility — it is **explicitly firewalled** to local-only by `isLocalDevHostname` + `isDevAuthBypassEnabled` (SEC-1), and `.env.e2e.example` carries a loud warning. No production acceptance of this material is possible by code construction.
4. No Server Action in smoke **recovers raw material** — the publication action *creates* the raw token (legitimate); nothing reads a hash and returns the raw bearer to the client beyond the one-time URL the manager sees (existing app behavior, unchanged by smoke).
5. Replay/expiry/revoke/copy-paste/duplicate-click handling for the share token is **existing app behavior** (rotate/revoke actions, token TTL) — smoke asserts the happy + one denial cell (AQ-9 rotated/expired token → 404/not-found), not the full pen matrix.

## Attack Surface Inventory (per Improve-Plan-Prompt §7)

The harness **observes** these app entry points; it does not create new ones. "Required tests" = the smoke spec that exercises it (+ existing vitest already covering each, per `03_*`).

| Entry point | Actor | Authn/authz + ownership check | Input validation | Output DTO minimization | Cache/header behavior | Rate/abuse posture | Required smoke test |
|---|---|---|---|---|---|---|---|
| `GET /workshop` (and `/workshop/**`) | anonymous or dev-auth | proxy: Better Auth session OR dev-auth bypass; terms gate; closed-beta gate | n/a (GET) | server-rendered; no secret DTO to client | dynamic (proxy stamps headers); no-store for auth | none (smoke) | 01 (denial), 02 (bypass admit) |
| `GET /share/[token]` | anonymous / recipient session / password | token resolve → hash; password gate; recipient session cookie | token path param (server-validated) | snapshot DTO (no totals/client name to anonymous per `generateMetadata` OG redaction) | `force-dynamic` (`page.tsx:34`); no-store | "open" analytics event rate-limited (`after()`) | 10 (open), 11 (password) |
| `POST /api/share/[token]/password` | anonymous (public gate) | token resolve; 5-try lockout (`project_publication_password`, 1h window) | password body field; length cap | pass/fail only (no token returned) | `force-dynamic` (`route.ts:16`); same-origin (`assertSameOriginPublicPost`) | **5 tries → lockout** (durable D1) | 11 (lockout) |
| `POST /api/share/[token]/comment` `/decision` | recipient session | recipient session cookie + same-origin | body validation; length cap on comment | created entity / accept state | `force-dynamic`; same-origin | comment rate-limit | 10 (comment+decision) |
| `GET /api/projects/[id]/estimates/[eid]/export/proposal.xlsx` | dev-auth (manager) | `getCurrentUserContext` (401 if none); workspace membership; audience gate | query params (tab, rates, flags); server-coerced | xlsx binary (audience-scoped content) | `force-dynamic` (`route.ts:18`); download headers | `checkProposalExportRateLimit` (per-user) | 08 (200 + rate-limit) |
| `POST /api/component-library/attachments/direct-upload` (reserve + finalize) | dev-auth | `requireCurrentUserContext` (401 if none); workspace; admission control | file metadata; size/type; admission budget | reserve DTO (no secrets beyond short-lived upload target) | dynamic; admission-control stateful | admission control + body limits (`ARCH_UPLOAD_HOSTED_*`) | 13 (reserve→finalize) |
| `GET /api/health` | anonymous | none | none | status JSON (no secrets) | dynamic | none | probe (globalSetup) |
| `createProject` / `createEstimate` / `createProjectPublication` (Server Actions, form POST) | dev-auth | `requireAuth` + workspace RBAC (`assertProjectPublicationManager` for publish) | FormData server validation (zod-style per existing actions) | redirect or minimal DTO | redirect / router refresh | per-action rate limits where applicable | 05, 06, 09 |
| `signOut` (Server Action) | authenticated | session present | none | cookie clear + redirect | clears session cookie | none | 15 |

**DTO minimization check:** smoke does not introduce any new DTO. Existing app DTOs already minimize (snapshot omits totals/client-name to anonymous; password route returns pass/fail only; export is audience-scoped). Smoke asserts these minimizations indirectly (no leak in rendered DOM).

**Missing-DTO-minimization or missing rate-limit coverage would cap security readiness <80** — not the case here; all public/mutation surfaces have documented rate limits / authz.

## Security-flavored smoke assertions

- **FR-S1** auth-gate denial (negative): unauth → 302 `/login`.
- **FR-S2(b)** bypass is NOT a hole: without the cookie, `/workshop` still redirects.
- **FR-S11** password lockout after 5 tries.
- **FR-S13** upload requires auth (anonymous reserve → 401).
- **FR-SHADOW (cross-workspace, P1):** dev-auth as smoke user A; seed a project owned by a second sentinel workspace B; assert user A's `/workshop/projects/[B-id]` → 403/redirect (not 200). This is the IDOR denial smoke. Added as P1 in `12_*`.

## Input validation / injection

Smoke sends normal valid inputs + one invalid input per mutation flow (shadow-path "invalid input" cell). No SQL-injection / XSS payload smoke (covered by vitest + the app's validation layer); smoke is not a fuzz harness.

## Logging safety

- Smoke must not log the dev-auth secret, publication secrets, or recipient tokens in the manifest/report. The JSON manifest records pass/fail + timings + flow ids, never secret values. (Executor enforces: no `console.log(secret)`; Playwright traces redact cookie values in shared artifacts — confirm in `19_*`.)
- The app's own structured logging is unchanged by this plan.

## Privacy

- Smoke email `e2e-smoke@example.test` is synthetic; no real PII.
- No analytics events asserted in smoke (analytics opt-in via `NEXT_PUBLIC_*` tokens, default off).
- Publication recipient email in seed = a synthetic smoke recipient, not a real inbox.

## CSP / frame / referrer

- Existing app CSP on `/share/*` is unchanged. Smoke does not assert CSP headers (covered by vitest + the global-CSP plan `.ai/03_plans/2026-07-07-global-nonced-csp-enforcement/`). Smoke asserts the share page **renders** under CSP, not the CSP text.

## Abuse / rate-limit

- Smoke respects rate limits: proposal export (1 call then assert limiter), password lockout (fresh token). Smoke does not load-test (that's `route-transition-performance.spec.ts` + perf scripts).

## What is explicitly NOT a smoke security deliverable

- Pen testing, fuzzing, dependency vuln scanning (CodeQL/Dependabot — currently disabled, separate concern).
- OAuth state/csrf proof (deferred with OPEN-1 — needs real Better Auth session).
- Full CSP/header audit.
- Production secret rotation.
