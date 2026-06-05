<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Quality Verdict and Gap Audit

## Verdict

I am **not 100% satisfied** with the original first-pass pack as an implementation handoff for massive performance upgrades.

It was a strong discovery pack: it identified the right surfaces, preserved evidence boundaries, and avoided unsafe overclaims. But it was not yet sharp enough to guarantee that future implementation would spend time on the highest-leverage bottlenecks. The missing layer was a ranked, evidence-gated implementation thesis: which optimizations are most likely to move Vercel Speed Insights/Core Web Vitals materially, how to prove each one before changing code, and where to stop if evidence contradicts the hypothesis.

## What was already good

- It correctly kept the work **docs-only** and avoided code changes.
- It identified the right broad performance surfaces:
  - root layout/providers/global CSS/fonts
  - landing animations/scripts
  - proxy/auth/cache headers
  - estimate workspace render/INP
  - data/Supabase query fan-out
  - share/publication and proposal export
- It documented key safety boundaries:
  - closed-beta auth cannot regress
  - `getClosedBetaAccessForEmail` has critical blast radius
  - share/token/password/session routes must not be cached unsafely
  - provider proof remains open until Vercel/production evidence exists
- It included future test and UltraQA surfaces.

## Critical gaps before this update

| Gap | Why it mattered | Fix added |
| --- | --- | --- |
| No ranked performance hypothesis scorecard | Future workers could optimize low-impact areas first. | `11-performance-hypothesis-scorecard.md` |
| No route-by-route blueprint | The plan named surfaces but did not define exact metric, likely bottleneck, first proof, first safe change, and guardrails per route bucket. | `13-route-by-route-optimization-blueprints.md` |
| Measurement plan was not concrete enough | “Capture metrics” is insufficient; implementation needs command-level attribution and evidence naming. | `12-measurement-attribution-playbook.md` |
| No explicit no-break sequencing | Performance work can easily break auth, share security, analytics privacy, or estimating workflows. | `14-safe-implementation-and-rollback-plan.md` |
| UltraQA matrix was future-feature oriented, not plan-quality oriented | Before implementation, the plan itself needed adversarial QA against false confidence and over-broad workstreams. | `15-ultraqa-doc-quality-gate.md` |
| Roadmap did not clearly say what would produce “massive” gains | Needed an explicit “major-gain thesis” and stop rules. | This file plus `11`, `13`, and README/CURRENT updates |

## Answer to “will this lead to massive performance upgrades?”

**Not guaranteed yet, because provider metrics are still open.** But after this update, the plan is much more likely to produce major upgrades if future implementation follows the evidence ladder.

The most plausible major gains are:

1. **Public route LCP/INP/TTFB:** root-provider/bundle containment, landing canvas/Lenis/script deferral, font containment, and public cache headers.
2. **Protected route TTFB:** careful proxy/public-route caching and query attribution without weakening `getUser()`/closed-beta checks.
3. **Estimate workspace INP:** measured lazy boundaries, render containment, cursor-broadcast throttling, and tree virtualization only if profiler evidence supports it.
4. **Data/query latency:** EXPLAIN-backed query consolidation/index work where fan-out is proven.
5. **Share/proposal latency:** pagination/query tightening and export benchmark-driven server work without caching sensitive tokenized responses.

## Implementation-readiness rule

Future code work should not begin with “make app faster.” It should begin with a single ranked hypothesis from `11-performance-hypothesis-scorecard.md`, complete the proof step in `12-measurement-attribution-playbook.md`, then execute the matching route blueprint in `13-route-by-route-optimization-blueprints.md` under the sequencing rules in `14-safe-implementation-and-rollback-plan.md`.

## Satisfaction after this update

After adding these docs, my satisfaction level is:

- **Planning coverage:** high.
- **Safety/no-break guardrails:** high.
- **Measurement specificity:** high, still blocked on Vercel dashboard values.
- **Guarantee of massive gains:** medium until Speed Insights route/device breakdown and bundle/profiler/query baselines are captured.

The pack is now suitable for high-impact implementation planning, but it still must not claim success until production/provider evidence proves the gains.
