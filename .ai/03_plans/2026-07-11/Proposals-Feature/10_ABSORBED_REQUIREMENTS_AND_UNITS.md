# 10 — Absorbed Requirements and New Units

> Improve-stage artifact. Defines the new requirements and implementation units
> absorbed from the 2026-07-07 stale plans (see `09_STALE_PLAN_RECONCILIATION.md`).

---

## New Requirements

| ID | Type | Requirement | Source plan | Unit IDs | completion_role |
|---|---|---|---|---|---|
| REQ-011 | Functional | Wrong-account recovery CTA on ProposalRow when `openRecipientProposalAction` returns `not-a-recipient` — differentiated "Sign in with the right account" CTA | IA-recovery FR-06 | UNIT-011 | CORE |
| REQ-012 | Functional | Share page terminal states: differentiated copy for expired/revoked/invalid; `error.tsx` boundary under `src/app/share/[token]/`; "View all your proposals" link from share session banner to `/workshop/proposals` | IA-recovery FR-09/10, FR-02 | UNIT-012 | CORE |
| REQ-013 | Functional | Publisher preflight model + owner-composed recipient message (deferred — documented only, not implemented in this pack) | client-ready FR-01..05 | (none) | AUXILIARY |
| REQ-014 | Functional | Wire `responded` delivery_status in `submitClientResponse` when a recipient submits a decision | client-ready FR-07 | UNIT-014 | CORE |
| REQ-015 | Functional | Recipient-side staleness surface on `/share/[token]` — show a staleness warning when the snapshot is stale relative to the source estimates | export-trust FR-3/4 | UNIT-015 | CORE |
| REQ-016 | Functional | Fix contractor-name leak in XLSX export (workspace name used as contractor) and add redaction verification for client-audience exports | export-trust FR-5 | UNIT-016 | CORE |
| UX-007 | UX | Wrong-account CTA is keyboard-accessible and uses plain language, no token/recipient enumeration | IA-recovery UX-04 | UNIT-011 | CORE |
| UX-008 | UX | Terminal states use differentiated copy with `<h1>` + `<p>` hierarchy and "Ask the sender" recovery path | IA-recovery UX-06 | UNIT-012 | CORE |
| SEC-002 | Security | Contractor-name fallback does not leak workspace name in client-audience XLSX exports | export-trust FR-5 | UNIT-016 | CORE |
| DATA-003 | Data | `responded` delivery_status is written transactionally with decision insertion | client-ready FR-07 | UNIT-014 | CORE |

---

## New Implementation Units

### UNIT-011: Wrong-Account Recovery CTA on ProposalRow

**Goal:** When `openRecipientProposalAction` returns `not-a-recipient`, show a differentiated "Sign in with the right account" CTA instead of plain text.

**Linked requirements:** REQ-011, UX-007
**Depends on:** UNIT-002 (card component exists)
**Source plan:** IA-recovery FR-06

**Exact paths and current symbols:**
- `src/components/workshop/proposals-page/ProposalRow.tsx:67` — `readActionErrorMessage("not-a-recipient")` returns plain text: "Open the link from your email invitation, or ask the sender to invite your signed-in email."
- `src/components/workshop/proposals-page/ProposalRow.tsx:160-163` — error rendered as `<p role="alert">` with no CTA.

**Approach:**
1. When `actionState.error === "not-a-recipient"`, render a differentiated recovery block: a "Sign in with the right account" link/button that signs the user out and redirects to login.
2. The CTA uses Better Auth's sign-out flow (check how other components handle sign-out — search for existing sign-out patterns).
3. Do NOT proactively scan for wrong-account (no recipient enumeration). Only show the CTA reactively after `not-a-recipient` error.
4. Preserve the existing generic error messages for `unavailable` and `invalid`.

**Invariants:**
- No token/recipient enumeration.
- CTA is keyboard-accessible (native button/link).
- No sensitive data in the error message.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)
**Test rationale:** UI error-handling change verifiable by source inspection.

**Proof:** Source inspection confirms differentiated CTA for `not-a-recipient`.

**Failure response:** If no sign-out pattern exists in the codebase, use a plain link to `/login` with a redirect-back parameter.

---

### UNIT-012: Share Page Terminal States + "View All Proposals" Link

**Goal:** Differentiated expired/revoked/invalid copy on `/share/[token]`; `error.tsx` boundary; "View all your proposals" link from the share session banner.

**Linked requirements:** REQ-012, UX-008
**Depends on:** UNIT-007 (share audit complete)
**Source plan:** IA-recovery FR-09/10, FR-02

**Exact paths and current symbols:**
- `src/app/share/[token]/not-found.tsx` — uses generic `SHARED_LINK_UNAVAILABLE_COPY` from `src/lib/publication/share-copy.ts:1-4`.
- `src/lib/publication/public-repository.ts:127` — `isActivePublication()` returns bare boolean, no reason.
- `src/lib/publication/public-repository.ts:666-682` — `resolveProjectPublicationAccessByToken` returns `null` for both revoked and expired.
- `src/components/share/SharePageSessionBanner.tsx:30-52` — shows "You are reviewing as {email}" + "Not you?" but no link to `/workshop/proposals`.
- No `error.tsx` exists under `src/app/share/`.

**Approach (phased):**
1. **Resolver change (prerequisite):** Modify `resolveProjectPublicationAccessByToken` to return an inactive-reason (`"expired" | "revoked" | "unavailable"`) instead of bare `null`. This is a contract change — map all callers.
2. **Terminal copy:** Use the inactive-reason to render differentiated copy:
   - Expired: "This proposal has expired." + "Ask the sender for a fresh link."
   - Revoked: "This proposal is no longer available." + "Ask the sender for a fresh link."
   - Unknown: generic "This shared proposal is unavailable." (anti-enumeration).
3. **`error.tsx`:** Create `src/app/share/[token]/error.tsx` — client error boundary with recovery surface + "Ask the sender" CTA.
4. **"View all your proposals" link:** Add to `SharePageSessionBanner` when a valid P5 session exists — link to `/workshop/proposals`.

**Invariants:**
- Anti-enumeration: unknown tokens always return generic copy.
- No metadata leak in terminal states.
- `<h1>` + `<p>` hierarchy for screen readers.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)
**Test rationale:** Terminal-state copy is verifiable by source inspection. The resolver change is a type-level contract change verifiable by `tsc --noEmit`.

**Proof:** `tsc --noEmit` for resolver change; source inspection for terminal copy and link.

**Failure response:** If the resolver change is too invasive (too many callers), defer to a separate `getInactiveReason()` helper that queries the publication status without changing `resolveProjectPublicationAccessByToken`'s return type.

---

### UNIT-013: Publisher Preflight + Owner Message (DEFERRED)

**Goal:** Document the publisher preflight and owner-composed message requirements for a future publisher improvement pack.

**Linked requirements:** REQ-013 (AUXILIARY)
**Depends on:** None (documentation only)
**Source plan:** client-ready FR-01..05

**Status:** DEFERRED — out of scope for the inbox-focused improvement pack. Documented for a future publisher improvement plan. No implementation unit.

---

### UNIT-014: Wire `responded` Delivery Status

**Goal:** When a recipient submits a decision, update `shared_link_recipients.delivery_status` to `'responded'` in the same transaction.

**Linked requirements:** REQ-014, DATA-003
**Depends on:** None (independent data-layer fix)
**Source plan:** client-ready FR-07

**Exact paths and current symbols:**
- `src/lib/publication/d1-store.ts:717-823` — `submitClientResponse` does `INSERT INTO shared_link_responses` (line 791) but NO `UPDATE shared_link_recipients SET delivery_status='responded'`.
- Only `delivery_status` writes in the store: `SET delivery_status = 'opened'` (lines 377, 410).
- The UI already handles `responded`: `RecipientEmailComposer.tsx:50`, line 245, lines 673-685.

**Approach:**
1. In `submitClientResponse` (`d1-store.ts`), after the successful `INSERT INTO shared_link_responses`, add `UPDATE shared_link_recipients SET delivery_status = 'responded' WHERE id = ?recipientId`.
2. This must be in the same D1 batch/transaction as the response insert to ensure atomicity.
3. Verify `submitSharedLinkDecision` in `public-repository.ts` calls `submitClientResponse` (it should — it's the service-layer wrapper).

**Invariants:**
- The `UPDATE` is transactional with the `INSERT`.
- The `delivery_status` CHECK constraint already allows `'responded'` (migration 0014:67, 0066:167).
- No schema migration needed — the enum value already exists.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)
**Test rationale:** A single `UPDATE` statement in an existing function. Source inspection confirms the statement is present and correctly scoped.

**Proof:** Source inspection of `submitClientResponse` confirms the `UPDATE` statement.

**Failure response:** If D1 doesn't support multi-statement transactions in the same `batch()`, use a sequential `db.batch([...])` with both statements.

---

### UNIT-015: Recipient-Side Staleness Surface

**Goal:** Show a staleness warning on `/share/[token]` when the snapshot is stale relative to the source estimates.

**Linked requirements:** REQ-015
**Depends on:** UNIT-012 (share page improvements context)
**Source plan:** export-trust FR-3/4

**Exact paths and current symbols:**
- `readPublicationSnapshotStaleness` — already implemented, used in `src/lib/publisher/roster-repository.ts:325-328` for the manager-side `staleSnapshotWarning`.
- `src/app/share/[token]/page.tsx` — does NOT compute or render staleness.

**Approach:**
1. Call `readPublicationSnapshotStaleness` (or equivalent) in the share page server component.
2. If stale, render a non-blocking banner: "This proposal may not reflect the latest changes. Ask the sender for an updated link."
3. The staleness check compares `snapshot_version` / `published_at` against the current estimate data's revision.

**Invariants:**
- Staleness warning is non-blocking (the recipient can still review).
- No internal estimate data leaks (only a boolean "is stale" + generic copy).
- The warning uses `role="status"` for screen readers.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)
**Test rationale:** A banner rendering a boolean. Source inspection confirms the check and banner.

**Proof:** Source inspection confirms `readPublicationSnapshotStaleness` is called and the banner is rendered.

**Failure response:** If `readPublicationSnapshotStaleness` is not callable from the share page context (it may be scoped to the publisher), create a share-scoped wrapper.

---

### UNIT-016: Fix Contractor-Name Leak + Redaction Verification

**Goal:** Remove the workspace-name-as-contractor fallback in XLSX exports; add redaction verification for client-audience exports.

**Linked requirements:** REQ-016, SEC-002
**Depends on:** UNIT-009 (export audit complete)
**Source plan:** export-trust FR-5

**Exact paths and current symbols:**
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:241` — `contractorName = workspace.name`.
- `src/lib/proposal-export/types.ts:35-38` — documents this as "D4 interim (workspace name) until a contractor profile lands."
- `src/lib/proposal-export/create-proposal-workbook.ts:297` — writes `contractorName` as "Bidder / Contractor" in the title block.
- `src/lib/proposal-export/settings.ts` — `applyAudiencePolicy` drops Source Breakdown for client audience but does NOT address the contractor name.

**Approach:**
1. Replace `contractorName = workspace.name` with a proper contractor profile lookup. If no contractor profile exists, use a placeholder like `"Contractor"` or omit the field (not the workspace name).
2. For client-audience exports, verify that `applyAudiencePolicy` strips ALL internal data: source breakdown, supplier names, AND the workspace name.
3. Add a redaction verification check (can be a code-level assertion, not a test) that scans the workbook output for internal tokens before sending.
4. The `applyAudiencePolicy` function in `settings.ts` should also strip the workspace name from the metadata for client audience.

**Invariants:**
- Workspace name never appears in client-audience XLSX exports.
- `applyAudiencePolicy` is the single enforcement point.
- The redaction check is server-side, not client-side.

**Test requirement:** NOT_REQUIRED (test_trigger: NONE)
**Test rationale:** Source inspection confirms the fallback is removed and `applyAudiencePolicy` strips workspace name. The redaction check is a code-level assertion verifiable by reading the code.

**Proof:** Source inspection of `route.ts` (no `workspace.name` as contractor), `settings.ts` (workspace name stripped for client audience), and the redaction check function.

**Failure response:** If a contractor profile doesn't exist yet, use a neutral placeholder (`"[Contractor Name]"`) and document the gap.

---

## Updated Execution DAG

```
Layer 0 (no blockers):
  UNIT-001: Adopt WorkshopCollectionLayout for proposals inbox
  UNIT-002: Build ProposalCard component
  UNIT-009: Audit XLSX export pipeline edge cases
  UNIT-014: Wire responded delivery_status (independent data fix)

Layer 1 (depends on UNIT-001, UNIT-002):
  UNIT-003: Add status tabs, search, sort, view-mode controls
  UNIT-004: Add grouping (by workspace / status)
  UNIT-011: Wrong-account recovery CTA (depends on UNIT-002)

Layer 2 (depends on UNIT-003):
  UNIT-005: Data layer — enrich RecipientProposalRow (clientName optional)
  UNIT-006: Skeleton, empty states (incl. forked wrong-email), error states parity

Layer 3 (depends on UNIT-006, UNIT-009):
  UNIT-007: Share/review surface audit
  UNIT-016: Fix contractor-name leak (depends on UNIT-009)

Layer 4 (depends on UNIT-007):
  UNIT-012: Share page terminal states + "View all proposals" link
  UNIT-015: Recipient-side staleness surface

Layer 5 (depends on UNIT-007, UNIT-008):
  UNIT-010: Stale-plan reconciliation + current-state.md update
  UNIT-008: Publisher flow audit
```

**Critical path:** UNIT-001 → UNIT-002 → UNIT-003 → UNIT-006 → UNIT-007 → UNIT-012 → UNIT-010
