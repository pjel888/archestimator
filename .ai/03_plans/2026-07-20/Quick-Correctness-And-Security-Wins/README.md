# Quick Correctness And Security Wins

**Historical provenance only.** This pack is non-runnable and was superseded
without implementation by `.ai/03_plans/2026-07-31/Code-Improvement/`. The
original analysis remains for traceability; the successor is the sole current
execution authority.

## Historical unit disposition

| Unit | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| UNIT-001 | Fix Client Portal recipient re-verification lockout | P1 | S | — | SUPERSEDED → successor UNIT-002 |
| UNIT-002 | Make closed-beta gate fail closed when unset | — | — | — | SUPERSEDED → landed current source; successor UNIT-028 revalidation |
| UNIT-003 | Raise publication password minimum length | P1 | S | — | SUPERSEDED → successor UNIT-012 |
| UNIT-004 | Use timing-safe bearer comparison in proof routers | P1 | S | — | SUPERSEDED → landed current source; successor UNIT-028 revalidation |
| UNIT-005 | Stop flipping link state on benign row edits | P2 | S | — | SUPERSEDED → landed current source; successor UNIT-028 revalidation |
| UNIT-006 | Make AI Apply row+event writes atomic | P2 | S | — | SUPERSEDED → landed current source; successor UNIT-028 revalidation |
| UNIT-007 | Record cron-run event on upload-job queue failure | P2 | S | — | SUPERSEDED → landed current source; successor UNIT-028 revalidation |

Current status: all units `SUPERSEDED`; no implementation is claimed here.

## Historical disposition

- UNIT-001 is absorbed by successor `UNIT-002`.
- UNIT-003 is absorbed by successor `UNIT-012` as `SEC-014`.
- UNIT-002 and UNIT-004 through UNIT-007 landed in current source and are
  revalidated by successor `UNIT-028`; this predecessor does not claim their
  implementation.

## Findings considered and rejected

- **UNIT-002 (closed-beta fail-closed)** — SUPERSEDED. The shared worktree
  implemented the finding independently between authoring and the Improve-Plan
  reconcile with a superior runtime-aware design (`ARCHESTIMATOR_CF_RUNTIME`
  marker distinguishes Worker fail-closed from Node dogfooding; explicit
  `ARCHESTIMATOR_ALLOW_OPEN_BETA=1` kill-switch; plus a vitest at
  `tests/vitest/closed-beta-access.test.ts`). Recorded as DEC-AUTO-001. Do not
  re-implement.
- **ARCH-05 (component-library `load*` actions lack object-level authz)** —
  FALSE POSITIVE, closed in the 2026-07-21 deep authz trace. The action layer
  is thin (`requireCurrentUserContext()` only) but every `load*` action
  delegates into a repository function that scopes by `WHERE workspace_id = ?`
  bound from `ensureDefaultWorkspace()`. Verified proof chain:
  `loadCostLibraryComponentRowDetail(itemId)` → `getCurrentWorkspaceComponentRowDetail`
  → `getCurrentWorkspaceComponentRowsLibrary` → `loadWorkspaceCostLibraryItemRows`
  (`component-library-repository.ts:538-541`, SQL `WHERE workspace_id = ? AND id IN (...)`).
  An unscoped client `itemId` from another workspace returns 0 rows. No IDOR;
  no new unit needed. A non-blocking defense-in-depth observation: the
  convention-by-SQL-WHERE pattern is fragile if a future contributor adds a
  repo function that forgets the clause; an optional
  `assertWorkspaceComponentItem` probe at the action layer would convert this
  to type-enforced safety. Not required for correctness today.
- **Timing-safe comparison for the closed-beta allowlist RPC** — the allowlist
  check is a D1 lookup, not a string comparison. Not applicable.
- **Rate-limiting the publication password endpoint** — already rate-limited via
  Durable Object (`checkProjectPublicationPasswordRateLimit` at
  `src/app/api/share/[token]/password/route.ts:76`). UNIT-003 raises the entropy
  floor; the rate limit already exists.
- **Rotating any secret** — no secret values were reproduced in the audit. If a
  unit discovers a leaked credential it STOPS and surfaces it; rotation is an
  operator action outside this pack.

## Quality bar — check before finishing each unit

- Could a model that has never seen this repo execute the unit from
  `00-PLAN.md` + the unit file alone? All file paths and code excerpts inlined?
- Is every verification a command with an expected result, not a judgment?
- Does the unit name exact files and symbols, not "the relevant module"?
- Are the STOP conditions specific to the unit's actual risks?
- No secret values anywhere in the unit file.
