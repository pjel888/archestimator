# 04 — MVP Feature Completion Plan

**Date:** 2026-06-01

This covers features already implemented but needing verification, polish, or minor UX work. Critical new features (unlink, export) have their own detailed plans.

---

## 1. Projects

**Current state:** Full CRUD working. Create modal with image upload, title, location, client, budget, currency. Project cards on list page with favorites, shared status, pending invites. Project dashboard with header, estimate list, charts, sharing, teamspaces.

**Gap:** None for MVP Core.

**Implementation tasks:** None.

**Acceptance criteria:**
- Create project with name, location, client, budget
- Project card renders on list and homebase
- Project dashboard loads with estimates, charts, sharing
- Favorites save and persist across sessions

**Tests:** Existing tests pass (project creation, dashboard, list, shares, favorites). Files in `tests/vitest/projects-*.test.tsx`, `tests/vitest/workshop-reset.test.tsx`.

---

## 2. Estimate Sheets

**Current state:** Full CRUD. Create form with auto-generated sheet codes. Estimate list with TanStack Table, inline name/code edit, duplicate action. Estimate workspace with tree + grid + right sidebar.

**Gap:** None for MVP Core. Duplicate-sheet flow needs smoke test.

**Acceptance criteria:**
- Create estimate with auto-generated sheet code
- Duplicate estimate with recreated nodes and rows
- Open estimate workspace with tree and row content

**Tests:** Existing tests pass (`estimate-sheet-*.test.tsx`, `project-estimates-*.test.tsx`).

---

## 3. Estimate Tree

**Current state:** React Complex Tree with group/area nodes, DnD reorder, inline rename, context menu (Rename/Delete), add-group/area buttons. Selection syncs with Zustand store and route.

**Gap:** None for MVP Core. Verify group-before-area sorting (taste rule).

**Acceptance criteria:**
- Expand/collapse groups to reveal areas
- Drag/drop reorder with persistence
- Inline rename with Enter/check confirmation
- Context menu rename/delete works
- Group nodes sort before area nodes
- Add group/area from toolbar

**Tests:** Existing tests pass. Impact analysis on `EstimateSheetTree` before any edit.

---

## 4. Row Editing

**Current state:** Inline quantity, contingency percentage, miscCost editing. Optimistic TanStack Query cache updates. Server action validates and persists via `update_estimate_row_item_with_history`. Row details modal (read-only).

**Gap:** None for MVP Core for linked rows. For project-specific rows (post-unlink), need editable row inspector fields (covered in doc 07).

**Acceptance criteria:**
- Edit quantity inline, value persists
- Edit contingency percentage inline (positive=contingency, negative=discount)
- Edit miscCost inline
- Row totals recalculate correctly
- Failed saves rollback without corruption

**Tests:** Existing tests pass (`use-estimate-row-mutations.test.tsx`, `estimate-sheet-*.test.tsx`).

---

## 5. Component Insertion / Replacement / Deletion

**Current state:** Drag or click component from library sidebar into area drop zone. Drop zone click appends blank row. Row replacement via drag. Delete via row action.

**Gap:** None for MVP Core. Component insertion works end-to-end.

**Acceptance criteria:**
- Drag library component into area → row created with linked-clean state
- Click empty drop zone → blank row created
- Replace row component by dragging new library item onto row
- Delete row via action menu
- Source snapshot preserved on insert

**Tests:** Existing tests pass. E2E smoke for drag-insert workflow needed.

---

## 6. Blank Row Workflow

**Current state:** Area drop zone click creates unlinked row with placeholder text. User enters quantity/miscCost before selecting component.

**Gap:** None for MVP Core.

**Acceptance criteria:**
- Blank row created with "Drag or add a component here" placeholder
- Quantity and miscCost editable
- Library component replaces placeholder on drag

---

## 7. Component Library

**Current state:** `/workshop/library` with Default/Suppliers/Brand tree views. Add Component modal with identity + variant tabs. 154 seeded components with WebP thumbnails.

**Gap:** Browse/search UX, empty states, design-system audit (detailed in doc 05).

**Acceptance criteria:** See doc 05.

---

## 8. Templates

**Current state:** `/workshop/templates` with 3 seed templates. Insert into estimate group via sidebar Templates tab or template route.

**Gap:** Browse/preview UX, empty states, seed template refresh (detailed in doc 06).

**Acceptance criteria:** See doc 06.

---

## 9. Excel Export

**Current state:** `GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` produces 3-sheet workbook with generic data.

**Gap:** Must rebuild as industry-standard bid/BOQ form (detailed in doc 08).

**Acceptance criteria:** See doc 08.

---

## 10. Component Unlink (Project-Specific)

**Current state:** No UI action. `detached` and `source-changed` link states exist in schema but are never written.

**Gap:** Must build from scratch (detailed in doc 07).

**Acceptance criteria:** See doc 07.

---

## 11. Basic Account / Settings

**Current state:** Profile settings (display name, category, country, use case) and workspace settings (org name, type, size, currency).

**Gap:** None for MVP Core. Settings pages work.

**Acceptance criteria:**
- Profile settings save and persist
- Workspace settings save and persist (owner/admin only)

**Tests:** Existing tests pass.

---

## 12. Public / Legal Pages

**Current state:** `/privacy` and `/terms` are truthful pending-review status pages. `/about`, `/features`, `/pricing`, `/contact` are static marketing.

**Gap:** Need reviewed legal copy for Privacy and Terms. Status pages are accurate for now but must be replaced before public launch.

**Acceptance criteria:**
- Privacy Notice is reviewed legal copy, not placeholder
- Terms of Service are reviewed legal copy, not placeholder
- If legal review delayed, status pages must clearly state "under review"

---

## Implementation Sequence

1. **Highest priority:** Defer AI (Phase 1) + Component unlink (Phase 2) + Excel export (Phase 5)
2. **Medium priority:** Component library polish (Phase 3) + Templates polish (Phase 4)
3. **Lower priority:** Legal pages, QA, deployment (Phase 6)

## Impact-Analysis Targets

Before editing any of these, run code-review-graph impact:
- `EstimateSheetContent` — central estimate surface, blast radius ~50 callers
- `WorkshopPageShell` — every workshop page, blast radius ~20 pages
- `updateEstimateRowItem` — all row writes, blast radius ~10 actions/tests
- `buildProposalExportModel` — export engine, blast radius ~5 callers
- `createProposalWorkbook` — workbook builder, blast radius ~5 callers
