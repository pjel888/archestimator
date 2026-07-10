# Loop Ledger

## Goal

Make verified local Supermemory configuration, availability, and use automatic
whenever Archestimator is opened or a coding agent begins meaningful work.

## Scope

- Supermemory configure/start/ensure scripts and tests.
- Repo package commands and agent adapter validation.
- Canonical `.ai` framework/state/decision/run evidence.
- Machine-local `~/.supermemory/archestimator-server.env`, `~/.zshenv`, and the
  `com.archestimator.supermemory` LaunchAgent.

## Non-goals

- App product code, browser behavior, production deploys, or provider mutations.
- Storing or printing provider credentials.
- Reverting unrelated dirty-worktree changes.

## Branch / Status

- Branch: `main`, ahead of `origin/main`, with unrelated concurrent edits.
- Owned paths: the Supermemory scripts/test, agent guidance/payloads, validation
  script, package commands, and this task's `.ai` artifacts.
- Proof boundary: local repo plus Philip's current macOS user session.

## Source of Truth Read

- `AGENTS.md`
- FAST PATH in `.ai/10_state/current-state.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- Current launcher, tests, package scripts, payloads, and adapter validator
- Existing local Supermemory installation, manifest, health endpoint, and API

## Acceptance Criteria

1. Persistent verified binary configuration works from a clean environment.
2. Provider credentials are loaded through an allowlisted non-shell parser.
3. Configure and ensure are idempotent and checksum-fail closed.
4. All agent entry surfaces and validation require the ensure command.
5. LaunchAgent recovery and a sanitized memory round trip pass.

## Validation Plan

- `bunx vitest run tests/vitest/supermemory-start-script.test.ts`
- Syntax/lint/type checks for changed executable and test files
- `bun run validate:agents`
- Codex and OpenCode resolver inspection
- Clean-shell, health, forced restart, and memory API proofs
- `git diff --check`

## Iteration Log

### Iteration 1

- Hypothesis: the existing launcher can become reliable by persisting the
  verified native path/hash and loading the existing provider file safely.
- Action: wrote regression tests before runtime changes.
- Evidence: focused Vitest produced six expected failures for persistent config,
  provider loading, configure, checksum rejection, ensure, and adapter wiring.
- Result: red baseline accepted; implementation is in progress.
- Next decision: implement the runtime boundary and rerun the focused suite.

### Iteration 2

- Hypothesis: persistent verified config plus a LaunchAgent is sufficient for
  clean-shell and restart recovery.
- Action: implemented configure/ensure, adapter enforcement, and machine setup;
  then stopped the live native listener to exercise recovery.
- Evidence: clean-shell ensure passed, but the forced `kickstart -k` proof found
  a concurrent detached-start race; the native startup banner also revealed the
  local API key is written to the server log.
- Result: hypothesis required hardening; no completion claim made.
- Next decision: serialize ensure, move logs to mode-600 user storage, widen the
  cold-start window, and test the normal scheduled LaunchAgent path.

### Iteration 3

- Hypothesis: single-flight ensure plus user-only logs and the normal LaunchAgent
  interval provides stable always-on recovery.
- Action: added concurrency/cold-start/log-mode regressions, discarded stale
  inherited server vars after configure, added shared search/add commands, and
  reran recovery without force-killing the supervisor.
- Evidence:
  - 2 focused Vitest files / 17 tests passed.
  - Focused ESLint, `bun run type-check`, and `bun run validate:agents` passed.
  - Codex and OpenCode resolvers exited 0 with the expected instruction chain.
  - An `env -i` login shell loaded persistent config and ensure returned ready.
  - Scheduled LaunchAgent recovery replaced stopped PID 92847 with PID 94799;
    five consecutive HTTP 200 checks passed and both logs are mode 600.
  - Authenticated CLI search found two relevant pre-existing documents without
    exposing the bearer.
  - Sanitized document `G1Qtbu94hScwB1YFdFbvz4` was queued through
    `supermemory:add` and returned by a subsequent semantic search.
- Result: runtime, adapter, and memory round-trip acceptance criteria passed;
  final diff review remains.
- Next decision: stop only if independent review and scoped whitespace/status
  checks remain clean.

## Stop Condition

Stop only after the full acceptance criteria pass with fresh local evidence, or
after an evidenced technical blocker has no remaining safe recovery path.

## Proof Boundary

Local machine and repo adapter proof only. No hosted, provider, app runtime,
browser, or production readiness claim is in scope.

## Remaining Risks

- A future native server release needs a deliberate checksum-registry update.
- Other machines need the supported native server installation before the
  configurator can establish their local invariant.
