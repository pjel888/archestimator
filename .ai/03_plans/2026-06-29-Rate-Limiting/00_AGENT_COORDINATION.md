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
| Cloudflare research lane | Official docs refresh | Confirmed WAF/Workers RL caveats, Turnstile validation, Durable Objects, D1, Observability, Wrangler facts. |
| Adversarial review lane | Readiness critique | Rejected empty package state and enumerated P0/P1/P2 gaps to close. |

## Uncertainty Handling

The source tree is active and dirty. This package records the checkout observed on 2026-06-30. Any implementation task must repeat route discovery and limiter grep before editing. Where the prompt named old files, this plan records current reality:

- `src/proxy.ts` is absent in this checkout.
- `src/middleware.ts` delegates to `src/lib/auth/request-proxy.ts`.
- `src/proxy/index.ts` re-exports the same proxy.
- `src/lib/auth/request-proxy.ts:120` bypasses `/api`.
- `src/app/api/share/[token]/recipient-session/route.ts` and `src/app/api/share/[token]/snapshot/route.ts` are absent; current equivalents are `session` and the token root route.
