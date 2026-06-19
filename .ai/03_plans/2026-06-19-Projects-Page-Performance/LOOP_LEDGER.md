# LOOP LEDGER — Projects Page Performance

Append-only. Newest at the bottom of each section.

## Goal
Make `/workshop/projects` load fast, with an evidence-backed plan and verified
implementation of the high-confidence wins.

## Decisions
- **D-01** Scope Phase 1 to the two load-path causes (data-tail serialization,
  eager images). Memo / virtualization / search-deferral deferred with gates —
  faking them would reduce quality (memo can't bind without prop restructuring;
  search-deferral churns 5 test files for a secondary win). Rationale in
  `01_DIAGNOSIS.md`.
- **D-02** Wrap `listCurrentWorkspaceProjects` in `cache()` (matches sibling
  helpers) rather than leaving it uncached.
- **D-03** Did NOT trim `select('*')` — the full `project` object flows to the
  client; needs a column-usage audit (Phase 3).
- **D-04** Absorbed the projects-page slice of `2026-06-17-Performance-Refactor`
  Phase 6 (LiveProjectCard memo) into this pack's Phase 2 — that phase never
  started.

## Phase 1 — execution log

### Changes
- `src/lib/repositories/workspace-repository.ts`
  - `listCurrentWorkspaceProjects` → `cache(async () => …)`.
  - Wave 2: `sharedProjects` ∥ `favoriteEstimateSheets` via `Promise.all`
    (`null` query skips the round-trip for empty inputs).
  - Wave 3: `readOptionalProjectPublications` ∥
    `readPendingCollaborationVisibilitySummary` via `Promise.all`.
  - Return shape, error semantics, ordering unchanged.
- `src/components/workshop/LiveProjectCard.tsx`
  - Thumbnail `<img>` gains `loading="lazy"` + `decoding="async"`.

### Verification
- [x] `bun run type-check` → exit 0 (2026-06-19).
- [x] `bun run build` → exit 0 (real gate for the data-layer change).
- [x] Targeted Vitest: `workshop-favorites-schema` + `workshop-project-groups-repository`
  → 8/8 PASS after test-anchor fix; `projects-page-*` + `ensure-default-workspace-cache`
  → 83 pass. (1 unrelated red, see below.)
- [x] Adversarial review (performance + correctness). Both confirm runtime behavior
  is byte-for-byte equivalent: each `Promise.all` wave is genuinely independent,
  error semantics preserved, `null`-query short-circuit reproduces old empty behavior,
  `cache()` is request-scoped and matches sibling helpers. One low-confidence note:
  `loading="lazy"` *could* deprioritize an above-the-fold LCP image — mitigated (small
  tiles, optional images, header chrome is likely LCP); flagged for the Lighthouse
  re-measure rather than over-engineering per-index `fetchpriority` now.
- [x] `git diff --check` clean on touched files.

### Required follow-up edit (caused by the `cache()` rename)
Two brittle **source-string** tests anchored on the old `export async function`
declaration and had to be updated to `export const listCurrentWorkspaceProjects = cache(`:
`tests/vitest/workshop-favorites-schema.test.ts` and
`tests/vitest/workshop-project-groups-repository.test.ts`. Both green after the fix.
(These two edits are in the working tree; the perf changes themselves are already committed.)

### Multi-agent commit note (vigilance)
A concurrent agent auto-committed during this session and swept my working-tree edits
into real commits: `f54754a4` (data-layer parallelize+cache), `165adfad` (carries the
lazy `<img>`), `d2a23887` (this plan pack). Verified HEAD contains my changes coherently
(cache wrap, wave-2 `sharedProjectsQuery`, wave-3 markers). No work lost; no orphaned stashes.

### Known unrelated red (NOT this pack)
`tests/vitest/projects-page-view-mode.test.tsx` "defaults to large cards…" fails on
`toHaveClass("workshop-project-card-glass")` — owned by the concurrent liquid-glass
commit `165adfad`, unrelated to the perf changes (image attrs don't affect that class).
Also pre-existing: `tests/vitest/workspace-repository-project-list.test.ts` (asserts
symbols that don't exist in the file; fails with the perf changes stashed too).

## Open follow-ups (tracked, not done)
- Phase 2: stabilize card props → `React.memo` → `useDeferredValue` search →
  render-count gate.
- Phase 3: large-data fixture → virtualization → `select` trim + `next/image` →
  DB index candidates.
- Re-run multi-run authed Lighthouse to confirm LCP/Slow-3G gaps close.
