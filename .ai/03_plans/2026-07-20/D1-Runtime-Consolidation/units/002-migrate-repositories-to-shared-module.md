# UNIT-002 — Migrate ~10 repository/intent files to the shared D1 runtime

## Goal

Replace the local `placeholders`/`bindValues`/`all`/`first`/`readD1Json`/
`readD1Boolean`/`isRecord` helper copies in ~10 files with imports from the new
`src/lib/cloudflare/d1-runtime.ts`. One file at a time, `type-check` after each.

## Status

`READY` · depends on: `UNIT-001` · requirement: `DATA-001` · risks: `RISK-001`

## Why this matters

The local copies have drifted (`readD1Json`/`readD1Boolean` signatures differ
between `workspace-repository.ts` and `estimate-tree-read-repository.ts`). Every
D1 schema or error-class change must be repeated in N places; a bug fix in one
copy does not propagate. This unit collapses them onto the canonical module so
there is one place to maintain.

## Current state

The files with local helper copies (one of these per migration sub-step):

| # | File | Local helpers | Approx lines |
|---|------|---------------|--------------|
| 1 | `src/lib/repositories/workspace-repository.ts` | `placeholders`, `bindValues`, `all`, `first`, `readD1Json`, `readD1Boolean`, `isRecord` | 401-432 |
| 2 | `src/lib/repositories/component-library-repository.ts` | same set + a second copy at `:1921` | 349-377, 1921 |
| 3 | `src/lib/estimates/estimate-tree-read-repository.ts` | same set, **drifted signatures** | 143-203 |
| 4 | `src/lib/repositories/project-activity-feed-repository.ts` | subset | 205-224 |
| 5 | `src/lib/repositories/project-activity-repository.ts` | subset | 113 |
| 6 | `src/lib/repositories/project-charts-repository.ts` | subset | 370-376 |
| 7 | `src/lib/repositories/estimate-health-repository.ts` | subset | 177-178 |
| 8 | `src/lib/estimates/d1-intents/rows.ts` | subset | (top of file) |
| 9 | `src/lib/estimates/d1-intents/bulk-sheets.ts` | subset | (top of file) |
| 10 | `src/lib/estimates/d1-intents/history-events.ts` | subset | (top of file) |
| 11 | `src/lib/estimates/d1-intents/tabs.ts` | subset | (top of file) |
| 12 | `src/lib/estimates/d1-intents/nodes.ts` | subset | (top of file) |
| 13 | `src/lib/estimates/project-component-attachment-retention.ts` | subset | 42 |
| 14 | `src/lib/estimates/express-promotion-actions.ts` | subset | 829 |

The canonical source for the replacement is `src/lib/cloudflare/d1-runtime.ts`
(created in UNIT-001).

The drifted file (#3, `estimate-tree-read-repository.ts`) is the highest-risk
migration: its `readD1Json`/`readD1Boolean` take raw values where
`workspace-repository.ts`'s take records. UNIT-001 added both shapes to the
shared module (`parseD1JsonValue`/`readD1JsonField`,
`readD1Boolean`/`readD1BooleanField`); pick the right one per call site.

**Out of scope for this unit:** `src/lib/ai/package-builder/apply.ts` — Pack D
rewrites that file's write path; migrating its helpers here then rewriting them
there is wasted effort. Leave the `apply.ts` fork in place.

## Owned paths / resources

The ~14 files in the table above. One sub-step per file.

## Implementation boundary

For **each** file (do them one at a time, `type-check` after each):

1. Reread the file's local helper block. Confirm it matches what is in the table.
2. Add the import: `import { firstD1Row, allD1Rows, runD1Statement, runD1Batch, placeholders, bindValues, parseD1JsonValue, readD1JsonField, readD1Boolean, readD1BooleanField, isRecord, isMissingOptionalTable } from "@/lib/cloudflare/d1-runtime";`
   (only the names the file actually uses — keep the import minimal).
3. For each local helper name that the file defines, **rename or delete**:
   - If the shared module's signature matches the local one exactly, delete the
     local definition and let the import satisfy callers.
   - If the local helper's signature differs (the drift), rename the local call
     sites to the matching shared helper (`parseD1JsonValue` vs
     `readD1JsonField`, etc.) and delete the local definition.
   - If the local helper has a quirk the shared module does not cover, STOP —
     extend the shared module in UNIT-001 first (this is the RISK-001 escape
     hatch).
4. Run `bun run type-check`. Fix any breakage (almost always a renamed call
     site).
5. Commit conceptually (do not actually commit unless asked) and move to the
   next file.

**Special case — `d1-intents/database.ts` itself:** this file currently exports
`requireEstimateD1Database`/`firstD1Row`/`allD1Rows`/`runD1Statement`/`runD1Batch`.
Replace its implementations with re-exports from `d1-runtime`:

```ts
export { firstD1Row, allD1Rows, runD1Statement, runD1Batch } from "@/lib/cloudflare/d1-runtime";
export const requireEstimateD1Database = requireCloudflareD1Database;
```

(Keep the `requireEstimateD1Database` name as a thin alias so existing
`d1-intents` callers don't need a mass rename in this unit — that is UNIT-003's
job for the broader codebase. Import `requireCloudflareD1Database` from
`d1-runtime`.)

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check (per file) | `bun run type-check` | exit 0 after each file |
| Lint (final) | `bun run lint` | exit 0 |
| Audit (final) | `rg "function placeholders\|function bindValues\|function readD1Json\|function readD1Boolean" src/lib` | matches ONLY in `src/lib/cloudflare/d1-runtime.ts` |

## Scope

**In scope:** the ~14 files in the table, plus `src/lib/estimates/d1-intents/database.ts`
(re-export refactor).

**Out of scope:**
- `src/lib/ai/package-builder/apply.ts` — Pack D.
- `src/lib/ai/package-builder/read-tools.ts` — has its own helpers; migrate only
  if trivially covered by the shared module, otherwise defer to Pack D.
- `formatPeso` dedup — formatting, not runtime.
- The 20 `requireXD1Database` wrappers — UNIT-003.
- Any SQL text or business logic change.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `rg "function placeholders|function bindValues|function readD1Json|function readD1Boolean" src/lib` returns matches ONLY in `src/lib/cloudflare/d1-runtime.ts`
- [ ] `src/lib/estimates/d1-intents/database.ts` re-exports from `d1-runtime` (no local implementations)
- [ ] No SQL text changed in any migrated file (`git diff` shows import additions + helper deletions only)
- [ ] `src/lib/ai/package-builder/apply.ts` is NOT touched

## Acceptance evidence

- The grep audit returns only the shared module.
- `git diff --stat` shows the ~14 files + `database.ts` changed, plus the
  new module from UNIT-001.
- A spot-check: read 3 migrated files and confirm the local helper block is gone
  and the import is present.

## STOP conditions

- A local helper has behavior the shared module does not cover (RISK-001). STOP
  the current file, extend the shared module in UNIT-001, then resume.
- A migrated file's `type-check` fails in a way that implies a real behavior
  difference (not just a renamed call site). Revert that file and surface the
  finding — the drift may be load-bearing.
- The `apply.ts` file appears to share helpers with a file in scope (e.g.
  `read-tools.ts` imports from `apply.ts`). If so, defer BOTH to Pack D rather
  than half-migrating.

## Recovery

Each file migration is independent and reversible. If a file breaks, revert just
that file (`git checkout -- <file>`) and move on; come back to it after
extending the shared module.

## Maintenance notes

- After this unit, the single source of truth for D1 query helpers is
  `d1-runtime.ts`. Any new helper goes there, not in a local copy.
- A reviewer should spot-check the drifted file (#3) carefully — it is the one
  place a behavior change could hide.
- Pack D will build `MutationIntent` on top of `runD1Batch` from this module;
  the consolidation makes that composition clean.
