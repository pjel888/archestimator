# ADV Release Status Export - 20260622T070955Z

Verdict: NO-GO.

Reason: full release validation remains red at lint, and browser/provider/visual
proof rows remain partial or unproven. This file records the current status
after the Library lint/copy slice; it is not a release approval.

Validation evidence included in this export:

- `bunx eslint src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx src/components/workshop/library/component-facet-filter.tsx` passed.
- `bunx vitest run tests/vitest/library-template-insert-picker.test.tsx tests/vitest/template-gallery.test.tsx tests/vitest/library-templates-cache.test.tsx tests/vitest/template-browse-project-sources.test.tsx --maxWorkers=1` passed 4 files / 22 tests.
- `bunx eslint src/components/workshop/component-library-manager/ComponentLibraryManager.tsx src/components/workshop/component-library-manager/AddComponentModal.tsx src/components/workshop/BulkDestructivePreviewModal.tsx src/components/workshop/library/source-trust-model.ts tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/bulk-destructive-preview-modal.test.tsx tests/vitest/library-source-trust.test.ts tests/vitest/library-copy-contract.test.ts` passed.
- `bunx vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/bulk-destructive-preview-modal.test.tsx tests/vitest/library-source-trust.test.ts tests/vitest/library-copy-contract.test.ts tests/vitest/library-quick-add-validation.test.ts tests/vitest/library-template-insert-picker.test.tsx --maxWorkers=1` passed 8 files / 58 tests.
- `bun run type-check` passed.
- `git diff --check` passed.
- Source-only stale-copy scan returned zero hits for the audited drift strings:
  `Discard component draft?`, `Unsaved component details`, `Archiving is reversible`,
  `Row items assigned`, `Local overrides`, `Detached rows`, `unlinked: "Unlinked"`,
  `title: "Create folder"`, `confirmLabel: "Rename folder"`, and
  `Confidence is not set`.
- `bun run lint --quiet` failed with 28 errors outside the Library lint/copy
  slice: `.gitnexus/run.cjs`, `scripts/prove-project-dashboard-route-browser.mjs`,
  share-page React Compiler memoization/effect issues, sidebar glass hook refs/effects,
  project address/dashboard/map/page effect issues, and three project tests/scripts.

Status matrix:

| ADV ID | Status | Evidence / blocker |
| --- | --- | --- |
| `ADV-XWS-COMPONENT-PARAM` | PASS | Focused route-state authz test passed in prior export; foreign/invalid component param is stripped before detail disclosure. |
| `ADV-XWS-ESTIMATE-ACTION` | PASS | Resolver authz test passed in prior export; `can_edit_estimate` denial stops node lookup and mutation. |
| `ADV-WS-SWITCH-CACHE` | PASS for focused suite | Workspace-switch cache suite passed; release still requires the doc-18 unscoped-key prerequisite to stay enforced. |
| `ADV-PUBLIC-REDACTION` | PASS | Share snapshot redaction suite passed in prior export. |
| `ADV-VIEWER-MUTATION` | PASS | Viewer authz suite passed for hidden/disabled UI and server denial. |
| `ADV-DIRTY-ADD-NESTED` | PASS | Add modal regression now proves the canonical `Discard this draft?` dialog copy and dirty-close behavior. |
| `ADV-FOLDER-DELETE-FAIL` | PASS | Manager/folder suites prove failure recovery; folder delete copy is now count-aware with the canonical `Keep folder` cancel action. |
| `ADV-CONCURRENT-RENAME` | PASS | Manager/folder suites prove rename failure recovery; rename primary action now uses `Save name`. |
| `ADV-BULK-COPY` | PASS | Bulk destructive preview suite proves archive copy uses recoverable wording and question-form archive titles. |
| `ADV-DELETED-RESULT` | PASS | Overview and route-state suites passed in prior export. |
| `ADV-STALE-URL-PARAMS` | PASS | Applied-filter suite passed in prior export. |
| `ADV-XWS-ESTIMATE-TARGET` | PASS | Insert picker suite passed after lint fix and still proves target metadata, submit-time re-resolve, and stale target blocking. |
| `ADV-TEMPLATE-DEP` | PASS | Insert/template suites still prove archived dependencies block insert and discontinued dependencies require confirmation. |
| `ADV-QUICKADD-UNSAFE` | PASS | Quick Add validation suite still proves required fields, unsafe formula prefixes, bad URLs/future dates, and network-failure preservation. |
| `ADV-KEYBOARD-MGMT` | PARTIAL PASS | Dense row keyboard path, Add modal nested Escape path, and folder failure recovery are proven in jsdom; cross-browser portal/focus proof remains unrun. |
| `ADV-MOBILE-BROWSE` | PASS for Chromium dense proof | Existing 390x844 Chromium artifact proves dense/mobile geometry; Safari/iOS/Android matrix remains unrun. |
| `ADV-DENSE-500` | PASS for functional Chromium proof, perf PARTIAL | Existing 500-row Chromium proof passed; browser/provider React Profiler budgets remain provisional. |
| `ADV-OUT-OF-ORDER` | N/A current implementation | Components search remains synchronous client-side filtering. |
| `ADV-VISUAL-DENSE-MOBILE` | PARTIAL | Chromium screenshots exist; Safari iOS, Chrome Android, RTL, and full touch-target review remain unrun. |
| `ADV-VISUAL-GLASS` | UNPROVEN | Glass visual-regression matrix remains unrun. |
| `ADV-TELEMETRY-EMITS` | PASS for implemented 0A surfaces | Telemetry substrate/sanitizer test passed for route-state and Quick Add payload protection; future phase events remain phase-owned. |
| `ADV-COPY-MICROCOPY` | PARTIAL PASS | Known 0B destructive-dialog and trust-copy drift is closed by focused jsdom tests plus `library-copy-contract.test.ts`; a final all-flow manual copy-deck review remains open before release approval. |
| `ADV-RELEASE-ARTIFACT` | NO-GO | Full lint is red and this matrix contains partial/unproven visual/browser/provider rows. |
