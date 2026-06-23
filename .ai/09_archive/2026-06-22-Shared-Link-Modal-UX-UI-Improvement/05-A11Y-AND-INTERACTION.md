# 05 — A11Y & INTERACTION · Shared-Link Modal

**Source:** Phase C `a11y-target` + `interaction-motion` design agents. Resolves **PROB-02** (contrast), **PROB-05/26** (nested-modal focus/stacking), **PROB-21** (ControlField ARIA contract), **PROB-25** (no pending affordance), **PROB-06** (success feedback), **PROB-29** (8px legibility), plus motion for copy/tab/modal/stale. **All fixes are primitive-level** (`modal.tsx`/`dialog.tsx`/`control-input.tsx`) so they retire symptoms for *every* consumer, not just this modal. WCAG 2.2 AA target.

---

## A. Accessibility

### A1. Focus model (4 checkpoints)

1. **OPEN — initial focus.** Add a per-instance `initialFocus` override on `AppModal` (`modal.tsx:37/82`). For this modal, mark the **link field** `ControlInput` with `data-dialog-initial-focus` when `activeTab==="link" && summary!==null` (`~:845`) so the actionable element receives focus on open, not the X-close. For the empty-state path, mark the first tab button. (`dialog.tsx:211` already honors `data-dialog-initial-focus`.)
2. **TAB CHANGE — focus into panel.** On `activeTab` change, focus the tabpanel (`tabIndex=0` at `:797`) via `panelRef.current?.focus({preventScroll:true})`. The WAI-ARIA tabs prescription (focus follows activation) — currently missing; today focus stays on the tab button with no SR signal the panel swapped.
3. **ACTION SUCCESS — focus on result.** After `runPublicationAction` resolves, focus the `actionFeedback` region (`:1177`) — add `id`+ref, focus on mount. For rotate/regenerate, navigate to Link tab AND focus-then-`.select()` the link field so the next keystroke is Copy. For destructive-confirm success, preserve the existing return-focus to the opener (`dialog.tsx:84`) — do NOT re-focus the modal root.
4. **CLOSE — focus restore.** PRESERVE the existing opener-restore (`dialog.tsx:84-90`). Addition: when the nested confirm closes back to the parent modal, ensure restore targets the parent's triggering button (the nested-modal fix guarantees that element is still mounted).

### A2. Keyboard map

| Element | Keys | Action |
|---------|------|--------|
| Modal root | `Esc` | Close **topmost** modal only (preserve `dialog.tsx:99` guard so an open dropdown swallows Esc) |
| Modal root | `Tab`/`Shift+Tab` | Preserve focus-trap w/ wraparound (`dialog.tsx:217-244`); nested → trap scoped to topmost `DialogContent` |
| Tab strip | `→`/`↓`, `←`/`↑` | Next/previous tab (preserve roving tabindex) |
| Tab strip | `Home`/`End` | First/last tab (preserve) |
| Tab strip | `Tab` | **Move focus INTO the active tabpanel** (NEW — A1 checkpoint 2) |
| Link field (`:845`) | Focus | auto-select (preserve `onFocus select :852`) so one `Ctrl/Cmd+C` copies |
| Copy (`:866`) | `Enter`/`Space` | Copy + announce "Link copied" via `aria-live` |
| Generate/Update (`:1109`) | `Enter`/`Space` | Publish/republish; **pending label on THIS button only** (not disable-all) — preserves keyboard operability of other controls |
| Turn off / New link (`:1145`/`:1157`) | `Enter`/`Space` | Open destructive confirm (initialFocus → Cancel) |
| Confirm: Cancel | `Enter`/`Space` | Abort; close; focus returns to opener |
| Confirm: confirm | `Enter`/`Space` | Execute (danger for revoke/regenerate, secondary for rotate/clear-password) |
| Recipient input | `Enter` | Add chip (preserve Backspace clears local-only chips) |

### A3. `ControlField` ARIA contract (RC-11 → fixed)

Today: nesting-only association, no ids, **duplicate accessible names** (`aria-label` + wrapped label), no `aria-invalid`/`aria-describedby`, `helperText`/error with no id. Target contract, enforced **inside `ControlField`** so every consumer is fixed:

1. **Label↔input pairing:** `useId()` → `controlId`; `<FieldTag htmlFor={controlId}>` (label) or `<div role="group" aria-labelledby={labelId}>` (div). The child input receives `id={controlId}` (preserve the explicit ids at `:846`/`:948`; auto-generate only when absent).
2. **Kill duplicate names:** when a `ControlField` wraps a `ControlInput`, the input MUST NOT also set `aria-label` — the `htmlFor` association is the single name source. Remove the redundant `aria-label` at `:848` and `:950`.
3. **Helper/error via `aria-describedby`:** give `helperText`/`errorText` ids; inject `aria-describedby` onto the child via `cloneElement`. When `errorText` present, describe by `errorId` only; else by `helperId`.
4. **`aria-invalid`:** when `errorText` non-null, force `aria-invalid="true"` on the cloned child regardless of the `invalid` prop.
5. **`role="alert"`** on the `errorText` span (`control-input.tsx:83`) so an appearing error is announced; `helperText` stays role-less (static guidance).

**Tablist/tab/tabpanel** — PRESERVE (preserve list): correct roles, `aria-selected`/`controls`/`labelledby`, roving tabindex, panel id/labelledby/tabIndex (`:792-797`). Only addition: focus-into-panel on tab change (A1 checkpoint 2). **Live regions** — PRESERVE the dual design (sr-only `:660` + visible `:1177`); add explicit `aria-live="polite" aria-atomic="true"` for robustness; keep recipient local `role=alert/status` (`:480`) — do NOT collapse into the shared sink (that's PROB-22's data-dimension fix). "Link copied" uses the existing sr-only polite region (no new live region).

### A4. Contrast fixes (PROB-02 — `#7F7F7F → #5D5D5D` for load-bearing text)

| Location | From | To |
|----------|------|----|
| `control-input.tsx:77` | `text-tertiary` (field LABEL) | `text-secondary #5D5D5D`; 9→10px |
| `control-input.tsx:85` | `text-tertiary` (helperText) | `text-secondary`; 9→10px |
| `control-input.tsx:83` | `text-danger` (errorText — contrast OK) | keep danger; **add `role="alert"` + id**; 9→10px |
| `dialog.tsx:289` | `text-tertiary` (DialogDescription — modal subtitle) | `text-secondary` — single swap, affects every modal |
| `dialog.tsx:341` | `text-tertiary` (X-close idle) | `text-secondary`; preserve `hover:!text-[#B84646]` |
| `modal.tsx:140` | `text-tertiary` (location strip) | `text-secondary` (defensive) |
| `RecipientEmailComposer.tsx:336-337` | `text-tertiary` (section label + instruction) | `text-secondary`; 9→10px |
| `RecipientEmailComposer.tsx:363` | `text-[8px]` (recipient chip) | 9–10px + AA color (PROB-29) |
| All status pills (`:880`, `:744`, activity badges) | `text-[8px]` | 9–10px + AA color (PROB-29) |

### A5. Nested-modal fix (PROB-05/26 — primitive-level; corrected post-QA — see doc 11 FZ-1/FZ-2/A11Y-05)

> **Important mechanism correction (QA FZ-1):** both Modals **portal to `document.body` as siblings** (`DialogPortal` at `dialog.tsx:151`), so the parent confirm is **NOT a DOM ancestor** of the child. There is no "ancestor to inert." The real mechanism operates on the **flat set of open modal-roots**, keyed by open-order.

**(A) Open-stack array + z by open-order.** `modal.tsx:99` hardcodes `z-[1000]`; `dialog.tsx:256` `z-[1001]` — every modal paints the same plane. Add a **module-level open-stack array** (`const openStack: HTMLElement[] = []`). On each `AppModal` open, `push` its `[data-archestimator-modal-root]` (`modal.tsx:98`) onto the stack and set `style.zIndex = 1000 + stack.length`; on close, `pop` + re-derive the topmost's z. The destructive confirm opened from the parent becomes stack-length-2 → z-1001 over the parent's z-1000. ~15 lines, `useRef`+`useEffect` push/pop. (Do **not** thread a `depth` prop through a non-existent ancestor chain.)

**(B) `inert` every other open modal-root.** `dialog.tsx:117` today inerts only page shells. Fix: when a `Dialog` mounts, `document.querySelectorAll('[data-archestimator-modal-root]')` and set `inert` on **every instance except the topmost-open** (the last entry in the open-stack). Remove `inert` from the new topmost when the child closes. This makes the parent's Tab-reachable Generate/Revoke buttons correctly invisible to the trap + SR tree while the confirm is open — retiring the core PROB-05 symptom (Tab escaping into parent's destructive buttons).

**(C) Least-destructive focus — reuse the existing `ConfirmDialog` first.** Two facts QA surfaced (FZ-2): (1) `dialog.tsx:211` **already** resolves focus via `content.querySelector('[data-dialog-initial-focus]') ?? firstFocusable ?? content` — so the **attribute does the work, not DOM order**; and (2) an existing **`ConfirmDialog`** primitive (`ui/overlays/confirm-dialog.tsx`, consumed by `AddComponentModal`/`ComponentLibraryManager`/`TemplateEditorClient`/`TemplatesBrowseManager`) **already** puts `autoFocus={!destructive}` on Cancel. **Lowest-risk path for PROB-26: migrate the header's hand-rolled second `<Modal>` (`:1194-1229`) to `ConfirmDialog`** (or copy its Cancel-autoFocus pattern) — a near-1-line behavior gain requiring **no** modal-primitive edit. If a bespoke confirm is kept instead, add `data-dialog-initial-focus` to the Cancel button (`:1208-1216`); keep it regardless of DOM order (the attribute wins via `:211`). This achieves WAI-ARIA APG's least-destructive `alertdialog` focus. Preserve close-button hover + return-focus. (The `AppModal` `initialFocus` passthrough already exists at `:37/82` — no new prop needed.)

**Net:** open modal-roots get distinct z-planes by open-order; non-topmost roots are `inert`; the confirm opens on Cancel (via the existing attribute/`ConfirmDialog`). Retires PROB-05/26 for **all** nested confirms (recipient remove/resend, rotate, regenerate, revoke, clear-password). **Note:** A5-A/B and A5-C are coupled — if A5-B's inert is mis-implemented, PROB-05 is only half-fixed.

### A6. QA-driven a11y additions/corrections (see doc 11 — A11Y-01/02/03/06/07, FZ-4)

- **A11Y-01 — radiogroup contract (NEW target, was missing).** The location-visibility radios (`:970-999`) are bare `<input type="radio">` inside per-option `<label>`s with no `role=radiogroup`/grouping semantics — a WCAG 4.1.2 (Name/Role/Value) gap. **Target:** wrap them in `<div role="radiogroup" aria-labelledby={locationLabelId}>` (or a `<fieldset>`/`<legend>`), keep `name="project-publication-location-visibility"`, and ensure each radio is reachable by arrow keys (native radios in a radiogroup + same `name` get this for free in most browsers; verify). Add to doc 04's `AccessTab`.
- **A11Y-02 — `ControlField` composite-child gap (corrects A3).** The link/password/expiry `ControlInput`s are **not direct children** of `ControlField` — they're inside a grid `<div>` wrapper (e.g. `:844` `<div className="grid…"><ControlInput id=…/><Button/><Button/></div>`). A `cloneElement`-on-single-input approach (A3) would silently no-op on these 3 fields. **Target:** the `aria-describedby`/`aria-invalid` injection must wire via the **explicit `id`** the inputs already carry (`:846`/`:948`/`:1014`) — `ControlField` generates `helperId`/`errorId` and the *call site* passes `aria-describedby`/`aria-invalid` to the wrapped input by id (or `ControlField` provides them via context). Add a regression test against a **grid-wrapped** ControlField, not just the simple case.
- **A11Y-03 — contrast figure correction.** `#7F7F7F` on the modal surfaces computes to **~4.0:1** (not ~4.48:1 as some drafts implied) — *further* below the 4.5:1 AA floor. `#5D5D5D` computes **~6.6:1** on white / ~6.0:1 on `surfaceMuted` / ~6.4:1 on `amber-50` (all pass). The fix (A4) is unchanged and if anything more justified.
- **A11Y-06 — focus-into-tabpanel is an enhancement, not a conformance req (corrects A1.2).** The current manual-activation tab pattern (roving tabindex, focus stays on the tab) is **already AA-compliant** (SC 2.4.3, 2.1.1). Moving focus INTO the panel on activation is a recommended UX enhancement, not the WAI-ARIA prescription. Reword: implement it because it improves the keyboard experience (explicit panel focus target), but it is optional; don't let it block a simpler valid choice.
- **A11Y-07 — placeholder text contrast (NEW scope decision).** `ControlInput`/`ControlTextarea` set `placeholder:text-tertiary` (`control-input.tsx:44`, `:94` `CONTROL_INPUT_SURFACE_CLASS`) — used by the password (`:949`) + expiry (`:1015`) fields here. The password placeholder ("…password clients must enter") reads as **instruction, not decoration** → treat as load-bearing: add `placeholder:text-tertiary→placeholder:text-secondary` at `:44`/`:94` to the A4/Phase-0 AA-fix scope. (If a placeholder is purely transient decoration elsewhere, carve it out — but the password one is in-scope.)
- **FZ-4 — post-rotate focus+select contract (NEW pin, was underspecified).** The rotate guided-continuation (A1.3, motion §B) assumes the link field is focused **and** `.select()`ed after a rotate so the next keystroke copies. **Pin it:** on rotate/regenerate success → `setActiveTab` to the link view → `linkRef.current.focus()` → `linkRef.current.select()` (preserve the existing `onFocus select :852`); announce via the existing sr-only `aria-live`. This is a focus side-effect (not motion), so it is **not** reduced-motion-gated — it behaves identically with motion on/off. Keyboard path: a SR user Tabbing to the field gets the URL selected (same as a mouse user's focus). Add to doc 09 journey #3 as an asserted contract.

---

---

## B. Interaction & motion (purposeful, status-explaining — never gating content)

**Principles:** default-first (every animated element renders its resting state first; motion layers on top, never withholds content); status not spectacle (motion only explains a state change the user caused/needs — no idle loops, no decorative entrances); **ease-out only** (expo-out `cubic-bezier(0.16,1,0.3,1)`, quart-out `0.25,1,0.5,1`, quint-out `0.19,1,0.22,1`) — **no bounce**; short differentiated durations (120ms micro, 160–200ms panel/modal, 400ms rotate/regenerate highlight, 2200ms slow stale pulse); **reduced-motion is a CSS-layer fact** (`@media (prefers-reduced-motion: reduce)`) — React state hooks (`isPending`, `copiedAt`, `lastSuccessAt`) are identical across paths; transform/opacity/filter only (GPU-cheap, no reflow).

| Element | Trigger | Motion | Reduced-motion alt |
|---------|---------|--------|--------------------|
| **Generate/Update primary** (`:1109`) — PROB-25 | `isPending` (useTransition); `confirmInFlightRef` preserved | Crossfade `ArrowClockwise`→spinner (160ms expo-out), label→"Generating…/Updating…" instantly, `aria-busy`. **Only the clicked button shows pending** — surrounding controls keep existing disable | Instant label swap + `aria-busy`; no spinner |
| **Copy success** (`:866` + link `:845`) — PROB-06 | `copyClientLink()` resolves; new `copiedAt` state | `LinkSimple`→`Check` crossfade + "Copy"→"Copied" (revert 1600ms); 2px clay `#AA412A`@35% box-shadow ring on the link field (200ms in, decay 300ms). Overlay — field stays visible/selected | Instant icon+label swap; static or no ring |
| **Rotate/Regenerate success** (`:845`) — PROB-06 | `runConfirmedDestructiveAction` succeeds (rotate/regenerate) | Auto-navigate to Link tab; **3px clay@45% ring** ramp 250ms, hold 1400ms, decay 500ms (~2150ms total); subtle text-shadow fade; then focus+`.select()` the link; pulse Copy once (scale 1→1.04→1); announce "New link generated — copy and re-send to kept recipients" | Instant: field selected+focused, Copy static outline 2s, aria-live announces |
| **Stale-snapshot band** (`:694`) | `summary.staleSnapshotWarning` truthy | Slow bg-color pulse ±8% over 2200ms ease-in-out (the one symmetric-ease permitted — a pulse must read as heartbeat); leading dot scales 0.9↔1.1 | Static band + static dot |
| **Tab panel crossfade** (`:792`) | `handlePublicationTabChange` | Incoming panel mounts **full content visible**, CSS enter keyframe opacity 0→1 (120ms quart-out) via `key={activeTab}` remount. No outgoing-element animation (no focus-trap overlap). No slide (avoids card-deck slop) | Instant swap |
| **Recipient Send/Resend** (`RecipientEmailComposer`) | `isSending`/`resendingRecipientId` | Same pending-on-clicked pattern; optional 1px clay top-progress hairline (`scaleX 0→1`, 600ms quint-out) | Instant "Sending…" + `aria-busy` |
| **Modal open/close** (`DialogContent :102`, scrim) | `open` flips | Enter: scrim 0→1 (140ms expo-out); panel `translateY 4px→0` + `scale 0.985→1` + opacity (180ms quint-out, 16ms scrim-led). Exit: deferred-close — `data-closing`→animate opacity/translate (130ms quart-out)→real `setOpen(false)` | Instant mount/unmount; focus-restore runs at once |
| **Destructive confirm** (`:1194`) | `setDestructiveAction(...)` | Same enter as primary but 60ms-shorter scrim fade (reads as layer-over, not a second door); Cancel gets calm 1px clay focus ring (system style) | Instant mount; focus on Cancel |

**Content-visibility guarantees:** modal enter animates an already-rendered panel (focus moves via rAF independent of the CSS); tab crossfade never keeps an outgoing panel mounted; copy/rotate rings + stale pulse are box-shadow/bg-color on always-visible elements. **Reduced-motion:** one scoped `@media (prefers-reduced-motion: reduce)` block (`animation/transition-duration: 0.01ms !important`) + forces ring/pulse to resting/visible state; the JS deferred-close checks `matchMedia` and closes immediately. No animation is the sole carrier of meaning — every state has a text/`aria-live` equivalent.

## C. Resolves
`PROB-02`, `PROB-05`, `PROB-06`, `PROB-21`, `PROB-25`, `PROB-26`, `PROB-29`, + motion for stale/tab/modal/copy. RC-04 (a11y side), RC-05, RC-11. (PROB-22's full per-section status refactor is a Data/Structure concern — doc 07/08 — but motion supplies the per-section visual signal that makes it worth doing.)
