# 07 — Data, Database, API, and Network Plan

## Data model impact

**This plan makes NO schema changes to D1.** All changes are application-side
config and code. Details:

### SEC-1 (hash magic-link tokens)

- **Table:** `verification` (Better Auth core, runtime-applied).
- **Change:** The magic-link plugin will now store a **hash** in
  `verification.identifier` instead of the raw token. This is an app-side
  transformation via Better Auth's `defaultKeyHasher` — **no DDL change**.
- **Existing data:** Old plaintext rows expire in ≤5 min (`expiresAt`) and are
  consumed/deleted (one-shot). No backfill, no migration. Forward-only.
- **Read path:** `consumeVerificationValue` will hash the incoming token and
  compare to the stored hash (per Task 1.1 confirmation).

### SEC-3 (repository authz)

- **Tables:** app-data tables (projects, estimates, etc.) — **read-only probes** (`SELECT 1 ... WHERE EXISTS`).
- **Change:** No schema change; adds authorization `SELECT 1` probes before data reads.
- **D1 read cost:** +1 read per repository call on hot paths. See `09` for mitigation.

### SEC-7 (BA schema contract)

- **Decision (DEC-5):** Do NOT commit BA DDL as a migration (drift risk). Instead,
  rely on the documented contract + existing `check-cloudflare-d1-auth-realtime-readiness.ts`
  gate that verifies `EXPECTED_TABLES` (`user`, `session`, `account`, `verification`)
  and `EXPECTED_INDEXES` (`account_userId_idx`, `session_userId_idx`, `verification_identifier_idx`)
  match. This is documentation + gate verification, not a migration.

## Database change blueprint (per plan-prompt requirement)

Since this plan makes **no DDL changes**, the blueprint is a "no-migration" declaration:

| Aspect | Value |
|---|---|
| Migration filename | None (no migration) |
| Tables affected | `verification` (app-side transform only, no DDL) |
| SQL sketch | n/a — `storeToken:"hashed"` is a Better Auth plugin option |
| Backfill | None (forward-only; old rows expire) |
| Data-volume assumptions | `verification` rows are short-lived (≤5 min), low volume |
| Concurrency/locks | None (one-shot consume is already atomic) |
| Query count per route | +1 read for SEC-3 probes on affected repos |
| Cardinality | n/a |
| Index selectivity | `verification_identifier_idx` exists (identifier lookups) |
| Generated type impact | None |
| Rollback/fix-forward | Revert config (1-line); plaintext resumes |
| Local proof | `bun run test` + unit test for hashing |
| Linked-provider proof | Hosted D1 readback (phase 1.5) |

## API and network behavior

### Auth API surface (unchanged contracts)

| Endpoint | Method | Auth | Change |
|---|---|---|---|
| `/api/auth/[...all]` | GET/POST/PATCH/PUT/DELETE | Better Auth internal | SEC-1: magic-link verify now hash-compares (transparent) |
| `/api/auth/sign-in/magic-link` | POST | public (creates session) | SEC-5: rate-limited |
| `/api/auth/sign-in/social` | POST | public (creates session) | SEC-5: rate-limited |
| `/api/auth/sign-out` | POST | `requireAuth` | None |
| All `/api/projects/*`, `/api/component-library/*`, etc. | varies | `requireCurrentUserContext` + `canAccess*` | None (already compliant) |
| `/api/health` | GET | public | None |
| `/api/internal/*` | GET/POST | `CRON_SECRET` bearer | None |
| `/api/share/[token]/*` | varies | token + password + recipient-session | None |

### Request/response contracts (unchanged)

- Magic-link request: `{ email, callbackURL, errorCallbackURL }` → email sent.
- Magic-link verify: `GET ?token=...` → session cookie or error.
- Google sign-in: `{ provider:"google", callbackURL, errorCallbackURL, requestSignUp:true }` → redirect.
- No DTO changes introduced by this plan.

### Rate limiting (SEC-5)

| Surface | Limit (proposed) | Backing store concern |
|---|---|---|
| Magic-link request | 10/min per identifier | Must be D1/KV-backed (in-memory unreliable on Workers — RISK-4) |
| Global Better Auth default | 60/min | Same concern |
| Fallback | Cloudflare WAF rate-limit rule (IP-based, coarser) | If BA limiter can't be D1-backed |

### Network behavior (unchanged)

- All auth over HTTPS (Cloudflare TLS).
- Cookies: httpOnly + secure(prod) + sameSite=lax + host-only.
- No new external network calls.
- Magic-link email via Cloudflare `EMAIL` binding (unchanged).

## Idempotency / retry (unchanged)

- Magic-link consume: one-shot (atomic delete). Retry → fails (correct).
- Sign-out: idempotent (clears cookies even if already cleared).
- Repository probes: read-only, idempotent.

## Third-party integrations (unchanged)

- Google OAuth: unchanged (same client ID/secret, same callback).
- Cloudflare Email: unchanged (magic-link delivery).
- No new integrations.
