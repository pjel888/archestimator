begin;

create table public.legal_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  terms_key text not null,
  terms_version text not null,
  terms_effective_date date not null,
  terms_content_hash text not null,
  privacy_policy_version text not null,
  acceptance_method text not null,
  acceptance_context text not null,
  metadata_json jsonb not null default '{"source":"archestimator_web_app"}'::jsonb,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint legal_terms_acceptances_user_id_not_nil check (user_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  constraint legal_terms_acceptances_terms_key_not_blank check (length(btrim(terms_key)) > 0),
  constraint legal_terms_acceptances_terms_version_not_blank check (length(btrim(terms_version)) > 0),
  constraint legal_terms_acceptances_terms_content_hash_format check (terms_content_hash ~ '^sha256:[a-f0-9]{64}$'),
  constraint legal_terms_acceptances_privacy_version_not_blank check (length(btrim(privacy_policy_version)) > 0),
  constraint legal_terms_acceptances_method_check check (acceptance_method in ('authenticated_clickwrap')),
  constraint legal_terms_acceptances_context_check check (acceptance_context in ('workshop_terms_gate', 'settings_reacceptance', 'admin_support_record')),
  constraint legal_terms_acceptances_metadata_object_check check (jsonb_typeof(metadata_json) = 'object'),
  constraint legal_terms_acceptances_user_terms_version_key unique (user_id, terms_key, terms_version)
);

create index legal_terms_acceptances_user_terms_accepted_idx
  on public.legal_terms_acceptances(user_id, terms_key, accepted_at desc);

create index legal_terms_acceptances_terms_version_idx
  on public.legal_terms_acceptances(terms_key, terms_version, accepted_at desc);

alter table public.legal_terms_acceptances enable row level security;

revoke all on public.legal_terms_acceptances from public;
revoke all on public.legal_terms_acceptances from anon;
revoke all on public.legal_terms_acceptances from authenticated;

grant select on public.legal_terms_acceptances to authenticated;
grant select, insert on public.legal_terms_acceptances to service_role;

create policy legal_terms_acceptances_select_own
  on public.legal_terms_acceptances
  for select to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.legal_terms_acceptances is 'Append-only Terms of Service acceptance evidence for authenticated ArchEstimator users. Writes are server-stamped; authenticated browser clients can only read their own rows.';
comment on column public.legal_terms_acceptances.user_id is 'Supabase Auth user id captured at acceptance time. No raw IP address or raw user agent is stored by default.';
comment on column public.legal_terms_acceptances.metadata_json is 'Privacy-minimized acceptance metadata. Do not store raw IP address, raw user agent, secrets, provider payloads, or privileged legal advice here.';

commit;
