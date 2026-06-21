# Shared-Link Runbook Snapshot Summary

Date: 2026-06-22
Scope: archive-readiness evidence for `.ai/03_plans/2026-06-20-Shared-Link-Feature`
Supabase project: `ebxxqidacheyapmmzavr`

## Verdict

**PASS / ARCHIVE-READY.** The shared-link source/provider slice is green for closed-beta archive readiness. The full current-preview §6 smoke matrix now passes, and the unrelated global migration drift plus provider lint/advisor baseline issues are explicitly waived for archive by the scoped owner/DBA waiver.

This is not a production deploy sign-off.

## Green Evidence

- Current preview inspect passed: `vercel-inspect-qwzc7517y.txt` shows deployment `dpl_8tpYp3UeoUfkiezuZYuDp5FhHYKu`, target `preview`, status `Ready`, URL `https://archestimator-qwzc7517y-philipjonlewis-projects.vercel.app`.
- Core shared-link migrations are Local+Remote in `migration-list-linked.txt`: `20260620064601`, `20260620142000`, `20260621042221`, and `20260621051701`.
- `live-policies.json` confirms manager/service-role policies for the shared-link publication tables, including manager read on `project_publication_events`.
- `live-rpc-grants.json` confirms `insert_client_comment`, `submit_client_response`, `rotate_project_publication_credentials`, `replace_project_publication`, and `reserve_security_rate_limit_slot` are `security_definer`, service-role executable, and not executable by `anon` or `authenticated`.
- `live-indexes.json` and `schema-migrations-remote.json` are captured for drift review.
- Performance evidence closes the stale perf gates:
  - PERF-01A: hosted recipient-link p95 `1622.11 ms` vs `2500 ms` budget in `../perf-archive-readiness-2026-06-21/hosted-recipient-activity-summary.md`.
  - PERF-04: provider activity query p95 `4.47 ms` vs `1200 ms` budget in `../perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md`.
  - PERF-09: hosted password route p95 `2327.11 ms` vs `2500 ms` budget in `../perf-hosted-password-route-2026-06-21/hosted-password-route-summary.md`.
  - PERF-12: provider rotate p95 `67.36/68.42/143.29 ms` for `10/100/1000` recipients in `../perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md`.
- QA-G06 provider race proof passed in `../provider-race/duplicate-decision-race-http-2026-06-21.md`.
- Current-preview §6 smoke passed on `https://archestimator-qwzc7517y-philipjonlewis-projects.vercel.app` in `../current-preview-smoke-2026-06-22/current-preview-section-6-smoke-summary.md`: 6.1 open link 200/rendered fixture text, 6.2 password wrong 401/correct 204, 6.3 stale comment 409, 6.4 stale decision 409, 6.5 activity route 200, 6.6 recipient session cookies set, cleanup counts all 0.
- Owner/DBA waiver captured in `owner-dba-drift-advisor-waiver-2026-06-22.md`.

## Scoped Provider Baseline Debt

- `migration-list-linked.txt` still shows unrelated global drift. Local-only versions include `20260520100459`, `20260605123000`, `20260605131500`, `20260611182000`, `20260614170000`, `20260615093649`, `20260615145915`, `20260615150229`, `20260616094500`, `20260616180000`, `20260617090000`, `20260617210000`, `20260618184856`, `20260621120000`, `20260621122125`, and `20260621133000`. Remote-only versions include `20260621105407` and `20260621112542`.
- `db-lint-linked-warning.txt` has provider baseline errors outside the shared-link hot path, including missing temporary-copy-map relations in estimate template/tab/subtree functions and an ambiguous `correlation_id` reference in estimate restore code. The shared-link function `submit_client_response` has only an unused-parameter warning for `p_signature_intent_hash`.
- Supabase CLI advisor JSON capture failed closed in this pass; `advisors-security.json` and `advisors-performance.json` are empty because the CLI hit provider auth/pooler failures. A connector-based advisor read was reachable, but it exposed existing security WARN and performance INFO baselines rather than a clean provider state.

These items remain provider-debt baseline. They are not hidden clean-state evidence and are not shared-link archive blockers under the 2026-06-22 owner/DBA waiver.

## Archive Decision

Archive the plan folder after final local verification passes. The narrower owner/DBA waiver accepts unrelated global provider drift/advisor baseline as outside this shared-link archive scope, and the remaining current-preview smoke evidence has been captured.
