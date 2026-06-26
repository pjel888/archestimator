---
title: MOP-0 Implementation Preflight Evidence
type: evidence
date: 2026-06-25
status: active
---

# MOP-0 Implementation Preflight Evidence

## Scope

This file records implementation-run evidence for MOP-0 of the estimate-sheet
orchestration package. It is not final product proof.

## Read-only Coordination Evidence

- Initial branch: `codex/estimate-sheet-orchestration`.
- Unrelated pre-existing local change preserved:
  `src/components/landing-v3/landing-v3.module.css`.
- Six read-only lanes were launched for data/Supabase, center, right, tree,
  validation, and UX/a11y mapping.
- Completed read-only lanes: data/Supabase, center, right, validation, UX/a11y.
- Tree/share subagent errored from context-window exhaustion. The lead recovered
  a narrow local tree/share pass and recorded it in `implementation-ledger.md`.

## MOP-0 Contract Evidence

- Hosted Supabase project boundary: `ebxxqidacheyapmmzavr`.
- No existing generated center atomic move RPC or center all-or-nothing bulk
  row delete RPC was identified in generated Supabase types.
- Existing durable estimate audit/event table: `public.estimate_sheet_events`.
- New right-sidebar/orchestration telemetry persistent sink remains unselected.
- Selected center RPC design targets:
  `move_estimate_row_component_with_history` and
  `delete_estimate_row_items_bulk_with_history`.

## Validation Baseline Queue

Commands selected before feature-code implementation:

```bash
git status --short
bun run type-check
bun x vitest run tests/vitest/library-source-trust.test.ts tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-row-tree-patch.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-tree-reorder.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/shared-link-header-smoke-script.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts tests/vitest/templates-tree-performance.test.ts --maxWorkers=1
```

Full `bun run validate` is not the MOP-0 baseline because the project FAST PATH
records known pre-existing red/noisy full-validate behavior and possible
all-DOM hang.

## Provider Preflight Queue

Read-only hosted-provider checks selected:

```bash
supabase migration list --linked
supabase db query --linked --file <mop0-readonly-introspection.sql> --output json
```

The introspection SQL must be SELECT-only and scoped to function/table/policy,
index, constraint, migration, and privilege metadata for the linked project.

## Results

### Local Baseline

- `git status --short`: passed. Output showed the unrelated
  `src/components/landing-v3/landing-v3.module.css` modification plus new
  `.ai` evidence/ledger files.
- `bun run type-check`: passed (`tsc --noEmit`).
- `bun x vitest run tests/vitest/library-source-trust.test.ts
  tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1`: passed,
  2 files / 10 tests.
- `bun x vitest run tests/vitest/estimate-sheet-actions-authz.test.ts
  tests/vitest/estimate-row-tree-patch.test.ts --maxWorkers=1`: passed,
  2 files / 15 tests.
- `bun x vitest run tests/vitest/estimate-tree-reorder.test.ts
  tests/vitest/share-no-store-invariants.test.ts
  tests/vitest/shared-link-header-smoke-script.test.ts --maxWorkers=1`:
  passed, 3 files / 32 tests.
- `bun x vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts
  tests/vitest/templates-tree-performance.test.ts --maxWorkers=1`: passed,
  2 files / 10 tests.

All Vitest groups emitted the same Node deprecation warning:
`module.register()` is deprecated. No test failed on that warning.

### Hosted Supabase Preflight

- `supabase/.temp/project-ref`: `ebxxqidacheyapmmzavr`.
- `supabase/.temp/linked-project.json`: ref `ebxxqidacheyapmmzavr`, name
  `Archestimator`.
- `supabase migration list --linked`: completed against the linked remote.
  It shows migration drift in both directions. Local-only migration versions
  visible in the output include `20260520100459`, `20260605123000`,
  `20260605131500`, `20260611182000`, `20260614170000`,
  `20260615093649`, `20260615145915`, `20260615150229`,
  `20260616094500`, `20260616180000`, `20260617090000`,
  `20260617210000`, `20260618184856`, `20260621120000`,
  `20260621122125`, `20260621133000`, `20260623163000`, and
  `20260623210000`. Remote-only migration versions visible in the output:
  `20260621105407` and `20260621112542`.
- `supabase db query --linked --file mop0-readonly-introspection.sql --output
  json`: completed. The output was too large for full inline transcript use,
  so narrower summary queries were run and recorded below.
- Function summary query: existing remote row-history RPCs include
  `insert_estimate_row_item_with_history`,
  `update_estimate_row_item_with_history`,
  `replace_estimate_row_item_with_history`, and
  `delete_estimate_row_item_with_history`. Existing remote tree/history RPCs
  include `create_estimate_node_with_history`,
  `reorder_estimate_nodes_with_history`,
  `delete_estimate_node_with_history`, and
  `insert_estimate_subtree_into_estimate_with_history`.
- Function summary query: `move_estimate_row_component_with_history` and
  `delete_estimate_row_items_bulk_with_history` do not exist yet on the linked
  remote. `delete_estimate_nodes_bulk_with_history` was also not returned by
  the linked remote query, despite local action/type expectations.
- Function grants: row/tree mutation RPCs found above are
  `SECURITY DEFINER`, deny `anon` EXECUTE, and grant `authenticated` EXECUTE.
  `assert_can_edit_estimate_for_history` exists as `SECURITY DEFINER` with
  only `service_role` EXECUTE in the summary query. `estimate_sheet_event_result`
  allows `anon` EXECUTE, which needs review before using it for new
  idempotency semantics.
- Table summary query: RLS is enabled on `estimates`, `estimate_tabs`,
  `estimate_nodes`, `estimate_row_items`, and `estimate_sheet_events`; FORCE
  RLS is false on all five.
- Table grants summary: `anon` has table-level SELECT privilege on
  `estimates`, `estimate_nodes`, and `estimate_row_items`; no `anon` SELECT on
  `estimate_tabs` or `estimate_sheet_events`. Active policies returned by
  `pg_policies` for the five target tables are all scoped to
  `{authenticated}`.

Provider preflight did not perform DDL, DML, provider setting changes, dumps,
or production deployment.
