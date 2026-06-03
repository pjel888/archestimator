# Stack Version Source-of-Truth Drift

**Classification:** Documentation/source-of-truth drift
**Date discovered:** 2026-06-03
**Status:** PARTIALLY RESOLVED IN `.ai` — root `README.md` remains out of scope for this `.ai`-only planning task and should be fixed in the next root-docs sync.

## Discovery context

While creating `.ai/03_plans/2026-06-03-agentic-development-framework-rollout`, the planning agent compared live `package.json` with repo docs.

## Evidence

- `package.json` records `react` and `react-dom` as `19.2.6`.
- Root `README.md` stack table says React `19.2.4`.
- `.ai/README.md` current active work also says React `19.2.4`.
- `package.json` is the authoritative dependency source for installed runtime versions.

## Reproduction

```bash
node -e 'const p=require("./package.json"); console.log(p.dependencies.react, p.dependencies["react-dom"])'
rg -n "React 19\.2\.4|React 19\.2\.6" README.md .ai/README.md package.json
```

## Expected behavior

Stack docs should match the dependency versions or explicitly state they are approximate major-version summaries.

## Actual behavior

Docs name a stale React patch version while `package.json` names the current package version.

## Suspected root cause

Recent dependency updates were committed with partial `.ai`/README refresh, and older stack summaries were not updated.

## Affected files/modules

- `README.md` (still stale; outside this `.ai`-only planning task)
- `.ai/README.md` (updated to React 19.2.6 on 2026-06-03)
- `.ai/10_state/current-state.md` (updated to React 19.2.6 on 2026-06-03)
- Any future plan that copies stack facts without checking `package.json`

## Impact

Low runtime risk; medium agent-drift risk because future agents may cite stale stack facts.

## Severity

LOW.

## Relationship to current plan

The ADD plan records live package evidence and warns future agents to verify stack facts from `package.json`.

## Proposed fix plan

1. `.ai/README.md` and `.ai/10_state/current-state.md` were updated to React `19.2.6` on 2026-06-03.
2. Root `README.md` still needs a separate root-docs sync to change React `19.2.4` to `19.2.6`, because the current planning task is constrained to `.ai` planning/documentation files.
3. Run `git diff --check` and record the docs-sync in `.ai/05_logs`.

## Verification plan

```bash
node -e 'const p=require("./package.json"); console.log(p.dependencies.react, p.dependencies["react-dom"])'
rg -n "React 19\.2\.4" README.md .ai/README.md .ai/10_state/current-state.md
git diff --check
```

## Blocks implementation?

No. The `.ai` canonical drift is resolved for this plan. Root `README.md` remains a documented out-of-scope docs-sync item and should be fixed before future root README-derived stack claims are copied.

## Plan reference

`.ai/03_plans/2026-06-03-agentic-development-framework-rollout/02_CODEBASE_RESEARCH.md`

## 2026-06-03 addendum — Notion mirror drift

Read-only Notion audit found the `05 Engineering and Architecture` page also carries stale stack facts: React/React DOM `19.2.4` and Supabase JS `2.105.4`, while live `package.json` records React/React DOM `19.2.6` and Supabase JS `2.106.2`. This is now tracked in `.ai/15_Bugs/2026-06-03-notion-agent-framework-mirror-and-stack-drift.md` and must be corrected during Phase 1B Notion sync.
