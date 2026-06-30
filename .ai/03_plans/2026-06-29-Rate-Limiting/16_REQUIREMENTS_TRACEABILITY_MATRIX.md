---
title: Requirements Traceability Matrix
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Requirements Traceability Matrix

## Source IDs

| Source ID | Source strength | Evidence |
| --- | --- | --- |
| SRC-PROMPT-RL | User-provided task prompt | `.ai/08_prompts/rate-limiting-prompt.md`. |
| SRC-PROMPT-IMPROVE | User-provided quality prompt | `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md`. |
| SRC-PROMPT-MULTI | User-provided execution directive | `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`. |
| SRC-LOCAL-CODE | Local checkout evidence | 30 route files, 27 action files, existing limiter helpers, proxy/API bypass, Cloudflare config. |
| SRC-NEXT-LOCAL | Installed framework docs | `node_modules/next/dist/docs/` for `next@16.2.6`. |
| SRC-CF-DOCS | Official provider docs | Cloudflare WAF, Workers Rate Limiting, Turnstile, Durable Objects, KV, D1 docs refreshed 2026-06-30. |
| SRC-CF-MIGRATION | Existing project plan/state | Cloudflare production cutover remains NO-GO. |

## Requirement Matrix

| Source ID | Requirement ID | Requirement | Affected routes/actions | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SRC-PROMPT-RL | RL-FR-001 | Central policy registry before expanding limits. | All rate-relevant routes/actions. | 07, 09, 10/P1, 19 | P1 | Policy IDs, windows, modes, failure modes, response profiles live in one registry without threshold changes. | PROOF-RL-001 | Broad behavior drift | READY FOR P0/P1 | No code changes in this task. |
| SRC-LOCAL-CODE | RL-FR-002 | Public share read/write limits stay explicit and durable. | `/api/share/[token]/*`. | 03, 04, 06, 10/P3, 19 RC-016 through RC-023 | P3 | Current Postgres-backed windows and 429/Retry-After behavior preserved before consolidation. | PROOF-RL-002 | Client proposal false positives | CONDITIONALLY READY | Re-run route tests before edits. |
| SRC-LOCAL-CODE | RL-FR-003 | Public share password lockout must be durable or explicitly supplemental. | `password/route.ts`, publication security helpers. | 03, 04, 06, 14, 19 | P3 | Local hard lockout is not the only production security boundary. | PROOF-RL-002 | Brute force and UX lockout | CONDITIONALLY READY | Decide HMAC migration for existing SHA-256 key pattern. |
| SRC-LOCAL-CODE | RL-FR-004 | Invite flow limits and no-enumeration behavior must cover route and action surfaces. | Invite accept/continue/sign-out, collaboration actions. | 03, 04, 05, 10/P4, 19 RC-026 through RC-028, AC-004/005 | P4 | Create/resend/resolve/continue/accept preserve durable HMAC controls; sign-out has no-policy or limiter rationale. | PROOF-RL-003 | Token probing and beta-user lockout | CONDITIONALLY READY | Sign-out currently has same-origin gate but no limiter decision. |
| SRC-PROMPT-RL | RL-FR-005 | Auth/magic-link throttles must avoid provider lockout duplication. | Auth catch-all, callback, auth actions. | 04, 05, 06, 10/P8, 19 RC-003/025, AC-001 | P8 | App policy coordinates with provider, uses email/client hashes, and keeps recovery path. | Route/action tests plus provider stub | Account enumeration/lockout | OPEN | Requires provider contract review before enforcement. |
| SRC-LOCAL-CODE | RL-FR-006 | Upload limits need request, byte, active-session, workspace, and cleanup controls. | Attachment/image/upload routes, upload admission. | 04, 06, 10/P6, 11, 19 RC-004 through RC-008/015 | P6 | Production-critical upload controls are not only process-local. | PROOF-RL-004 | Cost, storage, stuck sessions | CONDITIONALLY READY | Current admission maps are local-only. |
| SRC-LOCAL-CODE | RL-FR-007 | Export limits must deny before expensive workbook generation. | Proposal XLSX export. | 03, 04, 06, 10/P5, 19 RC-015 | P5 | 429 with Retry-After occurs before CPU/DB-heavy export work. | PROOF-RL-004 | Cost/performance | READY FOR TARGETED IMPLEMENTATION | Add p95/workbook metrics. |
| SRC-NEXT-LOCAL | RL-FR-008 | Server actions need explicit classification separate from route handlers and Proxy. | 27 `src/lib/**/*actions.ts` files. | 04, 07, 10/P0/P7/P8/P9, 19 AC-001 through AC-027 | P0 then P5-P9 | Each function is classified as no-policy/read/mutation/email/provider/storage/public-token. | PROOF-RL-005 | Silent unbounded mutation | P0 REQUIRED | Current package has file-level rows; function-level P0 remains. |
| SRC-LOCAL-CODE | RL-FR-009 | AI routes need request/provider-cost/workspace/user quotas. | AI ask, AI package-builder draft/refine/feedback/apply. | 04, 05, 06, 10/P5, 19 RC-001/002 | P5 | Ask behavior preserved; package-builder branches have distinct quota decisions before provider spend or Apply. | PROOF-RL-006 | Provider spend and mutation risk | CONDITIONALLY READY | Package-builder currently lacks limiter decision. |
| SRC-PROMPT-RL | RL-FR-010 | Email/digest/resend controls must protect reputation without overblocking. | Invite resend, publication recipient email, notifications, Resend client. | 04, 05, 06, 10/P9, 12, 19 AC-004/020/021 | P9 | Email actions have per-owner/project/recipient cooldowns and circuit-breaker separation. | Targeted action/provider tests | Reputation/support risk | OPEN | Needs provider delivery-log review. |
| SRC-PROMPT-RL | RL-FR-011 | Webhook/internal replay/idempotency controls come before generic rate limiting. | Resend webhook, internal upload jobs. | 04, 05, 06, 10/P9, 19 RC-011 through RC-013/024 | P9 | Signature/secret, replay, idempotency, and queue safety proven independently of IP. | PROOF-RL-007 | Duplicate side effects | CONDITIONALLY READY | Rate limits remain secondary. |
| SRC-CF-DOCS | RL-FR-012 | Cloudflare WAF rollout starts observe-only and remains coarse. | Public paths, auth, upload, AI, export. | 08, 13, 19 CP-001/002 | P10 | Exact rule expression, provider readback, origin comparison, rollback by rule ID. | PROOF-RL-008 | Origin overshoot/false positives | OPEN | Do not claim exact quota behavior. |
| SRC-CF-DOCS | RL-FR-013 | Workers Rate Limiting binding is a soft per-location guard only. | Future Worker route parity. | 08, 15, 19 CP-004 | P10/P11 | Binding proof records permissive/eventual behavior and app limiter remains source of truth. | PROOF-RL-008 | Incorrect exact-counter claim | OPEN | Wrangler/version/provider proof required. |
| SRC-CF-DOCS | RL-FR-014 | Durable Object or current Postgres/RPC must back exact security-critical counters. | Password, invite, auth, public mutation, room quotas. | 07, 08, 09, 15, 19 CP-005 | P11 | Concurrency tests prove exactness, or cutover is rejected. | PROOF-RL-009 | Data consistency | OPEN | Cloudflare hosted proof missing. |
| SRC-CF-DOCS | RL-FR-015 | Turnstile is adaptive friction, not a counter. | Public password, invite probing, contact/auth escalation. | 08, 10/P10, 13, 19 CP-003 | P10 | Siteverify, single-use/expiry, accessibility fallback, support path. | PROOF-RL-008 | Accessibility and replay | OPEN | Owner approval required for visible challenge. |
| SRC-PROMPT-IMPROVE | RL-NFR-001 | No raw PII in limiter keys, storage, logs, dashboards, or provider events. | All surfaces. | 12, 14, 19 | P2/P12 | Credential material taxonomy and redaction tests cover IP/email/token/cookies/signatures/provider keys. | PROOF-RL-010 | Privacy leak | CONDITIONALLY READY | HMAC migration decisions remain. |
| SRC-PROMPT-RL | RL-NFR-002 | Denials must provide `Retry-After` where retry is allowed. | Routes/actions with enforce mode. | 06, 09, 11, 19 | P1/P3-P7 | Route and action helpers preserve current user-facing contracts. | PROOF-RL-001/002 | UX breakage | CONDITIONALLY READY | Action response shapes differ by domain. |
| SRC-PROMPT-RL | RL-NFR-003 | Provider errors/secrets must not leak through limiter responses. | AI, email, Supabase, Cloudflare, webhook/internal. | 09, 14, 19 | P5/P9/P10 | 429/403/503 bodies expose safe messages only. | Targeted tests and secret scan | Secret leak | OPEN | Needs implementation tests. |
| SRC-PROMPT-RL | RL-NFR-004 | Observability must be useful, redacted, sampled, and cardinality-controlled. | All surfaces. | 12, 18, 19 | P12 | Events include schema/hash versions, mode, store, decision, hashes, and sampling controls. | PROOF-RL-010 | Cardinality/cost/privacy | CONDITIONALLY READY | Dashboard not implemented. |
| SRC-PROMPT-RL | RL-NFR-005 | Rollback switches and false-positive process must be per-policy and audited. | All enforce/challenge policies. | 13, 19 | P12 | Override has owner, reason, expiry, reload behavior, and verification step. | PROOF-RL-010 | Permanent bypass or user harm | CONDITIONALLY READY | Config source remains future decision. |
| SRC-CF-MIGRATION | RL-NFR-006 | Cloudflare runtime proof gates cutover. | WAF, Workers, DO, D1, Turnstile, Observability. | 08, 13, 17, 18, 19 | P10/P11/P12 | Hosted/provider evidence exists before production claims. | Provider/hosted proof only | Cutover overclaim | OPEN | Current plan remains NO-GO. |
| SRC-PROMPT-RL | RL-NFR-007 | Public reviewer and beta auth false positives get first-class recovery. | Share, invite, auth, unsubscribe, export. | 05, 06, 13, 17, 19 | P3/P4/P8/P12 | Clear wait/support/owner override paths without broad IP allowlists. | Scenario tests and support drill | Business workflow harm | CONDITIONALLY READY | Needs beta traffic metrics. |
| SRC-PROMPT-IMPROVE | RL-NFR-008 | Performance/cost budgets must be measurable. | Upload, export, AI, DB-backed counters, Cloudflare provider layers. | 06, 08, 11, 12, 17 | P5/P6/P10/P12 | p95/store-latency/query-count/token-spend baseline and rollback triggers defined before enforcement. | Targeted perf/provider proof | Cost and latency regression | OPEN | No live baseline yet. |

## Gaps Carried Forward

| Gap | Required next action | Why acceptable for this planning package |
| --- | --- | --- |
| Function-level server action classification is not complete. | P0 must expand `19` AC rows to each exported function before source edits. | The package is conditionally ready for P0 discovery/test-lock, not direct enforcement. |
| No live traffic metrics. | Run shadow mode and collect beta traffic/support baseline. | The app is preparing for first users; thresholds are hypotheses. |
| No provider mutation/hosted Cloudflare proof. | Execute Cloudflare worksheet rows CP-001 through CP-007 in a separate provider-proof task. | This task is planning-only and Cloudflare production gates remain closed. |
| Current worktree has unrelated changes. | Keep completion claims scoped to this directory. | Dirty state does not block docs-only package verification. |
