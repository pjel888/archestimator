---
title: Risk Register
plan_id: 2026-06-29-cloudflare-migration-codex
document: 14
---

# Risk Register

| ID | Risk | Severity | Likelihood | Mitigation |
| --- | --- | --- | --- | --- |
| RISK-001 | D1 does not replace Postgres RLS/RPC/triggers/realtime semantics | Critical | High | Treat D1 as redesign; keep Postgres as fallback until compatibility and denial proof pass |
| RISK-002 | Better Auth session model does not match current Supabase SSR/proxy gates | Critical | Medium | Auth proof before cutover; route-gate tests |
| RISK-003 | Cloudflare front-door caches protected or share responses | Critical | Low-Med | Explicit bypass/no-store rules; targeted browser/API proof |
| RISK-004 | R2 object access exposes private assets | Critical | Medium | App-owned authorization, private buckets, signed access tests |
| RISK-005 | KV eventual consistency causes stale auth or permission state | High | Medium | Ban KV for authorization/session/locks |
| RISK-006 | Queue retries duplicate mutations or emails | High | Medium | Idempotency keys, dedupe checks, dead-letter strategy |
| RISK-007 | Realtime collaboration has no replacement in listed stack | High | High | Treat as separate architecture decision, likely Durable Objects/WebSockets |
| RISK-008 | Next.js 16 behavior differs on Workers/OpenNext | High | Medium | Full route proof in Cloudflare preview/workerd |
| RISK-009 | Email Service outbound deliverability or webhook parity is weaker than Resend | High | Medium | Keep Resend baseline until evidence passes |
| RISK-010 | Hyperdrive is misunderstood as D1 acceleration | Medium | Medium | Scope Hyperdrive only to Worker-to-external-Postgres/MySQL |
| RISK-011 | Cloudflare cost estimate omits operation charges | Medium | High | Build cost workbook with operation counts |
| RISK-012 | WAF/rate-limit false positives block beta users or webhooks | Medium | Medium | Stage rules, review events, define bypass/rollback |
| RISK-013 | Existing readiness scripts become obsolete without replacement | High | Medium | Replace provider proof before deleting old checks |
| RISK-014 | Data migration backup/restore path is weaker than current Supabase posture | Critical | Medium | Backup/restore proof before data movement |
| RISK-015 | Migration consumes launch time without clear savings | Medium | Medium | Phase 0 cost gate before implementation |
| RISK-016 | Cloudflare pricing, limits, API fields, or adapter support drift after this plan date | High | Medium | Execution-date docs/changelog/Wrangler schema refresh before each slice |
| RISK-017 | Worker config or binding types drift from deployed resources | High | Medium | Review `wrangler.jsonc`, generate `Env` types, and prove bindings in preview before production |
| RISK-018 | Full-native rewrite slows launch without enough bill savings | High | Medium | Require cost workbook, proof budgets, and fallback decision point before implementation |
| RISK-019 | D1 redesign causes slower hot paths through chatty queries | High | Medium | Set query-count budgets, measure p95 route/action latency, denormalize or redesign before cutover |
| RISK-020 | App-layer authorization misses a tenant/workspace boundary previously covered by RLS | Critical | Medium | Require shared authorization helpers plus positive/denial tests for every protected access path |

## Risk Posture

The risk profile supports a full-native prelaunch proof program but rejects production cutover until proof gates pass.

Highest unresolved risks:

- Database/authorization parity.
- Auth session parity.
- Realtime replacement.
- Next.js adapter/platform fidelity.
- Usage-based cost uncertainty.
- Cloudflare source freshness and Worker toolchain fidelity.
