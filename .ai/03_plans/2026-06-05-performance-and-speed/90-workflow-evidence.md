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
- Worker-1 confirmed PR-0A remains Speed Insights provider/UI blocked and recommended only read-only connector/curl substitutes until dashboard/export data is available.
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
- Decision: Speed Insights dashboard/export p75 metrics remain provider-open; no runtime optimization or telemetry package change is justified from this attempt.

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
