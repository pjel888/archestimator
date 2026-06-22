# Library Copy Contract Proof - 20260622T082151Z

Status: partial pass for `ADV-COPY-MICROCOPY`.

Command:

```bash
bunx vitest run \
  tests/vitest/library-copy-contract.test.ts \
  tests/vitest/library-source-trust.test.ts \
  tests/vitest/library-overview.test.tsx \
  tests/vitest/template-gallery.test.tsx \
  tests/vitest/component-library-manager.test.tsx \
  tests/vitest/workshop-library-consolidation-ui.test.tsx \
  --maxWorkers=1
```

Result: 6 files / 54 tests passed.

Additional source guard:

```bash
rg -n "Build your component library|Add your first component|Create a template from scratch|Pricing date is not set|getByText\\(\"Quoted\"|getAllByText\\(\"Quoted\"|toEqual\\(\\[\"Current\", \"Quoted\"\\]" src tests/vitest
```

Result: no stale source/test hits outside the negative assertions in
`tests/vitest/library-copy-contract.test.ts`.

Deck alignment proven:

- Component empty state: `Your library is empty.` / `Add a component to reuse it
  across estimates.`
- Template empty state: `No templates yet.` / `Save a template to reuse line
  items.`
- Missing price-date tooltip: `No pricing date recorded. Add one to track
  freshness.`
- Confidence chips: `Verified source`, `Likely source`, `Low confidence`, raw
  free-text label with `Recorded confidence note.`, and missing-confidence copy.
- Archived lifecycle tone is neutral in the source-trust chip model.

Remaining release blocker:

- This is focused source/test proof for the audited drift. The final all-flow
  manual copy-deck review remains open before release approval.
