# 06 — Readiness & Acceptance Criteria

**Date:** 2026-06-13 (rev. 3 — aligned to the 3-PR plan, docs 08–12, and execution-prerequisite status)

---

## Pre-implementation readiness checklist

Unchecked items in this section are **PR-start prerequisites**, not unresolved product questions. Do not start source edits until they are completed on the current base branch.

### Design / product
- [x] Goal confirmed by the plan owner's directive (2026-06-13): unify the library folder tree with the estimate-sheet tree; pre-release MVP, parity-first.
- [x] Non-goals confirmed (no new features beyond D12, no schema changes, no estimate workspace changes).
- [x] Phase plan decided: incremental, compressed to 3 PRs, no feature flag (D1, D6).

### Technical
- [ ] Implementer has read `EstimateSheetTree.tsx` end-to-end and doc 10's pattern map.
- [ ] `bun run type-check`, `bun run lint`, `bun run build` pass on the base branch.
- [x] **Vitest baseline recorded:** the six files in doc 08 §1 ran green on `kimi/library-edits` on 2026-06-13 — `6 passed (6)`, `90 passed (90)`, 59s. Re-run at the start of PR 1 if the base branch has moved.
- [x] `react-complex-tree` usages inventoried: `LibraryFolderTree.tsx`, `library-folder-reorder.ts` (types only), `workshop/layout.tsx` (CSS), `package.json` (`^2.6.1`), `bun.lock`, mocks/type-imports in three UI test files, and string assertions in `tests/vitest/live-estimate-node-route.test.ts` (doc 08).

### Test / QA baseline
- [x] Manual QA script exists: doc 11 §4 (12-step walkthrough covering every CRUD operation, the synthetic-root cases, keyboard, and disabled states).
- [x] DOM/selector contract exists: doc 08 §3–§4.
- [ ] One pass of doc 11 §4 executed against the **old** tree so "same as today" is concrete before any swap.

---

## Per-PR acceptance criteria

| PR | Must be true before merging |
|---|---|
| **PR 1 — `FolderTree` + swap** | Folders view renders the canonical `Tree`; doc 11 §1 (CRUD matrix), §2 (synthetic root), §3 (interaction states) hold; new evaluator unit tests pass incl. the D12 top-level case and synthetic-root/component resolver cases; the three `react-complex-tree` test mocks deleted; old direct-harness DnD tests rewritten as real DOM drag tests; `<ol>` assertion re-baselined; all six Vitest files green; every **Must preserve** `data-*` selector emitted; focused keyboard/ARIA and adversarial root/disabled/bulk-drift tests pass; Suppliers/Brands views unchanged; type-check/lint/build green. |
| **PR 2 — Modal picker** | `AddComponentModal` folder picker uses `FolderTree`; pick/save-to-folder and in-modal folder CRUD work (doc 11 §4 step 10); full suite green. |
| **PR 3 — Cleanup** | `grep -R "react-complex-tree" src tests package.json bun.lock` returns no matches; `tests/vitest/live-estimate-node-route.test.ts` no longer expects workshop-scoped vendor CSS; old-shape unit cases ported to the new evaluator; D10 performance spot-check done and noted; `ANALYZE=true bun run build` output or package/lockfile dependency delta noted; full build + suite green. |

---

## Definition of done

1. `/workshop/library/components` Folders view uses `src/components/ui/tree.tsx` (via the new `FolderTree`).
2. Every behavior in doc 11 §1–§3 works without regression; the only behavior deltas are those listed in doc 04 §7.
3. `AddComponentModal` folder picker uses the same `FolderTree`.
4. `react-complex-tree` is removed from the project entirely.
5. Type-check, lint, build, and the full Vitest suite pass; the six gate files pass without `react-complex-tree` mocks; supporting route CSS, shared row-affordance, keyboard/ARIA, and real DOM DnD checks pass.
6. A visual QA pass compares the library tree to the estimate tree and records no blocking discrepancies (doc 11 §3 as the checklist).
7. This plan is updated with any deviations and archived once implementation is complete.

---

## Validation gates

| Gate | How to verify |
|---|---|
| Type safety | `bun run type-check` |
| Lint / design-system | `bun run lint` (or `lint:design-system` if available) |
| Build | `bun run build` |
| Unit/UI tests | `bun run test:dom` — six gate files green per PR (doc 08 §5) |
| Tree behavior | Doc 11 §4 walkthrough per PR scope |
| DOM contract | Doc 08 §3 table — every **Must preserve** attribute resolvable in the rendered Folders view |
| Bundle impact | `ANALYZE=true bun run build` before/after PR 3, or record package/lockfile dependency delta if analyzer output is not useful |
| Performance | D10 side-by-side spot-check before PR 3 merges |
| Accessibility | Keyboard-only walkthrough + screen-reader smoke (row announcements, status-strip politeness) on Folders view |
