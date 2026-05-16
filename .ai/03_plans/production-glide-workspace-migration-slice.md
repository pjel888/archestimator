# Plan: Production Glide Workspace Migration Slice

**Date:** 2026-05-17
**Status:** In progress

## Goal

Move the production estimate workspace from an HTML-table-first editing surface toward the validated Glide Data Grid adapter while preserving proposal-section mapping, proposal warnings, and route/feature E2E coverage.

## Non-goals

- No Supabase/Postgres migration.
- No main-branch merge.
- No PDF/export engine.
- No complete spreadsheet parity in one jump.

## Strategy

1. Keep canonical estimate data in `Estimate`, `EstimateLineItem`, totals, and proposal snapshot domain helpers.
2. Reuse `src/lib/estimate-grid/adapter.ts` as the only grid package boundary.
3. Introduce Glide into the production workspace as the primary estimate sheet surface.
4. Keep accessible row controls around the grid for proposal-section mapping, delete/reset actions, and E2E-stable interaction until custom Glide cells/overlays are introduced.
5. Preserve the current proposal warning and proposal snapshot behavior.

## Acceptance criteria

- Production project page renders a Glide-backed estimate sheet surface.
- Existing proposal-section mapping controls remain available and testable.
- Existing route/feature E2E baseline remains green.
- ChunkHound, GitNexus, and CodeGraph are run at the beginning and after substantive migration changes.
- `.ai` state docs are updated before push.

## Tooling baseline

- `chunkhound` installed and indexed with `--no-embeddings` because no embedding provider is configured.
- `gitnexus` installed through npm package `gitnexus`; repo indexed successfully.
- `codegraph` installed in the active Python environment; generated graph artifacts under `.ai/14_code_intelligence/`.
