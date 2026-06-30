---
title: Test And Validation Strategy
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Test And Validation Strategy

## Test Principle

Lock current behavior before changing implementation. Then prove each new limiter with the smallest test that demonstrates allow, near-limit, deny, retry, failure, and rollback behavior.

## Required Test Layers

| Layer | Purpose | Example checks |
| --- | --- | --- |
| Unit | Policy registry, identity extraction, hashing, window math. | Header precedence, HMAC stability, `Retry-After`, window expiry. |
| Route/action | Current public and authenticated behavior. | Share password/session/comment/decision, invite accept, AI ask, export, upload init. |
| Store | Durable Postgres/RPC behavior. | insert/count, cleanup, advisory-lock reservation, failure handling. |
| Distributed simulation | Catch process-local bugs. | Two evaluator instances, concurrent upload/estimate mutation, race/overshoot. |
| Cloudflare proof | Edge/provider-specific claims. | WAF log-only hit, Turnstile siteverify, Workers RL overshoot, DO exact counter. |
| Operations | Dashboards, alerts, rollback. | Denial event emitted, kill switch works, false-positive runbook exercised. |

## Current Behavior Regression Targets

| Surface | Required assertions |
| --- | --- |
| Shared-link password | durable pre-check denies after threshold, failure records delay, success clears durable failures, local lockout behavior is understood. |
| Shared-link comment/decision | recipient/publication keying, write/read windows, no raw token logs. |
| Invite resolve/accept/continue/create/resend | token/HMAC IP keying, action result shape, no enumeration. |
| AI ask | 10/min and 60/hour windows, 503 on quota store unavailable, 429 body on deny. |
| Proposal XLSX export | 429 with `Retry-After` before workbook generation. |
| Upload admission | actor/workspace active caps, release idempotency, request window retry. |
| Estimate actions | burst windows preserve normal editing and deny runaway loops. |
| Client error intake | same-origin/fetch metadata, body size, rate-limited drop. |

## Proof Contract Rows

| Proof ID | Requirement IDs | Target | Layer | Fixture/input | Assertion | Evidence command/class |
| --- | --- | --- | --- | --- | --- | --- |
| PROOF-RL-001 | RL-FR-001, RL-NFR-002 | Policy registry and response helper | Unit | Fixed windows, test clock, route/action response profiles | Same current thresholds and `Retry-After` math, no raw identifiers. | Targeted unit test, local automated. |
| PROOF-RL-002 | RL-FR-002, RL-FR-003 | Share root/session/password/comment/decision/unsubscribe | Route/store | Valid token, invalid token, repeated attempts, reviewer session | Current 429/Retry-After/no-store behavior preserved; no token existence leak. | Targeted route/store tests, local automated. |
| PROOF-RL-003 | RL-FR-004 | Invite create/resend/resolve/continue/accept/sign-out | Route/action | Valid/invalid token, same-origin failure, repeated accept/resend | Existing durable limits preserved; sign-out has explicit no-policy or limiter rationale. | Targeted route/action tests, local automated. |
| PROOF-RL-004 | RL-FR-006, RL-FR-007 | Upload and XLSX export | Route/store/distributed | Concurrent uploads, crash-before-release, repeated workbook export | Durable/session capacity and 429 occur before expensive provider/workbook work. | Local automated plus distributed simulation. |
| PROOF-RL-005 | RL-FR-008 | Server action groups | Action | Function-level inventory from 27 action files | Each action has no-policy, mutation, expensive read, email/provider, storage, or public-token classification. | Static inventory plus targeted action tests. |
| PROOF-RL-006 | RL-FR-009 | AI ask/package-builder | Route/provider | Ask loop, package-builder draft/refine/feedback/apply, provider unavailable | Cost quotas deny before spend; feedback/apply branches are classified; 503/429 contracts preserved. | Route tests plus provider stub, local automated. |
| PROOF-RL-007 | RL-FR-011 | Webhooks/internal jobs | Route/store | Invalid signature, replayed event, repeated cron secret call | Signature/replay/idempotency block side effects independent of IP. | Route tests plus idempotency fixture. |
| PROOF-RL-008 | RL-FR-012, RL-FR-013, RL-FR-015 | WAF, Workers RL, Turnstile | Provider/hosted | Bot-like requests, token replay, multi-location traffic | Edge layers reduce pressure but app limiter remains authoritative; Turnstile tokens are server-validated. | Provider readback and hosted proof only. |
| PROOF-RL-009 | RL-FR-014, RL-NFR-006 | Durable Object exact counters | Provider/hosted | Concurrent increments on one partition and many partitions | Transactional exact count or explicit rejection of cutover. | Hosted Worker/DO proof, provider evidence. |
| PROOF-RL-010 | RL-NFR-004, RL-NFR-005, RL-NFR-007 | Observability, rollback, false positives | Operations | Shadow denials, override, kill switch, support case | Event fields are redacted, cardinality capped, rollback verified, override expires. | Dashboard/runbook drill. |

## UltraQA Adversarial Scenario Matrix

| Scenario | Expected proof |
| --- | --- |
| 1,000 invalid share password attempts across 10 IPs | Durable per-token/client controls deny without leaking token existence. |
| Shared office NAT with 5 legitimate proposal reviewers | Narrow recipient/session keys prevent broad IP lockout. |
| Owner exports XLSX repeatedly during client call | Clear retry and no partial file corruption. |
| Upload tab crash before release | Durable/session cleanup or timeout prevents permanent capacity loss. |
| AI prompt loop from one user | Quota denies before provider spend escalates. |
| Resend webhook replay | Signature/idempotency blocks duplicate side effects independent of IP. |
| Cloudflare WAF rule active | Origin still protected by app limiter if WAF counters lag. |
| Turnstile token replay | Server-side validation rejects reused/expired token. |
| Limiter store outage | Security/cost surfaces fail closed; telemetry drops/fails soft. |
| Policy kill switch toggled | Denials stop for that policy without deploy. |

## Validation Commands For This Package

Planning artifact verification:

```bash
find .ai/03_plans/2026-06-29-Rate-Limiting -maxdepth 1 -type f | sort
git diff --check -- .ai/03_plans/2026-06-29-Rate-Limiting
git diff --stat -- .ai/03_plans/2026-06-29-Rate-Limiting
git status --short -- .ai/03_plans/2026-06-29-Rate-Limiting
```

Future implementation verification should use targeted tests first, then typecheck/lint/build only when the implementation touches shared source, auth, database, runtime, or provider integration.
