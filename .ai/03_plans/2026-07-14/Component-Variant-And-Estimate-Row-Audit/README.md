# Component Variants, Estimate Rows, And Issued Review

**Package posture:** implementation reconciliation
**Current implementation:** `IMPLEMENTED_IN_WORKTREE`
**Release status:** `NOT_EVALUATED`
**Browser/visual proof:** `NOT_RUN`

## Outcome

The current worktree implements the single pre-release component path needed to resolve the reported Project-component variant defect and its downstream data-integrity risks.

The exact reported reproduction was:

1. edit a Project component;
2. add a variant;
3. save;
4. reopen Edit Component; and
5. observe that the new variant is missing.

The root UI defect was concrete: the first **Add variant** action in a single-option draft only enabled variant mode and returned. It did not append a second variant. The current modal always appends the new stable-ID option, submits the complete ordered component graph, waits for persistence, reconciles authoritative row data, and can reopen with the saved option present.

This is not a compatibility or release-version project. Archestimator is alpha-stage and pre-release. The implementation uses direct replacement and fix-forward cleanup: one full modal, one complete graph payload per save, owner-specific atomic D1 actions, and no product `V1`/`V2` path.

## What Is Implemented

### One editor and one graph save

- `src/components/workshop/component-library-manager/AddComponentModal.tsx` is the full Add/Edit authority for Library and Project components.
- `src/components/workshop/library/EditComponentDrawer.tsx` is deleted; the reduced editor is no longer an active path.
- Each save submits one complete component plus ordered variant graph.
- Library ownership commits through `updateCostLibraryComponentWithPriceOptions` in one guarded D1 batch.
- Project ownership commits through `updateEstimateRowItem` and the D1 `update_estimate_row_item_with_history` action in one guarded component-instance batch.
- Create and Library update reread complete authoritative detail before returning success; Project update refetches/reconciles the authoritative estimate tree before the modal closes.

### Library and Project behavior

- Library component identity remains `cost_library_items.id`.
- Library variant identity remains `cost_library_item_price_options.id`.
- Project component identity remains the project-scoped `sourceComponentId` stored in estimate-row snapshot/metadata; it is not the estimate row ID and does not require a new master table.
- Detached Project components with historical `sourceLibraryItemId` values stay on the Project path and do not mutate the Library source.
- Component-level fields fan out within the owning Library/workspace or Project scope.
- Variant-derived fields update only rows selecting that stable variant ID.
- Existing rows keep their selected option when options are added, reordered, or a different option becomes default.
- Quantity, contingency, adjustment, miscellaneous cost, designation, discipline, row identity, and row placement remain row-owned.
- A used variant cannot be deleted without an explicit active replacement; only rows selecting the deleted option move to that replacement.

### Estimate-row transfer

- Insert resolves the default option once, then persists the selected `priceOptionId` and the complete bounded option catalogue.
- Variant selection updates the same row through the normal row mutation path; it is not a component replacement.
- Replace, move, make-project-specific/detach, promotion, and deletion preserve their explicit row-identity and row-local-value policies.
- Making a Library row project-specific clears its Library link, creates a fresh Project component identity, copies the option graph, and omits Library-owned attachments instead of stealing ownership.
- Promotion writes the complete ordered option graph and preserves the selected option rather than collapsing to the default.
- Deleting a Library master detaches linked estimate/template rows while leaving their current estimate values intact.

### D1, R2, and attachments

- Active component metadata uses D1 tables for components, price options, cost entries, versions/history, uploads, and estimate rows.
- `migrations/0076_component_attachment_ownership.sql` replaces the Library-only attachment relation with `component_variant_attachments`, an exclusive Library-or-Project owner tuple bound to one immutable `upload_assets.id`.
- Project attachment upload, delete, and cleanup use the stable Project component ID, not an initiating estimate row ID.
- `migrations/0079_project_component_attachment_retention.sql` adds restore-window holds for the last live Project-component instance.
- R2 objects remain behind the bound `ARCH_UPLOADS_R2` service and private broker routes; raw private broker `?path=` values are removed from issued/public projections.
- Migration files and code are present locally. Hosted D1 migration state and hosted R2 behavior are not claimed.

### Issued/public review

- Issued rows now carry opaque issue-local component/variant anchors plus component version, selected variant label, row revision, and link state.
- Raw Library/Project IDs, private asset paths, attachment metadata, and internal source snapshots are not emitted to recipients.
- Client Portal estimate rows expose separate **Component** and **Row** discussion targets.
- Target resolution validates the opaque ID against immutable issued content and derives labels server-side.
- Owner replies write client-safe activity, deduplicate active subscribers and mentions, enqueue recipient outbox notifications, and use owner-reply wording in queued email.

## Evidence Boundary

Current source evidence includes:

- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/lib/component-library/actions.ts`
- `src/lib/estimates/d1-action-client.ts`
- `src/lib/estimates/source-snapshot-price-options.ts`
- `src/lib/estimates/express-promotion-actions.ts`
- `src/app/api/component-library/attachments/route.ts`
- `src/app/api/component-library/attachments/direct-upload/route.ts`
- `src/lib/publication/snapshot.ts`
- `src/lib/client-portal/estimate-browser.ts`
- `src/lib/client-portal/issued-target-resolver.ts`
- `src/lib/client-portal/publisher-discussion-service.ts`

Focused automated evidence already produced during implementation includes the modal suite, the exact Project save/reopen scenario, Project variant fan-out/replacement cases, attachment ownership cases, and focused publication/Client Portal cases. `bun run type-check` and targeted lint checks were also reported passing for the changed implementation slices. The detailed receipts are in `TRACEABILITY.md`.

No Playwright/browser automation, screenshots, Storybook, or visual QA were run. No hosted deployment, hosted migration, or production-data proof is claimed. Release status therefore remains `NOT_EVALUATED`.

## Pack Map

1. `01-CURRENT-ARCHITECTURE-AND-EVIDENCE.md` — implemented private-to-issued data path and source evidence.
2. `02-MVP-REQUIREMENTS-AND-INVARIANTS.md` — accepted product and domain requirements.
3. `03-FINDINGS-RISK-SECURITY-PERFORMANCE.md` — original audit findings and risk register.
4. `04-INTEROPERABILITY-AND-PUBLICATION-CONTRACT.md` — target integration contracts.
5. `05-ADD-EDIT-COMPONENT-MODAL-PRD-AND-AUDIT.md` — exact modal defect, implemented Library/Project behavior, CRUD, transfer, and fan-out.
6. `06-CLOUDFLARE-COMPONENT-DATA-AND-STORAGE-SCHEMA.md` — current D1/R2/Queue schema and ownership boundaries.
7. `07-PRE-RELEASE-FEATURE-PATH-CLEANUP-AND-SIMPLIFICATION.md` — one-path cleanup and no product-version ceremony.
8. `08-IMPLEMENTATION-OUTCOME-AND-BEFORE-AFTER.md` — user-visible and architectural before/after.
9. `IMPLEMENTATION_PLAN.md` — implemented unit map, evidence, and remaining release boundary.
10. `TRACEABILITY.md` — requirement-to-source/test/evidence receipts.
11. `LOOP_LEDGER.md` — planning and implementation reconciliation history.

## Remaining Gaps

- Hosted D1 migrations `0076` through `0079` are not verified as applied.
- Real-browser interaction and visual behavior are not evaluated.
- Hosted R2 upload/download/cleanup and Queue/Email delivery are not evaluated by this documentation pass.
- The full release decision remains outside this local implementation reconciliation.

## Stop Condition

This implementation reconciliation is complete when the pack and manifest describe the implemented single path without claiming hosted or browser proof, every core component/variant transition maps to source and focused evidence, and remaining release gaps are explicit rather than hidden behind pre-implementation planning language.
