# Agent harness payload enforcement gaps

## Classification
Planning blocker for future Agentic-Driven Development framework enforcement; not a production source-code bug.

## Date discovered
2026-06-03

## Discovery context
During plan-only refinement of `.ai/03_plans/2026-06-03-agentic-development-framework-rollout`.

## Evidence
- `.ai/12_agents/README.md` lists Hermes and Cursor/future tools, but `.ai/12_agents/payloads/hermes.md` and `.ai/12_agents/payloads/cursor.md` are absent.
- `.ai/12_agents/payloads/` contains thin payloads for Codex, Claude, OpenCode, CommandCode, Kimi, Antigravity, DeepSeek, and deprecated Gemini, but not a standardized operational schema.
- `.agents/` exists but only as `skills/`; no `.agents/README.md` shim points agents back to `.ai`.
- Root `GEMINI.md` exists and contains graph guidance but does not explicitly say Gemini is deprecated.
- `.gemini/ralph/state.json` exists despite repo policy phasing Gemini out.
- `.commandcode/agents/*` and `.commandcode/taste/*` contain rich local instructions that can drift unless explicitly subordinated to `.ai`.

## Reproduction / commands
```bash
find .ai/12_agents -maxdepth 4 -type f -print
find .agents .gemini .commandcode .cursor .codex .claude -maxdepth 3 -type f | sort
rg -n "Hermes|Cursor|Gemini|Ollama|payload|agent" .ai/12_agents .ai/10_state AGENTS.md CLAUDE.md GEMINI.md .commandcode .agents .cursor .codex .claude .gemini
```

## Expected behavior
Every listed/approved/conditional/deprecated/non-agent lane has a thin, operational payload or explicit decision. Tool-specific harness files point to `.ai` and do not drift.

## Actual behavior
Several lanes are missing payloads or have local instruction surfaces that are not yet enforced by a shared schema.

## Suspected root cause
The initial framework plan created high-level ADD governance but did not fully inventory and standardize agent/harness payloads.

## Affected files/modules
`.ai/12_agents/*`, `.ai/08_prompts/*`, `.ai/11_skills/*`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/*`, `.claude/*`, `.codex/*`, `.cursor/*`, `.gemini/*`, `.commandcode/*`.

## Impact
High agent-drift risk before enforcement. Future agents may use stale Gemini guidance, miss Hermes/Cursor policy, or treat `.agents`/`.commandcode` as separate brains.

## Severity
High for framework enforcement readiness; low runtime application risk.

## Relationship to current plan
Tracked and planned in `.ai/03_plans/2026-06-03-agentic-development-framework-rollout/24_AGENT_AND_HARNESS_INVENTORY.md` through `31_AGENT_SECURITY_TOOL_PERMISSIONS_AND_SANDBOX_PLAN.md` and appendices `40`–`42`.

## Proposed fix plan
Implement Phase 1 of the refined plan: canonical `.ai/00_system` rules, standardized `.ai/12_agents` payload template/files, thin harness adapters, prompt/skill templates, dry-run evals, and run-log protocol.

## Verification plan
Schema audit every payload; run dry-run evals in `33_AGENT_DRY_RUN_EVALS_AND_ADOPTION_TESTS.md`; run docs-only validation; use graph/code-intelligence before source edits.

## Status
OPEN — blocks global enforcement, does not block this plan-refinement task.

## Blocks implementation?
Blocks global agent-framework enforcement. Does not block Phase 1 implementation if Phase 1 resolves these gaps first.
