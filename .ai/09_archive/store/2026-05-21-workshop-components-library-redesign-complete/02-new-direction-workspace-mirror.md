# New Direction: Workspace Mirror

**Date:** 2026-05-21
**Target route:** `/workshop/components`
**Reference route:** `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777701`

## Decision

`/workshop/components` should be shaped like the estimate workspace route, minus the right Component Library sidebar.

The page should no longer feel like a standalone global manager. It should feel like the same workspace pattern users already use to estimate:

```txt
left tree navigator + center working sheet
```

## Product Job

Let a user browse, search, classify, and maintain custom reusable components using the same tree + sheet muscle memory as the estimate page.

## Target Page Model

Left panel:

- mirrors the estimate tree panel width, search row, toolbar row, row density, and selection style;
- tree nodes represent Component Library organization, not estimate nodes;
- tabs let users switch between categories and suppliers first, with later organization tabs only when real data exists;
- selection scopes the center sheet.

Center panel:

- mirrors the estimate sheet layout, search row, toolbar row, sticky header, and scroll area;
- displays custom user components, not estimate row items;
- can start read-only or minimally editable, but must be shaped like a working sheet;
- fills the space where the estimate sheet plus right sidebar would otherwise sit, because this route has no right sidebar.

Right panel:

- absent.

## Superseded Plan Direction

This decision supersedes:

- classification browser as the main route body;
- tree-only navigation with a preview-only center panel;
- keeping the current standalone `/workshop/components` search row and disabled toolbar;
- any implementation that treats the route as an admin manager instead of a workspace.

Classification research remains useful as the taxonomy source for tree and sheet data. It is no longer the shape of the page by itself.

## User-Visible Acceptance

The user should be able to compare the target route to the reference estimate route and see:

- same full-height framed workspace feel;
- same left tree width and visual treatment;
- same locations for search boxes and icon rows;
- a center sheet that uses the estimate sheet rhythm;
- no right Component Library sidebar;
- custom component rows rather than estimate rows.

## Explicit Exclusions

- Do not render `EstimateRightSidebar`.
- Do not render a nested Component Library sidebar inside the Component Library route.
- Do not keep the old route-level search/toolbar.
- Do not route tree selection to `/workshop/projects/.../estimates/...`.
- Do not expose estimate tree add/rename/delete/reorder controls.
- Do not add schema/Supabase persistence until a separate persistence boundary is approved.
