# 09 — Rate Limiting and DoS Resilience

## Findings

### F-RL-01 — Durable rate-limit table is service-role-only

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260601003000_security_rate_limit_events.sql` — `enable row level security`, `force row level security`, `grant select, insert on … to service_role`, `revoke all on … from anon, authenticated`
- **Strength:** Application-layer rate-limit counters are tamper-resistant from anon/authenticated roles
- **CWE:** CWE-770
- **OWASP 2025:** A04
- **OWASP API 2023:** API4
- **ASVS 5.0:** V11.1

### F-RL-02 — In-memory LRU rate limits are acceptable for hot paths

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Low
- **Evidence:** Public route handlers use both in-memory and durable rate limit checks
- **Recommendation:** Document which limits are in-memory and which are durable, with the policy rationale. (R-24)
- **CWE:** CWE-770

### F-RL-03 — Comment endpoint has circuit-breaker

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/app/api/share/[token]/comment/route.ts` — P12 circuit-breaker (5xx rate > 50% over 5 min → 503 for 2 min)
- **Strength:** Prevents cascade failure under backend stress
- **CWE:** CWE-400
- **OWASP 2025:** A04
- **ASVS 5.0:** V11.1

### F-RL-04 — No global rate limit on `/api/ai/ask` and `/api/ai/package-builder`

- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** Medium (DeepSeek cost; data leak at scale)
- **Evidence:** `src/app/api/ai/ask/route.ts` and `src/app/api/ai/package-builder/handler.ts` were not seen to invoke a rate-limit helper. Confirmed by second-pass review — neither invokes `checkProjectPublication*RateLimit` or any rate-limit helper from `src/lib/publication/`.
- **Recommendation:** Apply a per-user (and global fallback) rate limit on AI endpoints; emit `security_rate_limit_events` rows on excess. (R-25)
- **CWE:** CWE-770
- **OWASP 2025:** A04
- **OWASP API 2023:** API4
- **ASVS 5.0:** V11.1

### F-RL-08 — Invite routes are rate-limited (strength, not gap)

- **Severity:** Informational (control — confirmed by second-pass review)
- **Evidence:** Invite routes use durable rate limits through `security_rate_limit_events`:
  - `src/app/invite/[token]/page.tsx` — `checkInviteResolutionRateLimit`
  - `src/app/invite/[token]/continue/route.ts` — `checkInviteContinueRateLimit`
  - `src/app/invite/[token]/accept/route.ts` — `checkInviteAcceptRateLimit`
  - All return 429 with `Retry-After` and `Cache-Control: no-store`
- **OWASP API 2023:** API4
- **ASVS 5.0:** V11.1

### F-RL-05 — DeepSeek timeout is 20s

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium
- **Evidence:** `src/lib/ai/deepseek.ts` — 20s timeout, 900 max tokens
- **Strength:** Bounded resource consumption per call
- **CWE:** CWE-400
- **OWASP 2025:** A04

### F-RL-06 — File upload size caps are explicit

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** Upload routes enforce 12MB image and 20MB attachment caps; `sharp` re-encode bounds pixel count and max edge
- **CWE:** CWE-770
- **ASVS 5.0:** V12.1

### F-RL-07 — No documented per-tenant DoS posture

- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** Medium
- **Evidence:** No quota-per-workspace / cost ceiling documented
- **Recommendation:** Add a per-workspace rate limit and a per-workspace deepseek-cost cap, persisted in durable rate-limit events. (R-26)
- **CWE:** CWE-770
- **OWASP 2025:** A04

## Recommendations

- R-24: Document in-memory vs durable rate-limit policy
- R-25: Apply rate limits to AI endpoints
- R-26: Per-tenant quotas (RPS, AI tokens/day, storage MB)
