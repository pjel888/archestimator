# Plan 017: Add a scoped type-check + lint pre-commit gate (lint-staged)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- package.json .husky/ doctor.config.ts`
> (If `.husky/` does not exist, the repo uses a hand-rolled hook — see Current
> state.) If in-scope files changed since this plan was written, compare
> "Current state" against the live code; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

The repo's only installed git hook (`.git/hooks/pre-commit`) runs
`react-doctor --staged --blocking warning`. There is no type-check or lint gate
at commit time — type errors and lint violations can land locally, caught only
by the manual `validate` script (8 checks) or CI. The full `type-check` needs a
4 GB heap, but `tsconfig.json` already has `incremental: true` and the
`tsconfig.tsbuildinfo` (1.5 MB) is warm, so a scoped `tsc --noEmit` on staged
files is fast enough for pre-commit. This plan adopts `lint-staged` to run
eslint + a scoped type-check on staged `*.{ts,tsx}` only, keeping
`react-doctor` in the same hook. Developers keep `--no-verify` for WIP commits.

## Current state

- `.git/hooks/pre-commit` — sole hook; runs `react-doctor --staged --blocking warning`
  with `pnpm`/`npx` fallbacks. Hand-rolled shell, NOT under version control in a
  `.husky/` dir.
- `package.json` — no `husky`, `lint-staged`, `lefthook`, or `pre-commit` dep.
- `package.json` scripts: `"lint": "eslint"`, `"type-check": "... tsc --noEmit"`
  (4 GB heap), `"validate"` (8-check chain, manual).
- `doctor.config.ts` — react-doctor config.
- `tsconfig.json` — `incremental: true`; `tsconfig.tsbuildinfo` present.

Conventional commits; `package.json` `packageManager: bun@1.3.14`.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `bun install`                    | exit 0              |
| Typecheck | `bun run type-check`             | exit 0              |
| Lint      | `bun run lint`                   | exit 0              |

## Scope

**In scope** (the only files you should modify/create):
- `package.json` — add `lint-staged` devDependency + a `lint-staged` config block; add a `prepare` script (or equivalent) that installs the hook.
- `.husky/pre-commit` (create) — the version-controlled hook that runs `lint-staged` + `react-doctor`.
- `.gitignore` — ensure `.husky/_/` (husky internals) is ignored if needed.

**Out of scope**:
- The full `validate` script — do not run it pre-commit (too slow; reserve for CI/pre-merge).
- `vitest` / `playwright` — not pre-commit (browser/test gate; AGENTS.md).
- `doctor.config.ts` — unchanged.

## Git workflow

- Branch: `advisor/017-precommit-lint-staged`.
- Commit message: `chore(dx): add scoped lint-staged pre-commit gate`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add `lint-staged` (and `husky` if needed)

`bun add -d lint-staged husky`. (Husky is the simplest way to put the hook
under version control; if the repo prefers `lefthook`, use that instead — but
husky is the lower-friction default.)

In `package.json`:
- Add a `"prepare": "husky"` script (runs on `bun install`) if not present.
- Add a top-level `"lint-staged"` config:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "tsc --noEmit --incremental"
  ]
}
```

Notes:
- `eslint --fix` auto-fixes and stages the fix.
- `tsc --noEmit --incremental` reuses the warm `tsconfig.tsbuildinfo`. It
  type-checks the whole project (tsc can't trivially scope to staged files
  without losing cross-file safety), but incremental mode makes the warm-cache
  path fast. If the warm run is still too slow (>~30s), drop `tsc` from
  lint-staged and rely on `bun run verify:fast` (plan 001) as a manual
  pre-push step — see STOP conditions.

**Verify**: `bun run type-check` → exit 0 (confirm the dep install didn't break anything).

### Step 2: Create the version-controlled hook

`bunx husky init` (or manually create `.husky/pre-commit`). The hook should run:

```sh
#!/usr/bin/env sh
bunx lint-staged
bunx react-doctor --staged --blocking warning
```

Keep `react-doctor` so the existing behavior is preserved. Order:
`lint-staged` first (cheaper, catches type/lint), then `react-doctor`.

If `bunx` isn't reliable in the local env, the existing hook used `pnpm`/`npx`
fallbacks — mirror that fallback pattern.

**Verify**: `cat .husky/pre-commit` shows both commands. `git config core.hooksPath`
should point at `.husky` (husky sets this) — confirm with `git config core.hooksPath`.

### Step 3: Confirm the gate works end-to-end

Make a trivial staged change to a `.ts` file (e.g. add a comment), run
`git commit -m "test: pre-commit gate"`, and confirm:
- `lint-staged` runs eslint + tsc on the staged file.
- `react-doctor` runs.
- The commit succeeds (or fails loudly if you intentionally introduce a type error).

Then `git reset --soft HEAD~1` to undo the test commit (or discard it). Do NOT
leave test commits on the branch.

**Verify**: a deliberate type error in a staged file causes the commit to fail; removing it allows the commit.

### Step 4: Run the full gate

**Verify**: `bun run verify` (if plan 001 landed) or
`bun run type-check && bun run lint && bun test tests/unit && bun run test:dom` → exit 0.

## Test plan

No automated tests for the hook itself (it's tooling). Manual verification in
step 3 is the evidence.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` (or equivalent) exits 0
- [ ] `package.json` has `lint-staged` + `husky` devDeps and a `lint-staged` config block
- [ ] `.husky/pre-commit` exists, is executable, runs `lint-staged` then `react-doctor`
- [ ] `git config core.hooksPath` points at `.husky`
- [ ] Manual test (step 3): a type error blocks commit; clean file commits
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- The warm-cache `tsc --noEmit --incremental` takes >~30s in this env — drop
  `tsc` from lint-staged (keep eslint only) and note that `verify:fast`
  (plan 001) is the manual type-check step. Report the measured time.
- `bunx husky` / `husky init` fails or the repo's existing `.git/hooks/pre-commit`
  is doing something load-bearing beyond react-doctor — report before
  overwriting.
- `eslint --fix` on staged files is destructive for some rule (e.g. rewrites
  that conflict with `react-doctor`) — drop `--fix` and use `eslint` (check-only).

## Maintenance notes

- The hook is now version-controlled (`.husky/`), so every clone gets it via
  `bun install` (the `prepare` script). Document the one-time
  `git config core.hooksPath` in the README onboarding if husky doesn't set it
  automatically.
- `tsc` pre-commit is the contentious part — if it proves slow, the fallback is
  eslint-only pre-commit + `verify:fast` pre-push. Revisit after a week of use.
- Do NOT add `vitest`/`playwright` to pre-commit (test/browser gates).
- Reviewer: confirm (a) the hook is version-controlled, (b) `react-doctor` is
  preserved, (c) the full `validate` is NOT in the hook.
