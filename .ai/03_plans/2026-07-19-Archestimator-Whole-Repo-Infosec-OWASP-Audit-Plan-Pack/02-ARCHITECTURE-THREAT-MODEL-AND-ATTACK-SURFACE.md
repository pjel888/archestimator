# 02 — Architecture, Threat Model, and Attack Surface

Grounded in current source at HEAD `7f9a484b4`. Line references are to current files.

## 2.1 System topology

```
                                  ┌──────────────────────────┐
                                  │   Anonymous internet /   │
                                  │   invited / public-share │
                                  │   recipient browser      │
                                  └──────────┬───────────────┘
                                             │ HTTPS
                                             ▼
                ┌────────────────────────────────────────────────────┐
                │ Cloudflare edge  (canonical host, WAF, CDN cache)   │
                │   routes: archestimator.com, www.archestimator.com │
                │   workers_dev: true (proof-of-concern, SEC-WORKER-  │
                │   002) → *.workers.dev alias                        │
                └──────────┬─────────────────────────────────────────┘
                           │ one Worker fetch() entry
                           ▼
                ┌────────────────────────────────────────────────────┐
                │ worker.ts  (OpenNext-wrapped)                       │
                │  fetch order:                                       │
                │   canonicalHostRedirect                             │
                │   → authStateMismatchRetry (SEC-AUTH-003 surface)    │
                │   → authCallbackStateMismatchRetry                  │
                │   → authStateResetLoginCompletion                   │
                │   → fastHealth                                      │
                │   → malformedShareToken                             │
                │   → protectedProof (bearer CRON_SECRET; SEC-WORKER- │
                │       002/003, SEC-CRYPTO-001 surface)              │
                │   → collaborationRoom  (WS upgrade; SEC-COLLAB-001/ │
                │       002/003 surface)                              │
                │   → globalPresence     (WS; SEC-COLLAB-005 surface) │
                │   → supportInbox       (WS; SEC-COLLAB-004 surface) │
                │   → staticPublicPageCache (SEC-WORKER-004 surface)  │
                │   → openNextWorker.fetch (Next.js 16)               │
                │   → normalizeAuthStateMismatchRedirect              │
                │  scheduled(): 5-min drain + 3 daily crons           │
                │  queue(): upload-jobs + client-portal-notifications │
                └────┬───────────────┬───────────────┬───────────────┘
                     │               │               │
        ┌────────────▼┐    ┌─────────▼──────┐ ┌──────▼──────────────┐
        │ Next 16     │    │ Durable Objects│ │ Queues / Cron       │
        │ / OpenNext  │    │  Collaboration │ │  UPLOAD_JOBS_QUEUE  │
        │  handlers   │    │  Room (SQLite) │ │  CLIENT_PORTAL_     │
        │  + RSC +    │    │  GlobalPresence│ │  NOTIFICATIONS_QUEUE│
        │  server     │    │  SupportInbox  │ │  DLQs on both       │
        │  actions    │    └────────────────┘ └─────────────────────┘
        └─┬─────┬─────┘
          │     │
   ┌──────▼┐  ┌─▼──────────────────────────────────────────┐
   │Better │  │ Cloudflare state                            │
   │Auth   │  │  D1: ARCH_DB (SQLite, NO Postgres RLS)      │
   │1.6.23 │  │  R2: ARCH_UPLOADS_R2                        │
   │       │  │  Images: IMAGES                             │
   │       │  │  Email: EMAIL (send_email binding)          │
   └───┬───┘  └─────────────────────────────────────────────┘
       │
       ▼
   External: Google OAuth, DeepSeek (https://api.deepseek.com), Google Maps,
             Cloudflare Insights, Clarity, Google Analytics 4
```

## 2.2 Assets

(Per master prompt §6.1.) All present and inventoried:

- User identities, sessions (D1 `session` table; raw-token-at-rest → `SEC-AUTH-001`).
- OAuth state, magic-link tokens (hashed at rest; 5-min TTL; rate-limited).
- Workspace membership + roles; founder/platform-admin authority (env-driven allowlist, prod fail-closed; dev-only hardcoded default → `SEC-AUTH-002`).
- Project, estimate, proposal, pricing, supplier, client data (D1; `workspace_id` predicates via `d1-access.ts`).
- Public share snapshots + recipient decisions/comments (token-bound; `publication/security.ts`).
- Collaboration invitations (256-bit CSPRNG; SHA-256+pepper hashed).
- Uploads, images, PDFs, XLS/XLSX (R2; magic-byte sniffed; image re-encoded).
- D1 records, version history, audit history, security events (HMAC-peppered IP/UA hashing for `account_security_events`).
- Email content + recipients (Cloudflare `EMAIL` binding; CRLF/HTML gap → `SEC-EXT-001/002/003`).
- AI prompts, model context, tool calls, generated drafts (DeepSeek; metadata-only audit; no PII to provider).
- Cloudflare bindings, queue messages, cron state, DO SQLite state, Workers Logs (100% sampling, persist=true).
- Deployment credentials, GitHub Actions trust, package integrity, build artifacts.

## 2.3 Identities and attacker profiles modeled

Anonymous internet · invite recipient · public-share recipient · authenticated member · editor · workspace owner · platform admin/founder · malicious tenant member · compromised user account · attacker with one leaked token · attacker controlling uploaded content · attacker controlling a third-party API response · malicious/compromised dependency · forged browser headers · malicious WebSocket client · queue poison/replay producer · compromised AI prompt/context · insider with repo read · compromised CI workflow.

Each finding in `04-FINDINGS-REGISTER.md` names the specific attacker identity → victim pair.

## 2.4 Trust boundaries and per-boundary controls

| Boundary | Crossing | Authn | Authz | Integrity | Confidentiality | Replay/idempotency | Fail mode | Evidence |
|---|---|---|---|---|---|---|---|---|
| Browser ↔ Worker | HTTPS request | (none at edge) | canonical-host map | TLS | TLS | per-route | redirect or OpenNext | `worker.ts:142-198` |
| Worker ↔ OpenNext/Next | internal | (none; trust) | per-handler | (none) | (none) | per-handler | throw → 500 JSON | `worker.ts:192` |
| Next handler ↔ Better Auth | session cookie | Better Auth 1.6.23 | `getCurrentUserContext` | HMAC cookie | HttpOnly+SameSite=Lax+Secure(prod) | cookie-cache disabled (D1 read each request) | fail-closed → `/login` | `session.ts:54-107`, `better-auth-cloudflare.ts:317-319` |
| Next handler ↔ D1 | bound prepared statement | (inherit) | `d1-access.ts` EXISTS predicates | parameterized | (inherit) | optimistic-concurrency `row_revision` | throw | `authz/d1-access.ts`, `estimates/d1-intents/rows.ts:1228-1233` |
| Public token ↔ publication | URL path token | token lookup | `resolveProjectPublicationAccessByToken` + `isActivePublication` | HMAC-SHA256 token hash | n/a | revocation via `status`/`revoked_at`/`expires_at` checked every read | fail-closed 404 | `publication/public-repository.ts:134-139` |
| Public token ↔ client portal | URL path token | token + recipient credential (single-use) | portal+issue+recipient re-derive | HMAC cookie bound to `(publicationId, credentialVersion, recipientId, exp)` | HttpOnly+signed | `credentialVersion` rotates on password change | fail-closed | `client-portal/public-repository.ts:206-238` |
| WS client ↔ CollaborationRoom DO | `wss://` upgrade | post-upgrade `{type:"authorize", token}` within 10s | HMAC token v2 `verifyRealtimeRoomToken` + capability scope | HMAC-SHA256 | n/a | **NO revocation list** → `SEC-COLLAB-003` | 10s auth deadline closes socket | `collaboration-room.ts:173-213,378-427` |
| Worker ↔ queue | `env.UPLOAD_JOBS_QUEUE.sendBatch` | (binding only) | (binding only) | **unsigned** → `SEC-OPS-004` | (binding) | `idempotencyKey` dedupe (but attacker-controllable) | DLQ after 3/10 retries | `upload-job-queue.ts:178-191,338-352` |
| Worker ↔ cron | `scheduled()` | (Cloudflare-only) | (Cloudflare-only) | (platform) | (platform) | overlap not prevented → `SEC-OPS-006` | `console.error` + `.catch(()=>undefined)` → `SEC-OPS-007` | `worker.ts:201-303` |
| App ↔ Cloudflare Email | `EMAIL.send()` | (binding) | (binding) | (none — passed through) | (binding) | (none) | circuit breaker in `transactional-email-client.ts` | `cloudflare-email-client.ts:151-158` |
| App ↔ DeepSeek | `fetch()` hardcoded URL | Bearer `DEEPSEEK_API_KEY` | n/a | TLS | TLS | none | 20s timeout; provider error swallowed in package-builder | `ai/deepseek.ts:42-67`, `ai/package-builder/provider.ts:153,261` |
| App ↔ Google OAuth | redirect | OAuth `state` | account-linking disabled | TLS | TLS | state cookie | state-mismatch → `Clear-Site-Data` (`SEC-AUTH-003`) | `better-auth-cloudflare.ts:189-197` |
| Internal cron ↔ `/api/internal/*` | HTTP w/ bearer | `authorizeBearerRequest` (constant-time) OR plain `===` (`SEC-CRYPTO-001`) | (bearer = admin-equivalent) | (none) | (none) | (none) | 503 if secret missing | `security/bearer-auth.ts:30-37`, proof routers |

## 2.5 Entrypoint / data-access / token matrices

- **Route/action surface**: `artifacts/route-action-surface.csv` — every `route.ts`, server action, `worker.ts` fast path, DO fetch handler, queue consumer, cron, internal route, OAuth/callback, share/invite token route, AI endpoint, CLI/ops script. Columns include authn, authz scope, user-controlled IDs, schema, CSRF/origin, rate limit, cache policy, side effects, d1/r2/do/queue access, logging/redaction, finding IDs.
- **Data-access authz matrix**: `artifacts/data-access-authz-matrix.csv` — every repository function that accepts or derives tenant/resource identifiers. Columns include user_controlled_identifiers, identity_input, required_tenant_scope, required_role, sql_scope_predicates, precheck, postcheck, race_toctou_notes, finding_ids. (Generated from the authz sweep's `DATA_ACCESS_FUNCTIONS_AUDITED` block.)
- **Token/secret lifecycle matrix**: `artifacts/token-secret-lifecycle.csv` — every token/secret class (Better Auth session, OAuth state, magic-link, invite, share-publication, share-session, share-password, client-portal, portal-session, portal-password, realtime-room, realtime-identity, CSRF, admin/cron/upload/internal, AI, telemetry peppers, signing secrets, HMAC keys, encryption keys, direct-upload state). Columns include issuer, consumer, entropy_and_generator, scope, subject_binding, resource_binding, storage, hash_mac_encryption, transport, cookie_flags, expiry, one_time_semantics, replay_protection, rotation, revocation, logging_exposure, url_referrer_exposure, fallback_behavior, missing_secret_behavior.

Because the proxy bypasses `/api`, API security was **not** inferred from page-route middleware; each handler was verified independently (per master prompt §7.1).

## 2.6 D1 (no Postgres RLS) — explicit non-recommendation

Per master prompt §7.2 and §21: D1 is SQLite and has no Postgres RLS. The pack **does not** recommend "turn on RLS" anywhere. Tenant isolation is verified at the application layer via `src/lib/authz/d1-access.ts` parameterized `EXISTS` subqueries against `workspace_members` / `project_members` / `estimate_sheet_members` / `estimate_sheet_access_settings`. D1 constraints, ownership joins, predicates, and transactional design are used where appropriate. The June 1 audit's RLS-based findings are `OBSOLETE_PROVIDER`.

## 2.7 High-value / internet-exposed paths

Ranked by exposure × sensitivity:

1. `/share/[token]/**` — anonymous-internet, exposes published proposal data + recipient PII.
2. `/api/client-portal/[token]/**` — anonymous-internet, exposes client portal data + decision/write surfaces.
3. `/api/ai/ask`, `/api/ai/package-builder` — authenticated, model + cost + apply-mutation surface.
4. `/__cloudflare/*` proof routers — bearer-gated but reachable from internet; admin-equivalent D1/R2/Queue mutations.
5. `/api/internal/upload-cleanup`, `/api/internal/upload-scan` — bearer-gated, R2 mutations.
6. `wss://*/__cloudflare/collaboration-room/<topic>` — anonymous upgrade, post-upgrade auth.
7. `/invite/[token]/**` — anonymous-internet, token in URL path.
8. `/api/component-library/attachments/**` — authenticated, file upload + scan + bind.
9. `scheduled()` crons — Cloudflare-only trigger but the invoked routes are internet-reachable.

## 2.8 Security invariants verified present

(See also `00-PLAN.md` §8 and per-sweep VERIFIED_STRENGTHS.)

- Every share/portal mutation re-derives the publication/portal from the token-bound actor session (not from request body).
- Every project/estimate/sheet read/write routes through `d1-access.ts` predicates.
- Every AI route fails closed on `ARCHESTIMATOR_AI_ENABLED=false`; re-checks `requireCurrentUserContext()` at Apply.
- Every publication/portal token is 256-bit CSPRNG; HMAC-SHA256 hashed at rest; constant-time compared.
- Every download path fails closed on `scan_status != clean && !active_override`.
- Every image upload is re-encoded through sharp/Cloudflare-Images (strips embedded payloads).
- Every state-changing share/portal endpoint enforces Origin + double-submit CSRF.
- Every production-required secret throws on absence/mis-length (no insecure fallback in production).
- Every XLSX user-data cell is serialized as inline-string (`t="inlineStr"`), defeating formula injection regardless of leading character.

## 2.9 Verified strengths (consolidated from the 8 sweeps)

The architecture reflects mature defensive design for an alpha product. Top consolidated strengths (file:line in the per-sweep reports and in `04-FINDINGS-REGISTER.md`):

1. **Realtime token v2** uses HMAC-SHA256 + `timingSafeEqual` + capability scoping (`realtime-room-token.ts:87-94,120-142`).
2. **Sender-bound cursor identity** in `CollaborationRoom` (`collaboration-room.ts:106-113,275-278`).
3. **DO ID derivation** delegates to the trust boundary: `idFromName(<client-path>)` then verifies a topic-bound HMAC token inside the DO (`collaboration-room-router.ts:41`, `collaboration-room.ts:387-395`).
4. **Cross-publication decision/comment writes are closed** at app + SQL layers (`client-portal/decision-service.ts:66-79,108-115`; cross-reference comment in `publication/public-repository.ts:591-600`).
5. **Recipient sessions are re-validated every read** (`client-portal/public-repository.ts:230-238`).
6. **Publication revocation is effective on every read** via `isActivePublication` (`publication/public-repository.ts:134-139`).
7. **Invite tokens**: 256-bit CSPRNG, SHA-256+pepper hashed, expiry+revocation+used_at, membership race-safety via conditional INSERT.
8. **AI Apply** uses server-issued HMAC draft token + draftHash + per-branch `canEdit`/`isWorkspaceEditor` + workspace-scoped library validation + per-idempotency-key command row + deterministic UUID per leaf mutation.
9. **Publication/portal token encryption-at-rest** uses AES-256-GCM envelope (`publication/security.ts:83-98`).
10. **Scan-override** is platform-admin-only with ≥8-char reason, future expiry, exact checksum match, D1 audit event.
11. **Redaction layer** (`observability/redact.ts`) redacts tokens/secrets/emails/JWTs/hex/path-tokens + prompt-injection phrases.
12. **Lockfile hygiene**: tracked `bun.lock`, sha512-verified `patchedDependencies`, narrow `trustedDependencies`, transitive overrides on CVE-prone packages.
13. **Cookie flags on session**: HttpOnly + SameSite=Lax + Secure(prod) + signed.
14. **CSP `frame-ancestors 'none'`** on share; HSTS preload; `Referrer-Policy: no-referrer` on share/workshop/invite.
15. **Optimistic concurrency** via `row_revision` / `publication_source_revision` on every mutating statement.
