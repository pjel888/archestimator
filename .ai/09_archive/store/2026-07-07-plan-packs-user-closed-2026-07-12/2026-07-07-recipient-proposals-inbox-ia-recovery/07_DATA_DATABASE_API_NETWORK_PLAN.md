# 07 — Data, Database, API, and Network Plan

## Data ownership and boundaries

- **D1 `ARCH_DB`** is the sole durable store for publication/recipient/response data. Bound resource: D1 `ARCH_DB` (`archestimator-proof-db`), per `wrangler.jsonc`.
- **Recipient listing** is a read-only query owned by `recipient-proposals-repository.ts`. No write path in V1.
- **Decision write** is owned by `POST /api/share/[token]/decision` → `public-repository.ts::submitSharedLinkDecision`. Unchanged by this pack.
- **Cookies:** `shared_link_session_[token]` (P5, HttpOnly, signed, 24h) + `shared_link_session_[token]_ok` (non-HttpOnly companion) + `ae_publication_access_<suffix>` (password, HttpOnly, 24h). No new cookie in V1.

## Schema (no V1 migration)

The recipient/publication schema is stable. **This pack introduces no migration.** The relevant tables (from `migrations/0014_publication_shared_links.sql`):

### `project_publications`
- `status` CHECK `('published','expired','revoked')`; `expires_at`; `revoked_at`.
- Partial unique `idx_project_publications_one_published_per_project` (one active publication per project).
- **Note:** `status='expired'` is set explicitly OR derived from `expires_at <= now` (the inbox repository derives it in SQL CASE; the share route derives it via `isActivePublication`).

### `shared_link_recipients`
- UNIQUE `(publication_id, lower(email))` — one recipient per email per publication.
- `recipient_token_hash` UNIQUE.
- `idx_shared_link_recipients_lower_email` — the index backing the inbox query.

### `shared_link_responses`
- **Partial unique `idx_shared_link_responses_recipient_publication ON (recipient_id, publication_id) WHERE recipient_id IS NOT NULL`** — one immutable decision per recipient per publication. Load-bearing for FR-12.

## Database Change Blueprint — **Not applicable for V1**

No migration. If a future V2 allows decision revision (OPEN-IA-03), the blueprint would need to: drop/relax the partial unique index, add a `superseded_by` column, add a `latest` flag or a "latest row" query, and backfill. That is explicitly out of V1 scope and would require its own plan pack.

For completeness, the V1 query plan:

| Aspect | V1 posture |
|---|---|
| Query count per route/action | Inbox list: 1 query (LIMIT 50). Open action: 1 RPC + 1 publication read. Decision GET: 1. Decision POST: 1 insert (+ digest). |
| Index coverage | `idx_shared_link_recipients_lower_email` (listing), `idx_project_publications_token_hash` (share resolve), `idx_shared_link_responses_recipient_publication` (immutability). |
| Cardinality | 50 rows max (inbox). At 10×/100×/1000× recipient volume per email, the LIMIT 50 + `lower(email)` index keeps the listing bounded; the owner-side recipient list is owned by client-ready-proposal-workflow. |
| Pagination | None in V1 (LIMIT 50, newest-activity first). If a recipient exceeds 50 active proposals, the oldest are truncated — acceptable for pre-launch; document as a V2 follow-up. |
| Concurrency | Listing is read-only. Decision insert is guarded by the unique index (409 on race). Open action is idempotent (minting cookies is side-effect-free). |
| Transaction boundaries | None needed in V1 (single-row inserts/reads). |
| Generated type impact | None (no Env binding change, no `cf:typegen`). |
| Rollback / fix-forward | N/A (no migration). If a V1 UI change regresses, revert the component change. |
| Local proof | `bun run test:dom` for the repository credential-free + shape assertions. |
| Linked-provider proof | D1 readback of the listing query against a seeded fixture (deferred to implementation; provider proof boundary). |
| EXPLAIN | Deferred to implementation if query latency is questioned; the query is index-backed and LIMIT 50. |

## API and network contracts (unchanged in V1)

### `POST /api/share/[token]/decision` (no change)
- Request: `{ decision, estimateId?, note?, rowId?, signerName?, viewToken? }`.
- Auth: CSRF (`assertSameOriginPublicPost`) + P5 session cookie.
- Responses: 201 / 400 / 401 / 403 / 404 / 409 / 423 / 429 / 500 (see `03_SOURCE_AND_CODEBASE_AUDIT.md`).
- This pack does not alter the contract. FR-08 aligns *client* copy only.

### `GET/POST/DELETE /api/share/[token]/session` (no change)
- The wrong-account gap (session binds to recipient token, not app email) is documented but not changed in V1 — the recovery is inbox-side (FR-06).

### Inbox server action `loadRecipientProposals` (no change)
- Delegates to `listRecipientProposals`. TanStack Query consumer.

### `openRecipientProposalAction` (no contract change; row-side UX adds wrong-account CTA)
- Returns `{ok:false,error:"not-a-recipient"}` unchanged. The row renders the new CTA on this error code.

## Idempotency, retries, timeouts

- Inbox refresh: idempotent (read); debounced 150ms; in-flight guard prevents duplicate refreshes.
- Open action: idempotent (cookie minting); double-click guarded by TanStack/in-flight state.
- Decision POST: not idempotent (unique index → 409 on duplicate). Client handles 409 by reloading + locking.
- Timeouts: inherit D1/Worker defaults. No new timeout config in V1.

## Pagination, rate limits, abuse

- Pagination: none in V1 (LIMIT 50).
- Rate limits: decision/session/password routes already rate-limited (D1-backed `security_rate_limit_events`). Inbox list is a signed-in server action — abuse surface is low (Better Auth gate). No new rate limit in V1.

## Backward compatibility

- No schema/API change → full backward compatibility.
- The terminal-state differentiation (ARCH-04) is additive (expired/revoked get better copy; unknown-token copy is unchanged).

## Data retention, deletion, audit

- Unchanged by this pack. Retention/DSAR is owned by `2026-07-07-retention-and-dsar-data-lifecycle` (prompt-only stub). The recipient DTO remains credential-free and snapshot-only.

## Data verification

- Existing `recipient-proposals-repository.test.ts` credential-free assertion is the load-bearing data-verification gate. Recommended addition: a DTO-shape assertion that no owner/internal field (e.g. `selected_estimate_ids` internals, `published_by` PII beyond `senderDisplayName`) leaks into `RecipientProposalRow`.

## Provider-proof boundary

- D1 readback of the listing query and the decision insert is the provider-proof boundary (deferred to implementation). Local vitest uses mocked D1 rows. No hosted/production proof is claimed by this planning pack.
