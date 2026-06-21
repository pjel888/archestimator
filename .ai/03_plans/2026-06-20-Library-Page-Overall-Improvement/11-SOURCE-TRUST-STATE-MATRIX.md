# 11 - Source Trust State Matrix

## Purpose

Source trust tells users whether a reusable cost item is safe to reuse, needs
review, or must be blocked from new work. It appears near price and insertion
actions, not hidden in advanced metadata.

This matrix is consumed by Phase 2 (Source Trust at Decision Points): trust chips
on overview / recent / template rows + the inspector dock + insert pickers,
bound to real columns and helpers. Every state below binds to a verified column,
enum, or helper in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (the
keystone); do not restate the full binding lists here. Tone tokens resolve via
`23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` and copy via
`22-COPY-DECK-AND-MICROCOPY.md`.

Migration boundary: only TWO trust cues are migration-gated (doc 19 Data Layer) —
a real `last_reviewed` / `reviewed_at` timestamp (does NOT exist on
`cost_library_items` or `estimate_templates`) and a controlled-vocabulary
`confidence` (today free text). Everything else in this matrix derives from
existing columns, so Phase 2 needs no schema change.

## Freshness States

Freshness is derived from `cost_library_items.pricing_date` (date | null). Reuse
the existing helpers, do not invent new logic, and keep the two return shapes
distinct: `getComponentPricingFreshness(item, now)`
(`component-facet-filter.tsx:61`) returns a STATUS
(`"fresh" | "stale" | "missing"`), while `getStalenessTone(pricingDate?)`
(`component-library/helpers.ts:667`) returns a TONE
(`"success" | "warning" | "danger" | undefined`) for badge styling. Recency TEXT
comes from `getStalenessLabel(pricingDate?)` (`component-library/helpers.ts:675`,
returns `"<n>d ago" | "Recent" | null`) — it is a label, not a status, so never
say a freshness/status badge comes "via `getStalenessLabel`". See doc 19
"Confidence and Freshness Models" for the full helper binding.

Tone tokens map to design-system semantic tokens via `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md`;
chip copy comes from `22-COPY-DECK-AND-MICROCOPY.md`. Do not hardcode labels here.

| State | Rule (helper output) | Tone token (doc 23) | Copy key (doc 22) | Insert Behavior |
| --- | --- | --- | --- | --- |
| Fresh | `getComponentPricingFreshness` -> `"fresh"` (`pricing_date` within 90 days). | `success` | `trust.freshness.fresh` | Allowed. |
| Stale | `getComponentPricingFreshness` -> `"stale"` (`pricing_date` aged past `COMPONENT_FACET_STALE_DAYS = 90`). | `warning` | `trust.freshness.stale` | Allowed with warning chip. |
| Very stale (net-new) | `pricing_date` aged past a 180-day tier surfaced as its own state. Net-new at the status layer — see threshold note below. | `danger` | `trust.freshness.veryStale` | Require explicit confirmation before insert. |
| Missing date | `getComponentPricingFreshness` -> `"missing"` (`pricing_date` is null). | `warning` | `trust.freshness.missingDate` | Allowed for draft/internal use with warning chip. |

The "Unknown / legacy cannot compute" row is removed: when `pricing_date` is
null the helper already returns `"missing"`, so there is no separate unknown
state. There is no `last_reviewed` column to fall back on (doc 19 Data Layer);
use `updated_at` only as a "last touched" cue, never as a freshness input.

The 90-day window lives in THREE places that must change together (doc 19):
`COMPONENT_FACET_STALE_DAYS = 90` (`component-facet-filter.tsx:12`),
`LIBRARY_OVERVIEW_STALE_PRICING_DAYS = 90`
(`component-library-repository.ts:827`), and the hardcoded
`"prices older than 90 days"` UI string (`LibraryOverview.tsx:114`). Any threshold
change must update all three plus their tests and copy together.

The "Very stale" 180-day tier is **beta scope** as a fourth freshness STATUS
(resolved in [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-001). Today
`getComponentPricingFreshness` only emits `fresh | stale | missing`, so a distinct
"very stale" status must be added there and the three 90-day constants extended
with a 180-day `longWindow` in lockstep — not diverged into a fourth source of
truth. Note `getStalenessTone` already returns `danger` past 180 days
(`helpers.ts:670`), so the TONE mapping is in place; the net-new work is the
status tier and its copy keys (`trust.very_stale.label`,
`trust.very_stale.tooltip`, `trust.very_stale.announcement` per doc 22), not the
tone. The table does NOT collapse; all four tiers ship for beta.

## Confidence (derived label over free text)

`cost_library_items.confidence` is FREE-TEXT `string | null` today, NOT a stored
enum (doc 19 "Confidence and Freshness Models"). The UI derives a display
label/badge over whatever free text was entered; it must not assume a fixed set
of values. A controlled vocabulary (enum or CHECK constraint) would require a
migration and is DEFERRED behind the Data Migration Gate.

Phase 2/3 trust chips render over the free text as follows: normalize the string
(trim + lowercase), then map known tokens to a tone; any unrecognized non-empty
string renders as a neutral "Confidence: <value>" chip rather than being
discarded. `null` / empty renders as the "missing" treatment. The mapping table
is illustrative, not a schema — it lives in code as a lookup, not in the
database.

| Derived tier (doc 22) | Source free-text (illustrative match) | Tone token (doc 23) | Copy key (doc 22) |
| --- | --- | --- | --- |
| High (verified/trusted text) | `"high"`, `"verified"`, trusted internal source strings. | `success` | `trust.confidence.high` |
| Medium (plausible text) | `"medium"`, plausible-but-unverified strings. | `neutral` | `trust.confidence.medium` |
| Low (uncertain text) | `"low"`, user-entered / uncertain strings. | `warning` | `trust.confidence.low` |
| Free text (unrecognized) | any other non-empty free-text value. | `neutral` | `trust.confidence.passthrough` |
| Missing (null/empty) | `null` or empty string. | `warning` | `trust.confidence.missing` |

Confidence is not a substitute for freshness: a high-confidence old price is
still stale (freshness derives independently from `pricing_date`). Insert is
never hard-blocked on confidence alone — at most a warning chip; lifecycle and
source-changed precedence (below) own any blocking.

## Lifecycle States

Bind to the real enum `component_lifecycle_state` — five values:
`draft | in_production | available | discontinued | archived` (doc 19 "Enums").
State changes go through `changeCostLibraryComponentLifecycleState` ->
`set_cost_library_component_lifecycle_state` RPC.
`lifecycle_state_changed_at` records when. "Deleted" is NOT an enum value: it is
a row-removal / not-listed recovery UI concept (the row is gone, surfaced only
via the Missing-source derived state below), so it is defined under Link/Snapshot,
not here. Editor vs viewer gating uses `is_workspace_editor` (role in
`owner | admin | member`; only `viewer` is read-only).

| Enum value | Meaning | Browse Behavior | Insert Behavior |
| --- | --- | --- | --- |
| `draft` | Incomplete / work-in-progress, not yet usable. | Visible to editors (`is_workspace_editor`); hidden from `viewer` browse by default. | Hidden from insert pickers; warn if surfaced. |
| `in_production` | Being built / priced; not yet generally available. | Visible to editors, badged "In production". | Allowed with an "In production" warning chip. |
| `available` | Usable for new estimates (the value the prior draft mislabeled "Active"). | Normal visibility for all roles. | Allowed. |
| `discontinued` | No longer offered; historical. | Visible only when referenced or explicitly filtered in. | Block by default; require explicit override to insert. |
| `archived` | Hidden from default browse; recoverable via `set_cost_library_component_lifecycle_state`. | Hidden by default; visible under an "Archived" filter. | Blocked. |

Tone tokens and chip copy for each lifecycle badge come from docs 23 / 22
(`trust.lifecycle.<value>`), not hardcoded here.

## Link/Snapshot States

Bind to the real enum `estimate_row_link_state` — five values:
`unlinked | linked-clean | linked-overridden | detached | source-changed`
(doc 19 "Enums"). This column lives on both `estimate_row_items` and
`estimate_template_row_items`, alongside `source_library_item_id` (FK) and
`source_snapshot` (Json). Per the glossary, use "source-changed" for link/snapshot
divergence and reserve "stale" for PRICING freshness only.

"Missing source" is a DERIVED UI state, not an enum value: it is computed when
`source_library_item_id` no longer resolves to a live `cost_library_items` row
(row-removal / deleted), regardless of stored `link_state`.

| Enum value (or derived) | Meaning | Required User Signal |
| --- | --- | --- |
| `unlinked` | Row has no `source_library_item_id`; freestanding estimate row. | None; no trust chip. |
| `linked-clean` | Linked, values match the source snapshot. | Show source link and update availability. |
| `linked-overridden` | Linked, but row has local values that differ from the source. | Show local-override state; do not auto-overwrite. |
| `detached` | Deliberately severed from the source. | Show detached state and offer reconnect if a matching source exists. |
| `source-changed` | Source `cost_library_items` row changed after the snapshot. | Show changed-fields review before update/reuse. |
| Missing source (derived) | `source_library_item_id` does not resolve to a live row (deleted). | Show missing-source warning and recovery (re-link / detach) options. |

### State transitions

These describe how a row moves between `link_state` values; the divergence
detection compares the live `cost_library_items` row against `source_snapshot`.

- `unlinked` -> `linked-clean`: row is inserted from a library item (insert
  resolvers `listEstimateInsertTargets` / `resolveEstimateTemplateInsertTarget`
  stamp `source_library_item_id` + `source_snapshot`).
- `linked-clean` -> `linked-overridden`: user edits a linked row's local values
  away from the snapshot.
- `linked-clean` / `linked-overridden` -> `source-changed`: the source library
  row's tracked fields change after the snapshot was taken (detected on read).
- `source-changed` -> `linked-clean`: user accepts the change (snapshot
  refreshed to current source) with no local override.
- `source-changed` -> `linked-overridden`: user keeps local values while the
  source has also moved.
- any linked state -> Missing source (derived): the source row is deleted
  (`source_library_item_id` stops resolving).
- any linked state -> `detached`: user deliberately severs the link;
  Missing-source can also be resolved by detaching.

## Precedence (single winner)

A row can satisfy several trust states at once (e.g. a `discontinued` item with
a `source-changed` link and a stale price). Render at most ONE primary trust chip
per row — the highest-priority state in the ordered list below wins. Secondary
states surface in the inspector dock detail (`ComponentInspectorDock.tsx`), not
as competing inline chips. This precedence is a single ordered constant in code
so overview rows, recent rows, template rows, and the inspector all agree.

1. Missing source (derived) — `source_library_item_id` does not resolve.
2. Lifecycle `archived` or `discontinued` (blocked / override-required on insert).
3. Link `source-changed`, then `linked-overridden`.
4. Lifecycle `draft` or `in_production` (insert-gated).
5. Freshness: Very stale (180-day, if adopted) -> Stale -> Missing date.
6. Confidence: Low -> Missing -> Unrecognized passthrough.
7. Healthy: `available` + Fresh + `linked-clean` -> no chip (or a subtle
   trusted affordance only).

Permission is enforced upstream by RLS / `is_workspace_editor`, not as a trust
chip: a `viewer` simply does not see editor-only browse rows or insert actions,
so "permission denied" is a route/empty-state concern, not a precedence rank.

## Public Exposure Rule

Protected Library surfaces (gated by `is_workspace_member` RLS) can show internal
trust details. The live public surface is `src/app/share/[token]` +
`src/app/api/share/[token]/route.ts`, which renders a FROZEN snapshot from
`project_publications.snapshot_json` (versioned by `snapshot_version`), NOT a live
Library query (doc 19 "Public / Share Snapshot Surface"). Therefore the exposure
rule is a constraint on what the snapshot BUILDER puts into `snapshot_json`
(per `activity-helpers.ts`), not on a live library endpoint. The trust fields
below must be excluded from `snapshot_json` at build time; see
`14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` for the snapshot field-selection audit.

Fields that must NOT be written into `snapshot_json`:

- `pricing_source` (the "source URL" free text)
- `supplier` / `brand` internal notes
- the derived internal confidence label (over free-text `confidence`)
- `cost_library_item_price_history` (workspace-scoped) rows
- provider evidence attachments (`thumbnail_path` / attachment graph)

## Copy Guidelines

All chip strings are owned by `22-COPY-DECK-AND-MICROCOPY.md` under the
`trust.*` keys referenced in the tables above (e.g. `trust.freshness.stale`,
`trust.confidence.low`, `trust.lifecycle.discontinued`,
`trust.link.sourceChanged`). Do not hardcode trust copy in components; bind to
the copy deck so wording changes in one place.

Use plain labels that state the issue, mapped to the canonical states:

- `trust.freshness.stale` -> "Price stale"
- `trust.link.missingSource` -> "Source missing"
- `trust.confidence.low` -> "Low confidence"
- `trust.link.sourceChanged` -> "Source changed"
- `trust.link.overridden` -> "Local override"
- `trust.lifecycle.discontinued` -> "Discontinued"
- `trust.lifecycle.archived` -> "Archived"

Avoid vague labels like "Needs attention" unless paired with specific detail.
Per the glossary, never call link/snapshot divergence "stale" — that word is
reserved for pricing freshness.
