# Security, Privacy, Abuse, and Threat Model

## Protected Assets

- project and estimate content;
- project/estimate names, codes, timestamps, and existence;
- roster identity, role, email, and pending invitation state;
- invitation bearer tokens and acceptance state;
- membership and access-setting integrity;
- Activity facts and operator logs;
- realtime topic membership, subject identity, cursor/presence payloads;
- platform/workspace/project/estimate authority boundaries.

## Actor Classes

- unauthenticated attacker;
- valid invite bearer without authenticated account;
- wrong authenticated account holding a token;
- public Publisher recipient;
- workspace/project/sheet viewer;
- editor/member;
- project/sheet admin;
- owner;
- platform admin;
- removed or recently revoked member;
- malicious authorized WebSocket client;
- link scanner, retrying queue, or concurrent request pair.

## Threats and Controls

| Threat | Current exposure | Required control | Proof |
| --- | --- | --- | --- |
| sheet metadata enumeration | broad project-shell list query | select authorized estimate IDs only | sheet-only denial integration test |
| roster/email overexposure | merged summary fields | scoped DTO and manager-only email selection | actor matrix tests |
| privilege escalation | target dominance incomplete | canonical actor/target capability + owner boundary | runtime action tests |
| last-manager removal race | read-then-write guard | active D1 atomic invariant | concurrent D1 test |
| duplicate pending invites | select then insert/update | active unique scope key/upsert | concurrent create test |
| invitation replay | token/lifecycle split | atomic consume/grant/fact | replay and failure injection |
| wrong-account disclosure | bearer preview/email copy | generic mismatch; bounded preview | route/DOM tests |
| GET mutation/CSRF | `/workshop/pending-invite` GET accepts via signed cookie (`route.ts:70`) | explicit same-origin POST only on both accept paths | route method/origin tests |
| token leakage | raw URL/email path | hash at rest; redact logs/artifacts/referrers | log scan and denial tests |
| invite-driven downgrade | `upsertInvitation` role update on collision + `ON CONFLICT DO UPDATE` on re-invite | add/invite/change separation; monotonic invite | role regression tests |
| restricted-sheet manager bypass | project-only reissue auth | exact invitation-scope capability | action tests |
| forged realtime identity | self-reported `displayName` stored verbatim in cursor hook (`use-estimate-cursor-broadcast.ts:241-242`) | token subject binding and trusted roster resolution in the renderer | DO + client tests |
| viewer cursor/event publish | DO performs no capability check; envelope role hardcoded `"member"` and ignored | signed capability claim encoded in token + DO event matrix | forged viewer test |
| arbitrary event/payload | DO format-checks event name only, forwards payload untouched (`collaboration-room.ts:53-55,130-138`) | event registry/schema/size/rate validation | fuzz/property tests |
| unauthorized socket exhaustion | no auth deadline, no eviction of unauthorized sockets | auth timeout, caps, token buckets | abuse/load tests |
| stale membership access | 300s token TTL is the only revocation path; no socket close on removal | membership version/refresh/revocation budget | hosted removal test |
| key reuse | four-secret fallback chain ending in invite pepper (`realtime-room-token.ts:4-9`) | dedicated versioned realtime keys, fail-closed in production | env/config gate |
| sensitive telemetry | raw UUID topics/arbitrary metadata | hashing and allowlisted fields | static/error-handling gate |
| public/internal authority mix | Publisher access presentation | explicit type/repository/route separation | cross-boundary denial tests |

## Credential-Material Taxonomy

| Material | Form | Storage | Visibility | Rotation/revocation |
| --- | --- | --- | --- | --- |
| invitation raw token | raw bearer | never persisted | recipient URL/email only | active-token revoke/rotate |
| invitation token hash | peppered hash | D1 | server only | token lifecycle |
| pending-invite bridge | signed HttpOnly cookie | browser cookie | server only | short expiry/clear after flow |
| realtime room token | signed derived bearer | memory/browser | scoped client + server | short expiry/key version/membership version |
| realtime identity envelope | signed subject/topic/time | message payload | room participants | short expiry/refresh |
| public share token/session | Publisher-owned | Publisher stores | public recipient flow | Publisher contract only |

Invitation and realtime keys are distinct. No material falls back to an unrelated secret in production.

## Privacy Decisions

- Names/avatars/roles are visible only within the actor's accessible collaboration scope.
- Email and pending invites are manager-only.
- Sheet-only users see only sheet-scoped roster identity.
- Public recipients see no private roster or presence.
- Presence/cursor traffic is ephemeral and not stored in Activity.
- Activity facts store stable IDs and redacted metadata, not raw tokens, arbitrary client payloads, or email unless an approved privacy-safe representation is required.
- Operator logs hash topic/resource IDs and suppress tokens, full URLs, emails, request IDs, labels, webhook values, and stacks from normal outputs.

## Abuse Controls

- Durable rate limits on invite create/reissue/resend/resolve/accept.
- Atomic multi-scope reservation or rollback.
- WebSocket connection caps and authorization deadlines.
- Event allowlists, schemas, maximum sizes, per-event token buckets, and slow-client disconnects.
- Bounded retries/idempotency for email and lifecycle commands.
- Link scanners may create only non-security-critical open telemetry.
- No account-existence oracle in invite or wrong-account responses.

## Security Stop Conditions

Stop implementation and keep the unit unverified if any of these remain:

- broad inaccessible metadata query;
- browser-only authorization for a protected action/event;
- non-atomic last-manager or invitation acceptance invariant;
- owner/equal-manager mutation through a generic admin flow;
- raw token or sensitive URL in logs/evidence;
- public recipient satisfying an internal Teamwork predicate;
- stale Supabase test used as the only proof of active D1 behavior.
