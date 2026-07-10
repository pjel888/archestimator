# Supermemory Always-On Bootstrap Implementation Run

Date: 2026-07-10
Mode: local agent-framework implementation
Proof boundary: local repo and Philip's current macOS user session

## Goal

Make verified Supermemory configuration, availability, search, and closeout
memory writes automatic for every Archestimator coding-agent entry surface.

## Source Of Truth Read

- `AGENTS.md` and the FAST PATH in `.ai/10_state/current-state.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- Existing Supermemory launcher, tests, package scripts, payloads, and validator
- Installed native binary/version/manifest, local health endpoint, and v3 API
- Prior relevant Supermemory documents found through local v3 search

## Changes

- Added a repo-pinned native checksum registry and idempotent machine
  configurator for the persistent path/hash, `~/.zshenv`, and macOS LaunchAgent.
- Updated the verified launcher to consume persistent config, parse only
  allowlisted provider variables, allow a 15-second cold boot, and write logs at
  mode 600 under `~/.supermemory/`.
- Added a stale-recoverable single-flight lock to `supermemory:ensure` and made
  it discard stale inherited server path/hash values after reconfiguration.
- Added authenticated local `supermemory:search` and `supermemory:add` commands;
  add rejects common secret-like content and the client refuses non-loopback
  API endpoints or an API key file broader than mode 600.
- Required `bun run supermemory:ensure` across top-level agent entrypoints,
  adapter READMEs, every payload, and the payload template; the validator now
  fails if those surfaces or package commands drift.
- Configured the current machine and loaded
  `~/Library/LaunchAgents/com.archestimator.supermemory.plist`.

## Validation Evidence

| Check | Result | Evidence |
|---|---|---|
| Focused behavior tests | pass | 2 Vitest files / 17 tests passed for persistent config, checksum rejection, safe provider loading, cold boot, mode-600 logs, clean-shell ensure, concurrent single-flight, non-destructive LaunchAgent startup, adapter coverage, authenticated search/write, bearer non-echo, and secret-like-content rejection. |
| Focused lint | pass | ESLint passed for the Supermemory scripts, validator, and focused tests. |
| TypeScript | pass | `bun run type-check` completed with no diagnostics. |
| Agent contract | pass | `bun run validate:agents` returned `AI workflow validation passed.` |
| Codex resolver | pass | `codex debug prompt-input` exited 0 and the resolved prompt contains `bun run supermemory:ensure`. |
| OpenCode resolver | pass | `opencode debug config` exited 0 and resolves `AGENTS.md` plus `.ai/12_agents/payloads/opencode.md`. |
| Clean shell | pass | An `env -i` login shell loaded both persisted server variables without exposing their values and `bun run supermemory:ensure` returned ready. |
| Machine persistence | pass | Server config, `~/.zshenv`, server log, and ensure log are mode 600; LaunchAgent plist is mode 644 and loaded in `gui/501`. |
| LaunchAgent recovery | pass | Stopped listener PID 92847; without force-kick, the scheduled LaunchAgent restored PID 94799 and five consecutive HTTP 200 checks passed. |
| Memory search | pass | `supermemory:search` found two pre-existing relevant documents through the authenticated local v3 API without printing the bearer. |
| Memory write/search round trip | pass | `supermemory:add` queued sanitized document `G1Qtbu94hScwB1YFdFbvz4`; a later semantic search returned the same document id. |

## Proof Boundary

This run proves the repo contract and current macOS user-session behavior. It
does not prove third-party plugin implementations, another machine's native
installation, hosted service behavior, provider dashboards, or production.

## Remaining Risk

- A new native Supermemory version remains intentionally fail-closed until its
  four supported platform checksums are reviewed and added to the repo registry.
- The LaunchAgent is path-specific; moving the repo requires rerunning
  `bun run supermemory:configure` from the new checkout.
