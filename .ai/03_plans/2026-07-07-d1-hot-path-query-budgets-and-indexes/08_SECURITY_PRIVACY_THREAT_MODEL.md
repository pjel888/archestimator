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

**Current behavior:** `estimates/page.tsx:103-109` runs `Promise.all(estimateIds.map(id => canEditEstimateInD1(userId, projectId, id)))`. Each `canEditEstimateInD1` (`src/lib/authz/d1-access.ts:234`) evaluates a 6-way `EXISTS` probe: caller is `created_by` OR workspace_member OR project_member OR estimate_sheet_member (with role variants).

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
