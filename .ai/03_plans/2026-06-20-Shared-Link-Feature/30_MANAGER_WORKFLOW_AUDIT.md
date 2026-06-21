# 2026-06-20 — Shared Link Feature: Manager/Workshop Publication Workflow Audit

> **Anchor-verification stamp:** file:line anchors re-verified against `ProjectPublicationHeader.tsx` 1172 lines / `actions.ts` 1538 lines on 2026-06-21.

**Status (as of 2026-06-21):** Remediated — line anchors re-verified against current source, §3 findings table repaired, finding statuses bound to [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md). Canonical IDs/severities/statuses for this lane are **MANAGER-F-01 … MANAGER-F-06**; [75 §3](75_FINDING_ID_REGISTRY.md) wins on any disagreement. Source files re-checked at this date: `ProjectPublicationHeader.tsx` is **1172 lines**, `actions.ts` is **1538 lines** (prior `1514-1535` / `1471` / `997-1009` anchors were drifted or test-file lines — corrected below). UX redesign work for F-03/F-04/F-06 is tracked in the (planned) [`35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md).

## 0) Goals / non-goals + success metrics

**Goals (this lane).**
- Prove that **every publication mutation endpoint** rejects non-manager actors (owner/member/viewer/recipient) with an explicit RBAC matrix test — not just assertion-ordering smoke (MANAGER-F-01).
- Guarantee **zero duplicate server calls** on rotate/revoke under rapid double-click (MANAGER-F-02, Fixed — keep regression).
- Surface **per-recipient partial-send failure** with retry (MANAGER-F-04) and unify invalid-link error copy (MANAGER-F-03).
- Replace symbol-presence/smoke action tests with **behavioral contract tests** (MANAGER-F-05).

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
  - Digest function exists, but no direct “send now” manager action exposed in header for immediate digest retry. The function is also auth-gated (`actions.ts:1531-1534` returns `digest-auth-required` when `requireCurrentUserContext()` throws), so it never fires from public recipient routes — this is the security-lane finding **SEC-SHARE-06** (decision **D9**, see [75 §1](75_FINDING_ID_REGISTRY.md)); this lane only owns the missing manual-retry UX.

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

Canonical IDs/severities/statuses are bound to [75 §3](75_FINDING_ID_REGISTRY.md). Local `F-0n` labels map 1:1 to `MANAGER-F-0n`. **Status note:** per [75 §3](75_FINDING_ID_REGISTRY.md) and [`_COORDINATION.md` §4 fact 8](_COORDINATION.md), **MANAGER-F-01 is PARTIAL** — only assertion-ordering + rotate double-click landed (80 §11); the full owner/member/viewer/recipient × every-mutation role-rejection matrix is **still Open**, so this row is **not** marked Covered. **MANAGER-F-02 is Fixed.** UX rows F-03/F-04/F-06 cross-link the (planned) manager-modal redesign [`35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md).

| ID (→75) | Sev | Tag | Status | Evidence (file:line) | Impact | Recommendation | Verification needed |
|---|:--:|---|---|---|---|---|---|
| F-01 → MANAGER-F-01 | P1 | RBAC | **Partial** | `src/lib/publication/actions.ts:160` (`assertProjectPublicationManager`), rank gate `:195`; landed assertion-ordering + rotate double-click in `tests/vitest/project-publication-header.test.tsx:1219-1244` | Manager context is asserted at every mutation entry, but there is no dedicated role-matrix test exercising **every** mutation endpoint for owner-of-other-workspace/member/viewer/recipient; regression risk remains if a future edit bypasses the helper. | Add an explicit RBAC matrix asserting reject on all mutation actions (`create/republish/rotate/revoke/recipient add/resend/remove`) for non-manager roles and verify no write path is reachable. | Add matrix in `tests/vitest/project-publication-actions.test.ts`; assert each call throws and the admin RPC spy is never invoked. |
| F-02 → MANAGER-F-02 | P1 | concurrency | **Fixed** | `src/lib/publication/actions.ts:652` (rotate), `:710` (revoke) vs in-flight latch in `ProjectPublicationHeader.tsx:996-1000,997-1009`; regression test in `project-publication-header.test.tsx` (rotate double-click) | Rapid double-click on rotate/revoke could fire a duplicate server mutation before pending settled. | Keep central disabling in the shared command path; preserve the duplicate-click regression test. | Re-run the rotate/revoke duplicate-click test; assert single server call (`toHaveBeenCalledTimes(1)`). |
| F-03 → MANAGER-F-03 | P2 | UX | **Open** | `src/app/api/share/[token]/route.ts:36-46,67-68` and `src/app/share/[token]/page.tsx:142-165` | Error/circuit responses for expired/revoked/invalid tokens are generic JSON, and owner recovery copy is not unified with the manager copy path in the header. | Define one error-copy contract shared by the page and the API route; add owner-recovery guidance in the header for revoked/rotated/expired states. UX shape owned by [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md). | Add route-level tests asserting branded/consistent error payloads for `revoked`/`expired`/`invalid`; snapshot the unified copy strings. |
| F-04 → MANAGER-F-04 | P2 | UX | **Open** | `src/components/workshop/publication/RecipientEmailComposer.tsx:163-207` and `:240-242` | Recipient send success/failure messaging is global; no per-recipient failure surface for partially failed batched sends. | Add structured per-recipient status chips + explicit retry CTA in local composer state for failed adds/resends. UX shape owned by [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md). | Add component-level tests in `project-publication-header.test.tsx` asserting partial-failure rendering preserves successfully-sent recipients and shows a retry CTA. |
| F-05 → MANAGER-F-05 | P3 | test-rigor | **Open** | `tests/vitest/project-publication-actions.test.ts` exports/text presence checks only — they do not exercise behavioral contracts. | Coverage is mostly compile/smoke around exports and copy, leaving permission and sequencing behavior gaps. | Extend tests to verify return-payload contract, idempotent transitions, and activity filtering. | Add behavioral tests for `republishProjectPublication` (`:579`), `rotateProjectPublicationLink` (`:652`), and `loadSharedLinkActivity` (`:1381`) success/error branches. |
| F-06 → MANAGER-F-06 | P3 | UX | **Open** | `src/components/workshop/ProjectPublicationHeader.tsx:966-996` and `src/components/workshop/dashboard/WorkshopDashboard.tsx:30-50` | Dashboard shows published links but project-level quick controls are read/list style; managers must open project detail for non-trivial operations. | Add a quick secondary-action affordance (copy/revoke/rotate menu) in the dashboard/list for high-friction cases. UX shape owned by [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md). | Add a11y/usability test with keyboard + tooltip semantics for any added controls. |

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

## 8) Per-finding acceptance criteria, tests, commands, owner-lane, pass/fail gate

Each row binds to [75 §3](75_FINDING_ID_REGISTRY.md). UX work for F-03/F-04/F-06 is shaped by the (planned) [`35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md); the rows below own the **engineering/test** gate.

### MANAGER-F-01 (P1 · RBAC · **Partial → complete the matrix**) — owner-lane: API/security
- **Acceptance (Given/When/Then):** Given an actor who is owner-of-another-workspace, a project member (rank `member`), a project viewer, or a recipient-token holder, When they invoke any of `createProjectPublication` / `republishProjectPublication` / `rotateProjectPublicationLink` / `revokeProjectPublication` / recipient add/resend/remove, Then the action throws "Only project owners and admins can publish shared links." and the publication admin RPC spy is invoked **0** times.
- **Exact target test file:** `tests/vitest/project-publication-actions.test.ts`
- **New test name:** `it("rejects every publication mutation for non-manager roles (RBAC matrix)")`
- **Run command:** `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1`
- **Pass/fail gate:** PASS only when the matrix covers all 7 mutations × 4 non-manager roles (28 cases) and each asserts throw + zero RPC. Until then MANAGER-F-01 stays **Partial** in [75](75_FINDING_ID_REGISTRY.md).

### MANAGER-F-02 (P1 · concurrency · **Fixed** — regression guard) — owner-lane: Frontend
- **Acceptance:** Given a live publication, When the manager double-clicks Rotate (or Revoke) before the first promise resolves, Then the corresponding server action is called exactly once.
- **Exact target test file:** `tests/vitest/project-publication-header.test.tsx`
- **Test name (existing, keep green):** rotate/revoke duplicate-click in-flight latch (around `:1219-1244`)
- **Run command:** `bunx vitest run tests/vitest/project-publication-header.test.tsx --maxWorkers=1`
- **Pass/fail gate:** PASS = `expect(rotate/revoke).toHaveBeenCalledTimes(1)`.

### MANAGER-F-03 (P2 · UX · **Open**) — owner-lane: API/security + Frontend (copy shape: [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md))
- **Acceptance:** Given an expired/revoked/invalid token, When the recipient hits the API route and the page, Then both surfaces present the same branded copy for that state (no raw generic JSON leak to the user-facing path).
- **Exact target test file:** `tests/vitest/project-publication-route.test.ts` (exists — extend it)
- **New test name:** `it("returns unified branded error copy for revoked/expired/invalid tokens")`
- **Run command:** `bunx vitest run tests/vitest/project-publication-route.test.ts --maxWorkers=1`
- **Pass/fail gate:** PASS = page copy strings and route payload reference the same canonical message set for each state.

### MANAGER-F-04 (P2 · UX · **Open**) — owner-lane: Frontend (UX shape: [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md))
- **Acceptance:** Given a batched recipient send where one recipient fails, When the result returns, Then successfully-sent recipients remain marked sent and the failed recipient shows a per-row failure chip + retry CTA.
- **Exact target test file:** `tests/vitest/project-publication-header.test.tsx`
- **New test name:** `it("surfaces per-recipient partial-send failure with a retry CTA")`
- **Run command:** `bunx vitest run tests/vitest/project-publication-header.test.tsx --maxWorkers=1`
- **Pass/fail gate:** PASS = failed recipient renders retry control; sent recipients are not reverted.

### MANAGER-F-05 (P3 · test-rigor · **Open**) — owner-lane: QA
- **Acceptance:** Given the action functions, When invoked in success and error branches, Then tests assert the return-payload contract and idempotent transitions (not just symbol/text presence).
- **Exact target test file:** `tests/vitest/project-publication-actions.test.ts`
- **New test name:** `it("asserts behavioral return contracts for republish/rotate/loadSharedLinkActivity")`
- **Run command:** `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1`
- **Pass/fail gate:** PASS = success and error branches asserted for `republishProjectPublication` (`actions.ts:579`), `rotateProjectPublicationLink` (`:652`), `loadSharedLinkActivity` (`:1381`).

### MANAGER-F-06 (P3 · UX · **Open**) — owner-lane: Frontend (UX shape: [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md))
- **Acceptance:** Given a published project in the dashboard/list, When the manager wants copy/rotate/revoke, Then a keyboard-reachable quick-action affordance is available without opening project detail.
- **Exact target test file:** `tests/vitest/project-publication-header.test.tsx` (or a new dashboard-quick-actions test)
- **New test name:** `it("exposes keyboard-reachable quick actions (copy/rotate/revoke) in the dashboard list")`
- **Run command:** `bunx vitest run tests/vitest/project-publication-header.test.tsx --maxWorkers=1`
- **Pass/fail gate:** PASS = quick-action menu items reachable by keyboard with correct tooltip/aria semantics.

**Lane-wide green gate (run before claiming this lane done):**
`bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx tests/vitest/project-publication-activity.test.tsx --maxWorkers=1` and `bun run type-check` — both must exit 0.

All four cited test files are present (verified 2026-06-21): `project-publication-actions.test.ts`, `project-publication-header.test.tsx`, `project-publication-activity.test.tsx`, `project-publication-route.test.ts`. UNVERIFIED: whether the route test already asserts the *unified* branded-copy contract for MANAGER-F-03 — confirm with `bunx vitest run tests/vitest/project-publication-route.test.ts --maxWorkers=1` and extend if the assertion is absent.
