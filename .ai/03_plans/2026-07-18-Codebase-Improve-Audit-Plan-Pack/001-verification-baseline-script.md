# Plan 001: Add a one-command verification baseline (`bun run verify`)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- package.json`
> If `package.json` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

`package.json` defines `"test": "bun test tests/unit"`, but `tests/unit/` holds
only **6** files (`compare-href`, `p3-shared-link-migration-red`, `relative-time`,
`reset-baseline`, `tail-dev-logs`, `tree-selection`). The real test suite is
**849 vitest files** under `tests/vitest/`, run by a separate script
`"test:dom": "vitest run --maxWorkers=1"`. Type-check (`tsc --noEmit`, 4 GB heap)
and lint (`eslint`) are separate again, and there is **no** `verify` / `ci` /
`check-all` script.

Net effect: a developer (or agent executor) running the default `npm test` /
`bun test` gets a **false-green signal** — 6 of 855 test files — and there is no
single command to know the codebase still type-checks, lints, and passes both
test runners. This plan adds that single command. It is a prerequisite for safe
execution of the larger refactor plans in this pack (004, 019, 020), which need
a runnable regression gate to be reversible.

## Current state

`package.json` scripts (verbatim, verified at recon):

```json
"lint": "eslint",
"pretype-check": "node scripts/check-node-version.mjs",
"type-check": "NODE_OPTIONS=\"${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=4096\" tsc --noEmit",
"test": "bun test tests/unit",
"test:dom": "vitest run --maxWorkers=1",
"test:e2e": "playwright test",
```

Counts (verified):
- `find tests/unit -name '*.test.*'` → 6
- `find tests/vitest -name '*.test.*'` → 849
- `find tests -name '*.test.*'` → 855 total
- `grep -E '"(verify|ci|check-all|prepush)' package.json` → no matches

`vitest.config.ts` sets `fileParallelism: false` (the full vitest run is serial,
~8-9 min on warm cache per its own comments at lines 12-16). That is fine for a
`verify` gate — it is not meant to be fast, it is meant to be complete. A faster
pre-commit path is addressed separately by plan 021 (lint-staged gate).

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `bun install`                    | exit 0              |
| Typecheck | `bun run type-check`             | exit 0, no errors   |
| Lint      | `bun run lint`                   | exit 0              |
| Bun tests | `bun test tests/unit`            | all pass            |
| Vitest    | `bun run test:dom`               | all pass            |
| New gate  | `bun run verify` (after edit)    | exit 0              |

(All commands verified during recon.)

## Scope

**In scope** (the only file you should modify):
- `package.json` — add new scripts only (`verify`, `verify:fast`).

**Out of scope** (do NOT touch):
- `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`.
- Any existing script behavior. Do not rename `test` / `test:dom` — other tools
  and docs (including `AGENTS.md`) reference them.
- Do not add new test files. This plan wires a gate, it does not add coverage.

## Git workflow

- Branch: `advisor/001-verification-baseline` (or the repo's branch convention
  if one is evident — this repo has no enforced convention; stay off `main`).
- Commit message style: conventional commits, as seen in `git log --oneline`
  (e.g. `chore(scripts): add one-command verify baseline`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the `verify` and `verify:fast` scripts

In `package.json`, inside the `"scripts"` object, add two entries. Keep them
next to the existing `test` / `test:dom` / `type-check` / `lint` entries
(alphabetical or grouped — match the surrounding ordering style).

Add exactly these two keys:

```json
"verify": "bun run type-check && bun run lint && bun run test && bun run test:dom",
"verify:fast": "bun run type-check && bun run lint",
```

Rationale: `verify` is the complete gate (types + lint + both test runners).
`verify:fast` is types + lint only — a 1-2 minute pre-flight for the common
"did I break types or lint?" loop without waiting on the ~8 min serial vitest
run. Do NOT chain `test:e2e` (Playwright) into either — e2e is browser-gated in
this repo (`AGENTS.md` → "Browser gate") and must not run under `verify`.

**Verify**: `node -e "console.log(Object.keys(require('./package.json').scripts).filter(k=>k.startsWith('verify')))"` → prints `verify` and `verify:fast`.

### Step 2: Confirm the gate runs end-to-end

Run the new gate. This will take several minutes (the vitest run is serial).
If it passes, the gate is wired correctly.

**Verify**: `bun run verify` → exit 0, ending with the vitest summary line. If
it fails on a **pre-existing** type/lint/test error unrelated to your edit,
record the exact error and treat it as a STOP condition (do not "fix" unrelated
failures — that is out of scope).

If you only want to confirm wiring without the long vitest run during
development, `bun run verify:fast` must exit 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run verify:fast` exits 0
- [ ] `bun run verify` exits 0 (full run, including vitest)
- [ ] `node -e "const s=require('./package.json').scripts; ['verify','verify:fast'].forEach(k=>{if(!s[k]) process.exit(1)})"` exits 0
- [ ] `git status` shows only `package.json` modified; `grep -n "test:e2e" package.json` shows `test:e2e` is NOT referenced inside `verify` or `verify:fast`
- [ ] `README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:
- `git diff --stat 0a2667db9..HEAD -- package.json` shows `package.json` already
  changed in ways that conflict with this edit (e.g. a `verify` script already
  exists with different content).
- `bun run verify` fails on a **pre-existing** error (a type/lint/test failure
  present before your edit). Record the failure verbatim; do not attempt fixes
  outside this plan's scope.
- The vitest run takes longer than ~20 minutes (indicates a hang, not a slow
  suite) — capture the last output and stop.

## Maintenance notes

For whoever owns this after it lands:
- `verify` is the canonical "is this branch safe?" command. Reference it in
  PR templates and agent docs (`AGENTS.md` Verification section) when convenient
  — but that doc edit is a separate task, not this plan.
- If the vitest suite grows much larger, consider `verify:fast` being the
  pre-commit gate (see plan 021) and `verify` the pre-merge/CI gate.
- A future plan may add `bun run test:dom -- --changed` or a vitest project
  split to make `verify` faster; out of scope here.
- Reviewer: confirm `test:e2e` is deliberately excluded (browser gate) and
  that no existing script name was changed.
