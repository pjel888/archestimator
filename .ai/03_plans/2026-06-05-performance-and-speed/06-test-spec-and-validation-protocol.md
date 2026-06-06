<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Test Spec and Validation Protocol

## Success criteria

A future performance implementation is successful only when all relevant criteria are met:

- The targeted Speed Insights metric improves for the targeted route bucket, or local/prod trace evidence explains why more traffic/time is needed.
- No auth, share, proposal, estimate editing, collaboration, or analytics privacy regression occurs.
- Bundle/trace changes are attributable to specific files/dependencies.
- Provider/manual evidence is attached before any roadmap/archive completion claim.


## Evidence ladder requirement

Use `12-measurement-attribution-playbook.md` as the controlling evidence ladder. Local tests prove no obvious regression; they do not prove real-user performance. A future PR can claim:

- **local improvement** only with bundle/profiler/trace evidence,
- **hosted improvement** only with preview/production request timing or headers,
- **real-user improvement** only with Vercel Speed Insights route/device p75 over a comparable window.

No PR should be marked `COMPLETE` from build/lint/test output alone.

## Baseline commands

Run after dependencies are installed in the active worktree:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run test:e2e:perf
bun run perf:check-routes
```

If a command fails for unrelated known reasons, classify the failure and run focused checks for the touched surface.


## Cache and hosted timing checks

For cache/header work, capture normal-request evidence, not only browser DevTools output:

```bash
curl -I https://www.archestimator.com/
vercel httpstat -n https://www.archestimator.com/
```

Record `Cache-Control`, `CDN-Cache-Control`, `Vercel-CDN-Cache-Control`, `Set-Cookie`, `Authorization` assumptions, and `x-vercel-cache`. `vercel httpstat` may require a current Vercel CLI and local `httpstat`; if unavailable, document the substitute timing command.

## Surface-specific validation

| Surface | Required checks |
| --- | --- |
| Root layout/providers | `vercel-web-analytics-integration.test.ts`, route-transition perf, public page smoke, protected workshop smoke. |
| Analytics/Speed Insights | Privacy/redaction tests, tokenized share/invite drop tests, public page view allowlist tests, provider dashboard proof. |
| Landing animation/scripts | Lighthouse mobile, Chrome trace long tasks, screenshot visual comparison, consent on/off scenarios, reduced-motion check. |
| Proxy/auth | Auth proxy tests, hosted auth route verification, closed-beta allowlist tests, invite-entry tests, no `getSession()` substitution in proxy. |
| Estimate sheet/tree | Cost inputs, library insert, version control UI, context menu, DnD, route-transition peak-load profile, React Profiler evidence. |
| Data/query | Supabase EXPLAIN, `pg_stat_statements` or provider logs, RLS tests, repository unit tests, migration rollback plan. |
| Share/publication | Public share page tests, activity/comment/decision/session/password tests, no-store/security header checks. |
| Proposal export | Workbook unit tests, hosted export route verification, benchmark route time/memory, no client bundle import of ExcelJS. |

## Performance budgets to use initially

These are planning budgets; replace with provider baseline once captured.

| Metric/surface | Initial budget |
| --- | ---: |
| Public route LCP p75 mobile | <= 2.5s |
| Public route INP p75 mobile | <= 200ms |
| CLS p75 all major routes | <= 0.1 |
| Protected route TTFB p75 | <= 800ms until route-specific baseline exists |
| Workshop route transition | Existing `e2e/route-transition-performance.spec.ts` budgets |
| Estimate large-sheet interaction | No statistically significant regression from `route-transition-peak-load-profile` baseline |
| Proposal export route | Define from `scripts/benchmark-proposal-workbook.ts` representative fixture before optimizing |

## Evidence file naming

Use this folder for future evidence:

```text
/Users/philiplewis/archestimator/.ai/03_plans/2026-06-05-performance-and-speed/evidence/YYYY-MM-DD-<surface>-<metric>-<short-description>.<ext>
```

Examples:

- `evidence/2026-06-05-speed-insights-overview-mobile-last-7-days.png`
- `evidence/2026-06-05-bundle-analyzer-root-layout-before.md`
- `evidence/2026-06-05-lighthouse-home-mobile-before.json`
- `evidence/2026-06-05-react-profiler-estimate-select-node-before.md`

## Stop conditions

Stop implementation and return to planning if:

- A change touches `getClosedBetaAccessForEmail`, proxy auth, RLS/RPC, share token/session/password, or provider settings without explicit risk review.
- Speed Insights route data contradicts the assumed bottleneck.
- A performance improvement requires removing product behavior the owner has not approved.
- Bundle analyzer shows no measurable impact from the proposed change.
- Tests pass locally but production/provider proof remains absent; mark local-only, not complete.
