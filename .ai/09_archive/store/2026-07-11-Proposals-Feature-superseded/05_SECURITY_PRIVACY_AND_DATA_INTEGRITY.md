# 05 — Security, Privacy, and Data Integrity

---

## 1. Credential Taxonomy

| Credential | Storage | Visibility | Use | Rotation/Revocation |
|---|---|---|---|---|
| Publication token (raw) | `project_publications.encrypted_token` (encrypted at rest) | Never in DB queries for recipient inbox; decrypted server-side only in `openRecipientProposalAction` | URL path `/share/[token]` | Rotated by `rotateProjectPublicationLink` |
| Publication token hash | `project_publications.token_hash` (scrypt/hash) | Used for DB lookup by the share API route | Internal index only | Rotated with token |
| Recipient token (raw) | `shared_link_recipients.recipient_token_hash` (hashed) | Never raw in DB; raw token only in email link `?recipient=<token>` | Session establishment via `/api/share/[token]/session` | Invalidated (prefixed `revoked:`) on token rotation |
| Password hash | `project_publications.password_hash` (scrypt) | Used for password gate verification | Share page password protection | Rotated with token |
| Session cookie | `shared-link-session-v1` (signed HttpOnly) | Client cookie | Recipient session on share page | Expired on DELETE session |
| Signature intent hash | `shared_link_responses.signature_intent_hash` (sha256) | Stored in DB | Decision audit trail | Not rotatable (immutable decision record) |

---

## 2. Recipient Inbox Security Boundaries

### 2.1 What the inbox query can access

The `listRecipientProposals()` query selects ONLY:
- `publication.id` (publication ID — used for the `openRecipientProposalAction` form)
- `publication.project_id`, `publication.workspace_id`
- `project.name`, `project.project_code`
- `workspace.name`
- `sender.display_name` (from `profiles`)
- `publication.status`, `published_at`, `expires_at`, `revoked_at`, `snapshot_version`
- `recipient.last_opened_at` (for `hasOpened`)
- `response.decision` (latest decision)

### 2.2 What the inbox query MUST NOT access

- ❌ `publication.token_hash` — credential
- ❌ `publication.encrypted_token` — credential
- ❌ `publication.password_hash` — credential
- ❌ `publication.snapshot_json` — full estimate data (not needed for inbox; only for share page)
- ❌ `recipient.recipient_token_hash` — credential
- ❌ `recipient.email` of OTHER recipients — privacy
- ❌ Internal estimate rows, cost library data, supplier info — not recipient-visible

### 2.3 Existing proof

The existing test `recipient-proposals-repository.test.ts` asserts the query
does not select token hashes, encrypted tokens, or password hashes. **This test
must be preserved and must continue to pass after any query changes.**

### 2.4 The `openRecipientProposalAction` flow

```
ProposalRow form (publicationId hidden input)
  → openRecipientProposalAction(_prev, formData)
    → validate publicationId UUID
    → callProcedure("authorize_recipient_publication_for_current_user", { publicationId })
      → verify lower(recipient.email) = currentUserEmail for this publication
    → check publication availability (status, expiry)
    → decrypt encrypted_token server-side
    → set shared-link session cookies (passwordless only)
    → redirect("/share/<raw-token>")
```

**Security properties:**
- The raw token is never sent to the client — it's used only in the redirect URL.
- The redirect is a server-side `redirect()`, not a client-side navigation.
- If the publication is password-protected, the action does NOT set session
  cookies — the user must enter the password on the share page.
- Error codes (`not-a-recipient`, `unavailable`, `invalid`) are generic enough
  to prevent enumeration.

---

## 3. Anti-Enumeration

### 3.1 Inbox query

The inbox query filters by `lower(recipient.email) = currentUserEmail`. A user
can only see proposals sent to their own email. There is no way to enumerate
other recipients' proposals.

### 3.2 Share route

The share route (`/api/share/[token]`) returns:
- 404 for unknown/unavailable tokens (not 403) — prevents token enumeration.
- 423 if password is required.
- 429 if rate-limited.

### 3.3 `openRecipientProposalAction` error codes

- `not-a-recipient` — the signed-in email does not match any recipient for this publication. This is a legitimate error (wrong account), not an enumeration vector, because the user must already know the `publicationId` (from their inbox).
- `unavailable` — the publication is expired/revoked. Generic enough.
- `invalid` — the `publicationId` is malformed. Generic.

---

## 4. Snapshot Version Integrity

### 4.1 Version drift

When a publication is republished, a new `project_publications` row is created
with an incremented `snapshot_version`. The old row is revoked.

The `RecipientProposalRow.snapshotVersion` reflects the version the recipient
was invited to. If the publication has been republished:
- The old row's status becomes `revoked`.
- The recipient appears in the new row's `shared_link_recipients` (if re-invited).
- The inbox shows the new row (with the new version) and the old row (as revoked).

### 4.2 Decision version locking

The decision API (`/api/share/[token]/decision`) checks `snapshot_version`:
- If the recipient's session was established against version N, and the
  publication is now version N+1, the decision POST returns 409.
- This prevents decisions against stale snapshots.

---

## 5. XLSX Export Audience Policy

### 5.1 Server-gated audience resolution

The export API route resolves the audience server-side:
- `internal` — if the requester is a workspace member.
- `client` — if the requester is not a workspace member (or unauthenticated).

### 5.2 `applyAudiencePolicy`

For `client` audience, the policy strips:
- Source Breakdown worksheet (supplier/cost-source data).
- Supplier names in row breakdowns.
- Internal cost breakdowns.

This is enforced server-side in `settings.ts`, not derived from client request
parameters. The client cannot bypass it by passing `audience=internal` in the
URL.

---

## 6. Rate Limiting

| Surface | Limiter | Scope |
|---|---|---|
| Share route (snapshot read) | `checkProjectPublicationSnapshotRateLimit` | Per IP + token |
| Share event (open/password) | `checkProjectPublicationEventRateLimit` | Per IP + token |
| Session start | `checkSharedLinkSessionStartRateLimit` | Per IP |
| Password attempt | `checkProjectPublicationPasswordRateLimit` | Per IP (5 attempts, 15min lockout) |
| Comment post | `checkSharedLinkCommentRateLimit` | Per recipient + publication |
| Decision post | `checkSharedLinkDecisionRateLimit` | Per recipient + publication |
| XLSX export | `checkProposalExportRateLimit` | Per user + IP |

All rate limiters use the `security_rate_limit_events` D1 table with a
reserve-then-confirm pattern.

---

## 7. CSRF Protection

- Share route POST endpoints (comment, decision) use `assertSameOriginPublicPost` CSRF check.
- The `openRecipientProposalAction` is a server action (React's built-in CSRF protection applies).
- The session cookie is signed and HttpOnly.

---

## 8. Privacy Boundaries Summary

| Data | Recipient-visible? | Via |
|---|---|---|
| Project name, code | Yes | Inbox row |
| Workspace name | Yes | Inbox row |
| Sender display name | Yes | Inbox row |
| Publication status, dates | Yes | Inbox row |
| Decision (own) | Yes | Inbox row |
| Estimate snapshot data | Yes (sanitized) | Share page only |
| Other recipients' emails | No | Never |
| Token hashes, encrypted tokens | No | Never in any query |
| Password hashes | No | Never in any query |
| Cost library / supplier data | No (client audience) | Stripped by `applyAudiencePolicy` |
| Internal estimate breakdowns | No (client audience) | Stripped by `applyAudiencePolicy` |
| Publication open_count | No (owner analytics) | Not in inbox query |
| Recipient tokens of others | No | Never |
| Workspace name in XLSX (client audience) | **YES (LEAK)** | `route.ts:241` sets `contractorName = workspace.name`; `applyAudiencePolicy` does NOT strip it. **UNIT-016 fixes this.** |

---

## 9. Security Audit Items for Implementation

1. **Preserve the credential-free repository assertion.** If `clientName` is added to the query (DEC-AUTO-005/DEC-AUTO-007), ensure it doesn't inadvertently select sensitive columns. Make `clientName` optional to avoid breaking test files.
2. **Verify the `openRecipientProposalAction` redirect.** The raw token appears in the redirect URL — ensure it's not logged in any client-visible state, error message, or analytics event.
3. **Verify rate limiters are still wired.** The Publisher-And-Shared-Pages redesign may have changed API route structure — verify all limiters are still applied.
4. **Verify the `download_attempt_blocked` event type.** If any code references it, remove the reference (it was dropped in migration 0066).
5. **No new credentials.** The inbox redesign must not introduce new token handling, new credentials, or new API endpoints that expose publication data.
6. **Fix contractor-name leak (UNIT-016).** `route.ts:241` uses `workspace.name` as the contractor name in XLSX exports. For client-audience exports, this leaks the workspace name. `applyAudiencePolicy` must strip it or the fallback must use a neutral placeholder.
7. **Cache isolation boundary (DEC-AUTO-008).** `revalidatePath("/workshop/proposals")` does not invalidate the TanStack Query client cache. This is accepted for beta — the 30s staleTime + window-focus refetch is sufficient. No security implication (no stale-data leak — the data is the recipient's own proposals).

---

## 10. Contractor-Name Leak Detail (Improve-Stage Finding)

**The leak:** `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:241` sets `contractorName = workspace.name` as a fallback when no contractor profile exists. This name is written into the XLSX workbook's title block as "Bidder / Contractor" (`create-proposal-workbook.ts:297`).

**Why it's a problem:** For client-audience exports, the workspace name is internal data. The client should not see the estimator's workspace/company name unless explicitly configured. `applyAudiencePolicy` in `settings.ts` strips the Source Breakdown worksheet and supplier names for client audience, but does NOT strip the contractor name from the metadata.

**Fix (UNIT-016):**
1. Replace `contractorName = workspace.name` with a proper contractor profile lookup. If no profile exists, use a neutral placeholder (e.g., `"[Contractor Name]"` or omit the field).
2. Extend `applyAudiencePolicy` to strip the workspace name from the export metadata for client audience.
3. Add a server-side redaction verification check that scans the workbook output for the workspace name before sending.
