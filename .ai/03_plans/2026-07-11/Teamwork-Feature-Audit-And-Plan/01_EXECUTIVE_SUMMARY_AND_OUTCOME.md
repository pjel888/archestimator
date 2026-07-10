# Executive Summary and Outcome

## Verdict

Archestimator has substantial collaboration infrastructure, but the private Teamwork feature is not yet a coherent, production-ready product surface. The current system contains active D1 membership and invite tables, scoped authorization predicates, a secret-gated invite flow, a Durable Object WebSocket room, estimate cursor UI, and useful hosted proof artifacts. The gaps are at the boundaries between those pieces: policy parity, atomic invariants, management UX, scoped metadata, server-enforced realtime capabilities, and evidence ownership.

The dependency-closed local implementation slice is ready. Hosted proof is conditionally blocked behind `AUTH-001`, because proving current Durable Object code requires an owner-authorized nonzero canary or cutover. Product behavior is not yet complete.

## Highest-Risk Findings

1. **Restricted-sheet metadata exposure:** a sheet-only member satisfies `canAccessProjectInD1`, while `project-estimate-sheets-repository.ts` can return all estimates in that project. Names, codes, and timestamps for other sheets may be enumerable without sheet access.
2. **Manager-policy contradiction:** the collaboration summary marks direct sheet owner/admin as able to manage access, while sheet actions first require project-manager authority. The UI can expose controls the server rejects.
3. **Target-dominance gap:** generic role and removal actions do not consistently prevent an admin from modifying an owner or equal-ranked manager. Re-inviting an existing member can overwrite the stored role and bypass normal role-change safety.
4. **Non-atomic authorization invariants:** last-manager checks, pending-invite deduplication, token reissue, restriction, and acceptance span read-then-write sequences without active D1 invariants covering the whole transition.
5. **Incomplete lifecycle surface:** project invite/manage actions exist but have no runtime callers; pending invitations are produced but not rendered; revoke/cancel and estimate role-update flows are missing.
6. **Realtime trust gap:** authorized clients can self-report display labels; any authorized socket can broadcast arbitrary events; unauthenticated sockets can remain connected; clients do not have an authorization acknowledgement or robust token refresh.
7. **Stale confidence:** canonical Teamspace docs and several tests still assert historical Supabase behavior rather than active Cloudflare D1 and Durable Object behavior.

## Product Outcome

The first supported Teamwork release will provide:

- one canonical effective-access resolver used by server actions, repositories, DTOs, UI capability rendering, and tests;
- manager-safe project and estimate membership controls with explicit owner-transfer boundaries;
- an explicit distinction between adding a known member and sending an invitation;
- pending, delivered, failed, accepted, revoked, expired, and superseded invitation states;
- atomic active-D1 constraints for manager floors, invite uniqueness, token use, membership grants, and audit facts;
- a dedicated internal Team access surface, with Publisher consuming a compatibility contract instead of owning membership semantics;
- scoped views for sheet-only users and manager-only email/pending-invite visibility;
- trustworthy presence and visible estimate cursors for concurrent editors;
- server-enforced viewer, cursor, and event capabilities;
- durable redacted Activity facts for access changes, with cursor traffic remaining ephemeral;
- separate local, hosted-D1, hosted-DO, and release evidence.

## Explicit Deferrals

- Project-wide cursors remain feature-flagged off until fanout and usability proof passes.
- Row-level collaborative editing, CRDT/OT, follow mode, and cursor history are not in this slice.
- Public share recipients remain owned by Publisher and never receive internal membership.
- Per-user negative ACL entries are not added. Restricted sheets use inheritance-off plus explicit direct grants.
- Generic owner assignment is not exposed; ownership transfer requires a separately designed operation.
- Cloudflare Workers for Platforms is not adopted for this release.

## Success Measures

- Every actor-resource-action cell has a single expected answer and parity tests.
- No repository query returns inaccessible sheet, roster, email, or pending-invite metadata.
- Concurrent writes cannot remove the last required manager or create duplicate pending invites.
- Invite replay, wrong-account, expiry, revocation, reissue, and failure injection are deterministic.
- A two-client hosted estimate session shows both trusted identities, remote cursor movement, reconnect, expiry refresh, cleanup, and removal enforcement targeting 5 seconds with a hard 30-second maximum.
- A forged viewer cursor/event broadcast is denied by the Durable Object.
- Activity and Publisher receipts are current and hash-bound before integrated completion.

## Stop Condition

Do not elevate product readiness from this plan alone. Local independent work may proceed through the advertised slice (`UNIT-001` through `UNIT-008`, plus `UNIT-010` through `UNIT-013`). Stop before `UNIT-009`, `UNIT-014`, and downstream `UNIT-015` until owner-refreshed Activity and Publisher manifests validate; separately stop at `AUTH-001` before any production version/deployment or nonzero Durable Object traffic action. Product completion requires `UNIT-019` to produce a final integration receipt and all remaining release gates to have an explicit `READY`, `BOUNDARY`, or `NOT_READY` result backed by the correct proof class.
