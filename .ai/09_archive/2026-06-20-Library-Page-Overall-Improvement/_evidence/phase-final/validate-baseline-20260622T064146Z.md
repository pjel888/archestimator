# Validate Baseline - 20260622T064146Z

Command:

```sh
bun run validate
```

Result: FAIL, exit code 1.

Pipeline status:

- `bun run type-check` passed (`tsc --noEmit`).
- `bun run lint` failed before `lint:design-system`, `lint:design`, `test`, and
  `test:dom` could run.
- Focused Library checks for this pass were run separately and passed; see doc
  24 and `adv-release-status-20260622T064146Z.md` for exact commands.

Failure shape:

- 79 lint problems total: 34 errors and 45 warnings.
- No remaining lint error was reported in these touched Library/shared files:
  - `src/lib/component-library/library-telemetry.ts`
  - `src/components/workshop/LibraryPageClient.tsx`
  - `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
  - `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  - `src/components/ui/creatable-combobox.tsx`
  - `src/lib/component-library/actions.ts`
  - `src/lib/component-library/quick-add-validation.ts`
  - `scripts/measure-library-performance-baseline.ts`
  - `tests/vitest/library-route-state-authz.test.tsx`
  - `tests/vitest/estimate-insert-target-authz.test.tsx`
  - `tests/vitest/library-telemetry-emit.test.ts`
  - `tests/vitest/workshop-library-consolidation-ui.test.tsx`
  - `tests/vitest/library-add-component-modal-a11y.test.tsx`
  - `tests/vitest/library-quick-add-validation.test.ts`
  - `tests/vitest/component-library-folder-actions.test.ts`

Representative failing paths:

- `.gitnexus/run.cjs`
- `scripts/prove-project-dashboard-route-browser.mjs`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharePageTabs.tsx`
- `src/components/workshop/ProjectAddressAutocomplete.tsx`
- `src/components/workshop/ProjectDashboardClient.tsx`
- `src/components/workshop/ProjectLocationMap.tsx`
- `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/projects-page-client.tsx`
- `tests/vitest/project-estimate-list-summaries-scoping.test.ts`
- `tests/vitest/project-estimate-sheets-repository.test.ts`
- `tests/vitest/project-publication-actions.test.ts`

Library-plan interpretation:

- This artifact is a red full-gate baseline, not a release pass.
- Final release remains blocked until the full validate gate is green or the
  plan explicitly accepts each unrelated baseline red with owner approval.
- This run confirms that the current Library telemetry/authz/Quick Add fixes
  are not the source of the full-gate lint failure after focused lint,
  type-check, and Vitest checks passed.
