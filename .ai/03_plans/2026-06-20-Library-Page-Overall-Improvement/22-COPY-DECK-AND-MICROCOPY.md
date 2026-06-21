# 22 - Copy Deck And Microcopy

## Purpose

Every user-facing string for the Library work, in one authoritative place, so an
implementer copies rather than invents. Copy is otherwise scattered across
`10-LIBRARY-SURFACE-SPECS.md`, `11-SOURCE-TRUST-STATE-MATRIX.md`, and
`15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` as requirements plus a few examples.
This deck consolidates those into final strings and resolves the bulk-archive
copy conflict.

Authoritative names come from `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`
(CANON). All lifecycle, link, and freshness terms here align to the CANON
glossary; do not reintroduce the older `11` taxonomy ("Active", "Deleted",
"High/Medium/Low" confidence enum).

## Copy Rules

- Plain professional copy. State the issue, then the fix.
- Destructive copy names the object and the consequence.
- Reversible actions never say "cannot be undone".
- Archive, delete, hide, and detach use distinct copy.
- Confirm verbs match the domain action (Archive, Delete, Discard).
- No bare "Something went wrong" without a concrete next step.
- Helper copy stays short enough for a compact workspace.
- WCAG: meta/trust text must not rely on `#7F7F7F` (token `tertiary`) for
  load-bearing meaning — it fails AA. Use `secondary` (`#5D5D5D`) for any badge
  label, validation message, or consequence line that the user must read.
  `tertiary` is allowed only for non-load-bearing decoration. See
  `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md`.
- `tone` columns name design tokens (`secondary`/`success`/`warning`/`danger`),
  not raw hex. Map per `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md`.

## Folder Create / Rename Dialog

Surface: text-prompt dialog (inline `ConfirmDialog` + child `<input>` pattern
from `TemplatesBrowseManager.tsx`, NOT a standalone primitive). Replaces
`ComponentLibraryManager.tsx` `window.prompt("Folder name")` at create and
rename. Lands in Phase 0B. The same dialog in `component-library/index.tsx`
(`window.prompt` at the estimate-page panel) is the Phase-later follow-up listed
in `03-MODALS-POPOVERS-AND-OVERLAYS.md`.

| Slot | Create | Rename |
| --- | --- | --- |
| Dialog title | New folder | Rename folder |
| Field label | Folder name | Folder name |
| Field placeholder | e.g. Exterior finishes | (none — prefilled with current name) |
| Primary button | Create folder | Save name |
| Cancel button | Cancel | Cancel |
| Empty-field validation | Enter a folder name. | Enter a folder name. |
| Unchanged-name (rename) | n/a | Name is unchanged. |
| Length validation | Use 80 characters or fewer. | Use 80 characters or fewer. |
| Duplicate name (client) | A folder named "{name}" already exists here. | A folder named "{name}" already exists here. |

Server-error strings (returned distinctly per `13-DATA-CONTRACTS-ROUTE-CACHE.md`
Server Action Contract; backed by `createLibraryFolder` / `renameLibraryFolder`).
Errors keep the dialog open with the typed value intact:

| Condition | Message |
| --- | --- |
| Permission denied (viewer) | You do not have permission to change folders in this workspace. |
| Duplicate (server) | A folder with that name already exists. Choose another name. |
| Concurrent change | This folder changed in another session. Close and reopen to see the latest. |
| Network/database | Could not save the folder. Check your connection and try again. |

Existing inline status copy in `ComponentLibraryManager.tsx` is retained and
aligned: "Creating folder...", "Folder created.", "Renaming folder...",
"Folder renamed." Replace the catch-all "Could not create folder." /
"Could not rename folder." only where a more specific case above applies.

## Folder Delete Dialog

Surface: destructive `ConfirmDialog` (`role="alertdialog"`). Replaces
`window.confirm("Delete \"{name}\"? Row items assigned to it will stay...")` in
`ComponentLibraryManager.tsx`. Folder delete is reversible only in the sense that
components survive — the FOLDER is removed, so this is destructive copy, but it
must NOT imply components are lost. Folder is `libraryFolderId`; components keep
their `category` (the two axes are distinct — never conflate per CANON glossary).

| Slot | Copy |
| --- | --- |
| Title | Delete folder? |
| Body (with components) | Delete "{name}"? Its {n} components stay in the library and lose this folder. |
| Body (empty folder) | Delete "{name}"? This folder is empty. |
| Body (subfolders present) | Delete "{name}"? Its {n} components and {m} subfolders move out of this folder; nothing is deleted from the library. |
| Primary button | Delete folder |
| Cancel button | Keep folder |
| Concurrent-change error | This folder changed in another session. Close and reopen before deleting. |
| Permission denied | You do not have permission to delete folders in this workspace. |

Component-count phrasing: singular "1 component", plural "{n} components". Never
say "permanently" or "cannot be undone" — the components are not destroyed.

## Add Component Dirty-Discard Confirm

Surface: design-system `ConfirmDialog`. Replaces `AddComponentModal.tsx`
`window.confirm("Discard this component draft?")` at line ~963. Lands in
Phase 0B. Distinct from delete copy: a draft was never saved, so "discard", not
"delete".

| Slot | Copy |
| --- | --- |
| Title | Discard this draft? |
| Body | You have unsaved changes to this component. They are lost if you leave. |
| Primary button (destructive) | Discard draft |
| Cancel button | Keep editing |

Pre-confirm guard (already present, keep): if an upload is in flight, do not show
the discard dialog — show the existing inline message "Wait for uploads to finish
before closing." If not dirty, close silently.

## Bulk Archive vs Delete (resolves P2.3)

Surface: `BulkDestructivePreviewModal.tsx`. The current code sets
`confirmationHint` gated on `canExecute`
(`BulkDestructivePreviewModal.tsx:107-108`: the `confirmationHint` assignment at
`:107`, the string "This action cannot be undone." at `:108`), so it reads "This
action cannot be undone." for BOTH archive and delete — which is wrong for
archive (reversible via `changeCostLibraryComponentLifecycleState` back out of
`archived`). The modal already computes `actionCopy` with a `verb` field
(`archive` | `delete`, lines 48/50). The fix branches the `:107`
`confirmationHint` on `actionCopy.verb`, NOT on `canExecute`, so archive shows
reversible/restorable copy and only delete shows the irreversible line.

Archive path (`executeBulkArchiveLibraryComponents`, reversible):

| Slot | Copy |
| --- | --- |
| Title | Archive {n} components? |
| Lead (this-will) | This will archive {n} components. |
| Lead (single) | This will archive this component. |
| Confirmation hint | Archived components are hidden from browse and blocked from new inserts. You can restore them later. |
| Execute button | Archive components |
| Cancel button | Cancel |
| Ready status | Ready to archive |
| Blocked status | Cannot archive yet |
| Partial-blocker line | Only the {n} components marked ready will be archived. |

Delete path (irreversible, if/when a delete variant exists):

| Slot | Copy |
| --- | --- |
| Title | Delete {n} components? |
| Lead (this-will) | This will delete {n} components. |
| Confirmation hint | This permanently removes {n} components from the library. This cannot be undone. |
| Execute button | Delete components |
| Cancel button | Cancel |
| Type-to-confirm prompt | Type {requiredPhrase} to confirm |

The existing `statusMessage` / `actionBlocked` strings (e.g. "Resolve the item
below before {gerund} ...", "Archestimator is checking the selected work.") stay
as-is; only `confirmationHint` re-branches.

## Trust Badge Labels And Tooltips

One label per canonical state. Labels are `secondary`/tone tokens, never
`tertiary`. Badges that gate an action carry an accessible name on the focusable
row/card/inspector (per `03` Screen Reader addendum). Use the term "source
changed" for link drift and "stale" only for pricing freshness (CANON glossary).

### Freshness (derived from `pricing_date`; helpers `getComponentPricingFreshness`, `getStalenessTone`/`getStalenessLabel`)

The 90-day window is `COMPONENT_FACET_STALE_DAYS` / `LIBRARY_OVERVIEW_STALE_PRICING_DAYS`.
A 180-day "Very stale" tier is NEW and must EXTEND these constants together (do
not diverge) — gate it behind the freshness flag in
`21-FEATURE-FLAGS-AND-ROLLOUT.md`.

| State | Badge label | Tone | Tooltip |
| --- | --- | --- | --- |
| Current | Current | success | Priced within the last {window} days. |
| Stale | Stale price | warning | Priced more than {window} days ago. Review before reuse. |
| Very stale | Very stale | danger | Priced over {longWindow} days ago. Confirm the price before inserting. |
| Missing date | No price date | secondary | No pricing date recorded. Add one to track freshness. |
| Unknown | Freshness unknown | secondary | Freshness cannot be computed for this item. |

### Confidence (free-text `confidence` column, string|null — UI derives a label; no enum)

Confidence is free text today; a controlled vocabulary is DEFERRED (CANON). The
UI maps recognized values to tiers and shows unrecognized free text verbatim as
a neutral label. Do not present these as a fixed enum.

| Derived tier | Badge label | Tone | Tooltip |
| --- | --- | --- | --- |
| High (verified/trusted text) | Verified source | success | Marked as a verified or trusted source. |
| Medium (plausible text) | Likely source | secondary | Plausible but not fully verified. |
| Low (uncertain text) | Low confidence | warning | User-entered or uncertain source. Review before reuse. |
| Free text (unrecognized) | {confidence text} | secondary | Recorded confidence note. |
| Missing (null/empty) | No confidence | secondary | No source confidence recorded. |

### Lifecycle (`component_lifecycle_state` enum — five real values)

| Enum value | Badge label | Tone | Tooltip |
| --- | --- | --- | --- |
| draft | Draft | secondary | Incomplete or internal. Visible to editors; warned on insert. |
| in_production | In production | secondary | Being built up; usable but not finalized. |
| available | Available | success | Ready for new estimates. |
| discontinued | Discontinued | warning | No longer recommended. Inserting requires confirmation. |
| archived | Archived | secondary | Hidden from browse and blocked from new inserts. |

"Deleted" is NOT a lifecycle value — it is row removal, surfaced as the
missing-source / not-found UI states below, never as a badge.

### Link / Snapshot (`estimate_row_link_state` enum)

Used on inserted/snapshot rows in estimate context (CANON enum:
`unlinked | linked-clean | linked-overridden | detached | source-changed`).
"Missing source" is a DERIVED UI state when the source item is deleted — not an
enum value.

| Enum value | Badge label | Tone | Tooltip |
| --- | --- | --- | --- |
| linked-clean | Linked | success | Matches the current library source. |
| source-changed | Source changed | warning | The library source changed after insertion. Review changes before updating. |
| linked-overridden | Local override | secondary | Edited locally and differs from the library source. Not overwritten automatically. |
| detached | Detached | secondary | No longer linked to a library source. Reconnect if appropriate. |
| unlinked | Not linked | secondary | Added directly without a library source. |
| (derived) missing source | Source missing | danger | The linked library source was deleted or is unavailable. |

## Insert-Target Disclosure Line

Surface: `InsertIntoEstimatePicker.tsx` (Modal) and inspector insert action.
Backed by `listEstimateInsertTargets` / `resolveEstimateTemplateInsertTarget`
(see `02-USER-FLOWS-AND-ACTION-PATHS.md` Flow 7 and `13`). Target is re-resolved
on the server before mutation; never silently choose a different target.

| Variant | Disclosure line | Action affordance |
| --- | --- | --- |
| Single resolved target | Inserting into {estimateName} — {projectName}. | Change target |
| Choose target | Select where to insert. | Target picker (project, estimate, group/area) |
| No valid target | No open estimate to insert into. | Open or create an estimate |
| Stale target (re-resolve failed) | That estimate is no longer available. Choose another target. | Reselect target |
| Permission on target | You cannot edit {estimateName}. Choose a target you can edit. | Reselect target |

## Per-Surface Empty / Loading / Permission / Error Copy

Referenced by `10-LIBRARY-SURFACE-SPECS.md` "Empty, Loading, And Error Copy".
Each state names what happened, the next step, and whether context was preserved.
No bare "Something went wrong". The component browse fetch
(`loadCurrentWorkspaceComponentRowsLibrary`) and overview load a single graph, so
there is no per-section partial-failure copy — failures are surface-level.

### Library overview

| State | Copy | Action |
| --- | --- | --- |
| Loading | Loading your library… | (stable frame) |
| Empty (no components) | Your library is empty. Add a component to reuse it across estimates. | Add component |
| Permission denied | You do not have access to this workspace's library. | Switch workspace |
| Network/database error | Could not load the library. Check your connection and retry. | Retry |
| Workspace switch in flight | Loading {workspaceName}'s library… | (no prior-workspace data shown) |

### Components tab

| State | Copy | Action |
| --- | --- | --- |
| Loading | Loading components… | (stable frame) |
| Empty (no components) | No components yet. Add your first reusable component. | Add component |
| Empty (filtered) | No components match these filters. | Clear filters |
| Empty (search) | No components match "{query}". | Clear search |
| Permission denied | You can view but not edit this library. | (read-only state) |
| Error | Could not load components. Retry. | Retry |

### Component inspector (`ComponentInspectorDock.tsx`)

| State | Copy | Action |
| --- | --- | --- |
| Loading detail | Loading component… | (keep dock frame) |
| Invalid `component` id | That component could not be found here. | Clear selection |
| Deleted after open | This component was removed. | Clear selection |
| Permission denied | You do not have access to this component. | Clear selection |
| Stale after open | This component changed since you opened it. Reload to see the latest. | Reload |
| Network error | Could not load this component. Retry. | Retry |

Invalid-id copy must not reveal whether a cross-workspace object exists (per `13`
/ `14`). Use the same not-found string for "absent" and "another workspace".

### Templates / insert

| State | Copy | Action |
| --- | --- | --- |
| Loading | Loading templates… | (stable frame) |
| Empty | No templates yet. Save a template to reuse line items. | Create template |
| Insert partial failure | Some rows could not be inserted. Review and retry the rest. | Review |
| Insert success (returns to estimate) | Added to {estimateName}. | View estimate |
| Insert success (stays in library) | Added to {estimateName}. You can keep browsing. | Go to estimate |
| Target gone before insert | That estimate is no longer available. Nothing was inserted. | Choose another target |

## Input / File Validation Messages

Consolidated from `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md`. Field-and-fix
phrasing: name the field, state the fix. Quick Add required fields are `name`,
`category`, `unit`, `unit_cost` (CANON Quick Add Contract). Backed by
`createCostLibraryComponent` / `updateCostLibraryComponent` validation.

| Field / case | Message |
| --- | --- |
| Name missing | Enter a component name. |
| Name too long | Use 120 characters or fewer for the name. |
| Category missing | Choose or enter a category. |
| Unit missing | Enter a unit (e.g. each, m2, hr). |
| Unit cost missing | Enter a unit cost. |
| Unit cost not numeric | Enter a number for unit cost. |
| Unit cost negative | Enter a unit cost of zero or more. |
| Supplier/brand too long | Use 120 characters or fewer. |
| Pricing date invalid | Enter a valid date. |
| Pricing date far future | Enter a pricing date that is not in the future. |
| Source URL invalid | Enter a valid https URL. |
| Source URL too long | Shorten this URL. |
| Confidence note too long | Use 120 characters or fewer for the confidence note. |
| Possible duplicate (warning, non-blocking) | A component named "{name}" already exists. Add anyway or open the existing one. |
| File too large (future upload) | This file is too large. Use a file under {limit}. |
| Unsupported file type (future) | This file type is not supported. |
| Import row missing unit (future) | Row {n} is missing a unit. |
| Export redaction notice (future) | This export excludes private source details. |

`source_url` maps to the `pricing_source` column (free text; URL validity is
checked app-side, per CANON). `confidence` is free text; the note-length message
applies to the raw string, not an enum.

## Cross-References

- `10-LIBRARY-SURFACE-SPECS.md` — surfaces these strings render in.
- `11-SOURCE-TRUST-STATE-MATRIX.md` — state rules the badges express (terms here
  supersede `11`'s older taxonomy where they differ; align to CANON).
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` — route-state and server-error shape.
- `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` — source of the validation messages.
- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — authoritative names, enums,
  helpers, phase placement (folder/dirty copy in Phase 0B; trust badges in
  Phase 2; insert target in Phase 4).
- `21-FEATURE-FLAGS-AND-ROLLOUT.md` — flags gating the Very-stale tier and
  trust-badge rollout.
- `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` — token-to-tone and overlay-primitive
  mapping for every surface above.
