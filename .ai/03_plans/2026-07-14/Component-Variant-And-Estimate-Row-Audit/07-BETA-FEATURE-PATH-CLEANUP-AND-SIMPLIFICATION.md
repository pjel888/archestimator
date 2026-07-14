# Beta Feature Path Cleanup And Simplification

## Decision

Archestimator is pre-release beta software. This pack does not preserve hypothetical released clients or maintain multiple generations of the same feature. Implementation uses direct replacement, deletion, and fix-forward cleanup.

“Prevent regression” in this pack means **do not break a current beta invariant while repairing another one**. It does not mean backward compatibility, long-lived adapters, versioned public APIs, feature-flag rollout, or parallel V1/V2 product implementations.

## User-Facing Version Language

The current `V1`, `V2`, `V3` modal labels describe variants, not released application versions, but the wording is unnecessarily ambiguous.

Required cleanup:

- first variant default label: `Default`;
- later generated labels: `Option 2`, `Option 3`, or a user-entered name;
- compact row/rail presentation may use neutral ordinals `1`, `2`, `3` while preserving the full accessible label;
- stable UUIDs, not labels or positions, remain the variant identity.

Do not remove internal component version numbers, row revisions, issue revisions/content hashes, D1 migration numbers, or Cloudflare Durable Object migration tags. Those protect atomicity and operational ordering; they are not product-release compatibility layers.

## One Authority Per Concern

| Concern | Keep | Delete/replace |
| --- | --- | --- |
| advanced component create/edit | full `AddComponentModal` interaction, renamed as the canonical Add/Edit Component surface if useful | `EditComponentDrawer` and its flat mutation semantics |
| component mutation input | one canonical component + ordered variant graph contract | `fieldContract: "opendesign-add-component"` sanitizer branch and dual shapes |
| Library update | one option-aware atomic graph mutation used by modal and inline fast path | competing flat/full fan-out behavior |
| Project update | one project-scoped component/variant propagation contract | treating the first/initiating row as implicit master/default |
| duplicate | one full-detail duplicate action with fresh IDs | sidebar/inspector divergence and label-based ID matching |
| local catalogue state | current unversioned key or server-backed options | `archestimator:add-component-catalogue-options:v1` compatibility naming/parsers |
| component images | current R2 descriptor ownership | legacy Supabase public-path adapter after a data audit proves no live dependency |
| source classification | one canonical Library/Project/unlinked model | stale fallback classifications after current rows are normalized |
| shared/client review | one current Client Portal/issued-page authority selected by the active review plan | parallel legacy publication behavior after supersession proof |
| lifecycle/link state | the minimum states required by real row behavior | transitional states/fallbacks that have no remaining producer/consumer |

## Cleanup Audit Targets

### Immediate deletion targets

These are safe to remove as part of the relevant implementation unit after callers are redirected:

1. `src/components/workshop/library/EditComponentDrawer.tsx` and its dynamic import/mount.
2. The OpenDesign-specific `fieldContract` branch and `sanitizeOpenDesignAddComponentPriceOption()` once the canonical input is active.
3. Flat inspector duplicate logic after it calls the canonical detail duplicate action.
4. User-facing generated `V1`/`V2` labels and versioned localStorage key naming.
5. optimistic label-based option-ID reconciliation after authoritative read-back exists.

### Proof-gated deletion targets

Delete only after a current-data/source query proves no live dependency:

- legacy Supabase component image public-path conversion/backfill helpers;
- inferred brand/supplier/template fallbacks that mask missing D1 data;
- `legacyAdjustmentPercentage` conversion after old row shapes are normalized;
- transitional `source-changed` behavior if no current producer requires it;
- legacy shared-publication routes once the Client Portal/issued flow is the sole active authority;
- feature flags whose beta path is permanently enabled and whose off-path is no longer supported.

Proof-gated does not mean compatibility is retained indefinitely. It means delete the old data/path immediately after the bounded cleanup proves deletion safe.

## Feature Path Cleanup Sequence

### Phase 1 — Make one path authoritative

1. Redirect every advanced editor to the full Add/Edit modal.
2. Introduce one component/variant mutation input and one authoritative detail result.
3. Make Library and Project fan-out option-aware.
4. Keep existing UI layout and compact row controls.

### Phase 2 — Repair current data

1. audit invalid defaults/current costs/attachment bindings;
2. normalize Project component option graphs;
3. repair Library-linked rows with missing/inactive selected options through an explicit deterministic rule;
4. rebuild attachment relations; and
5. remove unclaimed component uploads after the grace period.

### Phase 3 — Delete superseded code

1. remove the drawer and duplicate mutation implementations;
2. remove the OpenDesign field-contract branch;
3. remove label-based reconciliation and stale optimistic shapes;
4. remove versioned local UI terminology/keys without a compatibility parser; and
5. remove proof-cleared legacy image/fallback/share code.

### Phase 4 — Verify the single path

Use source/static/D1 evidence to prove:

- one advanced editor;
- one Library graph mutation;
- one Project propagation contract;
- one duplicate path;
- one variant selection identity rule;
- one attachment ownership chain; and
- no remaining import/caller of deleted paths.

## No-Compatibility Rules For Implementers

- Do not add `ComponentModalV2`, `variantSchemaV2`, `/api/v2`, or similar replacement naming.
- Do not preserve the drawer behind a feature flag.
- Do not dual-write old and new variant fields.
- Do not add adapters for hypothetical released clients.
- Do not keep fallback reads after the current data is migrated and verified.
- Do not create a Project Component master table merely to avoid fixing the existing row-backed identity contract.
- Do not turn acceptance scenarios into a broad regression suite without a user-authorized test task.

## Necessary Internal Revisions To Keep

| Mechanism | Why it stays |
| --- | --- |
| `current_version_number` | guards concurrent component graph updates and provides history ordering |
| `row_revision` | guards concurrent row/component-instance writes |
| component usage fingerprint | detects fan-out membership changes while an editor is open |
| issue revision/content hash | ensures immutable published-review receipts and deterministic no-op behavior |
| D1 migration ordering | safely applies current schema transitions |
| Durable Object migration tags | Cloudflare class migration state |

These mechanisms should have plain product copy. Users do not need to see implementation version language.

## Cleanup Requirements

### `OPS-001` — Direct beta replacement

Every relevant unit deletes the path it supersedes in the same coherent change. A temporary bridge is allowed only inside one atomic migration/change and is removed before the unit is complete.

### No unresolved duplicate authorities

Completion audit fails if two editors, two mutation contracts, two duplicate behaviors, or two active selected-variant fan-out rules remain.

### Current data, not hypothetical clients, controls cleanup

Data queries may require a one-time fix-forward repair. They do not justify permanent compatibility code.

## Stop Condition

Cleanup is complete when all implementation requirements are met through one current feature path, all superseded callers/code are removed, current D1/R2 data is valid under the target contract, and the completion audit lists no compatibility-only artifact. No product test or browser proof is required unless the user separately authorizes a test task.
