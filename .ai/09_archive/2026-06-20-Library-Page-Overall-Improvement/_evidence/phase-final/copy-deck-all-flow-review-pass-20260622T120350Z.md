# Library Copy Deck All-Flow Review - 20260622T120350Z

Status: PASS for `ADV-COPY-MICROCOPY`.

Scope reviewed:

- Folder create / rename / delete dialog copy.
- Add Component dirty-discard copy.
- Bulk archive recoverability copy and dynamic archive status copy.
- Source trust chips: freshness, confidence, source presence, lifecycle, and link-state labels.
- Overview, cross-library search, Components browse, Templates browse, and insert-target empty/error/disclosure copy.
- Quick Add validation strings.

Implementation change supporting the review:

- `tests/vitest/library-copy-contract.test.ts` now reads the Library copy deck
  plus the relevant implementation files and asserts the all-flow strings that
  must remain aligned. It also retains negative assertions for stale destructive
  dialog, trust, and empty-state copy.
- `22-COPY-DECK-AND-MICROCOPY.md` now registers the implemented source-presence
  chip copy: `No source` / `Pricing source is not set`.

Primary command:

```bash
bunx vitest run \
  tests/vitest/library-copy-contract.test.ts \
  tests/vitest/library-source-trust.test.ts \
  tests/vitest/library-overview.test.tsx \
  tests/vitest/template-gallery.test.tsx \
  tests/vitest/component-library-manager.test.tsx \
  tests/vitest/workshop-library-consolidation-ui.test.tsx \
  tests/vitest/library-template-insert-picker.test.tsx \
  tests/vitest/library-quick-add-validation.test.ts \
  tests/vitest/bulk-destructive-preview-modal.test.tsx \
  tests/vitest/component-library-manager-ui.test.tsx \
  tests/vitest/component-library-folder-actions.test.ts \
  tests/vitest/library-add-component-modal-a11y.test.tsx \
  --maxWorkers=1
```

Result: 12 files / 99 tests passed.

Focused copy-contract command:

```bash
bunx vitest run tests/vitest/library-copy-contract.test.ts --maxWorkers=1
```

Result: 1 file / 2 tests passed.

Static checks:

```bash
bunx eslint tests/vitest/library-copy-contract.test.ts
git diff --check -- \
  .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement \
  .ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/FILE_LOCKS.md \
  tests/vitest/library-copy-contract.test.ts
rg -n "Build your component library|Add your first component, or import from a price list|Create a template from scratch|Pricing date is not set|Confidence is not set|Discard component draft\\?|Unsaved component details, uploaded images, and attachments|Archiving is reversible\\. Archived components can be restored later|Row items assigned to it will stay in the library without a folder|Unlinked|Local overrides|Detached rows" src tests/vitest --glob '!tests/vitest/library-copy-contract.test.ts'
```

Results:

- ESLint passed with no output.
- Scoped `git diff --check` passed with no output.
- Stale-copy `rg` returned no matches outside the negative contract assertions.

Proof boundary:

- This closes the all-flow Library copy-deck review for implemented Library
  flows. It does not claim human visual-design approval.
- Aggregate `bun run validate` remains red on unrelated landing-page TypeScript
  work recorded at `validate-fail-20260622T110951Z.md`; that is not a Library
  copy blocker.
