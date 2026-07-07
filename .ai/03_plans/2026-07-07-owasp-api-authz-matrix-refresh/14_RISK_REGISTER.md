# 14 — Risk Register

| ID | Description | Trigger | Prob | Impact | Severity | Affected | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-SEC-01 | Invite CSRF via stripped headers | attacker POSTs to `/invite/<token>/accept` w/o Origin/Referer | Med | Med | HIGH | invite accept/sign-out | WP-01 test | fix fail-closed | SameSite=Lax + session | owner-defer doc | impl/owner | MED (until WP-01) | open |
| RISK-SEC-02 | D1/Worker quota exhaustion (no edge limit) | parallel attack | Med | High | HIGH (broad) / MED (beta) | all public/auth | dashboard | edge/WAF (owner) | app-level limits | rate-limit + degrade | owner | MED-HIGH | owner-gated |
| RISK-SEC-03 | Estimate mutation abuse | high-freq edits | Med | Med | MED | estimate mutations | telemetry | durable limit (WP-02) | in-memory (weak) | revert | impl | MED | open |
| RISK-SEC-04 | DO socket exhaustion | many upgrades | Low | Med | MED | collaboration | DO metrics | upgrade limit (WP-03) | per-message authz | disable realtime | impl | MED | open |
| RISK-SEC-05 | Refactor drops repo-layer auth | future refactor | Low | Low | LOW | recipient-proposals + audit | action-boundary auth (WP-07) | convention | test | revert | impl | LOW | open |
| RISK-SEC-06 | Oversized body DoS / validation gap | large JSON | Low | Low | LOW | share POSTs | body cap (WP-05) | pre-parse cap | post-parse clamp | revert | impl | LOW | open |
| RISK-SEC-07 | CSP weakness (unsafe-inline, RO) | XSS vector | Med | High | MED (broad) / LOW (beta) | all client routes | nonce pipeline (WP-08) | enforce CSP | CSP RO reporting | rollback CSP | owner | MED | owner-gated |
| RISK-DRIFT-01 | June audit treated as live | reviewer cites stale RLS framing | Med | Med | MED | docs | supersession pointer (WP-09) | README guardrail | this pack | doc fix | impl | LOW | open |
| RISK-EXT-01 | Hosted GitHub controls disabled | release gate | High | High | HIGH | release | re-enable CI/CodeQL/Dependabot/secret-scan | n/a | n/a | owner action | owner | HIGH | external |
| RISK-VER-01 | Emulated verification overstates readiness | single-author bias | Med | Med | MED | pack quality | independent review | cap at 97 / CONDITIONALLY READY | owner/independent review | re-audit | owner | MED | open |
| RISK-PROBE-01 | `canAccessProjectInD1` misused where `canAccessWholeProjectInD1` needed | refactor | Low | High | MED | estimate-only sheet-member leakage | static contract test | convention + tests | existing tests catch | revert | impl | LOW (tests guard) | mitigated |

## Non-technical risks
- **Owner decision load:** SEC-02/07/10/08 each need an owner call; bundling them into one
  review reduces round-trips.
- **Closed-beta pressure:** shipping fast may tempt skipping WP-02/03; the P0 bar holds
  them as launch-blockers because they are abuse surfaces exposed to external recipients.

## Conditions that would change a decision
- If the first external users are a tightly-vetted 3–5 people, SEC-02 (edge/WAF) could
  defer to broad launch without changing closed-beta readiness. Owner call.
- If estimate mutation volume is provably low in beta, WP-02 could move to P1 — but the
  in-memory limiter provides zero global protection, so the safer default is P0.
