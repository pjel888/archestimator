# Database and Schema Plan

## Recommended first-slice schema

Use one append-only acceptance table. Add a versions table only if legal copy metadata must be queryable outside app code.

```sql
-- Concept only. Future implementation must create via supabase migration new.
create table public.legal_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_key text not null default 'terms-of-service',
  terms_version text not null,
  terms_effective_date date not null,
  terms_content_hash text not null,
  privacy_policy_version text,
  acceptance_context text not null,
  acceptance_method text not null,
  accepted_at timestamptz not null default now(),
  ip_hash text,
  user_agent_hash text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint legal_terms_acceptances_context_check check (acceptance_context in ('signup','first_protected_access','reacceptance','settings','checkout')),
  constraint legal_terms_acceptances_method_check check (acceptance_method in ('checkbox_and_button','button','admin_import')),
  constraint legal_terms_acceptances_version_not_blank check (length(btrim(terms_version)) > 0),
  constraint legal_terms_acceptances_hash_not_blank check (length(btrim(terms_content_hash)) > 0)
);

create unique index legal_terms_acceptances_user_version_key
  on public.legal_terms_acceptances(user_id, terms_key, terms_version);

create index legal_terms_acceptances_user_latest_idx
  on public.legal_terms_acceptances(user_id, terms_key, accepted_at desc);

alter table public.legal_terms_acceptances enable row level security;

grant select, insert on public.legal_terms_acceptances to authenticated;

create policy "Users can read their own legal acceptances"
  on public.legal_terms_acceptances
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own legal acceptances"
  on public.legal_terms_acceptances
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
```

## Notes

- `on delete cascade` vs preservation/anonymization must be reviewed legally. If legal audit must survive user deletion, use `user_id uuid null`, `user_deleted_at`, and anonymized identity snapshot instead of cascade.
- Raw IP/user-agent fields are not recommended by default; prefer hashes matching `account_security_events` pattern.
- `terms_content_hash` should be generated from canonical approved copy.
- `privacy_policy_version` should be included if Privacy acceptance is bundled or referenced.

## Optional versions table

```sql
create table public.legal_terms_versions (
  terms_key text not null,
  terms_version text not null,
  effective_date date not null,
  content_hash text not null,
  privacy_policy_version text,
  legal_review_reference text,
  published_at timestamptz,
  status text not null check (status in ('draft','approved','published','retired')),
  primary key (terms_key, terms_version)
);
```

Use only if the implementation needs DB-level version metadata; otherwise app-code constants are simpler.

## Generated types

- Update `src/lib/supabase/types.ts` after migration using repo-approved Supabase CLI command.
- Do not hand-edit generated types except through established generation flow.

## RLS/grant testing

- Auth user can insert own row.
- Auth user cannot insert another `user_id`.
- Auth user can select own rows.
- Auth user cannot select others.
- Anon cannot read/insert.
- Missing grants are caught before app gate.

## Retention/deletion decision

Legal must decide whether acceptance records are:

1. deleted with the user,
2. retained with anonymized user reference,
3. retained for a fixed legal evidence period, or
4. retained until claims limitation period expires.

Privacy Notice must match the chosen policy.
