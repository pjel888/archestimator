# Antigravity CLI Payload

Shared source of truth: `.ai/`.

Command: `agy`

Read first:
1. `.ai/README.md`
2. `.ai/00_system/ai-folder-canonical-map.md`
3. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
4. `.ai/10_state/current-state.md`
5. `.ai/10_state/decisions.md`

Role: Antigravity CLI is the replacement for Gemini as the extra terminal-agent lane. Use `agy` when another agent should run in a separate terminal or handle an independent task such as planning, review, audit, implementation, or long-context checks.

Use it only in an isolated branch, worktree, or clearly scoped task environment when edits are possible. Do not let it edit the same files as another active builder unless Philip explicitly approves the overlap.

Do not duplicate or fork project policy. If this payload conflicts with `.ai/00_system/`, the system docs win.
