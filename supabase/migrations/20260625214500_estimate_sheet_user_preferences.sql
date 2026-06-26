-- ============================================================================
-- Account-backed estimate sheet UI preferences.
--
-- Column widths still hydrate from local storage for first paint/offline use.
-- This table provides a per-user, per-workspace, per-estimate sync target for
-- the editable sheet surface while keeping direct client API access denied.
-- ============================================================================

begin;

create table if not exists public.estimate_sheet_user_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  column_widths jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_id, estimate_id),
  constraint estimate_sheet_user_preferences_column_widths_object
    check (jsonb_typeof(column_widths) = 'object'),
  constraint estimate_sheet_user_preferences_column_widths_redacted
    check (
      column_widths::text !~* '(https?:|/{2}|[/?\\#]|token|signature|apikey|storage[_-]?path|signed[_-]?url|source[_-]?url|file[_-]?name|private note|review note|\\.pdf|\\.xlsx?|\\.csv|\\.jpe?g|\\.png|\\.webp)'
    )
);

create index if not exists estimate_sheet_user_preferences_workspace_updated_idx
  on public.estimate_sheet_user_preferences(workspace_id, updated_at desc);

create index if not exists estimate_sheet_user_preferences_estimate_updated_idx
  on public.estimate_sheet_user_preferences(estimate_id, updated_at desc);

drop trigger if exists estimate_sheet_user_preferences_set_updated_at on public.estimate_sheet_user_preferences;
create trigger estimate_sheet_user_preferences_set_updated_at
  before update on public.estimate_sheet_user_preferences
  for each row execute function public.set_updated_at();

alter table public.estimate_sheet_user_preferences enable row level security;

revoke all on table public.estimate_sheet_user_preferences from public, anon, authenticated;

drop policy if exists "deny direct api access" on public.estimate_sheet_user_preferences;
create policy "deny direct api access"
on public.estimate_sheet_user_preferences
as restrictive
for all
to public
using (false)
with check (false);

commit;
