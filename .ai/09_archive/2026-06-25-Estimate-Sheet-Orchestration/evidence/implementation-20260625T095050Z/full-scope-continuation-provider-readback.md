---
title: Full Scope Continuation Provider Readback
type: evidence
date: 2026-06-25
---

# Full Scope Continuation Provider Readback

Scope: linked Supabase project `ebxxqidacheyapmmzavr` / Archestimator.

## Commands

- Applied scoped SQL for `20260625213000_component_library_user_preferences.sql`
  through Supabase MCP after the CLI temp role hit a temporary SASL/circuit
  breaker failure.
- Applied scoped SQL for `20260625214500_estimate_sheet_user_preferences.sql`
  and `20260625220000_estimate_sheet_event_result_execute_hardening.sql`
  through `supabase db query --linked --file`.
- Ran
  `supabase migration repair --linked --status applied 20260625183000 20260625193000 20260625203000 20260625213000 20260625214500 20260625220000`.
- Ran `supabase migration list --linked`.
- Ran Supabase MCP SELECT-only readback for target tables, helper grants, and
  migration-history rows.

## Readback Summary

Timestamp: `2026-06-25T13:44:09.866945+00:00`.

Tables:

- `component_library_telemetry_events`: exists, RLS enabled, anon SELECT/INSERT
  false, authenticated SELECT/INSERT false, `deny direct api access` policy
  present.
- `component_library_user_preferences`: exists, RLS enabled, anon SELECT/INSERT
  false, authenticated SELECT/INSERT false, `deny direct api access` policy
  present.
- `estimate_sheet_user_preferences`: exists, RLS enabled, anon SELECT/INSERT
  false, authenticated SELECT/INSERT false, `deny direct api access` policy
  present.

Function:

- `estimate_sheet_event_result(target_estimate_id uuid, target_correlation_id
  uuid)`: exists, anon EXECUTE false, authenticated EXECUTE true,
  service_role EXECUTE true.

Migration history:

- `20260625183000`: recorded remote true.
- `20260625193000`: recorded remote true.
- `20260625203000`: recorded remote true.
- `20260625213000`: recorded remote true.
- `20260625214500`: recorded remote true.
- `20260625220000`: recorded remote true.

Residual note:

- `supabase migration list --linked` still shows unrelated historical local-only
  and remote-only rows outside this estimate-sheet continuation slice. The six
  target continuation versions are aligned locally and remotely.
