# 04 — Data, API, and Repository Design

---

## 1. Current Data Layer

### 1.1 Recipient Proposals Repository

**File:** `src/lib/repositories/recipient-proposals-repository.ts` (server-only)

**Function:** `listRecipientProposals(): Promise<RecipientProposalsResult>`

**Query:** Single D1 SQL query joining:
```
shared_link_recipients recipient
  INNER JOIN project_publications publication ON publication.id = recipient.publication_id
  INNER JOIN projects project ON project.id = publication.project_id
  INNER JOIN workspaces workspace ON workspace.id = publication.workspace_id
  LEFT JOIN profiles sender ON sender.id = publication.published_by
  LEFT JOIN shared_link_responses response ON response.id = (latest per recipient)
WHERE lower(recipient.email) = ?currentUserEmail
  AND publication.status IN ('published', 'expired', 'revoked')
ORDER BY last_activity_at DESC, publication.published_at DESC, publication.id DESC
LIMIT 50
```

**Status derivation (in SQL):**
```sql
CASE
  WHEN publication.status = 'revoked' OR publication.revoked_at IS NOT NULL THEN 'revoked'
  WHEN publication.status = 'expired' OR (publication.expires_at IS NOT NULL AND publication.expires_at <= ?now) THEN 'expired'
  ELSE 'published'
END
```

**Return type:**
```typescript
type RecipientProposalsResult =
  | { ok: true; rows: RecipientProposalRow[] }
  | { ok: false; error: "unauthorized" | "unknown" };

type RecipientProposalRow = {
  publicationId: string;
  projectId: string;
  projectName: string;
  projectCode: string | null;
  workspaceId: string;
  workspaceName: string;
  senderDisplayName: string | null;
  status: "published" | "expired" | "revoked";
  hasOpened: boolean;
  decision: "accepted" | "declined" | "revision_requested" | null;
  lastActivityAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  snapshotVersion: number;
};
```

### 1.2 Server Action

**File:** `src/lib/recipient-proposals/actions.ts`

**Function:** `loadRecipientProposals()` — calls `requireCurrentUserContext()` then `listRecipientProposals()`. Thin wrapper for TanStack Query consumption.

---

## 2. Target Data Layer (V1 — No Schema Changes)

### 2.1 Decision: Client-Side Filtering/Sorting (DEC-AUTO-003)

The recipient list is capped at 50 rows. Client-side filtering and sorting on
the cached `rows` array is sufficient and avoids server round-trips.

**No changes to the repository query or server action for V1.** The existing
`listRecipientProposals()` returns all 50 rows; the client component filters
and sorts them in memory.

### 2.2 Optional: Enrich `RecipientProposalRow` (DEC-AUTO-005 + DEC-AUTO-007)

The current row type lacks some display fields that would enrich the card. The
query already joins `projects`, so adding columns is low-risk.

**Decision:** Add `client_name` to the SELECT as an OPTIONAL field
(`clientName?: string | null` per DEC-AUTO-007). Do NOT add `location`
(governed by `location_visibility`). Do NOT add `open_count` (owner analytics).

**Test compatibility (improve-stage finding — DEC-AUTO-007):**
Adding `clientName` affects these test files:
- `tests/vitest/recipient-proposals-repository.test.ts:91-112` — strict `toEqual`. Making the field optional means the `toEqual` passes if both actual and expected omit it. The credential-free regex assertions (lines 117, 119) do NOT match `clientName` — safe.
- `tests/vitest/recipient-proposals-page.test.tsx:40-59` — `proposal()` factory. An optional field doesn't break the factory's type-check.
- `tests/vitest/recipient-proposals-action.test.ts` and `tests/vitest/recipient-proposals-route-gate.test.ts` — do not import `RecipientProposalRow` by name; agnostic to row fields.

**Test decision reclassified:** UNIT-005 changes from `TARGETED` / `MVP_CRITICAL_INVARIANT` / `CHEAPEST_DECISIVE_EXISTING_TEST` to `NOT_REQUIRED` / `NONE`. Source inspection of the SELECT clause diff is the cheapest decisive proof. See `11_IMPLEMENTATION_REFERENCE_PATTERNS.md` §10.

### 2.3 `responded` Delivery Status Wiring (UNIT-014)

The `responded` enum value exists in the DB CHECK constraint (`0014:67`, `0066:167`) and the UI handles it (`RecipientEmailComposer.tsx:50,245,673-685`), but `submitClientResponse` (`d1-store.ts:717-823`) never writes it — only `SET delivery_status = 'opened'` at lines 377, 410.

**Fix (UNIT-014):** In `submitClientResponse`, after the successful `INSERT INTO shared_link_responses`, add `UPDATE shared_link_recipients SET delivery_status = 'responded' WHERE id = ?recipientId` in the same D1 batch. No schema migration needed — the enum value already exists.

### 2.4 Cache Invalidation Strategy (DEC-AUTO-008)

`revalidatePath("/workshop/proposals")` in `src/lib/publication/actions.ts:745` purges the RSC data cache but does NOT invalidate the TanStack Query client cache (`["recipient-proposals", userEmail]`).

**Decision:** Accept the gap for beta. The 30s staleTime + `refetchOnWindowFocus: true` + manual Refresh button is sufficient. The inbox is not a real-time collaboration surface. See `11_IMPLEMENTATION_REFERENCE_PATTERNS.md` §7 and DEC-AUTO-008.

### 2.5 Pagination (Deferred)

The LIMIT 50 is sufficient for beta. If a recipient has >50 proposals (unlikely
for beta), they are silently truncated. A "load more" or cursor-based pagination
can be added later if needed.

**No pagination work for V1.** Document the 50-row limit in the empty state or
a subtle "showing latest 50" indicator if the count equals 50.

---

## 3. XLSX Export Pipeline Audit

### 3.1 Current Architecture

```
Estimate Sheet UI
  └── ProposalExportPreviewDialog (client)
        └── useEstimateProposalPreview hook
              ├── buildProposalExportModel (client-side model build)
              ├── createProposalPreviewSignature (staleness check)
              └── fetch /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx
                    └── API route (Node runtime, maxDuration=60)
                          ├── resolve audience (client|internal)
                          ├── rate limit (checkProposalExportRateLimit)
                          ├── load estimate tree (single tab or all tabs)
                          ├── buildProposalExportModel (server-side)
                          ├── applyAudiencePolicy (strip internal data for client audience)
                          ├── createProposalWorkbook (ExcelJS)
                          └── return .xlsx blob
```

### 3.2 Audit Findings

| Finding | Severity | Description | Fix |
|---|---|---|---|
| Currency hardcoded to PHP | P2 | `create-proposal-workbook.ts` uses `[$₱-3409]` peso format. The project's `currency_code` field exists but is not wired into the workbook format. | Wire `currency_code` from project metadata into the workbook number format. Low-risk, fix-forward. |
| No Zod validation | P2 | All search-param and body parsing is hand-rolled. Inconsistent with potential Zod adoption elsewhere. | Consider adding Zod schemas for the export route's search params. Not blocking. |
| `download_attempt_blocked` dropped | P2 | Migration 0014 defined this event type; migration 0066's CHECK constraint recreation silently dropped it. Any code relying on it would fail. | Verify no code references this event type. If found, remove the reference. |
| Empty estimate edge case | P2 | No documented test for exporting an estimate with zero rows or a single row. | Add a manual or targeted test for empty/single-row export. |
| Negative quantity edge case | P2 | No documented validation for negative quantities in the export. | Verify the model builder handles negative values gracefully. |
| Audience policy is server-gated | OK | `applyAudiencePolicy` strips Source Breakdown + supplier info for `client` audience. Server-gated, not wire-derived. | No action needed. |
| Staleness detection | OK | `createProposalPreviewSignature` detects unsaved changes and shows a stale-preview badge. | No action needed. |

### 3.3 Export Decision (DEC-AUTO-006)

The XLSX export pipeline is architecturally sound. Audit findings are fix-forward
patches, not rewrites. The primary action item is wiring `currency_code` into
the workbook format and verifying edge cases.

---

## 4. Share/Review Surface API Audit

### 4.1 API Routes (Current)

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/share/[token]` | GET | Resolve publication, return snapshot | Token-based, password cookie |
| `/api/share/[token]/session` | GET/POST/DELETE | Recipient session management | Recipient token |
| `/api/share/[token]/comment` | GET/POST | Comments | Recipient session + CSRF |
| `/api/share/[token]/decision` | GET/POST | Decision (accept/decline/revision) | Recipient session |
| `/api/share/[token]/activity` | GET | Activity feed | Recipient session |
| `/api/share/[token]/password` | (verify) | Password gate | Public |
| `/api/share/[token]/unsubscribe` | (verify) | One-click unsubscribe | Recipient token |

### 4.2 Audit Items

1. **Snapshot version drift:** The decision API returns 409 on version mismatch. Verify the inbox reflects stale versions (the `snapshotVersion` field is already in `RecipientProposalRow`).
2. **Anti-enumeration:** The share route returns 404 for unknown tokens (not 403). Verify this is still the case after the Publisher-And-Shared-Pages redesign.
3. **Rate limiting:** Multiple rate limiters exist (`checkProjectPublicationSnapshotRateLimit`, `checkSharedLinkDecisionRateLimit`, etc.). Verify they are wired correctly.
4. **E-signature:** The `signature_intent_hash` is `sha256(publicationId:snapshotVersion:signerName:submittedAt)` — an intent hash, not a cryptographic signature. This is documented and acceptable for beta.

---

## 5. Publisher Flow API Audit

### 5.1 Server Actions (Current)

| Action | Purpose | Revalidates |
|---|---|---|
| `createProjectPublication` | Build snapshot, persist, mint token | `/workshop/proposals`, `/workshop/publisher`, project page |
| `republishProjectPublication` | Supersede prior, new snapshot | Same |
| `rotateProjectPublicationLink` | Token rotation, invalidate recipients | Same |
| `revokeProjectPublication` | Set status to `revoked` | Same |
| `addSharedLinkRecipients` | Invite clients | Same |
| `resendSharedLinkRecipientEmail` | Resend invitation | Same |
| `removeSharedLinkRecipient` | Remove recipient | Same |

### 5.2 Audit Items

1. **Revalidation:** All publication mutations revalidate `/workshop/proposals`. Verify this works with the new TanStack Query + `WorkshopCollectionLayout` pattern (the `router.refresh()` from revalidation should invalidate the RSC cache; TanStack Query's `refetchOnWindowFocus` handles the client cache).
2. **Emulated procedures:** The `admin-d1-client.ts` emulates 5 stored procedures in TypeScript. Verify `replace_project_publication` correctly revokes prior live publications before inserting new ones.
3. **Recipient token invalidation:** `rotate_project_publication_credentials` prefixes revoked tokens with `revoked:`. Verify this doesn't break the recipient inbox query (it filters by `email`, not token).

---

## 6. Type Safety

### 6.1 Current State

- `RecipientProposalRow` is a well-typed TypeScript interface.
- `RecipientProposalsResult` is a discriminated union (`{ ok: true } | { ok: false }`).
- `OpenRecipientProposalActionState` is a typed error union.
- No Zod schemas in the publication/proposal libraries — validation is hand-rolled.

### 6.2 Target

- Preserve existing TypeScript types.
- Add `client_name` to `RecipientProposalRow` if the card design requires it (DEC-AUTO-005).
- No Zod adoption for V1 (not blocking; document as a consistency gap).

---

## 7. Performance Considerations

### 7.1 Query Performance

The `listRecipientProposals()` query is a 5-table join with a subquery for the
latest response. With the existing indexes (recipient+email, publication+status,
publication+project), this should be efficient for ≤50 rows.

**Verify:** The query uses `lower(recipient.email) = ?` — ensure there's a
case-insensitive index or functional index on `shared_link_recipients.email`.
Migration 0014 creates a `UNIQUE(recipient_email, ...)` index with
`COLLATE NOCASE` — verify this is used by the query planner.

### 7.2 Client Performance

- Client-side filtering with `useDeferredValue` ensures search doesn't block rendering.
- The `useReducer` state is lightweight (~5 state slices vs projects' ~25).
- Card rendering with `memo()` (like `LiveProjectCard`) prevents unnecessary re-renders.

### 7.3 Export Performance

- The XLSX API route uses Node runtime with `maxDuration = 60`.
- Rate-limited via `checkProposalExportRateLimit`.
- Large exports (all tabs) could be slow — verify the `maxDuration` is sufficient.
