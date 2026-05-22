-- Tighten advisor findings introduced by the shared component-library taxonomy tables.

create index if not exists component_category_nodes_created_by_idx
  on public.component_category_nodes(created_by);

create index if not exists component_suppliers_created_by_idx
  on public.component_suppliers(created_by);

drop policy if exists "workspace admins can manage component categories" on public.component_category_nodes;
drop policy if exists "workspace admins can insert component categories" on public.component_category_nodes;
drop policy if exists "workspace admins can update component categories" on public.component_category_nodes;
drop policy if exists "workspace admins can delete component categories" on public.component_category_nodes;

create policy "workspace admins can insert component categories" on public.component_category_nodes
  for insert to authenticated with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('ceo', 'admin')
    )
  );

create policy "workspace admins can update component categories" on public.component_category_nodes
  for update to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('ceo', 'admin')
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('ceo', 'admin')
    )
  );

create policy "workspace admins can delete component categories" on public.component_category_nodes
  for delete to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('ceo', 'admin')
    )
  );
