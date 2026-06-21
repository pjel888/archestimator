# 85 — UX Acceptance Bar + State / Viewport / Visual-QA Plan

Date: 2026-06-21 · Status: **NEW — verification surface for the receiver (25) and manager-modal (35) redesign blueprints.** This is the doc the rest of the pack defers to whenever it says "optional", "later lane", "browser automation not run", or "visual proof missing".

Canonical IDs, severities, and statuses are owned by [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md). If anything here disagrees with 75, **75 wins**. Source-verified facts: [`_COORDINATION.md` §4](_COORDINATION.md). Ratified owner decisions: [`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md).

Cross-links: receiver redesign [`25_RECEIVER_UX_REDESIGN_BLUEPRINT.md`](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) · manager-modal redesign [`35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) · receiver audit [`20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md`](20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md) · manager audit [`30_MANAGER_WORKFLOW_AUDIT.md`](30_MANAGER_WORKFLOW_AUDIT.md) · test matrix [`40_TEST_QA_ULTRAQA_MATRIX.md`](40_TEST_QA_ULTRAQA_MATRIX.md) · forward plan [`91_FORWARD_EXECUTION_PLAN.md`](91_FORWARD_EXECUTION_PLAN.md).

Findings this doc owns the acceptance bar for (all per 75 §2/§3): **RUX-11** (Storybook state matrix, P2, Fixed by source/story coverage), **RUX-14** (source fixed; browser visual-proof open), **MANAGER-F-04** (per-recipient send chips, P2, Fixed), **MANAGER-F-06** (dashboard quick-actions, P3, Fixed by source/test coverage), and the visual/mobile/print verification half of **QA-G10** (P2, Open per 75 §4). It also defines pass/fail closure language for the already-**Fixed** receiver states (RUX-01..10/13/14-source/15) so the redesign in 25 cannot regress them.

> As-of note on source anchors (re-verified 2026-06-21 against the working tree): `SharePageHero.tsx` is 47 lines, `SharePageDecision.tsx` 364, `ShareEstimateTreePanel.tsx` 450, `SharePageTabs.tsx` 677, `SharePageComments.tsx` 418, `SharedLinkActivityFeed.tsx` 178, `not-found.tsx` 22 and imports `SHARED_LINK_UNAVAILABLE_COPY`, `loading.tsx` 62. Manager surfaces: `ProjectPublicationHeader.tsx` ~1172 lines, `actions.ts` ~1538 lines (per `_COORDINATION.md` §4.12) — re-anchor before citing inside those two.

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
| Anti-pattern risk | 3/4 | **4/4** | V2 [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) removes workshop tree/grid/client activity from the client surface and replaces it with proposal-document scope groups. |
| **Total** | **12/20** | **>=18/20** | V2 client ship must reach at least 18/20; no target dimension may fall below 3/4, and anti-pattern risk is expected to hit 4/4 after 25 Phase C. |

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
| S-15 | V2 scope groups — expanded | V2 `ShareScopeGroups` populated | Given a multi-sheet proposal, Then client-language groups render expanded with descriptions, qty/unit, line amount, group subtotal, and grand total | New 25 implementation test | `Receiver/ScopeGroups/Expanded` | PASS req for V2 |
| S-16 | V2 scope groups — fallback / empty | no authored summary or no line grouping | Given missing authored proposal fields, Then the page shows honest fallbacks without invented inclusions/exclusions/terms | New 25 content-contract test | `Receiver/ScopeGroups/Fallback` | PASS req for V2 |
| S-17 | V2 trust blocks | firm/terms/validity/payment/warranty fields | Given available proposal metadata, Then firm identity and trust blocks are findable before the footer; missing optional fields are omitted cleanly | New 25 content-contract test | `Receiver/TrustBlocks` | PASS req for V2 |
| S-18 | Branded 404 | revoked/expired/invalid token | Given an unavailable link, Then `share/[token]/not-found.tsx` branded state shows the shared unavailable-link copy, no sensitive project/client detail | `share-no-store-invariants.test.ts` (RUX-03/MANAGER-F-03); source `src/lib/publication/share-copy.ts:1-11`, `not-found.tsx:4-21` | `Receiver/NotFound` | PASS req |
| S-19 | Loading boundary | route segment pending | Given the segment loads, Then `share/[token]/loading.tsx` skeleton shows (no layout shift) | source `loading.tsx:9-47` (RUX-11/PERF-11) | `Receiver/Loading` | PASS req |
| S-20 | Print package | `beforeprint` | Given print intent, Then the full all-estimates package mounts on `beforeprint` and is removed on `afterprint` | `project-publication-page.test.tsx` (RUX-04 beforeprint/afterprint) | `Receiver/Print` | PASS req |
| S-21 | Sticky Respond bar | mobile scroll after proposal content | Given a long proposal at 320/390px, Then the Respond affordance is reachable, safe-area aware, keyboard operable, print-hidden, and does not cover focused fields or final content | New 25 sticky-a11y test + browser matrix | `Receiver/Decision/StickyRespond` | PASS req for V2 |

### 2.1 Legacy regression states until 25 Phase C removes them

These rows protect the current implementation before the V2 scope-group replacement lands. They are **not**
V2 client-ship requirements after the relevant old UI is deleted; they become removal/regression checks.

| Legacy state | Current source | Gate before Phase C | V2 disposition |
|---|---|---|---|
| Grid no-results | `SharePageTabs.tsx:463-529` | no broken empty state while Grid exists | Deleted from client view by 25 Phase C. |
| Grid 250-cap copy | `SharePageTabs.tsx:645` (`GRID_PREVIEW_ROW_LIMIT` = 250) | copy renders while Grid exists | Deleted from client view by 25 Phase C; no truncation language in V2. |
| Tree no-match | `ShareEstimateTreePanel.tsx:321-431` | no broken tree search while Tree exists | Deleted from client view by 25 Phase C. |
| Legacy budget-chart collision | `CostDonutChart` compact variant via `SharePageTabs.tsx` | inspect if chart remains visible | Drop or relabel as "Where your budget goes"; if retained, contrast/collision proof still required. |

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

Reuse 40's seed widths and adversarial content (40 §3 P2 row at `40 §3` and §4 mobile rows): **320, 390, 768, 1440** with a multi-sheet compact v1.3 snapshot plus a legacy v1.2 tab snapshot, a long project name, long row text, and long discipline names. Each cell is PASS only if **all four checks** hold: (a) no unintended horizontal overflow, (b) modal focus trap reachable and Escape-closable, (c) safe-area bottom respected on decision/comments bars, (d) legacy charts either removed or proven not to clip/collide.

| State subset | 320 | 390 | 768 | 1440 | Notes / anchor |
|---|:--:|:--:|:--:|:--:|---|
| V2 document masthead + scope groups (S-15..S-17) | ☐ | ☐ | ☐ | ☐ | 25 Phase B/C implementation; no workshop tabs/tree/grid client-visible |
| Decision bar + modal (S-07..S-10) | ☐ | ☐ | ☐ | ☐ | safe-area class `SharePageDecision.tsx:261` (`pb-[env(safe-area-inset-bottom)]`); modal trap `:306-360` |
| Sticky Respond bar (S-21) | ☐ | ☐ | ☐ | ☐ | 25 sticky-a11y mechanics; must not occlude content/input focus |
| Comments composer (S-11..S-14) | ☐ | ☐ | ☐ | ☐ | safe-area `SharePageComments.tsx:367`; aria-live `:302-410` |
| Legacy tree/grid until Phase C | ☐ | ☐ | ☐ | ☐ | regression-only while old UI exists; not a V2 ship requirement after deletion |
| Budget chart if retained | ☐ | ☐ | ☐ | ☐ | collision risk noted 40 §3 P3; N/A if chart removed from client view |
| Session banner controls (S-05/S-06) | ☐ | ☐ | ☐ | ☐ | ≥44px hit areas `min-h-11`/`min-w-11` (RUX-06) |
| Branded 404 (S-18) | ☐ | ☐ | ☐ | ☐ | `not-found.tsx` `max-w-xl` copy column |

**Verification (browser, when the gate is overridden per §7):**
```bash
# Headed/headless capture at each width against a seeded local share link.
# Harness pattern: dev-auth-bypass + cookie auth (see memory [[glass-estimate-sheet-redesign]] / [[workshop-dashboard-no-scroll-fix]]).
# Per width, assert document.scrollingElement.scrollWidth <= clientWidth (no page-level X overflow).
```
**UNVERIFIED until run:** no automated viewport-overflow assertion exists today (40 §3 P2 + §4 mobile rows are class-level only). To verify each cell, capture at the width and run the scrollWidth check above; record PASS/FAIL in the cell. Until captured, every cell is **UNVERIFIED**, not PASS.

**Evidence index (required after 25/35 implementation):**
- `evidence/shared-link-v2/viewport-320.png`
- `evidence/shared-link-v2/viewport-390.png`
- `evidence/shared-link-v2/viewport-768.png`
- `evidence/shared-link-v2/viewport-1440.png`
- `evidence/shared-link-v2/contrast-hero-light.json`
- `evidence/shared-link-v2/storybook-state-check.md`
- `evidence/shared-link-v2/manager-share-sheet.png`

**Owner-lane:** QA/browser lane (browser automation), gated by §7. **Binary gate:** all 32 cells PASS = viewport matrix PASS.

---

## 4. Cover-image contrast acceptance (RUX-14)

Per 75 §2: **RUX-14, P3, Fixed source / visual-proof open.** Source now removes the image-dependent label/scrim overlay from `SharePageHero`; the remaining gate here is browser/visual evidence that the hero and surrounding layout still render acceptably across the required states.

**Acceptance criterion (Given/When/Then):** Given the worst-case cover image (light and/or busy at the label's bottom-left band), When the label renders over the static `from-black/35` scrim, Then the "Project cover" text must meet **WCAG AA 4.5:1** against the actual sampled background pixels behind the glyphs (it is small text). If it cannot, a fallback must (a) increase scrim strength (e.g. `from-black/55`–`/65` or add a localized solid plate behind the label), **or** (b) move the label outside the image (caption plate below), per the 20 §3 RUX-14 recommendation.

**Required bitmap test fixtures (named, so the test is reproducible):**

| Class | Image | Why representative |
|---|---|---|
| Worst case (light + busy) | `public/storybook-audits/share-hero/cover-light-blueprint-1600x900.jpg` | bottom band is near-white → lowest contrast vs `text-white/90` |
| Busy mid-tone | `public/storybook-audits/share-hero/cover-mid-facade-1600x900.jpg` | label sits over alternating light/dark → fails locally even if mean passes |
| Easy case (control) | `public/storybook-audits/share-hero/cover-dark-dusk-1600x900.jpg` | should pass comfortably; proves the test discriminates |

> No share-specific cover fixtures exist in `public/` today (verified: `public/Cards/materials/` is empty; `public/landing`, `public/component-thumbnails` are unrelated). **Action:** add the 3 bitmap fixtures above with either real project-safe imagery or generated raster assets (no SVG/CSS placeholders), then pin them in the `Receiver/Hero/*` stories (§5). Owner-lane: Design.

**Verification command:**
```bash
bun run storybook:validate
STORYBOOK_DISABLE_TELEMETRY=1 bun run storybook -- --host 127.0.0.1 --port 6006 &
STORYBOOK_PID=$!
until curl -fsS http://127.0.0.1:6006 >/dev/null; do sleep 1; done
bun scripts/measure-share-hero-contrast.mjs \
  --storybook-url http://127.0.0.1:6006 \
  --story receiver-hero--worst-case-light \
  --selector '[data-share-hero-cover-label]' \
  --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-v2/contrast-hero-light.json
kill "$STORYBOOK_PID"
```
**Binary gate:** worst-case image ≥ 4.5:1 (after fallback if needed) = PASS; < 4.5:1 with no fallback = FAIL. **UNVERIFIED until** the contrast sample is run on `cover-light-blueprint-1600x900.jpg`. **Owner-lane:** Design (decide scrim-vs-plate); QA captures the sample.

---

## 5. Storybook story checklist — closes RUX-11

Per 75 §2: **RUX-11, P2, Fixed** — the real-component Storybook matrix now lives in `src/stories/domain/share/receiver-states.stories.tsx` under `Domain/Share/ReceiverStates`, with Storybook-local cookie/fetch seams and no public route/provider imports.

**Closure definition (Given/When/Then):** Given a designer opens Storybook, When they select the share stories, Then every §2 state row (S-01..S-20) is inspectable as a story that imports the **real** `src/components/share/*` component with its hook/fetch seams mocked — not the token route, not the fixture-only panel.

**Required stories (one per §2 row) and their mocked seams:**

| Story id | Component under story | Mocked seam(s) |
|---|---|---|
| `Receiver/Password/{Valid,Invalid,Locked429}` | `ProjectPublicationPasswordForm` | mock POST `/password` → 200 / 401 / 429 |
| `Receiver/Anonymous` | `SharePageComments` + `SharePageDecision` | `useSharedLinkSession()` → `{ ok: false }` (hook export `src/hooks/use-shared-link-session.ts:20`) |
| `Receiver/Banner/{Recipient,Anon}` | `SharePageSessionBanner` | session prop / `useSharedLinkSession()` → ok vs not-ok |
| `Receiver/Decision/{Accept,Decline,Revision,Locked}` | `SharePageDecision` | `useSharedLinkSession()` ok; mock decision GET (undecided vs locked); mock decision POST |
| `Receiver/Comments/{Loading,Error,Empty,OfflineQueued}` | `SharePageComments` | mock `fetch` GET (pending/5xx/empty); `navigator.onLine=false` + sessionStorage queue |
| `Receiver/ScopeGroups/{Expanded,Fallback}` | V2 `ShareScopeGroups` | fixture snapshot: multi-sheet proposal; missing-authored-fields fallback |
| `Receiver/TrustBlocks` | V2 trust-block component/section | firm/terms/validity present; optional fields missing |
| `Receiver/Decision/StickyRespond` | V2 sticky Respond affordance + decision sheet | mobile viewport + long proposal + focused comment field |
| `Receiver/Legacy/{GridNoResults,GridCapped,TreeNoMatch}` | `SharePageTabs` / `ShareEstimateTreePanel` | regression-only until 25 Phase C deletes the old client UI |
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
**Binary gate:** all rows above exist as stories importing the real component with mocked seams = RUX-11 PASS. 75 §2 is already Fixed; any future missing/route-importing story reopens the gate. **Owner-lane:** Test/story lane.

**2026-06-21 source evidence:** `scripts/check-storybook-component-coverage.mjs` requires `Domain/Share/ReceiverStates` exports for PasswordValid/Invalid/Locked429, Anonymous, BannerRecipient/Anon, DecisionAccept/Decline/Revision/Locked, CommentsLoading/Error/Empty/OfflineQueued, ScopeGroupsExpanded/Fallback, TrustBlocks, NotFound, LoadingBoundary, PrintPackage, and StickyRespond. `storybook-provider-boundary.test.ts` remains green, so the story matrix imports real components while avoiding route/provider execution. This closes RUX-11; visual/browser inspection of those stories remains QA-G10/RUX-14.

---

## 6. Manager-side acceptance checks

These bind to 75 §3 and are the verification surface for [`35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md). Re-anchor inside `ProjectPublicationHeader.tsx` (~1172 lines) / `actions.ts` (~1538 lines) before citing — both drift per `_COORDINATION.md` §4.12. Manager modal tabs are canonically **Link / Estimates / Access / Recipients / Activity** (`_COORDINATION.md` §4.11 — "Estimates", not "Sheets").

| Check | Finding (75 §3) | Expected (Given/When/Then) | Target file(s) | Test path | Gate |
|---|---|---|---|---|---|
| M-01 per-recipient send chips | **MANAGER-F-04** (P2, Fixed) | Given a batched send where some recipients fail, When the action returns, Then each recipient shows a per-recipient status chip (sent/failed) with a per-row retry CTA; successfully-sent recipients are preserved | `src/components/workshop/publication/RecipientEmailComposer.tsx` | `tests/vitest/recipient-email-composer.test.tsx` partial-failure retry test | PASS |
| M-02 dashboard quick-actions | **MANAGER-F-06** (P3, Fixed) | Given a published link in the dashboard/list, When the manager opens the row's quick actions, Then copy/preview/rotate/revoke are reachable by keyboard with tooltip semantics, while viewer rows expose only copy/preview and failed server-action results render as errors | `src/components/workshop/dashboard/PublishedProjectQuickActions.tsx`; `src/components/workshop/dashboard/WorkshopDashboard.tsx`; existing publication server actions | `tests/vitest/workshop-reset.test.tsx` (a11y/keyboard/action contract) | PASS — 3-file / 107-test regression + type-check green |

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
3. **RUX-11 stories (§5)** are now the designer's inspection surface; keep them current alongside any 25 implementation changes.
4. **Visual matrices (§3 viewport, §4 contrast, S-14/S-20 runtime states)** run **once**, after 25/35 land, behind the override in §7.3.
5. **Manager checks (§6)** run with the 35 implementation.
6. **Lead flips statuses in [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md)** only after the binary gates here pass. RUX-11 is already Fixed; future flips are for RUX-14 visual proof and QA-G10 visual/header evidence.

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

When those conditions hold, the browser matrices are **required before client-ship sign-off**. If the active
agent surface requires an explicit browser choice/approval, record that approval or record the run as blocked;
do not mark the cells PASS from static inspection alone. Outside those conditions, browser automation stays
optional and the §3/§4 cells remain **UNVERIFIED** (not FAIL) — which is honest, not green-washed. The override
never applies to unrelated UI.

**Owner-lane for the override decision:** QA/browser lane proposes; Design lead + owner (Philip) approve the bounded run.

---

## 8. Pass/fail roll-up (feeds 99)

| Gate | Pass condition | Status today |
|---|---|---|
| §1 score ≥ 18/20 | at least 18/20, no target dimension below 3/4 | **Open** — depends on §3/§4/§5 |
| §2 state regression | all anchored DOM suites green | **Verify on each 25 commit** (command in §2) |
| §3 viewport matrix | 32 cells PASS | **UNVERIFIED** — needs gated browser run (§7.3) |
| §4 RUX-14 contrast | worst-case ≥ 4.5:1 or fallback | **Source fixed / UNVERIFIED visual proof** (75 §2 RUX-14) — needs sampled browser evidence |
| §5 RUX-11 stories | all §2 rows have real-component mocked stories | **PASS (source/story coverage)** — browser visual inspection still QA-G10 |
| §6 M-01 send chips | partial-failure preserves sent + chips/retry | **PASS** (75 §3 MANAGER-F-04 Fixed) |
| §6 M-02 dashboard actions | keyboard-reachable copy/preview/rotate/revoke | **PASS** (75 §3 MANAGER-F-06 Fixed) |

No gate here is marked PASS on assertion alone — each carries a runnable command and a binary condition. Residual UNVERIFIED items must be listed verbatim in [`99_QUALITY_SCORECARD_AND_SIGNOFF.md`](99_QUALITY_SCORECARD_AND_SIGNOFF.md) as conditions on the launch verdict.
