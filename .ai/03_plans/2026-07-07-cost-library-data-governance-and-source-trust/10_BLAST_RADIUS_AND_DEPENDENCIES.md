# 10 — Blast Radius and Dependencies

## Direct and transitive impact

| Area | Impact | Classification | Evidence |
|---|---|---|---|
| `migrations/0037_*` (new) | new governance columns + indexes + state-history extension | Required change | `07` |
| `src/lib/component-library/actions.ts` | new review/import/export actions; existing create/update set `origin` default | Required change | `03`,`07` |
| `src/lib/component-library/quick-add-validation.ts` | extend for region/version/origin fields | Probable change | `04` REQ-1 |
| `src/lib/authz/d1-access.ts` | new `isCostLibraryGovernanceAdminInD1` helper | Required change | `04` REQ-9 |
| `src/lib/repositories/component-library-repository.ts` | add review-state/origin/region to read projection; `SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS` | Required change | `03`,`06` |
| `src/lib/repositories/estimate-repository.ts` (or estimate read path) | compute `source-changed` on read | Required change | `06` DEC-4 |
| `src/lib/estimates/types.ts` | `EstimateRowItem` add `reviewStatus`/`origin` (linked source) | Required change | `04` REQ-15 |
| `src/components/workshop/library/source-trust-model.ts` | chips + gate + health read review state | Required change | `04` REQ-7,8 |
| `src/components/workshop/library/source-trust-chips.tsx` | new chip variants | Probable change | `05` |
| `src/components/workshop/library/component-facet-filter*.ts(x)` | new "Review state"/region facets | Required change | `04` REQ-11 |
| `src/components/workshop/library/overview/*` | "Needs review"/"Overdue" widgets | Probable change | `05` |
| `src/components/workshop/library/EditComponentDrawer.tsx` | review fields + admin-only origin | Required change | `05` |
| `src/components/workshop/library/ComponentInspectorDock.tsx` | review-action toolbar | Required change | `05` |
| `src/components/workshop/component-library/PreviewPanel.tsx` | surface review chip | Probable change | `05` |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx` | set `origin` on create; region/version fields | Probable change | `04` |
| `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` | gate already wired; ensure `rejected`/`superseded` block | Verification only | `03` |
| `src/lib/component-library/import-export.ts` (new) | CSV/JSON parse + serialize | Required change (new) | `04` REQ-13,14 |
| `src/lib/component-library/query-keys.ts` | new query keys for import preview, review state | Required change | `06` |
| `src/lib/component-library/library-telemetry.ts` | new event types (review/import) | Probable change | `09` |
| Tests (`tests/vitest/*library*`, `*source-trust*`, new review/import/stale) | new + extended | Required change | `12` |
| `.ai/06_specs/current-project-estimates-component-library-spec.md` | document review/import/stale | Required change | DOC |
| `AGENTS.md` migration count (29 → 37) | drift already known; update when convenient | Possible change | `02` |
| Estimate proposal `.xlsx` export | include review/freshness metadata | Possible change | `04` REQ-12 |
| Cloudflare bindings | none | Explicitly unaffected | `06` |
| Better Auth | none (reuses identity) | Explicitly unaffected | `06` |
| Durable Objects / Queues / Email | none (unless P4 async materialization chosen) | Explicitly unaffected (P4 may add Cron) | `06` |
| Supabase runtime | none (reference only) | Explicitly unaffected | `06` |

## Affected tests (regression risk)

- `library-source-trust.test.ts` — must extend (new chip/gate behavior). Risk: existing assertions break → update intentionally.
- `component-library-cost-governance-actions.test.ts` — currently asserts D1 actions do NOT use governance RPCs. After this plan, D1 actions implement equivalent behavior natively (not via Supabase RPC). **Test must be updated** to assert the new D1-native review actions exist and behave correctly, while still asserting no `supabase.rpc` calls. This is intentional, not a regression.
- `estimate-library-item-insert-contract.test.ts`, `estimate-sheet-library-insert.test.tsx` — extend for `rejected`/`superseded` block behavior.
- `library-add-component-modal-a11y.test.tsx` — extend for new fields.
- All `component-library-*-schema.test.ts` — extend for migration `0037` columns.

## Backward compatibility

- Additive migration with defaults → old reads/writes unaffected.
- Default Mode A backfill preserves "all current entries usable" → no behavior break for existing estimates.
- Feature flag (OPS `13`) can hide review UI/actions while schema lands.

## Concurrency / multi-agent safety

- Migration `0037` lands once; review/import actions land behind a flag. Implementation tasks own disjoint files where possible (see `11` parallelization). The shared file `actions.ts` is the integration point — serialized.

## Dependencies (external)

- None blocking. `OPEN-1..6` are owner decisions affecting *what data* and *which role*, not whether the architecture works.

## Affected documentation

- `current-project-estimates-component-library-spec.md` (review/import/stale sections).
- `AGENTS.md` migration-count line (already known drift).
- User-facing help copy (review states, import, stale).
