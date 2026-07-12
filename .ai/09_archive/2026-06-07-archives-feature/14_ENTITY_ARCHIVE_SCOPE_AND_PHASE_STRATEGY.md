# Entity Archive Scope and Phase Strategy

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Architecture Decision: In-Place Archives Per Domain

Each entity archives **in-place** within its existing route surface. No global `/workshop/archives` center in V1. This minimizes UI blast radius and keeps archive behavior predictable per domain.

**Rationale:**
- Users think about "my projects," "my estimate sheets," "my components" — not "my archives"
- In-place archives follow the existing delete pattern (delete actions live in the entity's own toolbar/modal)
- A global center would require cross-entity navigation and duplicate the entity UI already built
- Future: a unified center can wrap existing per-entity archive views without changing their behavior

## Entity Scope Matrix

| Entity | Route | UI Pattern | Phase | Implementation Effort |
|--------|-------|------------|-------|----------------------|
| Projects | `/workshop/projects` | Third "Archived" tab + card/bulk actions | 1 | High (new columns, RPCs, tab, route guards) |
| Estimate Sheets | `/workshop/projects/[projectId]/estimates` | Status filter + row/bulk actions | 2 | Medium (new columns, RPCs, filter, cross-cutting effects) |
| Components | `/workshop/library` | Status filter + restore action | 3 | Low (existing lifecycle_state, add restore RPCs + view) |
| Templates | `/workshop/templates` | Status filter + archive/restore actions | 4 | Low-Medium (new columns, RPCs, filter) |
| Retention | N/A (recipient-facing) | Conceptual architecture only | 5 | Planning only (no code) |

## Phase Ordering Rationale

1. **Projects first** — foundation for all other archives. Projects contain estimate sheets; archived projects define behavior for child entities. Bulk action toolbar and modal pattern established here and reused by subsequent phases.

2. **Estimate sheets second** — most complex cross-cutting effects (charts, export, AI, publication, project totals, favorites, activity history). Must be built after projects because archived projects affect estimate sheet visibility.

3. **Components third** — lowest implementation effort. Existing lifecycle_state system already supports archive; only missing restore flow and archived view. Existing AI exclusion already handles lifecycle_state.

4. **Templates fourth** — standalone with minimal blast radius. Follows project/estimate archive patterns with simpler requirements.

5. **Retention last** — pure planning. Must be informed by Phases 1-4 implementation reality before committing to a data model.

## What's Implementation-Ready vs Future-Gated

| Element | Ready? | Notes |
|---------|--------|-------|
| Project archive/restore | ✅ P1 | Full implementation |
| Estimate sheet archive/restore | ✅ P2 | Full implementation |
| Component restore + view | ✅ P3 | Full implementation |
| Template archive/restore | ✅ P4 | Full implementation |
| Global `/workshop/archives` | ❌ Deferred | Future phase, not in V1 |
| Paid-client retention | ❌ Planning only | Phase 5 — architecture docs, no code |
| Recipient entitlements | ❌ Planning only | Requires payment/subscription infrastructure |
| Retained immutable snapshots | ❌ Planning only | Requires legal/product review |

## Anti-Overreach Guardrails

1. **No duplicate columns** — components already have `lifecycle_state = 'archived'`. Do NOT add `archived_at` to `cost_library_items`.
2. **No premature global center** — each entity archives in-place. A unified center is future work.
3. **No paid access implementation** — Phase 5 produces architecture docs only. Implementation requires Philip's explicit approval, payment infrastructure, and legal review.
4. **Follow existing patterns** — preview→execute RPC pattern; simple confirm for archive in new flows (projects, estimate sheets, templates). Existing component archive uses typed confirmation (`ARCHIVE COMPONENT(S)`) via `BulkDestructivePreviewModal` at `ComponentLibraryManager.tsx:975` — may keep typed phrase since it pre-dates the new convention. Restore always uses simple confirm.
5. **Additive schema only** — all migrations are `ALTER TABLE ADD COLUMN IF NOT EXISTS`. No breaking changes.
6. **One entity per phase** — do not mix entity implementations. Each phase is independently shippable and rollback-able.
