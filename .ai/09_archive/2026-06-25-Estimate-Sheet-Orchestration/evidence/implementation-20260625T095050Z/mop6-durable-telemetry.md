---
title: MOP-6 Durable Telemetry Evidence
type: evidence
date: 2026-06-25
status: active
---

# MOP-6 Durable Telemetry Evidence

## Scope

This slice creates and proves a durable component-library telemetry sink for the
estimate-sheet/right-sidebar rollout. It applies only to linked Supabase project
`ebxxqidacheyapmmzavr`.

## Implementation

- Added `supabase/migrations/20260625203000_component_library_telemetry_events.sql`.
- Added locked-down table `public.component_library_telemetry_events` with:
  RLS enabled, direct `anon`/`authenticated` table access revoked, restrictive
  deny-all policy, redaction-oriented payload check constraint, and indexes for
  workspace/event/actor review.
- Added `recordComponentLibraryTelemetryEvent` server action in
  `src/lib/component-library/actions.ts`. It re-sanitizes untrusted records,
  requires an authenticated user, verifies workspace membership when a
  workspace id is provided, and writes through service role as best effort.
- Installed the durable sink from `EstimateRightSidebar` outside tests via
  `setLibraryTelemetrySink`.
- Hardened `recordLibraryEvent` so asynchronous sink rejections are swallowed
  and telemetry still cannot break product paths.

## Provider Proof

- Preflight: `mop6-telemetry-provider-readiness-before.json` showed the table
  was absent on the linked project.
- Apply: `mop6-provider-apply-20260625203000-telemetry.json` succeeded with no
  result rows.
- Post-check: `mop6-telemetry-provider-readiness-after.json` proves the table
  exists with columns, constraints, indexes, RLS enabled, direct
  `anon`/`authenticated` SELECT and INSERT denied, service-role INSERT allowed,
  and a restrictive deny-all policy.

## Validation

- `bun x vitest run tests/vitest/library-telemetry-emit.test.ts tests/vitest/component-library-durable-telemetry.test.ts --maxWorkers=1`:
  2 files / 12 tests passed.
- `bun x vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/library-telemetry-emit.test.ts tests/vitest/component-library-durable-telemetry.test.ts --maxWorkers=1`:
  3 files / 105 tests passed.
- `bun run type-check`: passed after clearing a stale generated
  `.next/dev/types` validator artifact unrelated to this source change.
- `git diff --check`: passed.

## Remaining Limitation

The migration version `20260625203000` remains unrecorded in
`supabase_migrations.schema_migrations` because this pass intentionally used
direct scoped SQL apply instead of broad `supabase db push`.
