# Agent Toolchain Performance Loop Ledger

## Goal

Make Codex and Claude faster, more performant, and more efficient for local Archestimator work by removing automatic per-edit/per-session tool overhead and pinning fast-path contracts.

## Cycle 1 — 2026-06-18

### Discovery

- Codex hooks had already been restored to the intended disabled posture in `.codex/config.toml` and `.codex/hooks.json`, but stale `[hooks.state.*]` trust entries remained in `.codex/config.toml`.
- Claude still had tracked startup/edit hooks in `.claude/settings.json`.
- Local Claude still had an Impeccable edit hook and enabled `ChunkHound` in `.claude/settings.local.json`, despite project policy documenting ChunkHound as disabled because Ollama retry loops created agent/tooling drag.
- `CLAUDE.md` still said the graph auto-updated via hooks, contradicting the fast-path posture.

### Changes

- Disabled tracked Claude hooks by setting `.claude/settings.json` to `{ "hooks": {} }`.
- Disabled local Claude edit hooks and removed local `ChunkHound` enablement in `.claude/settings.local.json`.
- Removed stale Codex hook trust-state blocks from `.codex/config.toml`.
- Updated `CLAUDE.md` to state that hooks are disabled for speed and graph refresh is explicit via `bun run graph:reindex`.
- Extended `tests/vitest/security-findings-library-tooling-contracts.test.ts` to assert Codex and Claude hook-free startup/edit loops.

### UltraQA Scenario Matrix

| ID | Scenario | Expected Signal | Actual Result | Status | Cleanup |
| --- | --- | --- | --- | --- | --- |
| FAST-001 | Tracked Codex/Claude configs contain no automatic edit/session hook commands | no `codex-native-hook`, `code-review-graph update/status`, or Impeccable hook command in tracked hook manifests | `agent-fast-path-ok` | Pass | no temp artifacts |
| FAST-002 | Local Claude config does not enable ChunkHound or Impeccable edit hook | local hooks `{}` and no `ChunkHound` server | `agent-fast-path-ok` | Pass | no temp artifacts |
| FAST-003 | Tooling contract prevents future hook reintroduction | focused Vitest contract passes with hook-free assertions | 6/6 tests passed | Pass | no temp artifacts |
| FAST-004 | Config files remain parseable after edits | JSON tool parses agent manifests | `json-ok` | Pass | no temp artifacts |
| FAST-005 | Dirty worktree safety | existing unrelated dashboard/image edits remain untouched | status still shows those files separately | Pass | no cleanup |

### Verification

- `bunx vitest run tests/vitest/security-findings-library-tooling-contracts.test.ts --maxWorkers=1` — passed, 6 tests.
- `python3 -m json.tool` on `.claude/settings.json`, `.claude/settings.local.json`, `.codex/hooks.json`, `.cursor/mcp.json`, `.mcp.json` — passed.
- Node stale-hook harness — passed with `agent-fast-path-ok`.
- `git diff --check` on touched agent config/docs/tests — passed.

### Residual Risks

- Existing Codex/Claude sessions may need restart/reload to pick up disabled hooks.
- `.claude/settings.local.json` is gitignored and machine-local; this machine is fixed, but other machines need the same local hook-free posture.
- Broad MCP cold-start cost from `uvx code-review-graph==2.3.5` remains when an agent actually starts that MCP server; this is now explicit/proportional rather than hidden per edit.

## Cycle 2 — 2026-06-18

### Goal

Extend the hook-free fast path from Codex/Claude to the shared agent bench: Claude,
Codex, OpenCode, CommandCode, Antigravity, Kimi, DeepSeek, deprecated Gemini,
unapproved Hermes, Ollama, and future payload adapters.

### Scope

- Canonical `.ai/00_system` agent framework and operating protocol wording.
- `.ai/12_agents` roster, payload index, template, and concrete payload deltas.
- Focused Vitest contract checks for startup-read, payload shape, fail-closed,
  user-override, and hook-free control-surface invariants.
- Current-state and ledger evidence after verification.

### Non-goals

- No provider, GitHub, Notion, production, browser, Supabase, or package runtime
  mutation.
- No branch/worktree creation; the active user instruction is to stay on `main`.
- No broad build, Playwright, Storybook, or full `bun run validate` for this
  docs/config/test-only agent-control change.

### Acceptance Criteria

1. Agent startup guidance says the default read chain is `AGENTS.md` plus the
   FAST PATH block at the top of `.ai/10_state/current-state.md`; deeper `.ai`
   docs are task-targeted, not preloaded.
2. Plan packs are required only for high-blast-radius or explicitly exhaustive
   work, matching `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`.
3. Current prompt overrides branch/worktree defaults for stay-on-main,
   read-only, parallelism, and proof scope unless the branch is destructive,
   paid, external-production, credential-gated, or materially scope-changing.
4. Payloads remain thin adapters: role-specific deltas only, fail-closed lanes
   do not write bug files unless `.ai` writes are permitted, and UI guidance
   treats `DESIGN.md` as alpha guidance rather than a hard law.
5. Structural tests catch regressions in startup-read, payload shape, deprecated
   lane gating, local-state ignore boundaries, and hook-free startup/edit loops.

### Validation Plan

- `bunx vitest run tests/vitest/security-findings-library-tooling-contracts.test.ts tests/vitest/agentic-framework-routing-docs.test.ts tests/vitest/agent-payload-contract.test.ts --maxWorkers=1`
- JSON parse check for `.codex/hooks.json`, `.claude/settings.json`, `.mcp.json`,
  and `.cursor/mcp.json`.
- Required control-surface path check for `AGENTS.md`, `.ai/00_system/*`,
  `.ai/12_agents/payloads/_template.md`, `.codex/config.toml`,
  `.codex/hooks.json`, and `.claude/settings.json`.
- Local-state tracking/ignore checks for `.omx`, `.omo`, `.gitnexus`,
  `.code-review-graph`, `.chunkhound`, `.codex` local state, Claude local
  settings/worktrees, `.ai/99_scratch`, and `.ai/14_code_intelligence`.
- `git diff --check`.

### Iteration Log

#### Iteration 1

- Hypothesis: Consolidating startup, user-override, and payload-shape rules in
  canonical `.ai` docs plus structural tests will reduce agent startup work
  without weakening routing or verification.
- Action: Updated the canonical fast-start, loop, user-override, and
  payload-shape contracts; thinned every concrete agent payload; added a
  structural payload regression test; added an Ultrawork tier compatibility
  pointer at `docs/shared/agent-tiers.md`; updated Codex config skill-root
  wording to avoid the stale `.codex/skills` reference.
- Files changed:
  - `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `.codex/config.toml`
  - `.ai/README.md`
  - `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
  - `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
  - `.ai/08_prompts/templates/codebase-ai-loop-task.md`
  - `.ai/12_agents/README.md`
  - `.ai/12_agents/payloads/README.md`
  - `.ai/12_agents/payloads/_template.md`
  - `.ai/12_agents/payloads/{antigravity,claude,codex,commandcode,deepseek,gemini,hermes,kimi,ollama,opencode}.md`
  - `docs/shared/agent-tiers.md`
  - `tests/vitest/agent-payload-contract.test.ts`
- Evidence: Parallel read-only audits identified duplicate startup chains,
  over-broad plan-pack language, branch/lead conflicts, fail-closed write
  leakage, and missing payload contract tests.
- Result: Pass. The shared agent bench now points to `AGENTS.md` + current-state
  FAST PATH by default; plan packs are scoped to high-blast-radius or explicitly
  exhaustive work; active user branch/worktree instructions override adapter
  defaults; fail-closed lanes report blockers without writing bug files unless
  `.ai` writes are permitted; Kimi/design wording treats `DESIGN.md` as alpha
  guidance; the payload regression test locks the invariants.
- Next decision: Stop. Verification passed and remaining risks are explicitly
  local-only/live-runtime boundaries.

### UltraQA Scenario Matrix

| ID | Scenario | Expected Signal | Actual Result | Status | Cleanup |
| --- | --- | --- | --- | --- | --- |
| QA-001 | Contract tests reject slow startup chains, stale plan-pack wording, unsafe fail-closed writes, and local-state tracking | focused Vitest agent-control suite passes | `3 passed (3)`, `16 passed (16)` | Pass | no temp artifacts |
| QA-002 | JSON agent/provider adapter configs remain parseable | JSON parser prints `json-config-ok` | `json-config-ok` | Pass | no temp artifacts |
| QA-003 | Required control-surface paths exist | Node path check prints `agent-doc-paths-ok` | `agent-doc-paths-ok` | Pass | no temp artifacts |
| QA-004 | Local runtime state remains untracked and ignored | `git ls-files` returns no local-state paths; `git check-ignore -v` maps each probe to `.gitignore` | no tracked output; ignored probes mapped to `.gitignore` | Pass | no temp artifacts |
| QA-005 | Stale slow-contract phrases are absent from docs | docs-only `rg` for stale phrases exits 1 with no matches | no matches | Pass | no temp artifacts |
| QA-006 | Patch whitespace is clean | `git diff --check` exits 0 | no output | Pass | no temp artifacts |

### Verification

- `bunx vitest run tests/vitest/security-findings-library-tooling-contracts.test.ts tests/vitest/agentic-framework-routing-docs.test.ts tests/vitest/agent-payload-contract.test.ts --maxWorkers=1` passed: 3 files, 16 tests.
- `node -e` JSON parse check for `.codex/hooks.json`, `.claude/settings.json`,
  `.mcp.json`, and `.cursor/mcp.json` printed `json-config-ok`.
- `node -e` required path check printed `agent-doc-paths-ok`.
- `git ls-files` on local runtime state paths returned no output.
- `git check-ignore -v` confirmed ignore rules for `.omx`, `.omo`, `.gitnexus`,
  `.code-review-graph`, `.chunkhound`, `.codex/cache`, `.codex/*.sqlite`,
  `.claude/settings.local.json`, `.ai/99_scratch`, and `.ai/14_code_intelligence`.
- Docs-only stale phrase scan for the old slow-contract terms returned no
  matches.
- `git diff --check` passed.

### Stop Condition

Stop only when the focused contract tests, config/path checks, local-state
checks, and `git diff --check` pass, or when a documented blocker prevents a
local-only docs/config/test fix.

### Proof Boundary

`local-only` agent-control proof. This cycle does not claim live runtime latency,
provider behavior, browser behavior, GitHub CI behavior, or external tool TUI
behavior.

### Remaining Risks

- Live Codex/Claude/OMX/Kimi/CommandCode runtime latency was not benchmarked; the
  proof is repo-local contract and config evidence.
- Existing running agent sessions may need restart/reload to pick up the updated
  adapter text and `.codex/config.toml` wording.
- Unrelated dirty files already exist outside this scope:
  `public/Cards/projects-mountain.jpg`, `src/app/globals.css`,
  `src/components/workshop/dashboard/DashboardHero.tsx`,
  `src/components/workshop/dashboard/WorkshopDashboard.tsx`, and `tmp/`.
