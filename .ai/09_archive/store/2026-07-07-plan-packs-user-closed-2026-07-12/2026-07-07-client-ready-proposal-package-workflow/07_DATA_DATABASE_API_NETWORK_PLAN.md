# 07 — Data, Database, API, and Network Plan

## Database change blueprint

### Migration `0037` (additive, optional-but-recommended for owner message audit)

| Aspect | Detail |
|---|---|
| Filename | `migrations/0037_shared_link_recipients_invitation_message.sql` |
| Ordering dependency | Applies after `0036_cost_library_component_drafts.sql` (current latest). No cross-migration conflict. |
| Tables affected | `shared_link_recipients` only |
| Columns added | `invitation_subject TEXT` (nullable, ≤120 chars enforced at app layer), `invitation_message TEXT` (nullable, ≤1000 chars enforced at app layer) |
| Indexes | none new |
| Constraints | none new (nullable; CHECK length enforced at app layer to keep migration cheap and avoid row-rewrite) |
| Backfill | none (nullable; existing rows → null → default copy on resend) |
| Data-volume assumptions | ≤50 recipients per publication (existing `SHARED_LINK_RECIPIENT_ACTION_LIMIT`); negligible storage |
| Concurrency/locks | `ALTER TABLE ADD COLUMN` is metadata-only on SQLite/D1; no row rewrite; safe online |
| Query-count impact | 0 new queries (columns piggyback on existing `shared_link_recipients` selects/inserts) |
| Cardinality | unchanged |
| Generated type impact | If `cloudflare-env.d.ts` or a row-model type references `shared_link_recipients`, refresh; **no `bun run cf:typegen` needed** (no binding change — this is a D1 table column, not a Worker Env binding) |
| Rollback | Fix-forward (drop columns) or ignore (nullable, harmless if unused) |
| Local proof | `bun run cf:d1-apply-local 0037` then `wrangler d1 execute archestimator-proof-db --local --command "PRAGMA table_info(shared_link_recipients)"` shows new columns |
| Linked-provider proof | Remote apply is **out of scope for the planning task**; implementation must run `wrangler d1 migrations apply --remote` under the standing Cloudflare mandate and confirm via `PRAGMA table_info` |
| `EXPLAIN`/query plan | N/A (no new query shape) |

Standing authorization (AGENTS.md): Philip grants standing authorization for D1 changes inside the bound `ARCH_DB`. The migration is additive, nullable, metadata-only — the cheapest/safest shape. The implementation may choose **not** to persist the message (keep it ephemeral per-send) — see DEC-02; the recommendation is to persist for audit + resend consistency. Either path is implementation-ready.

### No other migrations required

- `delivery_status='responded'` — already in the CHECK constraint (`0014:66`); only a missing writer. **No migration.**
- `publication_activity` notifications — **DISCOVERY-REQUIRED (DATA-04)**: confirm `notification_deliveries`/`notification_definitions` tables exist. If they exist (the read repository references them), no migration; FR-08 just adds an INSERT path. If they do **not** exist, FR-08 is downgraded to BLOCKED-EVIDENCE and the notification slice is deferred. The discovery is a read-only `PRAGMA table_info` + grep of `migrations/` for those table names — no code change.

## Data ownership / lifecycle

| Data | Owner | Lifecycle | Retention | Deletion |
|---|---|---|---|---|
| `project_publications.snapshot_json` | publication lifecycle | new row per publish/republish; old row revoked (never mutated) | until project delete (existing `projects/actions.ts` DELETE cascade) | existing cascade |
| `shared_link_recipients.invitation_subject/message` | owner (via composer) | set on invite; reused on resend; cleared if owner sends blank | same as recipient row | hard-DELETE today (pre-existing orphan risk noted in `14`) |
| `delivery_status` | publication lifecycle | pending → sent (on send) → opened (on open) → responded (on decision, NEW) | same as recipient row | same |
| readiness result | derived (not persisted) | point-in-time; recomputed on each drawer open | n/a | n/a |
| `publication_activity` notifications | notifications module | inserted on event; seen/read state per user | per existing notification retention | per existing notification cleanup |

## Transaction boundaries

- **Publish + send recipients.** Existing `replace_project_publication` is atomic (single `db.batch`). Recipient invite emails are **send-before-persist** (MOD-REC-02): email succeeds → then persist recipient row with `sent`. This is unchanged. The new owner message columns are written in the same persist step.
- **`responded` flip.** Must be in the **same transaction** as the decision insert (`submitClientResponse`/`submitSharedLinkDecision`) so the status and the decision row never disagree. Implementation: a single `db.batch` with both the `shared_link_responses` upsert and the `shared_link_recipients.delivery_status='responded'` update, scoped by `publication_id` + `recipient_id`.
- **Readiness gate.** Runs **before** any write (FR-04). Pure function; no transaction needed.

## Idempotency / uniqueness / conflicts

- `shared_link_recipients` `(publication_id, lower(email))` UNIQUE — existing; duplicate invite returns `status:"duplicate"` (existing). Unchanged.
- `shared_link_responses` `(recipient_id, publication_id)` partial UNIQUE — existing dedup. The `responded` flip is idempotent (setting it again on a re-submit is a no-op).
- Resend optimistic lock (`expected_encrypted_token`) — existing; the message columns are written alongside, no new lock dimension.
- Snapshot-version optimistic lock (`snapshot_version_at_decision`) — existing; unaffected.

## Query plans / cardinality

- Readiness computation reads: project row (existing), selected estimates (existing drawer load), recipient count (existing), email config (cached env read). **No new D1 queries** beyond what the drawer already issues.
- `responded` flip is an `UPDATE ... WHERE publication_id=? AND id=?` — index hits `idx_shared_link_recipients_publication_email` / PK. O(1).
- Notification insert — single row insert into `notification_deliveries`; indexed by user/workspace (existing schema assumed; confirm in DATA-04).

## Access-path matrix

| Source | Chosen API/repository | Runtime role | Authorization check | Latest schema posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Project + estimates (readiness input) | `readPublisherPublicationDrawerData` / existing project+estimate repos | owner/admin/editor/viewer | `canReadPublisherRosterProject` | `0015` columns | repo evidence | n/a |
| Recipient list | `listSharedLinkRecipients` | manager | `assertProjectPublicationManager` | `0014` | repo evidence | n/a |
| Email config | `readEmailDeliveryConfig` | server-only | n/a (env read) | `wrangler.jsonc` `EMAIL` binding | repo evidence | fail to `email_not_configured` blocker |
| Recipient insert + message | `addSharedLinkRecipients` → `shared_link_recipients` | manager | `assertProjectPublicationManager` | `0014` + `0037` (new cols) | repo evidence + planned migration | n/a |
| Decision + `responded` | `submitClientResponse`/`submitSharedLinkDecision` → D1 batch | recipient (token-auth) | token-hash + SEC-06 | `0014` | repo evidence | n/a |
| Notification insert | new `dispatchPublicationActivityNotification` → `notification_deliveries` | server (system) | workspace-scoped write | DISCOVERY-REQUIRED (DATA-04) | repo evidence | best-effort swallow (REL-03) |

## API / network contracts

No new public API endpoints. All changes are to existing Server Actions (which are directly-reachable POST endpoints and must validate auth/authz/input — already enforced).

### Server Action contract changes

| Action | Input change | Output change | Auth | Idempotency |
|---|---|---|---|---|
| `createProjectPublication` | none (readiness derived) | new error `readiness_blocked` with `blockers` | existing manage gate | existing `replace_project_publication` |
| `republishProjectPublication` | none | new error `readiness_blocked` | existing manage gate | existing |
| `addSharedLinkRecipients` | `recipients[].invitationSubject?`, `recipients[].invitationMessage?` (new optional fields) | unchanged shape | existing manage gate | existing dedup |
| `resendSharedLinkRecipientEmail` | `invitationSubject?`, `invitationMessage?` (override per-resend) | unchanged | existing manage gate | existing rate limit + optimistic lock |
| `submitSharedLinkDecision` | none | none (side-effect: `responded` flip) | existing token-auth + SEC-06 | existing dedup |

### Email message contract

- Subject template: `${ownerSubject ?? `Project Estimate: ${projectName} shared by ${sender}`}` (default preserved).
- Body: owner message (plain text, escaped) prepended to the existing CTA body, clearly separated (e.g., a "Message from {sender}:" block above the CTA).
- Tags unchanged (`{archestimator_surface:"shared_link", publication_id, shared_link_recipient_id}`).

### Rate limits (unchanged, reused)

- `checkProposalExportRateLimit` — export route (unchanged).
- `SHARED_LINK_RECIPIENT_ACTION_LIMIT = 50` per add (unchanged).
- `SHARED_LINK_RECIPIENT_RESEND_SCOPE` 5-min resend window (unchanged).
- Owner digest 15-min rate limit (unchanged) — **reused** for notification throttling to avoid spam.

## Provider boundary

- Cloudflare D1 (`ARCH_DB`) — additive migration `0037` (under standing mandate).
- Cloudflare Email Service (`EMAIL` binding) — unchanged provider; message-content change only.
- R2 — **not touched** (snapshot stays in D1).
- No legacy Supabase/Resend surfaces touched.

## Credential material taxonomy (relevant materials)

| Material | Marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Publication token (raw) | raw bearer | `generatePublicationToken` | never stored (encrypted at rest) | publish path, to build `/share/<token>` | yes (URL path) | yes (URL) | rotate/revoke | repo evidence |
| `token_hash` | HMAC-SHA256 | `hashPublicationToken` | `project_publications.token_hash` | lookup | no | no | rotate/revoke rewrites | repo evidence |
| `encrypted_token` | AES-256-GCM | `encryptPublicationToken` | `project_publications.encrypted_token` | manager link rebuild | no (manager-only) | no | rotate rewrites | repo evidence |
| Recipient token (raw) | raw bearer | invite path | never stored | invite email link `?recipient=` | yes (URL) | yes | resend rotates | repo evidence |
| `recipient_token_hash` | HMAC (or `revoked:` prefix) | invite path | `shared_link_recipients.recipient_token_hash` | lookup | no | no | resend/rotate rewrites | repo evidence |
| Password | scrypt hash | owner set | `project_publications.password_hash` | verify | no | cookie bound via credentialVersion | clear on republish | repo evidence |
| Access/session cookie | HMAC-signed | security.ts | cookie | verify | cookie only | yes (session) | credentialVersion bump invalidates | repo evidence |
| CSRF double-submit | random | `createPublicationCsrfHeaders` | cookie + header | `assertSameOriginPublicPost` | cookie+header | no (per-request) | per-request | repo evidence |

No new credential materials are introduced by this plan. The owner message is not a credential.

## Data integrity notes

- Snapshot immutability preserved (readiness is computed, not stored on the snapshot).
- `responded` flip in the same txn as the decision row → no drift.
- Owner message persisted (DEC-02) → resend consistency + audit; ephemeral alternative also valid.
- Pre-existing orphan risk on recipient hard-DELETE (comments/responses reference `recipient_id`) is **out of scope** but noted in `14`.
