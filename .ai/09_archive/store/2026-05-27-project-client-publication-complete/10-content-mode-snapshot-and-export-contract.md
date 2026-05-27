# Content Mode Snapshot And Export Contract

**Date:** 2026-05-27
**Status:** Implemented V1 content semantics. Export/download remains future-gated.

## V1 Content Decision

V1 publication uses immutable sanitized snapshots.

This means:

- publishing creates a JSON snapshot payload;
- receiver views render from the snapshot, not live project tables;
- internal project/estimate edits after publication do not change receiver output;
- `Update public page` creates a new snapshot version;
- the same client link resolves to the latest active snapshot for that publication;
- revocation blocks all snapshots for that publication.

## Why Snapshot

The current app has mutable estimate sheets and a private current-estimate XLSX export. A live read-through client link would let internal edits silently change what an external receiver sees. Since public/client links may be interpreted as commercial communication, V1 should start with the safer snapshot model.

## Snapshot Lifecycle

```txt
draft settings
  -> publish
  -> snapshot v1 created
  -> receiver link resolves snapshot v1
  -> internal edits happen
  -> receiver still sees snapshot v1
  -> owner/admin republish
  -> snapshot v2 created
  -> receiver link resolves snapshot v2
  -> owner/admin revoke
  -> receiver sees generic unavailable
```

## Snapshot Storage Contract

Each snapshot stores:

- `publication_id`;
- `workspace_id`;
- `project_id`;
- `snapshot_version`;
- `payload_schema_version`;
- `payload_json`;
- `content_hash`;
- `created_by`;
- `created_at`.

Snapshot payload must be built from the whitelist in `09-receiver-view-model-and-field-whitelist.md`.

## Manager Copy

Use:

- `Published snapshot`;
- `Last published`;
- `Update public page`;
- `Internal changes after this time are not visible to this client link until you republish.`

Avoid:

- `Live`;
- `Synced`;
- `Issued proposal`;
- `Final`;
- `Approved`.

## Receiver Copy

Use:

- `Published: <timestamp>`;
- `Prepared for`;
- `Included estimates`;
- `Open tracking is a best-effort signal` only if surfaced.

Avoid:

- `Issued`;
- `Accepted`;
- `Approved`;
- `Reviewed`;
- `Legally binding`;
- `Client has seen this`.

## Relationship To Current Proposal Export

Current proposal export:

- is private/authenticated;
- reads current estimate data;
- produces XLSX from current state;
- is not a publication artifact;
- must not be exposed through `/share/[token]`.

V1 publication:

- disables downloads;
- stores sanitized JSON snapshots;
- renders HTML receiver view;
- does not produce immutable PDF/XLSX.

Future proposal/export publication requires a separate plan that defines:

- immutable export payload;
- PDF/XLSX artifact generation;
- permissioned download routes;
- artifact retention;
- download event tracking;
- cache/revocation strategy;
- legal/proposal language.

## Update Public Page Rules

- Only owner/admin can update the public page.
- Update validates current project access and selected estimate access before snapshot creation.
- Update increments `snapshot_version`.
- Update keeps the same public link URL.
- Update does not reset open count unless a later product decision says otherwise.

## Revocation Rules

- Revoke changes publication status to revoked and sets `revoked_at`.
- Revoke does not delete snapshots immediately; preserve audit evidence unless privacy deletion policy requires otherwise.
- Receiver resolver must reject revoked publications before reading snapshot payload.
- Revoke records a `revoked` event.

## Expiry Rules

- Expiry is checked on every receiver/password/API request.
- Expired links return generic unavailable.
- Expiry does not delete snapshots.
- Extending expiry requires owner/admin action.

## Live Read-Through Is Deferred

If a future plan switches to live read-through, it must add:

- copy that says `Current view`;
- tests proving no issued/proposal language appears;
- cache invalidation rules;
- row-level privacy rules for new data after publication;
- event semantics for content changes;
- legal/privacy review of silent updates.

Do not implement live read-through under this V1 plan.
