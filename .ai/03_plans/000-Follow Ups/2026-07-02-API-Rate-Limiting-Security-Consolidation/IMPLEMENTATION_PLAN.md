# API, Rate Limiting, and Security Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the canonical API, rate limiting, and security consolidation program without reintroducing stale store assumptions, provider-first enforcement, or unproven security claims.

**Architecture:** Use source-backed inventory first, then cross-surface API contracts, then app-layer controls, then provider controls in observe-first rollout. Authorization, idempotency, privacy, and observability are treated as shared contracts across Route Handlers, Server Actions, Durable Objects, D1, R2, Queues, Better Auth, public-token routes, AI, upload, email, and provider surfaces.

**Tech Stack:** Next.js `16.2.6`, React `19.2.6`, React DOM `19.2.6`, Bun, TypeScript, OpenNext on Cloudflare Workers, Cloudflare D1, R2, Durable Objects, Queues/Cron, Better Auth `1.6.22`, Wrangler `^4.105.0`, Vitest, Playwright only when browser-only proof is required.

---

## 1. Executive Summary

### Planning Status

Status: `CONDITIONALLY READY`.

The named first implementation subset is ready to start:

- `PH-0`: implementation preflight, loop ledger setup, Supermemory check, and source refresh.
- `PH-1`: `WP-A` runtime authority and store ledger.
- `PH-2`: `WP-I` request semantics, idempotency, retry, error, cache, trace, and async baseline.
- `PH-3`: `WP-B` public share and existing limiter consolidation, limited to existing app-layer controls and tests.

The full security program is not ready for production enforcement or provider cutover until P0 gates close with implementation evidence. `WP-G` provider controls and `PH-8` enforcement are release-gated, not first-slice tasks.

### User Value

Closed-beta users, public share recipients, and collaborators get safer API behavior without breaking existing estimating, publishing, invite, upload, AI, and realtime workflows. Legitimate users should see consistent retry, rate-limit, error, and recovery behavior while attackers lose easy paths for token enumeration, cross-tenant D1 access, unauthorized room joins, duplicate side effects, resource exhaustion, and provider-rule bypass.

### Business And Engineering Value

The program reduces launch risk by closing the highest-risk security seams before first-user growth:

- D1 no-RLS access paths get app-level proof.
- Server Actions are treated as direct API surfaces.
- Public-token routes keep non-enumerating behavior.
- Realtime Durable Objects require signed room tickets before forwarding.
- Existing D1-backed limiters are preserved before new provider controls.
- New ledgers/logs get privacy and retention rules before data collection expands.

### Top Risks

- `RISK-P0-1`: WebSocket room access without signed ticket.
- `RISK-P0-2`: D1 no-RLS authorization gap.
- `RISK-P0-3`: Server Actions missed as API surface.
- `RISK-P0-5`: privacy governance missing before new ledgers/logs.
- `RISK-P1-8`: unsafe mutation retry/idempotency gap.
- `RISK-P1-9`: async at-least-once duplicate side effects.
- `RISK-P1-10`: error, cache, trace, and retry signal drift.

## 2. Planning Ledger And Workstreams

### Master Execution Contract

| Field | Contract |
| --- | --- |
| Outcome | Produce implementation slices that close API/rate-limiting/security risks with traceable evidence. |
| Non-goals | No broad WAF/Turnstile/provider enforcement first; no Supabase/Postgres reintroduction; no dependency additions by default; no app-source edits until execution starts from this plan. |
| Source authority | User request, this plan pack, `AGENTS.md`, `.ai/10_state/current-state.md` Fast Path, current source, local framework docs, official provider docs before provider changes. |
| Safety constraints | Preserve unrelated work, do not overwrite dirty files, never claim provider/hosted/browser proof from local checks, never expose secrets, never expand logs/ledgers before privacy classification. |
| Acceptance | Each phase has file surfaces, requirements, tests, gates, rollback, risk ownership, and ledger updates. |
| Stop condition | `WP-A`, `WP-I`, and `WP-B` are implemented and verified for the first slice, then later phases close P0/P1 gates before provider enforcement. |

### Workstreams Used For This Plan

| Workstream | Mode | Scope | Findings | Status |
| --- | --- | --- | --- | --- |
| Lead coordinator | same-agent | Source synthesis, plan creation, ledger integration, final edits | The pack is conditionally ready for first-slice implementation, not enforcement. | complete |
| Source and requirements analyst | independent native agent `analyst` | Read all plan-pack docs and extract stable source, requirements, decisions, risks, open decisions | Found one ledger drift: `LOOP_LEDGER.md` omitted `WP-I` in a future-implementation sentence and had stale file count. | complete |
| Codebase architecture analyst | independent native agent `explore` | Map route/action/test/provider surfaces | Confirmed exact route/action/test/proof surfaces and package versions. | complete |
| Adversarial reviewer | independent native agent `critic` | Attack readiness and overclaiming traps | Confirmed missing `IMPLEMENTATION_PLAN.md` was the current blocker and named P0/P1 gates. | complete |
| Test and QA strategist | emulated | Convert validation pack and repo scripts into phase gates | Live subagent spawn hit the agent-thread limit, so this lane is emulated and marked non-independent. | complete |
| Supermemory coordination | attempted local check | Advisory memory context | `localhost:6767` was unavailable after startup attempt; this plan records `not-verified` memory gap. | complete |

### Loop Ledger Coordination

Every implementation run must update `LOOP_LEDGER.md` or a new run log under `.ai/05_logs/` using this loop:

`DISCOVER -> PLAN -> EXECUTE -> VERIFY -> RECORD -> DECIDE`

Required ledger fields per phase:

- Phase ID and work package IDs.
- Agents/lanes used.
- Files read and files changed.
- Requirements covered.
- Tests/proof run.
- Provider/browser/manual proof boundary.
- Open decisions resolved or deferred.
- Rollback and residual risk.

### Supermemory Coordination

Supermemory is advisory, not authoritative.

- Start check: `curl -fsS http://localhost:6767/ >/dev/null`.
- If down: `nohup npm exec supermemory local >/tmp/supermemory-local.log 2>&1 &`, retry, then record `not-verified` if still down.
- Query relevant task memory only after availability is proven. Retrieved memory must be reconciled against `.ai`, source, tests, and provider evidence.
- Closeout: write one concise memory only when durable project truth changes. Do not store secrets, tokens, env values, cookies, customer data, provider credentials, or raw local session data.

Current planning run result: Supermemory was unavailable after a local startup attempt, so this artifact uses `.ai` and current source evidence as authority.

## 3. Source Map

| ID | Source | Authority | Purpose | Requirements/Decisions Extracted | Conflicts/Gaps |
| --- | --- | --- | --- | --- | --- |
| `SRC-001` | `README.md` | high | Canonical pack entry point and status | `WP-A -> WP-I -> WP-B` first sequence, P0/P1 gates, stop condition | None after ledger correction. |
| `SRC-002` | `00_COORDINATION_LEDGER.md` | high | Prior planning lanes and evidence | Source authority, prior Supermemory gap, corrections applied | Needs this implementation-plan iteration recorded. |
| `SRC-003` | `01_EXECUTIVE_SUMMARY.md` | high | Program summary and main sequence | Cloudflare-only runtime, first slice, wider enforcement blockers | None. |
| `SRC-004` | `02_SOURCE_AUTHORITY_AND_CURRENT_RUNTIME.md` | high | Runtime/source reconciliation | Route snapshot, Server Action snapshot, existing limiter/idempotency assets, handoff checklist | Snapshot must be refreshed before edits. |
| `SRC-005` | `03_REQUIREMENTS_AND_TRACEABILITY.md` | high | Consolidated requirements | `REQ-AUTHORITY`, `REQ-API`, `REQ-IDEMPOTENCY`, `REQ-HTTP-CONTRACTS`, `REQ-RL`, `REQ-ASYNC`, `REQ-CLIENT-ID`, `REQ-WS`, `REQ-D1`, `REQ-PRIVACY`, `REQ-TOKENS`, `REQ-AI-UPLOADS`, `REQ-OBS` | No generated current inventory yet. |
| `SRC-006` | `04_SECURITY_PRIVACY_STANDARDS_MODEL.md` | high | Threat model and standards | OWASP, GDPR, HTTP/RFC, Cloudflare, Better Auth, AI/upload/token/async controls | External docs must be refreshed before provider/SDK-specific implementation. |
| `SRC-007` | `05_CONSOLIDATED_ARCHITECTURE_AND_WORK_PACKAGES.md` | high | Work packages and dependencies | `WP-A` through `WP-I`; provider controls after app proof | None. |
| `SRC-008` | `06_VALIDATION_QA_AND_ROLLOUT_PLAN.md` | high | Tests, adversarial QA, rollout, rollback | Phase gates, test matrix, adversarial scenarios, rollback requirements | Needs concrete implementation test files per phase. |
| `SRC-009` | `07_RISK_REGISTER_AND_DECISIONS.md` | high | P0/P1/P2 risk ownership and decisions | `DEC-1` through `DEC-7`, P0/P1/P2 risks, open decisions | Open decisions need implementation defaults or classification. |
| `SRC-010` | `08_FINAL_READINESS_AND_COMPLETION_AUDIT.md` | high | Audit of planning consolidation | Conditionally ready for implementation planning; not enforcement | Does not audit this new implementation-plan artifact. |
| `SRC-011` | `09_IDEMPOTENCY_RETRY_AND_RESILIENCE_STANDARDS.md` | high | API resilience standards addendum | Request semantics, idempotency, conditional update, retry, error, cache, async, trace gates | Draft headers must stay labeled draft-level. |
| `SRC-012` | `LOOP_LEDGER.md` | high | Durable loop record | Discover/plan/execute/verify/record/decide history | Stale file count and one sentence omitting `WP-I` corrected by this planning task. |
| `SRC-013` | `.ai/10_state/current-state.md` Fast Path | high | Current project truth | Cloudflare-only stack, Supermemory contract, plan-pack status | Append-only; update Fast Path after this plan is saved. |
| `SRC-014` | `package.json` | high | Current scripts and versions | Next/React/Better Auth/OpenNext/Wrangler versions and validation scripts | Re-check at execution start. |
| `SRC-015` | `node_modules/next/dist/docs/01-app/...` | medium | Local Next.js 16 docs | Route Handlers, Server/Client components, forms, `use server`, cache directives, proxy | Read relevant files again before implementation touches those features. |

## 4. Requirements Traceability Matrix

| Req ID | Requirement | Source | Priority | Phase | Work Package | Acceptance Criteria | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `REQ-AUTHORITY` | Maintain source-backed runtime/store ledger before enforcement | `SRC-005` | P0 | `PH-1` | `WP-A` | Every surface names active store/enforcement point and privacy owner | Inventory artifact, `git diff --check`, reviewed ledger |
| `REQ-API` | All touched Route Handlers and Server Actions declare actor, authz, validation, idempotency, CSRF/origin, rate-limit, error, privacy posture | `SRC-005` | P0 | `PH-2`, `PH-5` | `WP-I`, `WP-D` | Every touched route/action has a matrix row before code change | Matrix review, targeted denial tests |
| `REQ-IDEMPOTENCY` | Every unsafe mutation and async side-effect path has retry-safe contract | `SRC-005`, `SRC-011` | P1 | `PH-2`, later surface phases | `WP-I` | Key scope, TTL, storage, fingerprint, replay, mismatch, concurrent duplicate, failure replay defined | Unit/integration duplicate/retry tests |
| `REQ-HTTP-CONTRACTS` | Standardize `429`, `Retry-After`, cache, errors, trace/correlation | `SRC-005`, `SRC-011` | P1 | `PH-2`, `PH-3`, `PH-5`, `PH-7` | `WP-I`, `WP-B`, `WP-D`, `WP-G` | Response classes and forbidden leakage rules exist for touched surfaces | Contract tests and route error tests |
| `REQ-RL` | Durable, privacy-conscious, false-positive-aware rate limiting | `SRC-005` | P1 | `PH-3`, `PH-7` | `WP-B`, `WP-G` | Existing app controls preserved; provider controls observe-first | Limiter tests, hosted proof only when enforcement changes |
| `REQ-ASYNC` | Queues, cron, alarms, email, upload jobs assume at-least-once | `SRC-005`, `SRC-011` | P1 | `PH-2`, `PH-6` | `WP-I`, `WP-F` | Durable dedupe, poison, retry, DLQ/operator evidence defined | Queue/job duplicate and poison tests |
| `REQ-CLIENT-ID` | Trusted Cloudflare client identity and IP normalization | `SRC-005` | P1 | `PH-2`, `PH-3` | `WP-I`, `WP-B` | Header trust order, spoofing behavior, IPv6 aggregation, raw-IP suppression defined | Spoofed-header and IPv6 fixture tests |
| `REQ-WS` | Signed WebSocket room tickets before Durable Object forwarding | `SRC-005` | P0 | `PH-5` | `WP-E` | Mint/verify flow, TTL <= 60 seconds, nonce, HMAC, origin check, quotas | Router/DO denial tests and hosted WS proof before release |
| `REQ-D1` | D1 app-level authorization matrix and denial tests | `SRC-005` | P0 | `PH-5` | `WP-D` | Every touched D1 path has predicate and cross-tenant denial test | `cf:d1-authz-matrix`, targeted Vitest, remote proof when deployed data changes |
| `REQ-PRIVACY` | GDPR classification, retention, DSAR/delete/anonymize before expanded collection | `SRC-005`, `SRC-006` | P0 | `PH-1`, `PH-2`, all write phases | all | Data classes and retention/proof rows exist before new ledgers/log fields | Privacy table review, tests for redaction/fail-closed |
| `REQ-TOKENS` | Canonical token and secret-material posture | `SRC-005`, `SRC-006` | P1 | `PH-2`, `PH-3`, `PH-4`, `PH-5` | `WP-I`, `WP-B`, `WP-C`, `WP-E` | Raw tokens not stored/logged; hash+pepper sensitive; fail-closed secret tests | Token tests and env typing/proof review |
| `REQ-AI-UPLOADS` | AI, upload, SSRF, R2, scan controls | `SRC-005`, `SRC-006` | P1 | `PH-6` | `WP-F` | Allowlists, SSRF controls, upload sniffing/limits, R2 lifecycle/delete proof | AI/upload tests, provider proof when storage behavior changes |
| `REQ-OBS` | Observable security controls without sensitive data leakage | `SRC-005`, `SRC-006` | P1 | `PH-2`, `PH-6`, `PH-7`, `PH-8` | `WP-I`, `WP-F`, `WP-G`, `WP-H` | Logs/metrics/traces have schemas, redaction, owners, rollback signals | Route/action error tests, provider correlation where changed |

## 5. Scope

### In Scope

- Execution sequencing and task ownership for `WP-A`, `WP-I`, `WP-B`, `WP-C`, `WP-D`, `WP-E`, `WP-F`, `WP-G`, and `WP-H`.
- Route Handler, Server Action, public-token, internal route, queue/cron/alarm, Durable Object, D1, R2, Better Auth, AI, upload, email, observability, and Cloudflare provider proof surfaces.
- First-slice implementation readiness for `WP-A`, `WP-I`, and `WP-B`.
- Phase-level validation and rollback gates.
- Multi-agent execution strategy and loop-ledger/Supermemory coordination.

### Out Of Scope

- Implementing code in this planning task.
- Creating migrations in this planning task.
- Deploying or changing Cloudflare/provider settings in this planning task.
- Adding dependencies by default.
- Reintroducing Supabase/Postgres as active runtime without fresh source/provider proof.
- Turning on broad WAF, Turnstile, or provider rate limiting before app-layer proof.
- Claiming provider, hosted, production, browser, or manual proof from local checks.

### Owner-Delegated Planning Defaults

These defaults unblock implementation planning without performing changes:

- `DEC-IMP-1`: Use `Retry-After` only for first-slice rate-limit response standardization. Defer draft `RateLimit` headers until a later provider/client-compatibility decision.
- `DEC-IMP-2`: Use RFC 9457-compatible local problem codes shaped as `urn:archestimator:problem:<code>` for Route Handler planning. Keep Server Actions on `ActionResult` with stable external codes.
- `DEC-IMP-3`: Use D1 as the first planned durable store for WebSocket one-shot ticket nonce consumption unless implementation proves a Durable Object-local store can enforce nonce use before room forwarding without trusting unauthenticated room traffic.
- `DEC-IMP-4`: Treat process-local in-memory estimate mutation limits as acceptable only for low-risk temporary authenticated throttling. Any public, expensive, multi-instance, or security-critical limiter must be durable or have an owner-accepted non-durable rationale.
- `DEC-IMP-5`: New idempotency ledger storage should default to D1 with HMAC/hash key material, unique scoped key, request fingerprint hash, status, safe replay metadata, TTL, and cleanup job. Sensitive response bodies should not be persisted unless redacted and privacy-reviewed.

## 6. Current-State Analysis

### Runtime And Versions

Current `package.json` reports:

- `next`: `16.2.6`
- `react`: `19.2.6`
- `react-dom`: `19.2.6`
- `better-auth`: `1.6.22`
- `@opennextjs/cloudflare`: `^1.20.1`
- `wrangler`: `^4.105.0`

Execution agents must re-check `package.json` and the lockfile before coding.

### Route Handler Inventory Snapshot

Current route inventory command:

```sh
rg --files src/app | rg '(^|/)route\.ts$' | sort
```

High-risk route families:

- Public share: `src/app/api/share/[token]/**/route.ts`.
- Invite: `src/app/invite/[token]/**/route.ts`.
- Auth: `src/app/api/auth/[...all]/route.ts`, `src/app/auth/callback/route.ts`.
- AI: `src/app/api/ai/ask/route.ts`, `src/app/api/ai/package-builder/route.ts`.
- Upload/images/internal jobs: `src/app/api/component-library/attachments/**/route.ts`, `src/app/api/internal/upload-*/route.ts`, `src/app/api/projects/images/route.ts`, `src/app/api/estimate-row-images/route.ts`.
- Export/activity: `src/app/api/projects/[projectId]/activity/route.ts`, `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`.

### Server Action Inventory Snapshot

Current action inventory command:

```sh
rg --files src/lib | rg 'actions\.ts$|action.*\.ts$|.*-actions\.ts$' | sort
```

High-risk action families:

- Auth/account: `src/lib/auth/*actions.ts`.
- Collaboration/invites/realtime identity: `src/lib/collaboration/*actions.ts`.
- Publication/recipient/publisher: `src/lib/publication/actions.ts`, `src/lib/recipient-proposals/actions.ts`, `src/lib/publisher/*actions.ts`.
- Projects/estimates/component library/workshop: `src/lib/projects/actions.ts`, `src/lib/estimates/actions.ts`, `src/lib/component-library/actions.ts`, `src/lib/workshop/actions.ts`.

### Existing Assets To Reuse

- `src/lib/publication/public-repository.ts` for public/share D1-backed limiter and publication access patterns.
- `src/lib/collaboration/invite-entry.ts` for invite token, pepper, and limiter patterns.
- `src/lib/ai/rate-limit.ts` and `src/lib/ai/audit.ts` for AI limiter/audit patterns.
- `src/lib/estimates/action-rate-limit.ts` for process-local estimate mutation limit inventory.
- `src/lib/estimates/d1-action-client.ts` for correlation/idempotent replay precedent.
- `src/lib/observability/with-action-errors.ts` and `src/lib/observability/route-error.ts` for existing error wrappers.
- `src/lib/authz/d1-access.ts` for app-level D1 authorization predicates.
- `src/lib/cloudflare/collaboration-room-router.ts` and `src/lib/cloudflare/collaboration-room.ts` for realtime ingress.
- `src/lib/cloudflare/upload-job-queue.ts` and `src/lib/cloudflare/scheduled-upload-jobs.ts` for queue/cron retry and DLQ assets.

### Known Current Gaps

- No generated current route/action/store inventory artifact exists yet.
- Public/share/invite client-IP extraction is not one canonical policy.
- Route Handler idempotency/error/cache/trace semantics are uneven across route families.
- Server Action API-safety posture is not uniformly matrixed.
- Realtime room authorization is not proven before Durable Object forwarding.
- Queue duplicate handling has useful assets, but durable cross-batch duplicate side-effect proof is still required.
- No final privacy retention/DSAR table exists for expanded ledgers/logs.

## 7. Target-State Design

### Target System Behavior

- Every touched route/action/job names its actor, authority source, validator, authorization predicate, data classification, idempotency posture, error posture, cache posture, retry behavior, and observability boundary.
- Public-token routes remain non-enumerating and no-store.
- Unsafe mutations either become retry-safe or explicitly non-retryable with owner acceptance and client retry suppression.
- D1 access paths have RLS-equivalent app-level proof.
- Realtime room access is impossible without a short-lived signed ticket minted after Better Auth session and membership proof.
- Provider controls observe before they enforce and never substitute for app authorization.

### Target Data Flow

1. Request enters Worker/OpenNext route, Server Action, queue consumer, cron handler, provider callback, or Durable Object alarm.
2. Trusted client identity is derived from Cloudflare runtime headers using the canonical policy.
3. Actor/public-token/internal authority is established.
4. Input is validated at the boundary.
5. Authorization predicate scopes D1/R2/DO/repository access.
6. Idempotency/lost-update policy runs before side effects where needed.
7. Rate limit or quota checks run using privacy-conscious keys.
8. Side effects commit with durable uniqueness/dedupe when needed.
9. Response uses stable safe errors, cache posture, trace/correlation identifiers, and retry signals.
10. Observability records only redacted operational fields.

### Failure And Degraded Mode

- Missing or bad auth returns non-enumerating auth/permission errors.
- Rate limit returns `429` plus `Retry-After` when known.
- Same idempotency key with different intent returns conflict/validation error without side effects.
- Duplicate same-key same-fingerprint returns prior safe result or accepted/no-op response.
- Stale update returns precondition/conflict error without overwriting newer data.
- Queue poison messages stop retrying and produce operator evidence.
- Provider-rule false positives can be correlated by Ray ID and rolled back.

## 8. React And Next.js Implementation Plan

### Framework Gates

- `FRAMEWORK-VERSION-GATE`: re-check `next`, `react`, `react-dom` from `package.json` and lockfile.
- `NEXT16-DOCS-GATE`: before touching Route Handlers, Server Actions, cache, proxy, forms, or Server/Client boundaries, read relevant local docs:
  - `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`
  - `node_modules/next/dist/docs/01-app/02-guides/forms.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  - `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`
  - `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- `ROUTE-HANDLER-GATE`: each touched `route.ts` declares method, auth, validation, caching/dynamic behavior, status codes, response shape, and error shape.
- `SERVER-FUNCTION-AUTHZ-GATE`: each touched Server Action validates auth/authz/input server-side and treats direct POST reachability as in scope.
- `CACHE-PRIVACY-GATE`: token-bearing, private tenant data, auth, invite/share session, upload, AI, and security/error responses default to no-store unless a safe narrower policy is proven.
- `RSC-CLIENT-BOUNDARY-GATE`: no new `"use client"` boundary is added unless a phase touches UI state or browser APIs.
- `CSRF-ORIGIN-GATE`: for touched Server Actions, document same-origin assumptions or `serverActions.allowedOrigins` needs across proxy layers.

### UI Applicability

Most first-slice work is backend/API/planning-code, not broad UI. UI/accessibility proof is required only when a phase changes visible flows:

- Auth callback/login messaging.
- Public share/invite rate-limit or token-error messages.
- Turnstile challenge surfaces.
- Realtime connection state UI.
- Upload/AI error/retry states.

Browser proof is not a default gate. Use it only for cookie/session persistence, redirect behavior, focus/routing, Turnstile, realtime WebSocket interaction, or explicit visual/accessibility claims.

## 9. UX, UI, And Accessibility Plan

| Surface | Required UX States | Accessibility Gate | Browser Proof Trigger |
| --- | --- | --- | --- |
| Public share/invite rate limit | Normal, denied, expired/revoked token, too many attempts, retry-after, degraded support message | Non-enumerating copy, visible focus, readable error, no token echo | If visible copy or form behavior changes |
| Auth callback/session | Success, state mismatch, provider failure, denied/closed beta | Redirect clarity, no sensitive provider detail | If cookie/redirect/session flow changes |
| Realtime collaboration | Connecting, unauthorized, expired ticket, reconnect, quota denied, degraded read-only | Announce connection failures; keyboard unaffected | Required after WebSocket ticket implementation |
| Upload/AI | Pending, rejected input, rate limited, provider unavailable, retry stopped | Safe messages, no prompt/object-key leak | If UI flow changes |
| Turnstile | Challenge, failure, accessible fallback/support | Keyboard/screen reader path and false-positive support | Required before challenge enforcement |

UX non-goal for first slice: no redesign. Reuse existing components and copy patterns.

## 10. Backend, API, And Integration Plan

### API Contract Defaults

- Route Handler errors: RFC 9457-compatible local equivalent with `type`, `title`, `status`, `detail`, optional `code`, `requestId`, `correlationId`, `retryAfter`, and `fieldErrors`.
- Server Action errors: existing `ActionResult` or local wrapper with stable external code, safe message, and correlation posture.
- Rate limits: `429` plus `Retry-After` when retry delay is known.
- Draft `RateLimit` headers: deferred by default.
- Sensitive/token-bearing responses: no-store by default.
- Correlation identifiers: trace ID, Ray ID, app request ID, mutation correlation ID, and idempotency key remain separate unless reuse is explicitly justified.

### Idempotency Ledger Planning Blueprint

Use this blueprint when a touched unsafe mutation cannot use natural uniqueness:

| Field | Purpose | Privacy posture |
| --- | --- | --- |
| `id` | Internal row ID | Non-sensitive |
| `scope_hash` | HMAC of actor/token subject + workspace/project/resource + route/action + operation | Sensitive pseudonymous |
| `key_hash` | HMAC of client/server idempotency key | Sensitive pseudonymous |
| `fingerprint_hash` | HMAC/hash of canonical non-secret payload fingerprint | Sensitive pseudonymous |
| `status` | `in_progress`, `committed`, `failed_retryable`, `failed_final`, `expired` | Operational |
| `response_status` | Safe replay status | Operational |
| `response_code` | Stable machine code | Operational |
| `response_ref` | Optional pointer to committed resource/event, not raw sensitive body | Operational |
| `created_at`, `expires_at`, `last_seen_at` | TTL and cleanup | Operational/personal data when linked |

Default first-slice TTL: 24 hours for ordinary duplicate-submit suppression, longer only with privacy owner acceptance. Cleanup must be part of the phase that creates the table.

### WebSocket Ticket Planning Blueprint

- Mint after Better Auth session and workspace/project membership proof.
- Fields: room, actor/user, workspace/project, purpose, nonce, issued-at, expiry <= 60 seconds.
- Signature: HMAC using a server-only secret; verify with constant-time compare.
- Nonce: consume once before forwarding to `COLLAB_ROOMS`.
- Default nonce store: D1 table with unique nonce hash and expiry until implementation proves a lower-latency store can enforce before DO forwarding.
- Router gate: verify ticket and consume nonce before `COLLAB_ROOMS.get(id).fetch(request)`.
- Quotas: connect, message, and fanout counted separately.

## 11. Data And Database Plan

### D1 Authorization Matrix

Every touched D1 path needs this row before code changes:

| Surface | Table/store | Actor | Predicate | Workspace/project scope | Public-token scope | Service exception | Denial tests | Proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Initial command:

```sh
bun run cf:d1-authz-matrix
```

Expected result: generated matrix or explicit script output showing covered and uncovered access paths. Any uncovered touched path blocks the phase that touches it.

### Schema And Migration Rules

- Prefer existing tables/helpers for first slice.
- If new D1 tables are needed, use expand/contract safe migrations and generated types where applicable.
- Every migration plan must state reversible, forward-fix-only, or destructive.
- Data-loss risk requires backup/logical export or explicit recovery plan before apply.
- Provider proof is required only after deployed data behavior changes.

### Privacy Retention Defaults

These are planning defaults, not legal advice:

| Data class | Default retention proposal | Release gate |
| --- | --- | --- |
| Idempotency entries | 24 hours for ordinary operations; 7 days maximum for high-value async operations unless accepted | Privacy owner review before table creation |
| Rate-limit/security events | 30 days closed-beta default | DSAR/delete/anonymize rule before expansion |
| Raw IP | Avoid persistence; store HMAC/truncated/prefix where possible | Header policy tests |
| Token hashes | Retain only while token is valid plus short security window | Delete/revoke proof |
| AI prompts/outputs | Do not log raw by default | Redaction tests |
| Upload metadata/R2 keys | Lifecycle tied to object/project retention | R2 delete/lifecycle proof |

## 12. Security And Privacy Plan

### Threat Model

Actors:

- Anonymous internet user.
- Shared-link recipient.
- Invited collaborator.
- Authenticated viewer/editor/admin.
- Automation/botnet.
- Compromised browser session.
- Internal route caller.
- Queue/cron/provider retry surface.
- Misconfigured Cloudflare provider rule.
- Future agent using stale plan assumptions.

Assets:

- Workspace/project/estimate/publication/recipient/invite/upload/AI data.
- Better Auth sessions and OAuth state.
- Public/share/invite/recipient/WebSocket/R2 token material.
- D1 tenant data and limiter/audit rows.
- Durable Object room state and messages.
- R2 object metadata and signed URLs.
- AI prompts/outputs and package-builder artifacts.
- Provider logs and Ray IDs.

Trust boundaries:

- Browser to Worker/OpenNext.
- Worker/OpenNext to D1/R2/DO.
- Better Auth to auth storage.
- Worker router to Durable Object.
- Queue/Cron/Internal routes to job handlers.
- App to AI/email/Cloudflare provider APIs.
- Provider WAF/Turnstile to app code.

### Security Release Gates

- No touched public-token path stores/logs raw tokens.
- Hash plus pepper is classified as sensitive pseudonymous data.
- Secret presence proofs do not reveal secret values.
- D1 cross-workspace/project denial tests pass for touched paths.
- Server Actions have direct POST threat rows.
- Realtime room requests fail closed without signed ticket.
- AI/tool/upload SSRF and payload controls exist before expansion.
- Provider controls are observe-first with rollback.

## 13. Performance, Scalability, And Reliability Plan

### Performance Posture

The first slice should avoid speculative performance complexity. Measure only where the phase changes runtime behavior.

Budgets and checks:

- Public share/invite limiter changes should not add more than one additional D1 round trip per request without documented reason.
- WebSocket ticket verification should avoid additional Durable Object room traffic until ticket is validated.
- Queue duplicate handling should prevent retry storms with bounded max attempts and poison handling.
- AI/upload controls should enforce size/time/spend budgets before provider calls.

### Reliability Rules

- Retry only idempotent or duplicate-safe operations.
- Use capped backoff with jitter for provider/queue retries.
- Do not use in-memory-only state for public, expensive, or multi-instance controls unless accepted.
- Treat Cloudflare Queues and Durable Object alarms as at-least-once.
- Ack queue messages only after durable effects commit or duplicate detection proves prior commit.

### Verification

- Local unit/integration tests prove logic and contract behavior.
- Provider-backed proof is required for actual Cloudflare rules, R2 lifecycle, Queues/DLQ, or hosted Worker behavior.
- Hosted proof is required before claiming deployed enforcement readiness.

## 14. Observability And Operations Plan

| Surface | Signal | Redaction | Owner | Proof Gate |
| --- | --- | --- | --- | --- |
| Route/action errors | stable code, status, request/correlation id | no stack, SQL, token, prompt, object key, tenant existence | implementation lane + verifier | route/action error tests |
| Rate-limit denies | surface, actor class, privacy key version, retry-after | no raw IP or token hash in external response | security/ops lane | limiter tests and dashboard/query when deployed |
| WebSocket ticket failures | reason class, room hash, actor class | no raw ticket/nonce | realtime lane | router denial tests |
| Queue duplicate/retry/DLQ | job class, attempt, duplicate/poison count | no raw payload | async lane | queue duplicate/poison tests |
| Provider false positives | Ray ID, provider rule ID, app correlation id | no sensitive payload | provider lane | observe-mode evidence and rollback drill |

Do not add telemetry without naming sink, schema, redaction, owner, review cadence, and proof gate.

## 15. Deployment And Rollout Plan

### Rollout Phases

1. Local first-slice proof: `WP-A`, `WP-I`, `WP-B`.
2. App-layer P0 closures: `WP-C`, `WP-D`, `WP-E`, selected `WP-F`.
3. Hosted smoke for changed public/auth/realtime/upload/AI surfaces.
4. Provider observe mode for `WP-G`.
5. False-positive review and support workflow.
6. Narrow provider enforcement only after rollback is rehearsed/documented.
7. `WP-H` final release decision.

### Rollback Requirements

Every enforcement-changing PR must include:

- Feature flag/config rollback path.
- Provider rollback path if Cloudflare settings changed.
- Data rollback or forward-fix plan for schema/table changes.
- User-visible failure mode.
- Observability query or script that detects rollback need.

## 16. Blast Radius And Backward Compatibility

| Area | Blast Radius | Compatibility Requirement |
| --- | --- | --- |
| Public share/invite | Anonymous and recipient flows | Existing valid links keep working; invalid/expired/revoked remain non-enumerating. |
| Auth | Login/callback/session | Existing sessions and OAuth state behavior are not broken. |
| D1 authz | Tenant data | Cross-tenant denial improves; valid member/admin paths keep working. |
| Server Actions | Mutations | Direct POST and UI-triggered submissions share same server-side checks. |
| Realtime | Collaboration | Valid collaborators can connect after ticket mint; invalid connections fail before DO room access. |
| AI/upload | Resource/spend/storage | Existing allowed flows remain; unsafe inputs fail before provider/storage side effects. |
| Provider controls | Site-wide public/auth flows | Observe-first avoids silent lockouts; rollback path exists before enforce. |

## 17. Phased Implementation Plan

### PH-0: Execution Preflight And Loop Setup

**Objective:** Create the implementation run state before any code edit.

**Files:**

- Modify: `LOOP_LEDGER.md` or create `.ai/05_logs/YYYY-MM-DD-api-rate-limiting-security-implementation-run.md`.
- Inspect: `AGENTS.md`, `.ai/10_state/current-state.md`, this `IMPLEMENTATION_PLAN.md`, `package.json`.

- [ ] Run `git status --short --branch`.
- [ ] Re-read `README.md`, `03_REQUIREMENTS_AND_TRACEABILITY.md`, `05_CONSOLIDATED_ARCHITECTURE_AND_WORK_PACKAGES.md`, `06_VALIDATION_QA_AND_ROLLOUT_PLAN.md`, `07_RISK_REGISTER_AND_DECISIONS.md`, and this file.
- [ ] Check Supermemory availability with `curl -fsS http://localhost:6767/ >/dev/null`.
- [ ] If unavailable, run `nohup npm exec supermemory local >/tmp/supermemory-local.log 2>&1 &`, retry, and record available or `not-verified`.
- [ ] Read relevant local Next docs before touching Route Handlers, Server Actions, cache, forms, proxy, or Server/Client boundaries.
- [ ] Assign live lanes: lead, `explore` inventory, `executor` implementation, `test-engineer`, `critic` or `code-reviewer`, `verifier`.

**Exit:** ledger exists, authority sources read, Supermemory status recorded, no dirty-file conflict unexamined.

### PH-1: WP-A Runtime Authority And Store Ledger

**Objective:** Replace snapshots with current inventory artifacts.

**Expected artifacts:**

- Create or update: `.ai/03_plans/2026-07-02-API-Rate-Limiting-Security-Consolidation/evidence/runtime-store-ledger.md`
- Create or update: `.ai/03_plans/2026-07-02-API-Rate-Limiting-Security-Consolidation/evidence/route-action-inventory.md`

**Commands:**

```sh
rg --files src/app | rg '(^|/)route\.ts$' | sort
rg --files src/lib | rg 'actions\.ts$|action.*\.ts$|.*-actions\.ts$' | sort
bun run cf:inventory
bun run cf:d1-authz-matrix
```

- [ ] Generate current route inventory.
- [ ] Generate current Server Action inventory.
- [ ] Map active stores: D1, R2, Durable Object, Better Auth storage, Cloudflare provider logs, historical artifacts.
- [ ] Map limiter/audit/AI/upload/realtime/job/email provider surfaces.
- [ ] Classify Supabase/Postgres references as historical unless fresh current proof contradicts.
- [ ] Add retention/privacy owner column for every new or existing security-relevant ledger.

**Tests/proof:** path checks, generated inventory review, `git diff --check`.

**Exit:** no downstream work package depends on an unknown active store.

### PH-2: WP-I Request Semantics And API Contract Baseline

**Objective:** Create the cross-surface contract before broad mutation or enforcement edits.

**Likely files to inspect or change:**

- `src/lib/observability/route-error.ts`
- `src/lib/observability/with-action-errors.ts`
- `src/lib/observability/action-result.ts`
- `src/lib/estimates/d1-action-client.ts`
- `src/lib/ai/package-builder/apply.ts`
- `src/app/api/ai/package-builder/handler.ts`
- `src/lib/cloudflare/upload-job-queue.ts`
- selected public/share/invite route handlers

**Expected artifacts:**

- Request-semantics matrix.
- Idempotency/replay/lost-update matrix.
- Error/cache/trace contract.
- Async at-least-once matrix.
- Trusted client identity policy.

- [ ] Classify every touched surface as safe read, naturally idempotent mutation, non-idempotent mutation, async accepted work, or explicitly non-retryable.
- [ ] Define idempotency key source/scope/TTL/storage/fingerprint/replay/mismatch/concurrent duplicate/failure replay for unsafe mutations.
- [ ] Define lost-update strategy: `If-Match`, `If-None-Match`, explicit expected revision, natural uniqueness, or no-conflict reason.
- [ ] Standardize `429` plus `Retry-After`; defer draft `RateLimit` headers unless explicitly chosen.
- [ ] Define Problem Details-compatible Route Handler shape and Server Action `ActionResult` mapping.
- [ ] Define no-store/private cache classes and conditional `304` auth/revocation rule.
- [ ] Define trace/Ray ID/app request ID/mutation correlation/idempotency separation.
- [ ] Define at-least-once queue/alarm/job/email/upload proof rows.

**Tests/proof candidates:**

```sh
bunx vitest run tests/vitest/route-error.test.ts tests/vitest/route-error-smoke-gate.test.ts --maxWorkers=1
bunx vitest run tests/vitest/cloudflare-upload-job-queue.test.ts tests/vitest/cloudflare-scheduled-upload-jobs.test.ts --maxWorkers=1
bunx vitest run tests/vitest/estimate-action-rate-limit.test.ts --maxWorkers=1
```

**Exit:** no touched unsafe mutation or async side-effect path lacks a matrix row.

### PH-3: WP-B Public Share And Existing Limiter Consolidation

**Objective:** Prove and normalize existing public/share/invite limiter behavior before new enforcement.

**Likely files:**

- `src/lib/publication/public-repository.ts`
- `src/lib/collaboration/invite-entry.ts`
- `src/app/api/share/[token]/route.ts`
- `src/app/api/share/[token]/session/route.ts`
- `src/app/api/share/[token]/events/route.ts`
- `src/app/api/share/[token]/activity/route.ts`
- `src/app/api/share/[token]/comment/route.ts`
- `src/app/api/share/[token]/decision/route.ts`
- `src/app/api/share/[token]/password/route.ts`
- `src/app/api/share/[token]/unsubscribe/route.ts`
- `src/app/invite/[token]/accept/route.ts`
- `src/app/invite/[token]/continue/route.ts`
- `src/app/invite/[token]/sign-out/route.ts`

- [ ] Preserve existing D1-backed public/share/invite controls.
- [ ] Consolidate trusted client identity policy across share and invite.
- [ ] Add fixtures for `cf-connecting-ip`, spoofed `x-forwarded-for`, IPv4-mapped IPv6, IPv6 prefix aggregation, missing Cloudflare headers, localhost/dev, and preview/production proxy contexts.
- [ ] Normalize `Retry-After`, no-store/private, and non-enumerating errors where existing controls already support them.
- [ ] Inventory process-local limits and mark accepted or durable-migration-required.
- [ ] Do not add provider WAF/Turnstile/rate-rule enforcement in this phase.

**Tests/proof candidates:**

```sh
bunx vitest run tests/vitest/project-invite-entry-route.test.ts tests/vitest/project-invite-sign-out-route.test.ts tests/vitest/invite-accept-origin.test.ts --maxWorkers=1
bunx vitest run tests/vitest/share/share-page-get-routes-contract.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/share-snapshot-redaction.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts tests/vitest/share/share-page-decision-anonymous.test.tsx --maxWorkers=1
```

**Exit:** existing public/share/invite limiter behavior is tested and documented, with no regression in valid recipient flows.

### PH-4: WP-C Better Auth Boundary Hardening

**Objective:** Make Better Auth the clear identity boundary and align it with app/provider controls.

**Likely files:**

- `src/app/api/auth/[...all]/route.ts`
- `src/app/auth/callback/route.ts`
- `src/lib/auth/cloudflare-better-auth-runtime.ts`
- `src/lib/auth/better-auth-cloudflare.ts`
- `src/lib/auth/actions.ts`
- `src/lib/auth/redirects.ts`
- `src/lib/auth/session.ts`
- `cloudflare-env.d.ts`
- `wrangler.jsonc`

- [ ] Build Better Auth security matrix: trusted origins, cookie flags, OAuth state, callback normalization, magic-link enumeration parity, built-in limiter posture.
- [ ] Align Better Auth IP interpretation with trusted client identity policy.
- [ ] Inventory exact token/limiter secret names, including `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` and `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER`.
- [ ] Add fail-closed tests for missing required secrets without exposing values.
- [ ] Inventory server-side `auth.api` usage and bypass budgets.

**Tests/proof candidates:**

```sh
bunx vitest run tests/vitest/auth-callback-route.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/auth-magic-link.test.ts --maxWorkers=1
bunx vitest run tests/vitest/cloudflare-better-auth-route-gate.test.ts tests/vitest/cloudflare-better-auth-proof-script.test.ts --maxWorkers=1
```

**Exit:** auth controls do not conflict and server-side auth API usage does not bypass required policy checks.

### PH-5: WP-D And WP-E D1 Authorization, Server Actions, And Realtime Tickets

**Objective:** Close P0 app-layer authorization risks before wider enforcement.

**Likely files:**

- `src/lib/authz/d1-access.ts`
- `src/lib/**/actions.ts`
- `src/lib/cloudflare/collaboration-room-router.ts`
- `src/lib/cloudflare/collaboration-room.ts`
- `worker.ts`
- `src/components/realtime-auth-bridge.tsx`

- [ ] Generate D1 access-path matrix for touched tables/queries.
- [ ] Add or update denial tests for cross-workspace/project access.
- [ ] Add Server Action matrix rows before touching each action.
- [ ] Use or extend `src/lib/authz/d1-access.ts` where it reduces predicate drift.
- [ ] Design and implement WebSocket ticket mint/verify/nonce flow only after `WP-I` and authz matrix rows exist.
- [ ] Verify room ticket before calling `COLLAB_ROOMS.get(id).fetch(request)`.
- [ ] Add denial tests for missing, expired, reused, wrong-room, wrong-user, wrong-workspace, malformed, and bad-origin tickets.

**Tests/proof candidates:**

```sh
bunx vitest run tests/vitest/workspace-repository-authz-contract.test.ts tests/vitest/account-membership-d1.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1
bunx vitest run tests/vitest/cloudflare-collaboration-room-router.test.ts tests/vitest/project-collaboration-realtime.test.ts tests/vitest/realtime-identity.test.ts --maxWorkers=1
bun run cf:check-d1-auth-realtime
```

**Exit:** touched D1 paths have denial proof; touched Server Actions have complete API rows; Durable Object room is unreachable without authorized ticket.

### PH-6: WP-F AI, Uploads, Internal Jobs, Queues, Email, And Observability

**Objective:** Close non-obvious API/security risks beyond public share/auth/realtime.

**Likely files:**

- `src/app/api/ai/ask/route.ts`
- `src/app/api/ai/ask/handler.ts`
- `src/app/api/ai/package-builder/route.ts`
- `src/app/api/ai/package-builder/handler.ts`
- `src/lib/ai/rate-limit.ts`
- `src/lib/ai/audit.ts`
- `src/app/api/component-library/attachments/direct-upload/route.ts`
- `src/app/api/component-library/attachments/route.ts`
- `src/app/api/component-library/attachments/scan-override/route.ts`
- `src/app/api/internal/upload-runtime/route.ts`
- `src/app/api/internal/upload-scan/route.ts`
- `src/app/api/internal/upload-cleanup/route.ts`
- `src/lib/uploads/admission-control.ts`
- `src/lib/cloudflare/upload-job-queue.ts`
- `src/lib/cloudflare/scheduled-upload-jobs.ts`
- `src/lib/email/cloudflare-email-client.ts`

- [ ] Add AI prompt/output minimization and redaction checks before expanding logs.
- [ ] Add tool/action allowlist and SSRF controls for fetch/import/tool paths.
- [ ] Preserve upload admission limits, MIME sniffing, size/dimension/decompression constraints, scan posture, and signed URL TTL.
- [ ] Define durable queue/job dedupe and poison/DLQ evidence beyond in-batch memory.
- [ ] Add email send idempotency or natural uniqueness before retrying sends.
- [ ] Add observability redaction tests for prompt, token, object key, provider body, and payload leakage.

**Tests/proof candidates:**

```sh
bunx vitest run tests/vitest/ai-ask-route.test.ts tests/vitest/ai-package-builder-route.test.ts tests/vitest/ai-package-builder-security-contract.test.ts --maxWorkers=1
bunx vitest run tests/vitest/upload-runtime-route.test.ts tests/vitest/upload-scan-job.test.ts tests/vitest/cloudflare-upload-job-queue.test.ts --maxWorkers=1
bunx vitest run tests/vitest/cloudflare-email-client.test.ts tests/vitest/transactional-email-client.test.ts --maxWorkers=1
bun run cf:queues-cron-proof
bun run cf:jobs-proof
```

**Exit:** AI/upload/internal-job/email changes have privacy, abuse, duplicate-delivery, and fail-closed proof.

### PH-7: WP-G Cloudflare Provider Controls Observe Mode

**Objective:** Add provider controls only after app-layer proof exists.

**Likely files and provider surfaces:**

- `wrangler.jsonc`
- `cloudflare-env.d.ts`
- `worker.ts`
- `src/lib/cloudflare/proof-router.ts`
- `src/lib/cloudflare/protected-proof-router.ts`
- Cloudflare WAF Rate Limiting Rules, Turnstile, Security Events, Ray ID correlation.

- [ ] Refresh official Cloudflare docs and Wrangler types before provider changes.
- [ ] Choose narrow provider controls only for app-layer-proven surfaces.
- [ ] Start WAF/rate rules in observe/log mode.
- [ ] Add Turnstile only to high-abuse surfaces with accessible fallback.
- [ ] Add Ray ID support path and false-positive triage.
- [ ] Document rollback command/procedure before enforcement.

**Tests/proof candidates:**

```sh
bun run cf:check-provider
bun run cf:provider-proof
bun run cf:release-gates
bunx vitest run tests/vitest/cloudflare-provider-proof-router.test.ts tests/vitest/cloudflare-provider-readiness-script.test.ts --maxWorkers=1
```

**Exit:** provider controls reduce risk without masking app-layer gaps; rollback is documented or rehearsed.

### PH-8: WP-H Final Verification And Release Decision

**Objective:** Decide whether enforcement can safely proceed.

- [ ] Produce requirement traceability report with every requirement covered, deferred, or blocked.
- [ ] Run targeted tests for all changed surfaces.
- [ ] Run broader checks only when blast radius justifies:

```sh
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
```

- [ ] Run hosted/provider proof only for deployed/provider behavior actually changed.
- [ ] Record rollback readiness and false-positive support path.
- [ ] Update `LOOP_LEDGER.md`, `.ai/10_state/current-state.md`, and Supermemory if available.

**Exit:** P0 risks closed; P1 risks closed or accepted with owner/date; no unknown provider behavior remains in release path.

## 18. File-Level Change Map

| Work Package | Existing files expected to change | New files possible | Tests/proof files | Confidence |
| --- | --- | --- | --- | --- |
| `WP-A` | `README.md`, evidence docs, possible scripts under `scripts/*inventory*` | `evidence/runtime-store-ledger.md`, `evidence/route-action-inventory.md` | `tests/vitest/cloudflare-migration-inventory-script.test.ts`, `tests/vitest/cloudflare-d1-authz-access-matrix-script.test.ts` | high for docs/scripts; medium for generated output |
| `WP-I` | `src/lib/observability/route-error.ts`, `src/lib/observability/with-action-errors.ts`, selected route/action helpers | possible shared API contract/idempotency helpers under existing domains | `tests/vitest/route-error*.test.ts`, targeted route/action contract tests | medium until inventory rows exist |
| `WP-B` | `src/lib/publication/public-repository.ts`, `src/lib/collaboration/invite-entry.ts`, `src/app/api/share/[token]/**/route.ts`, `src/app/invite/[token]/**/route.ts` | shared client identity helper if reuse beats duplication | share/invite tests listed in `PH-3` | high |
| `WP-C` | auth route/callback/runtime/session files | auth security matrix artifact | auth and Cloudflare Better Auth tests | medium |
| `WP-D` | `src/lib/authz/d1-access.ts`, touched action/repository files | D1 access matrix artifact | D1/authz/action tests | medium until inventory rows exist |
| `WP-E` | `src/lib/cloudflare/collaboration-room-router.ts`, `src/lib/cloudflare/collaboration-room.ts`, `worker.ts`, realtime client bridge if needed | ticket/nonce helper, D1 nonce table migration if chosen | realtime and collaboration-room tests | medium |
| `WP-F` | AI/upload/job/email/observability files listed in `PH-6` | async dedupe helper or D1 table if needed | AI/upload/queue/email tests | medium |
| `WP-G` | Cloudflare proof/router/config files, provider dashboard/rules | provider decision matrix | Cloudflare provider/readiness proof tests | medium |
| `WP-H` | evidence docs, release gate scripts only if gaps are found | verification ledger | release gate and hosted proof scripts | high |

Any `DISCOVERY-REQUIRED` surface must be resolved by the inventory commands in `PH-1` before editing.

## 19. Detailed Testing And Verification Strategy

### Evidence Classes

| Evidence class | Use | Cannot prove |
| --- | --- | --- |
| Local static | docs, inventories, `git diff --check`, source inspection | runtime/provider/browser behavior |
| Local automated | Vitest/unit/integration/type/lint/build checks | hosted/provider state unless connected |
| Browser/manual | cookie, redirect, focus, realtime UI, Turnstile UX | provider configuration by itself |
| Provider-backed | Cloudflare/D1/R2/Queues/WAF readback | local source correctness by itself |
| Hosted/production | deployed route probes/logs | uninspected source details |

### Adversarial Matrix

| ID | Scenario | Required proof |
| --- | --- | --- |
| `ADV-WS-001` | Anonymous client guesses room name | Router denies before DO forwarding |
| `ADV-D1-001` | Valid user alters project/workspace ID | Cross-tenant denial test |
| `ADV-TOKEN-001` | Attacker enumerates share/invite tokens | Non-enumerating response and no-store |
| `ADV-IDEMP-001` | Timeout retry repeats mutation | Same-key same-fingerprint no duplicate side effect |
| `ADV-IDEMP-002` | Same key, different intent | Stable conflict/validation error |
| `ADV-CONC-001` | Stale update overwrites newer state | Precondition/expected-revision failure |
| `ADV-ASYNC-001` | Queue message partially succeeds then retries | Durable dedupe and no duplicate D1/R2/email/provider side effect |
| `ADV-CACHE-001` | Error/cache response leaks tenant/token/provider details | Forbidden leakage tests |
| `ADV-WAF-001` | Legit user blocked by provider rule | Observe-first evidence, Ray ID support, rollback path |

### Final Verification Sequence

1. `git status --short --branch`.
2. `git diff --check`.
3. Phase-specific targeted Vitest commands.
4. `bun run type-check` when TypeScript/shared API changes occurred.
5. `bun run lint` and `bun run lint:design-system` when source/UI changes warrant.
6. Cloudflare proof scripts only for provider/deployed behavior changes.
7. Browser/manual proof only for browser-only claims.
8. Final `LOOP_LEDGER.md` and `.ai/10_state/current-state.md` update.

## 20. Risk Register

| ID | Risk | Probability | Impact | Severity | Detection | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RISK-P0-1` | Unauthorized WebSocket room access | medium | high | critical | Missing/invalid ticket succeeds | Signed ticket before DO forwarding | realtime executor + security reviewer | open |
| `RISK-P0-2` | D1 no-RLS cross-tenant exposure | medium | high | critical | Cross-tenant test succeeds | Access matrix and denial tests | data/security lane | open |
| `RISK-P0-3` | Server Actions missed as API surface | medium | high | critical | Action lacks matrix row | API-safety matrix before edits | backend lane | open |
| `RISK-P0-5` | Privacy governance missing for ledgers | medium | high | critical | New log/table lacks retention/DSAR row | Privacy table before expansion | lead + privacy reviewer | open |
| `RISK-P1-8` | Duplicate unsafe mutation side effects | medium | medium/high | high | Duplicate/retry tests fail | Idempotency matrix and durable keys | backend lane | open |
| `RISK-P1-9` | At-least-once queue/job side effects duplicate | medium | medium/high | high | Duplicate delivery repeats side effects | Durable dedupe, poison/DLQ proof | async lane | open |
| `RISK-P1-10` | Error/cache/retry drift leaks details or breaks clients | medium | medium | high | Contract tests fail | Standard contract and leakage tests | API lane | open |
| `RISK-P2-2` | CSP/referrer/frame/download posture incomplete | low/medium | medium | medium | Public token header audit gap | Add security header audit before release | security lane | open |

No critical risk is unowned. Critical risks block production enforcement until closed.

## 21. Alternatives, Tradeoffs, Pros/Cons

Recommended: app-layer proof first, then provider observe mode.

Pros:

- Closes real authz/data risks instead of masking them.
- Preserves existing D1-backed controls.
- Produces testable behavior before provider tuning.
- Reduces false-positive risk.

Cons:

- Slower than adding provider rules first.
- Requires more matrix work up front.

Rejected alternatives:

- Broad provider rate limiting first: rejected because WAF/rate rules cannot prove D1 authz, Server Action safety, token posture, or privacy retention.
- Separate API-audit and rate-limiting implementations: rejected because risks are coupled.
- Treat helper existence as proof: rejected because coverage requires per-surface evidence.
- Use Ray ID/correlation ID as idempotency: rejected because duplicate side-effect suppression requires scoped persisted uniqueness.

## 22. SWOT Analysis

Not applicable as a separate strategic section. Strategic uncertainty is already captured in `Risk Register`, `Open Decisions`, and `Alternatives`.

## 23. Definition Of Done

| Area | Done when | Evidence |
| --- | --- | --- |
| Functional | Touched routes/actions/jobs implement planned contracts | Targeted tests and source review |
| UX | Visible flows have safe, non-enumerating, accessible states | DOM/browser proof only where UI changed |
| Accessibility | New challenge/error/realtime states are keyboard/screen-reader safe | Component/DOM/browser proof as applicable |
| Security | P0 risks closed for touched scope | Denial tests, threat matrix, reviewer verdict |
| Privacy | Data classes, retention, DSAR/delete/anonymize, provider retention defined | Privacy table and redaction tests |
| Performance | No unjustified latency/round-trip/regression | Targeted performance or source proof |
| Data/database | Migrations safe, access paths scoped, rollback/fix-forward known | D1 matrix, tests, provider proof when deployed |
| Testing | Each requirement has test/proof or deferred rationale | Traceability report |
| Operations | Logs/metrics/traces/runbooks/rollback named for enforcement changes | Ops plan and proof scripts |
| Rollout | Provider controls observe before enforce and rollback exists | Hosted/provider evidence |
| Documentation | `LOOP_LEDGER.md`, current-state, and memory if available updated | Diff and final report |

## 24. Open Decisions

| ID | Decision | Recommendation | Classification | Can start before resolution? |
| --- | --- | --- | --- | --- |
| `OPEN-001` | Exact D1 schema for new limiter/security/idempotency ledgers | Use existing stores first; when needed, D1 HMAC/hash ledger with TTL and cleanup | blocking for phases that add new ledgers | yes for inventory/contracts; no for table creation |
| `OPEN-002` | Retention periods per data class | Use proposed defaults in section 11, require owner/date before release | blocking before expanded collection/release | yes for inventory |
| `OPEN-003` | If-Match vs expected revision | Route Handlers use HTTP preconditions where natural; Server Actions use expected revision/event sequence | phase-specific implementation decision | yes until touched mutation |
| `OPEN-004` | Draft `RateLimit` headers | Defer; use `Retry-After` only first | release/provider decision | yes |
| `OPEN-005` | Problem type/code naming | Use `urn:archestimator:problem:<code>` and stable local codes | non-blocking with default | yes |
| `OPEN-006` | Process-local estimate mutation limiter durability | Accept only low-risk temporary use; migrate if public/expensive/security-critical | phase-specific release decision | yes for inventory |
| `OPEN-007` | WebSocket nonce store | Default D1 nonce table unless better pre-forward proof exists | blocking before `WP-E` implementation | yes for earlier phases |
| `OPEN-008` | Turnstile surfaces and fallback | Only high-abuse public surfaces after observe proof and accessible fallback plan | release/provider decision | yes |
| `OPEN-009` | WAF rule set and false-positive threshold | Start observe-only; enforce only after app proof and threshold review | release/provider decision | yes |

## 25. Readiness Score And Final Verification

### Executable Posture

`CONDITIONALLY READY`.

Ready subset:

- `PH-0`: preflight and loop setup.
- `PH-1`: `WP-A` runtime/store ledger.
- `PH-2`: `WP-I` cross-surface contract and matrices.
- `PH-3`: `WP-B` existing public/share/invite limiter consolidation.

Not ready yet:

- Production enforcement.
- Provider cutover.
- Realtime release claim.
- Any phase that adds new ledgers without privacy retention/DSAR rows.
- Any route/action/job implementation that skips per-surface matrix rows.

### Scores

| Category | Score | Deduction reason |
| --- | ---: | --- |
| Requirements coverage | 96 | All source requirements mapped; current inventory still must be generated at execution. |
| Source traceability | 96 | All pack docs mapped; line references kept mostly in source docs. |
| Codebase grounding | 90 | Route/action/test surfaces inspected, but final per-symbol rows remain phase work. |
| React/Next.js correctness | 88 | Gates and docs paths named; execution must reread local docs before edits. |
| UX/accessibility completeness | 82 | Backend-heavy plan; UI proof scoped to changed visible flows. |
| Technical architecture specificity | 92 | Phase design and surfaces are concrete; exact helper names for new idempotency/ticket code remain implementation choices. |
| Data/database integrity | 84 | D1 matrix and ledger blueprint included; actual migration/rollback not authored yet. |
| Security/privacy readiness | 88 | Threat model and privacy defaults included; P0 privacy gates still open for implementation. |
| Performance/reliability readiness | 84 | Reliability gates strong; performance budgets are proportional, not benchmarked. |
| Testing depth | 90 | Concrete test files and commands named; test-engineer lane was emulated due agent limit. |
| Rollout/operations readiness | 88 | Observe-first and rollback gates included; provider proof must be gathered later. |
| Sequencing/parallelization quality | 94 | Multi-agent lanes and phase dependencies explicit. |
| Risk ownership | 90 | Critical risks owned by lane; human owner/date required before accepting P1 release risks. |
| Overall implementation readiness | 88 for first subset, 70 for full enforcement program | Full program capped by open P0 implementation blockers. |

### Final Verifier Verdict

Verdict: `approved with caveats` for `PH-0` through `PH-3`; `not ready` for production enforcement/provider cutover.

`verification_mode`: mixed.

- Independent inputs: source/requirements analyst, codebase architecture analyst, adversarial critic.
- Emulated inputs: testing/QA lane due thread limit.
- Final integration: lead same-agent until a separate final verifier reviews the saved artifact.

Conditions for 100:

- Generated current route/action/store inventory exists.
- D1 and Server Action matrices are complete for touched surfaces.
- Privacy retention/DSAR table has owner/date.
- WebSocket nonce store decision is resolved and tested.
- Idempotency ledger schema and cleanup job are implemented where needed.
- Provider observe-mode evidence and rollback proof exist before enforcement.
