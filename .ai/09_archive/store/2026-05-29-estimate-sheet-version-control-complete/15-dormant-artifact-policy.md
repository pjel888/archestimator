# 15 Dormant Artifact Policy

**Date:** 2026-05-24
**Scope:** Post-pivot policy for named-version database artifacts created during the estimate sheet history implementation.

## Policy

Keep the migration-era named-version artifacts dormant.

These artifacts already exist in the linked Archestimator Supabase project and should not be dropped, exposed, or widened without explicit scope:

- `estimate_sheet_versions`;
- create named estimate sheet version RPCs;
- restore estimate sheet version as copy RPCs;
- baseline `estimate_sheet_versions` rows for current demo estimates;
- the historical QA checkpoint row/event created during idempotency proof (`V2`, title `QA checkpoint`);
- compare-ready full-sheet snapshot payloads;
- generated Supabase types for those tables and RPC signatures.

## Supported Current UX

The current app UX is Activity-first:

- sheet-level `Activity`;
- row details `Version History`;
- shared audit-event card language;
- no sheet `Versions` tab;
- no `Compare` action;
- no create named version form;
- no restore-as-copy confirmation;
- no exported app actions named `createEstimateSheetVersion` or `restoreEstimateSheetVersionAsCopy`.

## Why They Stay

Dropping the dormant artifacts would be destructive because the linked remote has already applied the migration and has baseline rows. Keeping them dormant preserves migration compatibility while avoiding a supported product promise that the UI no longer makes. The `V2` / `QA checkpoint` residue is accepted as dormant evidence unless a separate destructive-cleanup task names exact ids and approves deletion.

## When They Can Change

Only change these artifacts under one of these explicit scopes:

- a future proposal/export snapshot plan that revives named immutable or milestone snapshots;
- a destructive cleanup task that explicitly approves dropping or replacing remote schema/data;
- a migration-repair task that must keep the remote project consistent without exposing unsupported UI.

Future proposal/export snapshot work must define export label semantics before exposing dormant named-version data. Dormant `estimate_sheet_versions` rows must not silently become proposal-visible labels or issued-version evidence.

## Rules For Future Agents

- Do not add buttons, tabs, route handlers, server actions, tests, or docs that present named sheet versions as active estimate-sheet UX.
- Do not rely on pre-pivot visual artifacts that show `Versions`, `Compare`, or restore dialogs as current references.
- Do not delete `estimate_sheet_versions`, baseline rows, or restore/create RPCs as routine cleanup.
- Do not run destructive restore/concurrency/rollback probes on the linked remote project.
- Do keep generated types and migrations consistent enough that dormant artifacts do not break builds.
- Do keep Activity and row Version History tests aligned with the current app surface.

## Current Non-Goals

- In-place restore.
- Saved-version-to-saved-version compare.
- Named version creation from the estimate sheet.
- Proposal-issued legal records.
- Export snapshot records.
- Supabase Realtime activity feed.
- Retention pruning or archive compaction.
