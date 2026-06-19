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
- [ ] Targeted Vitest: `projects-page-*` + workspace-repository.
- [ ] `bun run build`.
- [ ] Adversarial review (performance + correctness) — findings triaged.
- [ ] `git diff --check`.

(Verification rows flipped to [x] with evidence as they pass; see commit/notes.)

## Open follow-ups (tracked, not done)
- Phase 2: stabilize card props → `React.memo` → `useDeferredValue` search →
  render-count gate.
- Phase 3: large-data fixture → virtualization → `select` trim + `next/image` →
  DB index candidates.
- Re-run multi-run authed Lighthouse to confirm LCP/Slow-3G gaps close.
