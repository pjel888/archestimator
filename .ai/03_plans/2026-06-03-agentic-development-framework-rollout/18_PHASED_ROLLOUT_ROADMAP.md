# Phased Rollout Roadmap

**Date:** 2026-06-03

| Timebox | Phase | Enforced immediately | Advisory until dry-run | Requires approval/admin | Success metrics | Failure signals | Rollback |
|---|---|---|---|---|---|---|---|
| Week 0 | Phase 0 audit | Current-state-first evidence; no provider claims | Branch model | Philip branch decision | Decision recorded | Conflicting branch assumptions | Keep current workflow |
| Week 0-1 | Phase 1 `.ai` canonical docs | `.ai` canonical; no secrets; docs before implementation | ADD phase checklists | Philip approval for canonical docs | Docs exist and linked | Duplicate source of truth | Revert docs commit |
| Week 1 | Phase 2 templates/prompts | Required reading in prompts | Template enforcement | None unless root docs touched | Agent can use prompts without chat context | Vague templates | Patch templates |
| Week 1-2 | Phase 3 GitHub policy | No direct protected changes by agents | Protection settings | GitHub admin | Settings packet approved | Lockout risk | Do not apply settings |
| Week 2 | Phase 4 CI/CD guardrails | No weakening CI | New required checks | GitHub admin | PR run green | Slow/noisy CI | Revert workflow |
| Week 2 | Phase 5 Notion mirror | `.ai` wins over Notion | Notion dashboards | Notion admin | Mirror links to `.ai` | Status drift | Correct Notion |
| Week 3 | Phase 6 dry runs | Bug evidence-first; feature docs-first | Global enforcement | Philip selects targets | One feature + one bug pass | Process too slow | Keep advisory |
| Week 4 | Phase 7 enforcement | Validation before merge | Advanced automation | GitHub admin | Checks block bad changes | Founder blocked | Relax settings with decision |
| Beta gate | Phase 8 beta integration | Provider proof required | Automated release dashboards | Provider admin | Beta proof packet complete | Local-only READY claim | Beta remains NO-GO |

## What gets enforced immediately

- No provider claims without proof.
- No secrets.
- `.ai` canonical over Notion.
- Source-of-truth chain before meaningful work.
- Docs-only validation for docs-only changes.

## What remains advisory until dry-run passes

- Mandatory global ADD checklist on every PR.
- Notion database status workflow.
- CODEOWNERS enforcement.
- CI docs-compliance automation.

## Process-overhead rollback plan

If ADD slows urgent beta fixes, keep branch/proof requirements but reduce template volume, use shorter run logs, and reserve full phase packets for risky or release-facing work.
