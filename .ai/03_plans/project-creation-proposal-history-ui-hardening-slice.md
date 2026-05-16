# Project Creation + Proposal History + UI Hardening Slice

**Date:** 2026-05-16
**Status:** Implemented on `feat/project-creation-proposal-history-ui-hardening`

## Purpose

Continue building the app as a reusable product system rather than isolated screens:

1. Add a project creation flow.
2. Show proposal history on each project.
3. Harden shared UI primitives for shells, lists, and empty states.
4. Record the estimate grid / drag-drop package direction without prematurely mixing it into this slice.

## Non-goals

- Do not install a spreadsheet/grid package yet.
- Do not install Storybook.
- Do not connect Supabase.
- Do not merge PR stack automatically.

## UI rules

- Prefer `src/components/ui/` primitives before one-off markup.
- Extract repeated layout into `PageShell` / `SectionHeader` / `EmptyState` / `ObjectCard` style primitives.
- Keep forms accessible with labels and submit buttons.
- Use server actions for mutation and repository boundary for local data.

## Acceptance criteria

- Home dashboard can create a new project.
- New project receives a first draft estimate and becomes visible immediately after redirect/revalidation.
- Project page displays proposal history with links to issued snapshots.
- Empty proposal history has a useful empty state.
- Estimate grid package direction is documented in `.ai/05_decisions/estimate-grid-drag-drop-package-adr.md`.
- Full local gate passes.
