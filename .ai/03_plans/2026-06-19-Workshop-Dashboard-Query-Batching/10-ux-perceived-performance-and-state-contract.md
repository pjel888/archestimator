# 10 — UX, Perceived Performance & State Contract

> The implementation goal is no deliberate UI/UX change. That is not enough as a proof standard. This document defines what "unchanged" means for users.

## UX Invariants

The dashboard must preserve:

- the existing route loading skeleton and its bento-like shape;
- no blank white canvas while server data is loading;
- no major layout shift when skeleton resolves to dashboard content;
- the same first meaningful dashboard content order;
- the same empty-state and degraded-state copy;
- the same recent/favorite ordering after deterministic tie-breaks;
- the same focus order and keyboard reachability for quick actions, favorites, tables, and banners;
- the same accessible announcement semantics for loading/degraded content;
- the same responsive placement of the image band, count panels, favorites, and dense ledgers.

The Workshop Dashboard remains under the exploratory exception in `DESIGN.md`; this contract preserves the current approved direction without freezing future owner-led visual iteration.

## User-Facing State Matrix

| State | Required visible result |
|---|---|
| Loading route | Existing skeleton remains shape-compatible with the bento dashboard; no layout jump larger than the baseline. |
| Normal populated workspace | Same visible lists, counts, and quick-action affordances as baseline. |
| First-run workspace | Query batching must not misclassify collaborator workspaces as empty first-run workspaces. |
| Library spotlight null | Dashboard renders with the existing degraded/empty treatment; component count remains the current placeholder behavior. |
| Empty component library | Empty copy remains an empty-library state, not an error state. |
| Optional publications unavailable | Publication/badge surfaces degrade exactly as today; no sibling homebase data disappears. |
| Pending-invite summary unavailable | Invite count degrades to the existing safe value; no stale or unauthorized count appears. |
| Favorite project deleted/invisible | No leaked project name; visible favorites/recent work remain usable. |
| Favorite estimate outside recent window | Favorite remains visible if caller can access it. |
| Mobile viewport | Bento placement, count panels, dense ledger rows, and image band do not overlap or overflow. |

## Perceived-Performance Metrics

Measure server p95 as `05-...` requires, plus:

- browser-visible loading duration for `/workshop`;
- first meaningful dashboard content after navigation;
- skeleton-to-content layout shift;
- whether Phase 0 instrumentation itself delays first paint;
- whether Phase 1 parallel tail work increases CPU/DB pressure enough to make the page feel slower despite fewer waves.

Browser proof is required for the eventual implementation only when these claims cannot be proven statically or with DOM/unit tests. For this docs pack, the required artifact is the gate definition.

## Accessibility Smoke Gate

Before any implementation phase is accepted:

- keyboard tab path reaches quick actions, favorites, recent work, and any invite/publication banners in the same order as baseline;
- focus is not stolen when the dashboard resolves from skeleton to content;
- degraded library/pending-invite states have a screen-reader-readable result;
- loading semantics do not leave permanent `aria-busy` or announce stale content;
- reduced-transparency/reduced-motion settings do not make the skeleton illegible.

## Visual Proof Gate

For the eventual implementation, capture baseline and after screenshots for:

- desktop wide;
- laptop/standard desktop;
- mobile narrow;
- degraded library;
- first-run/empty workspace;
- large-fixture populated workspace.

The proof compares placement, overflow, line wrapping, count panels, dense ledgers, image band, skeleton shape, and focus-visible styling. It is a gate for implementation readiness, not a requirement to run browser automation while authoring this plan.

## UX Stop Rules

- If server p95 improves but first meaningful dashboard content gets slower, do not claim a user win; inspect instrumentation and branch sequencing.
- If data parity passes but visible ordering moves "Continue" or recent/favorite rows unexpectedly, block the phase until the ordering contract is fixed.
- If a degraded enhancement looks like data loss, block the phase until copy/state mapping matches the current behavior.
- If mobile layout overlaps or text escapes containers after loading resolves, block the phase even if data tests pass.
