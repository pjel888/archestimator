# Implementation Agent Handoff Checklist

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

> Future implementation agents must complete this checklist before touching ANY source code.

## Pre-Implementation (ALL Phases)

- [ ] Read all 27 plan documents in this folder (start with `00_INDEX.md`)
- [ ] Verify live repo state: `git status --short --branch`, `git branch --show-current`
- [ ] Verify plan freshness against current repo (files may have changed since planning)
- [ ] Run GitNexus impact analysis: `gitnexus_impact` on every symbol to be modified
- [ ] Run code-review-graph: `get_architecture_overview`, `get_impact_radius`
- [ ] Read local Next.js docs: `node_modules/next/dist/docs/`
- [ ] Read `AGENTS.md` for project rules and conventions
- [ ] Read `DESIGN.md` for UI constraints
- [ ] Confirm `bun run validate` passes on clean branch before starting

## Per-Phase Checklist

### Start of Phase
- [ ] Create scoped branch: `feat/archive-projects`, `feat/archive-estimates`, etc.
- [ ] Write failing tests FIRST (TDD — RED before GREEN)
- [ ] Run `gitnexus_impact` on ALL symbols to be modified
- [ ] Report HIGH/CRITICAL risk findings before proceeding

### Schema Changes (if applicable)
- [ ] Create migration: `YYYYMMDDHHMMSS_slug.sql`
- [ ] Apply via exact-file linked query (NOT `supabase db push`)
- [ ] Verify migration applied on linked Supabase `ebxxqidacheyapmmzavr`
- [ ] Generate types: `npx supabase gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts`
- [ ] Add manual type patches for new RPCs
- [ ] **STOP HERE** — get owner confirmation before proceeding

### Implementation
- [ ] Implement RPCs (follow `mass_deletion_governance.sql` pattern)
- [ ] Implement server actions
- [ ] Implement repository filters
- [ ] Implement UI components
- [ ] Implement route guards
- [ ] **Archive is simple confirm button for new flows (projects, estimates, templates).** Existing component archive uses typed confirmation via `BulkDestructivePreviewModal`. Typed confirmation is for delete and existing component archive.
- [ ] Reuse `src/components/ui` primitives; no raw button/search/icon-button class strings

### Validation
- [ ] Run `bun run validate` (type-check + lint + design-system + unit + dom)
- [ ] Run `bun run lint:design-system` (BLOCKING if fails)
- [ ] Run `bun run build`
- [ ] Run `bun run test:e2e`
- [ ] All tests GREEN (fix code, not tests)

### Commit
- [ ] Run `code-review-graph detect_changes` before committing
- [ ] Commit with descriptive message: `feat(projects): implement archive/restore flow`
- [ ] Push to origin on scoped branch
- [ ] **Do NOT merge to main** — scoped branch only
- [ ] **Do NOT merge to staging** unless explicitly authorized

## Phase 5 — Shared Recipient Retention

- [ ] DO NOT implement any code for Phase 5
- [ ] Read `22_SHARED_RECIPIENT_AND_PAID_CLIENT_RETENTION_PLAN.md` for architecture understanding
- [ ] Ensure Phases 1-4 decisions do not conflict with future retention model
- [ ] Do NOT add `archived_at` columns that cascade-delete or block retained access paths

## After All Phases Complete

- [ ] Update `.ai/10_state/current-state.md`
- [ ] Update `.ai/10_state/decisions.md`
- [ ] Create bug plans in `.ai/15_Bugs/` for any issues discovered
- [ ] Archive this plan to `.ai/09_archive/store/2026-06-07-archives-feature-complete/`
- [ ] Run full validation: `bun run validate && bun run build && bun run test:e2e`

## Rules (Non-Negotiable)

- **TDD:** Write failing test FIRST, watch it FAIL, then write production code
- **NEVER delete failing tests** — fix the code
- **NEVER use `as any`, `@ts-ignore`**
- **Design-system compliance is BLOCKING:** `bun run lint:design-system` must pass
- **Reuse shared primitives** from `src/components/ui/`
- **Server-authoritative:** archive/restore always validated via RPC
- **Phase 5 is PLANNING ONLY** — no code implementation
- **No main merge** without explicit authorization
