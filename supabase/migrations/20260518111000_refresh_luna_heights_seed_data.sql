-- Attach the Archestimator demo seed data to Philip's authenticated workspace only.
-- This keeps seed data private to Philip's profile; other authenticated users receive an empty workspace.

do $$
declare
  v_user_id uuid := '4e23801d-6fc2-4886-b980-d15ca2b164b8';
  v_email text := 'philipjonlewis@gmail.com';
  v_workspace_id uuid;
begin
  select p.default_workspace_id
    into v_workspace_id
  from public.profiles p
  where p.id = v_user_id
    and p.email = v_email;

  -- Do not fall back to an arbitrary existing membership. If no default workspace
  -- exists, create a private default workspace so the seed never lands in a
  -- shared workspace by accident.
  if v_workspace_id is null and exists (select 1 from public.profiles p where p.id = v_user_id and p.email = v_email) then
    insert into public.workspaces (id, name, slug, created_by)
    values (
      gen_random_uuid(),
      'Philip''s Archestimator Workspace',
      null,
      v_user_id
    )
    returning id into v_workspace_id;

    update public.profiles
      set default_workspace_id = v_workspace_id
    where id = v_user_id;
  end if;

  if v_workspace_id is null then
    return;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner')
  on conflict (workspace_id, user_id) do update
    set role = case
      when public.workspace_members.role in ('owner', 'admin') then public.workspace_members.role
      else excluded.role
    end;

  insert into public.projects (id, workspace_id, name, client_name, project_code, location, currency_code, created_by, metadata)
  values (
    '22222222-2222-4222-8222-222222222222',
    v_workspace_id,
    'Luna Heights Residence',
    'Luna Family',
    'AE-LHR-001',
    'Quezon City, Metro Manila, Philippines',
    'PHP',
    v_user_id,
    '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18", "projectType": "ground-up residential construction"}'::jsonb
  )
  on conflict (id) do update
    set workspace_id = excluded.workspace_id,
        name = excluded.name,
        client_name = excluded.client_name,
        project_code = excluded.project_code,
        location = excluded.location,
        currency_code = excluded.currency_code,
        created_by = excluded.created_by,
        metadata = public.projects.metadata || excluded.metadata;

  insert into public.estimates (id, project_id, name, revision_label, status, currency_code, created_by, metadata)
  values (
    '33333333-3333-4333-8333-333333333333',
    '22222222-2222-4222-8222-222222222222',
    'Ground-Up Construction Baseline Estimate',
    'Rev 0',
    'draft',
    'PHP',
    v_user_id,
    '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb
  )
  on conflict (id) do update
    set project_id = excluded.project_id,
        name = excluded.name,
        revision_label = excluded.revision_label,
        status = excluded.status,
        currency_code = excluded.currency_code,
        created_by = excluded.created_by,
        metadata = public.estimates.metadata || excluded.metadata;

  insert into public.cost_library_items (id, workspace_id, kind, name, description, category, supplier, unit, unit_cost, labor_cost, supplementary_cost, pricing_source, confidence, created_by, metadata)
  values
    ('44444444-4444-4444-8444-444444444441', v_workspace_id, 'material', '600x600 Porcelain Floor Tile', 'Editable allowance for PH-available porcelain tile.', 'Finishes', 'Supplier quote required', 'sqm', 950.00, 250.00, 50.00, 'editable allowance', 'requires-quote-verification', v_user_id, '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('44444444-4444-4444-8444-444444444442', v_workspace_id, 'material', 'Interior Latex Paint System', 'Primer plus two coats; verify brand and surface condition.', 'Finishes', 'Supplier quote required', 'sqm', 180.00, 120.00, 20.00, 'editable allowance', 'requires-quote-verification', v_user_id, '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('44444444-4444-4444-8444-444444444443', v_workspace_id, 'assembly', 'Reinforced Concrete Footing + Tie Beam Allowance', 'Ground-up residential substructure allowance; final quantities require structural plans.', 'Structural Works', 'Structural contractor quote required', 'cu.m', 7800.00, 2200.00, 450.00, 'editable allowance', 'requires-quote-verification', v_user_id, '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('44444444-4444-4444-8444-444444444444', v_workspace_id, 'allowance', 'General Requirements Monthly Allowance', 'Temporary facilities, supervision, safety, permits, documentation, and mobilization allowance.', 'General Requirements', 'Contractor allowance', 'month', 185000.00, 0.00, 0.00, 'editable allowance', 'requires-quote-verification', v_user_id, '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb)
  on conflict (id) do update
    set workspace_id = excluded.workspace_id,
        kind = excluded.kind,
        name = excluded.name,
        description = excluded.description,
        category = excluded.category,
        supplier = excluded.supplier,
        unit = excluded.unit,
        unit_cost = excluded.unit_cost,
        labor_cost = excluded.labor_cost,
        supplementary_cost = excluded.supplementary_cost,
        pricing_source = excluded.pricing_source,
        confidence = excluded.confidence,
        created_by = excluded.created_by,
        metadata = public.cost_library_items.metadata || excluded.metadata;

  -- Reset Philip's deterministic Luna Heights estimate contents before rebuilding the hierarchy.
  -- This intentionally deletes all seeded and user-mutated row items/nodes for the
  -- demo estimate while preserving the project, baseline estimate shell, and cost
  -- library records above. The next rebuild must follow the node contract:
  -- General nodes can nest only other General nodes and Area nodes; only Area
  -- nodes may own cost-estimate row items.
  delete from public.estimate_row_items
  where estimate_id = '33333333-3333-4333-8333-333333333333';

  delete from public.estimate_nodes
  where estimate_id = '33333333-3333-4333-8333-333333333333';

end $$;

