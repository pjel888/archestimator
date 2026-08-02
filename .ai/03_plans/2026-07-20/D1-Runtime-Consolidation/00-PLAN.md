# D1 Runtime Consolidation — Historical Predecessor Plan

> **Historical provenance only — do not execute.** This predecessor was
> superseded without implementation by
> `.ai/03_plans/2026-07-31/Code-Improvement/`, the sole current execution
> authority. Successor `DEC-AUTO-007` rejects the broad runtime relocation and
> mass-migration design; the original analysis remains below as source evidence.

## Status tuple

`NOT_READY / NOT_STARTED / NOT_EVALUATED / N/A / CANCELLED`

- **Baseline HEAD:** `b8ec0edf3a144bcb49c2b5971a168ed30aecf2ab` (2026-07-20)
- **Suite version:** `2026-07-12`
- **Profile:** `standard` (one new shared module + mechanical migration of ~10 repo files + deletion of 20 wrappers)
- **Action ceiling:** `IMPLEMENT_LOCAL` (historical boundary only; this pack has no runnable unit)
- **Exact next unit:** none; continue only in `.ai/03_plans/2026-07-31/Code-Improvement/`

## 1. Outcome and intent

The codebase has a coherent *intended* D1 layering but it is enforced by
convention only, and the shared primitives have been re-implemented in ~10
modules. Today:

- `src/lib/cloudflare/d1.ts` exposes only `getCloudflareD1Database` (acquisition).
- `src/lib/estimates/d1-intents/database.ts` exposes `firstD1Row`/`allD1Rows`/
  `runD1Statement`/`runD1Batch`/`requireEstimateD1Database` (query helpers) — but
  only the estimate intents use them.
- ~10 other modules (`repositories/workspace-repository.ts:401-432`,
  `repositories/component-library-repository.ts:349-377`,
  `estimates/estimate-tree-read-repository.ts:143-203`, and ~7 more) each
  redefine `placeholders`, `bindValues`, `all`, `first`, `readD1Json`,
  `readD1Boolean`, `isRecord`, `formatPeso`. **The signatures have drifted**:
  `workspace-repository.ts` and `estimate-tree-read-repository.ts` define
  `readD1Json`/`readD1Boolean` differently from the `d1-intents` versions.
- 20 modules each define a private `async function requireXD1Database()` that
  wraps the same `getCloudflareD1Database()` and throws a module-specific error
  message.

This pack:

1. Promotes the `d1-intents/database.ts` helpers + the scattered
   `placeholders`/`bindValues`/`readD1Json`/`readD1Boolean`/`isMissingOptionalTable`
   family into a single `src/lib/cloudflare/d1-runtime.ts` (estimate-agnostic).
2. Migrates the ~10 repositories/intents to import from the shared module,
   removing their local copies one file at a time behind `type-check`.
3. Deletes the 20 `requireXD1Database` wrappers in favor of one
   `requireCloudflareD1Database`.

Result: one deep module, ~20 callers collapsed onto it. This is the textbook
"deep module" win, the natural prerequisite to Pack D (which will compose these
primitives into `MutationIntent`), and the place where a future request-scoped
tracing or read-replica switch would land.

## 2. Task Contract

- **Objective:** consolidate the D1 runtime into one shared module with zero
  observable behavior change. Every migration step keeps the codebase green.
- **Scope:** `src/lib/cloudflare/d1.ts` (extended or sibling `d1-runtime.ts`),
  `src/lib/estimates/d1-intents/database.ts` (re-export from the new module), and
  the ~10 repository/intent files that have local helper copies, plus the 20
  files with private `requireXD1Database` wrappers.
- **Exclusions:** Pack D's `MutationIntent` extraction. Pack B's test baselines.
  Any change to the SQL itself or the business logic. The floating-point total
  fix (audit finding #8) — separate concern.
- **Authority:** `AGENTS.md`, current source, `.ai/00_system`, and
  `.ai/03_plans/2026-07-31/Code-Improvement/`; this pack is historical only.
- **Owner:** none; all three predecessor units are `SUPERSEDED` under successor
  `DEC-AUTO-007`.
- **Test authorization:** `NOT_REQUIRED`. The migration is mechanical; type-check
  is the gate. (Pack B's UNIT-002 characterizes `rows.ts` if a deeper net is
  wanted, but it is not a hard prerequisite here because this pack does not
  change generated SQL — only where the helpers live.)
- **Stop condition:** all three units VERIFIED; `rg "async function require[A-Za-z]*D1Database"`
  returns only the canonical wrapper; the validator passes.

## 3. Repo conventions executors must match

- **Module placement:** shared cloudflare-runtime code lives in
  `src/lib/cloudflare/`. The new module is `src/lib/cloudflare/d1-runtime.ts`.
- **Import style:** `import { ... } from "@/lib/cloudflare/d1-runtime"`. Match
  the existing `@/lib/cloudflare/d1` import paths.
- **`server-only` guard:** D1-touching modules start with `import "server-only";`
  (see `src/lib/estimates/action-rate-limit.ts:1`, `d1-intents/database.ts`).
  The new module must too.
- **Error messages:** the existing wrappers throw module-specific messages
  (`"Cloudflare D1 ARCH_DB binding is required for package Apply."`, etc.). The
  consolidated `requireCloudflareD1Database` throws a single canonical message;
  callers that need context-specific errors can catch and rethrow, but the
  default is fine for almost all sites.
- **Verification:**
  - `bun run type-check` (the primary gate — every migration step must pass it)
  - `bun run lint`
- **No compatibility shims:** AGENTS.md says fix forward. Do not leave the old
  copies in place "for now" — the unit is done when they are deleted.

## 4. Requirements → units → evidence map

| REQ | Title | Units | Evidence |
|-----|-------|-------|----------|
| DATA-001 | Shared D1 runtime module exists and is imported by all D1 callers | UNIT-001, UNIT-002 | EVID-001, EVID-002 |
| DATA-002 | Single `requireCloudflareD1Database` replaces 20 wrappers | UNIT-003 | EVID-003 |

## 5. Dependency order

`UNIT-001` (create module, no callers changed) → `UNIT-002` (migrate the ~10
repository/intent files one-by-one) → `UNIT-003` (delete the 20 wrappers).
Strictly sequential — each builds on the previous. The codebase must stay green
between units.

## 6. Risks

- **RISK-001** (UNIT-002): the signature drift between local `readD1Json`/
  `readD1Boolean` copies means some call sites rely on the local variant's
  quirks (record vs raw JSON, fallback defaults). Migration must preserve each
  caller's observable behavior, even if the local helper's signature was "wrong."
  Mitigation: UNIT-002 migrates one file at a time with `type-check` after each;
  if a caller breaks, reconcile the signature (extend the shared helper to cover
  the local variant's cases) rather than changing the caller.
- **RISK-002** (UNIT-003): some `requireXD1Database` wrappers may have
  non-trivial bodies (e.g. dev-auth-bypass integration, tracing). Mitigation:
  UNIT-003 audits each wrapper's body before deletion; any wrapper with extra
  logic is migrated, not deleted.
- **RISK-003** (cross-unit): the `formatPeso` duplication (8 files) is adjacent
  but NOT part of this pack — it is a formatting helper, not a D1 runtime
  primitive. Do not expand scope into it.

## 7. Anti-scope (do NOT do)

- Do not change any SQL text, bind values, or business logic.
- Do not add request-scoped tracing or a read-replica switch (future work that
  the new module *enables* but does not require).
- Do not touch the floating-point `computeEstimateRowLineTotal` (audit #8).
- Do not migrate the `ai/package-builder/apply.ts` local helpers — that file is
  Pack D's target; leave its fork in place for now (UNIT-002 lists it as
  explicitly out of scope).
- Do not add tests (gate is `NOT_REQUIRED`).
