-- ============================================================================
-- Account-backed estimate right-sidebar preferences.
--
-- Local storage remains the offline/first-paint fallback. This table gives
-- authenticated users a workspace-scoped sync target for component-library tab,
-- view-mode, favorites, recents, and custom tree order. Direct client API access
-- stays denied; reads/writes go through server actions after user/workspace
-- context checks.
-- ============================================================================

begin;

create table if not exists public.component_library_user_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  active_tab text not null default 'components',
  component_view_mode text not null default 'default',
  favorite_item_ids text[] not null default '{}'::text[],
  recent_item_ids text[] not null default '{}'::text[],
  tree_order jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_id),
  constraint component_library_user_preferences_active_tab_check
    check (active_tab in ('components', 'project', 'templates')),
  constraint component_library_user_preferences_view_mode_check
    check (component_view_mode in ('default', 'suppliers', 'brand')),
  constraint component_library_user_preferences_favorites_limit
    check (coalesce(array_length(favorite_item_ids, 1), 0) <= 500),
  constraint component_library_user_preferences_recents_limit
    check (coalesce(array_length(recent_item_ids, 1), 0) <= 100),
  constraint component_library_user_preferences_tree_order_object
    check (jsonb_typeof(tree_order) = 'object'),
  constraint component_library_user_preferences_tree_order_redacted
    check (
      tree_order::text !~* '(https?:|/{2}|[/?\\#]|token|signature|apikey|storage[_-]?path|signed[_-]?url|source[_-]?url|file[_-]?name|private note|review note|\\.pdf|\\.xlsx?|\\.csv|\\.jpe?g|\\.png|\\.webp)'
    )
);

create index if not exists component_library_user_preferences_workspace_updated_idx
  on public.component_library_user_preferences(workspace_id, updated_at desc);

drop trigger if exists component_library_user_preferences_set_updated_at on public.component_library_user_preferences;
create trigger component_library_user_preferences_set_updated_at
  before update on public.component_library_user_preferences
  for each row execute function public.set_updated_at();

alter table public.component_library_user_preferences enable row level security;

revoke all on table public.component_library_user_preferences from public, anon, authenticated;

drop policy if exists "deny direct api access" on public.component_library_user_preferences;
create policy "deny direct api access"
on public.component_library_user_preferences
as restrictive
for all
to public
using (false)
with check (false);

commit;
