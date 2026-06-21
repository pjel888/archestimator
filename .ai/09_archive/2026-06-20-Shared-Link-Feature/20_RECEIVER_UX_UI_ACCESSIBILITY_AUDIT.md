# Receiver UX/UI/Accessibility Audit - Shared Link/Public Publication

Date: 2026-06-20 · Reconciled: 2026-06-21
Auditor: Designer lane
Mode: static/source/story/test/spec inspection only. No browser, Playwright, screenshots, staging, provider, or source edits performed.

> **As-of status (2026-06-21):** This doc was reconciled post-implementation and carries
> "Fixed" stamps from the implementation pass. **The canonical status, severity, and IDs for every
> RUX finding live in [75](75_FINDING_ID_REGISTRY.md) §2 — if this doc disagrees, 75 wins.** As of
> 2026-06-21 the open RUX backlog per 75 is **RUX-14 visual proof** plus any owner-accepted visual proof gates;
> RUX-01..13 and RUX-15 are Fixed.
> Cross-refs: receiver redesign blueprint [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md), UX-acceptance +
> visual-QA gate [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md), open decisions
> [71](71_OPEN_DECISIONS_REGISTER.md), coordination [_COORDINATION.md](_COORDINATION.md).

## 1. Audit Scope And Exact Files Inspected

Required startup context inspected:

- `AGENTS.md`
- `.ai/10_state/current-state.md` FAST PATH block only
- `.agents/skills/impeccable/SKILL.md`
- `.agents/skills/impeccable/reference/audit.md`
- `.agents/skills/impeccable/reference/product.md`

Receiver/publication source inspected:

- `src/app/share/[token]/page.tsx`
- `src/app/share/print.css`
- `src/components/share/ShareContainer.tsx`
- `src/components/share/SharePageProposalHeader.tsx`
- `src/components/share/SharePageSummaryCard.tsx`
- `src/components/share/SharePageHero.tsx`
- `src/components/share/SharePageTabs.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/app/api/share/[token]/session/route.ts`
- `src/components/share/SharePageSessionBanner.tsx`
- `src/components/share/ProjectPublicationPasswordForm.tsx`
- `src/components/share/SharedLinkActivityFeed.tsx`
- `src/hooks/use-shared-link-session.ts`
- `src/components/ui/button.tsx`
- `src/components/workshop/ProjectPublicationHeader.tsx` lines 650-700 only, for activity-feed mounting context

Stories/tests/spec/design docs inspected:

- `src/stories/domain/share-review.stories.tsx`
- `src/stories/domain/share/share-review-panel.stories.tsx`
- `tests/vitest/project-publication-page.test.tsx`
- `tests/vitest/project-publication-comments.test.tsx`
- `tests/vitest/project-publication-decision.test.tsx`
- `tests/vitest/project-publication-activity.test.tsx`
- `tests/vitest/share/share-page-decision-anonymous.test.tsx`
- `tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx`
- `tests/vitest/design-enforcer-share-allowlist.test.ts`
- `.ai/06_specs/walkthrough-shared-link-overhaul.md`
- `.ai/06_specs/proposal-package-system.md`
- `DESIGN.md`

Worktree note: `git status --short` showed many unrelated dirty files in dashboard/settings/estimate areas before this report was written. No source files were edited, staged, committed, or reverted.

## 2. Step-By-Step Receiver Flow Map

1. Open link
   - `src/app/share/[token]/page.tsx` resolves the raw token via `resolveProjectPublicationAccessByToken` and renders a dynamic, public `main` labelled "Proposal review" after access passes: `page.tsx:46`, `page.tsx:73-99`, `page.tsx:131-140`.
   - When a recipient query exists after any password gate, the page redirects to the server session route before rendering the receiver; the clean receiver sequence is then session banner, proposal header, summary card, decision bar, optional hero image, estimate tabs/tree/grid, comments, and non-print footer.

2. Locked/no access
   - Invalid/not found access falls through to Next `notFound()` with no branded receiver state: `page.tsx:139-140`, `page.tsx:210`.
   - Password-protected access checks an HttpOnly access cookie. If invalid, it records deferred analytics and returns the password gate without loading snapshot content: `page.tsx:142-168`.
   - Password gate copy explains password protection and security logging: `page.tsx:117-128`.
   - Password form handles success by reload, 429 lockout by disabling input/button, 401 invalid, and generic error: `ProjectPublicationPasswordForm.tsx:19-45`, `ProjectPublicationPasswordForm.tsx:63-74`.

3. Recipient session
   - `?recipient=` or legacy `?rt=` is parsed by `src/app/share/[token]/page.tsx`; valid recipient-link entry redirects to `/api/share/[token]/session?recipient=...` after the password gate instead of mounting a client initializer.
   - The session route verifies the recipient token, sets the HttpOnly session and non-secret `_ok` cookies, and redirects to the clean share URL. Invalid recipient tokens redirect to `?recipientSession=invalid` with no raw-token echo.
   - Subsequent clean loads validate `shared_link_session_[token]` and resolve recipient identity for banner copy.
   - Client components only see the non-secret `_ok=1` companion flag through `useSharedLinkSession`: `use-shared-link-session.ts:20-31`.
   - Valid recipient banner shows "You are reviewing as {email}", a Reviewer pill, and a "Not you?" clear-session action: `SharePageSessionBanner.tsx:26-48`.
   - Anonymous/no-session banner says to sign in as a recipient and can be dismissed: `SharePageSessionBanner.tsx:51-69`.

4. Summary/sheets/tree
   - Proposal header renders project name, client/project code/location metadata, and an "Awaiting your review" state: `SharePageProposalHeader.tsx:7-30`.
   - Summary card anchors proposal total plus sheet count, line-item count, currency, client, and prepared date: `SharePageSummaryCard.tsx:37-80`.
   - Estimate tabs preserve active estimate in `sessionStorage`, support roving tab keyboard navigation, and render an empty state when no estimates are included: `SharePageTabs.tsx:70-91`, `SharePageTabs.tsx:134-176`, `SharePageTabs.tsx:293-303`.
   - Each estimate has Tree View/Grid Preview tabs with keyboard isolation: `SharePageTabs.tsx:82-115`, `SharePageTabs.tsx:325-351`.
   - Grid Preview provides search, responsive table columns, row thumbnails, and no-results state: `SharePageTabs.tsx:463-529`.
   - Tree View reconstructs a hierarchy, adds a virtual root, and renders a desktop side tree plus detailed tree: `SharePageTabs.tsx:274-282`, `SharePageTabs.tsx:532-549`.
   - Tree panel supports search, expand/collapse all, and no-match/no-item states: `ShareEstimateTreePanel.tsx:321-431`.

5. Comment
   - Without a recipient session, comments render a read-only "Recipient session required" explanation and no composer: `SharePageComments.tsx:293-300`.
   - With a valid session, comments load via GET, show loading skeleton/error/empty/list states, and include a composer, counter, retry/queued status, offline queue, and aria-live announcements: `SharePageComments.tsx:88-120`, `SharePageComments.tsx:302-410`.
   - Plain Enter now inserts a newline; Ctrl/Command+Enter submits the textarea: `SharePageComments.tsx`.

6. Decision
   - Without a recipient session, decision renders a friendly read-only note with no action buttons: `SharePageDecision.tsx:128-148`.
   - With a valid session, decision loads existing response, then shows Accept/Decline/Request Revision buttons when undecided: `SharePageDecision.tsx:82-120`, `SharePageDecision.tsx:256-304`.
   - Each action opens a modal dialog with finality copy, optional note, focus trapping, Escape close, and focus restoration: `SharePageDecision.tsx:150-161`, `SharePageDecision.tsx:210-235`, `SharePageDecision.tsx:306-360`.
   - Successful or duplicate response locks to a read-only decision badge while comments remain available: `SharePageDecision.tsx:187-201`, `SharePageDecision.tsx:237-253`.

7. Activity
   - `SharedLinkActivityFeed` supports owner/public fetch branches, loading/error/empty/feed states, focus/visibility refresh, keyboard-focusable feed articles, details disclosure, pagination, and honest refresh copy: `SharedLinkActivityFeed.tsx:25-95`, `SharedLinkActivityFeed.tsx:97-176`.
   - **CURRENT 2026-06-21 (RUX-10 Fixed by V2 removal — see [75](75_FINDING_ID_REGISTRY.md) §2):** the public `/share/[token]` page no longer imports or mounts `SharedLinkActivityFeed`. Public feedback history is represented through comments/decision context; owner activity remains in the workshop publication manager activity tab. The stale V1 evidence that `/share` fetched `/api/share/[token]/activity` is superseded and must not be used as a V2 requirement.
   - **Scope guard:** RUX-10 = receiver page does not expose an owner-style activity feed. It does **NOT** decide realtime/live updates — the owner feed still refreshes only on focus/visibility. The missing-realtime gap is the **distinct, still-Open** finding **SHF-01** (75 §6, [60](60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md)); do not conflate the two.
   - This intentionally diverges from older walkthrough drift that listed receiver activity: `.ai/06_specs/walkthrough-shared-link-overhaul.md:82-86`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:117-120`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:186-187` (the receiver still uses a single-column layout, not the full Link/Sheets/Access/Recipients/Activity tabbed dashboard — see SHF-02, 75 §6).

8. Print/mobile/error states
   - Print CSS hides receiver-only chrome, removes backgrounds/shadows, and targets `.share-print-estimate` blocks for page breaks: `print.css:1-48`.
   - Post-fix, the full print package is not mounted during normal browsing; it is rendered on `beforeprint`, includes every estimate/tab, and is removed again on `afterprint`.
   - Mobile behavior includes horizontal tab scrolling/fade masks, hidden table columns under `sm`, mobile-collapsed tree defaults, safe-area padding on decision/comments, and simplified tree rows: `SharePageTabs.tsx:370-418`, `SharePageTabs.tsx:483-485`, `ShareEstimateTreeView.tsx:234-260`, `SharePageDecision.tsx:261`, `SharePageComments.tsx:367`.
   - Error states exist for password invalid/locked, comment load/post/retry/offline, decision load/post, activity load, grid no-match, tree no-match, and no estimates. Branded invalid/revoked/expired public link state is not visible in the inspected route because invalid access uses `notFound()`.

## 3. UX/UI/A11y Findings

| ID | Severity | Evidence | Impact | Recommendation | Verification Needed |
|---|---:|---|---|---|---|
| RUX-01 | P1 | Fixed in this implementation pass. Navigable leaf rows in the receiver tree panel are keyboard-focusable and support keyboard activation. **Fix:** `ShareEstimateTreePanel.tsx` (leaf rows focusable + keyboard-activatable). | Keyboard users can now use the side tree to jump to leaf sections. | Preserve distinct expand/collapse and navigation behavior when future tree work lands. | `tests/vitest/share-estimate-tree-panel-a11y.test.tsx` covers leaf keyboard access. |
| RUX-02 | P1 | Fixed in this implementation pass. Personalized recipient-session setup now runs through the server session route and failures show a non-secret alert instead of silently falling through to anonymous mode. **Fix:** `src/app/share/[token]/page.tsx` + `src/app/api/share/[token]/session/route.ts`. | Clients with expired/bad personalized links get clear recovery copy. | Keep raw share/recipient tokens out of all failure copy. | `tests/vitest/project-publication-page.test.tsx` covers successful server redirect/session creation and invalid-recipient alert token non-disclosure. |
| RUX-03 | P1 | Fixed in this implementation pass. `share/[token]/not-found.tsx` provides a branded unavailable-link state behind the existing fail-closed `notFound()` calls. **Fix:** `src/app/share/[token]/not-found.tsx`. | Revoked, expired, malformed, and unavailable links no longer rely on a generic route 404 view. | Preserve no sensitive project/client details in unavailable-link copy. | `tests/vitest/share-no-store-invariants.test.ts` covers the branded 404 file. |
| RUX-04 | P1 | Fixed. `SharePageTabs` now renders the full all-estimates print package only on browser print intent. **Fix:** deferred print package on `beforeprint` (`SharePageTabs.tsx`); see also PERF-14 (75 §5). | Normal browsing avoids the hidden all-row print DOM cost while print output includes the full shared package. | Keep manual print/PDF proof for a later visual QA lane if desired. | `project-publication-page.test.tsx` proves `beforeprint` renders all estimates and `afterprint` removes the package. |
| RUX-05 | P1 | Fixed in this implementation pass. Informative small receiver copy was moved from `text-tertiary` to `text-secondary` across summary/decision/comments/tabs/activity surfaces. **Fix:** `text-tertiary` → `text-secondary` on load-bearing meta (memory `designmd-tertiary-fails-aa`). | Low-vision/mobile readability improved for client-facing metadata and helper copy. | Keep future tertiary usage limited to nonessential/decorative copy. | Static grep and focused component tests passed; browser visual QA remains optional. |
| RUX-06 | P2 | Fixed in this implementation pass. The remaining compact session-banner recovery/dismiss actions now use `min-h-11`/`min-w-11` hit areas and secondary contrast. **Fix:** `SharePageSessionBanner.tsx`. | Recipient recovery and dismiss controls are less error-prone on phones without changing the dense proposal review layout. | Keep future receiver action buttons at 44px-class hit areas when practical. | `tests/vitest/project-publication-page.test.tsx` pins the session-banner touch/contrast contract; browser proof remains optional. |
| RUX-07 | P2 | Fixed in this implementation pass. Mobile grid/tree rows now show `Qty ... · unit` as secondary inline metadata. **Fix:** Grid/tree mobile rows render `Qty … · unit` (`SharePageTabs.tsx`, `ShareEstimateTreeView.tsx`). | Mobile reviewers can verify basic quantity/unit math without switching to desktop. | Keep discipline hidden on compact mobile unless product asks for denser row details. | `project-publication-page.test.tsx` and `share-estimate-tree-panel-a11y.test.tsx` cover quantity/unit visibility. |
| RUX-08 | P2 | Fixed in this implementation pass. Plain Enter now inserts a newline, while Ctrl/Command+Enter submits. **Fix:** `SharePageComments.tsx` (Enter = newline; Ctrl/⌘+Enter submits). | Multi-line review notes are less likely to be sent accidentally. | Keep client-facing compose controls button-first unless a shortcut is visibly explained. | `tests/vitest/project-publication-comments.test.tsx` covers newline and keyboard submit behavior. |
| RUX-09 | P2 | Fixed in this implementation pass. Password feedback now has a stable alert id and the input receives `aria-invalid`/`aria-describedby` when feedback is present. **Fix:** `ProjectPublicationPasswordForm.tsx` (`aria-invalid`/`aria-describedby`). | Screen-reader users get a programmatic relationship between the password field and invalid/locked feedback. | Keep future password-gate feedback tied to the input. | `tests/vitest/project-publication-page.test.tsx` covers invalid/locked ARIA state. |
| RUX-10 | P2 | Fixed in this implementation pass. `/share/[token]` no longer mounts the owner/public activity feed; recipient history remains comments/decision context while owner activity stays in the workshop manager activity tab. **Distinct from SHF-01 (realtime, still Open — 75 §6); RUX-10 does NOT decide live updates.** | The receiver surface avoids importing owner-style activity behavior into the client review page. | Keep receiver feedback history focused unless product explicitly reintroduces a public activity surface. | `project-publication-page.test.tsx` proves the receiver page does not mount `activity-feed` or fetch `/api/share/:token/activity`; `project-publication-activity.test.tsx` still covers the public-safe route. |
| RUX-11 | P2 | Fixed. `src/stories/domain/share/receiver-states.stories.tsx` imports the real receiver components and exposes password, anonymous, recipient banner, decision, comments/offline, scope groups, trust, not-found, loading, print, and sticky-response states. | Designers now have an integrated static receiver-state matrix without requiring token routes. | Keep the matrix aligned with new receiver states; do not replace it with fixture-only token stories. | `node scripts/check-storybook-component-coverage.mjs`, `tests/vitest/storybook-component-coverage.test.ts`, and `tests/vitest/storybook-provider-boundary.test.ts` cover the required stories and provider boundaries. |
| RUX-12 | P3 | Fixed. `tests/vitest/project-publication-page.test.tsx` now asserts the actual `text-[13px]` estimate-tab class and documents the path-scoped `/share` Client Portal type-scale exemption. | Future agents no longer get a stale signal to downsize receiver tab typography toward the old app cap. | Preserve the `/share` px-cap exemption as path-scoped in `design-enforcer-share-allowlist.test.ts`. | `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1`. |
| RUX-13 | P2 | **CORRECTED 2026-06-21 (per [75](75_FINDING_ID_REGISTRY.md) §2): full set is 8 `#FFFDF8` literals across 4 files, not 5/2.** `SharePageDecision.tsx:138`, `:242`, `:261`, `:317`; `ShareEstimateTreePanel.tsx:256` (was stale `:239`); `src/app/share/[token]/not-found.tsx:5`; `src/app/share/[token]/loading.tsx:9`, `:47`. Token exists in `DESIGN.md:369`. **Source-verified 2026-06-21** via `grep -rn "FFFDF8" src/ \| grep -v test`. | Theming is mostly disciplined, but hard-coded proposal paper makes future theme adjustments harder and creates token drift risk. | **Fix:** add a `bg-proposalPaper` utility (Tailwind token / CSS var) and replace all 8 literals; add a "no `#FFFDF8` outside tokens" lint guard. | Design lint/token grep proves zero `#FFFDF8` literals outside tokens/tests. See acceptance criteria below. |
| RUX-14 | P3 | Cover image overlay uses `from-black/35` with `text-white/90` on arbitrary project images: `SharePageHero.tsx:42-43`. **Source-verified 2026-06-21.** | Contrast over light/complex cover images is indirect and image-dependent; label may be illegible. It is not critical content, but it can look unpolished. | **Fix:** strengthen the scrim (or move the "Project cover" label off the image) so the label meets **WCAG AA 4.5:1** over a worst-case light cover. | Visual contrast proof over a representative light cover image lives in [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md). See acceptance criteria below. |
| RUX-15 | P3 | Fixed in this implementation pass. `SharedLinkActivityFeed` now uses existing accent/secondary tokens instead of one-off orange notice classes. **Fix:** `SharedLinkActivityFeed.tsx` (accent/secondary tokens). | Activity notices better match the restrained receiver surface. | Keep orange reserved for warning semantics. | Static source review and activity tests passed. |

### 3a. Acceptance criteria for RUX proof gates and fixed story/test gates

Status/severity for all rows are bound to [75](75_FINDING_ID_REGISTRY.md) §2. Owner-lane and
binary pass/fail gates below; sequencing in [91](91_FORWARD_EXECUTION_PLAN.md).

- **RUX-11** (P2, Fixed) — **Owner lane:** Test/Story lane.
  - Given a designer opens Storybook, When they view the share-receiver stories, Then the real share
    components (password gate, anonymous read-only, recipient session, decision modal, comments +
    offline/queued, mobile table/tree, print) render with mocked hooks/fetches — **not** token routes.
  - Target file(s): `src/stories/domain/share/receiver-states.stories.tsx`; spec lives in
    [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
  - Verify: `node scripts/check-storybook-component-coverage.mjs` plus the focused Storybook vitest
    coverage/provider-boundary tests.
  - **Gate (binary):** PASS only if every state in the 85 matrix has a corresponding story and the
    suite is green; otherwise FAIL.

- **RUX-12** (P3, Fixed) — **Owner lane:** Test/QA lane.
  - Given the receiver tab font is `text-[13px]`, When a reader inspects the test, Then the stale
    `text-[10px]`/`[9px]`/`[11px]` language is gone and the test references the current 13px tabs
    plus the Client Portal type-scale exemption (`design-enforcer-share-allowlist.test.ts:8-18`).
  - Target file(s): `tests/vitest/project-publication-page.test.tsx`.
  - Verify: `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1`.
  - **Gate (binary):** PASS only if no stale `text-[10/9/11px]` comment remains and the suite is green.

- **RUX-13** (P2, Fixed) — **Owner lane:** Design-system lane.
  - Given 8 `#FFFDF8` literals across 4 files (enumerated above), When the fix lands, Then all 8 are
    replaced by a `bg-proposalPaper` utility and a lint/test guard fails on any new `#FFFDF8` outside
    tokens/tests.
  - Target file(s): `SharePageDecision.tsx`, `ShareEstimateTreePanel.tsx`,
    `src/app/share/[token]/not-found.tsx`, `src/app/share/[token]/loading.tsx`; token definition +
    a `design-enforcer`-style guard test.
  - Verify: `grep -rn "FFFDF8" src/ | grep -v test` returns **zero** lines, and
    `bunx vitest run tests/vitest/design-enforcer-share-allowlist.test.ts --maxWorkers=1` is green.
  - **Gate (binary):** PASS only if the grep is empty AND the guard test is green; otherwise FAIL.

- **RUX-14** (P3, Fixed source / visual-proof open) — **Owner lane:** Design / Visual-QA lane.
  - Given the "Project cover" label over an arbitrary cover image, When rendered over a worst-case
    light/complex cover, Then the label text meets **WCAG AA 4.5:1** contrast (stronger scrim or the
    label moved off-image).
  - Target file(s): `src/components/share/SharePageHero.tsx:42-43`.
  - Verify: visual contrast proof captured in [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) against a
    representative light cover; record measured ratio in the 85 evidence index.
  - **Gate (binary):** PASS only if the recorded contrast ratio is ≥ 4.5:1 (or the label no longer
    sits over the image); otherwise FAIL.

### 3b. Verification commands

Run from repo root:

```bash
# RUX-13 — no proposal-paper literals outside tokens/tests (expect ZERO lines):
grep -rn "FFFDF8" src/ | grep -v test

# RUX-11/12/13 focused suites:
node scripts/check-storybook-component-coverage.mjs
bunx vitest run \
  tests/vitest/storybook-component-coverage.test.ts \
  tests/vitest/storybook-provider-boundary.test.ts \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/design-enforcer-share-allowlist.test.ts \
  --maxWorkers=1

# Receiver a11y / activity-mount regression (RUX-01/07/10):
bunx vitest run \
  tests/vitest/share-estimate-tree-panel-a11y.test.tsx \
  tests/vitest/project-publication-activity.test.tsx \
  --maxWorkers=1

# Types:
bun run type-check
```

## 4. Product/Design Health Score

| Dimension | Score | Key Finding |
|---|---:|---|
| Accessibility | 3/4 | Strong ARIA effort exists for tabs, dialogs, regions, live updates, and feed articles; this pass fixed contrast, tree keyboard reachability, receiver activity exposure, mobile quantity/unit context, session-banner touch targets, password error association, and Storybook state coverage. Browser visual proof remains separate. |
| Performance-perceived UX | 3/4 | Good no-store/dynamic posture, deferred telemetry, lazy row images, reserved hero aspect ratio, no always-on activity polling, deferred print package, and visible recipient-session failure. Recipient-link server redirect remains a future optimization. |
| Responsive behavior | 3/4 | Horizontal tab scroll, mobile tree collapse, safe-area padding, mobile quantity/unit context, and session-banner hit areas are covered. Dense proposal tree/table rows are still intentionally compact. |
| Theming | 3/4 | Mostly tokenized, restrained, and proposal-paper aligned. Low-contrast tertiary usage, orange activity notice, and hard-coded `#FFFDF8` token drift were cleaned up; cover-image contrast proof remains. |
| Anti-pattern risk | 3/4 | The surface avoids obvious AI-slop patterns: no purple gradients, no over-rounded cards, no hero-metric template, no heavy decorative depth. Main risk is raw admin/dashboard feel in dense tree/grid sections and stale specs that describe a different tabbed dashboard. |
| Total | 12/20 | Acceptable after the implementation pass, with remaining polish centered on contrast visual proof and owner-accepted browser QA. |

**Baseline vs ship bar:** the **12/20** score here is the post-pass baseline for the current receiver,
not the client-ship bar. This audit's older **>=16/20** threshold is superseded by
[85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md): beta client ship requires **>=18/20**, the required state/
viewport matrix and RUX-14 contrast acceptance. The receiver-redesign direction is
in [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md). Binary gate: PASS only when the 85 gate passes and
the remaining RUX-14 proof item is Fixed or explicitly accepted per [75](75_FINDING_ID_REGISTRY.md) §2.

## 5. Non-Working Or Missing States To Fix

- Keep the real receiver Storybook state matrix current as password, anonymous, recipient, decision modal, comments, activity, mobile, print, and error states evolve.
- Cover-image label contrast still needs visual review with representative light/complex project images.

## 6. Positive Patterns To Preserve

- The receiver route is outside the Workshop shell and keeps public review focused: `project-publication-page.test.tsx:135-168`.
- Password-gated snapshots are not loaded until access passes: `project-publication-page.test.tsx:350-356`.
- Comment and decision paths use fresh CSRF helpers and avoid hard-coded tokens: `project-publication-comments.test.tsx:353-390`, `project-publication-decision.test.tsx:392-418`.
- Anonymous decision state is clear and non-actionable, not a silent null: `SharePageDecision.tsx:128-148`, `share-page-decision-anonymous.test.tsx:16-35`.
- Decision modal has real dialog semantics, focus trap, Escape close, and trigger focus restoration: `SharePageDecision.tsx:210-235`, `project-publication-decision.test.tsx:367-389`.
- Comments include optimistic feedback, offline queue, retry status, load error retry, and polite live regions: `SharePageComments.tsx:57-85`, `SharePageComments.tsx:184-284`, `SharePageComments.tsx:328-408`.
- Image URL normalization prevents unsafe legacy snapshot images from rendering: `SharePageHero.tsx:23-28`, `SharePageTabs.tsx:490-507`, `project-publication-page.test.tsx:896-925`.
- Activity feed removed false Realtime claims and honestly says refresh is focus/manual based: `SharedLinkActivityFeed.tsx:81-95`, `SharedLinkActivityFeed.tsx:175`, `project-publication-activity.test.tsx:745-763`.
- `/share` has a deliberate, path-scoped Client Portal type-scale exemption, avoiding cramped app typography for client review: `design-enforcer-share-allowlist.test.ts:8-18`, `design-enforcer-share-allowlist.test.ts:30-46`.

## 7. Handoffs/Conflicts For Other Lanes

- Source-edit lanes should treat this report as read-only audit input. This lane did not modify source and observed unrelated dirty files already present.
- Product/spec lane: resolve the Activity receiver mismatch and floating-navigation/spec drift. The walkthrough lists `ShareFloatingTreeNav.tsx` and receiver Activity tabs, but current source lacks `ShareFloatingTreeNav.tsx` and the receiver route is not a Link/Sheets/Access/Recipients/Activity dashboard.
- Accessibility lane: remaining known work is mainly optional browser/manual proof for the fixed receiver states.
- Design-system lane: decide whether proposal-paper hard-code should become a Tailwind token utility, and darken or scope `text-tertiary` for small client-facing copy.
- Test/story lane: maintain source-level or Storybook-static coverage for receiver states without browser automation unless a later lane explicitly requests it.
- Print/export lane: verify whether shared-link print is intended to be full package, active sheet only, or replaced by a future PDF/download artifact.
