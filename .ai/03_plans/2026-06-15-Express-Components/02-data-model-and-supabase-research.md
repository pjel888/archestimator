---
title: Express Components Data Model And Supabase Research
type: docs
date: 2026-06-15
---

# Express Components Data Model And Supabase Research

## Current Persistence Shapes

Archestimator already has two component-related aggregates.

`cost_library_items` is the workspace reusable component identity. It is organized by `library_folders`, owns component metadata, and is expanded by price options, cost entries, attachments, versions, and lifecycle state.

`estimate_row_items` is the project/estimate row instance. It owns row-level material, description, supplier, unit, unit cost, quantity, misc cost, source linkage, snapshots, link state, metadata, revision, and history.

The requested express component is project-specific and edited directly in an estimate row. That places it in `estimate_row_items` by default.

## Alternatives

| ID | Shape | Fit | Cost | Decision |
| --- | --- | --- | --- | --- |
| A | Express as `estimate_row_items` with explicit metadata | Best fit for inline project-scoped authoring | Small app/RPC patch widening; no new table | Choose |
| B | Express as `cost_library_items` created first | Good for reusable workspace components | Wrong default scope; makes Add row create library artifacts | Reject as default |
| C | New `project_components` table | Useful only for project-local reusable catalog | New RLS, RPCs, typegen, conversion rules, duplicate source of truth | Defer |
| D | Only client-side placeholder until promoted | Fastest UI only | Loses persistence/history/source discipline | Reject |

## Recommended Shape

Use a typed express row state inside `estimate_row_items`.

Minimum row representation:

- app-derived `source = "project"` because `source_library_item_id = null`; `source` is not persisted as a row column
- `source_library_item_id = null`
- `link_state = "unlinked"` while authored from Add row
- `material`, `description`, `supplier`, `unit`, `unit_cost`, `misc_cost`, `quantity`, `discipline`, `designation`, `category_node_id`, and `supplier_id` accounted for in normal row columns
- `source_snapshot` updated with row-level image and pricing provenance where present
- express identity set in read-path-visible row metadata. The implementation must add `metadata.expressComponent` to the sheet SELECT/mapper/types before the client can evaluate the identity rule.
- `metadata.expressComponent` set to a small row-lifetime object, such as:

```json
{
  "kind": "express",
  "id": "uuid-v4-row-lifetime-id",
  "createdFrom": "estimate-add-row",
  "projectScoped": true,
  "promotionCorrelationId": null,
  "promotedLibraryItemId": null
}
```

The express id is not a new table key and must not be used as catalog identity. It is a row-lifetime UUIDv4 for UI state, traceability, and safe project-source copy handling. It is minted when the draft/template is created, stays stable only for that row, and is rekeyed when an express row is copied from project-source/template/reusable-source context into another estimate row. If Archestimator later adds a canonical project-local component catalog, that catalog gets its own constrained identity and migration path; implementers must not infer reusable component identity from material text or from this row-lifetime id.

Default grouping fields for the first implementation:

- `discipline = "Unspecified"` so share/publication discipline aggregation lands in the existing unspecified bucket rather than an empty string.
- `designation = ""` so proposal tags fall back to discipline/section labels and share tree reconstruction avoids inventing hierarchy segments.
- `category_node_id = null` / app `categoryNodeId = null` so project charts and proposal sections use the existing `Uncategorized` category fallback until the user chooses a real category.

These defaults intentionally differ from the legacy blank template's app-only `category = "Unassigned"` label. They keep express rows out of blank-placeholder heuristics while preserving current proposal/dashboard fallback behavior: totals remain row-field driven, proposal section label resolves through category/discipline fallback, and project charts place uncategorized express cost in the existing uncategorized bucket.

History classification must distinguish express inserts from blank placeholder inserts. The current insert RPC classifies any source-less insert as `row_blank_added`; the implementation must migrate the insert RPC so only true legacy blanks use `row_blank_added`. The SQL predicate must mirror the client blank definition by checking the blank material label and/or `metadata.tags ? 'manual-row-placeholder'`; source-null alone is not a blank discriminator. Express rows should record `row_added` unless a new composer-backed event such as `row_express_added` is deliberately added.

## Conversion Paths

### Express To Library-Wide

Promotion should create a normal library component through existing component-library actions and RPCs:

- `src/lib/component-library/actions.ts:431` creates a `cost_library_items` component with metadata provenance.
- Existing price option RPCs can store unit, unit cost, misc cost, source, confidence, and optional image data.
- The first implementation should relink the originating row to the new `source_library_item_id`, set `link_state = "linked-clean"`, and write a fresh `source_snapshot`. Users can then use the existing make-project-specific flow if they want a detached copy again.
- Promotion must be atomic and idempotent. This plan chooses a new `promote_express_row_to_library_component` SECURITY DEFINER RPC that checks `can_edit_estimate` plus workspace-editor permission, locks the source row, rejects an empty name, creates the normal library component and default price option, records a promotion correlation id, relinks the originating row, and returns the widened row snapshot. A retry with the same correlation id must return the same library item rather than duplicate it.
- Promotion needs an explicit target folder. The default is the current workspace's uncategorized/custom component folder chosen by existing component-library create behavior; if no valid target exists, the action must ask the user to pick or create one before calling the RPC.
- After successful promotion, invalidate or update the estimate-sheet row query for the active estimate/tab, the workspace component-library prefix including the lite in-estimate panel query and full rows/editor dataset, and any active library route datasets that show folders/items for the target workspace. The source row must reconcile from the returned RPC row rather than waiting for a broad refetch.

The implementation should not promote automatically on Add row. Promotion is a user action.

### Library-Wide To Project-Specific

Existing detach semantics are the right model:

- Insert the library component into `estimate_row_items` as a linked row.
- Preserve `source_snapshot`.
- Call `unlink_estimate_row_item_from_library_with_history` with the current row revision; that RPC clears `source_library_item_id`, sets `link_state = "detached"`, and records detach metadata/history. The caller must not clear the source id before calling the unlink RPC.

Detached rows and express rows are both project-specific rows, but they should remain distinguishable in metadata:

- Express row: authored locally, never linked.
- Detached row: began as a library component, then stopped following library updates.

### Project Folder In Components Tab

This is a fast-follow slice after day-0 U1-U4. The contract below is retained so day-0 metadata and read-path choices do not block later projection work, but it is not part of the first express authoring release unless `00-scope-and-premise-decision.md` is superseded.

Render a virtual Project folder/view from estimate rows rather than writing project rows into `library_folders`.

Route/context decision for the MVP:

- The existing workspace-only `/workshop/library/components` route has no project context today. The MVP will add explicit `projectId` plumbing through route/query/context for a project-aware variant, and the default workspace-only route will continue to show only workspace library folders until a project is supplied.
- The estimate-side component-library picker remains an allowed alternate host for the first projection because it already receives `projectId`; if chosen during implementation, U6 must update the route decision and traceability row before coding.
- Fetch project rows through a dedicated project-scoped action that checks project/estimate access with the same boundary as estimate reads; do not reuse a workspace-library membership query to discover project rows.
- Place the virtual `Project` root before `All Components` in folder mode. Its first children are `Express` and `Project-specific`.

Inclusion rules:

- Include rows with `metadata.expressComponent.kind = "express"`.
- Include rows with `link_state = "detached"`.
- Include rows that are unlinked but no longer blank placeholders.
- Exclude rows where `isBlankEstimateRowItem` would still classify the row as the Add row placeholder.
- Exclude `linked-overridden` rows for the first implementation. They remain customized library instances, not project-local components, until a product decision says otherwise.

This projection can be backed by a repository query or by the existing reusable-source outline collector, but Components tab display should be purpose-built enough to avoid showing entire templates/projects when the user expects components.

## Supabase Requirements

Official Supabase docs separate API grants from RLS: grants decide whether roles can reach tables/functions through the Data API, and RLS decides which rows those roles can access. They also recommend bundling grants with RLS setup in the same migration. Source: <https://supabase.com/docs/guides/api/securing-your-api>

Official Supabase RLS docs state that RLS should be enabled on tables in exposed schemas such as `public`; once RLS is enabled, API access requires policies. Source: <https://supabase.com/docs/guides/database/postgres/row-level-security>

Official Supabase Storage docs state that uploads require RLS policies on `storage.objects`; overwrites need additional `SELECT` and `UPDATE` permissions. Source: <https://supabase.com/docs/guides/storage/security/access-control>

Implications:

- No new table means no new Data API grants, RLS policies, or generated type surface.
- If image upload stores files in Supabase Storage, the implementation must use an existing bucket/policy or add storage policies deliberately.
- For the first implementation, optional image should be represented as an existing image URL/source value in `source_snapshot`; file upload is deferred unless storage bucket and RLS policy work is explicitly included.
- Current row update RPC behavior is per-top-level-key replace, not deep merge. If a patch omits `metadata` or `sourceSnapshot`, the existing value is preserved. Routine express field edits must omit both keys. Any operation that intentionally changes `metadata` or `source_snapshot` must first read the current values and send complete server-merged objects, or use a purpose-built RPC merge path. Do not let partial client patches overwrite tags, detach metadata, promotion provenance, or source evidence.
- The app-layer server merge route must widen the current row validation SELECT to include `metadata` and `source_snapshot`; otherwise it cannot safely merge JSON.
- If a future `project_components` table is added, the migration must include explicit grants, RLS, policies, typegen, and RPC audit/history boundaries.

## Live Provider Evidence

Read-only SQL against project `ebxxqidacheyapmmzavr` confirmed the current relevant tables have RLS enabled:

| Table | RLS | Relevant policies |
| --- | --- | --- |
| `estimate_row_items` | Enabled | `can_access_estimate` for reads, `can_edit_estimate` for writes |
| `cost_library_items` | Enabled | workspace member/editor/admin policies |
| `cost_library_item_price_options` | Enabled | workspace member read policy |
| `library_folders` | Enabled | workspace member/editor policies |

The plan therefore avoids new provider blast radius unless a later product decision expands scope to a reusable project-local component catalog.

## Open Product Fork

One fork remains material:

If users need to reuse a project-specific component across multiple estimates or rows without making it workspace-wide, then `estimate_row_items` alone is a projection, not a canonical catalog. That requirement would justify a new `project_components` aggregate or a `project_id`-scoped extension of the library component model before U6/U7 expand into reusable project-local behavior.

The current user request says the express component is "project specific only" and created directly in a row. That is satisfied by estimate-row scoped authoring plus a virtual Project folder projection.
