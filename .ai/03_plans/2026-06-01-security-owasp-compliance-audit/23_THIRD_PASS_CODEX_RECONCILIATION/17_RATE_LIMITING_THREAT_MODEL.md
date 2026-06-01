# 17 — Rate Limiting Threat Model

The third pass takes the Codex threat model (DoS via unbounded requests) and applies it to the rate-limiting surface. The rate-limiting posture is a **strength** for share/invite routes and a **gap** for AI routes.

## Rate limiting surface inventory (third-pass)

| Surface | Rate limit type | Per-tenant? | Verified |
|---|---|---|---|
| Public share API routes (8 routes) | Durable (`security_rate_limit_events`) | Per-token | Yes (F-SHARE-06, F-RL-01) |
| Public invite routes (3 routes) | Durable (`security_rate_limit_events`) | Per-token | Yes (F-RL-08) |
| Public share comment route | Durable + circuit-breaker | Per-token | Yes (F-SHARE-07, F-RL-03) |
| Public share password route | Durable + lockout | Per-token | Yes (F-SHARE-09) |
| AI routes (`/api/ai/ask`, `/api/ai/package-builder`) | **None** | n/a | **Gap (SEC-20260601-3P-002)** |
| Auth upload routes (3 routes) | None (auth-gated) | n/a | Acceptable |
| Auth export route (1 route) | None (auth-gated) | n/a | Acceptable |
| Webhook route (1 route) | None (signature-gated) | n/a | Acceptable |
| Server actions (13 modules) | Partial (invite actions only) | n/a | Acceptable |

## Durable rate limit infrastructure (third-pass)

**Evidence:**
- `20260601003000_security_rate_limit_events.sql`
- `enable row level security`
- `force row level security`
- `grant select, insert on … to service_role`
- `revoke all on … from anon, authenticated`
- Service-role-only writes — users cannot tamper with their own counters

**Verdict:** **Confirmed (strength).** Strong design. The counter cannot be tampered with by authenticated users.

## In-memory LRU rate limits (third-pass)

**Evidence:**
- Some public route handlers use in-memory LRU rate limits in addition to durable
- F-RL-02 (Low) — documented in 1P/2P

**Verdict:** **Confirmed.** In-memory LRU is acceptable for hot-path defense; durable is the source of truth.

## Codex-driven rate limiting threat model (third-pass)

### SEC-20260601-3P-002 — AI endpoint cost-amplification (Medium, restated from F-RL-04)

**Codex claim:** Per-tenant AI spend caps are missing; authenticated workspace members can issue unbounded Ask/Package-Builder requests, amplifying both DeepSeek cost and data-exfiltration risk.

**Verdict:** **Confirmed.** No rate-limit invocation in `src/app/api/ai/ask/handler.ts` or `src/lib/ai/package-builder/handler.ts`.

**Recommendation:** Add per-user (and per-workspace fallback) durable rate limits on AI endpoints using `security_rate_limit_events`. (R-25, restated with stronger impact boundary)

### F-RL-08 — Invite routes are rate-limited (strength, restated from 2P)

**Evidence:**
- `src/app/invite/[token]/page.tsx` — `checkInviteResolutionRateLimit`
- `src/app/invite/[token]/continue/route.ts` — `checkInviteContinueRateLimit`
- `src/app/invite/[token]/accept/route.ts` — `checkInviteAcceptRateLimit`
- All return 429 with `Retry-After` and `Cache-Control: no-store`

**Verdict:** **Confirmed (strength, restated from 2P).** The first pass did not credit the invite route rate limits; the second pass added this; the third pass reconfirms.

### F-RL-07 — No per-tenant DoS posture (Low, downgraded in 2P)

**Verdict:** **Restated as Low (hardening).** The durable rate limiter provides per-token/per-IP scoping. Per-tenant quotas are a hardening recommendation, not a current vulnerability.

## Net change to rate limiting threat model (third-pass)

| Item | 1P | 2P | 3P |
|---|---|---|---|
| Durable rate limit table | Info | Info | **Info (restated, strength)** |
| In-memory + durable | Low | Low | **Low (restated)** |
| Comment circuit-breaker | Info | Info | **Info (restated, strength)** |
| AI endpoints no rate limit | Medium | Medium | **Medium (SEC-20260601-3P-002, restated with stronger impact)** |
| DeepSeek timeout | Low | Low | **Low (restated)** |
| Upload size caps | Info | Info | **Info (restated)** |
| Per-tenant DoS posture | Medium | Low | **Low (restated, hardening)** |
| Invite routes rate-limited | (not credited) | Info | **Info (restated, strength)** |

One severity change: F-RL-07 downgraded from Medium (1P) to Low (2P/3P).

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` Codex claim #9, #36, #37, #38
- See `04_FINDING_RECONCILIATION_MATRIX.md` for mapping
- See `06_FALSE_NEGATIVES_FROM_CODEX.md` SEC-20260601-3P-002
- See `12_AI_LLM_THREAT_MODEL.md` for AI endpoint rate limit detail
- See `13_SHARE_PUBLICATION_THREAT_MODEL.md` for share rate limit detail
- See `14_INVITE_COLLABORATION_THREAT_MODEL.md` for invite rate limit detail
