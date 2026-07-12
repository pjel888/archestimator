# Cloudflare Hosted Component Library Proof - 2026-07-02

Production Add Component initially failed with a D1 foreign-key error in the Server Action. Wrangler tail showed `D1_ERROR: FOREIGN KEY constraint failed` on `/workshop/library/components?add=component`. Remote D1 had zero `component_category_nodes` rows, so I seeded the canonical taxonomy into Cloudflare D1 from `supabase/migrations/20260522064018_component_library_taxonomy_source.sql`. The chunked D1 seed processed 18 queries, left `category_count=685`, and `PRAGMA foreign_key_check` returned no rows.

I also patched source so blank `categoryNodeId`, `supplierId`, and `brandId` normalize to `null` before the first `cost_library_items` insert. Focused tests passed: `bunx vitest run tests/vitest/library-viewer-authz.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx --maxWorkers=1` => 2 files / 12 tests. A full `bun run cf:deploy` rebuilt OpenNext and uploaded assets, but Wrangler stalled during Worker script upload and deployments still show production on `b909ac54-1a72-47f0-9a70-f6c70f7c6fb6`.

Hosted browser proof then succeeded by selecting a seeded taxonomy category: `Cloudflare QA Library Component 2026-07-02` was created on `archestimator.com`, the modal closed, the UI showed `Component saved.`, and `All Components` became 1. Remote D1 readback found item `ad19e67d-fa31-49de-99e2-0de6dcb9c975`, price option `d3456c18-d7ad-4af4-bd92-4d70fa4b81c1`, current cost entry `1086a5e1-53d9-4ee6-8d7d-cea0612e10e7`, and version `dbda47bf-836a-45d5-a9bb-fc4385ce70e1`.

Remaining risk: custom/free-typed categories can still fail on production until the main Worker deploy succeeds with the blank `categoryNodeId` normalization patch. Seeded taxonomy category selection is working now.
