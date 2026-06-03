# Open Questions and Decisions

## Decisions made by this refinement
- `.ai/12_agents` remains the canonical agent contract folder.
- `.agents/` exists and should be treated as a skills/playbook compatibility folder, not the canonical brain.
- A future `.agents/README.md` thin pointer is recommended because `.agents` is present.
- Gemini remains deprecated unless Philip explicitly reapproves it.
- Ollama remains non-agent; only approved embedding use may remain.
- Notion is mirror-only.
- Keep `main` as default/production branch; add `beta` only after approval; no permanent `dev` branch unless volume proves need.
- GitHub rulesets/protections should be advisory/dry-run first.

## Items requiring Philip
1. Should Hermes get an active payload, or should Hermes be removed from active roster?
2. Should Cursor get an active payload/rules file, or remain MCP/config-only?
3. Should `.agents/README.md` compatibility shim be created in Phase 1? Recommendation: yes, thin pointer only.
4. Should root `GEMINI.md` be retained with deprecated notice or archived/removed? Recommendation: retain with fail-closed notice until tool behavior is known.
5. Which agents may edit source in production-sensitive windows? Recommendation: Codex primary, Kimi UI when isolated, Antigravity isolated, CommandCode only when assigned, Claude/DeepSeek mostly review.
6. Which agents may touch `.github`? Recommendation: only lead/Codex with Philip approval; reviewers read-only.
7. Which agents may prepare provider commands? Recommendation: prepare-only by lead/reviewer; execute only with Philip approval.
8. Which agents require isolated worktrees? Recommendation: all write-capable parallel agents.

## Items implementation agent may decide
- Exact wording of payload fields if schema is preserved.
- Whether to create `ollama.md` as non-agent prohibition or include the prohibition in README only.
- Prompt template filenames under `.ai/08_prompts/templates`.
- Run-log filename convention if it matches `30_AGENT_RUN_LOG_EVIDENCE_AND_MEMORY_PROTOCOL.md`.

## No hidden ambiguity
All open decisions above can be deferred without blocking Phase 1 docs/payload standardization if unresolved lanes are represented as conditional, deprecated, unapproved, or non-agent fail-closed payloads. Phase 1 must not silently activate Hermes, Cursor, Gemini, Ollama chat, `.github` mutation, provider prep execution, or Notion mutation without Philip approval.
