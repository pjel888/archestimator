# Execution Ledger

**Purpose:** Chronological record of Archestimator implementation slices, validation gates, decisions, and handoff notes for future sessions and agents.

## Current active thread

- **Date:** 2026-05-17
- **Branch:** `spike/estimate-grid-drop-targeting-ux`
- **Goal:** Address Codex/GitHub review comments, establish autopilot docs, and begin the production model bridge for space-first estimating with consolidated proposal output.
- **Status:** In progress
- **Validation target:** `bun run validate && bun run build && bun run test:e2e`

## Ledger entries

### 2026-05-17 — Autopilot documentation and production model bridge

**Status:** Implemented; full validation and re-review passing

**Type:** docs + data model + tests

**What changed:**

- Checked GitHub PR inline comments from Codex on PR #5 and PR #6.
- Fixed the actionable PR #6 issue: editing the visible Unit cost cell now updates `materialUnitCost` when material cost is the field used by totals.
- Added unit coverage for material-backed unit cost edits.
- Added `proposalSections` to estimates as the BOQ/proposal consolidation axis.
- Added optional `proposalSectionId` to estimate line items.
- Updated proposal snapshot summaries to consolidate by `proposalSectionId`, keep legacy `sectionId` fallback for old data, and surface unmapped working rows as an explicit unassigned proposal summary instead of silently dropping totals.
- Updated seed data so working estimate sections represent spaces/areas while proposal sections represent client-facing BOQ/trade sections.
- Created this execution ledger.
- Refreshed `.ai/01_roadmap/README.md` for MVP continuity.

**Validation so far:**

- `bun run validate && bun run build && bun run test:e2e` — passed after review remediation: 24 unit, 4 Vitest DOM, 4 Playwright E2E.
- Independent review requested changes for unmapped proposal-section fallback, ambiguous snapshot identifiers, restored immutable snapshot coverage, and stale ledger status.
- Review remediation applied: unmapped working rows are visible as unassigned, proposal summaries now use `proposalSectionId` as the primary consolidated identifier, immutable snapshot coverage is restored, and ledger status is current.
- Independent re-review: PASS. Targeted reviewer tests passed: 14 pass, 0 fail.

**Follow-ups:**

- Commit and push this slice to the current PR branch or a stacked production-model branch.

**Risks / notes:**

- This is a bridge, not the final full space hierarchy. `sections` still acts as the working space/area collection until the next schema migration introduces explicit floor/room/area objects.
- Runtime local JSON may still contain older estimates. Mutation code includes fallback handling for missing `proposalSections`.
