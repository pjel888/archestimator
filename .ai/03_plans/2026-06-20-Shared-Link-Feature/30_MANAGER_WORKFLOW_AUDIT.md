# 2026-06-20 — Shared Link Feature: Manager/Workshop Publication Workflow Audit

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
  - `src/lib/publication/actions.ts:504-568` (`createProjectPublication`, `republishProjectPublication`)
- Flow:
  - Manager interacts with header controls while `canManagePublication` remains true.
  - Action pipeline asserts manager context (`src/lib/publication/actions.ts:149-175`) before mutation.
  - Snapshot is rebuilt (`src/lib/publication/actions.ts:527-556`) and published metadata updated.

### B) Rotate token
- Entry points:
  - `src/components/workshop/ProjectPublicationHeader.tsx:506-513` (rotate confirm + action invocation)
  - `src/lib/publication/actions.ts:640-697` (`rotateProjectPublicationLink`)
- Behavior:
  - New token minted, existing password can be preserved unless manager sends a password change.
  - Selection/snapshot remains anchored to current curated selection (`ProjectPublicationHeader` copy logic around `revive/curated` behavior at `src/components/workshop/ProjectPublicationHeader.tsx:364-373, 917-934`).

### C) Revoke
- Entry points:
  - `src/components/workshop/ProjectPublicationHeader.tsx:997-1009` and confirm modal `1041-1064`
  - `src/lib/publication/actions.ts:697-721` (`revokeProjectPublication`)
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
  - `src/lib/publication/actions.ts:1471-1490` (`maybeTriggerSharedLinkActivityDigest`)
- Note:
  - Digest function exists, but no direct “send now” manager action exposed in header for immediate digest retry.

### G) Activity and feed
- Entry points:
  - `ProjectPublicationHeader.tsx:683-684, 893-917, 1514-1535` (manager gating of Activity tab/feed)
  - `src/lib/publication/actions.ts:1326-1400` (`loadSharedLinkActivity`)
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

| ID | Severity | Evidence (file:line) | Impact | Recommendation | Verification needed |
|---|---|---|---|---|---|
| F-01 | P1 | `src/lib/publication/actions.ts:97-175`, `src/lib/publication/actions.ts:515-523` + `tests/vitest/project-publication-header.test.tsx:1219-1244` | Access control for non-published recipient/token paths appears strong at action entry, but there is no dedicated role-matrix test for every mutation endpoint; regression risk remains for future edits bypassing RBAC helper reuse. | Add/extend tests to assert reject on all mutation actions for owner/member/viewer/recipient roles via explicit matrix and verify no write path is reachable. | Add Vitest integration in existing `project-publication-actions.test.ts` and add negative role cases in `project-publication-header.test.tsx`. |
| F-02 | P1 | `src/lib/publication/actions.ts:640-721` vs `ProjectPublicationHeader.tsx:996-1000,997-1009` | Rotate/revoke controls are disabled when no live link exists, but user can still trigger multiple mutate clicks before pending settles in some asynchronous transitions; race risk persists despite in-flight guards elsewhere. | Keep central disabling in shared command path and add idempotency/lock tests for rotate/revoke. | Add explicit duplicate-click test for rotate+revoke and verify single server call (`project-publication-header.test.tsx` around existing in-flight latch patterns). |
| F-03 | P2 | `src/app/api/share/[token]/route.ts:36-46,67-68` and `src/app/share/[token]/page.tsx:142-165` | Error/circuit responses for expired/revoked/invalid tokens are generic, and owner recovery copy is not unified with manager copy path in header. |
| F-04 | P2 | `src/components/workshop/publication/RecipientEmailComposer.tsx:163-207` and `240-242` | Recipient send success/failure messaging is global; no strong per-recipient failure surface for partially failed batched sends. | Add structured per-recipient status chips and explicit retry CTA in the local composer state for failed adds or resends. | Add tests in `project-publication-header.test.tsx` and component-level tests for partial-failure rendering. |
| F-05 | P3 | `tests/vitest/project-publication-actions.test.ts:11-32` and `70-74` are read-only symbol presence checks; they do not exercise behavioral contracts. | Test coverage is still mostly compile/smoke around exports and text, leaving permission and sequencing behavior gaps. | Extend existing tests to verify return payload contract, idempotent transitions, and activity filtering behavior. | Add behavioral tests for `republishProjectPublication`, `rotateProjectPublicationLink`, and `loadSharedLinkActivity` success/error branches. |
| F-06 | P3 (UX) | `src/components/workshop/ProjectPublicationHeader.tsx:966-996` and `src/components/workshop/dashboard/WorkshopDashboard.tsx:30-50` | Dashboard shows published links but project-level quick controls are mostly read/list style; managers still must open project detail for non-trivial operations. | Add quick secondary action affordance (copy/revoke/rotate menu) in dashboard/list for high-friction cases. | Add a11y/usability test with keyboard/tooltip semantics if adding controls. |

## 4) Missing/non-working or UX-friction parts + likely root cause
- No immediate digest “send now” control in manager path
  - Evidence: owner-side UI paths show compose/recipients/activity but no direct digest retry action near header (`RecipientEmailComposer.tsx` and `ProjectPublicationHeader.tsx` do not expose explicit digest trigger).
  - Likely root cause: digest is background/rule-driven; no explicit manual action endpoint in UI contract.
- Partial recipient-send failure visibility is coarse
  - Evidence: composer message is aggregated and one submit state (`RecipientEmailComposer.tsx:163-207, 370-378`).
  - Root cause: batch function surfaces summary, while UI does not keep per-recipient result channel.
- Inconsistent route messaging for invalid links
  - Evidence: public route surfaces password/access/copy branches (`src/app/share/[token]/page.tsx:142-172`) while API route returns generic JSON errors (`src/app/api/share/[token]/route.ts:36-46,67-68`).
  - Root cause: separation between API and page-level copy may leave UX parity unresolved.
- Activity feed path split can make manager interpretation inconsistent
  - Evidence: activity filtering path differs by caller context (`src/app/api/share/[token]/activity/route.ts:142,251-252`) and owner gating in header (`ProjectPublicationHeader.tsx:683-684`).
  - Root cause: dual path design (owner route/path vs public path) with role-dependent projection.

## 5) Positive patterns to preserve
- Centralized manager authorization helper and explicit role rank gating.
  - `src/lib/publication/actions.ts:149-175`, reused across all mutation endpoints.
- Public/private split with recipient session safeguards.
  - `src/app/share/[token]/page.tsx:142-176`, `src/lib/publication/public-repository.ts:754-815`.
- Snapshot and access split for performance and minimal disclosure.
  - `src/lib/publication/public-repository.ts:104-110,601-610`.
- Activity feed filtering and hardening.
  - `src/app/api/share/[token]/activity/route.ts:142,251-252,247-252`.
- Security-conscious unsubscribe flow with explicit POST interstitial.
  - `src/app/api/share/[token]/unsubscribe/route.ts:48-63,69-93`.
- Tests already codify several edge contracts around activity dot, pending/revoked state, and destructive guards.
  - `tests/vitest/project-publication-header.test.tsx:1514-1535`, `tests/vitest/project-publication-header.test.tsx:1219-1244`, `tests/vitest/project-publication-activity.test.tsx`.

## 6) Implementation priorities and tests needed
1. High priority (owner workflow reliability)
  - Add explicit duplicate-click/idempotency test for rotate/revoke (`project-publication-header.test.tsx`, use existing in-flight latch assertions).
  - Add mutation RBAC matrix for all publication action functions (`project-publication-actions.test.ts`).
2. High priority (recipient lifecycle)
  - Add per-recipient failure UI state + retry action for send/add in `RecipientEmailComposer.tsx`.
  - Add behavior test asserting partial failure preserves successfully sent recipients.
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
  - Validate and document error contract symmetry between page and share route (`src/app/share/[token]/page.tsx` vs `src/app/api/share/[token]/route.ts`).
  - Confirm any new digest/event type with privacy constraints.
- Data/DB lane
  - Ensure any new activity event additions remain compatible with existing RLS + visibility filters.
- QA lane
  - Add end-to-end checks for: create -> copy -> rotate -> recipient invite -> recipient opens -> revoked link access.

If any of the above tests are authored in parallel, keep behavior contracts in one place: action API (mutations) + manager header (controls) + activity API (visibility).
