# 07 - Shared Link And Client Collaboration

This document maps the complete shared-link/client-collaboration surface — from link creation through client viewing, commenting, approving, and all the activity recording that supports it.

## Architecture Overview

The shared-link system is **completely separate from Better Auth**. Clients never need to be users. Guest access uses a custom, self-contained credential scheme.

```
Owner creates publication (createProjectPublication)
  → Token generated (32 random bytes, base64url)
  → Token stored encrypted (AES-256-GCM), matched by hash (HMAC-SHA256)
  → Snapshot built (buildSnapshotForProject → snapshot_json)
  → Recipients added (addSharedLinkRecipients)
  → Emails sent (Cloudflare Email)

Client opens /share/[token]
  → Password gate (if set) → ae_publication_access_* cookie
  → Recipient session (if personalized) → shared_link_session_* cookie
  → Open event recorded (recordProjectPublicationEvent)
  → Snapshot rendered (ProjectPublicationView)

Client comments → POST /api/share/[token]/comment → shared_link_comments
Client decides → POST /api/share/[token]/decision → shared_link_responses

Owner views activity → readProjectActivityFeed / SharedLinkActivityFeed
```

## 1. Security Model

### Token management (`src/lib/publication/security.ts`)
| Function | Line | Purpose |
|---|---|---|
| `createPublicationToken` | 63 | 32 random bytes, base64url, 43 chars |
| `hashPublicationToken` | 78 | HMAC-SHA256 keyed by `PUBLICATION_TOKEN_HASH_SECRET` (prod-required, 107-112) |
| `encryptPublicationToken` / `decryptPublicationToken` | 83-98 | AES-256-GCM with `PUBLICATION_TOKEN_ENCRYPTION_SECRET` |
| `hashPublicationPassword` / `verifyPublicationPassword` | 142-166 | scrypt with 16-byte salt, NFC-normalized |
| `createPublicationAccessCookie` | 343 | Password-gate cookie, bound to `credentialVersion` from password hash (194) |
| `getSharedLinkSessionCookieParts` | 510 | Recipient session cookie, HttpOnly + `_ok` companion flag |
| `assertSameOriginPublicPost` | 373 | CSRF double-submit `ae_publication_csrf` + `x-archestimator-csrf` header + Origin check |
| `createPublicationViewToken` | 259 | Binds snapshot version for stale-write detection (409) |

### Key design principles
- Raw token is stored **encrypted** so the share URL can be reconstructed, but only the **hash** is matched on access.
- Password change invalidates old access cookies (credentialVersion binding).
- CSRF protection on all POST routes.
- View tokens bind to snapshot version so comment/decision POSTs detect stale snapshots.

## 2. Share Link Creation (Owner Server Actions)

All in `src/lib/publication/actions.ts`:

| Action | Lines | Purpose |
|---|---|---|
| `createProjectPublication` | 780-848 | Generate token, encrypt, build snapshot, write to D1. Returns `clientLinkPath = /share/<token>` |
| `republishProjectPublication` | 850-941 | Bump `snapshot_version`, refresh snapshot, optionally change password/expiry |
| `rotateProjectPublicationLink` | 943-1015 | Rotate token in place (keeps row id + recipients), invalidates old recipient tokens |
| `revokeProjectPublication` | 1017-1043 | Set `status='revoked'` |
| `refreshProjectPublicationSummary` | 1050-1057 | Refresh summary |
| `assertProjectPublicationManager` | 394-441 | Permission gate — workspace admin/owner or project admin only |
| `recordPublisherAuditEvent` | 760-778 | Log `publisher_publication_*` / `publisher_recipient_*` events |

### Recipient management (same file)
| Action | Lines | Purpose |
|---|---|---|
| `listSharedLinkRecipients` | 1334-1355 | List recipients |
| `addSharedLinkRecipients` | 1357-1557 | Per-recipient token, hash, email send; self-invite blocked; bounded concurrency; `SHARED_LINK_RECIPIENT_ACTION_LIMIT` enforced |
| `resendSharedLinkRecipientEmail` | 1559-1656 | Send-before-persist (MOD-REC-02) — failed send leaves old link valid |
| `removeSharedLinkRecipient` | 1658-1697 | Delete recipient row |

### Recipient-to-user bridge
`openRecipientProposalAction` (`actions.ts:304-380`) — for logged-in users who are also recipients: matches user email to `shared_link_recipients.email`, decrypts token, sets session cookie, redirects to `/share/<token>`.

## 3. Public Routes

### Share page
- `/share/[token]` — `src/app/share/[token]/page.tsx:138-313`. Server component, `force-dynamic`. Composes: password gate → recipient-session redirect → snapshot read → analytics → `<ProjectPublicationView>`.
- `/share/[token]/not-found.tsx` — 404 for invalid/revoked tokens.
- `/share/[token]/loading.tsx` — loading skeleton.
- `/share/print.css` — print stylesheet (client can print-to-PDF via browser).

### Indexability
- `/share` and `/share/` are `Disallow` in `src/app/robots.ts`.
- OG metadata exposes only generic copy, never totals/client names (`generateMetadata`, lines 340-360).

## 4. API Routes

All under `src/app/api/share/[token]/`:

| Route | Methods | Purpose | Auth |
|---|---|---|---|
| `route.ts` | GET | Fetch snapshot JSON | token (+ optional password cookie) |
| `password/route.ts` | POST | Verify password → set access cookie | token; rate-limited + backoff |
| `session/route.ts` | GET/POST/DELETE | Establish recipient session from `?recipient=` / `recipientToken` | token + recipient token verify |
| `comment/route.ts` | GET/POST | List public comments; post comment | token + password cookie + signed recipient session + CSRF |
| `decision/route.ts` | GET/POST | Get/submit decision | token + password cookie + recipient session + CSRF |
| `events/route.ts` | POST | Record open/password/download_attempt_blocked events | token + CSRF |
| `activity/route.ts` | GET | Public-safe activity feed (filters `is_internal`) | token (+ optional session) |
| `unsubscribe/route.ts` | GET/POST | Unsubscribe interstitial + action | recipient token + form CSRF |

All routes: `force-dynamic`, `Cache-Control: no-store`, durable D1-backed rate limits.

## 5. What A Client Can Do

| Action | Available to | Requirements |
|---|---|---|
| **View snapshot** | All visitors | Token (and password if set) |
| **Print to PDF** | All visitors | Browser print |
| **Comment** | Recipients only | Valid recipient session from personalized `?recipient=` link. Rate-limited 5/min, 20/hr. |
| **Approve** | Recipients only | Recipient session + signer name. One per recipient, immutable. |
| **Decline** | Recipients only | Recipient session. One per recipient. |
| **Request changes** | Recipients only | Recipient session. One per recipient. |
| **Unsubscribe** | Recipients only | Emailed unsubscribe link. |

**Cannot:** delete anything, edit estimates, download XLSX from public surface, add recipients, access internal comments.

## 6. Activity Recording For Client Actions

### Open event
`recordProjectPublicationEvent` (`public-repository.ts:734-790`):
1. Writes `project_publication_events` row.
2. Increments `open_count` only for non-bots (MOD-MET-01, line 771).
3. Marks `recipient.last_opened_at` + inserts `shared_link_events` row when recipient known (776-788).
4. `recordProjectPublicationAnalyticsEvent` (692-732) writes richer telemetry (device/browser/OS/country, keyed-HMAC hashed IP) — gated behind `ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED` env.

### Comment add
- Stored in `shared_link_comments`.
- Surfaces in project activity feed via `readSharedCommentRows` (`project-activity-feed-repository.ts:636`).
- Triggers owner digest email via `maybeTriggerSharedLinkActivityDigest` → `triggerOwnerDigestIfAllowed` (`actions.ts:1773-1817`), rate-limited 1/15min per publication, logged to `publication_digest_log`.

### Decision (accept/decline/revision)
- Stored in `shared_link_responses`.
- Surfaces in project activity feed via `readSharedResponseRows` (`project-activity-feed-repository.ts:667`).
- Composed via `composeSharedLinkActivity` with `DECISION_ACTIONS` mapping.

### Privacy
- All IP/UA hashing uses keyed HMAC pepper (`hashRequestValue`, lines 180-183) — never bare sha256.
- Telemetry is default-off in production.
- Public activity feed filters `is_internal` (line 181, 218).
- Public comments API returns only `is_internal=0`.

## 7. Owner-Side UI

### Publisher Drawer
- `src/components/workshop/publisher/PublisherDrawer.tsx` — 5 tabs: overview, recipients, sheets, access, settings, activity (line 49).
- Activity tab uses `PublisherActivityFeed` which injects `loadPublisherWorkspaceActivity`.

### Project Activity Page
- Shows shared-link comments, decisions, and events alongside estimate events in the unified feed.

### Share Management UI
- `EstimateHeaderActions.tsx`, `ProjectChromeAsync.tsx`, `PublishedProjectQuickActions.tsx`, `PublisherRosterClient.tsx`, `usePublisherDrawer.ts`, `ProposalRow.tsx` / `ProposalsList.tsx`.

## 8. Identified Gaps

### P1 — No owner reply to client comments
Comments have `is_internal` and `author_type: owner|recipient` fields, and `shared_link_comments` allows owner-authored rows (recipient_id null), but no route/action lets a manager post an inline reply visible on `/share/[token]`. Owner-authored comments seem writable only via direct DB. `loadSharedLinkPublicComments` returns `is_internal=0` regardless of author.

### P1 — No comment edit/delete
Comments are insert-only on the public surface. No update/delete route exists for either clients or owners.

### P1 — No decision retraction
The `(recipient_id, publication_id)` unique index makes a decision final. No action for an owner to reset/clear a client's decision.

### P1 — signature_intent_hash scaffolded but never computed
Schema stores it (0014 lines 139-145), but `submitSharedLinkDecision` never sets it — left null. Reads as a scaffolded-but-unused field for future audit-grade signature.

### P2 — No real-time update on share page
No WebSocket/SSE. Client must reload to see new comments or owner updates. Activity is poll-on-load via React Query.

### P2 — No per-recipient access revocation
`removeSharedLinkRecipient` deletes the recipient row entirely. No "disable this one recipient's link but keep the row/history" state.

### P2 — Per-target decisions collapsed to publication-level
`shared_link_responses` has `estimate_id`, `row_id`, `target_kind` columns allowing per-target decisions, but the unique constraint is on `(recipient_id, publication_id)` only. A recipient can only ever submit ONE decision even if the UI implies per-sheet approval.

### P2 — download_attempt_blocked never emitted
Event type defined (`events/route.ts:14`) but no code path emits it. Reserved for a future client download feature.

### P2 — Expiry is publisher-set only
No automatic "link expires after N opens" or "expires if no response in X days."

## 9. Decisions Imposing Requirements

From `.ai/10_state/decisions.md`:
- **D9:** Accept public-recipient owner digest for beta with durable limiter, `publication_digest_log`, and observability regression sentinels.
- **D10:** Apply/ledger-reconcile manager-read RLS on `project_publication_events` now and add a guard test.
- **D11:** Ship named confirmation plus visible audit line and `signature_intent_hash`; full legal e-signature remains GA.
- **D1-D8:** Shared-link decision cluster (stale-write 409, location visibility, clientName/totals, throttling, session/CSRF, single-column receiver, focus/visibility refresh, deploy runbook).

## 10. Active Specs
- `.ai/06_specs/shared-link-and-publication-spec.md` — token resolution, password gates, lockout, CSP, client collaboration pipelines.
- `.ai/06_specs/walkthrough-shared-link-overhaul.md` — full file inventory, P8 = Activity & Notifications.
