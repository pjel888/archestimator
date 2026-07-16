# Plan UNIT-002: Hoist the category-folder Map build out of the per-item hot path

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/component-library/category-folders.ts src/lib/repositories/component-library-repository.ts src/lib/ai/package-builder/apply.ts src/lib/ai/package-builder/read-tools.ts`. If changed, compare excerpts before proceeding.

## Status
- **Priority:** P1 · **Effort:** S · **Risk:** LOW · **Depends on:** — · **Category:** perf
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (one unit test asserting batch == per-item results)

## Why this matters
`resolveComponentCategory` builds `new Map(folders.map(...))` on **every call** (`category-folders.ts:34`). It is called once per library item during normalization (`component-library-repository.ts:626`), mapped over every row at `:1037`, and again in the AI package-builder (`apply.ts:339,1840`, `read-tools.ts:907`). That is `O(items × folders)` throwaway Map allocations per render/request. The team already fixed this exact anti-pattern in `aggregate-project-charts.ts:19-20` — this is applying a known-good refactor.

## Current state
- `src/lib/component-library/category-folders.ts:24-67` — `resolveComponentCategory(folders, folderId, fallback)` rebuilds `folderById` each call, then walks the parent chain.
- Callers pass the same `folders` array across many items. Resolution logic (cycle guard, workspace-cross check, label/ids walk) is correct; only the per-call Map construction is wasteful.
- **Convention/exemplar:** `src/lib/project-charts/aggregate-project-charts.ts:19-20` — comment "built ONCE per series instead of once per row."

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| (TEST_PROPOSAL) unit test | `bun run test:dom -- tests/vitest/component-library-folders.test.ts` (if authorized) | pass |
| (optional) baseline | `bun run perf:library-baseline` | lower allocation/time vs pre |

## Scope
**In scope:** `src/lib/component-library/category-folders.ts`; update the per-item call sites in `component-library-repository.ts:626,1037`, `apply.ts:339,1840`, `read-tools.ts:907` to use the batch resolver (or accept a prebuilt resolver).
**Out of scope:** the resolution *logic* (cycle/workspace/label handling) — preserve byte-for-byte. Any unrelated category-folder behavior change.

## Steps
### Step 1 — Add a batch resolver
In `category-folders.ts`, add `resolveComponentCategories(folders, items, fallback?)` that builds the `folderById` Map **once** (`O(folders)`), checks the unique-id guard once, and resolves each item's path against it. Reuse the exact walk/cycle/workspace logic from `resolveComponentCategory` so results are identical.
### Step 2 — Switch the hot call sites
Replace the per-item `.map(item => resolveComponentCategory(folders, item.library_folder_id, …))` loops with a single `resolveComponentCategories(folders, items)` call. Keep `resolveComponentCategory` exported for any genuine single-call consumer.
### Step 3 — (TEST_PROPOSAL) parity test
Add `tests/vitest/component-library-folders.test.ts`: for a fixture with nested folders + a synthetic-project-component folder id + a cycle, assert `resolveComponentCategories(folders, items)` equals per-item `resolveComponentCategory` for every item. Do not run without user test authorization.
**Verify:** `bun run type-check` + `bun run lint` exit 0; parity test (if authorized) passes.

## Done criteria
- [ ] `bun run type-check` exit 0
- [ ] `bun run lint` exit 0
- [ ] No per-item `new Map(folders.map(...))` remains in the hot path (`rg -n "new Map(folders" src/lib/component-library src/lib/repositories/component-library-repository.ts` returns only the single batch build)
- [ ] Parity test passes (if authorized)
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- A caller relies on a side effect of per-call Map rebuild (none known) — STOP and report.
- Resolution results differ from per-item in the parity test — the batch refactor has a bug; fix before landing.

## Maintenance notes
- New per-item category consumers should call `resolveComponentCategories`, not the single resolver in a loop.
- If folder structure gains a new invariant (e.g. workspace enforcement changes), update both the batch and single resolvers together.
