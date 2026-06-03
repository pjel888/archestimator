# Agent Role Contracts and Routing Matrix

| Work type | Lead | Implement | Review | Notes |
|---|---|---|---|---|
| Requirements/planning | Claude/Codex lead | none | Architect/Critic | Plan-only unless implementation prompt follows. |
| Source implementation | Codex | Codex; Kimi for UI; `agy` isolated | Claude/CommandCode/DeepSeek | TDD and graph impact required. |
| UI/product polish | Kimi/Codex | Kimi or Codex | UX/UI sentinel, Claude | `DESIGN.md` and design lint blocking. |
| Debug/root cause | DeepSeek/Codex | Codex | Debugger/architect | Reproduce first where feasible. |
| Security/privacy | Security sentinels/Claude | Codex only after approved fix | CommandCode sentinels | No provider/secret access. |
| Docs/state/logs | Codex/Claude | Codex/Claude | Writer/reviewer | `.ai` canonical. |
| Release/provider proof | Lead/Codex | prepare-only | release/sre/security reviewers | Execution requires Philip approval. |
| Notion sync | Lead/writer | prepare-only | Philip/lead | Mirror-only. |
| Orchestration | Hermes if approved, else lead | workers by lane | lead/architect | Hermes needs payload first. |

## Prohibited use cases
- Gemini active work unless reapproved.
- Ollama chat/planning/coding.
- Any agent editing overlapping files in parallel.
- Any agent touching `.github` or providers without explicit scope and approval.

## Write scope rules
Read-only agents do not write. Write-capable agents get explicit file/folder scope. Multi-agent edits require disjoint ownership and leader integration.

## Agent count
Use the smallest number of agents. Do not parallelize when tasks share files, state, tests, or unresolved requirements.

## Conflict resolution
Evidence beats opinion. `.ai/00_system` and current source/test/package/provider proof beat stale plans and model claims. Lead integrates and decides; conflicting subagent outputs are recorded, not silently merged.
