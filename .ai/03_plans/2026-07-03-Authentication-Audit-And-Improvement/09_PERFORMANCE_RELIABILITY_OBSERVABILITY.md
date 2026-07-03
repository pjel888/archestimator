# 09 - Performance, Reliability, And Observability

## Reliability Requirements

| Area | Requirement |
|---|---|
| Worker state | No security-critical lockout, rate-limit, session, or revocation state may rely only on module globals. |
| Response path | Auth decisions, token validation, and mutation authorization must happen before responding; `waitUntil` is only for non-critical audit/telemetry side work. |
| Provider failures | Google, email, D1, R2, DO, and webhook failures must surface safe user states and sanitized logs. |
| Retries | Login/invite/share retry paths must be idempotent or explicitly guarded against duplicate mutation. |
| Cache | Auth-sensitive and share-session-sensitive routes must be no-store/dynamic. |

## Observability Events

| Event family | Minimum fields | Forbidden fields |
|---|---|---|
| Auth login/logout | event type, user id if known, provider, result, sanitized error code | raw cookies, OAuth state/code/token, raw email in public logs |
| State mismatch | event type, route, cookie-state category, retry count | state value, cookie value |
| Invite | invitation id/hash reference, actor user id, invited email hash, result | raw invite token, raw email in evidence |
| Publication/share | publication id, token digest reference, recipient hash, action, result | raw share token, password, CSRF/session cookie |
| Authz denial | actor id, object type/id, required role, actual role, result | full object payload |
| Provider cleanup | artifact path/provider, classification, action, owner | provider secret values |

## Performance Risks

| Risk | Plan |
|---|---|
| Additional authz checks add D1 round trips | Prefer repository helpers that combine object lookup and authz predicate. Cache only within a request where safe. |
| Durable lockout adds latency | Use D1 if adequate; use Durable Object only for singleton correctness. Keep error path fast and observable. |
| Redaction wrappers add complexity | Centralize sanitizers and test them with representative error/log payloads. |
| Broad e2e proof slows iteration | Use targeted unit/integration tests first; browser/provider proof only for claims static tests cannot prove. |

## Monitoring And Alerts

Implementation should add or verify dashboards/queries for:
- OAuth `state_mismatch` rate.
- Google sign-in error rate by sanitized code.
- Sign-out/session invalidation failures.
- Invite wrong-account/expired/revoked/accept failures.
- Publication password failed/locked counts.
- Authz denial spikes.
- Provider webhook verification failures.
- Redaction sanitizer drops.

## No-Claim Rule

Do not claim reliability or observability is production-ready until dashboards/queries or log searches have been run against the target runtime. Static planning only defines the event contract.
