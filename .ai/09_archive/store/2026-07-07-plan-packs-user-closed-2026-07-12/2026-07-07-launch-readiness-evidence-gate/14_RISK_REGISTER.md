# 14 — Risk Register

| Risk ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-LG-01 | False GO (gate passes when it should fail) | forged/stale artifact or missing domain silently passed | Low | Critical | Critical | launch decision | adversarial tests; owner audit | freshness TTL; producer pinning; missing-evidence=NO-GO for Hard | manual verify before launch; rollback gate | artifact signing (future) | owner | Medium (signing not in MVP) | open |
| RISK-LG-02 | Conflicting anchor verdicts | release-gates pass vs hosted fail | Medium | Medium | Medium | status accuracy | conflict surfaced in report | precedence rule (06 §7) | pessimistic verdict wins | owner judgment | executor | Low | open |
| RISK-LG-03 | Domain drift | new sibling pack, gate not updated | Medium | Medium | Medium | coverage completeness | CI check for unregistered sibling packs | registry is single source | add CI lint | manual review | executor | Low | open |
| RISK-LG-04 | Aggregator logic bug | classifier misclassifies | Low | High | High | status accuracy | unit tests | per-transition tests; adversarial matrix | rollback gate | n/a | executor | Low | open |
| RISK-LG-05 | Forged artifact | internal agent hand-writes pass JSON | Low | Critical | High | launch decision | producer pinning + freshness | none in MVP | manual verify | artifact signing | owner | Medium | open |
| RISK-LG-06 | Wall-clock budget exceeded | slow anchor | Medium | Low | Low | CI UX | perf test | per-anchor timeout; parallel exec | cap stages | skip slow anchor (advisory) | executor | Low | open |
| RISK-LG-07 | CI re-enable side effects | relocating workflows | Medium | Medium | Medium | shared worktree | CI run | owner-gated (OPEN-LG-05) | advisory first | disable workflow | owner | Medium | open |
| RISK-LG-08 | Hosted security 403/404 unresolved | CodeQL/Dependabot/secret-scan stay disabled | High | Medium | Medium | security posture | gh api probe | surface as advisory | manual security review | owner resolves (OPEN-LG-06) | owner | Medium | open |
| RISK-LG-09 | TTL too tight → false NO-GO | valid artifact slightly old | Medium | Low | Low | productivity | owner feedback | conservative defaults; configurable | --allow-stale | tune TTL | owner | Low | open |
| RISK-LG-10 | Owner overuses --allow-missing | beta pressure | Medium | High | High | launch decision | report records skips | status caps; recorded reasons | owner judgment | require review | owner | Medium | open |
| RISK-LG-11 | Verification mode emulated | no independent reviewer | Certain (this session) | Medium | Medium | readiness claim | n/a | n/a | cap at CONDITIONALLY READY | independent review later | owner/reviewer | Medium | open |
| RISK-LG-12 | Stale NO-GO verdict trusted | owner reads old current-state.md | Medium | Medium | Medium | decision | gate re-derives from artifacts | freshness TTL; report cites sources | n/a | n/a | owner | Low | open |

**Unmitigated critical risks:** none (RISK-LG-01/05 mitigated to Medium residual via freshness + manual verify; full artifact signing deferred). All High-severity risks have mitigations.
