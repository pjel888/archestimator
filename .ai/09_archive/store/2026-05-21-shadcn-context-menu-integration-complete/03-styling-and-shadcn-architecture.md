# Styling and shadcn Architecture

**Date:** 2026-05-21
**Purpose:** Define how shadcn/ui should enter Archestimator without breaking the existing compact design system.

## Architecture Decision

Adopt shadcn/ui as a copied-source primitive library under `src/components/ui`, not as a separate design system and not as a replacement for existing Archestimator primitives.

For this first pass:

- install or copy only `context-menu`;
- customize the generated primitive to Archestimator density and tokens before feature use;
- keep existing primitives as owners of buttons, search, modal, tooltip, badges, chips, and toolbar buttons;
- add a reusable action-menu layer above shadcn so future tree, filter, toolbar, and icon menus share one action item model.

## shadcn Setup Requirements

The repo currently has no `components.json`. Future implementation should add one with Tailwind v4 and existing alias constraints.

Recommended shape:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks",
    "utils": "@/lib/ui"
  },
  "iconLibrary": "lucide"
}
```

Rationale:

- `style: "new-york"` follows current shadcn docs; `default` is deprecated.
- `tailwind.config` is blank because this repo uses Tailwind v4 with `@theme inline`.
- `tailwind.css` points to `src/app/globals.css`, the current Tailwind import and token file.
- `aliases.ui` points to the existing shared primitive folder.
- `aliases.utils` should point to a future `src/lib/ui/index.ts` that exports `cn`, preserving the existing `src/lib/ui/cn.ts`.

Future implementation should create:

```ts
// src/lib/ui/index.ts
export { cn } from "./cn";
```

This avoids duplicating `cn` while satisfying generated shadcn imports.

## Dependency Policy

Expected dependency additions for the first pass:

- `@radix-ui/react-context-menu`
- `lucide-react` if the generated registry component imports lucide indicators

Possible dependency if the CLI adds it:

- `tw-animate-css`

Dependency guardrails:

- Review the CLI diff before accepting it.
- Do not add broad Radix packages for components not used in this slice.
- Do not run `shadcn add --all`.
- Do not overwrite existing `button.tsx`, `modal.tsx`, or toolbar primitives.

## Token Mapping

Archestimator already defines these CSS variables in `src/app/globals.css`:

- `--background`, `--foreground`
- `--primary`, `--accent`, `--accent-dark`, `--accent-soft`
- `--ink`, `--secondary`, `--tertiary`, `--muted`
- `--surface`, `--surface-muted`
- `--hairline`, `--divider`
- `--focus`
- `--danger`, `--danger-soft`

If the generated `context-menu.tsx` references shadcn semantic variables such as `popover`, `popover-foreground`, `border`, `input`, `ring`, `accent`, `accent-foreground`, `destructive`, or `destructive-foreground`, implement one of these options:

1. Preferred for first pass: adapt the context menu component classes to existing Archestimator tokens directly.
2. Acceptable for broader shadcn rollout: add shadcn semantic CSS variables in `globals.css` as aliases to existing Archestimator variables.

Do not replace the existing Archestimator palette with generated shadcn OKLCH colors in this first pass.

## Context Menu Visual Contract

The menu must feel native to the current workshop surface:

- content background: white;
- border: `border-hairline`;
- shadow: subtle only, no heavy dashboard depth;
- radius: `rounded-md` or smaller;
- item height: compact, around 26px to 28px;
- item text: `text-[10px]`, bold or semibold only where needed;
- label/shortcut text: 8px to 9px;
- destructive item: danger text and subtle danger hover, not full red fill;
- focus/highlight: existing surface-muted/accent-soft/focus ring language;
- z-index: above app panels and clipped sidebars, below or compatible with existing tooltip/modal rules.

Current portal layers:

- modal root: `z-[1000]`
- toolbar tooltip: `z-[1100]`

Recommended context menu content layer:

- `z-[1050]` unless testing shows modal or tooltip conflicts.

## Action Menu Abstraction

The user explicitly wants this menu pattern to grow beyond tree right-clicks into filter icons and other icons. Radix Context Menu is correct for right-click/long-press targets, but not the best primitive for normal left-click icon menus.

Therefore the implementation should split:

1. **Action model** - reusable data objects such as `{ id, label, icon, tone, disabled, onSelect }`.
2. **Menu content renderer** - shared visual rendering for groups, items, separators, shortcuts, and destructive tone.
3. **Trigger adapters**:
   - `ContextMenu` adapter for right-click targets, used by Group/Area tree rows first.
   - future `DropdownMenu` or `Popover` adapter for left-click filter icons and toolbar buttons.

This keeps the first feature correct while avoiding a future rewrite when icon-triggered menus arrive.

Potential file names:

- `src/components/ui/action-menu.tsx`
- `src/components/ui/context-action-menu.tsx`
- later: `src/components/ui/dropdown-action-menu.tsx`

The first pass can keep the abstraction small. It only needs to represent:

- `Rename`
- `Delete` with destructive tone
- separator support for future use
- disabled reason support for future cases

## Estimate Tree UX Contract

Initial tree menu behavior:

- Right-click Group Node: show `Rename` and `Delete`.
- Right-click Area Node: show `Rename` and `Delete`.
- Keyboard context menu access should work through Radix where supported by the trigger.
- `Rename` converts that tree row into an inline input in place.
- `Delete` opens a confirmation modal and does not delete immediately.

Required first rename UI:

- The row's icon, indentation, height, and selected background must remain visually stable.
- Replace the title text with a `ControlInput`-style inline input or a local input matching `ControlInput` density.
- Input height should fit inside the 28px row, with `text-[10px]`, no oversized padding, and a visible focus ring.
- The input selects the current name on focus.
- `Enter` commits.
- `Escape` cancels.
- Blur commits if the trimmed value is valid and changed.
- Empty values stay in edit mode with a compact error.
- While editing, row drag and route navigation are suppressed for that row.

Rejected rename alternatives:

- Modal rename: slower and contradicts the required tree-row input behavior.
- Separate side panel rename: too much UI for a high-frequency tree action.
- Server-only rename before local update: makes a small label edit feel laggy.

Recommended first delete UI:

- Use existing `Modal` as a confirmation surface.
- Text must clearly state if deleting a Group Node removes child nodes and row items.
- Confirmation button uses existing `Button variant="danger"`.
- Confirming delete optimistically removes the node/subtree from the visible tree before the server returns.
- Server action performs scoped deletion and returns data; it must not redirect.
- The client handles fallback selection and route replacement only when necessary.

Required no-reload delete behavior:

- no full document reload;
- no `router.refresh()`;
- no server-action `redirect()`;
- no delayed UI removal while waiting for the network;
- no route change when deleting an unselected node outside the active route path;
- client-side `router.replace()` only if the selected/route node was deleted or is a deleted descendant.

## Icon Policy

Current app UI uses Phosphor icons. shadcn examples and generated internals may use lucide. For the first pass:

- Do not migrate existing toolbar/tree icons from Phosphor.
- Allow generated shadcn internal indicators from lucide if the CLI adds them.
- Use text-only `Rename` and `Delete` items unless icons improve scan speed without adding dependency churn.
- If icons are added to the menu, use the same icon library as the final generated primitive for that menu file to avoid mixed icons inside one menu.

## What Not To Do

- Do not hand-roll a custom right-click menu.
- Do not place menu content inside the left sidebar DOM where it can be clipped.
- Do not use context menu as a left-click filter icon hack.
- Do not introduce app-wide shadcn tokens without mapping them to `DESIGN.md`.
- Do not use shadcn default typography if it exceeds the 12px app limit.
- Do not use menu item actions for destructive mutation without confirmation.
- Do not implement rename with a modal or drawer in the first pass; inline input is required.
- Do not implement delete as server redirect or refresh; instant optimistic delete is required.
- Do not combine this with a full Dropdown Menu, Popover, Tooltip, Dialog, Alert Dialog, or Storybook rollout.
