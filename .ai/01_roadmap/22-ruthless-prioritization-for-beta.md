# Ruthless Beta Prioritization for Codex Execution

**Last updated:** 2026-05-30
**Purpose:** Tells Codex what to implement first, what to ignore, what evidence to capture, and what must remain blocked until Philip decides.

## Priority Lanes

| Lane | Meaning |
|------|---------|
| BETA P0 | Must be completed before any external design-partner beta. Hard gate. |
| BETA P1 | Strongly recommended before beta, but can be accepted risk by Philip |
| ENTERPRISE MVP | Required for enterprise-ready MVP but not blocking controlled beta |
| PUBLIC / PAID LAUNCH | Required for public/open launch with paid tiers |
| POST-MVP | Valuable, but deferred until after enterprise MVP ships |
| DEFERRED / DO NOT IMPLEMENT NOW | Explicitly out of scope for current Codex goal cycle |

---

## BETA P0 — Must Be Done Before External Beta

These items are hard gates for controlled design-partner beta. Codex must implement these first.

| # | Area | Lane | Rationale | Owner Decision? | Evidence Required | Wave |
|---|------|------|-----------|-----------------|-------------------|------|
| 1 | Staging / safe environment separation | BETA P0 | Current Supabase project is dev data plane. No safe place to test. Beta users need isolated environment. | D-015: Staging Supabase | Staging Supabase URL, Vercel staging preview URL | Wave 1 |
| 2 | RLS denial tests — workspace/project/estimate/core data | BETA P0 | RLS policies exist but are untested. Cross-tenant leakage is the highest-risk failure mode. | No (already agreed RLS needed) | Automated test suite passing against staging Supabase | Wave 2 |
| 3 | Storage denial tests — images/attachments | BETA P0 | Storage bucket access must be scoped to workspace. Cross-workspace storage access is a data leak. | No | Storage cross-workspace access tests against staging | Wave 2 |
| 4 | API/server-action authorization audit | BETA P0 | Every /api/* route and server action must verify auth. No unauthenticated writes. | No | Audit report, automated tests for top 10 write routes | Wave 2 |
| 5 | Persistent rate limiting or equivalent durable protection | BETA P0 | In-memory rate limiting clears on restart. Must have durable protection for shared-link brute-force and auth endpoints. | D-004: Rate-limit/CAPTCHA posture | Rate-limit tests survive restart; lockout persistence verified | Wave 2 |
| 6 | Secrets scanning / service-role leak check | BETA P0 | Accidental credential commits must be blocked. Service-role key must never reach client. | No | CI fails on commit with fake credential; bundle audit clean | Wave 2 |
| 7 | Invite lifecycle staging validation | BETA P0 | Local invite code is hardened, but invite tokens must still be validated end-to-end through real provider email: issue → inbox click → auth → accept → revoke → reject replay. | No | Staging E2E test pass on invite lifecycle AFTER provider/env proof | Wave 2 |
| 7a | Collaboration invite config unblock | BETA P0 | Supabase Auth email/provider dashboard proof, hosted invite template/confirmation proof, `PROJECT_INVITE_ENTRY_ENABLED`, and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` must all be configured in the target environment before invite testing can finish. | No | Redacted dashboard evidence, env var inventory, real invite email/browser smoke | Wave 1 |
| 7b | POST-only invite acceptance + fail-closed | BETA P0 | Local route hardening exists; beta readiness still needs real invite smoke proving GET does not grant access and POST acceptance works from the provider-backed email path. | No | Route audit, test results, real inbox click-through proof | Wave 2 |
| 7c | Invite endpoint rate limiting | BETA P0 | Local durable limiter wiring exists; beta readiness still needs target-environment/provider smoke and restart/persistence proof where deployed. | No | Rate limit persistence test in target environment | Wave 2 |
| 7d | False-positive invite messaging fix | BETA P0 | Local messaging is hardened to avoid claiming delivery without confirmation; beta readiness still needs provider delivery proof. | No | Messaging audit, test results, provider delivery evidence | Wave 2 |
| 8 | Shared-link boundary validation | BETA P0 | Shared link tokens must not be enumerable. Password-gated links must enforce lockout. | D-026: Password-gated share evidence | Token enumeration test, lockout persistence test against staging | Wave 2 |
| 9 | Sentry / basic error tracking | BETA P0 | No error visibility exists. Beta needs at least Sentry or equivalent. | No | Sentry dashboard showing errors from staging | Wave 3 |
| 10 | Performance smoke harness | BETA P0 | Route-transition local/prod-like evidence is partially complete, but manual Chrome bfcache DevTools proof, production Chrome React Profiler proof, row-edit/tree/export benchmarks, and broader load/cold-start evidence still need to be captured before beta readiness. | No | Lighthouse + trace for key routes; manual bfcache/React Profiler evidence; row-edit, tree-render, export benchmarks | Wave 3 |
| 11 | Onboarding first-value flow | BETA P0 | First-time users must complete the core loop without guidance. Login→project→estimate→rows→cost visible. | No | Non-technical user test: creates estimate, sees cost, finds export/share | Wave 4 |
| 12 | Desktop guard for workshop | BETA P0 | Mobile editing is out of scope for beta. Desktop-only guard must block mobile users cleanly. | D-027: Mobile workshop | Desktop guard overlay at <768px with clear message and suggested device | Wave 4 |
| 13 | Client shared-link comprehension test | BETA P0 | External clients must understand shared estimates without guidance. | No | Non-technical user comprehension test | Wave 5 |
| 14 | Support email (support@ or equivalent) | BETA P0 | Beta users need a known support path. | D-011: Support channel | Configured email, auto-responder, tested | Wave 7 |
| 15 | Beta legal / limitations pack | BETA P0 | What beta participants should and should not expect. Written disclosure required. | D-014: Legal before beta | Published limitations document, beta partner agreement template | Wave 7 |
| 16 | Beta partner list | BETA P0 | 3-5 named design partners identified and committed before beta launch. | D-006: Beta scope | Documented partner list with contact info and use cases | Wave 7 |
| 17 | Philip beta signoff | BETA P0 | Hardest gate. Philip must say "go." | All owner decisions | Philip signoff recorded with date and scope | Wave 7 |
| 18 | Database index & query-plan audit | BETA P0 | Must understand current index coverage before beta. Read-only audit — no DDL. | No | Index inventory, query hotspot map, FK classification, advisor review (CODEX-P0-DBIDX-001) | Wave 2 |
| 19 | Migration parity & shared-link schema reconciliation | BETA P0 | Must verify schema parity before designing indexes for shared-link tables. No schema changes. | No | Migration parity report, shared-link table check (CODEX-P0-DBIDX-002) | Wave 2 |
| 20 | EXPLAIN protocol for critical queries | BETA P0 | Need query plan evidence before any index can be proposed. No DDL. | No | EXPLAIN templates with representative seed data (CODEX-P0-DBIDX-003) | Wave 2 |

---

## BETA P1 — Recommended But Can Be Accepted Risk

These items should ideally be done before beta, but Philip can accept the risk if beta is small and controlled.

| # | Area | Lane | Rationale | Owner Decision? | Risk if Deferred |
|---|------|------|-----------|-----------------|------------------|
| 1 | Cloudflare Turnstile (if rate limiting implemented first) | BETA P1 | Additional bot/abuse protection. Acceptable risk if durable rate limiting is in BETA P0. | D-004: CAPTCHA posture | Brute-force risk mitigated by persistent rate limiting + small beta |
| 2 | Google OAuth full public verification | BETA P1 | Design partners see "unverified app" warning. Acceptable if partners are briefed and named. | No (can accept risk) | User trust concern; mitigated by design-partner relationship |
| 3 | Full accessibility audit (WCAG 2.1 AA) | BETA P1 | Acceptable if beta participants are known and limitations disclosed. | No | Exclusion risk; mitigated by known participant list |
| 4 | Full cross-browser matrix | BETA P1 | Chrome-only smoke is acceptable for controlled beta. | No | Safari/Firefox bugs possible; mitigated by asking partners' browsers |
| 5 | Full disaster recovery drill | BETA P1 | Beta data is low-risk; Supabase backups provide adequate safety net. | No | Data loss risk; acceptable for beta with backups |
| 6 | Product analytics beyond north star | BETA P1 | Minimal first-party events (north star only) is sufficient for qualitative-first beta. | D-031: Analytics before beta | Can't measure quantitatively beyond activation; acceptable for qualitative-first beta |
| 7 | Invite visibility signifiers (pending/sent/accepted/expired states) | BETA P1 | Collaboration invite status not visible in sidebar/homebase/modal surfaces. Acceptable for small beta where Philip manages invites manually. | No | Confusion risk for invitees; mitigated by small beta + manual onboarding |
| 8 | Shared-link visibility signifiers (project-card badges, one-click copy, activity dot) | BETA P1 | Missing link status indicators and copy convenience. Acceptable if beta partners are briefed. | No | Minor UX friction; mitigated by partner relationship |
| 9 | Shared-link recipient tracking + owner digest fix | BETA P1 | Per-recipient open tracking missing; owner digest uses hardcoded/placeholder sender. Acceptable for beta. | No | Can't measure recipient engagement; acceptable for qualitative-first beta |
| 10 | Shared-link destructive confirmation dialogs | BETA P1 | Revoke/remove/destructive share actions lack confirmation. Acceptable risk for small beta. | No | Accidental revoke risk; mitigated by small beta |
| 11 | Candidate index migration draft for staging | BETA P1 | Draft migration with evidence-backed indexes for staging review only. Requires audit + EXPLAIN evidence. Must not apply to production. | No | Delaying index optimization until after audit; acceptable for small beta |

---

## ENTERPRISE MVP — Required for Enterprise-Ready MVP

These items are required for enterprise MVP but do NOT block controlled design-partner beta. They ship between beta learnings and public launch.

| # | Area | Lane | Rationale | Evidence Required |
|---|------|------|-----------|-------------------|
| 1 | PDF package workflow | ENTERPRISE MVP | XLSX + shared links sufficient for beta learning. Enterprise customers expect PDF deliverables. | PDF generation from estimate tree, styled proposal output |
| 2 | Immutable issued snapshots | ENTERPRISE MVP | Mutable XLSX export is insufficient for professional proposals. Versioned, immutable snapshots required for audit. | Snapshot creation, retrieval, issuance workflow; immutability verified |
| 3 | Public-ready legal review | ENTERPRISE MVP | Beta uses written disclosure. Enterprise customers need reviewed ToS, Privacy Notice, subprocessor list. | Counsel-reviewed legal docs published |
| 4 | Strict CSP on workshop routes | ENTERPRISE MVP | Report-Only CSP acceptable for beta. Enterprise customers expect strict CSP. | CSP headers enforced on all workshop routes; no violations |
| 5 | Feature flags | ENTERPRISE MVP | Needed for controlled enterprise feature rollout and beta-to-GA gating. | Feature flag system operational; at least 3 flags deployed |
| 6 | Accessibility baseline beyond critical blockers | ENTERPRISE MVP | Critical blockers addressed in beta. Enterprise customers need WCAG 2.1 AA baseline. | aXe/WAVE audit pass on all workshop routes |
| 7 | Self-serve DSAR / export / delete | ENTERPRISE MVP | Manual DSAR handling acceptable for small beta. Enterprise requires self-serve. | User-facing data export and account deletion flows operational |
| 8 | Full restore drill / PITR | ENTERPRISE MVP | Supabase backups sufficient for beta. Enterprise needs proven restore capability. | Point-in-time recovery drill completed and documented |
| 9 | Full browser matrix validation | ENTERPRISE MVP | Chrome-only acceptable for beta. Enterprise needs Chrome, Safari, Firefox, Edge. | All supported browsers pass smoke tests |
| 10 | Full mobile editing support | ENTERPRISE MVP | Desktop guard sufficient for beta. Enterprise field estimators need mobile. | Responsive estimate editing on mobile viewports |
| 11 | Database search index strategy | ENTERPRISE MVP | pg_trgm/full-text strategy deferred until server-side search ships. Search index candidates stay PLANNED. | Search index strategy document; no indexes created unless use cases approved |

---

## PUBLIC / PAID LAUNCH — Required Before Public/Open Launch

These are non-negotiable for public launch with paid tiers but not needed for controlled beta or enterprise MVP.

| # | Area | Lane | Rationale |
|---|------|------|-----------|
| 1 | Final Privacy Notice | PUBLIC / PAID LAUNCH | Legal requirement for public users |
| 2 | Final Terms of Service | PUBLIC / PAID LAUNCH | Legal requirement for public users |
| 3 | Subprocessor list | PUBLIC / PAID LAUNCH | Legal requirement for transparency |
| 4 | Launch jurisdiction decision | PUBLIC / PAID LAUNCH | Determines governing law |
| 5 | Public OAuth verification | PUBLIC / PAID LAUNCH | Cannot show "unverified app" to public users |
| 6 | Redis-backed persistent rate limiting at scale | PUBLIC / PAID LAUNCH | Required for public traffic volume |
| 7 | Strict provider dashboard evidence | BETA P0 FOR INVITES/EMAIL; PUBLIC / PAID LAUNCH FOR FULL AUDIT | Supabase Auth provider/email, hosted invite template/confirmation, and Resend dashboard/webhook proof are still missing and block invite/shared-link beta readiness; broader provider audit remains public/paid launch evidence |
| 8 | Production/staging/preview deployment pipeline | PUBLIC / PAID LAUNCH | Full CI/CD required for public traffic |
| 9 | Domain/DNS/HTTPS | PUBLIC / PAID LAUNCH | Production URL required |
| 10 | Rollback drilled | PUBLIC / PAID LAUNCH | Must prove recovery capability |
| 11 | All major runbooks drilled | PUBLIC / PAID LAUNCH | Incident response readiness |
| 12 | Accessibility baseline (WCAG 2.1 AA) for public | PUBLIC / PAID LAUNCH | Legal and ethical requirement |
| 13 | Full validation matrix | PUBLIC / PAID LAUNCH | All tests pass across all environments |
| 14 | Performance budgets proven | PUBLIC / PAID LAUNCH | All public-launch metrics within targets |
| 15 | Public claims audit | PUBLIC / PAID LAUNCH | No unsubstantiated marketing claims |
| 16 | Public support path (scalable) | PUBLIC / PAID LAUNCH | Support for unknown users at scale |
| 17 | Legal/compliance signoff | PUBLIC / PAID LAUNCH | Reviewed and approved by counsel |
| 18 | Billing/payment integration | PUBLIC / PAID LAUNCH | Paid tiers require Stripe or equivalent |
| 19 | Admin panel / dashboard | PUBLIC / PAID LAUNCH | Operational visibility for Philip |

---

## POST-MVP — Valuable After Enterprise MVP

| # | Area | Lane | Rationale |
|---|------|------|-----------|
| 1 | Enterprise SLA | POST-MVP | Not relevant until enterprise contracts exist |
| 2 | i18n / localization | POST-MVP | US-only for foreseeable future |
| 3 | Full autonomous AI | POST-MVP | Confirmation-gated AI is correct posture |
| 4 | Broad AI memory / vector/RAG | POST-MVP | No stored conversations planned |
| 5 | Full offline mutation queue | POST-MVP | Online-only acceptable for beta and enterprise MVP |
| 6 | Third-party penetration test | POST-MVP | Unless required by an enterprise customer |
| 7 | Open-source licensing decision | POST-MVP | No impact on beta or MVP |
| 8 | Multi-region deployment | POST-MVP | Single-region sufficient |

---

## DEFERRED / DO NOT IMPLEMENT NOW

These items are explicitly out of scope. Codex must NOT spend time on these.

| # | Area | Why Deferred |
|---|------|-------------|
| 1 | PDF export implementation (until ENTERPRISE MVP) | Enterprise MVP wave |
| 2 | Immutable proposal snapshots (until ENTERPRISE MVP) | Enterprise MVP wave |
| 3 | Billing/payment integration (until PUBLIC / PAID LAUNCH) | Public launch |
| 4 | Admin dashboard/panel (until PUBLIC / PAID LAUNCH) | Public launch |
| 5 | Enterprise SSO | Not applicable |
| 6 | i18n string externalization | US-only for foreseeable future |
| 7 | Vector/RAG/embeddings | Not in product scope |
| 8 | Autonomous AI mutations | Explicitly against product principles |
| 9 | Full mobile workshop editing (until ENTERPRISE MVP) | Enterprise MVP wave |
| 10 | Strict CSP enforcement (not Report-Only) (until ENTERPRISE MVP) | Blocked by @firecms/neat dependency |
| 11 | PITR/advanced backup (until ENTERPRISE MVP) | Enterprise MVP wave |
| 12 | Multi-region deployment | Single-region sufficient |
| 13 | Third-party pen test (unless enterprise requires) | Post-MVP |
| 14 | Open-source licensing | No impact on current phases |

---

## Summary

| Lane | Count | Action for Codex |
|------|-------|------------------|
| BETA P0 | 24 | Implement now, in wave order (includes collab invite config, POST-only, rate limiting, messaging fix, DB indexing audit/parity/EXPLAIN) |
| BETA P1 | 11 | Can be deferred; Philip accepts risk (includes invite visibility, shared-link visibility, recipient tracking, destructive confirmations, candidate index draft) |
| ENTERPRISE MVP | 11 | Do not implement for beta; queued for Wave 6 |
| PUBLIC / PAID LAUNCH | 19 | Do not implement for beta or enterprise MVP |
| POST-MVP | 8 | Do not implement |
| DEFERRED | 14 | Explicitly skip |
| **Total classified** | **87** | Expanded from 82 — 5 new DBIDX BETA P0/P1/ENTERPRISE items |

The 137 raw items from the dashboard have been compressed into 82 classified items across 6 priority lanes. Only 21 BETA P0 items demand immediate Codex attention (including 4 new collab invite items), and 10 of those are in Waves 1-5 (implementation); 4 are in Wave 7 (beta operations).

## Next Action

1. Owner defaults are codified (see `29-enterprise-mvp-scope-and-owner-defaults.md`). No further owner decisions block implementation.
2. Start Codex execution with Wave 1: BETA-P0-INF-001 (staging/environment foundation).
3. Proceed wave by wave as defined in `23-codex-goal-execution-plan.md`.
4. Pick one goal card at a time from `26-codex-goal-cards.md`.
