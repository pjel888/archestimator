# Roadmap Consistency Index

**Last updated:** 2026-05-30
**Purpose:** Prevents drift. Every agent and human should use this index to find the canonical source for any topic. Comprehensive index of all 40 files in `.ai/01_roadmap/`.

---

## 1. Complete File Classification Index

Every file in `.ai/01_roadmap/` is classified into exactly one category. Canonical files (marked YES) are the authoritative source of truth for their domain. All others are reference or historical only.

| File | Category | Canonical? | Use For | Do Not Use For | Superseded By | Notes |
|---|---|---|---|---|---|---|
| `README.md` | ACTIVE EXECUTION DOC | **YES** | Launch status, document structure, active docs list, Four Launch Layers, how to start Ralph Loop | Implementation details (see 23, 26) | — | Entry point for all agents |
| `00-production-readiness-dashboard.md` | ACTIVE EXECUTION DOC | **YES** | Master dashboard with 143 items across 5 gates, gate summaries, Codex execution status, Beta P0/Enterprise MVP/Public Launch blocker lists | Goal card details (see 26) | — | Dashboard summaries are derivative of gate docs |
| `01-launch-gates-master-checklist.md` | ACTIVE EXECUTION DOC | **YES** | Beta Minimum Gate (18 items), Enterprise MVP Gate (12 items), Public Launch Gates (5 gates), acceptance criteria, validation methods, inter-item dependencies | Priority classification (see 22) | — | Canonical for gate definitions and what blocks what |
| `02-security-tenancy-data-protection.md` | REFERENCE READINESS DOC | NO — reference only | OWASP ASVS-based security readiness, tenancy isolation detail, API security | Current status (see 00), goal cards (see 26) | — | Domain deep-dive; consult when implementing SEC goal cards |
| `03-supabase-rls-storage-readiness.md` | REFERENCE READINESS DOC | NO — reference only | Database migration parity, RLS policy inventory, storage audit | Current status (see 00), evidence requirements (see 28) | — | Domain deep-dive; consult when implementing RLS/storage tests |
| `04-auth-provider-vercel-environment-readiness.md` | REFERENCE READINESS DOC | NO — reference only | Google OAuth, Supabase Auth, Resend SMTP, Vercel deployment, env var audit | Owner decisions (see 29), current status (see 00) | — | Domain deep-dive; consult when implementing auth/infra cards |
| `05-ux-ui-polish-readiness.md` | REFERENCE READINESS DOC | NO — reference only | Flow-by-flow launch quality checklist, UX gate detail | Current UX status (see 00) | — | Domain deep-dive; consult when implementing UX cards |
| `06-performance-reliability-observability.md` | REFERENCE READINESS DOC | NO — reference only | Performance budgets, SLOs, resilience patterns, observability detail | Current performance rules (see 27) | — | Domain deep-dive; consult when implementing PERF/OBS cards |
| `07-qa-test-validation-matrix.md` | REFERENCE READINESS DOC | NO — reference only | All test areas with coverage status, test methodology | Test infrastructure spec (see 32) | — | Domain deep-dive; consult when implementing test infrastructure |
| `08-legal-privacy-compliance-readiness.md` | REFERENCE READINESS DOC | NO — reference only | Privacy/Terms, GDPR/CCPA, DSAR, subprocessors, public claims | Owner decisions (see 29), beta legal pack scope (see 01) | — | Domain deep-dive; consult when implementing LEGAL cards |
| `09-support-incident-rollback-runbooks.md` | REFERENCE READINESS DOC | NO — reference only | 20 incident scenario templates, support infrastructure | Founder ops detail (see 31), current runbook status (see 00) | — | Domain deep-dive; consult when implementing OPS cards |
| `10-ai-safety-readiness.md` | REFERENCE READINESS DOC | NO — reference only | AI truthfulness rules, capability boundaries, safety posture | AI implementation detail (see 26-codex-goal-cards.md), current AI status (see 00) | — | Domain deep-dive; consult when implementing AI cards |
| `11-release-deployment-go-no-go.md` | REFERENCE READINESS DOC | NO — reference only | Staging/production separation, rollback, deployment go/no-go criteria | Current deploy status (see 00), owner decisions (see 29) | — | Domain deep-dive; consult when implementing INF cards |
| `12-beta-launch-feedback-loop.md` | REFERENCE READINESS DOC | NO — reference only | Controlled design-partner beta plan, feedback loops | Beta recruiting plan (see 30), usability research (see 21) | — | Domain deep-dive; consult for beta operations planning |
| `13-risk-register.md` | REFERENCE READINESS DOC | NO — reference only | Numbered risks with probability/impact, mitigation strategies | Current risk status (see 00) | — | Domain deep-dive; consult for risk assessment |
| `14-owner-decisions.md` | ACTIVE EXECUTION DOC | **YES** | Full register of 32 owner decisions; 21 decided, 11 remain (public launch only) | Approved defaults catalog (see 24 for compressed version) | — | Canonical for decision register; 29 is canonical for defaults |
| `15-product-management-operating-model.md` | SUPPLEMENTAL PRODUCT DOC | NO — reference only | North star metric, activation definition, PM cadence, decision framework | Current product status (see 00), implementation (see 26) | — | Product strategy; consult for PM context |
| `16-onboarding-activation-readiness.md` | SUPPLEMENTAL PRODUCT DOC | NO — reference only | 12-phase onboarding plan, 6 persona variants | Onboarding implementation (see 26 UX cards) | — | Product strategy; consult when implementing UX-001 |
| `17-personas-jobs-to-be-done.md` | SUPPLEMENTAL PRODUCT DOC | NO — reference only | 6 personas with goals, anxieties, JTBD, first-success moments | Implementation (see 26) | — | Product strategy; consult for user context |
| `18-happy-path-user-journey-matrices.md` | SUPPLEMENTAL PRODUCT DOC | NO — reference only | 20 journeys with step-by-step system/user actions | Implementation (see 26) | — | Product strategy; consult for UX design context |
| `19-feature-adoption-success-metrics.md` | SUPPLEMENTAL PRODUCT DOC | NO — reference only | 20 features with activation/adoption/success events | Analytics instrumentation (see 26 ANA-001) | — | Product strategy; consult for metric definitions |
| `20-ux-ui-excellence-scorecard.md` | SUPPLEMENTAL PRODUCT DOC | NO — reference only | 17-dimension scoring across 20 features (0-5 scale) | Current UX status (see 00), implementation (see 26) | — | Product strategy; consult for UX quality benchmarks |
| `21-usability-research-and-beta-learning-plan.md` | SUPPLEMENTAL PRODUCT DOC | NO — reference only | 14 task scripts, severity rubric, feedback process | Beta recruiting plan (see 30), usability research execution | — | Product strategy; consult for research methodology |
| `22-ruthless-prioritization-for-beta.md` | ACTIVE EXECUTION DOC | **YES** | Classifies every item into BETA P0 / P1 / ENTERPRISE MVP / PUBLIC LAUNCH / POST-MVP / DEFERRED | Gate definitions (see 01) | — | Canonical for priority lanes and item classification |
| `23-codex-goal-execution-plan.md` | ACTIVE EXECUTION DOC | **YES** | Wave plan (0-8), sequencing, Codex execution rules, what Codex must/must not do | Goal card details (see 26) | — | Most important doc for Codex; start here |
| `24-owner-decision-packet.md` | ACTIVE EXECUTION DOC | NO — reference only | Compressed reference of approved defaults for agents; maps decisions to unblocked goal cards | Full decision register (see 14), canonical defaults (see 29) | — | Compressed agent reference; 29 and 14 are canonical |
| `25-active-workstreams.md` | ACTIVE EXECUTION DOC | NO — reference only | 8 workstreams organized by wave, status dashboard, dependencies, explicit out-of-scope items | Goal card details (see 26), wave plan (see 23) | — | Execution aid; derived from 23 and 26 |
| `26-codex-goal-cards.md` | ACTIVE EXECUTION DOC | **YES** | 88 atomic goal cards + 15 EPIC headers for Codex `/goal`; canonical card statuses and details | Wave sequencing (see 23), priority classification (see 22) | — | Canonical for goal cards; what Codex actually implements |
| `27-performance-budget-and-regression-gates.md` | ACTIVE EXECUTION DOC | **YES** | Global perf rules, Enterprise MVP stricter rules, three-tier budgets, regression gates | Performance domain detail (see 06) | — | Canonical for performance requirements on every goal |
| `28-evidence-artifact-index.md` | ACTIVE EXECUTION DOC | **YES** | Where Codex saves evidence; directory structure, artifact categories, 26 per-card evidence mappings | What evidence is required (see 01 for acceptance criteria) | — | DONE requires evidence path; canonical for evidence storage |
| `29-enterprise-mvp-scope-and-owner-defaults.md` | ACTIVE EXECUTION DOC | **YES** | 21 approved owner defaults, 4-layer launch model, controlled beta/enterprise MVP/public launch scope boundaries | Full decision register (see 14 for complete register), compressed reference (see 24) | — | Canonical for owner defaults and launch layer model |
| `30-design-partner-beta-recruiting-plan.md` | ACTIVE EXECUTION DOC | NO — reference only | Recruiting matrix, candidate profiles, exclusion criteria, onboarding scripts, exit criteria | Beta feedback loop (see 12), usability research (see 21) | — | Philip action items; execution aid for beta recruiting |
| `31-founder-ops-and-bus-factor-plan.md` | ACTIVE EXECUTION DOC | NO — reference only | Philip's solo-operator model, weekly load limits, delegation pathways, emergency contacts | Support runbooks (see 09) | — | Philip action items; execution aid for founder operations |
| `32-test-infrastructure-execution-spec.md` | ACTIVE EXECUTION DOC | NO — reference only | Test runner recommendation, environment requirements, RLS denial test architecture, storage denial test architecture, auth audit test design | QA domain detail (see 07) | — | Execution aid; derived from security requirements |
| `33-ralph-loop-execution-protocol.md` | ACTIVE EXECUTION DOC | **YES** | Agent execution protocol: read-before-implement list, step-by-step workflow, branch/commit rules, evidence requirements | Wave plan (see 23), goal cards (see 26) | — | Canonical for how agents must execute |
| `34-roadmap-consistency-index.md` | ACTIVE EXECUTION DOC | **YES** | This document — prevents drift, cross-reference index for all 40 files | — | — | Single source of truth for roadmap structure |
| `99-roadmap-quality-self-audit.md` | ACTIVE EXECUTION DOC | NO — reference only | PASS/FAIL audit of 28 criteria, contradiction resolution log, summary statistics | Current status (see 00, 01) | — | Quality checkpoint; re-run after each wave |
| `action-plan.md` | SUPERSEDED / HISTORICAL DOC | **NO — SUPERSEDED** | Historical reference only — original phased action plan | Current launch status, beta scope, owner decisions, Codex execution order | README.md, 00, 01, 22, 23, 26, 34 | Banners at top of file; preserved for git history |
| `production-readiness-audit.md` | SUPERSEDED / HISTORICAL DOC | **NO — SUPERSEDED** | Historical reference only — original audit findings | Current audit status, known gaps | 02, 03, 00 | Banners at top of file; preserved for git history |
| `status-tracker.md` | SUPERSEDED / HISTORICAL DOC | **NO — SUPERSEDED** | Historical reference only — original task/dimension tracker | Current status, completion percentages | 00-production-readiness-dashboard.md | Banners at top of file; preserved for git history |

*Note: `35-codex-goal-start-pack.md` and `36-first-execution-queue.md` do not exist as of 2026-05-30.*

---

## 2. Category Summary

| Category | Count | Files |
|---|---|---|
| ACTIVE EXECUTION DOC (canonical) | 12 | README, 00, 01, 14, 22, 23, 26, 27, 28, 29, 33, 34 |
| ACTIVE EXECUTION DOC (non-canonical, reference only) | 6 | 24, 25, 30, 31, 32, 99 |
| REFERENCE READINESS DOC | 12 | 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13 |
| SUPPLEMENTAL PRODUCT DOC | 7 | 15, 16, 17, 18, 19, 20, 21 |
| SUPERSEDED / HISTORICAL DOC | 3 | action-plan, production-readiness-audit, status-tracker |
| **Total** | **40** | |

---

## 3. Canonical Source for Each Topic

| Topic | Canonical Doc | Supporting Docs | Do NOT Use as Source of Truth |
|---|---|---|---|
| **Launch status** | `README.md` | `00-production-readiness-dashboard.md` | `action-plan.md`, `status-tracker.md`, `production-readiness-audit.md` |
| **Collaboration & sharing (detailed audit and implementation truth)** | `.ai/03_plans/share-and-collaboration-implementation/` | `26-codex-goal-cards.md` (for goal cards), `22-ruthless-prioritization-for-beta.md` (for priority lanes) | Roadmap files that claim invites are "IMPLEMENTED" (see drift warning below) |
| **Route transition performance (conflict resolution)** | `.ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md` | `27-performance-budget-and-regression-gates.md` (for budget targets) | Legacy route-transition docs marked SUPERSEDED in the plan README |
| **Beta scope** | `29-enterprise-mvp-scope-and-owner-defaults.md` | `30-design-partner-beta-recruiting-plan.md`, `12-beta-launch-feedback-loop.md` | `24-owner-decision-packet.md` (pre-resolution) |
| **Owner decisions** | `29-enterprise-mvp-scope-and-owner-defaults.md` | `14-owner-decisions.md`, `24-owner-decision-packet.md` | Any doc still saying `OWNER DECISION REQUIRED` for the 21 resolved items |
| **Goal cards** | `26-codex-goal-cards.md` | `23-codex-goal-execution-plan.md`, `25-active-workstreams.md` | `00-production-readiness-dashboard.md` (dashboard is summary, cards are canonical) |
| **Gate definitions / acceptance criteria** | `01-launch-gates-master-checklist.md` | `22-ruthless-prioritization-for-beta.md` | — |
| **Priority classification** | `22-ruthless-prioritization-for-beta.md` | `01-launch-gates-master-checklist.md` | — |
| **Wave plan / sequencing** | `23-codex-goal-execution-plan.md` | `25-active-workstreams.md` | — |
| **Performance rules** | `27-performance-budget-and-regression-gates.md` | `06-performance-reliability-observability.md` | — |
| **Evidence artifacts** | `28-evidence-artifact-index.md` | `33-ralph-loop-execution-protocol.md` | — |
| **RLS/storage** | `03-supabase-rls-storage-readiness.md` | `32-test-infrastructure-execution-spec.md`, `02-security-tenancy-data-protection.md` | — |
| **Database indexing / query performance** | `.ai/03_plans/database-indexing-and-query-performance/` | `06-performance-reliability-observability.md`, `26-codex-goal-cards.md`, `28-evidence-artifact-index.md` | Roadmap files that claim indexing is implemented (see drift warning below) |
| **Auth/provider** | `04-auth-provider-vercel-environment-readiness.md` | `02-security-tenancy-data-protection.md` | — |
| **UX/onboarding** | `16-onboarding-activation-readiness.md` | `05-ux-ui-polish-readiness.md`, `18-happy-path-user-journey-matrices.md` | — |
| **Legal** | `08-legal-privacy-compliance-readiness.md` | `29-enterprise-mvp-scope-and-owner-defaults.md` (for beta legal pack) | — |
| **Support/runbooks** | `09-support-incident-rollback-runbooks.md` | `31-founder-ops-and-bus-factor-plan.md` | — |
| **AI safety** | `10-ai-safety-readiness.md` | `29-enterprise-mvp-scope-and-owner-defaults.md` (for AI memory posture) | — |
| **Design partners** | `30-design-partner-beta-recruiting-plan.md` | `12-beta-launch-feedback-loop.md`, `21-usability-research-and-beta-learning-plan.md` | — |
| **Founder ops** | `31-founder-ops-and-bus-factor-plan.md` | `09-support-incident-rollback-runbooks.md` | — |
| **Execution protocol** | `33-ralph-loop-execution-protocol.md` | `23-codex-goal-execution-plan.md` | — |
| **Test infrastructure** | `32-test-infrastructure-execution-spec.md` | `07-qa-test-validation-matrix.md` | — |
| **Consistency index** | `34-roadmap-consistency-index.md` (this doc) | — | — |
| **PM operating model** | `15-product-management-operating-model.md` | `16-onboarding-activation-readiness.md`, `19-feature-adoption-success-metrics.md` | — |
| **Personas / JTBD** | `17-personas-jobs-to-be-done.md` | `18-happy-path-user-journey-matrices.md` | — |
| **Usability research** | `21-usability-research-and-beta-learning-plan.md` | `30-design-partner-beta-recruiting-plan.md` | — |

---

## 4. Common Contradictions & Canonical Answer

| Contradiction | Canonical Answer | Source |
|---|---|---|
| "All goal cards are blocked by owner decisions" | **FALSE — corrected.** 26-codex-goal-cards.md is now the Atomic Split Edition (78 atomic cards + 15 EPIC headers). See card summary for current statuses. Goal cards are no longer all owner-blocked. | `29-enterprise-mvp-scope-and-owner-defaults.md`, `26-codex-goal-cards.md` |
| "PDF is a beta blocker" | **FALSE — corrected.** PDF is `ENTERPRISE MVP P1`, not required for beta. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "Immutable proposals are a beta blocker" | **FALSE — corrected.** Immutable proposals are `ENTERPRISE MVP P1`. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "Full mobile workshop editing is a beta blocker" | **FALSE — corrected.** Desktop guard is `BETA P0`. Full mobile editing is `POST-MVP`. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "Self-serve DSAR is a beta blocker" | **FALSE — corrected.** Manual DSAR is `BETA P0`. Self-serve is `PUBLIC LAUNCH`. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "Full legal review is required before beta" | **FALSE — corrected.** Minimum beta legal pack is `BETA P0`. Full legal review is `PUBLIC LAUNCH`. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "Google OAuth verification blocks beta" | **PARTIALLY FALSE.** Strongly preferred for beta. Public launch blocker. Acceptable for named beta users who accept unverified warning. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "Rate limiting risk is accepted for beta" | **FALSE — corrected.** Persistent rate limiting is `REQUIRED BEFORE EXTERNAL BETA`. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "CAPTCHA is undecided" | **FALSE — corrected.** Cloudflare Turnstile is selected. BETA P1. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "Package-builder is core activation" | **FALSE — corrected.** Package-builder is optional feature-flagged beta capability. Core activation = project → estimate → rows → export/share. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "Analytics is undecided" | **FALSE — corrected.** First-party product events for beta. | `29-enterprise-mvp-scope-and-owner-defaults.md` |
| "Old four-gate model only" | **SUPERSEDED.** New model: Four Launch Layers (0-4) + 5 Gate categories. | `29-enterprise-mvp-scope-and-owner-defaults.md`, `README.md` |
| "137 items in dashboard" | **STALE — corrected.** Dashboard has 143 items (see Gate Summary table). | `00-production-readiness-dashboard.md` |
| "69 total blockers" | **HISTORICAL ONLY.** After ruthless prioritization: 21 BETA P0, 10 BETA P1, 12 ENTERPRISE MVP, 11 PUBLIC LAUNCH. | `22-ruthless-prioritization-for-beta.md` |
| "26 implementation-ready goal cards" | **STALE — corrected.** `26-codex-goal-cards.md` now contains 78 atomic cards + 15 EPIC headers + 10 new collab/share cards (2026-05-30). | `26-codex-goal-cards.md` |

### ⚠️ Drift Warning — Collaboration Invites

If a roadmap file says the invite flow, shared-link delivery, or collaboration readiness is DONE/beta-ready while `.ai/03_plans/share-and-collaboration-implementation/` still lists provider/dashboard or real-email smokes as open, **the roadmap must be corrected.** The current distinction is: local/live route implementation is substantially complete, but Supabase Auth email/provider dashboard proof, hosted invite template/confirmation proof, Resend dashboard/webhook proof, and real invite/recipient browser smokes are still not done. The combined pack is the newer truth for invite operational readiness and shared-link receiver sequencing.

### ⚠️ Drift Warning — Route Transition Performance

If a roadmap file says `proxy.ts` is dead code, recommends `getSession()` in middleware, or claims route transition optimization is complete/archive-ready, **the roadmap must be corrected.** `.ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md` is the conflict-resolution authority. `proxy.ts` is active Next.js 16 middleware. `getUser()` must be used, not `getSession()`. Production-authenticated hover `_rsc` proof, authenticated Lighthouse, true webpack bundle-analyzer, and public bfcache cache-header mitigation are now captured, but the route-transition plan remains incomplete until manual Chrome bfcache DevTools persisted-restore proof and production Chrome React Profiler proof are captured.

### ⚠️ Drift Warning — Database Indexing / Query Performance

If a roadmap file says indexing is implemented or "DONE" but the database indexing plan at `.ai/03_plans/database-indexing-and-query-performance/` says no indexes have been created and the audit has not started, **the roadmap must be corrected.** Index planning is not implementation evidence. No index migration exists. No EXPLAIN evidence has been collected. The audit (CODEX-P0-DBIDX-001) is BETA P0 and must complete before any index can be proposed.

---

## 5. Status Vocabulary

| Status | Meaning |
|---|---|
| `DECIDED / APPROVED DEFAULT` | Philip approved the recommended default via roadmap pass |
| `READY FOR CODEX` | Goal card can be implemented by Codex/Ralph Loop now |
| `READY FOR HUMAN EXTERNAL SETUP` | Needs Philip to create external resources (Supabase project, credentials) before Codex can work |
| `READY FOR CODEX AFTER EXTERNAL SETUP` | Codex-able once external setup is complete |
| `BLOCKED BY EXTERNAL CREDENTIALS` | Cannot proceed without credentials Philip must provide |
| `IMPLEMENTATION REQUIRED` | Codex work is needed |
| `EVIDENCE REQUIRED` | Implementation done but evidence artifacts missing |
| `POST-BETA` | Not needed for controlled beta |
| `ENTERPRISE MVP` | Required for enterprise-grade MVP (Layer 2) |
| `PUBLIC LAUNCH` | Required for public/paid launch (Layer 3) |
| `POST-MVP` | Not needed until after public launch |
| `BETA P0` | Must be done before external beta |
| `BETA P1` | Strongly recommended but can be accepted risk |
| `DONE` | Implemented with verifiable evidence |
| `CONDITIONAL` | Conditional on specific owner actions |

---

## 6. Where Each Decision Lives

| Decision ID | Primary Location | Supporting |
|---|---|---|
| D-001 to D-032 | `14-owner-decisions.md` | `29-enterprise-mvp-scope-and-owner-defaults.md` (for resolved) |
| All resolved defaults (21) | `29-enterprise-mvp-scope-and-owner-defaults.md` | `24-owner-decision-packet.md` (for history) |
| Remaining unresolved (11) | `99-roadmap-quality-self-audit.md` (Items Still Requiring Philip's Attention) | `14-owner-decisions.md` |

## 7. Where Each Goal Card Lives

All canonical goal cards and EPIC headers live in `26-codex-goal-cards.md`; use that file for exact current counts and readiness status. Status summary in `00-production-readiness-dashboard.md`. Execution plan in `23-codex-goal-execution-plan.md`. Workstream organization in `25-active-workstreams.md`.

## 8. Where Evidence Lives

All evidence under `.ai/09_archive/store/YYYY-MM-DD-[goal-id]/`. Index in `28-evidence-artifact-index.md`.

## 9. What Agents Should Read First

**For implementation agents (Codex / Ralph Loop):**
1. `33-ralph-loop-execution-protocol.md` (execution rules)
2. `29-enterprise-mvp-scope-and-owner-defaults.md` (confirmed scope)
3. `23-codex-goal-execution-plan.md` (wave order)
4. `26-codex-goal-cards.md` (pick a card)
5. `27-performance-budget-and-regression-gates.md` (performance rules)
6. `28-evidence-artifact-index.md` (where to save evidence)

**For Philip (owner review):**
1. `29-enterprise-mvp-scope-and-owner-defaults.md` (what was decided)
2. `00-production-readiness-dashboard.md` (current status)
3. `14-owner-decisions.md` (remaining unresolved decisions)

**For roadmap maintenance:**
1. `34-roadmap-consistency-index.md` (this document)
2. `99-roadmap-quality-self-audit.md` (audit checklist)

---

*This index is the single source of truth for roadmap structure. When in doubt about which document to read or update, consult this index first.*
