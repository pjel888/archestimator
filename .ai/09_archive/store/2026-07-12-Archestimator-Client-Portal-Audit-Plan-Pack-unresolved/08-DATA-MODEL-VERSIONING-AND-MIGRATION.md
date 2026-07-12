# 08 — Data Model, Versioning, and Migration

## 1. Architectural correction

The existing `project_publications` row currently acts as:

- the stable link;
- the active publication;
- the snapshot;
- the issue/version;
- the recipient parent;
- the comment/decision parent.

Split those concerns.

## 2. Recommended target entities

### `client_portals`

Stable portal identity.

```sql
id
workspace_id
project_id
name
purpose
status                  -- draft/live/access_off/archived
stable_token_hash
encrypted_stable_token
access_policy_json
default_brand_profile_id
client_brand_profile_id
current_issue_id
created_by
created_at
updated_at
archived_at
```

Multiple live portals per project are allowed. Stable token rotation changes credentials, not portal ID.

### `client_portal_sections`

Editable draft section configuration.

```sql
id
portal_id
section_key             -- stable across issues
kind
title
description
sort_order
enabled
layout_mode
visibility_policy_json
data_scope_json
field_policy_json
interaction_policy_json
print_policy_json
config_json
created_at
updated_at
```

### `client_portal_issues`

Immutable issued version metadata.

```sql
id
portal_id
issue_number
version_label
status                  -- issued/superseded/withdrawn/accepted/declined
issued_at
issued_by
valid_through
supersedes_issue_id
manifest_json
content_hash
total_cost
currency_code
selected_estimate_ids_json
brand_snapshot_json
decision_policy_snapshot_json
assumptions_json
exclusions_json
created_at
```

Unique `(portal_id, issue_number)`.

### `client_portal_issue_sections`

Immutable section payloads and lazy-load boundary.

```sql
id
issue_id
section_key
kind
title
sort_order
payload_storage         -- d1_json / r2_object
payload_json
r2_object_key
payload_hash
payload_bytes
schema_version
created_at
```

This avoids a single ever-growing snapshot row and allows section-by-section loading.

### `client_portal_brand_profiles`

```sql
id
workspace_id
kind                     -- workspace/client/portal
client_key
name
owner_logo_asset_id
client_logo_asset_id
co_branding_mode
theme_json
contact_json
attribution_mode
created_by
created_at
updated_at
archived_at
```

An issue stores a brand snapshot so later brand changes do not rewrite an issued record.

### `client_portal_recipients`

Stable portal membership.

```sql
id
portal_id
email_normalized
display_name
client_organization
role_template
status                   -- invited/active/revoked/expired
is_required_approver
verification_state
recipient_credential_version
last_verified_at
last_seen_at
created_at
updated_at
revoked_at
```

Unique `(portal_id, email_normalized)`.

### `client_portal_recipient_credentials`

Rotate credentials without destroying membership/history.

```sql
id
recipient_id
token_hash
status                   -- active/revoked/used/expired
expires_at
created_at
revoked_at
```

### `client_portal_recipient_grants`

Sparse overrides.

```sql
id
recipient_id
section_key
capability
effect                   -- allow/deny
created_by
created_at
```

### Discussion tables

- `client_portal_threads`
- `client_portal_messages`
- `client_portal_thread_reads`
- `client_portal_thread_subscriptions`
- `client_portal_message_mentions`

See the discussion specification.

### `client_portal_decisions`

```sql
id
portal_id
issue_id
recipient_id
scope_kind               -- issue initially
scope_key
decision                 -- approved/changes_requested/declined
note
signer_name
signer_email_snapshot
signer_role_snapshot
issue_content_hash
intent_hash
submitted_at
voided_at
voided_by
void_reason
supersedes_decision_id
```

Unique active decision by `(issue_id, recipient_id, scope_kind, scope_key)`.

### `client_portal_audit_events`

Append-only business/security record.

### `client_portal_analytics_events`

Privacy-governed engagement data with separate retention.

### `client_portal_notification_outbox`

Transactional email/in-app delivery intents and idempotency.

### `client_portal_assets`

Metadata for owner/client logos, cover images, and future visible documents.

## 3. Issue snapshot shape

```json
{
  "schemaVersion": 2,
  "portal": {
    "publicId": "portal_...",
    "name": "Client Cost Review"
  },
  "issue": {
    "publicId": "issue_...",
    "number": 3,
    "versionLabel": "Rev 2",
    "issuedAt": "2026-07-12T...",
    "validThrough": null,
    "contentHash": "sha256..."
  },
  "brand": {
    "mode": "prepared_by_for",
    "owner": {"name": "...", "logo": "..."},
    "client": {"name": "...", "logo": "..."},
    "theme": {"accent": "...", "surface": "..."}
  },
  "project": {
    "publicId": "proj_...",
    "name": "...",
    "code": "...",
    "location": "...",
    "currencyCode": "PHP"
  },
  "sections": [
    {
      "key": "section_...",
      "kind": "overview",
      "title": "Overview",
      "layoutMode": "standard",
      "payloadHash": "...",
      "capabilityHints": ["thread:view"]
    }
  ],
  "decisionPolicy": {
    "scope": "issue",
    "rule": "all_required",
    "requiredApproverCount": 2
  }
}
```

The public manifest contains no internal UUIDs, private storage paths, raw emails, margins, hidden fields, or access policy internals.

## 4. Draft versus issue data

### Draft data can reference live sources

Inside authenticated Publisher:

- selected estimate IDs;
- selected chart modes;
- source freshness;
- configurable fields;
- current branding;
- unresolved thread carry-forward choices.

### Issued data is self-contained

At publish time:

- resolve authorized source rows;
- calculate canonical totals;
- aggregate charts;
- build tree;
- sanitize IDs and fields;
- snapshot section payloads;
- snapshot branding;
- snapshot decision policy;
- compute hashes;
- write issue and section payloads atomically;
- update portal current issue.

Public reads never recalculate the issued total from live estimate tables.

## 5. Concurrency and idempotency

### Portal draft

Use an optimistic version or `updated_at` compare-and-swap. Conflicting edits return 409 with current draft metadata.

### Publish

Use a client-generated idempotency key and D1 transaction/batch:

1. reserve publish intent;
2. validate source and policy;
3. allocate next issue number;
4. insert issue and sections;
5. update prior issue/current issue;
6. append audit event;
7. enqueue notifications.

Retrying the same key returns the same issue.

### Message

Client-generated message ID prevents offline/retry duplication.

### Decision

Unique active constraint plus idempotency key. Catch uniqueness conflict and return the saved decision instead of a generic failure.

## 6. Version rules

- issue number increments only on successful publish;
- draft revision counter is not an issue number;
- issue content is immutable;
- access policy can be immediate but is audit-recorded;
- branding displayed on an issue comes from its snapshot;
- current portal URL defaults to current issue;
- historic issue access follows portal policy;
- a superseded issue is visibly marked;
- accepted issue remains retrievable according to retention.

## 7. Multiple portals per project

Remove the one-published-publication-per-project invariant. Replace with:

- unique active stable token;
- optional unique portal name within project;
- one current issue per portal;
- many portals per project.

Publisher summaries group by portal, with project as a filter.

## 8. Migration strategy

Do not perform a destructive big-bang rename.

### Phase M1 — Add new parent and issue model

- create `client_portals`;
- create issue/section/brand/recipient/policy/event tables;
- add `legacy_publication_id` mapping;
- leave current routes operational.

### Phase M2 — Backfill

For each project publication history:

- create one default portal per project for the existing sequence;
- map each legacy publication to an issue ordered by snapshot/published version;
- set active publication as current issue;
- preserve historic status and token routing;
- create stable portal token;
- merge recipient identities by normalized email;
- preserve old recipient rows as legacy issue-delivery references;
- map comments/decisions/events to issue and recipient.

Where history is ambiguous, preserve separate legacy portals rather than incorrectly merge unrelated audiences.

### Phase M3 — Dual read

- `/share/[token]` first resolves new portal token;
- if not found, resolves legacy publication token;
- legacy route can redirect or render mapped issue;
- Publisher reads new portal model, with legacy rows flagged.

### Phase M4 — Dual write disabled

New portal creation writes only the new model. Existing legacy publication edit opens migration/upgrade path before a new issue.

### Phase M5 — Retire legacy writes

After parity and rollback window:

- stop `replace_project_publication` for user-facing updates;
- keep legacy tables read-only for retention;
- remove old one-active-per-project index when safe;
- preserve old URLs according to policy.

## 9. Comment migration

- map `publication_id` to issue;
- map `recipient_id` to stable portal recipient;
- preserve body, labels, target IDs, version, actor, timestamp;
- create threads/messages;
- retain legacy ID;
- default open status;
- never expose internal legacy comments.

## 10. Decision migration

Current one-per-publication responses become issue-wide decisions. Preserve:

- decision;
- note;
- signer;
- timestamp;
- snapshot version;
- target label as historic metadata only.

Do not reinterpret a row-labeled legacy decision as a valid row-level workflow. Mark it as a legacy issue-wide decision that was displayed with contextual target metadata.

## 11. Token migration

- existing publication tokens remain valid for their mapped issue during compatibility;
- create new stable portal token;
- owner can send the new portal URL;
- old recipient bootstrap tokens can establish/upgrade stable recipient identity;
- rotating portal token does not delete recipient credentials;
- credential version invalidates sessions deliberately.

## 12. Storage strategy

### D1

Store:

- portal/issue metadata;
- policies;
- recipients;
- threads/messages;
- decisions;
- events;
- small section payloads;
- hashes and R2 pointers.

### R2

Use for:

- branded assets;
- client-visible documents;
- large immutable section payloads;
- issue export packages;
- archived snapshots.

Never expose raw R2 keys. Use signed/token-scoped broker routes or immutable public-safe asset URLs with non-guessable content IDs and explicit policy.

## 13. Indexes

At minimum:

- portals by workspace/project/status;
- issues by portal/number/status;
- sections by portal/order;
- issue sections by issue/order;
- recipients by portal/email/status;
- credentials by token hash/status;
- threads by portal/status/last_message;
- threads by issue/target;
- messages by thread/created;
- decisions by issue/recipient/scope;
- audit events by portal/occurred;
- analytics by portal/recipient/issue/type/time;
- outbox by status/next attempt.

## 14. Deletion and archive

Before claims of durable client records:

- live project deletion creates a project tombstone;
- retained portal issues and decision/activity records survive according to policy;
- private live-source relationships are severed;
- immutable issue payloads remain self-contained;
- public access may be turned off while owner/archive access remains;
- data subject and retention processes can locate portal records;
- deletion event records what was retained and why.

## 15. Data-model acceptance criteria

- one project can have multiple active portals;
- one portal can have multiple immutable issues;
- stable URL survives issue publication;
- recipients survive issue publication and token rotation;
- historic issues render without live project rows;
- every comment/decision resolves to portal and issue;
- decisions cannot mutate accepted issue data;
- no hidden field is serialized;
- migration preserves old URLs and history;
- deleting source data follows an explicit retention rule rather than cascading silently.
