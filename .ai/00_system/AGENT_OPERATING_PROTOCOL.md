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
