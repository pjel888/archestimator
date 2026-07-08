# 12 — Test and Validation Strategy

Lightest proof that proves the claim (AGENTS.md proportional verification).
Browser proof only where a browser-only claim exists (J3 inbox realtime,
responsive sidebar, focus trap).

## 12.1 Test layers

| Layer | Tool | Use |
|---|---|---|
| Domain/repository logic | `vitest` | repositories, cache, flags, audit |
| DO behavior | `vitest` + `@cloudflare/vitest-pool-workers` (if present) | presence count, inbox broadcast |
| React component interaction | React Testing Library (`test:dom`) | tables, tiles, composer, states |
| Server Action / route authz | direct action/handler test | denial + happy + idempotency |
| Bundle/size | `bun run build` + analyzer | PERF-BUNDLE-01 |
| Perf | local Playwright/profiler | PERF-OVERVIEW-01 (evaluator 09) |
| Provider read-back | `wrangler d1 execute` / provider API | hosted proof (P7, BLOCKED-EXTERNAL) |

## 12.2 Test Execution Matrix

| Req | Test file | Type | New/existing | Fixture | Command | Expected evidence | Pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-AUTH-01 | `tests/vitest/admin-access.test.ts` | route/denial | new | seeded profiles+sessions | `bun run test -- admin-access` | non-admin redirect, admin render | none | impl |
| FR-AUTH-02 | `tests/vitest/admin-action-authz.test.ts` | action denial | new | seeded contexts | `bun run test -- admin-action-authz` | 403 on direct POST | none | impl |
| FR-OVERVIEW-01 | `tests/vitest/global-presence-do.test.ts` | DO unit | new | mock WS | `bun run test -- global-presence` | count = sockets.length | none | impl |
| FR-OVERVIEW-02 | `tests/vitest/admin-users-repository.test.ts` | repo | new | seeded users | `bun run test -- admin-users` | count + list correct | none | impl |
| FR-OVERVIEW-03 | `tests/vitest/admin-cf-analytics.test.ts` | cache+degrade | new | mock fetch | `bun run test -- admin-cf` | cached then degrade | none | impl |
| FR-OVERVIEW-04 | `tests/vitest/admin-health-probes.test.ts` | unit | new | mock env | `bun run test -- admin-health` | per-binding status | none | impl |
| FR-USERS-01 | `tests/vitest/admin-users-table.test.tsx` | DOM | new | DTO fixture | `bun run test:dom -- admin-users` | rows + pagination | none | impl |
| FR-SUPPORT-01 | `tests/vitest/support-actions.test.ts` | action | new | seeded convos | `bun run test -- support-actions` | send + audit | none | impl |
| FR-SUPPORT-02 | `tests/vitest/support-inbox-do.test.ts` | DO+hook | new | mock WS | `bun run test -- support-inbox` | broadcast on msg | none | impl |
| REL-INBOX-01 | `tests/vitest/support-idempotency.test.ts` | action | new | duplicate client_id | `bun run test -- support-idempotency` | one row | none | impl |
| REL-INBOX-02 | `tests/vitest/support-reply-failure.test.ts` | action | new | EMAIL fail mock | `bun run test -- support-reply-fail` | draft kept | none | impl |
| FR-FLAGS-01/02 | `tests/vitest/feature-flags.test.ts` | repo+action | new | seeded flags | `bun run test -- feature-flags` | toggle persists + audit | none | impl |
| FR-AUDIT-01 | `tests/vitest/admin-audit.test.ts` | action | new | — | `bun run test -- admin-audit` | one row per mutation | none | impl |
| PERF-OVERVIEW-01 | `scripts/admin-perf-eval.mjs` (+ Playwright) | perf | new | seeded 1000 users | `bun run admin:perf:eval` | TTFB p95 ≤ 600 ms | none | impl |
| PERF-BUNDLE-01 | build analyzer | build | new | — | `bun run build` | admin chunk ≤ 250 KB gzip | none | impl |
| FR-ANALYTICS-02/03 | provider read-back | provider | new (P7) | real creds | manual/`wrangler` | cached metrics | n/a (BLOCKED) | owner |
| A11Y | DOM assertions + keyboard test | DOM | new | — | `bun run test:dom -- admin-a11y` | focus + semantics | none | impl |

## 12.3 Adversarial QA matrix (UltraQA-style)

| ID | Actor | Scenario | Setup | Harness | Expected | Status | Evidence |
|---|---|---|---|---|---|---|---|
| AQ-1 | anonymous | GET `/admin` | no cookie | route test | redirect `/login?next=/admin` | pending | test |
| AQ-2 | non-admin auth | GET `/admin` | seeded member | route test | redirect `/access-required` | pending | test |
| AQ-3 | non-admin auth | POST admin action | seeded member | action test | 403 | pending | test |
| AQ-4 | admin | duplicate send same client_msg_id | seeded convo | action test | one row | pending | test |
| AQ-5 | admin | reply when EMAIL binding fails | mock fail | action test | send_failed, draft kept | pending | test |
| AQ-6 | user | oversized message body (>limit) | big string | action test | validation error | pending | test |
| AQ-7 | user | XSS in message body | `<script>` | DOM test | rendered text, not executed | pending | test |
| AQ-8 | admin | concurrent flag toggle | parallel calls | action test | last-write + 2 audit rows | pending | test |
| AQ-9 | client | WS disconnect mid-session | kill socket | DO test | reconnect-safe, no dupes | pending | test |
| AQ-10 | admin | provider token revoked | mock 401 | cache test | degrade to link | pending | test |
| AQ-11 | admin | D1 read fails | mock throw | DOM test | section error + retry | pending | test |
| AQ-12 | attacker | flood admin login | many POSTs | ratelimit test | throttled | pending | test |
| AQ-13 | admin | stale cache past TTL | mock time | cache test | refresh triggers | pending | test |
| AQ-14 | user | prompt-injection in support msg | "ignore prev…" | DOM/action | treated as text, no action | pending | test |

## 12.4 Validation gap honesty

- Provider read-back (GA4/Clarity/CF Analytics) cannot be locally proven —
  requires owner credentials (OPEN-1/2/3). Until then, those tiles ship as
  link-out only (FR-ANALYTICS-01) and the read-tiles are BLOCKED-EXTERNAL.
- Cloudflare Access edge proof (OPEN-4) is hosted-only; local can only prove
  the app-layer gate.
- Perf evaluator uses local Playwright (not hosted); claims are local-evidence,
  not production-perf proof.
