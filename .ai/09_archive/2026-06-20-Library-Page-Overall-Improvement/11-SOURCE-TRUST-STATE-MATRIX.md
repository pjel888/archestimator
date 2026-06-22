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
(`"success" | "warning" | "danger" | undefined`) for chip styling. Recency TEXT
comes from `getStalenessLabel(pricingDate?)` (`component-library/helpers.ts:675`,
returns `"<n>d ago" | "Recent" | null`) — it is a label, not a status, so never
say a freshness/status chip comes "via `getStalenessLabel`". See doc 19
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
(resolved in [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-001/C-021). Today
`getComponentPricingFreshness` only emits `fresh | stale | missing`, so a distinct
"very stale" status must be added there and the three 90-day constants extended
with a 180-day `longWindow` in lockstep — not diverged into a fourth source of
truth. Note `getStalenessTone` already returns `danger` past 180 days
(`helpers.ts:670`), so the TONE mapping is in place; the net-new work is the
status tier and its copy keys (`trust.very_stale.label`,
`trust.very_stale.tooltip`, `trust.very_stale.announcement` per doc 22), not the
tone. The table does NOT collapse; all four tiers ship for beta.

### Phase-2 helper-extension binding (Very stale)

The "Very stale" row is net-new code on an existing helper, not a config change.
Implement it as follows (no schema change — app-layer only):

| Step | Symbol / location | Change | Test |
| --- | --- | --- | --- |
| Status union | `ComponentPricingFreshness` (`component-facet-filter.tsx:17`) | add `"very_stale"` to the union (alongside `any\|fresh\|stale\|missing`) | jsdom |
| Status branch | `getComponentPricingFreshness(item, now)` (`component-facet-filter.tsx:61`) | add a 180-day branch returning `"very_stale"` past `longWindow`; the existing 90-day `stale` branch stays | jsdom |
| Window constant | `COMPONENT_FACET_STALE_DAYS = 90` (`component-facet-filter.tsx:12`) | introduce a sibling `COMPONENT_FACET_VERY_STALE_DAYS = 180` (or equivalent `longWindow`); the THREE 90-day sources below MUST stay in lockstep | jsdom |
| Insert confirmation | insert pickers / inspector insert action | "Require explicit confirmation before insert" reuses the existing `ConfirmDialog` from `ui/overlays/confirm-dialog.tsx` (per keystone — do NOT invent a new primitive), gated by `library_trust_chips` | jsdom + Playwright |
| Tone | `getStalenessTone(pricingDate?)` (`helpers.ts:667`) | already returns `danger` past 180 days (`helpers.ts:670`) — no change needed | jsdom |

Flag: `library_trust_chips` (per `21-FEATURE-FLAGS-AND-ROLLOUT.md`). Rollback:
redeploy flag=false (~5 min, fix-forward; runtime kill-switch is Phase-later per
C-010). Evidence: EV-BE-04.

## Confidence (derived label over free text)

`cost_library_items.confidence` is FREE-TEXT `string | null` today, NOT a stored
enum (doc 19 "Confidence and Freshness Models"). The UI derives a display
label/chip over whatever free text was entered; it must not assume a fixed set
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
| `in_production` | Being built / priced; not yet generally available. | Visible to editors, chipped "In production". | Allowed with an "In production" warning chip. |
| `available` | Usable for new estimates (the value the prior draft mislabeled "Active"). | Normal visibility for all roles. | Allowed. |
| `discontinued` | No longer offered; historical. | Visible only when referenced or explicitly filtered in. | Block by default; require explicit override to insert. |
| `archived` | Hidden from default browse; recoverable via `set_cost_library_component_lifecycle_state`. | Hidden by default; visible under an "Archived" filter. | Blocked. |

Tone tokens and chip copy for each lifecycle chip come from docs 23 / 22
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

### State transitions (testable)

These describe how a row moves between `link_state` values; the divergence
detection compares the live `cost_library_items` row against `source_snapshot`.
Each transition binds to a trigger symbol and a pass condition asserted in a test
(jsdom unless noted). Doc 18 owns the ADV rows; doc 24 owns the pre-registered
run.

| from | to | trigger (action / symbol) | pass condition (asserted `link_state`) | test type |
| --- | --- | --- | --- | --- |
| `unlinked` | `linked-clean` | insert from a library item — `listEstimateInsertTargets` / `resolveEstimateTemplateInsertTarget` stamps `source_library_item_id` + `source_snapshot` | `link_state === 'linked-clean'`, snapshot matches source | jsdom + Playwright |
| `linked-clean` | `linked-overridden` | user edits a linked row's local values away from the snapshot | `link_state === 'linked-overridden'` | jsdom |
| `linked-clean` / `linked-overridden` | `source-changed` | source library row's tracked fields change after the snapshot was taken (detected on read) | `link_state === 'source-changed'` | jsdom |
| `source-changed` | `linked-clean` | user accepts the change (snapshot refreshed to current source) with no local override | `link_state === 'linked-clean'`, snapshot re-matches source | jsdom |
| `source-changed` | `linked-overridden` | user keeps local values while the source has also moved | `link_state === 'linked-overridden'` | jsdom |
| any linked state | Missing source (derived) | source row is deleted (`source_library_item_id` stops resolving) | derived "missing source" UI; no stored enum change | jsdom |
| any linked state | `detached` | user deliberately severs the link (Missing-source can also be resolved by detaching) | `link_state === 'detached'` | jsdom |

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

| Rank | Winner | ADV row (doc 18/24) |
| --- | --- | --- |
| 1 | Missing source (derived) | `ADV-TEMPLATE-DEP` (source row removed) |
| 2 | Lifecycle `archived` / `discontinued` | `ADV-LIFECYCLE-INSERT` |
| 3 | Link `source-changed`, then `linked-overridden` | `ADV-SOURCE-CHANGED` |
| 4 | Lifecycle `draft` / `in_production` | `ADV-LIFECYCLE-INSERT` |
| 5 | Freshness Very stale -> Stale -> Missing date | Very stale -> net-new test under `EV-BE-04`; Stale/Missing under `EV-BE-03` |
| 6 | Confidence Low -> Missing -> passthrough | `EV-BE-04` |
| 7 | Healthy (no chip) | implicit in `ADV-LIFECYCLE-INSERT` happy path |

Precedence tests (jsdom): assert a row satisfying several ranks renders exactly
ONE primary chip — the highest rank wins — and secondary states appear only in
the inspector dock detail. Concretely: a `discontinued` item (rank 2) with a
stale price (rank 5) renders the discontinued chip inline, not a competing
freshness chip; a `source-changed` link (rank 3) on a `draft` item (rank 4)
renders source-changed. Flag: `library_trust_chips`.

### Transition + precedence test matrix (closes §3 "no test matrix for transitions + precedence")

Every transition row in §"State transitions" and every precedence rank pair in
§Precedence maps to a named jsdom test (run under `bun run test:dom` /
`vitest run tests/vitest/<file>` per C-005). Pass criteria pin the asserted
`link_state` / rendered-chip outcome so a regression that breaks the transition
or renders a competing chip fails the test. Flag: `library_trust_chips`.
Rollback: redeploy `flag=false` (~5 min, fix-forward per C-010).

| Suite | Test file | Rows covered | Pass criterion | Evidence |
| --- | --- | --- | --- | --- |
| Link-state transitions | `tests/vitest/library-trust-link-transitions.test.tsx` (Phase 0A net-new) | all 7 transition rows in §"State transitions" | each trigger produces the asserted `link_state`; "missing source" stays derived (no stored enum change); `detached` recoverable from "missing source" | EV-BE-03 |
| Precedence single-winner | `tests/vitest/library-trust-precedence.test.tsx` (Phase 0A net-new) | all 7 ranks in §Precedence | a row satisfying multiple ranks renders exactly ONE primary inline chip (highest rank wins); secondary states appear only in `ComponentInspectorDock.tsx` detail; the concrete `discontinued`+stale and `source-changed`+`draft` pairs pass | EV-BE-03 |
| Very-stale tier (Phase 2) | `tests/vitest/library-trust-very-stale.test.tsx` (Phase 2 net-new) | the `very_stale` row + its precedence rank-5 slot | `getComponentPricingFreshness` returns `"very_stale"` past 180 days (helper-layer extension); tone is `danger`; rank-5 precedence still resolves Very stale -> Stale -> Missing date correctly | EV-BE-04 |
| Confidence passthrough | `tests/vitest/library-trust-confidence-passthrough.test.tsx` (Phase 2 net-new) | confidence "Free text" + "Missing" rows | any unrecognized non-empty `confidence` renders a neutral "Confidence: \<value\>" chip (not discarded); `null`/empty renders the missing treatment | EV-BE-04 |
| Sanitizer on public snapshot (cross-ref doc 14) | `tests/vitest/share-snapshot-redaction.test.tsx` (Phase 0A net-new) | Public Exposure Rule field list | generated `snapshot_json` fixture contains none of `pricing_source` / `supplier` / `brand` / `confidence` / the derived trust label | ADV-PUBLIC-REDACTION |

## Threshold-change Flag and Rollback (closes §3 "no flag/rollback for threshold changes")

A threshold change (the 90-day `stale` window, the 180-day `very stale` window,
or any future long-window constant) is gated by the `library_trust_chips` flag
and carries an explicit rollback so a misjudged threshold cannot ship without a
fix-forward path. The flag gates the RENDER of trust chips (and therefore the
visible effect of any threshold change); the constants themselves are not
independently flag-gated, but their lockstep edit rule below is the safety rail.

| Threshold | Location | Phase | Flag | Rollback |
| --- | --- | --- | --- | --- |
| 90-day `stale` window | `COMPONENT_FACET_STALE_DAYS = 90` (`component-facet-filter.tsx:12`) + `LIBRARY_OVERVIEW_STALE_PRICING_DAYS = 90` (`component-library-repository.ts:827`) + `"prices older than 90 days"` string (`LibraryOverview.tsx:114`) | 2 | `library_trust_chips` | redeploy `flag=false` (~5 min, C-010) hides ALL trust chips; revert the three constants in lockstep if the window itself was misjudged |
| 180-day `very stale` window (net-new) | new `COMPONENT_FACET_VERY_STALE_DAYS = 180` sibling constant + `getComponentPricingFreshness` branch (`component-facet-filter.tsx:61`) + `getStalenessTone` (`helpers.ts:667`, already returns `danger` past 180 at `:670`) | 2 | `library_trust_chips` | redeploy `flag=false` (hides the new tier); the existing 3-tier `fresh/stale/missing` helper return stays valid as the fallback |

**Lockstep rule:** any threshold edit MUST update all THREE 90-day sources (or
both 90+180 sources for `very stale`) plus their tests and copy keys in one
atomic change; a partial edit is a build-time break, not a silent regression.
The flag rollback is the runtime kill-switch; the constant revert is the
permanent fix.

## Localization Strategy for Trust Copy (closes §3 "no localization strategy")

Trust copy is **i18n-key-based**, not hardcoded. Every chip label, tooltip, and
assertive announcement resolves to a copy key in
`22-COPY-DECK-AND-MICROCOPY.md` (`trust.*`, `lifecycle.*`, `link.*`) and a tone
token in `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md`; this matrix never hardcodes a
user-facing string, so a locale switch needs no schema change. The full
i18n/RTL contract lives in `28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md`; this
section binds it to trust chips specifically.

| i18n concern (doc 28) | Trust-chip rule | Phase |
| --- | --- | --- |
| ICU MessageFormat interpolation | trust copy uses ICU only for the `trust.freshness.stale` recency label (`"{days}d ago"`, doc 22) and the public-snapshot verification line (`trust.public_snapshot.label` = "Snapshot verified on {date}", C-012); all other trust keys are static literals | 2 |
| Pluralization | the singular/plural "price older than 90 days" / "prices older than 90 days" form is already ICU-pluralized at `LibraryOverview.tsx:114`; the `very_stale` tier inherits the same plural form via its copy key | 2 |
| RTL chip layout | trust chips render as inline-flex soft-fill spans (no `backdrop-filter`, per doc 35 §4.3); in RTL locales the chip's leading icon flips via the existing `dir`-aware icon utility — no chip-specific RTL work | 2 |
| Tone token RTL safety | tone tokens (`success`/`warning`/`danger`/`neutral`) are color-only, not directional; they are RTL-safe by construction | 2 |
| Date/number formatting | `pricing_date` recency is formatted via the existing `Intl.RelativeTimeFormat`-based helper; trust copy keys never inline a formatted date/number — they receive it as an ICU arg | 2 |

Trust copy is locale-safe by construction: a future locale addition needs only
new entries in the copy catalog (doc 22) under the existing `trust.*` keys — no
schema change, no helper change, no tone-token change.

## Trust-chip Telemetry (closes §3 "no telemetry for trust impressions/decisions")

Trust telemetry is **coarse and per-surface, not per-row**, to avoid per-row
event volume and to stay privacy-safe. Two exposure events are already defined
in `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` §6; this section adds the
insert-gate DECISION events (Phase 2) and the very-stale confirmation event.
Sink = `console.warn` for closed beta (C-009); prod sink Phase-later.

| Event (doc 20) | Trigger | Payload (privacy-safe) | Phase | Evidence |
| --- | --- | --- | --- | --- |
| `trust_chip_rendered` | first render-per-surface of a trust chip on overview/recent/template rows + inspector + insert | `workspaceId`, `surface`, `kind`, `freshness`, `hasConfidenceLabel`, `sampled: true` | 2 | EV-BE-04 |
| `trust_chip_unclassified` | first render-per-surface where freshness is `missing` AND `hasConfidenceLabel` is false | `workspaceId`, `surface`, `kind` | 2 | EV-BE-04 |
| `trust_insert_gate_warned` | an insert action surfaces a rank-2/3/4/5/6 warning chip before confirmation | `workspaceId`, `surface`, `kind`, `freshness`, `lifecycleState`, `linkState` | 2 | EV-BE-04 |
| `trust_insert_gate_confirmed` | user proceeds with insert despite a warning chip (e.g. `discontinued` override, `very stale` confirmation) | `workspaceId`, `surface`, `kind`, `freshness`, `lifecycleState`, `linkState` | 2 | EV-BE-04 |
| `trust_insert_gate_blocked` | insert is hard-blocked (rank-1 "missing source", rank-2 `archived`) and the action is disabled | `workspaceId`, `surface`, `kind`, `blockReason` | 2 | EV-BE-04 |

`hasConfidenceLabel` is a boolean over free-text `confidence` presence
(non-null, non-empty after trim) — the raw `confidence` string is NEVER emitted.
Denominator for the "Trust classification 90%+" metric =
`rendered / (rendered + unclassified)` over that exact definition (Phase 2).
Insert-gate DECISIONS surface as `trust_insert_gate_*` events here, distinct
from the resolver-level `insert_target_confirmed` / `insert_target_mismatch`
events in doc 20 (those fire on the insert-target resolver, not the trust
gate).

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

Binding + test contract: the snapshot builder lives in
`src/lib/.../activity-helpers.ts` (per keystone "Public / Share Snapshot Surface"
and doc 14's snapshot field-selection audit). The public snapshot shows only the
frozen label `trust.public_snapshot.label` = "Snapshot verified on {date}" (doc
22, C-012) — trust chips are REDACTED from public/shared snapshots, live
workspace only. Test: an assertion that a generated `snapshot_json` fixture
contains none of `pricing_source` / `supplier` / `brand` / `confidence` / the
derived trust label. ADV row: `ADV-PUBLIC-REDACTION` (doc 24 Phase 0A).

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

### Trust-chip exposure telemetry

Trust impressions are coarse and per-surface, not per-row. The full event set
(exposure + insert-gate decisions) is in the **Trust-chip Telemetry** section
below; this block is retained only to flag that exposure telemetry lands in
Phase 2 with the first trust-chip render, under flag `library_trust_chips`
(evidence `EV-BE-04`).

### Localize-ready copy-key guidance

Every chip label/tooltip resolves to a copy key in doc 22 (`trust.*`,
`lifecycle.*`, `link.*`) and a tone token in doc 23; this matrix never hardcodes
a user-facing string. The `very_stale` tier ships the three new keys
(`trust.very_stale.label` / `.tooltip` / `.announcement`) registered in doc 22
§8 — they are i18n-key-based (source: doc 28) so a locale switch needs no schema
change. Canonical term is **chip** (not badge) per C-002.
