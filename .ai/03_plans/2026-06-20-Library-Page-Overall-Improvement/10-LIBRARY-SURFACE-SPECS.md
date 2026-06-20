# 10 - Library Surface Specs

## Overview

Primary jobs:

- orient the user to reusable library assets
- expose recent/relevant components and templates
- make global search land on exact objects
- route users into component, folder, and template work without hiding context

Required states:

- loading with stable page frame
- empty library starter state
- partial data failure with retry per section
- stale/review-needed recent items
- permission-denied protected state
- workspace-switch refetch state that does not show prior-workspace data

Key content hierarchy:

1. Library search and primary entry actions.
2. Component and template lanes.
3. Recent or high-priority reusable items.
4. Maintenance signals: stale pricing, incomplete metadata, archived counts.

## Component Card

Purpose: fast recognition and safe reuse.

Required fields when available:

- name
- category
- unit cost and unit
- supplier or brand
- lifecycle state
- pricing freshness
- confidence/source summary
- image or stable fallback

State rules:

- price and unit stay visually adjacent
- freshness badge sits near price
- stale, low-confidence, missing-source, discontinued, and archived states have
  distinct labels
- raw source URL is not displayed in card view
- card supports selected/highlighted state from URL param
- card actions are permission-aware

## Dense Component Row

Purpose: comparison and batch work.

Recommended columns:

- selection checkbox when batch actions are available
- name
- category
- unit
- unit cost
- supplier/brand
- freshness
- confidence/source
- lifecycle
- last updated/reviewed
- row actions

Rules:

- use native table semantics for read-mostly rows
- use ARIA grid only if cells become directly editable or row navigation cannot
  be represented by normal table/buttons/links
- all row actions must be keyboard reachable
- result count and applied filters remain visible above the table

## Component Inspector

Purpose: exact-item inspection and action.

Desktop: right-side inspector.

Narrow screens: drawer.

Opened by:

- card/row click
- overview search result
- direct URL param

Required content:

- full component identity
- price/unit and trust state
- supplier/brand/source summary
- lifecycle state
- linked usage or inserted/snapshot status when available
- actions: insert, edit, duplicate/archive depending permission
- changed-source or stale-source warning when applicable

Failure states:

- invalid ID
- permission denied
- deleted after route load
- network retry
- stale data changed after open

Close behavior:

- remove only selected component param
- preserve search, folder, filters, sort, density, and pagination
- return focus to the originating row/card when possible

## Quick Add Component

Purpose: capture reusable data without forcing an advanced editor.

Required fields:

- name
- category
- unit
- unit cost

Optional beta fields:

- supplier/brand
- pricing date
- source confidence

Rules:

- inline validation
- duplicate-ish warning
- permission-aware trigger
- app-owned dirty-discard confirmation
- save returns to prior browse context with new component selected
- advanced edit path remains available after save

## Advanced Component Edit

Purpose: manage complex metadata.

Use a full editor or persistent drawer, not a crowded modal.

Advanced fields include:

- source URL/details
- supplier notes
- attachments
- price history
- assemblies
- provider reconciliation
- lifecycle transitions

## Folder Management

Create/rename:

- anchored popover or compact dialog
- one text field
- duplicate validation
- server-side workspace revalidation
- focus return to trigger

Delete:

- app-owned confirmation
- folder name and component count
- consequences and alternatives
- conflict handling if folder changed concurrently

## Template Card/Row

Required fields:

- template name
- description or purpose
- included line/group count
- component-link health
- last reviewed/updated
- lifecycle or status
- primary action: preview/use

State rules:

- stale component links are visible before preview
- archived/discontinued dependencies warn before insert
- edit and use actions are visually distinct

## Template Preview / Insert

Required content:

- what will be inserted
- target estimate/project
- component link/source health
- partial failure recovery
- stale target recovery

Rules:

- target is re-resolved before mutation
- user can change target when no active estimate is available
- insert success either returns to estimate context or preserves Library context
  with a clear success state

## Empty, Loading, And Error Copy

All states should include:

- what happened
- what the user can do next
- whether context was preserved
- whether the issue is permission, network, empty data, or invalid state

Avoid generic "Something went wrong" unless paired with a concrete retry or
support action.
