# Agents

This folder defines how AI agents should work on Archestimator.

## Stable responsibilities

- Claude: product planning, architecture, critique, writing, strategic review
- Codex: implementation, tests, refactors, PR-ready diffs
- OpenCode: exploration, fallback planning/review, codebase traversal, flexible coding bench
- CommandCode: taste-aware implementation/review, project-convention checks, PR work, plan-mode codebase review
- Gemini: multimodal review, broad synthesis, secondary audit/review, long-context checks when useful
- Kimi: frontend/product UI implementation and review, long-context synthesis, fallback planning/review, document analysis
- DeepSeek: debugging, logic critique, second-opinion reasoning
- Ollama: not an approved agent LLM lane; only the nomic embedding model used by ChunkHound is approved for active use unless Philip explicitly approves and documents a local chat model
- Hermes: orchestration, memory, routing, task delegation across the AI bench, file/system operations, final evidence verification

## Payloads

`payloads/` is reserved for model-specific instruction files. Keep these thin and point back to shared rules in `00_system/`.
