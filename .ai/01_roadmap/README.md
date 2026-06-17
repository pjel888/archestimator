# Archestimator Production-Readiness Command Center

**Last updated:** 2026-06-13
**Status:** Pre-launch MVP — repo-local launch implementation remains controlled; external/provider/manual proof lane remains open.

## 2026-06-06 UI Component Library + Storybook plan

- Canonical docs-only plan package:
  `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/`.
- Status: `100/100 READY_FOR_IMPLEMENTATION_HANDOFF` for docs,
  `READY_AFTER_PACKAGE_APPROVAL` for Storybook setup, and
  `DEFERRED_BY_DESIGN` for production app migration.
- Scope: future Storybook-first ArchEstimator UI Component Library with
  foundations, icons, typography, actions, forms, menus, overlays, navigation,
  cards/panels, tables/grids, trees, lists, feedback, layout, media, charts,
  domain components, motion/blocks, utilities, governance, and story coverage.
- Handoff details: 809 inventory rows, 703 P0/P1 Storybook story rows, and
  supplemental docs for source adoption, config skeletons, fixture/decorator
  contracts, API reference, backlog, Philip review, and validation commands.
- The previous tree optimization/componentization plan is preserved as the
  domain tree sub-plan; it is no longer the whole component-library strategy.
- No source code, package, dependency, runtime config, migration, provider
  setting, Storybook install, or app behavior changed in this planning pass.
- Do not migrate production app UI until Philip approves the implemented
  Storybook result in a separate future pass.

## 2026-06-06 Terms and Conditions implementation

- Archived plan package: `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`.
- Source branch: `codex/terms-and-conditions` (merged to `main` in the Terms closeout run).
- Status: MERGED_TO_MAIN / LINKED_SUPABASE_TERMS_MIGRATION_VERIFIED / LEGAL_REVIEW_AND_HOSTED_SMOKE_OPEN.
- Scope delivered: versioned Terms/Privacy content, authenticated clickwrap gate at `/workshop/terms`, append-only Supabase acceptance migration, service-role-stamped persistence, own-row RLS read policy, settings/login/legal links, regression tests, and linked Supabase exact-file migration/type-shape proof.
- Legal guardrails remain: no absolute zero-liability claim; use strongest commercially reasonable legal-reviewable SaaS protection only; final public/paid Terms require qualified lawyer review.
- Terms-specific provider gate closed: migration `20260606095935` is applied/repaired/verified on linked ArchEstimator Supabase project `ebxxqidacheyapmmzavr`, and the committed Terms type block matches linked-generated types. Remaining provider/data gates are hosted real-user acceptance smoke, local Docker parity if needed, and global migration-history reconciliation before broad `db push`.

## 2026-06-06 Terms and Conditions implementation plan

- New docs-only implementation plan: `.ai/03_plans/2026-06-06-terms-and-conditions-sheet/`.
- Status: planning-ready for future engineering after legal/product decisions and qualified legal review of final Terms copy.
- Scope: versioned Terms, acceptance evidence, Supabase/RLS, re-acceptance, auth/protected-route UX, legal/support evidence, billing edge-case planning.
- No code, migration, dependency, provider, runtime, or billing implementation has been performed.
- Do not claim absolute zero liability; implement strongest commercially reasonable legal-reviewable SaaS protection only.

## 2026-06-13 Templates Feature Audit & Improvement Plan

- Plan package: `.ai/03_plans/2026-06-13-Templates-Audit-And-Improvement-Plan/`.
- Status: `AUDIT COMPLETE — planning only, no code/schema/data changed.` 18 documents with 2nd-pass adversarial review. Owner decisions D-A, D-B, D-C required to proceed.
- Scope: Full end-to-end audit of the Templates feature including the "Projects Auto-Added To Templates" capability. Covers custom templates, project-derived sources, estimate-tab strip, tab-aware XLSX export, and the library browse route. Multi-perspective audit across architecture, UX/UI, performance, data/state, database/RLS/security, blast radius, functional defects, and strategy.
- Headline findings: Custom templates are solid; the project-source capability is browse-only live (estimate_tabs foundation not applied to live DB, insert path never built, live outline 500s with raw error leak). Live insert RPC authorizes on workspace membership only (viewer can insert — privilege gap). Recommended first slice: outline fallback fix + safe error surface + insert RPC gate hardening + outline caching.
- No application code, migration, type, test, config, or provider state was modified by this planning pass.

## 2026-06-13 Shared Link Improvement Plan

- Plan package: `.ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/`.
- Status: `PLANNING COMPLETE — 15 documents, hardened by 2 independent adversarial passes. Ready for owner sign-off.`
- Scope: Comprehensive multi-perspective audit of the shared link `/share/[token]` feature and improvement plan covering UX/UI, performance, database, security, blast radius, and owner-modal functional audit. 6 audit perspectives + 2nd-pass receiver hardening red-team + owner-modal functional bug audit.
- Headline finding: the public page is capped at `max-w-[960px]` centered with 8–12px type — the "wasted space" complaint. The fix is a full-browser layout overhaul. The 2nd pass found 42 distinct bugs in the owner modal (7 high-severity including silent recipient eviction and rotate-orphan 404ing emailed links). Already-verified-fixed-on-main: CSRF, activity 403, CostDonutChart hydration, durable rate limiting.
- No code, schema, or data was changed by this planning pass.

## 2026-06-13 Spreadsheet / XLSX Export Audit & Improvement Plan

- Plan package: `.ai/03_plans/2026-06-13-Spreadsheet-Export-Plan/`.
- Status: `AUDIT COMPLETE — planning only, no code changed. 12 documents after 2nd-pass adversarial review. 9 owner decisions needed (D0–D8).`
- Scope: End-to-end audit of the XLSX proposal export feature — UX/UI (modal, preview-vs-file truth), BOQ format benchmark (10 real industry files parsed), performance benchmarks, security/blast radius, tabs→multi-worksheet behavior, data-model/migration design, and target format cell-level spec.
- Headline findings: 34 total findings (6 CRITICAL, 9 HIGH). The export is architecturally sound and safe, but over-promises: preview does not match downloaded file; file omits Material/Labor split, VAT/contingency, complete title block; dead configuration surface (`audience`, `mode`, `consolidationMode`, `includeFormulas` all wired to nothing).
- No code, migration, dependency, or provider state changed by this planning pass.

## 2026-06-13 Add New Tabs Plan

- Plan package: `.ai/03_plans/2026-06-13-Add-New-Tabs/`.
- Status: `PLANNING COMPLETE — feature already built behind D-15 gate; planning covers lifting the gate, permission-gating, and browser-grade polish.`
- Scope: The "Add New Tab" "+" button already exists in code — built and unit-tested, hidden behind a deliberate release gate (D-15) whose precondition (tab-aware export) has since shipped. This plan covers: lift D-15, thread `canEditEstimate` permission check, replace persistent toolbar row with right-click context menu, double-click rename, browser-grade polish, verify downstream consumers. No DB/RPC/RLS/type change required — the only production dependency is applying the existing migration to the hosted DB.
- No code, schema, or data was changed by this planning pass.

## Current MVP Launch Handoff

The broad MVP launch `/goal` is blocked, not complete. Repo-local implementation for `.ai/03_plans/mvp-launch-readiness-2026-06-01/` is frozen at `6ab5b38`; docs/status freeze and guard evidence are pushed through `bdf9b03`. Do not reopen local launch implementation unless a new repo-local defect is found.

Next launch-readiness work is external/provider/manual proof collection:

- Vercel env/custom-domain/health/rollback proof.
- Hosted auth allow/deny/revoke/logout/session-expiry smoke.
- Linked Supabase migrations, RLS/storage/RPC, backup/PITR, and restore proof.
- Resend delivery/webhook proof before visible email workflows are re-enabled.
- Spreadsheet-app open/recalc/print proof and hosted authorized export timing.
- Legal/owner signoff, monitored support/alert ownership, demo rehearsal, and hosted/manual E2E proof.

Use `.ai/03_plans/mvp-launch-readiness-2026-06-01/46-manual-proof-matrix.md`, `47-goal-completion-audit.md`, `48-manual-proof-packet-template.md`, and `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/` as the handoff packet.

---

## Launch Status

| Level | Status |
|---|---|
| **PUBLIC LAUNCH** | `NO-GO` |
| **CONTROLLED BETA** | `NO-GO / LOCAL IMPLEMENTATION FROZEN / EXTERNAL PROOF OPEN` |
| **ENTERPRISE MVP** | `PLANNED` |
| **DOCS / PLANNING** | `ACTIVE` |
| **IMPLEMENTATION** | `NOT PART OF THIS TASK` |

---

## Canonical Document Structure

### Active Execution Docs (read these first)

These documents form the Ralph Loop execution command center:

| # | Document | Purpose |
|---|---|---|
| 22 | [Ruthless Beta Prioritization](./22-ruthless-prioritization-for-beta.md) | Classifies every item into BETA P0 / P1 / PUBLIC LAUNCH / POST-BETA / DEFERRED |
| 23 | [Codex /goal Execution Plan](./23-codex-goal-execution-plan.md) | **Start here.** Wave plan, sequencing, what Codex must and must not do |
| 24 | [Owner Decision Packet](./24-owner-decision-packet.md) | All 21 resolved decisions with defaults and goal-card mappings |
| 25 | [Active Workstreams](./25-active-workstreams.md) | 8 workstreams organized by wave, with status dashboard |
| 26 | [Codex Goal Cards](./26-codex-goal-cards.md) | 78 atomic goal cards (plus 15 EPIC headers) for Codex `/goal` |
| 27 | [Performance Budget & Regression Gates](./27-performance-budget-and-regression-gates.md) | Makes performance unavoidable in every implementation |
| 28 | [Evidence Artifact Index](./28-evidence-artifact-index.md) | Where Codex saves evidence; DONE requires evidence path |
| 29 | [Enterprise MVP Scope & Owner Defaults](./29-enterprise-mvp-scope-and-owner-defaults.md) | Enterprise-grade MVP scope definition and 21 approved owner defaults |
| 30 | [Design-Partner Beta Recruiting Plan](./30-design-partner-beta-recruiting-plan.md) | Controlled design-partner beta recruiting and onboarding strategy |
| 31 | [Founder Ops & Bus-Factor Plan](./31-founder-ops-and-bus-factor-plan.md) | Solo-founder operational resilience, incident ownership, and support infrastructure |
| 32 | [Test Infrastructure Execution Spec](./32-test-infrastructure-execution-spec.md) | RLS denial test harness, storage denial test harness, and auth audit execution specification |
| 33 | [Ralph Loop Execution Protocol](./33-ralph-loop-execution-protocol.md) | How to start and run Ralph Loop against this roadmap |
| 34 | [Roadmap Consistency Index](./34-roadmap-consistency-index.md) | Cross-reference index ensuring all roadmap documents stay consistent |
| 00 | [Production-Readiness Dashboard](./00-production-readiness-dashboard.md) | Master dashboard with all 143 items across 5 gates |
| 01 | [Launch Gates Master Checklist](./01-launch-gates-master-checklist.md) | Every gate item with acceptance criteria and Beta Minimum Gate |

### Reference Readiness Docs

These documents provide detailed readiness analysis across all domains:

| # | Document | Purpose |
|---|---|---|
| 02 | [Security, Tenancy & Data Protection](./02-security-tenancy-data-protection.md) | OWASP ASVS-based security readiness |
| 03 | [Supabase, RLS & Storage Readiness](./03-supabase-rls-storage-readiness.md) | Database, migration, and storage audit |
| 04 | [Auth, Provider & Vercel Environment Readiness](./04-auth-provider-vercel-environment-readiness.md) | Google OAuth, Supabase, Resend, Vercel |
| 05 | [UX/UI Polish Readiness](./05-ux-ui-polish-readiness.md) | Flow-by-flow launch quality checklist |
| 06 | [Performance, Reliability & Observability](./06-performance-reliability-observability.md) | Budgets, SLOs, resilience patterns |
| 07 | [QA, Testing & Validation Matrix](./07-qa-test-validation-matrix.md) | All test areas with coverage status |
| 08 | [Legal, Privacy & Compliance Readiness](./08-legal-privacy-compliance-readiness.md) | Privacy/Terms, GDPR/CCPA, DSAR |
| 09 | [Support, Incidents & Rollback Runbooks](./09-support-incident-rollback-runbooks.md) | 20 incident scenario templates |
| 10 | [AI Safety Readiness](./10-ai-safety-readiness.md) | Truthfulness rules, capability boundaries |
| 11 | [Release & Deployment Go/No-Go](./11-release-deployment-go-no-go.md) | Staging/production separation, rollback |
| 12 | [Beta Launch & Feedback Loop](./12-beta-launch-feedback-loop.md) | Controlled design-partner beta plan |
| 13 | [Risk Register](./13-risk-register.md) | Numbered risks with probability/impact |
| 14 | [Owner Decisions](./14-owner-decisions.md) | Full register of 32 pending decisions |
| 15 | [Product-Management Operating Model](./15-product-management-operating-model.md) | North star, activation, PM cadence |
| 16 | [Onboarding & Activation Readiness](./16-onboarding-activation-readiness.md) | 12-phase onboarding, 6 persona variants |
| 17 | [Personas & Jobs-to-be-Done](./17-personas-jobs-to-be-done.md) | 6 personas with goals, anxieties, JTBD |
| 18 | [Happy-Path User Journey Matrices](./18-happy-path-user-journey-matrices.md) | 20 journeys, step-by-step matrices |
| 19 | [Feature Adoption & Success Metrics](./19-feature-adoption-success-metrics.md) | 20 features with adoption metrics |
| 20 | [UX/UI Excellence Scorecard](./20-ux-ui-excellence-scorecard.md) | 17-dimension scoring across 20 features |
| 21 | [Usability Research & Beta Learning Plan](./21-usability-research-and-beta-learning-plan.md) | 14 task scripts, severity rubric, feedback process |
| 99 | [Roadmap Quality Self-Audit](./99-roadmap-quality-self-audit.md) | PASS/FAIL audit of all roadmap criteria |

### Superseded / Historical Documents

These files remain for git history only. Do not reference for current state:

| File | Superseded By | Status |
|---|---|---|
| `action-plan.md` | Gate documents 00–14, Codex execution docs 22-34 | **SUPERSEDED** |
| `status-tracker.md` | 00-production-readiness-dashboard.md | **SUPERSEDED** |
| `production-readiness-audit.md` | 00-production-readiness-dashboard.md | **SUPERSEDED** |

---

## How to Start Ralph Loop

1. **Read** `29-enterprise-mvp-scope-and-owner-defaults.md` — understand the 21 approved owner defaults and enterprise MVP scope
2. **Read** `23-codex-goal-execution-plan.md` — understand the wave structure
3. **Read** `26-codex-goal-cards.md` — review all 78 atomic goal cards (Atomic Split Edition)
4. **Select** one goal card marked `READY FOR CODEX`
5. **Check** `27-performance-budget-and-regression-gates.md` — validate performance before claiming done
6. **Implement** only that goal — one bounded card at a time
7. **Save** evidence using `28-evidence-artifact-index.md`
8. **Update** dashboard status in `00-production-readiness-dashboard.md` and card status in `26-codex-goal-cards.md`

**Critical rules:**
- Do **NOT** run `/goal` against the entire roadmap. Use ONE goal card at a time.
- Do **NOT** run a broad `/goal` against the whole roadmap. Run ONE bounded goal card at a time.
- Production readiness is not a claim. It is an evidence-backed status.
- No goal card can move to DONE without an evidence artifact path listed.
- Codex must STOP if it hits an owner decision — report the block, do not proceed.

---

## Production-Readiness Definition

Archestimator is production-ready only when:

1. Real users can authenticate safely.
2. Tenant/workspace/project/estimate/library/share boundaries are **proven by test**, not assumed.
3. Data loss and cross-tenant leakage risks are tested and denied.
4. Critical UX flows are understandable without Philip explaining them.
5. Errors, incidents, support, rollback, and abuse scenarios have named procedures.
6. Public claims match implemented and verified capabilities.
7. Deployment, provider, legal, and owner approvals are complete.

---

## The Four Launch Layers

| Layer | Name | Description | Status |
|---|---|---|---|
| 0 | Internal Implementation / Dev | Local dev, staging, internal testing. No external users. | `ACTIVE` |
| 1 | Controlled Design-Partner Beta | Named users, known limitations, manual support, invite-only non-public beta | `CONDITIONAL / OWNER DEFAULTS NOW DECIDED` |
| 2 | Enterprise-Grade MVP | Immutable proposals, PDF packages, CSP hardening, DSAR workflow, backup verification | `PLANNED` |
| 3 | Public / Paid Production Launch | Open onboarding, legal/support/security/deploy evidence complete, paid plans active | `NO-GO` |
| 4 | Post-MVP Expansion | Revision comparison, multi-region, billing integration, admin panel, i18n | `DEFERRED` |

---

## Dashboard

| Area | Status | Launch Blocker? | Evidence Required | Owner | Next Decision | Target Phase |
|---|---|---|---|---|---|---|
| Security — cross-workspace isolation | `IMPLEMENTED / NEEDS EVIDENCE` | YES | RLS denial tests, storage denial tests | Philip | Execute BETA-P0-SEC-001 | Beta |
| Security — invite token lifecycle | `IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN` | YES | Supabase Auth email/provider proof + hosted invite template/confirmation proof + invite env vars + real invite staging/prod E2E | Philip | Provide provider/env proof, then run real invite lifecycle smoke from `.ai/03_plans/share-and-collaboration-implementation/` | Beta |
| Security — shared link boundaries | `IMPLEMENTED / NEEDS EVIDENCE` | YES | Penetration tests, token scope tests | Philip | Execute BETA-P0-SEC-003 | Beta |
| Security — CSP/headers | `PARTIAL` | YES | Strict CSP on workshop routes | Philip | Enterprise MVP hardening | Enterprise MVP |
| Security — rate limiting | `DECIDED / REQUIRED BEFORE EXTERNAL BETA` | BETA | Persistent rate limiting implemented | Philip | Execute BETA-P0-SEC-005 | Beta |
| Security — CAPTCHA | `DECIDED / CLOUDFLARE TURNSTILE` | BETA | Cloudflare Turnstile integrated | Philip | Execute BETA-P1-SEC-006 | Beta |
| Supabase — RLS policies | `IMPLEMENTED / NEEDS EVIDENCE` | YES | Table-by-table denial tests | Philip | Execute BETA-P0-SEC-001 | Beta |
| Supabase — migration parity | `PARTIAL / TERMS MIGRATION VERIFIED / BROAD DB PUSH DRIFT OPEN` | YES | Local vs remote reconciliation plus exact-file proof | Philip | Reconcile migration history drift before broad db push | Beta |
| Supabase — storage policies | `IMPLEMENTED / NEEDS EVIDENCE` | YES | Cross-workspace storage access tests | Philip | Execute BETA-P0-SEC-002 | Beta |
| Auth — Google OAuth verification | `LEFT TO DO` | YES | Google Cloud Console verified status | Philip | Submit verification | Beta |
| Auth — email/SMTP/Resend config | `PARTIAL` | YES | SPF/DKIM/DMARC evidence, template review | Philip | Configure DNS records | Beta |
| Vercel — deployment pipeline | `DECIDED / STAGING APPROVED` | YES | Production/staging/preview URLs configured | Philip | Execute BETA-P0-INF-001 | Beta |
| Vercel — env vars inventory | `PARTIAL` | YES | Complete env var audit per environment | Philip | Audit env vars | Beta |
| Vercel — preview protection | `LEFT TO DO` | YES | Preview auth configured | Philip | Configure Vercel auth | Beta |
| UX — landing to login flow | `IMPLEMENTED / NEEDS EVIDENCE` | BETA | First-time user test | Philip | Recruit test users | Beta |
| UX — invite acceptance flows | `IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN` | BETA | Provider/env setup, hosted template/confirmation proof, real email click-through, then staging E2E pass | Philip | Capture provider proof and real invite browser smoke before beta claims | Beta |
| UX — estimate editing clarity | `IMPLEMENTED / NEEDS EVIDENCE` | BETA | Non-technical user validation | Philip | Recruit test users | Beta |
| UX — shared receiver clarity | `IMPLEMENTED / NEEDS EVIDENCE` | BETA | Client-side user validation | Philip | Recruit test users | Beta |
| UX — AI Ask/package-builder clarity | `IMPLEMENTED / NEEDS EVIDENCE` | BETA | User understanding test | Philip | Recruit test users | Beta |
| UX — mobile workshop | `DECIDED / DESKTOP GUARD FOR MVP` | — | Desktop-only guard in workshop routes | Philip | Execute BETA-P0-UX-004 | Beta |
| UX — package-builder | `DECIDED / OPTIONAL FEATURE-FLAGGED BETA` | — | Feature flag for beta opt-in | Philip | Implement feature flag | Beta |
| Performance — route transitions | `IMPLEMENTED / NEEDS MANUAL BENCHMARK + CLEAN GATES` | BETA | Sub-100ms benchmarks | Philip | Complete manual benchmark screenshots, Lighthouse/full analyzer proof, and unrelated validation cleanup before archive | Beta |
| Performance — large estimate sheets | `UNKNOWN` | BETA | 500+ row benchmarks | Philip | Execute BETA-P0-PERF-001 | Beta |
| Performance — XLSX export | `UNKNOWN` | BETA | Timeout benchmarks | Philip | Run export load test | Beta |
| Observability — APM/error tracking | `LEFT TO DO` | YES | Sentry or equivalent configured | Philip | Execute BETA-P0-OBS-001 | Beta |
| Observability — log aggregation | `LEFT TO DO` | BETA | Centralized log shipping | Philip | Execute BETA-P0-OBS-001 | Beta |
| Analytics — product events | `DECIDED / FIRST-PARTY PRODUCT EVENTS FOR BETA` | BETA | First-party analytics instrumentation | Philip | Execute BETA-P0-ANA-001 | Beta |
| QA — RLS denial tests | `LEFT TO DO` | YES | Automated test suite passing | Philip | Execute BETA-P0-SEC-001 | Beta |
| QA — E2E smoke tests | `PARTIAL` | BETA | Staging E2E pass | Philip | Schedule staging run | Beta |
| QA — accessibility tests | `LEFT TO DO` | BETA | aXe/WAVE audit pass | Philip | Schedule accessibility audit | Beta |
| Legal — Privacy Notice | `IMPLEMENTED AS BETA VERSION / LEGAL REVIEW REQUIRED` | YES | Reviewed legal copy and hosted smoke | Philip/legal counsel | Review final copy before enforcement | Beta |
| Legal — Terms of Service | `IMPLEMENTED AS BETA VERSION / CLICKWRAP AND DB PROOF COMPLETE / LEGAL REVIEW REQUIRED` | YES | Lawyer-approved copy, hosted acceptance smoke, audit retrieval proof | Philip/legal counsel | Review final copy before enforcement | Beta |
| Legal — subprocessor list | `LEFT TO DO` | YES | Published subprocessor disclosure | Philip | Compile subprocessor list | Beta |
| Legal — DSAR workflow | `DECIDED / MANUAL DSAR FOR BETA` | BETA | Manual delete/export process documented | Philip | Document DSAR process | Beta |
| AI — truthfulness claims | `PARTIAL` | YES | Public copy audit | Philip | Review public pages | Beta |
| AI — no autonomous claims | `DONE` | — | Confirmed in code and docs | Philip | Maintain ongoing | — |
| AI — memory / ranking hints | `DECIDED / DEFAULT-OFF RANKING HINTS ONLY` | — | Ranking hints disabled by default | Philip | Implement off-by-default | Beta |
| Support — runbook coverage | `TEMPLATED / NEEDS DRILL` | BETA | Drill critical runbooks (AUTH-001, SEC-001, SEC-003, DEP-002) | Philip | Schedule drills | Beta |
| Support — email + tracker | `DECIDED / SUPPORT EMAIL + LIGHTWEIGHT TRACKER` | BETA | support@ configured, lightweight ticket tracker | Philip | Execute BETA-P0-OPS-001 | Beta |
| Incident — owner | `DECIDED / PHILIP` | YES | Philip is named incident owner | Philip | Documented | Beta |
| Incident — rollback procedure | `DECIDED / PHILIP` | YES | Philip owns rollback authority | Philip | Documented | Beta |
| Beta — scope definition | `DECIDED / APPROVED DEFAULT` | BETA | Documented beta scope/limitations | Philip | Execute BETA-P0-BETA-001 | Beta |
| Beta — kickoff system | `PLANNED` | BETA | Controlled beta kickoff infrastructure | Philip | Execute BETA-P0-BETA-001 | Beta |
| Owner — launch jurisdiction | `DECIDED / INVITE-ONLY NON-PUBLIC BETA` | YES | Invite-only, no public sign-up | Philip | Documented | Beta |
| Owner — pricing/payment timeline | `DECIDED / NO PAID BETA` | — | No payment required for beta | Philip | Documented | Beta |
| Owner — browser support | `DECIDED / CHROME + EDGE DESKTOP FOR BETA` | BETA | Chrome and Edge desktop supported | Philip | Documented | Beta |
| Product — north star metric | `DRAFTED / NEEDS OWNER APPROVAL` | BETA | Philip selects and documents north star | Philip | Choose north star | Beta |
| Product — activation definition | `DRAFTED / NEEDS OWNER APPROVAL` | BETA | Activation event defined and instrumented | Philip | Approve activation definition | Beta |
| Product — persona journeys | `DRAFTED` | BETA | 6 personas with journey maps documented | Philip | Review persona docs | Beta |
| Product — happy-path matrices | `DRAFTED` | BETA | 20 journey matrices documented and validated | Philip | Review journey docs | Beta |
| Product — UX excellence scorecard | `DRAFTED` | — | 20 features scored, validated by users | Philip | Review scorecard | Production |
| Product — usability research plan | `PLANNED` | BETA | Research plan documented, sessions conducted | Philip | Recruit beta participants | Beta |
| Product — onboarding strategy | `DRAFTED` | BETA | 12-phase plan documented, owner-approved | Philip | Approve onboarding plan | Beta |
| Product — beta feedback loop | `DRAFTED / NEEDS OWNER APPROVAL` | BETA | Weekly review cadence, feedback triage, decision log | Philip | Approve beta operating model | Beta |
| Proposals — immutable issued snapshots | `ENTERPRISE MVP P1` | Enterprise MVP | Immutable proposal snapshots implemented | Philip | Execute ENTERPRISE-P1-PROD-001 | Enterprise MVP |
| Proposals — PDF package workflow | `ENTERPRISE MVP P1` | Enterprise MVP | PDF/client-facing package workflow implemented | Philip | Execute ENTERPRISE-P1-PROD-002 | Enterprise MVP |
| Dependency — @firecms/neat | `ENTERPRISE MVP P1` | Enterprise MVP | WebGL animation loop upgrade | Philip | Execute ENTERPRISE-P1-DEP-001 | Enterprise MVP |
| Backup — verification | `DECIDED / BACKUP VERIFICATION FOR BETA` | BETA | Backup restoration verified | Philip | Verify backup restore | Beta |

---

## Product Excellence Layer

Production readiness is necessary but not sufficient. Archestimator is excellent only when:

1. A first-time user reaches value without Philip explaining the product.
2. Each persona has a clear journey.
3. Each major feature has a documented happy path and recovery path.
4. Onboarding intentionally introduces features in the right order.
5. Metrics show users are activating, completing estimates, sharing outputs, and returning.
6. UX/UI decisions are tied to user outcomes, not just visual polish.
7. Beta feedback is captured, triaged, and converted into roadmap decisions.

The enterprise MVP layer adds product-rigor requirements on top of beta readiness:

8. Immutable issued proposals with audit trail exist and are client-facing.
9. PDF package workflows are complete and production-quality.
10. CSP headers are hardened for workshop routes.
11. DSAR workflow is operational (manual for beta, automated for enterprise MVP).
12. Backup verification is proven with restore drills.

This layer adds product-management rigor on top of the existing production-readiness gates:

- [Product-Management Operating Model](./15-product-management-operating-model.md) — North star, activation, product loops, PM cadence
- [Onboarding & Activation Readiness](./16-onboarding-activation-readiness.md) — 12-phase onboarding plan, 6 persona variants
- [Personas & Jobs-to-be-Done](./17-personas-jobs-to-be-done.md) — 6 personas with goals, anxieties, first-success moments
- [Happy-Path User Journey Matrices](./18-happy-path-user-journey-matrices.md) — 20 journeys with step-by-step system/user actions
- [Feature Adoption & Success Metrics](./19-feature-adoption-success-metrics.md) — 20 features with activation/adoption/success events
- [UX/UI Excellence Scorecard](./20-ux-ui-excellence-scorecard.md) — 20 features scored across 17 dimensions (0-5 scale)
- [Usability Research & Beta Learning Plan](./21-usability-research-and-beta-learning-plan.md) — 14 task scripts, severity rubric, feedback process
- [Enterprise MVP Scope & Owner Defaults](./29-enterprise-mvp-scope-and-owner-defaults.md) — Enterprise-grade MVP scope with 21 approved owner defaults
- [Design-Partner Beta Recruiting Plan](./30-design-partner-beta-recruiting-plan.md) — Controlled design-partner beta recruiting strategy
- [Founder Ops & Bus-Factor Plan](./31-founder-ops-and-bus-factor-plan.md) — Solo-founder resilience and operational infrastructure

---

## Steering Documents

This roadmap is backed by detailed tracking documents:

| # | Document | Purpose |
|---|---|---|
| 00 | [Production-Readiness Dashboard](./00-production-readiness-dashboard.md) | Master dashboard with all areas |
| 01 | [Launch Gates Master Checklist](./01-launch-gates-master-checklist.md) | Every gate item with acceptance criteria |
| 02 | [Security, Tenancy & Data Protection](./02-security-tenancy-data-protection.md) | OWASP ASVS-based security readiness |
| 03 | [Supabase, RLS & Storage Readiness](./03-supabase-rls-storage-readiness.md) | Database, migration, and storage audit |
| 04 | [Auth, Provider & Vercel Environment Readiness](./04-auth-provider-vercel-environment-readiness.md) | Google OAuth, Supabase, Resend, Vercel |
| 05 | [UX/UI Polish Readiness](./05-ux-ui-polish-readiness.md) | Flow-by-flow launch quality checklist |
| 06 | [Performance, Reliability & Observability](./06-performance-reliability-observability.md) | Budgets, SLOs, resilience patterns |
| 07 | [QA, Testing & Validation Matrix](./07-qa-test-validation-matrix.md) | All test areas with coverage status |
| 08 | [Legal, Privacy & Compliance Readiness](./08-legal-privacy-compliance-readiness.md) | Privacy/Terms, GDPR/CCPA, DSAR |
| 09 | [Support, Incidents & Rollback Runbooks](./09-support-incident-rollback-runbooks.md) | 20 incident scenario templates |
| 10 | [AI Safety Readiness](./10-ai-safety-readiness.md) | Truthfulness rules, capability boundaries |
| 11 | [Release & Deployment Go/No-Go](./11-release-deployment-go-no-go.md) | Staging/production separation, rollback |
| 12 | [Beta Launch & Feedback Loop](./12-beta-launch-feedback-loop.md) | Controlled design-partner beta plan |
| 13 | [Risk Register](./13-risk-register.md) | Numbered risks with probability/impact |
| 14 | [Owner Decisions](./14-owner-decisions.md) | All pending owner decisions |
| 15 | [Product-Management Operating Model](./15-product-management-operating-model.md) | North star, activation, PM cadence, decision framework |
| 16 | [Onboarding & Activation Readiness](./16-onboarding-activation-readiness.md) | 12-phase onboarding, 6 persona variants |
| 17 | [Personas & Jobs-to-be-Done](./17-personas-jobs-to-be-done.md) | 6 personas with goals, anxieties, JTBD |
| 18 | [Happy-Path User Journey Matrices](./18-happy-path-user-journey-matrices.md) | 20 journeys, step-by-step matrices |
| 19 | [Feature Adoption & Success Metrics](./19-feature-adoption-success-metrics.md) | 20 features with adoption metrics |
| 20 | [UX/UI Excellence Scorecard](./20-ux-ui-excellence-scorecard.md) | 17-dimension scoring across 20 features |
| 21 | [Usability Research & Beta Learning Plan](./21-usability-research-and-beta-learning-plan.md) | 14 task scripts, severity rubric, feedback process |
| 29 | [Enterprise MVP Scope & Owner Defaults](./29-enterprise-mvp-scope-and-owner-defaults.md) | Enterprise-grade MVP scope with 21 approved owner defaults |
| 30 | [Design-Partner Beta Recruiting Plan](./30-design-partner-beta-recruiting-plan.md) | Controlled design-partner beta recruiting strategy |
| 31 | [Founder Ops & Bus-Factor Plan](./31-founder-ops-and-bus-factor-plan.md) | Solo-founder resilience and operational infrastructure |
| 32 | [Test Infrastructure Execution Spec](./32-test-infrastructure-execution-spec.md) | RLS denial, storage denial, and auth audit test specification |
| 33 | [Ralph Loop Execution Protocol](./33-ralph-loop-execution-protocol.md) | Ralph Loop execution protocol for this roadmap |
| 34 | [Roadmap Consistency Index](./34-roadmap-consistency-index.md) | Cross-reference index for roadmap document consistency |

### Superseded / Historical Documents

The following files remain in the directory for historical reference only. They are **SUPERSEDED** and should not be used as canonical sources. The gate-based documents above are the authoritative replacements:

| File | Superseded By | Status |
|---|---|---|
| `action-plan.md` | Gate documents 00–14 | **SUPERSEDED** |
| `status-tracker.md` | 00-production-readiness-dashboard.md | **SUPERSEDED** |
| `production-readiness-audit.md` | 00-production-readiness-dashboard.md | **SUPERSEDED** |

These files are preserved for git history and context; do not reference them for current state or decisions.

---

## Current Product Baseline

The app has substantial product surface:

- **Public:** Landing, About, Features, Pricing, Contact pages
- **Auth:** Google OAuth + email sign-in link via Supabase, safe redirect, protected `/workshop/*`
- **Workshop:** Projects, estimates (tree/sheet editing), charts, component library, templates, settings
- **Collaboration:** Invite-entry tokens, project/estimate-sheet sharing, Teamspaces
- **Publication:** Shared Link V2 (tabbed receiver, comments, decisions, recipients, activity, password gate)
- **Export:** XLSX proposal export (mutable current estimate)
- **AI:** Ask Flip (read-only, account-aware), Package-builder (draft/refine/apply, confirmation-gated)
- **Landing:** A/B testing, consent banner, CSP Report-Only

## Not Yet Implemented

- Immutable issued proposal snapshots (ENTERPRISE MVP P1)
- PDF/client-facing package workflows (ENTERPRISE MVP P1)
- Revision comparison and issued-proposal audit policy
- Stored AI conversations, vector/RAG, broad persistent memory, autonomous AI mutations
- Strict CSP on workshop routes (ENTERPRISE MVP hardening)
- Persistent rate limiting (Redis-backed, BETA P0)
- Production APM/error tracking (BETA P0)
- Cloudflare Turnstile CAPTCHA (BETA P1)
- First-party product event analytics (BETA P0)

---

## Status Legend

| Status | Meaning |
|---|---|
| `DONE` | Implemented and evidence exists |
| `IMPLEMENTED / NEEDS EVIDENCE` | Code exists but production proof is missing |
| `PARTIAL` | Some slices exist, but not enough for launch |
| `PLANNED` | Future work; do not imply current capability |
| `LEFT TO DO` | Known gap, not yet started |
| `BLOCKED` | Cannot proceed without dependency or decision |
| `OWNER DECISION REQUIRED` | Philip must decide |
| `DECIDED / ...` | Owner decision made with recorded default |
| `ENTERPRISE MVP P1` | Required for enterprise-grade MVP, not beta |
| `ACCEPTED RISK` | Philip explicitly accepts risk with notes |
| `LAUNCH BLOCKER` | Public launch cannot proceed |
| `BETA BLOCKER` | Controlled beta cannot proceed |
| `UNKNOWN` | Needs audit; do not assume |

## Launch Levels

| Level | Meaning |
|---|---|
| `Private local/staging use` | Internal only; no real customer reliance |
| `Controlled design-partner beta` | Named users, known limitations, manual support, invite-only |
| `Enterprise-grade MVP` | Immutable proposals, PDF packages, CSP hardening, DSAR, backup verification |
| `Public production` | Open onboarding, legal/support/security/deploy evidence complete |

---

## Strict Rules

1. **No production launch claim** may be added unless there is matching evidence in `.ai`, tests, provider screenshots/checklists, or owner decision logs.
2. **No merge to `main`** without Philip approval.
3. **No deploy** without Philip approval.
4. **Public copy** must claim only currently shipped, verified capability.
5. **Proposal export copy** must distinguish mutable XLSX export from future immutable issued snapshots.
6. **AI copy** must describe scoped Ask and confirmation-gated package-builder — not autonomous estimation.

---

## Permanent Guardrails

- Never touch archestimator Supabase resources.
- No app/workshop font above `12px`, no non-xs radius, no nonzero tracking, no bold/fill icon weights.
- No duplicated feature-local controls; reuse shared UI primitives.
- No AI writes, autonomous actions, retrieval/RAG, or stored conversations by implication.
- Tests protect accepted behavior and key governance rules.
- Code-review graph/GitNexus and `.ai` source-of-truth docs are part of the normal agent workflow.

---

*Historical feature-progress detail preserved in superseded documents and `.ai/09_archive/`.*

---

## Completed repo-local implementation addendum — Activity History Overhaul V1

Activity History Overhaul V1 is completed and archived after repo-local implementation on `feat/activity-history-overhaul-v1`. Track milestone status, validation evidence, commit SHAs, and final archive location in [`35-activity-history-overhaul-v1-execution.md`](./35-activity-history-overhaul-v1-execution.md). Production access telemetry enablement remains **NO-GO** unless the evidence gates in the plan pack docs 64/66/68 are actually completed.
