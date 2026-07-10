# Frontier Applicability Gates

<!-- FRONTIER-PLAN-SUITE: 2026-07-10 -->

Load only sections triggered by the task. Mark each gate's applicability and
criterion status separately, then link current evidence; do not copy irrelevant
gates into the pack.

## GATE-UX-01: User-Facing UI, UX, And Accessibility

**Triggers:** page/component/layout/navigation/form/copy/interaction change.

Require:

- User job and before/after journey.
- Loading, empty/not-found, success, validation, error, permission/identity,
  degraded/offline, disabled/pending, and recovery states as applicable.
- Keyboard order/shortcuts, focus entry/return, semantic names/roles/states,
  screen-reader announcements, contrast, zoom/reflow, motion, touch target, and
  mobile/responsive behavior.
- Existing `src/components/ui/` reuse and `DESIGN.md` consultation, treating it
  as an alpha guide rather than owner preference law.
- Component/DOM evidence for behavior; browser/manual proof only for claims that
  static/DOM tests cannot prove, such as real routing, layout, focus across
  navigation, responsive composition, or browser integration.

Hard fail: a user-facing unit lacks affected states, acceptance criteria, or an
evidence plan.

## GATE-NEXT-01: React 19 And Next.js 16

**Triggers:** App Router, RSC/client boundary, route handler, Server Action,
caching/revalidation, metadata/assets, build/runtime, or React state/effect work.

Require:

- Installed version/config/script evidence and relevant local docs under
  `node_modules/next/dist/docs/` before framework claims.
- Route/layout/loading/error/not-found/metadata/proxy/runtime ownership.
- Default Server Component boundary; justified minimal client islands and
  serializable props.
- Data source, cache owner/key/privacy dimensions/lifetime/invalidation, request
  API constraints, streaming/Suspense behavior, mutation/authz/validation/error
  contract, and navigation refresh semantics.
- React state owner, derived-state strategy, effect necessity/cleanup/race
  behavior, pending/optimistic behavior, hydration stability, and accessibility.
- Type/lint/build/test proof proportionate to the changed behavior.

Hard fail: framework-sensitive decisions rely on model memory, or auth/cache
boundaries are implicit.

## GATE-CONTRACT-01: TypeScript, API, Network, And Dependency Contracts

**Triggers:** exported type/module boundary, route/action/API/event contract,
network client, package/SDK change, serialization, or error-envelope change.

Require:

- Current caller/importer/consumer and compatibility impact.
- Domain invariants represented in types without unsafe casts or duplicated
  parallel models; runtime validation at untrusted boundaries.
- Request/response/event/error schema, authz, idempotency, timeout/cancellation,
  retry/backoff, pagination, versioning, cache interaction, and failure behavior.
- Existing utility/package evaluation before new dependency adoption; for any
  dependency change, official current docs, maintenance/license/security/bundle
  implications, rejected alternatives, and rollback/removal path.
- Contract tests and consumer/provider checks at the narrowest matching surface.

Hard fail: a public/shared contract changes without consumer mapping,
compatibility strategy, or runtime-boundary validation.

## GATE-DATA-01: Data, D1, R2, Durable Objects, Queues, Cron, Email, And Images

**Triggers:** schema/query/repository/storage/realtime/background job/provider
binding or lifecycle change.

Require:

- Active boundary proven from `wrangler.jsonc`, generated types, current source,
  and provider readback when the claim is provider-state dependent.
- D1 schema/index/constraint/migration/order/backfill/authz/query-plan/restore or
  fix-forward implications.
- R2 key naming, authorization, metadata, lifecycle, orphan/cleanup, consistency,
  and size/abuse behavior.
- Durable Object identity/state/concurrency/hibernation/reconnect/cleanup.
- Queue retry/idempotency/DLQ/poison-message/amplification and cron overlap.
- Email recipient/authz/delivery/failure/redaction behavior and Images transform
  or signed-access behavior when used.
- Local emulator/test evidence separated from hosted/provider proof.

Use only the Cloudflare resources authorized in `AGENTS.md`. Historical
Supabase/Vercel/Resend artifacts are migration archaeology unless current repo
evidence proves active use.

Hard fail: cross-project boundary is unknown, data loss/recovery is unplanned,
or a provider claim is made from local-only evidence.

## GATE-SEC-01: Auth, Public Links, Invitations, Sessions, And Secrets

**Triggers:** Better Auth, roles/permissions, tenant/workspace access, public
share, invite, password reset/unlock, OAuth, magic link, API key, cookie, bearer
token, file access, or recipient credential.

Require:

- Actor/resource/action/tenant authorization matrix and explicit deny tests.
- Credential-material taxonomy: raw/hash/encrypted/derived/public marker;
  creation, storage, read/use, client visibility, URL/cookie/session use,
  rotation/revocation, logging, destruction.
- Direct POST, replay, duplicate click/submit, expired, revoked, copied URL,
  cross-recipient, cross-workspace, and lowest-privilege cases.
- Server-boundary validation/authz, CSRF/origin posture, rate/body-size abuse,
  safe logging/errors/analytics/screenshots, least privilege, and audit events.
- Server-only design when client-visible credential authority/evidence is absent.

Hard fail: raw and hashed credentials are conflated, public acceptance material
is unclear, authorization is client-only, or denial evidence is missing.

## GATE-VERIFY-01: Error Handling, Tests, And Failure Semantics

**Triggers:** behavior change, defect fix, server/API/observability/email/ops
surface, async failure path, or a readiness claim.

Require:

- Proof strategy chosen before behavior edits: existing red test, new/strengthened
  red test, characterization, or a justified substitute.
- Happy, nil/missing, invalid/boundary, denied, timeout/cancel, concurrent,
  retry/idempotency, partial-success, stale/degraded, and recovery cases as
  applicable.
- Structured safe errors and logging; no swallowed sensitive-path failures or
  unredacted secret/customer data; operator and user recovery behavior.
- Test isolation, deterministic fixtures/clock/randomness, cleanup, expected
  failure signal, expected pass signal, and evidence destination.
- Required repository error-handling gates for touched sensitive surfaces.

Hard fail: a changed failure path is unobservable, silently swallowed, or has no
falsifiable regression proof.

## GATE-PERF-01: Performance, Scalability, And Reliability

**Triggers:** the task changes a measurable performance/reliability claim,
algorithmic/cardinality behavior, or a known latency/memory/query/network/
background-job/concurrency hot path.

Require:

- User-visible goal, baseline, target/budget, fixture/data volume, evaluator,
  regression threshold, observability source, and rollback trigger.
- Relevant TTFB/LCP/INP/CLS, navigation, hydration/client JS, RSC payload, API,
  query count/plan/latency, payload, memory, retry, error, and queue metrics.
- 10x/100x reasoning where cardinality can grow; pagination/virtualization or a
  reason not needed.
- Apply the schema's shared adversarial matrix to relevant timeout, cancellation,
  retry/idempotency, partial-failure, provider, stale-cache, and recovery paths.
- Measured evaluator evidence for performance claims; ordinary tests alone do
  not prove speed.

Hard fail: “optimize” or “scalable” lacks a falsifiable evaluator.

## GATE-OPS-01: Observability, Release, And Operations

**Triggers:** the task changes production operations, provider mutation,
background processing, observability/support contracts, or launch/release
readiness claims.

Require:

- Structured redacted logs, metric/event/trace/audit signals, correlation, alert
  threshold or justified `N/A`, dashboard/query/runbook, and support ownership.
- Rollout stages/flag/default, compatibility window, go/no-go, post-release
  proof, rollback/fix-forward, data repair, incident path, and cleanup.
- Local, hosted, provider, production, operator, and external-authority proof
  explicitly separated.
- `AUTH-*` packet for any forbidden external side effect; all local prerequisites
  complete.

Hard fail: release claim depends on missing hosted/provider proof or rollback.

## GATE-AGENT-01: Agent Framework, Prompt, Skill, Or Orchestration Work

**Triggers:** the task changes agent/prompt/skill/payload behavior, routing,
memory, eval, orchestration, authority, evidence, state, or completion contracts.

Require:

- Precedence/input-injection model and agent-neutral canonical policy.
- Capability/runtime probe and fallback behavior.
- Bounded worker packet and context-budget strategy.
- Shared-worktree ownership/integration, durable state, resume, failure/timeout,
  and cleanup behavior.
- Autonomous decision and hard-gate isolation semantics.
- Deterministic contract validation plus semantic scenario evals.
- `validate:agents` and relevant adapter resolver when adapter/payload surfaces
  change.

Hard fail: workflow invocation is treated as proof, an optional runtime is
mandatory without fallback, or completion can be claimed from worker summary.

## GATE-CLEAN-01: Cleanup, Refactor, Deletion, Or Migration

**Triggers:** behavior-preserving cleanup, API/symbol refactor, deletion,
dependency removal, broad migration, or deslop work.

Require:

- Before behavior characterization/regression coverage.
- Caller/import/graph impact proportional to blast radius.
- Deletion criteria and proof of no required references/runtime behavior.
- One smell/boundary at a time; prefer deletion/existing utilities over layers.
- Compatibility/migration order and rollback/fix-forward.
- Focused tests plus broader checks where shared behavior changes.

Hard fail: behavior is assumed unchanged without characterization, or unrelated
cleanup expands the diff.
