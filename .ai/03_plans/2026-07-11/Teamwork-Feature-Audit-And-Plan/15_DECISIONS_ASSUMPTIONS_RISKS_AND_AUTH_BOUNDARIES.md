# Decisions, Assumptions, Risks, and Authorization Boundaries

## Closed Decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| `DEC-AUTO-001` | One actor-resource-action policy is canonical. | Prevent server/repository/UI/realtime drift. |
| `DEC-AUTO-002` | Workspace member edits; workspace viewer reads; both are internal members for correct classification. | Matches role intent and fixes naming misuse. |
| `DEC-AUTO-003` | Restricted sheets disable inherited access and use direct allowlist grants; no per-user negative ACL in v1. | Preserves simple current schema semantics. |
| `DEC-AUTO-004` | Sheet-only users get a minimal scoped project shell and only accessible sheet/roster data. | Enables navigation without metadata leakage. |
| `DEC-AUTO-005` | Generic admins cannot mutate owners or equal admins; owner transfer is separate and deferred. | Enforces target dominance and manager safety. |
| `DEC-AUTO-006` | Add known member, invite email, and change role are distinct operations. | Removes hidden direct-grant/downgrade behavior. |
| `DEC-AUTO-007` | All email invitations require explicit POST acceptance; auth-return GET never grants membership. | Clear consent and route safety. |
| `DEC-AUTO-008` | Project removal offers explicit retain-sheet versus cascade-sheet modes. | Makes retained access intentional. |
| `DEC-AUTO-009` | Teamwork owns a dedicated Team access surface; Publisher consumes a compatibility contract. | Keeps internal/public authority separate. |
| `DEC-AUTO-010` | Realtime v1 scope is presence + estimate cursors, not live data synchronization. | Meets visible-cursor goal without unsafe peer data replication. |
| `DEC-AUTO-011` | Viewers may publish coarse presence but only receive cursors/events; project rooms require whole-project access. | Enforces least privilege and scoped topics. |
| `DEC-AUTO-012` | Defer Workers for Platforms and per-tenant D1/R2/custom-hostname partitioning; use existing bound Worker, shared tenant-predicated D1/R2, DO, Queue, and Email resources. | No customer code/custom-domain/hard-isolation need; paid/provisioned tenancy adds migration, backup, analytics, incident, and cost complexity without fixing current RBAC/atomicity gaps. |
| `DEC-AUTO-013` | Access-changing lifecycle facts are atomic/fail-closed; external delivery observations may be asynchronous. | Preserves durable audit integrity without holding DB transactions over email. |
| `DEC-AUTO-014` | Project-wide cursors remain off; GlobalPresence and row-update scaffolding are not product claims. | Avoids overclaiming incomplete infrastructure. |
| `DEC-AUTO-015` | Hosted proof requires a source-matched Worker version/deployment packet; HTTP/D1 may use an authorized 0%-traffic version override, while new Durable Object code requires an authorized nonzero canary or cutover. | Preview URLs do not support DO Workers, and 0% deployment cannot assign new DO code. |

## Assumptions

- Current active source and D1 migrations remain authoritative over archived Supabase material.
- Better Auth profile email remains the exact recipient identity for invitation acceptance.
- Existing bound Cloudflare resources are sufficient for this slice.
- Current product scale fits one room per project/estimate topic after caps and multiplexing; this must be measured.
- The Activity and Publisher owners can refresh their currently stale manifests and provide source-matched consumer receipts during implementation; until then `UNIT-009`, `UNIT-014`, and downstream `UNIT-015` remain blocked.
- The repo remains on free-tier/bundled Cloudflare limits unless the owner explicitly changes the cost posture.

Every assumption is a stale trigger if invalidated.

## Risk Register

| Risk | Severity | Mitigation | Stop/response |
| --- | --- | --- | --- |
| authorization parity regression across many callers | critical | policy adapter, caller inventory, table parity tests | stop on any unexplained difference |
| inaccessible estimate/roster metadata leak | critical | set-based scoped queries and denial tests | ship query isolation before UI |
| concurrent manager-floor violation | critical | active D1 invariant + concurrency tests | no migration verification without proof |
| partial invite acceptance grants access | critical | one transaction + failure injection | fail closed |
| owner/equal-admin privilege escalation | critical | target dominance and filtered UI | deny and log stable code |
| Activity manifest or contract/source drift | high | owner-refresh the five stale hashes, revalidate, then bind exact producer/consumer hashes | `UNIT-009` and integrated QA remain blocked |
| Publisher manifest drift or DTO breakage | high | owner-refresh the eight stale hashes, revalidate, then run compatibility receipt and caller tests | `UNIT-014` and integrated QA remain blocked; retain adapter/old path |
| viewer/forged realtime broadcast | high | token capabilities and DO enforcement | keep cursors flag off |
| silent token expiry/reconnect failure | high | auth ack/refresh/state machine | degraded UI, no false subscribed state |
| optimistic D1 conflict not recognized | high | stable code normalization and real-adapter tests | fix before concurrent UX claim |
| invite email/link disclosure | high | redaction, bounded preview, log scans | revoke/rotate affected token if exposed |
| room abuse/cost growth | high | caps, token buckets, fanout proof, kill switch | disable/cap realtime |
| stale legacy docs/tests mislead work | medium | supersede and record active proof | do not accept as evidence |
| scope expansion into CRDT/platform product | medium | explicit non-goals and decisions | new plan/owner approval |
| hosted proof exercises old or unrouted Worker/DO code | high | `AUTH-001`, version metadata, routing proof, bounded canary, rollback | stop hosted proof; never infer current-code proof |

## Authorization Boundaries

There is no active authorization boundary blocking the advertised local ready slice (`UNIT-001` through `UNIT-008`, plus `UNIT-010` through `UNIT-013`). The stale Activity and Publisher manifests are technical dependency blockers, not authorization boundaries; they block `UNIT-009`, `UNIT-014`, and downstream `UNIT-015`.

External actions still require their unit's normal credentials and gates:

- source-matched hosted D1/DO proof;
- production Worker version upload/deployment, traffic allocation, or cutover;
- provider billing changes;
- paid Workers for Platforms adoption;
- Git branch/worktree/push/history operations.

Workers for Platforms is deferred rather than blocked: it is unnecessary for the chosen design. If a revisit trigger occurs, create `AUTH-CFPLATFORM-01` in a new decision/plan and obtain explicit owner approval before enabling paid service.

### `AUTH-001` - Source-Matched Worker Deployment and Durable Object Canary

- **Status:** active; blocks `UNIT-016` through `UNIT-019`, `AC-020`, and `GATE-OPS-01`; does not block the local ready slice.
- **Exact prohibited side effect:** upload/deploy a production Worker version, add it to the current deployment, route proof traffic, allocate any nonzero percentage, or cut over production without an explicit owner-approved packet.
- **Higher-priority boundary:** production side effects and traffic changes require owner authority even though the repo grants standing access to the named Cloudflare resources.
- **Dependent claim only:** source-matched hosted D1 invitation proof and current Durable Object/two-client proof.
- **Safe fallback/default:** stop after `TEAMWORK-LOCAL-INTEGRATION-v1`; keep feature flags off and release at `BOUNDARY`.
- **Local prerequisites:** all local units, including currently dependency-blocked `UNIT-009`, `UNIT-014`, and `UNIT-015`, verified; active migration state known; exact build/source/config hashes captured; rollback tested locally.
- **Evidence already gathered:** official Cloudflare docs show preview URLs are unavailable for DO Workers; a 0%-traffic version override can exercise HTTP/D1 only after deployment membership; new DO code needs nonzero deployment percentage.
- **Unblock procedure:** owner approves the current deployment, version ID, proposed 0% override and/or nonzero canary/cutover, percentage, maximum window, feature flags, version metadata, DO compatibility/migrations, monitoring, rollback/cleanup, and bound D1 migration state.
- **Expected result:** exact routed version is independently proven before hosted receipts are accepted.
- **Rollback:** restore the prior deployment/version percentages, disable Teamwork/realtime flags, remove temporary override/proof state, and verify prior-version routing.
- **Post-action verification:** version metadata, routed response marker, D1/DO scenario receipts, monitoring window, rollback readiness, cleanup counts, and independent verifier.

## Decision Reopen Triggers

- customer-authored executable extensions or custom domains;
- regulatory, scale, residency, contractual, or hard-isolation evidence that shared tenant-predicated D1/R2 is insufficient;
- a requirement for true live data synchronization/CRDT;
- a product decision to let viewers publish pointers;
- a need for explicit per-user deny ACLs;
- owner-transfer scope added;
- Activity/Publisher contract cannot support the proposed integration;
- D1 cannot provide the required transaction boundary under current runtime;
- measured room scale exceeds current architecture/cost caps.
