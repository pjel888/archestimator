# 08 — Security, Privacy, and Threat Model

This plan **preserves** the existing security model; it does not add a new attack surface
except the FR-06 refresh path, which inherits the existing authz probe. The threat model
confirms hardening does not regress the load-bearing properties and adds denial tests.

## Trust boundaries

```mermaid
flowchart TB
  Internet[Internet / untrusted clients]
  Edge[Cloudflare Edge (WAF/DDoS, free tier)]
  Worker[Worker archestimator-proof]
  DO[Durable Object COLLAB_ROOMS]
  D1[(D1 ARCH_DB)]
  Internet --> Edge --> Worker
  Worker -->|upgrade route| DO
  Worker -.->|Server Action authz probe| D1
```

- **Boundary 1 (Edge→Worker):** Cloudflare free-tier WAF/DDoS. Out of scope to change.
- **Boundary 2 (Worker→DO):** the upgrade route + room-name regex.
- **Boundary 3 (Client→DO wire):** untrusted; HMAC token gates admission; Ed25519 envelope
  gates per-message sender identity (verified by receivers).
- **Boundary 4 (DO→D1):** none directly. The DO does not talk to D1. Authz happens in the
  Server Action before token issuance.

## Actor roles

| Actor | Can | Cannot |
|---|---|---|
| Anonymous | open a socket | authorize (no token); broadcast; read presence |
| Project member (viewer) | authorize for `project:{id}`; track presence; (D-4: no cursor send) | authorize for `estimate:{id}` they can't access; read restricted-sheet state |
| Project member (editor) | above + cursor/row broadcast on accessible `estimate:{id}` | read presence of a room they aren't a member of |
| Platform admin | bypass membership probe (existing) | forge another user's envelope (no signing key) |
| Attacker | flood upgrades; send malformed messages; replay old tokens | authorize without a valid token (HMAC); forge sender (Ed25519); read presence of unauthorized rooms |

## Threat model (STRIDE-style, scoped to realtime)

| Threat | Current control | Hardening effect | Denial test |
|---|---|---|---|
| **Spoofing** (forge sender) | Ed25519 envelope, `sub`+`topic`+exp binding, receiver verify | preserved (SEC-01) | existing `realtime-identity.test.ts` tampered-sig case; add envelope-on-refresh case |
| **Tampering** (alter payload) | envelope covers canonical fields; payload scope is coarse | preserved | existing |
| **Repudiation** | n/a (no audit on realtime wire by design) | unchanged | n/a |
| **Information disclosure** (presence leak) | coarse `activeSurface` only on `project:{id}`; restricted state on `estimate:{id}` | preserved (SEC-01c); FR-03 key change must not leak | DOM/source test asserting no raw route/estimate/tab/cell |
| **Denial of service** (upgrade flood) | none today | **added**: FR-04 cap + SEC-02 cap-before-authz + FR-05 rate cap | workers-pool flood test |
| **Elevation of privilege** | membership probe before token issuance | preserved; FR-06 refresh path inherits probe | existing `realtime-identity-actions-authz.test.ts` + refresh-path test |
| **Replay** (old token) | `exp` (300s) + `iat` future check + DO per-message re-check | preserved; FR-06 refresh does not extend TTL bypass | existing expiry tests |

## Specific risks and mitigations

### R-SEC-01: Cap-then-authz ordering (SEC-02)
- **Risk:** if authz runs before the cap, an attacker floods upgrades to force HMAC work.
- **Mitigation:** enforce cap in `fetch` before `verifyRealtimeRoomToken`.
- **Proof:** workers-pool test: N+1 upgrades, assert the N+1th is rejected without per-msg HMAC.

### R-SEC-02: Refresh path as a new Server-Action surface (FR-06)
- **Risk:** a new `issueRealtimeIdentity` variant (or reuse) could be abused for authz
  oracle behavior.
- **Mitigation:** reuse the existing action's authz probe; do not add a path that issues
  credentials without the D1 membership check. Same fail-closed behavior.
- **Proof:** the existing `realtime-identity-actions-authz.test.ts` plus a refresh-specific
  denial case (non-member cannot refresh).

### R-SEC-03: Presence key change leaks (FR-03)
- **Risk:** keying presence by `userId` could leak user ids of a room the viewer isn't in.
- **Mitigation:** presence is only broadcast to **authorized peers in the same room**;
  `broadcastPresenceState` already skips unauthorized sockets. The `userId` is the verified
  envelope `sub`, already shared via the server-trusted roster for project members.
- **Proof:** existing "presence withheld from unauthorized" test; add a cross-room isolation
  test (two rooms, no leak).

### R-SEC-04: Rate-cap bypass via presence-track (FR-05)
- **Risk:** a sender could spam `presence-track` to fan out presence snapshots, bypassing the
  broadcast rate cap.
- **Mitigation:** apply the rate cap to **all fan-out-bearing messages**
  (`broadcast`, `presence-track`), not only `broadcast`.
- **Proof:** workers-pool test spamming `presence-track`.

### R-SEC-05: Telemetry PII leak (REL-02)
- **Risk:** wiring a prod sink could log raw paths or topics.
- **Mitigation:** `reportRealtimeEvent` already documents `topic` as coarse; the future impl
  must add an explicit redaction rule (no raw path, no token, no envelope `sig`). Assert in a
  test that a synthesized `auth_refresh_failed` event contains no secret/path substring.
- **Proof:** unit test on the sink's redaction.

## Privacy / data minimization

- The realtime wire carries: coarse `activeSurface`, `userId`, `onlineAt`, envelope metadata.
  No raw route/estimate/tab/cell on the project channel (contract law).
- The DO stores nothing durably; attachments are per-connection and lost on close.
- Telemetry events carry coarse topic + error detail only; redaction rule (R-SEC-05).
- No new personal data is collected by this plan.

## CSP / frame / referrer

- Realtime uses `wss://` to the same origin. No new CSP directive required (existing CSP
  must allow `wss:` connect — confirm during impl if a CSP tightening pack lands; tracked in
  `2026-07-07-global-nonced-csp-enforcement/` sibling pack, not here).

## Secrets

- `REALTIME_ROOM_TOKEN_SECRET` / `REALTIME_IDENTITY_SIGNING_KEY` /
  `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` / `COLLABORATION_INVITE_PEPPER`: unchanged. Never log.
- The DO reads the secret via `readRealtimeRoomTokenSecret(env)`; ensure the future impl
  does not change the read order or expose it to the client.

## Credential material taxonomy (mandatory — raw/hash/encrypted/public/derived × lifecycle × boundary)

Boundary codes: **SA** = Server Action · **SRV** = server-only module · **DO** = Durable
Object memory · **CLI** = client JS memory · **DOM** = browser DOM · **NET** = wss network ·
**LOG** = logs/analytics · **NONE** = never present.

| Material | Class | Created by | Stored in | Read by | Rotated | Logged | Destroyed | Boundaries visible | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **HMAC room token** | **raw bearer** (admission) | `issueRealtimeRoomToken` (SA) | CLI memory only (never DB/disk) | DO `verifyRealtimeRoomToken`, once | re-issued on subscribe/reconnect/refresh (FR-06); no rotation API | NEVER | client discard; 300s `exp` | SA→CLI→NET→DO | **Required raw** to authorize the socket — a stored hash is NOT a substitute. Returned to client by design; proof gate = existing `cloudflare-collaboration-room-auth.test.ts` + the authz probe that gates issuance. |
| **HMAC secret** (env) | raw secret | operator (env) | Worker env (secret/vars) | `readRealtimeRoomTokenSecret` (SA/DO) | operator only | NEVER | n/a | SRV, DO | Read order: `REALTIME_ROOM_TOKEN_SECRET`→`REALTIME_IDENTITY_SIGNING_KEY`→`ARCHESTIMATOR_INVITE_TOKEN_PEPPER`→`COLLABORATION_INVITE_PEPPER`. First non-empty wins. |
| **Ed25519 signing key** | raw secret (PKCS8) | operator (`REALTIME_IDENTITY_SIGNING_KEY`) or derived from pepper (SHA-256 seed) | server-only module cache | `issueRealtimeIdentityEnvelope` (SRV) | operator only | NEVER | process exit | SRV | Never crosses to client/DOM/NET. Fallback: ephemeral key (dev only). |
| **Ed25519 envelope** (`{sub,topic,role,iat,exp,kid,sig}`) | **signed** (not raw bearer) | `issueRealtimeIdentityEnvelope` (SRV) | CLI memory | peer `verifyRealtimeIdentity` (CLI), client-side | re-issued on refresh (FR-06) | `sig` never logged; `topic` coarse only | client discard; 300s `exp` | SA→CLI→NET→CLI (peer) | The `sig` is a public-key signature, not a secret. Wire-visible by design. |
| **Ed25519 public key** (`IssueRealtimeIdentityResult.publicKey`) | **public** | derived from signing key | CLI memory (`verifyKeyRef`) | `importVerifyKey`, `verifyRealtimeIdentity` | follows signing key (`kid` = first 8 hex of SHA-256(pub)) | public-safe | client discard | SA→CLI | Public marker; safe to expose. |
| **`userId` / `sub`** | public id (authenticated) | Better Auth | D1 + CLI | hooks, DO presence key (FR-03) | n/a | coarse only (never raw route) | session end | SA→CLI→NET→DO→peers | Already shared via server-trusted roster; FR-03 keys presence by verified `sub`, not wire `payload.userId` (AC-FR-05c). |

**No hash is accepted by a public route as a lookup key.** The admission path requires the
**raw HMAC token** (verified by timing-safe compare in the DO). The Ed25519 model is
signature verification, not hash lookup.

**Copy/paste URL / replay / expired / revoked / duplicate-click / cross-recipient:** the
token rides the wss authorize frame, not a URL — there is no copy/paste-URL vector for the
realtime credential itself. Replay is bounded by `exp` (300s) + per-message `exp` re-check.
"Revoked" = expiry (no revocation list; short TTL is the revocation). Cross-recipient is
bound by `topic` (channel binding: `claims.topic === expectedTopic` + envelope
`topic===expectedTopic`). Duplicate authorize frames are idempotent.

## Attack Surface Inventory (mandatory — Server Actions / Route Handlers / public routes)

| Entry point | Actor | Authn/authz + ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests |
|---|---|---|---|---|---|---|---|
| **Server Action `issueRealtimeIdentity({topic})`** (`realtime-identity-actions.ts`) | authenticated user (Better Auth session) | `getCurrentUserContext` → terms gate → D1 probe `canAccessProjectInD1`/`canAccessEstimateInD1`; fail-closed on D1-missing; **ownership = membership/admin** | `topic` regex `^(project|estimate):[0-9a-f-]{36}$`; reject otherwise (null) | `{ envelope, publicKey, roomToken, userId, displayName }` (or `null` on any denial — denial is indistinguishable from absence) | no-store (Server Action); no cache invalidation | **none today** (P0 gap: no per-caller limit on issuance) → FR-06 refresh must not amplify; OPEN-01 send-budget does not cover issuance. Track as SEC open item SEC-OPEN-01. | existing `realtime-identity-actions-authz.test.ts` + new refresh-denial case (R-SEC-02) |
| **WebSocket upgrade route** `CollaborationRoom.fetch` (via `routeCollaborationRoomRequest`, `worker.ts`) | anonymous → bearer | `Upgrade: websocket` required (else 426); room-name regex `^[a-zA-Z0-9:_-]{3,200}$` at the **router** (`collaboration-room-router.ts:2`); HMAC token verified post-upgrade in `authorizeSocket`; per-message `isSocketAuthorized` re-check (topic+exp) | room-name path; `{type:"authorize",token}` JSON ≤4096B; event-name ≤80 chars | 101/426/400/503; JSON `{type:"authorized"|"error",code}` | no HTTP cache (101 upgrade); no headers beyond upgrade | **cap-before-authz planned (FR-04/SEC-02), NOT present in code today**; per-sender rate cap planned (FR-05), NOT present today. wrangler `vars` has NO cap/budget entries yet. | `test:do` cap flood (AC-SEC-02), branch tests (FR-02) |
| **(future) refresh entrypoint** (FR-06) — reuses `issueRealtimeIdentity` or a sibling | authenticated user | **must reuse the existing D1 membership probe** (R-SEC-02); must NOT issue credentials without the probe | same `topic` regex | same DTO (or subset) | no-store | must share any issuance rate limit (SEC-OPEN-01) | refresh-denial test (non-member cannot refresh) |
| **DO broadcast/presence inbound messages** (post-authorize, inside `webSocketMessage`) | authorized socket only | `isSocketAuthorized` per message (topic+exp) | JSON ≤4096B; event ≤80 chars; reject binary/oversized/invalid | fan-out JSON to authorized peers | n/a (in-memory) | per-sender rate cap (FR-05) keyed by **`attachment.authorized.sub`** (AC-FR-05c) — NOT present today | `test:do` rate (AQ-06/07/07b) |

**SEC-OPEN-01 (new, owner-gated):** `issueRealtimeIdentity` has **no per-caller issuance
rate limit today.** FR-05's send-budget covers in-DO fan-out, not Server-Action issuance.
Recommendation: add a D1-backed per-user issuance limiter (same pattern as the existing
`security_rate_limit_events` durable limiter used elsewhere) as part of Phase 5/7, or accept
the short TTL (300s) + authz probe cost as the abuse bound for closed beta. Owner decision
needed; tracked here, not a blocker for the DO-hardening slices.

## What is NOT in scope (security)

- Cloudflare WAF/DDoS rule changes (separate concern).
- E2E message encryption (the platform TLS + per-message signatures suffice for closed beta).
- A new audit log for realtime events (deferred; D1 `collaboration_audit_events` exists for
  invitation/role events, not cursors).
