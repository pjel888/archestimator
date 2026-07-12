# Cloudflare Hosted Library Folder Proof

Generated: 2026-07-02T05:12:45Z

Result: **PASS** for hosted component-library folder creation with remote D1 readback.

## Browser Journey

- Route: `https://archestimator.com/workshop/library/components`
- Workflow: Library > Components > Add library folder
- Created folder through the production UI:
  - `Codex CF Folder Proof 20260702T050951Z`
- The hosted UI showed:
  - `Folder created.`
  - folder visible in the folder tree
  - folder visible as an empty component catalogue branch

## Remote D1 Readback

Remote D1 `archestimator-proof-db` returned the folder row:

- `id=e3deaa00-cde3-4edc-8660-5d44b77ae431`
- `workspace_id=258b50ee-3fde-4f6a-a9d9-c360ec44cd0b`
- `parent_id=NULL`
- `name=Codex CF Folder Proof 20260702T050951Z`
- `sort_order=10`
- `source_category_node_id=NULL`
- `folder_kind=custom`
- `created_by=4e23801d-6fc2-4886-b980-d15ca2b164b8`
- `created_at=2026-07-02T05:10:10.928Z`
- `updated_at=2026-07-02T05:10:10.928Z`
- Served by APAC/SIN primary with `rows_read=2`.

## Cleanup

The empty throwaway folder was deleted by a scoped remote D1 command matching
the exact `id`, `workspace_id`, and `name`. Post-cleanup readback returned:

- `row_count=0`

Cleanup was served by APAC/SIN primary and changed exactly one row.

## Boundary

This proof covers a signed-in production UI folder create on the
Cloudflare-hosted component library, remote D1 persistence readback, and scoped
cleanup of the empty throwaway folder. It does not cover hosted
estimate-template mutation or viewer-denial behavior.
