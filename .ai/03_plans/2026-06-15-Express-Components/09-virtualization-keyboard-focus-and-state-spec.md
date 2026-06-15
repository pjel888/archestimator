---
title: Express Components Virtualization Keyboard Focus And State Spec
type: docs
date: 2026-06-15
---

# Virtualization Keyboard Focus And State Spec

## Virtualization Decision

Day-0 disables estimate row virtualization while exactly one express editor is active. The active editor is still rendered in the normal row table, but the table must not rely on the current fixed 96px virtual estimate while the editor can expand for description, errors, image URL, and recovery actions.

Implementation requirements:

- detect one active express editor by row id and field focus/dirty state
- switch the row table to the non-virtual rendering path while that editor is active
- remove `content-visibility:auto` and `contain-intrinsic-size:96px` from the active express row path
- restore virtualization after commit, cancel, blur out of the editor, draft delete, or row removal
- add a QA hook such as `data-estimate-row-virtualizer="true"`
- add a QA hook or observable state proving virtualization is disabled while the active editor is open
- test with at least 75 rows and an active editor in the middle of the list

Rejected:

- hard-capping the editor to 96px, because it hides description/error/image controls and fails touch editing
- relying on the existing browser smoke, because it exercises the non-virtualized path
- making dynamic `measureElement` the day-0 dependency while the table still combines `content-visibility:auto`, `contain-intrinsic-size:96px`, and manual `translateY(start - scrollMargin)` math

Follow-up:

- dynamic row measurement may replace the day-0 fallback only after a separate spike proves `measureElement`, `data-index`, `scrollMargin`, active-row content visibility, and scroll anchoring together in the current row table

## Keyboard Policy

Express text fields do not use `handleEstimateCellKeyDown`.

| Key | Name/unit/supplier text fields | Description field | Numeric cells |
| --- | --- | --- | --- |
| Enter | Commit field and keep row active | Commit only with Cmd/Ctrl+Enter; plain Enter inserts newline | Existing commit/blur behavior |
| Shift+Enter | No special behavior | Insert newline | Existing behavior |
| Escape | Revert focused field to last saved value | Revert focused field | Existing revert if present |
| Tab | Next express field, then numeric cells | Next express field, then numeric cells | Existing tab order |
| ArrowLeft/Right | Caret movement | Caret movement | Existing grid movement |
| Home/End | Caret movement | Caret movement | Existing browser/input behavior |
| ArrowUp/Down | No row movement from express text fields | No row movement | Existing grid movement |

Icon rail and drag handles are reachable after fields in the same row. Destructive or promoting actions use buttons with accessible names and tooltips.

## Focus Policy

On express insert:

- create the optimistic/draft row
- set `pendingFocusRowId` plus an express focus target
- branch the current pending-focus effect to query `[data-express-field="name"]`
- do not focus `[data-estimate-cell-index="0"]` for express rows
- scroll the row into view without stealing focus from an active typed character

After events:

- successful single-field commit keeps focus on the field unless the user tabbed away
- Escape keeps focus on the reverted field
- failed save focuses the failed field and links it to the inline error
- Retry keeps focus on the first invalid or changed field
- Delete draft moves focus to the Add row button for the same node
- successful promotion moves focus to the linked row card or the Project folder item that initiated promotion

## State Table

| State | Driver | Visual | Live copy |
| --- | --- | --- | --- |
| New/empty | local draft with no user text | name focused, quiet placeholder | none |
| Creating | insert mutation pending | small inline status derived from insert flag, not `saveState` | polite: `Creating component row` |
| Draft insert failed | insert error | row remains visible with Retry/Delete | assertive: `Could not create component row` |
| Clean | persisted, no local edits | compact card/editor affordance | none |
| Dirty focused | local field differs | focus ring and subtle unsaved mark | none |
| Saving | update mutation pending | inline status | polite: `Saving component` |
| Saved | update success | transient saved indicator | polite: `Component saved` |
| Failed | update error | inline error, Retry/Revert | assertive: `Could not save component` |
| Detached | `link_state = detached` | Project-specific badge | none |
| Linked-clean | source id and clean link | make-project-specific action | none |
| Linked-overridden | linked but local override | make-project-specific action with override copy | none |
| Source-changed | link source changed | make-project-specific action | none |
| Promoting | promotion RPC pending | promote button busy | polite: `Promoting component to library` |
| Promote failed | promotion error | inline/action error with retry | assertive: `Could not promote component` |

## Microcopy

Labels:

- `Component name`
- `Component description`
- `Unit`
- `Unit cost`
- `Supplier`
- `Image URL`

Placeholders:

- name: `Component name`
- description: `Description`
- supplier: `Supplier`
- image: `Paste image URL`

Buttons:

- draft retry: `Retry`
- draft delete: `Delete draft`
- failed field retry: `Retry save`
- field revert: `Revert`
- promote: `Promote to library`
- promote retry: `Retry promotion`
- make project-specific: `Make project-specific`

Errors:

- insert failure: `Component row was not created. Retry or delete this draft.`
- save failure: `Changes were not saved. Retry or revert this field.`
- stale revision: `This row changed elsewhere. Review the latest value before saving again.`
- promotion permission: `You need workspace editor access to promote this component.`
- promotion partial failure: `Promotion did not finish. Retry with the same component to avoid duplicates.`

The app is currently English-only in this surface; these strings may be hard-coded until a repo-wide localization convention exists. If localization is introduced before implementation, these strings move to that convention.

## Accessibility And Contrast

- Load-bearing text: `#5D5D5D` or stronger
- Active values: `#3D3D3D`
- Express labels, placeholders, helper text, badges, errors, and field values must meet WCAG AA contrast
- `#7F7F7F` is reserved for non-text decoration only in this feature
- Error id shape: `express-row-{rowId}-{field}-error`
- Inputs with errors set `aria-invalid="true"` and `aria-describedby` to the error id
- Live regions: polite for progress/success, assertive for failures that require action
- Icon-only controls have stable accessible names and titles

## Mobile / Touch

Minimum supported day-0 behavior:

- no hover-only control is required to finish authoring or recovery
- touch targets for Retry/Delete/Promote are at least as usable as existing toolbar icon buttons
- active editor row does not overlap neighbors at the narrowest workshop viewport
- on-screen keyboard viewport resize does not trap focus or hide the inline error/recovery action
- use `window.visualViewport` when available to keep recovery actions visible during keyboard resize; otherwise scroll the focused field and inline error into view after focus/error state changes
- drag handles remain optional; touch editing does not depend on drag/drop
