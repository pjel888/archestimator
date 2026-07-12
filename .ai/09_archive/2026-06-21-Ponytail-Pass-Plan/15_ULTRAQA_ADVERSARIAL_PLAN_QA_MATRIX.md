# 15 — UltraQA Adversarial Plan QA Matrix

**Date:** 2026-06-21 · **Status:** PLAN-PACK ADVERSARIAL QA

This is the UltraQA layer for the docs-only Ponytail Pass Plan. It attacks the plan as an implementation artifact: can future agents misread it, execute stale commands, skip owner gates, or turn known baseline failures into false confidence?

## Adversarial scenarios

| # | Scenario | Failure mode if plan is weak | Required defense | Evidence location |
|---:|---|---|---|---|
| 1 | Implementer runs command snippets literally | `rg ... src/ app/` fails because top-level `app/` does not exist | All command snippets use repo-valid paths (`src`, `tests`, `src/stories`, `.storybook`) | Static stale-path check |
| 2 | Implementer sees a full-suite green claim | Known baseline-red suite blocks work or hides new failures | Baseline-diff rule replaces full-green assumptions | `08_VERIFICATION_STRATEGY.md` |
| 3 | Visual swap is treated as simple dep cleanup | Landing polish, reduced motion, anchors, or text accessibility regresses | Owner decision and visual QA matrix required | `13_VISUAL_DECISION_AND_QA_MATRIX.md` |
| 4 | Public share route has no client caller | Route is deleted despite email/server/token usage | Public-share contract required before any T3.14 cut | `14_SECURITY_AND_NETWORK_CONTRACTS.md` |
| 5 | AI feature kept hidden | Routes remain callable directly with flags/env drift | Keep-hidden AI contract requires route-level denial and no provider calls while disabled | `14_SECURITY_AND_NETWORK_CONTRACTS.md` |
| 6 | Auth helper extraction centralizes a bug | Cross-workspace/project/library mutation becomes possible | Actor/role/scope/RLS/rate-limit/deny-before-mutate checklist | `14_SECURITY_AND_NETWORK_CONTRACTS.md` |
| 7 | Sanitizer swap uses browser DOM APIs | Route-handler callers fail at runtime or XSS filtering weakens | Server-safe sanitizer path and targeted share-route tests | `06_TIER_3_QUICK_CUTS.md`, `14_SECURITY_AND_NETWORK_CONTRACTS.md` |
| 8 | Multiple agents edit package/source concurrently | Lockfile/package conflicts or overwritten source edits | Package edits serialized; source quick cuts parallelize by file only | `11_AGENT_COORDINATION_LEDGER.md` |
| 9 | T3.6-T3.14 remain as prose only | Second-pass findings never become executable units | Wave 2C row-level actions/gates added | `07_IMPLEMENTATION_WAVES.md` |
| 10 | Plan claims 100% while owner choices remain open | "100%" is mistaken for all product decisions resolved | Scorecard defines implementation readiness as explicit decision/gate readiness, not owner decisions pre-filled | `12_QUALITY_SCORECARD_AND_REQUIREMENT_CLOSURE.md` |

## Static QA commands

Run these before closing the plan pack:

```bash
rg -n "(^|[^/])app/api|src/ app/|still validating|\\(pending\\)|\\bTBD\\b|full suite passes|all green|55 dead exports|Agent C is validating" .ai/03_plans/2026-06-21-Ponytail-Pass-Plan -g '!12_QUALITY_SCORECARD_AND_REQUIREMENT_CLOSURE.md' -g '!15_ULTRAQA_ADVERSARIAL_PLAN_QA_MATRIX.md'
git diff --check -- .ai/03_plans/2026-06-21-Ponytail-Pass-Plan
find .ai/03_plans/2026-06-21-Ponytail-Pass-Plan -maxdepth 1 -type f -name '*.md' | sort
```

Expected result:

- The stale-marker grep returns 0 actionable matches. If matches are intentional examples in this UltraQA file, the final report must say so and name them.
- `git diff --check` exits 0.
- The plan directory contains exactly the 16 markdown docs listed in `00_README.md`.

## Completion decision

The plan pack is adversarially ready when:

1. Static QA commands pass or only match intentional UltraQA examples.
2. Every reviewer issue is either fixed in a primary doc or deliberately scoped as a future owner decision with a concrete payload.
3. No source, package, lockfile, migration, provider, or database state changed during this docs-only pass.
4. The active goal can be closed with evidence, not aspiration.
