# Validation Output

## Latest Live Route-Error Smoke And Full E2E Refresh

`bunx vitest run tests/vitest/route-error-smoke-gate.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-route-error-smoke-gate-20260601.txt"`

- Result: RED as expected.
- Summary: the test failed before `src/lib/route-error-smoke.ts` existed, proving the gate coverage started from a missing behavior.

`bunx vitest run tests/vitest/route-error-smoke-gate.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-route-error-smoke-gate-20260601.txt"`

- Result: PASS.
- Summary: 1 file passed, 2 tests passed. The helper throws only when `ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE=1` and query `routeErrorSmoke=1` are both present.

`ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_ROUTE_ERROR_SCREENSHOT_DIR="$EVIDENCE_DIR/live-route-error-screenshots" PLAYWRIGHT_PORT=3026 bunx playwright test e2e/workshop-route-error-boundaries.spec.ts --project=chromium --reporter=list 2>&1 | tee "$EVIDENCE_DIR/route-error-boundary-live-smoke-with-files-20260601.txt"`

- Result: PASS.
- Summary: 2 Playwright tests passed. Standalone screenshots were written for live dev-auth thrown-route states at library, project charts, and estimate workspace routes.
- Screenshot files: `live-route-error-screenshots/library-route-error-boundary.png`, `live-route-error-screenshots/project-charts-route-error-boundary.png`, and `live-route-error-screenshots/estimate-workspace-route-error-boundary.png`.
- Note: the screenshots include the local Next.js dev issue notifier and are not production-mode screenshots.

`bun run test:e2e 2>&1 | tee "$EVIDENCE_DIR/full-e2e-after-live-error-smoke-20260601.txt"`

- Result: PASS.
- Summary: 9 passed, 20 skipped. Passing coverage included auth smoke, landing audit, and route-transition perf smoke. The skipped specs are gated AI/DND/invite/share/collaboration scenarios plus the route-error smoke when its env flags are not enabled.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-live-error-smoke-20260601.txt"`

- Result: PASS.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/design-system-after-live-error-smoke-20260601.txt"`

- Result: PASS.

`bun run lint 2>&1 | tee "$EVIDENCE_DIR/lint-after-live-error-smoke-20260601.txt"`

- Result: PASS.
- Summary: 0 errors, 18 warnings.

`bun run build 2>&1 | tee "$EVIDENCE_DIR/build-after-live-error-smoke-20260601.txt"`

- Result: PASS.

`mcp__code_review_graph.get_review_context_tool`

- Result: PASS / analyzed.
- Summary: focused route-error smoke delta reports high risk, 6 changed files, 498 impacted nodes across 114 files, and 5 graph-reported test gaps. The broad impact is expected for app route pages and does not change the remaining production-readiness blockers.

`bunx vitest run tests/vitest/route-error-smoke-gate.test.ts tests/vitest/workshop-route-error-boundaries.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/final-route-error-focused-vitest-20260601.txt"`

- Result: PASS.
- Summary: 2 files passed, 6 tests passed.

`bunx eslint src/lib/route-error-smoke.ts src/app/workshop/library/page.tsx 'src/app/workshop/projects/[projectId]/charts/page.tsx' 'src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx' tests/vitest/route-error-smoke-gate.test.ts e2e/workshop-route-error-boundaries.spec.ts 2>&1 | tee "$EVIDENCE_DIR/final-route-error-eslint-20260601.txt"`

- Result: PASS.
- Notes: no output.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/final-type-check-after-doc-sync-20260601.txt"`

- Result: PASS.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/final-diff-check-after-doc-sync-20260601.txt"`

- Result: PASS.

## Latest Blocker Refresh

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/fresh-type-check-20260531-blocker-refresh.txt"`

- Result: PASS.
- Notes: no TypeScript errors on the latest rerun.

`bun run lint 2>&1 | tee "$EVIDENCE_DIR/fresh-full-lint-20260531-blocker-refresh.txt"`

- Result: PASS.
- Summary: 0 errors, 18 warnings. Remaining warnings are in the pitch-deck script, `PerformanceMonitor`, TanStack Table React Compiler compatibility for `ProjectEstimatesTable`, `resend-client`, and active publication/share tests; they are warnings, not a failing lint gate.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/fresh-design-system-20260531-blocker-refresh.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed.

`bunx eslint e2e/route-transition-performance.spec.ts tests/vitest/workshop-route-error-boundaries.test.tsx 2>&1 | tee "$EVIDENCE_DIR/fresh-eslint-route-transition-20260531-blocker-refresh.txt"`

- Result: PASS.
- Notes: no output.

`bunx vitest run tests/vitest/workshop-route-error-boundaries.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/route-transition-measure-script.test.ts tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-peak-load-profile.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-targeted-20260531-blocker-refresh.txt"`

- Result: PASS.
- Summary: 6 files passed, 22 tests passed.

`PLAYWRIGHT_PORT=3021 bunx playwright test e2e/route-transition-performance.spec.ts --grep "Slow 3G public link-transition" 2>&1 | tee "$EVIDENCE_DIR/red-e2e-slow3g-link-20260531.txt"`

- Result: PASS.
- Summary: isolated rerun of the previously failing Slow 3G link-transition test passed on a clean Playwright port, with median `/features` to `/pricing` transition 6907 ms and overlay visibility rate 0.

`PLAYWRIGHT_PORT=3022 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/fresh-e2e-perf-20260531-port3022-rerun.txt"`

- Result: PASS with two intentional dev-auth skips.
- Summary: 6 passed, 2 skipped. Public baseline, Slow 3G public route, Slow 3G public Link-transition medians, normal public Link-transition medians, public bfcache/no-overlay, and signed-out protected redirect passed. Latest medians: Slow 3G `/features` to `/pricing` 6938 ms with overlay visibility 0; normal `/features` to `/pricing` 272 ms with overlay visibility 1; bfcache/back-forward restore 30 ms with no stuck overlay; protected redirect 378.9 ms.
- Note: an earlier same-command run on port 3020 failed after the dev server stopped accepting connections (`ERR_CONNECTION_REFUSED`). The isolated Slow 3G test and full clean-port rerun passed, so the failure is recorded as a local harness/server-lifecycle flake, not an application regression.

`bun run test 2>&1 | tee "$EVIDENCE_DIR/fresh-unit-tests-20260531-blocker-refresh.txt"`

- Result: PASS.
- Summary: 4 unit tests passed.

`bun run build 2>&1 | tee "$EVIDENCE_DIR/fresh-build-20260531-blocker-refresh.txt"`

- Result: PASS.
- Notes: Next.js production build completed and emitted the app route table plus `Proxy (Middleware)`.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/fresh-type-check-after-doc-refresh-20260531.txt"`

- Result: PASS.
- Notes: final rerun after documentation refresh and `next-env.d.ts` restoration had no TypeScript errors.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-after-doc-refresh-20260531.txt"`

- Result: PASS.
- Notes: no whitespace errors after the documentation refresh.

`mcp__code_review_graph.detect_changes_tool`

- Result: PASS / analyzed.
- Summary: 11 changed files in the route-transition blocker-refresh scope, 261 changed functions/classes, 0 affected flows, 125 graph-reported test gaps, and risk score 0.60.
- Artifact: `fresh-code-review-graph-after-doc-refresh-20260531.md`.

## Latest Error-Boundary Proof Refresh

`bunx vitest run tests/vitest/workshop-route-error-boundaries.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-workshop-route-error-boundaries.txt"`

- Result: RED as expected.
- Summary: no matching test file existed before the error-boundary proof refresh.

`bunx vitest run tests/vitest/workshop-route-error-boundaries.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-workshop-route-error-boundaries.txt"`

- Result: PASS.
- Summary: 1 file passed, 4 tests passed. The actual `library/error.tsx`, `projects/[projectId]/charts/error.tsx`, and `projects/[projectId]/estimates/[nodeId]/error.tsx` components render sanitized retry UI and call `reset()`; development logging is limited to route/name/digest metadata and does not include sensitive error message or stack details.

`bunx eslint tests/vitest/workshop-route-error-boundaries.test.tsx 2>&1 | tee "$EVIDENCE_DIR/eslint-workshop-route-error-boundaries.txt"`

- Result: PASS.
- Notes: no output.

`bun --eval "<render WorkshopRouteErrorState with sensitive error object and screenshot with Playwright>" 2>&1 | tee "$EVIDENCE_DIR/route-error-boundary-forced-render-output.txt"`

- Result: PASS.
- Artifacts: `route-error-boundary-forced-render.html`, `route-error-boundary-forced-render.png`, and `route-error-boundary-forced-render-notes.md`.
- Summary: generated a component-level forced-render screenshot for Library, Project charts, and Estimate workspace error states after checking the generated HTML did not contain SQL text, token-like values, local file paths, stack text, error name, or digest.

`bunx vitest run tests/vitest/workshop-route-error-boundaries.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-peak-load-profile.test.tsx tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-governance-with-error-boundaries.txt"`

- Result: PASS.
- Summary: 5 files passed, 15 tests passed.

`bunx eslint tests/vitest/workshop-route-error-boundaries.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-peak-load-profile.test.tsx tests/vitest/route-transition-measure-script.test.ts 2>&1 | tee "$EVIDENCE_DIR/fresh-eslint-route-transition-governance-with-error-boundaries.txt"`

- Result: PASS.
- Notes: no output.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/fresh-type-check-after-error-boundary-proof.txt"`

- Result: PASS.
- Notes: no TypeScript errors.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/fresh-design-system-after-error-boundary-proof.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-after-error-boundary-proof.txt"`

- Result: PASS.
- Notes: no whitespace errors.

`bun run test 2>&1 | tee "$EVIDENCE_DIR/fresh-unit-tests-after-error-boundary-proof.txt"`

- Result: PASS.
- Summary: 4 unit tests passed.

`bun run test:dom 2>&1 | tee "$EVIDENCE_DIR/fresh-dom-tests-after-error-boundary-proof.txt"`

- Result: PASS.
- Summary: 118 files passed; 918 tests passed, 2 skipped.

`bun run build 2>&1 | tee "$EVIDENCE_DIR/fresh-build-after-error-boundary-proof.txt"`

- Result: PASS.
- Notes: Next.js production build completed and emitted the app route table plus `Proxy (Middleware)`.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/fresh-type-check-after-next-env-restore-error-boundary-proof.txt"`

- Result: FAIL / superseded.
- Summary: this intermediate full type-check rerun failed in concurrent share/collaboration files: `src/components/workshop/ProjectPublicationHeader.tsx(325,21)` and `src/lib/publication/actions.ts(274,44)`. The latest blocker-refresh `bun run type-check` now passes.

`bunx vitest run tests/vitest/workshop-route-error-boundaries.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-peak-load-profile.test.tsx tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-governance-after-concurrent-share-typecheck-blocker.txt"`

- Result: PASS.
- Summary: 5 files passed, 15 tests passed after the concurrent share/collaboration type-check blocker appeared.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-after-concurrent-share-typecheck-note.txt"`

- Result: PASS.
- Notes: no whitespace errors after recording the concurrent share/collaboration type-check blocker.

`npx gitnexus detect-changes --repo archestimator 2>&1 | tee "$EVIDENCE_DIR/gitnexus-detect-changes-after-error-boundary-proof.txt"`

- Result: PASS / analyzed.
- Summary: 45 changed files, 166 symbols, 19 affected processes, critical risk. The changed-symbol list is dominated by active share/publication work in this shared worktree, so this still blocks readiness/archive claims.

`EVIDENCE_DIR="$EVIDENCE_DIR" bash -o pipefail -c 'bun run lint 2>&1 | tee "$EVIDENCE_DIR/fresh-full-lint-after-error-boundary-proof-pipefail.txt"'`

- Result: FAIL / superseded.
- Summary: 105 errors and 31 warnings at that intermediate point. The latest blocker-refresh `bun run lint` now passes with 0 errors and 18 warnings.

## Passing Commands

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-route-transition-spec-hover-evidence-contract.txt"`

- Result: RED as expected.
- Summary: source-level governance test failed because the route-transition Playwright spec did not separate hover-before-click RSC evidence from click-transition RSC evidence.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-route-transition-spec-hover-evidence-contract.txt"`

- Result: PASS.
- Summary: source-level governance test passed after the Playwright spec began recording `hoverRscRequests`, `transitionRscRequests`, and `allRscRequests` separately.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-project-estimate-hover-prefetch-evidence-contract.txt"`

- Result: RED as expected.
- Summary: source-level governance test failed because project-card and estimate-row hover evidence were not yet recorded independently.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-project-estimate-hover-prefetch-evidence-contract.txt"`

- Result: PASS.
- Summary: 2 tests passed after adding project-card and estimate-row hover evidence recording to the route-transition Playwright spec.

`ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 PLAYWRIGHT_PORT=3034 bunx playwright test e2e/route-transition-performance.spec.ts --grep "authenticated transition budget" --project=chromium --reporter=list 2>&1 | tee "$EVIDENCE_DIR/authenticated-transition-separated-hover-prefetch-recheck-3034.txt"`

- Result: PASS.
- Summary: isolated temp-app dev-auth run captured `/workshop` to `/workshop/projects` transition RSC evidence separately from hover-before-click evidence. Hover-before-click RSC requests were not observed in this environment; click-transition `_rsc` request and 572 ms authenticated transition were captured.

`ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 PLAYWRIGHT_PORT=3034 bunx playwright test e2e/route-transition-performance.spec.ts --grep "project-card and estimate-row" --project=chromium --reporter=list 2>&1 | tee "$EVIDENCE_DIR/project-estimate-hover-prefetch-evidence-3034.txt"`

- Result: PASS.
- Summary: isolated temp-app dev-auth run confirmed a live project card href and a live estimate-row href; no hover-before-click `_rsc` requests were observed for either project-card or estimate-row hover in this environment.

`PLAYWRIGHT_PORT=3000 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/e2e-perf-port3000-after-hover-evidence-contract.txt"`

- Result: PASS with two intentional skips.
- Summary: 5 passed, 2 skipped. Public baseline, Slow 3G public route, public Link-transition medians, bfcache/no-overlay, and signed-out protected redirect passed on the existing local dev server. The two authenticated evidence tests skipped because dev-auth flags were not enabled for the port 3000 server.

`bunx eslint e2e/route-transition-performance.spec.ts tests/vitest/route-transition-performance-spec.test.ts 2>&1 | tee "$EVIDENCE_DIR/lint-route-perf-spec-after-hover-evidence-contract.txt"`

- Result: PASS.
- Notes: no output.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-hover-evidence-contract.txt"`

- Result: PASS.
- Notes: no TypeScript errors after the Playwright evidence contract update.

`rg -n "prefetch|router\\.prefetch|production|development" node_modules/next/dist/docs -g '*.md'`

- Result: PASS / inspected.
- Summary: local Next.js App Router docs state prefetching is production-only for App Router links, and the hover-prefetch recipe still depends on enabling Link prefetch after hover intent.
- Artifact: `nextjs-prefetch-development-behavior.md`.

`nl -ba node_modules/next/dist/client/components/app-router-utils.js | sed -n '1,80p'`

- Result: PASS / inspected.
- Summary: local Next.js App Router source shows `createPrefetchURL(href)` returns `null` in development, explaining why local `next dev` browser runs can call `router.prefetch()` without emitting a hover-before-click `_rsc` Network request.
- Artifact: `nextjs-prefetch-development-behavior.md`.

`bunx vitest run tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-prefetch-contract-after-nextjs-dev-mode-proof.txt"`

- Result: PASS.
- Summary: 2 files passed, 6 tests passed. This fresh rerun proves the hook still calls `router.prefetch()` under debounce/focus coverage and the Playwright spec still separates hover-before-click evidence from click-transition evidence.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/fresh-type-check-after-nextjs-dev-mode-proof.txt"`

- Result: PASS.
- Notes: no TypeScript errors after the Next.js dev-mode prefetch evidence/doc refresh.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-after-nextjs-dev-mode-proof.txt"`

- Result: PASS.
- Notes: no whitespace errors after the Next.js dev-mode prefetch evidence/doc refresh.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/fresh-design-system-after-nextjs-dev-mode-proof.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed after the Next.js dev-mode prefetch evidence refresh.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-after-validation-index-refresh.txt"`

- Result: PASS.
- Notes: no whitespace errors after recording the fresh validation entries.

`bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-library-consolidation-after-stale-next-config-check.txt"`

- Result: PASS.
- Summary: 1 file passed, 9 tests passed. The previously stale `next.config.ts` source assertion is corrected in the current test file and no longer fails.

`bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/project-dashboard-ui.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-targeted-vitest-after-stale-next-config-check.txt"`

- Result: PASS.
- Summary: 7 files passed, 58 tests passed. This covers route-transition proxy, project shell/charts, library dynamic split, estimate-table prefetch, prefetch hook behavior, and the Playwright evidence-contract source checks.

`npx gitnexus detect-changes --repo archestimator 2>&1 | tee "$EVIDENCE_DIR/gitnexus-detect-changes-after-hover-evidence-contract.txt"`

- Result: PASS / analyzed.
- Summary: 44 changed files, 91 changed symbols, 58 affected execution flows, risk level critical.
- Artifact: `code-review-graph-and-gitnexus-after-hover-evidence-contract.md`.

`mcp__code_review_graph.get_review_context_tool`

- Result: PASS / analyzed.
- Summary: 44 changed files, 191 impacted nodes across 92 files, high risk, and 191 graph-reported test gaps.
- Artifact: `code-review-graph-and-gitnexus-after-hover-evidence-contract.md`.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/fresh-type-check-after-matrix-refresh.txt"`

- Result: PASS.
- Notes: fresh rerun after the final canonical implementation matrix refresh.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/fresh-design-system-after-matrix-refresh.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed after the final matrix/evidence refresh.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-after-matrix-refresh.txt"`

- Result: PASS.
- Notes: no whitespace errors after the final matrix/evidence refresh.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-final-after-evidence-refresh.txt"`

- Result: PASS.
- Notes: no whitespace errors after the last evidence file refresh.

`bunx vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1 --hookTimeout=60000 2>&1 | tee "$EVIDENCE_DIR/fresh-library-dynamic-vitest-after-matrix-refresh.txt"`

- Result: PASS.
- Summary: 2 files passed, 24 tests passed after the LibraryFolderTree dynamic split and matrix refresh.

`mcp__code_review_graph.list_graph_stats_tool` and `mcp__code_review_graph.get_review_context_tool`

- Result: PASS / analyzed.
- Summary: graph has 3,206 nodes and 45,350 edges; review context reports 44 changed files, 191 impacted nodes across 92 files, high risk, and 191 graph-reported test gaps.
- Artifact: `code-review-graph-review-context-after-matrix-refresh.md`.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-auth-smoke-fix.txt"`

- Result: PASS.
- Notes: fresh rerun after the route-transition perf spec target-position fix.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-next-env-final-restore.txt"`

- Result: PASS.
- Notes: final rerun after restoring generated `next-env.d.ts` churn back to the checked-in dev route-types reference.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/design-system-after-auth-smoke-fix.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed.

`bunx eslint e2e/route-transition-performance.spec.ts 2>&1 | tee "$EVIDENCE_DIR/lint-route-perf-after-auth-smoke-fix.txt"`

- Result: PASS.
- Notes: targeted lint for the route-transition perf spec passed with no output.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-auth-smoke-fix.txt"`

- Result: PASS.
- Notes: no whitespace errors.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-next-env-final-restore.txt"`

- Result: PASS.
- Notes: no whitespace errors after final evidence/doc updates.

`bun run test 2>&1 | tee "$EVIDENCE_DIR/unit-tests-after-auth-smoke-fix.txt"`

- Result: PASS.
- Summary: 4 unit tests passed.

`bun run build 2>&1 | tee "$EVIDENCE_DIR/build-after-auth-smoke-fix.txt"`

- Result: PASS.
- Notes: Next.js production build completed and emitted the app route table plus `Proxy (Middleware)`.

`PLAYWRIGHT_PORT=3000 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/e2e-perf-port3000-after-auth-smoke-fix.txt"`

- Result: PASS with one intentional skip.
- Summary: 5 passed, 1 skipped. Captured public baseline, Slow 3G public route, public Link-transition medians, bfcache/no-overlay, and signed-out protected redirect on the existing dev server.

`PLAYWRIGHT_PORT=3031 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/e2e-perf-production-like-3031-after-auth-smoke-fix.txt"`

- Result: PASS with one intentional skip.
- Summary: 5 passed, 1 skipped against `bun run start -- --port 3031`.

`ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 PLAYWRIGHT_PORT=3032 bunx playwright test e2e/route-transition-performance.spec.ts --grep "authenticated hover prefetch" --project=chromium --reporter=list 2>&1 | tee "$EVIDENCE_DIR/authenticated-hover-prefetch-temp-smoke-admin-db-fixed.txt"`

- Result: PASS.
- Summary: historical isolated temp-app smoke captured one `_rsc` request for `/workshop/projects` and a 3,633 ms `/workshop` to `/workshop/projects` transition under the 10,000 ms budget. A later evidence-contract fix showed this older artifact did not separate hover-before-click requests from click-transition requests, so it should be read as authenticated RSC transition evidence, not definitive hover-prefetch Network proof.

`mcp__code_review_graph.detect_changes_tool`

- Result: PASS / analyzed.
- Summary: 43 changed files, 78 changed functions/classes, 0 affected flows, 31 graph-reported test gaps, overall risk score 0.60.
- Artifact: `code-review-graph-detect-changes-after-auth-smoke-fix.md`.

`bunx vitest run tests/vitest/component-library-manager-ui.test.tsx --maxWorkers=1 -t "keeps the library folder tree surface" 2>&1 | tee "$EVIDENCE_DIR/library-folder-tree-dynamic-green-source.txt"`

- Result: PASS.
- Summary: source-level regression proves `ComponentLibraryManager` uses a named dynamic import for `LibraryFolderTreeSurface` and no longer statically imports from `./LibraryFolderTree`.

`bunx vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1 --hookTimeout=60000 2>&1 | tee "$EVIDENCE_DIR/library-folder-tree-dynamic-related-vitest.txt"`

- Result: PASS.
- Summary: 2 files passed, 24 tests passed.

`bunx eslint src/components/workshop/component-library-manager/ComponentLibraryManager.tsx src/components/workshop/component-library-manager/LibraryFolderTree.tsx src/components/workshop/component-library-manager/library-folder-tree-shared.ts tests/vitest/component-library-manager-ui.test.tsx 2>&1 | tee "$EVIDENCE_DIR/eslint-library-folder-tree-dynamic-final.txt"`

- Result: PASS.
- Notes: no output.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-library-folder-tree-dynamic-next-env-restore.txt"`

- Result: PASS.
- Notes: final rerun after restoring generated `next-env.d.ts` route-type churn.

`bun run build 2>&1 | tee "$EVIDENCE_DIR/build-after-library-folder-tree-dynamic.txt"`

- Result: PASS.
- Notes: production build completed after the LibraryFolderTree dynamic split.

`git worktree add --detach <temp> HEAD && bun run build`

- Result: PASS.
- Artifacts: `bundle-baseline-head-build-for-manifest.txt`, `bundle-baseline-head-library-route-manifest.json`, `bundle-current-library-route-manifest.json`, `bundle-library-route-comparison.md`.
- Summary: `/workshop/library` initial JS listed in the Next.js client reference manifest dropped from 618,452 bytes at `HEAD` to 231,552 bytes in the current route-transition branch.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-library-folder-tree-dynamic.txt"`

- Result: PASS.
- Notes: no whitespace errors.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-next-env-restore.txt"`

- Result: PASS.
- Notes: final rerun after production build regenerated `.next` metadata and `next-env.d.ts` was restored to its prior checked-in reference.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/design-system-final.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed.

`bunx eslint src/components/charts/CostDonutChart.tsx src/components/workshop/project-charts/ProjectChartsClient.tsx src/components/workshop/project-charts/ProjectCostBubbleChart.tsx e2e/route-transition-performance.spec.ts scripts/seed-performance-test-data.ts 2>&1 | tee "$EVIDENCE_DIR/lint-targeted-chart-perf-final.txt"`

- Result: PASS.
- Notes: no output.

`bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/project-dashboard-ui.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/targeted-route-transition-dom-final.txt"`

- Result: PASS.
- Summary: 6 files passed, 56 tests passed.

`bunx vitest run tests/vitest/project-charts-ui.test.tsx tests/vitest/project-dashboard-ui.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/chart-splitting-tests-after-lint-fix.txt"`

- Result: PASS.
- Summary: 2 files passed, 24 tests passed.

`bun run test 2>&1 | tee "$EVIDENCE_DIR/unit-tests-after-perf-gates.txt"`

- Result: PASS.
- Summary: 4 unit tests passed.

`bun run build 2>&1 | tee "$EVIDENCE_DIR/build-final.txt"`

- Result: PASS.
- Notes: Next.js production build completed and emitted the app route table plus `Proxy (Middleware)`.

`PLAYWRIGHT_PORT=3000 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/route-transition-perf-smoke-budget-port3000-final.txt"`

- Result: PASS with one intentional skip.
- Summary: 4 passed, 1 skipped in the earlier run before public Link-transition medians were added. The skipped test was authenticated evidence gated on `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`.

`PLAYWRIGHT_PORT=3031 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/route-transition-perf-smoke-production-like-3031.txt"`

- Result: PASS with one intentional skip.
- Summary: earlier `next start` production-like smoke on port 3031 passed 4 tests and skipped the authenticated dev-auth test.

`PERF_SEED_OUTPUT="$EVIDENCE_DIR/peak-load-seed-manifest.json" bun run perf:seed-fixture 2>&1 | tee "$EVIDENCE_DIR/peak-load-seed-fixture-output.txt"`

- Result: PASS.
- Summary: generated a non-destructive fixture manifest for 50 projects, 1,500 estimates, and 300,000 row items.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-slow-3g-link-transition-evidence-contract.txt"`

- Result: RED as expected.
- Summary: source-level governance test failed because the route-transition Playwright spec only measured Slow 3G page-load evidence, not Slow 3G Link-transition medians.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-slow-3g-link-transition-evidence-contract.txt"`

- Result: PASS.
- Summary: 1 file passed, 3 tests passed after adding Slow 3G Link-transition evidence to the Playwright spec and budgets.

`bunx eslint e2e/route-transition-performance.spec.ts tests/vitest/route-transition-performance-spec.test.ts 2>&1 | tee "$EVIDENCE_DIR/eslint-slow-3g-link-transition-evidence-contract.txt"`

- Result: PASS.
- Notes: no output.

`PLAYWRIGHT_PORT=3037 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/fresh-production-like-e2e-perf-port3037-with-slow3g-transition.txt"`

- Result: PASS with two intentional skips.
- Summary: 6 passed, 2 skipped. The fresh production-like run captured public baseline, Slow 3G page load, Slow 3G Link-transition medians, public Link-transition medians, bfcache/no-overlay, and signed-out protected redirect. Authenticated evidence tests skipped because local dev-auth flags and seeded data are not available in `next start` production-like mode.
- Key value: Slow 3G `/features` to `/pricing` Link-transition median was 1386 ms across 3 runs, with overlay visibility rate 0.0.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-slow-3g-link-transition-spec.txt"`

- Result: PASS.
- Notes: no TypeScript errors after adding the Slow 3G Link-transition evidence contract.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-slow-3g-link-transition-spec.txt"`

- Result: PASS.
- Notes: no whitespace errors after adding the Slow 3G Link-transition evidence contract.

`npx --yes lighthouse http://127.0.0.1:3037/ --chrome-flags="--headless=new --no-sandbox" --only-categories=performance --output=json --output-path="$EVIDENCE_DIR/lighthouse-home-production-like-3037.json" --quiet`

- Result: PASS / measured.
- Summary: local production-like public `/` Lighthouse performance score was 0.38; FCP about 1888.5 ms, LCP about 6759.4 ms, TBT about 5672.5 ms, CLS 0. This is evidence, not a pass against a 0.90 performance target.

`npx --yes lighthouse http://127.0.0.1:3037/features --chrome-flags="--headless=new --no-sandbox" --only-categories=performance --output=json --output-path="$EVIDENCE_DIR/lighthouse-features-production-like-3037.json" --quiet`

- Result: PASS / measured.
- Summary: local production-like `/features` Lighthouse performance score was 0.71; FCP about 1916.4 ms, LCP about 4624.8 ms, TBT about 365.7 ms, CLS 0. This is evidence, not a pass against a 0.90 performance target.

`npx --yes lighthouse http://127.0.0.1:3037/pricing --chrome-flags="--headless=new --no-sandbox" --only-categories=performance --output=json --output-path="$EVIDENCE_DIR/lighthouse-pricing-production-like-3037.json" --quiet`

- Result: PASS / measured.
- Summary: local production-like `/pricing` Lighthouse performance score was 0.92; FCP about 1346.8 ms, LCP about 2396.8 ms, TBT about 31.5 ms, CLS 0.

`bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/project-dashboard-ui.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-expanded-route-transition-workshop-vitest-after-slow3g-lighthouse-refresh.txt"`

- Result: PASS.
- Summary: 10 files passed, 123 tests passed after the Slow 3G Link-transition and Lighthouse evidence refresh.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-slow3g-lighthouse-doc-refresh.txt"`

- Result: PASS.
- Notes: no whitespace errors after the Slow 3G Link-transition and Lighthouse evidence refresh.

## Fresh Verification After Route-Adjacent Test Cleanup

`bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1 -t "keeps Supabase upload review safeguards in place" 2>&1 | tee "$EVIDENCE_DIR/red-stale-next-config-assertion-current.txt"`

- Result: PASS.
- Summary: the previously stale `next.config.ts` assertion is already corrected in the current test file.

`bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-library-consolidation-after-stale-next-config-check.txt"`

- Result: PASS.
- Summary: 1 file passed, 9 tests passed.

`bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1 -t "inserts from the production sidebar direct callback path" 2>&1 | tee "$EVIDENCE_DIR/red-estimate-sidebar-direct-callback-isolated.txt"`

- Result: RED as expected.
- Summary: isolated DOM test timed out at the default 15s limit before the test fixture was narrowed.

`bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1 -t "inserts from the production sidebar direct callback path" 2>&1 | tee "$EVIDENCE_DIR/green-estimate-sidebar-direct-callback-minimal-fixture.txt"`

- Result: PASS.
- Summary: the route-adjacent estimate-sheet sidebar callback test passed after a test-only fixture speedup.

`bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-estimate-sheet-cost-inputs-after-sidebar-test-speedup.txt"`

- Result: PASS.
- Summary: 1 file passed, 31 tests passed.

`bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/project-dashboard-ui.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-targeted-vitest-after-estimate-test-speedup.txt"`

- Result: FAIL.
- Summary: route-targeted suite exposed a `workshop-library-consolidation-ui.test.tsx` `beforeAll` hook timeout. This was test infrastructure debt from heavy dynamic import transforms, not a production behavior regression.

`bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/project-dashboard-ui.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-targeted-vitest-after-test-hook-timeout-fix.txt"`

- Result: PASS.
- Summary: 8 files passed, 89 tests passed after the heavy import hook declared its needed timeout.

`bunx vitest run tests/vitest/live-estimate-node-route.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-live-estimate-node-route-after-dynamic-wrapper.txt"`

- Result: RED as expected.
- Summary: source-level assertion was too brittle after the dynamic estimate workspace wrapper added adjacent props and formatting.

`bunx vitest run tests/vitest/live-estimate-node-route.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-live-estimate-node-route-after-dynamic-wrapper-test-fix.txt"`

- Result: PASS.
- Summary: 1 file passed, 8 tests passed after asserting `projectId` and `estimateId` separately.

`bunx vitest run tests/vitest/estimate-tree-context-menu.test.tsx --maxWorkers=1 -t "shares optimistic rename state" 2>&1 | tee "$EVIDENCE_DIR/red-estimate-tree-optimistic-rename-isolated.txt"`

- Result: PASS in isolation.
- Summary: the test passed in 12.07s but ran close to the default timeout and timed out under full-suite contention; the test now has an explicit 30s timeout guard.

`bunx vitest run tests/vitest/estimate-tree-context-menu.test.tsx --maxWorkers=1 -t "shares optimistic rename state" 2>&1 | tee "$EVIDENCE_DIR/green-estimate-tree-optimistic-rename-timeout-guard.txt"`

- Result: PASS.
- Summary: focused optimistic rename/query-cache sharing test passed after the explicit timeout guard.

`bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/project-dashboard-ui.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-expanded-route-transition-workshop-vitest-after-route-adjacent-fixes.txt"`

- Result: PASS.
- Summary: 10 files passed, 122 tests passed. This is the strongest fresh route/workshop targeted validation for this continuation.

`bunx eslint tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx 2>&1 | tee "$EVIDENCE_DIR/fresh-eslint-route-test-files-after-test-hook-timeout-fix.txt"`

- Result: PASS.
- Notes: no output.

`bunx eslint tests/vitest/live-estimate-node-route.test.ts tests/vitest/estimate-tree-context-menu.test.tsx 2>&1 | tee "$EVIDENCE_DIR/fresh-eslint-route-adjacent-tests-after-fixes.txt"`

- Result: PASS.
- Notes: no output.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/fresh-type-check-after-route-adjacent-test-fixes.txt"`

- Result: PASS.
- Notes: no TypeScript errors after the route-adjacent test fixes.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/fresh-design-system-after-route-adjacent-test-fixes.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-after-route-adjacent-test-fixes.txt"`

- Result: PASS.
- Notes: no whitespace errors.

`bun run test 2>&1 | tee "$EVIDENCE_DIR/fresh-unit-tests-after-test-hook-timeout-fix.txt"`

- Result: PASS.
- Summary: 4 unit tests passed.

`bun run build 2>&1 | tee "$EVIDENCE_DIR/fresh-build-after-test-hook-timeout-fix.txt"`

- Result: PASS.
- Notes: Next.js production build completed and emitted the app route table plus `Proxy (Middleware)`.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/fresh-type-check-after-next-env-restore-final.txt"`

- Result: PASS.
- Notes: final TypeScript rerun after restoring generated `next-env.d.ts` build churn to the checked-in dev route-types reference.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-after-next-env-restore-final.txt"`

- Result: PASS.
- Notes: no whitespace errors after the final generated-file restore.

`npx gitnexus detect-changes --repo archestimator 2>&1 | tee "$EVIDENCE_DIR/gitnexus-detect-changes-after-route-adjacent-test-fixes.txt"`

- Result: PASS / analyzed.
- Summary: 67 changed files, 91 changed symbols, 58 affected execution flows, critical risk. This reflects the accumulated branch and unrelated dirty-worktree breadth; it blocks any production-readiness claim.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/fresh-diff-check-after-final-evidence-doc-update.txt"`

- Result: PASS.
- Notes: no whitespace errors after the final evidence/status refresh.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-bfcache-capture-evidence-contract.txt"`

- Result: PASS.
- Summary: 1 file passed, 4 tests passed. The route-transition perf spec governance now requires bfcache diagnostic capture (`page.addInitScript`, `event.persisted`, `bfcachePersisted`, `notRestoredReasons`) and screenshot attachment, without treating headless `pageshow.persisted=false` as an automatic failure.

`bunx eslint e2e/route-transition-performance.spec.ts tests/vitest/route-transition-performance-spec.test.ts 2>&1 | tee "$EVIDENCE_DIR/eslint-bfcache-capture-evidence-contract.txt"`

- Result: PASS.
- Notes: no output.

`PLAYWRIGHT_PORT=3039 bunx playwright test e2e/route-transition-performance.spec.ts --grep "back-forward cache" --project=chromium --reporter=list 2>&1 | tee "$EVIDENCE_DIR/bfcache-capture-production-like-3039.txt"`

- Result: PASS.
- Summary: 1 Chromium test passed against `next start` on port 3039.
- Captured evidence: `navigationTypes:["back_forward"]`, `pageshowPersisted:[false]`, `bfcachePersisted:false`, `notRestoredReasons:[null]`, restore about 144 ms, and no stuck route overlay. This proves automated back-forward/no-overlay behavior in the harness, but not a manual Chrome DevTools bfcache persisted screenshot.

`PLAYWRIGHT_PORT=3039 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/fresh-production-like-e2e-perf-port3039-with-bfcache-capture.txt"`

- Result: PASS with authenticated checks skipped.
- Summary: 6 passed, 2 skipped. Public route baseline, Slow 3G public page-load, Slow 3G public Link-transition medians, public Link-transition medians, public bfcache/no-overlay, and signed-out protected redirect passed against `next start` on port 3039. Authenticated checks were skipped because dev-auth bypass is development-only.
- Captured highlights: Slow 3G `/features` to `/pricing` Link-transition median about 1389 ms with overlay visibility rate 0.0; normal public Link-transition median about 314 ms with overlay visibility rate 1.0; bfcache restore about 1113 ms with `back_forward` navigation and no stuck overlay; signed-out `/workshop/projects` redirect duration about 321 ms.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-bfcache-capture.txt"`

- Result: PASS.
- Notes: no TypeScript errors after the bfcache evidence capture adjustment.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-bfcache-capture.txt"`

- Result: PASS.
- Notes: no whitespace errors after the bfcache evidence capture adjustment.

`bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/project-dashboard-ui.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-expanded-route-transition-workshop-vitest-after-bfcache-capture.txt"`

- Result: PASS.
- Summary: 10 files passed, 124 tests passed. This is the strongest fresh route/workshop targeted validation after the bfcache evidence-capture correction.

`bunx vitest run tests/vitest/component-library-ui.test.tsx --maxWorkers=1 -t "renders the sidebar without a title bar" --testTimeout=20000 2>&1 | tee "$EVIDENCE_DIR/red-component-library-ui-timeout-focused.txt"`

- Result: PASS in focused isolation.
- Summary: 1 file passed, 1 selected test passed. This isolated pass helped diagnose that the component-library failures in full DOM were test-file isolation/cleanup debt rather than the first render path itself.

`bunx vitest run tests/vitest/component-library-ui.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/component-library-ui-focused-continuation.txt"`

- Result: FAIL before the cleanup repair.
- Summary: 1 failed, 22 passed. The order-dependent failure was `keeps slash shortcut from focusing search behind the component modal`, which timed out after prior renders accumulated in the same file.

`bunx vitest run tests/vitest/component-library-ui.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-component-library-ui-cleanup-continuation.txt"`

- Result: PASS.
- Summary: 1 file passed, 23 tests passed after adding explicit Testing Library cleanup in `tests/vitest/component-library-ui.test.tsx`.

`bunx eslint tests/vitest/component-library-ui.test.tsx 2>&1 | tee "$EVIDENCE_DIR/eslint-component-library-ui-cleanup-continuation.txt"`

- Result: PASS.
- Notes: no output.

`bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/project-dashboard-ui.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/component-library-manager-ui.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/use-prefetch-on-hover.test.tsx tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-expanded-route-workshop-vitest-with-component-library-cleanup.txt"`

- Result: PASS.
- Summary: 12 files passed, 162 tests passed. This is the strongest fresh route/workshop/library targeted validation after the component-library test-isolation repair.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-component-library-cleanup.txt"`

- Result: PASS.
- Notes: no TypeScript errors after the component-library test-isolation repair.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-component-library-cleanup.txt"`

- Result: PASS.
- Notes: no whitespace errors after the component-library test-isolation repair.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-component-library-evidence-docs.txt"`

- Result: PASS.
- Notes: no whitespace errors after recording the component-library cleanup evidence.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-spec-after-component-library-docs.txt"`

- Result: PASS.
- Summary: 1 file passed, 4 tests passed after the evidence/status refresh.

`mcp__code_review_graph.detect_changes_tool(changed_files=["tests/vitest/component-library-ui.test.tsx"], detail_level="minimal")`

- Result: PASS / analyzed.
- Summary: 1 changed file, 88 changed functions/classes reported by the graph, 0 affected flows, 31 graph-reported test gaps, risk score 0.60. The high reported symbol count is graph noise from the TSX test file; the actual diff is an explicit Testing Library cleanup import plus `cleanup()` in `afterEach`.

`npx gitnexus detect-changes -r archestimator 2>&1 | tee "$EVIDENCE_DIR/gitnexus-detect-changes-after-component-library-cleanup.txt"`

- Result: PASS / analyzed.
- Summary: 59 changed files, 91 changed symbols, 58 affected processes, critical risk. This continues to block readiness/archive claims and reflects the broad accumulated route/shell/repository branch plus unrelated dirty worktree.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/final-type-check-continuation.txt"`

- Result: PASS.
- Notes: final TypeScript rerun after route/workshop/library evidence docs.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/final-design-system-continuation.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed after route/workshop/library evidence docs.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/final-diff-check-continuation.txt"`

- Result: PASS.
- Notes: no whitespace errors after route/workshop/library evidence docs.

`bun run build 2>&1 | tee "$EVIDENCE_DIR/final-build-continuation.txt"`

- Result: PASS.
- Notes: Next.js production build completed and emitted the app route table plus `Proxy (Middleware)`. The build regenerated `next-env.d.ts` route-type metadata afterward; that generated churn was restored before the final no-churn checks below.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/final-type-check-after-next-env-restore-continuation.txt"`

- Result: PASS.
- Notes: final TypeScript rerun after restoring generated `next-env.d.ts` churn to the checked-in dev route-types reference.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/final-design-system-after-next-env-restore-continuation.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed after restoring generated `next-env.d.ts` churn.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/final-diff-check-after-next-env-restore-continuation.txt"`

- Result: PASS.
- Notes: no whitespace errors after restoring generated `next-env.d.ts` churn.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/final-diff-check-after-validation-output-finalization.txt"`

- Result: PASS.
- Notes: no whitespace errors after finalizing this validation-output evidence file.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-route-transition-measure-script-production-evidence.txt"`

- Result: RED as expected.
- Summary: the standalone route measurement script did not yet prove it used the project Playwright dependency, wrote JSON artifacts, skipped authenticated scenarios safely, recorded overlay/RSC metrics, or exposed expected pathnames for benchmark evidence.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-route-transition-measure-script-production-evidence.txt"`

- Result: PASS.
- Summary: the script governance test passed after `scripts/measure-route-transitions.ts` gained JSON output, authenticated-scenario gating, expected pathname tracking, overlay visibility rate, and RSC request counts.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-route-transition-measure-script-hidden-overlay.txt"`

- Result: RED as expected.
- Summary: the script still waited for the overlay DOM node to disappear instead of waiting for the overlay to become hidden, which inflated benchmark timings when the overlay node remained mounted.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-route-transition-measure-script-hidden-overlay.txt"`

- Result: PASS.
- Summary: overlay wait now uses `{ state: "hidden" }`, so the benchmark measures route transition completion instead of hidden overlay DOM retention.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-route-transition-measure-script-scenario-filter.txt"`

- Result: RED as expected.
- Summary: the script did not yet support focused scenario selection, which made quick production-like reruns harder when a known-heavy route was not the current target.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-route-transition-measure-script-scenario-filter.txt"`

- Result: PASS.
- Summary: the script now supports `SCENARIO_FILTER`, includes it in the JSON artifact, and still records authenticated skip state.

`bunx eslint scripts/measure-route-transitions.ts tests/vitest/route-transition-measure-script.test.ts 2>&1 | tee "$EVIDENCE_DIR/eslint-route-transition-measure-script-scenario-filter.txt"`

- Result: PASS.
- Notes: no output.

`BASE_URL=http://127.0.0.1:3042 RUNS=3 NETWORK_PROFILE='No throttle' SCENARIO_FILTER='Contact' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-contact-no-throttle-3042.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-contact-no-throttle-3042.txt"`

- Result: PASS.
- Summary: production-like `next start` run captured 3 no-throttle runs each for About to Contact and Pricing to Contact. Medians were 779 ms and 737 ms respectively; overlay visibility rate was 1.0 for both; there were 0 failures.

`BASE_URL=http://127.0.0.1:3042 RUNS=3 NETWORK_PROFILE='Slow 3G' SCENARIO_FILTER='Contact' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-contact-slow3g-3042.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-contact-slow3g-3042.txt"`

- Result: PASS.
- Summary: production-like `next start` run captured 3 Slow 3G runs each for About to Contact and Pricing to Contact. Medians were 1893 ms and 3177 ms respectively; overlay visibility rate was 0.67 for both; there were 0 failures.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-measure-script-refresh.txt"`

- Result: PASS.
- Notes: no TypeScript errors after the route measurement script refresh.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/design-system-after-measure-script-refresh.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed after the route measurement script refresh.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-measure-script-refresh.txt"`

- Result: PASS.
- Notes: no whitespace errors after the route measurement script refresh.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-perf-governance-after-measure-script-refresh.txt"`

- Result: PASS.
- Summary: 2 files passed, 5 tests passed, covering both Playwright perf-spec governance and the refreshed standalone measurement script.

`mcp__code_review_graph.detect_changes_tool(changed_files=["scripts/measure-route-transitions.ts","tests/vitest/route-transition-measure-script.test.ts"], detail_level="minimal")`

- Result: PASS / analyzed.
- Summary: 2 changed files, 94 graph-reported changed functions/classes, 0 affected flows, 37 graph-reported test gaps, risk score 0.60. The changed files are a diagnostic script plus its source-governance test; no runtime app flows were affected.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-measure-script-evidence-docs.txt"`

- Result: PASS.
- Notes: no whitespace errors after recording the route measurement script evidence.

`npx gitnexus detect-changes -r archestimator 2>&1 | tee "$EVIDENCE_DIR/gitnexus-detect-changes-after-measure-script-refresh.txt"`

- Result: PASS / analyzed.
- Summary: 61 changed files, 120 changed symbols, 58 affected processes, critical risk. This still blocks readiness/archive claims and reflects the accumulated route-transition branch plus unrelated dirty worktree breadth.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-measure-script-validation-log-final.txt"`

- Result: PASS.
- Notes: no whitespace errors after the final route measurement script validation-log refresh.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-route-transition-measure-script-auth-sidebar-position.txt"`

- Result: RED as expected.
- Summary: the standalone measurement script did not yet target the visible collapsed-sidebar icon position for authenticated workshop scenarios, so center hover/click could be intercepted by clipped sidebar label content instead of measuring the route link.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-route-transition-measure-script-auth-sidebar-position.txt"`

- Result: PASS.
- Summary: authenticated workshop scenarios now use explicit sidebar icon positions for hover and click targeting.

`bunx eslint scripts/measure-route-transitions.ts tests/vitest/route-transition-measure-script.test.ts 2>&1 | tee "$EVIDENCE_DIR/eslint-route-transition-measure-script-auth-sidebar-position.txt"`

- Result: PASS.
- Notes: no output.

`BASE_URL=http://127.0.0.1:3043 INCLUDE_AUTHENTICATED=1 RUNS=3 NETWORK_PROFILE='No throttle' SCENARIO_FILTER='Authenticated' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-authenticated-no-throttle-3043-final.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-authenticated-no-throttle-3043-final.txt"`

- Result: PASS.
- Summary: local dev-auth `next dev` run captured 3 no-throttle runs each for Workshop to Projects, Library, Templates, and Settings/Profile. Medians were 1940 ms, 4496 ms, 2405 ms, and 2716 ms respectively; overlay visibility rate was 1.0 for all four; there were 0 failures.

`BASE_URL=http://127.0.0.1:3043 INCLUDE_AUTHENTICATED=1 RUNS=3 NETWORK_PROFILE='Slow 3G' SCENARIO_FILTER='Workshop to Projects' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-authenticated-projects-slow3g-3043.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-authenticated-projects-slow3g-3043.txt"`

- Result: PASS.
- Summary: local dev-auth `next dev` Slow 3G run captured 3 Workshop to Projects runs with median 6158 ms, overlay visibility rate 0.0, 0 `_rsc` requests in the script capture, and 0 failures.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-route-transition-measure-script-settings-final-path.txt"`

- Result: RED as expected.
- Summary: the measurement script expected `/workshop/settings`, but the live settings link resolves to `/workshop/settings/profile`, so the script could mark a valid transition as a pathname mismatch.

`bunx vitest run tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/green-route-transition-measure-script-settings-final-path.txt"`

- Result: PASS.
- Summary: the settings scenario now expects `/workshop/settings/profile`, matching the live route.

`bunx eslint scripts/measure-route-transitions.ts tests/vitest/route-transition-measure-script.test.ts 2>&1 | tee "$EVIDENCE_DIR/eslint-route-transition-measure-script-settings-final-path.txt"`

- Result: PASS.
- Notes: no output.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-perf-governance-after-auth-measure-script.txt"`

- Result: PASS.
- Summary: 2 files passed, 5 tests passed after the authenticated measurement-script targeting and settings-path fixes.

`bunx eslint scripts/measure-route-transitions.ts tests/vitest/route-transition-measure-script.test.ts 2>&1 | tee "$EVIDENCE_DIR/eslint-route-transition-measure-script-auth-final.txt"`

- Result: PASS.
- Notes: no output.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-auth-measure-script.txt"`

- Result: PASS.
- Notes: no TypeScript errors after recording authenticated measurement-script evidence.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/design-system-after-auth-measure-script.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed after recording authenticated measurement-script evidence.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-auth-measure-script-docs.txt"`

- Result: PASS.
- Notes: no whitespace errors after the authenticated measurement-script evidence docs.

`mcp__code_review_graph.detect_changes_tool(changed_files=["scripts/measure-route-transitions.ts","tests/vitest/route-transition-measure-script.test.ts"], detail_level="minimal")`

- Result: PASS / analyzed.
- Summary: 2 changed files, 94 graph-reported changed functions/classes, 0 affected flows, 37 graph-reported test gaps, risk score 0.60. The changed files remain a diagnostic script plus its source-governance test; no runtime app flows were affected by this script-only continuation.

`npx gitnexus detect-changes -r archestimator 2>&1 | tee "$EVIDENCE_DIR/gitnexus-detect-changes-after-auth-measure-script.txt"`

- Result: PASS / analyzed.
- Summary: 61 changed files, 122 changed symbols, 58 affected processes, critical risk. This still blocks readiness/archive claims and reflects the accumulated route-transition branch plus unrelated dirty worktree breadth.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-auth-validation-log-final.txt"`

- Result: PASS.
- Notes: no whitespace errors after recording the authenticated measurement-script validation log.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/red-peak-load-profile-harness.txt"`

- Result: RED as expected.
- Summary: route-transition governance failed because no peak-load render profile harness existed for the Phase 6 50-project / 200-row profiling decision.

`ROUTE_PERF_PROFILE_OUTPUT="$EVIDENCE_DIR/peak-load-render-profile.json" bun run perf:profile-peak-load 2>&1 | tee "$EVIDENCE_DIR/green-peak-load-render-profile-final.txt"`

- Result: PASS.
- Summary: 1 file passed, 1 test passed. The harness rendered 50 project-estimate table rows and 200 estimate-sheet rows, then wrote `peak-load-render-profile.json`.
- Captured values: project-estimates table initial render 720.61 ms for 50 rows; estimate-sheet content initial render 1390.33 ms for 200 rows. Both decisions remain "defer" for virtualization and broad memoization until browser profiler evidence proves jank or re-render cost.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-peak-load-profile.test.tsx --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-governance-with-peak-load-profile.txt"`

- Result: PASS.
- Summary: 2 files passed, 6 tests passed after adding the peak-load profile harness.

`bunx eslint tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-peak-load-profile.test.tsx 2>&1 | tee "$EVIDENCE_DIR/eslint-peak-load-profile-harness.txt"`

- Result: PASS.
- Notes: no output.

`bunx vitest run tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-peak-load-profile.test.tsx tests/vitest/route-transition-measure-script.test.ts --maxWorkers=1 2>&1 | tee "$EVIDENCE_DIR/fresh-route-transition-governance-after-peak-load-docs.txt"`

- Result: PASS.
- Summary: 3 files passed, 7 tests passed after recording the peak-load profile docs.

`bunx eslint tests/vitest/route-transition-performance-spec.test.ts tests/vitest/route-transition-peak-load-profile.test.tsx tests/vitest/route-transition-measure-script.test.ts scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/eslint-route-transition-peak-load-and-measure.txt"`

- Result: PASS.
- Notes: no output.

`bun run type-check 2>&1 | tee "$EVIDENCE_DIR/type-check-after-peak-load-profile.txt"`

- Result: PASS.
- Notes: no TypeScript errors after adding the peak-load profile harness.

`bun run lint:design-system 2>&1 | tee "$EVIDENCE_DIR/design-system-after-peak-load-profile.txt"`

- Result: PASS.
- Notes: app/workshop design-system enforcement passed after adding the peak-load profile harness.

`git diff --check 2>&1 | tee "$EVIDENCE_DIR/diff-check-after-peak-load-profile.txt"`

- Result: PASS.
- Notes: no whitespace errors after adding the peak-load profile harness and docs.

`mcp__code_review_graph.detect_changes_tool(changed_files=["tests/vitest/route-transition-performance-spec.test.ts","tests/vitest/route-transition-peak-load-profile.test.tsx","package.json"], detail_level="minimal")`

- Result: PASS / analyzed.
- Summary: 3 changed files, 94 graph-reported changed functions/classes, 0 affected flows, 37 graph-reported test gaps, risk score 0.60. The new peak-load profile harness is test/dev-script evidence and does not add runtime app flow impact.

`npx gitnexus detect-changes -r archestimator 2>&1 | tee "$EVIDENCE_DIR/gitnexus-detect-changes-after-peak-load-profile.txt"`

- Result: PASS / analyzed.
- Summary: 61 changed files, 122 changed symbols, 58 affected processes, critical risk. This still blocks readiness/archive claims and reflects the accumulated route-transition branch plus unrelated dirty worktree breadth.

## Failing Or Incomplete Commands

`BASE_URL=http://127.0.0.1:3042 RUNS=3 NETWORK_PROFILE='No throttle' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-no-throttle-3042.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-no-throttle-3042.txt"`

- Result: FAIL / superseded.
- Classification: this early run exposed that the measurement script used routes/links and overlay-completion criteria that were too brittle for repeatable evidence. It was superseded by the red/green script fixes and filtered passing runs above.

`BASE_URL=http://127.0.0.1:3042 RUNS=3 NETWORK_PROFILE='No throttle' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-no-throttle-3042-fixed.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-no-throttle-3042-fixed.txt"`

- Result: FAIL / superseded.
- Classification: this run showed the root landing scenario can be dominated by the Neat/WebGL background in headless Chromium, making it unsuitable for a quick focused rerun. It was superseded by `SCENARIO_FILTER='Contact'` no-throttle and Slow 3G runs with 0 failures.

`BASE_URL=http://127.0.0.1:3043 INCLUDE_AUTHENTICATED=1 RUNS=3 NETWORK_PROFILE='No throttle' SCENARIO_FILTER='Authenticated' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-authenticated-no-throttle-3043.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-authenticated-no-throttle-3043.txt"`

- Result: FAIL / superseded.
- Classification: this initial authenticated run exposed invalid center targeting for collapsed sidebar links. It was superseded by the explicit icon-position script fix and final authenticated no-throttle run.

`BASE_URL=http://127.0.0.1:3043 INCLUDE_AUTHENTICATED=1 RUNS=3 NETWORK_PROFILE='No throttle' SCENARIO_FILTER='Authenticated' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-authenticated-no-throttle-3043-fixed.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-authenticated-no-throttle-3043-fixed.txt"`

- Result: PASS / superseded.
- Classification: this authenticated run proved the icon-position fix, but still expected the settings final path as `/workshop/settings`. It was superseded by the final run after updating the expected settings pathname to `/workshop/settings/profile`.

`bun run lint 2>&1 | tee "$EVIDENCE_DIR/full-lint-after-auth-smoke-fix.txt"`

- Result: FAIL.
- Historical count: 91 errors, 32 warnings.
- Classification: remaining errors are in share/publication/shared-link and pitch-deck scopes outside this route-transition work. Targeted route-transition lint passed.

`bun run lint 2>&1 | tee "$EVIDENCE_DIR/full-lint-after-chart-fix.txt"`

- Result: FAIL.
- Historical count: 91 errors, 32 warnings.
- Classification: remaining errors are share/publication/shared-link tests and presentation/deck warnings outside this route-transition scope. The `CostDonutChart` lint errors from a touched route-transition file were fixed and no longer appear.

`bun run test:dom 2>&1 | tee "$EVIDENCE_DIR/full-test-dom-after-perf-gates.txt"`

- Result: interrupted after reproducing unrelated failures and then hanging.
- Observed failures before interruption: project-publication page/activity/actions, project creation image upload, landing security headers, and project publication security headers.
- Classification: unrelated to route-transition changes. Targeted route-transition DOM coverage passed.

`bun run lint 2>&1 | tee "$EVIDENCE_DIR/fresh-full-lint-after-route-adjacent-test-fixes.txt"`

- Result: FAIL.
- Historical count: 91 errors, 32 warnings.
- Classification: remaining errors are in unrelated share/publication/shared-link, project-publication, unit P3 shared-link migration, and pitch-deck scopes. The only route-transition touched warning is the known TanStack Table React Compiler `incompatible-library` warning in `ProjectEstimatesTable.tsx`; targeted route-transition lint passed.

`bun run test:dom 2>&1 | tee "$EVIDENCE_DIR/fresh-full-test-dom-after-route-adjacent-test-fixes.txt"` (superseded by the later `fresh-full-test-dom-after-component-library-cleanup.txt` rerun)

- Result: FAIL.
- Historical count at that point: 6 failed files, 12 failed tests, 109 passed files, 894 passed tests, 2 skipped tests.
- Classification: remaining failures were unrelated share/publication/security-header/project-creation tests. A later continuation rerun also fixed route/library-adjacent `component-library-ui.test.tsx` full-DOM timeouts and produced the historical 109 passed files / 896 passed tests result; latest full DOM now passes.

`bun run lint 2>&1 | tee "$EVIDENCE_DIR/fresh-full-lint-continuation.txt"`

- Result: FAIL.
- Historical count: 91 errors, 32 warnings.
- Classification: unchanged unrelated validation debt in share/publication/shared-link, publication tests/actions, and pitch-deck warnings. The route-transition/library cleanup did not add lint errors.

`bun run test:dom 2>&1 | tee "$EVIDENCE_DIR/fresh-full-test-dom-continuation.txt"`

- Result: FAIL.
- Historical count before component-library cleanup: 7 failed files, 19 failed tests, including route/library-adjacent `component-library-ui.test.tsx` timeouts plus unrelated publication/security/project-creation failures.
- Classification: the component-library failures were in scope because route-transition bundle/code-splitting touched library surfaces.

`bun run test:dom 2>&1 | tee "$EVIDENCE_DIR/fresh-full-test-dom-after-component-library-cleanup.txt"`

- Result: FAIL.
- Historical count after component-library cleanup: 6 failed files, 12 failed tests, 109 passed files, 896 passed tests, 2 skipped tests.
- Classification: the route/library-adjacent `component-library-ui.test.tsx` failures are resolved. Remaining failures are unrelated landing/project-publication/project-creation tests and still block `bun run validate`, archive, and readiness claims.

`PLAYWRIGHT_PORT=3000 bun run test:e2e 2>&1 | tee "$EVIDENCE_DIR/full-e2e-port3000-after-perf-gates.txt"`

- Result: FAIL.
- Passing in this run: auth redirect/login smoke plus all route-transition perf tests.
- Failing in this run: `e2e/landing-audit.spec.ts` timed out. This is outside route-transition scope.
- Skipped: 17 gated auth/data/collaboration specs because their env gates were absent.
- Superseded by: `full-e2e-after-live-error-smoke-20260601.txt`, which passed with 9 passed and 20 intentionally skipped.

## Notes

Full type-check, lint, design-system lint, unit tests, build, targeted route-transition tests, `test:e2e:perf`, live dev-auth route-error smoke, and full `bun run test:e2e` now pass in the latest evidence. Full DOM passed in the latest prior full-DOM evidence. This route-transition run did not modify active share/collaboration implementation scopes except for documenting transient validation failures as superseded blockers.
