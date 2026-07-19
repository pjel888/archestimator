# Plan 002: Make the D1 batch helpers hard-throw on non-atomic databases

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/estimates/d1-intents/database.ts src/lib/cloudflare/d1.ts src/lib/estimates/express-promotion-actions.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (independent of plan 001)
- **Category**: correctness / tech-debt
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

Multi-statement D1 write intents (the `*WithHistory` pattern in
`src/lib/estimates/d1-intents/`) rely on `runD1Batch` / `runPreparedD1Batch`
for atomicity. But when `database.batch` is absent, both helpers silently fall
back to **sequential, non-atomic** execution with no rollback on partial
failure. Five other batch sites in the repo (`bulk-sheets.ts`,
`reusable-sources/actions.ts`, `project-component-attachment-retention.ts`, the
intent layer's own `rows.ts`, and a duplicated `runBatch` in
`express-promotion-actions.ts`) already hard-throw on the missing-capability
case. This plan makes the two canonical helpers consistent with that winner
policy, and deletes the divergent duplicate in `express-promotion-actions.ts`.

On real Cloudflare D1 `.batch` is always present, so production is unaffected.
The real benefit: test doubles that omit `.batch` will now fail loudly instead
of passing under a non-atomic shadow — so multi-write intents can be tested
honestly, and partial-failure tests become writable.

## Current state

`src/lib/estimates/d1-intents/database.ts:70-111` (verbatim, verified):

```ts
export async function runD1Batch(
  database: D1DatabaseLike,
  statements: readonly D1IntentStatement[],
): Promise<void> {
  if (statements.length === 0) return;
  if (database.batch) {
    const results = await database.batch(statements.map((statement) => prepareStatement(database, statement)));
    if (results.some((result) => result.success === false)) {
      throw new Error("Cloudflare D1 estimate action batch failed.");
    }
    return;
  }
  for (const statement of statements) {
    await runD1Statement(database, statement.sql, statement.values);
  }
}

export async function runPreparedD1Batch(
  database: D1DatabaseLike,
  statements: readonly D1IntentStatement[],
  preparedStatements: readonly D1PreparedStatementLike[],
): Promise<void> {
  if (preparedStatements.length === 0) {
    await runD1Batch(database, statements);
    return;
  }
  if (database.batch) {
    const results = await database.batch([
      ...statements.map((statement) => prepareStatement(database, statement)),
      ...preparedStatements,
    ]);
    if (results.some((result) => result.success === false)) {
      throw new Error("Cloudflare D1 estimate action batch failed.");
    }
    return;
  }
  await runD1Batch(database, statements);
  for (const statement of preparedStatements) {
    const result = await statement.run();
    if (result.success === false) throw new Error("Cloudflare D1 estimate action write failed.");
  }
}
```

The winner pattern (hard-throw) is already used at `src/lib/estimates/d1-intents/bulk-sheets.ts:120-122`:

```ts
if (!database.batch) throw new Error("Atomic estimate sheet bulk deletion is unavailable.");
```

`src/lib/cloudflare/d1.ts:22` declares `batch?` optional on `D1DatabaseLike`,
and `isD1Database` (lines 31-33) only checks for `.prepare`, so a test double
that omits `.batch` currently takes the silent non-atomic path.

The duplicated helper in `src/lib/estimates/express-promotion-actions.ts:839-850`
(verified):

```ts
async function runBatch(database: D1DatabaseLike, statements: Array<{ sql: string; values?: D1Value[] }>) {
  // ...
  if (!database.batch) {
    throw new Error("...");  // already hard-throws — good, but duplicates database.ts
  }
  const results = await database.batch(/* ... */);
  // ...
}
```

Repo convention for the throw message: short, specific, names the capability.
Match `bulk-sheets.ts` tone. Example commit style from `git log`: conventional
commits (`fix(estimates): ...`).

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `bun install`                    | exit 0              |
| Typecheck | `bun run type-check`             | exit 0, no errors   |
| Tests     | `bun run verify`                 | all pass (if available; else `bun run type-check && bun test tests/unit && bun run test:dom`) |

## Scope

**In scope** (the only files you should modify):
- `src/lib/estimates/d1-intents/database.ts` — collapse the fallback branches.
- `src/lib/estimates/express-promotion-actions.ts` — replace local `runBatch`
  with the imported `runD1Batch`.

**Out of scope** (do NOT touch):
- `src/lib/cloudflare/d1.ts` — leave `D1DatabaseLike.batch?` optional for now.
  Making it required is a larger change touching every test double; the
  hard-throw inside the helpers achieves the safety goal without forcing every
  mock to implement `.batch`. (If you find a test double that genuinely needs
  non-atomic sequential execution, that is a STOP condition — surface it.)
- The 5 other hard-throw sites — they already match the winner pattern.
- Any caller of `runD1Batch` / `runPreparedD1Batch` — none need changes; they
  already assume atomicity.

## Git workflow

- Branch: `advisor/002-d1-batch-hard-throw`.
- Commit message: `fix(estimates): make D1 batch helpers hard-throw on non-atomic databases`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Collapse the fallback in `runD1Batch`

In `src/lib/estimates/d1-intents/database.ts`, replace the body of `runD1Batch`
so it hard-throws when `database.batch` is missing, instead of looping. Keep the
empty-statements short-circuit and the success-check throw.

Target shape:

```ts
export async function runD1Batch(
  database: D1DatabaseLike,
  statements: readonly D1IntentStatement[],
): Promise<void> {
  if (statements.length === 0) return;
  if (!database.batch) {
    throw new Error("Atomic D1 estimate batch requires database.batch support.");
  }
  const results = await database.batch(statements.map((statement) => prepareStatement(database, statement)));
  if (results.some((result) => result.success === false)) {
    throw new Error("Cloudflare D1 estimate action batch failed.");
  }
}
```

**Verify**: `bun run type-check` → exit 0.

### Step 2: Collapse the fallback in `runPreparedD1Batch`

Same file, replace the trailing fallback branch. The `preparedStatements.length === 0`
delegation to `runD1Batch` stays (it now hard-throws via step 1). Remove the
final `await runD1Batch(...); for (...) statement.run();` block.

Target shape:

```ts
export async function runPreparedD1Batch(
  database: D1DatabaseLike,
  statements: readonly D1IntentStatement[],
  preparedStatements: readonly D1PreparedStatementLike[],
): Promise<void> {
  if (preparedStatements.length === 0) {
    await runD1Batch(database, statements);
    return;
  }
  if (!database.batch) {
    throw new Error("Atomic D1 estimate batch requires database.batch support.");
  }
  const results = await database.batch([
    ...statements.map((statement) => prepareStatement(database, statement)),
    ...preparedStatements,
  ]);
  if (results.some((result) => result.success === false)) {
    throw new Error("Cloudflare D1 estimate action batch failed.");
  }
}
```

**Verify**: `bun run type-check` → exit 0.

### Step 3: Delete the duplicate `runBatch` in `express-promotion-actions.ts`

In `src/lib/estimates/express-promotion-actions.ts`:
1. Ensure `runD1Batch` is imported from `@/lib/estimates/d1-intents/database`
   (check the existing import block near the top of the file; add it if missing).
2. Delete the local `async function runBatch(...)` definition (around line 839).
3. Replace the single call site `await runBatch(database, promotionStatements)`
   (around line 1478) with `await runD1Batch(database, promotionStatements)`.
   - Note: `runBatch`'s local type was `Array<{ sql: string; values?: D1Value[] }>`,
     and `runD1Batch` expects `readonly D1IntentStatement[]` where
     `D1IntentStatement = { sql: string; values?: readonly unknown[] }`. If the
     type-checker complains about `D1Value[]` vs `readonly unknown[]`, widen the
     `promotionStatements` local to `D1IntentStatement[]` (import the type) —
     do not narrow `runD1Batch`'s signature.

**Verify**: `bun run type-check` → exit 0. Then `grep -n "async function runBatch" src/lib/estimates/express-promotion-actions.ts` → no matches.

### Step 4: Run the full verification gate

**Verify**: `bun run verify` → exit 0 (if `verify` is not yet defined because
plan 001 hasn't landed, run `bun run type-check && bun run lint && bun test tests/unit && bun run test:dom`).

If a vitest suite fails because its D1 mock doesn't implement `.batch` and now
hits the hard-throw: that is the intended, correct failure — the test was
passing under a non-atomic shadow. Do **not** weaken the helper. Instead, update
that test's mock to provide a real `.batch` (most mocks already do; the shared
helper is typically in `tests/vitest/fixtures/` or a `createMockD1Database`
helper). If you cannot find the mock or the fix is non-trivial, STOP and report
the failing test file + assertion.

## Test plan

No new tests required for this plan (it is a behavior-tightening that makes
existing tests more honest). However, if plan 001 has landed and `bun run verify`
is green, that is sufficient evidence.

Optional (only if the executor has spare time and the user authorized tests):
add a small vitest unit test in `tests/vitest/` (model after an existing
`d1-*-contracts.test.ts`) that constructs a `D1DatabaseLike` without `.batch`
and asserts both helpers throw. Skip if test creation is not authorized.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0 (or the equivalent 4-command chain if 001 not landed)
- [ ] `grep -n "for (const statement of statements)" src/lib/estimates/d1-intents/database.ts` → no matches (the fallback loop is gone)
- [ ] `grep -n "async function runBatch" src/lib/estimates/express-promotion-actions.ts` → no matches
- [ ] `grep -rn "runD1Batch" src/lib/estimates/express-promotion-actions.ts` → shows the import and the call site
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:
- The excerpts in "Current state" don't match the live code (drift).
- A vitest suite fails on a mock-D1-without-`.batch` and the fix requires
  touching more than one test fixture file — report the failing file and stop.
- `runD1Batch`'s callers (rows.ts, nodes.ts, tabs.ts, templates.ts,
  history-events.ts) have changed such that the signature widening in step 3
  breaks compilation in a way not covered above.

## Maintenance notes

- After this lands, any new D1 test double MUST implement `.batch`. Document
  this in the test-fixture helper's JSDoc if one exists.
- A follow-up (not this plan) could make `D1DatabaseLike.batch` required and
  delete the runtime check entirely — but that touches every mock and is higher
  risk; the runtime hard-throw captures the safety benefit now.
- Reviewer: confirm the throw messages are specific (not generic "error"), and
  that `express-promotion-actions.ts` no longer has a local `runBatch`.
