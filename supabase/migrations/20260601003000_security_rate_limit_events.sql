create table if not exists public.security_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key_hash text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists security_rate_limit_events_lookup_idx
  on public.security_rate_limit_events(scope, key_hash, occurred_at desc);

create index if not exists security_rate_limit_events_expiry_idx
  on public.security_rate_limit_events(expires_at);

alter table public.security_rate_limit_events enable row level security;

drop policy if exists "security rate limits service role can manage events" on public.security_rate_limit_events;
create policy "security rate limits service role can manage events"
on public.security_rate_limit_events
for all
to service_role
using (true)
with check (true);

revoke all on table public.security_rate_limit_events from public, anon, authenticated;
grant select, insert, delete on table public.security_rate_limit_events to service_role;
