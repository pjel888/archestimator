The issue is not “add rate limiting”; it is to turn scattered protection into one durable abuse-control architecture that survives the Vercel → Cloudflare migration. I found current controls across shared-link/publication, invite, upload admission, and export flows, while the existing Cloudflare migration plan already targets Workers/OpenNext, WAF/rate limiting, Turnstile, D1, R2, Queues, Durable Objects, and observability.

The key design constraint: Cloudflare WAF rate limiting is useful at the edge, but it is not precise enough to be the only limiter for security-critical product actions; Cloudflare’s own docs note WAF rate limiting can have a short delay and excess requests may still reach origin, while Worker Rate Limiting is fast but per-location/eventually consistent and limited to 10-second or 60-second periods. Turnstile should be treated as conditional friction for abuse-sensitive flows, not a blanket replacement for app-level controls. ([Cloudflare Docs][1]) ([Cloudflare Docs][2]) ([Cloudflare Docs][2]) ([Cloudflare Docs][3])

Here is the prompt to give your codebase AI:

````text
You are working in the Archestimator codebase at:

/Users/philiplewis/Documents/archestimator

Your task is to create a comprehensive RATE LIMITING PLANNING PACKAGE only.

Create the full plan in:

/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-29-Rate-Limiting

Do not implement app code. Do not modify production source files. Do not change existing migrations, route handlers, server actions, tests, package scripts, env files, or Cloudflare/Vercel config. This is a planning-only task. You may create and edit files only inside:

.ai/03_plans/2026-06-29-Rate-Limiting

The goal is to plan a durable, product-aware, Cloudflare-ready rate limiting architecture for Archestimator while the app is migrating from Vercel toward full Cloudflare deployment.

Archestimator is currently a Next.js 16 App Router/RSC app with Bun, TypeScript, Supabase Auth/Postgres/RLS/Realtime/Storage, Resend, server actions, route handlers, public share links, invites, uploads, XLSX export, and closed-beta/auth gates. The target direction is full Cloudflare: Workers/OpenNext, WAF/rate limiting, Turnstile, D1, Better Auth, R2, Queues/Cron Triggers, Durable Objects/WebSockets, KV only for safe cache/config, Cloudflare Email Service, Web Analytics, and Workers Observability.

This plan must bridge the current app and the target Cloudflare deployment. Do not assume the migration is already complete. The plan must support a staged transition where some limits still rely on current Supabase/Postgres/Vercel-era infrastructure while future-proofing the architecture for Cloudflare-native enforcement.

## Non-negotiable principles

1. Planning only
   - Produce documentation, inventories, matrices, rollout plans, and proof gates.
   - Do not add middleware, route wrappers, Cloudflare config, migrations, tests, or production code.
   - Do not “quick fix” existing rate limit code during this task.

2. Do not treat Cloudflare WAF as the only rate limiter
   - WAF/rate limiting is a coarse edge layer.
   - App-aware limits are still required for user, workspace, project, estimate, publication, recipient, token, upload, export, AI, auth, and invite scopes.
   - WAF cannot reliably know the authenticated app actor or domain resource.
   - WAF rules may be delayed/permissive and must be paired with app-level controls for security-critical flows.

3. Do not use KV for strong counters
   - KV is eventually consistent and must not be used for permissions, sessions, locks, or strong counters.
   - Use KV only for safe cache/config if needed.
   - For exact or security-sensitive counters, plan Durable Objects, D1 transactional counters, or the current Postgres-backed `security_rate_limit_events` table during migration.

4. Classify limits by purpose
   - Abuse/security limiter: protects auth, public links, invites, password attempts, write actions, paid/expensive AI routes, exports, and uploads.
   - Cost limiter: protects AI, exports, image processing, email, storage, and DB-heavy operations.
   - Backpressure limiter: protects CPU/memory/concurrency for uploads, XLSX generation, scans, queues, and realtime rooms.
   - UX guardrail: prevents accidental repeated clicks, duplicate submissions, or runaway optimistic mutations.

5. Preserve product behavior
   - Valid AEC users should not be blocked while editing estimates, using the component library, uploading normal files, exporting proposals, sending invites, or reviewing shared proposals.
   - Rate limits must return consistent 429 responses with `Retry-After` where appropriate.
   - Security failures must not leak whether a token, recipient, project, email, or invite exists.
   - Public routes must keep no-store / security header posture where applicable.

6. Migration-aware target
   - Current: Next.js App Router, Supabase, Vercel-era deployment, route handlers, server actions.
   - Transitional: Cloudflare in front of existing origin and/or OpenNext on Workers with Supabase still backing data.
   - Final target: Cloudflare-native deployment where possible.
   - The plan must identify what changes when moving from Vercel to Cloudflare and what must be proven before production cutover.

## Required first step: repository and plan-context audit

Before writing the final plan docs, inspect the current repo. Use local commands and exact file references.

Start from repo root:

```bash
cd /Users/philiplewis/Documents/archestimator
pwd
git status --short
````

Read at minimum:

```text
README.md
package.json
.env.example
next.config.ts
src/proxy.ts
vercel.json
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/README.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/03_SOURCE_AND_CODEBASE_AUDIT.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/22_FULL_CLOUDFLARE_NATIVE_TARGET.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/23_D1_AUTH_REALTIME_REDESIGN_PLAN.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/24_SUPERFAST_CLOUDFLARE_PERFORMANCE_PLAN.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/29_CURRENT_EVIDENCE_INVENTORY.md
```

Then inventory all rate-limit-adjacent code. Use these searches and expand as needed:

```bash
rg -n "rateLimit|rate limit|RateLimit|429|Retry-After|Too many|lockout|locked|attempt|quota|throttle|backpressure|admission|circuit|security_rate_limit_events|reserve_security_rate_limit_slot|cf-connecting-ip|x-forwarded-for|x-real-ip|x-vercel-ip-country|cf-ipcountry|Turnstile|captcha|bot|WAF|Durable Object|KV|D1|OpenNext|Cloudflare|Vercel" src supabase scripts tests .ai package.json vercel.json next.config.ts .env.example

find src/app -name route.ts | sort
find src/lib -name '*actions.ts' | sort
find src/app -name 'page.tsx' | sort
find src/app -name 'layout.tsx' | sort
find supabase/migrations -type f | sort | rg "rate|security|publication|invite|upload|auth|rls|webhook|digest|collaboration"
```

You must inspect at least these known files if present:

```text
src/lib/publication/public-repository.ts
src/lib/publication/security.ts
src/app/api/share/[token]/events/route.ts
src/app/api/share/[token]/comment/route.ts
src/app/api/share/[token]/decision/route.ts
src/app/api/share/[token]/password/route.ts
src/app/api/share/[token]/recipient-session/route.ts
src/app/api/share/[token]/activity/route.ts
src/app/api/share/[token]/snapshot/route.ts
src/app/api/share/[token]/unsubscribe/route.ts
src/lib/collaboration/invite-entry.ts
src/lib/collaboration/invite-origin.ts
src/app/invite/[token]/accept/route.ts
src/app/invite/[token]/continue/route.ts
src/app/invite/[token]/sign-out/route.ts
src/lib/uploads/admission-control.ts
src/lib/uploads/policy.ts
src/lib/uploads/scanning.ts
src/app/api/component-library/attachments/route.ts
src/app/api/component-library/attachments/direct-upload/route.ts
src/app/api/component-library/images/route.ts
src/app/api/projects/images/route.ts
src/app/api/estimate-row-images/route.ts
src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts
src/app/api/ai/ask/route.ts
src/app/api/ai/package-builder/route.ts
src/app/api/webhooks/resend/route.ts
src/app/api/internal/upload-cleanup/route.ts
src/app/api/internal/upload-scan/route.ts
src/app/api/internal/upload-runtime/route.ts
src/lib/auth/session.ts
src/lib/auth/closed-beta-access.ts
src/lib/auth/dev-auth-gate.ts
src/lib/email/resend-client.ts
src/lib/publication/actions.ts
src/lib/collaboration/actions.ts
src/lib/projects/actions.ts
src/lib/estimates/actions.ts
src/lib/component-library/actions.ts
src/lib/workshop/actions.ts
```

If some files do not exist, record that in the audit instead of inventing them.

## Required Cloudflare research refresh

Refresh current official Cloudflare documentation before making Cloudflare-specific claims. Use only official Cloudflare docs for exact Cloudflare feature behavior. At minimum, review:

* Cloudflare WAF Rate Limiting Rules
* Cloudflare Workers Rate Limiting binding
* Cloudflare Turnstile
* Cloudflare Workers Observability / logs
* Cloudflare D1 limits and transaction behavior
* Durable Objects alarms/storage/WebSocket behavior if proposing Durable Objects for rate limiting or realtime rooms
* Wrangler config / binding syntax for the current date
* Cloudflare pricing/plan availability only as a dated planning input, not a permanent constant

Record the exact documents and access date in the research/evidence doc. Do not hardcode plan availability, limits, price numbers, or binding syntax without marking them as “must refresh before implementation.”

## Required output package

Create this directory:

```bash
mkdir -p .ai/03_plans/2026-06-29-Rate-Limiting
```

Then create the following files:

```text
README.md
00_AGENT_COORDINATION.md
01_EXECUTIVE_SUMMARY.md
02_FEATURE_BRIEF_AND_SCOPE.md
03_SOURCE_AND_CODEBASE_AUDIT.md
04_RATE_LIMITING_INVENTORY.md
05_ABUSE_THREAT_MODEL.md
06_POLICY_AND_LIMIT_MATRIX.md
07_ARCHITECTURE_AND_PROVIDER_DESIGN.md
08_CLOUDFLARE_NATIVE_PLAN.md
09_APP_LIMITER_IMPLEMENTATION_PLAN.md
10_ROUTE_AND_SERVER_ACTION_WORK_PACKAGES.md
11_TEST_AND_VALIDATION_STRATEGY.md
12_OBSERVABILITY_AND_OPERATIONS.md
13_ROLLOUT_ROLLBACK_AND_FALSE_POSITIVE_PLAN.md
14_SECURITY_PRIVACY_AND_DATA_RETENTION.md
15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md
16_REQUIREMENTS_TRACEABILITY_MATRIX.md
17_FINAL_READINESS_REVIEW.md
18_COMPLETION_AUDIT.md
```

Every document must include YAML frontmatter:

```yaml
---
title: <document title>
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---
```

Use exact local file references inside the docs. Prefer this style:

```text
Evidence: `src/lib/publication/public-repository.ts:340-492`
Evidence: `src/app/api/share/[token]/password/route.ts:52-110`
Evidence: `src/lib/uploads/admission-control.ts:26-35`
```

Do not cite guessed line numbers. Use `nl -ba <file>` or editor line numbers.

## README.md requirements

README must include:

1. Current readiness verdict

   * Example: `Readiness: NOT READY for implementation until inventory and proof gates pass.`
   * This plan should be ready to guide implementation, not authorize immediate production cutover.

2. One-paragraph summary

   * Rate limiting is a layered architecture: Cloudflare edge, Worker binding, durable app limiter, backpressure/concurrency limiter, Turnstile friction, observability, rollout.

3. Recommended direction

   * Keep current Supabase/Postgres limiters where they already exist until Cloudflare replacements are proven.
   * Introduce a central rate limiting policy registry and adapter.
   * Use Cloudflare WAF for broad unauthenticated edge abuse.
   * Use Worker Rate Limiting binding for cheap, low-latency route/user/resource throttles where approximate-per-location behavior is acceptable.
   * Use Durable Objects or D1/Postgres for security-critical counters and lockouts requiring stronger consistency.
   * Use Turnstile only on abuse-sensitive public/auth-adjacent flows after threshold.
   * Treat in-memory maps as local/backpressure only unless proven safe in the target runtime.

4. Document index with one-line descriptions.

5. Stop condition

   * No implementation until all route/action inventories are complete.
   * No production enforcement until false-positive monitoring, rollback, and observability exist.
   * No full Cloudflare cutover until rate limiting is tested under the target Cloudflare runtime.

## 00_AGENT_COORDINATION.md requirements

Define:

* Planning-only boundary.
* No source changes outside plan directory.
* How to record evidence.
* How to handle uncertainty.
* How to avoid inventing route coverage.
* How to mark follow-up questions as assumptions instead of blocking.
* How to coordinate with existing Cloudflare migration plan.
* How to avoid duplicating the Cloudflare migration plan; this plan should specialize in rate limiting and reference that package.

## 01_EXECUTIVE_SUMMARY.md requirements

Include:

* The root problem: current rate limiting is scattered across publication, invite, upload, export, and security helpers; it is not yet a unified product-wide abuse control layer.
* The main risk: server actions and API routes can drift independently, especially because `src/proxy.ts` bypasses `/api` routes and server actions need their own guards.
* The Cloudflare migration risk: in-memory and Node/Vercel assumptions may break or weaken under Workers/OpenNext.
* Recommended layered model:

  1. Cloudflare WAF/rate limiting/DDoS for broad public abuse.
  2. Worker Rate Limiting binding for fast approximate route/user/resource throttles.
  3. Durable app limiter for exact/security-critical actions.
  4. Backpressure/concurrency limiter for uploads/exports/jobs.
  5. Turnstile after suspicious thresholds.
  6. Observability and rollback.
* A crisp GO/NO-GO table.

## 02_FEATURE_BRIEF_AND_SCOPE.md requirements

Define the scope.

In scope:

* Public share link routes.
* Invite routes.
* Auth/login/magic-link/OAuth/callback flows.
* Contact/support forms if present.
* Uploads and direct uploads.
* Image proxy/download routes.
* XLSX proposal export.
* AI routes, even if disabled/deferred.
* Email send/digest/resend flows.
* Webhooks and internal cron routes.
* Server actions under `src/lib/**/*actions.ts`.
* Realtime/presence/cursor endpoints if any app route is involved.
* Future Cloudflare WAF/Workers/D1/Durable Objects/Turnstile/Observability architecture.
* Existing current Supabase/Postgres limiters.

Out of scope:

* Implementing code.
* Setting final paid-plan pricing assumptions.
* Replacing Supabase/Auth/D1/Better Auth in this plan.
* Full Cloudflare production cutover.
* Changing business pricing tiers.

Assumptions:

* Archestimator is prelaunch/closed beta.
* The preferred future is full Cloudflare, but current providers remain live until proof gates pass.
* User experience matters: AEC workflows should not feel brittle.

## 03_SOURCE_AND_CODEBASE_AUDIT.md requirements

Perform a source-backed audit. Include exact file references for every claim.

Cover at minimum:

1. Stack and architecture

   * Next.js version, App Router/RSC, Bun, Supabase, Resend, Vercel artifacts, current scripts.
   * Server-actions-first architecture.
   * Protected route behavior.

2. Existing plan context

   * Existing Cloudflare migration package and its stop conditions.
   * Existing stack contract.
   * Existing full Cloudflare target.

3. Existing limiter implementations

   * `security_rate_limit_events`
   * `reserve_security_rate_limit_slot`
   * Shared publication/public repository limiters.
   * Invite limiters.
   * Upload admission control.
   * Password lockout/progressive delay.
   * Comment circuit breaker.
   * Proposal export limiter.
   * Any route returning 429 or `Retry-After`.

4. Current gaps and risks

   * API route bypass in `src/proxy.ts`.
   * Server actions needing explicit guard/rate strategy.
   * Scattered IP extraction logic.
   * Mixed header trust between Vercel and Cloudflare.
   * In-memory maps/circuit breakers that do not provide durable distributed enforcement.
   * Current Supabase/Postgres dependency and migration implications.
   * Node runtime routes that may need Cloudflare compatibility proof.
   * Lack of a central policy registry.
   * Lack of unified observability for 429s/blocks/false positives.

## 04_RATE_LIMITING_INVENTORY.md requirements

Create a complete inventory table.

The table must include these columns:

```text
Surface
Path / Function
HTTP Method or Action Type
Current Auth / Session Gate
Current Limit Exists?
Current Limit Mechanism
Current Key Shape
Proposed Actor Key
Proposed Resource Key
Proposed Limit Class
Proposed Window(s)
Proposed Store / Provider
Cloudflare Edge Rule Needed?
Worker Binding Candidate?
Turnstile Candidate?
Failure Response
Retry-After Strategy
Privacy / PII Handling
Observability Event
Test Coverage Needed
Migration Stage
Risk
Owner Notes
```

Inventory at least:

* `/api/share/[token]/snapshot`
* `/api/share/[token]/events`
* `/api/share/[token]/activity`
* `/api/share/[token]/password`
* `/api/share/[token]/recipient-session`
* `/api/share/[token]/comment`
* `/api/share/[token]/decision`
* `/api/share/[token]/unsubscribe`
* `/share/[token]` page load behavior if relevant
* `/invite/[token]`
* `/invite/[token]/accept`
* `/invite/[token]/continue`
* `/invite/[token]/sign-out`
* Auth/login/magic link/OAuth/callback routes
* Contact/support forms if present
* AI routes
* Upload routes
* Image routes
* XLSX proposal export
* Resend webhook
* Internal upload cron routes
* Server actions: projects, estimates, component library, templates, publication, collaboration, workspace, mass deletion, account/profile/security, email/digest.
* Any public or unauthenticated POST/GET that performs DB reads, writes, email sends, storage operations, heavy CPU, or token checks.

For server actions, inventory by action group if there are too many individual actions, but call out high-risk functions individually.

## 05_ABUSE_THREAT_MODEL.md requirements

Define threats by product surface:

1. Public share links

   * Token enumeration.
   * Password brute force.
   * Recipient session abuse.
   * Comment spam.
   * Decision spam.
   * Event telemetry flooding.
   * Snapshot scraping/download abuse.
   * Owner email digest spam.

2. Invite flows

   * Invite token enumeration.
   * Accept/continue brute force.
   * Invite resend abuse.
   * Cross-origin submission.
   * Membership mutation abuse.

3. Auth flows

   * Magic link/email flooding.
   * OAuth callback abuse.
   * Credential/session probing.
   * Closed-beta bypass attempts.
   * User enumeration.

4. Authenticated workspace

   * Rapid project/estimate/library mutations.
   * Bulk delete preview/execute abuse.
   * Export abuse.
   * Upload/storage abuse.
   * AI cost explosion.
   * Email send abuse.

5. Platform/provider

   * Bot traffic.
   * Layer 7 DDoS.
   * Worker CPU/subrequest exhaustion.
   * Supabase/D1 query amplification.
   * R2/Supabase storage operation abuse.
   * Queue poison-message loops.
   * Webhook replay.

For each threat define:

```text
Threat
Likely Actor
Entry Points
Impact
Current Control
Missing Control
Recommended Limit
Recommended Store
Cloudflare Edge Role
App Role
Observability Signal
False Positive Risk
```

## 06_POLICY_AND_LIMIT_MATRIX.md requirements

Create the product-wide policy matrix.

Do not invent final production numbers as facts. Provide recommended starting values as hypotheses with rationale and mark them as tunable.

Include classes:

1. Public low-cost reads

   * Example: marketing pages, public static reads.
   * Prefer WAF/bot controls only unless abuse emerges.

2. Public token-gated reads

   * Share snapshots/activity/comments/decisions.
   * Key by token hash + IP/device + recipient where known.
   * Moderate limits.

3. Public token-gated writes

   * Share comments, decisions, recipient session start, unsubscribe.
   * Key by publication + recipient + IP/token.
   * Lower limits, explicit 429 and `Retry-After`.

4. Password and auth attempts

   * Key by token/email hash + IP + device + account where known.
   * Durable counter required.
   * Progressive delay and temporary lockout.
   * Turnstile after threshold.
   * No user/token enumeration.

5. Invite flows

   * Key by invite token hash + IP + user where known.
   * Durable counter required.
   * HMAC peppering required.
   * Keep same-origin checks separate from rate limits.

6. Authenticated normal writes

   * Project/create/update, estimate mutations, library CRUD.
   * Key by user + workspace + action group.
   * High enough not to block real editing.
   * UX duplicate-submit guards complement server limits.

7. Authenticated destructive writes

   * Bulk delete, role changes, publication revoke/replace, account changes.
   * Lower limits, durable audit, explicit reason.

8. Uploads and direct uploads

   * Key by user + workspace + surface + IP.
   * Include request count, active concurrency, byte quota, file count.
   * Durable or strongly coordinated admission for production.
   * In-memory only as local/backpressure fallback.

9. Exports

   * Key by user + workspace + project + estimate.
   * Limit request count and concurrent jobs.
   * Include CPU/time/row-count limits.

10. AI routes

* Key by user + workspace + feature + model/provider.
* Include daily/monthly budget, request count, token count, queue/concurrency.
* Fail closed when disabled.

11. Email

* Key by user + workspace + recipient + template.
* Limit invites/resends/digests.
* Include idempotency/deduplication.

12. Internal/webhooks

* Prefer signed verification, idempotency, replay protection, and allowlists.
* Rate limits are secondary.

For each policy include:

```text
Recommended stage
Actor key
Resource key
Window
Limit
Store
Response
UX copy
Observability
Rollback
```

## 07_ARCHITECTURE_AND_PROVIDER_DESIGN.md requirements

Design the layered architecture.

Cover:

1. Central policy registry

   * A single internal registry describing scopes, windows, key builders, response copy, observability names, and rollout mode.
   * This is a future implementation concept, not code in this task.
   * Avoid scattering magic numbers in route handlers.

2. Common key derivation

   * Use HMAC/peppered hashes for IPs, emails, tokens, user agents, recipient tokens, invite tokens, and publication tokens.
   * Never store raw IP/email/token in limiter keys.
   * Normalize header trust for Vercel and Cloudflare.
   * Define Cloudflare-first IP source order for final deployment:

     * Prefer `cf-connecting-ip` only when request is actually from Cloudflare.
     * Fall back to trusted `x-forwarded-for` / platform headers only behind trusted proxy.
     * Never trust arbitrary client-supplied headers without platform boundary.
   * Keep separate actor/resource keys so one abusive recipient does not block all project collaborators.

3. Stores and consistency

   * Current migration store: Supabase/Postgres `security_rate_limit_events`.
   * Worker Rate Limiting binding: fast approximate per-location enforcement.
   * Durable Object: strong per-key/room coordinator for exact counters, lockouts, realtime room quotas, or expensive operations.
   * D1: transactional/event counters where acceptable and tested.
   * Queue: background work admission, retries, dead-letter handling.
   * KV: config/cache only, not counters.

4. Failure modes

   * Fail closed for auth, password brute force, public write abuse, invite mutation, AI cost, and destructive actions.
   * Fail open or degrade gracefully for low-risk telemetry/event collection if limiter storage is temporarily unavailable.
   * Make each failure mode explicit.

5. Runtime implications

   * Next.js/OpenNext on Workers must prove route handlers, server actions, headers, cookies, request IP metadata, Node compatibility, `after()`, `Buffer`, `node:crypto`, ExcelJS, file upload/body handling, and env/bindings.
   * Node-runtime routes must be listed and given a migration strategy.

## 08_CLOUDFLARE_NATIVE_PLAN.md requirements

Create the Cloudflare-specific plan.

Include:

1. Edge/WAF strategy

   * Rules for broad unauthenticated abuse.
   * Rules by path group:

     * `/api/share/*`
     * `/share/*`
     * `/invite/*`
     * `/api/ai/*`
     * upload endpoints
     * export endpoint
     * auth/login endpoints
     * webhooks/internal endpoints
   * Stage modes:

     * observe/log
     * challenge/managed challenge
     * block
   * False-positive review process.
   * Rollback plan.

2. Worker Rate Limiting binding strategy

   * Candidate bindings by class:

     * public reads
     * public writes
     * auth/password attempts
     * invite flows
     * exports
     * uploads
     * AI
   * Explain where Worker binding is acceptable and where it is insufficient.
   * Do not depend on Worker binding for exact accounting, payments, permissions, or strong locks.

3. Turnstile strategy

   * Only apply after abuse thresholds or on high-risk public/auth-adjacent flows.
   * Candidate flows:

     * magic link/email login
     * public share password after failed attempts
     * invite token resolve/continue after suspicious attempts
     * contact form if present
     * AI public/demo surfaces if later exposed
   * Accessibility and recovery requirements.
   * No dark patterns.

4. Durable Objects / D1 strategy

   * Decide which security-critical counters should use Durable Objects vs D1/Postgres.
   * Possible Durable Object candidates:

     * per-publication password lockout
     * per-invite token throttle
     * per-user/workspace upload/export concurrency
     * per-realtime room rate/backpressure
   * Possible D1/Postgres candidates:

     * auditable event counters
     * long-window daily/monthly quotas
     * email/AI budget counters
   * Include proof gates.

5. Observability

   * Workers Observability and app logs.
   * 429 count by scope.
   * WAF action count by rule.
   * Turnstile pass/fail.
   * false-positive reports.
   * p95/p99 route latency under limiter.
   * storage/provider errors.

6. Cloudflare deployment implications

   * Current Vercel-specific artifacts must be replaced or mirrored.
   * `vercel.json` cron paths need Cloudflare Cron/Queues plan.
   * Vercel Analytics/Speed Insights replacement must be consistent with the Cloudflare migration plan.
   * Security headers and CSP must survive.

## 09_APP_LIMITER_IMPLEMENTATION_PLAN.md requirements

This is a future implementation plan, not implementation.

Define the target internal architecture:

1. `src/lib/rate-limits/` conceptual module

   * `policies.ts`
   * `keys.ts`
   * `adapter.ts`
   * `stores/postgres.ts`
   * `stores/cloudflare-worker-binding.ts`
   * `stores/durable-object.ts`
   * `responses.ts`
   * `observability.ts`
   * `test-helpers.ts`

2. Policy type shape

   * scope
   * actorKey
   * resourceKey
   * windows
   * limit class
   * store
   * fail mode
   * response copy
   * retry-after behavior
   * observability event
   * rollout mode

3. Adapter behavior

   * `check()` for read-before-write flows.
   * `record()` for failure-only flows.
   * `reserve()` for expensive/concurrent work.
   * `release()` for concurrency reservations.
   * `dedupe()` for idempotency/digest/email.
   * `withRateLimit()` wrapper for route handlers.
   * `requireRateLimit()` helper for server actions.

4. Migration from existing code

   * Public repository limiters become policy-backed.
   * Invite limiters become policy-backed.
   * Upload admission becomes policy-backed and durable.
   * Proposal export limiter becomes policy-backed.
   * Password lockout moves from in-memory plus DB events to one consistent durable model.
   * Comment circuit breaker becomes operations/backpressure policy, not security limiter.
   * Existing `security_rate_limit_events` either remains as transitional store or is replaced by Cloudflare-native store after proof.

5. Env/config plan

   * Dedicated HMAC peppers for rate limit keys.
   * Cloudflare binding names.
   * Feature flags:

     * observe-only
     * enforce-public-writes
     * enforce-auth
     * enforce-uploads
     * enforce-ai
     * turnstile-enabled
   * Emergency disable per scope.

6. Response contract

   * JSON shape.
   * `Retry-After`.
   * cache-control.
   * no raw provider errors.
   * user-facing copy.

## 10_ROUTE_AND_SERVER_ACTION_WORK_PACKAGES.md requirements

Break future implementation into sequenced work packages.

Suggested work packages:

P0 — Inventory and policy registry skeleton

* No behavior change.
* Create central policy definitions and test helpers.

P1 — Shared key derivation and IP trust normalization

* Replace scattered IP extraction.
* HMAC all sensitive keys.
* Add tests for Cloudflare/Vercel/local header behavior.

P2 — Public share route consolidation

* Move existing publication/shared-link limiters into central policy registry.
* Preserve status codes and response copy.
* Keep no-store headers.

P3 — Invite flow consolidation

* Preserve HMAC pepper model.
* Preserve origin guard.
* Consolidate accept/continue/resolve/resend/create limits.

P4 — Auth/login/magic-link planning

* Add safe limits without user enumeration.
* Add Turnstile threshold design.

P5 — Upload admission durability

* Replace or supplement in-memory admission with durable limiter/concurrency reservation.
* Include byte quotas and active job release.

P6 — Proposal export and heavy compute

* Add durable concurrency reservation.
* Preserve row/node/tab caps.
* Add queue option if export becomes async.

P7 — Server actions

* Add rate limiting for high-risk mutation groups.
* Avoid blocking normal spreadsheet editing.
* Consider batching/debounce rather than harsh limits for high-frequency estimate edits.

P8 — AI/cost controls

* Strict per-user/workspace/provider/token budget.
* Disabled-by-default compatibility.

P9 — Email/digest/send controls

* Idempotency, dedupe, resend throttles, bounce-aware behavior.

P10 — Webhooks/internal jobs

* Signed verification, replay protection, idempotency, queue safety.
* Rate limiting as secondary.

P11 — Cloudflare edge/WAF staging

* Observe/log first.
* Managed challenge where appropriate.
* Block only after evidence.

P12 — Cloudflare Worker/Durable/D1 proof

* Prove under OpenNext/Workers runtime before production enforcement.

For each work package include:

```text
Objective
Files likely touched later
Behavior changes
Migration dependency
Cloudflare dependency
Tests
Observability
Rollback
Acceptance criteria
Risk
```

## 11_TEST_AND_VALIDATION_STRATEGY.md requirements

Design the test plan.

Include:

1. Unit tests

   * key derivation
   * HMAC/pepper behavior
   * IP header trust
   * retry-after
   * policy registry
   * response shapes
   * fail-open/fail-closed modes
   * in-memory reset helpers where still used

2. Route handler tests

   * 429 responses.
   * `Retry-After`.
   * no-store headers.
   * no raw provider error leakage.
   * valid users not blocked at normal thresholds.
   * token/email existence not leaked.

3. Server action tests

   * mutation groups.
   * destructive operations.
   * optimistic UI compatibility.
   * expected errors.

4. Integration tests

   * Supabase/Postgres rate event store.
   * Cloudflare binding mock.
   * Durable Object/D1 proof where applicable.
   * upload concurrency.
   * export concurrency.

5. E2E tests

   * public share password, comments, decisions.
   * invite accept/continue.
   * upload flow.
   * export flow.
   * auth/login if feasible.
   * Turnstile bypass/test token handling.

6. Load/smoke tests

   * normal AEC editing burst should pass.
   * abuse bursts should be blocked.
   * 429 logs should be visible.
   * latency overhead should be measured.

7. Cloudflare-specific proof

   * local `next dev` is insufficient.
   * test on Cloudflare preview/workerd/OpenNext environment.
   * verify headers, IP metadata, bindings, cookies, route handlers, server actions, Node compatibility, and observability.

Include proposed commands but do not require them to pass in this planning-only task.

## 12_OBSERVABILITY_AND_OPERATIONS.md requirements

Define operational visibility.

Include:

* Structured log event schema:

  * `rate_limit_checked`
  * `rate_limit_allowed`
  * `rate_limit_blocked`
  * `rate_limit_store_error`
  * `turnstile_required`
  * `turnstile_passed`
  * `turnstile_failed`
  * `waf_rule_matched`
  * `limiter_rollback_enabled`
* Required dimensions:

  * scope
  * route/action
  * actor class
  * hashed actor key prefix only
  * resource class
  * store
  * window
  * limit
  * retryAfter
  * rollout mode
  * deployment provider
  * environment
* No raw PII/secrets.
* Metrics:

  * 429 rate by scope.
  * allowed/blocked ratio.
  * top blocked scopes.
  * p95/p99 latency.
  * store errors.
  * false positive reports.
  * WAF challenge/block counts.
  * Turnstile pass/fail.
  * upload/export/AI cost metrics.
* Dashboards/runbooks.
* Emergency disable procedure.
* Incident response.
* Retention policy.

## 13_ROLLOUT_ROLLBACK_AND_FALSE_POSITIVE_PLAN.md requirements

Design staged rollout.

Stages:

0. Documentation only.
1. Inventory complete.
2. Observe-only app instrumentation.
3. Shadow decisions: compute would-block but do not block.
4. Enforce low-risk public write scopes.
5. Enforce public password/invite/security-critical scopes.
6. Enforce upload/export/AI cost controls.
7. Enforce authenticated server action groups.
8. Add Cloudflare WAF challenge/block in stages.
9. Add Turnstile thresholds.
10. Cloudflare-native runtime proof and provider cutover.

For each stage include:

```text
Entry criteria
Exit criteria
Metrics
Rollback switch
False positive review
Owner approval needed?
```

Include false-positive handling:

* Support workflow.
* Temporary allowlist rules.
* How to avoid permanent bypasses.
* How to protect legitimate client proposal reviewers.
* How to avoid blocking office networks or shared IPs.

## 14_SECURITY_PRIVACY_AND_DATA_RETENTION.md requirements

Cover:

* HMAC/peppered keys.
* Separate peppers by purpose.
* No raw IP/email/token/user-agent in limiter storage.
* Minimal metadata.
* TTL and cleanup.
* GDPR/privacy-style reasoning even if not legally exhaustive.
* Token enumeration resistance.
* User enumeration resistance.
* Password brute-force lockout safety.
* Same-origin/CSRF remains separate from rate limiting.
* Service-role boundaries.
* RLS/D1 auth-equivalent implications.
* Cloudflare logs/privacy.
* Admin/operator access controls.
* Retention by limit class:

  * seconds/minutes transient counters
  * hourly/daily quotas
  * security audit events
  * abuse investigation logs

## 15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md requirements

Create decision records.

Include at least:

* D1: Cloudflare WAF is not sufficient alone.
* D2: KV is not acceptable for strong counters.
* D3: Keep Postgres `security_rate_limit_events` during migration until Cloudflare-native proof passes.
* D4: Use Durable Objects or D1/Postgres for security-critical exact counters.
* D5: Use Worker Rate Limiting binding only where per-location approximate behavior is acceptable.
* D6: Use Turnstile as adaptive friction, not always-on friction.
* D7: Central policy registry is required before expanding rate limits.
* D8: In-memory maps are backpressure/local only in production architecture.
* D9: Server actions need explicit rate limiting strategy separate from route handlers.
* D10: Internal cron/webhooks require signed verification and idempotency first.
* D11: Edge/WAF rollout must start observe-only.
* D12: Full Cloudflare cutover requires runtime proof.

For alternatives, compare:

* Postgres event table vs D1 counters.
* Durable Object per scope/key vs D1 table counters.
* Worker Rate Limiting binding vs app-level limiter.
* WAF block vs challenge vs managed challenge.
* Turnstile always-on vs adaptive.
* Synchronous limiter vs queue-backed admission.
* Strict limits vs UX debounce/idempotency.

## 16_REQUIREMENTS_TRACEABILITY_MATRIX.md requirements

Create requirements with IDs.

Example IDs:

```text
RL-FR-001 Central policy registry
RL-FR-002 Public share write limits
RL-FR-003 Public share password lockout
RL-FR-004 Invite flow limits
RL-FR-005 Auth/magic-link limits
RL-FR-006 Upload request/byte/concurrency limits
RL-FR-007 Export rate/concurrency limits
RL-FR-008 Server action mutation group limits
RL-FR-009 AI cost limits
RL-FR-010 Email/digest/resend limits
RL-FR-011 Webhook/internal replay protection
RL-FR-012 Cloudflare WAF staged rules
RL-FR-013 Worker binding candidate limits
RL-FR-014 Durable limiter for security-critical scopes
RL-FR-015 Turnstile adaptive friction
RL-NFR-001 No raw PII in limiter keys
RL-NFR-002 Retry-After on 429
RL-NFR-003 No provider error leakage
RL-NFR-004 Observability
RL-NFR-005 Rollback switches
RL-NFR-006 Cloudflare runtime proof
RL-NFR-007 False-positive process
RL-NFR-008 Performance budget
```

Trace each requirement to:

```text
Source evidence
Threat
Policy
Work package
Tests
Observability
Readiness status
```

## 17_FINAL_READINESS_REVIEW.md requirements

Create a final review with:

* Implementation readiness verdict.
* Production enforcement readiness verdict.
* Cloudflare cutover readiness verdict.
* Top blockers.
* Required proof gates.
* Risk score by surface.
* What can be done immediately.
* What must wait for Cloudflare runtime proof.
* Owner decision points.

Use direct verdicts:

```text
Planning package: PASS / NEEDS WORK
Implementation readiness: READY / CONDITIONALLY READY / NOT READY
Production enforcement readiness: READY / CONDITIONALLY READY / NOT READY
Cloudflare cutover readiness: READY / CONDITIONALLY READY / NOT READY
```

## 18_COMPLETION_AUDIT.md requirements

Audit the planning package itself.

Include:

* Files created.
* Whether every required document exists.
* Whether exact source references were used.
* Whether all known existing rate limiters were inventoried.
* Whether route handlers were inventoried.
* Whether server actions were inventoried.
* Whether Cloudflare migration concerns were addressed.
* Whether Cloudflare official docs were refreshed.
* Whether risks/assumptions/decisions are explicit.
* Whether implementation was avoided.
* Remaining gaps.

End with:

```text
Completion status: PASS / PARTIAL / FAIL
Stop condition: <clear statement>
```

## Specific codebase concerns you must address in the plan

You must explicitly address these likely issues. Verify them locally before writing final wording.

1. `src/proxy.ts` bypasses `/api`

   * Protected page proxy does not automatically protect route handlers.
   * API routes need their own auth, same-origin, token/session, and rate limit gates.

2. Rate limit code is scattered

   * Publication/shared-link logic.
   * Invite logic.
   * Upload admission.
   * Export logic.
   * Password lockout.
   * Circuit breaker.
   * Possibly tests/migrations.
   * Plan must consolidate conceptually before expanding.

3. In-memory state is not durable

   * Upload admission maps.
   * Password lockout maps.
   * Comment circuit breaker arrays/maps.
   * These may work for local/server instance backpressure but not distributed security enforcement.
   * Under Workers/serverless, isolates and restarts make them unreliable as security boundaries.

4. IP and country header handling is inconsistent

   * Some code reads `cf-connecting-ip`.
   * Some code reads `x-forwarded-for`.
   * Some code reads `x-real-ip`.
   * Some code reads Vercel country then Cloudflare country.
   * Plan must normalize trusted source strategy for Vercel transitional and Cloudflare final states.

5. Current DB-backed rate limiting has tradeoffs

   * Insert/count/delete patterns need concurrency and cost review.
   * Existing `reserve_security_rate_limit_slot` with advisory lock is stronger for specific digest-slot use.
   * Plan must decide when to keep, replace, or harden DB-backed limiters.

6. Public proposal review UX is sensitive

   * External clients may open, comment, decide, or unlock from shared networks.
   * Avoid overblocking legitimate proposal reviewers.
   * Use recipient/session/resource-aware keys, not IP-only keys.

7. Estimate editing is high-frequency

   * Do not apply harsh per-click write limits to normal estimating work.
   * Prefer idempotency, batching, debounce, mutation grouping, and workspace/user/action-group limits.

8. Uploads and exports are expensive

   * They need rate limits plus concurrency controls, byte/item limits, audit logs, and cleanup on failure.
   * Current upload admission and export limits should be treated as important starting points.

9. AI is deferred but must be planned

   * If AI routes are disabled by flags, still include future cost controls.
   * AI requires request, token, provider-cost, workspace/user, and monthly quota limits.

10. Webhooks and internal jobs are not protected by rate limits alone

* They need signatures, replay protection, idempotency, and queue safety.
* Rate limiting is secondary.

## Suggested final recommendation

The plan should likely recommend:

* Build a central policy registry first.
* Keep existing Postgres-backed limiters during migration.
* Normalize key derivation and IP trust before adding more enforcement.
* Convert in-memory security limiters to durable limiters before full Cloudflare deployment.
* Use Cloudflare WAF/rate limiting for coarse public traffic protection.
* Use Worker Rate Limiting bindings for cheap approximate limits.
* Use Durable Objects/D1/Postgres for security-critical exact counters and concurrency reservations.
* Use Turnstile adaptively, after suspicious thresholds.
* Roll out observe-only before enforcement.
* Require Cloudflare runtime proof before full deployment.

## Validation for this planning-only task

After creating the docs, run:

```bash
find .ai/03_plans/2026-06-29-Rate-Limiting -maxdepth 1 -type f | sort
git status --short
git diff --stat
```

The only changed files should be under:

```text
.ai/03_plans/2026-06-29-Rate-Limiting/
```

Do not run destructive commands. Do not run migrations. Do not change production code.

Now create the planning package.

```

Use this prompt as-is. It forces the codebase AI to produce a serious planning package instead of sprinkling `429` checks across random routes.
```

[1]: https://developers.cloudflare.com/waf/rate-limiting-rules/index.md "Rate limiting rules · Cloudflare Web Application Firewall (WAF) docs"
[2]: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ "Rate Limiting · Cloudflare Workers docs"
[3]: https://developers.cloudflare.com/turnstile/ "Overview · Cloudflare Turnstile docs"
