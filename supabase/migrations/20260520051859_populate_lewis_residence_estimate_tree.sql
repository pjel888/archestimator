-- Populate Philip's deterministic Lewis Residence estimate tree.
-- This is tree-only seed data: cost row items are intentionally not inserted here.

do $$
declare
  v_user_id uuid := '4e23801d-6fc2-4886-b980-d15ca2b164b8';
  v_email text := 'philipjonlewis@gmail.com';
  v_workspace_id uuid;
  v_project_id uuid := '22222222-2222-4222-8222-222222222222';
  v_estimate_id uuid := '33333333-3333-4333-8333-333333333333';
  v_seed_metadata jsonb := '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-19-lewis-tree"}'::jsonb;
begin
  select p.default_workspace_id
    into v_workspace_id
  from public.profiles p
  where p.id = v_user_id
    and p.email = v_email;

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
    v_project_id,
    v_workspace_id,
    'Lewis Residence',
    'Lewis Family',
    'AE-LR-001',
    'Quezon City, Metro Manila, Philippines',
    'PHP',
    v_user_id,
    v_seed_metadata || '{"projectType": "ground-up residential construction"}'::jsonb
  )
  on conflict (id) do update
    set workspace_id = excluded.workspace_id,
        name = excluded.name,
        client_name = case
          when public.projects.client_name is null or public.projects.client_name in ('Luna Family', 'Demo Client') then excluded.client_name
          else public.projects.client_name
        end,
        project_code = case
          when public.projects.project_code is null or public.projects.project_code in ('AE-LHR-001', 'AE-DEMO-001') then excluded.project_code
          else public.projects.project_code
        end,
        location = excluded.location,
        currency_code = excluded.currency_code,
        created_by = excluded.created_by,
        metadata = public.projects.metadata || excluded.metadata;

  insert into public.estimates (id, project_id, name, currency_code, created_by, metadata)
  values (
    v_estimate_id,
    v_project_id,
    'Lewis Residence Baseline Estimate',
    'PHP',
    v_user_id,
    v_seed_metadata
  )
  on conflict (id) do update
    set project_id = excluded.project_id,
        name = excluded.name,
        currency_code = excluded.currency_code,
        created_by = excluded.created_by,
        metadata = public.estimates.metadata || excluded.metadata;

  insert into public.estimate_nodes (id, estimate_id, parent_id, kind, name, sort_order, metadata)
  values
    ('77777777-7777-4777-8777-777777777701', v_estimate_id, null, 'group', 'General Requirements', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777702', v_estimate_id, null, 'group', 'Site Works', 20, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777703', v_estimate_id, null, 'group', 'Lot', 30, v_seed_metadata),

    ('77777777-7777-4777-8777-777777777704', v_estimate_id, '77777777-7777-4777-8777-777777777701', 'area', 'Mobilization + Demobilization', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777705', v_estimate_id, '77777777-7777-4777-8777-777777777701', 'area', 'Permits, Bonds + Insurances', 20, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777706', v_estimate_id, '77777777-7777-4777-8777-777777777701', 'area', 'Temporary Facilities', 30, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777707', v_estimate_id, '77777777-7777-4777-8777-777777777701', 'area', 'Construction Supervision', 40, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777708', v_estimate_id, '77777777-7777-4777-8777-777777777701', 'area', 'Safety, Protection + Cleanup', 50, v_seed_metadata),

    ('77777777-7777-4777-8777-777777777709', v_estimate_id, '77777777-7777-4777-8777-777777777702', 'area', 'Site Clearing + Layout', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777710', v_estimate_id, '77777777-7777-4777-8777-777777777702', 'area', 'Earthworks + Grading', 20, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777711', v_estimate_id, '77777777-7777-4777-8777-777777777702', 'area', 'Drainage + Catch Basins', 30, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777712', v_estimate_id, '77777777-7777-4777-8777-777777777702', 'area', 'Driveway + Hardscape', 40, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777713', v_estimate_id, '77777777-7777-4777-8777-777777777702', 'area', 'Landscape + Perimeter Fence', 50, v_seed_metadata),

    ('77777777-7777-4777-8777-777777777714', v_estimate_id, '77777777-7777-4777-8777-777777777703', 'group', 'House', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777715', v_estimate_id, '77777777-7777-4777-8777-777777777703', 'group', 'Services House', 20, v_seed_metadata),

    ('77777777-7777-4777-8777-777777777716', v_estimate_id, '77777777-7777-4777-8777-777777777714', 'group', 'Ground Floor', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777717', v_estimate_id, '77777777-7777-4777-8777-777777777714', 'group', 'Second Floor', 20, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777718', v_estimate_id, '77777777-7777-4777-8777-777777777714', 'group', 'Roof + Attic', 30, v_seed_metadata),

    ('77777777-7777-4777-8777-777777777719', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', '2-Car Parking', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777720', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', 'Entry Foyer', 20, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777721', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', 'Living Room', 30, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777722', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', 'Dining Area', 40, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777723', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', 'Show Kitchen', 50, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777724', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', 'Dirty Kitchen', 60, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777725', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', 'Pantry', 70, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777726', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', 'Powder Room', 80, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777727', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', 'Bedroom 1 / Guest Room', 90, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777728', v_estimate_id, '77777777-7777-4777-8777-777777777716', 'area', 'Ground Floor T&B', 100, v_seed_metadata),

    ('77777777-7777-4777-8777-777777777729', v_estimate_id, '77777777-7777-4777-8777-777777777717', 'area', 'Master Bedroom', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777730', v_estimate_id, '77777777-7777-4777-8777-777777777717', 'area', 'Master Walk-In Closet', 20, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777731', v_estimate_id, '77777777-7777-4777-8777-777777777717', 'area', 'Master T&B', 30, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777732', v_estimate_id, '77777777-7777-4777-8777-777777777717', 'area', 'Bedroom 2', 40, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777733', v_estimate_id, '77777777-7777-4777-8777-777777777717', 'area', 'Bedroom 3', 50, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777734', v_estimate_id, '77777777-7777-4777-8777-777777777717', 'area', 'Bedroom 4', 60, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777735', v_estimate_id, '77777777-7777-4777-8777-777777777717', 'area', 'Common T&B', 70, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777736', v_estimate_id, '77777777-7777-4777-8777-777777777717', 'area', 'Family Lounge', 80, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777737', v_estimate_id, '77777777-7777-4777-8777-777777777717', 'area', 'Balcony', 90, v_seed_metadata),

    ('77777777-7777-4777-8777-777777777738', v_estimate_id, '77777777-7777-4777-8777-777777777718', 'area', 'Roof Framing + Waterproofing', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777739', v_estimate_id, '77777777-7777-4777-8777-777777777718', 'area', 'Attic / Ceiling Access', 20, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777740', v_estimate_id, '77777777-7777-4777-8777-777777777718', 'area', 'Mechanical Platform', 30, v_seed_metadata),

    ('77777777-7777-4777-8777-777777777741', v_estimate_id, '77777777-7777-4777-8777-777777777715', 'group', 'Services Ground Floor', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777742', v_estimate_id, '77777777-7777-4777-8777-777777777741', 'area', 'Maid''s Room', 10, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777743', v_estimate_id, '77777777-7777-4777-8777-777777777741', 'area', 'Driver''s Room', 20, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777744', v_estimate_id, '77777777-7777-4777-8777-777777777741', 'area', 'Shared Service T&B', 30, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777745', v_estimate_id, '77777777-7777-4777-8777-777777777741', 'area', 'Laundry + Utility Area', 40, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777746', v_estimate_id, '77777777-7777-4777-8777-777777777741', 'area', 'Storage Room', 50, v_seed_metadata),
    ('77777777-7777-4777-8777-777777777747', v_estimate_id, '77777777-7777-4777-8777-777777777741', 'area', 'Service Kitchenette', 60, v_seed_metadata)
  on conflict (id) do update
    set estimate_id = excluded.estimate_id,
        parent_id = excluded.parent_id,
        kind = excluded.kind,
        name = excluded.name,
        sort_order = excluded.sort_order,
        metadata = public.estimate_nodes.metadata || excluded.metadata;
end $$;
