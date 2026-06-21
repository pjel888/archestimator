# 85 — UX Acceptance Bar + State / Viewport / Visual-QA Plan

Date: 2026-06-21 · Status: **NEW — verification surface for the receiver (25) and manager-modal (35) redesign blueprints.** This is the doc the rest of the pack defers to whenever it says "optional", "later lane", "browser automation not run", or "visual proof missing".

Canonical IDs, severities, and statuses are owned by [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md). If anything here disagrees with 75, **75 wins**. Source-verified facts: [`_COORDINATION.md` §4](_COORDINATION.md). Open owner decisions: [`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md).

Cross-links: receiver redesign [`25_RECEIVER_UX_REDESIGN_BLUEPRINT.md`](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) · manager-modal redesign [`35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) · receiver audit [`20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md`](20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md) · manager audit [`30_MANAGER_WORKFLOW_AUDIT.md`](30_MANAGER_WORKFLOW_AUDIT.md) · test matrix [`40_TEST_QA_ULTRAQA_MATRIX.md`](40_TEST_QA_ULTRAQA_MATRIX.md) · forward plan [`91_FORWARD_EXECUTION_PLAN.md`](91_FORWARD_EXECUTION_PLAN.md).

Findings this doc owns the acceptance bar for (all per 75 §2/§3): **RUX-11** (Storybook state matrix, P2, Open), **RUX-14** (cover-image contrast, P3, Open), **MANAGER-F-04** (per-recipient send chips, P2, Open), **MANAGER-F-06** (dashboard quick-actions, P3, Open), and the visual/mobile/print verification half of **QA-G10** (P2, Open per 75 §4). It also defines pass/fail closure language for the already-**Fixed** receiver states (RUX-01..10/15) so the redesign in 25 cannot regress them.

> As-of note on source anchors (re-verified 2026-06-21 against the working tree): `SharePageHero.tsx` is 47 lines, `SharePageDecision.tsx` 364, `ShareEstimateTreePanel.tsx` 450, `SharePageTabs.tsx` 677, `SharePageComments.tsx` 418, `SharedLinkActivityFeed.tsx` 178, `not-found.tsx` 22, `loading.tsx` 62. Manager surfaces: `ProjectPublicationHeader.tsx` ~1172 lines, `actions.ts` ~1538 lines (per `_COORDINATION.md` §4.12) — re-anchor before citing inside those two.

---

## 1. UX acceptance bar (the ship gate)

[`20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md`](20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md) §4 scores the receiver **12/20** but sets **no target**. This section sets one.

### 1.1 Target health score

| Dimension (mirrors 20 §4) | Current | **Ship target (beta→client)** | What closes the gap |
|---|:--:|:--:|---|
| Accessibility | 3/4 | **4/4** | RUX-11 Storybook state matrix landed (§5); viewport focus-trap + safe-area gates green (§3). |
| Performance-perceived UX | 3/4 | **3/4** (hold) | Recipient-link server-redirect (PERF-01A) is gated on **D2** and is a V2 optimization, not a ship blocker. |
| Responsive behavior | 3/4 | **4/4** | §3 viewport matrix passes at 320/390/768/1440 with zero unintended horizontal overflow. |
| Theming | 3/4 | **4/4** | RUX-13 `#FFFDF8` literal cleanup (8 occ / 4 files, owned by 91, not this doc) + RUX-14 cover contrast accepted (§4). |
| Anti-pattern risk | 3/4 | **3/4** (hold) | Dense admin-feel in tree/grid is accepted for beta; re-evaluate after 25 lands. |
| **Total** | **12/20** | **18/20** | Two dimensions held at 3/4 by explicit decision; the other three must reach 4/4 to ship to clients. |

**Binary ship gate (pass/fail):** receiver may ship to real clients **only when** Total ≥ 18/20 **and** every row in the §2 state matrix and §3 viewport matrix is PASS **and** RUX-14 (§4) is accepted-or-fixed **and** the RUX-11 story checklist (§5) is complete. Any single FAIL = no-ship. This is the UX half of the launch verdict in [`99_QUALITY_SCORECARD_AND_SIGNOFF.md`](99_QUALITY_SCORECARD_AND_SIGNOFF.md); it does not override the security/test-rigor gates there.

**Owner-lane:** Design lead owns the score sign-off; Test/QA lane owns the matrices; owner (Philip) ratifies the two held dimensions.

### 1.2 Required-pass states before client ship

No receiver state may ship in a broken, unbranded, or untested condition. The authoritative enumeration is §2 (states) × §3 (viewports). A state is "required-pass" if its row carries a P0–P2 finding in 75 or is a client-visible error/empty/locked state.

---

## 2. Receiver state matrix

Every state below must be verifiable in Storybook (§5) **and** asserted by a DOM test where a finding requires it. "Test anchor" cites the existing test that already proves the Fixed behavior — the redesign in 25 must keep these green (regression gate). "Story" = the RUX-11 story id from §5.

| # | State | Trigger / source | Expected (Given/When/Then) | Test anchor (regression gate) | Story | Gate |
|---|---|---|---|---|---|---|
| S-01 | Password gate — valid | signed access cookie present | Given a passworded link, When the cookie verifies, Then snapshot loads and no password form shows | `project-publication-page.test.tsx:339-357` | `Receiver/Password/Valid` | PASS req |
| S-02 | Password gate — invalid (401) | wrong password POST | Given a wrong password, When submitted, Then form shows ARIA-associated invalid feedback and snapshot stays hidden | `project-publication-page.test.tsx:359-389` (RUX-09) | `Receiver/Password/Invalid` | PASS req |
| S-03 | Password gate — locked (429) | lockout threshold hit | Given repeated failures, When 429 returns, Then input+button disable and lockout copy shows | `ProjectPublicationPasswordForm.tsx:63-74`; page lockout `project-publication-page.test.tsx:359-389` | `Receiver/Password/Locked429` | PASS req |
| S-04 | Anonymous read-only | no recipient session cookie | Given no session, When page loads, Then snapshot is visible, comments show "Recipient session required", decision shows non-actionable note | `SharePageComments.tsx:293-300`; `SharePageDecision.tsx:128-148`; `share-page-decision-anonymous.test.tsx:16-35` | `Receiver/Anonymous` | PASS req |
| S-05 | Recipient session banner — valid | valid `shared_link_session_[token]` | Given a valid recipient session, When page loads, Then banner reads "You are reviewing as {email}" with Reviewer pill + "Not you?" action at ≥44px | `SharePageSessionBanner.tsx:26-48`; touch contract `project-publication-page.test.tsx` (RUX-06) | `Receiver/Banner/Recipient` | PASS req |
| S-06 | Session banner — anonymous prompt | no session, dismissible | Given no session, Then banner prompts to sign in as recipient and is dismissible | `SharePageSessionBanner.tsx:51-69` | `Receiver/Banner/Anon` | PASS req |
| S-07 | Decision — Accept modal | undecided + valid session | Given undecided, When Accept clicked, Then a focus-trapped dialog opens with finality copy, optional note, Escape-close, focus restore | `SharePageDecision.tsx:306-360`; `project-publication-decision.test.tsx:367-389` | `Receiver/Decision/Accept` | PASS req |
| S-08 | Decision — Decline modal | as S-07 | as S-07 for Decline | `SharePageDecision.tsx:306-360` | `Receiver/Decision/Decline` | PASS req |
| S-09 | Decision — Request Revision modal | as S-07 | as S-07 for Request Revision | `SharePageDecision.tsx:306-360` | `Receiver/Decision/Revision` | PASS req |
| S-10 | Decision — locked badge | prior/duplicate decision | Given a recorded decision, Then a read-only badge shows and comments remain available | `SharePageDecision.tsx:237-253`; reload lock `project-publication-decision.test.tsx:321-340` | `Receiver/Decision/Locked` | PASS req |
| S-11 | Comments — loading | GET in flight | Given comments load, Then a skeleton with `aria-live` polite shows | `SharePageComments.tsx:302-410` | `Receiver/Comments/Loading` | PASS req |
| S-12 | Comments — error + retry | GET 5xx | Given a load error, Then an error state with retry CTA shows; retry re-fetches | `SharePageComments.tsx:328-408` | `Receiver/Comments/Error` | PASS req |
| S-13 | Comments — empty | zero comments | Given no comments, Then a non-empty empty-state and the composer both render | `SharePageComments.tsx:302-410` | `Receiver/Comments/Empty` | PASS req |
| S-14 | Comments — offline queued | `navigator.onLine=false` post | Given offline, When a comment is submitted, Then it queues to `shared-link-pending-comments-<token>`, pending count shows, online flushes once | `SharePageComments.tsx:57-83,261-279` (test gap QA-G07/40 §3) | `Receiver/Comments/OfflineQueued` | PASS req |
| S-15 | Grid no-results | filter matches 0 rows | Given a filter with no matches, Then a no-results state shows | `SharePageTabs.tsx:463-529` | `Receiver/Grid/NoResults` | PASS req |
| S-16 | Grid 250-cap copy | filtered rows > 250 | Given >250 matching rows, Then copy reads "Showing first 250 of {n} matching rows. Refine the filter to narrow the list." | `SharePageTabs.tsx:645` (`GRID_PREVIEW_ROW_LIMIT` = 250, `:29`; slice `:382`) | `Receiver/Grid/Capped` | PASS req |
| S-17 | Tree no-match | tree search no hit | Given a tree search with no match, Then a no-match state shows (distinct from no-items) | `ShareEstimateTreePanel.tsx:321-431` | `Receiver/Tree/NoMatch` | PASS req |
| S-18 | Branded 404 | revoked/expired/invalid token | Given an unavailable link, Then `share/[token]/not-found.tsx` branded state shows, no sensitive project/client detail | `share-no-store-invariants.test.ts` (RUX-03); source `not-found.tsx:5-19` | `Receiver/NotFound` | PASS req |
| S-19 | Loading boundary | route segment pending | Given the segment loads, Then `share/[token]/loading.tsx` skeleton shows (no layout shift) | source `loading.tsx:9-47` (RUX-11/PERF-11) | `Receiver/Loading` | PASS req |
| S-20 | Print package | `beforeprint` | Given print intent, Then the full all-estimates package mounts on `beforeprint` and is removed on `afterprint` | `project-publication-page.test.tsx` (RUX-04 beforeprint/afterprint) | `Receiver/Print` | PASS req |

**Verification command (regression gate for all anchored states):**
```bash
bunx vitest run \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-comments.test.tsx \
  tests/vitest/project-publication-decision.test.tsx \
  tests/vitest/share/share-page-decision-anonymous.test.tsx \
  tests/vitest/share-no-store-invariants.test.ts \
  --maxWorkers=1
```
**Binary gate:** all listed suites green = matrix-regression PASS. Any red = FAIL (the 25 redesign broke a Fixed state).

**Owner-lane:** Test/QA lane runs the DOM regression; Design lead eyeballs each Story (§5) for visual correctness.

---

## 3. Viewport matrix

Reuse 40's seed widths and adversarial content (40 §3 P2 row at `40 §3` and §4 mobile rows): **320, 390, 768, 1440** with a multi-sheet v1.2 snapshot, a long project name, long row text, and long discipline names. Each cell is PASS only if **all four checks** hold: (a) no unintended horizontal overflow (intended table/grid horizontal scroll is allowed and must stay inside its own scroll container), (b) modal focus trap reachable and Escape-closable, (c) safe-area bottom respected on decision/comments bars, (d) donut labels do not clip/collide.

| State subset | 320 | 390 | 768 | 1440 | Notes / anchor |
|---|:--:|:--:|:--:|:--:|---|
| Snapshot + tabs (S-04) | ☐ | ☐ | ☐ | ☐ | tab horizontal scroll + fade mask `SharePageTabs.tsx:370-418`; hidden table cols under `sm` `:483-485` |
| Decision bar + modal (S-07..S-10) | ☐ | ☐ | ☐ | ☐ | safe-area class `SharePageDecision.tsx:261` (`pb-[env(safe-area-inset-bottom)]`); modal trap `:306-360` |
| Comments composer (S-11..S-14) | ☐ | ☐ | ☐ | ☐ | safe-area `SharePageComments.tsx:367`; aria-live `:302-410` |
| Tree (mobile collapse) (S-17) | ☐ | ☐ | ☐ | ☐ | mobile-collapsed default `ShareEstimateTreeView.tsx:234-260` |
| Donut label collision | ☐ | ☐ | ☐ | ☐ | `CostDonutChart` compact variant `SharePageTabs.tsx:464-471`; collision risk noted 40 §3 P3 |
| Session banner controls (S-05/S-06) | ☐ | ☐ | ☐ | ☐ | ≥44px hit areas `min-h-11`/`min-w-11` (RUX-06) |
| Branded 404 (S-18) | ☐ | ☐ | ☐ | ☐ | `not-found.tsx` `max-w-xl` copy column |

**Verification (browser, when the gate is overridden per §7):**
```bash
# Headed/headless capture at each width against a seeded local share link.
# Harness pattern: dev-auth-bypass + cookie auth (see memory [[glass-estimate-sheet-redesign]] / [[workshop-dashboard-no-scroll-fix]]).
# Per width, assert document.scrollingElement.scrollWidth <= clientWidth (no page-level X overflow).
```
**UNVERIFIED until run:** no automated viewport-overflow assertion exists today (40 §3 P2 + §4 mobile rows are class-level only). To verify each cell, capture at the width and run the scrollWidth check above; record PASS/FAIL in the cell. Until captured, every cell is **UNVERIFIED**, not PASS.

**Owner-lane:** QA/browser lane (browser automation), gated by §7. **Binary gate:** all 28 cells PASS = viewport matrix PASS.

---

## 4. Cover-image contrast acceptance (RUX-14)

Per 75 §2: **RUX-14, P3, Open.** Source re-verified — `SharePageHero.tsx:42-43` overlays a static `bg-gradient-to-t from-black/35 to-transparent` scrim under `text-white/90` "Project cover" label, drawn over an **arbitrary project cover image**. The scrim strength is fixed; legibility is image-dependent.

**Acceptance criterion (Given/When/Then):** Given the worst-case cover image (light and/or busy at the label's bottom-left band), When the label renders over the static `from-black/35` scrim, Then the "Project cover" text must meet **WCAG AA 4.5:1** against the actual sampled background pixels behind the glyphs (it is small text). If it cannot, a fallback must (a) increase scrim strength (e.g. `from-black/55`–`/65` or add a localized solid plate behind the label), **or** (b) move the label outside the image (caption plate below), per the 20 §3 RUX-14 recommendation.

**Representative test images (named, so the test is reproducible):**

| Class | Image | Why representative |
|---|---|---|
| Worst case (light + busy) | white/blueprint elevation render, snow/sky exterior, or a light marble/render swatch | bottom band is near-white → lowest contrast vs `text-white/90` |
| Busy mid-tone | a photographed building façade with windows (high local variance) | label sits over alternating light/dark → fails locally even if mean passes |
| Easy case (control) | dark dusk exterior / dark interior render | should pass comfortably; proves the test discriminates |

> No share-specific cover fixtures exist in `public/` today (verified: `public/Cards/materials/` is empty; `public/landing`, `public/component-thumbnails` are unrelated). **Action:** add 3 named fixtures under `public/storybook-audits/share-hero/` (or the RUX-11 story's mock dir) — a light-busy, a mid-busy, and a dark control — and pin them in the `Receiver/Hero/*` stories (§5). Owner-lane: Design.

**Verification command:**
```bash
# 1) Render Receiver/Hero/WorstCaseLight at 1440 + 390, screenshot the hero band.
# 2) Sample the label's glyph background pixels and compute contrast ratio.
# Quick check (no browser): confirm the scrim/label literals are still the audited ones.
rg -n "from-black/35|text-white/90" "src/components/share/SharePageHero.tsx"
```
**Binary gate:** worst-case image ≥ 4.5:1 (after fallback if needed) = PASS; < 4.5:1 with no fallback = FAIL. **UNVERIFIED until** the contrast sample is run on the named worst-case image. **Owner-lane:** Design (decide scrim-vs-plate); QA captures the sample.

---

## 5. Storybook story checklist — closes RUX-11

Per 75 §2: **RUX-11, P2, Open** — "No story imports real routes/session/comments/password. Spec'd in 85." Current coverage is fixture-only and explicitly avoids the real components (`share-review.stories.tsx:21-32`, `share/share-review-panel.stories.tsx:32-43`, per 20 §3 RUX-11).

**Closure definition (Given/When/Then):** Given a designer opens Storybook, When they select the share stories, Then every §2 state row (S-01..S-20) is inspectable as a story that imports the **real** `src/components/share/*` component with its hook/fetch seams mocked — not the token route, not the fixture-only panel.

**Required stories (one per §2 row) and their mocked seams:**

| Story id | Component under story | Mocked seam(s) |
|---|---|---|
| `Receiver/Password/{Valid,Invalid,Locked429}` | `ProjectPublicationPasswordForm` | mock POST `/password` → 200 / 401 / 429 |
| `Receiver/Anonymous` | `SharePageComments` + `SharePageDecision` | `useSharedLinkSession()` → `{ ok: false }` (hook export `src/hooks/use-shared-link-session.ts:20`) |
| `Receiver/Banner/{Recipient,Anon}` | `SharePageSessionBanner` | session prop / `useSharedLinkSession()` → ok vs not-ok |
| `Receiver/Decision/{Accept,Decline,Revision,Locked}` | `SharePageDecision` | `useSharedLinkSession()` ok; mock decision GET (undecided vs locked); mock decision POST |
| `Receiver/Comments/{Loading,Error,Empty,OfflineQueued}` | `SharePageComments` | mock `fetch` GET (pending/5xx/empty); `navigator.onLine=false` + sessionStorage queue |
| `Receiver/Grid/{NoResults,Capped}` | `SharePageTabs` | fixture snapshot: 0-match filter; >250-row sheet |
| `Receiver/Tree/NoMatch` | `ShareEstimateTreePanel` | fixture tree + no-match search term |
| `Receiver/Hero/{WorstCaseLight,MidBusy,DarkControl}` | `SharePageHero` | the 3 named §4 fixtures |
| `Receiver/NotFound` | `not-found.tsx` body | none (static) |
| `Receiver/Loading` | `loading.tsx` body | none (static) |
| `Receiver/Print` | `SharePageTabs` print package | fire `beforeprint`/`afterprint` |

**Mock seam rule (binary):** stories MUST mock `useSharedLinkSession` and `fetch`/route responses — they MUST NOT import `src/app/share/[token]/page.tsx` or hit a token route (that is the exact RUX-11 anti-pattern). A story that imports the real route = FAIL.

**Verification command:**
```bash
bun run storybook  # then open the Receiver/* tree; OR, if a story-smoke test exists:
bunx vitest run tests/vitest/share --maxWorkers=1
bun run type-check
```
**Binary gate:** all rows above exist as stories importing the real component with mocked seams = RUX-11 PASS → flip 75 §2 RUX-11 to Fixed (lead updates 75). Any missing/route-importing story = FAIL. **Owner-lane:** Test/story lane.

---

## 6. Manager-side acceptance checks

These bind to 75 §3 and are the verification surface for [`35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md). Re-anchor inside `ProjectPublicationHeader.tsx` (~1172 lines) / `actions.ts` (~1538 lines) before citing — both drift per `_COORDINATION.md` §4.12. Manager modal tabs are canonically **Link / Estimates / Access / Recipients / Activity** (`_COORDINATION.md` §4.11 — "Estimates", not "Sheets").

| Check | Finding (75 §3) | Expected (Given/When/Then) | Target file(s) | Test path | Gate |
|---|---|---|---|---|---|
| M-01 per-recipient send chips | **MANAGER-F-04** (P2, Open) | Given a batched send where some recipients fail, When the action returns, Then each recipient shows a per-recipient status chip (sent/failed) with a per-row retry CTA; successfully-sent recipients are preserved | `src/components/workshop/publication/RecipientEmailComposer.tsx` (current global messaging at `:163-207`, `:240-242`) | `tests/vitest/project-publication-header.test.tsx` + new composer partial-failure test | PASS req for client ship |
| M-02 dashboard quick-actions | **MANAGER-F-06** (P3, Open) | Given a published link in the dashboard/list, When the manager opens the row's quick menu, Then copy/rotate/revoke are reachable by keyboard with tooltip semantics, without opening project detail | `src/components/workshop/dashboard/WorkshopDashboard.tsx` (read/list-only today, 30 §3 F-06); `ProjectPublicationHeader.tsx` action handlers | `tests/vitest/project-publication-header.test.tsx` (a11y/keyboard) | P3 — nice-to-have, not a ship blocker |

**Verification command:**
```bash
bunx vitest run \
  tests/vitest/project-publication-header.test.tsx \
  tests/vitest/project-publication-actions.test.ts \
  --maxWorkers=1
bun run type-check
```
**Binary gate:** M-01 test asserts partial-failure preserves sent recipients + renders failed chips with retry = PASS. M-02 is P3 and may defer to V2 (record in 91). **Owner-lane:** Frontend lane (M-01, M-02); Test lane writes the contracts.

---

## 7. Lane ownership, sequencing, and the browser-automation override

### 7.1 Sequencing

1. **Land redesign blueprints first.** 25 (receiver) and 35 (manager) define the target DOM/copy. This doc verifies against them; do not run the visual matrices before 25/35 are implemented or the matrices verify the old surface.
2. **Regression gate (§2 DOM suites)** runs on every redesign commit — cheap, no browser, must stay green so the redesign cannot regress a Fixed state (RUX-01..10/15).
3. **RUX-11 stories (§5)** land alongside the 25 implementation — they are the designer's inspection surface.
4. **Visual matrices (§3 viewport, §4 contrast, S-14/S-20 runtime states)** run **once**, after 25/35 land, behind the override in §7.3.
5. **Manager checks (§6)** run with the 35 implementation.
6. **Lead flips statuses in [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md)** (RUX-11/RUX-14 Open→Fixed; QA-G10 visual half) only after the binary gates here pass — this doc never edits 75.

### 7.2 Lane ownership (summary)

| Section | Lane |
|---|---|
| §1 score sign-off | Design lead (owner ratifies held dims) |
| §2 state-matrix DOM regression | Test/QA lane |
| §3 viewport matrix | QA/browser lane (gated, §7.3) |
| §4 cover contrast + fixtures | Design (decision) + QA (sample) |
| §5 Storybook stories | Test/story lane |
| §6 manager checks | Frontend lane + Test lane |

### 7.3 When the "browser automation is not a default gate" guardrail is overridden

The project default (echoed across 20/40: "no browser automation unless later requested"; Codex guardrail treats browser automation as **not** a default stop-gate) holds for ordinary work. It is **explicitly overridden here, for this client-facing surface only**, because the receiver is shown to external clients and §3/§4 cannot be proven by DOM/static tests alone.

**Override conditions (all must hold to run the browser matrices):**
- The change is to the **client-facing receiver** (`src/app/share/**`, `src/components/share/**`) or the **manager send/dashboard** surface (§6), AND
- 25/35 have landed (so the matrices verify the intended DOM), AND
- the run is **scoped and bounded** (the 4 seed widths + the 3 named contrast images; no open-ended crawling), AND
- it is recorded as evidence under `evidence/` (per `_COORDINATION.md` §2 `evidence/` placeholder).

Outside those conditions, browser automation stays optional and the §3/§4 cells remain **UNVERIFIED** (not FAIL) — which is honest, not green-washed. The override never applies to non-receiver UI.

**Owner-lane for the override decision:** QA/browser lane proposes; Design lead + owner (Philip) approve the bounded run.

---

## 8. Pass/fail roll-up (feeds 99)

| Gate | Pass condition | Status today |
|---|---|---|
| §1 score ≥ 18/20 | 3 dims at 4/4, 2 held at 3/4 | **Open** — depends on §3/§4/§5 |
| §2 state regression | all anchored DOM suites green | **Verify on each 25 commit** (command in §2) |
| §3 viewport matrix | 28 cells PASS | **UNVERIFIED** — needs gated browser run (§7.3) |
| §4 RUX-14 contrast | worst-case ≥ 4.5:1 or fallback | **Open** (75 §2 RUX-14) — UNVERIFIED until sampled |
| §5 RUX-11 stories | all §2 rows have real-component mocked stories | **Open** (75 §2 RUX-11) |
| §6 M-01 send chips | partial-failure preserves sent + chips/retry | **Open** (75 §3 MANAGER-F-04) |
| §6 M-02 dashboard actions | keyboard-reachable copy/rotate/revoke | **Open, P3 — deferrable** (75 §3 MANAGER-F-06) |

No gate here is marked PASS on assertion alone — each carries a runnable command and a binary condition. Residual UNVERIFIED items must be listed verbatim in [`99_QUALITY_SCORECARD_AND_SIGNOFF.md`](99_QUALITY_SCORECARD_AND_SIGNOFF.md) as conditions on the launch verdict.
