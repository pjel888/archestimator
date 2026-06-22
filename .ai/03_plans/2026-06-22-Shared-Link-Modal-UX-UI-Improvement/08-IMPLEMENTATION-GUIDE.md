# 08 — IMPLEMENTATION GUIDE · Shared-Link Modal

**Planning-only** — this sequences the redesign into **lowest-risk-first phases** with gates, verification hooks, rollback, and explicit guardrails. Each phase is independently shippable. Order is chosen so (a) zero-behavior mechanical fixes land first, (b) primitive fixes land before the components that consume them, (c) the structural extraction unblocks the user-facing redesign. Top-fix references map to `02-PROBLEM-REGISTER.md` §D.

> **Codex review gate:** per CLAUDE.md, this is **not** high-blast-radius (no DB/RLS/auth/security) — BUT Phases 3–4 touch shared primitives (`dialog.tsx`/`modal.tsx`) used by every modal, and Phase 5 changes the publication data flow. Recommend a `/codex:review` pass after Phase 3 and after Phase 5 even though the gate isn't mandatory.

---

## Phase 0 — Contrast + token bumps + `SectionLabel` (mechanical, zero behavior change)

**Resolves:** PROB-02, PROB-03 (token side), PROB-29, PROB-32 (SectionLabel).
**Risk:** very low (className/token swaps + one new presentational primitive). **Highest value-to-effort.**
**Files:** `control-input.tsx` (`:77/:85` → `text-secondary`, 9→10px; `:20` base 10→12px), `dialog.tsx` (`:289` DialogDescription → secondary; `:279` title 11→13px), `modal.tsx` (`:140` location → secondary), `RecipientEmailComposer.tsx` (`:336-337/:363` → secondary, 8→10px), `SharedLinkActivityFeed.tsx` (`:150/:175`), new `section-label.tsx`.
**Do:** swap `text-tertiary→text-secondary` for load-bearing text only; introduce `SectionLabel` and adopt it in ONE place first (prove the primitive), then sweep the 16 eyebrows in a follow-up commit.
**Don't:** change any control that uses `text-tertiary` for *non-load-bearing* decoration without checking AA context; don't bump sizes globally without a visual sweep.
**Verify:** axe-core / browser contrast pass on the modal + every other modal (the DialogDescription swap affects all). `bun run test:dom` + manual screenshot diff.
**Rollback:** revert the commit — no data/state change.

## Phase 1 — Motion (pending affordance + success feedback) — additive

**Resolves:** PROB-25, PROB-06 (motion side).
**Risk:** low (additive CSS + `isPending`/`copiedAt`/`lastSuccessAt` state; no data-flow change).
**Files:** `ProjectPublicationHeader.tsx` (pending-on-clicked primary, copy ring, rotate/regenerate ring — doc 05 B), a small scoped CSS block for `@media (prefers-reduced-motion: reduce)`.
**Do:** default-first (resting state renders first); reduced-motion is CSS-layer; preserve `confirmInFlightRef` + the dual live regions.
**Don't:** gate content visibility on a transition; use bounce/elastic; add an animation library (CSS utilities + data-attribute state hooks only).
**Verify:** `prefers-reduced-motion` toggle (DevTools) shows instant/static equivalents; keyboard copy still announces via `aria-live`.
**Rollback:** remove the CSS block + the new state — motion is purely additive.

## Phase 2 — Primitive a11y: nested-modal stacking/inert/initialFocus + `ControlField` contract

**Resolves:** PROB-05, PROB-26, PROB-21.
**Risk:** **medium** — touches `dialog.tsx`/`modal.tsx` used by *every* modal. Do this BEFORE Phase 5 so the extracted components inherit it.
**Files (corrected post-QA FZ-1/FZ-2/FZ-3):**
- **PROB-26 (lowest-risk first):** migrate the header's hand-rolled destructive `<Modal>` (`:1194-1229`) to the **existing `ConfirmDialog`** primitive (`ui/overlays/confirm-dialog.tsx`, already `autoFocus={!destructive}` on Cancel) — near-1-line behavior gain, **no** primitive edit.
- **PROB-05 (open-stack, not ancestor):** `modal.tsx` — module-level `openStack` array; push `[data-archestimator-modal-root]` on open + `zIndex:1000+stack.length`; pop on close (`:99`/`:98`). `dialog.tsx` — on child open, `inert` **every other open `[data-archestimator-modal-root]` except the topmost** (`:117` extends the page-shell inert; flat-set, not ancestor-walk); z from the open-stack (`:256`). (InitialFocus passthrough already exists at `:37/82`; `data-dialog-initial-focus` honored at `:211`.)
- **PROB-21 (`ControlField` ARIA contract — the riskiest edit, QA FZ-3):** `control-input.tsx` — `useId`→`htmlFor`/`id`, `aria-describedby` (helper/error), `aria-invalid`, `role="alert"` on error; **wire via the input's explicit id** for the grid-wrapped link/password/expiry fields (not single-child cloneElement — see doc 05 A6 A11Y-02). + placeholders `:44`/`:94` tertiary→secondary (doc 05 A6 A11Y-07).
**Do:** ship the `ConfirmDialog` migration as a standalone first commit (it alone fixes PROB-26); add a regression test that a nested confirm's Tab does NOT reach the parent's buttons.
**Don't:** change the focus-restore-to-opener (`dialog.tsx:84`) or the existing `inert` on page shells — extend, don't replace.
**Verify (strengthened per FZ-3):** keyboard-only walkthrough of rotate/revoke confirm (Tab stays in confirm; focus starts on Cancel; Esc closes only the confirm); **an audit table of all 8 `ControlField` production consumers** (`ProjectPublicationHeader`, `ProjectChartsClient`, `component-library-manager/AddComponentModal`, `library/EditComponentDrawer`, `AccountSettingsFormFields`, `estimate-sheet/activity-history`, + 1) with a **per-field axe + SR name/association check** (not one representative field). **`/codex:review` recommended here (shared primitive).**
**Rollback:** the open-stack is additive (single-open ≡ today); the `ConfirmDialog` migration is a 1:1 swap; the `ControlField` contract revert is the one to verify carefully across the 8 consumers.

## Phase 3 — Extract the god component (RC-09) — structural backbone

**Resolves:** PROB-12, PROB-16, PROB-17, PROB-31, PROB-32.
**Risk:** medium-high (large diff) but **behavior-preserving** — pure refactor, no UX change yet. Unblocks Phase 5.
**Order:** (1) move `readPublicationServerSignature`/`shouldUseOptimisticPublicationResult` → `lib/publication/optimistic.ts` (PROB-31); (2) move `SheetPickerList` → its own file (PROB-32); (3) extract `usePublicationDrafts` reducer from the 4 smeared `useState`s (PROB-12) — **keep the exact dirty/reset/summaryKey semantics**; (4) extract `DestructiveActionConfirm` (PROB-16); (5) extract `EstimatesTab`/`AccessTab` (+ keep `LinkTab`/Recipients/Activity leaves) (PROB-17); (6) introduce `SharedLinkModalTabs` (PROB-28) preserving the ARIA tablist.
**Files:** new files in `lib/publication/` + `publication/` per doc 07; `ProjectPublicationHeader.tsx` slimmed to orchestrator.
**Do:** one extraction per commit, each verified green before the next; keep `AC-MOD-*` comments attached to the logic they document (they encode the invariants).
**Don't:** change any copy, any layout, any data flow in this phase — it's a pure move. Don't drop the `confirmInFlightRef` or the `managerPendingChangeCount` semantics.
**Verify:** full existing test suite (`bun test`, `bun run test:dom`) must stay green with **no behavioral diff**; visual screenshot diff = no change. **`/codex:review` recommended here (large structural diff).**
**Rollback:** each extraction is a separate commit — revert the failing one.

## Phase 4 — Client sync + unified busy coordination (RC-07/08) — *DESCOPE CANDIDATE*

> **QA SCOPE-1 (honest scope call):** this phase is the **gold-plating** candidate. The full `usePublicationSync` (invalidate+await + 60s expiry countdown + recipient reload) + `usePublicationBusy` (`runExclusive`) is a **client data-convergence workstream**, arguably beyond "share modal UX/UI." **Recommended split:** ship the **minimal** fixes inside this pack and defer the convergence rewrite to a separate "publication client-sync" pack:
> - **PROB-10 (race) minimal fix:** disable recipient Add/Send while a rotate/republish is in-flight (reuse existing `isPending`/`confirmInFlightRef`) — or add `expected_encrypted_token` to `addSharedLinkRecipients` as a flagged server follow-up. No new hook needed.
> - **PROB-09 (stale status) minimal fix:** the client-side expiry countdown alone (re-derive `effectiveStatus` from `expiresAt`) if product wants it.
> - **Honest framing:** a client-side `runExclusive` mutex is a **perceived-integrity** fix, not a data-integrity guarantee (a determined double-click can still slip). Don't label it "data-integrity" — the server remains authoritative.

**Resolves:** PROB-09, PROB-11, PROB-23, PROB-24, PROB-10, PROB-22.
**Risk:** medium-high (changes data flow / convergence). Depends on Phase 3 (`usePublicationDrafts`, `optimistic.ts`).
**Files:** new `use-publication-sync.ts` (invalidate+await on success, client-side expiry countdown, recipient reload on rotate-generation), new `use-publication-busy.ts` (`runExclusive` absorbing `confirmInFlightRef` + recipient in-flight); `ProjectPublicationHeader.tsx` + `RecipientEmailComposer.tsx` route through them; per-section status regions replace the single shared `actionFeedback` sink (PROB-22).
**Do:** keep the optimistic signature-gating (now in `optimistic.ts`) — sync is **additive** (it converges faster, the reconcile still auto-expires on revalidation); add a test for the rotate+recipient-add race (assert the add is rejected/queued while a rotate is in flight).
**Don't:** introduce polling that spams the server (60s expiry timer + focus refetch only); don't remove the optimistic localResult (it's the perceived-speed win).
**Verify:** a Vitest/RTL test simulating latency (delayed revalidation) shows `effectiveStatus` flipping to expired client-side; the rotate+recipient-add race test passes. **`/codex:review` recommended (data-integrity).**
**Rollback:** revert to static-prop reads + the three split in-flight mechanisms — behavior returns to today's (stale-under-latency) state, no data loss.

## Phase 5 — UX redesign (the user-facing change) — built on extracted components

**Resolves:** PROB-01, PROB-04, PROB-06 (router side), PROB-13 (owner A/B), PROB-14, PROB-15, PROB-18, PROB-19, PROB-20, PROB-27, PROB-30 (display).
**Risk:** medium (visible change) but now low-coupling because Phase 3 extracted the pieces.
**Sub-steps:** (a) adopt `Modal` `footer` (action bar) + `location` (status) slots; drop `min-h-[600px]`/`max-w-5xl` (PROB-15); (b) collapse to 3 tabs (Content = `EstimatesTab` + `AccessTab`-as-disclosure / Recipients / Activity) + header band; remove the 5-col `<dl>` + grey-sidebar duplication (PROB-14); (c) **`GeneratePanel`** for first-publish (PROB-01 — the P0); (d) **`PublicationSuccessRouter`** guided next-steps (PROB-06/19) — **includes threading a client-side action label** into `runPublicationAction`'s success branch (doc 06 §5, QA C-03; no RPC change); (e) receiver-consequence copy (doc 06 — can interleave from Phase 0); (f) owner decision: Option A (flat white) vs B (hairline column) for the sidebar (PROB-13) — **flag for Philip**.

> **QA feasibility residual — decouple the P0s from the A/B call:** the two P0s (PROB-01 first-publish, PROB-02 contrast) must **not** be held hostage to Philip's P1 sidebar A/B. **Ship both P0s on either sidebar variant** (Option A is the default; Option B is a one-token swap later). If Philip defers the A/B, the P0s still land — the A/B rides a follow-up.
**Files:** `LinkPanel.tsx`, `GeneratePanel.tsx`, `PublicationSuccessRouter.tsx`, `ProjectPublicationHeader.tsx` (orchestrator wiring), copy edits across the new tab components.
**Do:** ship the first-publish `GeneratePanel` + the contrast fixes early (they're the two P0s); get Philip's A/B call before finalizing the sidebar.
**Don't:** reintroduce nested surfaces, side-stripes, or the 8px type; don't overload the primary CTA with the clear-password destructive branch (PROB-18) — surface "Remove password" as its own intent.
**Verify:** full flow walkthrough (first-publish, draft→update, rotate guided-continuation, revoke banner, expired); axe-core; responsive at 360/640/1024/1440; screenshot diffs vs Phase 0 baseline. **`/codex:review` recommended.**
**Rollback:** revert to the Phase-3 orchestrator (today's IA) — the extracted components still work under the old layout.

## Phase 6 — Polish + preserve-list audit (P3 sweep)

**Resolves:** remaining P3 (PROB-28 if not done in Phase 3, PROB-29 if not done in Phase 0, PROB-30 relative expiry, PROB-32 eyebrow sweep).
**Risk:** low. Final tighten + a documented pass that no preserve-list item regressed.
**Verify:** the preserve-list checklist (`02-PROBLEM-REGISTER.md` §F) re-checked against the final tree.

---

## Cross-phase guardrails (what NOT to do, always)

- **No new RPCs / no `actions.ts` signature changes** (FIXED contract). If a phase seems to need one, stop and flag.
- **No `proposalPaper #FFFDF8`** on this modal (client-docs only).
- **No `text-tertiary #7F7F7F`** for load-bearing text. No radii other than 3/8/12. No gradient text, side-stripes, ghost cards, glass-as-decoration.
- **Don't touch** the optimistic reconcile logic, the dual live regions, the focus-restore/Tab-trap, `confirmInFlightRef` semantics, the destructive-confirm copy, the server-side guards, AC-MOD-18.
- **Don't ship a phase on a worker self-report or one green check** — match each phase's Verify gate with real-surface evidence (doc 09).

## Resolves (whole guide)
Every PROB-* in the register; all 11 root causes. The two P0s (PROB-01 first-publish, PROB-02 contrast) ship in Phase 0 + Phase 5(a)/(c).
