# Project Dashboard Screen Spec And Test Contract

**Date:** 2026-06-14  
**Status:** UX/UI screen specification. No implementation.  
**Depends on:** `06-cockpit-revision-plan.md`, `07-requirement-coverage-and-evidence-matrix.md`, and `08-decision-brief-for-next-implementation-pass.md`.

## Purpose

This file translates the Project Cockpit direction into a concrete screen contract for the next implementation pass. It names the visible zones, interaction behavior, low-data states, data fields, and test changes needed to replace the older "Honest Hero" scope.

The screen remains a compact authenticated workshop surface. It must not become a landing page, a generic KPI dashboard, or a card-heavy analytics page.

## Current Anchors To Preserve

| Anchor | Keep | Change |
|---|---|---|
| `ProjectDashboardClient` | Keep left project-details aside and route ownership. | Replace the main overview composition with cockpit zones. |
| `DashboardHeadline` | Keep honest recency language and budget variance semantics. | Demote from hero-card dominance into a work summary band. |
| `DashboardCostMix` | Keep shared donut, grouping control, top 5 plus Other, table, `aria-describedby`, and truncation notice. | Add estimate `DropdownSelect`, selected bucket details, and selected-estimate URL sync. |
| `DashboardEstimateList` | Keep compact row density and open/compare links. | Replace "Other estimates" with "Recent estimate sheets" that includes the selected estimate. |
| `ProjectActivityList` | Keep capped activity and concise rows. | Distinguish no activity from activity flag off, and include proposal activity once wired. |
| `ProjectChromeAsync` | Keep Share/Teamspace ownership in header chrome. | Project a read-only readiness summary into dashboard body. |

## Screen Anatomy

### Overall Shell

- Preserve the existing two-column route shape: editable project details aside, dashboard body in `<main>`.
- Main body max width stays left-aligned, not centered.
- Use stacked zones on narrow widths.
- Use a two-column cockpit grid only when there is enough width:
  - left column: Work Summary, Recent Estimate Sheets, Recent Activity;
  - right column: Cost Composition, Readiness And Risk.
- Do not put cards inside cards.
- Each zone is either an unframed section or a single flat hairline panel. No decorative shadows.

### Zone A: Work Summary

Job: answer what estimate is driving the project.

Visible content:

- selected estimate sheet code and name;
- selected estimate total;
- budget variance if a positive budget exists;
- updated time;
- project-wide rollup caption only when all estimates share one currency;
- actions: `Open sheet`, `Compare`, `Prepare proposal` or `Review proposal`.

Design:

- No marketing-scale number. Use `DESIGN.md` app tokens, maximum `12px`.
- Use hierarchy through position, density, tabular numbers, and contrast.
- Do not reintroduce a 4-up KPI grid.

States:

- No budget: show `No budget set`, not a fabricated zero variance.
- Mixed currency: show `Mixed currencies`, not a summed total.
- Selected estimate has zero rows: show total as zero and surface `No rows yet` as a readiness item.

### Zone B: Recent Estimate Sheets

Job: help the user choose what to open next.

Visible content per row:

- sheet code;
- sheet name;
- total and currency;
- updated time;
- row count when available;
- budget state;
- proposal inclusion marker when selected for publication;
- actions: `Open`, `Compare`, `Prepare` or `Review`.

Rules:

- Include the selected estimate in the list.
- Show 5 to 8 rows.
- Sort by updated time descending, except keep the selected estimate visually marked wherever it appears.
- If only one estimate exists, still render one row.
- If no estimates exist, render a compact next-step panel, not an empty worklist.

Copy:

- Section label: `Recent estimate sheets`.
- Selected marker: `Selected`.
- Publication marker: `In proposal`.

### Zone C: Cost Composition

Job: explain where selected-estimate money goes.

Controls:

- `DropdownSelect` for estimate sheet selection.
- `SegmentedControl` for grouping: Category, Space, Supplier.

URL contract:

- `?estimate=<estimateId>&mode=<category|space|supplier>`.
- Missing or invalid estimate falls back to most recently updated estimate.
- Missing or invalid mode falls back to `category`.
- User changes update URL state without full conceptual navigation.

Content:

- donut with top 5 plus Other;
- adjacent coded table;
- selected bucket details panel;
- truncation notice when data was capped.

Selected bucket details:

- bucket label;
- amount;
- share;
- row count if known;
- selected estimate name;
- grouping mode;
- primary action according to `08`:
  - `Open space` for space buckets with known node id;
  - `Open estimate sheet` for category/supplier or unsupported filters;
  - `Open matching rows` only after route support exists.

Accessibility:

- Donut must keep `aria-describedby` pointing to the table.
- Table remains visible, not screen-reader-only.
- Segment and row selection must be keyboard operable.
- Status and risk cues cannot rely on color alone.

### Zone D: Readiness And Risk

Job: show whether the project can become a proposal.

Inputs:

- selected estimate;
- selected estimate row count;
- project name;
- client;
- address;
- currency;
- publication status;
- selected publication estimate count;
- stale snapshot warning;
- password and expiry status;
- open count and latest recipient activity;
- email delivery readiness when cheap or already available.

Visible groups:

- `Proposal readiness`;
- `Needs attention`.

Readiness rows:

- `Estimate selected`;
- `Rows available`;
- `Client`;
- `Address`;
- `Shared link`;
- `Snapshot freshness`;
- `Recipient activity`;
- `Email delivery`.

Risk rows:

- over budget;
- missing budget;
- mixed currency;
- truncated cost data;
- zero rows;
- stale snapshot;
- expired or revoked publication;
- sample fallback with no live estimate data.

Rules:

- Only show `Needs attention` when at least one real item exists.
- Every item needs either an action or an informational reason.
- Do not duplicate the Share modal fields.
- One primary action for the zone: `Prepare proposal`, `Review share settings`, or `Refresh shared link`.

### Zone E: Recent Activity

Job: show what changed recently.

Content:

- capped 8-row feed;
- estimate events;
- collaboration events;
- proposal comment, decision, sent, resent, publish, refresh, revoke, expire, and latest-open summary events once wired.

Rules:

- No autosave.
- No presence or cursor events.
- No raw audit dump.
- No repeated same-actor bursts.
- Flag off: show a compact informational line only if useful.
- No activity: show `No recent activity yet`.

## Low-Data State Matrix

| State | Dashboard behavior |
|---|---|
| No project row, sample fallback | Show project aside and a sample-safe next-step panel. Do not imply live estimate data exists. |
| Real project, zero estimates | Show estimate creation next step and hide cost composition. |
| One estimate | Show Work Summary, Recent Estimate Sheets with one selected row, Cost Composition if rows exist, Readiness, and Activity. |
| Estimate has zero rows | Show Work Summary and estimate row. Cost Composition shows zero-row empty state. Readiness flags `No rows yet`. |
| Activity feature flag off | Do not render a broken-looking activity panel. Use compact environment note only when useful. |
| Mixed currencies | Avoid project total sum. Keep per-estimate totals and show a mixed-currency caption. |
| Truncated data | Keep chart/table visible, but label partial figures near Cost Composition and Needs Attention. |
| Published link expired or revoked | Readiness shows `Expired` or `Revoked` and routes to share settings. |

## Data Contract Additions

`ProjectDashboardSummary` should grow from cost overview to cockpit summary:

- `selectedEstimateId`;
- `selectedGroupingMode`;
- `estimateSheets[]`;
- `costMix`;
- `selectedBucket` client state, not server default;
- `readiness`;
- `risks[]`;
- `activitySummary` or existing `activity` prop with flag state metadata.

`estimateSheets[]` row fields:

- `id`;
- `name`;
- `sheetCode`;
- `total`;
- `currencyCode`;
- `updatedAt`;
- `rowCount`;
- `firstNodeId`;
- `budget`;
- `variance`;
- `isSelected`;
- `isIncludedInProposal`;

`readiness` fields:

- `status`;
- `primaryAction`;
- `exportItems[]`;
- `shareItems[]`;
- `latestRecipientActivityAt`;
- `latestRecipientLabel`;

`risks[]` fields:

- `id`;
- `severity`;
- `label`;
- `detail`;
- `actionLabel`;
- `href` or `actionKind`;

## Test Contract

Existing tests to preserve as regression guards:

- `CostDonutChart hideCallouts regression` keeps arcs inside SVG viewport.
- Cost mix table and `aria-describedby` wiring stays required.
- Mixed currency never creates a fake project-wide total.
- Foreign or invalid estimate ids return null or fall back without leakage.
- First-run panel remains for zero-estimate projects.

Tests to rewrite or replace:

- `DashboardEstimateList` should no longer expect an "Other estimates" section or empty render for one estimate.
- `ProjectDashboardClient` should no longer assert that the main overview is only a cost overview.
- `DashboardCostMix` should add selected estimate dropdown tests, URL sync expectations, and selected bucket state.
- `ProjectActivityList` should separate flag-off copy from true no-activity copy.
- Repository tests should add selected-estimate fallback and selected estimate summary assembly.

New tests required:

1. `ProjectDashboardPage` reads `searchParams.estimate` and `searchParams.mode`.
2. Invalid selected estimate falls back to most recent estimate.
3. Selected estimate dropdown uses project-native `DropdownSelect`.
4. Changing selected estimate preserves grouping mode.
5. Changing grouping mode preserves selected estimate.
6. Recent estimate sheets include the selected estimate.
7. One-estimate projects still render a worklist.
8. Cost bucket details render after table row or segment selection.
9. Unsupported bucket filtering shows honest fallback action.
10. Proposal readiness combines export and shared-link signals.
11. Needs-attention list appears only with real issues.
12. Activity flag-off and no-activity states have distinct copy.
13. `delafuentehouse` authenticated browser proof is captured before completion.

## Visual QA Contract

Before implementation can be called complete:

- capture authenticated `/workshop/projects/delafuentehouse` at desktop, laptop, and tablet widths;
- verify no text overlap in the cockpit grid;
- verify dropdown panels are not clipped by scroll containers;
- verify donut/table/selected bucket state all match the same selected estimate;
- verify project aside remains usable;
- verify Share and Teamspace header chrome still own their controls;
- verify no app text exceeds the approved app scale unless a later named exception exists.

## Handoff

The next implementation pass should treat this file as the concrete screen target. `06` defines the direction, `07` proves coverage, `08` resolves decisions, and this file defines the visible screen and tests.
