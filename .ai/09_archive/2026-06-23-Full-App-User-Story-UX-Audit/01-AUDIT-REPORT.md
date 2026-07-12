# Baseline Audit — UX Plan Pack (Pre-Enrichment)

Date: 2026-06-23
Method: Heuristic scoring of file depth (line count, byte count, presence of concrete paths/copy/code blocks/tables/assertions/TV IDs, placeholder penalty).

## Scoring Dimensions

- **Strategy** (0-100): alignment, priority, decision-gate, sequencing — derived from 00-README + 08-DECISIONS.
- **Quality** (0-100): content depth across the 9 canonical files.
- **Implementation Readiness** (0-100): weighted — current-state, impl-plan, acceptance, verification, blast-radius (70%) + 7 new dimension docs (30%).

## Per-Folder Scores

| Folder | Strategy | Quality | Impl Readiness | Gap to 100% |
|---|---:|---:|---:|---|
| UX-001-public-copy-readiness | 50% | 56% | 41% | all 3 dims to 100% |
| UX-002-beta-access-status | 38% | 52% | 40% | all 3 dims to 100% |
| UX-003-terms-persistence-retry | 38% | 51% | 40% | all 3 dims to 100% |
| UX-004-root-recovery-boundaries | 42% | 54% | 41% | all 3 dims to 100% |
| UX-005-settings-role-explanations | 45% | 64% | 46% | all 3 dims to 100% |
| UX-006-group-delete-copy | 38% | 51% | 40% | all 3 dims to 100% |
| UX-007-dirty-modal-close-intercept | 38% | 51% | 40% | all 3 dims to 100% |
| UX-008-destructive-modal-tone | 42% | 54% | 42% | all 3 dims to 100% |
| UX-009-shared-link-chip-card | 38% | 51% | 41% | all 3 dims to 100% |
| UX-010-blank-row-create-affordance | 38% | 51% | 40% | all 3 dims to 100% |
| UX-011-visible-save-errors | 38% | 51% | 41% | all 3 dims to 100% |
| UX-012-dnd-undo-keyboard | 38% | 51% | 40% | all 3 dims to 100% |
| UX-013-stale-source-badge | 40% | 51% | 40% | all 3 dims to 100% |
| UX-014-history-unavailable-reason | 38% | 51% | 40% | all 3 dims to 100% |
| UX-015-versions-panel-decision | 38% | 51% | 40% | all 3 dims to 100% |
| UX-016-export-preflight | 38% | 51% | 40% | all 3 dims to 100% |
| UX-017-preview-design-lint | 38% | 51% | 40% | all 3 dims to 100% |
| UX-018-chart-derived-state-lint | 38% | 51% | 40% | all 3 dims to 100% |
| UX-019-maps-location-fallback | 38% | 51% | 40% | all 3 dims to 100% |
| UX-020-invite-email-readiness | 38% | 51% | 40% | all 3 dims to 100% |
| UX-021-realtime-presence-indicators | 38% | 51% | 40% | all 3 dims to 100% |
| UX-022-share-recovery-copy | 40% | 52% | 41% | all 3 dims to 100% |
| UX-023-activity-load-more | 38% | 51% | 40% | all 3 dims to 100% |
| UX-024-ai-disabled-quota-draft-states | 38% | 54% | 45% | all 3 dims to 100% |
| UX-025-feedback-mailto-payload | 38% | 51% | 41% | all 3 dims to 100% |
| UX-026-feedback-review-pagination | 38% | 51% | 40% | all 3 dims to 100% |
| UX-027-toast-scoped-ids | 40% | 51% | 40% | all 3 dims to 100% |
| UX-028-qa-route-manifest | 38% | 51% | 41% | all 3 dims to 100% |
| UX-029-provider-proof-owners | 60% | 62% | 42% | all 3 dims to 100% |
| UX-030-mobile-interrupted-estimate | 40% | 52% | 41% | all 3 dims to 100% |
| UX-031-field-handoff-slice | 40% | 52% | 41% | all 3 dims to 100% |
| UX-032-pm-readiness-governance | 40% | 52% | 41% | all 3 dims to 100% |
| UX-033-stale-cost-refresh-queue | 32% | 7% | 0% | all 3 dims to 100% |
| UX-034-attachment-review-lifecycle | 32% | 7% | 0% | all 3 dims to 100% |
| UX-035-recipient-first-open-summary | 38% | 51% | 41% | all 3 dims to 100% |
| UX-036-recipient-recovery-paths | 38% | 51% | 41% | all 3 dims to 100% |
| UX-037-recipient-action-retry | 38% | 51% | 41% | all 3 dims to 100% |
| UX-038-operations-persona-split | 48% | 57% | 38% | all 3 dims to 100% |
| UX-039-notification-campaign-authoring | 38% | 51% | 41% | all 3 dims to 100% |
| UX-040-admin-repair-workflow | 38% | 51% | 41% | all 3 dims to 100% |
| UX-041-evidence-status-vocabulary | 38% | 51% | 41% | all 3 dims to 100% |
| UX-042-route-api-inventory | 38% | 51% | 40% | all 3 dims to 100% |
| UX-043-auth-invite-workspace-recovery | 38% | 51% | 41% | all 3 dims to 100% |
| UX-044-numeric-validation-a11y | 38% | 51% | 41% | all 3 dims to 100% |

**Pack averages (n=44):** Strategy=39.0%  Quality=50.0%  ImplReadiness=38.7%

## Systematic Gaps

1. **Missing dimension docs (7 per folder = 308 files):** UX/UI design spec, performance budget, security/RLS threat model, DB/migration plan, network/API contract, observability/monitoring, implementation-readiness checklist.
2. **Thin current-state analysis:** 02-CURRENT-STATE-ANALYSIS.md files average <2KB; need actual source-code reading with line numbers.
3. **Placeholder copy:** 03-TARGET-EXPERIENCE.md uses `Derived from fix` instead of concrete strings.
4. **Generic TV mappings:** 06-VERIFICATION-AND-PROOF.md lists TV IDs as `(per verification matrix)` instead of actual commands.
5. **Templated blast radius:** 07-BLAST-RADIUS-AND-ROLLBACK.md uses generic `Low/Medium/High` instead of enumerated callers.
6. **No UX-UI design spec:** missing visual hierarchy, motion, ARIA, copy teardown.
7. **No performance budget:** missing LCP/INP/CLS targets, bundle impact, network waterfall.
8. **No security threat model:** missing trust boundaries, RLS policies, abuse cases, rate limits.
9. **No DB/migration plan:** missing schema changes, backfill, RPC contracts.
10. **No network/API contract:** missing endpoint payloads, status codes, error shapes.
11. **No observability plan:** missing metrics, logs, traces, alerts, audit trail hooks.

## Improvement Plan

### Phase 2a — Add 7 new dimension docs per folder (308 files)

Each new doc grounds its dimension in the issue's `code_files`, `conflict_group`, and `tv_ids` from the canonical audit.

### Phase 2b — Enrich existing 9 files

- Replace placeholder copy with issue-specific strings.
- Add concrete TV-* commands (runnable shell).
- Enumerate real callers/consumers in blast radius.
- Add explicit test ids and assertion messages.

### Phase 3 — Parent-level cross-cutting docs

- `01-AUDIT-REPORT.md` (this file)
- `02-DIMENSION-MATRIX.md` (cross-folder view of each dimension)
- `03-IMPROVEMENT-LEDGER.md` (per-folder gap closure tracking)

### Phase 4 — Re-audit

Re-run this audit after enrichment; target every folder at 100% on all 3 dimensions.

## Per-File Average Scores by Canonical File

| File | Average Score | Primary Gap |
|---|---:|---|
| `00-README.md` | 53% | acceptable |
| `01-ISSUE-DEFINITION.md` | 50% | acceptable |
| `02-CURRENT-STATE-ANALYSIS.md` | 42% | thin content |
| `03-TARGET-EXPERIENCE.md` | 45% | thin content |
| `04-IMPLEMENTATION-PLAN.md` | 53% | acceptable |
| `05-ACCEPTANCE-CRITERIA.md` | 70% | acceptable |
| `06-VERIFICATION-AND-PROOF.md` | 53% | acceptable |
| `07-BLAST-RADIUS-AND-ROLLBACK.md` | 58% | acceptable |
| `08-DECISIONS-AND-DEPENDENCIES.md` | 25% | thin content |
| `09-UX-UI-DESIGN-SPEC.md` | 0% | MISSING (Phase 2a) |
| `10-PERFORMANCE-BUDGET.md` | 0% | MISSING (Phase 2a) |
| `11-SECURITY-AND-RLS.md` | 0% | MISSING (Phase 2a) |
| `12-DATABASE-AND-MIGRATION.md` | 0% | MISSING (Phase 2a) |
| `13-NETWORK-AND-API-CONTRACT.md` | 0% | MISSING (Phase 2a) |
| `14-OBSERVABILITY-AND-MONITORING.md` | 0% | MISSING (Phase 2a) |
| `15-IMPLEMENTATION-READINESS-CHECKLIST.md` | 0% | MISSING (Phase 2a) |

---

Generated by Phase 1 audit script.