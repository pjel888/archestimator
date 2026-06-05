-- Restore deterministic Lewis Residence row items after the earlier Luna/Lewis seed reset sequence.
-- The 2026-05-19 migration rebuilds the tree nodes only; this forward repair restores
-- the demo rows against the current 777... node ids without rewriting applied migrations.

do $$
begin
  if not exists (
    select 1
    from public.estimates
    where id = '33333333-3333-4333-8333-333333333333'
  ) then
    return;
  end if;

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
      '{"seeded": true, "demoPurpose": "manual-row", "seedRepair": "2026-06-05"}'::jsonb,
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
      '{"seeded": true, "demoPurpose": "linked-library-row", "seedRepair": "2026-06-05"}'::jsonb,
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
      '{"seeded": true, "demoPurpose": "detached-project-specific-row", "seedRepair": "2026-06-05"}'::jsonb,
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
      '{"seeded": true, "demoPurpose": "export-section-row", "seedRepair": "2026-06-05"}'::jsonb,
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
      '{"seeded": true, "demoPurpose": "trade-section-row", "seedRepair": "2026-06-05"}'::jsonb,
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
end $$;
