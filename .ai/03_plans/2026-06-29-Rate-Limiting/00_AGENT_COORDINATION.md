---
title: Agent Coordination
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Agent Coordination

## Boundary

This is a planning, audit, preparation, and readiness package. It does not implement rate limiting, edit app code, edit migrations, change environment configuration, deploy Cloudflare resources, run provider mutations, or change production behavior.

Allowed write scope for this task: `.ai/03_plans/2026-06-29-Rate-Limiting/`.

## Evidence Rules

- Use exact local source references for current behavior.
- Mark missing files as missing rather than assuming prompt-era paths still exist.
- Treat official Cloudflare documentation as current only as of the access date recorded here.
- Treat all policy numbers as hypotheses until validated against real traffic and false-positive review.
- Coordinate with `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/` and its current NO-GO production gates.

## Work Lanes Used

| Lane | Role | Result |
| --- | --- | --- |
| Lead planning lane | Integrated audit and wrote package | Owns final package consistency. |
| Repo exploration lane | Read-only source inventory | Confirmed real proxy surface, missing prompt-listed routes, limiter files, in-memory/durable split. |
| Cloudflare/Next research lane | Official docs refresh | Confirmed Next request-time boundaries, WAF/Workers RL caveats, Turnstile validation, Durable Objects, KV non-fit for exact counters, D1, Observability, Wrangler facts. |
| Adversarial review lane | Readiness critique | Rejected direct implementation from the first package pass and identified the traceability, route/action, evidence-class, provider-proof, and privacy taxonomy repairs captured in 16 through 19. |
| Third-pass repo evidence lane | Read-only source scan | Confirmed `Sb-Forwarded-For` is absent from app source, IPv6 is not handled in limiter identity helpers, timing-safe equality is partial, and multipart/upload support needs explicit resource budgets. |
| Third-pass adversarial lane | Readiness critique | Rejected overclaiming from the second-pass package and required explicit IPv6, Supabase Auth, cache stampede, retry full-jitter, MFA/OTP, pagination/count, CORS `OPTIONS`, realtime, PWA replay, multipart/chunked, and bot-escalation rows. |
| Third-pass QA/proof lane | Proof matrix critique | Required `PROOF-RL-016` through `PROOF-RL-027` and new SCE/FCE/CP rows before implementation readiness can be claimed. |

## Source Authority

| Source ID | Authority | Use in this package |
| --- | --- | --- |
| SRC-PROMPT-RL | `.ai/08_prompts/rate-limiting-prompt.md` | Required document set, exact output shape, rate-limiting concerns, stop condition. |
| SRC-PROMPT-IMPROVE | `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md` | Quality bar, traceability, source hierarchy, readiness scoring, evidence classes. |
| SRC-PROMPT-MULTI | `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` | Multi-lane plan hardening, source IDs, work packages, proof mapping. |
| SRC-LOCAL-CODE | Current checkout on 2026-06-30 | Route/action count, existing limiter implementations, proxy/API boundary, dirty-worktree caveat. |
| SRC-NEXT-LOCAL | `node_modules/next/dist/docs/` for installed `next@16.2.6` | Route Handler, Server Function, Proxy, request-time API, cache/runtime rules. |
| SRC-CF-DOCS | Cloudflare developer docs refreshed on 2026-06-30 | WAF, Workers Rate Limiting, Turnstile, Durable Objects, D1, KV, observability, Wrangler claims. |
| SRC-CF-MIGRATION | `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/` and current-state fast path | Production Cloudflare cutover remains NO-GO; local-only proof must not be promoted to hosted/provider proof. |
| SRC-GAP-ANALYSIS | Pasted third-pass review attachment | Required explicit closure of IPv6, Supabase Auth, advanced resource/protocol, client replay, realtime, and bot-escalation gaps. |
| SRC-SUPABASE-AUTH-DOCS | Supabase Auth rate-limit docs refreshed on 2026-06-30 | Built-in provider limits, custom SMTP implications, and `Sb-Forwarded-For`/`sb_secret_*` forwarding constraints. |
| SRC-CF-RL-DOCS | Cloudflare WAF rate-limiting parameters refreshed on 2026-06-30 | Edge rate-limiting characteristics, counting expressions, IP/NAT support, header characteristics, plan-gated behavior, and provider-readback needs. |
| SRC-CF-BOT-DOCS | Cloudflare bot docs refreshed on 2026-06-30 | Bot Management and Bot Fight/Super Bot Fight products are entitlement- and false-positive-sensitive escalation options, not P0 assumptions. |
| SRC-AWS-JITTER | AWS Architecture Blog on backoff and jitter refreshed on 2026-06-30 | Full-jitter retry is the preferred retry-shaping contract when server `Retry-After` is absent. |
| SRC-NODE-CRYPTO | Node.js crypto docs refreshed on 2026-06-30 | `timingSafeEqual` usage requires careful length handling and response-envelope parity. |

## Uncertainty Handling

The source tree is active and dirty. This package records the checkout observed on 2026-06-30. Any implementation task must repeat route discovery and limiter grep before editing. Where the prompt named old files, this plan records current reality:

- `src/proxy.ts` is absent in this checkout.
- `src/middleware.ts` delegates to `src/lib/auth/request-proxy.ts`.
- `src/proxy/index.ts` re-exports the same proxy.
- `src/lib/auth/request-proxy.ts:120` bypasses `/api`.
- `src/app/api/share/[token]/recipient-session/route.ts` and `src/app/api/share/[token]/snapshot/route.ts` are absent; current equivalents are `session` and the token root route.
- Local route scan found 30 `route.ts` files; action scan found 27 `src/lib/**/*actions.ts` files. `19_IMPLEMENTATION_CONTRACT_WORKSHEET.md` records the observed method/action surface and marks where P0 must still complete function-level classification.
- Third-pass source scan found `Sb-Forwarded-For` absent from app source, IPv6 references only in Supabase config comments, partial `timingSafeEqual` usage in token/security helpers, and no global enforcement surface for service-worker replay, deep pagination/count budgets, realtime message quotas, or bot-score escalation.
