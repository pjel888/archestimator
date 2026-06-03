# Agent Payload Templates Appendix

## Minimal template
```md
# <Agent> Payload

Status: <approved|conditional|deprecated|unapproved|non-agent>
Primary lane: <...>
Secondary lane: <...>
Prohibited lanes: <...>
Shared source of truth: `.ai/00_system`; shared rules win.
Required reading: AGENTS.md, .ai/README.md, DOCS_SOURCE_OF_TRUTH, AGENT_OPERATING_PROTOCOL, SELF_DIAGNOSTIC, VALIDATION_MATRIX, current-state, decisions, DESIGN when UI.
Preflight: pwd, git root, status/branch, worktree, remote/fetch/log, graph check.
Allowed edits: <...>
Disallowed edits: <...>
Branch/worktree: <...>
Validation: <...>
Security/provider: no secrets, no provider/GitHub/Notion mutation without approval.
Bug protocol: create .ai/15_Bugs plan for blockers.
Final report: files, validation, evidence, branch, commit/push, risks.
```
