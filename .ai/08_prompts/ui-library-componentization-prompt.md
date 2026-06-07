I used your uploaded plan/prompt structure as the quality bar, but this is written as a **direct implementation prompt** for the next overlay-hardening pass, not a plan-creation prompt. 

````md
You are ChatGPT/Codex/Claude Code/OpenCode/CommandCode/OMX acting as a senior startup technical founder, principal engineer, product strategist, technical architect, Storybook architect, UI component library architect, design-system lead, accessibility engineer, QA strategist, security/performance reviewer, repo-aware implementation agent, documentation maintainer, and careful git/worktree operator.

You are implementing the production-hardening pass for the ArchEstimator Storybook-first UI Component Library overlay system.

Repository:
- GitHub repo: pjel888/archestimator
- Local repo path: /Users/philiplewis/archestimator
- Current overlay system branch / PR: feat/storybook-complete-ui-component-system
- PR: #30, “Complete Storybook overlay component system”
- Base branch for this continuation: feat/storybook-complete-ui-component-system
- Previous base: fix/storybook-standalone-ui-components
- Main branch: main
- Remote: origin
- Plan folder:
  /Users/philiplewis/archestimator/.ai/03_plans/2026-06-06-ui-component-optimization-componentization

FEATURE / CHANGE REQUEST:
Philip reviewed the new overlay/modal/dialog/pop-up system and the direction is correct, but before this can be considered production-grade for future app migration, the overlay primitives need a hardening pass.

Implement focus trap, body scroll lock, outside-click/Escape behavior consistency, overlay stack safety, accessibility hardening, and stronger Storybook/testing coverage for the overlay system.

This pass must harden:

- Dialog primitives
- AppModal / BlurModal / Modal
- ResizableModal / FloatingModal / PopupWindow
- ConfirmDialog / AlertDialog / DeleteConfirmDialog / UnsavedChangesDialog
- Sheet / Drawer / SidePanel / InspectorDrawer
- Popover / InfoPopover / HelpPopover / FilterPopover
- Tooltip / ToolbarTooltip compatibility
- HoverCard
- CommandDialog / CommandPalette / CommandMenu

PRIMARY GOAL:
Make the overlay system safe enough to be the canonical future ArchEstimator overlay primitive family, while still keeping this branch Storybook-first and not migrating production routes.

The final result should be reviewable in Storybook and validated by tests. The overlay primitives should support:

1. Focus trapping for modal dialogs.
2. Initial focus and focus return.
3. Body scroll lock for blocking modal overlays.
4. No body scroll lock for floating/resizable non-modal pop-ups.
5. Consistent Escape behavior.
6. Consistent outside-click behavior.
7. Overlay stack safety so Escape closes only the topmost dismissible overlay.
8. Non-dismissible modal support.
9. Internal scroll regions.
10. Header contract: title upper left, close button upper right.
11. Accessible title/description labelling.
12. Predictable close button labelling.
13. Reduced-motion-safe transitions if any are used.
14. Storybook stories proving the behavior.
15. DOM tests proving the behavior.
16. No provider/server/data coupling.

OWNER APPROVAL GRANTED BY THIS PROMPT:
Philip approves this Storybook/UI-library overlay hardening pass, including:

- Editing reusable UI components under `src/components/ui/overlays/**`.
- Editing the compatibility barrel `src/components/ui/modal.tsx` only if backward compatibility is preserved.
- Editing `src/components/ui/index.tsx` exports.
- Adding internal overlay/focus/scroll-lock utilities.
- Adding focused DOM/Vitest tests for overlay behavior.
- Adding or updating Storybook stories under `src/stories/overlays/**`.
- Updating `scripts/check-storybook-component-coverage.mjs`.
- Updating `tests/vitest/storybook-component-coverage.test.ts`.
- Updating `.ai` implementation logs, readiness docs, review packet, and state docs.
- Adding a Radix package only if the local implementation becomes clearly unsafe or too fragile, and only after documenting the decision and alternatives.

OWNER APPROVAL NOT GRANTED BY THIS PROMPT:
- No production route migration.
- No app-wide replacement of existing route UI.
- No Supabase migration.
- No generated Supabase type changes.
- No provider setting changes.
- No Vercel deployment.
- No public Storybook hosting.
- No Flowbite runtime/plugin.
- No Flowbite Pro paid-source copying or storage.
- No Aceternity runtime package.
- No Motion/Framer dependency by default.
- No broad dark mode implementation.
- No replacement of React Complex Tree.
- No production auth/provider/data behavior change.
- No main/staging merge.

HARD BOUNDARY:
This pass hardens reusable overlay primitives and Storybook coverage. Production app migration remains blocked until Philip separately approves a route-by-route migration plan after reviewing the hardened Storybook.

CRITICAL RULE:
Do not fake accessibility with notes only. Focus trap, scroll lock, Escape handling, outside-click behavior, and overlay stack behavior must be implemented and tested where they are required.

================================================================================
0. INITIAL REPO SAFETY CHECK
================================================================================

Run and record:

```bash
cd /Users/philiplewis/archestimator
pwd
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
````

Assume another codebase AI agent may be working in the repo.

Do not:

* force push;
* use `git reset --hard`;
* use `git clean -fd`;
* overwrite unrelated dirty files;
* stage unrelated files;
* delete branches;
* delete worktrees;
* touch secrets;
* change provider settings;
* merge to main automatically.

If unrelated dirty files exist, leave them alone and mention them in the final report.

================================================================================

1. BRANCHING STRATEGY
   ================================================================================

Start from the overlay-system PR branch:

```bash
git fetch --prune origin
git checkout feat/storybook-complete-ui-component-system
git pull --ff-only origin feat/storybook-complete-ui-component-system
```

Create a continuation branch:

```bash
git checkout -b feat/storybook-overlay-production-hardening
```

If that branch already exists:

```bash
git checkout -b feat/storybook-overlay-production-hardening-$(date +%Y%m%d-%H%M)
```

Do not direct-edit `main`.
Do not merge to `main`.
Push the final branch.
Create a PR only if available; do not merge it.

================================================================================
2. REQUIRED READING ORDER
=========================

Before editing source/story/package/docs files, read:

1. `AGENTS.md`
2. `CLAUDE.md` if present
3. `.ai/README.md`
4. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` if present
5. `.ai/00_system/ai-folder-canonical-map.md` if present
6. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
7. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` if present
8. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` if present
9. `.ai/00_system/VALIDATION_MATRIX.md` if present
10. `.ai/10_state/current-state.md`
11. `.ai/10_state/decisions.md`
12. `.ai/10_state/known-issues.md` if present
13. `.ai/01_roadmap/README.md`
14. `DESIGN.md`
15. `package.json`
16. `README.md`
17. `components.json` if present
18. `scripts/enforce-app-design-system.mjs`
19. `scripts/check-storybook-boundary.mjs`
20. `scripts/check-storybook-component-coverage.mjs`
21. `src/app/globals.css`
22. `.storybook/main.ts`
23. `.storybook/preview.tsx`
24. Overlay primitives:

    * `src/components/ui/overlays/dialog.tsx`
    * `src/components/ui/overlays/modal.tsx`
    * `src/components/ui/overlays/resizable-modal.tsx`
    * `src/components/ui/overlays/confirm-dialog.tsx`
    * `src/components/ui/overlays/sheet-drawer.tsx`
    * `src/components/ui/overlays/popover.tsx`
    * `src/components/ui/overlays/tooltip.tsx`
    * `src/components/ui/overlays/hover-card.tsx`
    * `src/components/ui/overlays/command-dialog.tsx`
    * `src/components/ui/modal.tsx`
    * `src/components/ui/index.tsx`
25. Overlay stories:

    * `src/stories/overlays/dialog-system.stories.tsx`
    * `src/stories/overlays/app-modal.stories.tsx`
    * `src/stories/overlays/resizable-modal.stories.tsx`
    * `src/stories/overlays/confirm-dialog.stories.tsx`
    * `src/stories/overlays/sheet-drawer.stories.tsx`
    * `src/stories/overlays/popover.stories.tsx`
    * `src/stories/overlays/tooltip.stories.tsx`
    * `src/stories/overlays/hover-card.stories.tsx`
    * `src/stories/overlays/command-dialog.stories.tsx`
26. Relevant tests:

    * `tests/vitest/ui-modal-tooltip.test.tsx`
    * `tests/vitest/release-announcement-modal.test.tsx`
    * `tests/vitest/storybook-component-coverage.test.ts`
    * `tests/vitest/storybook-provider-boundary.test.ts`
27. Plan folder:

    * `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/00_INDEX.md`
    * `README.md`
    * `CURRENT_CANONICAL_PLAN.md`
    * `37_PHILIP_STORYBOOK_REVIEW_PACKET.md`
    * `38_VALIDATION_COMMAND_MATRIX.md`
    * `39_STANDALONE_COMPONENT_COVERAGE_AUDIT.md`
    * `40_MODAL_DIALOG_SYSTEM_IMPLEMENTATION.md`
    * `41_COMPLETE_COMPONENT_SYSTEM_COVERAGE.md`

For framework or Next.js behavior, read relevant local Next.js docs under `node_modules/next/dist/docs/` before modifying framework-related code.

================================================================================
3. CURRENT BRANCH AUDIT REQUIREMENTS
====================================

Before implementation, audit the current overlay system and write findings to `.ai/05_logs`.

Run:

```bash
git diff --stat fix/storybook-standalone-ui-components...HEAD
git diff --name-status fix/storybook-standalone-ui-components...HEAD
find src/components/ui/overlays -type f | sort
find src/stories/overlays -type f | sort
rg "focus|trap|Escape|scroll|overflow|overlay|outside|pointer|aria-modal|aria-labelledby|aria-describedby|Dialog" src/components/ui/overlays src/stories/overlays tests/vitest/ui-modal-tooltip.test.tsx
bun run storybook:check-components
bun run storybook:check-boundary
```

Record:

* Current overlay component files.
* Current overlay story files.
* Current tests.
* Which behavior is implemented.
* Which behavior is missing.
* Whether focus trap exists.
* Whether scroll lock exists.
* Whether Escape handling is stack-safe.
* Whether outside-click behavior is consistent.
* Whether nested overlays are safe.
* Whether floating/resizable pop-ups avoid background blur and scroll lock.
* Whether AppModal still preserves current Modal compatibility.
* Whether coverage script validates the new hardening stories.

================================================================================
4. CODEBASE INTELLIGENCE REQUIREMENTS
=====================================

Use GitNexus and/or code-review-graph tools first if available, per `AGENTS.md`.

Before broad manual scanning, inspect:

* shared UI primitive blast radius;
* `Modal`;
* `AppModal`;
* `Dialog`;
* `ResizableModal`;
* `ConfirmDialog`;
* `Sheet`;
* `Popover`;
* `Tooltip`;
* `HoverCard`;
* `CommandDialog`;
* `ReleaseAnnouncementModal` usage if affected;
* current Storybook overlay files;
* current Storybook coverage script.

Before editing any production-used component or exported primitive:

* run GitNexus impact for the exact symbol if available;
* run code-review-graph impact/context if available;
* record HIGH/CRITICAL risks;
* keep high-impact changes backward-compatible;
* add focused tests if behavior changes.

If graph tools are unavailable:

* document unavailability;
* fall back to `rg`, `rg --files`, `git grep`, `find`, direct file reading, and `git diff`;
* do not hallucinate files/APIs/routes/components/tests.

================================================================================
5. EXTERNAL RESEARCH REQUIREMENTS
=================================

Research and record a concise source posture before implementation.

Check current official/public docs for:

1. WAI-ARIA Authoring Practices:

   * Dialog / Modal Dialog pattern.
   * Tooltip pattern.
   * Disclosure/popover-like guidance where relevant.
   * Keyboard interaction expectations.

2. shadcn/ui:

   * Dialog.
   * Alert Dialog.
   * Sheet.
   * Popover.
   * Tooltip.
   * Hover Card.
   * Command.
   * Scroll Area.
   * Resizable.

3. Radix UI:

   * Dialog.
   * Popover.
   * Tooltip.
   * Hover Card.
   * Focus management behavior.
   * Dismissable layer behavior.

4. Flowbite public docs:

   * Modal.
   * Drawer.
   * Popover.
   * Tooltip.
   * Dropdown.

5. Storybook:

   * Interaction/play functions.
   * Accessibility addon.
   * Next.js Vite framework.
   * Static build validation.

Rules:

* Prefer hardening the current local implementation first.
* Add Radix packages only if local behavior would be unsafe or too complex.
* Flowbite remains reference-only.
* Aceternity remains motion/reference-only.
* Do not record paid/pro/private source content.
* All visual defaults must follow ArchEstimator `DESIGN.md`.

Update `.ai/05_logs` and/or `40_MODAL_DIALOG_SYSTEM_IMPLEMENTATION.md` with concise research notes.

================================================================================
6. DESIGN SYSTEM RULES
======================

All non-landing app/workshop UI must follow `DESIGN.md`.

Hard constraints:

* SF Pro stack for app/workshop.
* Regular/medium weights only.
* 12px maximum visible app/workshop text unless explicitly approved.
* Normal controls/body/table/input/button text around 10px.
* Labels/meta/helper text around 8–9px.
* Zero letter spacing.
* xs/3px radius only.
* Neutral product colors.
* Phosphor regular outline icon style.
* Reuse `src/components/ui` and `src/components/workshop` primitives before creating route-local controls.
* Design-system lint failures are blocking.
* Landing/marketing-only Aceternity-style effects must stay separate and labelled `LANDING_ONLY`.

Do not make ArchEstimator look like generic oversized Flowbite SaaS UI.
Do not make workshop/product surfaces decorative, gradient-heavy, or motion-heavy.
Do not introduce arbitrary text sizes/radii/shadows outside token policy.

================================================================================
7. PACKAGE AND DEPENDENCY RULES
===============================

Do not add packages unless local hardening cannot be made safe.

Preferred path:

* Implement local focus trap, overlay stack, scroll lock, and outside interaction utilities.

Allowed only if strongly justified:

* `@radix-ui/react-dialog`
* `@radix-ui/react-popover`
* `@radix-ui/react-tooltip`
* `@radix-ui/react-hover-card`

Default forbidden:

* Flowbite runtime/plugin.
* Flowbite Pro source.
* Motion/Framer.
* Aceternity runtime package.
* New chart package.
* New utility package duplicating existing `class-variance-authority`, `clsx`, `tailwind-merge`, or `cn`.

If adding a package:

1. document why local/native code is insufficient;
2. update `.ai/10_state/decisions.md`;
3. update `.ai/03_plans/.../40_MODAL_DIALOG_SYSTEM_IMPLEMENTATION.md`;
4. run `bun install`;
5. run full validation;
6. include rollback notes.

================================================================================
8. IMPLEMENTATION TARGET: OVERLAY HARDENING UTILITIES
=====================================================

Create internal reusable utilities under a clear location such as:

```txt
src/components/ui/overlays/overlay-utils.ts
src/components/ui/overlays/focus-utils.ts
src/components/ui/overlays/overlay-stack.ts
```

or one well-organized file if simpler.

Implement the following capabilities.

A. Focusable Element Discovery

Create utility:

```ts
getFocusableElements(container: HTMLElement): HTMLElement[]
```

Must include common focusable selectors:

* `a[href]`
* `button:not([disabled])`
* `textarea:not([disabled])`
* `input:not([disabled])`
* `select:not([disabled])`
* `[tabindex]:not([tabindex="-1"])`
* `[contenteditable="true"]`

Must ignore:

* disabled elements;
* hidden elements;
* elements with `aria-hidden="true"`;
* elements with `display: none`;
* elements with `visibility: hidden`.

B. Focus Trap

Create hook or utility:

```ts
useFocusTrap({
  enabled,
  containerRef,
  initialFocusRef,
  finalFocusRef,
  restoreFocus,
  onEscapeKeyDown,
  isTopmost,
})
```

Required behavior:

* When enabled and open, move focus into the dialog.
* Prefer `initialFocusRef`.
* Else focus first focusable element.
* Else focus the dialog content container.
* Trap Tab and Shift+Tab inside the container.
* If user Tabs from last focusable, wrap to first.
* If user Shift+Tabs from first focusable, wrap to last.
* If focus leaves by programmatic behavior, do not crash.
* Return focus to previous active element or `finalFocusRef` on close.
* Must work in JSDOM tests.
* Must not trap focus for non-modal floating popups unless `trapFocus` is explicitly true.

C. Body Scroll Lock

Create hook or utility:

```ts
useBodyScrollLock(enabled: boolean)
```

Required behavior:

* Lock body/document scroll only when blocking modal overlays are open.
* Do not lock scroll for `ResizableModal` / `FloatingModal` / `PopupWindow` when `modal=false`.
* Do not lock scroll for `SidePanel` / `InspectorDrawer` when non-modal.
* Ref-count nested locks.
* Restore previous `body.style.overflow`.
* Restore previous `body.style.paddingRight`.
* Optionally compensate scrollbar width.
* Clean up on unmount.
* Must be safe in SSR / Storybook.

D. Overlay Stack

Create a stack manager:

```ts
useOverlayStack({
  open,
  modal,
  dismissible,
})
```

or equivalent.

Required behavior:

* Each open overlay gets a stack id.
* Only the topmost overlay responds to Escape.
* Only the topmost overlay handles overlay-dismiss outside click.
* Nested dialogs should not close parent when child closes.
* Non-modal floating windows can be topmost for Escape if focus is inside them.
* Cleanup stack entries on close/unmount.
* Must be deterministic in tests.

E. Escape Handling

Standardize:

* `closeOnEscape` default `true` for dismissible overlays.
* `closeOnEscape={false}` prevents Escape dismissal.
* Escape closes only topmost overlay.
* Escape does not close non-dismissible confirm dialogs.
* Escape behavior is documented in Storybook.
* Escape behavior is tested.

F. Outside Click / Overlay Click Handling

Standardize:

* AppModal / BlurModal:

  * overlay click closes by default if `closeOnOverlayClick=true`;
  * can disable overlay close.
* ConfirmDialog / DeleteConfirmDialog:

  * overlay click should default to disabled or carefully configurable for destructive dialogs.
* ResizableModal / FloatingModal / PopupWindow:

  * no overlay by default;
  * outside background remains interactive by default when non-modal;
  * if `withOverlay=true`, overlay behavior follows props.
* Sheet / Drawer:

  * scrim click closes when `withScrim=true` and dismissible.
  * InspectorDrawer defaults no scrim and no outside close.
* Popover:

  * outside click closes.
  * click inside does not close unless component action does.
* Tooltip:

  * closes on mouse leave, blur, and Escape when open.
* HoverCard:

  * closes on mouse leave/blur and Escape when open.

G. Data Attributes

Add consistent data attributes for testing and styling:

* `data-state="open|closed"`
* `data-modal="true|false"`
* `data-dismissible="true|false"`
* `data-resizable="true|false"`
* `data-side`
* `data-size`
* `data-tone`

Where useful.

================================================================================
9. HARDEN DIALOG PRIMITIVES
===========================

Update `src/components/ui/overlays/dialog.tsx`.

Current good parts to preserve:

* Portal behavior.
* Overlay.
* Header/title/description/body/footer/actions/close button.
* Escape handling.
* Focus return.
* Compact design.
* Phosphor close icon.

Add or harden:

* Focus trap support.
* Body scroll lock support.
* Overlay stack support.
* `initialFocusRef`.
* `finalFocusRef`.
* `trapFocus`.
* `lockScroll`.
* `dismissible`.
* `onEscapeKeyDown`.
* `onPointerDownOutside` or equivalent.
* topmost overlay guard.
* `closeOnOverlayClick`.
* `closeOnEscape`.
* `modal`.
* `returnFocusOnClose`.
* data attributes.

Target `DialogProps` shape:

```ts
type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  closeLabel?: string;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  dismissible?: boolean;
  modal?: boolean;
  trapFocus?: boolean;
  lockScroll?: boolean;
  returnFocusOnClose?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  finalFocusRef?: RefObject<HTMLElement | null>;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent | MouseEvent) => void;
};
```

Default behavior:

* `modal=true` means `trapFocus=true` and `lockScroll=true` unless explicitly false.
* `modal=false` means no focus trap and no scroll lock unless explicitly true.
* `dismissible=true` by default.
* `closeOnEscape=true` by default if dismissible.
* `closeOnOverlayClick=true` by default if dismissible.
* Non-dismissible dialogs ignore Escape and overlay click.

Do not break existing `Dialog` usages.

================================================================================
10. HARDEN APP MODAL / BLUR MODAL / MODAL
=========================================

Update `src/components/ui/overlays/modal.tsx`.

Requirements:

* Preserve `AppModal`, `BlurModal`, `Modal`.
* Preserve `src/components/ui/modal.tsx` compatibility export.
* Preserve existing app import compatibility.
* Add passthrough props:

  * `dismissible`
  * `trapFocus`
  * `lockScroll`
  * `initialFocusRef`
  * `finalFocusRef`
  * `returnFocusOnClose`
  * `onEscapeKeyDown`
  * `onPointerDownOutside`
* AppModal default:

  * `modal=true`
  * `trapFocus=true`
  * `lockScroll=true`
  * `blurBackdrop=true`
  * close button upper right
  * title upper left
  * internal body scroll
* Destructive `AppModal`:

  * `role="alertdialog"`
  * safe focus handling.
* Add `data-size`, `data-tone`, `data-state`.

Backward compatibility:

* Existing `Modal` import from `@/components/ui/modal` must still work.
* Existing `Modal` props from the old API must still work:

  * `open`
  * `title`
  * `children`
  * `onOpenChange`
  * `description`
  * `closeLabel`
  * `className`
  * `bodyClassName`

================================================================================
11. HARDEN RESIZABLE MODAL / FLOATING MODAL / POPUP WINDOW
==========================================================

Update `src/components/ui/overlays/resizable-modal.tsx`.

Requirements:

* Keep no blur by default.
* Keep no overlay by default.
* Keep no scroll lock by default when `modal=false`.
* Add optional `trapFocus` and `lockScroll`.
* Add `dismissible`, `closeOnEscape`, `closeOnOverlayClick`.
* Add `initialFocusRef`, `finalFocusRef`.
* Add data attributes.
* Escape closes only topmost floating modal if dismissible.
* When `withOverlay=false`, background should not be blocked by the root wrapper.
* Pointer events must remain correct:

  * root can be `pointer-events-none`;
  * dialog content must be `pointer-events-auto`;
  * overlay if present must be clickable.
* Keep CSS `resize: both`.
* Keep min/max size.
* Add `overflow: auto` or visible resize handle behavior without clipping critical content.
* Document that drag/move behavior remains deferred unless implemented safely.

Stories must show:

* no backdrop;
* transparent overlay;
* inspector popup;
* floating tool window;
* internal scroll;
* keyboard focus;
* resize notes;
* non-dismissible state if implemented.

================================================================================
12. HARDEN CONFIRM / ALERT / DELETE / UNSAVED DIALOGS
=====================================================

Update `src/components/ui/overlays/confirm-dialog.tsx`.

Requirements:

* ConfirmDialog supports:

  * `dismissible`
  * `closeOnEscape`
  * `closeOnOverlayClick`
  * `busy`
  * `error`
  * `onConfirm`
  * `onCancel`
* For destructive dialogs:

  * default `dismissible` should be conservative.
  * cancel should receive initial focus if destructive.
  * confirm button disabled when busy.
  * error shown in accessible status/alert block if relevant.
* For unsaved changes:

  * clear destructive/warning tone.
* Tests:

  * confirm callback fires once.
  * busy confirm does not call confirm.
  * overlay click behavior follows props.
  * Escape behavior follows props.
  * destructive dialog focuses cancel or safe action.

================================================================================
13. HARDEN SHEET / DRAWER / SIDEPANEL
=====================================

Update `src/components/ui/overlays/sheet-drawer.tsx`.

Requirements:

* Sheet/Drawer modal behavior:

  * `modal=true` locks scroll and traps focus.
  * `withScrim=true` can dismiss on scrim click.
* SidePanel/InspectorDrawer:

  * default `modal=false`;
  * no blur;
  * no scroll lock;
  * no focus trap unless opted in;
  * background remains usable if no scrim.
* Add passthrough props:

  * `dismissible`
  * `trapFocus`
  * `lockScroll`
  * `closeOnEscape`
  * `closeOnOverlayClick`
  * `initialFocusRef`
  * `finalFocusRef`
* Add data attributes:

  * `data-side`
  * `data-size`
  * `data-modal`
* Tests:

  * modal Sheet locks scroll.
  * InspectorDrawer does not lock scroll.
  * Escape closes topmost sheet if dismissible.
  * Scrim click follows `withScrim` and `closeOnOverlayClick`.

================================================================================
14. HARDEN POPOVER
==================

Update `src/components/ui/overlays/popover.tsx`.

Requirements:

* Controlled/uncontrolled state remains.
* Outside click closes when uncontrolled or calls `onOpenChange(false)` when controlled.
* Escape closes when open.
* Click inside does not close by default.
* Trigger has:

  * `aria-haspopup="dialog"` or appropriate role.
  * `aria-expanded`.
  * `aria-controls`.
* Content has:

  * role `dialog` or configurable role.
  * id.
  * optional title/description.
* Add data attributes:

  * `data-state`
  * `data-side`
  * `data-align`
* Add `closeOnEscape`, `closeOnOutsideClick`, `modal` if useful.
* Do not add collision detection unless simple and safe.
* If robust anchoring becomes too complex, document a future Radix Popover migration bug/decision, but keep current story working.

Tests:

* opens on trigger click.
* closes on outside click.
* does not close on inside click.
* closes on Escape.
* controlled mode calls `onOpenChange`.

================================================================================
15. HARDEN TOOLTIP
==================

Update `src/components/ui/overlays/tooltip.tsx`.

Requirements:

* Tooltip opens on hover and focus.
* Tooltip closes on mouse leave, blur, and Escape.
* Tooltip supports controlled `open`.
* Tooltip must set `aria-describedby` on the trigger when possible.
* Avoid duplicate or conflicting `aria-describedby`.
* If child is a valid element, clone it with `aria-describedby`.
* If child is not a valid element, wrap safely and apply description to wrapper.
* Tooltip content uses role `tooltip`.
* Add `delayMs` only if simple and not flaky in tests.
* Add data attributes:

  * `data-state`
  * `data-side`
* Keep compact 9px styling.
* Keep no heavy motion.

Tests:

* focus opens tooltip.
* blur closes tooltip.
* Escape closes tooltip.
* accessible description is present.
* controlled open renders.

================================================================================
16. HARDEN HOVER CARD
=====================

Update `src/components/ui/overlays/hover-card.tsx`.

Requirements:

* Opens on hover and focus.
* Closes on mouse leave, blur, and Escape.
* Supports controlled open if current API allows or extend API.
* Has title/description/body.
* Uses `aria-describedby` or `aria-controls` as appropriate.
* Add `side` and `align` only if simple.
* Add data attributes.
* Do not add heavy motion.
* If robust behavior becomes complex, keep lightweight and document future Radix HoverCard option.

Tests:

* focus opens hover card.
* blur closes hover card.
* Escape closes hover card.
* content is labelled/described.

================================================================================
17. HARDEN COMMAND DIALOG / COMMAND MENU
========================================

Update `src/components/ui/overlays/command-dialog.tsx`.

Requirements:

* Keep no `cmdk` dependency unless necessary.
* Search input focuses initially when dialog opens.
* List items are buttons.
* Arrow-key roving focus should be implemented if reasonable.
* At minimum:

  * Tab works through input and command items.
  * Enter activates focused button.
  * Escape closes dialog through Dialog primitive.
  * Disabled items are skipped by keyboard where possible.
* Add `aria-label`, `role`, and status for empty/loading.
* Add stories:

  * default;
  * command palette;
  * inline command menu;
  * loading state;
  * empty state;
  * keyboard focus notes.
* Add tests for search filtering and disabled item behavior if feasible.

================================================================================
18. STORYBOOK REQUIREMENTS
==========================

Add or update stories under `src/stories/overlays/**`.

Required new or updated stories:

```txt
src/stories/overlays/dialog-hardening.stories.tsx
src/stories/overlays/dialog-system.stories.tsx
src/stories/overlays/app-modal.stories.tsx
src/stories/overlays/resizable-modal.stories.tsx
src/stories/overlays/confirm-dialog.stories.tsx
src/stories/overlays/sheet-drawer.stories.tsx
src/stories/overlays/popover.stories.tsx
src/stories/overlays/tooltip.stories.tsx
src/stories/overlays/hover-card.stories.tsx
src/stories/overlays/command-dialog.stories.tsx
```

Create `Overlays/DialogHardening` with required exports:

* FocusTrap
* InitialFocus
* FinalFocusReturn
* ScrollLock
* EscapeTopmost
* OverlayClick
* NonDismissable
* NestedDialogs
* FloatingNonModal
* InspectorNoScrollLock
* AccessibilityChecklist

Update existing overlay stories to mention:

* focus trap status;
* scroll-lock status;
* outside-click behavior;
* Escape behavior;
* modal vs non-modal behavior;
* app migration remains blocked.

Storybook must remain static/provider-free.

================================================================================
19. COVERAGE SCRIPT REQUIREMENTS
================================

Update:

```txt
scripts/check-storybook-component-coverage.mjs
tests/vitest/storybook-component-coverage.test.ts
```

Add required title:

```txt
Overlays/DialogHardening
```

Required exports:

```txt
FocusTrap
InitialFocus
FinalFocusReturn
ScrollLock
EscapeTopmost
OverlayClick
NonDismissable
NestedDialogs
FloatingNonModal
InspectorNoScrollLock
AccessibilityChecklist
```

Keep existing required overlay titles:

* `Overlays/DialogSystem`
* `Overlays/AppModal`
* `Overlays/ResizableModal`
* `Overlays/Modal`
* `Overlays/ConfirmDialog`
* `Overlays/SheetDrawer`
* `Overlays/Tooltip`
* `Overlays/Popover`
* `Overlays/HoverCard`
* `Overlays/CommandDialog`

Coverage script must still verify:

* Actual story files exist.
* Required story titles exist.
* Required exports exist.
* Required stories have component fields or explicit storybook contracts.
* Plan rows are not counted as implementation proof.

================================================================================
20. TESTING REQUIREMENTS
========================

Update or add tests in:

```txt
tests/vitest/ui-modal-tooltip.test.tsx
tests/vitest/storybook-component-coverage.test.ts
```

Add a new focused test file if cleaner:

```txt
tests/vitest/overlay-hardening.test.tsx
```

Required tests:

A. Dialog Focus Trap

* focuses initial focus target on open;
* falls back to first focusable element;
* falls back to content container if no focusable children;
* Tab cycles from last to first;
* Shift+Tab cycles from first to last;
* focus returns to trigger/finalFocusRef on close.

B. Body Scroll Lock

* AppModal locks body scroll while open;
* closing AppModal restores previous body styles;
* nested locks ref-count correctly;
* ResizableModal with `modal=false` does not lock body scroll;
* InspectorDrawer does not lock body scroll;
* modal Sheet locks body scroll.

C. Escape Behavior

* Escape closes dismissible AppModal;
* Escape does not close when `closeOnEscape=false`;
* Escape does not close non-dismissible ConfirmDialog;
* Escape closes only topmost nested dialog.

D. Outside / Overlay Click

* overlay click closes AppModal by default;
* overlay click does not close when disabled;
* clicking dialog content does not close;
* InspectorDrawer with no scrim has no overlay;
* Popover outside click closes;
* Popover inside click does not close.

E. Tooltip / HoverCard

* Tooltip focus opens and blur closes;
* Tooltip Escape closes;
* Tooltip gives accessible description;
* HoverCard focus opens and Escape closes.

F. CommandDialog

* search filters grouped commands;
* empty state appears;
* disabled item does not activate;
* Escape closes through Dialog primitive.

G. Compatibility

* `Modal` from `@/components/ui/modal` still renders and closes.
* release announcement modal tests still pass.

Do not test React internals.
Do not test browser features impossible in JSDOM; if impossible, add Storybook/Playwright smoke instead.

================================================================================
21. STORYBOOK VISUAL / INTERACTION SMOKE
========================================

Run static Storybook and smoke these story IDs at desktop and mobile:

* `overlays-dialoghardening--focus-trap`
* `overlays-dialoghardening--scroll-lock`
* `overlays-dialoghardening--escape-topmost`
* `overlays-dialoghardening--non-dismissable`
* `overlays-appmodal--default`
* `overlays-resizablemodal--no-backdrop`
* `overlays-resizablemodal--inspector-popup`
* `overlays-confirmdialog--destructive`
* `overlays-sheetdrawer--inspector-panel`
* `overlays-popover--default`
* `overlays-tooltip--default`
* `overlays-hovercard--default`
* `overlays-commanddialog--default`

Verify:

* story loads;
* body text present;
* component visible;
* modal/dialog/tooltip role present where expected;
* no console/page errors;
* screenshots nonblank if screenshot tooling is available;
* no external provider/network call.

Record results in `.ai/05_logs`.

================================================================================
22. STATIC FIXTURE AND PROVIDER SAFETY RULES
============================================

Stories, fixtures, and decorators must use static fake data only.

Do not import:

* `src/lib/supabase/*`
* `src/lib/**/actions.ts`
* `src/lib/**/repository*.ts`
* `src/app/api/**`
* `src/proxy.ts`
* `src/lib/email/**`
* provider SDK clients
* Vercel analytics/speed-insights packages
* live auth/session refresh helpers
* server-only modules
* environment variables

Do not call:

* `fetch`
* server actions
* Supabase clients
* auth refresh
* provider APIs
* Vercel/Resend/Supabase external services

Keep `bun run storybook:check-boundary` passing.

================================================================================
23. PRODUCTION SOURCE SAFETY
============================

Allowed:

* UI primitive source under `src/components/ui/overlays/**`.
* Compatibility barrel `src/components/ui/modal.tsx`.
* UI barrel `src/components/ui/index.tsx`.
* Storybook stories and tests.
* `.ai` docs/logs.

Not allowed:

* production route migration;
* estimate mutations;
* Supabase actions;
* provider clients;
* API routes;
* auth/middleware behavior;
* app-wide route UI replacement.

If a production app component breaks due to the modal compatibility barrel, fix compatibility without migrating app UI.

================================================================================
24. .ai MEMORY AND PLAN UPDATES
===============================

Update or create:

```txt
.ai/05_logs/YYYY-MM-DD-overlay-production-hardening-implementation.md
.ai/03_plans/2026-06-06-ui-component-optimization-componentization/40_MODAL_DIALOG_SYSTEM_IMPLEMENTATION.md
.ai/03_plans/2026-06-06-ui-component-optimization-componentization/41_COMPLETE_COMPONENT_SYSTEM_COVERAGE.md
.ai/03_plans/2026-06-06-ui-component-optimization-componentization/42_OVERLAY_PRODUCTION_HARDENING.md
.ai/03_plans/2026-06-06-ui-component-optimization-componentization/43_OVERLAY_ACCESSIBILITY_VERIFICATION.md
.ai/03_plans/2026-06-06-ui-component-optimization-componentization/37_PHILIP_STORYBOOK_REVIEW_PACKET.md
.ai/03_plans/2026-06-06-ui-component-optimization-componentization/38_VALIDATION_COMMAND_MATRIX.md
.ai/10_state/current-state.md
.ai/10_state/decisions.md if dependencies or architecture decisions changed
```

Record:

* focus trap implementation;
* scroll-lock implementation;
* overlay stack implementation;
* Escape/outside-click behavior;
* modal vs non-modal behavior;
* tests added;
* stories added;
* validation results;
* remaining limitations;
* no production route migration.

Do not mark app migration complete.
Do not mark Philip approval unless Philip actually approves.

================================================================================
25. BUG / BLOCKER PROTOCOL
==========================

If you discover a bug, failing test, blocker, stale assumption, package issue, Storybook issue, Tailwind CSS issue, security concern, provider import leak, test gap, design-system conflict, or serious ambiguity, create:

```txt
/Users/philiplewis/archestimator/.ai/15_Bugs/YYYY-MM-DD-{bug-slug}.md
```

Bug plan must include:

* Title
* Classification
* Date discovered
* Discovery context
* Evidence
* Reproduction steps or command if applicable
* Expected behavior if applicable
* Actual behavior if applicable
* Suspected root cause
* Affected files/modules
* Impact
* Severity
* Relationship to current UI library plan
* Proposed fix plan
* Verification plan
* Status
* Whether it blocks implementation
* Link/reference to the plan folder

If a blocker affects only one component, defer that component and continue non-dependent work.
If a blocker prevents Storybook static build, final status must be `BLOCKED` or `NEEDS_HUMAN_DECISION`.

================================================================================
26. FINAL ACCEPTANCE CRITERIA
=============================

The hardening pass is complete only when:

1. Dialog focus trap is implemented.
2. Initial focus behavior is implemented.
3. Focus return behavior is implemented.
4. Body scroll lock is implemented for blocking modals.
5. Body scroll lock is not applied to non-modal floating/resizable pop-ups.
6. Overlay stack safety exists.
7. Escape closes only the topmost dismissible overlay.
8. Non-dismissible overlays resist Escape and outside click.
9. Overlay click behavior is consistent and configurable.
10. Click inside dialog content does not close.
11. AppModal remains blurred by default.
12. ResizableModal remains no-blur/no-overlay by default.
13. Sheet/Drawer modal vs inspector behavior is correct.
14. Popover outside-click and Escape close are implemented.
15. Tooltip focus/hover/Escape behavior is implemented.
16. HoverCard focus/hover/Escape behavior is implemented.
17. CommandDialog search/empty/loading and keyboard behavior are tested or documented.
18. Compatibility `Modal` import still works.
19. Release announcement modal tests still pass.
20. Coverage script enforces hardening stories.
21. Storybook overlay hardening stories exist.
22. Provider boundary check passes.
23. No production route migration exists.
24. `bun run lint:design-system` passes.
25. `bun run type-check` passes.
26. `bun run validate` passes.
27. `bun run build` passes.
28. `bun run build-storybook` passes.
29. `git diff --check` passes.
30. `.ai` docs/logs are updated.
31. Final report clearly lists completed, deferred, blocked, and not-in-scope items.
32. Branch is committed and pushed.

Do not claim complete if focus trap or scroll lock is only documented but not implemented.
Do not claim complete if `build-storybook` fails.
Do not claim app migration.

================================================================================
27. FINAL VERIFICATION BEFORE COMMIT
====================================

Run:

```bash
git status --short --branch
git diff --stat
git diff --check
git diff --name-status
bun run storybook:check-components
bun run storybook:check-boundary
bun run lint:design-system
bun run type-check
bunx vitest run tests/vitest/ui-modal-tooltip.test.tsx tests/vitest/storybook-component-coverage.test.ts tests/vitest/release-announcement-modal.test.tsx --maxWorkers=1
bun run build-storybook
bun run validate
bun run build
```

If a new `tests/vitest/overlay-hardening.test.tsx` is added, include it in focused test commands.

If validation output is long, summarize key pass/fail lines in `.ai/05_logs` and final report.
Do not record secrets or raw provider values.

================================================================================
28. COMMIT AND PUSH REQUIREMENTS
================================

Stage only intended files.

Before staging:

```bash
git status --short
git diff --stat
git diff --check
```

Do not stage unrelated dirty files.

Suggested commits:

```bash
git commit -m "feat(ui): harden overlay focus and scroll behavior"
git commit -m "feat(storybook): add overlay hardening stories and coverage"
git commit -m "docs(ai): record overlay production hardening"
```

If using one commit:

```bash
git commit -m "feat(ui): harden storybook overlay component system"
```

Push:

```bash
git push -u origin HEAD
```

Never force push.
Do not merge to main.
If GitHub tooling is available, create or update a PR without merging.

================================================================================
29. FINAL REPORT REQUIREMENTS
=============================

Return a final report with:

* Final status:

  * READY_FOR_PHILIP_STORYBOOK_REVIEW
  * READY_WITH_DEFERRED_ITEMS
  * NEEDS_HUMAN_DECISION
  * BLOCKED
* Branch name.
* Base branch.
* PR URL if created.
* Plan folder used.
* Summary of what was missing before.
* Summary of what was hardened.
* Focus trap implementation summary.
* Body scroll lock summary.
* Overlay stack summary.
* Escape behavior summary.
* Outside-click behavior summary.
* Modal vs non-modal behavior summary.
* Popover/Tooltip/HoverCard hardening summary.
* CommandDialog hardening summary.
* Files changed.
* Reusable components changed.
* Story files added/updated.
* Tests added/updated.
* Coverage script changes.
* Dependencies added, if any.
* Validation commands and results.
* Design-system lint result.
* Type-check result.
* App build result.
* Storybook static build result.
* Visual smoke result.
* `.ai` docs updated.
* Bug/blocker files created.
* Commit hashes.
* Push status.
* Explicit statement: production app migration was not performed.
* Explicit statement: Storybook was not publicly hosted unless separately approved.
* Remaining limitations.
* Remaining owner decisions.
* Next recommended step: Philip reviews local Storybook overlay hardening stories.

================================================================================
30. QUALITY BAR
===============

Do not optimize for speed over correctness.
Do not claim focus trap if Tab can escape the modal.
Do not claim scroll lock if body remains scrollable behind AppModal.
Do not break existing Modal imports.
Do not hide validation failures.
Do not import live provider data.
Do not migrate app routes.
Do not add dependencies unnecessarily.
Do not leave generated output untracked unless intentionally ignored.
Do not mark Philip approval unless Philip actually reviewed.

The goal is a hardened, inspectable ArchEstimator overlay system that can safely become the future production modal/dialog/pop-up foundation after Philip review and a separate app migration plan.

```
```



I reviewed **PR #30 / `feat/storybook-complete-ui-component-system`** against `fix/storybook-standalone-ui-components`. This is a meaningful improvement: the branch now adds a real reusable overlay/modal system under `src/components/ui/overlays/**`, expands Storybook overlay coverage, and strengthens the coverage check. My verdict: **READY_FOR_PHILIP_STORYBOOK_REVIEW**, but **not yet production-adoption-ready** for the modal system.

**Score: 88/100 for Storybook review readiness.**
**Score: 76/100 for production-grade reusable overlay primitives.**
**Score: 20/100 for production app migration, correctly deferred.**

---

## 1. PR status and scope

PR #30 is open, not merged, mergeable, and targets `fix/storybook-standalone-ui-components` from `feat/storybook-complete-ui-component-system`. It has **1 commit**, **34 changed files**, **2,463 additions**, and **205 deletions**. The PR body states that it adds reusable overlay primitives, expands Storybook overlay coverage, updates coverage enforcement/tests, and preserves the boundaries: no production route migration, no Supabase/provider mutation, no Vercel deployment, no public Storybook hosting, no new runtime dependency, and no main/staging merge.   

The diff is focused. Compared to `fix/storybook-standalone-ui-components`, it adds overlay primitives, overlay stories, tests, coverage-script changes, and `.ai` evidence. It does **not** add packages in this PR.

---

## 2. What is now implemented well

The branch now has an actual overlay system, not just story-only examples. It adds:

* `src/components/ui/overlays/dialog.tsx`
* `modal.tsx`
* `resizable-modal.tsx`
* `confirm-dialog.tsx`
* `sheet-drawer.tsx`
* `popover.tsx`
* `tooltip.tsx`
* `hover-card.tsx`
* `command-dialog.tsx`

The new `src/components/ui/index.tsx` exports these primitives and types, including `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `AppModal`, `BlurModal`, `ResizableModal`, `FloatingModal`, `PopupWindow`, `Sheet`, `Drawer`, `SidePanel`, `InspectorDrawer`, `Popover`, `Tooltip`, `HoverCard`, and `CommandDialog`. 

The implementation log says this pass added low-level Dialog primitives, AppModal/BlurModal/Modal, Confirm/Alert/Delete/Unsaved dialogs, ResizableModal/FloatingModal/PopupWindow, Sheet/Drawer/SidePanel/InspectorDrawer, Popover, Tooltip, HoverCard, and CommandDialog/CommandPalette/CommandMenu without adding `cmdk`, Flowbite, Aceternity, Motion, or new Radix dependencies. 

**This directly addresses your request for a more complete modal/pop-up system.**

---

## 3. Modal system audit

### Fixed blurred modal

`AppModal` now supports size presets `xs`, `sm`, `md`, `lg`, `xl`, and `fullscreen`, tone variants, footer slots, scroll body, configurable close behavior, and blurred backdrop by default. The header consistently places the title/description on the left and the close button on the right.  

The root `src/components/ui/modal.tsx` is now a compatibility barrel exporting `AppModal`, `BlurModal`, and `Modal`, which is good for current imports. 

### Resizable pop-up modal

`ResizableModal` exists and defaults to **no blur** and **no overlay** unless `withOverlay` or `modal` is enabled. It supports `defaultWidth`, `defaultHeight`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`, `resizable`, `modal`, `withOverlay`, `overlayBlur`, `transparentOverlay`, `position`, and `size`. It uses CSS `resize: both`, which is simple and dependency-free.  

This satisfies your request for **resizable pop-up modals without background blur**.

### Confirm / delete / unsaved dialogs

`ConfirmDialog`, `AlertDialog`, `DeleteConfirmDialog`, and `UnsavedChangesDialog` now exist. The confirm dialog handles busy state, error block, tone, cancel/confirm labels, confirm callback, and close behavior.  

### Sheet / drawer

`Sheet`, `Drawer`, `SidePanel`, and `InspectorDrawer` now exist, with left/right/bottom positions, size presets, scrim/blur controls, and header/body/footer structure. `SidePanel` and `InspectorDrawer` default toward no-scrim inspector behavior.  

**Modal-system score: 86/100.**

---

## 4. Storybook coverage audit

The branch adds dedicated overlay stories:

* `Overlays/DialogSystem`
* `Overlays/AppModal`
* `Overlays/ResizableModal`
* `Overlays/SheetDrawer`
* `Overlays/HoverCard`
* `Overlays/CommandDialog`

It also expands existing `Overlays/Modal`, `Overlays/ConfirmDialog`, `Overlays/Popover`, and `Overlays/Tooltip`. The `.ai` modal implementation doc lists the required story exports for each overlay family and says they are enforced by the coverage script. 

`AppModal` stories cover default, all size presets, fullscreen, blur/no-blur, form content, table content, loading, error, and destructive states. 

`ResizableModal` stories cover default, no backdrop, transparent overlay, small/medium/large, min/max, inspector popup, floating tool window, footer actions, internal scroll, resize notes, and keyboard focus. 

`SheetDrawer` stories cover right, left, bottom, inspector, form, table, loading, error, and no-blur. 

**Storybook overlay coverage score: 92/100.**

---

## 5. Coverage enforcement is stronger now

The coverage script now requires the overlay stories and exports, including `Overlays/DialogSystem`, `Overlays/AppModal`, `Overlays/ResizableModal`, `Overlays/ConfirmDialog`, `Overlays/SheetDrawer`, `Overlays/Tooltip`, `Overlays/Popover`, `Overlays/HoverCard`, and `Overlays/CommandDialog`. 

It also checks required top-level groups and verifies each required story has a `component` field plus either an import link from `@/components` or an explicit `storybookContract`. That is a strong correction from the previous “plan rows equal implementation” weakness.  

The `.ai` coverage doc says the gate now checks actual story files and named exports, not only the 809-row inventory and 703-row manifest. Fresh output is: **62 story files, 62 titled stories, 295 exports, 55 component-level stories, 7 overview/governance stories, 21 linked repo component stories, 21 explicit fixture/composition contracts, and 41 required standalone titles checked**. 

**Coverage truthfulness score: 94/100.**

---

## 6. Validation evidence

The implementation log records these passing checks:

* `bun run storybook:check-components`
* `bun run type-check`
* `bun run storybook:check-boundary`
* focused Vitest for overlay/component coverage
* focused release modal regression
* `git diff --check`
* `bun run lint:design-system`
* static Storybook build to `/tmp/archestimator-storybook-static-overlays`
* local Playwright static Storybook smoke over 8 overlay families, desktop/mobile, 16 screenshots, zero console/page errors
* `bun run validate`
* `bun run build` 

The complete component system coverage doc repeats the same validation and says `bun run validate` passed with existing ESLint warnings only, 9 Bun unit tests, 206 Vitest DOM files, 1 skipped file, 1522 tests passed, and 3 skipped. 

**Validation score: 93/100.**

---

## 7. Main concerns before merge

### Concern 1 — no true focus trap yet

The `Dialog` primitive focuses content on mount, supports Escape close, and returns focus on close, but I do not see a real focus trap or tab-cycle containment.  

That is acceptable for Storybook review, but for production-grade modal primitives, focus trap is important. If you plan to migrate app modals later, I would add a follow-up issue: **“Add focus-trap and scroll-lock hardening to Dialog before production migration.”**

### Concern 2 — scroll lock is absent

The dialog system does not appear to lock body scroll while a blocking modal is open. This may be fine in Storybook, but it can cause background scroll issues in real app flows.

### Concern 3 — Popover/HoverCard are lightweight

Popover and HoverCard are custom, dependency-free primitives. They support basic controlled/uncontrolled open state and focus/hover display, but they do not yet handle collision detection, outside click dismissal, Escape close, portal positioning, or robust anchored positioning.    

That is okay for a first internal UI library, but not as robust as shadcn/Radix Popover/HoverCard.

### Concern 4 — CommandDialog is functional but not a full command palette

`CommandDialog` and `CommandMenu` are static, dependency-free, searchable grouped lists. They do not use `cmdk`, do not have full keyboard roving focus, and do not manage active descendant semantics beyond simple button rows.  

Again: fine for review, not final for power-user command UX.

---

## 8. Scorecard

| Area                           |      Score | Notes                                                                           |
| ------------------------------ | ---------: | ------------------------------------------------------------------------------- |
| PR hygiene                     | **92/100** | Focused, open, mergeable, no package/runtime dependency added in PR.            |
| Reusable overlay primitives    | **86/100** | Real components exist; focus-trap/scroll-lock still missing.                    |
| Fixed blurred modal            | **92/100** | Strong AppModal API with sizes, tones, footer, blur default.                    |
| Resizable pop-up modal         | **88/100** | Real CSS-resize implementation, no blur by default; no drag/collision behavior. |
| Confirm/alert/delete dialogs   | **88/100** | Solid first version, tested confirm behavior.                                   |
| Sheet/drawer/side panel        | **86/100** | Good size/side/no-blur coverage.                                                |
| Popover/tooltip/hover card     | **75/100** | Useful but lightweight vs Radix/shadcn-grade behavior.                          |
| Command dialog                 | **72/100** | Good static/searchable version; not a full command palette yet.                 |
| Storybook coverage             | **92/100** | Comprehensive overlay stories and exports.                                      |
| Coverage enforcement           | **94/100** | Checks actual story files/exports and component contracts.                      |
| Tests/validation               | **93/100** | Strong evidence recorded.                                                       |
| Ready for Philip review        | **91/100** | Yes.                                                                            |
| Ready for production migration | **20/100** | Correctly deferred.                                                             |

**Overall: 88/100.**

---

## Final verdict

This branch is **substantially better** than the last one. It now has the modal/dialog/pop-up family you asked for:

* fixed blurred modals,
* resizable non-blur pop-up modals,
* confirm/delete/unsaved dialogs,
* sheet/drawer/side panels,
* popover/tooltip/hover card,
* command dialog,
* Storybook stories for all of them,
* coverage and validation evidence.

I would approve this as:

**READY_FOR_PHILIP_STORYBOOK_REVIEW.**

I would not yet approve it as:

**READY_FOR_APP_MIGRATION.**

Before app migration, I would require one hardening pass for focus trapping, body scroll lock, outside-click/Escape behavior consistency, and possibly Radix-backed Popover/Tooltip/HoverCard if these overlays will be heavily used in production.
