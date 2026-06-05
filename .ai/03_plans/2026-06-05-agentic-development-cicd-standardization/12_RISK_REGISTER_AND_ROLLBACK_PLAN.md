# 12 — Risk Register and Rollback Plan

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

## Risk register

| ID | Risk | Severity | Mitigation |
|---|---|---:|---|
| R1 | CI workflow remains disabled | Critical | Re-enable/prove current run first |
| R2 | Private repo lacks protection/rulesets | Critical | Upgrade/enable capability or accept advisory-only |
| R3 | Required checks block emergency hotfix | High | Document bypass/rollback before admin enforcement |
| R4 | Governance false positives block PRs | Medium | Advisory dry-run first |
| R5 | Vercel auto-deploy ships unreviewed commit | High | Keep disabled until protections exist |
| R6 | Staged deploy uses wrong SHA | High | Verify SHA on `main` |
| R7 | Secrets leak in logs/proof | Critical | redaction + least privilege |
| R8 | AI worktree conflicts | Medium | scoped branches + PR-only |
| R9 | Archived plan mistaken as active | Medium | pointer and this plan clarify boundary |
| R10 | Action supply chain compromise | Medium | permissions + pinning/allowlist |

## Rollback by phase

- CI workflow changes: revert commit or temporarily disable workflow with logged owner bypass.
- PR template/CODEOWNERS: normal git revert.
- Governance check: return to advisory and create bug plan.
- Branch protection/rulesets: temporarily relax exact rule, ship emergency fix, restore, log bypass.
- Vercel release: if staged deploy fails, do not promote; if promoted production fails, promote previous known-good and smoke.

## Emergency bypass record

```txt
EMERGENCY_BYPASS:
incident=
start_time=
actor=
branch/SHA=
rules relaxed=
validation performed=
production impact=
rollback/restoration time=
follow-up issue=
```
