# 01 — Executive Summary

## What this plan delivers

A planning package for a **Client-Ready Proposal Package Workflow** — the owner journey from a finished estimate to a sent, tracked, client-facing proposal. It does **not** build new infrastructure; it stitches three already-built surfaces into one coherent workflow and closes the readiness/delivery-honesty gaps between them.

The three existing surfaces:

1. **Export preview + XLSX workbook** (`src/components/workshop/ProposalExportPreviewDialog.tsx`, `src/lib/proposal-export/*`) — fully built, XLSX only, advisory validation, no hard readiness gate.
2. **Publisher drawer + roster** (`src/components/workshop/publisher/*`, `src/lib/publisher/*`) — fully built, manages sheets/recipients/access/settings/activity per project, role-gated.
3. **Publication lifecycle** (`src/lib/publication/*`) — fully built: create/republish/rotate/revoke, atomic D1 procedures, HMAC/AES tokens, scrypt passwords, CSRF, opaque snapshot IDs, snapshot-version optimistic locking.

The **gap** this pack targets: these surfaces are not unified into one owner workflow. Concretely:

- No **readiness/preflight** layer exists. The only hard publish gate is "≥1 estimate selected" (`createProjectPublication`/`republishProjectPublication`). There is no data-completeness blocker (missing client name, contractor, GFA, currency, zero totals, no recipients configured) and no surfaced **source-staleness / unsaved-edits** warning at send time.
- No **owner-composable recipient message**. The recipient invitation email subject/body are hardcoded (`sendSharedLinkRecipientInvitationEmail`); the `RecipientEmailComposer` only collects addresses.
- **Delivery honesty gap.** `delivery_status` declares `pending|sent|bounced|opened|responded`, but only `pending`, `sent`, `opened` are ever written. `bounced` has no ingestion path (Cloudflare Email Service has no wired webhook; `src/app/api/webhooks/resend/` is empty). `responded` is never flipped when a client submits a decision. The optimistic `sent` is "we handed it to Cloudflare Email," not "delivered to inbox."
- **No `publication_activity` notification dispatch.** The notification kind exists in the enum but is never written; the owner relies on the publisher Activity tab and best-effort owner digest emails.

## Target-state architecture (planning-level)

```
Estimate page ─┬─ EstimateHeaderActions (Preview Excel Export)
               │     └─ ProposalExportPreviewDialog  ◄── proposal-readiness signals (read-only)
               │
               └─ ProposalExportPreviewDialog "Send / Publish" CTA  ◄── NEW unified entry (optional v1.1)
                         │
Project chrome ── Publisher drawer  ◄── proposal-readiness Preflight tab + Send gate
                         │
Publication lifecycle (unchanged): create / republish / rotate / revoke
                         │
Recipient email (Cloudflare Email) ── owner-composed message (NEW v1) ──► recipient
                         │
Delivery signals: opened (built) · responded (NEW hook) · bounced (BLOCKED-EXTERNAL)
                         │
Owner surface: Publisher Activity tab + publication_activity notification (NEW dispatch)
```

New code (planning-level; exact paths in `11`):

- `src/lib/proposal-readiness/` — server-only readiness model (derived; not persisted): hard blockers + soft warnings, reusing the existing snapshot redaction so client-facing preview never leaks internal detail.
- Wire `responded` write into the decision path (`submitClientResponse`/`submitSharedLinkDecision`).
- Owner-composed message plumbing through `RecipientInput`/`addSharedLinkRecipients`/`sendSharedLinkRecipientInvitationEmail`.
- `publication_activity` notification dispatch on comment/decision/publish events (write path into `notification_deliveries`).

Deferred / out of scope (recorded in `15`):

- PDF generation (greenfield; no existing path).
- Bounce/complaint ingestion (BLOCKED-EXTERNAL — Cloudflare Email Service has no wired inbound webhook; needs provider decision).
- Recipient read/unread inbox state; per-proposal legal terms the client accepts; R2 snapshot blobs.

## Key findings (highlights)

- **No `proposals` table exists or is needed.** "Proposal" = a `project_publications` row + its `snapshot_json`. Snapshot is content-addressed by `snapshot_version`; comments/decisions pin to the version they saw and reject on mismatch (strong immutability).
- **Auth model is split and sound.** Manager side: role-rank via `assertProjectPublicationManager` (owner/admin ≥ manager rank). Public/recipient side: token-hash + optional scrypt password + HMAC session cookie + same-origin/double-submit CSRF. Cross-publication recipient scoping (SEC-06) is enforced.
- **Snapshot redaction is the reuse point for readiness.** `sanitizeProjectPublicationSnapshotForPublicRead` already maps opaque IDs and redacts location/GPS; readiness signals should reuse the same redaction so a "client can see X" preview never leaks.
- **Latest migration is `0036`** (`0036_cost_library_component_drafts.sql`). Next migration would be **`0037`**. This pack proposes **at most one additive migration** (and only if `responded`/notification write needs schema; analysis in `07` shows `responded` needs no schema change — the column already accepts it).
- **Email provider is Cloudflare Email Service only** (`transactional-email-client.ts`). Resend/Vercel references are historical; `resend_*` columns are legacy-named but actually store the Cloudflare `messageId`.

## Readiness status

**`CONDITIONALLY READY`** (planning package).

- The **internally resolvable** scope (readiness model, owner message, `responded` hook, notification dispatch, UX state matrix, tests, rollout) is planned to implementation-ready depth with exact paths/symbols.
- One **external blocker** remains: bounce/complaint delivery ingestion depends on a Cloudflare Email Service provider decision (no inbound webhook exists in the app today). That slice is isolated to a named `BLOCKED-EXTERNAL` task and does not block the rest.
- Verification mode is **emulated** (single agent, separated passes), which caps overall readiness at 97 and package status at `CONDITIONALLY READY` for this high-blast-radius package. An independent reviewer or owner acceptance can lift this to `IMPLEMENTATION-READY`.

Initial readiness scores are in `17`; final scores after the critique-and-revision cycle are in `17`.

## Stop condition check (from PROMPT.md)

> The pack is complete when an executor can implement a coherent owner workflow from estimate to client-ready package.

The pack provides: a readiness model (`04`/`06`/`11`), missing-data blockers (`04`/`06`), stale/source-risk warnings (`04`/`09`), sheet selection (existing — `03`/`06`), recipient setup including owner-composed message (`04`/`06`/`11`), preview states (`05`), delivery confirmation with honest bounds (`04`/`07`/`09`), resend/revoke flow (existing — `03`/`06`), tests (`12`), and proof artifacts (`12`/`19`). An executor can build it without rediscovery. ✅
