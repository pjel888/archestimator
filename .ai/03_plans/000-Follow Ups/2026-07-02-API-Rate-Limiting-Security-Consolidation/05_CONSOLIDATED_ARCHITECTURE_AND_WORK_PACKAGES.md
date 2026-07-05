# Consolidated Architecture And Work Packages

## Architecture Principle

Use layered controls, but do not hide authorization gaps behind rate limiting.

Preferred order:

1. Correct identity and authorization.
2. Validate inputs and outputs.
3. Make mutation replay/idempotency posture explicit.
4. Define retry, lost-update, cache, error, trace, and async delivery contracts.
5. Add durable abuse controls for expensive or public surfaces.
6. Add privacy-conscious observability.
7. Add provider controls in observe-first rollout.

## Work Package A: Runtime Authority And Store Ledger

Goal: establish current source-backed truth before enforcement changes.

Scope:

- Re-run API route and Server Action inventory.
- Re-run Cloudflare binding/runtime inventory.
- Map each limiter, audit, auth, upload, realtime, AI, and provider log store.
- Classify Supabase/Postgres references as inactive or active with proof.
- Record owner, risk, and proof path per surface.

Deliverables:

- Updated runtime/store ledger.
- Route and Server Action inventory artifact.
- Store authority table.
- List of stale docs/source comments to fix or leave as migration archaeology.

Exit criteria:

- No work package depends on unknown active store.
- Every store has retention/privacy owner.

## Work Package I: Idempotency, Retry, Conditional, Error, Cache, Trace, And Async Baseline

Goal: establish a cross-surface contract before implementation expands mutation, retry, queue, or provider enforcement behavior.

Scope:

- Classify every touched Route Handler, Server Action, public-token endpoint, internal route, provider callback, queue consumer, cron job, and Durable Object alarm by request semantics.
- For unsafe mutations, define idempotency key source, scope, TTL, storage, request fingerprint, replay behavior, mismatch behavior, concurrent duplicate behavior, and failure replay behavior.
- Define lost-update protection through HTTP preconditions, explicit expected revisions, natural uniqueness, or documented no-conflict reasons.
- Standardize `429`, `Retry-After`, draft `RateLimit` posture, no-store/private cache posture, and non-enumerating rate-limit errors.
- Standardize Route Handler error envelopes on RFC 9457 Problem Details or a documented local equivalent; map Server Actions to stable `ActionResult` codes and redaction rules.
- Define W3C trace, app request id, mutation correlation id, idempotency key, and Cloudflare Ray ID roles.
- Define at-least-once delivery posture for Cloudflare Queues, Durable Object alarms, cron/internal jobs, email, upload processing, scan/cleanup, and provider callbacks.

Deliverables:

- Request-semantics matrix for touched surfaces.
- Idempotency/replay/lost-update matrix.
- Retry/backoff and `Retry-After` policy.
- Error-envelope and forbidden-leakage contract.
- Cache/revocation and conditional-response policy.
- Async duplicate-delivery, poison-message, retry, DLQ, and idempotent side-effect test plan.
- Trace/correlation/privacy identifier policy.

Exit criteria:

- No touched unsafe mutation lacks an idempotency or explicitly non-retryable row.
- No async side-effect path lacks duplicate-delivery and poison-message coverage.
- Draft `Idempotency-Key` and `RateLimit` references are labeled draft-level, not RFC compliance.
- Existing local primitives are preserved and standardized rather than replaced without evidence.

## Work Package B: Public Share And Existing Limiter Consolidation

Goal: consolidate existing public/share/invite limiter behavior before expanding enforcement.

Scope:

- Preserve existing D1-backed public publication/share controls.
- Preserve invite create/resend/resolve/continue/accept controls.
- Normalize Retry-After, no-store/private cache, non-enumerating error, and idempotency behavior where already present.
- Verify password, session, activity, comment, decision, unsubscribe, proposal export, and invite limits.
- Define trusted client identity for limiter keys, including Cloudflare header trust order, spoofed-header handling, IPv4-mapped IPv6, IPv6 prefix aggregation, raw IP suppression, and HMAC/key versioning.
- Identify process-local in-memory limits and decide whether acceptable or durable migration is needed.

Deliverables:

- Current limit matrix.
- Trusted client identity and IP-normalization fixture matrix.
- Public/share/invite denial tests.
- Retry-After/no-store/error/idempotency consistency checklist.
- Privacy classification for limiter keys and logs.

Exit criteria:

- Existing limiter behavior is documented and tested.
- No regression in public share recipient flows.
- No broad Cloudflare provider enforcement introduced yet.

## Work Package C: Better Auth Boundary Hardening

Goal: make Better Auth the clear identity boundary and coordinate it with app/provider controls.

Sibling-pack overlap (iteration 11): `.ai/03_plans/000-Follow Ups/2026-07-03-Authentication-Audit-And-Improvement/` Phase 1 (Google picker/logout/state) and Phase 2 (durable publication lockout) are locally implemented. This pack's `WP-C` retains authority for cross-surface coordination between Better Auth built-in limiter, app limiter, and Cloudflare controls; do not duplicate the Better Auth matrix work, build on it.

Scope:

- Verify trusted origins.
- Verify session cookie flags and callback normalization.
- Verify OAuth state binding and provider-specific callback behavior.
- Verify magic-link/account-linking enumeration parity.
- Coordinate Better Auth built-in limiter with app and Cloudflare controls.
- Align Better Auth IP interpretation with the app limiter's trusted-client-identity policy.
- Inventory token and limiter secrets, including `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` and `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER`, with env typing/config or secret-sync proof and fail-closed behavior.
- Document server-side `auth.api` usage and bypass budgets.

Deliverables:

- Better Auth security matrix.
- Auth route denial tests.
- Token-secret inventory and declaration proof.
- Retry message and Retry-After posture.
- Provider-origin proof if deployed settings change.

Exit criteria:

- Auth controls are not double-counting or conflicting.
- App code does not bypass required policy checks by using server-side auth APIs.

## Work Package D: D1 Authorization And Server Action API Safety

Goal: close D1 no-RLS risk and make Server Actions safe API surfaces.

Sibling-pack overlap (iteration 11): `.ai/03_plans/000-Follow Ups/2026-07-03-Authentication-Audit-And-Improvement/24_PHASE_3_AUTHZ_MATRIX_AND_ROLE_TAXONOMY_PLAN.md` WP2-WP4 + WP6 (locally implemented 2026-07-04) cover project/estimate/workspace/collaboration/beta-admin D1 access paths and role taxonomy. This pack's `WP-D` retains authority for the broader surface set (idempotency ledger, limiter/security, AI, upload, email, queue paths not in the auth-audit matrix) and for the cross-surface Server Action API contract (actor/authz/validator/idempotency/CSRF-origin/error-envelope rows). Implementation agents must extend the existing matrix rather than start a parallel one.

Scope:

- Create D1 access-path matrix for touched tables and queries.
- Adopt/extend `src/lib/authz/d1-access.ts` where appropriate.
- Define actor and role predicates for each Server Action.
- Define validator, idempotency/replay, CSRF/origin, error-envelope, and observability posture.
- Use existing `withActionErrors` pattern where it fits.

Deliverables:

- D1 authorization matrix.
- Server Action API matrix.
- Cross-workspace/project denial tests.
- Mutation replay/idempotency tests for every touched unsafe write whose classification requires it.
- Error taxonomy and redaction fixtures.

Exit criteria:

- Every touched D1 path has proof.
- Every touched Server Action has a complete row in the matrix.
- No high-risk mutation relies on undocumented client-only controls.

## Work Package E: Realtime WebSocket Ticketing And Durable Object Controls

Goal: prevent anonymous or unauthorized room access and abusive realtime fanout.

Sibling-pack overlap (iteration 11): `.ai/03_plans/000-Follow Ups/2026-07-03-Authentication-Audit-And-Improvement/24_PHASE_3_AUTHZ_MATRIX_AND_ROLE_TAXONOMY_PLAN.md` WP1 (locally implemented 2026-07-04) closes the local implementation layer for topic-bound HMAC room tokens (`src/lib/collaboration/realtime-room-token.ts`) and Durable Object `authorize` handshake (`src/lib/cloudflare/collaboration-room.ts`). This pack's `WP-E` retains authority for: separate connect/message/fanout quotas (not yet in the auth-audit slice), origin/host check parity, `Retry-After`/no-store posture for ticket-denied responses, hosted/two-client Worker proof, and the cross-surface error-envelope/idempotency contract from `09`. Do not reimplement ticket mint/verify; extend the existing implementation.

Scope:

- Add ticket minting after Better Auth session and workspace/project membership.
- Ticket fields: room, actor, workspace/project, purpose, nonce, expiry, issued-at.
- Ticket TTL: no more than 60 seconds.
- Verification: HMAC, constant-time compare, one-shot nonce, bad-token redaction.
- Router gate: verify before forwarding to Durable Object.
- Origin/host checks.
- Quotas: connect, message, fanout.
- Payload schema and privacy review.

Deliverables:

- Ticket mint/verify design.
- Router and Durable Object abuse-control design.
- Denial test plan for missing/expired/reused/wrong-room/wrong-user/wrong-workspace/bad-origin tickets.
- Realtime observability redaction plan.

Exit criteria:

- Durable Object is unreachable for unauthenticated/unauthorized room requests.
- Realtime message/fanout quotas are proven without disrupting normal collaboration.

## Work Package F: AI, Uploads, Internal Jobs, Queues, Email, And Observability

Goal: close non-obvious API/security risks beyond public share and auth.

Scope:

- AI prompt/output minimization and redaction.
- AI tool/action allowlists.
- SSRF controls for any fetch/import/tool surfaces.
- Upload admission, sniffing, dimension/decompression limits, malware/content scan posture.
- R2 signed URL TTL and lifecycle/delete proof.
- Internal upload-cleanup/upload-scan secret rotation and fail-closed tests.
- Queue/email abuse budgets, at-least-once duplicate-delivery handling, bounded retry/backoff, poison-message behavior, DLQ/operator evidence, and idempotent side effects.
- Observability taxonomy, redaction, retention, and dashboards.

Deliverables:

- AI and SSRF control matrix.
- Upload/R2 control matrix.
- Internal job auth/rotation plan.
- Async duplicate-delivery and poison-message proof plan.
- Privacy retention table for logs and ledgers.
- Operational dashboards/alerts list.

Exit criteria:

- No AI, upload, internal job, queue, or email surface expands without privacy and abuse controls.
- Provider logs are useful but not over-collected.

## Work Package G: Cloudflare Provider Controls

Goal: add provider controls only after app-layer proof exists.

Scope:

- WAF Rate Limiting Rules in observe/log mode first.
- Turnstile only on high-abuse public surfaces after false-positive planning.
- Workers Rate Limiting binding only where it is clearer than app D1/DO controls.
- Security Events and Ray-ID correlation.
- Narrow skip rules and regression review.

Deliverables:

- Provider control decision matrix.
- Observe-mode evidence.
- False-positive support path.
- Rollback commands/procedures.
- Hosted proof artifacts.

Exit criteria:

- Provider controls reduce risk without masking app-layer gaps.
- Rollback is rehearsed or documented with exact state changes.

## Work Package H: Final Hosted Verification And Release Decision

Goal: prove the full plan can move to enforcement safely.

Scope:

- Targeted unit/integration tests.
- Hosted smoke for public/share/invite/auth/realtime/upload/AI surfaces touched.
- Provider event correlation when provider controls are changed.
- Privacy retention and DSAR job proof where ledgers are changed.
- Rollback rehearsal.

Deliverables:

- Verification ledger.
- Requirement traceability report.
- Risk register update.
- Go/no-go release decision.

Exit criteria:

- P0 risks closed.
- P1 risks either closed or explicitly accepted with owner and date.
- No unknown provider behavior remains in the release path.

## Dependency Graph

- WP-A must happen before all other packages.
- WP-I can start after WP-A and must finish before mutation/retry/queue/provider enforcement claims.
- WP-B can proceed after WP-A for inventory of existing public/share/invite controls, but any mutation retry, error-envelope, cache, or idempotency normalization must follow WP-I.
- WP-C can proceed after WP-A and should inform WP-D and WP-E.
- WP-D must follow WP-I for touched unsafe mutations, and must precede broad API enforcement and any mutation-focused limiter work.
- WP-E must precede realtime quota expansion and any collaboration launch claim.
- WP-F can split after WP-A only for inventory, privacy classification, and non-mutating design work. Any route/action-bearing AI, upload, internal-job, queue, email, or observability slice must wait for WP-I plus WP-D's shared API-safety baseline, or explicitly carry complete actor/authz/validator/idempotency/CSRF-origin/error-envelope/async-delivery matrix rows before implementation.
- WP-G must wait for app-layer proof from relevant packages.
- WP-H is final integration and release decision.

## Rejected Architecture

Rejected: "Add Cloudflare Rate Limiting Rules first and clean up app gaps later."

Reason: provider limits can reduce volume but cannot prove tenant authorization, token posture, Server Action safety, D1 query scoping, or GDPR retention. They can also create false positives that are hard to debug without app-layer observability.

Rejected: "Keep the rate-limiting pack and API-audit pack separate."

Reason: their highest risks are coupled. Realtime auth, D1 authorization, Server Action safety, public token abuse, AI/upload resource consumption, and privacy retention must be planned as one security program.

Rejected: "Treat existing helpers as proof of complete protection."

Reason: helpers are assets, but release readiness requires coverage evidence for every touched access path and surface.

Rejected: "Use correlation IDs or Cloudflare Ray IDs as the idempotency strategy."

Reason: correlation and provider IDs help troubleshooting. Duplicate side-effect suppression requires scoped, fingerprinted, persisted, uniqueness-enforced idempotency or natural-key semantics.
