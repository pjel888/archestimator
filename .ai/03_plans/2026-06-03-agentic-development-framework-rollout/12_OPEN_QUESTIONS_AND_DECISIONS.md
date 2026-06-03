# Open Questions and Decisions

## Decisions made

- Phase 1A is repo-local framework implementation.
- Phase 1B is a hard Notion mirror completion gate for the phrase `Phase 1 complete`.
- Notion is mirror-only and must never override `.ai`/source/test/provider evidence.
- Gemini remains deprecated unless Philip explicitly reapproves.
- Ollama remains non-agent/embedding-only unless Philip explicitly approves and documents local chat use.
- GitNexus cannot be claimed ready while the live CLI fails; use code-review-graph/fallback.
- Global enforcement is not ready and is 0% implemented.
- Closed beta remains NO-GO.

## Open questions requiring Philip or implementation-time fail-closed decision

1. Hermes active payload vs remove/fail-close from active roster.
2. Cursor active agent lane vs MCP/config-only.
3. Root `GEMINI.md` retained with fail-closed notice vs archived/removed.
4. `.gemini/ralph/state.json` archive/remove/leave-with-deprecation decision.
5. Root `AGENTS.md` and `CLAUDE.md` stale facts repaired in Phase 1A vs separate root-doc sync.
6. Exact Notion parent/database for framework mirror.
7. Whether Philip explicitly waives/defers Phase 1B; default is it blocks `Phase 1 complete`.
8. When GitHub rulesets become enforced; default is after dry-runs/evals and approval.

## Implementation-agent decisions allowed

If uncertain, choose fail-closed/conditional/unapproved/deprecated/non-agent status. Do not silently activate missing or ambiguous lanes.
