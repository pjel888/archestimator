# ADV Release Status Export - 20260622T075913Z

Verdict: NO-GO.

Reason: the local release validation gate is now green, fresh Chromium
provider-backed dense proof passed after validation, Chromium 500-row dense
timing proof passed after the virtualization fallback, and Chromium desktop
glass-shell proof passed after that, but the full glass visual matrix,
Safari/iOS/Android device matrix, RTL/touch-target, 5,000-row keystroke tier,
cross-browser portal/focus proof, and final manual copy-deck proof rows remain
partial or unproven. This file records release status; it is not a release
approval.

Validation evidence included in this export:

- `bun run validate` passed:
  - `tsc --noEmit` passed.
  - `eslint` passed with warnings only (45 warnings, 0 errors).
  - `lint:design-system` passed.
  - `lint:design` passed.
  - `bun test tests/unit` passed 25 tests across 5 files.
  - `vitest run --maxWorkers=1` passed 415 files, 3024 tests; 1 file skipped, 4 tests skipped, 5 todo.
- Previously failing DOM subset passed:
  `bunx vitest run tests/vitest/agent-payload-contract.test.ts tests/vitest/security-findings-library-tooling-contracts.test.ts tests/vitest/component-library-versioning-schema.test.ts tests/vitest/upsert-update-grant-contract.test.ts tests/vitest/workspace-repository-project-list.test.ts tests/vitest/workshop-project-groups-repository.test.ts tests/vitest/summary-no-requery.test.ts tests/vitest/reusable-sources-actions.test.ts tests/vitest/terms-gate-direct-callers.test.ts tests/vitest/legal-terms-actions.test.ts tests/vitest/ui-spinner.test.tsx tests/vitest/auth-settings-ui-contract.test.ts tests/vitest/component-library-manager.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-drag-edge-autoscroll-hook.test.tsx tests/vitest/project-dashboard-client.test.tsx tests/vitest/projects-page-view-mode.test.tsx tests/vitest/main-sidebar-favorites.test.tsx tests/vitest/project-dashboard-side-panel-ui.test.ts tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
  passed 20 files / 150 tests.
- `bun run type-check`, `bun run lint --quiet`, `bun run lint:design-system`,
  `bun run lint:design`, and `git diff --check` passed before the aggregate
  validate run.
- Fresh provider/browser dense proof passed:
  `ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 ... bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "proves dense component table"`
  passed 1 Chromium test with 500 provider-seeded rows after the virtualization
  fallback. Artifacts:
  `_evidence/phase-5/dense-mode/library-phase5-dense-table-chromium-1280x900-20260622T091251Z.{png,json}`,
  `_evidence/phase-5/dense-mode/library-phase5-dense-mobile-chromium-390x844-20260622T091251Z.{png,json}`,
  and
  `_evidence/phase-5/dense-mode/provider-virtualized-perf-proof-20260622T091332Z.md`.
  Desktop metadata records `virtualActive=true`, `totalCount=500`,
  `mountedCount=25`, `domRowCount=25`.
- Fresh provider/browser dense timing proof passed:
  `ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF=1 ... bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "measures dense component table"`
  passed 1 Chromium test. Artifact:
  `_evidence/phase-5/dense-mode/library-phase5-dense-perf-chromium-1280x900-20260622T091332Z.json`.
  Budget result: dense-toggle median `146.5ms` <= `500ms`, search-narrow
  median `80.4ms` <= `100ms`, search-restore median `87.9ms` <= `500ms`; p95,
  browser transfer size, and decoded body size are recorded.
  Fixture cleanup returned 0 rows tagged `phase-5-dense-browser-proof`.
- Fresh Chromium glass-shell proof passed:
  `ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ... bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "proves library glass shell"`
  passed 1 Chromium test. Artifacts:
  `_evidence/phase-1/glass-shell/library-phase1-glass-shell-chromium-1280x720-20260622T081457Z.{png,json}`
  and `_evidence/phase-1/glass-shell/glass-shell-browser-proof-20260622T081457Z.md`.
- Fresh copy-deck drift closure passed:
  `bunx vitest run tests/vitest/library-copy-contract.test.ts tests/vitest/library-source-trust.test.ts tests/vitest/library-overview.test.tsx tests/vitest/template-gallery.test.tsx tests/vitest/component-library-manager.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1`
  passed 6 files / 54 tests. Evidence:
  `_evidence/phase-final/copy-contract-pass-20260622T082151Z.md`.

Status matrix:

| ADV ID | Status | Evidence / blocker |
| --- | --- | --- |
| `ADV-XWS-COMPONENT-PARAM` | PASS | Focused route-state authz test passed; foreign/invalid component param is stripped before detail disclosure. |
| `ADV-XWS-ESTIMATE-ACTION` | PASS | Resolver authz test passed; `can_edit_estimate` denial stops node lookup and mutation. |
| `ADV-WS-SWITCH-CACHE` | PASS | Workspace-switch cache suite passed and source-contract tests now pass in the full validate run. |
| `ADV-PUBLIC-REDACTION` | PASS | Share snapshot redaction suite passed. |
| `ADV-VIEWER-MUTATION` | PASS | Viewer authz suite passed for hidden/disabled UI and server denial. |
| `ADV-DIRTY-ADD-NESTED` | PASS | Add modal regression proves dirty-close and nested listbox behavior. |
| `ADV-FOLDER-DELETE-FAIL` | PASS | Manager/folder suites prove failure recovery and count-aware delete copy. |
| `ADV-CONCURRENT-RENAME` | PASS | Manager/folder suites prove rename failure recovery without optimistic overwrite. |
| `ADV-BULK-COPY` | PASS | Bulk destructive preview suite proves archive copy uses recoverable wording. |
| `ADV-DELETED-RESULT` | PASS | Overview and route-state suites passed. |
| `ADV-STALE-URL-PARAMS` | PASS | Applied-filter and stale URL suites passed. |
| `ADV-XWS-ESTIMATE-TARGET` | PASS | Insert picker suite proves target metadata, submit-time re-resolve, and stale target blocking. |
| `ADV-TEMPLATE-DEP` | PASS | Insert/template suites prove archived dependencies block insert and discontinued dependencies require confirmation. |
| `ADV-QUICKADD-UNSAFE` | PASS | Quick Add validation suite proves required fields, unsafe formula prefixes, bad URLs/future dates, and network-failure preservation. |
| `ADV-KEYBOARD-MGMT` | PARTIAL PASS | jsdom focus/keyboard paths and dense row keyboard path pass; cross-browser portal/focus proof remains unrun. |
| `ADV-MOBILE-BROWSE` | PASS for Chromium dense proof | Fresh 390x844 Chromium artifact proves dense/mobile geometry; Safari iOS/Chrome Android matrix remains unrun. |
| `ADV-DENSE-500` | PASS for Chromium/provider functional + 500-row timing proof | Fresh 500-row Chromium proof passed with provider seed/cleanup and virtualized dense fallback; dense-toggle/search medians and p95 are recorded in the timing JSON. The separate 5,000-row keystroke tier remains open. |
| `ADV-OUT-OF-ORDER` | N/A current implementation | Components search remains synchronous client-side filtering. |
| `ADV-VISUAL-DENSE-MOBILE` | PARTIAL | Chromium screenshots exist; Safari iOS, Chrome Android, RTL, and full touch-target review remain unrun. |
| `ADV-VISUAL-GLASS` | PARTIAL PASS | Chromium desktop shell arming and one-blur boundary passed; Safari/iOS/Android, RTL, touch-target, contrast, card/template, drawer/modal, and paint-time matrix remains unrun. |
| `ADV-TELEMETRY-EMITS` | PASS for implemented surfaces | Telemetry substrate/sanitizer tests passed; future phase events remain phase-owned. |
| `ADV-COPY-MICROCOPY` | PARTIAL PASS | Known destructive-dialog, trust-copy, and empty-state drift is locked by focused tests; final all-flow manual copy-deck review remains open. |
| `ADV-RELEASE-ARTIFACT` | NO-GO | Full local `bun run validate`, Chromium provider dense proof, Chromium 500-row timing proof, and Chromium desktop glass-shell proof pass, but this matrix still contains partial/unproven full-glass, device-matrix, RTL/touch-target, 5,000-row keystroke, cross-browser portal/focus, and manual-copy rows. |
