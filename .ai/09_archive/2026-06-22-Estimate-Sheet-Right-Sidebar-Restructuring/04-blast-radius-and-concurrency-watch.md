# Blast Radius And Concurrency Watch

## Expected Blast Radius

This should be a moderate UI/state refactor contained mostly in the estimate sidebar and its tree helpers.

No expected changes:

- no database migrations
- no Supabase RLS/policy changes
- no route redesign
- no `/workshop/library` redesign
- no proposal/export changes
- no estimate row persistence model changes

## File-Level Risk Map

| File | Risk | Why |
| --- | --- | --- |
| `src/components/workshop/component-library/index.tsx` | High | Owns tabs, state, toolbar, render branch, project-source loading, bulk selection, preview, drag, add/delete flows. |
| `src/components/workshop/component-library/tree/buildLibraryTree.ts` | High | Currently injects project folders into the categories component tree. The split must avoid duplicate rendering and alternate-view leakage. |
| `src/components/workshop/component-library/tree/LibraryTree.tsx` | Medium | May need tab-aware action copy or action suppression for Project rows. |
| `src/components/workshop/component-library/tree/TemplatesTree.tsx` | Medium | Copy collision only; avoid touching behavior. |
| `src/lib/component-library/project-component-projection.ts` | Medium | Projection contract should mostly stay unchanged, but tests may add fail-closed cases. |
| `src/components/workshop/EstimateSheetContent.tsx` | Medium | Lazy load and invalidation boundary; likely no code change unless cache split is introduced. |
| `src/lib/component-library/actions.ts` | Low/Medium | `loadProjectComponentLibraryLite` already returns needed data. Avoid changing unless tests prove the shape is wrong. |
| `src/lib/component-library/query-keys.ts` | Low/Medium | Existing lite key is already project-scoped. Avoid new keys in v1. |
| `tests/vitest/component-library-ui.test.tsx` | High | Locks current two-tab contract and Templates project-source behavior. |
| `tests/vitest/component-library-helpers.test.ts` | High | Currently expects project folders inside the component tree. |
| `tests/vitest/project-component-projection.test.ts` | Medium | Good place to guard strict inclusion/exclusion. |

## Main Bug Risks

### Duplicate Rows

Risk: project rows show in both Library and Project.

Mitigation:

- Split item arrays before tree building.
- Add a DOM test that Library tab is free of project-owned rows.
- Add helper tests for project tree only.

### Alternate View Leakage

Risk: filtering project rows only in the categories tree leaves them visible under suppliers, brands, or custom views.

Mitigation:

- Do not rely only on `buildProjectComponentFolderTree` inside categories.
- Filter `libraryItems` into tab-specific arrays before `buildLibraryTreeWithComponentRows`.

### Wrong Toolbar

Risk: Project tab inherits Library `Add folder`, `Add Component`, edit/delete/favorite actions without designed semantics.

Mitigation:

- Make toolbar/action contract explicit by active tab.
- Disable or hide destructive sidebar actions for Project tab in v1.

### Template Payload Mixup

Risk: Project component rows accidentally use Templates project-source insert/drag payloads.

Mitigation:

- Keep Project tab on `LibraryTree`/component payload path.
- Add tests for click, bulk, and drag payload if enabled.

### Cache Staleness

Risk: after making a linked row project-specific, the Project tab does not update.

Mitigation:

- Preserve `refetchProjectComponentProjection`.
- Add integration tests around make-project-specific success/failure.

### Label Collision

Risk: top-level `Project` and Templates `Project sources` mean different things.

Mitigation:

- Rename Templates filter/section copy.
- Keep Templates content under Templates.

## Dirty Worktree Precautions

The repository has active dirty work in adjacent Estimate Sheet and library files. Future implementation should:

- Snapshot `git status --short` before editing.
- Re-read each touched file immediately before patching.
- Keep patches small and scoped.
- Avoid broad formatting.
- Treat current edits as user or concurrent-agent work.
- Do not revert unrelated changes.

## Concurrency Guidance

Safe split for future implementation:

- One owner for `index.tsx` tab/render/state work.
- One owner for tree helper and projection tests.
- One owner for Templates copy/test updates.
- One verifier for DOM/test matrix.

Do not have multiple agents edit `src/components/workshop/component-library/index.tsx` at the same time.

