# Migration And RLS QA Runbook

Date: 2026-06-19
Status: required for Phase 2/3 database work

## Gate

Do not start Phase 2 or Phase 3 database migrations unless the implementation branch can produce this evidence:

- migration file reviewed against current live/project schema;
- generated Supabase types updated;
- local or linked SQL proof for RLS/grants/indexes;
- migration-ledger/reset parity or an explicit fix-forward note;
- no unrelated provider project touched.

## `estimate_sheet_events.project_id` Migration

Preferred sequence:

1. Add nullable `project_id uuid` referencing `projects(id)`.
2. Backfill from `estimates.project_id`.
3. Add a `before insert or update` trigger that resolves and validates `project_id` from `estimate_id`.
4. Prove existing event writers populate `project_id` without source edits or update write paths deliberately.
5. Add `(project_id, created_at desc, id desc)` index.
6. Tighten to `not null` only after backfill and write-path proof are clean.
7. Regenerate types.
8. Record rollback/fix-forward notes.

Write paths to prove include at least:

- row scalar edits;
- row insert/delete/reorder actions;
- node create/rename/delete/cascade actions;
- tab lifecycle/history rows;
- template insert;
- package-builder apply;
- express component foundation paths;
- any RPC that inserts `estimate_sheet_events`.

RLS/authorization proof:

- project member sees allowed estimate events;
- restricted sheet events are omitted for users without estimate access;
- anonymous/public users receive no activity;
- workspace-only access does not bypass project/sheet access;
- existing sheet Activity modal still works.

## `project_locations` Migration

Required schema properties:

- `id uuid primary key`;
- `project_id uuid not null references projects(id) on delete cascade`;
- `workspace_id uuid not null references workspaces(id) on delete cascade`;
- `latitude` and `longitude` with range checks;
- `source` constrained to known values such as `manual`, `geocoded`, `imported`;
- optional `accuracy_meters`/accuracy, display label, address text, `geocoder_name`, `provider_place_id`, `geocoded_at`, and metadata fields matching the actual migration;
- `created_at`, `updated_at`, `updated_by`;
- one active row per project for MVP.

RLS/grants proof:

- no anon/public read;
- SELECT only for authorized project detail readers;
- INSERT/UPDATE/DELETE only for authorized editors/managers;
- wrong workspace denied;
- sheet-only collaborator denied by default;
- service-role paths are deliberate and tested if used.

Lifecycle proof:

- project delete cascades location;
- workspace delete cascades location;
- account deletion handles or anonymizes `updated_by`;
- export/delete/DSAR runbook includes location fields;
- retention decision for geocoder fields is recorded.

## Structured Location Lifecycle / DSAR

`project_locations` stores exact manual/imported/Google-selected project coordinates for the
authenticated editor dashboard only. Treat latitude, longitude, accuracy,
display label, address text, provider name, provider place id, and metadata as
private project data.

Account/project export and DSAR handling:

- Include `project_locations` fields only in authenticated owner/editor
  account or project data exports where the requester is authorized to edit the
  project.
- Do not include exact coordinates in public share pages, proposal package
  exports, AI/provider context, analytics payloads, or broad `projects` row
  DTOs by default.
- Sheet-only collaborators and project viewers do not receive exact coordinate
  exports unless a future policy explicitly grants that scope.

Delete/anonymization behavior:

- Project deletion cascades the one active location row through
  `(project_id, workspace_id) -> projects(id, workspace_id)`.
- Workspace deletion cascades location rows through the same project boundary.
- User deletion sets `created_by` and `updated_by` to null via the
  `auth.users` foreign keys; location records remain only while the project
  remains.

Retention:

- Manual pins are retained for the life of the project unless cleared by an
  editor or removed by project/workspace deletion.
- Geocoder fields are optional for manual pins. Google Places selections may
  store `source='geocoded'`, `geocoder_name='google'`, and the Google Place ID
  in `provider_place_id` so the app can recognize the selected provider record.
  Do not store raw Google response payloads in metadata unless a later privacy
  review explicitly approves retention.

## Migration Evidence Table

| Proof | Phase | Blocking |
|---|---|---|
| Migration text includes backfill and maintenance strategy | 2 | Yes |
| New events after migration carry `project_id` | 2 | Yes |
| Project activity query uses project index or equivalent bounded path | 2 | Yes |
| RLS denies restricted sheet events | 2 | Yes |
| `project_locations` coordinate checks reject invalid values | 3 | Yes |
| `project_locations` grants exclude anon/public | 3 | Yes |
| Generated types include new fields/tables | 2/3 | Yes |
| Fix-forward notes exist for failed migration | 2/3 | Yes |

## Failure Handling

Stop with FAIL if:

- any migration makes existing event writers insert null `project_id` after the trigger/backfill phase;
- event RLS or repository filtering exposes restricted sheet events;
- `project_locations` is readable by anon/public;
- generated types are stale;
- reset/ledger parity is unknown for changed migrations.

Stop with BLOCKED if linked provider inspection or local Supabase proof is unavailable; record the next-best source test and residual risk.
