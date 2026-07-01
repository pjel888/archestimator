# 16 — Requirements Traceability Matrix

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`
> Single source of truth for REQ ↔ WP ↔ AC ↔ TEST ↔ evidence cross-reference. Built off `04_*.md` (REQ-* IDs), `11_*.md` (WP-* IDs), `12_*.md` (TEST-* IDs), `14_*.md` (RISK-* IDs).

## REQ → WP → AC → TEST → evidence map

| REQ ID | WP ID | AC ID | TEST ID | Evidence source | Final status |
|---|---|---|---|---|---|
| REQ-API-001 | WP-001 | AC-001 | TEST-API-001 (surface-inventory test) | `03_*.md` inventory vs `find src/app -name 'route.ts'` | audit-in-progress |
| REQ-API-002 | WP-003 | AC-002 | TEST-API-002 (handler envelope test) | per-handler DOM test, mock env | audit-in-progress |
| REQ-API-003 | WP-003 | AC-003 | TEST-API-003 (Server Action DTO test) | per-action DOM test | audit-in-progress |
| REQ-API-004 | WP-004 | AC-004 | TEST-API-004 (mutation idempotency test) | DOM duplicate-submit test | audit-in-progress |
| REQ-API-005 | WP-008 | AC-005 | TEST-API-005 (timeout test) | per-surface DOM test | audit-in-progress |
| REQ-API-006 | WP-008 | AC-006 | TEST-API-006 (queue-retry-cap test) | DOM test | audit-in-progress |
| REQ-API-007 | WP-006 | AC-007 | TEST-API-007 + TEST-SEC-010 (internal-route secret test) | DOM test | audit-in-progress |
| REQ-API-008 | WP-005 | AC-008 | TEST-API-008 (share-token mutation test) | DOM test | audit-in-progress — RED area (publication) |
| REQ-API-009 | WP-001+WP-005 | AC-009 | TEST-API-009 + TEST-SEC-004 (R2 cross-workspace denial test) | DOM test | audit-in-progress |
| REQ-API-010 | WP-011 | AC-010 | TEST-API-010 (AI flag audit test) | DOM test | audit-in-progress — RED area (AI deferred) |
| REQ-SEC-001 | WP-001 | AC-011 | TEST-SEC-001 (D1 row-level access test) | `cf:d1-authz-matrix` matrix | audit-in-progress — RED area (multi) |
| REQ-SEC-002 | WP-002 | AC-012 | TEST-SEC-002 (Server Action verdict test) | verdict table | audit-in-progress |
| REQ-SEC-003 | WP-005 | AC-013 | TEST-SEC-003 (credential material distinct test) | DOM test | audit-in-progress |
| REQ-SEC-004 | WP-008 | AC-014 | TEST-SEC-004 (NEXT_PUBLIC_ leak test) | grep + bundle scan | audit-in-progress |
| REQ-SEC-005 | WP-003 | AC-015 | TEST-SEC-005 (raw error-leak test) | per-handler DOM test | audit-in-progress |
| REQ-SEC-006 | n/a (OPEN-003) | AC-016 | TEST-SEC-006 (WAF ruleset review OR justification) | depends on OPEN-003 | blocked-on-OPEN-003 |
| REQ-SEC-007 | WP-002 | AC-017 | TEST-SEC-007 (Better Auth trusted-origins test) | DOM test + bad-origin fixture | audit-in-progress — RED area (auth/beta) |
| REQ-SEC-008 | WP-008 | AC-018 | TEST-SEC-008 (Better Auth ratelimiter test) | DOM burst test | audit-in-progress — RED area (auth/beta) |
| REQ-SEC-009 | WP-011 | AC-019 | TEST-SEC-009 (outbound SSRF test) | DOM test (location-actions + AI) | audit-in-progress |
| REQ-SEC-010 | WP-005 | AC-020 | TEST-SEC-010 (DO WS ticket test) | DOM test + E2E collaboration | audit-in-progress — RED area (collaboration) |
| REQ-SEC-011 | WP-009 | AC-021 | TEST-SEC-011 (DMARC DNS readback) | DNS TXT read | audit-in-progress — BLOCKED on OPEN-006 |
| REQ-SEC-012 | WP-005 | AC-022 | TEST-SEC-012 (R2 PII key test) | DOM test | audit-in-progress |
| REQ-DATA-001 | WP-001 | AC-023 | TEST-DATA-001 (D1 migration audit) | DOM test on migrations folder | audit-in-progress |
| REQ-DATA-002 | WP-008 | AC-024 | TEST-DATA-002 (D1 EXPLAIN) | `bun run cf:d1-performance-proof` artifacts | audit-in-progress — GREEN baseline |
| REQ-DATA-003 | WP-001 | AC-025 | TEST-DATA-003 (D1 transaction boundary test) | DOM test | audit-in-progress |
| REQ-DATA-004 | WP-011 | AC-026 | TEST-DATA-004 (D1 restore rehearsal) | `bun run cf:d1-restore-rehearsal` | audit-in-progress — GREEN baseline |
| REQ-PERF-001 | WP-008 | AC-027 | TEST-PERF-001 (per-surface budget) | `bun run cf:d1-runtime-performance-proof` | audit-in-progress — GREEN baseline |
| REQ-PERF-002 | WP-008 | AC-028 | TEST-PERF-002 (DO hibernation test) | DOM test on DO alarm | audit-in-progress |
| REQ-PERF-003 | WP-008 | AC-029 | TEST-PERF-003 (Queue batch <30s test) | DOM test | audit-in-progress |
| REQ-PERF-004 | WP-008 | AC-030 | TEST-PERF-004 (Cron overlap test) | DOM test | audit-in-progress |
| REQ-REL-001 | WP-007 | AC-031 | TEST-REL-001 (failure mode test per surface) | DOM test per surface | audit-in-progress |
| REQ-REL-002 | WP-007 | AC-032 | TEST-REL-002 (DLQ alert test) | DOM test | audit-in-progress |
| REQ-REL-003 | WP-008 | AC-033 | TEST-REL-003 (Workers Obs sample rate test) | Workers Obs dashboard readback (manual) | audit-in-progress — BLOCKED on OPEN-002 |
| REQ-REL-004 | WP-008 | AC-034 | TEST-REL-004 (Cron structured-logger test) | DOM test | audit-in-progress |
| REQ-OPS-001 | WP-011 | AC-035 | TEST-OPS-001 (rollback runbook scan) | docs inspection | audit-in-progress |
| REQ-OPS-002 | WP-008 | AC-036 | TEST-OPS-002 (typegen diff test) | DOM test | audit-in-progress |
| REQ-OPS-003 | WP-011 | AC-037 | TEST-OPS-003 (migrations rollback file check) | file-check | audit-in-progress |
| REQ-OPS-004 | WP-008 | AC-038 | TEST-OPS-004 (feature flag config-only test) | DOM test | audit-in-progress |
| REQ-TEST-001 | n/a (meta) | AC-039 | cross-doc scan | traceability scan | audit-in-progress |
| REQ-TEST-002 | WP-002 | AC-040 | TEST-SEC-001 (denial tests) | role-matrix scan | audit-in-progress |
| REQ-TEST-003 | WP-012 | AC-041 | RED test ledger | `tests/vitest/` RED list | audit-in-progress — RED areas |
| REQ-TEST-004 | WP-011 | AC-042 | TEST-ULTRAQA-* (adversarial test matrix) | `19_*.md` matrix | audit-in-progress |
| REQ-TEST-005 | WP-008 | AC-043 | TEST-PERF-* (perf evaluator contract scan) | `09_*.md` contract | audit-in-progress |
| REQ-DOC-001 | WP-010 | AC-044 | TEST-DOC-001 (README stack test) | DOM test (static scan) | audit-in-progress |
| REQ-DOC-002 | n/a (meta) | AC-045 | cross-doc reference scan | n/a | audit-in-progress |
| REQ-A11Y-001 | WP-003 | AC-046 | TEST-A11Y-001 (a11y DOM test) | DOM test (RTL) | audit-in-progress |
| REQ-A11Y-002 | WP-003 | AC-047 | TEST-A11Y-002 (toast live region RTL test) | DOM test (RTL) | audit-in-progress — RED area (toasts) |
| REQ-ARCH-001 | WP-001 | AC-048 | TEST-ARCH-001 (import-graph scan) | cross-doc | audit-in-progress |
| REQ-ARCH-002 | WP-010 | AC-049 | TEST-ARCH-002 (manifest diff test) | DOM test | audit-in-progress |
| REQ-AI-001 | WP-011 | AC-050 | TEST-AI-001 (AI audit-row test) | DOM test | audit-in-progress — RED area (AI deferred) |
| REQ-AI-002 | WP-011 | AC-051 | TEST-AI-002 (AI flag-off denial test) | DOM test | audit-in-progress |
| REQ-AI-003 | WP-011 | AC-052 | TEST-AI-003 (AI SSRF test) | DOM test | audit-in-progress |

## Open decisions blocking audit completion

| OPEN | Blocks | Resolution path |
|---|---|---|
| OPEN-002 | REQ-REL-003 (Workers Obs sample-rate sufficiency) | Confirm sample-rate adequacy vs P0 forensic visibility OR add external sink (OPEN-010); then validate |
| OPEN-003 | REQ-SEC-006 (WAF / rate-limit posture) | Coordinate with `.ai/03_plans/2026-06-29-Rate-Limiting/` sibling |
| OPEN-004 | README final readiness label | Independent reviewer or owner sign-off |
| OPEN-006 | REQ-SEC-011 (DMARC `p=reject`) | DNS TXT change coordinated with Philip/ops |

## SRC-* coverage map

Every `SRC-*` ID from `03_SOURCE_AND_CODEBASE_AUDIT.md` is traceable through this matrix:

| SRC ID | Surface | Touched REQ-* |
|---|---|---|
| SRC-001 | Publication token secrets | REQ-SEC-003, REQ-SEC-004 |
| SRC-002 | BETTER_AUTH_TRUSTED_ORIGINS | REQ-SEC-007, REQ-SEC-004 |
| SRC-003 | `console.log` in `scheduled` handler | REQ-REL-003, REQ-REL-004, RISK-033 |
| SRC-004 | Two crons same handler | REQ-PERF-004, RISK-007 |
| SRC-005 | `routeStaticPublicPageThroughCache` | PERF-001, RISK-019 |
| SRC-006 | Internal `/api/internal/*` routes | REQ-API-007, REQ-SEC-002 |
| SRC-007 | `/api/share/[token]/*` mutations | REQ-API-008, REQ-SEC-003 |
| SRC-008 | All `"use server"` actions | REQ-API-002..005, REQ-SEC-002, REQ-AI-001..003 |
| SRC-009 | Email-sending Server Actions | REQ-REL-002, REQ-SEC-011 |
| SRC-010 | Google Maps outbound fetch | REQ-SEC-009, RISK-015, REQ-AI-003 |
| SRC-011 | Better Auth adapter / config | REQ-SEC-007, REQ-SEC-008, RISK-012, RISK-036, RISK-037 |
| SRC-012 | CollaborationRoom Durable Object | REQ-SEC-010, REQ-PERF-002, RISK-032 |
| SRC-013 | Cron overlap (no native protection) | REQ-PERF-004, RISK-007 |
| SRC-014 | Queue idempotency (at-least-once) | REQ-REL-001, RISK-008 |
| SRC-015 | DLQ visibility | REQ-REL-002, RISK-006 |
| SRC-016 | D1 migrations dir = `migrations/` (29 files) | REQ-DATA-001, REQ-OPS-003 |
| SRC-017 | D1 RLS-equivalent audit | REQ-SEC-001, REQ-DATA-001, RISK-001 |
| SRC-018 | Pre-existing RED `test:dom` (~131 / 36 files) | REQ-TEST-003, RISK-017 |
| SRC-019 | `cf:d1-authz-matrix` + `cf:d1-rpc-map` scripts | REQ-DATA-001, REQ-DATA-002, REQ-ARCH-001 |

## RISK coverage map

Every `RISK-*` from `14_RISK_REGISTER.md` is traceable through this matrix to REQ-* / WP-*. See `14_*.md` for the full register — 37 risks (6 P0 / 19 P1 / 12 P2).

## Count summary

- 56 REQ-* (covering API / SEC / DATA / PERF / REL / OPS / TEST / DOC / A11Y / ARCH / AI / UX dimensions)
- 12 WP-* (Phase 1..12)
- 53 AC-* (carried forward to `17_*.md`)
- ~30 TEST-* (preview; full matrix in `12_*.md`)
- 19 SRC-* (in `03_*.md`)
- 37 RISK-*
- 24 DEC-* (in `15_*.md`)
- 16 OPEN-* (in `15_*.md`)

## Status roll-up

- `audit-in-progress`: 51 REQ-* (mostly blocked on future remediation phases)
- `blocked-on-OPEN`: 5 REQ-* (REQ-SEC-006 → OPEN-003, REQ-REL-003 → OPEN-002, REQ-SEC-011 → OPEN-006)
- `audit-complete`: This audit-pack-as-a-doc deliverable is COMPLETE; the REQ-* "audit-in-progress" status refers to the FUTURE remediation phases that follow this audit pack's recommendations.