# 05 — PR Governance, CODEOWNERS, and Agent Receipt Plan

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Current gap

No PR template or CODEOWNERS file exists. Agent proof boundaries are not requested mechanically, and high-risk folders are not review-highlighted.

## Target PR template

Future `.github/pull_request_template.md` should require:

```md
## Agent receipt
Mode:
Scope:
Non-goals:
Branch:
Base:
Proof boundary: local-only / staging-proven / provider-proven / manual-proof-pending
Owner authorization for provider/settings/destructive work:

## What changed

## Risk level
Low / Medium / High / Critical

## Validation evidence
- [ ] `bun run validate`
- [ ] `bun run build`
- [ ] `bun run test:e2e` when route/auth/browser/public-share behavior changed
- [ ] Supabase migration proof when DB changed
- [ ] Hosted/provider proof when release/provider behavior changed

## Agent evidence
Docs read:
Graph/GitNexus/code-review-graph evidence:
Impact analysis:
Files changed:
Unrelated dirty files preserved:
Remaining risks:
```

## Target CODEOWNERS

Future `.github/CODEOWNERS` should start with:

```txt
* @pjel888
.github/ @pjel888
.ai/00_system/ @pjel888
.ai/10_state/ @pjel888
.ai/12_agents/ @pjel888
supabase/migrations/ @pjel888
src/lib/auth/ @pjel888
src/lib/supabase/ @pjel888
src/lib/publication/ @pjel888
src/lib/collaboration/ @pjel888
src/app/api/ @pjel888
src/proxy.ts @pjel888
src/components/ui/ @pjel888
DESIGN.md @pjel888
vercel.json @pjel888
package.json @pjel888
bun.lock @pjel888
```

## Governance check rules

Future `governance` CI should validate:

| Rule | Failure |
|---|---|
| AI branches are scoped (`codex/*` or accepted pattern) | missing scoped branch |
| PR to `main` only from `staging`, `release/*`, or `hotfix/*` | invalid production path |
| PR to `staging` only from scoped branches | invalid staging source |
| PR body includes agent receipt | missing receipt |
| PR body includes validation evidence | missing evidence |
| PR body includes proof boundary | missing proof boundary |
| Docs-only claim has no source/config/provider changes | false docs-only claim |
| Provider-proof claim cites evidence | unsupported provider claim |

Roll out advisory first, then blocking after dry-runs.
<!-- 98-100-UPGRADE:START -->
## 98-100 agent receipt acceptance criteria

A PR receipt is acceptable only if it includes mode, scope, non-goals, branch/base, changed-file class, validation commands, proof boundary, provider authority state, unrelated dirty-file/worktree handling, and remaining risks.

## Governance rollout

1. Add PR template and CODEOWNERS.
2. Add advisory governance job with report artifact.
3. Dry-run at least three representative PRs: docs-only, source change, release/provider-proof change.
4. Fix false positives/negatives.
5. Promote to blocking only after required-check names are stable and branch protection is available.

## Solo-founder caveat

CODEOWNERS with only `@pjel888` improves review routing but does not create independent review capacity. Do not overclaim it as independent review proof.
<!-- 98-100-UPGRADE:END -->
