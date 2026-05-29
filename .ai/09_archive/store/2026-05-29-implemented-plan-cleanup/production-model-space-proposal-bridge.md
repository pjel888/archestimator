# Plan: Production Model Bridge — Space-First Estimating, Consolidated Proposal Output

**Date:** 2026-05-17
**Status:** In progress

## Goal

Separate the contractor's working estimate organization from the client-facing proposal/BOQ grouping:

- Working input axis: spaces/areas/rooms where work happens.
- Proposal output axis: BOQ/trade/proposal sections used for client summaries.

## Non-goals

- Full floor/room/area hierarchy editor.
- Final migration system.
- Supabase/Postgres schema.
- Full proposal PDF engine.

## Current bridge

Use the existing `Estimate.sections` array as the working space/area axis for now, then add:

- `Estimate.proposalSections[]`
- `EstimateLineItem.proposalSectionId?`

This lets the grid remain space-first while proposal snapshots can consolidate multiple spaces into one proposal section.

## Acceptance criteria

- Existing runtime/seed data remains parseable or has mutation fallbacks.
- Proposal snapshots group summary totals by `proposalSectionId` when present.
- Old line items without `proposalSectionId` fall back safely to `sectionId`.
- Unit tests cover consolidation across spaces.
- GitHub/Codex PR comments are addressed.
- Full validation passes before handoff.

## Risks

- The word `sections` still carries old ambiguity until explicit space objects are added.
- Library insert needs a future default mapping from library category/item type to proposal section.
- Proposal detail needs a future space/location column so consolidated BOQ rows do not lose project context.

## Definition of done

- Schema bridge implemented.
- Seed data updated to demonstrate space vs proposal grouping.
- Tests added and passing.
- `.ai` roadmap/current-state/decisions/ledger updated.
- Independent review passes.
