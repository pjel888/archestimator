-- Tighten favorite shortcut table Data API grants after table creation.
-- RLS owns row visibility; authenticated users only need select/insert/delete.

revoke all on public.project_favorites from public;
revoke all on public.estimate_favorites from public;
revoke all on public.project_favorites from anon;
revoke all on public.estimate_favorites from anon;
revoke all on public.project_favorites from authenticated;
revoke all on public.estimate_favorites from authenticated;

grant select, insert, delete on public.project_favorites to authenticated;
grant select, insert, delete on public.estimate_favorites to authenticated;
