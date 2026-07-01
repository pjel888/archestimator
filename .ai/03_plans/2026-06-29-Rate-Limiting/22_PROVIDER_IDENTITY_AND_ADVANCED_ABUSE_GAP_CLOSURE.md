---
title: Provider Identity And Advanced Abuse Gap Closure
plan_id: 2026-06-29-rate-limiting
created: 2026-06-30
profile: exhaustive
owner: Archestimator
---

# Provider Identity And Advanced Abuse Gap Closure

This document is the third-pass gap-closure addendum for the pasted review at `/Users/philiplewis/.codex/attachments/54e7ab2a-9157-4882-871a-8d4445ed2a4f/pasted-text-1.txt`. It keeps the package planning-only and preserves the existing app-layer-first direction.

Readiness impact: the package is **CONDITIONALLY READY for a scoped P0/P14 implementation plan** only after the rows below are expanded into route/action/client/provider contracts. It remains **NOT READY for direct enforcement or provider cutover**. Fourth-pass runtime drift and Better Auth/WAF/CollaborationRoom gaps are carried forward by `23_BETTER_AUTH_COORDINATION.md`; this third-pass addendum is not the final readiness boundary by itself.

## Source Grounding

| Source ID | Evidence | Planning implication |
| --- | --- | --- |
| SRC-GAP-ANALYSIS | Pasted third-pass review, accessed from the attachment path above. | Adds explicit IPv6, Supabase Auth, cache stampede, full-jitter, MFA/OTP, deep pagination, CORS `OPTIONS`, realtime message-rate, PWA replay, chunked/multipart, and bot-escalation gates. |
| SRC-SUPABASE-AUTH-DOCS | Supabase Auth rate-limit docs, refreshed 2026-06-30: `https://supabase.com/docs/guides/auth/rate-limits`. | P0 must enumerate built-in provider limits, configurable vs fixed limits, custom SMTP implications, and the `Sb-Forwarded-For`/`sb_secret_*` server-client forwarding requirements before app auth throttles enforce. |
| SRC-CF-RL-DOCS | Cloudflare WAF rate-limiting parameters, refreshed 2026-06-30: `https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/`. | Cloudflare rate limiting characteristics, counting expressions, IP/NAT support, header characteristics, plan availability, and action behavior need provider readback; edge rules remain coarse and proof-gated. |
| SRC-CF-BOT-DOCS | Cloudflare bot docs, refreshed 2026-06-30: `https://developers.cloudflare.com/bots/`. | Bot Management is an escalation path with plan/entitlement and false-positive constraints, not a P0 assumption or replacement for app policy. |
| SRC-AWS-JITTER | AWS Architecture Blog on exponential backoff and jitter, refreshed 2026-06-30: `https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/`. | Client and worker retries should use capped exponential backoff with full jitter when server `Retry-After` is absent; `Retry-After` still takes precedence. |
| SRC-NODE-CRYPTO | Node.js `crypto.timingSafeEqual` docs, refreshed 2026-06-30: `https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b`. | Secret/token comparisons need length-normalized, timing-safe handling and equalized response envelopes where security relies on comparison secrecy. |
| SRC-NEXT-LOCAL-16 | Installed Next.js 16 docs in `node_modules/next/dist/docs/`. | Route Handlers can implement `OPTIONS`, Server Functions can be invoked from client code, and Proxy is not a full authorization/session solution; route/action gates remain mandatory. |
| SRC-LOCAL-GAP-SCAN | Local `rg` scan on 2026-06-30 over `src supabase scripts tests`. | `Sb-Forwarded-For` is absent from app source; IPv6 is not part of limiter identity helpers; timing-safe equality is partial; multipart/upload support exists; realtime/pagination/service-worker/bot controls are not globally enforced. |
| SRC-FOURTH-PASS-AUDIT | 2026-07-01 corrected independent audit and `23_BETTER_AUTH_COORDINATION.md`. | Adds Better Auth limiter coordination, WAF/Server Action hosted proof, current-checkout inventory drift, and CollaborationRoom DO scoping as successor gates beyond the third-pass rows here. |

## Gap Closure Matrix

| Gap | Status after this addendum | Required P0 answer before source edits |
| --- | --- | --- |
| H1 IPv6 and client identity canonicalization | CLOSED AS A PLANNING GAP by `RL-FR-026`, `SCE-010`, and `PROOF-RL-016`. | Define trusted header order, IPv4-mapped handling, IPv6 parse/canonicalize/mask before HMAC, prefix default `/64` with explicit `/56` or `/48` exception path, key separators, versioning, and migration/rollback behavior. |
| H2 Supabase Auth built-in limits and forwarding | CLOSED AS A PLANNING GAP by `RL-FR-027`, `SCE-011`, and `PROOF-RL-017`. | Enumerate Supabase Auth endpoint limits from current docs/account config, decide whether `Sb-Forwarded-For` is enabled using a server client with an `sb_secret_*` key, and prove app limits do not double-lock beta users. |
| M1 Cache stampede | CLOSED AS A PLANNING GAP by `RL-FR-029`, `SCE-012`, and `PROOF-RL-019`. | For cacheable expensive reads and provider fetches, define single-flight/coalescing, stale-while-revalidate, max waiters, timeout, shed behavior, and store outage behavior. |
| M2 Timing-safe equality | CLOSED AS A PLANNING GAP by `RL-FR-028`, `RL-NFR-016`, `SCE-013`, and `PROOF-RL-018`. | Define where timing-safe comparison is mandatory, how length mismatch is handled, and which response-time parity tests protect fake/real token/account paths. |
| M3 Retry full jitter | CLOSED AS A PLANNING GAP by `RL-NFR-017`, `FCE-008`, and `PROOF-RL-020`. | Server `Retry-After` wins; otherwise clients/workers use capped exponential full jitter with max attempts, aborts, idempotency gating for unsafe mutations, and telemetry for exhaustion. |
| M4 MFA/OTP bombing | CLOSED AS A PLANNING GAP by `RL-FR-030`, `SCE-011`, and `PROOF-RL-021`. | Map current OTP/magic-link flows and future MFA send/verify flows to provider limits, per-identity/client app gates, generic responses, and support recovery. |
| M5 Deep pagination and `COUNT(*)` abuse | CLOSED AS A PLANNING GAP by `RL-FR-031`, `SCE-014`, and `PROOF-RL-022`. | Each list/search/export path defines max page size, max offset/depth, cursor preference, count budget, index proof, query timeout, and large-result response profile. |
| L1 CORS `OPTIONS` abuse | CLOSED AS A PLANNING GAP by `RL-FR-032`, `SCE-015`, and `PROOF-RL-023`. | Define which routes implement `OPTIONS`, which remain same-origin only, how preflight is cached, and whether preflight is fail-soft, fail-closed, or edge-observed under flood. |
| L2 WebSocket/SSE message rates | CLOSED AS A PLANNING GAP by `RL-FR-033`, `SCE-016`, and `PROOF-RL-024`. | Distinguish connect/issue-token quotas from per-message, presence, cursor, broadcast, and fanout quotas; include disconnect cleanup and room-level budgets. |
| L3 Service Worker/PWA replay | CLOSED AS A PLANNING GAP by `RL-FR-034`, `FCE-009`, and `PROOF-RL-025`. | If offline/background sync exists or is introduced, define queue caps, sign-out/workspace purge, replay idempotency, stale auth handling, and server denial halt behavior. |
| L4 Chunked/multipart abuse | CLOSED AS A PLANNING GAP by `RL-FR-035`, `SCE-017`, and `PROOF-RL-026`. | Upload/body routes define missing `Content-Length`, chunked transfer, multipart/resumable state, raw/decompressed/transformed bytes, part count, active slots, and abort cleanup. |
| L5 Bot Management escalation | CLOSED AS A PLANNING GAP by `RL-FR-036`, `CP-008`, and `PROOF-RL-027`. | Bot products are escalation-only and entitlement-gated; define observe-first rules, bot-score or bot-signal use, false-positive review, and support/rollback before challenge/block. |

## Third-Pass Contract IDs

| ID | Contract | Mandatory implementation-plan answer |
| --- | --- | --- |
| SCE-010 | Trusted client identity and IPv6 aggregation | Header source order, trusted proxy boundary, IPv6 parser, prefix mask, IPv4-mapped normalization, raw-value suppression, HMAC input version, `|` separator use, and rollback/migration plan. |
| SCE-011 | Supabase/Auth provider limit coordination | Current provider endpoint limit table, configurable/fixed distinction, `Sb-Forwarded-For` decision, `sb_secret_*` server-client constraint, OTP/MFA send and verify gates, and duplicate-lockout avoidance. |
| SCE-012 | Cache-fill and stampede control | Single-flight/coalescing target, max waiters, max fill time, stale serve policy, negative-cache policy, shed response, and store/provider outage behavior. |
| SCE-013 | Secret comparison and timing parity | Timing-safe comparison boundary, length mismatch handling, fake/real identity response envelope, response-time target, and test fixture. |
| SCE-014 | Pagination and count budgets | Page-size/depth limits, cursor vs offset decision, count policy, query/index proof, timeout, and large-result body/profile. |
| SCE-015 | `OPTIONS` and CORS posture | Same-origin default, allowed CORS routes, preflight response headers, max-age, body-free behavior, edge/app counting choice, and flood telemetry. |
| SCE-016 | Realtime connection and message quotas | Token issue, connect, message, presence/cursor, broadcast, room fanout, disconnect cleanup, and per-room/user/client budgets. |
| SCE-017 | Streaming, chunked, and multipart resource budgets | Missing `Content-Length`, chunked transfer, multipart part count/size, resumable session TTL, transformed bytes, active slots, timeout, abort, cleanup, and storage-provider rollback. |
| FCE-008 | Full-jitter retry and `Retry-After` precedence | Unsafe mutation retry gate, idempotency requirement, capped full-jitter formula, max attempts, max elapsed time, abort, server hint precedence, and user-visible exhaustion path. |
| FCE-009 | Service-worker/background replay governance | Whether a service worker or offline queue exists, which mutations can persist, queue cap/age/bytes, auth/workspace purge, idempotency keys, stale secret handling, and server rejection halt behavior. |
| CP-008 | Bot-management escalation governance | Product/plan availability, bot-score/signal source, rule expressions, observe-only proof, false-positive analysis, challenge/block threshold, support path, and rollback by rule ID/feature flag. |

## Proof IDs Added

| Proof ID | Covers | Evidence class |
| --- | --- | --- |
| PROOF-RL-016 | IPv6/client identity canonicalization and trusted header source order. | Unit/static now; route tests in P0. |
| PROOF-RL-017 | Supabase Auth built-in limits, `Sb-Forwarded-For`, `sb_secret_*`, and duplicate-lockout behavior. | Official docs/account readback plus auth route/action tests. |
| PROOF-RL-018 | Timing-safe comparison and fake/real response parity. | Unit and route/action timing envelope tests. |
| PROOF-RL-019 | Cache-fill coalescing, max waiters, shed behavior, and outage fallback. | Unit/concurrency/distributed simulation. |
| PROOF-RL-020 | Full-jitter retry, max attempts, abort, and `Retry-After` precedence. | Client/worker unit tests plus DOM proof where browser-only. |
| PROOF-RL-021 | OTP/MFA bombing send/verify gates and support recovery. | Provider-doc/account readback plus auth tests. |
| PROOF-RL-022 | Deep pagination, count budget, and query timeout controls. | Repository tests/static query review. |
| PROOF-RL-023 | `OPTIONS`/CORS posture and preflight flood behavior. | Route tests/static headers review. |
| PROOF-RL-024 | Realtime connection and per-message/presence quotas. | Realtime harness/provider proof. |
| PROOF-RL-025 | Service-worker/offline replay and purge rules. | Client DOM/browser proof only if SW/offline queue exists; otherwise static no-SW proof. |
| PROOF-RL-026 | Chunked/multipart/resumable body budgets and cleanup. | Upload route tests/provider stub/distributed simulation. |
| PROOF-RL-027 | Bot-management escalation, observe-only provider readback, false-positive review, and rollback. | Provider readback/hosted proof only. |

## Rejected Shortcuts

| Shortcut | Rejected because |
| --- | --- |
| Exact IP-only keys for all unauthenticated flows | IPv6 privacy addresses and shared IPv4/NAT can fragment or over-block; identity keys need resource and actor dimensions plus prefix-aware normalization. |
| Trusting all forwarded headers | Header trust depends on deployment path; only headers set by trusted proxy/provider boundaries can feed security keys. |
| Treating Supabase Auth limits as sufficient app auth protection | Provider limits protect provider endpoints but do not encode Archestimator-specific beta UX, recovery, or business-flow abuse. |
| Enabling `Sb-Forwarded-For` without proof | Supabase docs require server-side forwarding with an `sb_secret_*` key path; misconfiguration can leak or misattribute client identity. |
| Global exemption for `OPTIONS` | Preflight is usually low-cost, but public API preflights can still consume edge/origin capacity and reveal CORS posture. |
| Automatic retry for unsafe mutations | Without idempotency, retries can duplicate provider spend, writes, emails, uploads, or proposal decisions. |
| Bot challenge/block as a first response | Bot products have plan/entitlement and false-positive constraints; app policy and observe-mode evidence come first. |

## P0 Stop Condition

The future P0 implementation plan may proceed only after:

- `19_IMPLEMENTATION_CONTRACT_WORKSHEET.md` expands `SCE-010` through `SCE-017`, `FCE-008`, `FCE-009`, and `CP-008` to concrete route/action/client/provider rows.
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` maps `RL-FR-026` through `RL-FR-036` and `RL-NFR-016` through `RL-NFR-017` to work items and proof IDs.
- `11_TEST_AND_VALIDATION_STRATEGY.md` includes `PROOF-RL-016` through `PROOF-RL-027` and adversarial scenarios for every gap above.
- `23_BETTER_AUTH_COORDINATION.md` successor gates are also expanded where applicable: `SCE-018` through `SCE-020`, `CP-009`, `RL-FR-037` through `RL-FR-039`, `RL-NFR-018`, and `PROOF-RL-028` through `PROOF-RL-030`.
- Supabase Auth and Cloudflare Bot/WAF values are refreshed from current official docs and, where account-specific, provider readback.
- The source checkout is re-scanned for route/action, header, upload, pagination, realtime, and service-worker reality before code edits.
