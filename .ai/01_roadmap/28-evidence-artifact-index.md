# Evidence Artifact Index

**Last updated:** 2026-06-02
**Rule:** A roadmap item cannot move to DONE unless it has: evidence artifact path, validation output, screenshots or trace where relevant, performance evidence if feature touches critical path, security evidence if feature touches auth/data/storage/share/API, UX evidence if feature is user-facing, owner signoff if launch decision changes.

## Current MVP Launch Evidence Handoff

The MVP launch-readiness local implementation lane is frozen at `6ab5b38`; docs/status/contract guard evidence is pushed through `bdf9b03`. Closed beta remains **NO-GO** until the external/provider/manual evidence packet is completed.

Use these active artifacts for the next pass:

- `.ai/03_plans/mvp-launch-readiness-2026-06-01/46-manual-proof-matrix.md`
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/47-goal-completion-audit.md`
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/48-manual-proof-packet-template.md`
- `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/`

Archive cleanup folder: `.ai/09_archive/store/mvp-launch-readiness-2026-06-01/`.

## Directory Structure

Save all evidence under `.ai/09_archive/store/` using this pattern:

```
.ai/09_archive/store/YYYY-MM-DD-[goal-id]/
  00-summary.md              — What was done, by whom, when
  01-validation-output.md    — Test output, CLI results
  02-screenshots-or-links.md — Visual evidence or URLs
  03-performance-baseline.md — Lighthouse, traces, bundle reports
  04-security-notes.md       — RLS test results, auth audit
  05-ux-notes.md             — User test observations, comprehension results
  06-regression-notes.md     — What regressed, accepted risks
```

## Artifact Categories

Evidence artifacts are classified by category for filtering and prioritization:

| Category | Purpose | Required For |
|---|---|---|
| `beta-evidence` | Evidence required for controlled beta go/no-go | All BETA-P0 goal cards |
| `enterprise-mvp-evidence` | Evidence required for enterprise MVP go/no-go | All ENTERPRISE-P1 goal cards |
| `public-launch-evidence` | Evidence required for public launch go/no-go | All PUBLIC-P0 goal cards |
| `user-research-evidence` | Beta user testing observations, comprehension results | BETA-P0-UX-* cards |
| `security-evidence` | RLS denial tests, storage denial tests, auth audits, secrets scans, PII scrub verification | BETA-P0-SEC-* cards |
| `performance-evidence` | Lighthouse reports, bundle analyzer, performance traces, instrumentation latency checks | BETA-P0-PERF-*, ENTERPRISE-P1-PROD-* cards |
| `legal-evidence` | Published legal pages, subprocessor lists, DSAR workflow evidence | PUBLIC-P0-LEGAL-* cards |
| `ops-evidence` | Sentry dashboards, support runbook drills, rollback drill notes, rate limiting proof | BETA-P0-OBS-001, BETA-P0-SEC-005, BETA-P0-OPS-001 |
| `collaboration-evidence` | Invite config proof, env var inventory, POST-only accept proof, lifecycle E2E, visibility signifiers | HUMAN-P0-COLLAB-001A, CODEX-P0-COLLAB-*, CODEX-P1-COLLAB-* |
| `sharing-evidence` | Shared-link visibility badges, recipient tracking, digest sender fix, destructive confirmation | CODEX-P1-SHARE-* |
| `database-performance-evidence` | Supabase advisor output, existing index inventory, unindexed FK classification, pg_stat_statements snapshot, EXPLAIN plans, migration parity report, candidate index rationale, rollback/drop plan | CODEX-P0-DBIDX-*, CODEX-P1-DBIDX-* |

## Evidence Types

| Type | File | Description | Example |
|---|---|---|---|
| Test output | `01-validation-output.md` | CLI output from `bun run test`, `bun run validate`, etc. | Terminal output showing all tests passing |
| Typecheck/lint/build | `01-validation-output.md` | Output from `bun run type-check`, `bun run lint`, `bun run build` | "0 errors, 0 warnings" |
| Playwright output | `01-validation-output.md` | E2E test results, screenshots from failed tests | `bun run test:e2e` output |
| Screenshots | `02-screenshots-or-links.md` | Screenshots of UI changes, dashboard proof | Login page, estimate sheet, error page |
| Lighthouse report | `03-performance-baseline.md` | JSON or summary of Lighthouse audit | LCP: 1.8s, TBT: 150ms |
| Performance traces | `03-performance-baseline.md` | Chrome DevTools Performance tab export | Route transition timing |
| Bundle analyzer | `03-performance-baseline.md` | Bundle analyzer output or screenshot | Main chunk: 180KB gzipped |
| RLS denial test result | `04-security-notes.md` | Test output proving cross-workspace denial | "user_b_read_workspace_a: DENIED (expected)" |
| Storage denial test result | `04-security-notes.md` | Test output proving cross-workspace storage denial | "user_b_download_workspace_a_file: 403" |
| API auth audit | `04-security-notes.md` | Checklist of all routes with auth verification | "/api/ai/ask: getSession() ✓" |
| Secrets scan result | `04-security-notes.md` | CI output showing credential block | "commit blocked: SUPABASE_SERVICE_ROLE_KEY found" |
| Rate limiting proof | `04-security-notes.md` | Test output showing rate limiting active (Redis/Upstash) | "429 returned after 5 requests in 1s: PASS" |
| Turnstile integration proof | `04-security-notes.md` | Screenshot of Turnstile on login/auth forms | "Turnstile widget rendered on /login" |
| PII scrub verification | `04-security-notes.md` | Review of Sentry/log output — no PII | "Sentry payload reviewed: no emails, names, or tokens" |
| Analytics setup proof | `02-screenshots-or-links.md` | Dashboard screenshot of first-party analytics active | "Analytics dashboard: pageviews captured" |
| Support channel proof | `02-screenshots-or-links.md` | Screenshot of support channel configured | "Support email/Zendesk/Discord configured" |
| Desktop guard proof | `02-screenshots-or-links.md` | Screenshot of mobile guard on workshop routes | "Mobile viewport shows desktop-only message" |
| Supabase/Vercel screenshots | `02-screenshots-or-links.md` | Redacted screenshots of provider dashboards | Staging Supabase project list |
| Owner decision record | `00-summary.md` | Philip's written answers to decisions | "D-015: Yes, create separate staging" |
| Beta user observation | `05-ux-notes.md` | Notes from beta user testing sessions | "User spent 30s looking for export button" |
| Rollback drill notes | `06-regression-notes.md` | Notes from rollback exercise | "Rollback completed in 3m 45s" |
| Support runbook drill notes | `04-security-notes.md` | Notes from runbook drill execution | "AUTH-001 drill: 5m to detect, 2m to respond" |

## Goal Card → Evidence Mapping

| Goal ID | Required Evidence | Category |
|---|---|---|
| BETA-P0-DEC-001 | Owner decision record (00-summary.md) | beta-evidence |
| BETA-P0-INF-001 | Supabase screenshots, Vercel screenshots, env var inventory (01, 02) | beta-evidence |
| BETA-P0-SEC-001 | RLS denial test output (01, 04) | security-evidence |
| BETA-P0-SEC-002 | Storage denial test output (01, 04) | security-evidence |
| BETA-P0-SEC-003 | API auth audit checklist + test output (01, 04) | security-evidence |
| BETA-P0-SEC-004 | Secrets scan CI output, service-role verification (01, 04) | security-evidence |
| BETA-P0-SEC-005 | Rate limiting test output (Redis/Upstash), 429 proof (01, 04) | security-evidence, ops-evidence |
| BETA-P1-SEC-006 | Turnstile integration screenshot, CAPTCHA test output (01, 02, 04) | security-evidence |
| BETA-P0-OBS-001 | Sentry dashboard screenshots, error capture proof (02, 04) | ops-evidence |
| BETA-P0-ANA-001 | Analytics dashboard screenshot, pageview capture proof (02, 04) | ops-evidence |
| BETA-P0-OPS-001 | Support channel setup proof, incident owner assignment, rollback authority documented (00, 02, 04) | ops-evidence |
| BETA-P0-LEGAL-001 | Beta legal pack: privacy notice draft, beta terms, subprocessor list (00, 02) | legal-evidence |
| BETA-P0-PERF-001 | Lighthouse reports, performance traces (03) | performance-evidence |
| BETA-P0-PERF-002 | Bundle analyzer screenshots, build output (03) | performance-evidence |
| BETA-P0-UX-001 | Onboarding screenshots, empty-state screenshots (02, 05) | user-research-evidence |
| BETA-P0-UX-002 | Estimate editing screenshots, design-system lint output (02, 05) | user-research-evidence |
| BETA-P0-UX-003 | Shared receiver screenshots, comprehension test notes (02, 05) | user-research-evidence |
| BETA-P0-UX-004 | Desktop guard screenshot, mobile posture proof (02, 05) | user-research-evidence |
| BETA-P0-REL-001 | Error page screenshots, mobile guard screenshot (02, 05) | beta-evidence |
| BETA-P0-AI-001 | AI safety test output, disclaimer screenshots (02, 04) | security-evidence |
| BETA-P0-BETA-001 | Beta checklist, risk register, kickoff script, signoff (00, 02, 04, 05) | beta-evidence |
| ENTERPRISE-P1-PROD-001 | Snapshot generation proof: non-blocking, PII scrub, editor responsiveness (01, 03, 04) | enterprise-mvp-evidence, performance-evidence |
| ENTERPRISE-P1-PROD-002 | PDF generation proof: lazy-loaded or server-generated, <10s for normal proposal (01, 02, 03) | enterprise-mvp-evidence, performance-evidence |
| PUBLIC-P0-LEGAL-001 | Published legal page screenshots, list (02) | public-launch-evidence, legal-evidence |
| POST-BETA-PROD-001 | Owner decision record (00) | public-launch-evidence |
| POST-BETA-MOBILE-001 | Owner decision record (00) | public-launch-evidence |
| CODEX-P0-DBIDX-001 | Repo-derived query map, migration-derived index inventory, existing index inventory from migrations and/or live schema, Supabase advisor output (if available), corrected unindexed FK query output (if live DB access exists), pg_stat_statements snapshot (if available), explicit "live metrics unavailable" note (if DB access unavailable), no-DDL confirmation | database-performance-evidence |
| CODEX-P0-DBIDX-002 | Local migration list, live/staging schema table list (if available), supabase_migrations.schema_migrations snapshot (if available), shared-link table parity report (shared_link_recipients, shared_link_comments, shared_link_responses, shared_link_events), blocker report for missing migration/table, no-schema-change confirmation | database-performance-evidence |
| CODEX-P0-DBIDX-003 | Concrete EXPLAIN templates, representative seed-size assumptions, before-index EXPLAIN baselines (if staging available), seed-size limitation note (if staging data too small), no-DDL confirmation, no-index-created confirmation | database-performance-evidence |
| CODEX-P1-DBIDX-004 | Completed DBIDX-001/002/003 evidence links, Philip owner approval of candidate shortlist, candidate index rationale table, duplicate-index analysis table, draft migration saved inside plan folder (not supabase/migrations/), rollback/drop-index section, no-production-application confirmation | database-performance-evidence |
| CODEX-P1-DBIDX-005 | Approved server-side search decision, search use-case list, pg_trgm vs tsvector decision, no-vector/RAG-index confirmation unless separately approved, no-index-created confirmation | database-performance-evidence |

## Evidence Quality Standards

Evidence is VALID only when:

1. **Reproducible.** Another person can follow the same steps and get the same result.
2. **Timestamped.** Evidence includes date and time of capture.
3. **Redacted.** No secrets, tokens, keys, emails, or user PII in evidence files.
4. **Specific.** "Tests pass" is not evidence. The test output is evidence.
5. **Fresh.** Evidence older than 30 days is stale and must be regenerated.

## How to Save Evidence

When completing a Codex goal:

```bash
# 1. Create the evidence directory
mkdir -p .ai/09_archive/store/$(date +%Y-%m-%d)-BETA-P0-SEC-001/

# 2. Save test output
bun run test tests/integration/rls-isolation.test.ts > .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001/01-validation-output.md

# 3. Save screenshots (manual, using Playwright or browser)
# Save to: .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001/02-screenshots-or-links.md

# 4. Write summary
# Create: .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001/00-summary.md
```

## Evidence Status Dashboard

| Goal ID | Evidence Path Exists? | Evidence Valid? | Category | Status |
|---|---|---|---|---|
| BETA-P0-DEC-001 | No | No | beta-evidence | BLOCKED |
| BETA-P0-INF-001 | No | No | beta-evidence | BLOCKED |
| BETA-P0-SEC-001 | No | No | security-evidence | BLOCKED |
| BETA-P0-SEC-002 | No | No | security-evidence | BLOCKED |
| BETA-P0-SEC-003 | No | No | security-evidence | BLOCKED |
| BETA-P0-SEC-004 | No | No | security-evidence | BLOCKED |
| BETA-P0-SEC-005 | No | No | security-evidence, ops-evidence | BLOCKED |
| BETA-P1-SEC-006 | No | No | security-evidence | BLOCKED |
| BETA-P0-OBS-001 | No | No | ops-evidence | BLOCKED |
| BETA-P0-ANA-001 | No | No | ops-evidence | BLOCKED |
| BETA-P0-OPS-001 | No | No | ops-evidence | BLOCKED |
| BETA-P0-LEGAL-001 | No | No | legal-evidence | BLOCKED |
| BETA-P0-PERF-001 | Partial | No | performance-evidence | NOT COMPLETE / MANUAL CHROME BFCACHE + REACT PROFILER PROOF OPEN |
| BETA-P0-PERF-002 | Partial | No | performance-evidence | TRUE WEBPACK ANALYZER CAPTURED / STILL NOT A BETA DONE PACK |
| BETA-P0-UX-001 | No | No | user-research-evidence | BLOCKED |
| BETA-P0-UX-002 | No | No | user-research-evidence | BLOCKED |
| BETA-P0-UX-003 | No | No | user-research-evidence | BLOCKED |
| BETA-P0-UX-004 | No | No | user-research-evidence | BLOCKED |
| BETA-P0-REL-001 | No | No | beta-evidence | BLOCKED |
| BETA-P0-AI-001 | No | No | security-evidence | BLOCKED |
| BETA-P0-BETA-001 | No | No | beta-evidence | BLOCKED |
| ENTERPRISE-P1-PROD-001 | No | No | enterprise-mvp-evidence, performance-evidence | PLANNED |
| ENTERPRISE-P1-PROD-002 | No | No | enterprise-mvp-evidence, performance-evidence | PLANNED |
| PUBLIC-P0-LEGAL-001 | No | No | public-launch-evidence, legal-evidence | BLOCKED |
| POST-BETA-PROD-001 | No | No | public-launch-evidence | PLANNED |
| POST-BETA-MOBILE-001 | No | No | public-launch-evidence | PLANNED |
| HUMAN-P0-COLLAB-001A | No | No | beta-evidence | BLOCKED — Supabase Auth dashboard/provider proof still needed |
| CODEX-P0-COLLAB-001B | Partial | No | beta-evidence | LOCAL ENV AUDIT DONE / TARGET PROVIDER ENV PROOF OPEN |
| CODEX-P0-COLLAB-002 | Partial | No | security-evidence | IMPLEMENTED LOCALLY / REAL INVITE SMOKE OPEN |
| CODEX-P0-COLLAB-003 | No | No | beta-evidence | BLOCKED — real email/provider invite lifecycle smoke still needed |
| CODEX-P0-COLLAB-004 | Partial | No | beta-evidence | IMPLEMENTED LOCALLY / PROVIDER DELIVERY PROOF OPEN |
| CODEX-P1-COLLAB-005 | Partial | No | user-research-evidence | IMPLEMENTED LOCALLY / REAL INVITEE SMOKE OPEN |
| CODEX-P1-SHARE-001 | Partial | No | user-research-evidence | IMPLEMENTED LOCALLY / OWNER ACCEPTANCE PROOF OPEN |
| CODEX-P1-SHARE-002 | Partial | No | user-research-evidence | IMPLEMENTED LOCALLY / REAL RECIPIENT EMAIL PROOF OPEN |
| CODEX-P1-SHARE-003 | Partial | No | user-research-evidence | IMPLEMENTED LOCALLY / RESEND DASHBOARD WEBHOOK PROOF OPEN |
| CODEX-P1-SHARE-004 | Partial | No | user-research-evidence | IMPLEMENTED LOCALLY / OWNER ACCEPTANCE PROOF OPEN |
| CODEX-P0-DBIDX-001 | No | No | database-performance-evidence | READY — repo-only audit can start; live metrics gated |
| CODEX-P0-DBIDX-002 | No | No | database-performance-evidence | BLOCKED — staging/read-only DB access required |
| CODEX-P0-DBIDX-003 | No | No | database-performance-evidence | BLOCKED — staging + representative seed data required |
| CODEX-P1-DBIDX-004 | No | No | database-performance-evidence | PLANNED — requires DBIDX-001/002/003 + owner approval |
| CODEX-P1-DBIDX-005 | No | No | database-performance-evidence | PLANNED — server-side search not approved |

**Evidence status note:** BETA-P0-PERF-001 now has partial route-transition evidence under `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/` plus 2026-06-01 refresh folders for production-auth perf, Lighthouse/analyzer, sidebar hover-prefetch, and public bfcache cache-control mitigation. It is still not complete and must not be marked DONE or archived because manual Chrome bfcache DevTools persisted-restore proof and production Chrome React Profiler proof are still missing. Share/collaboration cards have substantial local/live route evidence, but they are not beta-DONE until Supabase Auth provider/dashboard proof, Resend dashboard/webhook proof, and real invite/recipient email browser smokes are captured. DBIDX-001 repo-only audit is ready; other evidence remains pending execution or dependencies.

---

## Activity History Overhaul V1 evidence

The active evidence ledger for Activity History Overhaul V1 is `.ai/01_roadmap/35-activity-history-overhaul-v1-execution.md`. It records milestone status, validation commands, commit SHAs, production telemetry NO-GO truth, and final archive location. After completion, the plan pack must be moved with `git mv` to `.ai/09_archive/store/activity-history-overhaul-v1/`, and roadmap links must point to that archive path.
