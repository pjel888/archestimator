create table if not exists public.closed_beta_allowed_emails (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null,
  status text not null default 'invited',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint closed_beta_allowed_emails_normalized_email_key unique (normalized_email),
  constraint closed_beta_allowed_emails_normalized_email_not_blank check (length(btrim(normalized_email)) > 0),
  constraint closed_beta_allowed_emails_normalized_email_lowercase check (normalized_email = lower(btrim(normalized_email))),
  constraint closed_beta_allowed_emails_status_check check (status in ('invited', 'active', 'revoked'))
);

drop trigger if exists closed_beta_allowed_emails_set_updated_at on public.closed_beta_allowed_emails;
create trigger closed_beta_allowed_emails_set_updated_at
  before update on public.closed_beta_allowed_emails
  for each row execute function public.set_updated_at();

alter table public.closed_beta_allowed_emails enable row level security;
revoke all on public.closed_beta_allowed_emails from anon, authenticated;

create or replace function public.check_closed_beta_access(raw_email text)
returns table(allowed boolean, status text, normalized_email text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_email text := lower(btrim(coalesce(raw_email, '')));
  caller_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  access_status text;
begin
  if requested_email = '' or caller_email = '' or requested_email <> caller_email then
    allowed := false;
    status := 'missing';
    normalized_email := requested_email;
    return next;
    return;
  end if;

  select beta.status
    into access_status
  from public.closed_beta_allowed_emails beta
  where beta.normalized_email = requested_email
  limit 1;

  if access_status is null then
    allowed := false;
    status := 'missing';
    normalized_email := requested_email;
    return next;
    return;
  end if;

  allowed := access_status in ('invited', 'active');
  status := access_status;
  normalized_email := requested_email;
  return next;
end;
$$;

revoke all on function public.check_closed_beta_access(text) from public, anon, authenticated;
grant execute on function public.check_closed_beta_access(text) to authenticated;
