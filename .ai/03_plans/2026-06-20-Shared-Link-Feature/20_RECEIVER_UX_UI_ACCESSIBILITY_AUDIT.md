# Receiver UX/UI/Accessibility Audit - Shared Link/Public Publication

Date: 2026-06-20
Auditor: Designer lane
Mode: static/source/story/test/spec inspection only. No browser, Playwright, screenshots, staging, provider, or source edits performed.

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
- `src/components/share/SharePageRecipientSessionInitializer.tsx`
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
   - The public page sequence is: session initializer when a recipient query exists, session banner, proposal header, summary card, decision bar, optional hero image, estimate tabs/tree/grid, comments, and non-print footer: `page.tsx:75-95`.

2. Locked/no access
   - Invalid/not found access falls through to Next `notFound()` with no branded receiver state: `page.tsx:139-140`, `page.tsx:210`.
   - Password-protected access checks an HttpOnly access cookie. If invalid, it records deferred analytics and returns the password gate without loading snapshot content: `page.tsx:142-168`.
   - Password gate copy explains password protection and security logging: `page.tsx:117-128`.
   - Password form handles success by reload, 429 lockout by disabling input/button, 401 invalid, and generic error: `ProjectPublicationPasswordForm.tsx:19-45`, `ProjectPublicationPasswordForm.tsx:63-74`.

3. Recipient session
   - `?recipient=` or legacy `?rt=` is parsed and passed to `SharePageRecipientSessionInitializer`: `page.tsx:133-137`, `page.tsx:253-260`.
   - The initializer POSTs the recipient token to `/api/share/[token]/session` and redirects to the clean share URL only when `response.ok`: `SharePageRecipientSessionInitializer.tsx:17-27`.
   - Subsequent loads validate `shared_link_session_[token]` and resolve recipient identity for banner copy: `page.tsx:177-211`.
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
   - Current public `/share/[token]` page does not import or mount `SharedLinkActivityFeed`; it is mounted in the workshop publication manager activity tab for owners: `page.tsx:5-14`, `page.tsx:75-95`, `ProjectPublicationHeader.tsx:683-699`.
   - This conflicts with older walkthrough copy that lists receiver Link/Sheets/Access/Recipients/Activity tabs and receiver activity: `.ai/06_specs/walkthrough-shared-link-overhaul.md:82-86`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:117-120`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:186-187`.

8. Print/mobile/error states
   - Print CSS hides receiver-only chrome, removes backgrounds/shadows, and targets `.share-print-estimate` blocks for page breaks: `print.css:1-48`.
   - Post-fix, the full print package is not mounted during normal browsing; it is rendered on `beforeprint`, includes every estimate/tab, and is removed again on `afterprint`.
   - Mobile behavior includes horizontal tab scrolling/fade masks, hidden table columns under `sm`, mobile-collapsed tree defaults, safe-area padding on decision/comments, and simplified tree rows: `SharePageTabs.tsx:370-418`, `SharePageTabs.tsx:483-485`, `ShareEstimateTreeView.tsx:234-260`, `SharePageDecision.tsx:261`, `SharePageComments.tsx:367`.
   - Error states exist for password invalid/locked, comment load/post/retry/offline, decision load/post, activity load, grid no-match, tree no-match, and no estimates. Branded invalid/revoked/expired public link state is not visible in the inspected route because invalid access uses `notFound()`.

## 3. UX/UI/A11y Findings

| ID | Severity | Evidence | Impact | Recommendation | Verification Needed |
|---|---:|---|---|---|---|
| RUX-01 | P1 | Fixed in this implementation pass. Navigable leaf rows in the receiver tree panel are keyboard-focusable and support keyboard activation. | Keyboard users can now use the side tree to jump to leaf sections. | Preserve distinct expand/collapse and navigation behavior when future tree work lands. | `tests/vitest/share-estimate-tree-panel-a11y.test.tsx` covers leaf keyboard access. |
| RUX-02 | P1 | Fixed in this implementation pass. Personalized recipient-session setup failures now show a non-secret alert instead of silently falling through to anonymous mode. | Clients with expired/bad personalized links get clear recovery copy. | Keep raw share/recipient tokens out of all failure copy. | `tests/vitest/share-recipient-session-initializer.test.tsx` covers failed POST alert copy and token non-disclosure. |
| RUX-03 | P1 | Fixed in this implementation pass. `share/[token]/not-found.tsx` provides a branded unavailable-link state behind the existing fail-closed `notFound()` calls. | Revoked, expired, malformed, and unavailable links no longer rely on a generic route 404 view. | Preserve no sensitive project/client details in unavailable-link copy. | `tests/vitest/share-no-store-invariants.test.ts` covers the branded 404 file. |
| RUX-04 | P1 | Fixed. `SharePageTabs` now renders the full all-estimates print package only on browser print intent. | Normal browsing avoids the hidden all-row print DOM cost while print output includes the full shared package. | Keep manual print/PDF proof for a later visual QA lane if desired. | `project-publication-page.test.tsx` proves `beforeprint` renders all estimates and `afterprint` removes the package. |
| RUX-05 | P1 | Fixed in this implementation pass. Informative small receiver copy was moved from `text-tertiary` to `text-secondary` across summary/decision/comments/tabs/activity surfaces. | Low-vision/mobile readability improved for client-facing metadata and helper copy. | Keep future tertiary usage limited to nonessential/decorative copy. | Static grep and focused component tests passed; browser visual QA remains optional. |
| RUX-06 | P2 | Fixed in this implementation pass. The remaining compact session-banner recovery/dismiss actions now use `min-h-11`/`min-w-11` hit areas and secondary contrast. | Recipient recovery and dismiss controls are less error-prone on phones without changing the dense proposal review layout. | Keep future receiver action buttons at 44px-class hit areas when practical. | `tests/vitest/project-publication-page.test.tsx` pins the session-banner touch/contrast contract; browser proof remains optional. |
| RUX-07 | P2 | Fixed in this implementation pass. Mobile grid/tree rows now show `Qty ... · unit` as secondary inline metadata. | Mobile reviewers can verify basic quantity/unit math without switching to desktop. | Keep discipline hidden on compact mobile unless product asks for denser row details. | `project-publication-page.test.tsx` and `share-estimate-tree-panel-a11y.test.tsx` cover quantity/unit visibility. |
| RUX-08 | P2 | Fixed in this implementation pass. Plain Enter now inserts a newline, while Ctrl/Command+Enter submits. | Multi-line review notes are less likely to be sent accidentally. | Keep client-facing compose controls button-first unless a shortcut is visibly explained. | `tests/vitest/project-publication-comments.test.tsx` covers newline and keyboard submit behavior. |
| RUX-09 | P2 | Fixed in this implementation pass. Password feedback now has a stable alert id and the input receives `aria-invalid`/`aria-describedby` when feedback is present. | Screen-reader users get a programmatic relationship between the password field and invalid/locked feedback. | Keep future password-gate feedback tied to the input. | `tests/vitest/project-publication-page.test.tsx` covers invalid/locked ARIA state. |
| RUX-10 | P2 | Fixed in this implementation pass. `/share/[token]` now mounts `SharedLinkActivityFeed` through the existing public-safe filtered activity route. | Receiver activity is no longer only an owner/workshop concept, and the implementation now matches the spec direction without leaking internal activity. | Keep public activity copy restrained and monitor whether clients need a separate Activity tab later. | `project-publication-page.test.tsx` proves the receiver page fetches `/api/share/:token/activity`; `project-publication-activity.test.tsx` covers public filtering. |
| RUX-11 | P2 | Storybook share receiver coverage is fixture-only and explicitly avoids public share routes/session/comments/password: `share-review.stories.tsx:21-32`, `share-review-panel.stories.tsx:32-43`. | Designers cannot inspect the real receiver state matrix in Storybook: password gate, anonymous read-only, recipient session, decision modal, comments/offline, mobile table/tree, and print states are not represented. | Add integrated static stories for the actual share components with mocked hooks/fetches, not token routes. Include state matrix and mobile viewport docs. | Storybook story audit or static story tests, no browser automation required unless later requested. |
| RUX-12 | P2 | `tests/vitest/project-publication-page.test.tsx:476-479` still says tab buttons use `text-[10px]`/`[9px]`/`[11px]`, while implementation uses `text-[13px]` at `SharePageTabs.tsx:393`. The design enforcer allowlist intentionally exempts `/share` px caps: `design-enforcer-share-allowlist.test.ts:8-18`, `design-enforcer-share-allowlist.test.ts:30-46`. | Test comments and historical contracts are stale. Future agents may "fix" receiver typography toward the old app cap and hurt client readability. | Update stale test comments/expectation language to reference the Client Portal type-scale exemption and current 13px tabs. | Docs/test-only check; no product behavior change. |
| RUX-13 | P2 | Hard-coded proposal paper appears as `bg-[#FFFDF8]` in decision states: `SharePageDecision.tsx:138`, `SharePageDecision.tsx:242`, `SharePageDecision.tsx:261`, `SharePageDecision.tsx:317`; tree panel has `bg-[#FFFDF8]` at `ShareEstimateTreePanel.tsx:239`. The token exists in `DESIGN.md:369`. | Theming is mostly disciplined, but hard-coded proposal paper makes future theme adjustments harder and creates token drift risk. | Add/use a `bg-proposalPaper`/CSS variable utility and replace literals in share components. | Design lint/token grep for no `#FFFDF8` literals outside tokens/tests. |
| RUX-14 | P3 | Cover image overlay uses `from-black/35` with `text-white/90` on arbitrary project images: `SharePageHero.tsx:42-43`. | Contrast over light/complex cover images is indirect and image-dependent; label may be illegible. It is not critical content, but it can look unpolished. | Increase scrim strength or move the label outside the image if the label remains useful. | Visual/static contrast review with representative light cover image. |
| RUX-15 | P3 | Fixed in this implementation pass. `SharedLinkActivityFeed` now uses existing accent/secondary tokens instead of one-off orange notice classes. | Activity notices better match the restrained receiver surface. | Keep orange reserved for warning semantics. | Static source review and activity tests passed. |

## 4. Product/Design Health Score

| Dimension | Score | Key Finding |
|---|---:|---|
| Accessibility | 3/4 | Strong ARIA effort exists for tabs, dialogs, regions, live updates, and feed articles; this pass fixed contrast, tree keyboard reachability, receiver activity exposure, mobile quantity/unit context, session-banner touch targets, and password error association. Storybook state coverage remains. |
| Performance-perceived UX | 3/4 | Good no-store/dynamic posture, deferred telemetry, lazy row images, reserved hero aspect ratio, no always-on activity polling, deferred print package, and visible recipient-session failure. Recipient-link server redirect remains a future optimization. |
| Responsive behavior | 3/4 | Horizontal tab scroll, mobile tree collapse, safe-area padding, mobile quantity/unit context, and session-banner hit areas are covered. Dense proposal tree/table rows are still intentionally compact. |
| Theming | 3/4 | Mostly tokenized, restrained, and proposal-paper aligned. Low-contrast tertiary usage and orange activity notice were cleaned up; hard-coded `#FFFDF8` token drift remains. |
| Anti-pattern risk | 3/4 | The surface avoids obvious AI-slop patterns: no purple gradients, no over-rounded cards, no hero-metric template, no heavy decorative depth. Main risk is raw admin/dashboard feel in dense tree/grid sections and stale specs that describe a different tabbed dashboard. |
| Total | 12/20 | Acceptable after the implementation pass, with remaining polish centered on Storybook state coverage, token cleanup, and visual proof. |

## 5. Non-Working Or Missing States To Fix

- Real receiver Storybook state matrix for password, anonymous, recipient, decision modal, comments, activity, mobile, print, and errors.
- Proposal-paper hard-coded color literals should become a token utility if the design system formalizes that surface.
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
- Accessibility lane: remaining known work is mainly Storybook state coverage plus optional browser/manual proof for the fixed receiver states.
- Design-system lane: decide whether proposal-paper hard-code should become a Tailwind token utility, and darken or scope `text-tertiary` for small client-facing copy.
- Test/story lane: add source-level or Storybook-static coverage for missing receiver states without browser automation unless a later lane explicitly requests it.
- Print/export lane: verify whether shared-link print is intended to be full package, active sheet only, or replaced by a future PDF/download artifact.
