# Hosted Estimate Tab Lifecycle Proof

Date: 2026-07-02 05:32 UTC

This proof used a separate headless Chromium context authenticated with a signed Better Auth session sourced from Cloudflare D1. It exercised the production Cloudflare Worker UI at `https://archestimator.com`.

## Scope

- Project: `bd9a8e68-4e24-49d8-aeed-e4651b7cab0b`
- Estimate: `985f6690-741e-4136-9fa1-a4896cd364e4`
- Workspace: `258b50ee-3fde-4f6a-a9d9-c360ec44cd0b`
- Actor: `4e23801d-6fc2-4886-b980-d15ca2b164b8`
- Signed-in email: `philipjonlewis@gmail.com`
- Production route:
  `https://archestimator.com/workshop/projects/bd9a8e68-4e24-49d8-aeed-e4651b7cab0b/estimates/985f6690-741e-4136-9fa1-a4896cd364e4`

## Result

Pass.

The production UI created a throwaway estimate tab, renamed it, and deleted it through the estimate tab context menu. Remote D1 readback showed the tab was removed and no estimate nodes remained for the deleted tab. Audit/history rows remained for create, rename, and delete.

## Created Tab Readback

- Tab id: `fb4ed3e0-fa34-4095-91a5-aa49be6a2b5f`
- Name: `Codex CF Tab Proof 20260702T053154Z`
- Sort order: `1000`
- Default: `0`
- Created by: `4e23801d-6fc2-4886-b980-d15ca2b164b8`
- Created at: `2026-07-02T05:32:08.093Z`
- Updated at after rename: `2026-07-02T05:32:09.675Z`

## Audit Events

- `estimate_tab_created`, correlation `f2a2efdc-15fe-4970-a37e-d82c87419e9e`, created at `2026-07-02T05:32:08.165Z`
- `estimate_tab_renamed`, correlation `4b866988-91d2-4b4a-9cea-f70ccb7d93a8`, changed fields `["name"]`, created at `2026-07-02T05:32:09.758Z`
- `estimate_tab_deleted`, correlation `ff1c71ff-f417-441f-98a3-e50c1282f702`, created at `2026-07-02T05:32:13.060Z`

## Cleanup Readback

- UI delete attempted: `true`
- UI delete succeeded: `true`
- `estimate_tabs` count for proof tab after delete: `0`
- `estimate_nodes` count for proof tab after delete: `0`
- Final surviving estimate tab: `Main`, id `5bf33713-4fec-4d82-b408-bbf11cb2cb91`

## Boundary

This closes the hosted estimate tab create/rename/delete lifecycle proof. Hosted rollback, idempotency/retry replay, and cross-workspace/viewer denial remain separate open checks.
