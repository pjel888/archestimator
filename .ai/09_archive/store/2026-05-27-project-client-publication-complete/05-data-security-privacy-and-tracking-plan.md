# Data Security Privacy And Tracking Plan

**Date:** 2026-05-27
**Status:** Implemented V1 security/privacy plan. The shipped schema stores snapshots on `project_publications.snapshot_json` and event/access telemetry in `project_publication_events`.

## Threat Model Summary

This feature creates a public path to private project/estimate data. Treat it as security-sensitive even if the visible UI is small.

Primary threats:

- token guessing or enumeration;
- raw token leakage through logs, referrers, analytics, screenshots, or browser history;
- password brute force;
- revoked links continuing to work through cache;
- anonymous table access exposing workspace data;
- receiver route revealing project existence;
- over-collecting receiver telemetry;
- public storage URL exposure;
- confusing public receiver access with Teamspaces membership;
- current-estimate changes silently altering what a client sees.

## Required Security Posture

- Use a server-only resolver for all receiver data.
- Store keyed token hashes for lookup and, if recopy is supported, an encrypted token envelope for owner/admin URL reconstruction. Never store plaintext raw tokens.
- Store only password hashes, never raw passwords or hints.
- Validate password server-side.
- Rate-limit token lookup and password attempts.
- Use no-store/noindex/referrer controls on receiver and public API responses.
- Render generic unavailable states for invalid, revoked, expired, deleted, or unauthorized links.
- Resolve only sanitized snapshot payloads for V1.
- Do not grant anon direct table access to core app tables.
- Do not store raw IP, raw user-agent, raw referrer URL, raw token, raw password, or raw receiver secrets in event metadata.

## Recommended Tables

Names are planning placeholders. Final migrations must be reviewed against current schema.

### `project_publications`

```txt
id uuid primary key
workspace_id uuid not null
project_id uuid not null
scope text not null check (scope in ('project'))
status text not null check (status in ('draft', 'published', 'revoked'))
token_hash text unique
token_hash_version integer not null default 1
encrypted_token_envelope bytea null
token_envelope_version integer null
password_required boolean not null default false
password_hash text null
password_algorithm text null
password_updated_at timestamptz null
expires_at timestamptz null
revoked_at timestamptz null
latest_snapshot_id uuid null
open_count integer not null default 0
latest_opened_at timestamptz null
created_by uuid not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### Snapshot Storage

Implemented V1 stores sanitized snapshots directly in `project_publications.snapshot_json` with `snapshot_version`.

Historical planned table, not implemented in V1:

### `publication_snapshots`

```txt
id uuid primary key
publication_id uuid not null
workspace_id uuid not null
project_id uuid not null
snapshot_version integer not null
payload_json jsonb not null
payload_schema_version integer not null
content_hash text not null
created_by uuid not null
created_at timestamptz not null default now()
```

### `project_publication_events`

```txt
id uuid primary key
publication_id uuid not null
snapshot_id uuid null
event_type text not null check (event_type in (
  'open',
  'manager_preview',
  'password_success',
  'password_failure',
  'republished',
  'revoked',
  'rotated',
  'expired_lookup'
))
viewer_session_hash text null
ip_hash text null
user_agent_hash text null
referrer_origin text null
metadata_json jsonb not null default '{}'
created_at timestamptz not null default now()
```

### Access Attempt Storage

Implemented V1 records password/open/download-attempt metadata through `project_publication_events` plus signed access cookies.

Historical planned table, not implemented in V1:

### `publication_access_attempts`

```txt
id uuid primary key
token_hash_prefix text null
ip_hash text null
user_agent_hash text null
attempt_type text not null
success boolean not null default false
created_at timestamptz not null default now()
```

## Token Handling

Rules:

- Generate raw tokens server-side using cryptographically secure randomness.
- Use at least 256 bits of entropy before URL-safe encoding.
- Show raw token in the generated URL after create/rotate and reconstruct it later only for owner/admin copy through a server-decrypted token envelope.
- Store a keyed HMAC token hash using a server-only pepper/secret for lookup.
- Store an encrypted token envelope only if persistent copy is part of the UI; decrypt it only inside owner/admin manager actions after permission checks.
- Never store raw token, raw token prefix, or raw token in analytics metadata.
- Never log raw token in application logs, error messages, or event metadata.
- Rotate by revoking or replacing the old token hash and issuing a new raw token once.
- Compare hashes using constant-time comparison where direct comparison is needed.
- Redact token path segments in logs and support artifacts.

Recommended lookup:

```txt
raw token -> normalize -> HMAC with server secret -> lookup token_hash
```

Plain SHA-256 without server secret is not sufficient for the final implementation plan.

## Token Recopy Contract

The manager UI shows a persistent `Public link` copy action. To support that without storing plaintext:

- `project_publications` may store `encrypted_token_envelope`;
- encryption key is server-only and separate from the HMAC lookup pepper;
- owner/admin permission is checked before decrypting;
- decrypted raw token is used only to reconstruct the URL in the server response to authenticated manager UI;
- decrypted token is never sent to receivers except as part of the URL they already possess;
- decrypted token is never logged or stored in events;
- rotating the link replaces both token hash and encrypted envelope;
- if encryption support is not approved, persistent copy must be replaced with `New link` to copy a new URL.

## Password Handling

Rules:

- Store only password hashes.
- Use Argon2id if runtime/package support is approved; otherwise use bcrypt with documented cost.
- Add a server-only pepper if the chosen library/runtime supports the pattern safely.
- Password resets replace the hash; passwords are not recoverable.
- Use minimum length and reject trivially empty/short passwords.
- Use short-lived receiver sessions after success.
- Rate-limit failures by token hash, receiver session, IP hash, and user-agent hash.
- Browser-only password validation is forbidden.
- Wrong-password responses must not reveal whether the token exists.

## Receiver Session Cookie

Implementation must define:

- cookie name that does not contain the raw token;
- HTTP-only;
- Secure outside local development;
- SameSite=Lax unless receiver cross-site embedding is explicitly approved;
- short TTL;
- path scoped to `/share` or narrower if feasible;
- session value stored as keyed hash or signed opaque value;
- invalidation behavior after revoke, rotate, expiry, password change, or republish.

## RLS And Grant Posture

Do not grant anon/public direct table access to:

- `projects`;
- `estimates`;
- `estimate_nodes`;
- `estimate_row_items`;
- `cost_library_items`;
- collaboration tables;
- publication management tables;
- publication event tables.

Recommended model:

- Management actions run as authenticated user with owner/admin checks.
- Receiver route validates token/password/session, then reads safe data through server-only resolver.
- Snapshot payload is already sanitized and can be read by server after publication validation.
- Event writes happen server-side only.
- Browser clients do not insert open events directly into tables.
- RLS remains enabled even if service-role is used on the server resolver.
- Every resolver cross-checks `workspace_id`, `project_id`, `publication_id`, `latest_snapshot_id`, `scope`, status, and expiry before returning payload.

## Publication Resolver

Create a dedicated server-only resolver in implementation:

```txt
resolvePublicationForReceiver(rawToken, receiverSession)
  -> normalize and keyed-hash token
  -> check token lookup rate limit
  -> load publication by token_hash
  -> validate status/expiry
  -> validate password session when required
  -> load latest snapshot
  -> record best-effort open event
  -> return safe receiver view model
```

Do not call `getProjectCollaborationSummary()` from receiver routes.

## Privacy Posture For Open Tracking

Open tracking should collect only what product needs:

- event type;
- timestamp;
- hashed viewer session;
- hashed IP;
- hashed user agent;
- referrer origin only;
- publication id;
- snapshot id;
- high-level outcome metadata.

Avoid:

- raw IP;
- raw user-agent;
- raw referrer URL;
- query strings;
- geolocation;
- fingerprinting beyond best-effort session hash;
- receiver email unless a later recipient-bound link plan approves it.

Retention:

- Raw event rows: 90 days.
- Aggregated open count and latest-open timestamp: retained on publication summary unless owner deletes/unpublishes under a future deletion policy.
- Legal/privacy review may tighten this before launch.

## Receiver Privacy And Legal Gates

Before public rollout:

- Reviewed Privacy Notice must describe client links, password sessions, and open tracking.
- Reviewed Terms must not imply legal acceptance or approval.
- Receiver page uses `noindex` and `X-Robots-Tag`.
- Cookie/session behavior is documented.
- Manager sees the data-sharing scope before publishing.
- Public launch remains blocked while `/privacy` and `/terms` are pending-review status pages.

## Abuse And Rate Limits

Required before public rollout:

- token lookup rate limit;
- password failure rate limit;
- event write deduplication/throttling;
- generic unavailable state for invalid tokens;
- spike monitoring for invalid token attempts;
- spike monitoring for password failures;
- spike monitoring for event floods;
- support/admin runbook for suspected leak or brute force.

Implementation details live in `12-security-rate-limit-and-session-runbook.md`.

## Cache Policy

V1:

- Receiver pages: `Cache-Control: no-store`.
- Password/API responses: `Cache-Control: no-store`.
- Downloads: disabled.
- Public static assets: normal cache only if they are non-sensitive.
- Published media URLs must be explicitly copied/signed/sanitized into the snapshot model before exposure.

## Copy Rules

Allowed:

- `Opened`
- `Latest open`
- `Open tracking is a best-effort signal`
- `Published snapshot`

Forbidden until future workflows exist:

- `Reviewed`
- `Approved`
- `Accepted`
- `Seen by client`
- `Legal proof`
- `Issued proposal`
- `Final proposal`
