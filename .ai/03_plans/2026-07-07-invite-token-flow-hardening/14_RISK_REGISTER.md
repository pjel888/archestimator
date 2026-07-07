# Risk Register

| Risk ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | SEC-01 origin tightening blocks legitimate accept/continue traffic (proxy stripping headers) | corporate proxy or browser config strips Origin+Referer on same-site POST | Medium | High (onboarding break) | **High** | accept, continue routes; onboarding | Workers Analytics 403-rate >1% | env kill switch `ARCHESTIMATOR_INVITE_ORIGIN_STRICT`; 24h preview monitoring | relax env (no redeploy); fall back to fail-open | monitor 403 rate 24h post-deploy | impl | accept-form-POST carries Origin (browsers always do); continue `<a>` risk mitigated by DISCOVERY (P1-T2) | Open until P1 monitoring |
| RISK-02 | SEC-02 breaks the signed-out Continue navigation | Continue CTA is `<a>` under `Referrer-Policy: no-referrer` → no Origin/Referer | Medium | Medium | **Medium** | continue route; J1 flow | continue 403 on legit click | DISCOVERY sub-step in P1-T2; switch CTA to form POST | revert continue origin guard | form-POST switch guarantees Origin | impl | low after DISCOVERY + form-POST | Open until P1-T2 DISCOVERY |
| RISK-03 | Revoke UI placement conflicts with concurrent publisher-panel work | another agent edits `src/components/workshop/publisher/*` concurrently | Low-Medium | Medium | **Medium** | publisher members panel | merge conflict | DISCOVERY in P3-T4; file-ownership ledger | coordinate; serialize edits | branch isolation | impl | low if coordinated | Open |
| RISK-04 | Migration `0038` DROP COLUMN unsupported on D1's SQLite | D1 SQLite < 3.35 | Low | Low | **Low** | rollback path | `cf:d1:read sqlite_version()` DISCOVERY | confirm version first | fix-forward (leave nullable column) | document column as harmless | impl | negligible | Open until DISCOVERY |
| RISK-05 | SEC-05 fail-closed breaks intended maintenance mode | owner disables `PROJECT_INVITE_ENTRY_ENABLED` for maintenance expecting graceful invite page | Low | Medium | **Low-Medium** | resolve/continue/accept | support reports | OPEN-SEC-02 owner confirmation | revert route short-circuits | document disabled state still renders | owner | low after OPEN-SEC-02 | Open until OPEN-SEC-02 |
| RISK-06 | SEC-09 realtime key rotation invalidates active collaboration sessions | existing realtime WebSockets drop on key change | High (certain) | Low (re-handshake) | **Low-Medium** | realtime rooms | user reports of room disconnect | coordinate rollout off-peak; OPEN-REL-02 | restore fallback; re-handshake is automatic | communicate to active users | owner | low (auto re-handshake) | Open until OPEN-REL-02 |
| RISK-07 | SEC-10 promotion-only breaks a caller relying on direct-grant overwrite | unknown caller uses `upsertProjectMemberInD1` for explicit downgrade | Low | Low | **Low** | direct-grant | grep callers (DISCOVERY P4-T1) | DISCOVERY confirms no such caller | revert CASE | use `updateProjectCollaboratorRole` for explicit changes | impl | negligible | Open until DISCOVERY |
| RISK-08 | Pepper separation leaves a deployed `REALTIME_IDENTITY_SIGNING_KEY` unset | env not provisioned before P5 deploy | Medium | Medium (realtime disabled) | **Medium** | realtime | realtime tests fail in prod | provision env first; P5 owner-gated | restore fallback | staged env rollout | owner | low if gated | Open |
| RISK-09 | Revoke action race with concurrent accept | user accepts in the same window manager revokes | Low | Low | **Low** | revoke, accept | unit test | batched UPDATE; `WHERE lifecycle_state='pending'` guard; `WHERE used_at IS NULL` on tokens | accept wins → revoke returns already-terminal | none needed | impl | negligible (both safe) | Open |
| RISK-10 | Raw token accidentally logged in new revoke code | developer adds a console.log with the token | Low | High (token leak) | **Medium** | revoke action | rg scan (P6-T2) | code review; existing redaction convention | remove log; rotate affected tokens via re-issue | SEC-06 grep gate | impl | low with review gate | Open until P6 |
| RISK-11 | Over-blocking non-browser clients (curl scripts, API integrations) using invite accept | scripted accept with no Origin | Low | Low | **Low** | accept route | support reports | invite accept is browser-form-designed; document | env kill switch | none (not a supported flow) | impl | negligible | Open |
| RISK-12 | Concurrent-agent file collision in `actions.ts` across P3-T3 + P4-T1 | two phases edit the same file | Medium | Low | **Low-Medium** | actions.ts | merge conflict | serialize P3/P4 on actions.ts; file-ownership ledger | coordinate | branch isolation | impl | low if serialized | Open |

## Severity legend
- **High:** onboarding/membership break or token leak.
- **Medium-High / Medium:** security control weakening or feature break with workaround.
- **Low-Medium / Low:** hygiene, cleanliness, or low-probability edge.

## Top risks to watch
1. **RISK-01** (P1 over-blocking) — the highest-impact risk; mitigated by env kill switch + 24h monitoring.
2. **RISK-02** (continue CTA mechanism) — mitigated by DISCOVERY + form-POST.
3. **RISK-10** (token leak in new code) — mitigated by code review + rg gate.

No unmitigated **High** risk remains after the controls are in place.
