# 13 - Data Contracts, Route State, And Cache

## Canonical Routes

- `/workshop/library`
- `/workshop/library/components`
- `/workshop/library/templates`

Historical standalone template routes are not implementation targets unless a
newer decision explicitly restores them.

## Component Route State

Recommended query params:

- `component=<componentId>` opens the component inspector.
- Existing search/filter/folder/sort/density/pagination params remain intact.
- Closing the inspector removes only `component`.
- Opening Quick Add should not reuse `component`; use a separate action state if
  a route param is needed.

Invalid `component` behavior:

- show an inspector-level not-found state
- preserve other search/filter context
- offer clear-selection action
- do not leak whether a cross-workspace object exists

Workspace switch behavior:

- selected object data from the previous workspace must not remain visible
- route state can remain, but the current workspace must refetch and resolve it
  safely
- if invalid in the new workspace, show not-found/permission-safe state

## Template Route State

Recommended query params:

- `template=<templateId>` opens template preview/details.
- `template` and `component` should not both drive visible inspectors at once;
  the latest explicit user action wins.

Invalid template behavior mirrors component behavior.

## Overview Component Payload Additions

Recent/overview component cards need enough data to show safe trust cues:

- id
- name
- category
- supplier or brand display
- unit
- unit cost
- lifecycle state
- pricing date or derived freshness
- confidence or derived confidence label
- safe source label if available
- image/fallback metadata
- updated/reviewed timestamp

Avoid exposing raw source URL in overview cards. Keep raw source URL in protected
detail/edit surfaces only.

## Component Detail Payload

Protected detail/inspector can include:

- source URL/details
- internal notes
- price history
- usage/link counts
- snapshot/link status when opened from estimate context
- last-reviewed metadata

All protected fields require current workspace authorization.

## Template Trust Payload

Template cards/previews need:

- template id/name/description
- line/group count
- dependency count
- missing-link count
- stale-source count
- archived/discontinued dependency count
- last reviewed/updated
- target insert capability

Template trust is derived from dependency health plus template review metadata.

## Insert Target Contract

Every insert action must display:

- target project
- target estimate
- whether the target is active/current

Before mutation:

- re-resolve target on the server
- verify current workspace ownership
- verify user can mutate the target estimate
- verify source component/template is readable and insertable
- detect stale target or missing estimate and return a recovery state

Never silently choose a different target.

## Mutation Cache Contract

Mutations must invalidate or update all affected surfaces:

| Mutation | Affected Surfaces |
| --- | --- |
| Create/update/archive component | overview, components, folders/counts, templates that depend on it, estimate insert/search surfaces |
| Create/rename/delete folder | components, folder sidebar/counts, overview maintenance signals |
| Bulk archive/delete | overview, components, folders/counts, selected inspector state |
| Create/update template | overview, templates, template preview, estimate insert/search surfaces |
| Insert component/template | target estimate, library usage/link metadata, recent/reuse signals |
| Update source/trust metadata | cards/rows, inspector, template dependency health, estimate source-changed signals |

Cache keys must include workspace identity. Any query key that can show
workspace data must refetch or clear on workspace switch.

## Server Action Contract

Server actions remain the preferred mutation surface for protected Library work.

Each server action should:

- derive user/workspace context server-side
- validate actor capability
- validate object belongs to current workspace
- validate input shape and length
- perform mutation inside the smallest safe transaction
- return permission, validation, conflict, stale-target, and network/database
  errors distinctly enough for UI recovery
- trigger scoped revalidation/cache invalidation

## Data Migration Gate

If implementation needs new columns, indexes, RLS policies, or RPCs:

- create a scoped migration
- add rollback/fix-forward notes
- update generated types if applicable
- add provider-scoped validation against Archestimator project
  `ebxxqidacheyapmmzavr`
- do not touch unrelated provider projects
