-- The public restore-as-copy RPC now has a corrected full body, so the renamed
-- unsafe backup function is no longer needed. Drop it to avoid retaining a
-- service-role callable copy with the old workspace-only auth and ambiguous SQL.

begin;

drop function if exists public.restore_estimate_sheet_version_as_copy_unsafe_workspace_gate_20260627(uuid, uuid, text, text, uuid, uuid);

commit;
