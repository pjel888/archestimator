# Plan 025: Split `workspace-repository.ts` into focused sibling modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/repositories/workspace-repository.ts`
> If it changed since this plan was written, compare the export list in
> "Current state" against the live code; on a mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 001 (verify baseline recommended)
- **Category**: tech-debt
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

`src/lib/repositories/workspace-repository.ts` is 3713 lines mixing 7 concerns:
workspace bootstrap, project listing, publication-snapshot staleness, collaboration-
role mapping, project-access resolution, pending-invite construction, and homebase
aggregation. Any cross-cutting change forces opening the single largest repository
file, which is on the workshop hot path. The 9-file `src/lib/estimates/d1-intents/`
split (averaging ~580 lines each, one domain per file) shows the team already
knows this pattern. This plan extracts sibling modules and re-exports from the
barrel so **no public API changes** — only internal import paths move. Pure
module reorganization, LOW risk.

## Current state

`src/lib/repositories/workspace-repository.ts` exports (verified, partial list —
read the file for the full set before editing):

```
readPublicationSnapshotStaleness          (line 1091)   — publication readers
readLatestPublicationActivityTimestamp    (line 1221)   — publication readers
ensureDefaultWorkspace                    (line 1406)   — bootstrap (cache-wrapped)
listCurrentWorkspaceProjects             (line 1474)   — project listing (cache)
listCurrentWorkspaceProjectClientNames   (line 1480)   — project listing (cache)
getWorkshopHomebaseData                  (line 1810)   — homebase aggregation
isWorkspaceHomebaseSummaryRolloutError   (line 1822)   — homebase helpers
parseWorkshopHomebaseSummaryPayload      (line 2099)   — homebase helpers
parseWorkshopProjectsSummaryPayload      (line 2113)   — homebase helpers
parseMainSidebarFavoriteProjectsPayload  (line 2133)   — homebase helpers
listMainSidebarFavoriteProjects          (line 2439)   — sidebar favorites (cache)
getCurrentWorkspaceProject               (line 2662)   — project access (cache)
getCurrentWorkspaceProjectForEstimate    (line 2681)   — project access (cache)
getProjectCollaborationSummary           (line 2748)   — collaboration roles
getProjectPublicationSummary             (line 3007)   — publication readers (cache)
listProjectEstimates                     (line 3098)   — project listing
listProjectEstimateSheets                (line 3211)   — project listing
getEstimateTabs / resolveEstimateEditCapability / ...  (lines 3323+) — estimate trees
```

Note the `cache(async function ...)` wrappers — they create import-time side
effects. Keep them on the extracted functions verbatim.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Typecheck | `bun run type-check`             | exit 0              |
| Verify    | `bun run verify`                 | all pass            |

## Scope

**In scope** (the only files you should modify/create):
- `src/lib/repositories/workspace-repository.ts` — becomes a barrel that
  re-exports from the new siblings + retains bootstrap logic.
- Create siblings (exact names flexible, but keep them focused):
  - `src/lib/repositories/workspace-publication-readers.ts` — `readPublicationSnapshotStaleness`, `readLatestPublicationActivityTimestamp`, `getProjectPublicationSummary`.
  - `src/lib/repositories/workspace-project-access.ts` — `getCurrentWorkspaceProject`, `getCurrentWorkspaceProjectForEstimate`, related access resolvers.
  - `src/lib/repositories/workspace-collaboration-roles.ts` — `getProjectCollaborationSummary`, role mappers.
  - `src/lib/repositories/workspace-homebase.ts` — `getWorkshopHomebaseData`, the `parse*Payload` helpers, `isWorkspaceHomebaseSummaryRolloutError`.
  - (Optional) `workspace-projects.ts` for `listCurrentWorkspaceProjects` / `listProjectEstimates` / `listProjectEstimateSheets` / `listMainSidebarFavoriteProjects` if the barrel would otherwise stay too large.

**Out of scope**:
- Any public API change — all exports keep the same names and shapes.
- Callers across the repo — they keep importing from `@/lib/repositories/workspace-repository`
  (the barrel re-exports). Only internal-to-the-repo import paths move.
- The `cache()` wrappers — preserve verbatim on the extracted functions.
- `getCurrentWorkspaceComponentRowsLibrary` and component-library helpers — they
  may live in this file too; if so, they belong in a `workspace-component-library`
  sibling or stay in the barrel. Decide based on cohesion, not line-count.

## Git workflow

- Branch: `advisor/025-split-workspace-repository`.
- One commit per sibling extraction (each independently revertible).
- Commit message: `refactor(repositories): extract <sibling> from workspace-repository`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Extract one sibling at a time, re-export from the barrel

For each sibling (publication-readers first — it's the most self-contained):

1. Create the new file under `src/lib/repositories/`.
2. Move the relevant exported functions (and their private helpers, types, and
   imports) into it. Preserve the `cache(async function ...)` wrapper exactly.
3. In `workspace-repository.ts`, replace the moved definitions with
   `export { ... } from "./workspace-<sibling>";` re-exports.
4. Run `bun run type-check` — it should pass with no changes anywhere else,
   because the barrel re-exports preserve the public API.

**Verify**: `bun run type-check` → exit 0 after EACH sibling.

### Step 2: Run the full gate after each extraction

**Verify**: `bun run verify` → exit 0 after EACH sibling.

Because this is pure reorganization with a preserved public API, tests should
not change at all. If a test breaks, you accidentally changed an export name or
shape — revert and re-extract carefully.

### Step 3: Final barrel cleanup

Once the siblings are extracted, `workspace-repository.ts` should contain:
- workspace bootstrap (`ensureDefaultWorkspace`),
- any remaining glue / shared private helpers used across siblings,
- a block of `export { ... } from "./workspace-<sibling>";` re-exports.

If the barrel is still >~1000 lines after extraction, extract another sibling
(the projects-listing group is the likely candidate).

**Verify**: `bun run type-check` + `bun run verify` → exit 0.

## Test plan

No new tests (pure reorganization). Existing tests must pass unchanged — that's
the evidence the public API is preserved.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `wc -l src/lib/repositories/workspace-repository.ts` → notably smaller
      (target: under ~1500 lines, ideally ~1000)
- [ ] At least 3 focused sibling files exist under `src/lib/repositories/workspace-*.ts`
- [ ] No public export names/shapes changed (the barrel re-exports everything)
- [ ] `grep -rn "from \"@/lib/repositories/workspace-repository\"" src/` call sites
      are unchanged (they still import from the barrel)
- [ ] No files outside `src/lib/repositories/` are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- A function you're extracting shares private state (module-level mutable, a
  shared cache key builder, etc.) with a function staying in the barrel —
  extract the shared helper into a small `workspace-shared.ts` and import from
  both, or report if it's genuinely coupled.
- A `cache()` wrapper breaks when moved (e.g. it closes over a module-level
  value defined elsewhere) — report; keep that function in the barrel.
- An extraction causes `bun run verify` to fail in a way that isn't fixed by
  adjusting the re-export list — revert and report.

## Maintenance notes

- After this lands, cross-cutting changes touch smaller files. The barrel keeps
  external imports stable, so no caller changes were needed.
- The `cache()` wrappers' import-time side effects are preserved — but a future
  improvement could lazy-init them; out of scope here.
- Reviewer: confirm (a) no public export name/shape changed, (b) `cache()`
  wrappers are preserved verbatim, (c) `bun run verify` passes with zero test
  changes (the strongest evidence of a clean reorganization).
