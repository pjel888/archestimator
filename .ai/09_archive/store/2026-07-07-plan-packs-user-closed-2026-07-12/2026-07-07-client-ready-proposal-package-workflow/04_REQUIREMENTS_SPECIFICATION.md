# 04 — Requirements Specification

Stable IDs: `FR-*` (functional), `UX-*`, `A11Y-*`, `ARCH-*`, `DATA-*`, `API-*`, `SEC-*`, `PERF-*`, `REL-*`, `OPS-*`, `TEST-*`, `DOC-*`. Each requirement lists source, priority (P0 critical / P1 high / P2 medium), dependencies, acceptance criteria, validation method, affected code areas, risks, status.

Priority legend: **P0** = blocks the workflow stop condition. **P1** = core quality. **P2** = polish.

Source legend: `brief` (PROMPT.md), `repo` (codebase evidence), `derived` (inferred to satisfy brief), `owner-delegated` (planner decision under delegation).

---

## Readiness model (S1, S2, S3)

### FR-01 — Server-derived proposal readiness model
- **Statement.** A server-only function computes a `ProposalReadinessResult` for a given project + selected estimate IDs + recipient set, returning hard blockers (must resolve before Send/Publish) and soft warnings (display but allow).
- **Rationale.** brief "clear readiness checks"; "missing-data blockers". Today only "≥1 sheet" is checked (`actions.ts:807`).
- **Source.** brief + repo.
- **Priority.** P0.
- **Dependencies.** DATA-01, ARCH-01.
- **Acceptance criteria.**
  - AC-FR-01a: returns `{ blockers: ReadinessCheck[], warnings: ReadinessCheck[] }` where each check has `{ id, kind, message, severity, field? }`.
  - AC-FR-01b: blockers is empty ⇔ Send/Publish is permitted by the gate (FR-04).
  - AC-FR-01c: pure function of (project, estimates, recipients, email-config) — no side effects, no persistence.
- **Validation.** Unit test calling the function with crafted inputs covering each blocker + warning case (TEST-01).
- **Affected code.** new `src/lib/proposal-readiness/` (compute + types).
- **Risks.** Drift between readiness model and real send gate → mitigated by FR-04 single gate.
- **Status.** Planned.

### FR-02 — Hard blockers enumerated
- **Statement.** The model raises a blocker for each of: (a) zero estimates selected; (b) all selected estimates have zero priced rows; (c) no currency set on the project; (d) email delivery not configured AND owner intends to email (FR-06 owner intent); (e) project has no client name AND audience=client (warn-vs-block decision in DEC-01).
- **Rationale.** brief "missing-data blockers".
- **Source.** brief + derived (DEC-01 for client-name warn/block).
- **Priority.** P0 (a–d), P1 (e per DEC-01).
- **Dependencies.** FR-01.
- **Acceptance criteria.** Each case maps to a stable `id` (e.g., `no_estimates`, `no_priced_rows`, `no_currency`, `email_not_configured`, `client_name_missing`) returned with a user-facing message.
- **Validation.** Unit test per case (TEST-02).
- **Affected code.** `src/lib/proposal-readiness/`.
- **Status.** Planned.

### FR-03 — Soft warnings enumerated
- **Statement.** The model raises a warning for: (a) published snapshot behind live estimate (stale) — reusing `readPublicationSnapshotStaleness`; (b) unsaved edits in the estimate sheet — reusing `countUnsavedEditableRows`; (c) export model `validationIssues` (`empty_estimate`, `cost_split_compatibility_mode`) elevated to warnings; (d) link expired or revoked (offer republish); (e) no recipients configured yet; (f) client/internal audience mismatch risk (internal-only Source Breakdown would be stripped).
- **Rationale.** brief "stale/source-risk warnings".
- **Source.** brief + repo (`roster-repository.readPublicationSnapshotStaleness`, `proposal-preview-model.countUnsavedEditableRows`, `build-proposal-export-model.validationIssues`).
- **Priority.** P1.
- **Dependencies.** FR-01.
- **Acceptance criteria.** Each warning has stable id + message; warnings never block Send/Publish.
- **Validation.** Unit test per case (TEST-03).
- **Affected code.** `src/lib/proposal-readiness/` (reuses existing helpers; no re-implementation).
- **Status.** Planned.

### FR-04 — Single send/publish gate
- **Statement.** `createProjectPublication` and `republishProjectPublication` call the readiness model server-side and reject with a structured `readiness_blocked` error listing blocker ids when `blockers.length > 0`. No other path may bypass this.
- **Rationale.** brief "missing-data blockers"; closes the gap where only "≥1 sheet" is checked.
- **Source.** brief + repo.
- **Priority.** P0.
- **Dependencies.** FR-01, FR-02.
- **Acceptance criteria.**
  - AC-FR-04a: Send/Publish with any blocker returns `{ ok:false, error:"readiness_blocked", blockers:[...] }` (or the existing action-error shape) and writes nothing.
  - AC-FR-04b: no blocker → existing flow proceeds unchanged.
- **Validation.** Action test asserting rejection for each blocker id (TEST-04).
- **Affected code.** `src/lib/publication/actions.ts` (`createProjectPublication`, `republishProjectPublication`).
- **Risks.** Breaking existing happy-path publishes → mitigated by test asserting unchanged behavior when no blockers.
- **Status.** Planned.

## Readiness surfacing (S1, S6)

### UX-01 — Publisher drawer Preflight surface
- **Statement.** The Publisher drawer surfaces readiness (blockers + warnings) in a clearly labeled area (a new "Readiness" tab or an always-visible Preflight panel above the action buttons) so the owner sees the answer to "is this ready?" before sending.
- **Rationale.** brief "unified readiness checklist".
- **Source.** brief + derived.
- **Priority.** P0.
- **Dependencies.** FR-01, ARCH-02.
- **Acceptance criteria.**
  - AC-UX-01a: blockers render with a destructive tone and disable the primary Send/Republish button.
  - AC-UX-01b: warnings render with a caution tone and do not disable Send/Republish.
  - AC-UX-01c: each check has an accessible name + role (status/alert) and is keyboard reachable.
- **Validation.** DOM test (TEST-05).
- **Affected code.** `src/components/workshop/publisher/PublisherDrawer.tsx` (+ new subcomponent).
- **Status.** Planned.

### UX-02 — Export preview shows readiness hints
- **Statement.** `ProposalExportPreviewDialog` surfaces the same readiness warnings (read-only subset relevant to export: empty/priced/cost-split + audience) in its existing "export notes to review" area, so the owner sees readiness from either entry point.
- **Rationale.** brief "preview states"; avoid splitting the readiness truth.
- **Source.** brief + derived.
- **Priority.** P1.
- **Dependencies.** FR-01, FR-03.
- **Acceptance criteria.** Warnings shown are a subset of the model's warnings, consistent with the drawer.
- **Validation.** DOM test (TEST-06).
- **Affected code.** `src/components/workshop/ProposalExportPreviewDialog.tsx`.
- **Status.** Planned.

## Recipient setup + owner message (S5)

### FR-05 — Owner-composed recipient message
- **Statement.** The owner can compose an optional personal message (subject override + short body, plain text) that is included in the recipient invitation email in addition to the standard CTA. Default subject/body apply when omitted.
- **Rationale.** brief "recipients". Today copy is hardcoded.
- **Source.** brief + derived.
- **Priority.** P1.
- **Dependencies.** DATA-02, SEC-01.
- **Acceptance criteria.**
  - AC-FR-05a: subject ≤ 120 chars, body ≤ 1000 chars; over-limit rejected with field error.
  - AC-FR-05b: message is sanitized (plain text; HTML-escaped on render) — no stored-HTML injection.
  - AC-FR-05c: resend reuses the stored message unless the owner changes it.
  - AC-FR-05d: omitted fields fall back to the current default copy.
- **Validation.** Action test + unit test for sanitization (TEST-07).
- **Affected code.** `src/lib/publication/actions.ts` (`addSharedLinkRecipients`, `sendSharedLinkRecipientInvitationEmail`, `resendSharedLinkRecipientEmail`), `src/components/workshop/publication/RecipientEmailComposer.tsx`, `RecipientInput` type.
- **Risks.** Injection / template confusion → mitigated by SEC-01 plain-text + escape.
- **Status.** Planned.

### UX-03 — Recipient composer message UI
- **Statement.** `RecipientEmailComposer` exposes subject + body inputs (collapsible "Add a personal message") with live char counts and validation feedback.
- **Rationale.** FR-05 UX.
- **Source.** derived.
- **Priority.** P1.
- **Dependencies.** FR-05.
- **Acceptance criteria.** Inputs render, validate on blur, show remaining chars, disable Send when email delivery not configured (existing behavior preserved).
- **Validation.** DOM test (TEST-08).
- **Affected code.** `src/components/workshop/publication/RecipientEmailComposer.tsx`.
- **Status.** Planned.

## Delivery confirmation (S7)

### FR-06 — Honest delivery status surface
- **Statement.** The owner surface (drawer Recipients tab + roster) displays per-recipient `delivery_status` from the set actually knowable: `pending`, `sent`, `opened`, `responded`. `bounced` is shown if/when written but the UI explains bounce data requires a provider webhook not yet wired (REL-01).
- **Rationale.** brief "delivery proof"; honesty about the optimistic `sent`.
- **Source.** brief + repo (`actions.ts:1494` "provider delivery receipts are future work").
- **Priority.** P0.
- **Dependencies.** FR-07.
- **Acceptance criteria.**
  - AC-FR-06a: `sent` is labeled honestly (e.g., "Sent" with tooltip "Accepted by email provider; delivery to inbox not confirmed").
  - AC-FR-06b: `opened` reflects `last_opened_at`.
  - AC-FR-06c: `responded` reflects a submitted decision (FR-07).
- **Validation.** DOM test (TEST-09).
- **Affected code.** `src/components/workshop/publication/RecipientEmailComposer.tsx` status chips + tooltip; `PublisherRosterRow` summary.
- **Status.** Planned.

### FR-07 — `responded` status written on decision
- **Statement.** When a recipient submits a decision (`accepted`/`declined`/`revision_requested`), the recipient row's `delivery_status` is set to `responded` in the same transaction.
- **Rationale.** brief "delivery proof"; closes dead enum branch.
- **Source.** brief + repo.
- **Priority.** P0.
- **Dependencies.** DATA-03.
- **Acceptance criteria.** After `submitSharedLinkDecision`/`submitClientResponse`, a subsequent `listSharedLinkRecipients` returns `delivery_status='responded'` for that recipient.
- **Validation.** Action/repository test (TEST-10).
- **Affected code.** `src/lib/publication/d1-store.ts` (`submitClientResponse`), `src/lib/publication/public-repository.ts` (`submitSharedLinkDecision`).
- **Status.** Planned.

### REL-01 — Bounce/complaint ingestion (BLOCKED-EXTERNAL)
- **Statement.** When an email provider webhook is available, an ingestion route updates `delivery_status='bounced'` and writes `resend_last_event_*`. Until then, the UI honestly states bounce data is unavailable.
- **Rationale.** brief "delivery proof".
- **Source.** brief + repo (no webhook route).
- **Priority.** P1 (deferred slice).
- **Dependencies.** Owner/provider decision (Cloudflare Email Service webhook availability).
- **Acceptance criteria.** Webhook route authenticates the inbound request, idempotently updates the matching recipient row, and is covered by a denial/spoofing test.
- **Validation.** Blocked; see `11`/`15`.
- **Affected code.** new `src/app/api/webhooks/email-events/route.ts` (when unblocked).
- **Status.** BLOCKED-EXTERNAL.

## Notifications (S10)

### FR-08 — `publication_activity` notification dispatch
- **Statement.** On publish/republish, recipient comment, and recipient decision events, a `publication_activity` notification is inserted for the project's owners/managers (subject to the existing digest rate limit).
- **Rationale.** brief owner workflow; closes the stubbed dispatcher.
- **Source.** derived + repo (enum exists, no INSERT).
- **Priority.** P1.
- **Dependencies.** DATA-04 (DISCOVERY-REQUIRED: confirm `notification_deliveries` table exists + shape).
- **Acceptance criteria.** After each event, affected managers have an unread `publication_activity` notification visible via `loadCurrentUserNotifications`.
- **Validation.** Action test (TEST-11).
- **Affected code.** `src/lib/notifications/` (new dispatch function), `src/lib/publication/actions.ts` (call sites).
- **Risks.** Notification spam → mitigated by digest rate-limit reuse + per-event dedup.
- **Status.** Planned (DATA-04 DISCOVERY-REQUIRED may downgrade to BLOCKED-EVIDENCE if the table doesn't exist).

## Resend / revoke coherence (S8)

### FR-09 — Resend/revoke preserve readiness invariants
- **Statement.** `resendSharedLinkRecipientEmail` and `revokeProjectPublication` are unchanged in behavior but the drawer's Send/Resend/Revoke affordances reflect readiness (e.g., Resend disabled while any blocker is active on the publication).
- **Rationale.** brief "resend/revoke flow".
- **Source.** brief + repo.
- **Priority.** P1.
- **Dependencies.** FR-04, UX-01.
- **Acceptance criteria.** Resend/Revoke buttons disabled when a hard blocker applies; otherwise behave as today.
- **Validation.** DOM test (TEST-12).
- **Affected code.** `src/components/workshop/publisher/PublisherDrawer.tsx`, `RecipientEmailComposer.tsx`.
- **Status.** Planned.

## Terms (S12)

### UX-04 — Platform terms surfaced at owner-send
- **Statement.** At the Send step the owner sees a brief, non-blocking note that recipients access the proposal under the Archestimator platform beta terms (link to terms), so the owner understands what the recipient is agreeing to by using the platform.
- **Rationale.** brief "terms".
- **Source.** brief + repo (`terms-content.ts`).
- **Priority.** P2.
- **Dependencies.** none.
- **Acceptance criteria.** Note + link render near the Send action; does not block (no new clickwrap).
- **Validation.** DOM test (TEST-13).
- **Affected code.** `src/components/workshop/publisher/PublisherDrawer.tsx` or `RecipientEmailComposer.tsx`.
- **Status.** Planned.

## Architecture / data / security / perf / rel / ops / test (summary; detail in 06–13)

| ID | Statement | Pri | Source |
|---|---|---|---|
| ARCH-01 | Readiness is a server-only module; client receives a redacted DTO; no internal estimator detail leaks to client preview | P0 | derived |
| ARCH-02 | Reuse existing snapshot redaction (`sanitizeProjectPublicationSnapshotForPublicRead`) for any client-facing readiness preview | P0 | repo |
| ARCH-03 | Optional unified entry: a "Send / Publish" CTA inside `ProposalExportPreviewDialog` that opens the Publisher drawer (v1.1, not blocking v1) | P2 | derived (S9) |
| DATA-01 | Readiness DTO type defined and exported from `proposal-readiness` | P0 | derived |
| DATA-02 | Owner message persisted on `shared_link_recipients` (additive migration `0037`: `invitation_subject`, `invitation_message` nullable) for audit + resend consistency | P1 | derived (DEC-02) |
| DATA-03 | `responded` writer needs no schema change (column already allows it) | P0 | repo |
| DATA-04 | DISCOVERY-REQUIRED: confirm `notification_deliveries`/`notification_definitions` tables exist + shape; if absent, FR-08 becomes BLOCKED-EVIDENCE | P1 | repo |
| SEC-01 | Owner message is plain text + HTML-escaped on render; no raw HTML accepted from client | P0 | derived |
| SEC-02 | Readiness computation does not log or return internal-only fields (Source Breakdown, supplier names) to client DTOs | P0 | derived |
| SEC-03 | New server actions reuse `assertProjectPublicationManager` (manage) / `canReadPublisherRosterProject` (read) | P0 | repo |
| SEC-04 | Notification dispatch does not leak cross-workspace data (scope by workspace_members) | P0 | derived |
| SEC-05 | `responded` flip is scoped to the publication resolved from the recipient token (SEC-06 cross-publication defense applies) — a recipient from pub A cannot flip pub B | P0 | repo (existing SEC-06 mechanism reused) |
| PERF-01 | Readiness computation ≤ 50ms p95 at 1200 nodes / 3000 rows (export cap fixtures); evaluator defined in 09 | P1 | derived |
| PERF-02 | Drawer readiness prefetch parallel with existing drawer data load (no extra round-trip on the critical path) | P1 | derived |
| REL-02 | Readiness gate failure is a structured action error, never a thrown crash; drawer shows recovery CTA | P0 | derived |
| REL-03 | Notification dispatch is best-effort + non-blocking; a dispatch failure does not fail the publish/comment/decision | P0 | derived |
| OPS-01 | Feature flagged via existing rollout mechanism so readiness gate + message + notifications can be dark-shipped and toggled per workspace | P1 | derived |
| OPS-02 | Rollback = disable flag; readiness gate becomes a no-op pass-through (preserve today's behavior) | P0 | derived |
| TEST-01..13 | See acceptance criteria above | — | — |
| DOC-01 | Update current-state log entry on completion; add a decision entry to `.ai/10_state/decisions.md` for DEC-01/DEC-02 | P2 | repo |

---

## Shadow path matrix (core flows)

Legend: cells answer the behavior; ✅ = explicit handling planned/exists; ⚠ = existing handling reused; ❌ = gap with planned fix; ➖ = not applicable.

### Flow 1: Owner publishes/sends a package

| Flow step | Happy | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Compute readiness | ✅ FR-01 | ➖ (returns blockers) | ✅ `no_estimates`/`no_priced_rows` | ➖ | ➖ (server-only) | n/a | ➖ (pure fn) | n/a | warnings/blockers shown | TEST-01/02/03 |
| Send/Publish | ✅ existing | ✅ FR-04 blocks | ✅ FR-04 blocks | ✅ FR-04 blocks | ✅ `assertProjectPublicationManager` | ⚠ Cloudflare Email fail → recipient stays `pending` (existing) | ⚠ existing optimistic lock (`replace_project_publication`) | ⚠ existing `replace` revokes prior | success or `readiness_blocked` | TEST-04 |
| Send recipient email | ✅ existing + FR-05 message | ✅ falls back to default copy | ➖ | ✅ FR-05 length reject | ➖ | ⚠ existing circuit breaker | ➖ | ⚠ send-before-persist (existing MOD-REC-02) | "Sent" honest label | TEST-07 |

### Flow 2: Recipient decides → owner sees `responded`

| Step | Happy | Missing field | Empty | Invalid | Auth denied | Network err | Race | Retry | User result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Submit decision | ✅ existing | ✅ existing (signer_name on accept) | ➖ | ✅ existing dedup | ✅ SEC-06 cross-pub | ⚠ D1 error → action error | ⚠ dedup UNIQUE | ⚠ idempotent per (recipient,publication) | decision recorded | TEST-10 |
| Flip `responded` | ✅ FR-07 | ➖ | ➖ | ➖ | ➖ | ⚠ same txn as decision | ⚠ same txn | ⚠ same | owner sees `responded` | TEST-10 |

### Flow 3: Owner resend / revoke

| Step | Happy | Nil | Empty | Invalid | Auth | Network | Race | Retry | User result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Resend | ✅ existing | ➖ | ➖ | ✅ unsubscribed/self blocked | ✅ manage gate | ⚠ send-before-persist | ⚠ optimistic lock | ⚠ rate limit | new link emailed | TEST-12 |
| Revoke | ✅ existing | ➖ | ➖ | ➖ | ✅ manage gate | ⚠ D1 | ⚠ row-level | ⚠ idempotent | link 404s | TEST-12 |
| Readiness gating on Resend/Revoke | ✅ FR-09 (disabled while blocked) | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | buttons disabled | TEST-12 |

### Flow 4: Notification dispatch

| Step | Happy | Nil | Empty | Invalid | Auth | Network | Race | Retry | User result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Dispatch | ✅ FR-08 | ➖ | ➖ | ➖ | ✅ workspace-scoped | ⚠ best-effort (REL-03) | ⚠ dedup per event | ⚠ digest rate limit | unread count bumps | TEST-11 |

Full adversarial matrix (hostile/edge cases beyond shadow paths) is in `19`.
