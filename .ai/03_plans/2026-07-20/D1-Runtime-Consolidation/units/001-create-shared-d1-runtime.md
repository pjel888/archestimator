# UNIT-001 — Create `src/lib/cloudflare/d1-runtime.ts` shared module

> **Historical provenance only — do not execute.** This unit is `SUPERSEDED`
> without implementation and refuted by successor `DEC-AUTO-007` in
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

## Goal

Create the single shared D1 runtime module that promotes `d1-intents/database.ts`'s
helpers + the scattered `placeholders`/`bindValues`/`readD1Json`/`readD1Boolean`/
`isMissingOptionalTable` family into one estimate-agnostic place. No callers
change in this unit — it only adds the module.

## Status

`SUPERSEDED` · historical dependency: (none) · requirement: `DATA-001` · risks: (none)

## Why this matters

Today the D1 query helpers live in `src/lib/estimates/d1-intents/database.ts`,
which is estimate-namespaced, so non-estimate modules (repositories, AI, etc.)
re-derive the same helpers locally. The signatures have drifted. This unit
creates the canonical home so UNIT-002 can migrate callers and UNIT-003 can
delete the wrapper duplication.

## Current state

The two source modules to consolidate FROM (read both fully before writing the
new one):

1. `src/lib/cloudflare/d1.ts` — exposes `getCloudflareD1Database` (acquisition
   only). This is the existing canonical acquisition helper. Keep it; the new
   module re-exports or composes it.

2. `src/lib/estimates/d1-intents/database.ts` — exposes (read for exact
   signatures):
   - `requireEstimateD1Database()` — acquisition + missing-binding throw
   - `firstD1Row<T>(database, sql, values)` — `.prepare(sql).bind(...values).first<T>()`
   - `allD1Rows<T>(database, sql, values)` — `.all<T>()` with success check
   - `runD1Statement(database, sql, values)` — `.run()` with success check
   - `runD1Batch(database, statements)` — `.batch([...])` with success check

3. The scattered helper family (read one copy from each, reconcile signatures):
   - `src/lib/repositories/workspace-repository.ts:401-432` — `placeholders`,
     `bindValues`, `all`, `first`, `readD1Json`, `readD1Boolean`, `isRecord`
   - `src/lib/repositories/component-library-repository.ts:349-377` + `:1921`
   - `src/lib/estimates/estimate-tree-read-repository.ts:143-203` — note its
     `readD1Json`/`readD1Boolean` differ in signature from the above (the drift)
   - `src/lib/estimates/d1-intents/{rows,bulk-sheets,history-events,tabs,nodes}.ts`
   - `src/lib/estimates/project-component-attachment-retention.ts:42`
   - `src/lib/estimates/express-promotion-actions.ts:829`

The drift to reconcile (RISK-001): `workspace-repository.ts`'s `readD1Json`
takes a record and returns parsed JSON with a default; `estimate-tree-read-repository.ts`'s
takes a raw value. The shared module must offer BOTH shapes (e.g.
`readD1JsonField(record, key, fallback)` and `parseD1JsonValue(raw, fallback)`)
so UNIT-002 can migrate each caller without behavior change.

## Owned paths / resources

- `src/lib/cloudflare/d1-runtime.ts` — CREATE.

## Implementation boundary

1. Read the two source modules fully. List every exported helper and its exact
   signature.
2. Read one copy of each scattered helper. Note the signature differences.
3. Create `src/lib/cloudflare/d1-runtime.ts` with:
   - `import "server-only";` at the top.
   - Re-export `getCloudflareD1Database` from `./d1` (or import and re-export).
   - A canonical `requireCloudflareD1Database()` (the consolidation target for
     UNIT-003). Throw `"Cloudflare D1 ARCH_DB binding is required."` on missing
     binding.
   - `firstD1Row<T>`, `allD1Rows<T>`, `runD1Statement`, `runD1Batch` — copied
     from `d1-intents/database.ts` verbatim (same SQL, same success checks).
   - `placeholders(count)` — returns `"?, ?, ..."` of length `count`; throws if
     `count === 0`.
   - `bindValues(record, keys)` — extracts the named keys from a record into a
     positional array (match the most general signature across the copies).
   - `parseD1JsonValue(raw, fallback)` and `readD1JsonField(record, key, fallback)`
     — both shapes, to cover the drift (RISK-001).
   - `readD1Boolean(raw)` and `readD1BooleanField(record, key)` — both shapes.
   - `isRecord(value)` — `value !== null && typeof value === "object" && !Array.isArray(value)`.
   - `isMissingOptionalTable(error)` — match the existing pattern (checks for
     the D1 "no such table" error string).
   - Types: export `D1DatabaseLike`, `D1Statement` (`{ sql: string; values?: unknown[] }`),
     `D1Value` from the existing type definitions (read `d1.ts` for the source).
4. Add JSDoc to each exported helper noting it is the canonical implementation
   and that local copies elsewhere are pending deletion (UNIT-002/UNIT-003).
5. **Do not change any existing file in this unit.** The new module is purely
   additive. `d1-intents/database.ts` continues to export its own helpers in
   this unit; UNIT-002 will migrate it to re-export from the new module.

## Commands you will need

| Purpose    | Command              | Expected on success |
|------------|----------------------|---------------------|
| Type-check | `bun run type-check` | exit 0, no errors   |
| Lint       | `bun run lint`       | exit 0              |

## Scope

**In scope:** `src/lib/cloudflare/d1-runtime.ts` (new file only).

**Out of scope:**
- Any change to `d1.ts`, `d1-intents/database.ts`, or any caller. Those are
  UNIT-002.
- Deletion of the 20 `requireXD1Database` wrappers. That is UNIT-003.
- The `formatPeso` family (formatting, not runtime).
- `ai/package-builder/apply.ts` local helpers (Pack D's territory).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `src/lib/cloudflare/d1-runtime.ts` exists with all helpers listed above
- [ ] The module starts with `import "server-only";`
- [ ] Both `readD1Json` shapes (raw-value and record-field) are present
- [ ] No existing file is modified (`git status --short` shows exactly one new file)

## Acceptance evidence

- The new file exists and type-checks in isolation.
- A grep confirms every helper family member is present:
  `rg "export (function|const) (requireCloudflareD1Database|firstD1Row|allD1Rows|runD1Statement|runD1Batch|placeholders|bindValues|parseD1JsonValue|readD1JsonField|readD1Boolean|readD1BooleanField|isRecord|isMissingOptionalTable)" src/lib/cloudflare/d1-runtime.ts`
  returns 14 matches.

## STOP conditions

- The drift between local helper signatures is wider than the two `readD1Json`
  shapes described (e.g. a third variant exists). Surface it; add the third
  shape rather than forcing a merge.
- A helper in the scattered copies has behavior beyond what is documented here
  (e.g. logging, tracing). Surface it; do not silently drop the behavior.
- The `D1DatabaseLike` / `D1Value` types are not where expected (`d1.ts`).
  Confirm the import path.

## Recovery

The unit is additive. The only failure mode is a missing helper discovered
during UNIT-002 — come back and add it here.

## Maintenance notes

- This module is the future home of request-scoped tracing and the read-replica
  switch. When those land, they layer ON TOP of `firstD1Row`/`allD1Rows`/
  `runD1Statement`/`runD1Batch`, not beside them.
- A reviewer should confirm the `requireCloudflareD1Database` error message is
  acceptable across all 20 caller contexts; if a caller needs more context, it
  catches and rethrows (UNIT-003 handles the migration).
- Pack D's `MutationIntent` primitives will compose `runD1Batch` from this
  module.
