# 05 — PR Governance, CODEOWNERS, and Agent Receipt Plan

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

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
