# Performance, Reliability, and Observability

## 1. Performance

### 1.1 Hot-path impact analysis
The hardening touches three route handlers (`accept`, `continue`, `sign-out`) and adds one manager-only action (`revoke`). Performance impact:

| Change | Hot path? | DB queries added | CPU | Network |
|---|---|---|---|---|
| SEC-01 origin tighten (`accept`, `sign-out`) | `/accept` is authenticated POST (warm) | **0** (pure header parse) | ~µs (URL parse + string compare) | 0 |
| SEC-02 origin add (`continue`) | `/continue` is anonymous GET/POST | **0** | ~µs | 0 |
| SEC-04 cookie attrs (`sign-out`) | rare | 0 | 0 | 0 |
| SEC-05 fail-closed rate limits | resolve/continue/accept | **0** (same record+count; only the disabled-flag branch changes) | 0 | 0 |
| SEC-07 revoke (new action) | manager-only, off hot path | 3-4 (manager auth + load + batched update) | trivial | 0 |
| SEC-10 promotion-only direct-grant | rare | 0 (CASE change in existing UPSERT) | trivial | 0 |

**Verdict:** no measurable hot-path regression. No new per-request D1 write on resolve. PERF-01/PERF-02 satisfied by construction.

### 1.2 Performance evaluator contract (PERF)
Per the Creating-Plan-Prompt §4A performance-goal contract:

| Field | Value |
|---|---|
| Baseline metric | `/invite/[token]` resolve query count + `/accept` query count (from `collaboration-invitation-d1-store.test.ts` / proof harness) |
| Target metric | No increase in query count per route after hardening |
| Measurement command | `bun run test -- collaboration-invitation-d1-store` (query-count assertions) + hosted proof harness |
| Dataset/fixture size | Existing proof fixtures (`codex-collab-proof-*`) |
| Runs / flake policy | Single run (deterministic unit/proof); 3 runs for any timing claim |
| Regression threshold | +0 queries on resolve; +0 on accept (beyond the existing 5-7) |
| Related functional tests | `collaboration-invitation-d1-store.test.ts`, `project-invite-entry-route.test.ts`, proof harness |
| Evidence artifact | Test output + proof harness JSON |

Passing ordinary tests is the declared evaluator here (the claim is "no query-count regression," proven by assertion).

### 1.3 Bundle / RSC / payload
- **Client JS:** only the revoke button + dialog is new client code. Estimate <1 KB gzipped (reuse `src/components/ui/` Button + AlertDialog). PERF-02.
- **RSC payload:** unaffected (server-only origin logic; revoke is manager action).
- **No new images, fonts, scripts.**

### 1.4 Core Web Vitals
- No LCP/INP/CLS impact. Invite page render is unchanged. Revoke dialog is user-initiated (no layout shift).

## 2. Reliability

### 2.1 Failure modes
| Component | Failure | Behavior | Hardening change? |
|---|---|---|---|
| Origin helper | malformed headers | caught → deny (post-SEC-01) or allow (dev) | tightened deny-mode |
| `continue` cookie set | `createPendingInviteBridge` throws | redirect to invite (existing) | unchanged + origin check added |
| `accept` RPC | D1 error | 500 / redirect back | unchanged |
| `sign-out` Better Auth handler | error | cookies still cleared (existing) | + full attrs |
| `revoke` (new) | D1 batch fails | batch atomic → invitation stays pending → error toast | new; documented |
| Email send | circuit open / binding missing | degrade to "share manually" (existing) | unchanged |
| Rate-limit D1 | audit DB unavailable | throws → 500 (existing) | unchanged |

### 2.2 Retry / idempotency / partial failure
- **Revoke:** idempotent on already-revoked (`already-terminal` no-op). D1 batch is atomic — no partial state.
- **Accept:** idempotent on same-actor (`already_member`).
- **Continue:** each call mints a fresh cookie (rate-limited); duplicate submits bounded by the 10/60s limit.
- **No retries needed** for the origin check (synchronous header parse).

### 2.3 Graceful degradation
- If the invite feature flag is disabled: resolve/continue/accept deny safely (SEC-05) rather than silently bypassing rate limits. The invite page renders a "not available" state.
- If the pepper is missing/invalid: `readInviteEntryConfig` returns disabled → same disabled path.

## 3. Observability

### 3.1 Audit events (existing + new)
| Event | When | Metadata |
|---|---|---|
| `collaboration_invite_opened` | resolve | invitation_id, actor? |
| `collaboration_invite_token_issued` | create/resend/copy | token_hint, delivery_method |
| `collaboration_invite_email_sent` | email send success | — |
| `collaboration_invite_link_copied` | copy-link | — |
| `collaboration_invite_accepted` | accept (new member) | — |
| `collaboration_invite_already_member_confirmed` | accept (existing member) | — |
| `collaboration_invite_replay_blocked` | used token + other actor | — |
| `collaboration_invite_wrong_account` | mismatched email | invited_email |
| **`collaboration_invite_revoked` (NEW)** | manager revoke (SEC-07) | revoked_by, revoked_reason?, invitation_id |
| `invite_email_attempted` | email send attempt | — |

All events go to `collaboration_audit_events` (D1) with `metadata_json` (validated object). No raw tokens.

### 3.2 Structured logging
- `console.warn`/`console.error` in existing invite paths. `redact.ts` strips tokens. The hardening adds no new log surface; the revoke action logs at the same level as sibling actions.

### 3.3 Metrics / dashboards / alerts
- **No new metrics required** for the hardening (free-tier posture; Cloudflare Workers Analytics covers request/error rates).
- **Recommended (future, not blocking):** a manager-visible audit log view in the publisher panel (read of `collaboration_audit_events`). Out of scope for this pack.
- **Alert:** if SEC-01 deny-on-missing causes a 403 spike in production (>1% of accept attempts), alert + consider relaxing via `ARCHESTIMATOR_INVITE_ORIGIN_STRICT=false`. Monitor via Workers Analytics on `/invite/[token]/accept` 403 rate.

### 3.4 Tracing
- No distributed tracing today. The hosted proof harness (`/api/internal/collaboration-invitation-proof`) is the end-to-end correctness tracer.

## 4. Rollout reliability (summary — full in `13`)

- **Phase 1 (SEC-01/02/04):** highest-risk phase (CSRF tightening). Roll out behind `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` env so it can be relaxed without a redeploy if legitimate traffic is blocked. Monitor 403 spike for 24h.
- **Phase 2 (SEC-05):** fail-closed rate limits. Low risk (disabled flag is rarely toggled).
- **Phase 3 (SEC-07 revoke + DATA-01 migration):** additive. Low risk.
- **Phase 4 (SEC-10):** promotion-only. Low risk.
- **Phase 5 (SEC-09/SEC-11):** owner-gated. Coordinate realtime key rotation (SEC-09).

## 5. Rollback thresholds
- 403 rate on `/invite/[token]/accept` or `/continue` > 1% of legitimate attempts → relax `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` (no redeploy).
- Revoke action error rate > 5% → revert the action (migration column harmless).
- Any membership-creation regression → revert the phase immediately (accept path is the critical onboarding gate).
