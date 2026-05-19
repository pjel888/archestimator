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

  -- Rebuild Philip's deterministic demo estimate tree so the sample stays one lot / one house.
  delete from public.estimate_row_items
  where estimate_id = '33333333-3333-4333-8333-333333333333'
    and metadata->>'seedOwnerUserId' = '4e23801d-6fc2-4886-b980-d15ca2b164b8';

  delete from public.estimate_nodes
  where estimate_id = '33333333-3333-4333-8333-333333333333'
    and metadata->>'seedVersion' = '2026-05-18';

  insert into public.estimate_nodes (id, estimate_id, parent_id, kind, name, sort_order, metadata)
  values
    ('55555555-5555-4555-8555-555555555551', '33333333-3333-4333-8333-333333333333', null, 'lot', 'Lot 1 — Luna Heights Residence', 10, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555552', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555551', 'general', 'General Requirements', 10, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555553', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555551', 'general', 'Site Works', 20, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555554', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555551', 'structure', 'Two-Storey Residence', 30, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555554', 'level', 'Ground Floor', 10, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555556', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555554', 'level', 'Second Floor', 20, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555557', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555553', 'area', 'Parking / Carport', 10, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555558', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555553', 'area', 'Perimeter + Drainage Works', 20, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555559', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555', 'area', 'Living Room', 10, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555560', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555', 'area', 'Dining Area', 20, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555561', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555', 'area', 'Main Kitchen', 30, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555562', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555', 'area', 'Dirty Kitchen', 40, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555563', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555', 'area', 'Powder Room', 50, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555564', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555', 'area', 'Maid''s Room', 60, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555565', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555556', 'area', 'Bedroom 1 + Toilet', 10, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555566', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555556', 'area', 'Bedroom 2 + Toilet', 20, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb),
    ('55555555-5555-4555-8555-555555555567', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555556', 'area', 'Bedroom 3 + Toilet', 30, '{"seeded": true, "seedVersion": "2026-05-18"}'::jsonb)
  on conflict (id) do update
    set estimate_id = excluded.estimate_id,
        parent_id = excluded.parent_id,
        kind = excluded.kind,
        name = excluded.name,
        sort_order = excluded.sort_order,
        metadata = public.estimate_nodes.metadata || excluded.metadata;

  insert into public.estimate_row_items (
    id,
    estimate_id,
    node_id,
    sort_order,
    source_library_item_id,
    source_snapshot,
    material,
    description,
    supplier,
    unit,
    quantity,
    unit_cost,
    supplementary_cost,
    labor_cost,
    discipline,
    designation,
    link_state,
    metadata
  )
  values
    ('66666666-6666-4666-8666-666666666601', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555552', 10, '44444444-4444-4444-8444-444444444444', '{"name":"General Requirements Monthly Allowance","unit":"month","unitCost":185000}'::jsonb, 'General Requirements Allowance', 'Mobilization, temporary facilities, supervision, safety program, permits coordination, as-built documentation, and project closeout allowance.', 'General contractor allowance', 'month', 6.0000, 185000.00, 0.00, 0.00, 'General Requirements', 'Preliminaries', 'linked-clean', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666602', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555553', 10, null, '{"name":"Site Clearing + Layout","unit":"lot","unitCost":85000}'::jsonb, 'Site Clearing, Layout, and Temporary Barricades', 'Ground-up construction site preparation including clearing, layout staking, temporary protection, and hauling allowance.', 'Site works contractor allowance', 'lot', 1.0000, 85000.00, 12000.00, 25000.00, 'Civil', 'Site preparation', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666603', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555557', 10, null, '{"name":"Concrete Driveway + Carport Slab","unit":"sqm","unitCost":2450}'::jsonb, 'Concrete Driveway and Carport Slab', 'Reinforced concrete driveway/carport slab with surface finish allowance; verify thickness and reinforcement from structural drawings.', 'Civil works contractor allowance', 'sqm', 34.0000, 2450.00, 6800.00, 18500.00, 'Civil', 'Parking / hardscape', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666604', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555558', 10, null, '{"name":"Site Drainage Line","unit":"lm","unitCost":1850}'::jsonb, 'Perimeter Drainage and Catch Basin Allowance', 'Perimeter drainage piping, catch basins, gravel bedding, and tie-in allowance; final routing subject to site conditions.', 'Plumbing / civil contractor allowance', 'lm', 42.0000, 1850.00, 15000.00, 22000.00, 'Civil', 'Drainage', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666605', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555559', 10, '44444444-4444-4444-8444-444444444441', '{"name":"600x600 Porcelain Floor Tile","unit":"sqm","unitCost":950}'::jsonb, 'Living Room Porcelain Floor Finish', 'Supply and install 600x600 porcelain floor tile including adhesive, grout, wastage, and labor allowance.', 'Supplier quote required', 'sqm', 36.0000, 950.00, 3600.00, 9000.00, 'Architectural', 'Floor finish', 'linked-clean', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666606', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555559', 20, '44444444-4444-4444-8444-444444444442', '{"name":"Interior Latex Paint System","unit":"sqm","unitCost":180}'::jsonb, 'Living Room Wall and Ceiling Paint System', 'Primer and two finish coats for living room walls and ceiling; verify substrate preparation.', 'Paint contractor allowance', 'sqm', 118.0000, 180.00, 2800.00, 14160.00, 'Architectural', 'Paint finish', 'linked-clean', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666607', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555560', 10, null, '{"name":"Dining Floor + Ceiling Package","unit":"sqm","unitCost":1450}'::jsonb, 'Dining Area Finish Package', 'Floor finish, ceiling paint, and electrical rough-in allowance for dining area chandelier/drop point.', 'Architectural / electrical allowance', 'sqm', 22.0000, 1450.00, 4800.00, 7200.00, 'Architectural', 'Dining finishes', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666608', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555561', 10, null, '{"name":"Modular Kitchen Cabinetry","unit":"lm","unitCost":18500}'::jsonb, 'Main Kitchen Cabinetry and Countertop Allowance', 'Base and overhead cabinetry, countertop allowance, backsplash, hardware, and installation labor.', 'Cabinetry contractor allowance', 'lm', 7.5000, 18500.00, 18000.00, 28000.00, 'Architectural', 'Kitchen fit-out', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666609', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555562', 10, null, '{"name":"Dirty Kitchen Utility Package","unit":"lot","unitCost":145000}'::jsonb, 'Dirty Kitchen Utility and Finish Package', 'Service counter, utility sink, wall/floor tile allowance, gas line sleeve, exhaust opening, and plumbing/electrical rough-in allowance.', 'Kitchen / plumbing / electrical allowance', 'lot', 1.0000, 145000.00, 12000.00, 26000.00, 'Architectural', 'Service kitchen', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666610', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555563', 10, null, '{"name":"Powder Room Toilet Package","unit":"lot","unitCost":92000}'::jsonb, 'Powder Room Tile, Fixtures, and Accessories', 'Floor/wall tile, lavatory, water closet, faucet, mirror, accessories, waterproofing, and installation allowance.', 'Plumbing fixture supplier + tile contractor allowance', 'lot', 1.0000, 92000.00, 8500.00, 18500.00, 'Plumbing', 'Toilet package', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666611', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555564', 10, null, '{"name":"Maid Room Basic Finish Package","unit":"sqm","unitCost":2150}'::jsonb, 'Maid''s Room Basic Finishes', 'Floor finish, wall/ceiling paint, door hardware, lighting point, outlet allowance, and compact storage allowance.', 'Architectural / electrical allowance', 'sqm', 10.5000, 2150.00, 4500.00, 7200.00, 'Architectural', 'Bedroom finish', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666612', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555565', 10, null, '{"name":"Bedroom Suite 1 Finish + Toilet Package","unit":"lot","unitCost":286000}'::jsonb, 'Bedroom 1 with Ensuite Toilet Package', 'Bedroom floor/wall/ceiling finishes, closet allowance, ensuite toilet tile, waterproofing, plumbing fixtures, and electrical fixture allowance.', 'Architectural / plumbing / electrical allowance', 'lot', 1.0000, 286000.00, 22000.00, 46000.00, 'Architectural', 'Bedroom suite', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666613', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555566', 10, null, '{"name":"Bedroom Suite 2 Finish + Toilet Package","unit":"lot","unitCost":248000}'::jsonb, 'Bedroom 2 with Ensuite Toilet Package', 'Bedroom floor/wall/ceiling finishes, closet allowance, ensuite toilet tile, waterproofing, plumbing fixtures, and electrical fixture allowance.', 'Architectural / plumbing / electrical allowance', 'lot', 1.0000, 248000.00, 20000.00, 41000.00, 'Architectural', 'Bedroom suite', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb),
    ('66666666-6666-4666-8666-666666666614', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555567', 10, null, '{"name":"Bedroom Suite 3 Finish + Toilet Package","unit":"lot","unitCost":248000}'::jsonb, 'Bedroom 3 with Ensuite Toilet Package', 'Bedroom floor/wall/ceiling finishes, closet allowance, ensuite toilet tile, waterproofing, plumbing fixtures, and electrical fixture allowance.', 'Architectural / plumbing / electrical allowance', 'lot', 1.0000, 248000.00, 20000.00, 41000.00, 'Architectural', 'Bedroom suite', 'unlinked', '{"seeded": true, "seedOwnerUserId": "4e23801d-6fc2-4886-b980-d15ca2b164b8", "seedVersion": "2026-05-18"}'::jsonb)
  on conflict (id) do update
    set estimate_id = excluded.estimate_id,
        node_id = excluded.node_id,
        sort_order = excluded.sort_order,
        source_library_item_id = excluded.source_library_item_id,
        source_snapshot = excluded.source_snapshot,
        material = excluded.material,
        description = excluded.description,
        supplier = excluded.supplier,
        unit = excluded.unit,
        quantity = excluded.quantity,
        unit_cost = excluded.unit_cost,
        supplementary_cost = excluded.supplementary_cost,
        labor_cost = excluded.labor_cost,
        discipline = excluded.discipline,
        designation = excluded.designation,
        link_state = excluded.link_state,
        metadata = public.estimate_row_items.metadata || excluded.metadata;
end $$;
