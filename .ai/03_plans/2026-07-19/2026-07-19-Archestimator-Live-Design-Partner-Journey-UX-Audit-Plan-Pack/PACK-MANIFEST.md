# PACK-MANIFEST

Artifact registry for this plan pack. Each artifact's role, owner, freshness,
and traceability to requirements/evidence are recorded here. Machine-readable
hashes live in `plan-pack.json`.

## Markdown / canonical artifacts

| Path | Role | Owner | Freshness | Traces to |
|---|---|---|---|---|
| `00-PLAN.md` | canonical-execution | lead | HEAD b2a934919 | all UX-* requirements |
| `README.md` | narrative (short index) | lead | HEAD b2a934919 | — |
| `LOOP_LEDGER.md` | audit events + validator result | lead | append-only | — |
| `PACK-MANIFEST.md` | this registry | lead | HEAD b2a934919 | — |
| `units/README.md` | unit index | lead | HEAD b2a934919 | UNIT-001..UNIT-013 |
| `units/001-action-inbox-async-server-actions.md` | unit | lead | HEAD b2a934919 | UX-001, UNIT-001, EVID-001 |
| `units/002-closed-beta-lead-capture.md` | unit | lead | HEAD b2a934919 | UX-002, UNIT-002, EVID-003 |
| `units/003-landing-cta-unification.md` | unit | lead | HEAD b2a934919 | UX-003, UNIT-003, EVID-004 |
| `units/004-remove-ab-experiment-wrapper.md` | unit | lead | HEAD b2a934919 | UX-004, UNIT-004, EVID-004 |
| `units/005-first-estimate-checklist-publish.md` | unit | lead | HEAD b2a934919 | UX-005, UNIT-005, EVID-005 |
| `units/006-guided-sample-prominence.md` | unit | lead | HEAD b2a934919 | UX-006, UNIT-006, EVID-010 |
| `units/007-library-overview-orientation.md` | unit | lead | HEAD b2a934919 | UX-007, UNIT-007, EVID-006 |
| `units/008-magic-link-and-session-expiry-copy.md` | unit | lead | HEAD b2a934919 | UX-008, UNIT-008, EVID-007, EVID-013 |
| `units/009-xlsx-export-discoverability.md` | unit | lead | HEAD b2a934919 | UX-009, UNIT-009, EVID-011 |
| `units/010-invite-page-affordances.md` | unit | lead | HEAD b2a934919 | UX-010, UNIT-010, EVID-014 |
| `units/011-share-password-ux.md` | unit | lead | HEAD b2a934919 | UX-011, UNIT-011, EVID-012 |
| `units/012-landing-copy-ph-vocabulary.md` | unit | lead | HEAD b2a934919 | UX-012, UNIT-012, EVID-009, EVID-015 |
| `units/013-polish-batch.md` | unit | lead | HEAD b2a934919 | UX-013, UNIT-013, EVID-016..EVID-019 |

## Evidence artifacts

| Path | Role | Freshness | Traces to |
|---|---|---|---|
| `artifacts/browser-environment.json` | evidence (env) | HEAD b2a934919 | all BROWSER_CONFIRMED claims |
| `artifacts/build-failure-log.txt` | evidence (runtime) | HEAD b2a934919 | UX-BUILD-001, EVID-001 |
| `artifacts/dev-server-runtime-log.txt` | evidence (runtime) | HEAD b2a934919 | UX-BUILD-001, EVID-002 |
| `artifacts/workshop-500-response.html` | evidence (runtime) | HEAD b2a934919 | UX-BUILD-001 |
| `artifacts/findings.json` | evidence + register | HEAD b2a934919 | all UX-* findings |
| `artifacts/rejected-refuted-findings.json` | evidence | HEAD b2a934919 | 7 candidates |
| `artifacts/journey-coverage.csv` | evidence (matrix) | HEAD b2a934919 | J-01..J-09 |
| `artifacts/existing-pack-overlap-matrix.md` | evidence (matrix) | HEAD b2a934919 | all UX-* dispositions |
| `artifacts/ux-state-matrix.md` | evidence (matrix) | HEAD b2a934919 | J-01..J-09 × states |
| `artifacts/founder-rescue-ledger.md` | evidence (matrix) | HEAD b2a934919 | J-01..J-09 × founder cost |
| `artifacts/second-pass-challenge.md` | evidence (adversarial) | HEAD b2a934919 | UX-BUILD-001, UX-LEAD-001, UX-CTA-001, UX-CTA-002, UX-ACTIVATE-001, UX-EMPTY-001 |
| `artifacts/persona-fixture-register.md` | evidence (fixtures) | HEAD b2a934919 | P-DP-001..P-FO-001 |
| `artifacts/commands-run.log` | evidence (commands) | HEAD b2a934919 | all runtime claims |
| `artifacts/console-network-summary.json` | evidence (browser) | HEAD b2a934919 | UX-BUILD-001 browser signature |
| `artifacts/screenshots/INDEX.md` | evidence (index) | HEAD b2a934919 | zero screenshots (blocked) |

## Traceability summary

- Every CORE requirement (UX-001..UX-013) maps to exactly one unit and at least
  one evidence record.
- Every unit maps to one or more findings in `artifacts/findings.json`.
- Every Critical/High finding has an entry in
  `artifacts/second-pass-challenge.md` and a single owner in
  `artifacts/existing-pack-overlap-matrix.md`.
- The DAG is acyclic (validator-verified).

## What is deliberately not in the pack

- No cookies, tokens, magic links, OAuth state, or session storage.
- No real-user data, real client estimates, or real invitation recipients.
- No screenshots (blocked by `UX-BUILD-001`; documented in
  `artifacts/screenshots/INDEX.md`).
- No automated test runs (user-gated; TEST_PROPOSALs only).
- No product-source edits (pack is `PLAN_ONLY`).
