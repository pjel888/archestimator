# 15 — Final Readiness Gate

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

## This plan-pack gate

This docs-only task is complete when the dated folder exists, facts are recorded, future implementation phases are sequenced, official references are linked, diff is docs-only, `git diff --check` passes, and requested commit/push/merge is done.

## Future implementation gates

### Gate 1 — CI active
- GitHub workflow enabled or replacement exists.
- Current run exists for latest SHA.
- Job names stable.

### Gate 2 — CI hardened
- Explicit permissions.
- Concurrency.
- Split jobs.
- E2E artifacts.
- Action policy.

### Gate 3 — PR governance active
- PR template.
- CODEOWNERS.
- Governance check.
- Dry-runs completed.

### Gate 4 — GitHub protection enforceable
- Capability blocker resolved.
- `main` protected.
- `staging` protected if adopted.
- Required checks match job names.
- Force push/delete blocked.

### Gate 5 — Vercel release workflow proven
- Manual approval-gated workflow.
- Staged production deploy.
- Smoke before promote.
- Promote proof.
- Rollback proof.

### Gate 6 — Agent adoption proven
- Representative PR/task dry-runs pass.
- AI agents use scoped branches/worktrees.
- PRs include receipt, validation, proof boundary, risks.

## No-go language

Do not claim `IMPLEMENTED_AND_ENFORCED` while CI is disabled, `main` is unprotected, branch protection APIs return 403, PR governance is advisory, release workflow can promote without approval, or provider proof is missing.
