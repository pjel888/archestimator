# 01 — Current-State Map: Shared Estimate Page `/share/[token]`

> Evidence-grounded comprehension of the route, data model, request lifecycle,
> render chain, security, and Cloudflare posture. All citations are
> `file:line` against commit `2dab33405d`.

## 1. File inventory (the audited surface)

### Route (`src/app/share/`)
| File | LOC | Role |
|---|---|---|
| `[token]/page.tsx` | 400 | RSC: access resolve → password gate → session → snapshot read → render |
| `[token]/loading.tsx` | 62 | Skeleton (header + stats grid + tree/table split) |
| `[token]/not-found.tsx` | 22 | 404 state |
| `print.css` | 62 | Print-only / print-hidden classes, page breaks, color flatten |

### Share components (`src/components/share/`)
| File | LOC | Role |
|---|---|---|
| `ShareReviewWorkspace.tsx` | 80 | Client container: owns review-target state, wires tabs+comments+decision+sticky bar+mobile nav |
| `SharePageTabs.tsx` | 933 | Estimate tree + collated table, estimate/tab switching, donut, print package |
| `SharePageComments.tsx` | 744 | Flat comment list + inline composer + offline queue + retry |
| `SharePageDecision.tsx` | 449 | Approve/request-changes/decline + confirm dialog + locked state |
| `SharePageDecisionConfirmDialog.tsx` | 178 | Native `<dialog>` with focus trap, signer name + note |
| `ShareEstimateTreePanel.tsx` | 448 | 260px nav rail (TOC) + search + expand/collapse all |
| `ShareEstimateTreeView.tsx` | 322 | Recursive tree render via shared `WorkshopTree` primitive |
| `SharedLinkActivityFeed.tsx` | 362 | Activity feed (comments + decisions + events merged) — **not on recipient page** |
| `SharePageSummaryCard.tsx` | 103 | Project totals/stats grid |
| `ProjectPublicationPasswordForm.tsx` | 105 | Password gate form |
| `SharePageHero.tsx` | 45 | Cover image |
| `SharePageSessionBanner.tsx` | 72 | "Signed in as X" banner + dismiss |
| `SharePageProposalHeader.tsx` | 32 | Project name/code header |
| `ProposalStatusBadge.tsx` | 46 | Status pill |
| `StickyDecisionBar.tsx` | 40 | Desktop floating decision bar (event bus) |
| `ShareContainer.tsx` | 27 | Single-column width ladder |
| `SharePrintButton.tsx` | 13 | `window.print()` |
| `CoverImagePlaceholder.tsx` | 14 | Hero fallback |
| `ensure-query-client.tsx` | 24 | TanStack Query client provider |
| `share-review-target.ts` | 52 | `ShareReviewTarget` type + helpers |

### Share lib (`src/lib/share/`)
| File | Role |
|---|---|
| `reconstruct-share-tree.ts` (416) | Tree reconstruction: 4-rung fallback ladder |
| `aggregate-share-chart-buckets.ts` (95) | Discipline aggregation for donut |

### Publication backend (`src/lib/publication/`) — share-page-critical slices
| File | LOC | Role |
|---|---|---|
| `public-repository.ts` | 1126 | Access/snapshot resolve, comment/decision submit, rate limits, analytics |
| `actions.ts` | 1977 | Publish flow + `buildSnapshotForProject` (reads live estimate data) |
| `d1-store.ts` | 827 | D1 queries: comments, responses, recipients, rate limits |
| `security.ts` | 553 | Token hash, password scrypt, access/session cookies, view token, CSRF, rate-limit helpers |
| `snapshot.ts` | 516 | Builds + sanitizes the snapshot; opaque id maps |
| `types.ts` | 151 | Snapshot/row/node/tab/estimate types |
| `activity-helpers.ts` | 323 | `SharedLinkTargetKind`, review-target validation, label maps |
| `admin-d1-client.ts` | 783 | Supabase-style chained client over D1 (publish-side writes) |
| `image-url.ts` | 68 | Image URL allow-listing |
| `email-links.ts` | 99 | Recipient link construction |
| `share-copy.ts` | 11 | Shared error copy |
| `client-csrf.ts` | 14 | Client CSRF header helper |
| `recipient-limits.ts` | 5 | Recipient cap constant |

### API routes (`src/app/api/share/[token]/`)
| File | LOC | Role |
|---|---|---|
| `route.ts` | 97 | GET snapshot JSON (separate from the page) + open event |
| `comment/route.ts` | 448 | GET comments + POST comment (validation, CSRF, rate limit, stale-snapshot) |
| `decision/route.ts` | 392 | GET latest decision + POST decision |
| `session/route.ts` | 193 | Recipient session cookie set + redirect |
| `password/route.ts` | 135 | Password verify + access cookie set + backoff |
| `activity/route.ts` | 232 | GET merged activity feed (3-source) |
| `unsubscribe/route.ts` | 125 | POST unsubscribe |

## 2. The request lifecycle (server component, in order)

`SharePage` (`src/app/share/[token]/page.tsx:177`), `force-dynamic`:

1. **Token parse/canonicalize** (`page.tsx:178-186`). Trim; `notFound()` if empty;
   redirect to trimmed-token URL if changed.
2. **Recipient param detection** (`page.tsx:187-191`). `?recipient=` (canonical) or
   legacy `?rt=`; `?recipientSession=invalid` surfaces a session alert.
3. **Access resolve** (`page.tsx:193-194`). `resolveProjectPublicationAccessByToken`
   HMAC-hashes the token → `token_hash` lookup → returns
   `{publicationId, passwordRequired, credentialVersion}` or `notFound()`.
4. **Password gate** (`page.tsx:196-231`). If `passwordRequired`, verify the
   `ae_publication_access_<sha>` cookie (HMAC, bound to credential version). Invalid
   → render `<ProjectPublicationPasswordGate>` and defer a
   `password_gate_viewed` analytics event via `after()`.
5. **Recipient session redirect** (`page.tsx:238-240`). If a recipient param is
   present, `redirect("/api/share/[token]/session?recipient=…")`. The session route
   validates the recipient token, sets the `shared_link_session_<sha>` cookie
   (Max-Age 86400, HttpOnly, SameSite=Lax, Secure in prod) + a non-HttpOnly `_ok`
   companion cookie, and redirects back to the clean URL.
6. **Existing session validation** (`page.tsx:246-258`). On subsequent loads, verify
   the session cookie to recover `recipientIdForOpenEvent`.
7. **Parallel snapshot + identity read** (`page.tsx:264-272`).
   `Promise.all([resolveProjectPublicationSnapshotByToken(token), recipientIdentity?])`.
   The identity read only fires when a valid session set `recipientIdForOpenEvent`.
8. **View token** (`page.tsx:275-279`). `createPublicationViewToken` binds
   `{publicationId, snapshotVersion, tokenDigest}` — used later by comment/decision
   POSTs to detect stale snapshots (409).
9. **Deferred telemetry** (`page.tsx:288-341`). `after()` runs rate-limit check +
   analytics event + raw event; all best-effort and try/caught.
10. **Render** (`page.tsx:343-352`) → `<ProjectPublicationView>`.

`generateMetadata` (`page.tsx:380-400`) returns generic OG metadata (never exposes
project totals/client names) — protected vs public variant based on
`passwordRequired`.

## 3. The snapshot data model (what the client receives)

All ids are **opaque per-publish** (`est_…`, `row_…`, `node_…`, `tab_…`, `proj_…`)
via `sanitizeProjectPublicationSnapshotForPublicRead` (`snapshot.ts:313-345`). The
namespace is a random 16-byte base64url generated per publish, stored as
`_privateIdNamespace` and stripped before public read.

### `ProjectPublicationSnapshot` (`types.ts:114-151`)
```
schemaVersion: 1 | 1.2 | 1.3   // builder emits only 1 or 1.3 (1.2 is legacy-read-only)
generatedAt: string
issuance?: { issueNumber, version, issuedAt, validThrough, senderName,
             selectedEstimateIds, assumptions, exclusions, supersedes }  // DECLARED, NEVER POPULATED — dead schema
project: { id, name, projectCode, clientName, location, locationVisibility,
           currencyCode, senderName?, coverImageUrl? }
estimateCount, rowCount, totalCost
estimates: PublicationSnapshotEstimate[]
```

### `PublicationSnapshotEstimate` (`types.ts:100-112`)
```
id, name, sheetCode, updatedAt, rowCount, totalCost
rows: PublicationSnapshotRow[]
treeNodes?: PublicationSnapshotTreeNode[]      // schema v1.1+ (the area-branch tree)
tabs?: PublicationSnapshotEstimateTab[]        // schema v1.3+
```

### `PublicationSnapshotTreeNode` (`types.ts:59-65`) — the hierarchy node
```
id, name, kind: "group" | "area", tabId?, children: PublicationSnapshotTreeNode[]
```
Recursive. This IS the area-branch tree. `kind` collapses the workshop's legacy node
kinds (`lot`, `general`, `structure`, `level`, `assembly` → `group`) via
`normalizeEstimateTreeNodeKind` (`tree-hierarchy.ts`). User-facing display name is
always **"Area"** regardless of kind (`tree-hierarchy.ts:6`).

### `PublicationSnapshotRow` (`types.ts:67-81`)
```
id, description, designation, discipline, material, quantity, unit, rowTotal,
imageUrl?, nodeId?, tabId?
```
**Drops** `unitCost`, `miscCost`, `contingencyPercentage`, `adjustmentPercentage` —
only the precomputed `rowTotal` survives (`buildSnapshotRow`, `snapshot.ts:214-230`).
`nodeId` is the explicit back-link to the owning estimate node.

### `PublicationSnapshotEstimateTab` (`types.ts:83-98`)
```
id, name, sortOrder, isDefault, rowCount, totalCost
rowIds?: string[]                     // v1.3+ compact form
rows?: PublicationSnapshotRow[]        // legacy v1.2 duplicated form
treeNodes?: PublicationSnapshotTreeNode[]
```

## 4. How the snapshot is built from the live estimate sheet

`buildSnapshotForProject` (`actions.ts:609-733`) reads from the live D1/Supabase
tables via the admin client. The canonical hierarchy is
`workspace → project → estimate → estimate_nodes → estimate_row_items`
(`supabase/migrations/20260518090000_archestimator_core_schema.sql:2`).

- `estimates` (`actions.ts:614-622`).
- `estimate_row_items` — selects `id, estimate_id, node_id, description, designation,
  discipline, material, quantity, quantity_base, quantity_contingency_amount, unit,
  unit_cost, misc_cost, contingency_percentage, adjustment_percentage`,
  `imageUrl: source_snapshot->>imageUrl` (`actions.ts:634-638`).
- `estimate_nodes` — `id, estimate_id, estimate_tab_id, name, kind, parent_id,
  sort_order` (`actions.ts:639-643`).
- `estimate_tabs` — `id, estimate_id, name, sort_order, is_default,
  archived_at IS NULL` (`actions.ts:644-649`).

`buildProjectPublicationSnapshot` (`snapshot.ts:477-516`) then:
- Sorts tabs, finds the default tab, filters nodes to active tabs.
- Assigns each row to a tab via `row.nodeId → node.estimateTabId`.
- **Rows whose `nodeId` is absent or whose node isn't in an active tab are dropped
  when tabs exist** (`snapshot.ts:426-429`).
- `buildSnapshotTreeNodes` (`snapshot.ts:347-375`) re-parents the flat node list into
  a recursive `children` tree by `parentId`.
- `calculateRowTotal` (`snapshot.ts:203-212`):
  `subtotal + miscCost + (subtotal * adjustmentPercentage)/100`.

**The hierarchy is preserved end-to-end.** `treeNodes`, `row.nodeId`, and per-tab
`treeNodes` all ship to the client.

## 5. The estimate tree render chain (the area-branch breakdown)

```
ShareReviewWorkspace.tsx:57-63
  └ SharePageTabs (default)
       ├ treeNodes = getBestShareTree(activeContentRows, activeContentTreeNodes)
       │            then wrapTreeWithRoot(...)                     [SharePageTabs.tsx:472-480]
       ├ ShareEstimateTreePanel (260px nav rail, desktop)          [SharePageTabs.tsx:912-918]
       │   └ showInlineRows={false}  ← so panel shows LABELS ONLY, no totals
       └ ShareEstimateTreeView (main)                              [SharePageTabs.tsx:920-924]
           └ WorkshopTree<ShareTreeNode> (shared recursive primitive)
               └ node headers: onToggle only (expand/collapse)    [ShareEstimateTreeView.tsx:212-218]
               └ inline rows: non-interactive <div>               [ShareEstimateTreeView.tsx:148-188]
```

### The reconstruction ladder (`reconstruct-share-tree.ts:344-360`)
1. **Snapshot `treeNodes`** → `buildShareTreeFromSnapshotNodes` (`:269-338`).
   Faithful workshop hierarchy. Rows attach by `row.nodeId`. Orphan rows → "Unassigned"
   area. **This is the only rung that reflects the real area-branch structure.**
2. **Discipline grouping** → `reconstructTreeByDiscipline` (`:203-262`). Triggered
   when `rows.length > MAX_ROWS_FOR_TREE` (500). Flat list, no nesting.
3. **Designation-text** → `reconstructTreeFromRows` (`:83-197`). Parses
   `row.designation` with `/\s*[>\/\-–—]\s*/`. **Fragile** (hyphens/slashes collide).
4. **Discipline grouping again** (`:357-358`) — when (3) yields nothing.

`wrapTreeWithRoot` (`:382-415`) wraps the forest under a synthetic "Estimate · Tab"
root so the tree always has a single top anchor.

### View modes (`SharePageTabs.tsx:276,629`)
- Default `"tree"` (labeled **"Summary"**) — the area-branch breakdown.
- `"collated"` (labeled **"Details"**) — flat table, 250-row initial cap with
  Show-more/Load-all, row click → review target, filter input, "Ask about estimate".

## 6. The commenting + decision model

### Review targets (`share-review-target.ts`)
```
ShareReviewTargetKind = "proposal" | "estimate" | "row"   // NO "node"/"area"/"component"
ShareReviewTarget = { kind, label, secondaryLabel?, estimateId?, rowId? }
```
- Default `PROPOSAL_REVIEW_TARGET`.
- `serializeShareReviewTarget` persists only `estimateId`/`rowId` (server re-derives kind).
- **Dead code:** `isSpecificShareReviewTarget` (`:50-52`) has zero callers.

### Comments
- **Flat. No threading, no replies, no resolve, no edit, no delete.**
- Schema (`migrations/0066…sql:213-228`): `id, publication_id, recipient_id,
  author_email, author_name, estimate_id, row_id, body (≤1000), is_internal,
  target_kind IN ('proposal','estimate','row'), target_label,
  target_secondary_label, snapshot_version_at_comment, created_at`. **No `parent_id`,
  no `is_resolved`, no `edited_at`, no `deleted_at`.**
- Composer: inline `<textarea>` at the foot of the discussion card, always mounted.
  Target is implicit (whatever the workspace holds). Cmd/Ctrl+Enter or Send.
- Optimistic insert + 3-attempt retry + offline queue (sessionStorage) + draft
  persistence (sessionStorage).
- Query: `["share-comments", token]`, `staleTime: 30_000`, `refetchOnWindowFocus`.
- **No `invalidateQueries` anywhere** → cross-widget staleness (BUG-1).

### Decisions
- Enum: `accepted | declined | revision_requested`.
- One per recipient per publication (unique partial index
  `idx_shared_link_responses_recipient_publication`).
- `signer_name` required for accepted/declined; optional for revision_requested.
- Confirm via native `<dialog>` (`SharePageDecisionConfirmDialog`).
- Optimistic-concurrency: `snapshot_version` must match → 409 on stale.
- **No undo/change-response UI.** **Decision drafts NOT persisted across reload.**
- `signature_intent_hash` stored but not surfaced in UI.

### Activity feed
- `SharedLinkActivityFeed` merges comments + decisions + events server-side.
- **NOT rendered on the recipient page** (`ShareReviewWorkspace` does not import it).
- No realtime (no `refetchInterval`, no SSE, no WebSocket).

## 7. Security posture (summary — detail in `02`/`03`)

| Layer | Mechanism | Location |
|---|---|---|
| Publication token | 43-char base64url; HMAC-SHA256 hash stored; never logged | `security.ts:73-81` |
| Password | scrypt `scrypt-sha256-v1:salt:hash`; NFC normalize; constant-time verify | `security.ts:129-167` |
| Access cookie | HMAC-signed, bound to credential version; Max-Age 86400 | `security.ts:185-210,344-360` |
| Session cookie | HMAC-signed, binds recipientId; companion `_ok` non-HttpOnly | `security.ts:438-497` |
| View token | Binds `{publicationId, snapshotVersion, tokenDigest}` | `security.ts:260-285` |
| CSRF | Double-submit (Origin + `x-archestimator-csrf` header vs cookie) | `security.ts:362-410` |
| Telemetry hashing | IP/UA HMAC'd with pepper | `public-repository.ts:182-197` |
| Rate limits | D1-row-based, per scope (snapshot 60/min, password 5/hr + backoff, comment 5/min+20/hr, decision 5/min, session 10/min+50/hr) | `public-repository.ts:273-648` |

**Gap:** the HTML page route has no explicit `Cache-Control: no-store` (only
`force-dynamic`). API routes set it. → SEC-1.

## 8. Cloudflare / D1 posture

- **D1 binding:** `ARCH_DB` (`wrangler.jsonc`). Accessed via `getCloudflareContext()`
  from `@opennextjs/cloudflare` (`src/lib/cloudflare/d1.ts`). Prepared statements
  throughout; `db.batch([...])` for transactional multi-statement writes
  (comment insert + activation outbox; decision; recipient open).
- **R2:** NOT used by the share/publication layer. Row thumbnails are referenced by
  URL path (brokered through `/api/projects/images` /
  `/api/component-library/images`), not stored in R2 by publication.
- **Durable Objects:** NOT used by share. Rate limiting is D1-row-based
  (`security_rate_limit_events`), despite the `DurableRateLimitResult` type name.
- **Email:** owner digests + recipient invitations via `sendEmail`.
- **Activation outbox:** comment/decision/open writes also insert activation-producer
  intents (`recipient_opened`, `recipient_engaged`, `recipient_decided`).

## 9. Known cross-references (sibling packs)

- `2026-07-12/Publisher-Page-Audit` — the publish flow that creates this page's data.
  Found SEC-1 (share Cache-Control) and BUG-2 (decision dedupe race) from the
  publisher side; both are confirmed present on the share surface here.
- `2026-07-08/Project-Estimate-Sheet-Performance-Optimization` — the estimate sheet
  that is the source of the snapshot's area-branch hierarchy.
