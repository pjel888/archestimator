# Agent Operating Protocol

## Goal

Make Archestimator safe for multi-agent work from day one.

## Required workflow for meaningful work

1. Clarify the brief internally:
   - goal
   - non-goals
   - constraints
   - affected files/systems
   - acceptance criteria
   - risks
   - definition of done
2. Read relevant `.ai` docs before acting.
3. Plan before building when the task is non-trivial.
4. Keep implementation isolated once code exists: branch, worktree, or explicit task environment.
5. Verify with evidence before claiming completion.
6. Update `.ai` state/docs when a durable decision or project reality changes.

## Mandatory self-diagnostic trigger

If Philip says the agent is getting worse, confused, stale, not following instructions, or repeating mistakes, stop the normal workflow and run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before planning or coding. This is not optional cleanup; it is the recovery path for protecting project quality.

Minimum diagnostic actions:

1. Check `git status --short --branch` and the active branch.
2. Inspect modified files before editing them.
3. Reread the active source-of-truth chain listed in `.ai/README.md`.
4. State the current goal, non-goals, affected files, validation gate, and stop conditions internally.
5. Make the smallest corrective change and verify it.

## Multi-agent rule

Use the smallest number of agents needed. Avoid swarm work unless tasks are clearly independent.

Default roles:
- Claude: planning, architecture, critique, writing, strategy
- Codex: implementation, refactoring, tests, PR-ready diffs
- OpenCode/Kimi: exploration, fallback planning, long-context review
- DeepSeek: debugging, logic review, second-opinion critique
- Hermes: orchestration, memory, routing, file/system operations

## Safety rules

- No secrets in `.ai`.
- No production deploys or destructive commands without explicit approval.
- Do not overwrite project decisions silently. Mark superseded decisions with dates.
- Factual claims about code, costs, regulations, labor, or materials require cited sources or local evidence.

## Completion discipline

- Do not promise future work when a tool can do it now.
- Do not claim completion from intent; claim completion only from evidence.
- If validation is skipped, say exactly why and what risk remains.
- If a doc is stale, patch the canonical doc instead of compensating in chat.
