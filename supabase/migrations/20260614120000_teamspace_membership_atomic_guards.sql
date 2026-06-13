-- Teamspace membership atomic guards (plan task T1.4 / finding F13 / G13).
--
-- Purpose: enforce membership invariants at the database layer so they cannot
-- be violated by concurrent writes. Application-level checks (RLS helpers such
-- as public.has_other_project_access_manager) read the table before a write and
-- can race: two simultaneous DELETE/UPDATE statements may each observe "another
-- owner still exists" and both commit, leaving zero owners/managers behind.
--
-- These BEFORE triggers re-evaluate the floor inside the same transaction at
-- write time. They only raise on the *last* privileged removal/demotion:
--   * enforce_workspace_owner_floor   -> every workspace keeps >= 1 'owner'
--   * enforce_project_manager_floor   -> every project keeps >= 1 'owner'/'admin'
--
-- Legitimate flows are unaffected: an UPDATE that keeps or raises the privileged
-- role short-circuits before counting, and any DELETE/demotion that still leaves
-- another owner/manager passes. Both functions are security definer with an
-- empty search_path and fully-qualified table names.

create or replace function public.enforce_workspace_owner_floor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_owner_count integer;
begin
  -- Skip cascade / nested-trigger contexts (e.g. deleting the parent workspace
  -- cascades to its members): enforce only on top-level statements so we block
  -- the "delete all owners" exploit without breaking legitimate workspace teardown.
  if pg_trigger_depth() > 1 then
    if tg_op = 'UPDATE' then return new; end if;
    return old;
  end if;

  -- An UPDATE that keeps the row at 'owner' cannot reduce the owner count.
  if tg_op = 'UPDATE' and new.role = 'owner' then
    return new;
  end if;

  -- Only a delete or demotion of an existing owner can threaten the floor.
  if old.role <> 'owner' then
    if tg_op = 'UPDATE' then
      return new;
    end if;
    return old;
  end if;

  select count(*)
    into remaining_owner_count
    from public.workspace_members wm
    where wm.workspace_id = old.workspace_id
      and wm.user_id <> old.user_id
      and wm.role = 'owner';

  if remaining_owner_count = 0 then
    raise exception 'Every workspace must keep at least one owner.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' then
    return new;
  end if;
  return old;
end;
$$;

create or replace function public.enforce_project_manager_floor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Skip cascade / nested-trigger contexts (e.g. project deletion cascading to
  -- project_members) so teardown is never blocked.
  if pg_trigger_depth() > 1 then
    if tg_op = 'UPDATE' then return new; end if;
    return old;
  end if;

  -- An UPDATE that keeps the row at owner/admin cannot reduce the manager count.
  if tg_op = 'UPDATE' and new.role in ('owner', 'admin') then
    return new;
  end if;

  -- Only a delete or demotion of an existing manager can threaten the floor.
  if old.role not in ('owner', 'admin') then
    if tg_op = 'UPDATE' then
      return new;
    end if;
    return old;
  end if;

  -- Mirror the application invariant EXACTLY: an "access manager" is a workspace
  -- owner/admin OR a project owner/admin (excluding the row being changed). Reusing
  -- the same helper the app's read-then-write guard uses means the trigger never
  -- blocks a flow the app allows — it only closes the concurrency race where two
  -- writes both pass the app-side check and would leave zero managers.
  if not public.has_other_project_access_manager(old.project_id, old.user_id) then
    raise exception 'Every project must keep at least one owner or admin.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' then
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists workspace_members_enforce_owner_floor on public.workspace_members;
create trigger workspace_members_enforce_owner_floor
  before delete or update on public.workspace_members
  for each row execute function public.enforce_workspace_owner_floor();

drop trigger if exists project_members_enforce_manager_floor on public.project_members;
create trigger project_members_enforce_manager_floor
  before delete or update on public.project_members
  for each row execute function public.enforce_project_manager_floor();
