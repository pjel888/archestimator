# Traceability Matrix

| Requirement | Acceptance criterion | Likely files | Step | Verification | Risk / rollback | Status |
|---|---|---|---|---|---|---|
| FR-001 `.ai` canonical | all adapters point to `.ai` | `.ai/00_system`, adapters | Phase 1/5 | path/link audit | revert adapter | planned |
| FR-002 thin `AGENTS.md` | no duplicated policy | `AGENTS.md` | Phase 5 | diff review | revert | planned |
| FR-003 payload schema | each payload has operational fields | `.ai/12_agents/payloads/*` | Phase 2 | schema checklist | revert payload | planned |
| FR-004 Hermes/Cursor/Ollama decisions | missing/conditional/non-agent status resolved | `.ai/12_agents/*` | Phase 2 | inventory diff | rollback payload | planned |
| FR-005 Gemini deprecated | root/payload fail closed | `GEMINI.md`, `.ai/12_agents/payloads/gemini.md` | Phase 5 | text audit | revert | planned |
| FR-006 `.agents` compatibility | shim points to `.ai` only | `.agents/README.md` | Phase 5 | link audit | remove shim | planned |
| FR-007 preflight | receipt format exists | `.ai/00_system`, prompts, payloads | Phase 1/4 | dry-run ADV-002 | update protocol | planned |
| FR-008 concurrency | disjoint write/worktree rules | `.ai/00_system`, `28`, `41` | Phase 1 | dry-run dirty/conflict | stop/reassign agents | planned |
| FR-009 evidence | run-log schema exists | `.ai/05_logs`, `.ai/11_skills`, `30`, `42` | Phase 4 | dry-run final reports | correct logs | planned |
| FR-010 Notion mirror | Notion payload says mirror-only | `17`, `23`, `38` | Phase 8 | text audit | correct mirror | planned |
| FR-011 GitHub staged | advisory first | `.github` future docs, `19`, `36` | Phase 7 | dry-run/advisory | disable rules | planned |
| FR-012 provider proof | no claim without evidence | `.ai/00_system`, `37` | Phase 1/8 | provider-hallucination eval | correct report | planned |
| Codex payload | implementation lane safe | `codex.md` | Phase 2 | payload schema | revert | planned |
| Claude payload | planning/review lane safe | `claude.md`, `CLAUDE.md` | Phase 2/5 | payload schema | revert | planned |
| OpenCode payload | config schema verified | `opencode.md`, optional config | Phase 2/5 | docs/local verification | do not create config | planned |
| CommandCode payload | sentinels subordinate to `.ai` | `commandcode.md`, `.commandcode/*` | Phase 2/5 | drift audit | add pointer/revert | planned |
| Kimi payload | UI design gates | `kimi.md` | Phase 2 | schema + DESIGN refs | revert | planned |
| Antigravity payload | isolated terminal lane | `antigravity.md` | Phase 2 | schema | revert | planned |
| DeepSeek payload | debug/read-only default | `deepseek.md` | Phase 2 | schema | revert | planned |
| Hermes payload | orchestration contract | `hermes.md` | Phase 2 | owner decision | remove roster | planned |
| Cursor payload | editor/MCP role | `cursor.md`, `.cursor` | Phase 2/5 | docs/local check | no-op | planned |
| Gemini deprecated | no active route | `gemini.md`, `GEMINI.md` | Phase 2/5 | fail-closed eval | revert | planned |
| Ollama non-agent | embedding-only note | `ollama.md` or README | Phase 2 | text audit | remove | planned |
