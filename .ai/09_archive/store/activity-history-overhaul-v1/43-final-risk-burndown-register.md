# 43 — Final Risk Burndown Register

**Date:** 2026-06-02
**Status:** Seventh pass — final risk assessment with PR 8A/8B split
**Purpose:** Catalog all meaningful risks, current score impact, mitigation, owner, blocker status, and residual risk.

---

## Risk Register

| # | Risk | Current score impact | Mitigation | Owner | Blocks PR? | Residual risk |
|---|------|---------------------:|------------|-------|------------|---------------|
| R1 | PR 2 CSRF regression | -2% (PR 2 readiness) | Test all 3 fetch paths: Comments normal POST, Comments queue flush, Decision POST. Reference password form CSRF pattern. Create shared `createPublicationCsrfHeaders()` utility. Run full test suite after each fix. | Engineering | PR 2 | LOW — fix is well-understood, reference pattern exists in password form |
| R2 | Realtime filter change | -1% (PR 2 readiness) | Pass `publicationId` as prop. Test with and without publicationId. Verify no cross-publication event leakage. Filter all 3 tables: shared_link_comments, shared_link_responses, shared_link_events. | Engineering | PR 2 | LOW — fix is simple prop drilling + filter string change |
| R3 | event_type raw leakage | -1% (PR 2 readiness) | PR 2 should NOT expose event_type in public JSON response. Defer to composer integration (PR 5). Add TODO comment. Already documented in docs 31, 35, 38, 40. | Engineering | PR 5 | LOW — currently unused route, no client sees the data |
| R4 | Access telemetry side effects | -5% (Access telemetry) | Use new `recordProjectPublicationAnalyticsEvent()` for analytics-only stages. Reserve `recordProjectPublicationEvent("open")` for actual proposal views. Follow doc 36 side effects matrix exactly. | Engineering | PR 7 | LOW (after fix) — clear breakout between business-logic and analytics-only |
| R5 | PR 4 large-file regression | -1% (PRs 4-6) | PR 4 modifies EstimateSheetContent.tsx (>1500 lines). Risk of scope creep or regression. Keep composer integration minimal — replace inline copy with composer calls only. Preserve optimistic updates. | Engineering | PR 4 | LOW-MEDIUM — large file, but change is substitution not addition |
| R6 | PR 5 public route shape change | -1% (PRs 4-6) | Public activity GET route shape changes when composer integrates. Currently unused by production UI. Verify backward compatibility or document breaking change. | Engineering | PR 5 | LOW — route is currently unused |
| R7 | Stakeholder/legal gate delays | -10% (Access telemetry) | PR 7 cannot proceed without D-017, D-018, D-023 approved. **Mitigation: PR 8A can proceed independently after PRs 2-6** — pagination + Realtime hardening does not depend on PR 7. Gates cleared. PR 7 and PR 8B no longer blocked by approval dependencies. See doc 47. PR 9 (polish) can integrate either path. | Product/Legal | — | MITIGATED — Gates cleared by Owner/Product + Internal Privacy Approval (2026-06-02) |
| R8 | Test fragility | -1% (Test/QA) | CSRF tests may break if mock patterns change during PR 2. Keep mock updates minimal. Run full suite after each PR. Use test plan from doc 38. | Engineering | PR 2-6 | LOW — tests use standard patterns, mocks well-established |
| R9 | Old docs being followed accidentally | -2% (Document consistency) | Doc 39 source-of-truth index now authoritative. Superseded docs clearly marked (docs 04, 10, 22, 27, 30). Implementation handoff (doc 40) is the entry point. README updated with sixth-pass status. | Engineering | All PRs | LOW — authority hierarchy is explicit, implementation reads doc 40 first |
| R10 | Privacy notice not updated before production enablement | — | PR 7 implementation may proceed behind feature flag; production gate requires notice update | Product/Legal | PR 7 | LOW |
| R11 | NPCRS/DPO triage incomplete | — | Documented in doc 48 §6; can proceed with implementation while triage is pending | Product/Legal | — | LOW |
| R12 | Retention enforcement not implemented before telemetry enablement | — | PR 8B must implement retention path; operator cleanup procedure as fallback | Engineering | PR 8B | MEDIUM |
| R13 | Country provider header unavailable | — | Fallback to 'Location unavailable'; no external geo service call | Engineering | PR 7 | LOW |

---

## Risk Summary

| Severity | Count | Risks |
|----------|------:|-------|
| LOW | 10 | R1, R2, R3, R4, R6, R8, R9, R10, R11, R13 |
| LOW-MEDIUM | 1 | R5 |
| MEDIUM | 1 | R12 |
| MITIGATED | 1 | R7 |
| HIGH | 0 | — |
| CRITICAL | 0 | — |

No HIGH or CRITICAL risks. The only MEDIUM risk is retention enforcement before telemetry enablement (R12). R7 (stakeholder/legal gate delays) is now MITIGATED after Owner/Product + Internal Privacy Approval clearance (2026-06-02). R12 is an implementation dependency, not a planning failure.

---

## Risk Burndown by PR

| PR | Risks resolved |
|----|---------------|
| PR 1 (docs merge) | R9 (doc authority established) |
| PR 2 (preflight) | R1 (CSRF fix), R2 (Realtime fix), R3 (event_type guard) |
| PR 3 (composer) | — (test fragility mitigated) |
| PR 4 (estimate UI) | R5 (large file regression verified) |
| PR 5 (shared-link API) | R6 (route shape resolved — contract now explicit) |
| PR 7 (access telemetry) | R4 (side effects fix), R7 (gate resolved); risk now MEDIUM (privacy gates cleared, implementation risk remains) |
| PR 8A (pagination/Realtime) | — (independent, can proceed without PR 7) |
| PR 8B (telemetry hardening) | R7 (gate resolved); gated on PR 7 implementation only |
| PR 9 (polish) | R8 (full test stabilization) |

---

## Cross-References

- `42-98-100-readiness-scorecard.md` — Scoring that reflects these risks
- `44-final-plan-certification.md` — Sign-off document
- `37-final-blast-radius-and-rollback-map.md` — Per-PR blast radius with risk levels
- `36-access-telemetry-side-effects-audit.md` — R4 mitigation details
- `29-final-decision-log-and-approval-matrix.md` — R7 gate decisions
