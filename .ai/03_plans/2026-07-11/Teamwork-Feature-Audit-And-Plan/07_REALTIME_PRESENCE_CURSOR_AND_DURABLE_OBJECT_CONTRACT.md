# Realtime Presence, Cursor, and Durable Object Contract

## Supported Scope

The first supported realtime claim is **presence plus visible cursors for concurrent estimate editors**. It is not live data synchronization.

- Estimate editors publish and receive cursors.
- Estimate viewers receive cursors and may publish coarse presence, but cannot publish cursor or content events.
- Project roster presence is wired as a person/session-aware status.
- Project-wide cursors remain off until a later capacity and usability decision.
- Row/tree events, locks, follow mode, CRDT/OT, and peer-applied values remain out of scope.
- `GlobalPresence` is not a product requirement for this slice; leave it isolated or remove the misleading product claim after impact review.

## Topic Access

- `project:<id>` requires whole-project authority. A sheet-only membership is not sufficient.
- `estimate:<id>` requires effective access to that exact estimate.
- Topic tokens include subject, topic, role/capabilities, session identifier, issued/expiry timestamps, key version, and membership version or equivalent revocation discriminator.
- Production uses dedicated versioned realtime signing keys. No fallback to invitation secrets or per-process ephemeral keys.

## Event Registry

Only registered events are accepted:

| Event | Publisher capability | Payload | Max rate | Persistence |
| --- | --- | --- | --- | --- |
| `presence.track` | `presence.publish` | active surface + session id | heartbeat/transition bounded | none |
| `cursor.move` | `cursor.publish` | normalized fraction, tab/surface, sentAt | 12.5 fps client; lower server bucket | none |
| `client.heartbeat` | authorized | timestamp/nonce | bounded | none |
| future `mutation.committed` | server/trusted producer only | IDs/revision/mutation id | mutation rate | none; D1 is source |

Arbitrary event strings and payload passthrough are denied. JSON schema validation, size limits, numeric bounds, string enums, and subject/session binding happen in the Durable Object before fanout.

## Connection State Machine

```text
IDLE
  -> CONNECTING
  -> AUTHENTICATING
  -> AUTHORIZED
  -> DEGRADED (retryable)
  -> CLOSED
```

- Socket open is not `SUBSCRIBED`.
- The client becomes ready only after a server `authorized` acknowledgement containing topic, subject, session, capability set, and server time.
- Unauthorized sockets close after a short authorization deadline.
- Server errors are typed and surfaced to hooks; local `send()` success means server-accepted or explicitly queued according to policy, not merely `WebSocket.send()` called.
- Refresh starts before token expiry and re-authorizes or reconnects without a silent five-minute failure.
- Bounded exponential backoff, jitter, heartbeat, liveness timeout, and teardown are required.
- Queue only the latest cursor/presence frame while reconnecting; never queue authority-changing or row-value events.

## Identity and Label Trust

- The wire never controls the display label.
- The renderer resolves `sub` to the trusted scoped roster returned by the server.
- Unknown or removed subjects render a generic collaborator label or are discarded.
- React escaping is not considered identity proof.
- Multi-tab/device policy tracks sessions separately but presents one person with the freshest active session and an optional session count.
- Cursor colors derive from a stable privacy-safe subject hash and have accessible contrast.

## Cursor Payload and Rendering

- Coordinates are normalized to `[0,1]` and clamped server/client side.
- Surface/tab values are allowlisted.
- Invalid, future-skewed, excessively old, NaN, infinite, or oversized values are rejected.
- Remote cursors expire after 5 seconds without a valid frame; presence uses a longer heartbeat/idle threshold defined in the implementation receipt.
- Touch devices do not send pointer cursors by default.
- Reduced-motion users receive no animated interpolation.
- Screen-reader copy says a collaborator is pointing at or active near a row, never that they are editing unless a trusted edit state exists.
- Cursor UI never changes layout dimensions.

## Capability Enforcement

The DO checks the event against token capabilities:

- viewers: presence publish; cursor/event receive only;
- editors: presence + cursor publish; no arbitrary data events;
- managers: same realtime capabilities as editors unless a future operator event is explicitly added;
- removed members: target disconnection and publish denial within 5 seconds; hard maximum 30 seconds from the committed access change.

A forged payload `userId`, label, role, topic, or capability is ignored/denied. The envelope subject is server-derived from the token.

### Revocation mechanism

1. A committed membership/access removal increments a membership version and sends a trusted server-to-DO `revoke-subject` control message for the exact topic/subject.
2. The DO acknowledges the control, closes matching sessions, and rejects later frames. The access-changing command is not considered realtime-complete until that acknowledgement is observed and recorded.
3. If the control path fails, room tokens expire in at most 30 seconds, every message rechecks expiry, and token refresh is denied by the new membership version. No removed subject may publish after the hard 30-second maximum.
4. Telemetry records commit-to-ack and commit-to-final-denial latency with redacted identifiers. The target is 5 seconds; any value over 30 seconds fails `AC-009`, `AC-011`, and `AC-015`.

## Abuse and Capacity

- One multiplexed socket per topic per browser session; cursor and future events do not open separate sockets.
- Per-room connection/session/person caps with explicit `room_full` response.
- Per-connection and per-subject token buckets by event class.
- Slow-client/backpressure detection and disconnect policy.
- Maximum validated frame size below the current 4 KiB global ceiling for cursor events.
- O(N) fanout budget measured at target room sizes.
- Topic identifiers hashed/redacted in telemetry.

Initial proof targets:

| Scale | Requirement |
| --- | --- |
| normal | 10 people / 20 sessions, smooth cursors, no dropped auth state |
| 10x | 100 sessions synthetic fanout stays within documented CPU/message budget |
| 100x abuse | 1,000 attempted sockets/events are capped/rate-limited without room failure |

The exact numeric Cloudflare CPU/subrequest limits must be derived from the bound plan at implementation time and recorded rather than guessed.

## Observability

Metrics/log codes:

- authorization success/denial/timeout;
- active rooms, persons, sessions, sockets;
- reconnect and refresh success/failure;
- rejected schema/subject/capability/rate events;
- slow-client disconnects;
- fanout latency and dropped frames;
- cursor stale cleanup;
- membership-revocation target/maximum compliance, control acknowledgement, and fallback-expiry activation.

Configure a real redacted sink before claiming operational readiness. The current no-op telemetry default is not proof.

## Hosted Proof

Use two or more isolated authenticated browser contexts against the deployed Worker and bound DO. Prove:

- owner/editor trusted labels and two-way cursor motion;
- viewer receives but forged viewer cursor/event is denied;
- restricted-sheet and cross-project isolation;
- reconnect, token refresh past five minutes, and stale cleanup;
- membership removal/revocation target of 5 seconds and hard maximum of 30 seconds, including forced control-path failure;
- multi-tab session folding;
- no console/page errors;
- proof artifact includes source revision, config/flag state, redacted identities, timings, and verifier.

The existing July 2 hosted artifact is useful history but permissive, stale, and not sufficient for this contract.
