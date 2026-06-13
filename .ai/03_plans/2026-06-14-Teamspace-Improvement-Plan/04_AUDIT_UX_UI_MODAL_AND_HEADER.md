# 04 · UX/UI Audit — Modal & Header

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Audit (design critique, Rams + WCAG 2.2 AA + collaboration-UI best practice)
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%
**Anchor files:** `ProjectTeamspaceHeader.tsx`, `src/lib/collaboration/colors.ts`, `DESIGN.md`, `src/components/ui/overlays/{modal,dialog}.tsx`, `ui/dropdown-select.tsx`, `ui/avatar.tsx`

> Judged against Dieter Rams' ten principles, Figma/Linear/Notion/Liveblocks collaboration patterns, WCAG 2.2 AA, and the project's own `DESIGN.md`. The primitives (`Dialog`, `DropdownSelect`, `colors.ts`) are 100%-grade; the Teamspace surface on top of them is a **~55%-grade draft that under-uses its own engine.**

---

## 0. The framing gap (read first)

The brief asks about "the header avatars" and their readiness to show live status/cursors. **There are no header avatars.** The header (`:326–348`) is **one 40px gear button** (`UserCircleGearIcon`) + a green count badge. `AvatarBubble` (`:52–94`) — the only presence representation — renders **only inside the modal's left rail** (`:366`).

Every collaboration tool the brief names puts **faces in the header** as the primary presence affordance. Archestimator hides identity behind a settings cog while the engine to do better already exists (`useProjectPresence`, private Realtime channels, and `colors.ts` stable per-user cursor hues). **This is the single biggest product miss** — we built the engine and shipped the dashboard light. The current raw route/sheet fields in project presence are not an asset to surface; they are security debt to remove before the header becomes more visible.

## 1. Information architecture

| Sev | Where | Issue | Principle |
|-----|-------|-------|-----------|
| 🟠 P1 | Title `:352` "Teamspace settings / Project and estimate access" | Framed as **settings**, but the job is **invite & see people**. Figma/Notion call this "Share." | Rams #2, #4 |
| 🟠 P1 | Stacked sections `:376, :514, :602` | Flat stacking — "invite a person" (90% action) has the same weight as estimate-inheritance overrides (1%) and realtime transport names (0%). No primary/secondary IA. | Rams #4, #5 |
| 🟡 P2 | "Private realtime" panel `:630–635` renders `"presence presence, broadcast cursors"` | Internal transport names leaked verbatim as UI copy. Meaningless to a contractor. | Rams #2, #10 |
| 🟡 P2 | Rail roster `:359–373` **vs** management list `:427–469` | The **same collaborators listed twice** in one modal, unreconciled (rail = avatar+email; list = name+role+remove). One unified row halves scan cost. | Rams #10, #4 |
| 🟡 P2 | Pending invites `.slice(0,3)` `:473` | Silently truncates with no "+N more" and no count — UI data loss. | Rams #6 |

## 2. Visual hierarchy & typography

`DESIGN.md` is explicit: app scale is **12/11/10/9/8px**, and labels/meta "must never render larger than the body text they describe."

| Sev | Where | Issue |
|-----|-------|-------|
| 🟠 P1 | Avatar initials `:75` `text-[8px]`; rail name `:368` `text-[10px]`; heading `:379` `text-[11px]`; link/realtime H3 `:604,:631` `text-[10px]` | The whole modal lives at the **8–11px floor**. Headings are the same size as body/controls → effectively no hierarchy. `app-title` (12px/medium) is never used. |
| 🟠 P1 | `:75` 8px initials in a 24px bubble | The 8px **meta floor** is used for **content** (a person's initials). Promote to 9–10px. |
| 🟡 P2 | `leading-[10px]` literals (`:98,:369,:477,:524,:547`) | Arbitrary bracket line-heights instead of the tokenized `app-label-sm`. |
| 🟡 P2 | `!text-[10px]` on invite picker `:403` vs `DropdownSelect` trigger `!text-[9px]` (`dropdown-select.tsx:351`) | Dueling `!important` — the picker's internal size doesn't match system body size. |
| 🟡 P2 | `mt-0.5/1/1.5/2/3`, `gap-1/2/3` mixed freely | No consistent spacing step vs `DESIGN.md` `xs4 sm8 md12`. "Tuned by eye." |
| 🟡 P2 | Magic columns `[168px_…]`, `[…_84px_76px]`, `[…_76px_56px]`, `w-16`, `w-20`, `min-h-[360px]` | The two invite forms use **different** column math, so they don't align. |

**Density verdict:** below even Archestimator's compact standard — crosses from "efficient" into "cramped/squint."

## 3. Interaction & states

| Sev | Where | Issue |
|-----|-------|-------|
| 🔴 P0 | All actions → `runAccessAction` `:181` → one `actionMessage` at the **bottom** `:637–651` | **No per-row feedback, no toast.** Change Alice's role → the only confirmation is a status line below the estimate + realtime panels, possibly below the fold. Success is invisible at the point of action. |
| 🟠 P1 | Global `isPending` `:134` | `aria-disable`s **every** picker at once (`:438,:533,:579`). Changing one role greys out the whole modal. Linear/Figma disable only the mutating row. |
| 🟠 P1 | No zero-collaborator empty state | The most important empty state — people — is missing (estimates *do* get one, `:595`). No "Invite your first teammate" moment. |
| 🟠 P1 | Invite has no inline validation `:222–240` | Only checks `email.trim()` truthiness; `foo` submits to the server, fails as a bottom line. No `aria-invalid`, no red border — though `DropdownSelect` supports an `invalid` state. |
| 🟠 P1 | Readiness loading `:149–162` | Until `readProjectInviteDeliveryReadiness` resolves, the **entire invite form is disabled with no explanation** (a dead form for a beat). The "checking…" state is unrepresented. |
| 🟡 P2 | Copy success `:248` routes to the bottom line | A copy action should flip the button to "Copied ✓" adjacently. |
| 🟡 P2 | Single `role="status"` `:646` | All actions collapse into one polite live region; rapid actions stomp announcements; destructive results aren't `assertive`. |

**Missing states:** toast/inline success · per-row pending · invalid-email inline error · zero-collaborator empty state · "checking delivery" state · pending-invite overflow · `expiresAt` surfacing (the type has it, `types.ts:32`, never shown).

## 4. Avatars & presence representation

| Sev | Where | Issue |
|-----|-------|-------|
| 🟠 P1 | Header `:326–348` | No avatar cluster (§0). `AvatarBubble`'s `offset`/`zIndex` stacking (`:64–65`) is **dead** — always called with `offset={0}` (`:366`). Code written for a cluster that was never built. |
| 🔴 P0 (readiness) | Presence/cursor engine under-used | `useProjectPresence` and sheet cursors are live, and `colors.ts` mints cursor colors, but the project-channel payload currently includes raw route/sheet fields that must be replaced with coarse `activeSurface` before the UI exposes richer presence. |
| 🟡 P2 | Online dot `:76` `after:size-1.5 bg-success` | 6px dot, only presence signal, lives in the modal not the header. |
| 🟡 P2 | `getInitials :43–50` | `slice(0,2)` degrades for single-char / non-Latin names. |

The `colors.ts` system itself is well-designed (8 stable, distinguishable hues, deterministic by `userId`) — the problems are the contrast bug below and that it's hidden in a settings modal.

## 5. Accessibility (WCAG 2.2 AA)

The shared `Dialog` is genuinely strong — real focus trap (`dialog.tsx:202–230`), focus restore, `inert` backgrounds, scroll lock, Escape handling, `aria-modal`/`labelledby`/`describedby`. `DropdownSelect` is an APG-correct combobox. The failures are in *this component's use*:

| Sev | Where | Issue |
|-----|-------|-------|
| 🔴 P0 | Avatar contrast `colors.ts` + `:66,:70` | `backgroundColor: color.cursorSoft` (e.g. teal `#CCFBF1`) with `color: color.cursor` (`#0F766E`) ≈ **3.3:1 — fails 1.4.3** for 8px text (needs 4.5:1). The palette's intended `text:"#FFFFFF"` field is **never used**. Amber/sky pairs also borderline. |
| 🟠 P1 | Removal modal not `alertdialog` `:656` | `Modal` supports `tone="destructive"` → `role="alertdialog"` (`overlays/modal.tsx:99`), but no `tone` is passed. SR users lose the warning semantic. |
| 🟠 P1 | Title-only identity `:79 title={…}` | Native `title` is not keyboard-accessible; the avatar `<span>` isn't focusable. Becomes a real failure once header faces exist. |
| 🟠 P1 | Count badge `:340–347 aria-hidden` | Presence count hidden from AT with no SR-only equivalent → "Project teamspaces, collapsed," no presence info. |
| 🟡 P2 | Shared `role="status"` `:637` | Rapid actions stomp; destructive only `polite`. |
| 🟡 P2 | Remove icon `:455` danger via `hover:text-danger` only | Destructiveness invisible until hover. |

## 6. Responsive

- 🟠 P1 — `grid-cols-[168px_…]` `:358` is **fixed at all widths**; on a phone the 168px rail eats half the modal. No `@media`/responsive variants anywhere. `DESIGN.md` mandates "tablet → drawer/sheet"; this modal has no mobile strategy.
- 🟠 P1 — Invite grid `[…_84px_76px]` `:384` crushes the email field at narrow widths; should stack.
- 🟡 P2 — Removal modal `max-w-sm` is the only well-behaved part.

## 7. Copy

| Sev | Current | Fix |
|-----|---------|-----|
| 🟠 P1 | "presence presence, broadcast cursors" `:632` | → "Live presence and cursors enabled" (or remove). |
| 🟡 P2 | "Project and estimate access" `:353` | → "Invite people and manage who can edit." |
| 🟡 P2 | "Role baseline for every estimate" `:380` | jargon → "Default access for every estimate." |
| 🟡 P2 | "No email" `:369` | reads like an error → "—" / omit. |
| 🟡 P2 | `${overrideCount} override` `:547` | no pluralization. |

## 8. Anti-patterns / AI-slop

| Sev | Where | Issue |
|-----|-------|-------|
| 🟠 P1 | `:75 shadow-[0_0_0_1px_#F2F2F2]` + `:68 boxShadow: 0 0 0 1px ${ring}` | **Two competing 1px ring shadows** on one avatar; the hardcoded `#F2F2F2` is dead/conflicting (should be `border-hairline`). |
| 🟡 P2 | `AvatarBubble` `offset`/`zIndex` (`:64`) | Dead speculative-generality code. |
| 🟡 P2 | `min-h-[360px]` `:358` | Layout coupled to a guessed content height. |
| ℹ️ | `ProjectDetailsModal.tsx:155` | Sibling modal hand-rolls a glassmorphic dialog instead of `Modal` — Teamspace is the *better* citizen; flag the sibling, don't copy it. |

## What 100%-grade looks like (vision → see `08` for the spec)

**A. Header presence cluster (the real prize):** replace the lone gear with a live **overlapping avatar stack** (wire up the dead `offset` code), online-first ordering, `+N` overflow → popover roster, each face a focusable `<button>` with a full `aria-label` and an `aria-live` join/leave region. The next step reuses the live presence/cursor stack and `colors.ts`, but only after project-channel data is narrowed to coarse `activeSurface`; sheet-specific `focusedCell`/cursor detail stays on the sheet channel. Gear demotes to a small "Manage access" affordance appended to the cluster.

**B. The modal:** rename to "Share / People & access"; one **unified member row** (kill the duplication); restore the 8→12px type hierarchy; per-row optimistic feedback + real toasts; inline email validation; three honest states (first-teammate empty, "checking delivery", pending "+N more" with `expiresAt`); fix avatar contrast (use the white `text` field on a saturated `cursor` bg) and delete the conflicting `#F2F2F2` shadow; `tone="destructive"` on removal; delete/translate the realtime transport panel; responsive collapse under ~480px; tokenize the spacing/column magic numbers.

### Priority ledger (UX/UI)
- 🔴 **P0:** avatar text contrast (WCAG fail) · no point-of-action success feedback · presence/cursor capability rendered invisible (no header faces).
- 🟠 **P1:** no header avatar cluster · settings-framed IA · missing empty/validation/checking states · global (not per-row) pending · non-`alertdialog` removal · title-only + aria-hidden presence (SR gaps) · type hierarchy collapsed · no responsive behavior.
- 🟡 **P2:** transport-leak/jargon copy · spacing/column magic numbers · dead stacking code · conflicting ring shadows · pending-invite truncation · pluralization.

→ Visual & interaction spec in `08`. Presence/cursor product+technical design in `06`. Sequencing in `09`.
