# Verification Log

Date: 2026-06-23

## Commands

- `bunx vitest run tests/vitest/project-publication-header.test.tsx --maxWorkers=1`
  - Result: 1 file passed, 74 tests passed.
- `bun run type-check`
  - Result: passed, `tsc --noEmit`.
- `bunx vitest run tests/vitest/library-surface-variant.test.tsx tests/vitest/library-overview.test.tsx tests/vitest/library-overview-skeleton.test.tsx tests/vitest/library-copy-contract.test.ts tests/vitest/library-source-trust.test.ts tests/vitest/component-library-manager.test.tsx tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/library-components-cache.test.tsx tests/vitest/template-gallery.test.tsx tests/vitest/template-browse-project-sources.test.tsx tests/vitest/library-templates-cache.test.tsx tests/vitest/template-editor.test.tsx tests/vitest/template-editor-actions-authz.test.ts tests/vitest/header-icon-toolbar-ui.test.tsx tests/vitest/library-tabs-layout.test.tsx tests/vitest/tab-strip.test.tsx tests/vitest/tree-panel-header-border.test.tsx tests/vitest/library-route-state-authz.test.tsx tests/vitest/library-viewer-authz.test.tsx tests/vitest/component-library-actions-revalidation.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/library-workspace-switch-cache.test.ts --maxWorkers=1`
  - Result: 23 files passed, 168 tests passed.
- `bunx vitest run tests/vitest/header-icon-toolbar-ui.test.tsx tests/vitest/library-tabs-layout.test.tsx tests/vitest/component-library-manager-ui.test.tsx --maxWorkers=1`
  - Result: 3 files passed, 43 tests passed.
- `ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=local-library-ui-proof-0123456789abcdef0123456789abcdef ARCHESTIMATOR_E2E_LIBRARY_RELEASE_PROOF=1 ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 ARCHESTIMATOR_E2E_LIBRARY_DENSE_ROWS=500 NEXT_PUBLIC_LIBRARY_DENSE_MODE=1 NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED=1 bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium`
  - Result: 8 passed, 1 skipped dense perf gate.
- `ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=local-library-ui-proof-0123456789abcdef0123456789abcdef ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 ARCHESTIMATOR_E2E_LIBRARY_DENSE_ROWS=5000 NEXT_PUBLIC_LIBRARY_DENSE_MODE=1 NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED=1 bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium --grep "dense component table browser"`
  - Result: 1 passed, `rowCount: 5000`.
- `git diff --check -- <Library UI, proof, unblocker, archive/current-state paths>`
  - Result: passed.
- Library-touched forbidden-boundary scan for provider/schema/query/action/upload/API paths.
  - Result: no matches.

## Key Artifacts

- Full route proof RTL/touch: `phase-final/browser-matrix/library-release-rtl-touch-targets-chromium-1280x720-20260623T044435Z.json`, verdict `pass`, `assertedTouchTargets: true`, `undersizedTouchTargets: []`.
- Dense 5k desktop: `phase-5/dense-mode/library-phase5-dense-table-chromium-1280x900-20260623T044720Z.json`, verdict `pass`, `rowCount: 5000`, `virtualActive: true`, `mountedCount: 25`.
- Dense 5k mobile: `phase-5/dense-mode/library-phase5-dense-mobile-chromium-390x844-20260623T044721Z.json`, verdict `pass`, `rowCount: 5000`, document width contained to viewport.
