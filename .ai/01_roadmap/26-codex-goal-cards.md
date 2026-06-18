# Codex /goal Cards — Atomic Split Edition

> **Roadmap-sync note (2026-06-18):** Code reconciled against the live codebase. Several cards marked `READY FOR CODEX` already have shipped implementation and were re-statused to `IMPLEMENTED (…) / … OPEN` with file-path evidence: BETA-P0-SEC-005D, BETA-P0-SEC-005E (durable DB-backed rate limiting via `security_rate_limit_events`), BETA-P0-OBS-001E (health endpoint), BETA-P0-PERF-002A (bundle analyzer wired). IMPORTANT caveats confirmed in code and NOT changed: the SEC-005 EPIC's Upstash/**Redis** store does **not** exist (rate limiting was shipped via a Postgres table instead); SEC-005C auth/magic-link rate limiting is **not** implemented in-app (relies on Supabase's own throttling); SEC-004 secrets scanning is **not** in CI; OBS-001 **Sentry** is absent (only `console.warn` telemetry stubs); BETA-P1-SEC-006 **Turnstile** is absent; UX-004 **desktop/mobile guard** is absent; REL-001 root `error.tsx`/`not-found.tsx` are absent; ANA-001 first-party product-events table is absent. The header counts below are from the 2026-06-01 edition and were NOT recomputed in this sync.

**Last updated:** 2026-06-01 (header counts); 2026-06-18 (status reconciliation, see sync note)
**Total atomic executable cards:** 93 (78 original + 10 new collab/share + 5 new DBIDX from 2026-05-30 sync)
**EPIC headers / non-executable reference nodes:** 15
**Ready for Codex (immediately):** 60
**Ready for Codex after external setup:** 12 (staging-dependent 11 + COLLAB-003)
**Ready for Codex after prior cards (DBIDX):** 1 (DBIDX-004)
**Ready for Codex after sentry/dependencies:** 4
**Ready for human external setup:** 3
**Planned / enterprise MVP:** 7
**Public launch / legal blocked:** 2
**Post-MVP / deferred:** 2
**Decision-coded DONE:** 1
**Evidence artifacts produced:** Partial route-transition evidence exists; 0 beta-ready DONE evidence packs

## Atomic Goal-Card Standard

> **A Codex goal card must be executable in one bounded Ralph Loop session. Target size: 1–3 hours of implementation work.** If a card contains multiple independent subsystems, external setup plus code changes, or more than one validation domain, it is an **EPIC** and must be split before `/goal`.

### EPIC / SPLIT REQUIRED Status

The topic is valid, but Codex must not execute it directly. It must be split into atomic cards first. An EPIC header appears as a reference node with sub-cards listed beneath it. Only sub-cards may be executed.

---

## Card Readiness Summary

| Goal ID | Status |
|---------|--------|
| BETA-P0-DEC-001 | DONE / DECISIONS CODED INTO ROADMAP |
| BETA-P0-INF-001 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| HUMAN-P0-INF-001A | READY FOR HUMAN EXTERNAL SETUP |
| HUMAN-P0-INF-001B | READY FOR HUMAN EXTERNAL SETUP |
| CODEX-P0-INF-001C | READY FOR CODEX |
| CODEX-P0-INF-001D | READY FOR CODEX AFTER EXTERNAL SETUP |
| CODEX-P0-INF-001E | READY FOR CODEX AFTER EXTERNAL SETUP |
| BETA-P0-SEC-001 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-SEC-001A | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-001B | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-001C | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-001D | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-001E | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-001F | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-001G | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-002 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-SEC-002A | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-002B | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-002C | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-002D | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| BETA-P0-SEC-003 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-SEC-003A | READY FOR CODEX |
| BETA-P0-SEC-003B | READY FOR CODEX |
| BETA-P0-SEC-003C | READY FOR CODEX |
| BETA-P0-SEC-003D | READY FOR CODEX |
| BETA-P0-SEC-003E | READY FOR CODEX |
| BETA-P0-SEC-004 | READY FOR CODEX |
| BETA-P0-SEC-005 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-SEC-005A | READY FOR CODEX |
| BETA-P0-SEC-005B | READY FOR CODEX |
| BETA-P0-SEC-005C | READY FOR CODEX |
| BETA-P0-SEC-005D | IMPLEMENTED (DB-DURABLE, NOT REDIS) / VERIFY-SCOPE OPEN — see card |
| BETA-P0-SEC-005E | IMPLEMENTED (DB-DURABLE, NOT REDIS) / VERIFY-SCOPE OPEN — see card |
| BETA-P0-SEC-005F | READY FOR CODEX |
| BETA-P1-SEC-006 | READY FOR CODEX |
| BETA-P0-OBS-001 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-OBS-001A | READY FOR CODEX / NEEDS SENTRY CHOICE |
| BETA-P0-OBS-001B | READY FOR CODEX AFTER DSN EXISTS |
| BETA-P0-OBS-001C | READY FOR CODEX |
| BETA-P0-OBS-001D | READY FOR CODEX AFTER SENTRY INTEGRATION |
| BETA-P0-OBS-001E | IMPLEMENTED (HEALTH ENDPOINT) / UPTIME-PLAN OPEN — see card |
| BETA-P0-PERF-001 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-PERF-001A | PARTIAL / MANUAL CHROME PROOF OPEN |
| BETA-P0-PERF-001B | PARTIAL / MANUAL CHROME PROOF OPEN |
| BETA-P0-PERF-001C | READY FOR CODEX |
| BETA-P0-PERF-001D | READY FOR CODEX |
| BETA-P0-PERF-001E | READY FOR CODEX |
| BETA-P0-PERF-001F | READY FOR CODEX |
| BETA-P0-PERF-002 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-PERF-002A | IMPLEMENTED (ANALYZER WIRED) / CI-ARCHIVE OPEN — see card |
| BETA-P0-PERF-002B | READY FOR CODEX |
| BETA-P0-PERF-002C | READY FOR CODEX |
| BETA-P0-PERF-002D | IMPLEMENTED / TRUE ANALYZER CAPTURED / NOT BETA DONE |
| BETA-P0-PERF-002E | IMPLEMENTED / NEEDS FULL CI GREEN |
| BETA-P0-UX-001 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-UX-001A | READY FOR CODEX |
| BETA-P0-UX-001B | READY FOR CODEX |
| BETA-P0-UX-001C | READY FOR CODEX |
| BETA-P0-UX-001D | READY FOR CODEX |
| BETA-P0-UX-001E | READY FOR CODEX |
| BETA-P0-UX-002 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-UX-002A | READY FOR CODEX |
| BETA-P0-UX-002B | READY FOR CODEX |
| BETA-P0-UX-002C | READY FOR CODEX |
| BETA-P0-UX-002D | READY FOR CODEX |
| BETA-P0-UX-003 | READY FOR CODEX |
| BETA-P0-UX-004 | READY FOR CODEX |
| BETA-P0-REL-001 | READY FOR CODEX |
| BETA-P0-AI-001 | READY FOR CODEX |
| BETA-P0-ANA-001 | READY FOR CODEX |
| BETA-P0-LEGAL-001 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-LEGAL-001A | READY FOR CODEX |
| BETA-P0-LEGAL-001B | READY FOR CODEX |
| BETA-P0-LEGAL-001C | READY FOR CODEX |
| BETA-P0-LEGAL-001D | READY FOR CODEX |
| BETA-P0-OPS-001 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-OPS-001A | READY FOR CODEX |
| BETA-P0-OPS-001B | READY FOR CODEX |
| BETA-P0-OPS-001C | READY FOR CODEX |
| BETA-P0-BETA-001 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| BETA-P0-BETA-001A | READY FOR CODEX AFTER DESIGN PARTNER LIST FILLED |
| BETA-P0-BETA-001B | READY FOR CODEX |
| BETA-P0-BETA-001C | READY FOR CODEX AFTER PRIOR WAVES COMPLETE |
| PUBLIC-P0-LEGAL-001 | PUBLIC LAUNCH / LEGAL REVIEW REQUIRED |
| POST-BETA-PROD-001 | SPLIT into ENTERPRISE-P1-PROD-001 and ENTERPRISE-P1-PROD-002 |
| POST-BETA-MOBILE-001 | POST-MVP / FULL MOBILE EDITING |

## New — Collaboration & Sharing Cards (Added 2026-05-30)

| Goal ID | Status |
|---------|--------|
| HUMAN-P0-COLLAB-001A | BLOCKED — SUPABASE AUTH PROVIDER/DASHBOARD PROOF NEEDED |
| CODEX-P0-COLLAB-001B | PARTIAL — TARGET ENV/PROVIDER PROOF OPEN |
| CODEX-P0-COLLAB-002 | IMPLEMENTED LOCALLY / REAL INVITE SMOKE OPEN |
| CODEX-P0-COLLAB-003 | BLOCKED — REAL EMAIL PROVIDER LIFECYCLE SMOKE NEEDED |
| CODEX-P0-COLLAB-004 | IMPLEMENTED LOCALLY / PROVIDER DELIVERY PROOF OPEN |
| CODEX-P1-COLLAB-005 | IMPLEMENTED LOCALLY / REAL INVITEE SMOKE OPEN |
| CODEX-P1-SHARE-001 | IMPLEMENTED LOCALLY / OWNER ACCEPTANCE PROOF OPEN |
| CODEX-P1-SHARE-002 | IMPLEMENTED LOCALLY / REAL RECIPIENT EMAIL PROOF OPEN |
| CODEX-P1-SHARE-003 | IMPLEMENTED LOCALLY / RESEND DASHBOARD WEBHOOK PROOF OPEN |
| CODEX-P1-SHARE-004 | IMPLEMENTED LOCALLY / OWNER ACCEPTANCE PROOF OPEN |
| CODEX-P0-DBIDX-001 | READY FOR CODEX (repo-only audit; live metrics gated by DB access) |
| CODEX-P0-DBIDX-002 | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| CODEX-P0-DBIDX-003 | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| CODEX-P1-DBIDX-004 | READY FOR CODEX AFTER DBIDX-001/002/003 + OWNER APPROVAL |
| CODEX-P1-DBIDX-005 | PLANNED |
| ENTERPRISE-P1-PROD-001 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| ENTERPRISE-P1-PROD-001A | PLANNED |
| ENTERPRISE-P1-PROD-001B | PLANNED |
| ENTERPRISE-P1-PROD-001C | PLANNED |
| ENTERPRISE-P1-PROD-002 | **EPIC / SPLIT REQUIRED** — see sub-cards |
| ENTERPRISE-P1-PROD-002A | PLANNED |
| ENTERPRISE-P1-PROD-002B | PLANNED |
| ENTERPRISE-P1-PROD-002C | PLANNED |

---

## How Codex Should Use These Cards

1. Only implement sub-cards or cards marked `READY FOR CODEX`
2. Do NOT attempt EPIC headers — they are non-executable reference nodes
3. Do NOT attempt blocked cards — report the block
4. Start with the first unblocked card in wave order
5. Produce ALL evidence artifacts
6. Report completion before moving to next card
7. Never implement multiple cards at once
8. One atomic card = one bounded Ralph Loop session (1–3 hours)

---

---

## BETA-P0-DEC-001 — Resolve Top 10 Owner Decisions

| Field | Value |
|---|---|
| Wave | 0 |
| Lane | BETA P0 |
| Status | DONE / DECISIONS CODED INTO ROADMAP |
| Primary risk reduced | Product |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Low |
| Dependencies | None |
| Explicit non-goals | Implementing anything, running commands |

### Outcome
All 10 owner decisions have written answers or accepted defaults.

### Why this comes now
Decisions block all other waves. Without answers, every other goal card is BLOCKED.

### Likely files or areas touched
.ai/01_roadmap/24-owner-decision-packet.md, .ai/01_roadmap/14-owner-decisions.md

### Acceptance criteria
1. All 10 decisions have OWNER_NAME_PLACEHOLDER answers or accepted defaults
2. 24-owner-decision-packet.md updated with answers
3. Blocked goal cards updated to reflect unblocked status

### Validation commands or evidence
OWNER_NAME_PLACEHOLDER review of decision packet.

### Performance budget
N/A (docs only).

### Security/data check
N/A.

### UX/UI check
N/A.

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-DEC-001/

### Rollback / failure handling
Revert answer if mistaken; decisions are reversible until implementation starts.

### Completion report requirements
List of 10 decisions with answers, count of now-unblocked goal cards.

---

## BETA-P0-INF-001 — Staging/Environment Separation

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Deployment |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | Wave 0 decisions |
| Explicit non-goals | Production CD pipeline, multi-region, PITR, domain/DNS |

### Outcome
Separate staging Supabase project + Vercel staging preview exist, isolated from dev.

### Sub-cards
- HUMAN-P0-INF-001A — Create staging Supabase project
- HUMAN-P0-INF-001B — Create Vercel staging/preview project or environment
- CODEX-P0-INF-001C — Document env var inventory and staging mapping
- CODEX-P0-INF-001D — Add/verify environment validation plan
- CODEX-P0-INF-001E — Staging readiness evidence checklist

---

### HUMAN-P0-INF-001A — Create Staging Supabase Project

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR HUMAN EXTERNAL SETUP |
| Primary risk reduced | Deployment |
| Owner | OWNER_NAME_PLACEHOLDER (manual) |
| Dependencies | None |
| Explicit non-goals | Applying migrations, configuring env vars, creating seed data |

### Outcome
Staging Supabase project created with separate URL from dev, service-role keys distinct.

### Why now
Infrastructure foundation. No staging DB means no security or performance tests.

### Likely areas touched
Supabase dashboard

### Acceptance criteria
1. New Supabase project provisioned
2. Staging URL differs from dev
3. Service-role key distinct from dev
4. Anon key distinct from dev

### Validation
Verify staging URL ≠ dev URL; confirm keys differ.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-HUMAN-P0-INF-001A/

### Completion report
Staging Supabase URL, confirmation keys differ from dev.

---

### HUMAN-P0-INF-001B — Create Vercel Staging/Preview Project or Environment

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR HUMAN EXTERNAL SETUP |
| Primary risk reduced | Deployment |
| Owner | OWNER_NAME_PLACEHOLDER (manual) |
| Dependencies | None |
| Explicit non-goals | Configuring deploy hooks, setting env vars, domain/DNS |

### Outcome
Staging Vercel project/environment exists with separate URL, preview protection active.

### Why now
Need isolated deploy target for staging before any testing.

### Likely areas touched
Vercel dashboard

### Acceptance criteria
1. Staging Vercel environment created
2. Staging URL differs from dev/production
3. Preview protection active (auth-gated)

### Validation
Verify staging URL renders; verify unauth user blocked.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-HUMAN-P0-INF-001B/

### Completion report
Staging Vercel URL, preview protection confirmation.

---

### CODEX-P0-INF-001C — Document Env Var Inventory and Staging Mapping

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | IMPLEMENTED / NEEDS MANUAL BENCHMARK + CLEAN GATES |
| Primary risk reduced | Deployment |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Setting env vars, deploying, modifying .env files |

### Outcome
Complete inventory of all environment variables with dev/staging/prod mapping, security classification, and NEXT_PUBLIC_ audit.

### Why now
Must know what vars exist before configuring staging. Prevents env var drift.

### Likely files touched
.env*, src/lib/supabase/, next.config.ts

### Acceptance criteria
1. All env vars inventoried from .env* files
2. Each var classified: dev-only, staging, prod, or shared
3. NEXT_PUBLIC_ vars audited for safety
4. Document saved to .ai/01_roadmap/ or .ai/09_archive/

### Validation
Grep all .env* files; cross-reference with codebase usage.

### Performance budget
N/A (docs only).

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-INF-001C/

### Completion report
Env var inventory document path, count by environment, NEXT_PUBLIC_ audit results.

---

### CODEX-P0-INF-001D — Add/Verify Environment Validation Plan

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER EXTERNAL SETUP |
| Primary risk reduced | Deployment |
| Owner | Codex |
| Dependencies | HUMAN-P0-INF-001A, HUMAN-P0-INF-001B, CODEX-P0-INF-001C |
| Explicit non-goals | Actually running staging migrations or deploy |

### Outcome
Documented validation checklist confirms staging is safe and isolated before Codex uses it.

### Why now
Must verify staging is properly isolated before security/performance tests run.

### Likely files touched
.ai/01_roadmap/, src/lib/supabase/

### Acceptance criteria
1. Validation plan written with explicit checks
2. Each check: staging URL ≠ dev URL, staging keys ≠ dev keys, auth works, preview protection active
3. Plan saved as Codex-readable checklist

### Validation
Checklist is self-documenting; verification by executing checklist items manually.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-INF-001D/

### Completion report
Validation plan path, count of checklist items, any discovered issues.

---

### CODEX-P0-INF-001E — Staging Readiness Evidence Checklist

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER EXTERNAL SETUP |
| Primary risk reduced | Deployment |
| Owner | Codex |
| Dependencies | CODEX-P0-INF-001D |
| Explicit non-goals | Running security tests, deploying to production |

### Outcome
Staging environment confirmed ready: migrations applied, seed data loaded, basic smoke test passes.

### Why now
Final gate before staging-dependent cards can execute.

### Likely files touched
supabase/migrations/, data/local/seed.json

### Acceptance criteria
1. Staging migrations applied and verified
2. Seed data script exists and runs on staging
3. Basic smoke test: create project on staging, verify it does not appear in dev

### Validation
Apply migrations to staging; run seed script; smoke test isolation.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-INF-001E/

### Completion report
Migration count applied, seed script path, smoke test result, staging isolation confirmation.

---

## BETA-P0-SEC-001 — RLS Denial Test Harness

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Security |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | High |
| Dependencies | Staging environment (Wave 2) |
| Explicit non-goals | Fixing RLS policy gaps (report only), penetration testing, modifying RLS policies |

### Outcome
Automated RLS denial test suite covering all user-data tables, passing in CI.

### Sub-cards
- BETA-P0-SEC-001A — RLS test harness foundation
- BETA-P0-SEC-001B — Core hierarchy RLS denial tests
- BETA-P0-SEC-001C — Collaboration and invite RLS denial tests
- BETA-P0-SEC-001D — Publication/shared-link RLS denial tests
- BETA-P0-SEC-001E — Component library/template RLS denial tests
- BETA-P0-SEC-001F — AI audit/table access denial tests
- BETA-P0-SEC-001G — RPC authorization denial tests

---

### BETA-P0-SEC-001A — RLS Test Harness Foundation

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-INF-001 (staging confirmed) |
| Explicit non-goals | Writing per-table tests, creating test users via UI |

### Outcome
Shared test infrastructure: Supabase test client factory, workspace-switching helpers, CI job config.

### Why now
Foundation for all RLS sub-cards. Each sub-card depends on this harness.

### Likely files touched
tests/integration/rls-harness.ts, .github/workflows/ci.yml

### Acceptance criteria
1. Test harness creates Workspace A user + Workspace B user programmatically
2. Helper functions: `asUserA()`, `asUserB()`, `assertDenied()`
3. CI job configured to run RLS tests against staging

### Validation
`bun run test tests/integration/rls-harness.ts`

### Performance budget
Test harness setup < 5s.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001A/

### Completion report
Harness module path, helper function inventory, CI job URL.

---

### BETA-P0-SEC-001B — Core Hierarchy RLS Denial Tests

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-001A |
| Explicit non-goals | Fixing discovered gaps, testing collaboration or publication tables |

### Outcome
Cross-workspace denial proven for workspaces, projects, estimates, estimate_nodes, estimate_row_items.

### Why now
Core data hierarchy is the highest-value target. Cross-workspace leak here is catastrophic.

### Likely files touched
tests/integration/rls-core-hierarchy.test.ts

### Acceptance criteria
1. Create data as Workspace A in workspaces, projects, estimates, nodes, row_items
2. Attempt read/write/update/delete as Workspace B
3. All cross-workspace operations denied

### Validation
`bun run test tests/integration/rls-core-hierarchy.test.ts`

### Security/data check
Proves core data isolation across workspace boundary.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001B/

### Completion report
Table coverage list, test count, passing evidence, any discovered gaps.

---

### BETA-P0-SEC-001C — Collaboration and Invite RLS Denial Tests

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-001A |
| Explicit non-goals | Testing invite email flow, fixing policy gaps |

### Outcome
RLS denial proven for project_members, collaboration_invitations, estimate_sheet_members.

### Why now
Collaboration is a cross-workspace boundary surface. Invite tokens must not leak across workspaces.

### Likely files touched
tests/integration/rls-collaboration.test.ts

### Acceptance criteria
1. Workspace A member data inaccessible from Workspace B
2. Invite tokens scoped to issuing workspace
3. Sheet members scoped to workspace

### Validation
`bun run test tests/integration/rls-collaboration.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001C/

### Completion report
Table coverage, test counts, gap report.

---

### BETA-P0-SEC-001D — Publication/Shared-Link RLS Denial Tests

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-001A |
| Explicit non-goals | Testing shared-link UI, password gate |

### Outcome
RLS denial proven for project_publications, shared_link_comments, shared_link_responses, shared_link_events, shared_link_recipients.

### Why now
Shared links are the primary external surface. Cross-workspace publication leak is a data breach.

### Likely files touched
tests/integration/rls-publication.test.ts

### Acceptance criteria
1. Workspace A publication data not accessible from Workspace B
2. Comments/responses/events scoped to owning workspace
3. Recipient data scoped

### Validation
`bun run test tests/integration/rls-publication.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001D/

### Completion report
Table coverage, test counts, gap report.

---

### BETA-P0-SEC-001E — Component Library/Template RLS Denial Tests

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-001A |
| Explicit non-goals | Testing library UI, variant editing |

### Outcome
RLS denial proven for cost_library_items, price_options, variant_cost_entries, component_category_nodes, library_folders, estimate templates.

### Why now
Component library and templates contain pricing IP. Cross-workspace leak is competitive risk.

### Likely files touched
tests/integration/rls-library-templates.test.ts

### Acceptance criteria
1. Workspace A library data not readable/writable from Workspace B
2. Template data scoped to workspace
3. Category/supplier/brand data scoped

### Validation
`bun run test tests/integration/rls-library-templates.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001E/

### Completion report
Table coverage, test counts, gap report.

---

### BETA-P0-SEC-001F — AI Audit/Table Access Denial Tests

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-001A |
| Explicit non-goals | Testing AI responses, testing AI provider |

### Outcome
RLS denial proven for AI audit tables: ai_action_runs, ai_tool_calls, ai_data_access_events.

### Why now
AI audit trail must be workspace-scoped. Cross-workspace audit leak is a privacy issue.

### Likely files touched
tests/integration/rls-ai-audit.test.ts

### Acceptance criteria
1. Workspace A AI audit data not accessible from Workspace B
2. AI action runs scoped to workspace
3. Data access events scoped

### Validation
`bun run test tests/integration/rls-ai-audit.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001F/

### Completion report
Table coverage, test counts, gap report.

---

### BETA-P0-SEC-001G — RPC Authorization Denial Tests

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-001A |
| Explicit non-goals | Testing RPC business logic, fixing RPC bugs |

### Outcome
All RPC functions verified to respect workspace boundaries. Cross-workspace RPC calls denied.

### Why now
RPCs bypass table-level RLS if not properly guarded. Must verify each function.

### Likely files touched
tests/integration/rls-rpc.test.ts

### Acceptance criteria
1. Enumerate all RPC functions
2. Call each as Workspace B user with Workspace A data
3. Verify denial or correct scoping

### Validation
`bun run test tests/integration/rls-rpc.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001G/

### Completion report
RPC inventory count, test count, any unguarded RPCs discovered.

---

## BETA-P0-SEC-002 — Storage Denial Test Harness

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Security |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | Staging |
| Explicit non-goals | Fixing storage policy gaps, storage RLS rewrite |

### Outcome
Storage bucket cross-workspace access tests pass.

### Sub-cards
- BETA-P0-SEC-002A — Storage test harness foundation
- BETA-P0-SEC-002B — component-images public-read/upload-denial tests
- BETA-P0-SEC-002C — component-attachments private-read/write denial tests
- BETA-P0-SEC-002D — storage orphan cleanup and path-prefix audit

---

### BETA-P0-SEC-002A — Storage Test Harness Foundation

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-INF-001 (staging confirmed) |
| Explicit non-goals | Writing per-bucket tests, testing upload UI |

### Outcome
Shared storage test helpers: Supabase storage client factory, bucket-level test assertion helpers.

### Why now
Foundation for all storage sub-cards. Each depends on this harness.

### Likely files touched
tests/integration/storage-harness.ts

### Acceptance criteria
1. Storage test client created for Workspace A and Workspace B
2. Helper functions: `uploadAsA()`, `tryReadAsB()`, `assertStorageDenied()`
3. Bucket list enumerated automatically

### Validation
`bun run test tests/integration/storage-harness.ts`

### Performance budget
Setup < 5s.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-002A/

### Completion report
Harness module path, helper inventory, bucket count discovered.

---

### BETA-P0-SEC-002B — Component-Images Public-Read/Upload-Denial Tests

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-002A |
| Explicit non-goals | Testing image rendering, image processing |

### Outcome
component-images bucket: Workspace B cannot upload to Workspace A's prefix; public read works but cross-workspace write denied.

### Why now
Component images are public-readable but must be workspace-scoped for writes.

### Likely files touched
tests/integration/storage-component-images.test.ts

### Acceptance criteria
1. Upload image as Workspace A — succeeds
2. Public read of Workspace A image as Workspace B — succeeds (or denied, either is acceptable if documented)
3. Upload to Workspace A prefix as Workspace B — denied
4. Delete Workspace A image as Workspace B — denied

### Validation
`bun run test tests/integration/storage-component-images.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-002B/

### Completion report
Test count, access matrix result, gap report.

---

### BETA-P0-SEC-002C — Component-Attachments Private-Read/Write Denial Tests

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-002A |
| Explicit non-goals | Testing attachment download UI |

### Outcome
component-attachments bucket: fully workspace-scoped. Cross-workspace read/write/delete all denied.

### Why now
Attachments (PDFs, XLS files) contain sensitive pricing data. Must be fully isolated.

### Likely files touched
tests/integration/storage-component-attachments.test.ts

### Acceptance criteria
1. Upload attachment as Workspace A — succeeds
2. Read Workspace A attachment as Workspace B — denied
3. Delete Workspace A attachment as Workspace B — denied
4. List Workspace A attachments as Workspace B — denied or empty

### Validation
`bun run test tests/integration/storage-component-attachments.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-002C/

### Completion report
Test count, access matrix, gap report.

---

### BETA-P0-SEC-002D — Storage Orphan Cleanup and Path-Prefix Audit

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-002A |
| Explicit non-goals | Implementing automated cleanup, modifying bucket policies |

### Outcome
All storage buckets audited for path-prefix conventions. Orphan detection documented. No cross-workspace path confusion.

### Why now
Need to verify path-prefix conventions prevent accidental cross-workspace access before beta storage grows.

### Likely files touched
tests/integration/storage-path-audit.test.ts, supabase/migrations/

### Acceptance criteria
1. All buckets enumerated with their path-prefix conventions
2. Each bucket verified: workspace-scoped paths exist
3. Orphan risk documented (files deletable when workspace is deleted?)

### Validation
`bun run test tests/integration/storage-path-audit.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-002D/

### Completion report
Bucket inventory, path-prefix convention per bucket, orphan risk assessment.

---

## BETA-P0-SEC-003 — API/Server-Action Auth Audit

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Security |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | High |
| Dependencies | Staging |
| Explicit non-goals | Rewriting auth middleware, refactoring auth system |

### Outcome
Every /api/* route and server action verified with auth check.

### Sub-cards
- BETA-P0-SEC-003A — API route inventory
- BETA-P0-SEC-003B — API auth tests for AI routes
- BETA-P0-SEC-003C — API auth tests for upload/export routes
- BETA-P0-SEC-003D — Server action inventory
- BETA-P0-SEC-003E — Server action unauthenticated denial tests

---

### BETA-P0-SEC-003A — API Route Inventory

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Writing auth tests, modifying route handlers |

### Outcome
Complete inventory of every /api/* route with auth-gate status, HTTP method, and data access classification.

### Why now
Must know what routes exist before testing them. Inventory gates all other API auth sub-cards.

### Likely files touched
src/app/api/*

### Acceptance criteria
1. Every /api/* route enumerated with file path
2. Each classified: authenticated, public, or unknown
3. Document saved as checklist

### Validation
Grep route files; manual verification of classification.

### Performance budget
N/A (docs only).

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003A/

### Completion report
Route count, auth-gate status per route, any unauthenticated routes discovered.

---

### BETA-P0-SEC-003B — API Auth Tests for AI Routes

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-003A |
| Explicit non-goals | Testing AI responses, testing AI provider |

### Outcome
AI routes (ask, package-builder) reject unauthenticated requests and respect workspace boundaries.

### Why now
AI routes access estimate data. Unprotected AI endpoint = data leak via prompt injection.

### Likely files touched
tests/integration/api-auth-ai.test.ts, src/app/api/ai/*

### Acceptance criteria
1. POST to /api/ai/ask without auth — rejected
2. POST to /api/ai/package-builder without auth — rejected
3. Cross-workspace AI queries denied

### Validation
`bun run test tests/integration/api-auth-ai.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003B/

### Completion report
Test count, route coverage, denied-request evidence.

---

### BETA-P0-SEC-003C — API Auth Tests for Upload/Export Routes

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-003A |
| Explicit non-goals | Testing file upload integrity, testing XLSX output |

### Outcome
Upload routes (images, attachments) and export route reject unauthenticated requests.

### Why now
Upload routes write to storage; export route reads estimate data. Both must be auth-gated.

### Likely files touched
tests/integration/api-auth-upload-export.test.ts, src/app/api/component-library/, src/app/api/projects/*/export/

### Acceptance criteria
1. POST upload routes without auth — rejected
2. GET export route without auth — rejected
3. Cross-workspace upload/export denied

### Validation
`bun run test tests/integration/api-auth-upload-export.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003C/

### Completion report
Test count, route coverage, denial evidence.

---

### BETA-P0-SEC-003D — Server Action Inventory

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Writing tests, modifying actions |

### Outcome
Complete inventory of every server action with auth-gate status and data mutation classification.

### Why now
Server actions are the primary write surface. Must inventory before testing.

### Likely files touched
src/lib/*/actions.ts

### Acceptance criteria
1. All server actions enumerated with file path
2. Each classified: auth-gated, public, or unknown
3. Document saved as checklist

### Validation
Grep action files; manual classification verification.

### Performance budget
N/A (docs only).

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003D/

### Completion report
Action count, auth-gate status per action, any unauthenticated actions discovered.

---

### BETA-P0-SEC-003E — Server Action Unauthenticated Denial Tests

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-003D |
| Explicit non-goals | Testing business logic, testing optimistic UI |

### Outcome
Top 15 write server actions reject unauthenticated calls.

### Why now
Server actions that bypass auth gates allow unauthenticated data mutation.

### Likely files touched
tests/integration/server-action-auth.test.ts

### Acceptance criteria
1. Top 15 write actions identified from inventory
2. Each called without auth — rejected with appropriate error
3. No action mutates data without auth

### Validation
`bun run test tests/integration/server-action-auth.test.ts`

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003E/

### Completion report
Action count tested, denial evidence, any unauthenticated mutations discovered.

---

## BETA-P0-SEC-004 — Secrets Scanning + Service-Role Leak Check

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Primary risk reduced | Security |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Low |
| Dependencies | CI pipeline |
| Explicit non-goals | Rotational secret management, vault integration |

### Outcome
CI blocks commits with credentials; service-role key verified never client-side.

### Why this comes now
A leaked service-role key in the client bundle would give full database access. Must be caught at commit time.

### Likely files or areas touched
.github/workflows/ci.yml, src/lib/supabase/

### Acceptance criteria
1. Secrets scanning added to CI (git-secrets or equivalent)
2. Push commit with fake credential → CI fails
3. Verify service_role key never in client bundle
4. Verify NEXT_PUBLIC_ vars are safe

### Validation commands or evidence
Push commit with fake SUPABASE_SERVICE_ROLE_KEY=test-secret → CI must fail; grep for service_role in client bundle → empty.

### Performance budget
CI scan < 30s additional.

### Security/data check
Core secret hygiene.

### UX/UI check
N/A.

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-004/

### Rollback / failure handling
Remove CI step if false positives excessive.

### Completion report requirements
Secrets scanning tool chosen, CI pass/fail evidence, service-role grep results, NEXT_PUBLIC_ var audit.

---

## BETA-P0-SEC-005 — Persistent Rate Limiting

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Security |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | BETA-P0-INF-001 (staging), Upstash Redis or equivalent |
| Explicit non-goals | Full DDoS protection, WAF, CAPTCHA (separate card) |

### Outcome
Persistent rate limiting protects auth, AI, invites, and shared links. Lockout state survives server restarts.

### Sub-cards
- BETA-P0-SEC-005A — Rate-limit architecture and route inventory
- BETA-P0-SEC-005B — Upstash Redis / durable store integration
- BETA-P0-SEC-005C — Auth/magic-link rate limits
- BETA-P0-SEC-005D — Shared-link password/access rate limits
- BETA-P0-SEC-005E — AI route rate limits
- BETA-P0-SEC-005F — 429 UX and Retry-After behavior

---

### BETA-P0-SEC-005A — Rate-Limit Architecture and Route Inventory

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Implementing rate limits, integrating Redis |

### Outcome
Documented rate-limit architecture: which routes need limits, what thresholds, scoping strategy (IP vs user).

### Why now
Need architecture decision before implementing. Prevents ad-hoc rate limit placement.

### Likely files touched
src/lib/rate-limit/, .ai/01_roadmap/

### Acceptance criteria
1. All rate-limit-eligible routes inventoried
2. Threshold per route documented with rationale
3. Scoping decision: IP-based, user-based, or hybrid
4. Architecture document saved

### Validation
Review architecture doc against route inventory.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-005A/

### Completion report
Route count, threshold table, scoping decision.

---

### BETA-P0-SEC-005B — Upstash Redis / Durable Store Integration

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-005A |
| Explicit non-goals | Implementing rate-limit logic, configuring thresholds |

### Outcome
Upstash Redis (or equivalent durable store) integrated with connection config and health check.

### Why now
Rate limiting needs durable storage. Must integrate the store before implementing limits.

### Likely files touched
src/lib/rate-limit/store.ts, .env*

### Acceptance criteria
1. Redis client configured with env vars
2. Connection health check
3. Fallback to in-memory if Redis unavailable (documented behavior)
4. No PII in Redis keys

### Validation
Health check returns connected; simulate Redis down → fallback activates.

### Performance budget
Connection setup < 100ms.

### Security/data check
Redis keys must not contain PII; connection must use TLS.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-005B/

### Completion report
Store type chosen, connection config evidence, health check result, fallback behavior documented.

---

### BETA-P0-SEC-005C — Auth/Magic-Link Rate Limits

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-005B |
| Explicit non-goals | Rate limiting Google OAuth, rate limiting login page rendering |

### Outcome
Magic-link creation rate-limited. Lockout persists across server restarts.

### Why now
Magic-link is the highest-abuse auth surface. Must be rate-limited before external beta.

### Likely files touched
src/app/login/, src/middleware.ts or src/lib/rate-limit/

### Acceptance criteria
1. Magic-link creation rate-limited (e.g., 5/15min per IP)
2. Exceed threshold → 429 with Retry-After
3. Lockout survives server restart
4. Legitimate users can still receive magic links below threshold

### Validation
Trigger rate limit on magic-link creation; restart server; verify lockout persists.

### Performance budget
Rate-limit check < 5ms per request.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-005C/

### Completion report
Thresholds, persistence test evidence, 429 response screenshot.

---

### BETA-P0-SEC-005D — Shared-Link Password/Access Rate Limits

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | IMPLEMENTED (DB-DURABLE, NOT REDIS) / VERIFY-SCOPE OPEN |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-005B |
| Explicit non-goals | Rate limiting shared link viewing, rate limiting comment submission |

> **Code-state note (2026-06-18 sync):** Shared-link password attempts AND invite-token resolution are already rate-limited in code via the DB-durable `security_rate_limit_events` store (migration `supabase/migrations/20260601003000_security_rate_limit_events.sql`), so lockout survives restarts. Wired in `src/app/api/share/[token]/password/route.ts` (durable + in-memory progressive lockout, 429 + `Retry-After`, `isPasswordLocked`) and `src/lib/collaboration/invite-entry.ts` (durable per-token invite rate limit). This was built via a Postgres table, NOT the Upstash/Redis store the parent EPIC (SEC-005B) specifies — SEC-005B's Redis integration does NOT exist (the only `Redis` reference is a comment in `src/lib/publication/actions.ts:1284`). Remaining open: confirm thresholds match this card's intent and whether the Redis architecture is still required vs. the shipped DB approach.

### Outcome
Shared-link password attempts rate-limited. Invite resolution rate-limited.

### Why now
Shared-link password gate and invite resolution are abuse surfaces for brute-force attacks.

### Likely files touched
src/app/share/, src/app/invite/, src/lib/rate-limit/

### Acceptance criteria
1. Password attempts per shared link rate-limited (e.g., 10/5min)
2. Invite token resolution rate-limited
3. Lockout persists across restarts

### Validation
Trigger rate limit on password attempts; verify 429; restart server; verify lockout.

### Performance budget
< 5ms per check.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-005D/

### Completion report
Thresholds, persistence evidence, 429 screenshot.

---

### BETA-P0-SEC-005E — AI Route Rate Limits

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | IMPLEMENTED (DB-DURABLE, NOT REDIS) / VERIFY-SCOPE OPEN |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-005B |
| Explicit non-goals | Rate limiting per AI provider, cost-based throttling |

> **Code-state note (2026-06-18 sync):** AI Ask is already per-user rate-limited via the DB-durable `security_rate_limit_events` store: `src/lib/ai/rate-limit.ts` (`checkAiAskQuota`, dual-window) and `src/app/api/ai/ask/handler.ts` (429 + `Retry-After`). Package-builder handler (`src/app/api/ai/package-builder/handler.ts`) shares the AI **auth** path (`getAiRequestUserContext`) but is **NOT rate-limited** — it has no `checkAiAskQuota`/429/`Retry-After` call (verified 2026-06-18); only the Ask route enforces the quota. Built on Postgres, NOT the Upstash/Redis store SEC-005B specifies. NOTE: the AI routes themselves are flag-gated OFF by default (`ARCHESTIMATOR_AI_ENABLED`, returns 404), so the limiter is only exercised when AI is enabled. Remaining open: confirm thresholds match this card's intent.

### Outcome
AI Ask and package-builder routes rate-limited per user.

### Why now
AI routes are the most expensive per-request surface. Abuse could incur significant provider costs.

### Likely files touched
src/app/api/ai/, src/lib/rate-limit/

### Acceptance criteria
1. Ask Flip rate-limited (e.g., 20/15min per user)
2. Package-builder rate-limited (e.g., 10/15min per user)
3. 429 with Retry-After on exceed

### Validation
Trigger rate limit; verify 429; verify lockout persists.

### Performance budget
< 5ms per check.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-005E/

### Completion report
Thresholds, persistence evidence, 429 screenshot.

---

### BETA-P0-SEC-005F — 429 UX and Retry-After Behavior

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-SEC-005C, BETA-P0-SEC-005D, BETA-P0-SEC-005E |
| Explicit non-goals | Custom error pages per route, i18n error messages |

### Outcome
Consistent 429 UX: clear lockout message with retry guidance, Retry-After header, design-system compliant.

### Why now
Rate limiting is useless if users don't understand why they're blocked or when they can retry.

### Likely files touched
src/components/ui/, src/app/*/error.tsx, src/middleware.ts

### Acceptance criteria
1. All rate-limited routes return consistent 429 response
2. Retry-After header present
3. Client-side lockout message uses design-system tokens
4. Clear retry guidance (countdown or "try again in X minutes")
5. No white screen on lockout

### Validation
Trigger rate limit on each surface; verify consistent 429 UX; screenshot.

### UX/UI check
Lockout message uses design-system typography (SF Pro, 12px max); clear Retry-After time displayed.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-005F/

### Completion report
Screenshot per rate-limited surface, Retry-After header evidence.

---

## BETA-P1-SEC-006 — Cloudflare Turnstile Abuse Protection

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P1 |
| Status | READY FOR CODEX |
| Primary risk reduced | Security |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Low |
| Dependencies | BETA-P0-SEC-005 (rate limiting) |
| Explicit non-goals | Adding Turnstile to authenticated editing flows, replacing rate limiting |

### Outcome
Cloudflare Turnstile protects public abuse surfaces (magic-link, invite, shared-link password, contact).

### Why this comes now
Selected as CAPTCHA provider. BETA P1 — can be deferred if persistent rate limiting proves sufficient for small beta.

### Likely files or areas touched
src/app/login/, src/app/invite/, src/app/share/, src/app/contact/

### Acceptance criteria
1. Turnstile on magic-link creation page
2. Invisible/low-friction mode
3. No CAPTCHA on authenticated estimate editing flows
4. Added to subprocessor/legal/cookie tracking

### Validation commands or evidence
Deploy to staging, verify Turnstile renders on magic-link page, verify no Turnstile on authenticated editing pages.

### Performance budget
Turnstile script < 50KB, lazy-loaded

### Security/data check
Turnstile must not degrade without JavaScript; server-side validation required; added to subprocessor list.

### UX/UI check
Invisible mode — no user friction; fallback challenge only when risk score is high; design-system compliant error state if Turnstile fails.

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-BETA-P1-SEC-006/

### Rollback / failure handling
Remove Turnstile script and server-side validation; revert to rate limiting only.

### Completion report requirements
Turnstile site key / secret key configuration proof, screenshot of Turnstile on magic-link page, subprocessor list update, cookie tracking update.

---

## BETA-P0-OBS-001 — Basic APM/Error Tracking

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Deployment |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | Staging, analytics decision (D-031) |
| Explicit non-goals | Complex dashboards, custom metrics, log aggregation |

### Outcome
Sentry or equivalent capturing client + server errors from staging.

### Sub-cards
- BETA-P0-OBS-001A — Sentry provider setup checklist
- BETA-P0-OBS-001B — Sentry client/server SDK integration
- BETA-P0-OBS-001C — PII scrubbing and source-map posture
- BETA-P0-OBS-001D — Alert routing and test error evidence
- BETA-P0-OBS-001E — Minimal health endpoint and uptime check plan

---

### BETA-P0-OBS-001A — Sentry Provider Setup Checklist

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX / NEEDS SENTRY CHOICE |
| Owner | Codex |
| Dependencies | Sentry provider chosen (owner decision) |
| Explicit non-goals | Creating Sentry account, paying for Sentry |

### Outcome
Documented checklist of Sentry setup steps: project creation, DSN retrieval, organization config.

### Why now
Sentry integration is in the dependency chain. Must scope setup before SDK integration.

### Likely files touched
.ai/01_roadmap/

### Acceptance criteria
1. Sentry project name/structure documented
2. DSN retrieval steps documented
3. Organization/permission setup documented
4. Checklist saved for OWNER_NAME_PLACEHOLDER to execute

### Validation
Checklist review.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-OBS-001A/

### Completion report
Checklist path, step count, any Sentry-specific decisions recorded.

---

### BETA-P0-OBS-001B — Sentry Client/Server SDK Integration

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER DSN EXISTS |
| Owner | Codex |
| Dependencies | BETA-P0-OBS-001A, Sentry DSN available |
| Explicit non-goals | Source map upload, PII scrubbing, alert configuration |

### Outcome
Sentry SDK initialized in Next.js. Client-side and server-side errors captured.

### Why now
Core SDK integration gates all other observability work.

### Likely files touched
sentry.client.config.ts, sentry.server.config.ts, next.config.ts

### Acceptance criteria
1. Sentry SDK installed and configured
2. Client-side errors captured and visible in Sentry dashboard
3. Server-side errors captured and visible
4. DSN configured via env var
5. Performance budget: < 50KB bundle impact, < 10ms route overhead

### Validation
Trigger deliberate error on staging; verify in Sentry dashboard < 5 min.

### Performance budget
< 50KB bundle, < 10ms latency overhead.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-OBS-001B/

### Completion report
Sentry project URL, error capture evidence (screenshot), bundle size impact.

---

### BETA-P0-OBS-001C — PII Scrubbing and Source-Map Posture

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-OBS-001B |
| Explicit non-goals | Custom PII detection rules, GDPR compliance audit |

### Outcome
Sentry configured to scrub PII from error payloads. Source maps uploaded during build. Stack traces readable but safe.

### Why now
Sending PII to Sentry is a data breach. Source maps without scrubbing expose source code.

### Likely files touched
sentry.client.config.ts, sentry.server.config.ts, next.config.ts

### Acceptance criteria
1. PII scrubbing enabled (emails, names, IPs, estimate data)
2. Source maps uploaded during build
3. Verify error in Sentry shows clean stack trace without PII
4. Source map files not publicly accessible

### Validation
Trigger error with fake PII; verify PII not in Sentry event; verify stack trace readable.

### Security/data check
Verify Sentry DSN is NEXT_PUBLIC_ only; no secrets in Sentry config; PII scrubbing active.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-OBS-001C/

### Completion report
PII scrubbing config evidence, source map upload confirmation, Sentry event screenshot (clean).

---

### BETA-P0-OBS-001D — Alert Routing and Test Error Evidence

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER SENTRY INTEGRATION |
| Owner | Codex |
| Dependencies | BETA-P0-OBS-001B, BETA-P0-OBS-001C |
| Explicit non-goals | Complex alert rules, on-call rotations, pager integrations |

### Outcome
Basic alert configured in Sentry. Test error triggered, alert delivered, evidence captured.

### Why now
Sentry without alerts is just a log. Need notification channel before beta.

### Likely files touched
Sentry dashboard, .ai/09_archive/

### Acceptance criteria
1. At least one alert rule configured (e.g., new error in production)
2. Test error triggered on staging
3. Alert delivered (email or webhook)
4. Alert evidence captured

### Validation
Trigger test error; verify alert received < 5 min; screenshot.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-OBS-001D/

### Completion report
Alert rule description, test error trigger evidence, alert delivery screenshot.

---

### BETA-P0-OBS-001E — Minimal Health Endpoint and Uptime Check Plan

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | IMPLEMENTED (HEALTH ENDPOINT) / UPTIME-PLAN OPEN |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Complex health checks (DB, Redis, AI), status page |

> **Code-state note (2026-06-18 sync):** The health endpoint is BUILT: `src/app/api/health/route.ts` is a public `force-dynamic` GET returning `{ ok: true, service: "archestimator", timestamp }` with `Cache-Control: no-store` (liveness-only — does NOT check DB/Redis/AI, matching the non-goals). Note the shape is `{ ok: true }`, not the `{ status: "ok" }` literally specified in AC 1. A readiness-check script + test also exist (`scripts/check-vercel-health-readiness.ts`, `tests/vitest/vercel-health-readiness-script.test.ts`). Remaining open (genuinely not in code): the uptime-monitor plan/wiring — no in-code uptime pinger or external monitor consumes `/api/health`; that is an operator/external setup fact.

### Outcome
Minimal /api/health endpoint returns 200. Uptime check plan documented for Vercel or external monitor.

### Why now
Need to know if the app is down. Health endpoint is zero-cost to add and gates uptime monitoring.

### Likely files touched
src/app/api/health/route.ts

### Acceptance criteria
1. GET /api/health returns 200 with JSON `{ status: "ok" }`
2. No auth required (public health check)
3. Does not expose internal state
4. Uptime check plan documented (Vercel Analytics or external)

### Validation
`curl https://staging.archestimator.com/api/health` → 200.

### Performance budget
< 5ms response time.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-OBS-001E/

### Completion report
Health endpoint URL, curl evidence, uptime check plan.

---

## BETA-P0-PERF-001 — Performance Benchmark Harness

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Performance |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | Staging |
| Explicit non-goals | Achieving all public-launch targets, optimizing everything |

### Outcome
Performance benchmarks established for all critical paths with beta targets documented.

### Sub-cards
- BETA-P0-PERF-001A — Benchmark harness foundation
- BETA-P0-PERF-001B — Route transition baseline
- BETA-P0-PERF-001C — Estimate sheet row-edit baseline
- BETA-P0-PERF-001D — Tree rendering baseline
- BETA-P0-PERF-001E — XLSX export baseline
- BETA-P0-PERF-001F — Share receiver baseline

---

### BETA-P0-PERF-001A — Benchmark Harness Foundation

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Running per-path benchmarks, setting targets |

### Outcome
Shared benchmark infrastructure: timing helpers, seed data loader, CI job template, reporting format.

### Why now
Foundation for all benchmark sub-cards. Consistent measurement methodology required.

### Likely files touched
tests/performance/harness.ts, tests/performance/setup.ts

### Acceptance criteria
1. Timing helper: `measure(label, fn)` returning ms
2. Seed data loader for performance tests (100-row and 500-row estimates)
3. CI job template for benchmarks
4. Reporting format (JSON + markdown summary)

### Validation
`bun run test tests/performance/harness.test.ts`

### Performance budget
N/A (infrastructure).

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-001A/

### Completion report
Harness module path, helper inventory, seed data summary.

---

### BETA-P0-PERF-001B — Route Transition Baseline

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | PARTIAL / MANUAL CHROME PROOF OPEN |
| Owner | Codex |
| Dependencies | BETA-P0-PERF-001A |
| Explicit non-goals | Optimizing routes, implementing prefetch |

**2026-05-31 / 2026-06-01 evidence:** route-transition local smoke and production-like `next start` smoke exist at `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/` plus 2026-06-01 refresh folders. Public routes, Slow 3G public route, public Link-transition medians, bfcache/no-overlay, signed-out protected redirect, authenticated storage-state transition evidence, sidebar/project-card/estimate-row hover `_rsc` proof, authenticated Lighthouse score `0.86`, true webpack analyzer reports, public bfcache cache-header mitigation, component-level forced-render error-boundary screenshot proof, live dev-auth route-error screenshots, full E2E pass evidence, and `/workshop/library` route manifest byte comparison are captured. This card is still not DONE: manual Chrome bfcache DevTools persisted-restore proof and production Chrome React Profiler proof remain pending.

### Outcome
Route transition benchmarks measured for all workshop routes. Beta target: < 200ms.

### Why now
Slow route transitions are the first performance signal users notice.

### Likely files touched
tests/performance/route-transitions.test.ts

### Acceptance criteria
1. Measure transition for: workshop home, project list, estimate sheet, library, templates, charts, settings
2. Each measured 5x, median recorded
3. Beta budget: < 200ms per transition
4. Any route exceeding budget documented with analysis

### Validation
`bun run test tests/performance/route-transitions.test.ts`

### Performance budget
Each transition < 200ms.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-001B/

### Completion report
Median per route, any violations, baseline saved.

---

### BETA-P0-PERF-001C — Estimate Sheet Row-Edit Baseline

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | IMPLEMENTED / TRUE ANALYZER CAPTURED / NOT BETA DONE |
| Owner | Codex |
| Dependencies | BETA-P0-PERF-001A |
| Explicit non-goals | Optimizing edit latency, implementing batching |

### Outcome
Row edit latency measured: inline edit → optimistic update → server confirmation. Beta target: < 200ms.

### Why now
Row editing is the most frequent user action. Lag here destroys trust.

### Likely files touched
tests/performance/row-edit.test.ts

### Acceptance criteria
1. Measure: description edit, quantity edit, unit edit, unit-cost edit
2. Each measured 10x, p50/p95 recorded
3. Beta budget: p95 < 200ms
4. Server confirmation round-trip measured separately

### Validation
`bun run test tests/performance/row-edit.test.ts`

### Performance budget
p95 row edit < 200ms.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-001C/

### Completion report
p50/p95 per edit type, server round-trip times.

---

### BETA-P0-PERF-001D — Tree Rendering Baseline

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-PERF-001A |
| Explicit non-goals | Optimizing tree rendering, virtualizing tree |

### Outcome
Tree render benchmark for 500 nodes. Beta target: < 1s first render, < 200ms expand/collapse.

### Why now
Large estimate trees are the core UX surface. Must know baseline before optimizing.

### Likely files touched
tests/performance/tree-render.test.ts

### Acceptance criteria
1. Measure first render for 100, 250, 500 nodes
2. Measure expand-all / collapse-all for 500 nodes
3. Beta budget: first render < 1s, expand/collapse < 200ms

### Validation
`bun run test tests/performance/tree-render.test.ts`

### Performance budget
500 nodes first render < 1s.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-001D/

### Completion report
Render times by node count, expand/collapse timings.

---

### BETA-P0-PERF-001E — XLSX Export Baseline

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-PERF-001A |
| Explicit non-goals | Optimizing export, implementing streaming export |

### Outcome
XLSX export benchmark for 100-row and 500-row estimates. Beta target: < 3s (100), < 10s (500).

### Why now
Export is a key value-delivery path. Must know baseline before beta.

### Likely files touched
tests/performance/xlsx-export.test.ts

### Acceptance criteria
1. Export 100-row estimate, measure total time
2. Export 500-row estimate, measure total time
3. Beta budget: 100 rows < 3s, 500 rows < 10s
4. Document where time is spent (server vs client vs download)

### Validation
`bun run test tests/performance/xlsx-export.test.ts`

### Performance budget
100 rows < 3s, 500 rows < 10s.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-001E/

### Completion report
Export times by row count, time-breakdown analysis.

---

### BETA-P0-PERF-001F — Share Receiver Baseline

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-PERF-001A |
| Explicit non-goals | Optimizing share page, implementing SSR for share |

### Outcome
Share receiver FMP (First Meaningful Paint) measured. Beta target: < 2s.

### Why now
Shared links are the client-facing surface. Slow load = lost trust.

### Likely files touched
tests/performance/share-receiver.test.ts

### Acceptance criteria
1. Measure FMP for shared link with 100-row estimate
2. Measure FMP for shared link with 500-row estimate
3. Measure tab switching latency (Link → Sheets → Comments → Decisions)
4. Beta budget: FMP < 2s, tab switch < 500ms

### Validation
`bun run test tests/performance/share-receiver.test.ts`

### Performance budget
Share FMP < 2s.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-001F/

### Completion report
FMP by estimate size, tab switch timings.

---

## BETA-P0-PERF-002 — Bundle Analyzer + Code Splitting

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Performance |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | None (analysis first) |
| Explicit non-goals | Rewriting modules, removing dependencies, achieving all targets |

### Outcome
Bundle analyzer integrated, heavy modules lazily loaded, main bundle < 200KB gzipped.

### Sub-cards
- BETA-P0-PERF-002A — Bundle analyzer integration
- BETA-P0-PERF-002B — Heavy-module inventory
- BETA-P0-PERF-002C — ExcelJS lazy-load plan
- BETA-P0-PERF-002D — D3/Three lazy-load plan
- BETA-P0-PERF-002E — Regression budget enforcement

---

### BETA-P0-PERF-002A — Bundle Analyzer Integration

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | IMPLEMENTED (ANALYZER WIRED) / CI-ARCHIVE OPEN |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Lazy-loading modules, reducing bundle size |

> **Code-state note (2026-06-18 sync):** `@next/bundle-analyzer` is integrated in `next.config.ts` (`createBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })`, wrapped via `withBundleAnalyzer(nextConfig)`) and the package is in `package.json` — so `ANALYZE=true bun run build` produces the analyzer report (AC 1, 2, 4 met). Captured analyzer reports exist (e.g. `.ai/09_archive/store/2026-06-01-route-transition-analyzer-lighthouse-refresh/client.html`). Remaining open: AC 3 — CI does NOT generate/archive the analyzer report automatically (`ANALYZE` is not set in `.github/workflows/ci.yml`); analysis is manual/opt-in.

### Outcome
@next/bundle-analyzer integrated. Bundle composition visible in CI and locally.

### Why now
Must see the bundle before splitting it. Gateway for all bundle optimization sub-cards.

### Likely files touched
next.config.ts, package.json

### Acceptance criteria
1. @next/bundle-analyzer installed and configured
2. `bun run build` generates analyzer report
3. CI generates and archives report
4. Main bundle chunk sizes visible

### Validation
`bun run build` → analyzer report generated; verify report accessible.

### Performance budget
Analyzer must not slow build > 10%.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-002A/

### Completion report
Analyzer report screenshot, main chunk sizes, CI job evidence.

---

### BETA-P0-PERF-002B — Heavy-Module Inventory

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-PERF-002A |
| Explicit non-goals | Moving modules, changing import patterns |

### Outcome
Documented inventory of heavy modules: size, import location, lazy-load feasibility.

### Why now
Need systematic inventory before planning lazy-load strategy. Prevents ad-hoc splitting.

### Likely files touched
src/app/workshop/*, src/components/*

### Acceptance criteria
1. All modules > 50KB identified and listed
2. Each classified: always-needed, route-specific, deferrable
3. Import locations mapped
4. Lazy-load feasibility assessed per module

### Validation
Review analyzer report, grep import statements, classify each module.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-002B/

### Completion report
Module inventory list with sizes and classifications.

---

### BETA-P0-PERF-002C — ExcelJS Lazy-Load Plan

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-PERF-002A |
| Explicit non-goals | Rewriting export logic, implementing streaming export |

### Outcome
ExcelJS loaded via next/dynamic with ssr:false. Only loaded on export trigger.

### Why now
ExcelJS is the largest single dependency. Lazy-loading it is high-impact, low-risk.

### Likely files touched
src/lib/proposal-export/, src/components/workshop/

### Acceptance criteria
1. ExcelJS import replaced with next/dynamic
2. Export button triggers lazy load
3. Loading skeleton shown during first load
4. Verify export still works correctly
5. Main bundle reduced by ExcelJS size

### Validation
`bun run build` → verify ExcelJS in lazy chunk; manual export test.

### Performance budget
Must not regress export latency.

### UX/UI check
Loading skeleton during ExcelJS first load.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-002C/

### Completion report
Before/after main chunk size, lazy chunk size, export functionality verification.

---

### BETA-P0-PERF-002D — D3/Three Lazy-Load Plan

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | IMPLEMENTED / TRUE ANALYZER CAPTURED / NOT BETA DONE |
| Owner | Codex |
| Dependencies | BETA-P0-PERF-002A |
| Explicit non-goals | Rewriting chart components, removing Three.js |

**2026-05-31 / 2026-06-01 evidence:** route-transition slice dynamically imports the landing wireframe background, estimate workspace tree/content wrapper, component library manager, add-component modal, library folder tree surface, and project bubble chart, and uses D3 submodule imports. `/workshop/library` initial JS in the Next.js client reference manifest dropped from 618,452 bytes at `HEAD` to roughly 232-234KB in this branch. True webpack analyzer reports (`client.html`, `nodejs.html`, `edge.html`) are captured under `.ai/09_archive/store/2026-06-01-route-transition-analyzer-lighthouse-refresh/` (path corrected 2026-06-18 sync; the previously-cited `…-refresh-20260601T101500Z/` folder does not exist, but `client.html` is confirmed present at the corrected path). This is not a beta-DONE pack because the broader route-transition card still needs manual Chrome bfcache and React Profiler proof.

### Outcome
D3 and Three.js loaded via next/dynamic. Only loaded when charts/3D views accessed.

### Why now
D3 and Three are heavy visualization libraries. Must lazy-load before beta.

### Likely files touched
src/components/charts/, src/components/workshop/project-charts/

### Acceptance criteria
1. D3 imports replaced with next/dynamic
2. Three.js imports replaced with next/dynamic
3. Loading skeleton shown during first chart render
4. Charts still render correctly
5. Main bundle reduced

### Validation
`bun run build` → verify D3/Three in lazy chunks; manual chart rendering test.

### Performance budget
Must not regress chart render time.

### UX/UI check
Loading skeleton during first chart render.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-002D/

### Completion report
Before/after chunk sizes, chart functionality verification.

---

### BETA-P0-PERF-002E — Regression Budget Enforcement

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | IMPLEMENTED / NEEDS FULL CI GREEN |
| Owner | Codex |
| Dependencies | BETA-P0-PERF-002C, BETA-P0-PERF-002D |
| Explicit non-goals | Enforcing all public-launch budgets, blocking builds aggressively |

**2026-05-31 / 2026-06-01 evidence:** `test:e2e:perf`, `e2e/route-transition-performance-budgets.json`, and CI route-transition perf smoke wiring were added. The perf smoke passes locally and under production-like `next start`; authenticated storage-state proof now captures sidebar/project-card/estimate-row hover `_rsc` requests, authenticated Lighthouse score `0.86`, and public bfcache cache-header mitigation. This still is not a beta-DONE card because manual Chrome bfcache DevTools persisted-restore proof and production Chrome React Profiler proof remain open.

### Outcome
CI enforces main bundle size budget. Build fails if main chunk exceeds 200KB gzipped.

### Why now
Without enforcement, bundle size creeps back up. Budget must be automated.

### Likely files touched
next.config.ts, .github/workflows/ci.yml

### Acceptance criteria
1. Bundle size budget configured in next.config.ts (200KB gzipped)
2. CI build fails if budget exceeded
3. Budget is a warning initially, hard-fail after 2 weeks

### Validation
Temporarily increase bundle with large import → verify CI warns/fails.

### Performance budget
Main bundle < 200KB gzipped.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-002E/

### Completion report
Budget config, CI pass/fail evidence, current bundle size.

---

## BETA-P0-UX-001 — Core Onboarding + First-Value Flow

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | UX |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | High |
| Dependencies | Error boundaries (Wave 3) |
| Explicit non-goals | Product-led self-serve, accessibility audit, mobile editing |

### Outcome
First-time user can go from login to their first estimate with guided empty states.

### Sub-cards
- BETA-P0-UX-001A — First-run empty-state and first-value path
- BETA-P0-UX-001B — Project → estimate → first row guidance
- BETA-P0-UX-001C — Export/share guidance
- BETA-P0-UX-001D — Invite onboarding guidance
- BETA-P0-UX-001E — Client shared-link onboarding guidance

---

### BETA-P0-UX-001A — First-Run Empty-State and First-Value Path

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | IMPLEMENTED LOCALLY / REAL INVITEE SMOKE OPEN |
| Owner | Codex |
| Dependencies | BETA-P0-REL-001 (error boundaries) |
| Explicit non-goals | Full onboarding wizard, product tour, multi-step walkthrough |

### Outcome
Workshop home shows guided empty-state CTA. First-time user has clear path to first value.

### Why now
First impression gates all subsequent onboarding. Empty state must guide, not confuse.

### Likely files touched
src/app/workshop/page.tsx, src/components/workshop/

### Acceptance criteria
1. Workshop home has guided empty-state: "Create your first project"
2. Contextual help text visible
3. CTA button uses design-system Button primitive
4. Empty state uses design-system tokens
5. No white screen on first load

### Validation
Manual: fresh user visits /workshop → sees guided empty state.

### UX/UI check
Design-system compliant (SF Pro, 12px max, xs radius, neutral palette); CTA uses Button primitive.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-001A/

### Completion report
Screenshot of empty state, user test notes.

---

### BETA-P0-UX-001B — Project → Estimate → First Row Guidance

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | IMPLEMENTED LOCALLY / OWNER ACCEPTANCE PROOF OPEN |
| Owner | Codex |
| Dependencies | BETA-P0-UX-001A |
| Explicit non-goals | Auto-creating estimates, complex bootstrap logic |

### Outcome
Project creation auto-creates estimate draft with bootstrap tree. "Add your first line item" prompt in empty area.

### Why now
Must guide user from project → estimate → first row without dead ends.

### Likely files touched
src/app/workshop/projects/, src/components/workshop/estimate-sheet/

### Acceptance criteria
1. Project creation auto-creates estimate draft
2. Bootstrap tree visible after creation (Lot → Structure → Level → Area)
3. "Add your first line item" prompt in empty area
4. First row added shows calculated cost

### Validation
Manual: create project → verify auto-estimate → add first row → see cost.

### UX/UI check
All empty states use design-system Skeleton; prompts use design-system typography.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-001B/

### Completion report
Screenshot per step, time-to-first-value measurement.

---

### BETA-P0-UX-001C — Export/Share Guidance

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | IMPLEMENTED LOCALLY / REAL RECIPIENT EMAIL PROOF OPEN |
| Owner | Codex |
| Dependencies | BETA-P0-UX-001B |
| Explicit non-goals | Redesigning export UI, adding new export formats |

### Outcome
Export/Share button visible after rows exist. Clear guidance on what export/share does.

### Why now
Export and share are the primary value-delivery actions. User must discover them naturally.

### Likely files touched
src/components/workshop/estimate-sheet/, src/components/workshop/publication/

### Acceptance criteria
1. Export/Share button visible after estimate has rows
2. Tooltip or label explains what each action does
3. Button hidden when estimate is empty
4. Design-system compliant

### Validation
Manual: add rows → verify export/share button appears → verify tooltip.

### UX/UI check
Button uses design-system Button primitive; label is clear.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-001C/

### Completion report
Screenshots of export/share button states, user test notes.

---

### BETA-P0-UX-001D — Invite Onboarding Guidance

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | IMPLEMENTED LOCALLY / RESEND DASHBOARD WEBHOOK PROOF OPEN |
| Owner | Codex |
| Dependencies | BETA-P0-UX-001A |
| Explicit non-goals | Redesigning invite flow, adding invite templates |

### Outcome
Workspace owner has clear guidance on inviting collaborators. Invite flow has contextual help.

### Why now
Collaboration is a core value prop. Invite flow must be discoverable and clear.

### Likely files touched
src/app/workshop/settings/workspace/, src/components/workshop/

### Acceptance criteria
1. "Invite your team" prompt in workspace settings
2. Invite form has contextual help text
3. Invite sent confirmation is clear
4. Design-system compliant

### Validation
Manual: visit workspace settings → see invite prompt → send invite → see confirmation.

### UX/UI check
Design-system tokens; clear form labels; confirmation uses Toast primitive.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-001D/

### Completion report
Screenshots of invite flow, user test notes.

---

### BETA-P0-UX-001E — Client Shared-Link Onboarding Guidance

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | IMPLEMENTED LOCALLY / OWNER ACCEPTANCE PROOF OPEN |
| Owner | Codex |
| Dependencies | BETA-P0-UX-001C |
| Explicit non-goals | Redesigning shared link receiver, adding interactive tour |

### Outcome
Non-technical client receiving shared link sees clear guidance on what to do (review, comment, decide).

### Why now
Shared links are the primary client-facing surface. Clients must understand the interface without training.

### Likely files touched
src/app/share/[token]/, src/components/share/

### Acceptance criteria
1. Shared link receiver has clear "Here's your estimate" header
2. Tab navigation has clear labels (Sheets, Comments, Decisions)
3. Comment prompt is clear ("Leave a comment or question")
4. Decision flagging is intuitive

### Validation
Manual: open shared link as client → verify clear guidance at each step.

### UX/UI check
Clean, uncluttered layout; clear tab labels; design-system typography.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-001E/

### Completion report
Screenshots per tab, non-technical user test results.

---

## BETA-P0-UX-002 — Core Estimating Happy Path Polish

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | UX |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | Onboarding (UX-001), error boundaries (Wave 3) |
| Explicit non-goals | New features, redesign, PDF export |

### Outcome
Estimate editing experience feels polished and trustworthy for beta users.

### Sub-cards
- BETA-P0-UX-002A — Estimate editor loading/error/success states
- BETA-P0-UX-002B — Row-editing UX polish
- BETA-P0-UX-002C — Component/library insertion UX
- BETA-P0-UX-002D — XLSX export UX

---

### BETA-P0-UX-002A — Estimate Editor Loading/Error/Success States

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-REL-001 (error boundaries) |
| Explicit non-goals | Custom loading animations, complex skeleton layouts |

### Outcome
Estimate editor has consistent loading, error, and success states. No white screens.

### Why now
Loading/error states are the most visible polish gap. Users must never see a broken or blank editor.

### Likely files touched
src/app/workshop/projects/[projectId]/estimates/[nodeId]/, src/components/workshop/estimate-sheet/

### Acceptance criteria
1. Loading state: skeleton or spinner during estimate fetch
2. Error state: inline error boundary catches render failures
3. Success state: estimate renders without flash
4. No white screen in any state
5. Design-system compliant

### Validation
Manual: slow network → loading state; inject error → error boundary catches; normal load → clean render.

### UX/UI check
Skeleton uses design-system Skeleton; error state uses design-system typography.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-002A/

### Completion report
Screenshots of loading, error, success states.

---

### BETA-P0-UX-002B — Row-Editing UX Polish

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-UX-002A |
| Explicit non-goals | New edit modes, bulk editing, keyboard shortcuts |

### Outcome
Row editing has immediate feedback (optimistic UI), inline editing works for all fields, calculations update correctly.

### Why now
Row editing is the most frequent action. Must feel instantaneous and reliable.

### Likely files touched
src/components/workshop/estimate-sheet/, src/hooks/use-estimate-*.ts

### Acceptance criteria
1. Optimistic UI: edit appears immediately before server confirms
2. Inline editing for description, quantity, unit, unit-cost
3. Calculations update after edit
4. Rollback on failure with error toast
5. Focus management works for inline editing
6. Design-system lint passes

### Validation
`bun run lint:design-system`; manual editing session.

### Performance budget
Must not regress row-edit baseline from PERF-001C.

### UX/UI check
Optimistic updates with rollback on failure; error toasts on calculation failure; empty rows show placeholder text.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-002B/

### Completion report
Design-system lint output, manual editing session notes, any calculation bugs found.

---

### BETA-P0-UX-002C — Component/Library Insertion UX

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-UX-002A |
| Explicit non-goals | Redesigning library browser, adding search features |

### Outcome
Inserting components from library into estimate is smooth with clear feedback.

### Why now
Library is a core differentiator. Insertion flow must feel integrated, not bolted on.

### Likely files touched
src/components/workshop/component-library/, src/components/workshop/estimate-sheet/

### Acceptance criteria
1. Library browser opens without layout shift
2. Insert component → row appears with loading feedback
3. Insertion failure shows error toast
4. Tree updates after insertion
5. Totals recalculate after insertion

### Validation
Manual: open library → insert component → verify row and totals.

### UX/UI check
Library browser uses design-system Modal; insertion feedback uses Toast; tree update is smooth.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-002C/

### Completion report
Insertion flow screenshots, any UX issues found.

---

### BETA-P0-UX-002D — XLSX Export UX

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-UX-002A |
| Explicit non-goals | PDF export, export configuration options |

### Outcome
XLSX export has clear button, loading state during generation, success feedback on download.

### Why now
Export is a value-delivery moment. Must feel professional and reliable.

### Likely files touched
src/components/workshop/publication/, src/lib/proposal-export/

### Acceptance criteria
1. Export button is clearly labeled and discoverable
2. Loading state during generation (spinner or progress)
3. Success: file downloads, toast confirms
4. Error: clear error message with retry
5. Design-system compliant

### Validation
Manual: click export → see loading → file downloads → toast confirms.

### UX/UI check
Button uses design-system Button; loading uses Spinner; toast uses Toast primitive.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-002D/

### Completion report
Export flow screenshots, any UX issues.

---

## BETA-P0-UX-003 — Shared-Link Client Receiver Comprehension

| Field | Value |
|---|---|
| Wave | 5 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Primary risk reduced | UX |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | Wave 1 (shared link security) |
| Explicit non-goals | Redesigning share page, PDF export, immutable proposals |

### Outcome
Non-technical client receiving shared link can understand estimate without training.

### Why this comes now
Shared links are the primary value delivery mechanism to clients. If clients can't understand what they're looking at, the product fails at its core use case.

### Likely files or areas touched
src/app/share/[token]/, src/components/share/, src/lib/publication/

### Acceptance criteria
1. Shared receiver opens clean, readable estimate view
2. Tabs (Link, Sheets, Comments, Decisions) are clear
3. Comment flow works (leave, view, reply)
4. Decision flag on comments works
5. Password gate shows clear lockout if wrong password
6. Non-technical user test: "review this estimate and leave a comment" succeeds without guidance

### Validation commands or evidence
Non-technical user comprehension test.

### Performance budget
Share receiver FMP < 2s.

### Security/data check
Password gate tested by SEC-001; no data leakage between shared links.

### UX/UI check
Clean, uncluttered view suitable for non-technical audiences; clear tab navigation; comment threading is intuitive; password gate has clear error and retry; mobile-responsive share view.

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-003/

### Rollback / failure handling
Revert to simple read-only view without tabs/comments.

### Completion report requirements
Non-technical user test results, FMP measurement, screenshot of each tab.

---

## BETA-P0-REL-001 — Error Boundaries + 404/500 + Degraded States

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Primary risk reduced | UX |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | None (standalone) |
| Explicit non-goals | Full offline mode, circuit breakers, complex degraded UI |

### Outcome
Errors don't crash the app; custom error pages match design system; mobile shows desktop guard.

### Why this comes now
Error handling must exist before any UX polish (Waves 4-5) and before beta (Wave 6). No user should see a white screen or raw stack trace.

### Likely files or areas touched
src/app/error.tsx, src/app/not-found.tsx, src/components/*/error-boundary.tsx, src/components/workshop/mobile-guard.tsx

### Acceptance criteria
1. Custom not-found.tsx for workshop routes using design system
2. Custom error.tsx with retry button matching design system
3. Error boundary on estimate sheet, tree, AI panel — catches render errors, shows inline recovery
4. No white screen on error
5. Mobile viewport < 768px shows desktop guard overlay
6. Error pages don't leak stack traces

### Validation commands or evidence
Visit /workshop/nonexistent → custom 404; inject throw Error in estimate → error boundary catches; resize to 375px → desktop guard.

### Performance budget
Error pages must load < 100ms.

### Security/data check
No stack traces in error UI; no internal paths exposed in error messages.

### UX/UI check
Error pages use design-system colors/typography; retry button uses Button primitive; mobile guard has clear "please use desktop" message; error boundaries show fallback UI that keeps surrounding layout intact.

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-REL-001/

### Rollback / failure handling
Remove error boundaries; fall back to Next.js default error pages.

### Completion report requirements
Screenshot of custom 404, custom 500, error boundary fallback, mobile guard; list of components with error boundaries.

---

## BETA-P0-AI-001 — Ask/Package-Builder Clarity + Safety Evidence

| Field | Value |
|---|---|
| Wave | 5 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Primary risk reduced | Security |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | Wave 1 (API auth audit) |
| Explicit non-goals | AI memory, vector/RAG, autonomous features, AI conversation history |

### Outcome
AI features are demonstrably safe and users understand their scope.

### Why this comes now
AI features are powerful but must be transparently scoped and safe before beta. Users and design partners need to trust that AI won't leak data or hallucinate about other workspaces.

### Likely files or areas touched
src/app/api/ai/*, src/lib/ai/*, src/components/workshop/ai-panel/

### Acceptance criteria
1. Ask Flip returns error when asked about other workspace data
2. Package-builder requires explicit confirmation before writing
3. AI disclaimer visible in both ask and package-builder UI
4. DeepSeek provider is the actual AI provider (not OpenAI/Anthropic)
5. Public copy doesn't claim autonomous AI/RAG/memory
6. AI timeout shows clear UI after 30s

### Validation commands or evidence
Manual: Ask Flip "what estimates does [other workspace] have?" → must be denied; ask Flip about own workspace → must succeed with scoped data.

### Performance budget
AI timeout clear by 30s.

### Security/data check
AI must not cross workspace boundaries; AI provider stated accurately; no misleading claims about AI capabilities.

### UX/UI check
AI disclaimer is visible but not intrusive; confirmation prompt before package-builder writes; timeout UI is clear with retry option; loading state during AI processing.

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-AI-001/

### Rollback / failure handling
Disable AI features via feature flag.

### Completion report requirements
Cross-workspace denial evidence, confirmation prompt screenshot, disclaimer screenshot, AI provider verification, timeout UI screenshot.

---

## BETA-P0-UX-004 — Workshop Desktop Guard

| Field | Value |
|---|---|
| Wave | 4 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Primary risk reduced | UX |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Low |
| Dependencies | None (standalone) |
| Explicit non-goals | Responsive workshop layout, mobile estimate editing, tablet optimization |

### Outcome
Visiting /workshop/* on viewport < 768px shows a clear desktop-only guard overlay.

### Why this comes now
Mobile workshop editing not supported for beta. Desktop guard prevents broken mobile experience.

### Likely files or areas touched
src/app/workshop/layout.tsx or src/components/workshop/

### Acceptance criteria
1. Overlay appears at < 768px viewport
2. Clear message: "Archestimator works best on desktop" with guidance
3. Overlay blocks interaction with desktop layout
4. /share/[token] and public marketing pages NOT blocked (must remain mobile-responsive)
5. Design-system compliant (SF Pro, 12px max, xs radius, neutral palette)

### Validation commands or evidence
Resize to 375px, navigate to /workshop → overlay visible; navigate to /share/[token] at 375px → no overlay; navigate to / at 375px → no overlay.

### Performance budget
< 5KB added to bundle

### Security/data check
Overlay must not bypass auth; guard is purely client-side display logic.

### UX/UI check
Overlay uses design-system tokens; message is clear and helpful; no broken layout behind the overlay; smooth transition to overlay state.

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-004/

### Rollback / failure handling
Remove overlay component; revert to unguarded mobile layout.

### Completion report requirements
Screenshot of overlay on /workshop at 375px, screenshot of /share/[token] at 375px without overlay, bundle size measurement.

---

## BETA-P0-ANA-001 — First-Party Product Event Instrumentation

| Field | Value |
|---|---|
| Wave | 3 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Primary risk reduced | Product |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Low |
| Dependencies | None |
| Explicit non-goals | GA4/PostHog/Clarity, marketing analytics, cookie consent for analytics (first-party only) |

### Outcome
Minimal product events stored in Supabase for beta learning.

### Why this comes now
Need quantitative beta data alongside qualitative feedback.

### Likely files or areas touched
src/lib/analytics/, supabase/migrations/

### Acceptance criteria
1. Events table in Supabase
2. Track: login_success, project_created, estimate_created, first_row_added, estimate_exported, shared_link_created, shared_link_opened, client_comment_submitted, ask_used, package_builder_draft_created, package_builder_applied, onboarding_completed, critical_error_surfaced
3. Instrumentation adds <10ms overhead
4. Events scrubbed of PII
5. Simple dashboard or query to view event counts

### Validation commands or evidence
Perform each tracked action on staging, query events table to verify records exist; verify no PII in event payloads.

### Performance budget
< 10ms overhead per event

### Security/data check
Events must not contain PII (names, emails, IPs, estimate data); events table must have RLS; first-party analytics exempt from cookie consent in most jurisdictions — verify.

### UX/UI check
N/A (invisible instrumentation).

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-ANA-001/

### Rollback / failure handling
Disable instrumentation via feature flag; drop events table if schema issue.

### Completion report requirements
Events table schema, event inventory with counts after test session, PII audit results, dashboard/query output screenshot.

---

## BETA-P0-LEGAL-001 — Minimum Beta Legal/Limitations Pack

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 7 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Legal |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | None |
| Explicit non-goals | Full lawyer-reviewed Privacy/Terms/DPA (public launch), self-serve DSAR |

### Outcome
Minimum legal documents exist before beta.

### Sub-cards
- BETA-P0-LEGAL-001A — Minimum beta privacy notice
- BETA-P0-LEGAL-001B — Minimum beta terms / participation disclosure
- BETA-P0-LEGAL-001C — Subprocessor list
- BETA-P0-LEGAL-001D — Manual DSAR process

---

### BETA-P0-LEGAL-001A — Minimum Beta Privacy Notice

| Field | Value |
|---|---|
| Wave | 7 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Full lawyer-reviewed privacy notice, GDPR/CCPA compliance claims |

### Outcome
Minimum beta privacy notice published at /privacy covering data collected, how it's used, and beta limitations.

### Why now
Required before any external user touches the system. Privacy notice is a legal minimum.

### Likely files touched
src/app/privacy/page.tsx

### Acceptance criteria
1. Privacy notice published at /privacy
2. Covers: what data is collected, how it's used, who has access
3. States beta/pre-production status
4. Design-system compliant typography
5. Linked from footer

### Validation
Deploy and verify /privacy renders.

### UX/UI check
Design-system typography; accessible; linked from footer.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-LEGAL-001A/

### Completion report
Published URL, screenshot, content summary.

---

### BETA-P0-LEGAL-001B — Minimum Beta Terms / Participation Disclosure

| Field | Value |
|---|---|
| Wave | 7 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Full lawyer-reviewed Terms of Service, payment terms |

### Outcome
Minimum beta participation terms published at /terms. Beta limitations disclosure published.

### Why now
Legal minimum for beta. Users must understand this is pre-production software.

### Likely files touched
src/app/terms/page.tsx, .ai/01_roadmap/

### Acceptance criteria
1. Beta participation terms published at /terms
2. Beta limitations disclosure published (separate page or section)
3. States: no guarantee of uptime, data may be reset, pre-production
4. User acknowledgment template ready
5. Design-system compliant

### Validation
Deploy and verify /terms renders; verify acknowledgment template accessible.

### UX/UI check
Design-system typography; linked from footer.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-LEGAL-001B/

### Completion report
Published URLs, screenshot, acknowledgment template path.

---

### BETA-P0-LEGAL-001C — Subprocessor List

| Field | Value |
|---|---|
| Wave | 7 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | DPA negotiation, subprocessor contracts |

### Outcome
Complete subprocessor list published including all third-party services used.

### Why now
Required before beta. Users must know who processes their data.

### Likely files touched
src/app/privacy/ or src/app/terms/

### Acceptance criteria
1. Subprocessor list published
2. Includes: Supabase, Vercel, Resend, DeepSeek, Sentry, Upstash (if used), Cloudflare (if Turnstile used)
3. Each entry: name, purpose, data processed, location
4. Design-system compliant
5. Linked from privacy notice and terms

### Validation
Verify subprocessor list renders; verify all current providers listed.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-LEGAL-001C/

### Completion report
Subprocessor inventory with evidence, published URL, screenshot.

---

### BETA-P0-LEGAL-001D — Manual DSAR Process

| Field | Value |
|---|---|
| Wave | 7 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Automated DSAR UI, self-serve data export/delete |

### Outcome
Documented manual DSAR (Data Subject Access Request) process: how to handle access, deletion, and export requests.

### Why now
Legal minimum for beta. Must have a documented process for handling user data requests.

### Likely files touched
.ai/01_roadmap/, .ai/11_skills/

### Acceptance criteria
1. DSAR process documented: intake → verification → execution → response
2. Data access procedure (what to query, what to include)
3. Data deletion procedure (which tables, cascade checks)
4. Data export procedure (format, delivery method)
5. Response template

### Validation
Review DSAR process document for completeness.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-LEGAL-001D/

### Completion report
DSAR process document path, response template path.

---

## BETA-P0-OPS-001 — Support Email + Founder Ops Workflow

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 7 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Operations |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Low |
| Dependencies | None |
| Explicit non-goals | Ticketing system, help desk software, SLA guarantees |

### Outcome
SUPPORT_INBOX_PLACEHOLDER configured with auto-responder. Triage workflow documented.

### Sub-cards
- BETA-P0-OPS-001A — support@ setup checklist
- BETA-P0-OPS-001B — feedback intake tracker
- BETA-P0-OPS-001C — critical runbook drill checklist

---

### BETA-P0-OPS-001A — support@ Setup Checklist

| Field | Value |
|---|---|
| Wave | 7 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Configuring email DNS (human task), setting up help desk |

### Outcome
Documented checklist for SUPPORT_INBOX_PLACEHOLDER setup including auto-responder template.

### Why now
Beta users need a support channel. Setup must be documented before configuration.

### Likely files touched
.ai/01_roadmap/, .ai/11_skills/

### Acceptance criteria
1. Checklist: email creation, forwarding, auto-responder configuration
2. Auto-responder template drafted (acknowledges receipt, sets expectations)
3. Support link added to app footer
4. Checklist saved for OWNER_NAME_PLACEHOLDER to execute human steps

### Validation
Checklist review; footer link verification.

### UX/UI check
Support link in footer uses design-system typography.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-OPS-001A/

### Completion report
Checklist path, auto-responder template, footer screenshot.

---

### BETA-P0-OPS-001B — Feedback Intake Tracker

| Field | Value |
|---|---|
| Wave | 7 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Building a ticketing system, CRM integration |

### Outcome
Lightweight feedback tracker documented: how to log, triage, and track beta feedback.

### Why now
Beta feedback must be captured systematically. Without a tracker, feedback is lost.

### Likely files touched
.ai/01_roadmap/, .ai/11_skills/

### Acceptance criteria
1. Feedback intake template (source, severity, category, action)
2. Triage workflow: acknowledge → categorize → prioritize → assign → resolve
3. Weekly review cadence documented
4. Decision log template

### Validation
Review tracker workflow for completeness.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-OPS-001B/

### Completion report
Tracker template path, triage workflow document path.

---

### BETA-P0-OPS-001C — Critical Runbook Drill Checklist

| Field | Value |
|---|---|
| Wave | 7 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-INF-001 (staging available) |
| Explicit non-goals | Executing drills (human task), writing all runbooks |

### Outcome
Checklist of critical runbooks to drill before beta: AUTH-001, SEC-001, SEC-003, DEP-002.

### Why now
Must verify incident response procedures before beta users depend on the system.

### Likely files touched
.ai/09_archive/, .ai/11_skills/

### Acceptance criteria
1. Four critical runbooks identified and documented
2. Drill procedure per runbook: trigger, expected response, success criteria
3. Drill schedule recommended
4. Evidence capture template per drill

### Validation
Review runbook drill checklist for completeness.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-OPS-001C/

### Completion report
Runbook inventory, drill checklist path, schedule recommendation.

---

## BETA-P0-BETA-001 — Controlled Beta Kickoff System

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | BETA P0 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Product |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Low |
| Dependencies | All previous waves |
| Explicit non-goals | Public launch, payment, automated onboarding |

### Outcome
Everything needed for OWNER_NAME_PLACEHOLDER to start controlled beta with 3-5 design partners.

### Sub-cards
- BETA-P0-BETA-001A — Design-partner list
- BETA-P0-BETA-001B — Beta kickoff script
- BETA-P0-BETA-001C — Beta go/no-go checklist

---

### BETA-P0-BETA-001A — Design-Partner List

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER DESIGN PARTNER LIST FILLED |
| Owner | Codex |
| Dependencies | OWNER_NAME_PLACEHOLDER fills list (human task) |
| Explicit non-goals | Recruiting partners, sending invites |

### Outcome
Design-partner list documented with contact info, expected usage profile, and onboarding priority.

### Why now
Must know who the beta users are before kickoff. Gates beta kickoff script.

### Likely files touched
.ai/01_roadmap/

### Acceptance criteria
1. List of 3-5 design partners documented
2. Each: name, company, role, expected usage, contact info
3. Onboarding priority order
4. Document saved

### Validation
OWNER_NAME_PLACEHOLDER reviews and approves list.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-BETA-001A/

### Completion report
Partner count, list path, OWNER_NAME_PLACEHOLDER approval.

---

### BETA-P0-BETA-001B — Beta Kickoff Script

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Owner | Codex |
| Dependencies | BETA-P0-BETA-001A |
| Explicit non-goals | Sending kickoff emails, running kickoff calls |

### Outcome
Beta kickoff script written: onboarding flow, known limitations, feedback expectations, support contact.

### Why now
Consistent kickoff experience ensures every design partner gets the same information.

### Likely files touched
.ai/01_roadmap/, .ai/11_skills/

### Acceptance criteria
1. Kickoff script covers: welcome, what Archestimator is, what it's not, known limitations, how to give feedback, support contact
2. Onboarding walkthrough script (step-by-step)
3. FAQ appendix
4. Document saved

### Validation
OWNER_NAME_PLACEHOLDER reviews kickoff script for accuracy.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-BETA-001B/

### Completion report
Kickoff script path, section count, OWNER_NAME_PLACEHOLDER review status.

---

### BETA-P0-BETA-001C — Beta Go/No-Go Checklist

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER PRIOR WAVES COMPLETE |
| Owner | Codex |
| Dependencies | All BETA P0 waves complete |
| Explicit non-goals | Making the go/no-go decision (Philip), launching beta |

### Outcome
Go/no-go checklist compiled: all BETA P0 evidence aggregated, risk register reviewed, OWNER_NAME_PLACEHOLDER signoff template.

### Why now
Final gate before beta. Must have structured decision framework, not gut feel.

### Likely files touched
.ai/01_roadmap/, .ai/09_archive/

### Acceptance criteria
1. Checklist: every BETA P0 card with evidence link
2. Risk acceptance register with OWNER_NAME_PLACEHOLDER signoff line
3. Known limitations disclosure compiled
4. Go/no-go decision template

### Validation
Cross-reference checklist against Card Readiness Summary; verify all evidence paths exist.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-BETA-P0-BETA-001C/

### Completion report
Checklist with evidence links, risk register, limitations disclosure, OWNER_NAME_PLACEHOLDER signoff template.

---

## PUBLIC-P0-LEGAL-001 — Privacy/Terms/Subprocessor Package

| Field | Value |
|---|---|
| Wave | N/A |
| Lane | PUBLIC LAUNCH |
| Status | PUBLIC LAUNCH / LEGAL REVIEW REQUIRED |
| Primary risk reduced | Legal |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | Jurisdiction (D-001), legal path (D-002) |
| Explicit non-goals | Beta legal (separate path), implementing DSAR UI (other cards) |

### Outcome
Final reviewed Privacy Notice + Terms + Subprocessor list ready for public launch.

### Why this comes now
Public launch requires legal docs. These depend on jurisdiction and legal path decisions which must come from Wave 0.

### Likely files or areas touched
src/app/privacy/, src/app/terms/

### Acceptance criteria
1. Privacy Notice reviewed and published at /privacy
2. Terms of Service reviewed and published at /terms
3. Subprocessor list published (Supabase, Vercel, Resend, DeepSeek, Sentry/APM)
4. Jurisdiction stated
5. All "pending review" stubs replaced

### Validation commands or evidence
OWNER_NAME_PLACEHOLDER legal review; deploy and verify /privacy and /terms render.

### Performance budget
N/A (static pages).

### Security/data check
Legal docs must accurately reflect data handling; subprocessor list must be complete and current.

### UX/UI check
Privacy and Terms pages use design-system typography; accessible; linked from footer.

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-PUBLIC-P0-LEGAL-001/

### Rollback / failure handling
Revert to "pending review" stubs if legal review fails.

### Completion report requirements
Review status of each document, subprocessor inventory, jurisdiction statement.

---

## POST-BETA-PROD-001 — PDF/Immutable Proposal Scope → SPLIT

| Field | Value |
|---|---|
| Wave | N/A |
| Lane | POST-BETA |
| Status | SPLIT into ENTERPRISE-P1-PROD-001 and ENTERPRISE-P1-PROD-002 |
| Primary risk reduced | Product |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | High |
| Dependencies | Beta feedback on export needs |
| Explicit non-goals | Implementing PDF or immutable proposals now |

### Outcome
This card has been split into two enterprise MVP cards: ENTERPRISE-P1-PROD-001 (Immutable Issued Proposal Snapshots) and ENTERPRISE-P1-PROD-002 (PDF Package Workflow).

### Why this comes now
Post-beta: XLSX + shared links sufficient for design partner learning. PDF and immutable proposals are heavy features that need data-driven scoping, now decomposed into separate implementation cards for the enterprise MVP phase.

### Likely files or areas touched
src/lib/proposal-export/, src/app/api/projects/*/estimates/*/export/proposal.xlsx/

### Acceptance criteria
1. Beta feedback collected on export needs
2. Implementation deferred to ENTERPRISE-P1-PROD-001 and ENTERPRISE-P1-PROD-002

### Validation commands or evidence
Beta feedback summary document.

### Performance budget
N/A (planning).

### Security/data check
N/A (planning).

### UX/UI check
N/A (planning).

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-POST-BETA-PROD-001/

### Rollback / failure handling
N/A (planning).

### Completion report requirements
Beta feedback summary, confirmation that cards ENTERPRISE-P1-PROD-001 and ENTERPRISE-P1-PROD-002 subsume this scope.

---

## POST-BETA-MOBILE-001 — Mobile Workshop Strategy

| Field | Value |
|---|---|
| Wave | N/A |
| Lane | POST-BETA |
| Status | POST-MVP / FULL MOBILE EDITING |
| Primary risk reduced | Product |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | High |
| Dependencies | Beta feedback on mobile needs |
| Explicit non-goals | Implementing responsive workshop now |

### Outcome
Documented mobile strategy. Full mobile editing deferred to post-MVP.

### Why this comes now
Post-beta: desktop guard is the beta approach. Need real usage data before committing to a mobile strategy.

### Likely files or areas touched
src/app/workshop/*

### Acceptance criteria
1. Beta feedback on mobile usage collected
2. Decision: full responsive vs tablet-only vs desktop-only
3. If responsive: spec written with scope/effort estimate

### Validation commands or evidence
Beta feedback summary document.

### Performance budget
N/A (planning).

### Security/data check
N/A (planning).

### UX/UI check
N/A (planning).

### Evidence artifact to save
.ai/09_archive/store/YYYY-MM-DD-POST-BETA-MOBILE-001/

### Rollback / failure handling
N/A (planning).

### Completion report requirements
Beta feedback summary, mobile strategy decision, spec if responsive approved.

---

## ENTERPRISE-P1-PROD-001 — Immutable Issued Proposal Snapshots

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | ENTERPRISE MVP P1 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Product |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | High |
| Dependencies | Beta feedback, POST-BETA-PROD-001 split |
| Explicit non-goals | Implementing now (enterprise MVP), PDF generation (separate card), billing |

### Outcome
Immutable issued proposal snapshots with revision comparison and audit policy.

### Sub-cards
- ENTERPRISE-P1-PROD-001A — Snapshot product/technical design
- ENTERPRISE-P1-PROD-001B — Snapshot schema and migration plan
- ENTERPRISE-P1-PROD-001C — Snapshot read model and audit policy

---

### ENTERPRISE-P1-PROD-001A — Snapshot Product/Technical Design

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | ENTERPRISE MVP P1 |
| Status | PLANNED |
| Owner | Codex |
| Dependencies | Beta feedback |
| Explicit non-goals | Implementing snapshots, writing code |

### Outcome
Product and technical design for immutable issued proposal snapshots: data model, issuance flow, immutability guarantees.

### Why now
Design before build. Must define what a snapshot is before implementing.

### Likely files touched
.ai/03_plans/, .ai/06_specs/

### Acceptance criteria
1. Snapshot data model designed
2. Issuance flow documented (estimate → issue → snapshot)
3. Immutability strategy defined (DB constraints, RLS, audit log)
4. Revision comparison UX sketched

### Validation
Design review.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-ENTERPRISE-P1-PROD-001A/

### Completion report
Design doc path, data model diagram, issuance flow diagram.

---

### ENTERPRISE-P1-PROD-001B — Snapshot Schema and Migration Plan

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | ENTERPRISE MVP P1 |
| Status | PLANNED |
| Owner | Codex |
| Dependencies | ENTERPRISE-P1-PROD-001A |
| Explicit non-goals | Running migrations, modifying existing tables without design |

### Outcome
Snapshot schema designed. Migration plan documented with rollback strategy.

### Why now
Schema changes are the riskiest part of snapshot implementation. Must plan carefully.

### Likely files touched
supabase/migrations/, .ai/06_specs/

### Acceptance criteria
1. Snapshot tables designed (snapshot header, snapshot tree, snapshot rows)
2. Migration plan with up/down scripts
3. Impact assessment on existing estimate tables
4. Rollback plan documented

### Validation
Schema design review; migration plan review.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-ENTERPRISE-P1-PROD-001B/

### Completion report
Schema DDL, migration plan path, impact assessment.

---

### ENTERPRISE-P1-PROD-001C — Snapshot Read Model and Audit Policy

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | ENTERPRISE MVP P1 |
| Status | PLANNED |
| Owner | Codex |
| Dependencies | ENTERPRISE-P1-PROD-001A |
| Explicit non-goals | Implementing read model, building audit UI |

### Outcome
Snapshot read model designed (how to query and display snapshots). Audit policy defined (who can issue, who can view, immutability enforcement).

### Why now
Read model and audit policy must be designed alongside schema. Defines data access patterns.

### Likely files touched
.ai/06_specs/, src/lib/publication/

### Acceptance criteria
1. Read model: snapshot query patterns, projection design
2. Audit policy: issuance permissions, view permissions, immutability rules
3. RLS design for snapshot tables
4. Revision comparison read pattern

### Validation
Read model review; audit policy review.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-ENTERPRISE-P1-PROD-001C/

### Completion report
Read model doc path, audit policy doc path.

---

## ENTERPRISE-P1-PROD-002 — PDF Package Workflow

> **EPIC / SPLIT REQUIRED** — Do not execute directly. Use sub-cards below.

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | ENTERPRISE MVP P1 |
| Status | EPIC / SPLIT REQUIRED |
| Primary risk reduced | Product |
| Owner | OWNER_NAME_PLACEHOLDER |
| Estimated blast radius | Medium |
| Dependencies | ENTERPRISE-P1-PROD-001 (immutable snapshots) |
| Explicit non-goals | Implementing now (enterprise MVP), PDF from mutable estimates (must use snapshots) |

### Outcome
PDF/client-facing package generated from immutable issued snapshots.

### Sub-cards
- ENTERPRISE-P1-PROD-002A — PDF package product spec
- ENTERPRISE-P1-PROD-002B — PDF rendering architecture
- ENTERPRISE-P1-PROD-002C — PDF performance and async strategy

---

### ENTERPRISE-P1-PROD-002A — PDF Package Product Spec

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | ENTERPRISE MVP P1 |
| Status | PLANNED |
| Owner | Codex |
| Dependencies | ENTERPRISE-P1-PROD-001A |
| Explicit non-goals | Implementing PDF, designing templates |

### Outcome
Product spec for PDF package: what sections, branding, layout, client-facing requirements.

### Why now
Must define what the PDF contains before designing the rendering architecture.

### Likely files touched
.ai/06_specs/

### Acceptance criteria
1. PDF sections defined (cover, summary, estimate tree, line items, totals, terms)
2. Branding requirements (logo, colors, fonts)
3. Client-facing requirements (readable, professional, branded)
4. Template strategy (single template vs configurable)

### Validation
Spec review.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-ENTERPRISE-P1-PROD-002A/

### Completion report
Product spec path, section inventory, branding requirements.

---

### ENTERPRISE-P1-PROD-002B — PDF Rendering Architecture

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | ENTERPRISE MVP P1 |
| Status | PLANNED |
| Owner | Codex |
| Dependencies | ENTERPRISE-P1-PROD-002A |
| Explicit non-goals | Building PDF renderer, selecting PDF library without analysis |

### Outcome
PDF rendering architecture: library selection, server-side vs client-side, template engine.

### Why now
Architecture decision gates implementation. Must evaluate options before building.

### Likely files touched
.ai/03_plans/, src/lib/proposal-export/

### Acceptance criteria
1. PDF library evaluated (react-pdf, pdf-lib, puppeteer, etc.)
2. Rendering strategy: server-side vs client-side vs hybrid
3. Template engine approach
4. Architecture decision documented with rationale

### Validation
Architecture review.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-ENTERPRISE-P1-PROD-002B/

### Completion report
Library recommendation, rendering strategy, architecture doc path.

---

### ENTERPRISE-P1-PROD-002C — PDF Performance and Async Strategy

| Field | Value |
|---|---|
| Wave | 6 |
| Lane | ENTERPRISE MVP P1 |
| Status | PLANNED |
| Owner | Codex |
| Dependencies | ENTERPRISE-P1-PROD-002B |
| Explicit non-goals | Implementing async queue, building progress UI |

### Outcome
PDF performance budget defined. Async generation strategy documented (background job, progress notification, download delivery).

### Why now
PDF generation is slow. Must plan async strategy before implementation to avoid blocking UX.

### Likely files touched
.ai/03_plans/, .ai/06_specs/

### Acceptance criteria
1. Performance budget: target generation time per estimate size
2. Async strategy: background job vs streaming vs polling
3. Progress notification UX design
4. Download delivery mechanism
5. Timeout and retry strategy

### Validation
Performance budget review; async strategy review.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-ENTERPRISE-P1-PROD-002C/

### Completion report
PDF performance budget doc, async strategy doc, UX wireframe for progress.

---

## HUMAN-P0-COLLAB-001A — Configure Supabase Auth Email Provider

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | BLOCKED — SUPABASE AUTH PROVIDER/DASHBOARD PROOF NEEDED |
| Primary risk reduced | Collaboration |
| Owner | OWNER_NAME_PLACEHOLDER (manual, provider dashboard) |
| Dependencies | None |
| Explicit non-goals | Code changes, Resend shared-link email setup, generating invite env var secrets, applying migrations |

### Outcome
Supabase Auth email/SMTP provider configured for collaboration invite delivery. This unblocks the entire invite system.

### Why now
Collaboration invites are locally hardened but **external provider proof is still open**. Without Supabase Auth email/provider configuration, target invite env vars, hosted template/confirmation proof, and real inbox click-through, the invite lifecycle cannot be called beta-ready.

### Likely areas touched
Supabase dashboard (Authentication → Email → SMTP Provider Settings)

### Acceptance criteria
1. Supabase Auth email provider configured (SMTP or Supabase-managed)
2. Test invite delivery verified (redacted screenshot)
3. Provider configuration documented for staging and production environments
4. Evidence saved

### Validation
Send test invite email; verify delivery; redacted dashboard screenshot.

### Performance budget
N/A (provider dashboard configuration).

### Security/data check
Provider credentials must not be stored in repo. Email delivery must use authenticated SMTP.

### UX/UI check
N/A (provider configuration).

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-HUMAN-P0-COLLAB-001A/

### Completion report
Redacted Supabase dashboard screenshot, test invite delivery evidence, provider configuration summary.

---

## CODEX-P0-COLLAB-001B — Invite Environment Variable Inventory

| Field | Value |
|---|---|
| Wave | 1 |
| Lane | BETA P0 |
| Status | PARTIAL — TARGET ENV/PROVIDER PROOF OPEN |
| Primary risk reduced | Collaboration |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Generating real secrets, configuring provider dashboards, applying migrations |

### Outcome
Roadmap/env docs and env templates identify `PROJECT_INVITE_ENTRY_ENABLED` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` with their purpose, required environments, and security classification.

### Why now
These env vars are missing from the current env inventory (see `.ai/01_roadmap/04-auth-provider-vercel-environment-readiness.md`). Without them, the `/invite/[token]` acceptance path is disabled. Must document before provisioning.

### Likely files touched
.ai/01_roadmap/04-auth-provider-vercel-environment-readiness.md, .env.local template, .env.example

### Acceptance criteria
1. `PROJECT_INVITE_ENTRY_ENABLED` documented with purpose, local/staging/prod status
2. `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` documented with purpose, local/staging/prod status
3. Both vars added to env template files
4. Security classification: both are server-side secrets (not NEXT_PUBLIC_)

### Validation
Grep env templates for invite vars; cross-reference with audit pack findings.

### Performance budget
N/A (docs only).

### Security/data check
`ARCHESTIMATOR_INVITE_TOKEN_PEPPER` must never be client-exposed. Both vars must be classified as server-only.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-COLLAB-001B/

### Completion report
Updated env inventory, env template diff, cross-reference with audit pack.

---

## CODEX-P0-COLLAB-002 — Invite Acceptance Route Fail-Closed / POST-Only

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | IMPLEMENTED LOCALLY / REAL INVITE SMOKE OPEN |
| Primary risk reduced | Security |
| Owner | Codex |
| Dependencies | HUMAN-P0-COLLAB-001A (email provider), CODEX-P0-COLLAB-001B (env var inventory) |
| Explicit non-goals | Full invite redesign, email template changes, new invite UX |

### Outcome
`/invite/[token]/accept` is POST-only, fails closed when `PROJECT_INVITE_ENTRY_ENABLED` is missing, and does not mutate state on GET requests.

### Why now
Current code has a GET-based acceptance mutation risk. The acceptance path is disabled pending config, but once enabled it must be secure. The audit pack identifies this as a critical gap.

### Likely files touched
src/app/invite/[token]/accept/route.ts, src/app/invite/[token]/page.tsx, src/lib/collaboration/actions.ts

### Acceptance criteria
1. GET to `/invite/[token]/accept` does NOT mutate invite state or grant access
2. Missing `PROJECT_INVITE_ENTRY_ENABLED` disables acceptance entirely
3. Token is never logged in server logs or error messages
4. Wrong-account, expired, revoked, and already-used states return stable error codes
5. CSRF protection on POST mutation endpoint
6. Rate limiting applied (see BETA-P0-SEC-005)

### Validation
`bun run test:e2e` (invite specs); manual: GET /invite/[token]/accept → 405 or redirect without mutation; POST with missing config → fail closed.

### Performance budget
Rate-limit check < 5ms per request.

### Security/data check
CRITICAL: GET must not grant access. Token must never be logged. Missing config must fail closed. CSRF/origin checks on POST.

### UX/UI check
Error states for wrong-account/expired/revoked/used must be clear and use design-system tokens.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-COLLAB-002/

### Completion report
Route audit results, POST-only verification test output, fail-closed evidence.

---

## CODEX-P0-COLLAB-003 — Invite Lifecycle E2E Validation

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | BLOCKED — REAL EMAIL PROVIDER LIFECYCLE SMOKE NEEDED |
| Primary risk reduced | Collaboration |
| Owner | Codex |
| Dependencies | HUMAN-P0-COLLAB-001A (email provider configured), CODEX-P0-COLLAB-001B (invite env vars configured), staging target exists |
| Explicit non-goals | Invite email template design, invite UX redesign |

### Outcome
E2E tests validate the full invite lifecycle: valid invite acceptance, expired invite rejection, revoked invite rejection, already-used invite rejection, and wrong-account recovery.

### Why now
Invite lifecycle is the core collaboration flow. Must be proven end-to-end before any beta users touch the system. Currently blocked by missing config — this card executes AFTER config unblock.

### Likely files touched
e2e/invite-entry.spec.ts, tests/vitest/invite-lifecycle.test.ts

### Acceptance criteria
1. Valid invite: issue → resolve → accept → grant membership → redirect to project
2. Expired invite: resolve succeeds, accept rejected with clear error
3. Revoked invite: resolve fails, accept rejected
4. Already-used invite: resolve succeeds, accept rejected (replay protection)
5. Wrong-account: resolve with different email → "wrong account" recovery path
6. POST-only acceptance enforced (see CODEX-P0-COLLAB-002)
7. All states return stable error codes without leaking internal state

### Validation
`bun run test:e2e -- e2e/invite-entry.spec.ts`; `bun run test tests/vitest/invite-lifecycle.test.ts`

### Performance budget
Invite resolution < 100ms; acceptance < 200ms.

### Security/data check
Token must not be logged. Invite state transitions must be atomic. Replay protection must survive restarts.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-COLLAB-003/

### Completion report
E2E test output, lifecycle state matrix, replay protection evidence.

---

## CODEX-P0-COLLAB-004 — Invite Messaging Truthfulness

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | IMPLEMENTED LOCALLY / PROVIDER DELIVERY PROOF OPEN |
| Primary risk reduced | UX |
| Owner | Codex |
| Dependencies | None (can audit current messaging without config) |
| Explicit non-goals | Provider email template redesign, Resend template changes |

### Outcome
UI and API messaging cannot say "email sent" or "invite sent" unless delivery is confirmed. False-positive messaging is eliminated.

### Why now
The audit pack identifies that current user messaging can produce false-positive "invite email sent" states even when no email is actually delivered. This is a trust and UX issue that must be fixed before beta.

### Likely files touched
src/app/workshop/projects/[projectId]/, src/components/workshop/teamspaces/, src/lib/collaboration/actions.ts

### Acceptance criteria
1. Audit all invite-related UI strings for "email sent", "invitation sent", "invite sent"
2. Replace with truthful messaging: "Invitation created" or "Invite link ready" when email delivery is not confirmed
3. Only show "email sent" messaging when Supabase Auth email provider is configured AND delivery is confirmed
4. API responses for invite creation must not claim email delivery unless confirmed

### Validation
Manual audit of all invite UI strings; grep for "email sent", "invitation sent" in src/; verify messaging truthfulness in each state.

### Performance budget
N/A (string audit).

### Security/data check
No security impact — UX truthfulness improvement.

### UX/UI check
All invite messaging must use design-system typography and truthful language.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-COLLAB-004/

### Completion report
Messaging audit results, before/after string comparison, screenshot of truthful invite states.

---

## CODEX-P1-COLLAB-005 — Invite Visibility Signifiers

| Field | Value |
|---|---|
| Wave | 4-5 (parallel with UX waves) |
| Lane | BETA P1 |
| Status | READY FOR CODEX |
| Primary risk reduced | UX |
| Owner | Codex |
| Dependencies | CODEX-P0-COLLAB-002 (acceptance route enabled) |
| Explicit non-goals | Invite redesign, new notification system, email template changes |

### Outcome
Pending, sent, opened, accepted, expired, and revoked invite states are visible in project sidebar, homebase, and modal surfaces.

### Why now
The audit pack identifies that invite state visibility is almost non-existent in current UI. For beta, OWNER_NAME_PLACEHOLDER manages invites manually, but visibility improves the collaboration experience. BETA P1 — can be deferred if P0 invite work is incomplete.

### Likely files touched
src/components/workshop/teamspaces/, src/components/sidebar/, src/app/workshop/page.tsx

### Acceptance criteria
1. Pending invites visible in project Teamspaces modal with status
2. Invite status badges on project cards (if applicable)
3. Sidebar/homebase shows active/pending invite counts
4. Expired/revoked states clearly distinguished
5. Design-system compliant (SF Pro, 12px max, xs radius)

### Validation
Manual: issue invites in various states, verify each is visible with correct status in UI.

### UX/UI check
Invite status badges use neutral palette; pending/active/expired states visually distinct; design-system tokens.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P1-COLLAB-005/

### Completion report
Screenshots of invite states in project/sidebar/homebase, UX review notes.

---

## CODEX-P1-SHARE-001 — Shared-Link Visibility Signifiers

| Field | Value |
|---|---|
| Wave | 4-5 (parallel with UX waves) |
| Lane | BETA P1 |
| Status | READY FOR CODEX |
| Primary risk reduced | UX |
| Owner | Codex |
| Dependencies | None (shared-link already functional) |
| Explicit non-goals | Shared-link redesign, new notification system |

### Outcome
Project cards, homebase, and project page show shared-link state with one-click copy and activity dot.

### Why now
The audit pack identifies missing project-card/homebase link status indicators and missing one-click copy. These are industry-parity features. BETA P1 — can be deferred if beta is small and partners are briefed.

### Likely files touched
src/components/workshop/projects/ProjectCard.tsx, src/app/workshop/page.tsx, src/app/workshop/projects/[projectId]/page.tsx

### Acceptance criteria
1. Project cards show shared-link status badge (active/inactive/locked)
2. Homebase shows shared-link activity indicators
3. One-click copy button on project page for active shared link
4. Activity dot or indicator when shared link has recent recipient activity
5. Design-system compliant

### Validation
Manual: create shared link → verify badges on project card and homebase → verify one-click copy works.

### UX/UI check
Status badges use neutral palette; one-click copy uses shared UI primitives; activity dot is subtle.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P1-SHARE-001/

### Completion report
Screenshots of shared-link badges, one-click copy UX, activity indicators.

---

## CODEX-P1-SHARE-002 — Shared-Link Recipient Tracking

| Field | Value |
|---|---|
| Wave | 4-5 |
| Lane | BETA P1 or ENTERPRISE MVP |
| Status | READY FOR CODEX |
| Primary risk reduced | Product |
| Owner | Codex |
| Dependencies | None (shared-link recipient schema exists) |
| Explicit non-goals | Full analytics dashboard, recipient engagement scoring, email open tracking |

### Outcome
Per-recipient open tracking plan and implementation: who opened the shared link, when, and which sheets they viewed.

### Why now
The audit pack identifies missing per-recipient open tracking. Current tracking is limited to aggregate open counts. Per-recipient tracking is needed for client engagement visibility. Lane: BETA P1 or Enterprise MVP depending on roadmap decision.

### Likely files touched
src/lib/publication/events.ts, src/app/api/share/[token]/, src/components/share/

### Acceptance criteria
1. Per-recipient open events recorded (recipient email, timestamp, sheets viewed)
2. Open events visible in shared-link activity/recipients tab
3. Recipient identity linked to shared_link_recipients table where applicable
4. PII scrubbed from logs
5. No impact on shared-link load performance

### Validation
Manual: open shared link as recipient → verify open event recorded → verify visible in activity tab.

### Performance budget
Open event recording must not add >50ms to share page load.

### Security/data check
Recipient PII must not appear in logs or error messages. Open events must be RLS-scoped.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P1-SHARE-002/

### Completion report
Recipient tracking evidence, activity tab screenshot, performance baseline.

---

## CODEX-P1-SHARE-003 — Shared-Link Owner Digest Sender Fix

| Field | Value |
|---|---|
| Wave | 4-5 |
| Lane | BETA P1 |
| Status | READY FOR CODEX |
| Primary risk reduced | UX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Digest redesign, new notification channels |

### Outcome
Owner digest sender/display identity uses real authenticated sender context instead of hardcoded/placeholder sender.

### Why now
The audit pack identifies that owner digest uses hardcoded/placeholder sender behavior. This is unprofessional for client-facing communications. BETA P1.

### Likely files touched
src/lib/publication/digest.ts, src/lib/email/resend-client.ts, src/app/api/share/[token]/digest/

### Acceptance criteria
1. Digest sender identity derived from authenticated user profile (name + workspace)
2. No hardcoded placeholder sender names in digest content
3. Sender identity visible in digest email content and activity feed
4. Falls back gracefully if profile data unavailable

### Validation
Manual: trigger owner digest → verify sender identity in email and activity feed → verify no placeholder.

### UX/UI check
Sender identity uses real profile data; fallback uses generic but not misleading label.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P1-SHARE-003/

### Completion report
Digest sender evidence (screenshots), before/after comparison.

---

## CODEX-P1-SHARE-004 — Shared-Link Destructive Confirmations

| Field | Value |
|---|---|
| Wave | 4-5 |
| Lane | BETA P1 |
| Status | READY FOR CODEX |
| Primary risk reduced | UX |
| Owner | Codex |
| Dependencies | None |
| Explicit non-goals | Undo/restore functionality, soft-delete |

### Outcome
Revoke, remove, and other destructive share actions require explicit confirmation before executing.

### Why now
The audit pack identifies missing destructive-action confirmations. Accidental link revocation or recipient removal could disrupt client access. BETA P1.

### Likely files touched
src/components/workshop/publication/, src/app/workshop/projects/[projectId]/

### Acceptance criteria
1. Revoke shared link → confirmation dialog with consequences explained
2. Remove recipient → confirmation dialog
3. Destructive actions use design-system Modal/confirm pattern
4. No destructive action executes without confirmation

### Validation
Manual: attempt to revoke link → verify confirmation appears → verify revoke only on confirm → verify cancel aborts.

### UX/UI check
Confirmation dialog uses design-system Modal; clear consequences explained; Cancel/Confirm buttons distinct; destructive action button uses warning styling.

### Evidence artifact
.ai/09_archive/store/YYYY-MM-DD-CODEX-P1-SHARE-004/

### Completion report
Screenshots of confirmation dialogs for each destructive action.

---

## CODEX-P0-DBIDX-001 — Database Index & Query Plan Audit

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX |
| Primary risk reduced | Performance |
| Owner | Codex |
| Dependencies | None for repo inspection; staging preferred for live metrics |
| Explicit non-goals | Creating indexes, running DDL, modifying migrations, applying schema changes |

### Outcome
Complete index/query inventory and critical flow query map. All results documented, no DDL executed.

### Why now
Must understand current index coverage and query patterns before beta. Prevents reactive/speculative indexing under scale pressure. Supabase advisor already flags many unindexed FKs.

### Likely files touched
`supabase/migrations/*.sql` (read-only inspection), `src/lib/repositories/` (read-only), plan documents

### Acceptance criteria
1. Existing indexes inventoried from migrations and/or live schema
2. Query hotspots mapped from codebase against critical user flows
3. Supabase advisor findings summarized
4. Unindexed FK inventory classified into priority buckets (must-index-now, monitor, not-worth, already-covered)
5. Critical user flows mapped to query shapes
6. No DDL executed

### Validation
Manual: run read-only SQL from plan doc 01; cross-reference with migration files; verify classification.

### Performance budget
N/A (read-only audit).

### Security/data check
No data access beyond read-only metadata queries.

### Evidence artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-001/`

### Completion report
Index inventory, query hotspot map, FK classification, advisor summary.

---

## CODEX-P0-DBIDX-002 — Supabase Migration Parity & Shared-Link Schema Reconciliation

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Primary risk reduced | Performance / Data Integrity |
| Owner | Codex |
| Dependencies | Staging Supabase target |
| Explicit non-goals | Applying migrations, creating indexes, modifying schema |

### Outcome
Prove local migrations, linked dev/staging schema, and code expectations match. Any shared-link table drift documented as blocker.

### Why now
Migration parity must be verified before designing indexes. Shared-link recipient/comment/response/event tables may not exist in the live schema despite code references.

### Likely files touched
`supabase/migrations/` (read-only), live Supabase schema (read-only queries)

### Acceptance criteria
1. Local migrations list captured
2. Live schema table list captured
3. Shared-link tables checked: `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`
4. Any mismatch documented as blocker
5. No schema changes applied

### Validation
Compare local migration list against live `information_schema.tables`; document drift.

### Performance budget
N/A (read-only reconciliation).

### Evidence artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-002/`

### Completion report
Migration parity report, shared-link table status, drift documentation.

---

## CODEX-P0-DBIDX-003 — EXPLAIN Protocol for Critical Queries

| Field | Value |
|---|---|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED |
| Primary risk reduced | Performance |
| Owner | Codex |
| Dependencies | Staging with representative seed data |
| Explicit non-goals | Creating indexes, running DDL |

### Outcome
EXPLAIN/ANALYZE protocol for estimate, library, homebase, publication, invite, and AI audit queries. Before-index baseline format defined with representative seed-size assumptions.

### Why now
Must have query plan evidence before any index can be proposed. Prevents speculative indexing.

### Acceptance criteria
1. EXPLAIN templates written for all critical flows (homebase, estimate, library, publication, invite, AI audit)
2. Representative seed-size assumptions documented: 10 projects, 50 estimates, 500 nodes, 1,000 row items, 5,000 library items, 1,000 publication/audit events
3. Before-index baseline format defined
4. No DDL executed

### Validation
If staging is accessible: run EXPLAIN (without ANALYZE) on each template; capture plan type and estimated cost.

### Performance budget
N/A (read-only protocol definition).

### Evidence artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-003/`

### Completion report
EXPLAIN template count, seed-size assumptions, baseline format documentation.

---

## CODEX-P1-DBIDX-004 — Candidate Index Migration Draft for Staging

| Field | Value |
|---|---|
| Wave | 3 (after audit + EXPLAIN) |
| Lane | BETA P1 |
| Status | READY FOR CODEX AFTER DBIDX-001/002/003 |
| Primary risk reduced | Performance |
| Owner | Codex |
| Dependencies | DBIDX-001 (audit), DBIDX-002 (parity), DBIDX-003 (EXPLAIN evidence) |
| Explicit non-goals | Applying to production, creating indexes without EXPLAIN evidence |

### Outcome
Draft a candidate migration for staging review only. Includes only evidence-backed indexes with rationale. Rollback/drop plan included.

### Why now
After audit and EXPLAIN evidence exists, draft the migration for staging testing. Do not apply to production until staging-validated.

### ⚠️ Important
This card may create a draft migration only after owner approval of the EXPLAIN evidence. Until then, keep SQL in the plan document.

### Acceptance criteria
1. Migration draft includes only evidence-backed indexes
2. Each index has rationale and matching query
3. Redundant indexes avoided (checked against existing)
4. Rollback/drop plan written
5. No production application

### Validation
Cross-reference each proposed index against existing indexes; verify EXPLAIN evidence exists for each.

### Performance budget
Migration must not add >10% write overhead in staging benchmarks.

### Evidence artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P1-DBIDX-004/`

### Completion report
Migration draft path, index count, rationale per index, rollback plan.

---

## CODEX-P1-DBIDX-005 — Database Search Index Strategy

| Field | Value |
|---|---|
| Wave | 6 (enterprise MVP) |
| Lane | BETA P1 / ENTERPRISE MVP |
| Status | PLANNED |
| Primary risk reduced | Performance |
| Owner | Codex |
| Dependencies | Server-side search decision |
| Explicit non-goals | Creating search indexes before search moves server-side, vector/RAG indexes |

### Outcome
Define pg_trgm/full-text strategy if and when search moves server-side. No indexes created unless use cases are approved.

### Why now
Search indexing must be planned before it becomes an emergency, but must not be implemented before the product actually moves search server-side.

### Acceptance criteria
1. Search use cases listed from current and planned UI search surfaces
2. pg_trgm vs tsvector decision documented with rationale
3. No vector/RAG index included unless explicitly approved
4. Search index candidates tied to UI search surfaces

### Validation
Review search use cases against UI inventory; verify no speculative vector indexes.

### Performance budget
N/A (strategy document only).

### Evidence artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P1-DBIDX-005/`

### Completion report
Search use case inventory, technology decision, candidate index list.

---

## Status Legend

| Status | Meaning |
|---|---|
| `DONE` | Implemented and evidence exists |
| `READY FOR CODEX` | Codex can execute immediately |
| `READY FOR CODEX AFTER ...` | Blocked on named dependency |
| `READY FOR HUMAN EXTERNAL SETUP` | Human must perform external setup before Codex can proceed |
| `EPIC / SPLIT REQUIRED` | Non-executable — use sub-cards |
| `PLANNED` | Future work, not yet scoped for execution |
| `PUBLIC LAUNCH / LEGAL REVIEW REQUIRED` | Blocked on public launch + legal review |
| `POST-MVP / FULL MOBILE EDITING` | Post-MVP, deferred |
| `SPLIT into ...` | Card has been decomposed into sub-cards |

## Strict Rules

1. **No production launch claim** may be added unless there is matching evidence in `.ai`, tests, provider screenshots/checklists, or owner decision logs.
2. **No merge to `main`** without OWNER_NAME_PLACEHOLDER approval.
3. **No deploy** without OWNER_NAME_PLACEHOLDER approval.
4. **Public copy** must claim only currently shipped, verified capability.
5. **Proposal export copy** must distinguish mutable XLSX export from future immutable issued snapshots.
6. **AI copy** must describe scoped Ask and confirmation-gated package-builder — not autonomous estimation.
7. **One atomic card = one Ralph Loop session.** Do not chain multiple cards in one `/goal`.
8. **Evidence artifact path required** before marking any card DONE.
