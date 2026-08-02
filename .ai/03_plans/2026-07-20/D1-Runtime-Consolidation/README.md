# D1 Runtime Consolidation

**Historical provenance only.** This pack is non-runnable and was superseded
without implementation by `.ai/03_plans/2026-07-31/Code-Improvement/`.
Successor `DEC-AUTO-007` keeps `src/lib/cloudflare/d1.ts` as acquisition
authority and rejects the proposed broad runtime module, compatibility aliases,
and mass migration because domain query/codec semantics are intentionally
distinct.

## Historical unit disposition

| Unit | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| UNIT-001 | Create `src/lib/cloudflare/d1-runtime.ts` shared module | P1 | M | — | SUPERSEDED → refuted by successor DEC-AUTO-007 |
| UNIT-002 | Migrate ~10 repository/intent files to the shared module | P1 | M | UNIT-001 | SUPERSEDED → refuted by successor DEC-AUTO-007 |
| UNIT-003 | Collapse 20 `requireXD1Database` wrappers to one canonical | P2 | S | UNIT-001 | SUPERSEDED → refuted by successor DEC-AUTO-007 |

Current status: all units `SUPERSEDED`; no implementation is claimed here.

## Historical disposition

- All three units are refuted by current source and successor `DEC-AUTO-007`.
- D1 acquisition is already centralized while query and codec semantics remain
  intentionally domain-owned; the former dependency chain is non-runnable.

## Findings considered and rejected

- **`formatPeso` deduplication (8 files)** — out of scope; it is a formatting
  helper, not a D1 runtime primitive. A separate small cleanup can do it.
- **Adding request-scoped tracing to the D1 runtime** — future work this pack
  *enables*. Adding it now would expand scope and risk; do it as a follow-up
  once the consolidation lands.
- **Migrating `ai/package-builder/apply.ts` helpers in UNIT-002** — deliberately
  deferred to Pack D, which rewrites that file's write path anyway. Migrating it
  here then rewriting it there is wasted effort.

## Quality bar — check before finishing each unit

- Could a model that has never seen this repo execute the unit from `00-PLAN.md`
  + the unit file alone?
- Does every migration step keep `bun run type-check` green?
- Is the deletion list in UNIT-003 verified by grep, not by memory?
- No SQL text or business logic changed (`git diff` shows only import swaps +
  helper deletions).
- The shared module is the single source of truth: `rg "function placeholders\|function bindValues\|function readD1Json" src/lib` returns matches ONLY in `d1-runtime.ts` after UNIT-002.
