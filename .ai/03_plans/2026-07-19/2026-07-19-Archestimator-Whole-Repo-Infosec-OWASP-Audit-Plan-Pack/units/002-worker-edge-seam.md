# 002 — Worker-Edge Seam: Disable `workers_dev` for Production + Internal Route Guard

> **Historical provenance only.** `UNIT-002` is `SUPERSEDED` by `DEC-AUTO-007`.
> This predecessor did not implement the unit; current authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

> Closes `SEC-WORKER-002`, `SEC-OPS-001`.

## unit_id
`UNIT-002` · **status:** `SUPERSEDED` · **priority:** P1 · **effort:** S · **implementation_risk:** LOW · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** requires `AUTH-004` (deploy) for hosted verification only.

## requirements / findings / existing_plan_links
- Requirements: `SEC-002`.
- Findings: `SEC-WORKER-002`, `SEC-OPS-001`.
- Existing plans: none.

## goal
The production Worker is reachable only via the canonical `archestimator.com` / `www.archestimator.com` routes. The `*.workers.dev` shadow hostname is removed (or, if kept for preview, gated behind Cloudflare Access). `/api/internal/*` routes (except the public client-error/web-vitals sinks) require an internal-origin marker that only the `scheduled`/queue invocation sets.

## security_invariants
1. `workers_dev: false` in `wrangler.jsonc` for the production Worker.
2. `/api/internal/upload-cleanup`, `/api/internal/upload-scan`, `/api/internal/upload-runtime` reject requests lacking the internal marker header even when the bearer is correct.
3. Proof routers under `/__cloudflare/*` require the canonical-host (no `keepProofRoutes: true` carve-out) OR are moved to a dedicated Worker with preview-only bindings.

## current_source_evidence
- `wrangler.jsonc:10` — `workers_dev: true`.
- `src/lib/cloudflare/worker-route-optimizations.ts:35-38,145` — `keepProofRoutes: true` carve-out lets `/api/health` and `/__cloudflare/*` bypass canonical redirect.
- `worker.ts:142-199` — no `/api/internal/*` block before OpenNext.
- `src/app/api/internal/upload-{cleanup,scan,runtime}/route.ts` — bearer-gated against `CRON_SECRET` or job-specific secret only.

## affected_paths_and_resources
- `wrangler.jsonc` (set `workers_dev: false`).
- `worker.ts` (add `/api/internal/*` guard that requires `x-archestimator-internal: 1` header; ensure the scheduler in `scheduled-upload-jobs.ts` sets it).
- `src/lib/cloudflare/scheduled-upload-jobs.ts` (set the marker header on internal fetches).
- `src/lib/cloudflare/worker-route-optimizations.ts` (re-evaluate `keepProofRoutes: true` — set to `false` if proof routes are not used as a public health surface).

## owned_paths
- `wrangler.jsonc`
- `worker.ts`
- `src/lib/cloudflare/scheduled-upload-jobs.ts`
- `src/lib/cloudflare/worker-route-optimizations.ts`

## dependencies
None.

## preconditions
Custom-domain routes in `wrangler.jsonc:11-20` are already wired (`archestimator.com`, `www.archestimator.com`), so `workers_dev: false` does not strand the Worker.

## non_goals
- Migrating proof routes to a separate preview Worker — recorded as a follow-up if `workers_dev: false` is insufficient.
- Replacing `CRON_SECRET` with per-route secrets — recorded as a follow-up in `UNIT-003` wave.
- Adding Cloudflare Access to `/__cloudflare/*` — recorded as an optional hardening; `workers_dev: false` is the load-bearing fix.

## implementation_sequence
1. `wrangler.jsonc:10` — change `"workers_dev": true` → `"workers_dev": false`.
2. `worker.ts` — after the canonical-host redirect and before OpenNext, add a guard: if `pathname.startsWith("/api/internal/")` and the route is not in `{/api/internal/client-error, /api/internal/web-vitals}`, require `request.headers.get("x-archestimator-internal") === "1"`; else return 403.
3. `scheduled-upload-jobs.ts` — add `"x-archestimator-internal": "1"` to the internal-fetch headers.
4. `worker-route-optimizations.ts:35-38` — set `keepProofRoutes: false` (rely on the canonical redirect for `/__cloudflare/*` too; if a proof route is needed from workers.dev for testing, run it on a preview Worker).
5. Run `bun run type-check`.

## data_or_schema_changes
None.

## authz_and_tenant_implications
Tightens the worker-edge trust boundary. No impact on per-tenant authz.

## failure_and_exception_behavior
The internal-marker check fails-closed (403). The scheduler must set the marker; a misconfigured scheduler would break upload scan/cleanup — caught immediately by the next cron failure metric.

## acceptance_criteria
1. `wrangler.jsonc:10` is `workers_dev: false`.
2. `worker.ts` includes the `/api/internal/*` guard (source inspection).
3. `scheduled-upload-jobs.ts` sets the marker header on all internal fetches.
4. `keepProofRoutes: false` in `worker-route-optimizations.ts`.
5. `bun run type-check` passes.
6. (Hosted, `AUTH-004`) `curl https://archestimator-proof.philipjonlewis.workers.dev/__cloudflare/health` returns NXDOMAIN or 404.

## acceptance_evidence
Source/diff inspection + `type-check` exit 0. Hosted verification deferred to `AUTH-004`.

## test_decision
`TEST_PROPOSAL` (MVP critical invariant for the internal-route guard).

## exact_test_proposal_if_any
Risk: a public request with a stolen `CRON_SECRET` and no internal marker could mutate R2. Cheapest decisive test: `bun x vitest run tests/vitest/worker/internal-route-guard.test.ts` — POST `/api/internal/upload-cleanup` with valid bearer but no `x-archestimator-internal` header → assert 403.

## authorization_boundaries
`AUTH-004` (deploy) required only for hosted NXDOMAIN verification.

## observability_or_audit_requirements
Log 403s on the internal-route guard at info level with `reason: missing_internal_marker`.

## recovery_or_fix_forward
If the scheduler fails to send the marker header, cron jobs will 403 — visible in cron-run-event status. Fix-forward: add the header to the scheduler. No rollback needed.

## conflict_and_concurrency_notes
Single-writer on `worker.ts` and `wrangler.jsonc` — coordinate with any concurrent edge work (none observed).

## completion_signal
All six acceptance criteria evidenced. `DONE`.

## historical_next_unit_on_success
The original proposal allowed `UNIT-003` through `UNIT-013`. The retired pack
now has `next_unit=null`; use `.ai/03_plans/2026-07-31/Code-Improvement/`.
