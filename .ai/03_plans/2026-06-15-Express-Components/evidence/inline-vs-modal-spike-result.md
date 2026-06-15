---
title: Inline Versus Modal Spike Result
type: evidence
date: 2026-06-15
status: pending
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

## Fail Branch

If any pass criterion fails, U4 uses the compact quick-add modal/popover fallback in `03-ux-interaction-design.md` before implementation proceeds.

## Result

Pending.
