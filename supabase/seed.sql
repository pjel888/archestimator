-- Local development seed data for Supabase Studio / `supabase db reset`.
-- Uses stable UUIDs so repository tests and manual checks can target a known estimate.

insert into public.workspaces (id, name, slug)
values ('11111111-1111-4111-8111-111111111111', 'Archestimator Demo Workspace', 'demo-workspace')
on conflict (id) do update
  set name = excluded.name,
      slug = excluded.slug;

insert into public.projects (id, workspace_id, name, client_name, project_code, location, currency_code, metadata)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Lewis Residence',
  'Lewis Family',
  'AE-LR-001',
  'Quezon City, Metro Manila, Philippines',
  'PHP',
  '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree", "projectType": "ground-up residential construction"}'::jsonb
)
on conflict (id) do update
  set workspace_id = excluded.workspace_id,
      name = excluded.name,
      client_name = excluded.client_name,
      project_code = excluded.project_code,
      location = excluded.location,
      currency_code = excluded.currency_code,
      metadata = public.projects.metadata || excluded.metadata;

insert into public.estimates (id, project_id, name, sheet_code, notes, currency_code, project_budget, metadata)
values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  'Lewis Residence Baseline Estimate',
  'Rev 0',
  null,
  'PHP',
  2000000.00,
  '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb
)
on conflict (id) do update
  set project_id = excluded.project_id,
      name = excluded.name,
      sheet_code = excluded.sheet_code,
      notes = excluded.notes,
      currency_code = excluded.currency_code,
      project_budget = excluded.project_budget,
      metadata = public.estimates.metadata || excluded.metadata;

insert into public.cost_library_items (id, workspace_id, kind, name, description, category, supplier, unit, unit_cost, misc_cost, pricing_source, confidence, metadata)
values
  ('44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111', 'material', '600x600 Porcelain Floor Tile', 'Mid-range PH porcelain floor tile baseline with setting materials.', 'Finishes', 'Quezon City Tile Depot', 'sqm', 950.00, 300.00, 'May 2026 QC supplier canvas', 'supplier-canvas', '{"seeded": true}'::jsonb),
  ('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111', 'material', 'Interior Latex Paint System', 'Primer plus two coats for typical skim-coated interior walls.', 'Finishes', 'Metro Manila Paint Center', 'sqm', 180.00, 140.00, 'May 2026 paint supplier canvas', 'supplier-canvas', '{"seeded": true}'::jsonb)
on conflict (id) do update
  set workspace_id = excluded.workspace_id,
      kind = excluded.kind,
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      supplier = excluded.supplier,
      unit = excluded.unit,
      unit_cost = excluded.unit_cost,
      misc_cost = excluded.misc_cost,
      pricing_source = excluded.pricing_source,
      confidence = excluded.confidence,
      metadata = public.cost_library_items.metadata || excluded.metadata;

delete from public.estimate_row_items
where id in (
  '66666666-6666-4666-8666-666666666661',
  '66666666-6666-4666-8666-666666666662',
  '66666666-6666-4666-8666-666666666663',
  '66666666-6666-4666-8666-666666666664',
  '66666666-6666-4666-8666-666666666665'
);

delete from public.estimate_nodes
where id in (
  '55555555-5555-4555-8555-555555555551',
  '55555555-5555-4555-8555-555555555552',
  '55555555-5555-4555-8555-555555555553',
  '55555555-5555-4555-8555-555555555554'
);

insert into public.estimate_nodes (id, estimate_id, parent_id, kind, name, sort_order, metadata)
values
  ('77777777-7777-4777-8777-777777777701', '33333333-3333-4333-8333-333333333333', null, 'group', 'General Requirements', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777702', '33333333-3333-4333-8333-333333333333', null, 'group', 'Site Works', 20, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777703', '33333333-3333-4333-8333-333333333333', null, 'group', 'Lot', 30, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777704', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777701', 'area', 'Mobilization + Demobilization', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777705', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777701', 'area', 'Permits, Bonds + Insurances', 20, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777706', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777701', 'area', 'Temporary Facilities', 30, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777707', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777701', 'area', 'Construction Supervision', 40, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777708', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777701', 'area', 'Safety, Protection + Cleanup', 50, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777709', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777702', 'area', 'Site Clearing + Layout', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777710', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777702', 'area', 'Earthworks + Grading', 20, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777711', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777702', 'area', 'Drainage + Catch Basins', 30, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777712', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777702', 'area', 'Driveway + Hardscape', 40, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777713', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777702', 'area', 'Landscape + Perimeter Fence', 50, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777714', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777703', 'group', 'House', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777715', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777703', 'group', 'Services House', 20, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777716', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777714', 'group', 'Ground Floor', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777717', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777714', 'group', 'Second Floor', 20, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777718', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777714', 'group', 'Roof + Attic', 30, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777719', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', '2-Car Parking', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777720', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', 'Entry Foyer', 20, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777721', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', 'Living Room', 30, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777722', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', 'Dining Area', 40, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777723', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', 'Show Kitchen', 50, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777724', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', 'Dirty Kitchen', 60, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777725', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', 'Pantry', 70, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777726', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', 'Powder Room', 80, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777727', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', 'Bedroom 1 / Guest Room', 90, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777728', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777716', 'area', 'Ground Floor T&B', 100, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777729', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777717', 'area', 'Master Bedroom', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777730', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777717', 'area', 'Master Walk-In Closet', 20, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777731', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777717', 'area', 'Master T&B', 30, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777732', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777717', 'area', 'Bedroom 2', 40, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777733', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777717', 'area', 'Bedroom 3', 50, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777734', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777717', 'area', 'Bedroom 4', 60, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777735', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777717', 'area', 'Common T&B', 70, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777736', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777717', 'area', 'Family Lounge', 80, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777737', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777717', 'area', 'Balcony', 90, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777738', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777718', 'area', 'Roof Framing + Waterproofing', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777739', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777718', 'area', 'Attic / Ceiling Access', 20, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777740', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777718', 'area', 'Mechanical Platform', 30, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777741', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777715', 'group', 'Services Ground Floor', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777742', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777741', 'area', 'Maid''s Room', 10, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777743', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777741', 'area', 'Driver''s Room', 20, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777744', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777741', 'area', 'Shared Service T&B', 30, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777745', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777741', 'area', 'Laundry + Utility Area', 40, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777746', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777741', 'area', 'Storage Room', 50, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb),
  ('77777777-7777-4777-8777-777777777747', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777741', 'area', 'Service Kitchenette', 60, '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb)
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
  contingency_percentage,
  misc_cost,
  discipline,
  designation,
  link_state,
  metadata,
  row_revision
)
values
  (
    '66666666-6666-4666-8666-666666666661',
    '33333333-3333-4333-8333-333333333333',
    '77777777-7777-4777-8777-777777777710',
    10,
    null,
    null,
    'Site grading and hauling allowance',
    'Cut, fill, haul, and compact to prepare the residential building pad.',
    'Local civil works allowance',
    'lot',
    1.0000,
    125000.00,
    0,
    0,
    'Site Works',
    'Site preparation',
    'unlinked',
    '{"seeded": true, "demoPurpose": "manual-row"}'::jsonb,
    1
  ),
  (
    '66666666-6666-4666-8666-666666666662',
    '33333333-3333-4333-8333-333333333333',
    '77777777-7777-4777-8777-777777777721',
    10,
    '44444444-4444-4444-8444-444444444441',
    '{"sourceLibraryItemId": "44444444-4444-4444-8444-444444444441", "material": "600x600 Porcelain Floor Tile", "supplier": "Quezon City Tile Depot", "unit": "sqm", "unitCost": 950, "miscCost": 300, "pricingSource": "May 2026 QC supplier canvas"}'::jsonb,
    '600x600 Porcelain Floor Tile',
    'Living room floor finish linked to the demo library tile baseline.',
    'Quezon City Tile Depot',
    'sqm',
    42.0000,
    950.00,
    0,
    300.00,
    'Architectural Works',
    'Ground floor finishes',
    'linked-clean',
    '{"seeded": true, "demoPurpose": "linked-library-row"}'::jsonb,
    1
  ),
  (
    '66666666-6666-4666-8666-666666666663',
    '33333333-3333-4333-8333-333333333333',
    '77777777-7777-4777-8777-777777777729',
    10,
    null,
    '{"sourceLibraryItemId": "44444444-4444-4444-8444-444444444442", "material": "Interior Latex Paint System", "supplier": "Metro Manila Paint Center", "unit": "sqm", "unitCost": 180, "miscCost": 140, "pricingSource": "May 2026 paint supplier canvas", "detachedReason": "demo project-specific room finish"}'::jsonb,
    'Master bedroom low-VOC paint system',
    'Project-specific paint line detached from the shared library after room finish adjustment.',
    'Owner-approved finish allowance',
    'sqm',
    68.0000,
    205.00,
    0,
    120.00,
    'Architectural Works',
    'Project-specific finish',
    'detached',
    '{"seeded": true, "demoPurpose": "detached-project-specific-row"}'::jsonb,
    2
  ),
  (
    '66666666-6666-4666-8666-666666666664',
    '33333333-3333-4333-8333-333333333333',
    '77777777-7777-4777-8777-777777777738',
    10,
    null,
    null,
    'Roof framing and waterproofing allowance',
    'Lump-sum roof framing, sheathing, waterproofing, and flashing allowance.',
    'Specialty contractor quote required',
    'lot',
    1.0000,
    265000.00,
    0,
    0,
    'Architectural Works',
    'Roof system',
    'unlinked',
    '{"seeded": true, "demoPurpose": "export-section-row"}'::jsonb,
    1
  ),
  (
    '66666666-6666-4666-8666-666666666665',
    '33333333-3333-4333-8333-333333333333',
    '77777777-7777-4777-8777-777777777744',
    10,
    null,
    null,
    'Shared service bathroom plumbing fixture set',
    'Allowance for toilet, lavatory, faucet, accessories, and rough-in coordination.',
    'San Juan plumbing supplier canvas',
    'set',
    1.0000,
    48000.00,
    0,
    3500.00,
    'Plumbing/Sanitary',
    'Service bathroom fixtures',
    'unlinked',
    '{"seeded": true, "demoPurpose": "trade-section-row"}'::jsonb,
    1
  )
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
      contingency_percentage = excluded.contingency_percentage,
      misc_cost = excluded.misc_cost,
      discipline = excluded.discipline,
      designation = excluded.designation,
      link_state = excluded.link_state,
      metadata = public.estimate_row_items.metadata || excluded.metadata,
      row_revision = excluded.row_revision;
