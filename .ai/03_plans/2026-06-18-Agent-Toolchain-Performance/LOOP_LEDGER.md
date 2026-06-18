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
