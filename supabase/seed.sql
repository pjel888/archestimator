-- Local development seed data for Supabase Studio / `supabase db reset`.
-- Uses stable UUIDs so repository tests and manual checks can target a known estimate.

insert into public.workspaces (id, name, slug)
values ('11111111-1111-4111-8111-111111111111', 'Archestimator Demo Workspace', 'demo-workspace')
on conflict (id) do nothing;

insert into public.projects (id, workspace_id, name, client_name, project_code, location, currency_code, metadata)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Demo Residential Fit-out',
  'Demo Client',
  'AE-DEMO-001',
  'Metro Manila, Philippines',
  'PHP',
  '{"seeded": true}'::jsonb
)
on conflict (id) do nothing;

insert into public.estimates (id, project_id, name, revision_label, status, currency_code, metadata)
values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  'Baseline Estimate',
  'Rev 0',
  'draft',
  'PHP',
  '{"seeded": true}'::jsonb
)
on conflict (id) do nothing;

insert into public.cost_library_items (id, workspace_id, kind, name, description, category, supplier, unit, unit_cost, labor_cost, supplementary_cost, pricing_source, confidence, metadata)
values
  ('44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111', 'material', '600x600 Porcelain Floor Tile', 'Editable allowance for PH-available porcelain tile.', 'Finishes', 'Supplier quote required', 'sqm', 950.00, 250.00, 50.00, 'editable allowance', 'requires-quote-verification', '{"seeded": true}'::jsonb),
  ('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111', 'material', 'Interior Latex Paint System', 'Primer plus two coats; verify brand and surface condition.', 'Finishes', 'Supplier quote required', 'sqm', 180.00, 120.00, 20.00, 'editable allowance', 'requires-quote-verification', '{"seeded": true}'::jsonb)
on conflict (id) do nothing;

insert into public.estimate_nodes (id, estimate_id, parent_id, kind, name, sort_order, metadata)
values
  ('55555555-5555-4555-8555-555555555551', '33333333-3333-4333-8333-333333333333', null, 'lot', 'Lot Group A', 10, '{"seeded": true}'::jsonb),
  ('55555555-5555-4555-8555-555555555552', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555551', 'structure', 'Main Structure', 10, '{"seeded": true}'::jsonb),
  ('55555555-5555-4555-8555-555555555553', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555552', 'level', 'Ground Floor', 10, '{"seeded": true}'::jsonb),
  ('55555555-5555-4555-8555-555555555554', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555553', 'area', 'Living Area', 10, '{"seeded": true}'::jsonb)
on conflict (id) do nothing;

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
  (
    '66666666-6666-4666-8666-666666666661',
    '33333333-3333-4333-8333-333333333333',
    '55555555-5555-4555-8555-555555555554',
    10,
    '44444444-4444-4444-8444-444444444441',
    '{"name": "600x600 Porcelain Floor Tile", "unit": "sqm", "unitCost": 950}'::jsonb,
    '600x600 Porcelain Floor Tile',
    'Supply and install tile finish; verify final SKU and wastage.',
    'Supplier quote required',
    'sqm',
    28.5000,
    950.00,
    50.00,
    250.00,
    'Architectural',
    'Floor finish',
    'linked-clean',
    '{"seeded": true}'::jsonb
  )
on conflict (id) do nothing;
