# Blast Radius and Risk Analysis

## Affected user flows
No end-user app flows are affected by this plan-refinement task. Future implementation affects developer/agent flows: planning, implementation, bug fixing, hotfix, release, review, CI failure handling, Notion mirror, provider-proof packet prep.

## Affected modules/surfaces
- `.ai/00_system`, `.ai/08_prompts`, `.ai/11_skills`, `.ai/12_agents`, `.ai/04_tasks`, `.ai/05_logs`, `.ai/10_state`, `.ai/15_Bugs`.
- Tool adapters: `AGENTS.md`, `.agents`, `CLAUDE.md`, `GEMINI.md`, `.claude`, `.codex`, `.cursor`, `.commandcode`, `.github`.

## Specific risks
| Risk | Severity | Likelihood | Mitigation | Rollback |
|---|---|---:|---|---|
| Tool-specific instruction drift | High | High | Thin adapters, shared rules win, schema audit | Revert adapter payloads; point to `.ai` |
| Multi-agent overlapping edits | High | Medium | Disjoint write scopes, worktrees, leader integration | Stop workers, reconcile branch/worktree |
| Gemini used despite deprecation | Medium | Medium | Deprecated payload + root `GEMINI.md` notice | Revert/disable Gemini lane |
| Ollama chat model used | Medium | Medium | Non-agent payload/prohibition note | Remove chat lane refs |
| Hermes orchestration without payload | High | Medium | Add Hermes payload or remove from roster | Disable Hermes lane |
| Provider/GitHub/Notion hallucination | High | High | Proof packet rules, no claim without evidence | Correct `.ai` state/logs and final report |
| GitHub rules lock out emergency work | High | Low | Advisory dry-run, admin bypass/emergency path | Relax rulesets/branch protection |
| CI over-hardening slows startup | Medium | Medium | Fast feature checks, fuller beta/main checks | Disable heavy checks |
| Secrets leak into prompts/logs | Critical | Low | no-secrets protocol, redaction, prompt input boundary | Rotate/revoke secrets, incident log |
| GitNexus unavailable | Medium | Medium | code-review-graph fallback and explicit failure logging | Repair index or use safe fallback |

## Concurrency and merge risks
- Never let two agents write the same file or folder without leader-owned integration.
- Use worktrees for write-capable parallel agents.
- Read-only critique agents may run in parallel without write access.
- Worker outputs are evidence, not source-of-truth, until the leader integrates and verifies.

## Graph/impact requirements
- code-review-graph is available and was used first in this refinement.
- GitNexus CLI currently failed; implementation must repair/check before claiming GitNexus-backed symbol impact.
- Before future code-symbol edits, run impact analysis for symbols as required by `AGENTS.md`.

## Rollback strategy
Every phase should commit separately. Revert the smallest phase commit. For enforcement settings, start advisory and preserve owner/admin emergency recovery.
