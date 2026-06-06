<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Workflow Evidence

## Tools/workflows used

- `$computer-use`: attempted for logged-in Vercel Speed Insights UI; both Chrome app-state attempts timed out after 120s.
- Vercel connector: project/deployment evidence collected.
- `$team`: launched `docs-only-read-only-e-367e7067` with 3 workers for read-only evidence lanes. Startup evidence included worker panes `%21`, `%22`, `%23`, HUD `%24`, and ACKs from all workers.
- `$ultragoal`: Codex goal created for the docs-only performance planning pack; `.omx/ultragoal` files created in the worktree.
- `$ultrawork`: used as parallel evidence discipline; transient state was cleared to allow Team startup because OMX rejected overlapping Autopilot/Team state.
- `$autopilot`: treated as supervised docs-only planning loop; no implementation or code-review/UltraQA code gates were run because this is not a coding task.
- `$ultraqa`: represented by `07-ultraqa-scenario-matrix.md` for future implementation, and skipped as runtime QA because no app code changed.
- Superpowers `writing-plans`: used to create implementation-ready planning artifacts at the user-specified location.

## Repository and graph evidence

- Branch/worktree audited: `/Users/philiplewis/archestimator.omx-worktrees/launch-plan-performance-and-speed` on `plan/performance-and-speed`.
- `code-review-graph` was checked first and had 0 files/nodes/edges for this worktree.
- GitNexus pure index completed successfully:
  - Alias: `archestimator-performance-plan`
  - Nodes: 12,551
  - Edges: 22,754
  - Clusters: 561
  - Flows: 300
  - Status: up-to-date at commit `8a1379e`.

## Key command evidence

```bash
npx gitnexus analyze --index-only --name archestimator-performance-plan --allow-duplicate-name .
npx gitnexus status
npx gitnexus query -r archestimator-performance-plan "route transition performance workshop protected routes"
npx gitnexus impact -r archestimator-performance-plan --depth 3 --include-tests getClosedBetaAccessForEmail
npx gitnexus context -r archestimator-performance-plan "Function:src/components/workshop/EstimateSheetContent.tsx:EstimateSheetContent"
```

## Environment gaps

- This worktree did not have `node_modules`; build/typecheck/lint/test were not run as completion evidence.
- Live Vercel Speed Insights UI values remain open because Computer Use timed out.
- One MCP transport dropped during research; Team state was preserved and CLI/file-backed fallbacks were used.

## Team runtime note

The Team runtime synthesized all task ownership under worker-1, which blocked worker-2 and worker-3. The leader attempted API/state repair and claim release. Worker-1 still produced the primary repo audit evidence used in this pack. Future Team launches for read-only planning should create separate explicit tasks or use native subagents to avoid this ownership race.

## Second-pass quality escalation — 2026-06-05

User asked whether the pack was good enough to drive massive performance upgrades. Leader verdict: **not 100% satisfied** with the first pass.

Actions taken:

- Ran three parallel read-only audit lanes:
  - architect/critic docs-quality lane,
  - official Next.js/React/Vercel research lane,
  - repo-surface performance audit lane.
- Refreshed official-doc evidence for Next.js 16 public pages/cache components/Image/CSS config, React performance caveats, Vercel Speed Insights package/privacy controls, CDN cache, and `httpstat`.
- Added scorecard, decision tree, acceptance thresholds, fixture spec, telemetry/privacy record, cache safety matrix, linked-plan sync, evidence index, and rollback/runbook docs.
- Updated `README.md` and `CURRENT_CANONICAL_PLAN.md` to list every pack file.

Verification after second pass:

- Root markdown files in plan folder: 31.
- Evidence folder markdown files: 1 (`evidence/README.md`).
- README listed files: 31.
- CURRENT_CANONICAL_PLAN listed files: 31.
- Non-intentional hygiene scan: clean.
- Remaining `provider-open` markers are intentional evidence gates for Vercel Speed Insights/provider data.
- No application code implementation performed.

## 100 percent readiness push — 2026-06-05

- Captured Vercel connector project/deployment context for latest production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`.
- Captured public hosted `curl -I` and timing evidence for `/`, `/features`, `/pricing`, `/contact`; all returned `private, no-cache, no-store` and `x-vercel-cache: MISS`.
- Attempted `vercel httpstat`; documented toolchain failure and curl substitute.
- Audited landing personalization/cache risk: marketing pages call `getLandingAuthState`; home page reads consent/A-B cookies and can set `ab_test`.
- Added final readiness docs `26`-`29`; first safe code-bearing implementation packet is PR-0B in `27-ready-implementation-packets.md`.

Superseding inventory after final readiness pass: root markdown files = 36; evidence files = 4. `30-pack-manifest-and-completion-audit.md` is the authoritative inventory.
- Computer Use retry for Speed Insights dashboard timed out after 120s; recorded in evidence/2026-06-05-computer-use-speed-insights-attempt.md.

## PR-0B cache-safety implementation packet — 2026-06-06

- Active implementation worktree audited: `/Users/philiplewis/archestimator.omx-worktrees/impl-performance-and-speed-pr-0b-cache-safety` on `feat/performance-and-speed-pr-0b-cache-safety`.
- `code-review-graph` was checked first and returned `0 nodes / 0 edges`; this worktree graph was unavailable, so the implementation fell back to direct repo inspection and bounded read-only sidecar audits.
- No production symbol was edited. The packet added a test and script harness only, plus evidence/docs updates.
- TDD evidence:
  - RED: `bun run test:dom -- tests/vitest/public-cache-safety-harness.test.tsx` failed because `scripts/check-public-cache-safety` did not exist.
  - GREEN: the same command passed after adding the harness (`5 passed`).
- Hosted harness evidence:
  - `PUBLIC_CACHE_SAFETY_OUTPUT=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-public-cache-safety-harness.md bun run scripts/check-public-cache-safety.ts` exited `0`.
  - The report covered `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, and `/terms` across anonymous, synthetic logged-in-cookie, consent rejected, consent accepted + A/B A, consent accepted + A/B B, and anonymous mobile scenarios.
  - Result: all seven routes remain incompatible with broad shared HTML cache today; hosted headers are private/no-cache/no-store with `x-vercel-cache: MISS`, `/` body varies under consent/A-B scenarios, and logged-in CTA output is source-proven to vary.
- Completion language for this packet: **IMPLEMENTATION PACKET COMPLETE / OPTIMIZATION NOT YET SHIPPED**.

## PR-0A/PR-1B evidence reconciliation — 2026-06-06

- `$team` run `read-only-evidence-te-54927f7e` reached phase `complete`: 2 workers, 2 completed tasks, 0 pending/blocked/in-progress/failed.
- Worker-1 confirmed PR-0A was blocked from connector/UI surfaces at that time; later `vercel metrics` CLI evidence superseded the numeric p75 blocker while dashboard overview/export remains unavailable.
- Worker-2 confirmed PR-1B must stay analyzer-baseline-first and flagged root provider/global CSS hazards before runtime shell edits.
- Leader-side read-only Vercel connector refresh confirmed production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` at commit `2d9e12d4d8b3f08a6da686bcb06f753474590511`; evidence captured in `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md`.
- Hosted public-route curl timing/header refresh covered `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, and `/terms`; all still returned private/no-store cache headers with `x-vercel-cache: MISS`.
- `ANALYZE=true bun run build` passed under Turbopack but did not emit `@next/bundle-analyzer` reports because Next requires the webpack build path for that analyzer.
- First `ANALYZE=true bunx next build --webpack` emitted analyzer reports but exposed an existing invalid route export in `src/app/api/webhooks/resend/route.ts`.
- Moved `RESEND_WEBHOOK_MAX_BODY_BYTES` to `src/lib/email/resend-webhook-route-constants.ts` and updated `tests/vitest/resend-webhook-route.test.ts`; focused route test passed.
- Clean `ANALYZE=true bunx next build --webpack` then exited 0 and emitted `.next/analyze/client.html`, `.next/analyze/nodejs.html`, and `.next/analyze/edge.html`; summarized in `evidence/2026-06-06-bundle-analyzer-baseline.md`.


## Speed Insights Chrome retry — 2026-06-06

- Attempted read-only Computer Use `get_app_state` against `Google Chrome` to access the Vercel Speed Insights dashboard.
- Result: timed out after 120s.
- Evidence: `evidence/2026-06-06-speed-insights-chrome-retry.md`.
- Decision at that time: Speed Insights dashboard/export values remained provider-open; later CLI p75 evidence superseded the numeric portion, but no telemetry package change is justified from this attempt.

## PR-1A telemetry privacy decision — 2026-06-06

- Closed `20-telemetry-privacy-decision-record.md` for PR-1A with Option A: dashboard/provider-only Speed Insights, no package change.
- Preserved existing Web Analytics with `beforeSend={redactVercelAnalyticsEvent}`.
- Kept `@vercel/speed-insights` absent from `package.json` and `<SpeedInsights />` absent from the root layout/component surface.
- Added regression coverage in `tests/vitest/vercel-web-analytics-integration.test.ts` to lock the no-package decision record alongside existing sensitive-route redaction/drop tests.
- Completion language: **TELEMETRY DECISION IMPLEMENTED / PROVIDER PROOF OPEN**.


## Route-transition public baseline — 2026-06-06

- Ran `bun run test:e2e:perf`: 6 passed, 2 authenticated checks skipped because no authenticated fixture/storage state was enabled.
- Ran `bun run perf:measure-routes` against local dev server `http://127.0.0.1:3039` with `SKIP_AUTHENTICATED=1`, producing `evidence/2026-06-06-route-transition-public-baseline.json`.
- Ran `bun run perf:check-routes`, producing `evidence/2026-06-06-route-transition-public-readiness.json` with `routeTransitionReady: true`.
- Summary evidence lives in `evidence/2026-06-06-route-transition-public-baseline.md`.
- Completion language: **LOCAL ROUTE-TRANSITION BASELINE CAPTURED / AUTHENTICATED AND PROVIDER PROOF OPEN**.


## Estimate peak-load profile baseline — 2026-06-06

- Ran `ROUTE_PERF_PROFILE_OUTPUT=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-estimate-peak-load-profile.json bun run perf:profile-peak-load`.
- Result: 1 test file / 1 test passed.
- Captured local jsdom profile metrics: 50 project estimates initial render 171.01ms; 200 estimate rows initial render 355.56ms.
- Evidence summary: `evidence/2026-06-06-estimate-peak-load-profile.md`.
- Completion language: **LOCAL ESTIMATE PEAK-LOAD BASELINE CAPTURED / BROWSER PROFILER AND PROVIDER INP PROOF OPEN**.


## Proposal workbook benchmark baseline — 2026-06-06

- Ran `OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-proposal-workbook-benchmark.json bun run scripts/benchmark-proposal-workbook.ts`.
- Result: benchmark command passed and wrote JSON evidence.
- Captured local synthetic workbook generation metrics: 500 rows in 170.17ms, 1000 rows in 172.6ms, and 2500 rows in 393.39ms.
- Evidence summary: `evidence/2026-06-06-proposal-workbook-benchmark.md`.
- Completion language: **LOCAL PROPOSAL WORKBOOK BENCHMARK CAPTURED / HOSTED EXPORT ROUTE PROOF OPEN**.


## Repo-only query inventory baseline — 2026-06-06

- Ran `OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-query-inventory-repo-only.md bun run dbidx:audit-repo`.
- Result: repo-only scanner passed with 262 Supabase query references and 103 migration index statements.
- No Supabase provider connection, live metrics, DDL, migration apply, EXPLAIN, or unrelated provider project access occurred.
- Evidence: `evidence/2026-06-06-query-inventory-repo-only.md`.
- Completion language: **REPO-ONLY QUERY INVENTORY CAPTURED / LIVE EXPLAIN AND PROVIDER METRICS OPEN**.


## Roadmap decision truth-sync — 2026-06-06

- Marked Workstream 1.3 complete for the local PR-1A telemetry privacy decision: dashboard/provider-only Speed Insights, no package change, sensitive Web Analytics redaction preserved.
- Marked Workstream 3.2 complete for the local public-route cache review: PR-0B evidence keeps `MARKETING_PAGE_CACHE_CONTROL` unchanged because public marketing HTML is not broad shared-cache-safe today.
- Updated open-gate decision checkboxes for telemetry/cache guardrails only; later evidence captures Vercel CLI p75 and live EXPLAIN/provider proof, while browser traces, dashboard UI evidence, and hosted route proofs remain open.


## Public mobile Lighthouse baseline — 2026-06-06

- Ran `bun run build`, then `PORT=3044 bun run start -- -p 3044`, then `bunx lighthouse` mobile performance traces for `/`, `/features`, `/pricing`, and `/contact` with landing consent off and accepted-consent cookie.
- Saved JSON/HTML reports plus compressed trace/devtools assets under `evidence/public-lighthouse-2026-06-06/`.
- Summary: home scored 80 consent-off and 88 consent-on; features 89/91; pricing 88/89; contact 88/89. Home consent-off was the local outlier with TBT 378.48ms.
- Local limitation: accepted-consent traces do not prove production GA/Clarity or hosted analytics behavior; later CLI evidence captures Speed Insights p75, but hosted analytics proof remains open.
- Completion language: **LOCAL PUBLIC MOBILE LIGHTHOUSE BASELINE CAPTURED / SPEED INSIGHTS AND HOSTED ANALYTICS PROOF OPEN**.

## Neat mobile fallback after-trace — 2026-06-06

- Implemented a static fallback for mobile, coarse-pointer, and reduced-motion clients in `NeatWireframeBackground`; eligible desktop clients dynamically import and activate `@firecms/neat` after idle/timeout instead of on the initial client critical path.
- Ran focused DOM coverage for the fallback and idle-load path plus existing landing tests: `bun run test:dom -- tests/vitest/neat-wireframe-background.test.tsx tests/vitest/landing-company-proof.test.ts tests/vitest/landing-interactivity.test.tsx` passed 3 files / 15 tests.
- Ran `bun run type-check` and `bun run build`; both passed.
- Ran focused local mobile Lighthouse after-traces for `/` consent off/on under `next start` on port 3045; evidence lives in `evidence/neat-mobile-fallback-2026-06-06/`.
- Result: consent-off TBT improved 378.48ms -> 52.00ms and score 80 -> 85, while consent-off LCP/Speed Index worsened in this single local run; consent-on score/TBT/LCP/Speed Index all improved in this run.
- Extracted Lighthouse final screenshots into `evidence/neat-mobile-fallback-2026-06-06/visual-comparison/`; manual review confirms the mobile hero layout remains intact with an intentional static orange gradient instead of the animated grid.
- Completion language: **IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN**.

## Lenis non-home scope after-trace — 2026-06-06

- Removed `LandingSmoothScrollProvider` from `PublicPageShell`, preserving it only on the home page where the full landing section stack still uses reduced-motion-aware smooth scrolling.
- Ran focused landing regression coverage: `bun run test:dom -- tests/vitest/public-page-shell.test.tsx tests/vitest/landing-company-proof.test.ts tests/vitest/landing-interactivity.test.tsx tests/vitest/neat-wireframe-background.test.tsx` passed 4 files / 17 tests.
- Ran `bun run type-check` and `bun run build`; both passed.
- Ran local mobile Lighthouse after-traces for `/features`, `/pricing`, and `/contact` with consent off/on under `next start` on port 3046; evidence lives in `evidence/lenis-non-home-scope-2026-06-06/`.
- Ran a Playwright non-home navigation smoke under `next start` on port 3047; `/features` direct load and header navigation to `/pricing` and `/contact` passed, with only the known local `/_vercel/insights/script.js` 404 ignored.
- Result: `/features` improved to 92/92, `/pricing` improved to 89/92, and `/contact` stayed score-stable at 89/89 in this local run; TBT was 12-14.5ms across all non-home after-traces and CLS stayed 0.
- Completion language: **IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN**.

## Public image/font LCP audit — 2026-06-06

- Removed unused root `next/font` families from `src/app/layout.tsx`: public routes now register only `Inter` and `Roboto_Mono` variables.
- Removed unused global font aliases for Poppins and Source Serif from `src/app/globals.css`.
- Added `tests/vitest/public-font-lcp-audit.test.ts` to lock the no-unused-root-font/no-image-preload decision against the captured public Lighthouse baseline.
- Ran local mobile Lighthouse after-traces for `/` and `/features` consent-off under `next start` on port 3048; evidence lives in `evidence/public-image-font-lcp-audit-2026-06-06/`.
- Result: built CSS contains Inter and Roboto Mono only (`containsPoppins=false`, `containsSourceSerif=false`); `/features` improved locally (score 89 -> 92, LCP 3782.31ms -> 3322.06ms) and `/` improved score/TBT with roughly stable LCP in this sample.
- No image preload/Next Image change was made because current public evidence did not identify an image LCP candidate; the measured image request is the small logo SVG.
- Completion language: **LOCAL FONT SURFACE REDUCED / PROVIDER PROOF OPEN**.

## PR-1B root provider split decision — 2026-06-06

- Reconciled Workstream 1.2 after analyzer/root-shell evidence and the targeted public route mitigations.
- Decision: do not split `AppProviders`, move global CSS, or restructure root providers from the current evidence.
- Rationale: analyzer evidence did not attribute material public-route cost to the root provider stack; safer local wins were Neat mobile fallback, non-home Lenis scoping, and unused root font removal.
- Reopen condition: hosted Speed Insights, manual trace, or analyzer evidence must attribute a material public-route regression to the root provider stack.
- Completion language: **ROOT PROVIDER SPLIT NOT JUSTIFIED / PROVIDER PROOF OPEN**.

## Shared-link activity benchmark — 2026-06-06

- Added `scripts/benchmark-shared-link-activity.ts` as a synthetic local benchmark for current shared-link activity fan-out and merge/sort/compose cost.
- Added `tests/vitest/shared-link-activity-benchmark.test.ts` to lock the current static query plan and public/internal visibility assumptions.
- Ran `OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-shared-link-activity-benchmark.json MARKDOWN_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-shared-link-activity-benchmark.md bun run scripts/benchmark-shared-link-activity.ts`.
- Result: public anonymous path = 3 activity/publication queries, public recipient-session path = 5, owner include-telemetry path = 6 activity-table queries before auth/RBAC overhead. Synthetic 2500-row local composition in this run: owner 11.44ms, public anonymous 9.97ms, public recipient-session 7.84ms.
- No production endpoint, RLS, SQL, cache, or Supabase provider state changed.
- Completion language: **LOCAL BENCHMARK CAPTURED / HOSTED SUPABASE PROOF OPEN**.

## Share/publication no-store invariants — 2026-06-06

- Added `tests/vitest/share-no-store-invariants.test.ts` to lock tokenized share API cache/security boundaries before future endpoint optimization.
- Covered all `/api/share/[token]` route handlers for `force-dynamic`, `Cache-Control: no-store`, and absence of public cache/revalidate/s-maxage opt-ins.
- Covered `/share/[token]/page.tsx` for force-dynamic behavior and absence of numeric `revalidate` / `unstable_cache`.
- Ran `bun run test:dom -- tests/vitest/share-no-store-invariants.test.ts tests/vitest/project-publication-security.test.ts tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-page.test.tsx`: 4 files / 56 tests passed.
- Evidence: `evidence/2026-06-06-share-no-store-invariants.md`.
- Completion language: **LOCAL INVARIANTS LOCKED / HOSTED PROOF OPEN**.

## Per-route query inventory — 2026-06-06

- Added `scripts/build-performance-query-inventory.ts` to produce a repo-static per-route query map before Supabase/RPC/index changes.
- Added `tests/vitest/performance-query-inventory.test.ts` to lock bucket classification, table/RPC extraction, count-style `.select("id", { count: "exact" })` parsing, and payload-shape summaries.
- Ran `OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-per-route-query-inventory.json MARKDOWN_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-per-route-query-inventory.md bun run scripts/build-performance-query-inventory.ts`.
- Result: 262 repo-static table/RPC references grouped into 7 buckets: ai/package-builder 76, collaboration/invite 36, component-library 18, media-upload 2, project-charts 5, public-share/publication 68, workshop projects/estimates 57.
- Payload-size proxy is selected-column shape/count from source; live bytes, row counts, RLS cost, Supabase EXPLAIN, and hosted route timings remain open.
- Completion language: **REPO-STATIC QUERY INVENTORY CAPTURED / LIVE PROVIDER PROOF OPEN**.

## Estimate cursor broadcast pressure guard — 2026-06-06

- Edited `src/hooks/use-estimate-cursor-broadcast.ts` after GitNexus impact reported LOW risk for `useEstimateCursorCollaboration`: 2 direct callers, 0 affected processes.
- Added `CURSOR_BROADCAST_MIN_DISTANCE_PX` and `shouldQueueCursorBroadcast` so same-cell pointer moves under 6px are ignored before the existing timed broadcast throttle; row/column target changes still queue immediately.
- Added `tests/vitest/estimate-cursor-broadcast-throttle.test.ts` and `scripts/benchmark-estimate-cursor-broadcast.ts`.
- Ran `OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-estimate-cursor-broadcast-pressure.json MARKDOWN_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-estimate-cursor-broadcast-pressure.md bun run scripts/benchmark-estimate-cursor-broadcast.ts`.
- Result: synthetic same-cell movement queued 20 broadcasts from 120 moves (83% reduction), while row target changes queued all 120 moves.
- Completion language: **LOCAL CURSOR PRESSURE GUARD IMPLEMENTED / PROVIDER PROOF OPEN**.

## Hosted proposal export benchmark harness readiness — 2026-06-06

- Extended `scripts/verify-hosted-export-route.ts` from one-shot smoke to sanitized benchmark mode with `HOSTED_EXPORT_RUNS`, JSON `samples`, min/average/max duration fields, and optional `MARKDOWN_FILE` output.
- Preserved redaction of auth cookies, auth headers, and production-derived workbook filenames.
- Added tests in `tests/vitest/hosted-export-route-smoke-script.test.ts` for multi-run benchmark output and Markdown env parsing.
- Ran the script without hosted fixture env to prove it fails closed instead of fabricating proof; log: `evidence/2026-06-06-hosted-proposal-export-benchmark-input-gap.log`.
- Evidence: `evidence/2026-06-06-hosted-proposal-export-benchmark-readiness.md`.
- Completion language: **BENCHMARK HARNESS READY / AUTHENTICATED HOSTED FIXTURE OPEN**.

## Query consolidation decision — 2026-06-06

- Reviewed repo-only query/index audit, per-route static query inventory, and shared-link activity local benchmark evidence.
- Decision: do not consolidate query fan-out, add RPCs, or add database indexes from the current local/static evidence.
- Rationale: selected-column counts are only payload proxies; no live EXPLAIN, provider metrics, row counts, RLS cost, `pg_stat_statements`, or hosted route timings prove a bottleneck yet.
- Evidence: `evidence/2026-06-06-query-consolidation-decision.md`.
- Completion language: **CONSOLIDATION NOT JUSTIFIED / LIVE PROVIDER PROOF OPEN**.

## Estimate lazy-boundary / virtualization decision — 2026-06-06

- Reviewed local Workstream 4 peak-load evidence and the cursor broadcast pressure guard evidence.
- Decision: do not split lazy UI boundaries or implement tree virtualization/windowing from the current jsdom-only baseline.
- Rationale: current evidence does not attribute a browser INP bottleneck to specific modal/sidebar/preview/chart boundaries or tree row rendering; speculative splitting/virtualization would risk editing, DnD, keyboard, context menu, search, accessibility, and collaboration regressions.
- Evidence: `evidence/2026-06-06-estimate-lazy-boundary-virtualization-decision.md`.
- Completion language: **NOT JUSTIFIED FROM LOCAL BASELINE / BROWSER PROFILER PROOF OPEN**.

## Release/rollback and readiness-language audit — 2026-06-06

- Captured Workstream 7 local release matrix for each performance surface shipped, deferred, or held behind provider proof.
- Evidence: `evidence/2026-06-06-release-rollback-readiness-language.md`.
- Closed locally: 7.1 one-surface-at-a-time release evidence and 7.3 conservative closed-beta/provider-open language.
- Still open: 7.2 Speed Insights window comparison and provider/manual gates that require Vercel dashboard overview/export, signed-in hosted auth fixtures, hosted export fixtures, or valid private media/share fixtures. Later production postfix evidence captures signed-out/probe-safe no-store proof.
- Completion language: **LOCAL RELEASE MATRIX CAPTURED / SPEED INSIGHTS WINDOW PROOF OPEN**.

## Live Supabase EXPLAIN/provider proof — 2026-06-06

- Captured live provider proof for Workstream 5.2 against Supabase project `ebxxqidacheyapmmzavr`.
- Evidence: `evidence/2026-06-06-live-supabase-explain-provider-proof.md`.
- Inputs: aggregate table/index stats, `pg_stat_statements`, focused `EXPLAIN (ANALYZE, BUFFERS)`, and Supabase performance advisor output.
- Decision: no index, RPC, or query-consolidation migration is justified from current closed-beta row counts and plans; advisor/RLS findings require separate security-reviewed, owner-approved migration planning.
- Completion language: **LIVE PROVIDER PROOF CAPTURED / NO MIGRATION PROPOSAL JUSTIFIED**.

## Beta access optimization spike — 2026-06-06

- Captured Workstream 3.3 beta-access optimization spike.
- Evidence: `evidence/2026-06-06-beta-access-optimization-spike.md` and `evidence/2026-06-06-auth-proxy-hosted-unauth-timing.json`.
- Inputs: fresh GitNexus impact (`getClosedBetaAccessForEmail` CRITICAL), current proxy tests, Supabase beta RPC EXPLAIN, hosted unauthenticated `/workshop` redirect timing.
- Decision: no auth/proxy production change is justified; keep `getUser()`, do not cache allowlist decisions, and require safe authenticated hosted waterfall proof before reopening.
- Completion language: **SPIKE COMPLETE / NO AUTH CODE CHANGE JUSTIFIED**.

## Speed Insights provider access retry — 2026-06-06

- Attempted Vercel connector, Vercel documentation search, protected Vercel fetch, and Computer Use Chrome state capture for Speed Insights.
- Evidence: `evidence/2026-06-06-speed-insights-provider-access-retry.md`.
- Result at the time: dashboard p75/export values were inaccessible from connector/fetch/browser surfaces. Later `vercel metrics` CLI evidence superseded this for numeric p75 values, but visual dashboard overview/recommendation cards and Workstream 7.2 comparable windows remain open.
- Completion language: **SPEED INSIGHTS DASHBOARD UI BLOCKED / CLI P75 LATER CAPTURED**.

## Open gate reconciliation — 2026-06-06

- Reconciled local decision/security gates that had stale open checkboxes after implementation packets.
- Evidence: `evidence/2026-06-06-open-gate-reconciliation.md`.
- Closed locally: marketing visual graceful degradation, GA/Clarity post-consent loading decision, no global Next/React experimental toggles, auth/proxy no-change review, and tokenized/share cache-header invariants.
- Still open after later CLI p75 capture: Speed Insights dashboard overview/recommendation cards, Speed Insights-window comparison, signed-in auth fixture waterfall, hosted authenticated export benchmark, and valid private media/share fixture proof. Later production postfix evidence captures signed-out/probe-safe no-store proof.
- Completion language: **LOCAL DECISION GATES RECONCILED / PROVIDER/FIXTURE GATES STILL OPEN**.

## Hosted auth route smoke benchmark harness — 2026-06-06

- Extended `scripts/verify-hosted-auth-routes.ts` from one-shot smoke to sanitized benchmark mode with `HOSTED_AUTH_RUNS`, JSON `samples`, min/average/max duration fields, and optional `MARKDOWN_FILE` output.
- Preserved failure-closed behavior when allowed/denied/revoked/expired session cookies are missing; auth cookies and platform bypass headers are still never written to reports.
- Added focused coverage in `tests/vitest/hosted-auth-route-smoke-script.test.ts` for bounded run parsing and repeated sanitized sample aggregation.
- Ran `HOSTED_AUTH_BASE_URL=https://www.archestimator.com HOSTED_AUTH_RUNS=3 OUTPUT_FILE=.../2026-06-06-auth-proxy-hosted-smoke-benchmark.json MARKDOWN_FILE=.../2026-06-06-auth-proxy-hosted-smoke-benchmark.md bun run launch:verify-hosted-auth`; expected exit 1 because signed-in fixture cookies were absent.
- Original evidence captured production signed-out `/workshop` redirect timing, and the later stricter cache-proof refresh intentionally failed while production still returned `Cache-Control: public, max-age=0, must-revalidate`. That signed-out cache gap is superseded by the later production postfix evidence, where signed-out `/workshop` redirects with private/no-store.
- Completion language: **HOSTED AUTH HARNESS READY / SIGNED-OUT CACHE PROOF CAPTURED / SIGNED-IN FIXTURE PROOF OPEN**.

## Remaining provider/fixture blocker audit — 2026-06-06

- Re-audited the remaining open gates after `23db6aa`.
- Evidence: `evidence/2026-06-06-remaining-provider-fixture-blocker-audit.md`.
- Vercel connector still reaches Archestimator project/deployment metadata, but does not expose Speed Insights dashboard UI/export values. Later Vercel CLI metrics superseded this for numeric p75 and route/device breakdown.
- Protected fetch for `https://vercel.com/philipjonlewis-projects/archestimator/speed-insights` still fails with `Unable to create shareable URL...`.
- Process env and repo env files contain no safe `HOSTED_AUTH_*`, `HOSTED_EXPORT_*`, app-specific `PLAYWRIGHT_STORAGE_STATE`, or equivalent fixture inputs.
- Remaining gates require external inputs or provider evidence: dashboard overview/recommendation cards if needed, signed-in hosted auth fixtures, hosted export fixture IDs/auth, comparable Speed Insights windows, and valid private media/share fixtures. Later production postfix evidence captures the protected/sensitive-route no-store recheck for signed-out and fake-path probes.
- Completion language: **IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN — EXTERNAL INPUTS REQUIRED**.

## Vercel Speed Insights CLI baseline — 2026-06-06

- Resumed `$team` / `$ultragoal` / `$autopilot` implementation lane rechecked remaining provider gates and discovered that Vercel CLI `54.6.1` exposes Speed Insights metrics through `vercel metrics`.
- Captured read-only provider p75 evidence for `vercel.speed_insights_metric.lcp`, `inp`, `cls`, `fcp`, and `ttfb_ms` under project `archestimator` / scope `philipjonlewis-projects`.
- Evidence folder: `evidence/vercel-speed-insights-cli-2026-06-06/`.
- Summary: `evidence/vercel-speed-insights-cli-2026-06-06/vercel-speed-insights-cli-baseline.md`.
- Current 7-day overall p75: LCP 1447ms, INP 59,404,496ms (anomalous provider value), CLS null overall, FCP 1380ms, TTFB 299ms.
- Route/device highlights flag `/` desktop for LCP/FCP and anomalous INP, so a bounded production desktop Lighthouse trace was captured for `https://www.archestimator.com/`: score 0.99, FCP 467ms, LCP 756ms, CLS 0, TBT 1ms, Speed Index 1084ms.
- Previous 7-day and previous-3-day Vercel metric windows returned empty summaries, so Workstream 7.2 remains open for comparable route/device cohorts.
- No deploy, provider mutation, environment change, or Supabase mutation was performed.

## Hosted proof harness hardening and protected redirect cache guard — 2026-06-06

- UltraQA/team worker evidence identified local-fixable proof gaps in the hosted auth/export scripts.
- Added sanitized hosted export Markdown output for `MARKDOWN_FILE`, `HOSTED_EXPORT_ALLOWED_ORIGINS` HTTPS/origin validation, and private/no-store cache-control pass criteria.
- Added hosted auth cache-control capture and private/no-store pass criteria, then refreshed `evidence/2026-06-06-auth-proxy-hosted-smoke-benchmark.md` / `.json`.
- The refreshed hosted auth proof intentionally exited 1 before deployment because signed-in cookies were absent and production signed-out `/workshop` redirects still returned `Cache-Control: public, max-age=0, must-revalidate`. Later production postfix evidence superseded the signed-out cache gap, and later synthetic hosted fixture evidence supersedes the signed-in fixture gap.
- Added `SENSITIVE_ROUTE_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate"` to `src/proxy.ts` for protected/auth redirects produced by Proxy, with `tests/vitest/proxy-sensitive-cache-headers.test.ts` locking the source invariant.
- Focused verification: `bun test tests/vitest/hosted-auth-route-smoke-script.test.ts tests/vitest/hosted-export-route-smoke-script.test.ts tests/vitest/proxy-sensitive-cache-headers.test.ts` passed 23/23.
- Evidence: `evidence/2026-06-06-hosted-proof-harness-hardening.md`.
- Remaining proof: signed-in hosted auth fixture waterfall, hosted proposal export fixture/auth benchmark, valid private media/share fixture proof, dashboard overview/recommendation cards if required, and comparable Speed Insights windows.

## Production deployment and private media no-store proof — 2026-06-06

- With owner-granted authority, manually deployed branch `feat/performance-and-speed-pr-0b-cache-safety` to production.
- Final deployment: `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`, URL `https://archestimator-6mwjrwhnk-philipjonlewis-projects.vercel.app`, aliased to `https://www.archestimator.com`.
- Evidence: `evidence/2026-06-06-production-deployment-private-image-cache-fix-inspect.json`, `evidence/2026-06-06-sensitive-route-production-postfix-fail-closed-probe.md` / `.json`, and `evidence/2026-06-06-auth-proxy-production-postfix-smoke-benchmark.md` / `.json`.
- Result: signed-out `/workshop` redirects to `/login?next=%2Fworkshop` with private/no-store over 3 samples; invalid share token probes plus missing/malformed/valid-shaped fake project-image probes all pass no-store/no-`Set-Cookie`.
- Remaining gates at that moment: signed-in hosted auth cookies/storage state, hosted export fixture IDs/auth, valid private media/share fixtures, dashboard overview/recommendation cards, and comparable Speed Insights windows. Later synthetic hosted fixture evidence closes signed-in auth/export/private media; dashboard, comparable Speed Insights windows, and valid private share-token timing remain open.

## 2026-06-06 — Synthetic hosted auth/export/media fixture proof captured

- Ran an owner-authorized synthetic production fixture proof against `https://www.archestimator.com` and Supabase project `ebxxqidacheyapmmzavr`. The runner used temporary run-scoped users/data only and wrote sanitized evidence that excludes cookies, passwords, raw tokens, storage paths, and customer data.
- Captured auth/proxy proof at `evidence/2026-06-06-hosted-auth-production-synthetic-fixture-smoke-benchmark.md` / `.json`: signed-out, allowed, denied, revoked, and expired/invalid-session cases all pass with private/no-store cache-control. Denied/revoked use one sample because the route intentionally signs those sessions out after the first fail-closed redirect.
- Captured hosted proposal export proof at `evidence/2026-06-06-hosted-export-production-synthetic-fixture-smoke-benchmark.md` / `.json`: two allowed-session samples pass with XLSX content type, attachment disposition, ZIP magic, 12,253 bytes, and `private, no-store`.
- Captured valid private media proof at `evidence/2026-06-06-valid-private-image-production-synthetic-fixture-smoke-benchmark.md` / `.json`: upload, two private WebP GETs, and app DELETE cleanup pass; GETs return `private, max-age=300`, `x-vercel-cache: MISS`, and no public/shared-cache directive.
- Captured cleanup proof at `evidence/2026-06-06-hosted-synthetic-fixture-cleanup-verification.md` / `.json`: synthetic auth/database counts are all zero and storage paths were removed through app DELETE.
- Remaining open gates after this auth/export/media pass were dashboard overview/recommendation cards if needed, comparable Speed Insights windows, and valid private share-token timing; the later valid-share fixture proof closes the share-token timing gap.

## 2026-06-06 — Valid share-token synthetic hosted fixture proof captured

- Ran a headless production UI flow with a temporary allowed-session project to generate a real share token through the app server action, not by decrypting/inferring database rows.
- Captured sanitized evidence at `evidence/2026-06-06-valid-share-production-synthetic-fixture-smoke-benchmark.md` / `.json`: `/share/VALID_TOKEN_REDACTED`, `/api/share/VALID_TOKEN_REDACTED`, and `/api/share/VALID_TOKEN_REDACTED/activity` all returned `200`, no-store/private no-store cache policy, no `Set-Cookie`, and durations of 1.857s / 2.560s / 1.920s.
- Captured cleanup proof at `evidence/2026-06-06-valid-share-synthetic-fixture-cleanup-verification.md` / `.json`: run-scoped auth users, beta rows, profiles, workspaces, projects, estimates, nodes, rows, publications, and publication events are all zero.
- Remaining open gates: dashboard overview/recommendation cards if needed and comparable Speed Insights before/after windows.

## Post-closeout provider refresh and rejected font spike — 2026-06-06

- Reviewed the owner-linked Vercel Speed Insights metrics/scoring docs. Evidence: `evidence/2026-06-06-vercel-speed-insights-scoring-doc-review.md`.
- Ran fresh `vercel metrics` captures for 1h, 6h, 24h, and 7d windows. Evidence: `evidence/vercel-speed-insights-refresh-2026-06-06-post-closeout/`.
- Filtered Speed Insights by current production deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`; all current-deployment summaries were empty.
- Attributed the anomalous `/` desktop INP `59,404,496ms` to old deployment `dpl_Cxeq5ATpif6Yk1zn4FmNmnX7nzhT`, commit `2cddb0e0d23b21b013c66d0a1c086d129cfbd499`. Evidence: `evidence/vercel-speed-insights-inp-attribution-2026-06-06/`.
- Captured live production Lighthouse for `https://www.archestimator.com/`: mobile score 94, desktop score 100. Evidence: `evidence/current-production-lighthouse-2026-06-06/`.
- Tested a narrow `Roboto_Mono` optional/no-preload spike after GitNexus and graph impact analysis on `RootLayout`; focused test/typecheck/build passed, but three mobile Lighthouse runs worsened LCP. The code/test changes were reverted and only rejected-spike evidence remains at `evidence/mono-font-preload-scope-2026-06-06/`.
- Computer Use still timed out on Chrome dashboard access, so dashboard overview/recommendation cards remain provider-UI open.

## Speed Insights readiness checker — 2026-06-06

- Added `scripts/check-vercel-speed-insights-readiness.ts` and package script `perf:check-speed-insights` as a read-only Vercel CLI provider gate.
- TDD RED: `bun run test:dom -- tests/vitest/vercel-speed-insights-readiness-script.test.ts` failed because the checker module did not exist.
- GREEN: after implementing the checker, the same focused Vitest file passed 4 tests.
- `bun run type-check` passed.
- Ran `SPEED_INSIGHTS_ALLOW_NOT_READY=1 ... bun run perf:check-speed-insights`; evidence at `evidence/vercel-speed-insights-readiness-check-2026-06-06/` reports current deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`, zero current-deployment Speed Insights rows, missing dashboard RES, and `resCompletionReady: false`.


## RES readiness rerun and official Vercel API endpoint inventory — 2026-06-06

- Reran the read-only `bun run perf:check-speed-insights` gate under `SPEED_INSIGHTS_ALLOW_NOT_READY=1`; evidence lives at `evidence/vercel-speed-insights-readiness-check-2026-06-06-rerun-041348/`.
- Result: current production deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR` still has zero current-deployment p75 rows for FCP, LCP, INP, CLS, or TTFB, no dashboard RES was supplied, and `resCompletionReady` remains `false`.
- Checked `vercel api ls --format json` for a documented Speed Insights/RES export endpoint; evidence lives at `evidence/vercel-api-speed-insights-endpoint-check-2026-06-06/`.
- Result: 310 documented endpoints were listed; the speed/insight/metric/observability/analytics/vital/experience filter matched only Observability Plus configuration endpoints. No official Vercel CLI API endpoint for Speed Insights dashboard RES export was found.
- Completion language: **PROVIDER DATA OPEN / RES COMPLETION NOT CLAIMED**.
