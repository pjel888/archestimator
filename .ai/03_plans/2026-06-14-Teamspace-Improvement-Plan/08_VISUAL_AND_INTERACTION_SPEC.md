# 08 · Visual & Interaction Spec + Design-System Reference

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Design spec (token-grounded, implementable)
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%
**Anchor files:** `DESIGN.md`, `src/app/globals.css`, `components.json`, `src/components/ui/{avatar,badge,toast,overlays/modal}.tsx`, `ui/dropdown-select.tsx`, `src/lib/collaboration/colors.ts`

> Every value below reads from the shipped token system — no invented colors, radii, or sizes. Part A is the factual token reference; Part B is the redesign spec for the modal, header cluster, and cursors.

---

## PART A — Design-system reference

**Token source:** Tailwind v4 CSS-first (no `tailwind.config.*`). Raw values in `globals.css:6–36` (`:root`); mapped to utilities via `@theme inline` (`:38–78`). shadcn "new-york", `baseColor: neutral`, lucide icons, `cn` = `@/lib/ui/cn`.

> ⚠️ **Token discrepancy:** `DESIGN.md:6` declares `primary/ink = #292929`; shipped `globals.css:8` uses **`#3D3D3D`** (the running value). Use `#3D3D3D` / the `--foreground` token; do not hardcode either hex.

### Cheat-sheet
| Token | Value | Defined |
|---|---|---|
| `--background` / `--surface` | `#ffffff` | `globals.css:7,13` |
| `--foreground`/`--primary`/`--ink`/`--accent`/`--focus` | `#3D3D3D` | `:8–9,21,26` |
| `--secondary` | `#5d5d5d` | `:11` |
| `--tertiary`/`--muted` | `#7f7f7f` | `:12,20` |
| `--surface-muted`/`--canvas`/`--surface-warm` | `#f5f5f5` | `:14–17` |
| `--hairline`/`--divider` | `#f2f2f2` | `:18–19` |
| `--accent-dark` | `#2A2A2A` | `:24` |
| `--success` / `-soft` | `#15803d` / `#dcfce7` | `:27–28` |
| `--warning` / `-soft` | `#b45309` / `#fef3c7` | `:29–30` |
| `--danger` / `-soft` | `#b91c1c` / `#fee2e2` | `:31–32` |
| `--radius-xs` (the **only** radius) | `3px` → `rounded-xs` | `:35` |
| `--font-sans` | SF Pro stack | `:34,75` |
| Spacing | xs4 · sm8 · md12 · lg20 · xl48 · xxl64 · section112 (px) | `DESIGN.md:211` |
| App type scale | SF Pro, **12px max**: `app-title 12/500`, `app-subtitle 11/500`, `app-body 10/400`, `app-label 9/500`, `app-label-sm 8/400`, `app-button 10/500` | `DESIGN.md:88` |
| Modal scrim z | `z-[1000]` | `overlays/modal.tsx:95` |
| Toast viewport z | `z-[100]` today, which is **below modals** | `ui/toast.tsx:160` |
| Cursor overlay z | `z-30` | `EstimateSheetContent.tsx:663` |
| Animation durations | `0.15 / 0.2 / 0.3s` ease-out | `globals.css:864` |
| Collaborator palette | 8 colors, `hash(userId)` | `colors.ts:9–83` |

### House laws (from `DESIGN.md`)
- **Radius:** `rounded-xs` (3px) everywhere — **no `rounded-full`**, even status dots/pills.
- **Elevation:** anti-shadow; hairline borders + whitespace replace shadows. Subtle elevation only for modals/popovers/drawers. Heaviest allowed shadow in collab UI = the cursor marker's `shadow-[0_4px_12px_rgba(17,24,39,0.18)]` (`EstimateSheetContent.tsx:689`) — match, don't exceed.
- **Type:** product scope = SF Pro, 8–12px. **Landing's Inter scale must not appear in `/workshop`.** Labels/meta must never be larger than the body they describe.
- **Motion:** `prefers-reduced-motion` is respected (`globals.css:716–808`) — all new motion must honor it.

### Reusable primitives
| Primitive | Path | Notes for Teamspace |
|---|---|---|
| `Avatar` | `ui/avatar.tsx` | `size: xs20/sm28/md36/lg48`, `rounded-xs`, image-error→initials. **Unify `AvatarBubble` onto this** + a color-ring + online-dot wrapper. |
| `Modal`/`AppModal` | `ui/overlays/modal.tsx` | `size`, **`tone: default/success/warning/danger/destructive`** (destructive → `role="alertdialog"`), `footer`. Scrim `z-[1000]`. Use `tone="destructive"` for removal. |
| `DropdownSelect` | `ui/dropdown-select.tsx` | APG combobox; `disabled` (hard) vs `ariaDisabled` (transient/focusable); supports `invalid`. |
| `Badge` | `ui/badge.tsx` | `tone`, `size: xs/sm`, `rounded-xs`, tabular-nums. Use for role chips. |
| `Toast` | `ui/toast.tsx` | `useToast().toast({message, tone})`; not sonner. **Use for copy/invite/remove success.** |

### Layering contract
Current z-bands: cursor overlay `z-30`, toast viewport `z-[100]`, modal root `z-[1000]`. If Teamspace uses global toasts from inside the modal, the toast viewport must either be raised above active dialogs or replaced by modal-local inline feedback. Otherwise success/error messages can render behind the modal. Add a QA assertion that a modal-triggered notification is visible while the Share modal is open.

### Collaborator colors (`colors.ts`)
8-entry palette, `getCollaborationColorForUser(userId)` = djb2 hash → stable per user, already shared by avatars + cursors. Each entry `{name, cursor (dark 600/700), cursorSoft (light 100), text:"#FFFFFF", ring (cursor@24%)}`. **Risk:** 8 colors → collisions at ~3–4 concurrent users (birthday paradox), no de-collision. Acceptable for small teams; if many simultaneous cursors, widen the palette or add per-session uniqueness (D-7).

---

## PART B — Redesign spec

### 1. Modal → "Share" (Track D)

**Shell:** `AppModal size="lg"`, title **"Share"**, description **"Invite people and manage who can edit."** Single scroll column on `<640px` (collapse the `168px` rail); two zones on desktop. Drop the fixed `min-h-[360px]`.

**Type hierarchy (restore it):** modal title `app-title` (12/500); zone headers `app-subtitle` (11/500); member name `app-body` (10/400); email/meta `app-label`/`app-label-sm` (9/8). **Avatar initials promoted to 9–10px** — never the 8px content floor.

**Zone 1 — People (primary).** Always-visible invite field at the top: email `<input>` + role `DropdownSelect` + "Invite" — the visual focus. Inline validation: invalid email → `aria-invalid` + `border-danger` + helper text *before* submit (reuse `DropdownSelect`'s `invalid` styling for parity). Below it, **one unified member row** (kill the rail/list duplication):

```
[avatar+ring+dot]  Name (10/400)              [role ▾]   [⋯ remove]
                   email (9, --tertiary)  · active now
```
- Per-row optimistic feedback: role change → inline spinner→check on **that row only**; only that row's picker `ariaDisabled` (not the global `isPending`).
- Remove → `AppModal tone="destructive"` (alertdialog) "Remove {name}?" + notify checkbox + "You can re-invite them later." Toast on success.
- Empty state (zero collaborators beyond owner): an illustration-light **"Invite your first teammate"** with the invite field front-and-centre.
- "Checking invite delivery…" state while readiness resolves (replace the silently-dead disabled form).
- Field alignment: project and estimate invite rows reserve the same helper/error slot under the email field and role picker. Error/help text may not push only one control out of alignment; paired controls keep shared baselines even with invalid email copy or delivery-readiness helper text.
- Unavailable/degraded state: if `summary === null`, do not stop at a disabled gear. Show a terse unavailable affordance ("Teamspace unavailable") with retry/open-project fallback where possible. If optional collaboration tables fail-soft to empty arrays, surface a degraded state in the modal/header so "no collaborators" is not confused with "collaboration tables unavailable."

**Zone 2 — Estimate access (secondary, demoted).** Per-sheet access mode + invite, below People. Pluralize "{n} override(s)".

**Pending invitations:** show all with a real **"+N more"** expander; each shows `expiresAt` ("expires in 3 days") + Resend/Copy (Copy flips to "Copied ✓" adjacently, plus toast).

**Remove:** the "Private realtime" transport panel — or replace with one human line "Live presence & cursors enabled."

**Live regions:** one `aria-live="polite"` for routine results; one `aria-live="assertive"` for destructive results — not a single shared `role="status"`.

### 2. Header presence cluster (Track B)

Right-aligned in the project header, replacing the gear:

```
( A )( L )( M )(+3)  [⚙ Manage access]
 self  online  online  overflow
```
- Faces: `size-6` (24px), `-ml-2` overlap (**wire up `AvatarBubble.offset`/`zIndex`**), `rounded-xs`, 1px ring = `color.ring` (delete the conflicting hardcoded `#F2F2F2` shadow). Online **corner status marker** `after:size-1.5 bg-success` bottom-right, using `rounded-xs`; do not call it a circular dot unless a one-off circle exception is explicitly approved.
- Ordering: self first; online before offline; offline ~40% opacity (or hidden — D-2).
- Each face = focusable `<button>`, `aria-label="{name}, {role}, {active now|last seen…}{, editing {sheet}}"`, hover/focus tooltip (not native `title`).
- `+N` chip (`rounded-xs`, `--surface-muted`, `app-label`) → **popover roster** (`AppModal`-sibling popover, subtle elevation): rows of face+name+role+activity; footer "Manage access" → full modal.
- `aria-live="polite"` `aria-relevant="additions removals"` region announces one join/leave at a time.
- Color of each face == that user's cursor hue (`getCollaborationColorForUser`).

**Responsive / touch rules:**
- `>=900px`: show up to 4 faces, `+N`, and text "Manage access".
- `640-899px`: show up to 3 faces, `+N`, and an icon-only manage button with tooltip.
- `<640px`: show up to 2 faces plus `+N`; open the roster as a bottom sheet/full-width modal instead of a tiny popover.
- Coarse pointer/touch: no hover-only details. Tap face/overflow opens the roster. Suppress project-wide page cursors by default on touch unless a later owner call explicitly enables a touch-safe mode.

### 3. Cursor marker (sheet + project)

Restyle `RemoteEstimateCursorMarker` (`EstimateSheetContent.tsx:674–696`); reuse for the project layer.
- Caret: SVG arrow filled `color.cursor`; name flag: `color.cursor` bg, `color.text` (#FFFFFF) text at `app-label-sm` (8/400), `rounded-xs`, the allowed `shadow-[0_4px_12px_rgba(17,24,39,0.18)]`.
- Motion: `translate3d` updated via ref/`style` from a rAF spline interpolator (`07 §2.2`); **`prefers-reduced-motion: reduce` → snap (no transition).**
- Label text = roster lookup by `userId` (untrusted-payload rule, `05/06`), escaped.
- Z-band: `z-30` inside the sheet; if a global overlay above the modal scrim is ever needed, `~z-[1050]` — but cursors should sit below modals.
- Selection indicator: 1px outline `color.cursor` on the `focusedCell` cell/row, `rounded-xs`.
- Screen-reader equivalent: visual cursor and selection overlays remain `aria-hidden`, but focused rows/cells expose hidden descriptive text or a scoped live region ("Alex is editing this row"). Do not rely on color/position alone.

### 4. Contrast fix (P0)
Avatar initials currently `cursorSoft` bg + `cursor` text (≈3.3:1, **fails**). **Fix:** use the palette's intended **`color.text` (#FFFFFF) on a saturated `color.cursor` background** (≥4.5:1), OR keep the soft background but darken text to meet 4.5:1. Verify every one of the 8 palette pairs against WCAG 1.4.3 (amber/sky are borderline). Delete the dead `text:#FFFFFF`-vs-actual-usage mismatch by actually using it.

### 5. Motion & a11y checklist (applies to all new UI)
- Entrance: existing `.animate-in`/`.fade-in`/`.scale-in` at `duration-150/200`; none under reduced-motion.
- Focus order: invite field → member rows → estimate zone → footer; focus trap via the `Dialog` primitive (already correct).
- All interactive presence elements keyboard-reachable; no information by color alone (pair color with name/initials — `07 §3.2`).

→ Build order and exact files in `09`. Acceptance thresholds (incl. the contrast check and the reduced-motion check) in `10`.
