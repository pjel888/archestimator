# Persona/use-case second-pass: supplier/vendor/brand/cost-source lane

Last updated: 2026-06-22

Scope: identify missed or underrepresented stories for supplier/vendor/brand/cost-source personas and workflows (fields, pricing source/date, attachments/spec sheets, component variants, library folders, cost update/versioning, source freshness, and external-vs-internal actor model).

Canonical baseline: `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv`

Relevant evidence sources reviewed:
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv`
- `src/lib/component-library/actions.ts`
- `src/lib/repositories/component-library-repository.ts`
- `src/lib/repositories/cost-library-repository.ts`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/library/EditComponentDrawer.tsx`
- `src/components/workshop/library/ComponentInspectorDock.tsx`
- `src/components/workshop/library/overview/LibraryOverview.tsx`
- `src/components/workshop/component-library/CommandPalette.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/app/api/component-library/attachments/route.ts`
- `src/app/api/component-library/images/route.ts`
- `src/lib/actions/component/attachments.ts`
- `supabase/migrations/20260524053500_component_brand_library.sql`
- `supabase/migrations/20260524120322_component_library_variants.sql`
- `supabase/migrations/20260525034500_component_library_brand_supplier_shape_cleanup.sql`
- `supabase/migrations/20260523120957_component_library_item_versioning.sql`

What is present now
- Supplier/brand metadata exists and is surfaced in library entry/create and browse workflows (`AddComponentModal`, edit/drawer views, component facets, folder tree grouping, list filters).
- Variant and version primitives exist in component library actions/repository and migrations; attachments API/storage exists.
- Cost records include `sourceName`, `sourceDate`, `sourceUrl`, and related confidence/notes metadata in the create/update path.
- Library component manager and overview surfaces have freshness and missing metadata metrics.
- No explicit canonical rows currently describe supplier/brand/cost-source actor workflows.

Missed or underrepresented user stories

1) External supplier/vendor as actor
- Supplier is currently used mostly as descriptive metadata and filters, not as an external actor.
- Missing explicit external actor journey for supplier self-serve onboarding, source submission, price-file upload, and ownership handoff.
- Evidence: no dedicated supplier pages/routes or dedicated supplier actions in `src/app`/`src/components` beyond library manager internals.

2) Cost source freshness stewardship
- `sourceDate` and freshness scoring are present, but no explicit operational loop exists for stale-cost review, owner escalation, and refresh SLA.
- Evidence: freshness facet/health in `src/components/workshop/library/overview/LibraryOverview.tsx` only indicates state; no task assignment or refresh workflow.

3) Attachments/spec-sheet lifecycle
- Upload/delete attachment exists, but no explicit story for who uploaded it, what revision/version it applies to, review/approval state, or extraction/validation quality checks for spec sheets.
- Evidence: attachment endpoint allows file operations and storage sync, but lacks approval/version governance metadata at UX level.

4) Supplier/brand governance + deduplication
- Brand/supplier fields exist, and data-shape migrations include cleanup/normalization, but no UX rows for catalog curation, de-duplication, merge/reassign, archive, or external contact lifecycle.
- Evidence: data-shape table work appears in migrations; no corresponding management surface is visible in source routes/components.

5) Internal vs external actor boundary is underdefined
- Current workflows make it ambiguous whether suppliers are internal admins creating components versus external data contributors versus passive master data.
- Evidence: repository/actions include supplier/brand IDs on the same component write path used by workspace users.

6) Cost update/version governance
- Versioning is implemented, but no row explicitly ties component-cost provenance to “accepted/locked/needs revalidation” states before reuse.
- Evidence: component item/version code and variant migrations exist; canonical rows do not define a revalidation/re-signoff state.

Recommended canonical-feature-status additions (do not modify canonical file now)

- Add `LIB-004` (underrepresented)
  - Feature Area: Library
  - Feature: Supplier/Vendor onboarding and contribution workflow
  - Story: As a supplier/vendor persona I can submit pricing updates/spec sheets via a dedicated, trackable flow and see acceptance status.
- Add `LIB-005` (underrepresented)
  - Feature Area: Library
  - Feature: Supplier/brand directory and governance
  - Story: As a data ops admin I can create/merge/retire supplier and brand records, with duplicate detection and ownership metadata.
- Add `LIB-006` (underrepresented)
  - Feature Area: Library
  - Feature: Cost-source freshness SLA and refresh queue
  - Story: As a library curator I can triage stale source-date items, assign refresh owners, and close stale/corrected states.
- Add `LIB-007` (underrepresented)
  - Feature Area: Library
  - Feature: Attachment/spec-sheet versioning and approval workflow
  - Story: As an owner/reviewer I can version, validate, approve/reject attachments per component variant and keep audit history for compliance.
- Add `COST-001` (underrepresented)
  - Feature Area: Cost and sourcing
  - Feature: Component cost-source reconciliation
  - Story: As an estimator or supplier manager I can reconcile conflicting cost entries by source/date, compare revisions, and lock the active accepted cost.
- Update `LIB-002` scope note
  - Add explicit note that this row currently reflects technical versioning and folder/image support only; supplier/provider governance and source refresh workflows are not in scope yet.

