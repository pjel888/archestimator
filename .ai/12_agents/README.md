# Agents

This folder is the canonical Archestimator agent-role contract surface.

Shared framework rules live in `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.
Payloads in `payloads/` are thin role-specific adapters and must not fork
project policy.

## Roster

| Agent/harness | Status | Primary lane | Notes |
|---|---|---|---|
| Codex | approved | implementation, tests, validation, PR-ready diffs | Default builder for source and docs execution. |
| Claude | approved | planning, architecture, critique, writing | Default review/planning lane; implementation only if assigned. |
| OpenCode | conditional | exploration, fallback planning/review | Verify installed schema before config edits. |
| CommandCode | conditional | taste-aware review, sentinel checks, PR work | Sentinels default read-only unless assigned. |
| Antigravity CLI (`agy`) | approved | isolated terminal lane | Use branch/worktree isolation for write tasks. |
| Kimi | conditional | UI/product, frontend review, long-context synthesis | UI work must pass `DESIGN.md` and design-system lint. |
| DeepSeek | conditional | debugging, logic critique | Read-only/default diagnostic unless assigned. |
| Hermes | unapproved until payload-backed | orchestration/evidence | May not orchestrate until explicitly approved. |
| Cursor | conditional MCP/config support | editor/MCP support | Not an autonomous lane by default. |
| Gemini | deprecated | none | Fail closed unless Philip reapproves for a specific task. |
| Ollama | non-agent | embeddings only | No chat/planning/coding use without explicit approval. |

## Routing Rules

- Use the smallest number of agents needed.
- Give write-capable agents disjoint scopes and isolated branches/worktrees.
- Keep read-only reviewers read-only.
- The lead owns integration, validation, evidence, and final status.
- Provider, GitHub settings, Notion mutation, paid add-ons, and destructive
  actions require action-specific authority and proof logging.

## Payloads

Every active, conditional, deprecated, unapproved, and non-agent payload must
follow `payloads/_template.md` or intentionally fail closed.
