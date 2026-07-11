# UNIT-010 Accessibility Evidence

Date: 2026-07-11

## Implemented local contract

- `ActivityHistoryModal` and `RowDetailsModal` now move focus to an explicit
  close control after native-dialog open and return it to the active opener on
  unmount.
- The Activity scope tree has one roving tab stop and supports ArrowUp/ArrowDown
  focus movement, retaining existing ArrowLeft/ArrowRight expand/collapse.
- Project activity ledger headers and row cells have programmatic ARIA roles.
- Shared-link partial-activity state is a discrete status announcement; Refresh
  has a 24px target. Activity-owned text is no smaller than 10px.

## Local verification

Command:

```sh
bunx vitest run tests/vitest/activity-accessibility.test.tsx tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/project-activity-page/client.test.tsx tests/vitest/project-publication-activity.test.tsx && bun run type-check && git diff --check
```

Result: PASS. 4 test files, 53 tests; TypeScript check and diff check passed.

## Browser verification

The declared Chromium command passed against an isolated local dev instance.
The shared server was not stopped or restarted. The disposable instance used a
copied local D1 state, applied current local migrations, and injected the
existing localhost-only dev-auth bypass cookie per browser context:

```sh
PLAYWRIGHT_PORT=3020 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ESTIMATE_PERF_PROJECT_ID=<local-project-id> ESTIMATE_PERF_NODE_ID=<local-estimate-id> bunx playwright test e2e/activity-history-accessibility.spec.ts --project=chromium
```

Result: PASS. Chromium verified the Activity History dialog opens with the close
control focused, returns focus to the Activity opener after close, and remains
within the viewport at 320px, 375px, 768px, and 1280px. The E2E fixture now
injects the bypass credential when explicitly enabled and waits on the audited
Activity opener rather than an obsolete generic sheet marker. The disposable
server and copied state were removed after the run.
