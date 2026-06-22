# ADV Release Status Export - 20260622T064146Z

Verdict: NO-GO.

Reason: `bun run validate` is still red at lint after `tsc --noEmit` passes, and
several visual/browser/provider/i18n rows remain partial or unproven. This file
is a status export, not a release approval.

Validation evidence included in this export:

- `bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/library-telemetry-emit.test.ts tests/vitest/library-route-state-authz.test.tsx tests/vitest/estimate-insert-target-authz.test.tsx tests/vitest/library-viewer-authz.test.tsx tests/vitest/library-workspace-switch-cache.test.ts tests/vitest/share-snapshot-redaction.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/library-quick-add-validation.test.ts tests/vitest/component-library-folder-actions.test.ts --maxWorkers=1` passed 10 files / 41 tests.
- `bunx vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/component-library-folder-actions.test.ts --maxWorkers=1` passed 2 files / 26 tests.
- `bunx vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx tests/vitest/library-applied-filters.test.tsx tests/vitest/library-template-insert-picker.test.tsx tests/vitest/template-gallery.test.tsx tests/vitest/library-templates-cache.test.tsx tests/vitest/library-source-trust.test.ts --maxWorkers=1` passed 6 files / 32 tests.
- `bunx vitest run tests/vitest/library-overview.test.tsx tests/vitest/library-tab-a11y.test.tsx tests/vitest/library-tabs-layout.test.tsx tests/vitest/library-overview-skeleton.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1` passed 5 files / 33 tests.
- `bun run type-check` passed.
- Touched-file ESLint passed for the Library telemetry/authz files, shared
  combobox/validator, perf-baseline script, and tests.
- `bun run validate` failed at `bun run lint`; see
  `validate-baseline-20260622T064146Z.md`.

Status matrix:

| ADV ID | Status | Evidence / blocker |
| --- | --- | --- |
| `ADV-XWS-COMPONENT-PARAM` | PASS | Focused route-state authz test plus rendered invalid-ID case passed; foreign/invalid component param is stripped before detail disclosure. |
| `ADV-XWS-ESTIMATE-ACTION` | PASS | Resolver authz test passed; `can_edit_estimate` denial stops node lookup and mutation. |
| `ADV-WS-SWITCH-CACHE` | PASS for focused suite | Workspace-switch cache suite passed; release still requires the doc-18 unscoped-key prerequisite to stay enforced. |
| `ADV-PUBLIC-REDACTION` | PASS | Share snapshot redaction suite passed; telemetry test also asserts public share surfaces do not emit Library telemetry. |
| `ADV-VIEWER-MUTATION` | PASS | Viewer authz suite passed for hidden/disabled UI and server denial. |
| `ADV-DIRTY-ADD-NESTED` | PASS | Add modal regression proves nested Supplier combobox Escape closes the listbox before the modal, dirty close opens the in-app discard dialog, and native `window.confirm` is not called. |
| `ADV-FOLDER-DELETE-FAIL` | PASS | Manager UI + folder suites prove delete server failure keeps the error visible and preserves the folder; folder suite also proves viewer denial and transactional delete RPC use. |
| `ADV-CONCURRENT-RENAME` | PASS | Manager UI + folder suites prove rename server failure/conflict keeps the error visible, does not apply an optimistic overwrite, and scoped server-action boundaries remain enforced. |
| `ADV-BULK-COPY` | PASS | Bulk destructive preview suite proves archive copy uses recoverable wording and blocked archive copy stays archive-specific. |
| `ADV-DELETED-RESULT` | PASS | Overview tests prove recent component links, component result click/Enter routing to `?component=<id>`, template result routing, and no-results recovery; Components route-state test proves stale/foreign IDs are stripped without inspector detail. |
| `ADV-STALE-URL-PARAMS` | PASS | Applied-filter suite proves chips, clear-all, count strip, overview deep-link hydration, and stale/active facet reset behavior. |
| `ADV-XWS-ESTIMATE-TARGET` | PASS | Insert picker suite proves target metadata before submit, submit-time re-resolve, and stale target blocking; server-side authz proof passes via `ADV-XWS-ESTIMATE-ACTION`. |
| `ADV-TEMPLATE-DEP` | PASS | Insert picker suite proves archived dependencies block insert and discontinued dependencies require explicit confirmation. |
| `ADV-QUICKADD-UNSAFE` | PASS | Required-field a11y, invalid `pricing_source` URL, future pricing date, spreadsheet formula-prefix rejection, and network-failure input preservation are covered. |
| `ADV-KEYBOARD-MGMT` | PARTIAL PASS | Dense row keyboard path, Add modal nested Escape path, and folder failure-recovery UI are proven in jsdom; cross-browser portal/focus proof remains unrun. |
| `ADV-MOBILE-BROWSE` | PASS for Chromium dense proof | Existing 390x844 Chromium artifact proves dense/mobile geometry; Safari/iOS/Android matrix remains unrun. |
| `ADV-DENSE-500` | PASS for functional Chromium proof, perf PARTIAL | Existing 500-row Chromium proof passed; local synthetic perf baseline exists, but provider/browser React Profiler budgets remain provisional. |
| `ADV-OUT-OF-ORDER` | N/A current implementation | Components search remains synchronous client-side filtering; reopen only when server/FTS search ships. |
| `ADV-VISUAL-DENSE-MOBILE` | PARTIAL | Chromium screenshots exist; Safari iOS, Chrome Android, RTL, and full touch-target review remain unrun. |
| `ADV-VISUAL-GLASS` | UNPROVEN in this export | Glass visual-regression matrix remains unrun. |
| `ADV-TELEMETRY-EMITS` | PASS for implemented 0A surfaces | Telemetry substrate/sanitizer test passed for route-state and Quick Add payload protection; future phase events remain phase-owned. |
| `ADV-COPY-MICROCOPY` | UNPROVEN in this export | Full copy-deck audit was not rerun here. |
| `ADV-RELEASE-ARTIFACT` | NO-GO | Full validate is red and this matrix contains partial/unproven rows. |
