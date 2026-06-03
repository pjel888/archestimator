# AI Agent Risk Register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| AGENT-001 | Prompt injection overrides repo rules | Critical | shared rules win, receipt, fail closed |
| AGENT-002 | Secrets in prompts/logs | Critical | no-secrets protocol, redaction |
| AGENT-003 | Tool-specific brain drift | High | thin adapters, `.ai` canonical |
| AGENT-004 | Overlapping parallel edits | High | worktrees/disjoint scopes |
| AGENT-005 | False provider/GitHub claims | High | proof packet rules |
| AGENT-006 | Deprecated Gemini use | Medium | fail-closed deprecation |
| AGENT-007 | Ollama chat use | Medium | non-agent prohibition |
| AGENT-008 | GitNexus/index failure ignored | Medium | explicit fallback logging |
| AGENT-009 | CI hardening slows startup | Medium | advisory first, fast checks |
