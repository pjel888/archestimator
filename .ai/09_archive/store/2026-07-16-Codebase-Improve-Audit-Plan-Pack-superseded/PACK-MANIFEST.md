# PACK-MANIFEST

File inventory for this plan pack. Canonical hashes live in `plan-pack.json` `artifacts[]` (refreshed by `node scripts/validate-plan-pack.mjs --write <folder>`). This file is the human-readable map; do not hand-edit hashes here — regenerate from `plan-pack.json`.

## Governance & analysis (role: supporting, except README = canonical-execution)

| Path | Role | Content |
|------|------|---------|
| `README.md` | canonical-execution | Overview, status table, execution order, orchestration, acceptance |
| `00-EXECUTIVE-DIRECTION.md` | supporting | Posture, scope decision, what changed since recon |
| `01-AUDIT-FINDINGS-REGISTER.md` | supporting | Full findings table + rejected register + traceability |
| `02-BLAST-RADIUS-AND-IMPACT-ANALYSIS.md` | supporting | Per-unit blast radius |
| `03-PERFORMANCE-AND-OPTIMIZATION-STUDY.md` | supporting | Perf findings deep-dive + complexity analysis |
| `04-DEPLOY-DATA-INTEGRITY-AND-SIMULATIONS.md` | supporting | Migration + concurrency simulations |
| `05-SECURITY-HARDENING-ANALYSIS.md` | supporting | Security findings + accepted tradeoffs |
| `06-RISKS-DECISIONS-AND-NON-GOALS.md` | supporting | Risks, decisions, non-goals, external-action boundaries |
| `LOOP_LEDGER.md` | supporting | Append-only coordination log |
| `PACK-MANIFEST.md` | supporting | This file |

## Per-unit plans (role: supporting; one per UNIT)

| Path | Unit | Req |
|------|------|-----|
| `100-migration-safety.md` | UNIT-001 | DATA-001 |
| `110-category-folder-map-rebuild.md` | UNIT-002 | PERF-001 |
| `120-timing-safe-bearer-secret.md` | UNIT-003 | SEC-001 |
| `130-test-gate-and-coverage.md` | UNIT-004 | OPS-001 |
| `140-d1-batch-limit-guard.md` | UNIT-005 | PERF-002 |
| `150-api-route-auth-contract-test.md` | UNIT-006 | SEC-002 |
| `160-upload-removal-semantics.md` | UNIT-007 | DATA-002 |
| `170-action-inbox-snooze-consistency.md` | UNIT-008 | OPS-002 |
| `180-publication-password-floor.md` | UNIT-009 | SEC-003 |
| `190-active-recipient-query-dedup.md` | UNIT-010 | SEC-004 |
| `200-web-vitals-pagehide-leak.md` | UNIT-011 | OPS-003 |
| `210-d1-database-null-observability.md` | UNIT-012 | OPS-004 |
| `220-component-library-unbounded-load.md` | UNIT-013 | PERF-003 |
| `230-estimate-mutation-god-module-split.md` | UNIT-014 | PERF-004 |
| `240-hosted-share-link-lockout-characterization.md` | UNIT-015 | SEC-005 |
| `250-upload-reference-tracking-table.md` | UNIT-016 | PERF-005 |
| `260-public-repository-access-security-extract.md` | UNIT-017 | SEC-006 |
| `300-direction-estimate-system-map.md` | UNIT-018 | REQ-001 |
| `310-direction-estimate-import.md` | UNIT-019 | REQ-002 |
| `320-direction-activation-action-inbox.md` | UNIT-020 | REQ-003 |

## Manifest

`plan-pack.json` — machine-readable index (artifacts + hashes, sources, requirements, criteria, units DAG, evidence, risks, decisions). Validated by `scripts/validate-plan-pack.mjs`. Status: PLAN_ONLY / NOT_READY / NOT_STARTED / ACTIVE; 20 units (17 CORE + 3 AUXILIARY direction); `next_unit: null` (no ready slice yet).
