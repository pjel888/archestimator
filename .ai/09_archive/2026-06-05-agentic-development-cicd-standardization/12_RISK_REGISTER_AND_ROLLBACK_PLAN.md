# 12 — Risk Register and Rollback Plan

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

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
<!-- 98-100-UPGRADE:START -->
## Added audit-response risks

| ID | Risk | Severity | Mitigation |
|---|---|---:|---|
| R11 | Docs-health gate becomes enterprise theater | Medium | advisory first, only block high-signal checks |
| R12 | Broader audit gaps expand CI/CD scope uncontrollably | Medium | Phase G separates follow-ups from enforcement work |
| R13 | Solo-founder CODEOWNERS overclaimed as independent review | Medium | preserve caveat and require evidence |
| R14 | Provider/GitHub paid feature needed | High | explicit owner re-approval before cost change |
| R15 | Stale provider proof reused | High | proof must match current SHA/date before status transition |

## Risk review cadence

Before implementation refresh R1/R2/R5/R14 with live provider/API evidence. Before blocking checks review R3/R4/R11 with dry-run results. Before release use review R5/R6/R7/R14 with staged proof.
<!-- 98-100-UPGRADE:END -->
