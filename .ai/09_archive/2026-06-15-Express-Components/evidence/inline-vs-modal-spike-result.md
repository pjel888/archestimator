---
title: Inline Versus Modal Spike Result
type: evidence
date: 2026-06-15
status: selected-inline-with-fallback
---

# Inline Versus Modal Spike Result

This artifact is required before U4 coding starts.

## Owner

Product + implementation lead.

## Required Setup

- Estimate with at least 75 rendered rows and one express editor in the middle of the list.
- If disabling virtualization mounts too many rows or causes visible delay, repeat with 300-500 rows or switch to a bounded non-virtual window around the active editor.
- Test both normal inline path and failure/recovery states: name, description, unit, unit cost, Retry/Delete, inline errors, Escape, Tab, and narrow viewport behavior.

## Pass Criteria

- Inline editor does not overlap neighboring rows.
- Active content is not hidden by `content-visibility:auto`, `contain-intrinsic-size:96px`, or `translateY(start - scrollMargin)` behavior.
- Focus order is coherent from name through recovery/actions and back to numeric cells.
- Express text state stays row-local and does not trigger full-tree rerenders.
- Mobile/touch/narrow behavior has no hover-only completion path.

## Spike Result

Inline editing is selected for implementation, with the day-0 safety fallback mandated by doc 09:

- Active express editor rows disable estimate-row virtualization for that table while any express field is focused/dirty.
- Active express rows remove the fixed-height virtual assumptions (`content-visibility:auto` and `contain-intrinsic-size:96px`) so description/errors/recovery actions can expand without overlap.
- Express field state lives in the existing per-row `EditableRowValue` record, not a parallel top-level draft map.
- If focused/dirty editor count cannot be proven for multiple rows, the implementation may enforce a one-active-editor constraint and must test that constraint.

## Browser Proof Still Required

This spike selection does **not** prove final behavior. Q22/Q26/Q49/Q55 still require implementation-phase evidence:

- at least 75 rows with an active editor in the middle of the list;
- 300-500 row stress or a bounded-window alternative before beta release claim;
- narrow/touch viewport editing and recovery controls;
- render probe showing unrelated rows do not re-render on express text input.

## Fail Branch

If implementation/browser proof shows overlap, hidden active content, incoherent focus, or visible 300-500 row cost, U4 must switch to the compact quick-add modal/popover fallback in `03-ux-interaction-design.md` or implement a bounded non-virtual window before release.
