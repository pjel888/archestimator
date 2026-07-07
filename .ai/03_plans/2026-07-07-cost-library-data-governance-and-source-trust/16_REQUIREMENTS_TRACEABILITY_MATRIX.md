# 16 — Requirements Traceability Matrix

Every requirement traces source → outcome → phase → task → code → AC → test → rollout. No requirement untraced.

| Requirement ID | Source | User outcome | Phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| REQ-1/FR-1 provenance | brief + repo | every cost has provenance | P1,P3 | 002,005,007,014,018 | `quick-add-validation.ts`,`actions.ts`,`repository`,mig 0037 | AC-1.1..1.3 | quick-add-validation.test.ts (extend) | flag-on + perf | pending |
| REQ-2/FR-2 origin | brief + derived | owner/import distinction | P2 | 014,024 | `actions.ts`,`authz`,mig | AC-2.1..2.4 | origin-defaults-and-admin-set.test.ts | denial audit | pending |
| REQ-3/FR-3 review state | repo (Supabase) + brief | durable review states | P1 | 005,006,007 | mig 0037,`repository` | AC-3.1..3.4 | component-library-review-schema.test.ts | remote D1 apply | pending |
| REQ-4/FR-4 assign | repo + brief | reviewer accountability | P2 | 009 | `actions.ts`,`authz` | AC-4.1..4.3 | review-assign-cost-entry.test.ts | beta monitor | pending |
| REQ-5/FR-5 accept/reject/lock/supersede | repo + brief | privileged transitions w/ conflict guard | P2 | 010,011,012,013 | `actions.ts`,`authz` | AC-5.1..5.4 | accept/reject/lock/supersede-cost-entry.test.ts | conflict-rate monitor | pending |
| REQ-6/FR-6 audit | repo + brief | append-only trail | P1,P2 | 005,009..013 | mig 0037 (state-history),`actions.ts` | AC-6.1..6.3 | review-event-append-only.test.ts | audit query | pending |
| REQ-7/FR-7 chips | brief + repo | honest visual trust | P3 | 015,019 | `source-trust-model.ts`,`source-trust-chips.tsx` | AC-7.1..7.3 | library-source-trust.test.ts (extend) | a11y | pending |
| REQ-8/FR-8 gate | brief + repo | block untrusted commits | P3 | 016 | `source-trust-model.ts`,`use-estimate-row-handlers.ts` | AC-8.1..8.2 | library-source-trust.test.ts (extend) + handler test | telemetry on blocks | pending |
| REQ-9/SEC-1 authz | brief + repo | least privilege | P0 | 004 | `authz/d1-access.ts` | AC-9.1..9.4 | authz-cost-library-governance-admin.test.ts | denial audit | pending |
| REQ-10/FR-9 stale | brief + repo (G3) | live source-changed | P4 | 020,021,022 | `estimate-repository`,`source-trust-model.ts`,`actions.ts` | AC-10.1..10.3 | stale-propagation.test.ts | perf evaluator 2 | pending |
| REQ-11/FR-10 region/version | brief | region/version labels | P3,P6 | 018,030,033 | `source-trust-model.ts`,facet,drawer | AC-11.1..11.2 | region-version-labels.test.ts | facet test | pending (OPEN-2) |
| REQ-12/FR-11 freshness | repo + brief | consistency | P3,P5 | 015,019 | `source-trust-model.ts`,export | AC-12.1..12.2 | library-source-trust + export test | export metadata | pending |
| REQ-13/FR-12 import | brief (G4) | safe import | P5 | 024,025,028 | `import-export.ts`,`actions.ts` | AC-13.1..13.5 | library-import.test.ts | injection test | pending (OPEN-6) |
| REQ-14/FR-13 export | brief | audit portability | P5 | 026,027 | `import-export.ts` | AC-14.1..14.2 | library-export.test.ts | round-trip | pending |
| REQ-15/FR-14 inspector | brief + repo | honesty at point of use | P6 | 029 | `ComponentInspectorDock.tsx` | AC-15.1..15.2 | inspector-review-toolbar.test.tsx | a11y | pending |
| REQ-16/DATA-1 history | repo + DEC-3 | preserved/extended | P1 | 005,007 | mig 0037,`repository` | AC-16.1 | versioning-schema.test.ts (extend) | migration readback | pending |

## Performance-sensitive requirements (extra mapping)

| Requirement | Baseline | Target | Measurement | Regression | Rollback trigger |
|---|---|---|---|---|---|
| REQ-10 stale propagation | current estimate read p95 | ≤ baseline +5% | evaluator 2 (200-row estimate) | > +10% | fall back to non-computed `source-changed` |
| REQ-3/7 review-state in browse | current library browse p95 | ≤ baseline +10% | evaluator 1 (10k items) | > +15% | flag off review UI |
| REQ-3 overview count | n/a | ≤200ms @100k | EXPLAIN + manual | >500ms | denormalize via Cron |

Every implementation task in `11` maps to ≥1 requirement (see task `Requirement IDs` field). No orphan tasks.

## Coverage verification

- All 16 requirements traced. ✓
- All tasks (`TASK-001..038`) reference requirement IDs. ✓
- All AC objective + testable. ✓
- All shadow-path cells answered (`04`). ✓
- All DB changes have blueprint (`07`) + rollback (`13`). ✓
