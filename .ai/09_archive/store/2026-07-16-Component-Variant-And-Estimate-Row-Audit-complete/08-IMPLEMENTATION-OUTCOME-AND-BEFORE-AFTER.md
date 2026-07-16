# Implementation Outcome And Before/After

> **Historical baseline notice (2026-07-15):** This document is a dated baseline/deep dive, not current readiness authority. Current status lives in `README.md`, `09-ESTIMATE-SHEET-FEATURE-ACTION-MATRIX.md`, `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md`, `IMPLEMENTATION_PLAN.md`, and `TRACEABILITY.md`. Any `PASS`, implemented, or complete wording below is historical unless re-proved there.

## Outcome

The current worktree contains the direct pre-release implementation for the component graph audited by this pack. The reported Project-component variant persistence defect is addressed at its source, and the same canonical graph now connects Add/Edit, Library and Project ownership, Estimate Sheet rows, attachments, and issued review.

This is an implementation outcome, not a release claim:

- implementation in the current worktree: `PRESENT`;
- focused automated and static evidence: `PRESENT`;
- full product-suite release gate: `NOT_EVALUATED`;
- browser, screenshot, and visual proof: `NOT_RUN`;
- hosted D1, R2, Queue, and Email proof: `NOT_EVALUATED`.

## Exact Reported Reproduction

Before:

1. Edit a Project component.
2. Add a variant.
3. Save changes.
4. Reopen the component.
5. The added variant is missing.

Root cause: when variant mode was first enabled, `AddComponentModal.addVariant` only opened the variant drawer and returned. It did not append a new `VariantDraft`, so the save payload had no new option to persist.

After: the same action appends a stable-ID option immediately. The complete ordered option graph is sent through the Project D1 update path, the authoritative row result is reconciled, and reopening the same stable Project component identity shows the added option. The exact interaction is covered by `tests/vitest/estimate-sheet-library-insert.test.tsx` in the case named `keeps a newly added project component variant after save and reopen`.

## Before And After Summary

| Concern | Before | After |
| --- | --- | --- |
| First added variant | Enabling variants opened the drawer but appended nothing | Add Variant creates a stable-ID option included in the saved graph |
| Reopen after save | Optimistic UI could hide the absent persisted option | Authoritative saved row/detail is reconciled and the option reappears |
| Default versus selected option | Opening from a selected row could promote that selection to component default | Component default and row-selected option are separate identities |
| Project editor identity | Row identity could be confused with shared Project component identity | Editor uses stable `sourceComponentId`; instances share only when intended |
| Library fan-out | One active/default option could overwrite heterogeneous linked rows | Each row retains its selected option and derives only that option's fields |
| Project fan-out | Variant-derived fields could spread to every instance | Only instances selecting the edited option receive that option's derived values |
| Overridden rows | Shared refresh could clobber visible overrides | `linked-overridden` rows retain visible overrides while receipts advance |
| Detached rows | Historical Library identity could route them back to Library behavior | Detached Project rows remain Project-owned and do not call Library mutation |
| Editing surfaces | Full modal and reduced drawer could diverge | One Add/Edit modal and one owner-specific graph action remain |
| Attachments | Metadata could be accepted without durable option ownership | D1 relates attachment to Library or Project option and R2 asset ownership |
| Library deletion | Source removal risked deleting estimate meaning | Rows are detached while estimate values and snapshots remain usable |
| Row mutation race | A revision precheck or zero-row guarded write could still be followed by committed history | Patch, replace, component fan-out, delete, and reorganization guard authoritative revisions inside the same D1 mutation/history/outbox batch |
| Issued review | Component identity and row identity were not independently discussable | Issued projection exposes opaque component and row targets separately |
| Private media paths | A raw private broker path could leak into public output | Issued projection drops unsafe broker paths and emits only safe URLs |
| Product versioning | Pre-release fixes risked duplicate version-labelled paths | Direct replacement keeps one current path; no product version fork is required |

## Library Component Outcome

A Library component is workspace-owned catalogue data. The modal sends the complete component graph to `updateCostLibraryComponentWithPriceOptions` in `src/lib/component-library/actions.ts`.

Expected behavior after implementation:

- create and edit preserve ordered stable option IDs, the explicit default, costs, image data, and attachment metadata;
- shared component fields fan out only to eligible linked rows;
- each linked row preserves its `selectedPriceOptionId`;
- option-derived material, description, supplier, unit, and cost values are recalculated from that row's selected option;
- overridden visible values remain local while source/version receipts advance;
- detached and unlinked rows are excluded;
- an in-use option cannot be removed without an explicit replacement;
- duplicate creates fresh component/option identities and does not steal attachment ownership;
- archive controls insertability without erasing existing estimate meaning;
- delete detaches dependent rows and templates rather than deleting their estimate content.

The fan-out planner is `buildLinkedEstimateRowSyncPlans` in `src/lib/component-library/actions.ts`.

## Project Component Outcome

A Project component is local to one project but may have multiple Estimate Sheet row instances. The modal sends its complete graph through `updateEstimateRowItem` in `src/lib/estimates/actions.ts`, which delegates the guarded graph write to the D1 action path.

Expected behavior after implementation:

- all instances of the same Project component use one stable `sourceComponentId`;
- adding, reordering, defaulting, or editing options persists in the Project component snapshot;
- component-level fields may update all instances in that project;
- option-derived fields update only instances whose `selectedPriceOptionId` matches the affected option;
- rows using other options keep their selection and derived values;
- quantity, miscellaneous cost, and other row-local fields remain row-owned;
- fan-out cannot cross the project boundary;
- a detached row with historical Library metadata remains on the Project action path;
- Project attachments survive the component graph write and use retention holds where deletion/restore semantics require them.

Variant-scoped Project fan-out and in-use option replacement are exercised in `tests/vitest/estimate-actions-d1-reorder-history.test.ts`.

## Estimate Sheet Row Outcome

The Estimate Sheet row is an instance, not a second component master. After implementation:

- insert stores the selected option and a bounded complete option catalogue in the row source snapshot;
- changing the variant is a row update, not row replacement;
- Library insert remains linked until detached or made Project-specific;
- Make Project Specific creates a fresh Project component identity, clears the Library link, and copies the complete option graph;
- promotion to Library preserves ordered options and the current selection while allocating new Library ownership;
- move and copy preserve or intentionally localize the component receipt according to destination scope;
- deleting a row removes only that instance unless an explicit component-level lifecycle action is chosen;
- authoritative action results, not labels or partial optimistic objects, drive post-save state.

The relevant transfer paths are in `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`, `src/lib/estimates/source-snapshot-price-options.ts`, and `src/lib/estimates/express-promotion-actions.ts`.

## CRUD And Lifecycle Outcome

| Operation | Library owner | Project owner | Estimate-row effect |
| --- | --- | --- | --- |
| Create | Creates workspace catalogue graph | Created by localization or Project row graph | New row stores selection and receipt |
| Read/reopen | Hydrates authoritative Library detail | Hydrates stable Project component group | Reopen preserves persisted option graph |
| Update | One Library graph action plus scoped linked-row plan | One guarded Project graph action plus same-project fan-out | Row-local fields remain local |
| Duplicate | Fresh component/option IDs; attachments not reassigned | Row/component copy is localized to destination scope | No accidental shared identity |
| Archive | Stops new insertion while preserving references | Not a substitute for row deletion | Existing rows remain meaningful |
| Delete | Detaches dependent estimate/template references | Deletes only through explicit Project lifecycle | Estimate data is preserved or explicitly removed |
| Promote | Already Library-owned | Creates new Library graph with fresh ownership | Current option selection is retained |
| Detach | Removes Library linkage from the instance | Remains Project-specific | Future Library edits no longer fan out |

## D1, R2, And Public Review Outcome

`wrangler.jsonc` is provider truth. Component persistence uses D1 binding `ARCH_DB`; binary assets use R2 binding `ARCH_UPLOADS_R2`.

Migration `migrations/0076_component_attachment_ownership.sql` gives `component_variant_attachments` one exclusive owner scope:

- Library tuple: workspace, Library item, and Library option;
- Project tuple: workspace, project, Project component, and Project option;
- one immutable `upload_asset_id` per attachment;
- indexed, fail-closed relational ownership before an R2 object is treated as bound.

Migration `migrations/0079_project_component_attachment_retention.sql` preserves Project attachment recovery semantics through explicit retention holds.

For issued review, `src/lib/publication/snapshot.ts` emits opaque component/variant anchors and row receipts; `src/lib/publication/image-url.ts` removes unsafe private paths. `src/lib/client-portal/issued-target-resolver.ts` validates issued target membership. `src/components/client-portal/EstimateBrowserSection.tsx` exposes separate Component and Row discussion actions, and owner replies flow through the publisher discussion service and notification queue.

## Evidence Actually Present

- exact Project add/save/reopen interaction: `tests/vitest/estimate-sheet-library-insert.test.tsx`;
- one Add/Edit modal, Library payloads, Project attachments, and detached Project routing: `tests/vitest/library-add-component-modal-a11y.test.tsx`;
- Project option-scoped fan-out, option removal replacement, usage counts, and attachment graph: `tests/vitest/estimate-actions-d1-reorder-history.test.ts`;
- Library fan-out and guarded authoritative writes: `tests/vitest/component-library-actions-revalidation.test.ts`;
- atomic Project row graph, single-delete, and reorganization contracts: `tests/vitest/estimate-row-atomic-d1-contracts.test.ts`;
- promotion and attachment copy rules: `tests/vitest/express-promotion-action.test.ts`;
- attachment ownership and retention migrations: `tests/vitest/component-attachment-ownership-migration.test.ts` and `tests/vitest/project-component-attachment-retention.test.ts`;
- issued component/row targets and discussion behavior: `tests/vitest/client-portal-issued-target-resolver.test.ts`, `tests/vitest/client-portal-shell.test.tsx`, and `tests/vitest/client-portal-publisher-discussion-service.test.ts`;
- publication path privacy: `tests/vitest/project-publication-snapshot.test.ts`.

Implementation lanes recorded focused passing test evidence, TypeScript checking, and targeted linting. These local receipts prove the scoped implementation criteria without converting them into a full release claim.

## Remaining Proof Boundary

The following remain intentionally open:

1. no Playwright, browser automation, screenshot, or visual QA was run;
2. no hosted D1/R2/Queue/Email end-to-end proof was run;
3. no deployment or live-data mutation was performed;
4. the full release suite was not evaluated as part of this implementation task.

## What To Expect Once This Path Is Used

Users can add a variant to a Project component, save, reopen, and see it again. Editing that option updates other instances of the same Project component only when those instances select that option. Library-linked rows likewise retain their own selections and overrides. Estimate rows carry the right component and option receipts through insert, detach, promotion, and deletion paths. Attachments remain attached to their actual Library or Project option owner. Issued review can discuss the component independently from an individual row without exposing private storage paths.

That is the concrete before/after outcome. Release confidence still requires an explicitly authorized browser/hosted evaluation; it does not require a second product version or compatibility layer.
