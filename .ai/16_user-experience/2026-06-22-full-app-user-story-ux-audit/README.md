# Full App User Story And UX Audit

Date: 2026-06-22

This folder is the canonical user-experience audit pack for the Archestimator app.

## Canonical Spreadsheet

- `canonical-feature-status.csv` is the single canonical spreadsheet for feature status, user stories, expected behavior, current testing status, current UX/logistical errors, best fixes, and post-fix scenarios.
- Second pass expanded the spreadsheet to 22 columns and 93 rows. New columns separate persona group, coverage class, evidence status, targeted verification, external proof needed, issue IDs, and row impact severity so "related tests exist" is not confused with full user-story proof.
- New second-pass rows cover underrepresented estimator, contractor, field operator, project manager, business owner, client recipient, supplier/vendor/cost-source, support, legal/privacy, provider readiness, monitoring, and launch-operations personas.
- The CSV is intentionally the only spreadsheet-like tracker in this pack. Agent reports under `../agent-reports/` are raw evidence, not status trackers.

## Read This First

- `00-readiness-scorecard.md` rates the packet using **Rubric B** (planning-complete + independently re-verified + residuals named). A 2026-06-22 independent 7-lens re-audit found the prior self-awarded 100/100/100 was inflated (re-audited to ~81/73/68); this pass records that re-audit, fixes every gap, and reports a two-axis rating (planning-readiness 100; evidence-verified ~0% executed this pass — all 93 rows are honestly named residuals requiring execution, not planning). It is the entry point.
- `01-beta-product-thesis-and-prioritization.md` defines the beta outcome hierarchy, golden path, persona priority, issue tiers, and MVP-vs-later posture.
- `02-implementation-decomposition.md` maps every `UX-*` issue to implementation units, owner lanes, scope posture, and verification.
- `03-sequencing-dependencies-and-conflicts.md` defines phase order, dependencies, conflict groups, rollback/fallback expectations, and CSV status update ownership.
- `04-ux-state-accessibility-and-content-contracts.md` defines information architecture, state matrices, responsive/a11y requirements, content contracts, and visual QA expectations.
- `05-security-data-and-provider-blast-radius.md` defines trust boundaries, authz/RLS proof expectations, data classification, provider boundaries, abuse cases, and blast-radius checks.
- `06-verification-matrix-and-proof-runbook.md` maps every `TV-*` ID to runnable commands or documented future proof surfaces, browser/provider gates, artifacts, and pass/fail rules.
- `07-agent-execution-brief.md` is the handoff brief for future coding agents.
- `08-csv-schema-and-validation-contract.md` defines controlled CSV vocabulary and validation commands.
- `09-decision-ledger.md` records the decision-gated work items, current MVP posture, guardrails, and stop/go status.
- `10-access-path-and-persona-taxonomy.md` defines canonical access paths and product personas, including the corrected `Primary App User` naming.
- `11-access-path-rbac-ux-review.md` applies the taxonomy to RBAC, UX/UI, and `UX-031` contractor/builder and field-operator workflow risks.
- `12-keystone-code-binding-and-drift-protection.md` is the single authoritative binding of every numeric anchor, cited path, script, migration, and provider ID to real code, plus the 5th drift-guard validator and the recurring binding-integrity sweep.
- `13-performance-engagement-and-observability.md` binds the plan to the repo's known performance root causes, defines numeric budgets, the per-surface perf-risk handoff, and the outcome-metric instrumentation plan.
- `14-security-primitive-and-rls-binding.md` fills the authz/RLS matrix per high-risk surface and binds the real security primitives (HMAC/AES-256-GCM/scrypt/timingSafeEqual/svix/submit_client_response), the rate-limit truth table, and the redaction surface.

## Supporting Documents

- `ux-logistical-errors-and-fixes.md` documents the UX and logistical errors found from source/test review, with the best fix and post-fix scenario for each issue.
- `post-fix-scenario-tests.md` translates the issue log into post-fix retest scenarios and explains what would prove each fix worked.
- `testing-loop-and-validation.md` records the testing loop, automation evidence, validation commands, and known gaps.
- `second-pass-persona-use-case-manifest.md` summarizes the persona matrix, added story IDs, and targeted verification IDs used by the expanded CSV.
- The `00` through `11` planning documents are the implementation-readiness layer over the original audit inventory.

## Evidence Inputs

The synthesis used these independent agent reports:

- `../agent-reports/route-navigation-inventory.md`
- `../agent-reports/workshop-estimates-user-stories.md`
- `../agent-reports/auth-account-notifications-user-stories.md`
- `../agent-reports/publication-proposal-ai-user-stories.md`
- `../agent-reports/test-coverage-and-error-map.md`
- `../agent-reports/ux-logistical-risk-audit.md`
- `../agent-reports/second-pass/route-feature-coverage-review.md`
- `../agent-reports/second-pass/csv-evidence-quality-review.md`
- `../agent-reports/second-pass/test-loop-completeness-review.md`
- `../agent-reports/second-pass/ux-issue-completeness-review.md`
- `../agent-reports/second-pass/personas/estimator-contractor-use-cases.md`
- `../agent-reports/second-pass/personas/client-recipient-use-cases.md`
- `../agent-reports/second-pass/personas/supplier-vendor-use-cases.md`
- `../agent-reports/second-pass/personas/admin-support-operator-use-cases.md`

## Scope Notes

- Coverage is feature-level and user-behavior-level across public site, auth, workshop shell, projects, estimates, library, collaboration, publication/share links, proposal export, charts/data/location, AI, notifications, feedback, settings/admin, and operational readiness surfaces.
- Second-pass coverage is persona-level where the first pass was too feature-centric. The canonical CSV now distinguishes core implemented stories from route/API coverage gaps, evidence-quality gaps, and underrepresented actor stories.
- Expected behavior is based on current code and existing tests, not a product wish list.
- Browser automation was not run for this documentation pass because the app state records broad `bun run validate` and all-DOM runs as red/hanging. The pack separates source/test-mapped evidence from live-browser/provider proof.
- The implementation-readiness layer does not claim code changes are complete. It makes the plan safe for future code execution by defining priorities, ownership, state contracts, blast radius, and proof gates.
