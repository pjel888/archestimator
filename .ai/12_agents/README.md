# Agents

This folder defines how AI agents should work on Archestimator.

## Stable responsibilities

- Claude: product planning, architecture, critique, writing, strategic review
- Codex: implementation, tests, refactors, PR-ready diffs
- OpenCode/Kimi: exploration, fallback planning/review, long-context synthesis
- DeepSeek: debugging, logic critique, second-opinion reasoning
- Hermes: orchestration, memory, routing, file/system operations

## Payloads

`payloads/` is reserved for model-specific instruction files. Keep these thin and point back to shared rules in `00_system/`.
