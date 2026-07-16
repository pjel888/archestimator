# Plan UNIT-004: Fix the `test` gate illusion and reclassify proof-script tests

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- package.json vitest.config.* tests/unit tests/vitest`.

## Status
- **Priority:** P1 · **Effort:** S · **Risk:** LOW · **Depends on:** — · **Category:** tests/dx
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** NOT_REQUIRED (the change *is* to test configuration; verify by running the gates)

## Why this matters
`bun run test` runs `bun test tests/unit` — **6 files** for 1,149 source files — so the obvious "is it green?" command proves almost nothing. The real behavioral suite is `tests/vitest` (845 files) under `test:dom`, which is user-gated. Separately, **57 `*proof*` test files** assert on *generated markdown* (an evidence-generator's output from a fixture), not runtime behavior — they read as coverage on the most security-sensitive surfaces (auth + uploads) while saying nothing about whether the runtime works. Together this creates a false-green trap for every agent/executor and CI.

## Current state
- `package.json`: `"test": "bun test tests/unit"` (6 files), `"test:dom": "vitest run --maxWorkers=1"` (845 files), `"validate"` chains both.
- `find tests/vitest -name '*proof*'` → 57 files (e.g. `cloudflare-better-auth-proof-script.test.ts`, `upload-*-provider-proof-script.test.ts`). They feed a hardcoded source fixture into a markdown generator and assert on the output text.
- **Convention:** `AGENTS.md` user-test gate — tests are not run automatically; `validate` is the full chain. Release-evidence tooling exists (`cf:*` proof scripts).

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Behavioral suite | `bun run test:dom` | runs the 845-file vitest suite |
| Evidence lane (new) | `bun run test:evidence` (to add) | runs the `*proof*` tests on demand |

## Scope
**In scope:** `package.json` scripts; moving `*proof*`/`*-proof-script.test.ts` files into `tests/evidence/` (git mv, preserving history); a vitest exclusion so `test:dom` skips them by default; a new `test:evidence` script; a one-line note in `AGENTS.md` (or `CLAUDE.md`) that `test` is smoke-only.
**Out of scope:** deleting any proof-script test (they are useful release artifacts — keep them runnable). Changing what the behavioral suite covers. Any source code.

## Steps
### Step 1 — Reclassify proof-script tests
`git mv` the 57 `*proof*`/`*-proof-script.test.ts` files from `tests/vitest/**` into `tests/evidence/**` preserving relative structure. Update their import paths if any reference `tests/vitest/` helpers.
### Step 2 — Exclude evidence from the default vitest run
In the vitest config, exclude `tests/evidence/**` from the default `test:dom` run (so `bun run test:dom` no longer executes them).
### Step 3 — Add the evidence lane
Add `"test:evidence": "vitest run --config vitest.evidence.config.ts tests/evidence"` (or the project's equivalent) so release tooling can run them on demand. Verify they still pass there.
### Step 4 — Disambiguate the `test` gate
Either (a) make `"test"` an alias for `test:dom` (or `test && test:dom`), or (b) keep `test` as the 6-file smoke gate and document explicitly in `AGENTS.md`/`CLAUDE.md` that `test` is smoke-only and `test:dom` is the behavioral suite. Recommend (b) to keep the fast smoke, with the doc note.
**Verify:** `bun run test:dom` still runs the behavioral suite (845-minus-moved files); `bun run test:evidence` runs the moved proof tests; `bun run test` behavior is documented.

## Done criteria
- [ ] `bun run type-check` exit 0
- [ ] `bun run test:dom` runs and excludes `tests/evidence/**`
- [ ] `bun run test:evidence` runs the 57 proof-script tests
- [ ] `AGENTS.md`/`CLAUDE.md` notes the `test` vs `test:dom` distinction
- [ ] No source files modified; only `package.json`, vitest config, `tests/evidence/**` moves, doc note
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- A proof-script test imports a vitest helper that lives under `tests/vitest/` and breaks after the move — fix the import or leave that one in place; don't delete.
- The repo's release tooling hard-codes the old proof-test paths — STOP and update the tooling call sites too (note them).

## Maintenance notes
- New release-evidence tests go under `tests/evidence/`; behavioral tests under `tests/vitest/`.
- If a proof-script test is later upgraded to assert runtime behavior, move it back into `tests/vitest/`.
- Reviewers: the intent is "behavioral coverage signal is honest," not "fewer tests."
