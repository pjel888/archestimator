<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Blast Radius and Risk Map

## Graph/index status

- `code-review-graph` was checked first and returned 0 files/nodes/edges for this worktree, so it was not usable for blast-radius results.
- GitNexus CLI was then run in pure index mode for this worktree and reported: 12,551 nodes, 22,754 edges, 561 clusters, 300 flows. Alias used: `archestimator-performance-plan`.

## Key GitNexus blast-radius findings

| Target | Result | Planning implication |
| --- | --- | --- |
| `RootLayout` | LOW upstream impact, 0 graph callers. | Source-level blast is low, but product blast is high because every route uses root layout. Require full smoke/build and Speed Insights comparison before changes. |
| `AppProviders` | LOW upstream graph impact, one direct test caller. | Graph blast is low, but public/auth/workshop route behavior depends on providers. Split only with route overlay/toast/query/bfcache tests. |
| `VercelWebAnalytics` | LOW graph impact; called by `RootLayout`. | Analytics wrapper changes are narrowly scoped in code, but privacy/telemetry blast is high. Keep redaction tests. |
| `createRequestPathResponse` | LOW graph impact; affects `proxy` and Supabase cookie `setAll` flow. | Header/redirect changes must preserve auth request path behavior. |
| `getClosedBetaAccessForEmail` | CRITICAL: 71 impacted nodes, 32 processes, 12 modules. | Treat beta access/auth optimization as high-risk. No shortcut around `getUser()`. Require auth/security tests and hosted auth proof. |
| `ProjectDashboardClient` | LOW graph impact; direct test caller `project-dashboard-client.test.tsx`. | UI-only chart/dashboard client changes are lower-risk if tests cover behavior. |
| `ProjectChartsClient` | LOW graph impact; direct test caller `project-charts-ui.test.tsx`. | Chart lazy-loading/splitting is plausible but must verify chart route and dashboard cards. |
| `EstimateSheetContent` | Ambiguous by name; context on `Function:src/components/workshop/EstimateSheetContent.tsx:EstimateSheetContent` shows many test callers and many outgoing hooks/components/actions. | High practical blast. Split and memoize only behind focused estimate-sheet regression tests. |
| `EstimateSheetTree` | Ambiguous by name; context on `Function:src/components/workshop/EstimateSheetTree.tsx:EstimateSheetTree` shows many tests and UI dependencies. | High practical blast. DnD/tree behavior requires thorough tests. |
| `createProposalWorkbook` | LOW/partial graph result; outgoing workbook worksheet creators and tests. | Export changes should remain server-only and be benchmarked for memory/time. |
| `SharePage` | LOW graph impact. | Source graph undercounts dynamic route/user-flow risk; share/publication tests remain mandatory. |
| `src/app/api/share/[token]/activity/route.ts:GET` | Context shows multiple outgoing security/activity/rate-limit/publication calls and test coverage. | Treat no-store/security as invariant; optimize query shape without weakening checks. |

## Risk tiers for future implementation

### Tier 0 — Measurement-only, safe first

- Capture Vercel Speed Insights metrics.
- Run bundle analyzer.
- Run route-transition e2e perf specs.
- Run local/prod `vercel httpstat` or equivalent latency checks.
- Add docs/evidence files.

### Tier 1 — Low source blast, medium product blast

- Add measurement wrappers or scripts.
- Adjust analytics loading only with privacy tests.
- Chart/project dashboard lazy loading if no data model changes.
- Bundle import optimization for packages already configured or verified by analyzer.

### Tier 2 — Medium/high user-flow blast

- Root provider split.
- Landing animation/smooth-scroll gating.
- Estimate sheet modal/sidebar/lazy boundaries.
- Project publication summary query consolidation.
- Share activity pagination/query optimization.

### Tier 3 — Critical blast; needs explicit security/data signoff

- Proxy/auth changes.
- Closed-beta access caching/check rewrites.
- RLS/RPC changes.
- Database index migrations or query plan changes on live Supabase.
- Any change that alters public share token/password/session semantics.

## Future impact-analysis rule

Before editing a future symbol, run:

```bash
npx gitnexus impact -r archestimator-performance-plan --depth 3 --include-tests <symbol-or-uid>
```

If risk is HIGH or CRITICAL, stop and record the blast radius in the implementation issue before editing.
