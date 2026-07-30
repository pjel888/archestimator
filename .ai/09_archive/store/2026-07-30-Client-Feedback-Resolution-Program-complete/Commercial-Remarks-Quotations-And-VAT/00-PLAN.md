# Commercial Remarks, Quotations, and VAT — Canonical Execution Plan

## Status

- Mode: PLAN ONLY. This authoring assignment changes no product code, test, migration, existing pack, Git state, or external resource.
- Quality profile: Q2_CRITICAL_CHANGE_GATE because the future implementation changes persisted commercial terms, money arithmetic, exports, private quotation links, authorization, and collaboration writes.
- Package status: CONDITIONALLY_READY.
- Implementation status: NOT_STARTED.
- Exact next unit: UNIT-001, the dependency-free RED and domain-characterization slice.
- Ready slice: UNIT-001 only. UNIT-002 through UNIT-006 remain PLANNED until migration allocation, Variants, Money-Math, Mutation Integrity, and preceding unit contracts are satisfied. Export integration is owned here and must reconcile current xlsx-export source locally rather than wait on a separate plan handoff.
- Release status: NOT_EVALUATED. Every criterion and gate remains FAIL until fresh implementation evidence exists.
- Stop condition for this plan-only assignment: 00-PLAN.md and plan-pack.json validate in both required validator modes; no implementation work begins.

### Current-source refresh — 2026-07-30

`EstimateRowItem.notes` still exists, but current D1-to-UI hydration omits it.
The actual row header/grid/cell integration surface is
`src/components/workshop/estimate-sheet/rows/row-table.tsx`, not the stale
`EstimateSheetContent.tsx:1324-1380` anchor. UNIT-004 now owns that file and its
active unfamiliar performance edits must be preserved. Generic quotation
artifacts remain reusable, but archived/rejected/unusable versions need a
quotation-specific unavailable projection and fail-closed download behavior.

## Task Contract

### Objective

Replace the fragmented current commercial behavior with one canonical structured model in which:

1. EstimateRowItem.notes is the only Remarks text.
2. Quotation requirement, quotation status, and a linked immutable quotation artifact version are independent facts.
3. VAT treatment is one of exclusive, inclusive, or exempt, resolved by row override, the snapshotted canonical selected-price-option default, estimate default, then project default.
4. VAT uses basis-point rates and deterministic integer-minor-unit arithmetic.
5. The estimate sheet exposes one compact Commercial column whose separately labelled Remarks, Quotation, and VAT controls persist independently of free text.
6. exports and publication snapshots freeze structured commercial terms and retain client privacy.

### Deliverables of a future implementation

- Repair the estimate-tree read projection so canonical row notes reach EstimateRowItem.notes.
- Add migration 0128 and only migration 0128 for canonical defaults, canonical price-option VAT pairs, row-selected-option VAT snapshots, row terms, quotation linkage, and persisted column visibility.
- Backfill deterministic legacy inputs without manufacturing remarks, quotations, or exempt status.
- Add one canonical commercial resolver and one canonical VAT calculation path backed by the final Money-Math primitives.
- Replace proposal percentage-or-included VAT semantics rather than maintain two paths.
- Reuse private project quotation artifacts, immutable versions, clean-scan controls, project ownership, and edit authorization.
- Add structured exports, consolidation keys, and Pre-VAT, VAT, VAT-exempt amount, and Grand Total summaries.
- Complete Q2 coverage, mutation, browser, performance, privacy, authorization, migration, and independent-review evidence.

### Non-goals

- Do not add a remarks column, commercial free-text blob, variant-notes mirror, or any other parallel remarks field.
- Do not treat VAT Exclusive and VAT Exempt as synonyms. Client wording VAT EX is rendered with an unambiguous full accessible label.
- Do not infer quotation availability from source URLs, supplier IDs, generic attachments, or requiresQuote.
- Do not copy files into a new quotation store or expose private storage keys, checksums, supplier data, source URLs, or private artifact identifiers to client exports.
- Do not create a second money oracle, use floating-point VAT arithmetic, hard-code a two-decimal scale at the snapshot boundary, or calculate VAT in the UI/workbook.
- Do not retain transient proposal vatMode/vatRate as a compatibility path.
- Do not use a feature flag, dual write, shadow model, staged rollout, or compatibility ceremony. The production cutover is migration plus direct replacement after dependencies are final.
- Do not change Assemblies migration 0129, Variants migration 0127, governance migration 0126, or any active plan pack.
- Do not deploy, mutate remote D1/R2, or make hosted or external claims from local evidence.

## Authoritative Inputs

1. The PP-D-R assignment and all same-task corrections dated 2026-07-28. The migration correction and manifest readiness correction supersede earlier numbering and readiness language.
2. Sanitized raw client input at .ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/evidence/client-feedback.md.
3. Completed analyst architecture attachment at C:\Users\phili\.codex\attachments\57fa19db-3389-45f8-9016-eae615c50ebe\pasted-text-1.txt. This is analysis provenance, not raw client feedback.
4. Current source and dirty shared-worktree diff at baseline HEAD 214fd2af3564c6c90d6bb46a7f2f7bd19faa811d, observed 2026-07-28 without modifying unfamiliar work.
5. .ai/00_system/PLAN_PACK_EXECUTION_POLICY.md and the canonical planning suite, directive, schema, agent protocol, BETA protocol, Validation Matrix, D1 operations gate, and performance/loading protocol.
6. Active Money-Math-Domain-Module, Estimate-Mutation-Integrity-Unification, xlsx-export, Client-Feedback-Resolution-Program, and the migration allocations owned by governance, Variants, and Assemblies.
7. wrangler.jsonc as resource truth for ARCH_DB, ARCH_UPLOADS_R2, UPLOAD_JOBS_QUEUE, and collaboration bindings.

## Current Architecture and Exact Anchors

Line anchors are exact for the observed shared worktree. Any drift before execution triggers a source reread and plan reconciliation.

### Remarks already has a canonical field, but the read projection drops it

- src/lib/estimates/types.ts:96 defines EstimateRowItem; src/lib/estimates/types.ts:146 already defines notes?: string. That field is canonical Remarks.
- src/lib/estimates/estimate-tree-read-repository.ts:59 begins the row query, while src/lib/estimates/estimate-tree-read-repository.ts:140 and :141 project source_snapshot_json inputs.
- src/lib/estimates/estimate-tree-read-repository.ts:472 begins toUiRow; the object assembled through :551 omits notes even though the snapshot contains it. This is the read-projection defect to repair.
- src/components/workshop/estimate-sheet/rows/editable-row-model.ts:124 carries notes in EditableRow, but initializers at :68-91 and :344-367 do not consistently project it.
- src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:489-533 writes values.notes into sourceSnapshotPatch.notes.
- src/lib/estimates/estimate-row-tree-patch.ts:113, :119, :181, and :371 already read and apply notes through tree patches.
- migrations/0082_estimate_row_integrity_constraints.sql:20 establishes source_snapshot_json; there is no row-level remarks column to duplicate.
- src/lib/estimates/actions.ts:1233-1280 includes notes in the allowed source snapshot shape.

### Legacy variant and starter snapshots are migration inputs, not new authorities

- migrations/0026_component_promotion_support.sql:77-99 gives every canonical `cost_library_item_price_options` row a stable workspace/item/option identity. Commercial `0128`, not Variants `0127`, owns its optional VAT sidecar and the row snapshot captured from that sidecar.
- src/lib/estimates/types.ts:19-84 carries existing component/variant notes, source URLs, supplier identifiers, and attachments.
- src/lib/onboarding/starter-pack-actions.ts:915-919 writes project taxTreatment metadata; :970-974 writes estimate metadata; :1055-1060 writes row requiresQuote and taxTreatment.
- src/lib/onboarding/starter-pack-actions.ts:1294-1299, :1330-1335, and :1359-1364 repeat tax inputs in component, item, and option/variant-cost metadata.
- src/lib/onboarding/starter-pack-actions.ts:1481, :1519, and :1565 persist starter snapshots.
- src/lib/onboarding/starter-pack.ts:123-140 currently supplies the additive 12 percent EX_VAT starter shape.

### Proposal VAT is transient, global, and arithmetically incomplete

- src/lib/proposal-export/types.ts:19-21 defines the current percentage-or-included charge mode; :44-60 places vatRate and vatMode on global proposal settings.
- src/lib/proposal-export/settings.ts:7-22 defaults VAT to 12 percent and percentage mode.
- src/lib/proposal-export/settings.ts:39-45 sets included VAT amount to zero rather than extracting embedded VAT and has no exempt state.
- src/components/workshop/ProposalExportPreviewDialog.tsx:42-49 owns transient dialog VAT state; :434-456 renders the current global controls.
- src/lib/proposal-export/create-proposal-workbook.ts:463-467 labels INCLUDED while outputting zero VAT.
- src/lib/proposal-export/build-proposal-export-model.ts:154-165 creates a consolidation key without treatment, rate, or quotation identity; :311-335 computes global totals.

### Private quotation artifact controls already exist and must be reused

- migrations/0107_project_artifact_upload_surfaces.sql:350-398 creates private project_artifacts and immutable project_artifact_versions; :356 includes quotation as an artifact type.
- The same migration at :416-440 enforces ownership/current-version invariants, :442-472 enforces scan and project-ownership controls, and :475-484 prevents immutable-version mutation.
- src/lib/project-artifacts/contracts.ts:4-18 includes the quotation artifact contract.
- src/lib/project-artifacts/service.ts:142-170 validates clean-scan and ownership conditions.
- src/app/api/projects/[projectId]/artifacts/_route-core.ts:80-109 checks project access, while :143-179 requires edit authority for creation.
- src/lib/project-artifacts/repository.ts:203-245 reads exact project/workspace-scoped versions.

### Sheet visibility and compact-column support are incomplete

- src/lib/estimate-sheet/column-model.ts:3-47 defines current columns without Commercial; :64-79 defines the current template.
- src/lib/estimate-sheet/user-preferences-d1-store.ts:18-20 stores only column widths; :94-117 loads them and :127-158 saves them.
- src/lib/estimate-sheet/user-preferences-actions.ts:16-24 accepts only width preferences.
- migrations/0008_estimate_sheet_user_preferences.sql:11-30 currently persists column_widths_json only.
- src/components/workshop/estimate-sheet/rows/row-table.tsx:1342-1408 owns the current row headers, grid, and cell integration. EstimateSheetContent remains the data/orchestration owner only.

### Export and publication paths already preserve some privacy but lack structured terms

- src/lib/proposal-export/build-proposal-export-model.ts:60-78 reads row.notes and redacts supplier/source information for client output.
- src/lib/publication/snapshot.ts:271-314 freezes row amount fields in minor units but does not freeze VAT treatment/rate/calculation version/currency scale/quotation version.
- src/lib/client-portal/issue-source-projection.ts:112-163 projects minor-unit commercial amounts to client issue sources.
- src/lib/publication/types.ts:73-103 defines publication snapshot structure.
- src/lib/client-portal/policy.ts:133-136 distinguishes never-public and controlled-public fields.

### Row mutation and collaboration already have a revision authority

- src/lib/estimates/actions.ts:2876-2959 updates rows and estimate revision/history.
- src/lib/estimates/d1-intents/rows.ts:1699-1735 applies copy-on-write row intents and revision checks.
- src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:489-533 is the optimistic row-edit entry point.
- The future terms write must join this revision/receipt/history/broadcast boundary rather than create an independent last-write-wins action.

### Current relevant diff

- src/lib/client-portal/issue-source-projection.ts has unfamiliar current edits that remove exports from internal types.
- src/lib/project-artifacts/contracts.ts has unfamiliar current edits that remove availability/version-identity exports and use a private actor type.
- No PP-D-R production edit is allowed to overwrite or normalize those changes. Before UNIT-004 or UNIT-005, reread the files and obtain a one-writer handoff if another pack still owns them.

## Scope

### Planned production paths

New canonical domain and persistence paths:

- migrations/0128_commercial_remarks_quotations_vat.sql
- src/lib/commercial-terms/contracts.ts
- src/lib/commercial-terms/resolve-commercial-terms.ts
- src/lib/commercial-terms/calculate-vat.ts
- src/lib/commercial-terms/quotation-policy.ts
- src/lib/commercial-terms/repository.ts

Existing estimate, mutation, and projection paths:

- src/lib/component-library/actions.ts
- src/lib/component-library/component-mutation-d1.ts
- src/lib/estimates/types.ts
- src/lib/estimates/estimate-tree-read-repository.ts
- src/components/workshop/estimate-sheet/rows/editable-row-model.ts
- src/lib/estimates/estimate-row-tree-patch.ts
- src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts
- src/lib/estimates/actions.ts
- src/lib/estimates/d1-intents/rows.ts

Existing compact-column and preference paths:

- src/lib/estimate-sheet/column-model.ts
- src/lib/estimate-sheet/user-preferences-actions.ts
- src/lib/estimate-sheet/user-preferences-d1-store.ts
- src/components/workshop/EstimateSheetContent.tsx
- src/components/workshop/estimate-sheet/CommercialCell.tsx
- src/components/workshop/component-library-manager/AddComponentModal.tsx

Existing artifact, export, and publication paths:

- src/lib/project-artifacts/contracts.ts
- src/lib/project-artifacts/repository.ts
- src/lib/project-artifacts/service.ts
- src/app/api/projects/[projectId]/artifacts/_route-core.ts
- src/lib/proposal-export/types.ts
- src/lib/proposal-export/settings.ts
- src/lib/proposal-export/build-proposal-export-model.ts
- src/lib/proposal-export/create-proposal-workbook.ts
- src/components/workshop/ProposalExportPreviewDialog.tsx
- src/lib/publication/types.ts
- src/lib/publication/snapshot.ts
- src/lib/client-portal/issue-source-projection.ts
- src/lib/client-portal/policy.ts

### Planned test and evidence paths

- tests/vitest/commercial-remarks-projection.test.ts
- tests/vitest/commercial-terms-domain.test.ts
- tests/vitest/commercial-tax-math.test.ts
- tests/property/commercial-tax-math.property.test.ts
- tests/vitest/commercial-price-option-terms.test.ts
- tests/vitest/commercial-migration-contract.test.ts
- tests/vitest/commercial-quotation-link-policy.test.ts
- tests/vitest/commercial-mutation-integrity.test.ts
- tests/vitest/commercial-column.test.tsx
- tests/vitest/commercial-column-preferences.test.ts
- tests/vitest/commercial-export-model.test.ts
- tests/vitest/commercial-publication-privacy.test.ts
- tests/vitest/commercial-collaboration.test.ts
- tests/vitest/perf/commercial-column-performance.test.tsx
- e2e/estimate-sheet-commercial.spec.ts
- artifacts/quality/* only through configured Q2 commands; never hand-edit evidence.

### Bound resources

- ARCH_DB: migration, defaults, canonical option VAT sidecars, captured row snapshots/terms, visibility, atomic mutation, and backfill only.
- ARCH_UPLOADS_R2 and UPLOAD_JOBS_QUEUE: reuse only through the existing private project-artifact upload and clean-scan path; no direct object access or new queue contract.
- COLLAB_ROOMS: existing estimate revision/broadcast protocol only; no new Durable Object class, binding, or topic.
- Client export/publication storage: only the existing local preparation paths and authorized publication pipeline; no external publish or upload in this pack.

## Requirements

| ID | Requirement |
| --- | --- |
| DATA-001 | EstimateRowItem.notes remains the sole canonical Remarks value; repair all read/edit/patch/export projections without adding or manufacturing a parallel value. |
| REQ-001 | Resolve an atomic treatment/rate pair by row override, snapshotted selected-price-option default, estimate default, then project default; persist the option pair and row snapshot in Commercial `0128`; implement exclusive, inclusive, and exempt with deterministic integer-minor-unit arithmetic. |
| OPS-001 | Reserve and use only migration 0128; backfill explicit legacy taxTreatment first, preserve additive 12 percent behavior otherwise, and map legacy quotation requirements without inference. |
| SEC-001 | Model quotation requirement, status, optional reference, and optional linked immutable quotation artifact version as orthogonal structured facts protected by project ownership, scan, and edit authorization. |
| UX-001 | Add one compact Commercial column containing separately labelled Remarks, Quotation, and VAT controls with persisted visibility, accessible names, responsive behavior, and bounded rendering work. |
| DATA-002 | Export structured commercial terms, freeze treatment/rate/calculation version/currency scale/quotation version, use safe consolidation keys, show four required summaries, and preserve supplier/artifact privacy. |
| OPS-002 | Write commercial terms through the canonical estimate revision, history, receipt, optimistic rollback/rejection, and collaboration broadcast boundary. |
| OPS-003 | Produce fresh Q2 migration, property, rounding, privacy, authorization, upload-boundary, export, collaboration, browser/a11y/performance, coverage, mutation, full-suite, and independent-review evidence. |

## Decisions

### DEC-001 — Remarks is EstimateRowItem.notes

The row source snapshot notes field is the only persisted text. The repository, editable-row initializer, patch path, sheet editor, export, and publication paths all project that value. Quotation facts are also row-owned. Variant notes remain nested variant data and are never copied, concatenated, promoted, or backfilled into row notes, including when row notes is empty. Existing row notes are preserved and missing Remarks remain empty. No remarks table, remarks column, option-level remarks, option-level quotation, or commercial-text field is created.

### DEC-002 — Tax precedence resolves an atomic pair

At each level, treatment and rate are either both present or both absent:

1. explicit row override;
2. the selected canonical price option's VAT pair snapshotted into the row when selection or an explicit linked-material refresh succeeds;
3. estimate default;
4. project default.

The resolver never combines a treatment from one level with a rate from another. Exempt requires zero basis points. A row override therefore can satisfy a client's VAT requirement even when the selected option has a different catalogue default. Variant notes and quotation fields never participate in this precedence. Migration establishes a project default so production resolution cannot fall through to an implicit UI default.

### DEC-003 — VAT uses basis points and documented minor-unit rounding

- Rates are integers in basis points; 1200 means 12.00 percent.
- Inputs and outputs use safe integer minor units and the currency scale supplied by canonical money metadata. The export snapshot freezes that scale.
- The Money-Math handoff must provide checked integer multiplication/addition/subtraction and roundDiv with nearest rounding and exact-half ties away from zero, matching the current canonical toMinorUnits direction. Commercial code calls those primitives; it does not copy them.
- Exclusive: entered amount is Pre-VAT. VAT = roundDiv(enteredMinor × rateBps, 10000). Grand Total = enteredMinor + VAT.
- Inclusive: entered amount is Grand Total. Pre-VAT = roundDiv(enteredMinor × 10000, 10000 + rateBps). VAT = enteredMinor − Pre-VAT. This subtraction guarantees Pre-VAT + VAT = Grand Total after rounding.
- Exempt: entered amount is Pre-VAT and Grand Total, rate is zero, and VAT is zero. VAT-exempt amount increases by enteredMinor.
- Negative, non-safe-integer, unsupported-currency, invalid-scale, invalid-rate, and overflow inputs return typed failures; they never silently coerce or emit NaN/Infinity.

### DEC-004 — Migration 0128 owns canonical persistence

Migration 0128_commercial_remarks_quotations_vat.sql creates:

1. project_commercial_defaults keyed by project and workspace with treatment/rate pair, revision, and timestamps;
2. estimate_commercial_defaults keyed by estimate/project/workspace with an optional complete override pair, revision, and timestamps;
3. cost_library_item_price_option_commercial_terms keyed by workspace/item/price-option identity with an optional complete VAT pair, revision, actor, and timestamps; it contains no Remarks or quotation fields;
4. estimate_row_commercial_terms keyed by row/estimate/workspace with the selected option ID plus its immutable captured VAT pair/revision, an optional complete row override pair, quotation requirement, quotation status, optional safe reference, optional retained project_artifact_version_id, and timestamps;
5. column_visibility_json on the existing estimate user-preferences table, preserving its current user/estimate identity and validated key allowlist.

Checks constrain enums, basis points, exempt-zero behavior, pair nullability, selected-option snapshot identity, and safe reference length. Composite ownership guards bind option terms to `cost_library_item_price_options(workspace_id,item_id,id)`. Foreign keys and triggers enforce estimate/project/workspace ownership and immutable quotation version identity without cascading away a row's historical snapshot. Commercial row-term writes occur in the same transaction and row revision as the canonical row mutation. Selecting or explicitly refreshing a linked option copies its VAT pair/revision into the row atomically; later option edits do not silently rewrite an existing estimate.

Governance owns 0126, Variants owns 0127, this pack alone owns 0128, and Assemblies owns 0129. Number or inventory drift makes the pack stale. Tree Live Subtotals receives no migration.

### DEC-005 — Legacy backfill is deterministic and conservative

Within the 0128 migration and its verification fixture:

- Backfill canonical option VAT sidecars from explicit option/variant taxTreatment metadata, then snapshot the currently selected option pair onto each unambiguous linked row. Backfill an explicit row pair separately and preserve row-first precedence. Normalize known exclusive values including EX_VAT to exclusive; normalize known VAT-included values to inclusive; normalize explicit exempt values to exempt with zero basis points.
- When no explicit valid treatment exists, create exclusive with 1200 basis points, preserving the current additive 12 percent proposal behavior.
- Legacy vatIncluded is an input only when no explicit taxTreatment exists at the same canonical source. It maps true to inclusive and false to exclusive.
- Malformed legacy values are counted in migration diagnostics and receive the documented exclusive/1200 fallback; they are not guessed into exempt.
- requiresQuote=true maps to requirement Required and status Not Requested, never Available. False or absent maps to Not Required unless a separate explicit quotation requirement exists.
- An explicit legacy quotation status may be preserved even without an attachment. A generic attachment, source URL, or supplier identifier never creates Available status or a quotation link.
- Existing source_snapshot_json.notes is preserved exactly. Missing row Remarks remains empty. Nested variant notes, source URLs, and supplier identifiers remain provenance and attachments remain their existing attachment class; none can manufacture client-visible Remarks.
- An existing artifact link migrates only when it explicitly identifies a quotation artifact version and passes same-project/workspace, immutable-version, and clean/approved checks.

The migration captures pre/post counts and deterministic sample hashes in local test evidence. Applied migrations are never rolled back; repair uses a new fix-forward migration allocated after the then-current inventory.

### DEC-006 — Quotation facts remain orthogonal

Quotation requirement is Not Required or Required. Quotation status is Not Requested, Requested, Available, or Unavailable. Attachment truth is a retained internal nullable quotationArtifactVersionId plus a live policy-derived `attachmentState` of `none`, `available`, or `unavailable` and a client-safe `hasAttachment` boolean.

- Required does not imply Available.
- Available may exist without an attachment.
- A linked quotation version does not rewrite status to Available.
- No generic attachment can satisfy quotation attachment truth.
- The compact cell and exports show requirement, status, and attachment truth separately.
- Remarks, quotation requirement/status/reference, and quotation links exist only on the row. Canonical price options own VAT defaults only.

### DEC-007 — Existing private quotation artifacts are the only attachment path

A link accepts only artifact_type=quotation and a specific immutable version owned by the same project/workspace. The existing project-artifact service enforces membership, edit authorization, clean or explicitly approved scan state, and immutable version selection. Reads are scoped to the exact project/workspace. UI never reads R2 directly and never accepts a raw object key or generic attachment ID.

The retained internal version ID is audit provenance, not perpetual attachment truth. Every read, download, snapshot, summary, and export re-evaluates current artifact ownership, archive state, and scan policy in one batched policy projection. A missing, archived, rejected, failed, pending, cross-scope, or otherwise unusable linked version projects `attachmentState=unavailable` and `hasAttachment=false`; business quotation status remains unchanged. Authorized editors see only a generic relink/remove recovery state, downloads fail closed without existence leakage, and client output omits the link and exposes only `hasAttachment=false`. Restoring the same authorized clean version may make it usable again; no automatic unlink or status rewrite destroys audit history.

### DEC-008 — One compact column contains three structured controls

column-model gains one commercial key, not three wide columns. CommercialCell renders compact, separately labelled Remarks, Quotation, and VAT sections:

- Remarks edits EstimateRowItem.notes.
- Quotation edits requirement/status/reference and links or unlinks an authorized quotation artifact version.
- VAT shows the resolved source and edits the row override; Exempt disables rate editing and stores zero. Authorized Edit Component variant controls may edit only the canonical option VAT sidecar. Clearing the row override falls back to the snapshotted selected-option pair, then estimate/project defaults.

The visible abbreviated treatment may say VAT INC, VAT Exclusive, or VAT Exempt. The accessible name always uses the full unambiguous treatment. Column visibility persists in column_visibility_json; the validator rejects unknown keys. Width and visibility are separate preferences.

### DEC-009 — Exports consume frozen resolved terms and replace transient VAT

The proposal model resolves terms once per row and freezes treatment, rateBps, resolution source, selected option ID/terms revision, calculationVersion, currencyCode, currencyScale, quotation requirement/status/reference, and the safe attachment state evaluated at snapshot time. Internal audit may retain immutable quotation version identity, but client structures never do. Workbook and publication code consume that prepared model and never recalculate.

Consolidation keys include treatment, rate, and quotation identity/status dimensions so unlike commercial terms cannot collapse. Summaries are Pre-VAT, VAT, VAT-exempt amount, and Grand Total. The existing global vatRate/vatMode and INCLUDED-zero logic are removed after migration and callers switch; no dual semantics remain.

Client output may include client-safe Remarks, requirement/status, a safe quotation reference, and whether a client-authorized quotation is attached. It must redact supplier identifiers, source URLs, private artifact/version IDs, storage keys, checksums, scan metadata, private download URLs, and internal actor details.

### DEC-010 — Shared owners serialize before production integration

UNIT-001 can run now because it only creates RED/domain-characterization tests. Production units wait for:

- final Variants 0127 selected-variant snapshot, generic additive-edge port, and exactly-once contribution contract;
- Money-Math checked integer and roundDiv handoff;
- Estimate Mutation Integrity row mutation/receipt/history handoff;
- xlsx-export ownership release before proposal/workbook/dialog edits;
- one-writer handoff for current project-artifact and client-portal diffs;
- Readability/Image pack handoff before EstimateSheetContent or editable-row-model edits.

Assemblies 0129 consumes completed Commercial semantics and proves real integrated parity afterward. Commercial does not wait for or implement assembly contribution logic.

## Dependency and Ownership Barriers

| Barrier | Owner / evidence required | Effect |
| --- | --- | --- |
| Migration inventory | Governance 0126, Variants 0127, Commercial 0128, Assemblies 0129 present in that exact order | UNIT-002 remains PLANNED until 0127 ownership and filename are final; any drift stales this pack. |
| Variant precedence | Final Variants selected-option identity and exactly-once contribution contract; Commercial `0128` option VAT sidecar and captured row snapshot | UNIT-003 cannot implement precedence against starter snapshot guesses or an unowned option pair. |
| Money arithmetic | Money-Math owner provides canonical checked integer operations, currency scale, and roundDiv tie behavior | UNIT-003 and UNIT-005 cannot create local arithmetic substitutes. |
| Mutation ownership | Estimate-Mutation-Integrity-Unification final row revision/receipt/history/broadcast path | UNIT-003 must join that path, not add an action alongside it. |
| Export ownership | Active xlsx-export owner releases proposal-export and ProposalExportPreviewDialog paths | UNIT-005 is PLANNED and must reread after handoff. |
| Artifact/client diff | Current writer releases project-artifacts/contracts.ts and issue-source-projection.ts | UNIT-004/005 preserve unfamiliar edits and adapt to final private types. |
| Sheet ownership | Readability/Image owners release EstimateSheetContent.tsx and editable-row-model.ts | UNIT-004 rereads and uses one writer per file. |
| Assemblies | Assemblies owns 0129 and depends on completed Commercial | Commercial finishes against the Variants generic additive-edge port with synthetic contributions; Assemblies later proves real integrated parity. |

No human approval is an implementation unit. These are source/ownership handoffs and stale checks that the implementing lead resolves in dependency order.

## Dependency DAG

    UNIT-001 RED/domain characterization [READY]
        |
        +-- external: 0126/0127 inventory + Variants final contract
        +-- external: Money-Math + Mutation Integrity handoffs
        v
    UNIT-002 migration, schema, backfill, repository [PLANNED]
        v
    UNIT-003 resolver, projection, mutation, collaboration [PLANNED]
        |
        +-- external: sheet/artifact one-writer handoffs
        v
    UNIT-004 compact column, visibility, quotation linking [PLANNED]
        |
        +-- external: xlsx-export and client-publication handoffs
        v
    UNIT-005 exports, snapshots, summaries, redaction [PLANNED]
        v
    UNIT-006 Q2 closure and independent reviews [PLANNED]

## Unit Contracts

### UNIT-001 — Lock the RED and domain contract

- Status: READY.
- Dependencies: none. It does not require production ownership or migration execution.
- Exact owned writes:
  - tests/vitest/commercial-remarks-projection.test.ts
  - tests/vitest/commercial-terms-domain.test.ts
  - tests/vitest/commercial-tax-math.test.ts
  - tests/property/commercial-tax-math.property.test.ts
  - tests/vitest/commercial-price-option-terms.test.ts
  - tests/vitest/commercial-migration-contract.test.ts
  - tests/vitest/commercial-quotation-link-policy.test.ts
- Boundaries: tests and fixtures only; no src, migration, pack, remote resource, or generated evidence edit.
- Work:
  1. Characterize notes as the only Remarks source and prove the current repository projection is red.
  2. Specify row-first atomic precedence, canonical option VAT persistence, selection-time row snapshots, variant-switch behavior, and all exclusive/inclusive/exempt examples at currency scales 0, 2, and 3.
  3. Add exact-half, one-minor-unit, zero-rate, exempt, maximum-safe, overflow, malformed-rate, and invariant properties.
  4. Characterize 0128 project/estimate/option/row schema, captured option-pair backfill, 0126/0127/0128/0129 inventory, requiresQuote migration, and no generic-attachment inference.
  5. Characterize quotation status/attachment orthogonality, same-project clean-version authorization, and attach-then-archive/reject/scan-fail behavior across read/download/export.
- Expected RED signal: failures name missing commercial contracts/repository/migration and the existing projection omission. Existing unrelated suites remain green. Do not weaken assertions to manufacture green.
- Completion boundary: commit no product behavior; hand EVID-001 and EVID-002 as failing machine-readable test output to UNIT-002.

### UNIT-002 — Add 0128 persistence and deterministic backfill

- Status: PLANNED.
- Dependencies: UNIT-001 plus final 0126/0127 inventory and Variants migration ownership.
- Exact owned writes:
  - migrations/0128_commercial_remarks_quotations_vat.sql
  - src/lib/commercial-terms/contracts.ts
  - src/lib/commercial-terms/repository.ts
  - src/lib/component-library/actions.ts
  - src/lib/component-library/component-mutation-d1.ts
  - tests/vitest/commercial-price-option-terms.test.ts
  - tests/vitest/commercial-migration-contract.test.ts
  - tests/vitest/estimate-sheet-user-preferences-d1-store.test.ts
  - tests/vitest/estimate-schema-compat.test.ts
- Resources: local ARCH_DB only during verification.
- Boundaries:
  - No other migration number.
  - No second remarks field.
  - No product calculator.
  - No remote D1.
  - No direct R2/upload mutation.
- Work:
  1. Reread migrations/AGENTS.md and the D1 operations gate; verify inventory before writing.
  2. Create constrained project/estimate defaults, canonical price-option VAT sidecars, row-selected-option VAT snapshots, row terms, and column_visibility_json with ownership indexes/triggers.
  3. Backfill exact legacy sources in DEC-005 order inside bounded D1 statements.
  4. Extend the canonical component option mutation to write only option VAT pairs and revisions; never accept option Remarks or quotation fields.
  5. Add same-project/workspace quotation-version constraints and safe indexes.
  6. Implement batch repository reads/writes with no N+1 query path and typed absence/error results.
  7. Capture migration count/hash/parity evidence and destructive-operation absence.
- Green boundary: fresh database plus current-baseline fixture migrate cleanly; rerunning repository verification is idempotent; 0128 contract tests pass.

### UNIT-003 — Resolve terms through canonical mutation and collaboration

- Status: PLANNED.
- Dependencies: UNIT-002, final Variants snapshot/contribution contract, Money-Math handoff, and Mutation Integrity handoff.
- Exact owned writes:
  - src/lib/commercial-terms/resolve-commercial-terms.ts
  - src/lib/commercial-terms/calculate-vat.ts
  - src/lib/estimates/types.ts
  - src/lib/estimates/estimate-tree-read-repository.ts
  - src/components/workshop/estimate-sheet/rows/editable-row-model.ts
  - src/lib/estimates/estimate-row-tree-patch.ts
  - src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts
  - src/lib/estimates/actions.ts
  - src/lib/estimates/d1-intents/rows.ts
  - tests/vitest/commercial-remarks-projection.test.ts
  - tests/vitest/commercial-terms-domain.test.ts
  - tests/vitest/commercial-tax-math.test.ts
  - tests/property/commercial-tax-math.property.test.ts
  - tests/vitest/commercial-mutation-integrity.test.ts
  - tests/vitest/commercial-collaboration.test.ts
- Resources: local ARCH_DB and existing COLLAB_ROOMS protocol fixtures only.
- Boundaries:
  - Reuse Money-Math primitives; no copied roundDiv, minor-unit converter, formatter, or floating VAT path.
  - Preserve Variants selected snapshot identity and count contributions exactly once.
  - Join the canonical revision/receipt/history/broadcast mutation; no parallel server action or last-write-wins table update.
- Work:
  1. Repair notes projection and initializer paths.
  2. On variant selection or explicit linked-material refresh, snapshot the selected option VAT pair/revision into the row in the canonical row mutation; preserve an explicit row override and never copy option notes or quotation data.
  3. Resolve row override, captured selected-option pair, estimate default, then project default without cross-level mixing.
  4. Calculate row commercial amounts once with checked minor-unit operations and typed failures.
  5. Mutate notes and structured terms atomically with row revision; broadcast safe patches; reconcile optimistic, pending, rejected-retained, rollback, and authoritative refresh states.
  6. Prevent stale collaborators from overwriting newer quotation/VAT values; preserve canonical notes on conflicts.
- Green boundary: unit/property/mutation/collaboration suites prove exact precedence, rounding, rollback, revision conflict, and no duplicate fields/calculators.

### UNIT-004 — Add the compact Commercial column and quotation linking

- Status: PLANNED.
- Dependencies: UNIT-003 plus sheet, component-library, and project-artifact one-writer handoffs.
- Exact owned writes:
  - src/lib/estimate-sheet/column-model.ts
  - src/lib/estimate-sheet/user-preferences-actions.ts
  - src/lib/estimate-sheet/user-preferences-d1-store.ts
  - src/components/workshop/estimate-sheet/CommercialCell.tsx
  - src/components/workshop/estimate-sheet/rows/row-table.tsx
  - src/components/workshop/EstimateSheetContent.tsx
  - src/components/workshop/component-library-manager/AddComponentModal.tsx
  - src/lib/commercial-terms/quotation-policy.ts
  - src/lib/project-artifacts/contracts.ts
  - src/lib/project-artifacts/repository.ts
  - src/lib/project-artifacts/service.ts
  - src/app/api/projects/[projectId]/artifacts/_route-core.ts
  - tests/vitest/commercial-column.test.tsx
  - tests/vitest/commercial-column-preferences.test.ts
  - tests/vitest/commercial-price-option-terms.test.ts
  - tests/vitest/commercial-quotation-link-policy.test.ts
  - tests/vitest/project-artifacts-service.test.ts
  - tests/vitest/project-artifact-routes-internal.test.ts
  - tests/vitest/perf/commercial-column-performance.test.tsx
  - e2e/estimate-sheet-commercial.spec.ts
- Resources: local ARCH_DB; existing private ARCH_UPLOADS_R2/UPLOAD_JOBS_QUEUE interfaces through mocks or local adapters; authenticated browser fixtures.
- Boundaries:
  - One commercial column only.
  - Three structured, separately labelled sections; no free-text composite.
  - No direct R2 URL/key, generic attachment picker, or attachment-to-status inference.
  - Preserve current private actor/type edits and client redaction.
- Work:
  1. Add validated persisted visibility independently from width preferences.
  2. Render compact keyboard-operable controls with full labels for VAT Inclusive, VAT Exclusive, and VAT Exempt.
  3. Display resolved VAT source; edit a row override in the sheet and only the canonical option VAT sidecar in Edit Component variant controls.
  4. Display quotation Required/Not Required, status, and attachment truth independently.
  5. Use the existing authorized quotation artifact selector and immutable version link; enforce clean/approved scan and same-project scope at link time and re-evaluate live usability on every read/download/export.
  6. Render retained-but-unusable links as a generic unavailable recovery state, keep business status unchanged, deny download, and expose no client attachment.
  7. Keep popovers/dialogs focus-managed; errors associate to the affected control; no per-keystroke live region.
  8. Preserve virtualization and canonical product budgets at the 1,500-node/5,000-row cap; batch terms/artifact availability and prohibit row-level fetches.
- Green boundary: DOM, a11y, authorization, upload-boundary, responsive browser, preference reload, and performance tests pass.

### UNIT-005 — Replace export VAT and freeze structured terms

- Status: PLANNED.
- Dependencies: UNIT-004 plus xlsx-export/client-publication ownership handoffs and the final Variants generic additive-edge/contribution contract. It has no Assemblies implementation dependency.
- Exact owned writes:
  - src/lib/proposal-export/types.ts
  - src/lib/proposal-export/settings.ts
  - src/lib/proposal-export/build-proposal-export-model.ts
  - src/lib/proposal-export/create-proposal-workbook.ts
  - src/components/workshop/ProposalExportPreviewDialog.tsx
  - src/lib/publication/types.ts
  - src/lib/publication/snapshot.ts
  - src/lib/client-portal/issue-source-projection.ts
  - src/lib/client-portal/policy.ts
  - tests/vitest/commercial-export-model.test.ts
  - tests/vitest/commercial-publication-privacy.test.ts
  - tests/vitest/proposal-export-model.test.ts
  - tests/vitest/proposal-export-preview.test.tsx
  - tests/vitest/proposal-workbook.test.ts
  - tests/vitest/project-publication-snapshot.test.ts
  - tests/vitest/client-portal-issue-source-projection.test.ts
- Resources: local export/workbook buffers and publication fixtures only; no external issue/publish/upload.
- Boundaries:
  - Prepared model is the only calculator consumer; workbook/UI do not recompute.
  - Remove global vatRate/vatMode VAT semantics and INCLUDED-zero behavior after all callers switch.
  - Do not alter contingency semantics accidentally.
  - Never expose private supplier, source, artifact, scan, actor, or storage data.
- Work:
  1. Add frozen structured row terms, row/selected-option resolution source and revision, safe attachment state, and calculation metadata to export/publication snapshots.
  2. Include treatment/rate and quotation identity dimensions in consolidation keys and exercise the Variants generic additive-edge port with synthetic assembly-shaped contributions.
  3. Produce Pre-VAT, VAT, VAT-exempt amount, and Grand Total summaries with row-to-summary minor-unit conservation.
  4. Render quotation availability/attachment truth without conflation; a retained unusable link exports `hasAttachment=false` and no identifier or download.
  5. Preserve client-safe Remarks and supplier/privacy redaction; use opaque authorized attachment presentation only.
  6. Remove transient global VAT controls and migrate preview to read resolved structured terms.
- Green boundary: export/workbook/publication/client tests prove deterministic snapshots, exact totals, stable consolidation, no dual path, and redaction.

### UNIT-006 — Close Q2 evidence

- Status: PLANNED.
- Dependencies: UNIT-005 and the Variants, Money-Math, Mutation Integrity, xlsx-export, artifact/client, and sheet handoffs named above. It has no Assemblies implementation dependency.
- Exact owned writes: tests and configured machine-generated artifacts only; no product behavior unless a failing test identifies an in-scope defect, which is repaired at its owning earlier unit.
- Work:
  1. Run every command in Verification Strategy serially.
  2. Repair all red, skipped, flaky, malformed, stale, missing, or weakened evidence.
  3. Reach 100 percent changed statements, lines, functions, and branches.
  4. Kill all high-risk changed and critical mutants.
  5. Complete distinct independent quality and privacy/authorization reviews.
  6. Reconcile source diff, GitNexus/current-source blast radius, migration inventory, active ownership, requirements, risks, criteria, and evidence hashes.
- Completion boundary: all Q2 gates are fresh PASS, no dependency remains, and no external/hosted claim is made.

## Acceptance Criteria

### AC-001 — Canonical Remarks

Every read, edit, optimistic patch, collaboration patch, export, and publication path uses EstimateRowItem.notes/source_snapshot_json.notes. No schema/type contains a second remarks value. Existing row notes are preserved, missing Remarks remains empty, and nested variant notes never become client-visible row Remarks.

### AC-002 — Exact VAT domain

Atomic precedence returns the explicit row pair, captured selected-price-option pair, estimate pair, or project pair without cross-level mixing. Option VAT pairs persist in the Commercial `0128` sidecar, selection snapshots them with source revision, switching variants refreshes that snapshot atomically, and an explicit row override remains authoritative. Exclusive, inclusive, and exempt calculations follow DEC-003 for currency scales 0/2/3, exact-half cases, and safe limits. For every valid row, Pre-VAT + VAT = Grand Total; exempt VAT is zero and VAT-exempt amount equals entered amount.

### AC-003 — Safe 0128 migration

Inventory is exactly 0126 governance, 0127 Variants, 0128 Commercial, 0129 Assemblies. Fresh and current-baseline local D1 migrations pass. Canonical option VAT pairs and row snapshots backfill deterministically; explicit row taxTreatment wins; otherwise selected option, estimate/project, then exclusive/1200 preserve documented behavior. requiresQuote maps to Required/Not Requested. Generic attachments never become quotations. Count/hash/parity evidence has no unexplained loss or duplication.

### AC-004 — Orthogonal and authorized quotation

Requirement, status, reference, and attachment truth round-trip independently. Available works with no attachment; an attachment does not force Available. Only a same-project/workspace, clean/approved, immutable quotation artifact version can link, and only an authorized editor can mutate the link. If a valid link later becomes missing, archived, rejected, failed, pending, cross-scope, or otherwise unusable, the retained audit link projects `attachmentState=unavailable`, `hasAttachment=false`, no download, and no client identifier while business status remains unchanged. Client output reveals no private artifact identity or invalidation reason.

### AC-005 — Compact accessible UI

Exactly one Commercial column presents separately labelled Remarks, Quotation, and VAT controls. Visibility persists independently from width. Full accessible names disambiguate VAT Exclusive and VAT Exempt; keyboard, focus, error, zoom, narrow viewport, and touch behavior pass. No N+1 requests or per-keystroke live announcements occur.

### AC-006 — Structured private-safe exports

Snapshots freeze treatment, rate, resolution source, selected option/terms revision, calculation version, currency code/scale, and safe attachment state. Internal audit may retain quotation version identity, but client snapshots do not. Consolidation cannot merge unlike commercial terms. Pre-VAT, VAT, VAT-exempt amount, and Grand Total conserve minor units. Global proposal VAT controls and included-zero logic are gone. Client output preserves approved Remarks/status while redacting supplier/source/private artifact data.

### AC-007 — Mutation and collaboration integrity

Notes and commercial terms share the canonical row revision, transaction, history, receipt, optimistic reconciliation, rollback/rejection, and collaboration patch. Stale writes fail safely; duplicate delivery is idempotent; partial failure cannot split row text from structured terms.

### AC-008 — Q2 closure

Focused and full relevant suites, migration checks, property tests, browser/a11y/device/performance evidence, privacy/security checks, build/static checks, 100 percent changed-branch coverage, changed/critical mutation, and two distinct independent reviews are fresh PASS with no skip, flake, stale artifact, or fake claim.

## Adversarial, Property, and Migration Matrix

| Case | Required result |
| --- | --- |
| Row and selected option have different complete pairs | Explicit row pair wins atomically; clearing it reveals the captured option pair. |
| Row override absent; selected option has pair | Captured option pair wins, including after reload/export with its option ID/revision provenance. |
| Switch selected option while row override exists | Selected-option snapshot refreshes atomically, row override remains authoritative, and neither option notes nor quotation facts copy. |
| Row treatment present but rate null | Constraint rejects the partial pair; resolver does not borrow option/estimate rate. |
| Inclusive 1200 bps on one minor unit | Deterministic roundDiv result; parts conserve gross. |
| Inclusive exact-half division | Tie rounds away from zero through the shared Money-Math primitive; VAT is gross minus rounded net. |
| Exclusive at maximum safe input | Checked multiply/add either returns exact safe integers or typed overflow; never wraps. |
| Exempt with nonzero rate | Schema/domain rejects it. |
| VAT EX label | Visible and accessible state says VAT Exclusive or VAT Exempt explicitly; no ambiguous serialized enum. |
| requiresQuote=true with generic attachment | Required + Not Requested; hasQuotationAttachment=false. |
| Available with no artifact | Persists and renders Available, no attachment. |
| Quotation artifact linked while status Requested | Requested and attached both persist; no inference. |
| Linked version later archived/rejected/scan-failed/pending/missing | Retained audit link projects unavailable, `hasAttachment=false`, no download/client identifier; Requested/Available/Unavailable business status is unchanged. |
| Previously unusable link becomes authorized and clean again | Batched policy projection may restore available attachment truth without rewriting quotation status or audit history. |
| Supplier/source URL and PDF-like generic attachment | Remain provenance/generic attachment; never quotation status/link. |
| Cross-project quotation version | Repository/service rejects without existence leakage. |
| Dirty/unscanned version | Link rejected; current row terms remain authoritative. |
| Unauthorized viewer edits | 403-safe domain error; no row/artifact details leak. |
| Concurrent VAT and Remarks edits at same revision | Canonical mutation conflict prevents lost update and reconciles optimistic UI. |
| Mutation accepted then authoritative response differs | UI reconciles to server snapshot and preserves error/status semantics. |
| Migration explicit EX_VAT | exclusive with explicit legacy rate or 1200 when legacy rate is absent. |
| Migration explicit exempt | exempt, zero rate, zero VAT. |
| Migration malformed treatment | counted diagnostic plus exclusive/1200 fallback; no guess. |
| Selected variant note with missing row note | Row Remarks remains empty; no copy, promotion, or client-visible manufacture. |
| Selected variant note and existing row note | Existing row note remains byte-for-byte authoritative; no replacement or concatenation. |
| Consolidation equal item but different VAT/quote | Separate groups. |
| Client export | Safe Remarks/status only; no supplier/source/private artifact/version/storage/scan/actor data. |
| 1,500 nodes / 5,000 rows | Batched projection, virtualized visible cells, and canonical budgets pass without row fetches. |

Property generators cover valid/invalid basis points, currency scales 0/2/3, minor amounts at zero/one/tie/safe bounds, row/option/estimate/project precedence, variant switches and captured option revisions, quotation requirement/status/link lifecycle combinations, and repeated snapshot serialization. Required invariants include determinism, idempotence, conservation, monotonic nonnegative VAT for fixed exclusive amount/rate, exempt zero, row-override preservation, no variant-note/quotation promotion, and serialization round-trip.

## Verification Strategy and Exact Commands

All commands are planned and currently NOT RUN. Run one heavy command at a time. Machine-readable artifacts must be created only by configured commands.

### Red-before-green

bun x vitest run tests/vitest/commercial-remarks-projection.test.ts tests/vitest/commercial-terms-domain.test.ts tests/vitest/commercial-tax-math.test.ts tests/property/commercial-tax-math.property.test.ts tests/vitest/commercial-price-option-terms.test.ts tests/vitest/commercial-migration-contract.test.ts tests/vitest/commercial-quotation-link-policy.test.ts --maxWorkers=1

RED expected in UNIT-001: failures identify the missing canonical commercial modules/migration and current notes projection omission. Green expected after UNIT-004: exit 0, no skipped tests, exact examples and generated properties pass.

### Migration and fix-forward

    bun run cf:check-d1-migrations
    bun run dev:check-d1-migrations
    bun x vitest run tests/vitest/commercial-migration-contract.test.ts tests/vitest/estimate-schema-compat.test.ts tests/vitest/estimate-sheet-user-preferences-d1-store.test.ts --maxWorkers=1

Expected: migration inventory reports 0126/0127/0128/0129 in owner order, fresh/current-baseline local D1 checks pass, constraints/triggers/backfill parity pass, and no destructive rollback or remote mutation occurs.

### Focused domain, mutation, authorization, and upload boundary

bun x vitest run tests/vitest/commercial-remarks-projection.test.ts tests/vitest/commercial-terms-domain.test.ts tests/vitest/commercial-tax-math.test.ts tests/vitest/commercial-price-option-terms.test.ts tests/vitest/commercial-mutation-integrity.test.ts tests/vitest/commercial-collaboration.test.ts tests/vitest/commercial-quotation-link-policy.test.ts tests/vitest/project-artifacts-service.test.ts tests/vitest/project-artifact-routes-internal.test.ts tests/vitest/estimate-mutation-revision-concurrency.test.ts tests/vitest/estimate-mutation-receipts.test.ts --maxWorkers=1

Expected: precedence, rounding, projection, atomic revision, optimistic rollback/rejection, duplicate delivery, clean scan, immutable version, same-project ownership, and edit authorization pass without generic attachment inference or existence leakage.

### Focused UI, accessibility, and performance

    bun x vitest run tests/vitest/commercial-column.test.tsx tests/vitest/commercial-column-preferences.test.ts tests/vitest/estimate-sheet-column-model.test.ts tests/vitest/estimate-sheet-column-width-preferences.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/perf/commercial-column-performance.test.tsx tests/vitest/estimate-sheet-large-data-budgets.test.ts --maxWorkers=1
    bun run test:a11y
    bun run test:e2e:perf
    bun run quality:bundle-budget

Expected: one compact column, three labelled controls, persisted visibility, unambiguous full VAT names, focus/error/keyboard semantics, zero row-level fetches, bounded renders, canonical performance budgets, and 1,500-node/5,000-row fixtures pass with unchanged thresholds.

### Export, publication, privacy, and contribution parity

    bun x vitest run tests/vitest/commercial-export-model.test.ts tests/vitest/commercial-publication-privacy.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-preview.test.tsx tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-workbook-benchmark.test.ts tests/vitest/project-publication-snapshot.test.ts tests/vitest/client-portal-issue-source-projection.test.ts tests/vitest/client-portal-policy.test.ts tests/vitest/estimate-unification-oracle.test.ts --maxWorkers=1

Expected: frozen fields, four summaries, minor-unit conservation, consolidation separation, exactly-once Variants/Commercial behavior through the Variants generic additive-edge port and synthetic contributions, removal of the global VAT dual path, and client redaction all pass. Assemblies later consumes this completed contract and owns real assembly parity.

### Authenticated browser and device matrix

    bun run test:e2e -- e2e/estimate-sheet-commercial.spec.ts e2e/estimate-sheet-mvp.spec.ts --project=chromium
    $env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX='1'; bun x playwright test e2e/estimate-sheet-commercial.spec.ts; Remove-Item Env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX

Expected: configured projects chromium, firefox, webkit, mobile-safari (iPhone 15), iphone-se, ipad, and pixel-8-chrome (Pixel fixture) prove edit/reload/conflict/rollback/visibility/quote-link/VAT-state/export journeys. Failed requests, console errors, focus loss, ambiguous labels, or private data fail the journey.

### Full relevant suites

    bun run test:unit
    bun run test:dom
    bun run test:workers
    bun run test:property
    bun run test:component:critical

Expected: all relevant unit, DOM, Workers, property, and Q2 component suites pass with zero skips or flakes. Workers evidence is required for affected publication/artifact/collaboration adapters, not fabricated for untouched resources.

### Static, build, security, coverage, and mutation

    bun run type-check
    bun run lint
    bun run quality:security
    bun run build
    bun run quality:diff-coverage
    bun run test:mutation:changed
    bun run test:mutation:critical
    bun run quality:critical

Expected:

- type/lint/build exit 0;
- security/privacy evidence finds no unauthorized link, object key, supplier/source data, internal actor, or private artifact identifier;
- Q2 changed statements, lines, functions, and branches are each 100 percent;
- no high-risk changed or critical mutant survives;
- the quality aggregate contains no missing, stale, malformed, skipped, flaky, weakened, or unowned evidence.

### Graph and diff reconciliation

Before every future production symbol edit:

    GitNexus impact(target=<symbol>, direction=upstream)

Before completion:

    GitNexus detect_changes(scope=compare, base_ref=main)

Expected: only planned commercial, estimate, preference, artifact, export, publication, and collaboration flows change. Current GitNexus concept search did not return usable FTS flows, so risk is UNKNOWN rather than low. If unavailable during execution, record degraded graph evidence and use current-source callers, scoped diff, and focused tests; never call missing graph evidence PASS.

### Independent reviews

1. Independent read-only Q2 reviewer: precedence, migration, integer arithmetic/rounding, exactly-once contributions, export determinism, performance, coverage, mutation, and evidence integrity.
2. Distinct independent read-only privacy/authorization reviewer: row/project/workspace isolation, quotation scan/version/link policy, upload boundary, client redaction, safe errors, and unfamiliar-diff preservation.

The implementing author cannot self-certify either review as independent.

## Migration, Privacy, Authorization, Upload, Export, and Collaboration Boundaries

- Migration: 0128 only. No tree migration. Verify owner inventory immediately before writing and before final evidence. Applied D1 migrations are fix-forward only.
- Privacy: canonical Remarks is client-visible only through existing export/publication policy. Supplier/source data and private quotation internals are never copied into public structures or logs.
- Authorization: existing project membership and edit authorization protect commercial mutation and quotation link changes. Read errors do not disclose cross-project artifact existence.
- Upload: all files stay within existing private project quotation artifacts, immutable versions, clean/approved scan controls, R2 service access, and upload queue. No raw R2 path, generic attachment promotion, or new upload endpoint.
- Export: the prepared snapshot is immutable and versioned; workbook/publication are renderers. Client export retains supplier/privacy redaction.
- Collaboration: use existing estimate revision, receipt, history, rollback/rejection, query invalidation, and COLLAB_ROOMS broadcast semantics. Never broadcast private artifact storage or scan details.
- Performance: batch-load project/estimate/option/row terms and live safe quotation attachment truth with the estimate; no cell fetch, per-row artifact query, duplicate calculator, or unbounded snapshot.

## Risks

| ID | Risk | Control |
| --- | --- | --- |
| RISK-001 | A new remarks field or copied variant note diverges from instance-owned row notes and leaks internal pricing context. | Schema/type prohibition, preserve-empty migration assertions, projection tests, source inventory, privacy review. |
| RISK-002 | Missing/stale option VAT snapshots, inclusive rounding, or VAT EX ambiguity produces wrong totals. | Commercial-owned option sidecar, atomic selection snapshot, row-first precedence, explicit formulas, tie/scale fixtures, property conservation, full accessible names. |
| RISK-003 | Migration-number or inventory drift collides with another owner. | 0126/0127/0128/0129 stale trigger before write and evidence. |
| RISK-004 | Backfill invents exempt status or quotation availability. | Explicit-first mapping, exclusive/1200 fallback, diagnostic counts, no-inference tests. |
| RISK-005 | Generic/private or later-invalidated attachments leak, remain downloadable, or satisfy quotation truth. | quotation-only immutable version, live batched same-project/archive/scan/auth projection, retained-unavailable state, fail-closed download, client redaction review. |
| RISK-006 | Active Variants, Money-Math, Mutation Integrity, xlsx-export, sheet, or client edits are overwritten. | PLANNED downstream units, one-writer handoffs, reread-before-edit, scoped diff. |
| RISK-007 | Compact controls overcrowd or slow the virtualized sheet. | One column, progressive compact UI, batch projection, cap benchmark, device/a11y matrix. |
| RISK-008 | Consolidation or summaries double count variants/options/accessories/tax. | Final shared contribution dependency, identity-rich keys, row-to-summary parity fixture. |
| RISK-009 | Separate terms write loses concurrent row edits. | Same revision/transaction/receipt/history path, stale-write and rollback tests. |
| RISK-010 | Current unfamiliar artifact/client diff changes private types during execution. | Mandatory reread/handoff stale trigger; no normalization or overwrite. |

## Recovery and Fix-Forward

- If UNIT-001 RED does not fail for the intended missing behavior, stop and repair the test oracle before production work.
- If migration 0128 fails on a local current-baseline copy, preserve the database and logs, identify the exact legacy shape, patch 0128 only if it has not been applied anywhere, otherwise allocate a later fix-forward migration after refreshing inventory. Never down-migrate applied D1.
- If backfill parity differs, do not continue to UI/export. Record offending sanitized fixture class, repair deterministic mapping, recreate the local fixture, and rerun all migration checks.
- If initial quotation authorization/scan/link tests fail, unlink only the optimistic local selection, retain canonical terms, surface a safe rejection, and repair service/repository policy before export work. If a previously valid retained link later becomes unusable, preserve it for audit, project unavailable/false attachment truth, deny download, and require relink/remove rather than changing business status.
- If a collaboration write is rejected, restore the authoritative row/terms snapshot and retain an associated non-live error; never silently merge stale treatment/rate pairs.
- If export arithmetic differs from the domain resolver, delete the export-side calculation and route it through the frozen prepared model.
- If performance exceeds canonical budgets, profile batch queries/render subscriptions and remove N+1 or duplicate derivation; do not raise thresholds.
- If an overlapping writer changes an owned path, stop that unit, preserve the diff, reread source/tests, update anchors and ownership, and resume from the last green unit.

## Resume State

A future executor resumes in this order:

1. Read AGENTS.md plus any deeper AGENTS.md for every target path.
2. Inspect memory pressure, FAST PATH state, git status, scoped diff, migration inventory, active owner packs, and current GitNexus status.
3. Revalidate this pack without --write and compare manifest hashes.
4. Confirm package_status remains CONDITIONALLY_READY and only UNIT-001 is in ready_slices.
5. Execute UNIT-001 and preserve intended RED evidence.
6. Resolve external handoffs, then mark only the next dependency-free unit READY.
7. Run units in DAG order, one heavy command at a time, updating evidence without fake PASS.
8. Stop at the first stale trigger, ownership collision, malformed evidence, or failed Q2 gate and fix forward.

## Stale Triggers

- Migration inventory no longer assigns 0126 governance, 0127 Variants, 0128 Commercial, and 0129 Assemblies in that exact order.
- Any other pack creates, reserves, renames, or applies 0128, or Assemblies no longer owns 0129.
- Variants changes selected-option identity, selection mutation, linked refresh behavior, or exactly-once contribution semantics; Commercial remains sole owner of option VAT sidecars and captured row terms.
- Money-Math changes currency scale, checked integer operations, calculation version, or roundDiv tie behavior.
- Mutation Integrity changes row revision, receipt, history, rejection, rollback, or collaboration patch authority.
- xlsx-export changes or retains ownership of proposal model, workbook, preview dialog, or consolidation contracts.
- Current edits in src/lib/project-artifacts/contracts.ts or src/lib/client-portal/issue-source-projection.ts change or remain unhanded.
- EstimateRowItem.notes, source_snapshot_json, starter taxTreatment/requiresQuote, proposal VAT, project artifact schema/service, or user-preference schema changes.
- An overlapping writer changes EstimateSheetContent.tsx, editable-row-model.ts, column-model.ts, proposal-export files, publication snapshot, or project-artifact paths.
- Client wording changes the three structured Commercial groups, quotation semantics, or VAT Exclusive versus VAT Exempt distinction.
- Canonical performance budgets, 1,500-node/5,000-row caps, Q2 thresholds, browser matrix, privacy policy, or Cloudflare bindings change.
- A tree migration becomes proposed, or Commercial is asked to claim 0127/0129.
- GitNexus becomes current and reports HIGH/CRITICAL impact inconsistent with this plan.

## Final Completion Audit

Do not claim implementation complete until:

1. Every requirement maps to a green acceptance criterion and fresh machine-readable evidence.
2. Only canonical notes exists for Remarks.
3. Row/selected-option/estimate/project VAT precedence, option-sidecar persistence, selection snapshots, variant switches, basis points, exclusive/inclusive/exempt semantics, scale, tie rounding, overflow, and conservation are proved.
4. Migration 0128 and owner inventory are proved on fresh/current-baseline local D1 with deterministic backfill parity.
5. Quotation requirement/status/attachment truth remain orthogonal; only authorized clean private quotation versions link; later archive/reject/scan-fail/missing states project unavailable, deny download, and expose no client identity without rewriting business status.
6. One compact Commercial column persists visibility and passes accessibility/device/performance evidence.
7. Exports freeze structured terms, show four summaries, consolidate safely, remove transient VAT, and redact private data.
8. Mutation/collaboration states and exactly-once Variants/Commercial behavior through the generic additive-edge port are integrated; Assemblies remains the downstream 0129 consumer.
9. Changed-branch coverage is 100 percent, high-risk changed/critical mutants are killed, and full relevant Q2 suites pass.
10. Both independent reviews pass, scoped diff is reconciled, no dependency remains, and no local evidence is described as hosted proof.

For this PP-D-R plan-only assignment, the stop condition is earlier: both owned packs validate in --write and read-only modes, while this pack remains CONDITIONALLY_READY with UNIT-001 as its sole ready slice.
