# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | Evidence-dir drift breaks commands (H1) | executor runs documented command verbatim | High | High | High | all phases | bundle gate "missing directory" | Phase 0 override convention | operator sets env var | forward code-fix DEC-002 | lead | low after Phase 0 | open (operator) |
| RISK-002 | Untwired scripts surprise executor (H2) | executor expects `bun run cf:…` alias | High | Medium | Medium | Phase 0/1/2 | module resolution error | Phase 0 doc | direct invocation | forward code-fix DEC-003 | lead | low after Phase 0 | open (operator) |
| RISK-003 | Filename drift misleads reviewer (H3) | reviewer sees `-fail-closed-proof.json` passing | Medium | Low | Low | Phase 1 | reviewer confusion | H3 doc | produce non-fail-closed name in P1-2/P1-3 | keep both filenames; doc explains | lead | low | open (doc) |
| RISK-004 | ClamD service unavailable | no reachable clamd | Medium | High | High | PROOF-REQ-004 | producer `skipped`/error | confirm service before P2-1 | declare BLOCKED-EXTERNAL | defer scanner gate | owner | gate stays fail-closed | external |
| RISK-005 | Alert webhook unavailable | endpoint/token missing or down | Medium | High | High | PROOF-REQ-005 | producer `skipped`/`delivered=false` | confirm endpoint before P2-2 | declare BLOCKED-EXTERNAL | defer alert gate | owner | gate stays fail-closed | external |
| RISK-006 | Secret leakage into artifact | producer bug or operator error | Low | Critical | High | all producer artifacts | sanitizer self-check false | sanitizers built in | do not commit if `secretRedacted=false` | invalidate artifact, fix producer | lead | low (sanitizer-enforced) | mitigated |
| RISK-007 | Storage path / customer data in observation | operator types real path | Medium | Critical | High | PROOF-REQ-006/007/008 | `pathSafe=false` | `pathSafeInput` sanitizer | re-author input | invalidate artifact | operator | low (sanitizer-enforced) | mitigated |
| RISK-008 | Stale deployment readback accepted | new deploy after readback | Medium | High | High | all hosted gates | `deploymentGap` stale | re-run P1-1 each closure | re-run readback | re-deploy + re-probe | lead | low | open (process) |
| RISK-009 | Backpressure exercise harms production | over-drive or wrong route | Low | Medium | Medium | PROOF-REQ-007 | user complaints / error spike | use test workspace + threshold | stop at 429 | admission recovers in 60s | operator | low | mitigated |
| RISK-010 | Origin impersonation (staging as prod) | executor points producer at non-prod | Low | High | Medium | PROOF-REQ-002/003 | bundle `baseUrl` check | require `www` base URL | independent reviewer | re-run at prod origin | reviewer | low | open (process) |
| RISK-011 | Bundle gate schema relaxed to force pass | executor edits gate | Low | Critical | High | closure verdict | diff review | gate is read-only convention | reviewer re-derives verdict | revert gate | reviewer | low | open (process) |
| RISK-012 | Two concurrent observation-track writes | P2-3/4/5 run in parallel | Low | Low | Low | observation artifacts | mtime check | serialize track C | last-write-wins (small JSON) | re-run producer | lead | negligible | mitigated |
| RISK-013 | Closure conflated with enabling uploads | stakeholder misreads green bundle | Low | High | Medium | owner decision | sign-off step | README explicit "closure ≠ enablement" | owner sign-off | owner re-confirms | owner | low | open (comms) |
| RISK-014 | Newer Cloudflare scripts never wired into bundle | convention split persists | High | Low | Medium | future closure | bundle still 8-gate | DEC-001 doc | re-wire later (out of scope) | keep bundle as-is | lead | medium (tech debt) | accepted |
| RISK-015 | emulated verification overclaims | no independent reviewer | Medium | Medium | Medium | readiness verdict | verification_mode label | cap at 97 / CONDITIONALLY READY | require reviewer sign-off in P3-3 | owner accepts | reviewer | low after P3-3 | open (process) |

## Risk summary

- **Critical/high risks (RISK-004, RISK-005, RISK-006, RISK-008, RISK-011):**
  - 004/005 are external (service availability); mitigated by honest fail-closed.
  - 006/011 are process controls (sanitizer + read-only gate + reviewer).
  - 008 is a process control (re-run readback each closure).
- **No unmitigated critical risk remains** under the planning-stage scope. The
  external risks (004/005) are accepted as the reason the pack is
  `CONDITIONALLY READY`.
