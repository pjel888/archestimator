# 2026-07-02 API, Rate Limiting, and Security Consolidation

Status: **IMPLEMENTATION-READY** for first-slice execution (PH-0 through PH-3, covering WP-A, WP-I, WP-B) per owner acceptance recorded in `.ai/10_state/decisions.md` 2026-07-05. Production enforcement, provider cutover, and broad WAF/Turnstile/rate-rule enforcement remain `NOT READY` — gated by implementation-time hosted/provider/two-client/runtime proof in `06_VALIDATION_QA_AND_ROLLOUT_PLAN.md` and `IMPLEMENTATION_PLAN.md` Section 17 PH-8.

This pack supersedes:

- `.ai/03_plans/2026-06-29-Rate-Limiting/`
- `.ai/03_plans/2026-07-01-API-Audit/`
- The tracked/historical API-audit path drift under `.ai/03_plans/2026-07-21-API-Audit/` where old docs or git status still reference it.

Tracked historical source copies are preserved at `.ai/09_archive/2026-07-02-API-Rate-Limiting-Security-Consolidation-Sources/`. Those archived folders are evidence only, not active implementation handoffs.

It merges the two source packs because the same production risk appears through three connected surfaces:

- API and Server Action authorization.
- Abuse control and rate limiting.
- Privacy/security governance for ledgers, logs, tokens, uploads, AI prompts, and realtime traffic.

This is a planning artifact only. It does not authorize blind implementation. The first implementation task must start from this pack's readiness gates, then re-check current source and provider state.

## Current Decision

The merged plan should be implemented as a security-first consolidation, not as a generic limiter retrofit.

Immediate implementation should start with Work Package A, Work Package I, and Work Package B:

- WP-A: current-runtime authority and store ledger.
- WP-I: idempotency, retry, conditional update, cache, error, trace, and async at-least-once contract baseline.
- WP-B: public share and existing limiter consolidation.

Implementation must not proceed to WAF/Turnstile enforcement, broad Cloudflare Rate Limiting Rules, or realtime fanout quotas until the P0 gates are satisfied.

## P0 Gates

- Realtime WebSocket access must get a signed room ticket flow before the Durable Object accepts or forwards traffic. The ticket must be minted only after Better Auth session and workspace/project membership checks, have a TTL of no more than 60 seconds, use a one-shot nonce, be verified with constant-time HMAC comparison before Durable Object forwarding, enforce origin checks, and add separate connect, message, and fanout quotas.
- D1 has no database-native RLS. Every D1 path touched by this plan needs an app-level authorization proof matrix with per-table access predicate, actor source, workspace/project scope, denial tests, and service/admin/internal exceptions.
- Server Actions are part of the API surface. Each touched action must declare actor, authorization predicate, input validator, idempotency/replay posture, CSRF/origin posture, error envelope, and denial tests.
- Store authority must be resolved before new enforcement. Historical Supabase/Postgres wording is migration archaeology unless current source/provider proof says otherwise. The active runtime is Cloudflare Workers/OpenNext + D1 + R2 + Durable Objects + Better Auth.
- New or expanded audit, observability, limiter, upload, AI, and security ledgers must define GDPR-facing classification, lawful basis, retention, DSAR/delete/anonymize handling, provider retention, and security exception policy before data collection expands.

## P1 Standards Gates Added By This Improvement Pass

- Every touched unsafe mutation, whether Route Handler, Server Action, public-token route, internal route, provider callback, or async handler, must classify request semantics and define idempotency key scope, TTL, storage, fingerprint, replay, mismatch, concurrent duplicate, and failure replay behavior.
- Queue consumers, Durable Object alarms, cron jobs, upload jobs, scan/cleanup jobs, and email paths must assume at-least-once execution and prove durable dedupe, bounded retry/backoff, poison handling, DLQ/operator evidence, and idempotent D1/R2/email/provider side effects.
- Rate-limit responses must standardize `429`, `Retry-After`, no-store/private cache posture, non-enumerating errors, and any draft `RateLimit` header usage. Draft `Idempotency-Key` and `RateLimit` guidance must be labeled as draft-level, not RFC compliance.
- Route Handler errors must converge on RFC 9457 Problem Details or a documented local equivalent; Server Actions may use `ActionResult`, but each touched action needs stable external codes, correlation posture, and leakage tests.
- State-changing update paths must define lost-update protection through HTTP preconditions, explicit expected revisions, natural uniqueness, or a documented no-conflict reason.

## Document Map

- `00_COORDINATION_LEDGER.md` - master goal, lanes, source authority, open evidence gaps.
- `01_EXECUTIVE_SUMMARY.md` - merged outcome, readiness, and sequencing.
- `02_SOURCE_AUTHORITY_AND_CURRENT_RUNTIME.md` - current runtime and source-plan reconciliation.
- `03_REQUIREMENTS_AND_TRACEABILITY.md` - consolidated requirements and proof matrix.
- `04_SECURITY_PRIVACY_STANDARDS_MODEL.md` - OWASP, GDPR, Cloudflare, Better Auth, and threat model.
- `05_CONSOLIDATED_ARCHITECTURE_AND_WORK_PACKAGES.md` - implementation work packages and dependencies.
- `06_VALIDATION_QA_AND_ROLLOUT_PLAN.md` - tests, provider proof, staged rollout, rollback.
- `07_RISK_REGISTER_AND_DECISIONS.md` - P0/P1/P2 risks, decisions, rejected approaches.
- `08_FINAL_READINESS_AND_COMPLETION_AUDIT.md` - requirement-by-requirement completion audit for this planning task.
- `09_IDEMPOTENCY_RETRY_AND_RESILIENCE_STANDARDS.md` - standards-backed API idempotency, retry, error, cache, trace, and async delivery contract.
- `10_READINESS_SCORECARD_AND_VERIFICATION_MODE.md` - per-document readiness scorecard, verification-mode declaration, cap application, evidence-class table, and score-cap audit (added in iteration 10).
- `IMPLEMENTATION_PLAN.md` - canonical execution overlay for implementation agents; supersedes ad hoc sequencing from the individual pack docs when execution starts.
- `LOOP_LEDGER.md` - discover, plan, execute, verify, record, decide ledger.

## Source And Standards Inputs

Local source packs:

- `.ai/03_plans/2026-06-29-Rate-Limiting/`
- `.ai/03_plans/2026-07-01-API-Audit/` as the user-provided workspace source folder for this task.
- `.ai/03_plans/2026-07-21-API-Audit/` as tracked/historical API-audit path drift superseded by this pack.
- Archived tracked copies: `.ai/09_archive/2026-07-02-API-Rate-Limiting-Security-Consolidation-Sources/2026-06-29-Rate-Limiting/` and `.ai/09_archive/2026-07-02-API-Rate-Limiting-Security-Consolidation-Sources/2026-07-21-API-Audit/`.

Current source evidence:

- `package.json`
- `worker.ts`
- `src/lib/cloudflare/collaboration-room-router.ts`
- `src/lib/cloudflare/collaboration-room.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/collaboration/invite-entry.ts`
- `src/lib/ai/rate-limit.ts`
- `src/lib/estimates/action-rate-limit.ts`
- `src/lib/authz/d1-access.ts`
- `src/lib/observability/with-action-errors.ts`
- `wrangler.jsonc`
- `cloudflare-env.d.ts`

External standards/reference anchors:

- OWASP API Security Top 10 2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP ASVS project: https://owasp.org/www-project-application-security-verification-standard/
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP SSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- GDPR official regulation text: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
- RFC 9110 HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html
- RFC 6585 Additional HTTP Status Codes: https://www.rfc-editor.org/rfc/rfc6585
- RFC 9111 HTTP Caching: https://www.rfc-editor.org/rfc/rfc9111.html
- RFC 9457 Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457.html
- W3C Trace Context: https://www.w3.org/TR/trace-context/
- Idempotency-Key HTTP Header Field draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- RateLimit Header Fields for HTTP draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
- Cloudflare WAF Rate Limiting Rules: https://developers.cloudflare.com/waf/rate-limiting-rules/
- Cloudflare Workers Rate Limiting binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Cloudflare Queues delivery guarantees: https://developers.cloudflare.com/queues/reference/delivery-guarantees/
- Cloudflare Queues batching and retries: https://developers.cloudflare.com/queues/configuration/batching-retries/
- Cloudflare Durable Object alarms: https://developers.cloudflare.com/durable-objects/api/alarms/
- Cloudflare Turnstile server-side validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Better Auth Rate Limit: https://www.better-auth.com/docs/concepts/rate-limit
- Better Auth Security: https://www.better-auth.com/docs/concepts/security
- Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests
- AWS Builders Library safe retries with idempotent APIs: https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/
- AWS Builders Library timeouts, retries, and backoff with jitter: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/

## Related Plan Packs (Cross-References)

This pack was authored 2026-07-02. Four sibling packs authored afterwards touch overlapping or adjacent surfaces. Implementation agents must reconcile against the latest of these before editing; do not treat this pack as the sole authority for surfaces the newer packs address.

| Sibling pack | Relationship | Surfaces that overlap | Backlink status |
|---|---|---|---|
| `.ai/03_plans/000-Follow Ups/2026-07-03-Authentication-Audit-And-Improvement/` | **Direct overlap.** Phase 3 WP1-WP6 locally implemented 2026-07-04 on the surfaces this pack treats as open P0 blockers. | `RISK-P0-1` (WebSocket ticket), `RISK-P0-2` (D1 authz matrix), `RISK-P0-3` (Server Action safety), `WP-C` (Better Auth), `WP-D` (D1 authz), `WP-E` (realtime ticket). See `07_RISK_REGISTER_AND_DECISIONS.md` status refresh and `02_SOURCE_AUTHORITY_AND_CURRENT_RUNTIME.md` realtime/D1 subsections. | Not yet reciprocal — auth-audit pack does not yet backlink to this pack. Add backlink when that pack next iterates. |
| `.ai/03_plans/2026-07-04-Security-Compliance-Program/` | Adjacent. Broader security-compliance roadmap (P0/P1/P2) that already cites this pack as a source. | Shared OWASP API Top 10 / GDPR / RFC 9457 surface area. | **Reciprocal** — compliance pack README and P0.4 already cite this pack. Do not duplicate risk-register entries. |
| `.ai/03_plans/2026-07-04-Performance-Optimization/` | Adjacent. Performance findings and phases. | Backend cost/spend budgets, D1 round-trip counts, Worker CPU/duration pressure cited in this pack's `06_VALIDATION_QA_AND_ROLLOUT_PLAN.md` and `IMPLEMENTATION_PLAN.md` Section 13. | Not yet reciprocal — performance pack mentions concurrent activity but no formal backlink. Add backlink when that pack next iterates. |
| `.ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/` | Adjacent. Provider-exit cleanup. | `RISK-P0-4` (store authority) supersedes the same Supabase/Postgres active-store wording this pack already classifies as migration archaeology. | Not yet reciprocal — cleanup pack has zero mentions of this pack. Add backlink when that pack next iterates. The cleanup pack's hosted/provider/operator gates remain open and supersede any local-only claim here. |

Coordination rule: when a sibling pack has newer local implementation evidence for a surface this pack treats as an open blocker, the sibling pack's evidence controls for *implementation status*; this pack retains authority for *program-level scope, sequencing, and cross-surface contracts* (idempotency, error envelope, cache, trace, async at-least-once). See `00_COORDINATION_LEDGER.md` "Concurrent Plan-Pack Coordination" for the ownership boundary. Asymmetric backlinks (only some sibling packs reciprocate yet) are tracked in the table above; do not assume bidirectional coverage where the table marks it as not yet reciprocal.

## Implementation Stop Condition

Do not mark a future implementation complete until:

- The current runtime/store ledger is refreshed from source.
- The implementation run starts from `IMPLEMENTATION_PLAN.md` and records loop progress, Supermemory availability, and source/provider proof boundaries in the loop ledger or run log.
- P0 gates are closed with code, tests, and provider evidence where relevant. Local implementation slices in sibling packs (e.g., auth-audit Phase 3 WP1-WP6) close the *local* portion only; hosted/provider/two-client/runtime proof remains required before this pack's release gates pass.
- The security/privacy standards matrix has proof references, not only assertions.
- Narrow staged rollout has hosted evidence and rollback steps.
- Old contradictory plan assumptions are not reintroduced.

Note (iteration 12, 2026-07-05): the package planning status is now `IMPLEMENTATION-READY` for first-slice execution per owner acceptance. The stop condition above still binds every implementation run; planning-level acceptance does not waive implementation-time evidence gates.
