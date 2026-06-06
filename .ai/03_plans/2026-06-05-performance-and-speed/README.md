<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# 2026-06-05 Performance and Speed Planning Pack

**Status:** planning pack plus PR-0B proof-harness implementation packet / optimization not yet shipped.
**Branch/worktree used for audit:** `plan/performance-and-speed` at `/Users/philiplewis/archestimator.omx-worktrees/launch-plan-performance-and-speed`.
**Canonical docs target requested by owner:** `/Users/philiplewis/archestimator/.ai/03_plans/2026-06-05-performance-and-speed`.

## Outcome

Create an implementation-ready plan to improve Archestimator speed and Core Web Vitals without breaking closed-beta auth, estimating workflows, share/publication, proposal export, analytics privacy, or existing route-transition evidence gates.

## Files in this pack

### Root docs

1. `00-executive-brief-and-evidence-boundaries.md`
2. `01-vercel-speed-insights-and-metrics-intake.md`
3. `02-codebase-performance-audit.md`
4. `03-blast-radius-and-risk-map.md`
5. `04-current-official-research.md`
6. `05-performance-roadmap-and-workstream-plan.md`
7. `06-test-spec-and-validation-protocol.md`
8. `07-ultraqa-scenario-matrix.md`
9. `08-worker-handoff-prompts.md`
10. `09-open-gates-and-provider-evidence.md`
11. `10-quality-verdict-and-gap-audit.md`
12. `11-performance-hypothesis-scorecard.md`
13. `12-measurement-attribution-playbook.md`
14. `13-route-by-route-optimization-blueprints.md`
15. `14-safe-implementation-and-rollback-plan.md`
16. `15-ultraqa-doc-quality-gate.md`
17. `16-metric-decision-tree-and-sequencing-gates.md`
18. `17-per-surface-acceptance-criteria.md`
19. `18-test-fixtures-and-data-volume-spec.md`
20. `19-risk-register-and-rollback-runbook.md`
21. `20-telemetry-privacy-decision-record.md`
22. `21-evidence-index.md`
23. `22-roadmap-truth-sync-and-status-gates.md`
24. `23-linked-existing-performance-plans.md`
25. `24-cache-safety-and-public-personalization-matrix.md`
26. `25-next-react-vercel-research-addendum.md`
27. `26-readiness-scorecard-and-100-percent-gate.md`
28. `27-ready-implementation-packets.md`
29. `28-captured-baseline-and-remaining-provider-gap.md`
30. `29-final-ultraqa-readiness-audit.md`
31. `30-pack-manifest-and-completion-audit.md`
32. `90-workflow-evidence.md`
33. `CURRENT_CANONICAL_PLAN.md`
34. `README.md`
35. `prd-performance-and-speed.md`
36. `test-spec-performance-and-speed.md`

### Evidence artifacts

1. `evidence/2026-06-05-computer-use-speed-insights-attempt.md`
2. `evidence/2026-06-05-hosted-public-header-timing-baseline.md`
3. `evidence/2026-06-05-vercel-httpstat-attempt.md`
4. `evidence/2026-06-05-vercel-httpstat-production-baseline.md`
5. `evidence/2026-06-06-public-cache-safety-harness.md`
6. `evidence/README.md`

## Non-goals

- Code-bearing mitigation and proof slices now exist on `feat/performance-and-speed-pr-0b-cache-safety`; this plan pack still separates implementation proof from Speed Insights completion proof.
- No dependency changes are introduced by the synthetic hosted fixture proof.
- Temporary provider fixtures were created only under owner-granted authority and cleaned up to zero recorded residue.
- No claim that Speed Insights/RES is fixed or that route-transition performance is complete.

## Quality gate verdict

The pack is document-quality complete and implementation-ready for future bounded performance stories. The first safe packet, `PR-0B`, has been executed; later synthetic hosted fixtures also closed signed-in auth, hosted export, and valid private media evidence blockers. The pack still does not claim RES/performance gains until comparable Vercel Speed Insights/provider evidence proves them.

## PR-0B implementation result

`PR-0B` in `27-ready-implementation-packets.md` has now been executed in branch `feat/performance-and-speed-pr-0b-cache-safety`. The harness/test result is **IMPLEMENTATION PACKET COMPLETE / OPTIMIZATION NOT YET SHIPPED**: public marketing routes are still not safe for broad shared HTML caching today, so `MARKETING_PAGE_CACHE_CONTROL` must remain unchanged until auth-specific CTA output, A/B variants, consent behavior, and hosted cache headers are isolated or otherwise proven safe.

## Recommended next step

Capture dashboard overview/recommendation cards if access becomes available, wait for comparable Speed Insights windows for the deployed branch, and plan the next cache-safety follow-up that splits/static-isolates public personalized output before any cache-header relaxation. Do not claim RES completion, implement cache-header relaxation, telemetry package changes, root-provider splitting, or estimate/workshop optimization until the matching packet gates are satisfied.
