# 12 — Test and Validation Strategy

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

## Test inventory observed in repo

| Test framework | Count | Path | Notes |
|---|---|---|---|
| Vitest DOM | ~115 files | `tests/vitest/` | covers route handlers, server actions, RPC contracts, components, security contracts, AI audit |
| Bun unit | 2 files | `tests/unit/` | red-first migration guard + UI baseline regression |
| Playwright E2E | 7 spec files | `e2e/` | landing, auth smoke, tree DnD, AI package builder, invite entry, teamspace collaboration, shared link receiver |

## Test Execution Matrix (per Creating-Plan-Prompt.md §8A)

| Req ID | Test file path | Test type | New / existing | Fixture/data setup | Command | Expected evidence | Pre-existing RED owner |
|---|---|---|---|---|---|---|---|
| REQ-API-001 (every surface named) | `tests/vitest/api-contract/surface-inventory.test.ts` | DOM | new | static inventory | `bun run test:dom` | inventory diff = 0 | n/a |
| REQ-API-002 (envelope) | per-handler test (`tests/vitest/api-contract/<handler>-envelope.test.ts`) | DOM | new (29) | mock D1 + R2 + DO + Email | `bun run test:dom` | every response has `{ok, data, error}` | TBD |
| REQ-API-003 (Server Action DTO) | per-action test (`tests/vitest/api-contract/<action>-dto.test.ts`) | DOM | new (30) | mock env | `bun run test:dom` | every action returns typed DTO, no `throw new Error` to client | several RED areas |
| REQ-API-004 (idempotency) | `tests/vitest/api-contract/<mutation>-idempotency.test.ts` | DOM | new | duplicate-submit fixture | `bun run test:dom` | duplicate submit returns same canonical result | n/a |
| REQ-API-005 (timeouts) | `tests/vitest/api-contract/<surface>-timeout.test.ts` | DOM | new | mock slow D1 + R2 | `bun run test:dom` | bounded timeout returns 503 within budget | n/a |
| REQ-API-006 (retry cap) | `tests/vitest/api-contract/queue-retry-cap.test.ts` | DOM | new | mock at-least-once duplicate | `bun run test:dom` | consumer rejects after max_retries to DLQ | n/a |
| REQ-API-007 (internal secret gate) | `tests/vitest/security/internal-route-secret.test.ts` | DOM | new | mock env | `bun run test:dom` | 401 on anon POST; 200 with correct secret | n/a |
| REQ-API-008 (share mutations) | `tests/vitest/security/share-token-mutation.test.ts` | DOM | new | token, password gate fixture | `bun run test:dom` | expired token → 401 SHARE_TOKEN_EXPIRED; valid → 200 with idempotent unsubscribe | pre-existing RED area (publication) |
| REQ-API-009 (cross-workspace R2 denial) | `tests/vitest/security/r2-cross-workspace-denial.test.ts` | DOM | new | role matrix | `bun run test:dom` | cross-workspace signed URL rejected | n/a |
| REQ-API-010 (AI flag audit) | `tests/vitest/api-contract/ai-flag-audit.test.ts` | DOM | new | flag off / flag on | `bun run test:dom` | flag off → 403; flag on → 200 + D1 audit row | pre-existing RED area |
| REQ-SEC-001 (D1 row-level) | `tests/vitest/security/d1-row-level-access.test.ts` | DOM | new | role matrix | `bun run test:dom` | every access path scoped | pre-existing RED areas |
| REQ-SEC-002 (per-Action verdict) | `tests/vitest/security/server-action-verdict.test.ts` | DOM | new | per-action fixture | `bun run test:dom` | every action PASS/WARN/FAIL non-TBD | pre-existing RED actions |
| REQ-SEC-003 (credential material distinct) | `tests/vitest/security/credential-material-distinct.test.ts` | DOM | new | typed fixture | `bun run test:dom` | 12 distinct materials typed | n/a |
| REQ-SEC-004 (NEXT_PUBLIC_ secret) | `tests/vitest/security/next-public-leak.test.ts` | DOM | new | source scan | `bun run test:dom` | no `process.env.NEXT_PUBLIC_*SECRET*` | n/a |
| REQ-SEC-005 (no raw Error leak) | `tests/vitest/api-contract/<handler>-error-leak.test.ts` | DOM | new (29) | error-trigger fixture | `bun run test:dom` | no internal paths in error stack visible to client | n/a |
| REQ-SEC-006 (WAF / rate-limit) | TBD — depends on OPEN-003 | n/a | n/a | n/a | n/a | n/a | n/a |
| REQ-SEC-007 (BETTER_AUTH_TRUSTED_ORIGINS) | `tests/vitest/security/better-auth-trusted-origins.test.ts` | DOM | new | bad-origin fixture | `bun run test:dom` | bad-origin POST rejected | n/a |
| REQ-SEC-008 (Better Auth D1 ratelimiter) | `tests/vitest/security/better-auth-ratelimiter.test.ts` | DOM | new | burst fixture | `bun run test:dom` | burst rejected after limit | RED area (auth/beta) |
| REQ-SEC-009 (SSRF) | `tests/vitest/security/outbound-ssrf.test.ts` | DOM | new | private-IP fixture | `bun run test:dom` | fetch to private IP rejected | location-actions + AI |
| REQ-SEC-010 (DO WS ticket) | `tests/vitest/security/do-ws-ticket.test.ts` + e2e/teamspace-collaboration | DOM + E2E | new + existing | env: ARCHESTIMATOR_E2E_COLLABORATION=1 | DOM + `bun run test:e2e` | anon upgrade rejected; session-bound ticket accepted | RED area (collaboration) |
| REQ-SEC-011 (DMARC) | DNS readback script | script | new | n/a | `dig TXT _dmarc.archestimator.com` | `p=reject` (after OPEN-006) | n/a |
| REQ-SEC-012 (R2 PII keys) | `tests/vitest/security/r2-object-key-design.test.ts` | DOM | new | scan object keys | `bun run test:dom` | no PII in object keys | n/a |
| REQ-DATA-001 (D1 migration audit) | `tests/vitest/d1-migrations/workspace-id-cols.test.ts` | DOM | new | `migrations/*.sql` | `bun run test:dom` | every user-data table has `workspace_id`/`owner_id` col | n/a |
| REQ-DATA-002 (D1 EXPLAIN) | `cf:d1-performance-proof` artifacts | script | existing | n/a | `bun run cf:d1-performance-proof` | p95 under budget | GREEN per FAST PATH |
| REQ-DATA-003 (D1 transaction) | `tests/vitest/security/d1-transaction-boundary.test.ts` | DOM | new | mock | `bun run test:dom` | atomic mutations batch | n/a |
| REQ-DATA-004 (D1 restore) | `cf:d1-restore-rehearsal` artifacts | script | existing | n/a | `bun run cf:d1-restore-rehearsal` | restore success | GREEN per FAST PATH |
| REQ-PERF-001 | `cf:d1-runtime-performance-proof` | script | existing | n/a | `bun run cf:d1-runtime-performance-proof` | p50/p95/p99 ≤ budget | GREEN per FAST PATH |
| REQ-PERF-002 (DO hibernation) | `tests/vitest/durable-objects/hibernation.test.ts` | DOM | new | mock DO | `bun run test:dom` | `alarm()` invoked; WS closed previously | n/a |
| REQ-PERF-003 (Queue <30s) | `tests/vitest/cloudflare-queue/batch-runtime.test.ts` | DOM | new | fixture | `bun run test:dom` | batch runtime < `max_batch_timeout` | n/a |
| REQ-PERF-004 (Cron overlap) | `tests/vitest/cloudflare-cron/overlap-guard.test.ts` | DOM | new | fixture | `bun run test:dom` | overlap guard present + dispatch on `controller.cron` | n/a |
| REQ-REL-001 (failure modes) | per-surface failure test (per `09_*.md` matrix) | DOM | new | mock | `bun run test:dom` | every failure mode returns expected code | varies |
| REQ-REL-002 (DLQ alert) | `tests/vitest/cloudflare-queue/dlq-alert.test.ts` | DOM | new | mock | `bun run test:dom` | alert fires on simulated DLQ | n/a |
| REQ-REL-003 (Obs sampling) | Workers Observability dashboard readback (manual) | manual | n/a | real env | verify dashboard | P0 error rate observable at 0.1 sampling | n/a |
| REQ-REL-004 (Cron structured logger) | `tests/vitest/cloudflare-cron/structured-logger.test.ts` | DOM | new | fixture | `bun run test:dom` | logs tagged with requestId OR `console.log` justified | n/a |
| REQ-OPS-001 (rollback runbook) | docs inspection | n/a | new | n/a | manual | `13_*.md` per-surface rollback present | n/a |
| REQ-OPS-002 (typegen diff) | `tests/vitest/cloudflare-env/typegen-diff.test.ts` | DOM | new | trigger `cf:typegen` | `bun run test:dom` | diff is clean | n/a |
| REQ-OPS-003 (migrations rollback) | per-migration `*.rollback.sql` file check | file-check | new | n/a | n/a | each migration has paired rollback | n/a |
| REQ-OPS-004 (feature flag config-only) | `tests/vitest/feature-flags/config-only.test.ts` | DOM | new | n/a | `bun run test:dom` | flag toggle no deploy required | n/a |
| REQ-TEST-001 (every REQ-API-* tested) | traceability scan | n/a | new | n/a | cross-doc | every REQ-API-* maps to a test file | n/a |
| REQ-TEST-002 (every REQ-SEC-* denial) | role-matrix scan | n/a | new | role-matrix | cross-doc | every REQ-SEC-* has a denial test | n/a |
| REQ-TEST-003 (pre-existing RED triage) | `tests/vitest/` RED test ledger | n/a | new | n/a | `bun run test:dom` returns | LED rows complete with owners (per SRC-018) | REDs (~131 / 36 files) |
| REQ-TEST-004 (UltraQA adversarial matrix) | `19_*.md` matrix scan | n/a | new | n/a | cross-doc | matrix present with ≥1 sample row per scenario | n/a |
| REQ-TEST-005 (perf evaluator contract) | `09_*.md` contract scan | n/a | new | n/a | cross-doc | contract present per hot path | n/a |
| REQ-DOC-001 (README stack drift) | `tests/vitest/docs/readme-stack.test.ts` | DOM | new | static scan | `bun run test:dom` | README mentions Cloudflare-only OR has migration-archaeology note | n/a |
| REQ-DOC-002 (stable ID consistency) | cross-doc reference scan | n/a | new | n/a | cross-doc | every ID resolves | n/a |
| REQ-A11Y-001 (error-state WCAG) | DOM a11y tests on error-rendered components | DOM | new | fixture | `bun run test:dom` | error banner uses `<div role="alert">` or `<output aria-live>` | n/a |
| REQ-A11Y-002 (toast live region) | `tests/vitest/a11y/toast-live-region.test.tsx` | DOM (RTL) | new | fixture | `bun run test:dom` | `<output aria-live="assertive">` present | RED area (toasts) |
| REQ-ARCH-001 (D1 access centralization) | import-graph scan | n/a | new | n/a | cross-doc | every D1 access path uses repository module | n/a |
| REQ-ARCH-002 (Server Action manifest) | `tests/vitest/api-contract/server-action-manifest.test.ts` | DOM | new | static scan | `bun run test:dom` | manifest matches `grep "use server"` count | n/a |
| REQ-AI-001 (AI audit row) | `tests/vitest/ai/audit-row-written.test.ts` | DOM | new | fixture | `bun run test:dom` | AI call → D1 row in `ai_audit_rate_limits` | RED (AI deferred) |
| REQ-AI-002 (AI denial when flag off) | `tests/vitest/ai/flag-off-denial.test.ts` | DOM | new | fixture | `bun run test:dom` | flag off → 403 | n/a |
| REQ-AI-003 (AI SSRF) | `tests/vitest/security/ai-outbound-ssrf.test.ts` | DOM | new | private-IP fixture | `bun run test:dom` | private-IP rejected | n/a |

## Pre-existing RED triage (per SRC-018)

FAST PATH `current-state.md:48-53` reports ~131 failed `test:dom` tests across 36 files in:

- **auth/beta** — REQ-SEC-008, REQ-API-010, REQ-SEC-007
- **project groups/favorites** — REQ-SEC-002 (group-actions.ts, favorites-actions.ts), REQ-DATA-001 (project_groups, estimate_favorites tables)
- **publication** — REQ-API-008 (share mutations), REQ-SEC-003 (share token)
- **library** — REQ-SEC-002 (component-library/actions.ts), REQ-DATA-001
- **agent-payload/tooling** — `validate:agents` adjacency
- **upload-proof** — REQ-API-009 (R2 cross-workspace denial)
- **project-list** — project-list contracts

The future remediation Phase 12 MUST triage these and mark each with `owner`, `fix-forward`, or `intentional-deferral-with-rationale`.

## Bun scripts used by the audit validation suite

| Script | Use |
|---|---|
| `bun run type-check` | type strictness across boundary changes (Phase 1-3) |
| `bun run lint` | lint errors (no `as any`, error-contract regex) |
| `bun run lint:design-system` | UI gate (out of audit core scope) |
| `bun run test` | Bun unit tests in `tests/unit/` |
| `bun run test:dom` | Vitest DOM tests — run focused matrix in WAVE 2 / 3; full suite is RED per FAST PATH |
| `bun run test:dom -- <path>` | focused Vitest run on a single path (used in Phase 1-5 to gate per-phase) |
| `bun run test:e2e` | Playwright E2E — only for collaboration + share-link flows that need browser |
| `bun run build` | full Next.js build (exit 0; per FAST PATH built green on main) |
| `bun run cf:d1-authz-matrix` | regenerate D1 access-path matrix |
| `bun run cf:d1-rpc-map` | regenerate D1 RPC rewrite map |
| `bun run cf:typegen` | regenerate `cloudflare-env.d.ts` |
| `bun run validate:agents` | validate `.ai/12_agents/payloads` + adapters; related to AI surfaces |

## Test type decision tree (per Creating-Plan-Prompt.md §8A)

- **Pure domain logic** → unit test
- **React component interaction** → DOM test (React Testing Library)
- **Async Server Components / route-level behavior** → E2E or integration proof
- **Server Actions / Route Handlers / repositories / RPCs** → direct tests + `cf:*` proof when D1-bound
- **Auth/RLS/security** → role-matrix tests + denial tests
- **Performance** → evaluator harness + `cf:*` proof scripts
- **Accessibility** → semantic DOM assertions + keyboard/focus tests; browser proof for complex focus

## E2E specs (existing, environment-gated)

| Spec | Env flag | Surfaces exercised |
|---|---|---|
| `e2e/landing-page-audit.spec.ts` | none | landing only |
| `e2e/auth-smoke.spec.ts` | none | Better Auth sign-in/redirect |
| `e2e/tree-dnd.spec.ts` | ARCHESTIMATOR_E2E_MUTATING_DND=1 | tree DnD mutations |
| `e2e/ai-package-builder-live.spec.ts` | ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER=1 | AI package builder |
| `e2e/invite-entry.spec.ts` | ARCHESTIMATOR_E2E_INVITE_ENTRY=1 | invite accept/continue |
| `e2e/teamspace-collaboration.spec.ts` | ARCHESTIMATOR_E2E_COLLABORATION=1 | DO WS + invite |
| `e2e/shared-link-receiver.spec.ts` | ARCHESTIMATOR_E2E_SHARED_LINK=1 | share view + password + comment + decision |