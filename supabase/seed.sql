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

insert into public.estimates (id, project_id, name, sheet_code, currency_code, metadata)
values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  'Lewis Residence Baseline Estimate',
  'Rev 0',
  'PHP',
  '{"seeded": true, "seedVersion": "2026-05-19-lewis-tree"}'::jsonb
)
on conflict (id) do update
  set project_id = excluded.project_id,
      name = excluded.name,
      sheet_code = excluded.sheet_code,
      currency_code = excluded.currency_code,
      metadata = public.estimates.metadata || excluded.metadata;

insert into public.cost_library_items (id, workspace_id, kind, name, description, category, supplier, unit, unit_cost, misc_cost, pricing_source, confidence, metadata)
values
  ('44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111', 'material', '600x600 Porcelain Floor Tile', 'Editable allowance for PH-available porcelain tile.', 'Finishes', 'Supplier quote required', 'sqm', 950.00, 300.00, 'editable allowance', 'requires-quote-verification', '{"seeded": true}'::jsonb),
  ('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111', 'material', 'Interior Latex Paint System', 'Primer plus two coats; verify brand and surface condition.', 'Finishes', 'Supplier quote required', 'sqm', 180.00, 140.00, 'editable allowance', 'requires-quote-verification', '{"seeded": true}'::jsonb)
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
where id in ('66666666-6666-4666-8666-666666666661');

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
