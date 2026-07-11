# TEAMWORK-ACTIVITY-CONTRACT-v1

**Status:** accepted for the enumerated source-local producer/consumer mapping; not release or hosted proof.

**Recorded:** 2026-07-11

## Bound Pack State

| Pack | Validation command | Manifest SHA-256 | Baseline head |
| --- | --- | --- | --- |
| Teamwork Feature Audit And Plan | `bun run validate:plan-pack -- .ai/03_plans/2026-07-11/Teamwork-Feature-Audit-And-Plan` | re-frozen with this receipt | `e373bc865b978e237deb1d92011c96b0a3639fb4` |
| Activity History Mapping (archived owner) | `bun run validate:plan-pack -- .ai/09_archive/store/2026-07-11-Activity-History-Mapping-complete` | `73ac9c522d6ee1ac7153a87c61eb15f4e841696b452d012268a9ee7b6809f9b8` | archived owner artifact |

The archived Activity owner pack validated on the record date. Its archive is not modified by this Teamwork receipt.

## Contract

`TEAMWORK-ACTIVITY-CONTRACT-v1` is a compatibility adapter over the existing immutable `collaboration_audit_events` store. Teamwork remains the producer; Activity remains the reader/composer owner. The persisted event type is retained for backward compatibility and the Activity composer maps it to the following v1 semantic event.

| Persisted producer event | v1 semantic | Activity action | Feed bucket |
| --- | --- | --- | --- |
| `invite_email_attempted` | `teamwork.invitation.delivery_attempted` | `invited` | `invited` |
| `collaboration_invite_email_sent` | `teamwork.invitation.delivery_succeeded` | `invited` | `invited` |
| `collaboration_invite_email_delivery_failed` | `teamwork.invitation.delivery_failed` | `recorded` | `system` |
| `collaboration_invite_token_issued` | `teamwork.invitation.reissued` | `invited` | `invited` |
| `collaboration_invite_link_copied` | `teamwork.invitation.reissued` | `invited` | `invited` |
| `collaboration_invite_revoked` | `teamwork.invitation.revoked` | `removed` | `invited` |
| `member_added` | `teamwork.membership.granted` | `added` | `invited` |
| `role_changed` | `teamwork.membership.role_changed` | `changed` | `invited` |
| `member_removed` | `teamwork.membership.removed` | `removed` | `invited` |
| `estimate_access_restricted` | `teamwork.estimate_access.restricted` | `changed` | `edited` |
| `estimate_access_inherited` | `teamwork.estimate_access.inherited` | `changed` | `edited` |

Invitation creation, expiry, and acceptance have no separate durable Activity facts in the current source. They remain implementation gaps, not implied by this adapter.

## Producer And Redaction Boundary

- Producer: `src/lib/collaboration/actions.ts` SHA-256 at record time is bound by the Teamwork manifest refresh.
- Access-changing direct add, role change, removal, and estimate-access mode facts use the same D1 batch boundary as their access mutation.
- Invitation token issue/delivery audit metadata now persists only `delivery_method`; token hints, token identifiers, recipient email, URLs, and secrets are excluded.
- `composeCollaborationActivity` also deny-lists metadata keys containing email, token, URL, secret, or password, protecting historical rows from owner raw-payload exposure.
- Realtime presence, cursor, connection, and telemetry frames are excluded from this contract.

## Consumer Acknowledgement And Evidence

| Consumer path | SHA-256 |
| --- | --- |
| `src/lib/activity/activity-composer.ts` | `ad5ba4498f44b3b91b53d8bbdc2b999e1d8ba9f3eef0bacad47c342a30fe118e` |
| `src/lib/repositories/project-activity-feed-repository.ts` | `80bf8dc0030b1dbac349a7cbeea465381ab01f4f97f68ecd2c86f6b560cdb2e3` |

Verified on the record date:

```text
bunx vitest run tests/vitest/collaboration-activity-contract.test.ts tests/vitest/project-activity-page/action-classes.test.ts tests/vitest/project-collaboration-actions.test.ts --maxWorkers=1
3 files passed, 40 tests passed
```

The tests prove composer actions/titles, feed buckets, and payload redaction for the mapped event set. They do not prove migration of historical rows, invitation creation/expiry/acceptance facts, asynchronous email outbox delivery, browser behavior, or hosted D1/Activity evidence.

## Compatibility Decision

The stored event names remain accepted legacy transport values. New readers consume the v1 semantic mapping above; no backfill or destructive migration is authorized by this receipt. A producer, composer, redaction, or owner-manifest change invalidates this receipt and requires a new source-matched record.

**Verifier:** Teamwork integrator, source/test evidence recorded 2026-07-11.

