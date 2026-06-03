# 13 Storage Cleanup And Audit Outbox Strategy

## Purpose

Database deletes and Supabase Storage object deletes are not one transaction. This document defines the safe boundary so future implementation does not claim atomic object cleanup.

## Storage Buckets And Paths

| Surface | Bucket | Trusted source | Delete timing |
|---|---|---|---|
| Project image and thumbnail | `component-images` | `projects.metadata.projectImagePath` and `projectImageThumbnailPath` read before DB delete. | After project DB delete commits. |
| Component variant image and thumbnail | `component-images` | `cost_library_items` / price-option image fields read before hard delete. | Phase 6 hard delete only, after DB commit. |
| Component variant attachments | `component-attachments` | `cost_library_item_variant_attachments.storage_bucket/storage_path` rows read before hard delete. | Phase 6 hard delete only, after DB commit. |

Archive never deletes storage.

## Allow-List Rules

Project images:

- bucket is exactly `component-images`;
- path ends with `.webp`;
- path contains `/project-images/`;
- path contains no `..`;
- path contains no `//`.

Component images:

- bucket is exactly `component-images`;
- path ends with `.webp`;
- first segment is the workspace id returned by the trusted DB query;
- path contains no `..`;
- path contains no `//`.

Component attachments:

- bucket is exactly `component-attachments`;
- first segment is the workspace id returned by the trusted DB query;
- path is read from attachment rows, not generated from display names;
- path contains no `..`;
- path contains no `//`.

Reject failed allow-list checks before calling `storage.remove()`. Record rejected paths as cleanup warnings if they came from trusted DB rows.

## Execution Order

1. Preview RPC returns storage counts and safe labels, not arbitrary client paths.
2. Execute RPC reads DB-derived cleanup candidates inside the transaction and returns them with execution result.
3. Execute RPC commits database changes and audit event.
4. Server action groups storage paths by bucket.
5. Server action removes paths in bounded chunks.
6. Server action records cleanup success/failure in result and audit update.
7. Client shows success plus warning when cleanup has failures.

Do not place object-storage deletion inside SQL or before DB commit.

## Audit Strategy

Recommended table: `mass_deletion_events`.

Minimum storage/audit fields:

- `correlation_id`;
- `actor_user_id`;
- `workspace_id`;
- `target_type`;
- `target_ids`;
- `preview_hash`;
- `preview_summary`;
- `result_summary`;
- `storage_cleanup_attempted`;
- `storage_cleanup_deleted`;
- `storage_cleanup_failed`;
- `status`;
- `created_at`;
- `updated_at`.

Sensitive values prohibited:

- raw publication tokens;
- recipient token hashes;
- invite raw tokens;
- password hashes;
- raw `snapshot_json`;
- attachment file contents;
- service-role credentials;
- raw AI prompts.

## Retry / Outbox Decision

Recommended release default: store failed cleanup metadata in `mass_deletion_events` and do not add a background worker in the first implementation.

Rationale:

- closed beta scale is bounded;
- failed object cleanup does not corrupt database state;
- adding a durable worker/outbox is operationally heavier than the first feature needs.

Escalate to an outbox table only if storage failures are observed or if Phase 6 hard delete becomes common.

If added later, the outbox should be:

- admin-only;
- bucket/path allow-list enforced again at retry time;
- idempotent on missing objects;
- linked to the original `mass_deletion_events.id`;
- capped per retry run.

## Failure Semantics

| Failure | User result | Audit result | Retry |
|---|---|---|---|
| DB preview fails | No deletion. | Optional failed preview log. | User retries after fixing issue. |
| DB execution fails | No DB mutation. | Failed execution row if correlation was accepted. | User retries from fresh preview. |
| Storage cleanup partially fails | DB deletion remains successful. | `status = storage_warning`; failed paths recorded. | Manual/admin retry after path review. |
| Storage path fails allow-list | DB deletion remains successful. | Warning with rejected trusted path. | Manual investigation before any object removal. |

## Acceptance Criteria

- No client-supplied storage path reaches `storage.remove()`.
- Storage failures never trigger blind recreation of deleted DB rows.
- The final UI warning includes failed object count.
- Audit data is enough to perform a safe manual cleanup later.
- Phase 6 hard delete cannot ship without storage allow-list tests.
