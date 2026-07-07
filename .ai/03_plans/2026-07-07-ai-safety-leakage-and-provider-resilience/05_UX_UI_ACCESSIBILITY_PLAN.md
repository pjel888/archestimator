# 05 — UX / UI / Accessibility Plan

UI scope is intentionally narrow: AI surfaces are (1) a floating copilot button + panel (`EstimateCopilotFloatingButton.tsx`), (2) the gate in `WorkshopPageShell.tsx`, and (3) launch/truthfulness copy. No new design system is needed; `DESIGN.md` is alpha-stage and defers to Philip (AGENTS.md/CLAUDE.md). Per the proportional verification policy, browser proof is **not** the default gate; static + DOM + a11y assertions suffice unless an interaction/routing/auth claim demands it.

## Primary journeys

1. **Ask (read-only):** User opens floating button → types question → sees an "assisted" answer grounded in their workspace; cannot edit/delete/create anything from Ask.
2. **Package-builder (draft/refine/apply):** User describes a package → reviews a deterministic-or-assisted draft → explicitly confirms (checkbox + apply) → sees inserted nodes/rows with attribution `metadata.source:"ai-package-builder-apply"` and can undo via estimate history.
3. **Provider-down:** Ask shows an honest "AI is temporarily unavailable" state (no hang); package-builder continues with a deterministic draft clearly labeled as not provider-assisted.

## Screen / component states (must each be designed/tested)

| State | Ask | Package-builder |
|---|---|---|
| Loading | spinner/skeleton in panel | draft-building indicator |
| Empty | prompt hint | empty-state guidance |
| Success | answer + "assisted, read-only" footer | draft preview + confirm |
| Validation error | inline message | draft-validation errors block apply |
| Authorization error | 403 message | 403 message |
| Provider unavailable (REL-004) | "temporarily unavailable" + retry | deterministic draft + "not AI-assisted" label |
| Rate limited (429) | "slow down" + Retry-After | (new) same |
| Conflict / idempotent replay | N/A | "already applied" detected via idempotency |
| Disabled (flag off) | button hidden | button hidden |

## Accessibility

- Floating button: visible focus, keyboard reachable, `aria-expanded`/`aria-controls` for the panel, accessible name ("Ask Flip, read-only assistant").
- Panel/dialog: focus trap when open, focus restoration on close, `role="dialog"` or `role="region"`, live-region for streaming/answer (if any), Esc to close.
- Confirmation (apply): the checkbox + apply button are a single labeled control group; the consequence ("inserts estimate rows") is announced.
- Color/non-color cues: success/error not color-only; reduced-motion respected for any animation.
- Copy containment: long answers scroll within the panel (no layout push).
- Keyboard path: open → type → submit → read → close, all without pointer.

## Localization / copy implications

- "Assisted"/"reviewable" only; never "autonomous"/"agentic"/"AI-powered magic" (roadmap rule; brand specs). Privacy note near every AI mention (corpus §404).

## Design-system reuse

- Reuse `src/components/ui/` primitives for button/dialog/sheet/spinner. Do not invent ad hoc AI chrome.
- Tailwind v4 tokens; no new tokens required (alpha `DESIGN.md`).

## UX regressions to guard

- Button appearing when AI is disabled (must stay hidden unless `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`).
- Misleading success (apply reported success but rows not inserted) — the idempotency ledger + `estimate_sheet_events` audit are the source of truth, not the UI.
- Stale optimistic state after apply (no live broadcast in `apply.ts`) — collaborators see changes on next navigation/revalidation; document this.

## Verification plan (proportional)

- Static: a11y attributes present in component source.
- DOM test: button presence/absence by flag; focus management; dialog open/close.
- Browser proof (only if interaction/auth claim needs it): apply confirmation flow + provider-down fallback rendering. Otherwise intentionally skipped per AGENTS.md.

## Action-level accessibility proof matrix (Improve pass — required by PHASE 3 §3)

`Action | Keyboard path | Focus target/restoration | Accessible name / live-region | Proof type`

| Action | Keyboard path | Focus target/restoration | Accessible name / live-region | Proof type |
|---|---|---|---|---|
| Open Ask Flip panel | Tab to floating button → Enter/Space | focus → first focusable in panel; Esc restores to button | button `aria-label="Ask Flip, read-only assistant"`; `aria-expanded`/`aria-controls` | DOM assertion (keyboard + focus + attrs) |
| Submit question | type → Tab to submit → Enter | focus stays in panel; result region announced | `role="status"`/`aria-live="polite"` on answer region | DOM assertion |
| Close panel | Esc | focus restored to opener button | announcement "closed" optional | DOM assertion |
| Apply (package-builder confirm) | Tab to checkbox → Space; Tab to Apply → Enter | focus to Apply; on success focus to inserted region or status | checkbox label states consequence; `aria-live` status "inserted N rows" | DOM assertion; browser proof only if focus-after-insert claim needs it |
| Provider-down state | n/a (passive) | n/a | `aria-live="polite"` "AI temporarily unavailable" | DOM assertion |
| Rate-limited state | n/a (passive) | n/a | `aria-live` "slow down, retry in Ns" | DOM assertion |

WCAG 2.2 AA alignment: visible focus, keyboard operable, semantic roles/labels, live-regions for async updates, contrast (reuse design tokens), reduced-motion respected. State matrix (loading/empty/success/partial/error/conflict/permission-denied/offline/retry/timeout/cancellation) is in the "Screen / component states" table above.

Explicit non-goals (per Improve §3): no decorative redesign; no marketing-page drift; no generic SaaS chrome — AI UI reuses `src/components/ui/` primitives.
