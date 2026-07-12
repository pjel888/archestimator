# Loop Ledger

## 2026-06-28

Goal: Align Add Component UI and create persistence with the OpenDesign field contract.

Evidence gathered:

- OpenDesign HTML fields inventoried from `add-component-modal.html`.
- Current modal implementation inspected in `AddComponentModal.tsx`.
- Current create action and Supabase RPC boundary inspected in `src/lib/component-library/actions.ts`.
- Supabase schema history inspected for `cost_library_items`, price options, variant cost entries, attachments, and lifecycle/versioning tables.

Decision:

- Remove non-OpenDesign fields from Add Component UI and payload first.
- Do not drop shared Supabase columns/tables in the same pass unless local references prove they are Add Component-only. Current evidence shows pricing confidence/source, misc cost, cost entries, attachment review, and lifecycle structures are shared by browse, inspector, trust, AI package, template, and estimate surfaces.

Next:

- Patch Add Component render/state to match the OpenDesign field contract.
- Patch create action types/normalization so removed fields are not accepted or sent by this flow.
- Update targeted tests.

Result:

- `AddComponentModal.tsx` now renders only the OpenDesign fields: media, name/description, category/supplier/brand, unit cost/unit, Activity fields, and a variant drawer for variant identity, cost/unit, equivalency, thumbnails, and attachments.
- Removed Add Component UI for the separate nesting tree, pricing date/source/confidence, cost manager, misc cost, source URL, notes, cost-entry history, and dimensions.
- `createCostLibraryComponent` accepts `fieldContract: "opendesign-add-component"` and strips this flow's component/price-option RPC payloads so removed fields are absent from the Supabase JSON sent by Add Component.
- The OpenDesign Add Component contract now also omits the hidden `libraryFolderId` nesting field from the client payload and Supabase RPC JSON; selected-folder context is used only to infer the initial Category field.
- Broad Supabase schema drops remain intentionally out of scope because the shared columns/tables are still used by library, estimate, trust, AI, and legacy surfaces.

Verification:

- `bun run test:dom -- tests/vitest/library-viewer-authz.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/component-library-manager-ui.test.tsx` (3 files / 32 tests)
- `bun run test:dom -- tests/vitest/library-viewer-authz.test.tsx` (1 file / 3 tests after the final RPC-strip helper cleanup)
- `bun run lint -- src/components/workshop/component-library-manager/AddComponentModal.tsx src/lib/component-library/actions.ts tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/component-library-manager-ui.test.tsx tests/vitest/library-viewer-authz.test.tsx` (0 errors; 3 pre-existing telemetry warnings in `actions.ts`)
- `git diff --check`

Validation gap:

- `bun run type-check` is red on pre-existing unrelated Supabase type incompatibilities in `src/lib/legal/terms-acceptance.ts` and `src/proxy.ts`.
