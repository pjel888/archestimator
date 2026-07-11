# Audit Evidence — 2026-07-10

This document records the provenance and freshness of the audit findings in this plan pack.

## Audit Method

Six parallel read-only exploration agents independently mapped the activity history feature across:
1. D1 migrations and schema (all `migrations/*.sql` files).
2. Repository layer (`src/lib/repositories/`, `src/lib/publisher/`).
3. Write layer (`src/lib/estimates/d1-action-client.ts`, `src/lib/reusable-sources/actions.ts`, `src/lib/estimates/express-promotion-actions.ts`, `src/lib/ai/package-builder/apply.ts`).
4. Read layer (`src/lib/estimates/actions.ts`, `src/lib/repositories/project-activity-feed-repository.ts`, `src/lib/repositories/project-activity-repository.ts`).
5. Presentation layer (`src/lib/activity/`).
6. UI components (`src/components/workshop/estimate-sheet/activity-history.tsx`, `src/components/workshop/project-activity/`, `src/components/share/`).
7. API routes (`src/app/api/projects/[projectId]/activity/`, `src/app/api/share/[token]/`).
8. Shared-link system (`src/lib/publication/`, `src/lib/publication/security.ts`, `src/lib/publication/public-repository.ts`).
9. Test files (`tests/vitest/`, `e2e/`).
10. Existing planning documentation (`.ai/01_roadmap/`, `.ai/03_plans/`, `.ai/09_archive/`, `.ai/10_state/`, `.ai/06_specs/`).

## Critical Finding Verification

The event-type naming split was verified by direct source reads on 2026-07-10:

| Claim | Verified at | Result |
|---|---|---|
| Write layer emits `estimate_tab_deleted` | `d1-action-client.ts:1324` (read directly) | CONFIRMED |
| Write layer emits `estimate_node_created` | `d1-action-client.ts:1351` (read directly) | CONFIRMED |
| Write layer emits `estimate_node_renamed` | `d1-action-client.ts:1372` (read directly) | CONFIRMED |
| Write layer emits `row_inserted` | `d1-action-client.ts:1682` (read directly) | CONFIRMED |
| Read path passes event_type verbatim | `actions.ts:955` (read directly) | CONFIRMED |
| UI filter expects `node_created` | `activity-history.tsx:48` (read directly) | CONFIRMED |
| UI filter expects `row_added` | `activity-history.tsx:44` (read directly) | CONFIRMED |
| Restore guard expects `rows_bulk_deleted` | `activity-history.tsx:220` (read directly) | CONFIRMED |
| Restore guard expects `node_deleted_with_children` | `activity-history.tsx:221` (read directly) | CONFIRMED |
| Dictionary expects `node_created` | `activity-copy-dictionary.ts:16` (read directly) | CONFIRMED |
| Dictionary expects `tab_created` | `activity-copy-dictionary.ts:21` (read directly) | CONFIRMED |

All claims verified against the current `main` branch source.

## Node-Restore Wiring Verification

The node-restore path was traced end-to-end and verified as FULLY WIRED:

| Link | File:line | Status |
|---|---|---|
| Restore button builder | `activity-history.tsx:526-556` | WIRED |
| Prop threading | `activity-history.tsx:1765` | WIRED |
| Handler callback | `src/components/workshop/EstimateSheetContent.tsx:1855-1913` | WIRED |
| Server action | `src/lib/estimates/actions.ts:3703-3733` | WIRED |
| RPC dispatch | `src/lib/estimates/d1-action-client.ts:2407` | WIRED |
| D1 implementation | `src/lib/estimates/d1-action-client.ts:1515-1628` | WIRED |
| Read-only gating | `src/components/workshop/EstimateSheetContent.tsx:2333` | WIRED |

## Source Freshness

All source references are current as of `main` branch HEAD
`e373bc865b978e237deb1d92011c96b0a3639fb4` on 2026-07-10. A scoped re-audit
confirmed no Activity-owned source path changed since the prior baseline.

## Existing Documentation Cross-Reference

| Source | Location | Status |
|---|---|---|
| Activity History V1 Overhaul | `.ai/09_archive/store/2026-06-03-activity-history-overhaul-v1/` | COMPLETED/MERGED |
| Project Activity Page | `.ai/09_archive/2026-06-28-Project-Activity-Page/` | IMPLEMENTATION-READY (archived) |
| Estimate Sheet Version Control | `.ai/09_archive/store/2026-05-29-estimate-sheet-version-control-complete/` | COMPLETED |
| Shared Link Overhaul V2 | `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/` | COMPLETED |
| Shared Link & Publication Spec | `.ai/06_specs/shared-link-and-publication-spec.md` | Active |
| Project & Estimate Versioning Spec | `.ai/06_specs/project-estimate-versioning-system.md` | Implemented/Active |
| VALIDATION_MATRIX constraint | `.ai/00_system/VALIDATION_MATRIX.md:289` | Active prohibition |
| Decision D9/D10/D11 | `.ai/10_state/decisions.md:1200-1202` | Ratified |

## Gap Discovery

The following facets were identified as NOT previously documented in any existing plan pack or spec:

1. The event-type naming split between write and read layers (CRITICAL — no existing doc mentions this).
2. The bulk-delete restore mismatch (`rows_deleted` vs `rows_bulk_deleted`).
3. The AI package-builder variant spellings (`estimate_row_inserted`, etc.).
4. The 17-column INSERT in reusable-sources (omits `target_row_id`, `total_delta`).
5. The unused `Timeline` UI primitive.
6. The hardcoded actor email→name mapping in `project-activity-repository.ts:156`.
7. The `signature_intent_hash` scaffolded-but-never-computed gap.
8. The `download_attempt_blocked` event type defined but never emitted.
9. The per-target decision columns collapsed to publication-level by the unique constraint.
10. The lack of real-time updates on the share page.
