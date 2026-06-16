begin;

-- Viewers may read shared templates, but all template-library mutations require
-- editor-level workspace access. Keep table grants broad for the Data API and
-- enforce role boundaries with RLS so direct client calls and server actions
-- share the same authorization contract.
drop policy if exists "members can manage estimate templates" on public.estimate_templates;
drop policy if exists "members can manage estimate template nodes" on public.estimate_template_nodes;
drop policy if exists "members can manage estimate template row items" on public.estimate_template_row_items;

create policy "members can read estimate templates" on public.estimate_templates
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "editors can insert estimate templates" on public.estimate_templates
  for insert to authenticated
  with check (public.is_workspace_editor(workspace_id));

create policy "editors can update estimate templates" on public.estimate_templates
  for update to authenticated
  using (public.is_workspace_editor(workspace_id))
  with check (public.is_workspace_editor(workspace_id));

create policy "editors can delete estimate templates" on public.estimate_templates
  for delete to authenticated
  using (public.is_workspace_editor(workspace_id));

create policy "members can read estimate template nodes" on public.estimate_template_nodes
  for select to authenticated
  using (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_nodes.template_id
        and public.is_workspace_member(template.workspace_id)
    )
  );

create policy "editors can insert estimate template nodes" on public.estimate_template_nodes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_nodes.template_id
        and public.is_workspace_editor(template.workspace_id)
    )
  );

create policy "editors can update estimate template nodes" on public.estimate_template_nodes
  for update to authenticated
  using (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_nodes.template_id
        and public.is_workspace_editor(template.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_nodes.template_id
        and public.is_workspace_editor(template.workspace_id)
    )
  );

create policy "editors can delete estimate template nodes" on public.estimate_template_nodes
  for delete to authenticated
  using (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_nodes.template_id
        and public.is_workspace_editor(template.workspace_id)
    )
  );

create policy "members can read estimate template row items" on public.estimate_template_row_items
  for select to authenticated
  using (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_row_items.template_id
        and public.is_workspace_member(template.workspace_id)
    )
  );

create policy "editors can insert estimate template row items" on public.estimate_template_row_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_row_items.template_id
        and public.is_workspace_editor(template.workspace_id)
    )
  );

create policy "editors can update estimate template row items" on public.estimate_template_row_items
  for update to authenticated
  using (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_row_items.template_id
        and public.is_workspace_editor(template.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_row_items.template_id
        and public.is_workspace_editor(template.workspace_id)
    )
  );

create policy "editors can delete estimate template row items" on public.estimate_template_row_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_row_items.template_id
        and public.is_workspace_editor(template.workspace_id)
    )
  );

commit;
