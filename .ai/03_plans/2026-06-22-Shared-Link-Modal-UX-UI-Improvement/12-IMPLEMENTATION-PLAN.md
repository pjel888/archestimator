# Shared-Link Modal — Comprehensive Implementation Plan

> **For the implementing AI:** This is your operator's manual. Read `00-PLAN.md`, `02-PROBLEM-REGISTER.md`, and this doc end-to-end before touching code. Execute phases 0→6 in order; each phase is independently shippable. **Grep the symbol name, never line-jump** — `:NNN` anchors are point-in-time (2026-06-23) and drift under active commits. Run `bun test` / `bun run test:dom` after every task; never commit red.

**Goal:** Rebuild the shared-link modal (`ProjectPublicationHeader.tsx`) so "share this estimate with a client" is the fastest path, the link WCAG-AA-passes, the modal is one Paper surface, and the god component is decomposed — with ~0 errors, behavior-preserving refactors verified by tests.

**Architecture:** Phased, primitive-first, extract-then-redesign. Fix shared primitives (contrast, nested-modal stacking, ControlField ARIA) → add motion → extract the god component into a hook + tab components (pure move) → optional client-sync → compose the redesigned IA from the extracted pieces. No RPC/migration change (`actions.ts` is FIXED).

**Tech Stack:** Next.js (App Router) · React 19 · TypeScript · Tailwind v4 · TanStack Query · Zustand · Vitest + React Testing Library + axe-core · Supabase/Postgres (untouched).

**Status of source plan:** ✅ VERIFIED — `11-ADVERSARIAL-QA-LEDGER.md` (0 blockers, 25 findings reconciled). Code anchors re-verified live for this doc (94 anchors checked).

---

## 0. How to use this doc

- **Read order:** `00-PLAN.md` (contracts) → `02-PROBLEM-REGISTER.md` (what + why) → this doc (how) → `09-VERIFICATION-AND-QA-PLAN.md` (gates). Reference docs: `03`/`04`/`05`/`06` for the target specs, `07` for the file plan, `10` for blast radius.
- **One branch, sequential phases:** `feat/shared-link-modal-redesign` off `main`. Land Phase 0+1 as fast-review PRs; Phase 2 its own PR (shared primitive, `/codex:review`); Phases 3→4→5 sequential (5 builds on 3).
- **Discipline:** TDD per task (write failing test → see it fail → implement → see it pass → commit). Frequent small commits. Never edit `actions.ts` signatures. Preserve the list in §6.
- **Assume concurrent agents:** multiple AIs may edit this tree. **Disjoint file scopes per task** (each task names the exact files it owns); pull before each commit; if a conflict appears, the lower-phase task wins (it's a dependency).

## 1. SWOT (the implementation strategy)

**Strengths**
- Phased + primitive-first means the two P0s (contrast, first-publish) ship fast and the largest diff (god-component extraction) is a *behavior-preserving* move verified by the existing suite.
- The server contract is honestly FIXED — `actions.ts` (1623 lines) is touched by **no** phase. Success messages are already distinguishable by string + `clientLinkPath`, so the success router is client-only (zero RPC).
- Preserve-list is concrete + code-verified (`confirmInFlightRef` `:321`, AC-MOD-18 curation, optimistic signature-gating `:168`/`:184`, dual live regions, RBAC `actions.ts:173`).
- No data change → full rollback = revert the branch (no DB repair/backfill). Not data-high-blast-radius despite shared-primitive blast.

**Weaknesses**
- **Phase 2 is HIGH risk** — `ControlField` ARIA contract touches **6 production files / 62 `<ControlField>` call sites** (AddComponentModal 30, EditComponentDrawer 11, AccountSettingsFormFields 11, ProjectChartsClient 4, activity-history 3, ProjectPublicationHeader 3). One broken `htmlFor`/`aria-describedby` corrupts SR naming app-wide.
- Drafts are **4 distinct per-draft `{value, summaryKey}` useState** (`:303-345`), not 4 plain values — the "move" must preserve per-draft `summaryKey` gating exactly or the reset-on-summary-swap invariant regresses.
- Phase 3 "no behavioral diff" is only as strong as draft-machine test coverage (currently thin — a draft-state regression matrix must be added, §8).
- `runExclusive` (Phase 4) is **perceived-integrity**, not data-integrity — a determined double-click still slips the rotate+recipient-add race. The true fix (`expected_encrypted_token` on `addSharedLinkRecipients`) is a server follow-up, not in this pack.

**Opportunities**
- The contrast fix (Phase 0) retires a citable WCAG violation the project already sanctions — and because `DialogDescription` (`dialog.tsx:289`) is consumed by every modal, it lifts AA compliance app-wide.
- `usePublicationDrafts` extraction makes the draft machines unit-testable for the first time and creates the seam that cleanly fixes PROB-18 (`Update`→clear-password intercept) by surfacing "Remove password" as its own intent.
- `ConfirmDialog` (`confirm-dialog.tsx`, `autoFocus={!destructive}` on Cancel `:62`) already solves PROB-26 — reuse retires it near-1-line.
- First-publish `GeneratePanel` (PROB-01) targets the modal's reason for existing — highest user-value change.

**Threats**
- Phase 2 touches `dialog.tsx`/`modal.tsx` (every modal). A stacking/inert regression breaks focus app-wide. The nested-confirm Tab-trap regression test (§8) is mandatory.
- Line drift: every `:NNN` drifts under active commits. **Grep the symbol.** (Already observed: `confirmInFlightRef` `:318`→`:321`, optimistic helpers `:160`→`:168`/`:184`.)
- `datetime-local` cross-SR variance — needs a specific NVDA/VoiceOver pass, not just axe.
- PROB-13 sidebar A/B undecided — must ship P0s on Option A default (D7), treat B as a one-token swap.

## 2. Decision register (all decided — implement the recommended option)

| ID | Question | **Decision** | Rationale (verified) |
|----|----------|--------------|----------------------|
| **D1** | Reducer vs move for drafts? | **Move only** (group the 4 per-draft `{value,summaryKey}` useState + setters + dirty derivation + `pendingCount` into one hook; no new API) | Drafts already correct + `summaryKey`-keyed (`:303-345`); a reducer risks the reset invariant. Move shrinks the god component + makes invariants testable. Redesign only if a real bug surfaces. |
| **D2** | `ConfirmDialog` reuse vs bespoke? | **Hybrid** — `ConfirmDialog` as base + thin `DestructiveActionConfirm` wrapper mapping the 4-value action union to `{title,description,children,confirmLabel,tone}` | `ConfirmDialog` already has Cancel `autoFocus` + tone/danger (`:62`) → retires PROB-26 near-1-line; wrapper encapsulates the rotate/regenerate/revoke/reactivate copy union. |
| **D3** | Phase 4 scope? | **Minimal in-pack + defer convergence** | Disable recipient Add/Send during in-flight rotate (reuse `isPending`/`confirmInFlightRef`); optional client-side expiry countdown. Defer `usePublicationSync` convergence rewrite + the server `expected_encrypted_token` fix to a separate data-convergence pack. Re-frame `runExclusive` as perceived-integrity. |
| **D4** | Sidebar A/B? | **Default Option A (flat white)**; defer to Philip; Option B = one-token swap later | A is AA-correct + DESIGN.md-conformant; B is `bg-surfaceMuted` on the column later. Never block P0s on this. |
| **D5** | `formatExpiry` dup vs move? | **Duplicate** (~10 lines into `lib/publication/format.ts`) | Move would add `ProjectTeamspaceHeader.tsx` (out-of-scope surface) to the blast map. Dedup only if a 3rd consumer appears. |
| **D6** | Success-router action label? | **Client-side label** (thread caller-known action into the success branch; reactivate distinguished via the expired-path caller) | Zero RPC; robust to copy edits; the 4 call sites already know which action they fired (`:573`/`:1069`/`:1124`/`:590`). |
| **D7** | P0s decoupled from A/B? | **Yes — ship both P0s on Option A default** | P0s are sidebar-independent. Don't hold a WCAG violation + the primary-intent failure hostage to a P1 aesthetic call. |

## 3. File structure map (new + modified — drift-corrected anchors)

**NEW** (`src/lib/publication/`):
| File | Responsibility | Moves from |
|------|----------------|-----------|
| `optimistic.ts` | `readPublicationServerSignature` + `shouldUseOptimisticPublicationResult` | `ProjectPublicationHeader.tsx:168`/`:184` |
| `format.ts` | `formatExpiry` (+ `formatRelativeOpened`, `formatAbsoluteDate`) | **dup** of `ProjectTeamspaceHeader.tsx:88` (D5) |
| `use-publication-drafts.ts` | group 4 drafts + dirty + `pendingCount` (move, D1) | `:303-345`, `:429-433`, `:534-546` |
| `use-publication-sync.ts` | client-side expiry countdown + refetch (DESCOPE — D3) | new; extends `:458-488`/`:375` |
| `use-publication-busy.ts` | `runExclusive` boundary (DESCOPE — D3) | `:317`/`:321`/`:566` |

**NEW** (`src/components/`):
| File | Responsibility | Moves from |
|------|----------------|-----------|
| `ui/section-label.tsx` | `<SectionLabel>` primitive (11px/600/secondary, sentence case) | replaces 16 eyebrows (`:689` etc.) |
| `workshop/publication/SheetPickerList.tsx` | estimate picker (pure move) | `:1238-1329` |
| `workshop/publication/LinkPanel.tsx` | dominant URL block (15px + Copy/Open + pills) | `:836-885` |
| `workshop/publication/GeneratePanel.tsx` | first-publish focal block (the P0) | new |
| `workshop/publication/EstimatesTab.tsx` | estimate picker tab body | `:887-910` |
| `workshop/publication/AccessTab.tsx` | password/expiry/location disclosure | `:912-1037` |
| `workshop/publication/SharedLinkModalTabs.tsx` | modal tab variant (wraps `TabStrip`) | wraps `ui/tab-strip.tsx` |
| `workshop/publication/DestructiveActionConfirm.tsx` | `ConfirmDialog` wrapper (D2) | `:1194-1229` + `readDestructivePublicationActionCopy` `:234-270` |
| `workshop/publication/PublicationSuccessRouter.tsx` | per-action guided next-step (D6) | new; consumes success branch `:519-547` |

**MODIFIED:**
| File | Change |
|------|--------|
| `ProjectPublicationHeader.tsx` | slim to ~400-line orchestrator; wire `Modal` `footer`+`location` slots; drop `min-h-[600px]`/`max-w-5xl`, the 5-col `<dl>` `:749`, grey sidebar duplication; compose extracted components |
| `ui/overlays/modal.tsx` | open-stack array (push `[data-archestimator-modal-root]` `:98` + `zIndex:1000+stack.length` `:99`); `location` `text-tertiary→text-secondary` `:140` |
| `ui/overlays/dialog.tsx` | on child open, `inert` every open `[data-archestimator-modal-root]` except topmost (extends `:117`); `DialogDescription text-tertiary→text-secondary` `:289`; `DialogTitle 11→13px` `:279`; z from open-stack (`:256`) |
| `ui/overlays/confirm-dialog.tsx` | (consumed, not changed) base for `DestructiveActionConfirm` |
| `ui/control-input.tsx` | `ControlField` ARIA contract (`useId`→`htmlFor`/`id`, `aria-describedby`, `aria-invalid`, `role="alert"` on error; wire via input's explicit id, **not** single-child clone — A11Y-02); label/helper `text-tertiary→text-secondary` + 9→10px (`:77`/`:85`/`:83`); placeholder `text-tertiary→text-secondary` (`:44`/`:94`); `ControlInput base !text-[10px]→!text-[12px]` (`:20`) |
| `workshop/publication/RecipientEmailComposer.tsx` | copy rewrites (C-RECIPIENTS-*); `text-tertiary→text-secondary` + 8→10px (`:336`/`:337`/`:363`); route through busy boundary (D3 minimal) |

**Full interfaces/skeletons:** see `07-COMPONENT-AND-FILE-PLAN.md` §1a/§1b (interfaces re-verified in this plan's source workflow). Key signatures are repeated inline in the tasks below.

## 4. Global constraints (every task inherits these)

- **Colors:** load-bearing text = `text-secondary` (`#5D5D5D`, ~6.6:1 on white). **Never** `text-tertiary` (`#7F7F7F`, ~4.0:1 — fails AA). Brand accent = clay `#AA412A`; `#F24405` campaign-only. `proposalPaper #FFFDF8` is for client docs, **not** this modal.
- **Radii:** only `3px` (dense inner) / `--glass-nav-radius` 8px (pills) / `--glass-radius` 12px (panel). No over-rounding.
- **Surfaces:** one white Paper surface; no nested tiles, no side-stripes, no gradient text, no glass-as-decoration.
- **Server contract FIXED:** no `actions.ts` signature changes, no new RPCs, no migration. Success messages consumed client-side.
- **`"use server"` files export only async fns** (memory: use-server-exports-only-async) — `actions.ts` is fine; if you add a server action, keep it async or `next build` breaks (tsc/vitest miss it).
- **Tailwind v4 arbitrary var:** `bg-[var(--x)]` emits no color — use `bg-[color:var(--x)]` (memory: tailwind-arbitrary-var).
- **Commit messages** end with `Co-Authored-By: Claude <noreply@anthropic.com>`.

## 5. Preserve list (do NOT regress — re-check every phase)

Optimistic signature-gating (`optimistic.ts` post-move) · dual action-feedback live regions (`:660` sr-only + `:1177` visible) · focus-restore/Tab-trap (`dialog.tsx:84`/`:217-244`) · `confirmInFlightRef` double-submit latch (`:321`/`:556`) · destructive-confirm copy (`readDestructivePublicationActionCopy` `:234-270`) · TabStrip ARIA (`:792-797`) · server RBAC + optimistic-concurrency (`actions.ts:173`, rotate `expected_encrypted_token`) · AC-MOD-18 curation preservation (`:325-336`).

---

## PHASE 0 — Contrast + token bumps + `SectionLabel` (mechanical, zero behavior change)

**Resolves:** PROB-02 (P0), PROB-03 (token), PROB-29, PROB-32 (primitive). **Risk:** very low. Ship first.

**Pros:** highest value-to-effort; retires the citable AA violation; lifts AA app-wide (`DialogDescription` is shared). **Cons:** `DialogDescription` swap is the one app-wide surprise (a modal that wanted tertiary now gets secondary — acceptable, AA-correct); size bumps can shift dense rows → visual sweep required; must distinguish load-bearing vs decorative tertiary per-site.

### Task 0.1 — `SectionLabel` primitive (adopt in ONE place)
**Files:** Create `src/components/ui/section-label.tsx`; Modify `ProjectPublicationHeader.tsx` (adopt it on the "Shared link" header only).
**Interface:**
```ts
export type SectionLabelProps = { children: ReactNode; icon?: ReactNode; trailing?: ReactNode; className?: string; divider?: boolean };
export function SectionLabel(props: SectionLabelProps): JSX.Element; // 11px/600/text-secondary, sentence case, border-t when divider!==false
```
- [ ] **1. Failing test** `tests/vitest/section-label.test.tsx`: renders children in a `<span>` with `text-secondary` (NOT `text-tertiary`), no heading role. Run `bunx vitest run section-label` → FAIL (not found).
- [ ] **2. Implement** `section-label.tsx` (flex row: optional icon + `<span className="text-[11px] font-semibold text-secondary">` + optional trailing; `border-t border-hairline mt-4 pt-3` when `divider!==false`).
- [ ] **3. Run** → PASS. **4. Adopt** on the modal's "Shared link" eyebrow (`:689` region) only. **5. `bun run test:dom`** green. **6. Commit** `feat(ui): add SectionLabel primitive, adopt on share-modal link header`.

### Task 0.2 — Contrast token swaps (the P0)
**Files:** `control-input.tsx` (`:77` label, `:85` helper, `:83` error→add `role="alert"`+id, `:44`/`:94` placeholder), `dialog.tsx` (`:289` DialogDescription, `:279` title 11→13px, `:341` close idle), `modal.tsx` (`:140` location), `RecipientEmailComposer.tsx` (`:336`/`:337`/`:363`), `SharedLinkActivityFeed.tsx` (`:150`/`:175`).
- [ ] **1. Failing tests** (one per file, exact names in §8): `ControlField label uses text-secondary not text-tertiary`; `DialogDescription renders text-secondary`; `Modal location slot renders text-secondary`; `RecipientEmailComposer status/help text uses text-secondary`; `SharedLinkActivityFeed meta uses text-secondary`; `Placeholder text uses text-secondary`. Run → FAIL.
- [ ] **2. Swap** every `text-tertiary` → `text-secondary` at the cited lines; bump 9→10px (label/helper), 8→10px (chips), `ControlInput base` `!text-[10px]→!text-[12px]` (`:20`), `DialogTitle` 11→13px (`:279`). Keep `text-tertiary` ONLY where verified decorative.
- [ ] **3. Run** all Phase-0 tests → PASS. **4. axe** (`@axe-core/react`+`vitest-axe`): `assertA11y` on the modal in published/first-publish/expired/revoked → 0 `color-contrast` violations. **5. Sibling-modal regression:** `assertA11y` on project-details + new-template + release-announcement modals → 0 contrast regressions (SCOPE-2 guard). **6. Commit** `fix(a11y): share-modal + app-wide contrast to AA (text-tertiary→text-secondary)`.

**Verify gate:** all Phase-0 tests green + axe clean (modal + 2 sibling modals) + screenshot baseline (modal + 2 modals) shows only the contrast/size change. **Rollback:** revert commit. **P0 PROB-02 closed.**

---

## PHASE 1 — Motion (pending affordance + success feedback, additive)

**Resolves:** PROB-25, PROB-06 (motion side). **Risk:** low. Ship after Phase 0.

**Pros:** pure additive CSS + state; retires the double-click risk; preserves `confirmInFlightRef` + dual live regions. **Cons:** must be default-first (resting state renders first) or perceived-load regresses; CSS-only (no lib); reduced-motion toggle test mandatory.

### Task 1.1 — Pending-on-clicked primary + copy-success ring
**Files:** `ProjectPublicationHeader.tsx` (primary `:1109`, copy `:866`, link `:845`); new scoped CSS for `@media (prefers-reduced-motion: reduce)`.
- [ ] **1. Failing tests** (§8): `Copy button shows isPending affordance only while clipboard write in-flight; aria-live still announces 'Link copied.'`; `prefers-reduced-motion: reduce renders no transition/animation on copy/rotate/regenerate`; `Keyboard-only copy still announces success with reduced-motion on`.
- [ ] **2. Implement:** `isPending`-driven spinner crossfade on the **clicked** primary only (label→"Generating…/Updating…", `aria-busy`); `copiedAt` state → Copy icon `LinkSimple`→`Check` + "Copy"→"Copied" (revert 1600ms, cleared on close to preserve AC-MOD-12) + 2px clay `#AA412A`@35% box-shadow ring on the link field. Ease-out only (expo/quart/quint), no bounce.
- [ ] **3. Reduced-motion:** `@media (prefers-reduced-motion: reduce)` scoped block → `transition/animation-duration:0.01ms`; ring renders static or absent; label swap still announces. **4. Run** → PASS. **5. Commit** `feat(share-modal): pending affordance + copy-success motion (reduced-motion safe)`.

**Verify gate:** reduced-motion DevTools toggle → instant/static equivalents; keyboard copy announces via `aria-live`. **Rollback:** remove CSS + state.

---

## PHASE 2 — Primitive a11y: nested-modal stacking/inert + `ControlField` contract (HIGHEST RISK)

**Resolves:** PROB-05, PROB-26, PROB-21, A11Y-01/02/07. **Risk:** 🔴 HIGH (shared primitives). **`/codex:review` recommended.** Land before Phase 3.

**Pros:** `ConfirmDialog` reuse retires PROB-26 near-1-line; open-stack is additive (depth-0 ≡ today); `data-dialog-initial-focus` already honored (`dialog.tsx:211`). **Cons:** `dialog.tsx`/`modal.tsx` shared by every modal — a stacking/inert regression breaks focus app-wide; `ControlField` touches 6 files/62 sites — mandatory audit table; grid-wrapped fields need id-based wiring (A11Y-02); the original "ancestor inert" language was **wrong** (modals portal as siblings `dialog.tsx:151`) — use the open-stack flat-set below.

### Task 2.1 — Destructive confirm → `ConfirmDialog` (retires PROB-26, lowest-risk first)
**Files:** Create `publication/DestructiveActionConfirm.tsx`; Modify `ProjectPublicationHeader.tsx` (replace the 2nd `<Modal>` `:1194-1229`).
**Interface (D2 hybrid):**
```ts
type DestructiveAction = "rotate" | "regenerate" | "revoke" | "clear-password";
export function DestructiveActionConfirm({ action, onConfirm, onCancel, busy }: {
  action: DestructiveAction | null; onConfirm: () => void; onCancel: () => void; busy: boolean;
}): JSX.Element; // wraps ConfirmDialog; maps action→{title,description,children,confirmLabel,tone} via readDestructivePublicationActionCopy
```
- [ ] **1. Failing tests** (§8): `ConfirmDialog migration: nested confirm's Tab does NOT reach parent buttons`; `Destructive confirm lands initial focus on Cancel`; `Esc closes only topmost confirm`. Run → FAIL.
- [ ] **2. Implement** `DestructiveActionConfirm` over `ConfirmDialog` (which already `autoFocus={!destructive}` on Cancel `:62`); move `readDestructivePublicationActionCopy` (`:234-270`) into the wrapper; keep `runConfirmedDestructiveAction` dispatch (`:561-622`) + `confirmInFlightRef`. **3. Run** → PASS. **4. Commit** `feat(share-modal): migrate destructive confirm to ConfirmDialog (PROB-26 Cancel focus)`.

### Task 2.2 — Open-stack modal stacking/inert (PROB-05, FZ-1 corrected)
**Files:** `modal.tsx`, `dialog.tsx`.
- [ ] **1. Failing tests** (§8): `open-stack: nested confirm renders at higher z-index than parent root`; `open-stack: opening a 2nd modal sets inert on every other open root except topmost`.
- [ ] **2. Implement:** module-level `const openStack: HTMLElement[] = []` in `modal.tsx`; on `AppModal` open push the `[data-archestimator-modal-root]` (`:98`) + set `style.zIndex = 1000 + openStack.length`; on close pop + re-derive topmost z (`:99`). In `dialog.tsx` on child open: `document.querySelectorAll('[data-archestimator-modal-root]')` → `inert` every one except the last in `openStack` (extends `:117` page-shell inert). Remove on close. (Single-open ≡ today — depth-0 byte-identical.) **3. Run** → PASS. **4. Commit** `fix(overlays): open-stack z + inert for nested modals (portaled siblings)`.

### Task 2.3 — `ControlField` ARIA contract (PROB-21, A11Y-02, FZ-3 — the riskiest edit)
**Files:** `control-input.tsx`; verify all 6 consumers.
- [ ] **1. Failing tests** (§8): `ControlField wires htmlFor/id/aria-describedby/aria-invalid/role=alert on a GRID-WRAPPED field`; `error announced via role=alert, helper via describedby`; `ControlField contract — audit of all 6 production consumers`; `Location-visibility radios wrapped in radiogroup` (A11Y-01, in `ProjectPublicationHeader`/`AccessTab` later). Run → FAIL.
- [ ] **2. Implement** inside `ControlField`: `const controlId = useId()`, `helperId`, `errorId`; `<FieldTag htmlFor={controlId}>` (label) or `<div role="group" aria-labelledby>` (div); preserve caller-provided `id` when given (`:846`/`:948`/`:1014`); wire `aria-describedby={error?errorId:helperId}` + `aria-invalid={!!error}` onto the input **via its id** (descend into the grid-div wrapper — NOT single-child `cloneElement`); error span `role="alert"`. Add `role="radiogroup" aria-labelledby` around the location radios (`:970-999`). Remove redundant `aria-label` on link (`:848`) + password (`:950`) inputs (duplicate names). **3. Audit:** render each of the 6 consumers (`ProjectPublicationHeader`, `ProjectChartsClient`, `AddComponentModal`, `EditComponentDrawer`, `AccountSettingsFormFields`, `activity-history`) + assert per-field `htmlFor↔id` + `aria-describedby`. **4. axe** clean on a ControlField-with-error. **5. Run** → PASS. **6. Commit** `fix(a11y): ControlField htmlFor/id/describedby/aria-invalid contract + radiogroup`.

**Verify gate:** keyboard walkthrough (Tab stays in confirm, focus starts on Cancel, Esc closes only confirm) + 6-consumer audit green + axe clean. **Rollback:** open-stack additive (revert ≡ today); `ControlField` revert = verify associations across the 6 consumers.

---

## PHASE 3 — Extract the god component (RC-09, behavior-preserving pure move)

**Resolves:** PROB-12, PROB-16 (wrapper), PROB-17, PROB-31, PROB-32. **Risk:** 🟠 medium (large diff, zero intended behavior change). **`/codex:review` recommended.** Unblocks Phase 5.

**Pros:** unblocks Phase 5; makes drafts + reconcile unit-testable; one extraction per commit → clean revert; AC-MOD comments stay attached. **Cons:** largest diff; "no behavioral diff" needs the draft-state regression matrix (§8, mandatory); must preserve per-draft `{value,summaryKey}` semantics exactly; don't drop `confirmInFlightRef`/`pendingCount`.

> **Order (one commit each, green before next):** 3.1 `optimistic.ts` → 3.2 `SheetPickerList` move → 3.3 `use-publication-drafts` → 3.4 `DestructiveActionConfirm` (already 2.1 if Phase 2 done) → 3.5 `EstimatesTab`/`AccessTab` → 3.6 `SharedLinkModalTabs`.

### Task 3.1 — Move optimistic helpers
**Files:** Create `lib/publication/optimistic.ts`; Modify `ProjectPublicationHeader.tsx` (import instead of define).
- [ ] **1. Failing test** `tests/vitest/project-publication-optimistic.test.ts`: re-run the existing predicate tests (today at `project-publication-header.test.tsx:938-1001`) — signature stability/flip, honors-while-`summaryKey`+signature match, drops on live move, null→false. Run → FAIL (new path).
- [ ] **2. Move** `readPublicationServerSignature`/`shouldUseOptimisticPublicationResult` (`:168`/`:184`) verbatim into `optimistic.ts`; update the import. **3. Run** → PASS (byte-identical behavior). **4. Commit** `refactor(publication): move optimistic signature-gating to lib/publication/optimistic.ts`.

### Task 3.2 — Move `SheetPickerList`
**Files:** Create `publication/SheetPickerList.tsx`; Modify `ProjectPublicationHeader.tsx` (re-export shim for external importers + import).
- [ ] **1. Failing test** `tests/vitest/sheet-picker-list.test.tsx`: re-run `project-publication-header.test.tsx:1017-1090` (checkboxes, aria-label, toggle, select-all, clear, empty, disabled, keyboard). → FAIL (new path).
- [ ] **2. Move** `:1238-1329`; add `export { SheetPickerList, type SheetPickerListProps } from "./publication/SheetPickerList"` re-export. **3. Run** → PASS. **4. Commit** `refactor(publication): extract SheetPickerList to its own file`.

### Task 3.3 — Extract `usePublicationDrafts` (move, D1)
**Files:** Create `lib/publication/use-publication-drafts.ts`; Modify `ProjectPublicationHeader.tsx`.
**Interface:** see `07` §2 / §3 of this doc (the `PublicationDraftsApi` — `drafts`, `dirty`, `hasDraft`, `pendingCount`, `setPassword/setExpiry/setLocation/setSelectedEstimates`, `resetAllOnSuccess`).
- [ ] **1. Failing test** `tests/vitest/use-publication-drafts.test.tsx`: dirty flags match today's inputs; `summaryKey` resets on success; `pendingCount === count(dirty)`; **+ the draft-state regression matrix** (§8: each field × {initial, dirty, success-reset, summary-key-mismatch fallback}). → FAIL.
- [ ] **2. Group** the 4 per-draft `{value,summaryKey}` useState (`:303-345`) + dirty derivation (`:429-433`) + `managerPendingChangeCount` (`:433`) + success-reset (`:534-546`) into the hook. **Preserve per-draft `summaryKey` gating exactly.** **3. Run** → PASS. **4. Full suite** `bun run test:dom` green, zero assertion changes. **5. Commit** `refactor(publication): extract usePublicationDrafts (behavior-preserving)`.

### Task 3.4–3.6 — Extract `EstimatesTab`/`AccessTab`/`SharedLinkModalTabs`
**Files:** the three new components; `ProjectPublicationHeader.tsx` imports them.
- [ ] **1. Failing test:** the **whole existing** `project-publication-header.test.tsx` suite stays green with zero changes (the Phase-3 gate). + `SharedLinkModalTabs wraps TabStrip, preserves ARIA tablist` (assert tab/panel ids `project-publication-tab-{id}`/`-panel-{id}`, `aria-controls`/`labelledby`, roving tabIndex, Arrow/Home/End). → FAIL for the new tabs test.
- [ ] **2. Move** `:887-910` (Estimates), `:912-1037` (Access) into components; `SharedLinkModalTabs` wraps **`TabStrip`** (`ui/tab-strip.tsx`, re-exported by `workshop-tree.tsx:270` — D/C-A-03) with the modal active affordance (2px ink underline). **3. Run** full suite → PASS. **4. Screenshot diff** = no visible change. **5. Commit** per component.

**Verify gate:** full existing suite green (zero assertion changes) + screenshot diff = no change + draft-state matrix green. **Rollback:** revert the failing extraction commit.

---

## PHASE 4 — Client sync + busy coordination (RC-07/08) — DESCOPE per D3

**Resolves (minimal):** PROB-10 (mitigated), PROB-09 (if countdown shipped). **Risk:** 🟠 med-high (data flow). Depends on Phase 3.

**Pros:** minimal variant closes the highest-probability rotate+recipient-add race cheaply; optional countdown retires stale-"published"; per-section status retires PROB-22. **Cons:** full variant is gold-plating; `runExclusive` is perceived-integrity only (server `expected_encrypted_token` on `addSharedLinkRecipients` is the true fix — **flagged server follow-up, NOT this pack**); clock-skew drift; busy-deadary deadlock risk.

### Task 4.1 (minimal, D3) — Disable recipient Add/Send during in-flight rotate; optional expiry countdown
**Files:** `ProjectPublicationHeader.tsx`, `RecipientEmailComposer.tsx` (reuse `isPending`/`confirmInFlightRef`); optionally `use-publication-sync.ts` (expiry countdown only).
- [ ] **1. Failing tests** (§8): `Latency-sim: delayed revalidation → effectiveStatus flips to 'expired' client-side without refetch` (if countdown shipped); `Rotate in-flight disables recipient Add/Send` (race guard).
- [ ] **2. Implement minimal:** pass an `isPublicationBusy` prop to `RecipientEmailComposer` (true while `isPending`/`confirmInFlightRef`), disabling Add/Send. Optional: `usePublicationSync` 60s+focus timer re-deriving `effectiveStatus` from `expiresAt`. **Do NOT** build the full `invalidate+await` convergence rewrite or `usePublicationBusy.runExclusive` (defer per D3). **3. Run** → PASS. **4. Commit** `feat(share-modal): minimal rotate/recipient race guard + optional expiry countdown`.

> **Defer to a separate "publication client-sync" pack:** full `usePublicationSync` convergence + `usePublicationBusy` + the server-side `expected_encrypted_token` on `addSharedLinkRecipients`.

**Verify gate:** race-guard test + (if shipped) latency-sim expiry test. **Rollback:** revert to the split in-flight mechanisms.

---

## PHASE 5 — UX redesign (the user-facing change, composed from extracted components)

**Resolves:** PROB-01 (P0), PROB-04, PROB-06 (router), PROB-13 (owner A/B, default A), PROB-14, PROB-15, PROB-18, PROB-19, PROB-20, PROB-27, PROB-30. **Risk:** 🟠 medium (visible, but low-coupling post-Phase-3). **`/codex:review` recommended.**

**Pros:** retires both P0s (decoupled from A/B per D7); low-coupling (composes extracted components); success router (D6, zero RPC) retires PROB-06/19; right-sizes the empty-state cavern. **Cons:** visible change → full flow matrix + axe + responsive + screenshot diffs; A/B undecided (ship on A, B = later swap); tab collapse 5→3 is a learning-cost change; must surface "Remove password" as its own intent (PROB-18) — don't overload the primary CTA.

### Task 5.1 — Adopt `Modal` footer/location slots; right-size shell
**Files:** `ProjectPublicationHeader.tsx`.
- [ ] Move the action bar (`:1056`) into `<Modal footer={…}>`; move `actionFeedback` (`:1173`) into `<Modal location={…}>`; drop `min-h-[600px]`/`max-w-5xl` (`:684`); remove the 5-col `<dl>` (`:749`) + grey-sidebar duplication (Option A: flat white; `:686` `bg-surfaceMuted` removed — D4 default).
- [ ] **Test:** `action bar renders in Modal footer slot; feedback in location slot; empty-state not cavernous`. Commit.

### Task 5.2 — `GeneratePanel` (the P0, PROB-01)
**Files:** Create `publication/GeneratePanel.tsx`; `ProjectPublicationHeader.tsx` renders it when no live link.
- [ ] **1. Failing test:** `First-publish: picker defaulted (AC-MOD-18) + dominant Generate visible on landing; no tab switch needed`. → FAIL.
- [ ] **2. Implement** `GeneratePanel` (headline + receiver copy doc 06 + inline `SheetPickerList` `max-h-[240px]` + dominant Generate in footer). **3. Run** → PASS. **4. Commit** `feat(share-modal): GeneratePanel first-publish (PROB-01 P0)`.

### Task 5.3 — `LinkPanel` + 3-tab IA
**Files:** Create `publication/LinkPanel.tsx`; `ProjectPublicationHeader.tsx` (3 tabs: Content = `EstimatesTab` + `AccessTab`-as-disclosure / Recipients / Activity; link promoted into `LinkPanel` header).
- [ ] **1. Failing test:** `Published: LinkPanel header band always visible; 3 tabs only; link URL at 15px dominant`. → FAIL.
- [ ] **2. Implement** `LinkPanel` (URL `ControlInput` 15px + Copy/Open + status/password pills 11px); wire the 3 tabs; remove the Link tab. **3. Run** → PASS. **4. Commit** `feat(share-modal): LinkPanel + 3-tab IA (PROB-03/14/15)`.

### Task 5.4 — `PublicationSuccessRouter` (PROB-06/19, D6 client-side label)
**Files:** Create `publication/PublicationSuccessRouter.tsx`; `ProjectPublicationHeader.tsx` (thread action label into `runPublicationAction` success branch `:519-547`).
- [ ] **1. Failing test:** `Rotate success → navigates to Link tab + selects link + announces 'copy and re-send'`; `Revoke success → renders 'Link is off' banner`; `Reactivate success → 'same URL + password, expiry cleared'` (reactivate distinguished via expired-path caller). → FAIL.
- [ ] **2. Implement** the router (D6: thread caller-known action label; route on `{action, result.clientLinkPath}`); copy from doc 06 §5. **3. Run** → PASS. **4. Commit** `feat(share-modal): guided success next-steps (PROB-06/19)`.

### Task 5.5 — Receiver-consequence copy + "Remove password" intent (PROB-07/08/18/27/30)
**Files:** `EstimatesTab`, `AccessTab`, `LinkPanel`, `RecipientEmailComposer` (copy from doc 06 copy table); `AccessTab` surfaces "Remove password" as its own confirm (not the primary CTA).
- [ ] Apply the doc 06 copy table (C-LOC-*, C-PW-*, C-EST-*, C-STALE, C-EXP-*, C-LINK-*, C-RECIPIENTS-*); `formatExpiry` (D5 dup) for relative expiry. Commit.

**Verify gate:** full flow matrix (§8 journey 1-10) by keyboard + mouse, reduced-motion on/off; axe clean; responsive 360/640/1024/1440; screenshot diffs vs Phase-0 baseline; **Philip's A/B acknowledged (P0s shipped on A regardless)**. **Rollback:** revert to Phase-3 orchestrator (today's IA). **P0 PROB-01 closed.**

---

## PHASE 6 — Polish + preserve-list audit (P3 sweep)

**Resolves:** PROB-28, PROB-29 (if not done in 0), PROB-30 (display), PROB-32 (eyebrow sweep). **Risk:** low.

- [ ] Eyebrow sweep: replace remaining `text-[9px] uppercase` eyebrows with `<SectionLabel>` across the modal. Test: `no text-[9px] uppercase eyebrows remain`.
- [ ] **Preserve-list audit:** re-verify every item in §5 against the final tree (optimistic reconcile auto-expires, dual live regions present, `confirmInFlightRef` semantics, destructive copy unchanged, TabStrip ARIA, server guards, AC-MOD-18). Test: a dedicated `preserve-list.test.tsx`.
- [ ] Commit `polish(share-modal): SectionLabel sweep + preserve-list audit`.

---

## 7. Master verification matrix (condensed — full names in source workflow)

| Phase | Test (file) | Asserts |
|-------|-------------|---------|
| 0 | `section-label.test.tsx`, `control-input.test.tsx` (label/placeholder), `ui-dialog.test.tsx`, `ui-modal.test.tsx`, `recipient-email-composer.test.tsx`, `shared-link-activity-feed.test.tsx`, `project-publication-header-axe.test.tsx`, `shared-primitive-modal-contrast.test.tsx` | AA contrast (modal + sibling modals); no load-bearing tertiary |
| 1 | `project-publication-header.test.tsx`, `…-reduced-motion.test.tsx` | pending-on-clicked; reduced-motion instant/static; aria-live still announces |
| 2 | `project-publication-header-nested-confirm.test.tsx`, `ui-modal-open-stack.test.tsx`, `control-input.test.tsx` (grid-wrapped + audit), `control-field-consumer-audit.test.tsx` | Tab-trap; Cancel focus; Esc topmost-only; open-stack z+inert; ControlField contract across 6 consumers; radiogroup |
| 3 | `project-publication-optimistic.test.ts`, `sheet-picker-list.test.tsx`, `use-publication-drafts.test.tsx` (+matrix), `destructive-action-confirm.test.tsx`, `shared-link-modal-tabs.test.tsx`, full `project-publication-header.test.tsx` | behavior-preserving moves; draft matrix; ARIA tablist survives |
| 4 | `use-publication-sync.test.ts`, race-guard test | latency-sim expiry; rotate disables recipient Add/Send |
| 5 | flow-matrix tests (first-publish, draft→update, rotate continuation, revoke banner, expired, reactivate) | P0 PROB-01; guided success; 3-tab IA |
| 6 | `preserve-list.test.tsx`, eyebrow-sweep test | no regressions; no slop eyebrows |

**Manual (real-surface, not self-report):** the 10 journeys from `09-VERIFICATION-AND-QA-PLAN.md` §2 by keyboard + mouse, reduced-motion on/off; axe DevTools pass; NVDA + VoiceOver (esp. `datetime-local`); screenshot diffs at 360/640/1024/1440.

## 8. Sequencing & dependencies

```
0 (contrast+SectionLabel) ──► 1 (motion) ──► 2 (primitive a11y: ConfirmDialog ◄ open-stack ◄ ControlField)
                                                       │
                                                       ▼
                          3 (extract: optimistic ► SheetPickerList ► drafts ► tabs) ──► 4 (minimal sync, D3) ──► 5 (redesign: footer/slots ► GeneratePanel ► LinkPanel+3tabs ► SuccessRouter ► copy) ──► 6 (polish+preserve audit)
```
- Phase 2 **before** 3 (extracted components inherit fixed primitives).
- Phase 3 **before** 5 (5 composes 3's components).
- Phase 4 is **parallelizable** with 5's early tasks (independent), but keep minimal (D3).
- P0s (PROB-02 in Phase 0, PROB-01 in Phase 5.2) are decoupled from the A/B call (D7).

## 9. Definition of done

All phase gates green · 10 manual journeys pass (keyboard+mouse, reduced-motion on/off) · axe clean · NVDA+VoiceOver pass (incl. datetime-local) · responsive 360/640/1024/1440 · preserve-list audit green · Philip has acknowledged the A/B (P0s shipped on Option A regardless) · both P0s demonstrably fixed in a running build · **no `actions.ts`/RPC/migration change**.

## 10. Self-review (writing-plans checklist)

- **Spec coverage:** every PROB-* (01–32) maps to a phase task above; both P0s (01, 02) ship in Phase 0 + 5.2. ✅
- **Placeholder scan:** no "TODO"/"add error handling"/"similar to". Every task names exact files + tests + commands. ✅
- **Type consistency:** `PublicationDraftsApi` (§3/Task 3.3), `DestructiveAction` union (Task 2.1), `LinkPanelProps`/`GeneratePanel` (§3) match across tasks. `SectionLabelProps` consistent (Task 0.1). ✅
- **Honest residuals:** PROB-10 mitigated-not-closed (server follow-up); Phase 4 minimal per D3; A/B deferred; datetime-local SR variance flagged.
