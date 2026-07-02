---
title: Better Auth Coordination And Fourth-Pass Drift Closure
plan_id: 2026-06-29-rate-limiting
created: 2026-07-01
profile: exhaustive
owner: Archestimator
---

# Better Auth Coordination And Fourth-Pass Drift Closure

This addendum closes the 2026-07-01 audit gaps that survived skeptical re-check. It is planning-only. It does not authorize app source edits, tests, migrations, provider configuration, package changes, deployment, WAF changes, DNS changes, or production enforcement.

Readiness impact: the package remains **CONDITIONALLY READY for scoped P0 implementation planning** and **NOT READY for production enforcement or Cloudflare cutover**. The new rows below are required because the local checkout has moved to a Cloudflare-aware Better Auth/D1 runtime path, while parts of the plan still described older Supabase/Vercel/Resend-era inventory.

## Source Grounding

| Source ID | Evidence | Planning implication |
| --- | --- | --- |
| SRC-FOURTH-PASS-AUDIT | User-provided 2026-07-01 audit and corrected skeptical re-check in this thread. | Close the surviving Tier-A gaps: Better Auth limiter coordination, WAF/Server Action hosted proof, stale inventory, and CollaborationRoom DO readiness split. |
| SRC-BETTER-AUTH-RATE-LIMIT | Better Auth v1.6 rate-limit docs, refreshed 2026-07-01: `https://better-auth.com/docs/concepts/rate-limit`. | Better Auth has production defaults, per-path rules, IP/header configuration, IPv6 `/64` default, database/secondary/custom storage options, and `X-Retry-After` behavior that must be coordinated with app limiters. |
| SRC-BETTER-AUTH-2FA | Better Auth 2FA docs, refreshed 2026-07-01: `https://better-auth.com/docs/plugins/2fa`. | 2FA verification and account lockout behavior must be treated as provider-coordinated auth recovery, not as an independent app limiter. |
| SRC-LOCAL-CODE-2026-07-01 | Local static inspection on 2026-07-01: `package.json`, `wrangler.jsonc`, `src/lib/auth/*`, `src/lib/email/*`, `src/lib/cloudflare/*`, `src/lib/supabase/*`, `vercel.json`, and `git log`. | Better Auth 1.6.22, Cloudflare D1, Cloudflare Email, R2, DO, Queues, Cron, Images, and sampled Workers observability are current planning facts. Resend-specific file refs are stale for current runtime planning. |
| SRC-OPENNEXT-WAF-1224 | OpenNext issue #1224 and public issue evidence refreshed 2026-07-01: `https://github.com/opennextjs/opennextjs-cloudflare/issues/1224`. | The issue body supports a hosted Server Action multipart failure risk that local dev can miss. This plan does not treat managed-rule 403 causality as proven by public issue evidence alone; hosted reproduction plus Cloudflare Security Events/Ray-ID readback is required before WAF skip, disable, or false-positive claims. |
| SRC-CF-LOGS-2026-07-01 | Cloudflare Workers Logs docs, refreshed 2026-07-01: `https://developers.cloudflare.com/workers/observability/logs/workers-logs/`. | Head-based sampling means Workers Logs cannot be the primary denial ledger when `wrangler.jsonc` samples at `0.1`; app-side structured denial events are mandatory for completeness claims. |
| SRC-CF-QUEUES-2026-07-01 | Cloudflare Queues batching/retry/DLQ/limits docs, refreshed 2026-07-01. | Queue producers and consumers need backpressure, batch ack/retry semantics, DLQ alerting, consumer CPU/wall-time budgets, and downstream-provider throttling contracts. |
| SRC-CF-CRON-2026-07-01 | Cloudflare Cron Triggers docs, refreshed 2026-07-01. | Cron triggers execute scheduled Worker handlers, can take time to propagate, and expose event history; plan rows must define overlap, max runtime, and downstream budgets for the two configured schedules. |
| SRC-CF-CACHE-2026-07-01 | Cloudflare Cache Reserve/Tiered Cache docs, refreshed 2026-07-01. | Cache hits can shield origin, so origin-side rate limits see misses rather than all viewer requests; cacheable paths need edge policy and cache-key controls. |
| SRC-CF-IMAGES-2026-07-01 | Cloudflare Images Transformations docs, refreshed 2026-07-01. | Transformed image variants are cached and billed by unique source/parameter combinations, so parameter cardinality and edge/origin validation are rate-limit dimensions. |
| SRC-OWASP-API4-2026-07-01 | OWASP API4:2023 docs, refreshed 2026-07-01. | P0 must include memory, file/process analogues, operation count per request, records per page, and third-party spend limits in resource-budget rows. |

## Current Checkout Refresh

| Area | Current planning fact | Required plan correction |
| --- | --- | --- |
| Auth runtime | `better-auth` is `1.6.22`; Cloudflare Better Auth runtime files exist; the request proxy calls `isCloudflareBetterAuthProviderEnabled()` and bypasses `/api` at `src/lib/auth/request-proxy.ts:85-92`. | Auth throttling must coordinate Better Auth's built-in limiter with app policy before any auth enforcement work starts. |
| Better Auth storage | `src/lib/auth/better-auth-cloudflare.ts` wires Better Auth through D1 runtime config, but this static plan did not verify explicit `rateLimit.storage` or custom rules in source. | P0 must decide whether Better Auth limiter storage is in-memory, database/D1, secondary storage, or custom storage during the hybrid period. |
| Email provider | Current email paths are `src/lib/email/cloudflare-email-client.ts` and `src/lib/email/transactional-email-client.ts`; Resend client/webhook rows are stale for current runtime planning. | Replace Resend-specific implementation references with Cloudflare Email/provider-neutral delivery idempotency rows. |
| Scheduling | `vercel.json` still lists the two legacy internal cron paths with deployment disabled, while `wrangler.jsonc` also declares Cloudflare cron triggers `0 3 * * *` and `15 3 * * *`. | Inventory must distinguish legacy Vercel cron metadata from active Cloudflare scheduled Worker planning and define overlap/duplication policy. |
| Cloudflare bindings | `wrangler.jsonc` declares D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Images `IMAGES`, Email `EMAIL`, Cron, and sampled observability. | Provider plan must include queue, cron, images, D1, DO, and sampled-log consequences before P0 source edits. |
| Supabase source tree | `src/lib/supabase` currently contains `types.ts` only; historical Supabase/Postgres migrations still exist under `supabase/migrations/*`. | Plan references to Supabase runtime helpers must be treated as historical/migration archaeology unless re-verified in the current checkout. |

## Better Auth Coordination Contract

Better Auth's limiter is now a current runtime dependency, not a future provider footnote. P0 must decide the authoritative limiter per auth surface before adding app auth throttles.

| Surface | Better Auth default/fact to coordinate | Required P0 authority decision |
| --- | --- | --- |
| Global `/api/auth/*` traffic | Production default is 100 requests per 60 seconds for client-initiated requests. Server-side `auth.api` calls are not affected. | Decide whether Better Auth global limiter is authoritative, disabled for specific paths, or shadowed by app policy. Do not stack an app global limiter that double-penalizes the same client. |
| `/sign-in/email` and magic-link send | Better Auth documents a stricter custom rule of 3 requests within 10 seconds for `/sign-in/email`. | Decide whether this rule is sufficient for burst control, and add app policy only for Archestimator-specific email/provider reputation dimensions such as user/email hash, beta support, and aggregate low-and-slow pressure. |
| `/two-factor/*` and verify flows | Better Auth plugin examples include stricter 3-in-10-second verification rules; 2FA lockout behavior can return provider-native 429/account-lock responses. | Keep provider verification lockout and app recovery semantics coordinated. App policy must not create a second lockout that masks support recovery. |
| Session/get-session paths | Better Auth allows disabling path-specific rate limits through custom rules. | Decide whether session reads should be exempt, soft-limited, or app-observed, with no accidental denial of normal page/session refresh. |
| OAuth callback and state handling | Routing can change during Supabase-to-Better-Auth migration. | Bind OAuth state to issuing provider and reject cross-provider state replay; document whether callback pressure is provider-only or app-observed. |
| Server-side `auth.api` usage | Better Auth docs state server-side API calls bypass rate limiting. | Any server-initiated send, verify, migration, or account action still needs app/provider-budget controls if it can trigger email, storage, D1, or external work. |
| Client IP identity | Better Auth defaults to `x-forwarded-for`, supports `cf-connecting-ip`, trusted proxy walking, IPv6 normalization, IPv4-mapped normalization, and IPv6 `/64` default. | Align Better Auth `advanced.ipAddress` settings with the app limiter canonicalizer: `cf-connecting-ip` under Cloudflare, explicit trusted proxy policy, IPv6 `/64` default unless documented otherwise, and no raw IP persistence. |
| Rate-limit response | Better Auth returns `X-Retry-After`, not the standard `Retry-After`, for built-in limiter errors. | UI/client/auth wrappers must normalize `X-Retry-After` into user-facing cooldown behavior without exposing account existence or conflicting with standard route `Retry-After`. |

## Fourth-Pass Contract IDs

| ID | Contract | Mandatory implementation-plan answer |
| --- | --- | --- |
| SCE-018 | Better Auth limiter authority and storage | For each auth path, choose Better Auth limiter, app limiter, or explicit no-policy; define Better Auth `rateLimit` customRules/disable rules, storage backend, D1/Postgres/custom-storage implications, `advanced.ipAddress` header/trusted-proxy/IPv6 config, `X-Retry-After` handling, and server-side `auth.api` bypass controls. |
| SCE-019 | WAF and OpenNext Server Action hosted proof | Inventory active Cloudflare WAF/managed/security rules before edge rollout; run hosted Worker Server Action sweeps for major mutation shapes; correlate any hang, HTML/403, or upstream block with Security Events/Ray IDs; document allow/skip strategy and CVE-regression risk before any skip or disable action. |
| SCE-020 | Migration-period identity unification | Decide how Supabase user IDs, Better Auth user IDs, email hashes, OAuth states, and account migration mappings affect limiter keys; either unify identities, explicitly accept temporary double quota with compensating controls, or use one-shot per-user cutover. |
| CP-009 | CollaborationRoom realtime quota readiness split | Treat existing `COLLAB_ROOMS` as available only for realtime room transport/fanout quota proof after hosted validation; keep generic exact rate-limit counters as a separate future `RateLimitCounter` DO or Postgres/D1-backed design. |

## Fourth-Pass Requirement Rows

| Source ID | Requirement ID | Requirement | Affected routes/actions | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SRC-BETTER-AUTH-RATE-LIMIT, SRC-LOCAL-CODE-2026-07-01 | RL-FR-037 | Better Auth built-in limiter and app auth limiter must have one authoritative source per auth surface. | `/api/auth/[...all]`, magic-link/sign-in, OAuth callback, 2FA/future MFA, account actions. | 04, 06, 10/P8, 11, 12, 13, 14, 16, 19 SCE-018, 23 | P0/P8 | Better Auth customRules/storage/IP headers are documented; app policy avoids duplicate lockout; support recovery and generic responses are preserved. | PROOF-RL-028 | Beta-user lockout, enumeration, support burden | P0 REQUIRED | Current plan did not mention Better Auth built-in limiter. |
| SRC-OPENNEXT-WAF-1224, SRC-CF-OPS-DOCS-2026-07-01 | RL-FR-038 | Hosted Server Action edge/runtime behavior must be proven before WAF observe, skip, or disable decisions are trusted. | Server Actions for estimates, invites, share decisions/comments, uploads, AI/apply, export/publication/email actions. | 08, 10/P10/P15, 11, 13, 16, 19 SCE-019, 23 | P10/P15 | Hosted action POST sweep completes or fails with a classified app/runtime/edge/unknown cause; any Cloudflare HTML/403/hang/Ray-ID event has Security Events readback before WAF causality or skip strategy is claimed. | PROOF-RL-029 | False baseline, silent mutation outage, CVE regression if skipped blindly | P0/P10 REQUIRED | Local `wrangler dev` is not enough for this proof. |
| SRC-LOCAL-CODE-2026-07-01, SRC-BETTER-AUTH-RATE-LIMIT | RL-FR-039 | Migration-period auth identity fragmentation must be addressed before user-keyed quotas enforce. | Auth, invite, publication/email, AI/export/upload/account actions keyed by user. | 06, 07, 10/P8, 14, 15, 16, 19 SCE-020, 23 | P0/P8 | Same human cannot unintentionally double effective quota across Supabase and Better Auth unless the plan explicitly accepts that temporary risk and tightens other dimensions. | PROOF-RL-028 plus migration mapping review | Abuse bypass and support confusion | P0 REQUIRED | Current plan only covers provider coordination in broad terms. |
| SRC-CF-LOGS-2026-07-01, SRC-LOCAL-CODE-2026-07-01 | RL-NFR-018 | App-side structured denial events are the primary enforcement/shadow ledger when Workers Logs are sampled. | All shadow/enforce limiters, WAF/Worker comparisons, queues/cron/image/DO denials. | 08, 11, 12, 16, 19 CP-007, 23 | P12 | Denied security/cost events are not sampled below incident-review needs; Workers Logs are cross-reference evidence only at `head_sampling_rate: 0.1`. | PROOF-RL-030 | Missing denials, bad thresholds, support blind spots | P0/P12 REQUIRED | Existing docs treated app events as supplemental to Worker logs. |

## Fourth-Pass Proof IDs

| Proof ID | Covers | Evidence class |
| --- | --- | --- |
| PROOF-RL-028 | Better Auth plus app limiter coordination across dual-provider migration: `/sign-in/email`, session/get-session, OAuth callback, fake/real account, shared NAT, same email hash across Supabase and Better Auth IDs, and 2FA/future MFA send/verify. | Official docs, provider/account readback, local auth route/action tests, and migration mapping review. |
| PROOF-RL-029 | Hosted Worker Server Action POST sweep under current Cloudflare edge/runtime/security posture for estimate save, invite accept/create/resend, share comment/decision, upload/source/init, AI ask/apply, export/publication/email, and representative multipart bodies. | Hosted runtime classification plus provider Security Events/Ray-ID readback when an edge/WAF cause is suspected; local dev is insufficient. |
| PROOF-RL-030 | App-side structured denial event completeness during shadow mode, with denied security/cost events persisted or delivered at at least 99% completeness for scoped test traffic despite Workers Logs sampling. | Local automated event tests, operations harness, and hosted/provider cross-check when available. |

## Tier-B And Tier-C Planning Refinements

| Audit gap | Planning contract to carry forward |
| --- | --- |
| Queue consumer cascade | `UPLOAD_JOBS_QUEUE` must define producer backpressure, max enqueued messages per actor/workspace/resource, consumer batch ack/retry policy, delayed retry on downstream 429, DLQ alert thresholds, max consumer concurrency, and downstream provider-budget controls before queue-backed enforcement. |
| Cron overlap | Both legacy Vercel cron metadata and Cloudflare cron triggers must declare max runtime, skip-if-running/queue-if-running policy, idempotency key, shared-lock or DO/D1 coordination, downstream spend limits, and duplicate-trigger behavior. |
| D1 limiter-store sunset | Before Postgres is sunset, decide whether app limiter storage remains in Postgres, moves to D1 with sharding/low-churn constraints, uses a DO exact counter for hot keys, or delegates only specific auth paths to Better Auth/D1 storage. |
| Cache/CDN interaction | Cacheable routes must list cache key, `Vary`, query-parameter normalization, cache-busting controls, origin-miss limiter behavior, and WAF/edge protection for viewer request floods that never reach origin. |
| Cloudflare Images | Image transform paths must bound dimensions, parameter cardinality, source origin, unique transformation spend, cache-busting params, and origin validation before relying on origin-only upload/image limits. |
| OWASP operation budgets | P0 must explicitly include memory, Postgres/D1/connection-pool or binding-operation slots, per-request operation count, records per page, and third-party/provider spend ceilings in `SCE-004` rows. |
| Workers bundle size refresh | Treat Worker size limits as implementation-time docs refresh, not a rate-limiting blocker. Do not spend planning time tuning bundle size unless deployment evidence shows it blocks rate-limit proof. |

## Stop Condition Addendum

Do not start P0 enforcement work from this package until all of the following are true:

- Docs `03` and `04` are treated as refreshed by the 2026-07-01 current-checkout overlay in this addendum and by any direct edits to those docs.
- `SCE-018`, `SCE-019`, `SCE-020`, and `CP-009` are expanded into concrete route/action/provider rows in `19_IMPLEMENTATION_CONTRACT_WORKSHEET.md`.
- `RL-FR-037` through `RL-FR-039`, `RL-NFR-018`, and `PROOF-RL-028` through `PROOF-RL-030` are present in the traceability and proof matrices.
- Better Auth limiter configuration, storage, client identity, and `X-Retry-After` handling are aligned with app policy before auth throttles enforce.
- Hosted Server Action posture is proven on Worker traffic and any suspected edge/WAF event is correlated with Cloudflare Security Events or an explicit "no matching event" provider readback.
- CollaborationRoom DO is classified as realtime transport/fanout quota infrastructure only; generic exact limiter counters remain separately designed and proof-gated.
- No production provider enforcement, WAF skip/disable, DNS/cutover, source edit, migration, or package change is claimed from this planning-only addendum.
