# Data, Database, API, and Network Plan

**Scope note:** This is a performance-gate pack. It introduces **no database changes, no migrations, no new API contracts, and no new network calls to providers.** The data/API/network surface here is limited to: (a) the auth/fixture setup needed for authenticated measurement, and (b) the network behavior of the hosted verifier. D1/R2/DO/Queue/Email are **not in scope** for this pack.

## Data ownership

- **No new persistent data.** Gate evidence is ephemeral or written to `.ai/` evidence folders / CI artifacts. The hosted verifier writes to `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/` by default (`verify-cloudflare-hosted-performance.ts:20-22`).
- **No schema changes.** No migrations proposed.
- **No D1/Durable Object/Queue work.** The authenticated perf fixture (PERF-04) uses an existing seeded fixture (`scripts/seed-performance-test-data.ts`) and existing dev-auth paths; it does not modify schema.

## Auth/fixture setup for authenticated measurement (PERF-04 / OPEN-PERF-02)

Two existing paths, both already implemented and security-scoped:

| Path | Mechanism | Boundary | Source |
|---|---|---|---|
| Dev-auth bypass | `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` + `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`; cookie `archestimator-dev-auth-bypass` | **localhost/loopback only**; refused on non-local `BASE_URL` | `measure-route-transitions.ts:34-37,397-408`; `src/lib/auth/dev-auth-gate.ts`; `src/proxy.ts` |
| Storage state | `PLAYWRIGHT_STORAGE_STATE` JSON from a real sign-in | Any host (incl. remote preview) | `measure-route-transitions.ts:24,731-736`; `route-transition-performance.spec.ts:74` |
| Seeded data | `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` gates project/estimate hover-prefetch test | Local dev admin DB | `route-transition-performance.spec.ts:73,401-403`; `scripts/seed-performance-test-data.ts` |

**Decision required (OPEN-PERF-02):** which path CI uses for authenticated Tier-B measurement. Options:

| Option | Pros | Cons |
|---|---|---|
| Dev-auth bypass in a localhost preview built inside CI | No real credentials; localhost-bound; existing code | Requires CI to run a preview server + secret; dev-auth must stay localhost-only |
| Storage-state artifact checked in or produced by a sign-in step | Realistic; works on remote preview | Needs a seeded account; storage-state can go stale; credential hygiene |
| Keep authed scenarios on-demand only (status quo) | Zero CI risk | Authenticated regressions not caught in CI |

**Recommendation:** Start with **dev-auth bypass against a localhost preview in CI** for Tier-B (strongest signal-to-risk), with storage-state as the remote/preview fallback. This is an owner decision because it touches CI secret posture.

## Network behavior

- **Hosted verifier network:** outbound HTTPS only; rejects localhost/private/non-https (`verify-cloudflare-hosted-performance.ts:153-176`); does not call Cloudflare APIs, read env files, print secrets, deploy, mutate DNS, or authenticate users (`BODY_NOTE :23-24`). Safe posture; locked in by SEC-01.
- **Route-transition harness network:** localhost `BASE_URL` for dev-auth bypass; CDPSession `Network.emulateNetworkConditions` for Slow 3G presets. No outbound provider calls.
- **No new external integrations.**

## Credential material taxonomy (authenticated perf fixture)

| Material | Type | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| `archestimator-dev-auth-bypass` secret | Raw secret (env) | Operator (CI secret) | CI secret / `.env` (never committed) | `src/proxy.ts` → `src/lib/auth/dev-auth-gate.ts` | No (httpOnly cookie value is the secret) | Yes (cookie) | Rotate CI secret; disable flag | `AGENTS.md` no-secrets rule; dev-auth-gate source |
| `PLAYWRIGHT_STORAGE_STATE` | Session cookies (real) | Real sign-in | Artifact file (gitignored) | Playwright | No (cookies) | Yes (session) | Re-sign-in when stale | `measure-route-transitions.ts:24` |

**Rule:** Authenticated perf must never use production user credentials or production tokens. Dev-auth bypass is localhost-only by code; storage-state uses a throwaway seeded account. SEC-01 locks this in.

## API contracts

- **No new API contracts.** The gates consume existing routes as black boxes (hosted verifier probes public/invalid routes; route-transition harness drives the UI).
- The hosted verifier's `share-invalid-api` and `project-image-missing-path` probes hit existing API routes with fake-token/missing-path inputs and treat them as "record only" budgets — they are validating fail-closed behavior, not new contracts.

## Backward compatibility

- All proposed changes are additive (per-route budgets, reconciled budget file, layered triggers). Existing scripts keep working; the budget source-of-truth migration (DEC-03) is the one change that touches two consumers and must be done atomically.

## Provider boundary

- Hosted verifier targets the bound Worker (`archestimator-proof`, custom domain `archestimator.com`) or a preview URL — never the historical Supabase project, the unrelated `archestimator` provider project, or other accounts (`AGENTS.md`).
- This pack mutates no provider state. Future executor actions stay inside the standing Cloudflare-resource authorization.
