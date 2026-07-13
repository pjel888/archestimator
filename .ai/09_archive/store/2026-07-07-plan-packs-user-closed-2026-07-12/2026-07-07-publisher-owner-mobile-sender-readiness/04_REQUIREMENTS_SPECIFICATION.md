# 04 — Requirements Specification

Stable IDs. Every requirement carries: statement, rationale, source, priority, dependencies, acceptance criteria (objective + testable), validation method, affected code areas, risks, status. Source strength tags: `brief`, `repo evidence`, `official docs`, `assumption`, `derived`, `owner-delegated decision`.

Priority scale: P0 = blocking; P1 = must-have for readiness; P2 = should-have; P3 = nice-to-have.

---

## Product / scope

### REQ-PS-01 — Owner can reach the sender surface on mobile (DEC-MOBILE) [P0]
- **Statement:** The owner must be able to reach and operate the critical sender actions on a phone-width viewport via a deliberate, documented path (mobile layout OR an explicit, proof-backed desktop guard with a documented recovery path).
- **Rationale:** today the roster is hidden below 768px (`PublisherRosterClient.tsx:224,228`), blocking every sender action on mobile.
- **Source:** brief + repo evidence (`PublisherRosterClient.tsx:224,228`, `PublisherEmptyState.tsx:29-33`).
- **Priority:** P0.
- **Dependencies:** DEC-MOBILE (owner-delegated).
- **Acceptance criteria:**
  - AC1: The mobile decision is documented in `15` with options, recommendation, owner, and proof path. (testable: doc exists)
  - AC2: If "mobile layout" → owners can open a publication's manage drawer and perform copy/email/resend/revoke on a 375px viewport without horizontal scroll forcing loss of the action button. (testable: Playwright at 375px)
  - AC3: If "desktop guard" → the mobile message names exactly which actions are unavailable and the recovery path (e.g., "Open on desktop" with a one-tap copy of the current URL, or a deep-link to the specific publication's manage view). (testable: DOM assertion of message + link)
- **Validation:** Playwright @375px (browser-only claim: viewport-conditional reachability) + unit/DOM for the decision branch.
- **Affected code:** `PublisherRosterClient.tsx`, `PublisherEmptyState.tsx`, (conditionally) `PublisherRosterRow.tsx`, `PublisherDrawer.tsx`.
- **Risks:** over-building mobile parity for heavy surfaces (mitigated by DEC-MOBILE scope); focus traps in a mobile drawer. → RISK-MOBILE-1/2.
- **Status:** planning-complete (implementation deferred to exec).

### REQ-PS-02 — No duplication with sibling packs [P0]
- **Statement:** This pack must not re-plan or implement readiness/Preflight/gating, owner-composed message, `responded` wiring, notifications, snapshot immutability, recipient inbox, or public activity minimization.
- **Rationale:** avoid conflicting edits in shared files.
- **Source:** sibling READMEs (`client-ready-proposal-package-workflow`, `proposal-export-and-immutable-deliverable-trust`, `recipient-proposals-inbox-ia-recovery`, `public-share-activity-minimization`).
- **Acceptance criteria:**
  - AC1: File-scope ownership matrix in `00` marks every shared file with owner + serialization rule.
  - AC2: No implementation task in `11` duplicates a workflow-pack task; shared-file tasks are tagged `SEQUENTIAL-DEPENDS-ON-WORKFLOW-PACK`.
- **Validation:** cross-document consistency check (cycle 2 adversarial review).
- **Status:** planning-complete.

---

## Functional (sender actions)

### REQ-FR-01 — Generate (publish / republish) [P0]
- **Statement:** Owner can generate (or update) a share link; the action's pending/success/failure/recovery states are visible.
- **Source:** brief + repo evidence (`createProjectPublication` `actions.ts:775`, `republishProjectPublication` :845).
- **Acceptance criteria:**
  - AC1: Pending state shows a non-blocking spinner/disabled action with an accessible label. (DOM)
  - AC2: Success shows the new `clientLinkPath` + a copy affordance + a success toast/live-region. (DOM + state)
  - AC3: Failure (e.g., empty snapshot `actions.ts:809-811`, authz error, D1 error) shows the specific error message and a retry affordance. (DOM)
  - AC4: Recovery: a failed generate leaves prior published state intact (no partial mutation). (unit test)
- **Validation:** `tests/vitest/project-publication-actions.test.ts` (extend) + DOM test of states.
- **Affected code:** `PublisherDrawer.tsx` (states), `usePublisherDrawer.ts`, `actions.ts` (error surfaces).
- **Status:** planning-complete.

### REQ-FR-02 — Copy link [P1]
- **Statement:** Owner can copy the absolute share link from the roster row and the drawer; clipboard failure shows a fallback.
- **Source:** repo evidence (`PublisherRosterClient.tsx:154` `handleCopyLink`, `PublisherDrawer.tsx:236` `copyClientLink`).
- **Acceptance criteria:**
  - AC1: On success → "copied" state + live-region announcement (`PublisherRosterClient.tsx:269-273` pattern). (DOM + a11y)
  - AC2: On clipboard-API failure (e.g., insecure context, permissions) → "failed" state + a visible fallback showing the URL for manual copy. (DOM)
  - AC3: Copy is disabled when `!clientLinkPath || !tokenCopyAvailable` (read-only viewer redaction honored). (DOM/unit)
- **Validation:** DOM test of copy states + a11y live-region assertion.
- **Status:** planning-complete.

### REQ-FR-03 — Email recipients (add) [P0]
- **Statement:** Owner can add recipient emails; validation, self-invite block, dedup, 50-cap, and delivery-readiness gate are surfaced clearly.
- **Source:** repo evidence (`addSharedLinkRecipients` `actions.ts:1352`; `RecipientEmailComposer.tsx`).
- **Acceptance criteria:**
  - AC1: Invalid email → inline validation error, chip not added. (DOM)
  - AC2: Self-invite → blocked message (`RecipientEmailComposer.tsx:377-380`). (DOM)
  - AC3: Duplicate (same `publication_id + lower(email)`) → dedup result surfaced, not a hard error. (unit + DOM)
  - AC4: ≥50 recipients → `SHARED_LINK_RECIPIENT_ACTION_LIMIT` message. (DOM/unit)
  - AC5: `emailDeliveryConfigured === false` → send disabled with a clear "email not configured" reason; (AC6) link unresolvable → batch aborts with a clear owner message. (DOM + unit of `actions.ts:1436-1449`)
- **Validation:** `recipient-email-composer.test.tsx` (extend) + action unit test for batch-abort.
- **Status:** planning-complete.

### REQ-FR-04 — Resend [P0]
- **Statement:** Owner can resend to a recipient; the resend rate limit (1/5min), send-before-persist semantics, and the fact that resend **rotates the recipient token** (prior emailed link stops working) are surfaced honestly.
- **Source:** repo evidence (`resendSharedLinkRecipientEmail` `actions.ts:1554`; rate limit `actions.ts:1243,261-262`; token rotation on resend).
- **Acceptance criteria:**
  - AC1: Resend of an `opened`/`responded` recipient opens a confirm modal explaining the status downgrade (`resendNeedsConfirm` `RecipientEmailComposer.tsx:244-246`). (DOM)
  - AC2: Rate-limited resend (second within 5min) → clear "try again in N min" message, not a generic error. (unit of action + DOM)
  - AC3: Send failure leaves the prior link intact (send-before-persist); owner sees "send failed, previous link still active." (unit test of `actions.ts:1607-1610` behavior + DOM)
  - AC4: Resend to unsubscribed recipient → blocked with reason. (unit + DOM)
- **Validation:** `tests/vitest/project-publication-rotate-resend.test.ts` (extend) + DOM.
- **Status:** planning-complete.

### REQ-FR-05 — Revoke [P0]
- **Statement:** Owner can revoke a publication; revoke is destructive-confirmed, blocks recipient access, and the owner sees a clear post-revoke state.
- **Source:** repo evidence (`revokeProjectPublication` `actions.ts:1012`; `ConfirmDialog` in `PublisherDrawer.tsx:520-537`).
- **Acceptance criteria:**
  - AC1: Revoke requires a confirmation dialog naming the consequence ("recipients can no longer open the link"). (DOM)
  - AC2: After revoke → status badge `revoked`, copy/open disabled, recovery note ("republish to create a new link"). (DOM)
  - AC3: Revoked link → recipient access blocked (cross-pack evidence: share route returns revoked state). (integration; see `12`)
- **Validation:** DOM test + `tests/vitest/project-publication-actions.test.ts` (extend for revoke status surfacing).
- **Status:** planning-complete.

### REQ-FR-06 — Confirm client access (owner visibility) [P1]
- **Statement:** Owner can see, per recipient and per publication, whether/when a client has accessed the proposal (delivery/open signals), with honest labels given the current provider limits.
- **Source:** repo evidence (`openRecipientProposalAction` `actions.ts:304`; `delivery_status`; ASSUMP-4).
- **Acceptance criteria:**
  - AC1: Owner sees recipient `delivery_status` with an honest label; `sent` is not labeled as "opened." (DOM)
  - AC2: Where provider signals are unavailable (no webhook), the label is "Sent (delivery not provider-confirmed)" — **consuming** the workflow pack's honest-delivery work (DEC-LABELS-1, depends-on-workflow-pack). (DOM)
  - AC3: Owner activity feed surfaces access events from `project_publication_events`. (DOM/unit of `loadSharedLinkActivity`)
- **Validation:** DOM test of honest labels + activity feed unit test.
- **Status:** planning-complete.

### REQ-FR-07 — Rotate (link rotation) [P1]
- **Statement:** Owner can rotate the publication link; rotate invalidates prior recipient links and is confirm-gated.
- **Source:** repo evidence (`rotateProjectPublicationLink` `actions.ts:938`; recipient hash overwrite `admin-d1-client.ts:581-593`).
- **Acceptance criteria:**
  - AC1: Rotate opens a confirm dialog explaining "existing recipient email links will stop working; resend to re-enable." (DOM)
  - AC2: After rotate → new `clientLinkPath` returned (`actions.ts:970`), copy reflects it, recipients show "needs resend." (DOM + unit)
- **Validation:** DOM + `tests/vitest/project-publication-rotate-resend.test.ts` (extend).
- **Status:** planning-complete.

---

## UX / Accessibility

### REQ-UX-01 — Sender action state matrix is complete [P0]
- **Statement:** Each of the 6 sender actions has documented: pending, success, failure, recovery, disabled states (see `05`).
- **AC:** matrix exists and every cell is answered or `N/A` with reason.
- **Validation:** doc review (cycle 2).
- **Status:** planning-complete.

### REQ-A11Y-01 — Keyboard + focus + screen-reader for owner actions [P0]
- **Statement:** Copy/Open/Manage/Email/Resend/Revoke/Rotate are keyboard-operable, focus is managed (incl. drawer open/close focus restore — `PublisherRosterClient.tsx:165-172` pattern), and state changes are announced via live regions.
- **Source:** `Creating-Plan-Prompt.md` §8A; repo evidence (`aria-live` at `PublisherRosterClient.tsx:269-273`).
- **AC:** keyboard test reaches every action; focus returns to trigger on drawer close; live-region asserts state.
- **Validation:** keyboard/focus DOM tests; targeted Playwright for drawer focus restoration.
- **Status:** planning-complete.

### REQ-A11Y-02 — Responsive + reduced-motion + non-color cues [P1]
- **Statement:** Status uses icons/text not color alone; reduced-motion respected; no overflow clipping on 320–768px.
- **Source:** `DESIGN.md:581,585`.
- **AC:** DOM/visual assertion at 320px/375px/768px; reduced-motion query honored.
- **Status:** planning-complete.

---

## Architecture / Data / API / Security / Perf / Rel / Test / Ops
(Summarized here; full detail in `06`–`13`.)

### REQ-ARCH-01 — Server/Client boundary preserved [P1]
- `"use client"` stays scoped to the interactive components (`PublisherRosterClient`, `PublisherDrawer`, `RecipientEmailComposer`); no server-only data leaks to client. Drawer data already redacted for viewers (`drawer-actions.ts:27-37`).
- **Status:** planning-complete (no boundary change required by this pack).

### REQ-DATA-01 — No schema change in this pack [P0]
- This pack adds **no migration**. It audits `0014` + `0006`. Any column the owner UI needs (e.g., honest delivery metadata) is owned by the workflow pack's `0037`. → `07`.
- **Status:** planning-complete.

### REQ-SEC-01 — Authz unchanged + audited [P0]
- `assertProjectPublicationManager` (rank ≥ 30) remains the gate. This pack does not weaken it. Threat model in `08`.
- **Status:** planning-complete.

### REQ-TEST-01 — Test execution matrix covers every REQ [P0]
- See `12`; every REQ maps to a test file + command + expected evidence.
- **Status:** planning-complete.

---

## Shadow-path matrices

### Matrix S1 — Generate (publish/republish)

| Flow | Happy | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Generate | snapshot built, link minted, `replace_project_publication` | N/A (server derives) | empty snapshot guard (`actions.ts:809-811`) → error | bad `selectedEstimateIds`/`expiresAt` | `assertProjectPublicationManager` throws | D1 RPC error | UNIQUE partial index one-published (DB-level) | `replace_project_publication` revokes prior first | success toast + link; error toast + retry | `project-publication-actions.test.ts` |

### Matrix S2 — Copy link

| Flow | Happy | Nil input | Empty result | Invalid | Auth denied | Upstream error | Concurrency | Retry/idempotency | Visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Copy | clipboard write + "copied" | `!clientLinkPath` → disabled | N/A | non-http path → `readAbsoluteClientLink` resolves via `window.location.origin` | viewer redaction → disabled | Clipboard API unavailable → "failed" + fallback URL | N/A | re-copy allowed | "copied"/"failed" + live-region | DOM test |

### Matrix S3 — Email recipients (add)

| Flow | Happy | Missing input | Empty result | Invalid | Auth denied | Upstream error | Concurrency | Retry/idempotency | Visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Add | insert + send + `delivery_status=sent` | no email → no-op | 0 valid → inline error | bad email regex → reject; self-invite → block | manager assert | email send failure → `failed` status; batch-abort if link unresolvable | bounded concurrency 4; UNIQUE dedup | dedup → `duplicate` not error | per-recipient status chip | `recipient-email-composer.test.tsx` |

### Matrix S4 — Resend

| Flow | Happy | Missing | Empty | Invalid | Auth denied | Upstream | Concurrency | Retry/idempotency | Visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Resend | new token, send-first, persist hash on success | recipientId missing → no-op | recipient gone → error | unsubscribed → block; self → block | manager assert | send fail → prior link intact (send-before-persist) | rate limit 1/5min | rate-limited → "try in N min" | success/"rate-limited"/"failed, prior link active" | `project-publication-rotate-resend.test.ts` |

### Matrix S5 — Revoke

| Flow | Happy | Missing | Empty | Invalid | Auth denied | Upstream | Concurrency | Retry/idempotency | Visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Revoke | set `status=revoked, revoked_at=now` | projectId missing → no-op | already revoked → idempotent note | N/A | manager assert | D1 error | single live row (UNIQUE) | idempotent | `revoked` badge + copy/open disabled + recovery note | `project-publication-actions.test.ts` |

### Matrix S6 — Confirm client access (owner view)

| Flow | Happy | Missing | Empty | Invalid | Auth denied | Upstream | Concurrency | Retry/idempotency | Visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| View access | activity feed + `delivery_status` | no events → empty state | no recipients → empty | unknown status → `normalizeRecipientDeliveryStatus`→`pending` | manager assert | D1 read fail → error boundary | N/A | N/A | honest labels + empty state | `publisher-activity-feed.test.tsx` + DOM |
