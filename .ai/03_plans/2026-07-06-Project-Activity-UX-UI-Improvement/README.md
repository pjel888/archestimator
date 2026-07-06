# Project Activity UX/UI Improvement Plan

Status: FIRST IMPLEMENTATION PASS COMPLETE.
This pack began as research, audit, and design direction. The first scoped
source pass is now implemented and recorded in `04_IMPLEMENTATION_EVIDENCE.md`.

Last updated: 2026-07-06

## Objective

Comprehensively improve the UX and UI of the project activity page at
`/workshop/projects/[projectId]/activity`, with special emphasis on zero
surprising layout shift, understanding the different activity types, and making
the page useful as an audit surface for project work.

The target experience is a compact project ledger: easy to scan, stable while
loading/filtering/paginating, precise about source and impact, and consistent
with the authenticated workshop product rather than a marketing-style activity
feed.

## Core Recommendation

Replace the current wide card feed and always-expanded filter block with a
stable ledger/timeline layout:

- A compact, fixed-height toolbar with title, count, refresh, primary scope, and
  an active-filter summary.
- A filter drawer or popover for actor, client, and action buckets so filter
  controls do not push the feed down.
- Date-grouped ledger rows with fixed scan columns on desktop and a compact list
  anatomy on mobile.
- Source-specific row detail for estimate edits, publication/share events,
  comments, decisions, client access/security, and collaboration/admin events.
- Skeleton, partial-source warning, load-more pending, and error states with
  reserved dimensions so the first visible row does not jump.

## Read First

1. `01_RESEARCH_AND_CURRENT_AUDIT.md` - what the current page does, what the
   live page looks like, activity families, and external UX evidence.
2. `02_UX_UI_IMPROVEMENT_PLAN.md` - target information architecture, layout,
   responsive behavior, states, accessibility, and no-shift rules.
3. `03_IMPLEMENTATION_HANDOFF_AND_VALIDATION.md` - work packages, expected
   source/test files, acceptance criteria, validation commands, and risks.
4. `04_IMPLEMENTATION_EVIDENCE.md` - changed source, validation evidence, and
   known browser-proof limits for the first implementation pass.

## Key Evidence

- Current desktop screenshot:
  `.omx/artifacts/project-activity-ux-plan/01-current-desktop-top.png`
- First implementation evidence:
  `04_IMPLEMENTATION_EVIDENCE.md`
- Current page source:
  `src/app/workshop/projects/[projectId]/activity/page.tsx`
- Client UI:
  `src/components/workshop/project-activity/ProjectActivityClient.tsx`
- Activity data contract:
  `src/lib/activity/types.ts`
- Activity copy/composition:
  `src/lib/activity/activity-copy-dictionary.ts`,
  `src/lib/activity/activity-composer.ts`,
  `src/lib/activity/activity-formatters.ts`
- Feed repository:
  `src/lib/repositories/project-activity-feed-repository.ts`

## Decision Summary

- Use the existing workshop shell and product visual register.
- Do not add a new external dependency for the feed.
- Do not redesign public share pages or estimate editor activity surfaces in
  this slice.
- Treat layout stability as a product requirement, not a later polish pass.
- Improve unknown/fallback activity copy so repeated "Activity recorded." rows
  do not dominate the page.
- Keep URL-backed filters and transient pagination cursor behavior.

## First-Pass Decisions

- The first implementation includes both the UI refactor and scoped
  copy/composer improvements for unknown estimate/system events.
- The filter surface ships as an overlaid responsive panel, not an always-open
  block in the toolbar.
- Rows stay non-expandable in the first pass to preserve scan density and stable
  closed-row heights.
