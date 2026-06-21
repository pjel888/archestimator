# 2026-06-20 — Shared Link Feature: Manager/Workshop Publication Workflow Audit

> **Anchor-verification stamp:** file:line anchors re-verified against `ProjectPublicationHeader.tsx` 1225 lines / `actions.ts` 1539 lines on 2026-06-21.

**Status (as of 2026-06-21):** Remediated — line anchors re-verified against current source, §3 findings table repaired, finding statuses bound to [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md). Canonical IDs/severities/statuses for this lane are **MANAGER-F-01 … MANAGER-F-06**; [75 §3](75_FINDING_ID_REGISTRY.md) wins on any disagreement. Source files re-checked at this date: `ProjectPublicationHeader.tsx` is **1229 lines**, `actions.ts` is **1539 lines**, `WorkshopDashboard.tsx` is **337 lines**, and `PublishedProjectQuickActions.tsx` is **205 lines** (prior `1514-1535` / `1471` / `997-1009` anchors were drifted or test-file lines — corrected below). F-01 is now Fixed by the full RBAC role-rejection matrix and `member` rank fix; F-03 is now Fixed by the shared unavailable-link copy contract; F-04 is now Fixed by per-recipient failed-send chips and retry coverage in `RecipientEmailComposer`; F-05 is now Fixed by behavioral action tests for republish, rotate, and activity load; F-06 is now Fixed by the dashboard published-row quick actions, including manager-only destructive controls and `ok:false` error handling. Broader manager presentation redesign remains tracked in [`35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md).

## 0) Goals / non-goals + success metrics

**Goals (this lane).**
- Preserve proof that **every publication mutation endpoint** rejects non-manager actors (signed-in no-access, workspace member, project member, project viewer, and public/recipient-token visitor) with an explicit RBAC matrix test — not just assertion-ordering smoke (MANAGER-F-01, Fixed).
- Guarantee **zero duplicate server calls** on rotate/revoke under rapid double-click (MANAGER-F-02, Fixed — keep regression).
- Preserve **per-recipient partial-send failure** retry coverage (MANAGER-F-04, Fixed) and unified invalid-link error copy (MANAGER-F-03, Fixed).
- Preserve behavioral action contract tests for republish/rotate/activity-load (MANAGER-F-05, Fixed).

**Non-goals.**
- Receiver-page UX redesign (owned by [`25_RECEIVER_UX_REDESIGN_BLUEPRINT.md`](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)).
- Realtime owner activity feed (SHF-01 / decision **D7** — see [75 §6](75_FINDING_ID_REGISTRY.md)).
- The owner-digest-from-public-routes gap (SEC-SHARE-06 / decision **D9**) is a security-lane finding; this lane only notes the UX consequence (no manual digest retry) in §4.

**Success metrics (binary gates).**
| Metric | Target | Gate |
|---|---|---|
| Mutation-endpoint RBAC matrix coverage | 100% of `{create, republish, rotate, revoke, recipient add/resend/remove}` × `{owner-of-other-workspace, member, viewer, recipient}` rejected | New matrix test green |
| Duplicate-submit server calls (rotate/revoke) | 0 second call while first is in-flight | Spy asserts `toHaveBeenCalledTimes(1)` |
| Digest-retry expectation | A documented manual or service-role digest path exists OR SEC-SHARE-06/D9 is explicitly deferred in [71](71_OPEN_DECISIONS_REGISTER.md) | Decision recorded |

## 1) Audit scope and exact files inspected
- `src/components/workshop/publication/RecipientEmailComposer.tsx`
- `src/components/workshop/ProjectPublicationHeader.tsx`
- `src/components/workshop/ProjectChromeAsync.tsx`
- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/dashboard/WorkshopDashboard.tsx`
- `src/lib/publication/actions.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/snapshot.ts`
- `src/components/share/SharedLinkActivityFeed.tsx`
- `src/app/share/[token]/page.tsx`
- `src/app/api/share/[token]/route.ts`
- `src/app/api/share/[token]/activity/route.ts`
- `src/app/api/share/[token]/unsubscribe/route.ts`
- `tests/vitest/project-publication-actions.test.ts`
- `tests/vitest/project-publication-summary.test.ts`
- `tests/vitest/project-publication-header.test.tsx`
- `tests/vitest/project-publication-activity.test.tsx`
- `.ai/06_specs/walkthrough-shared-link-overhaul.md`
- `.ai/10_state/decisions.md` (decision anchors via scoped `rg` reads)
- `src/components/workshop/publication/` directory surface area and owner/receiver routes touched by the above.

I did not edit source files and did not touch unrelated dirty files.

## 2) Manager workflow map: create → revoke → rotate → recipients → activity → preview

### A) Create / republish link
- Entry points:
  - `src/components/workshop/ProjectPublicationHeader.tsx:961-1008` (Update/Generate button + action dispatch)
  - `src/lib/publication/actions.ts:514` (`createProjectPublication`), `src/lib/publication/actions.ts:579` (`republishProjectPublication`)
- Flow:
  - Manager interacts with header controls while `canManagePublication` remains true.
  - Action pipeline asserts manager context (`src/lib/publication/actions.ts:160` `assertProjectPublicationManager`; rank gate `:195`) before mutation.
  - Snapshot is rebuilt inside `createProjectPublication`/`republishProjectPublication` and published metadata updated.

### B) Rotate token
- Entry points:
  - `src/components/workshop/ProjectPublicationHeader.tsx:506-513` (rotate confirm + action invocation)
  - `src/lib/publication/actions.ts:652` (`rotateProjectPublicationLink`)
- Behavior:
  - New token minted, existing password can be preserved unless manager sends a password change.
  - Selection/snapshot remains anchored to current curated selection (`ProjectPublicationHeader` copy logic around `revive/curated` behavior at `src/components/workshop/ProjectPublicationHeader.tsx:364-373, 917-934`).

### C) Revoke
- Entry points:
  - `src/components/workshop/ProjectPublicationHeader.tsx:997-1009` and confirm modal `1041-1064`
  - `src/lib/publication/actions.ts:710` (`revokeProjectPublication`)
- Notes:
  - UI blocks further publish actions when status is non-live (`hasLiveClientLink` logic at `:321-324, 996-1000`).
  - Revoke surfaces copy (`readDestructivePublicationActionCopy`) at `ProjectPublicationHeader.tsx:187-215`.

### D) Password set / clear / requirement
- Entry points:
  - `ProjectPublicationHeader.tsx:810-837` (password draft UI; saved state)
  - `ProjectPublicationHeader.tsx:210-214` (`clear-password` destructive copy)
  - `ProjectPublicationHeader.tsx:494-531` (password mutation path)
  - `src/lib/publication/actions.ts:516-557` (validation and hash updates)
- Behavior:
  - Password is optional flag plus optional hash payload in publication update; invalid password payload is blocked in action layer by schema/validator (`:516-523`).

### E) Recipients (add/remove/resend)
- Entry points:
  - `src/components/workshop/publication/RecipientEmailComposer.tsx:58-106` (compose UI and list)
  - `:158-241` add/resend/remove handlers
  - `src/lib/publication/actions.ts:989-1249` (add/resend/remove, list)
- Behavior:
  - Added recipients are sent via action result path and message summarization.
  - Opened/responded recipients get confirm behavior before destructive edits (`RecipientEmailComposer.tsx:304-352`).

### F) Recipient emails/digests and unsubscribe
- Entry points:
  - `RecipientEmailComposer.tsx:165-242` (add/send/resend)
  - `src/app/api/share/[token]/unsubscribe/route.ts:48-69` (unsubscribe interstitial + POST-only mutation)
  - `src/lib/publication/actions.ts:1526` (`maybeTriggerSharedLinkActivityDigest`)
- Note:
  - Digest function exists, but no direct “send now” manager action exposed in header for immediate digest retry. The former public-route auth gate is fixed under **SEC-SHARE-06** (decision **D9** now governs beta notification/delivery acceptance, see [75 §1](75_FINDING_ID_REGISTRY.md)); this lane only owns the missing manual-retry UX.

### G) Activity and feed
- Entry points:
  - `ProjectPublicationHeader.tsx:683-684, 893-917` (manager gating of Activity tab/feed). NOTE: the prior `1514-1535` anchor was wrong — the component is only **1172 lines**; `1514-1535` are lines in `tests/vitest/project-publication-header.test.tsx` (the "no shareable publication" info-state test), not component evidence. Relabeled in §5.
  - `src/lib/publication/actions.ts:1381` (`loadSharedLinkActivity`; owner-only, requires manager context per comment at `:1379`)
  - `src/components/share/SharedLinkActivityFeed.tsx:46-138` (client fetch + rendering)
  - `src/app/api/share/[token]/activity/route.ts:142,247-252,251-252` (cursor and visibility rules)
- Behavior:
  - Public activity route performs filtering (`activity.visibility !== "internal"`), with explicit public-only behavior.
  - Owner/manager path can request owner visibility via owner session/ server action path (`:142,604`).

### H) Link copy and re-entry paths
- Entry points:
  - `ProjectPublicationHeader.tsx:418-430` (copyClientLink)
  - Public entry: `src/app/share/[token]/page.tsx:142-176` (password/session resolution)
- Existing flow supports quick distribution copy from owner UI and recipient/owner rendering via same token-based route.

### I) Owner preview
- `src/app/share/[token]/page.tsx:172-224` keeps owner/session-aware path for protected/public access and recipient token path (`createPublicationViewToken`, `recipientToken`).
- Owner-specific behavior appears to be available when session cookie/access context is valid, while recipient context is separately hydrated.

## 3) Findings table

Canonical IDs/severities/statuses are bound to [75 §3](75_FINDING_ID_REGISTRY.md). Local `F-0n` labels map 1:1 to `MANAGER-F-0n`. **Status note:** per [75 §3](75_FINDING_ID_REGISTRY.md), **MANAGER-F-01 through MANAGER-F-06 are Fixed.** F-01 now has the full five-actor-class × every-mutation role-rejection matrix and a source fix for `member` role ranking. F-06 now adds dashboard quick actions; [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) may still polish the broader manager copy/preview presentation.

| ID (→75) | Sev | Tag | Status | Evidence (file:line) | Impact | Recommendation | Verification needed |
|---|:--:|---|---|---|---|---|---|
| F-01 → MANAGER-F-01 | P1 | RBAC | **Fixed** | `src/lib/publication/actions.ts:109-116` includes `member` below manager rank; `assertProjectPublicationManager` at `:161`; matrix test at `tests/vitest/project-publication-actions.test.ts:316` | Every manager mutation now has regression coverage for signed-in no-access users, workspace members, project members, project viewers, and public/recipient-token visitors without an owner session, including the prior `member` rank fallthrough. | Preserve the shared helper and the role matrix when adding publication mutations or changing role names. | `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1` passed 1 file / 25 tests; canonical suite passed 23 files / 353 tests. |
| F-02 → MANAGER-F-02 | P1 | concurrency | **Fixed** | `src/lib/publication/actions.ts:653` (rotate), `:711` (revoke) vs in-flight latch in `ProjectPublicationHeader.tsx`; regression test in `project-publication-header.test.tsx` (rotate double-click) | Rapid double-click on rotate/revoke could fire a duplicate server mutation before pending settled. | Keep central disabling in the shared command path; preserve the duplicate-click regression test. | Re-run the rotate/revoke duplicate-click test; assert single server call (`toHaveBeenCalledTimes(1)`). |
| F-03 → MANAGER-F-03 | P2 | UX | **Fixed** | `src/lib/publication/share-copy.ts`, `src/app/share/[token]/not-found.tsx`, public share API 404 paths, `tests/vitest/project-publication-route.test.ts`, `tests/vitest/share-no-store-invariants.test.ts` | Error/circuit responses for expired/revoked/invalid tokens now share one branded unavailable-link copy contract. | Preserve `SHARED_LINK_UNAVAILABLE_COPY` as the single source for unavailable-link page and API 404 envelopes; [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) can still improve preview/copy presentation, but the page/API parity bug is closed. | Re-run route/page/no-store coverage and keep assertions importing the shared copy export rather than duplicating literals. |
| F-04 → MANAGER-F-04 | P2 | UX | **Fixed** | `src/components/workshop/publication/RecipientEmailComposer.tsx`; `tests/vitest/recipient-email-composer.test.tsx` | Batched recipient sends now preserve successful recipients and surface failed recipients individually with error copy. | Preserve structured per-recipient failure chips and retry CTA in local composer state for failed adds/resends. UX-list polish can still build on [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md), but the functional retry gap is closed. | `bunx vitest run tests/vitest/recipient-email-composer.test.tsx --maxWorkers=1` covers partial-failure rendering and retry. |
| F-05 → MANAGER-F-05 | P3 | test-rigor | **Fixed** | `tests/vitest/project-publication-actions.test.ts` imports the actions module under mocked Supabase/server dependencies and exercises republish, rotate, and owner activity-load branches. | Return-payload, write/RPC payload, conflict, inactive-token, and revalidation contracts are now covered beyond symbol-presence smoke checks. | Preserve these behavioral assertions when action signatures change; MANAGER-F-01 role matrix coverage is now separate and fixed. | `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1` passed 1 file / 25 tests. |
| F-06 → MANAGER-F-06 | P3 | UX | **Fixed** | `src/components/workshop/dashboard/PublishedProjectQuickActions.tsx:47`, `src/components/workshop/dashboard/WorkshopDashboard.tsx:66`, `tests/vitest/workshop-reset.test.tsx:288` | Dashboard published rows now expose project-level copy/preview for published links and manager-only rotate/revoke controls without opening project detail. | Preserve the row-level quick-action group, confirmation modal for destructive actions, no refresh on `ok:false`, and refresh after successful rotate/revoke. Broader modal presentation polish remains in [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md). | `bunx vitest run tests/vitest/workshop-reset.test.tsx tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx --maxWorkers=1` passed 3 files / 107 tests; `bun run type-check` passed. |

## 4) Missing/non-working or UX-friction parts + likely root cause
- No immediate digest “send now” control in manager path
  - Evidence: owner-side UI paths show compose/recipients/activity but no direct digest retry action near header (`RecipientEmailComposer.tsx` and `ProjectPublicationHeader.tsx` do not expose explicit digest trigger).
  - Likely root cause: digest is background/rule-driven; no explicit manual action endpoint in UI contract.
- Partial recipient-send failure visibility is now functional
  - Evidence: `RecipientEmailComposer` keeps failed-recipient status/error state and exposes retry; `recipient-email-composer.test.tsx` covers the partial-failure and retry path.
  - Residual: [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) can still improve the recipient list presentation, but MANAGER-F-04's functional gap is closed.
- Unavailable-link route messaging is now unified
  - Evidence: `src/lib/publication/share-copy.ts` exports `SHARED_LINK_UNAVAILABLE_COPY`; `src/app/share/[token]/not-found.tsx` and public share API 404 envelopes import it.
  - Residual: [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) can still make the manager-side preview/copy moment more trustworthy, but MANAGER-F-03's page/API parity gap is closed.
- Activity feed path split can make manager interpretation inconsistent
  - Evidence: activity filtering path differs by caller context (`src/app/api/share/[token]/activity/route.ts:142,251-252`) and owner gating in header (`ProjectPublicationHeader.tsx:683-684`).
  - Root cause: dual path design (owner route/path vs public path) with role-dependent projection.

## 5) Positive patterns to preserve
- Centralized manager authorization helper and explicit role rank gating.
  - `src/lib/publication/actions.ts:160` (`assertProjectPublicationManager`), rank gate `:195` (`actorRank < managerRank` throws), reused across all mutation endpoints.
- Public/private split with recipient session safeguards.
  - `src/app/share/[token]/page.tsx:142-176`, `src/lib/publication/public-repository.ts:754-815`.
- Snapshot and access split for performance and minimal disclosure.
  - `src/lib/publication/public-repository.ts:104-110,601-610`.
- Activity feed filtering and hardening.
  - `src/app/api/share/[token]/activity/route.ts:142,251-252,247-252`.
- Security-conscious unsubscribe flow with explicit POST interstitial.
  - `src/app/api/share/[token]/unsubscribe/route.ts:48-63,69-93`.
- Tests already codify several edge contracts around activity dot, pending/revoked state, and destructive guards.
  - `tests/vitest/project-publication-header.test.tsx:1518-1535` (null-summary "No shareable publication yet" info-state), `tests/vitest/project-publication-header.test.tsx:1219-1244` (in-flight latch on revoke), `tests/vitest/project-publication-activity.test.tsx`. (These are TEST-file line anchors — the component itself is 1172 lines.)

## 6) Implementation priorities and tests needed
1. High priority (owner workflow reliability)
  - Preserve explicit duplicate-click/idempotency tests for rotate/revoke (`project-publication-header.test.tsx`, use existing in-flight latch assertions).
  - Preserve the mutation RBAC matrix for all publication action functions (`project-publication-actions.test.ts`).
2. Recipient lifecycle (fixed functional retry; preserve)
  - Keep per-recipient failed-send UI state + retry action in `RecipientEmailComposer.tsx`.
  - Keep behavior test asserting partial failure preserves successfully sent recipients.
3. Medium priority (observability)
  - Add explicit audit-event type for invalid/expired link attempts and owner-visible activity marker.
  - Test via `tests/vitest/project-publication-route.test.ts` + `project-publication-activity.test.tsx`.
4. Medium priority (manager UX)
  - Validate stale-copy lifecycle and add stale-link warning CTA when `revoke/rotate` invalidates previous tokens.
  - Add tests for copy interaction state and regenerated-token messaging.

## 7) Handoffs/conflicts for other lanes
- Frontend lane
  - Improve recipient composer error surfaces and stale-link UI hints in `ProjectPublicationHeader.tsx`/`RecipientEmailComposer.tsx`.
- API/security lane
  - Preserve error contract symmetry between the branded unavailable-link page and share API 404 envelopes (`src/lib/publication/share-copy.ts`).
  - Confirm any new digest/event type with privacy constraints.
- Data/DB lane
  - Ensure any new activity event additions remain compatible with existing RLS + visibility filters.
- QA lane
  - Add end-to-end checks for: create -> copy -> rotate -> recipient invite -> recipient opens -> revoked link access.

If any of the above tests are authored in parallel, keep behavior contracts in one place: action API (mutations) + manager header (controls) + activity API (visibility).

## 8) Per-finding acceptance criteria, tests, commands, owner-lane, pass/fail gate

Each row binds to [75 §3](75_FINDING_ID_REGISTRY.md). MANAGER-F-03/F-04 are fixed source contracts; [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) may still improve their presentation. UX work for F-06 is shaped by the (planned) manager redesign; the rows below own the **engineering/test** gate.

### MANAGER-F-01 (P1 · RBAC · **Fixed**) — owner-lane: API/security
- **Acceptance (Given/When/Then):** Given an actor who is a signed-in user without project access, workspace member, project member (rank `member`), project viewer, or public/recipient-token visitor without an owner session, When they invoke any of `createProjectPublication` / `republishProjectPublication` / `rotateProjectPublicationLink` / `revokeProjectPublication` / recipient add/resend/remove, Then the action rejects (manager-only error for signed-in non-managers; login redirect for public visitors) and publication writes/RPC/revalidations are **0**.
- **Exact target test file:** `tests/vitest/project-publication-actions.test.ts`
- **Test name:** `it("rejects every publication mutation for non-manager roles without writes")`
- **Run command:** `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1`
- **Pass/fail gate:** PASS = matrix covers all 7 mutations × 5 actor classes (35 cases), each asserts reject + zero write/RPC/revalidate side effects, and the focused action suite passes 1 file / 25 tests.

### MANAGER-F-02 (P1 · concurrency · **Fixed** — regression guard) — owner-lane: Frontend
- **Acceptance:** Given a live publication, When the manager double-clicks Rotate (or Revoke) before the first promise resolves, Then the corresponding server action is called exactly once.
- **Exact target test file:** `tests/vitest/project-publication-header.test.tsx`
- **Test name (existing, keep green):** rotate/revoke duplicate-click in-flight latch (around `:1219-1244`)
- **Run command:** `bunx vitest run tests/vitest/project-publication-header.test.tsx --maxWorkers=1`
- **Pass/fail gate:** PASS = `expect(rotate/revoke).toHaveBeenCalledTimes(1)`.

### MANAGER-F-03 (P2 · UX · **Fixed**) — owner-lane: API/security + Frontend
- **Acceptance:** Given an expired/revoked/invalid token, When the recipient hits the API route and the page, Then both surfaces present the same branded copy for that state (no raw generic JSON leak to the user-facing path).
- **Exact target files:** `src/lib/publication/share-copy.ts`, `src/app/share/[token]/not-found.tsx`, public share API 404 routes.
- **Target tests:** `tests/vitest/project-publication-route.test.ts`, `tests/vitest/share-no-store-invariants.test.ts`.
- **Run command:** `bunx vitest run tests/vitest/project-publication-route.test.ts tests/vitest/share-no-store-invariants.test.ts --maxWorkers=1`
- **Pass/fail gate:** PASS = page copy strings and route payload reference `SHARED_LINK_UNAVAILABLE_COPY`.

### MANAGER-F-04 (P2 · UX · **Fixed**) — owner-lane: Frontend (UX shape: [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md))
- **Acceptance:** Given a batched recipient send where one recipient fails, When the result returns, Then successfully-sent recipients remain marked sent and the failed recipient shows a per-row failure chip + retry CTA.
- **Exact target test file:** `tests/vitest/recipient-email-composer.test.tsx`
- **Test name:** partial failure rendering + failed-recipient retry CTA coverage.
- **Run command:** `bunx vitest run tests/vitest/recipient-email-composer.test.tsx --maxWorkers=1`
- **Pass/fail gate:** PASS = failed recipient renders retry control; sent recipients are not reverted.

### MANAGER-F-05 (P3 · test-rigor · **Fixed**) — owner-lane: QA
- **Acceptance:** Given the action functions, When invoked in success and error branches, Then tests assert the return-payload contract and idempotent transitions (not just symbol/text presence).
- **Exact target test file:** `tests/vitest/project-publication-actions.test.ts`
- **Test names:** `it("asserts behavioral return contracts for republish success and invalid-password failure")`; `it("asserts behavioral return contracts for rotate success and stale-token conflict")`; `it("asserts behavioral return contracts for owner activity load and inactive tokens")`.
- **Run command:** `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1`
- **Pass/fail gate:** PASS = success and error branches asserted for `republishProjectPublication`, `rotateProjectPublicationLink`, and `loadSharedLinkActivity`; latest run passed 1 file / 25 tests.

### MANAGER-F-06 (P3 · UX · **Fixed 2026-06-21**) — owner-lane: Frontend (UX shape: [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md))
- **Acceptance:** Given a published project in the dashboard/list, When the manager wants copy/rotate/revoke, Then a keyboard-reachable quick-action affordance is available without opening project detail.
- **Exact target test file:** `tests/vitest/workshop-reset.test.tsx`
- **Test name:** `it("exposes keyboard-reachable shared-link quick actions in the dashboard published list")`
- **Run command:** `bunx vitest run tests/vitest/workshop-reset.test.tsx tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx --maxWorkers=1`
- **Pass/fail gate:** PASS — quick-action controls are reachable by keyboard with tooltip semantics; copy writes the absolute URL; preview links to the share path; rotate/revoke are manager-only, require confirmation before invoking server actions, render `ok:false` results as errors, do not refresh on failed actions, and refresh afterward on success.

**Lane-wide green gate (run before claiming this lane done):**
`bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx tests/vitest/project-publication-activity.test.tsx --maxWorkers=1` and `bun run type-check` — both must exit 0.

All four cited test files are present (verified 2026-06-21): `project-publication-actions.test.ts`, `project-publication-header.test.tsx`, `project-publication-activity.test.tsx`, `project-publication-route.test.ts`. MANAGER-F-03's unified branded-copy contract is now covered by `project-publication-route.test.ts` and `share-no-store-invariants.test.ts`.
