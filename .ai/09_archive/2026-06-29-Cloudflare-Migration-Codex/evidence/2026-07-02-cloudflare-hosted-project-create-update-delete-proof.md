# Cloudflare Hosted Project Create/Update/Delete Proof

Generated: 2026-07-02T05:00:05Z

Result: **PASS** for the signed-in production project create/read/update/delete journey on the Cloudflare-hosted app.

## Browser Journey

- Route: `https://archestimator.com/workshop/projects`
- Created project through the production UI:
  - `id=e46f1b5b-cf52-4989-831d-f141309ee913`
  - `name=Codex CF Project Proof 20260702T045628Z`
  - `project_code=8VDDZNYK`
- Opened the hosted project route:
  - `https://archestimator.com/workshop/projects/e46f1b5b-cf52-4989-831d-f141309ee913`
- Updated the project name through the hosted dashboard field:
  - `Codex CF Project Proof Updated 20260702T045628Z`
  - UI showed `Saving project details`.
- Returned to Projects, selected exactly one project, entered `DELETE PROJECT`, and executed the delete.
- Post-delete UI showed the throwaway proof card gone and the persistent smoke project still present.

## Remote D1 Create/Update Readback

Remote D1 `archestimator-proof-db` returned the updated project row:

- `id=e46f1b5b-cf52-4989-831d-f141309ee913`
- `workspace_id=258b50ee-3fde-4f6a-a9d9-c360ec44cd0b`
- `name=Codex CF Project Proof Updated 20260702T045628Z`
- `client_name=No client yet`
- `project_code=8VDDZNYK`
- `currency_code=PHP`
- `created_by=4e23801d-6fc2-4886-b980-d15ca2b164b8`
- `created_at=2026-07-02T04:56:45.522Z`
- `updated_at=2026-07-02T04:58:19.057Z`
- Served by APAC/SIN primary with `rows_read=1`.

## Remote D1 Delete Readback

After the hosted delete flow, remote D1 returned zero rows for the proof project:

- `projects=0`
- `estimates=0`
- `project_members=0`
- `project_publications=0`

The delete readback was served by APAC/SIN primary.

## Boundary

This proof covers the signed-in production UI project create/read/update/delete path and Cloudflare D1 persistence/cascade readback for a throwaway proof project. It does not assert cross-workspace denial or restore/recovery behavior.
