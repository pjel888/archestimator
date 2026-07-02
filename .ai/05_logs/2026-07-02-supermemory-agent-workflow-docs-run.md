# Supermemory Agent Workflow Docs Run

Date: 2026-07-02T02:09:43Z
Mode: docs/governance implementation
Proof boundary: local-only

## Goal

Integrate local Supermemory into the Archestimator codebase-AI workflow docs and
available agent adapter payloads so agents check `http://localhost:6767/`, start
the local server when needed, search/update memory proportionally, and keep
`.supermemory/` local-only.

## Source Of Truth Read

- `AGENTS.md`
- FAST PATH block in `.ai/10_state/current-state.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/12_agents/README.md`
- `.ai/12_agents/payloads/*`
- `.ai/08_prompts/archestimator_codebase_ai_loop_prompt.md`
- `.ai/08_prompts/templates/codebase-ai-loop-task.md`
- thin adapter READMEs under `.codex/`, `.claude/`, `.agents/`, and `.commandcode/`

## Changes

- Added the canonical Supermemory local memory contract to
  `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.
- Added a fast-path current-state note for the new shared memory workflow.
- Added concise Supermemory workflow sections to all available payloads:
  Codex, OpenCode, Claude, CommandCode, Antigravity, Kimi, DeepSeek, Gemini,
  Hermes, Ollama, and the payload template/readme.
- Updated codebase-AI prompt docs to include Supermemory check/start/search/update
  behavior.
- Updated thin adapter READMEs to point back to the canonical Supermemory rule.
- Updated top-level `CODEX.md`, `CLAUDE.md`, and deprecated `GEMINI.md`
  entrypoints so the named harness docs point to the same contract.
- Added `/.supermemory/` to `.gitignore` because the local directory contains
  keys, auth/runtime data, models, and vector-store data.

## Validation Evidence

| Check | Result | Evidence |
|---|---|---|
| Supermemory availability | pass | `curl -fsS http://localhost:6767/ >/dev/null` exited `0`. |
| Agent adapter validation | pass | `bun run validate:agents` exited `0` with `AI workflow validation passed.`; rerun after top-level entrypoint edits also exited `0`. |
| Codex resolver | pass | `codex debug prompt-input >/tmp/archestimator-codex-prompt-input.txt` exited `0`; targeted search found `Local Supermemory`, `http://localhost:6767`, and `.supermemory/` in the resolved prompt; rerun after top-level entrypoint edits also exited `0`. |
| OpenCode resolver | pass | `opencode debug config` exited `0`; resolved `instructions` included `AGENTS.md` and `.ai/12_agents/payloads/opencode.md`; rerun after top-level entrypoint edits also exited `0`. |
| Whitespace/path check | pass | `git diff --check` exited `0`; rerun after top-level entrypoint edits also exited `0`. |
| Local-only ignore | pass | `git status --ignored --short .supermemory .gitignore` showed `!! .supermemory/` and `.gitignore` modified. |
| Supermemory closeout update | pass | Posted sanitized docs-update memories to `/v3/documents`; both responses parsed with `id` and `status` keys. |
| Payload coverage | pass | Every available payload (`antigravity`, `claude`, `codex`, `commandcode`, `deepseek`, `gemini`, `hermes`, `kimi`, `ollama`, `opencode`) contains `## Supermemory Workflow`. |

## Worktree Note

During final status checks, unrelated untracked file
`.ai/03_plans/2026-07-21-API-Audit/21_INDEPENDENT_VERIFICATION_RESULT.md`
appeared in the shared worktree. It was not created or edited as part of this
task and was left untouched.

## Remaining Risks

- This run verified local docs and resolver surfaces only. It did not install or
  exercise every third-party Supermemory plugin for every agent harness.
- Retrieved Supermemory contents were not used as source of truth; the new
  contract explicitly keeps Supermemory advisory until verified against current
  repo evidence.
