# 08 — Security, Privacy, Threat Model

This plan is data-layer performance work. Its security surface is narrow but real: the **N+1 fix (`T-P2-01`) changes an authorization query**, and the proof surface exposes a (gated) route. Both are analyzed below.

## Trust boundaries (unchanged by this plan)

- User → Next.js route (cookie/session).
- Route → repository (server-only; no client reach).
- Repository → D1 `ARCH_DB` (binding; no cross-database).
- Operator → `/__cloudflare/d1-performance-proof` (CRON_SECRET bearer).

No new trust boundary is introduced.

## Threat model for `T-P2-01` (the authorization-changing task)

This is the highest-risk task in the plan.

**Current behavior:** `estimates/page.tsx:103-109` runs `Promise.all(estimateIds.map(async estimateId => [estimateId, await canEditEstimateInD1(...)] as const))`. Each `canEditEstimateInD1` (`src/lib/authz/d1-access.ts:271`) evaluates **3 `EXISTS` subqueries** (`estimate_sheet_members`, `workspace_members`, `project_members`) plus 2 `created_by` short-circuit branches (`estimate.created_by` / `project.created_by`) and a `COALESCE(access.inherit_project_access…)` gate.

**Planned behavior:** replace the per-estimate loop with a single set-based query that returns the subset of `estimateIds` the caller can edit. Semantically: `{ id ∈ estimateIds : canEdit(id) }` computed in one SQL statement.

**Threats:**

| Threat | How addressed |
|---|---|
| Privilege escalation — batched query returns an estimate the loop would have denied | The batched SQL is authored to be a literal OR-of-the-same-EXISTS-clauses, evaluated per-row by D1. It is **not** a join that could widen access. Denial-parity test (`TEST-SEC-01` in `12`) asserts: for a randomized set of estimate ids mixing allowed/denied, the batched result equals the loop result exactly. |
| Cross-workspace leak — batched query omits the workspace/project scoping | The batched query includes the same `project_id = ?` and workspace-membership `EXISTS` clauses as the original; it cannot return estimates from another project. |
| Injection — `estimateIds` interpolated into SQL | Same parameterization as today: `IN (?, ?, …)` with `.bind(...)`. No string interpolation. |
| Stale result — batched query uses a different snapshot than the loop | Both run in the same request against the same D1 read snapshot; D1 read consistency is unchanged. |

**Residual risk:** if a future contributor adds a new access rule to `canEditEstimateInD1` (the per-id function) without updating the batched variant, the two could drift. Mitigation: `TEST-SEC-01` is a parity test that must be updated whenever `canEditEstimateInD1` changes; the batched query lives in `d1-access.ts` alongside `canEditEstimateInD1` (co-location), not in the route.

**Decision:** the security posture is *unchanged or strengthened* — batching removes the per-id round-trip but evaluates the same authorization predicates. Recorded as `DEC-SEC-01` in `15`.

## Threat model for the extended proof route (P4)

- **Route:** `/__cloudflare/d1-performance-proof` (extended).
- **Auth:** existing `Bearer CRON_SECRET`. P4 adds no new auth.
- **Threat: secret leakage.** The route already requires the secret; P4 does not weaken this. The route must continue to never echo the secret or expose it in error responses.
- **Threat: data exposure.** The route runs real repository functions against real D1. P4 must ensure proof outputs do not include PII (e.g., `profiles.email`, recipient emails). Mitigation: proof fixtures use synthetic workspace/project ids (not real user data); the route scopes queries to fixture-scoped ids; output redacts any row that could contain email/name to counts only. `TEST-SEC-02` asserts the proof JSON contains no `@` character outside controlled fixture domains.
- **Threat: proof route used as an oracle.** The route is read-only (proof SQL is `SELECT`/`EXPLAIN` only). P4 must verify no write-capable repository function is wired into the proof route.

## Per-request auth floor (in scope for budgeting, not for changing)

The 3-read floor (`getSession` + `closed_beta` + `profiles`) is documented in `03` §2. This plan **budgets** it but does **not** change it. The optional recommendation to re-enable Better Auth cookie cache (`disableCookieCache: false`) intersects the OWASP/authz pack and has session-revalidation implications; this plan flags it in `15` as `DEC-AUTH-01` (owner decision, not forced) and does not implement it.

## Credential material

No new credentials. No tokens, hashes, or session material introduced. The proof route's `CRON_SECRET` is existing and unchanged. The credential-material taxonomy from the directive is therefore empty for this plan — recorded explicitly so it is not flagged as an omission.

## Privacy / data minimization

- Proof fixtures are synthetic (`scripts/seed-performance-test-data.ts` manifest). No real user data is used in local proof.
- Hosted proof (P4) runs against real D1 but with fixture-scoped ids; output is counts/timings, not row contents. `TEST-SEC-02` enforces.
- No analytics, logging, or telemetry changes. The existing `account_security_events` writes are unchanged and remain auth-boundary-only.

## Input validation

- D1 SQL uses `.bind()` parameterization everywhere (already the repo pattern; P2 preserves it).
- Proof scripts validate fixture manifest shape before running.
- The proof route validates `Bearer CRON_SECRET` and request shape; P4 preserves this.

## Rate limits / abuse

- The proof route is `CRON_SECRET`-gated and not user-reachable; no rate-limit change.
- First-user routes' rate limits are out of scope (OWASP/authz pack).

## Security testing required for implementation

- `TEST-SEC-01` — batched vs looped capability parity (denial matrix).
- `TEST-SEC-02` — proof JSON contains no PII.
- `TEST-SEC-03` — proof route returns 401 without/with wrong `CRON_SECRET`.
- `TEST-SEC-04` — cross-workspace denial still holds after `T-P2-01` (a user from workspace A cannot see workspace B's estimates via HP-5).

Details in `12`.

## Attack Surface Inventory (directive Phase 3 §7)

Per the directive, any Server Action, Route Handler, public route, or provider-backed data surface requires an Attack Surface Inventory. This plan touches **one** such surface beyond the existing repository layer: the extended proof route. (The repository reads themselves are not new attack surface — they sit behind the existing `getCurrentWorkspaceProject` gate, unchanged.)

### ASI-1 — `/__cloudflare/d1-performance-proof` (extended in P4)

| Entry point | Actor | Authn/authz + ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests |
|---|---|---|---|---|---|---|---|
| `POST /__cloudflare/d1-performance-proof` | operator only | `Bearer CRON_SECRET` constant-time compare; 401 otherwise. No user session. | request body shape validated; surface IDs validated against allowlist; fixture IDs validated as synthetic | JSON: `{ surfaces: [{ surfaceId, plannedQueries, actualQueries, localP95Ms?, hostedP95Ms, subrequestCount, rowsRead, evidenceClass, passed, explainPlan? }] }` — counts/timings only, **no row contents, no emails, no names** | `Cache-Control: no-store`; `Vary: Authorization`; not cacheable at any layer | `CRON_SECRET`-gated → not user-reachable; abuse = secret compromise (out of scope). Add request-count log for anomaly review (P4). | TEST-SEC-02 (PII grep), TEST-SEC-03 (401), `d1-performance-proof-router.test.ts` (shape) |

**DTO minimization:** the output is counts/timings/explain-plans only. P4 implementation must assert (TEST-SEC-02) that the JSON contains no `@` character outside controlled fixture domains and no `display_name`/`email` keys. This is the abuse/privacy control for the route.

**Direct-POST threat model:** the route IS directly reachable via POST with the secret. Mitigations: (1) `CRON_SECRET` required (not a session); (2) read-only SQL only (no write-capable repository function wired — P4 must verify); (3) fixture-scoped IDs (synthetic workspace/project IDs that do not collide with real data — P4 must use a reserved prefix like `__proof_`); (4) output redaction. No CSRF concern (no session, no cookie auth). No SSRF (no outbound fetch from the route).

## Access-path matrix (directive Phase 3 §6)

For every planned data source, confirm the chosen runtime path can actually read it under current D1 migrations + app-authz. Any path that cannot read its source is a P0 blocker.

| Source | Chosen API/repository/binding | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| `estimate_favorites` (G1) | `estimate-favorites-repository.ts:21` via `ARCH_DB` | authenticated user | `requireCurrentUserContext` (session) — `user_id` from session, not client | `0037` adds `idx_estimate_favorites_user_created`; existing `UNIQUE(user_id, estimate_id)` | local EXPLAIN (T-P1-01) + hosted EXPLAIN (T-P4-03) | implicit UNIQUE index already covers; explicit index is a clarity win |
| `project_favorites` (G2) | `workspace-repository.ts:1418` via `ARCH_DB` | authenticated user | same | `0037` adds `idx_project_favorites_user_created` | same | same |
| `shared_link_responses` (G3) | `recipient-proposals-repository.ts:139` via `ARCH_DB` | recipient (email-scoped) | `lower(email) = ?` from session/identity | `0038` adds `idx_shared_link_responses_publication_recipient` | same | existing `(publication_id, created_at)` index covers publication; new index adds recipient pin |
| `estimate_sheet_adjustments` (G4) | `workspace-repository.ts:3276` via `ARCH_DB` | authenticated user (project gate upstream) | `getCurrentWorkspaceProject` gate | `0038` adds `idx_estimate_sheet_adjustments_estimate` — **confirmed needed** (existing index leads on `updated_at`, verified `0029:24-25`) | same | none — no existing index leads on `estimate_id` |
| `component_category_nodes` (G5) | `component-library-repository.ts:1114` via `ARCH_DB` | global (no workspace) | `using(true)` RLS — intentionally global taxonomy | app-layer cache (T-P2-03), no index (scan unavoidable for global ORDER BY) | HP-6 proof (T-P3) | cache TTL + write invalidation |
| proof fixtures (P4) | `d1-performance-proof-router.ts` via `ARCH_DB` | operator (`CRON_SECRET`) | `Bearer CRON_SECRET` | synthetic `__archestimator_d1_proof_*` tables + fixture-scoped real-schema IDs | hosted proof | local sqlite3 proof |

**No P0 access-path blocker.** Every source has a working runtime path under current migrations + the planned `0037`/`0038`. The G4 path is the only one where the *current* posture is a slow probe (leading column mismatch) — `0038` fixes it.

## Credential material taxonomy (directive "SOURCE OF TRUTH" §credential)

This plan touches auth/session/proof-secret surfaces. The directive requires distinguishing raw vs hashed vs encrypted vs public materials. The taxonomy for THIS plan:

| Material | Raw/hash/encrypted/derived/public marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| `CRON_SECRET` | raw secret (env var) | operator (out-of-band) | Wrangler secret (not in repo) | `d1-performance-proof-router.ts` server-only | **no** (never in DTO, never in logs) | no (bearer header only) | operator rotates via `wrangler secret put`; route continues to work | TEST-SEC-03 (401 without it) |
| Better Auth session token | raw bearer (cookie) | Better Auth on login | `session` table (D1) + cookie | `better-auth-cloudflare.ts:260` server-only | yes (cookie, httpOnly) | yes (session) | Better Auth rotation; `disableCookieCache:true` forces D1 revalidate per request | existing auth tests (not changed by this plan) |
| Fixture IDs (P4) | public markers (synthetic) | proof scripts | D1 fixture rows | proof route only | no (counts only in DTO) | no | n/a (synthetic) | TEST-SEC-02 |

**No new credential material is introduced by this plan.** The `CRON_SECRET` is existing and unchanged. The P2 batched capability check uses no credential material (it queries membership tables, not tokens). The proof route's fixture IDs are synthetic markers, not credentials. Recorded explicitly so the directive's credential-taxonomy gate is satisfied and not flagged as an omission.

**Key safety properties stated explicitly per directive:**
- A stored hash is **not** accepted by any public route in this plan (no public route is added; `/share/[token]` uses `token_hash` lookup but that route is unchanged by this plan and owned by the publication/security pack).
- No encrypted value is decrypted client-side. No Server Action in this plan recovers raw credential material.
- No client-visible credential material is introduced.

