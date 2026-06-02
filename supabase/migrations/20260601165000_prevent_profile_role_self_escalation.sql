-- Prevent authenticated users from self-promoting by updating profiles.role.

create or replace function public.prevent_profile_role_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_platform_admin() then
    raise exception 'Only platform admins can change profile roles.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_profile_role_self_update() from public, anon, authenticated;

drop trigger if exists profiles_prevent_role_self_update on public.profiles;
create trigger profiles_prevent_role_self_update
  before update of role on public.profiles
  for each row execute function public.prevent_profile_role_self_update();
