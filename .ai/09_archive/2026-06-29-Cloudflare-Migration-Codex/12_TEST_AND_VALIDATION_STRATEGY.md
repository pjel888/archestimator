---
title: Test And Validation Strategy
plan_id: 2026-06-29-cloudflare-migration-codex
document: 12
---

# Test And Validation Strategy

## Validation Principle

Every future migration slice must prove the behavior it changes. Do not use broad validation as a substitute for provider proof.

## Baseline Checks Before Any Slice

- Current targeted route/action tests for touched behavior.
- Current provider readiness script for touched provider.
- Current data backup/restore posture.
- Current cost and usage baseline.
- Current error-rate and latency baseline.
- Current official Cloudflare docs, product changelog, installed Cloudflare skill guidance, Wrangler schema, and Workers type evidence for the touched Cloudflare products.
- Completed inventory row in `26_INVENTORY_WORKSHEETS.md`.
- Completed proof-spike row in `27_PROOF_SPIKE_BACKLOG.md`.

## Cloudflare Toolchain And Source Validation

Required before any Worker, R2, Queue, KV, D1, Hyperdrive, Email Service, WAF, or DDoS implementation slice:

- Relevant installed Cloudflare skills loaded and their retrieval-first constraints recorded.
- Official docs refreshed for limits, pricing, configuration, API fields, compatibility dates, and rollout/rollback behavior.
- Wrangler config schema reviewed for every config field or binding the slice uses.
- Worker binding types generated from actual config before TypeScript proof is accepted.
- Secrets and environment variables represented as scoped bindings or secret values, not hardcoded source/config literals.
- Local simulation limitations separated from Cloudflare preview/provider proof.

## Front-Door Validation

Required:

- Public pages load.
- Workshop protected routes are not cached.
- Share routes remain sensitive/no-store where intended.
- OAuth callbacks work.
- Upload routes work.
- Webhooks pass.
- WAF/rate-limit events visible.
- Rollback to direct origin works.

## R2 Validation

Required:

- Authorized upload succeeds.
- Unauthorized upload/download fails.
- Signed access expires.
- Private object is not public.
- Image route still displays allowed objects.
- Delete/cleanup works.
- Scan lifecycle works.
- Rollback can read old storage or recover from old copy.

## Queues Validation

Required:

- Producer writes expected message.
- Consumer handles expected message.
- Consumer is idempotent.
- Duplicate message is safe.
- Retry behavior is observable.
- Poison message handling exists.
- Backlog and failures are visible.

## Workers/Next Validation

Required:

- App Router routes.
- Route handlers.
- Server Components.
- Server Actions.
- Streaming behavior.
- Middleware/proxy route gate.
- Headers and cookies.
- Environment variables and bindings.
- Image handling.
- Cache/revalidation behavior.
- CSP/security headers.
- Error and not-found routes.
- Build and preview match production-like `workerd` behavior, not only `next dev`.
- Wrangler config validates against current schema.
- Generated Worker binding types match the resources used by the code.
- Startup/runtime checks capture CPU, subrequest, compatibility flag, and binding errors before production routing.

## Auth Validation

Required:

- Login and logout.
- Magic link and OAuth.
- Session refresh.
- Protected-route redirect.
- Closed-beta gate.
- Legal terms gate.
- Invite accept/continue/sign-out.
- Share route behavior.
- Service-role/admin equivalent.
- Dev/test bypass behavior.
- Unauthorized direct POST or route handler access fails.

## D1 Validation

Required:

- Schema compatibility matrix.
- Data migration dry run.
- Query correctness.
- Transaction behavior.
- Authorization equivalent to RLS.
- Restore strategy.
- Performance at volume.
- Type strategy.
- Realtime replacement plan.

For full database replacement, also required:

- Table/RPC/RLS/trigger inventory reconciles with current migrations.
- Every protected read/write has a positive test and a cross-workspace denial test.
- Every rewritten RPC/action has idempotency and transaction-boundary proof.
- Export/import and restore rehearsal passes.
- Representative data volume tests cover current, 10x, 100x, and 1000x launch assumptions or a documented lower cap.

## Full-Native Performance Validation

Required:

- Current baseline for public/static, share, protected workshop, upload, realtime, email, and common mutation flows.
- Cloudflare preview/provider measurement for the same fixtures.
- Worker startup, CPU, duration, memory, and subrequest evidence.
- D1 query count and p50/p95 latency.
- Core Web Vitals for critical pages.
- Queue age/retry/dead-letter evidence.
- Durable Object room latency and reconnect behavior if realtime uses Durable Objects/WebSockets.
- Cost model updated from observed operation counts.

## Email Validation

Required:

- Domain verification.
- SPF/DKIM/DMARC alignment where relevant.
- Transactional send.
- Arbitrary-recipient eligibility.
- Bounce/failure handling.
- Webhook or event equivalent.
- Retry/circuit breaker semantics.
- Test/mock mode.
- Deliverability comparison against Resend.

## Final Migration Readiness Gates

No production cutover unless:

- Targeted tests pass for the slice.
- Provider proof passes for the slice.
- Cost model has been updated with real measurements.
- Rollback is tested.
- Observability is live.
- Security review has no unresolved P0/P1 findings.
- Cloudflare docs/schema/type refresh is attached to the slice evidence.
- Scorecard in `25_EXECUTION_READINESS_SCORECARD.md` has no unresolved red or amber item for the slice.
