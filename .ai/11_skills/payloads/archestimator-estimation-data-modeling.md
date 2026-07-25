# Skill: Archestimator Estimation Data Modeling

## Use When

- changing estimate, node, row, library, template, publication, or revision data
- reviewing D1 schema, constraints, indexes, queries, or mutation integrity
- changing quantity, rate, adjustment, contingency, misc-cost, or total behavior

## Authority

Use current source, `wrangler.jsonc`, active `migrations/`, and repository/D1
intent code as truth. `migrations/` is the only active migration directory.
`.ai/06_specs/initial-data-model.md` and `.ai/06_specs/mvp-ux-flow.md` contain
historical Supabase/prototype descriptions and are context only.

Start with the narrow current contract:

- domain shapes: `src/lib/domain/estimate-tree.ts`
- tree normalization: `src/lib/estimates/tree-hierarchy.ts`
- row math: `src/lib/estimates/estimate-row-total.ts`
- D1 reads/intents: `src/lib/estimates/estimate-tree-read-repository.ts` and
  `src/lib/estimates/d1-intents/`
- server boundary: `src/lib/estimates/actions.ts`

## Integrity Rules

- Preserve workspace/project/estimate ownership and stable entity IDs.
- Keep schema constraints, repository validation, mutation receipts/history, and
  client optimism aligned for the same change.
- Use the shared row-total contract; do not duplicate money or percentage
  formulas in a payload or component.
- Persist monetary and percentage values through the current validated D1 path;
  do not revive Supabase/Postgres assumptions.
- Stored estimate node kinds are currently `group | area`, but current source
  treats the kind split as vestigial for user-facing hierarchy. Verify the
  current normalization and reorder rules before asserting containment behavior.
- Preserve library/template source snapshots, link state, pricing source/date,
  and project-specific overrides where the current model requires them.
- AI-derived or externally sourced cost data must remain editable and must not be
  presented as authoritative without current provenance.

For broad, high-risk, or unfamiliar shared-symbol work, use available Code
Review Graph or GitNexus impact analysis when configured. For narrow reversible
changes, targeted source, `rg`, diff, and LSP inspection are sufficient.
Automated tests and other local evidence run when selected by the automatic
`Q0_CONTRACT_ONLY` through `Q3_RELEASE_GATE` profile.
