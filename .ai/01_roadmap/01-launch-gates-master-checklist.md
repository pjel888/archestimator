# Launch Gates Master Checklist

**Last updated:** 2026-06-18 (roadmap-sync code reconciliation pass)
**Status:** Pre-launch MVP audit complete. Repo-local launch implementation is frozen; external/provider/manual proof gates remain open.

> **2026-06-18 reconciliation note (code ground-truth pass):** Statuses were checked against the actual codebase. External/provider/manual proof items (RLS-in-CI, staging Supabase, Google OAuth verification, Resend SPF/DKIM/DMARC, Sentry/Redis, Vercel CD/domain, legal review, hosted/manual smokes) remain at their existing pending/open/NO-GO status because code cannot prove a hosted/provider/manual fact. Two items were code-verifiably stale and were corrected in place: **UX-12** (workshop React error boundaries now exist) and **UX-10** (design-system lint is wired into `validate` and passing). Evidence pointers were appended inline. Several "Validation Method" entries name test files that do not yet exist (e.g. `tests/integration/rls-isolation.test.ts` — no `tests/integration/` dir exists); those are intended future validations, not current evidence, and were left unchanged.

## Current MVP Launch Handoff

Closed beta remains **NO-GO**. The local launch-readiness implementation lane is frozen at `6ab5b38`, with docs/status guard evidence pushed through `bdf9b03`. The broad launch goal was marked blocked, not complete, because the remaining work requires external/provider/manual proof.

Use `.ai/03_plans/mvp-launch-readiness-2026-06-01/46-manual-proof-matrix.md` as the remaining proof checklist and `.ai/03_plans/mvp-launch-readiness-2026-06-01/47-goal-completion-audit.md` before any future completion claim.

---

## Summary

| Metric | Count |
|---|---|
| Total items across all gates | 89 |
| **Beta Minimum Gate items** | **26** (19 numbered + 7 sub-gates 5a–5d/6a–6c; expanded from 18 — invite/share items split + DB index audit) |
| **Enterprise MVP Gate items** | **12** |
| **Public Launch Gate items** | **45** (full 5-gate checklist) |
| DONE | 1 |
| IMPLEMENTED / NEEDS EVIDENCE / EXTERNAL PROOF OPEN | 14+ (2026-06-18: UX-10, UX-12 reclassified into this bucket per code evidence) |
| PARTIAL / MANUAL OR PROVIDER PROOF OPEN | 7+ |
| PLANNED / DRAFTED | 12 |
| LEFT TO DO | 25 |
| HARD CONFIG BLOCKED | External/provider/manual proof lane open: Vercel, Supabase, Resend, legal, support, spreadsheet, hosted E2E |
| BLOCKED | Broad MVP launch goal blocked until proof lane is configured and captured |
| OWNER DECISION REQUIRED | 3 (remaining — all public launch only) |
| UNKNOWN | 4 |
| DECIDED / APPROVED DEFAULT | 21 (owner decisions resolved 2026-05-30) |

---

## Status Legend

| Status | Meaning |
|---|---|
| `DONE` | Implemented with verifiable evidence |
| `IMPLEMENTED / NEEDS EVIDENCE` | Code exists, production proof missing |
| `PARTIAL` | Some slices exist, insufficient for launch |
| `PLANNED` | Design exists, implementation not started |
| `LEFT TO DO` | Known gap, no work started |
| `BLOCKED` | Cannot proceed (dependency or decision) |
| `OWNER DECISION REQUIRED` | Philip must decide before work begins |
| `DECIDED / APPROVED DEFAULT` | Decision resolved — recommended default approved |
| `UNKNOWN` | Needs audit before status can be set |

## Launch Decision Legend

| Decision | Meaning |
|---|---|
| `BLOCKS PUBLIC LAUNCH` | Cannot go to public production without this |
| `BLOCKS BETA` | Cannot begin controlled beta without this |
| `NICE TO HAVE` | Desirable but not gating for current phase |
| `OWNER DECISION` | Philip's call determines the gating impact |

---

## Gate 0: Beta Minimum Gate

The Beta Minimum Gate defines the absolute minimum required before controlled invite-only beta with 5–8 design partners. Everything else is ENTERPRISE MVP (P1) or PUBLIC LAUNCH.

**Gate status:** `0 of 26 DONE — PRE-IMPLEMENTATION` (26 enumerated rows: 19 numbered items including the DB index audit, plus sub-gates 5a–5d and 6a–6c)
**Owner decisions resolved:** All 21 gate-blocking decisions decided 2026-05-30.

### Beta Minimum Checklist

| # | Item | Ref ID | Status | Blocks |
|---|---|---|---|---|
| 1 | Staging / safe environment exists (separate Supabase + Vercel preview) | SEC-06, REL-04 | `LEFT TO DO` | **BETA P0** |
| 2 | RLS denial tests pass (all user-data tables) | SEC-01, SEC-02, SEC-16 | `LEFT TO DO` | **BETA P0** |
| 3 | Storage denial tests pass (cross-workspace) | SEC-03 | `LEFT TO DO` | **BETA P0** |
| 4 | API/server-action auth audit complete | SEC-12 | `IMPLEMENTED / NEEDS EVIDENCE` | **BETA P0** |
| 5 | Collaboration invite config unblock (Supabase Auth email provider + `PROJECT_INVITE_ENTRY_ENABLED` + `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`) | SEC-04, COLLAB-001A/B | `EXTERNAL PROVIDER PROOF OPEN` | **BETA P0** |
| 5a | Invite acceptance route enabled and tested (fail-closed, POST-only) | SEC-04 | `IMPLEMENTED LOCALLY / REAL INVITE SMOKE OPEN` | **BETA P0** |
| 5b | Invite lifecycle E2E validation (valid, expired, revoked, used, wrong-account states) | SEC-04 | `LOCAL COVERAGE EXISTS / REAL EMAIL PROVIDER SMOKE OPEN` | **BETA P0** |
| 5c | Invite endpoint rate limiting (durable, survives restart) | SEC-10 | `IMPLEMENTED LOCALLY / PROVIDER SMOKE OPEN` | **BETA P0** |
| 5d | False-positive invite email messaging fix (no "email sent" unless delivery confirmed) | UX-02 | `IMPLEMENTED LOCALLY / PROVIDER DELIVERY PROOF OPEN` | **BETA P0** |
| 6 | Shared link token boundary test | SEC-05 | `IMPLEMENTED / LIVE ROUTE PROOF EXISTS / FULL PROVIDER PROOF OPEN` | **BETA P0** |
| 6a | Shared-link durable rate limiting (password/access lockout persists across restarts) | SEC-10 | `IMPLEMENTED / LINKED-REMOTE PROOF EXISTS` | **BETA P0** |
| 6b | Shared-link recipient tracking / open tracking | N/A | `IMPLEMENTED / LIVE ROUTE PROOF EXISTS / REAL EMAIL PROOF OPEN` | **BETA P1** |
| 6c | Shared-link visibility indicators (project-card/homebase badges, one-click copy) | N/A | `IMPLEMENTED / LOCAL UI PROOF EXISTS` | **BETA P1** |
| 7 | Core performance smoke benchmarks (route transitions, large sheet, XLSX) | UX-06, UX-07, UX-08 | `PARTIAL / MANUAL CHROME PROOF OPEN` | **BETA P0** |
| 8 | Persistent rate limiting (durable, survives restart — in-memory alone NOT acceptable for beta) | SEC-10 | `IMPLEMENTED (DB-DURABLE) / HOSTED RESTART-SURVIVAL PROOF OPEN` | **BETA P0** |
| 9 | Basic error tracking (Sentry or equivalent APM) | REL-01 | `LEFT TO DO` | **BETA P0** |
| 10 | Support channel configured (email + lightweight tracker) | LEG-13 | `LEFT TO DO` | **BETA P0** |
| 11 | Beta legal pack: written limitation disclosure + known-limitations doc | LEG-10, D-014 | `DECIDED / APPROVED DEFAULT` | **BETA P0** |
| 12 | First-party analytics instrumentation (north star + activation events) | D-031, PM-01, PM-02 | `LEFT TO DO` | **BETA P0** |
| 13 | Desktop guard for workshop (mobile viewport < 768px shows clear overlay) | UX-13, D-027 | `LEFT TO DO` | **BETA P0** |
| 14 | Manual DSAR process documented (not self-serve — self-serve is public launch) | LEG-04, LEG-05 | `LEFT TO DO` | **BETA P0** |
| 15 | Google OAuth verification (strongly preferred for beta; mandatory for public launch) | SEC-08 | `LEFT TO DO` | **BETA P1 (strongly preferred)** |
| 16 | Cloudflare Turnstile on auth endpoints (CAPTCHA provider decided) | SEC-13, D-004 | `DECIDED / CLOUDFLARE TURNSTILE — NOT BUILT` (ZERO code; see SEC-13 / dashboard 1.27) | **BETA P1** |
| 17 | Beta onboarding script + known limitations disclosure | LEG-10 | `DECIDED / APPROVED DEFAULT` | **BETA P0** |
| 18 | Beta scope defined (invite-only, 5–8 partners, controlled — DECIDED) | LEG-10, D-006 | `DECIDED / APPROVED DEFAULT` | **BETA P0** |
| 19 | Database index & query-plan audit complete | DBIDX-001/002/003 | `LEFT TO DO` | **BETA P0** |

### Beta Minimum Gate Acceptance Criteria

- All 26 Beta Minimum Gate rows (including sub-gates) marked `DONE` with evidence
- 4 critical runbooks templated (auth outage, data leak, bad deploy, invite failure)
- Philip signs beta approval (go decision)
- Risk acceptance register signed for all BETA P1 items
- Persistent rate limiting is durable (DB-backed via `security_rate_limit_events`) and its survives-restart behavior is proven against the hosted DB (in-memory alone NOT acceptable). Redis-backed limiting at public traffic scale is a PUBLIC LAUNCH item, not a beta gate.

### Items Explicitly NOT in Beta Minimum Gate

| Item | Where It Lives | Rationale |
|---|---|---|
| Self-serve DSAR (delete/export UI) | PUBLIC LAUNCH | Manual DSAR process (#14 above) sufficient for 5–8 known partners |
| PDF package / client-facing output | ENTERPRISE MVP | XLSX + shared links sufficient for beta validation |
| Immutable issued proposal snapshots | ENTERPRISE MVP | Mutable XLSX export adequate for design-partner learning |
| Full mobile-responsive workshop | ENTERPRISE MVP | Desktop guard (#13 above) prevents broken mobile experience |
| Strict CSP on workshop routes | PUBLIC LAUNCH | Report-Only CSP acceptable for beta; blocked by @firecms/neat |
| Full performance budget proof | ENTERPRISE MVP / PUBLIC LAUNCH | Core smoke benchmarks (#7) sufficient for beta |
| Privacy Notice / Terms of Service (full legal review) | PUBLIC LAUNCH | Beta legal pack (#11) covers 5–8 partners under written disclosure |
| Production CD pipeline (Vercel auto-deploy) | PUBLIC LAUNCH | Manual deploy acceptable for invite-only beta |
| Domain/DNS/HTTPS | PUBLIC LAUNCH | Vercel preview URLs sufficient for beta |
| Full accessibility audit | PUBLIC LAUNCH | Known participants, limitations disclosed |
| Self-serve onboarding | PUBLIC LAUNCH | Manual onboarding (30-min kickoff call) for beta partners |

---

## Gate 1: Enterprise MVP Gate

Items required before marketing the product to a broader enterprise audience, but not required for the initial controlled beta.

**Gate status:** `0 of 12 DONE — PRE-IMPLEMENTATION`

| # | Item | Ref ID | Status | Blocks |
|---|---|---|---|---|
| 1 | PDF package / client-facing proposal output | D-009, D-025 | `DECIDED / ENTERPRISE MVP P1` | ENTERPRISE MVP |
| 2 | Immutable issued proposal snapshots | D-008 | `DECIDED / ENTERPRISE MVP` | ENTERPRISE MVP |
| 3 | Feature flags system (beta-optional features gated) | D-028 | `DECIDED / OPTIONAL FEATURE-FLAGGED BETA` | ENTERPRISE MVP |
| 4 | Persistent rate limiting + Turnstile hardened (Redis + CAPTCHA full integration) | SEC-10, SEC-13 | `LEFT TO DO` | ENTERPRISE MVP |
| 5 | Performance budgets proven (full benchmarks, SLOs, regression gates) | UX-06, UX-07, UX-08, REL-11, REL-12 | `PLANNED` | ENTERPRISE MVP |
| 6 | APM/logging/alerts fully configured (Sentry + log aggregation + alert routing) | REL-01, REL-02 | `LEFT TO DO` | ENTERPRISE MVP |
| 7 | Backup posture verified (PITR enabled, DR runbook drilled) | REL-14, REL-15 | `LEFT TO DO` | ENTERPRISE MVP |
| 8 | Public claims audit (all copy verified against implemented capabilities) | LEG-06, LEG-07 | `PARTIAL` | ENTERPRISE MVP |
| 9 | Stronger client share receiver (post-beta improvements from partner feedback) | UX-04 | `IMPLEMENTED / NEEDS EVIDENCE` | ENTERPRISE MVP |
| 10 | Accessibility baseline (aXe/WAVE audit, zero critical/serious violations) | UX-09 | `LEFT TO DO` | ENTERPRISE MVP |
| 11 | Support runbooks drilled (all 20 scenarios executed at least once) | LEG-08 | `LEFT TO DO` | ENTERPRISE MVP |
| 12 | @firecms/neat replacement (unblocks strict CSP for workshop) | D-017 | `DECIDED / ENTERPRISE MVP P1` | ENTERPRISE MVP |

---

## Gate 2–6: Public Launch Gates

The full production-readiness checklist below constitutes the Public Launch Gate. Items here are only required before opening to the public. They are not required for beta or enterprise MVP.

### Public Launch Gate Summary

| Gate | Status | Launch Blocker? |
|---|---|---|
| Security, Tenancy & Data Protection | `PARTIAL` | **YES** |
| UX/UI Launch Quality | `PARTIAL` | **YES** |
| Reliability, Performance & Observability | `PARTIAL` | **YES** |
| Legal, Support, Deployment & Business Readiness | `PARTIAL` | **YES** |
| Product Onboarding, Activation & UX Excellence | `PARTIAL` | **YES** |

---

### Gate 2: Security, Tenancy & Data Protection (PUBLIC LAUNCH)

**Gate Status:** `PARTIAL`
**Launch Blocker:** YES

#### Definition of Done

This gate is complete when every user-facing data boundary is proven by automated test, not assumed. Specifically:

1. No authenticated user can read, write, or enumerate data owned by another workspace, project, or user.
2. All RLS policies have table-by-table denial tests that pass in CI.
3. Storage bucket access is scoped to the owning workspace and verified by cross-workspace access tests.
4. Invite tokens cannot be replayed, brute-forced, or escalated beyond their intended scope.
5. Shared link tokens cannot be enumerated, brute-forced, or used to access unpublished data.
6. Auth endpoints are protected against automated abuse (rate limiting with persistent backing, CAPTCHA on magic-link routes).
7. Google OAuth verification is approved; users see no "unverified app" warning.
8. Email infrastructure is authenticated (SPF/DKIM/DMARC pass) to prevent spoofing.
9. Workshop routes enforce a strict Content Security Policy with no `unsafe-inline` or `unsafe-eval`.
10. Secrets scanning in CI blocks accidental credential commits.
11. Rate limiting and lockout state survives server restarts (durable, DB-backed via `security_rate_limit_events`, not in-memory only; Redis at public traffic scale is a later public-launch item).

#### Checklist

| Ref ID | Item | Priority | Status | Acceptance Criteria | Validation Method | Dependency | Launch Decision |
|---|---|---|---|---|---|---|---|
| SEC-01 | Cross-workspace RLS isolation | P0 | IMPLEMENTED / NEEDS EVIDENCE | Authenticated user in Workspace A cannot read or write any row belonging to Workspace B across all user-data tables. Rejected reads return empty sets; rejected writes return RLS policy errors. | Automated denial test suite (`tests/integration/rls-isolation.test.ts`) running in CI against a real Supabase instance. One test per protected table, minimum 2 assertions each (read denial, write denial). | None | BLOCKS PUBLIC LAUNCH |
| SEC-02 | Table-by-table RLS audit | P0 | IMPLEMENTED / NEEDS EVIDENCE | Every user-data table has an enabled RLS policy. No table with user data is left with permissive or missing RLS. | Table inventory script + manual review against migration SQL. Every table in the audit list has a green denial test in SEC-01. | SEC-01 | BLOCKS PUBLIC LAUNCH |
| SEC-03 | Storage bucket cross-workspace access denial | P0 | IMPLEMENTED / NEEDS EVIDENCE | User in Workspace A cannot read, write, or list objects in a storage bucket path owned by Workspace B. | Automated test that uploads a file as Workspace A, then attempts read/download/delete as Workspace B. All cross-workspace operations must fail. | None | BLOCKS PUBLIC LAUNCH |
| SEC-04 | Invite token lifecycle hardening | P0 | IMPLEMENTED LOCALLY / EXTERNAL PROVIDER PROOF OPEN | Code-level hardening exists: token resolution is pepper-hashed and cannot be enumerated, GET does not mutate, POST-only accept is fail-closed, expired/revoked/used tokens return stable error codes without leaking state, and accepted tokens cannot be replayed. Still open before beta/public claims: Supabase Auth email/provider dashboard proof, hosted invite template/confirmation settings, invite env var inventory for target environment, and real invite email/browser smoke. | Staging/production E2E after provider setup: issue invite through real email provider, click from recipient inbox, resolve as non-member, authenticate, accept via POST, verify project/sheet access, revoke/replay/wrong-account/expired states, and prove GET does not grant access. | SEC-06 (staging Supabase) | BLOCKS PUBLIC LAUNCH |
| SEC-05 | Shared link token boundary hardening | P0 | IMPLEMENTED / NEEDS EVIDENCE | Token enumeration returns 0 results for any user who lacks explicit access. Password-protected links enforce progressive lockout (5 attempts, 15-minute window). Lockout is recorded server-side. | Penetration test script: attempt 100 random hashed tokens against the resolve endpoint (all must return 404/empty). Brute-force simulation: 6 rapid password attempts on a protected link must trigger lockout. | SEC-10 (persistent rate limiting) | BLOCKS PUBLIC LAUNCH |
| SEC-06 | Staging Supabase environment | P0 | LEFT TO DO | A separate Supabase project exists for staging. Migrations are applied independently from production. Staging uses its own auth users, service-role keys, and storage buckets. No production data is exposed to staging. | Verify staging Supabase project URL differs from production. Run `npx supabase db push` against staging and confirm no production tables are affected. | None (setup task) | BLOCKS BETA (also public launch) |
| SEC-07 | Migration parity verification | P0 | UNKNOWN | Local migration files produce the same schema as the live remote Supabase database. No drift, no unapplied migrations, no manual remote-only changes. | Run `supabase db diff` between local and remote. Output must be empty (no differences). | SEC-06 (staging Supabase) | BLOCKS PUBLIC LAUNCH |
| SEC-08 | Google OAuth verification | P0 | LEFT TO DO | Google Cloud Console OAuth consent screen shows "Verified" status. Users authenticating via Google see no warning screen. No 100-user cap. | Screenshot of Google Cloud Console with verified status. Live authentication flow records no "unverified app" interstitial. | SEC-11 (Privacy Notice), SEC-12 (Terms of Service) | BLOCKS PUBLIC LAUNCH (strongly preferred for beta) |
| SEC-09 | Email domain authentication (SPF/DKIM/DMARC) | P0 | PARTIAL | Resend-sent emails pass SPF, DKIM, and DMARC checks. Gmail headers show `spf=pass`, `dkim=pass`, `dmarc=pass`. | Send test email to Gmail address. Inspect raw message headers. All three authentication results must be `PASS`. | PRD-01 (domain/DNS) | BLOCKS PUBLIC LAUNCH |
| SEC-10 | Persistent rate limiting (durable; Redis at scale for public launch) | P0 | IMPLEMENTED (DB-DURABLE) / HOSTED RESTART-SURVIVAL PROOF OPEN | Brute-force lockout and rate limits survive dev server / serverless function restarts. Durable state is implemented via the Postgres `security_rate_limit_events` table (NOT Redis), backing an in-memory progressive-delay/lockout layer; the Redis/Upstash variant for public traffic scale is a PUBLIC LAUNCH item. NOTE: sign-in/OAuth (magic-link) actions have NO app-level limiter and rely on Supabase's own throttling. | Simulation test: trigger lockout, restart server, confirm lockout persists. Confirm the `security_rate_limit_events` table is applied/enforced on the hosted DB (external/hosted fact). | None | BLOCKS BETA (also public launch) |
| SEC-11 | Enforced CSP on workshop routes | P1 | PARTIAL | `/workshop/*` routes serve a strict CSP header with no `unsafe-inline` and no `unsafe-eval`. Report-Only CSP is removed from workshop routes. | Browser DevTools CSP panel shows enforced policy on workshop routes. No CSP violation reports for workshop domains. | Dependency resolution on `@firecms/neat` and react-complex-tree inline styles | BLOCKS PUBLIC LAUNCH |
| SEC-12 | API route auth audit | P0 | IMPLEMENTED / NEEDS EVIDENCE | Every `/api/*` route requires valid authentication for any read or write operation. No route returns data to unauthenticated requests. No write route accepts unauthenticated input. | Manual audit checklist: enumerate all `/api` routes in `src/app/api/`, verify each has a server-side auth check before data access. Automated test for top 10 write routes. | None | BLOCKS PUBLIC LAUNCH |
| SEC-13 | CAPTCHA on auth endpoints (Cloudflare Turnstile) | P1 | DECIDED / CLOUDFLARE TURNSTILE — NOT BUILT | Magic-link creation and auth callback routes require CAPTCHA validation before processing. Automated abuse scripts cannot flood these endpoints. (Decision made; ZERO code today — no `turnstile`/`captcha` in `src/` or `package.json`. See dashboard 1.27.) | Load test: 50 rapid magic-link requests without CAPTCHA must be rate-limited or rejected. Build and verify Cloudflare Turnstile integration. | None | BLOCKS BETA |
| SEC-14 | Secrets scanning in CI | P1 | LEFT TO DO | CI pipeline fails on any commit that contains a Supabase service-role key, API key, private key, or secret token pattern. | Test: push a commit with a fake `supabase_service_role_key=test-secret-xxx`. CI must fail. | None | BLOCKS BETA |
| SEC-15 | Cookie consent persistence | P2 | LEFT TO DO | Cookie consent selections are archived to the database, not stored only in browser cookies. Audit trail exists for consent timestamps and versions. | Verify consent record exists in database after user accepts. Verify consent version is tracked for re-consent scenarios. | None | NICE TO HAVE |
| SEC-16 | RLS denial test suite (automated) | P0 | LEFT TO DO | Comprehensive automated test suite covers all user-data tables. Each test: create data as Workspace A user, attempt cross-read as Workspace B user (must fail), attempt cross-write as Workspace B user (must fail). | `bun test tests/integration/rls-isolation.test.ts` passes in CI with 100% table coverage. | SEC-06 (staging Supabase for CI) | BLOCKS PUBLIC LAUNCH |

---

### Gate 3: UX/UI Launch Quality (PUBLIC LAUNCH)

**Gate Status:** `PARTIAL`
**Launch Blocker:** YES

#### Definition of Done

This gate is complete when a first-time user, without Philip explaining anything, can complete every critical workflow. Specifically:

1. A new user lands on the marketing page, understands the product, and signs up or logs in without confusion.
2. A newly invited collaborator opens an invite link, authenticates, and arrives at the correct project or estimate sheet.
3. A user creating or editing an estimate sheet understands the tree structure, row editing, and how costs flow to totals.
4. A client or buyer opening a shared link understands the content, can navigate tabs, and can leave comments or mark decisions.
5. A user invoking Ask Flip or the package-builder understands what the AI can and cannot do, and completes a successful interaction without trial-and-error guessing.
6. All critical UX flows have been validated by at least one non-technical test user.
7. Route transitions feel instant (sub-100ms cold navigation benchmarks met).
8. Estimate sheets with 500+ rows render and scroll without visible lag.
9. XLSX export completes within a reasonable timeout for typical estimate sizes.
10. An accessibility audit (aXe or WAVE) passes with no critical or serious violations.
11. Design system compliance is enforced across all app routes (no raw Tailwind button classes).
12. Custom 404 and 500 error pages match the design system.
13. Mobile viewport on workshop routes shows a clear desktop-only guard rather than broken layouts.
14. Offline mutation queues survive a browser reload.

#### Checklist

| Ref ID | Item | Priority | Status | Acceptance Criteria | Validation Method | Dependency | Launch Decision |
|---|---|---|---|---|---|---|---|
| UX-01 | Landing to login flow clarity | P1 | IMPLEMENTED / NEEDS EVIDENCE | First-time visitor who has never heard of Archestimator can: (a) understand the product from the landing page, (b) find the login/signup button, (c) complete Google OAuth or email sign-in without external help. | Recruit 3 non-technical test users. Each must complete signup/login in under 3 minutes without asking questions. Record pass/fail per user. | SEC-08 (OAuth verification) | BLOCKS BETA |
| UX-02 | Invite acceptance flow clarity | P1 | IMPLEMENTED LOCALLY / REAL INVITE SMOKE OPEN | Local UI/route code covers invite context, signed-out bridge, POST-only acceptance, wrong-account handling, expired/revoked/used states, pending-invite cards, and accepted/already-member redirects. Still open before beta claims: provider-backed email delivery and real recipient browser smoke from inbox click-through to final project/sheet access. | Staging E2E after provider setup: full invite email → inbox click → auth → accept → redirect → verify correct page loads. Test wrong-account flow: invite sent to email A, user signs in as email B, sees "wrong account" guidance with sign-out-and-continue button. | SEC-06 (staging Supabase) | BLOCKS BETA |
| UX-03 | Estimate editing clarity | P1 | IMPLEMENTED / NEEDS EVIDENCE | Non-technical user can: create an estimate sheet, add group/area nodes, add rows, edit quantities and costs, and understand how totals update. User does not ask "where do I click?" or "what does this number mean?" | Recruit 1 non-technical test user. Give task: "create an estimate for a small bathroom renovation with 3 line items." User must complete without external help. Record time and error count. | None | BLOCKS BETA |
| UX-04 | Shared link receiver clarity | P1 | IMPLEMENTED / NEEDS EVIDENCE | Client/buyer opening a shared link can: view the estimate content, navigate between tabs (Link, Sheets, Comments, Decisions), leave a comment, and understand the difference between mutable and issued content. | Recruit 1 non-technical test user. Give task: "review this estimate and leave a comment about the flooring item." User must complete without guidance. | None | BLOCKS BETA |
| UX-05 | AI Ask / package-builder clarity | P1 | IMPLEMENTED / NEEDS EVIDENCE | User understands: (a) Ask Flip answers questions but does not edit data, (b) package-builder creates drafts that require explicit confirmation before applying, (c) the difference between "ask a question" and "build a package." User can complete one Ask query and one package-builder flow without confusion. | Recruit 1 non-technical test user. Tasks: "Ask Flip how many estimates are in this project" and "Build a package for a 2-bedroom apartment." User must distinguish modes and complete both. | None | BLOCKS BETA |
| UX-06 | Route transition performance | P1 | PARTIAL / MANUAL CHROME PROOF OPEN | Automated/local and production-like evidence covers route perf smoke, Slow 3G public links, authenticated storage-state transitions, sidebar/project-card/estimate-row hover `_rsc` proof, authenticated Lighthouse score `0.86`, true webpack analyzer reports, and public bfcache cache-header mitigation. Still open before DONE/archive: manual Chrome DevTools bfcache persisted-restore proof and production Chrome React Profiler proof. | Capture manual Chrome DevTools bfcache result and React Profiler trace on production-mode Chrome; attach trace/screenshots to `.ai/09_archive/store/` and update the canonical route-transition plan. | None | BLOCKS BETA |
| UX-07 | Large estimate sheet performance | P1 | UNKNOWN | Estimate sheet with 500+ rows scrolls at 60fps. Row editing latency is indistinguishable from small sheets. Tree expansion/collapse is instant. | Load test: seed a project with 500 rows across 20 area nodes. Measure: scroll frame rate (must be 60fps), edit response time (must be <100ms from click to UI update), tree expand time (must be <50ms). | None | BLOCKS BETA |
| UX-08 | XLSX export performance | P1 | UNKNOWN | XLSX export for a 500-row estimate completes within 10 seconds. Export for a 100-row estimate completes within 3 seconds. No browser tab freeze or "page unresponsive" dialog. | Load test: export 3 estimate sizes (50, 200, 500 rows). Measure wall-clock time from click to download prompt. All must be under their respective timeouts. | None | BLOCKS BETA |
| UX-09 | Accessibility audit | P1 | LEFT TO DO | aXe or WAVE automated audit finds zero critical or serious violations on: landing page, login page, workshop homebase, estimate sheet editor, shared link receiver, and settings pages. | Run aXe CLI or WAVE browser extension on each listed route. Export report; must show 0 critical, 0 serious. | None | BLOCKS PUBLIC LAUNCH (enterprise MVP) |
| UX-10 | Design system primitive compliance | P1 | IMPLEMENTED / NEEDS EVIDENCE | All interactive elements in workshop routes use shared UI primitives (Button, Badge, Modal, Toast, SearchInput, ControlInput, etc.). No raw Tailwind button classes (`bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded`) remain in app code. _(Code: `scripts/enforce-app-design-system.mjs` enforces the app/workshop design system — 12px font cap, named-size prohibition, weight/radius/tracking/token rules — and is wired into `bun run validate` (package.json) and the CI `validate` job; it passes (exit 0) on current main. CAVEAT — not yet fully DONE: enforcement is path-scoped with explicit exemptions (landing allowlist, `src/components/share`, `src/components/workshop/dashboard` full exemption, glass-sidebar radii), so "no raw Tailwind in ALL app code" is not globally proven; the `bg-blue-` grep is a manual spot-check, not part of the automated gate.)_ | Run `bun run lint:design-system` and verify 0 violations (currently passing). Manual spot-check: grep for `bg-blue-` in workshop components, must return 0 results. Confirm the exempted dirs are intentional before claiming DONE. | None | NICE TO HAVE |
| UX-11 | Custom error pages (404/500) | P1 | LEFT TO DO | Custom `not-found.tsx` and `error.tsx` pages exist that: (a) match the design system (SF Pro, 12px max, xs radius, neutral palette), (b) show clear recovery actions (go home, retry), (c) do not leak stack traces or internal paths. _(Code confirms still open: NO root `src/app/not-found.tsx`, NO root `src/app/error.tsx`, NO `src/app/global-error.tsx` — unmatched routes and root-layout errors fall back to the Next.js defaults. This is distinct from UX-12: per-segment workshop `error.tsx` boundaries do exist, but there is no global custom 404/500.)_ | Visit a non-existent workshop route (must render custom 404, not Next.js default). Trigger a deliberate render error in a workshop component (must render custom error page with retry button, not a blank white screen). | None | BLOCKS BETA |
| UX-12 | React error boundaries on workshop | P1 | IMPLEMENTED / NEEDS EVIDENCE | If any workshop component crashes during render, the error boundary catches it and shows an inline recovery UI. The rest of the page remains functional. A single component failure does not white-screen the entire app. _(Code: 7 route `error.tsx` boundaries under `src/app/workshop/**` — library, library/components, library/templates(+/[templateId]), projects/[projectId]/data, projects/[projectId]/estimates(+/[nodeId]) — backed by shared `src/components/workshop/WorkshopRouteErrorState.tsx` and tested by `tests/vitest/workshop-route-error-boundaries.test.tsx` (asserts secrets/stack/SQL/digest not leaked + retry UI renders). NOTE: coverage is partial — NO boundary on workshop home, projects list, settings(+subroutes), feedback, terms, onboarding, library overview leaf; and there is still no root `src/app/error.tsx`/`global-error.tsx`, so this remains "needs evidence" not DONE.)_ | Inject a `throw new Error("test")` into EstimateSheetContent render. Verify the error boundary shows an inline error card with a retry button. Verify other page sections (sidebar, header) remain interactive. Extend coverage to the uncovered routes above. | None | BLOCKS BETA |
| UX-13 | Mobile viewport guard on workshop | P2 | LEFT TO DO | Visiting any `/workshop/*` route on a viewport narrower than 768px shows a clear overlay: "Archestimator works best on desktop. Please open this page on a laptop or desktop computer." The overlay blocks interaction with the broken desktop layout. | Chrome DevTools device emulation: set to iPhone 12, navigate to `/workshop/projects`. Verify overlay appears, disables interaction, and shows clear desktop guidance. | None | BLOCKS BETA |
| UX-14 | Offline mutation queue persistence | P2 | LEFT TO DO | If a user edits an estimate row while offline, the mutation is queued and survives a browser reload. When connectivity returns, queued mutations are replayed in order. | Test: disconnect network, edit 3 row values, reload browser, reconnect network. Verify all 3 edits are applied and appear in the estimate sheet. Verify no data loss. | None | NICE TO HAVE |
| UX-15 | Font loading CLS elimination | P2 | LEFT TO DO | Lighthouse audit reports 0 Cumulative Layout Shift on public marketing pages. Fonts are preloaded via `@next/font` or hosted locally. No flash of unstyled text (FOUT). | Run Lighthouse on `/`, `/about`, `/features`, and `/pricing`. CLS score must be 0.00 for all four pages. | None | NICE TO HAVE |
| UX-16 | Account deletion UI (self-serve) | P1 | LEFT TO DO | Authenticated user can navigate to settings, find a "Delete Account" button, confirm deletion, and have all their data cascade-deleted (workspaces where they are sole owner, profile, auth user). | E2E test: create test user, sign in, trigger account deletion, verify user record is removed from `auth.users`, verify workspace/project data is deleted from database. | None | BLOCKS PUBLIC LAUNCH |
| UX-17 | Data export UI (DSAR self-serve) | P1 | LEFT TO DO | Authenticated user can navigate to settings, request a data export, and download a JSON/zip archive containing all their workspace data (projects, estimates, library items, activity history). | E2E test: create test user with seed data, trigger export, download archive, parse JSON, verify all expected records are present and well-formed. | None | BLOCKS PUBLIC LAUNCH |

---

### Gate 4: Reliability, Performance & Observability (PUBLIC LAUNCH)

**Gate Status:** `PARTIAL`
**Launch Blocker:** YES

**Definition of Done:** The application can be operated in production without guesswork. Production errors generate alerts within minutes. Logs are centralized. A full deployment pipeline exists. Staging and production are fully separated. Environment variables are validated at startup. Database migrations are validated in CI. Disaster recovery runbook exists and has been drilled. DNS/SSL/HTTPS is complete. Preview deployments are protected. Bundle sizes are monitored. Heavy modules use dynamic imports.

#### Checklist

| Ref ID | Item | Priority | Status | Acceptance Criteria | Validation Method | Dependency | Launch Decision |
|---|---|---|---|---|---|---|---|
| REL-01 | Production APM / error tracking (Sentry) | P0 | LEFT TO DO | Sentry (or equivalent) is installed and configured. Client-side and server-side unhandled exceptions are captured with stack traces. Source maps are uploaded during build. Alerts are configured for new error types. | Trigger a deliberate unhandled exception on staging. Verify the error appears in the Sentry dashboard within 5 minutes with a readable stack trace, request URL, and user context. | SEC-06 (staging Supabase), PRD-03 (Vercel CD) | BLOCKS BETA |
| REL-02 | Centralized log aggregation | P1 | LEFT TO DO | Server logs from Vercel serverless functions are shipped to a centralized log service (Logflare, Axiom, Better Stack, or equivalent). Logs are searchable by request ID, route, and severity. Logs persist beyond function instance lifetime. | Trigger a server-side `console.error` in a specific route. Search the log service for that error message. Verify it appears within 2 minutes with correct timestamp and request context. | REL-01 (APM tool choice may overlap) | BLOCKS BETA |
| REL-03 | Vercel deployment pipeline (CD) | P0 | LEFT TO DO | Push to `main` automatically builds and deploys to production Vercel URL. PR creation automatically builds and deploys to a preview URL. Deployment status is visible in GitHub PR checks. | Create a test PR with a trivial change. Verify Vercel deploys a preview URL. Merge to main. Verify production URL updates within 5 minutes. | None (setup task) | BLOCKS PUBLIC LAUNCH |
| REL-04 | Staging environment isolation | P0 | LEFT TO DO | Separate Vercel project (or environment) for staging. Staging uses its own Supabase project, its own Resend domain, and its own environment variable set. No staging action affects production data. | Verify staging Supabase URL differs from production. Verify staging Vercel URL differs from production. Create a test project in staging, confirm it does not appear in production. | REL-03 (Vercel CD), SEC-06 (staging Supabase) | BLOCKS PUBLIC LAUNCH |
| REL-05 | Environment variable audit per environment | P0 | PARTIAL | Complete inventory of all environment variables categorized by environment (local, staging, production). Each variable has a known source, format, and validation rule. No undocumented or untracked variables. | Produce a spreadsheet or table listing every env var, its environment scope, its source (Vercel dashboard, `.env.local`, etc.), and its validation rule. Must match `src/lib/supabase/server.ts` and all API route consumers. | None | BLOCKS PUBLIC LAUNCH |
| REL-06 | Environment variable startup validation | P1 | LEFT TO DO | Server startup (or first request handler) checks for presence and format of all required environment variables. Missing `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, or `DEEPSEEK_API_KEY` causes an immediate startup failure with a clear error message, not a silent runtime crash. | Deploy to staging with `SUPABASE_SERVICE_ROLE_KEY` intentionally unset. Verify the deploy fails or the first request returns a clear 500 error: "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY" | REL-05 (env var audit) | BLOCKS BETA |
| REL-07 | Preview deployment protection | P0 | LEFT TO DO | Vercel preview URLs are not publicly accessible. They require authentication (Vercel auth or Supabase auth) before any page renders. Search engines cannot index preview URLs. | Open a preview URL in an incognito browser window. Verify an auth gate appears before any app content loads. Verify `X-Robots-Tag: noindex` header is present. | REL-03 (Vercel CD) | BLOCKS PUBLIC LAUNCH |
| REL-08 | Database migration validation in CI | P1 | LEFT TO DO | CI pipeline spins up a clean Supabase Docker container, applies all migrations from `supabase/migrations/` in order, and verifies the schema builds without errors or constraint conflicts. | Run `bun run validate` in CI with a Supabase Docker service. Migration step must pass (exit code 0). Any migration that fails schema validation must fail CI. | None | BLOCKS BETA |
| REL-09 | Migration drift detection | P1 | LEFT TO DO | Automated check (or scheduled CI job) compares local migration files against the remote Supabase schema. Any drift generates an alert or fails the check. | Run `supabase db diff` in a scheduled CI job. If output is non-empty, job fails and notifies. | SEC-06 (staging Supabase) | NICE TO HAVE |
| REL-10 | E2E smoke test suite | P1 | PARTIAL | 7 Playwright specs exist for critical paths. All non-mutating specs pass in CI. Mutating specs pass when environment flags are set and staging Supabase is available. | Run `bun run test:e2e` against staging. Non-mutating specs must pass. Mutating specs (DnD, AI package-builder, invite entry, collaboration, shared link) must pass when their env flags and service-role keys are provided. | REL-04 (staging environment) | BLOCKS BETA |
| REL-11 | Bundle size monitoring | P1 | LEFT TO DO | No main bundle chunk exceeds 200KB gzipped. Bundle analyzer is integrated into CI or build step. Chunk size regressions are flagged. | Install `@next/bundle-analyzer`. Run build with analyzer enabled. Verify all chunks are under 200KB gzipped. Add to CI: if any chunk exceeds threshold, CI warns (P1) or fails (if >300KB). | None | BLOCKS BETA |
| REL-12 | Heavy module code splitting | P1 | LEFT TO DO | Three.js, ExcelJS, and D3 are loaded via `next/dynamic` with `ssr: false` where they are only needed client-side. These modules do not appear in the main bundle. | Run `bun run build` and inspect the bundle analyzer output. Three.js and ExcelJS must appear only in lazy-loaded chunks, not in the initial page load bundle. | REL-11 (bundle analyzer) | BLOCKS BETA |
| REL-13 | Domain, DNS, and SSL/TLS setup | P0 | LEFT TO DO | Production domain (e.g., archestimator.com) is registered. DNS records point to Vercel. SSL/TLS certificate is provisioned by Vercel and auto-renews. HTTPS is enforced with HSTS headers. | Visit `https://[production-domain]` in browser. Verify padlock icon, valid certificate, no mixed-content warnings. Verify HSTS header is present (`Strict-Transport-Security: max-age=31536000; includeSubDomains`). | None | BLOCKS PUBLIC LAUNCH |
| REL-14 | Disaster recovery runbook | P1 | LEFT TO DO | Documented procedure exists for: (a) restoring Supabase database from backup, (b) restoring Supabase storage from backup, (c) rolling back a migration, (d) recovering from a Vercel deploy failure. Runbook has been executed at least once in a drill. | Execute the runbook: restore production database backup to a local Docker Supabase instance. Verify all tables, data, and RLS policies are intact. Document any issues encountered and update the runbook. | SEC-06 (staging Supabase for drill safety) | BLOCKS BETA |
| REL-15 | Point-in-time recovery (PITR) configuration | P2 | LEFT TO DO | Supabase project has PITR enabled. Recovery window is configured (minimum 7 days). | Verify PITR status in Supabase dashboard: "Enabled" with a recovery window >= 7 days. | REL-13 (domain/plan upgrade may be needed) | NICE TO HAVE |

---

### Gate 5: Legal, Support, Deployment & Business Readiness (PUBLIC LAUNCH)

**Gate Status:** `PARTIAL`
**Launch Blocker:** YES

**Definition of Done:** The business can legally and operationally support real users. Reviewed and approved Privacy Notice and Terms of Service are published. Subprocessor list is disclosed. DSAR workflow exists. All public copy accurately describes implemented capabilities. AI copy describes scoped capabilities. At least 20 incident response runbooks are documented. Rollback procedure is drilled. Beta scope is defined. Launch jurisdiction is decided. Pricing and payment timeline is decided.

#### Checklist

| Ref ID | Item | Priority | Status | Acceptance Criteria | Validation Method | Dependency | Launch Decision |
|---|---|---|---|---|---|---|---|
| LEG-01 | Privacy Notice (reviewed and published) | P0 | OWNER DECISION REQUIRED | Final legal copy replaces the "pending review" stub at `/privacy`. Copy covers: data collection, processing purposes, third-party subprocessors (named), data retention periods, user rights (access, rectification, deletion, portability), cookie usage, and contact information. | Legal reviewer (Philip or engaged counsel) marks the page as `APPROVED`. Page is live at `/privacy` with no "pending review" language. | Owner decision to engage legal review | BLOCKS PUBLIC LAUNCH |
| LEG-02 | Terms of Service (reviewed and published) | P0 | OWNER DECISION REQUIRED | Final legal copy replaces the "pending review" stub at `/terms`. Copy covers: acceptance of terms, account responsibilities, acceptable use, intellectual property, payment terms (even if not yet active), limitation of liability, termination, governing law, and dispute resolution. | Legal reviewer (Philip or engaged counsel) marks the page as `APPROVED`. Page is live at `/terms` with no "pending review" language. | Owner decision to engage legal review | BLOCKS PUBLIC LAUNCH |
| LEG-03 | Subprocessor disclosure | P0 | LEFT TO DO | Published list of all third-party services that process user data, including: Supabase (database, auth, storage), Vercel (hosting, serverless functions), Resend (transactional email), any APM/logging tool chosen (Sentry, Logflare, etc.), and DeepSeek (AI provider). Each entry includes: service name, purpose, data processed, and location. | Subprocessor list is published at `/privacy#subprocessors` or a linked page. List matches all services in `package.json` and environment configuration. | LEG-01 (Privacy Notice) | BLOCKS PUBLIC LAUNCH |
| LEG-04 | DSAR delete workflow (self-serve) | P1 | LEFT TO DO | Authenticated user can self-serve delete their account via settings. Deletion cascades: removes auth user, profile, all owned workspaces, all workspace data. Confirmation step prevents accidental deletion. | E2E test: create test user with project/estimate/library data, trigger self-serve deletion, verify all database records for that user are removed. Verify the user can no longer authenticate. | UX-16 (account deletion UI) | BLOCKS PUBLIC LAUNCH |
| LEG-05 | DSAR export workflow (self-serve) | P1 | LEFT TO DO | Authenticated user can self-serve export all their data via settings. Export produces a downloadable JSON/zip archive containing all workspace data: projects, estimates, library items, activity history, and profile information. | E2E test: create test user with seed data, trigger export, verify archive downloads, verify all expected records are present in valid JSON format. | UX-17 (data export UI) | BLOCKS PUBLIC LAUNCH |
| LEG-06 | Public copy truthfulness audit | P1 | PARTIAL | Every claim on public-facing pages (landing, about, features, pricing) is verified against currently implemented, shipped code. No copy implies capabilities that are planned or incomplete. Specifically: (a) proposal export copy must distinguish mutable XLSX from future immutable snapshots, (b) AI copy must describe scoped Ask and confirmation-gated package-builder, not autonomous estimation, (c) pricing page must accurately reflect current state (free beta, no payment processing). | Manual page-by-page audit: read every sentence on `/`, `/about`, `/features`, `/pricing`. For each capability claim, verify it exists in the current codebase and passes tests. Record any discrepancies and fix the copy. | None | BLOCKS PUBLIC LAUNCH |
| LEG-07 | AI capability disclosure | P1 | DONE | No public copy, documentation, or in-app UI claims that the AI can: write autonomously, store conversations, retrieve past interactions, access the internet, or perform RAG. Ask Flip is described as read-only and account-aware. Package-builder is described as draft-and-confirm with explicit user approval required before any data is written. | Review all public pages, `AGENTS.md`, `.ai/` docs, and in-app AI UI copy. No phrase matches "autonomous", "self-learning", "remembers", "retrieves", or "conversation history" in connection with AI capabilities. Confirmed in code and docs. | None | BLOCKS PUBLIC LAUNCH |
| LEG-08 | Incident response runbooks (20 scenarios) | P1 | LEFT TO DO | Documented runbooks exist for at least 20 incident scenarios. Each runbook includes: scenario description, severity classification, detection method, immediate response steps, escalation path, communication template, and post-incident review checklist. Minimum scenarios: auth outage, database connection failure, deployment rollback, brute-force attack, data breach notification, storage access failure, email delivery failure, shared link token leak, RLS bypass detected, CSP bypass detected, Google OAuth outage, Supabase outage, Vercel outage, excessive API costs, accidental data deletion, malicious user, invite token abuse, package-builder misuse, SEO/crawl issue, and domain/SSL expiry. | Document exists at `.ai/01_roadmap/09-support-incident-rollback-runbooks.md` or equivalent. Contains at least 20 entries with all required sections. Philip approves runbook templates. | None | BLOCKS BETA |
| LEG-09 | Deployment rollback procedure (documented and drilled) | P0 | LEFT TO DO | Documented procedure: (a) identify a bad deploy, (b) revert to the previous known-good deployment via Vercel dashboard or CLI, (c) verify the revert is live, (d) communicate to affected users. Procedure has been executed at least once in a drill (intentionally deploy a bad version, then roll back). | Execute a rollback drill: deploy a version that renders a visible "THIS IS A DRILL" banner, verify it is live, then roll back to the previous deployment. Total time from rollback trigger to verified revert must be under 5 minutes. | REL-03 (Vercel CD) | BLOCKS PUBLIC LAUNCH |
| LEG-10 | Beta scope definition | P1 | DECIDED / APPROVED DEFAULT | Documented beta parameters: who is invited (5–8 known contractors, invite-only), what features are included/excluded, what limitations exist (no payment, no SLA, manual support only), how feedback is collected, what success criteria determine beta exit, and what the beta timeline is. | Document exists at `.ai/01_roadmap/12-beta-launch-feedback-loop.md` or equivalent. Philip approves the beta scope. | Owner decision | BLOCKS BETA |
| LEG-11 | Launch jurisdiction decision | P0 | OWNER DECISION REQUIRED | Philip decides and records: under which legal jurisdiction does Archestimator operate? This determines governing law for Terms of Service, data protection regulation applicability (GDPR, CCPA, etc.), and tax obligations. | Decision recorded in `.ai/10_state/decisions.md` with date and rationale. | Owner decision | BLOCKS PUBLIC LAUNCH |
| LEG-12 | Pricing and payment timeline decision | P2 | DECIDED / APPROVED DEFAULT | Philip decides and records: when will payment processing be introduced? What is the pricing model (subscription tiers, per-seat, usage-based)? What is the free tier scope during beta and after launch? Decision: no paid beta, free for design partners, payment post-beta. | Decision recorded in `.ai/10_state/decisions.md` with date and rationale. | Owner decision | NICE TO HAVE |
| LEG-13 | Support runbook templates | P1 | LEFT TO DO | Templates approved for: (a) how a support request is triaged, (b) how severity is determined, (c) response time targets per severity, (d) escalation path, (e) how resolved incidents are closed and documented. | Document exists with approved templates. Philip signs off on response time targets. | None | BLOCKS BETA |
| LEG-14 | Cookie consent audit trail | P2 | LEFT TO DO | Cookie consent records are stored in the database (not only in browser cookies). Each record includes: user identifier (if authenticated) or session identifier (if anonymous), consent version accepted, timestamp, and specific categories consented to. | Verify database table for consent records exists and has RLS enabled. Verify consent acceptance writes a record. Verify consent withdrawal updates the record. | None | NICE TO HAVE |

---

### Gate 6: Product Onboarding, Activation & UX Excellence (PUBLIC LAUNCH)

**Gate Status:** `PARTIAL`
**Launch Blocker:** BETA (blocks beta, not public launch directly)

**Definition of Done:** North star metric is selected and documented. Activation event is defined. Each persona has a journey map. Each major feature has a happy path, recovery path, and success metric. First-run onboarding gets the user to a meaningful outcome. Invite onboarding gets collaborators to the correct project/sheet without confusion. Client-recipient onboarding makes shared estimates understandable without training. Feature adoption is measured or at least instrumented. Beta feedback loop converts feedback into ranked roadmap decisions. At least one non-technical user can complete the core estimating loop without Philip.

#### Checklist

| Ref ID | Item | Priority | Status | Acceptance Criteria | Validation Method | Dependency | Launch Decision |
|---|---|---|---|---|---|---|---|
| PM-01 | North star metric | P0 | DECIDED / APPROVED DEFAULT | North star selected: "Weekly active workspaces with at least one estimate edit/export/share". 3 supporting metrics defined. | Philip approval. Documented in 15-product-management-operating-model.md. | — | BLOCKS BETA |
| PM-02 | Activation definition | P0 | DECIDED / APPROVED DEFAULT | Activation = workspace with 1+ project, 1+ estimate, 1+ row item. Instrumentation planned. | Philip approval. Documented in 15-product-management-operating-model.md. | PM-01 | BLOCKS BETA |
| PM-03 | Persona model | P0 | DRAFTED | 6 personas documented: owner-contractor, estimator, collaborator, client, supplier, Philip/admin. Each has goals, anxieties, JTBD, first-success moment. | Philip review of 17-personas-jobs-to-be-done.md. | — | BLOCKS BETA |
| PM-04 | Jobs-to-be-done | P0 | DRAFTED | Each persona has primary JTBD, trigger, current workaround, must-not-fail moments. | Philip review. | PM-03 | BLOCKS BETA |
| PM-05 | First-run onboarding journey | P0 | DRAFTED | 12-phase onboarding plan documented. Founder/contractor path: pre-login → auth → workspace → project → estimate → rows → cost confidence → export/share. | Philip review of 16-onboarding-activation-readiness.md. | PM-03 | BLOCKS BETA |
| PM-06 | Invite onboarding journey | P0 | IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN | Collaborator signed-out accept, signed-in accept, and wrong-account recovery have local route/UI coverage. Still required: Supabase Auth email/provider setup, invite env vars in the target environment, hosted template/confirmation proof, and real staging/provider proof. Local code-path evidence is not enough for beta. | Staging E2E pass with real Supabase/Auth email after provider proof. | SEC-04, SEC-06 | BLOCKS BETA |
| PM-07 | Client-recipient onboarding journey | P0 | IMPLEMENTED / NEEDS EVIDENCE | Shared receiver V2 + estimate view enhancement complete. Client comprehension test needed. | Non-technical user can understand estimate without training. | — | BLOCKS BETA |
| PM-08 | Returning-user reactivation journey | P1 | PARTIAL | Favorite shortcuts exist. Activity-based resumption not implemented. | User can resume active work within 10 seconds of login. | — | NICE TO HAVE |
| PM-09 | Feature happy-path matrices | P0 | DRAFTED | 20 journeys with step-by-step user actions, system responses, data flows, error alternates documented. | Philip review of 18-happy-path-user-journey-matrices.md. | PM-03 | BLOCKS BETA |
| PM-10 | Recovery-path matrices | P0 | PARTIAL | Error/recovery alternates documented in happy paths. Runbook templates exist. No user-validated recovery flows. | At least one user-observed recovery per critical flow. | PM-09, support runbooks | BLOCKS BETA |
| PM-11 | Usability research script | P1 | PLANNED | 14 task scripts with scenarios, success criteria, prompts, max times. Observation template. Post-session questions. | Research plan documented. At least one pilot session conducted. | PM-03, PM-05 | BLOCKS BETA |
| PM-12 | Beta feedback triage | P0 | DRAFTED | Weekly review cadence, severity rubric (1-4), feedback-to-roadmap process defined. | Philip approval of beta operating model. At least one weekly synthesis completed. | — | BLOCKS BETA |
| PM-13 | Feature prioritization model | P1 | DRAFTED | Impact/Effort matrix defined. Categories: Do now, Plan next, Maybe later, Avoid. | Applied to current backlog. Philip approval. | — | NICE TO HAVE |
| PM-14 | Product analytics event taxonomy | P1 | PLANNED / NEEDS INSTRUMENTATION | 20 features with activation/adoption/success/failure events defined. Analytics instrumentation planned. | Event taxonomy documented. At least north star metric instrumented. | PM-01, PM-02 | NICE TO HAVE |
| PM-15 | UX excellence scorecard | P1 | DRAFTED | 20 features scored across 17 dimensions (0-5). All scores need user validation. | Philip review. At least 3 features validated by user observation. | PM-09, PM-11 | NICE TO HAVE |

---

## Inter-Item Dependencies

| Dependent | Depends On | Nature |
|---|---|---|
| SEC-02 (table RLS audit) | SEC-01 (cross-workspace isolation tests) | SEC-02 uses SEC-01 test results as evidence |
| SEC-04 (invite token hardening) | SEC-06 (staging Supabase) | Requires staging environment for E2E |
| SEC-05 (shared link boundary) | SEC-10 (persistent rate limiting) | Lockout persistence requires durable storage (implemented via `security_rate_limit_events`) |
| SEC-07 (migration parity) | SEC-06 (staging Supabase) | Requires staging for safe diff |
| SEC-08 (Google OAuth verification) | LEG-01 (Privacy Notice), LEG-02 (Terms) | Google requires published legal pages |
| SEC-16 (RLS denial test suite) | SEC-06 (staging Supabase) | Requires CI-accessible Supabase instance |
| UX-01 (landing to login flow) | SEC-08 (OAuth verification) | Test users should not see warning screens |
| UX-02 (invite acceptance flow) | SEC-06 (staging Supabase) | Requires staging for E2E |
| LEG-03 (subprocessor disclosure) | LEG-01 (Privacy Notice) | Subprocessor list lives within or under Privacy Notice |
| LEG-04 (DSAR delete) | UX-16 (account deletion UI) | Legal workflow depends on UI implementation |
| LEG-05 (DSAR export) | UX-17 (data export UI) | Legal workflow depends on UI implementation |
| REL-04 (staging isolation) | REL-03 (Vercel CD), SEC-06 (staging Supabase) | Requires both Vercel and Supabase staging |
| REL-06 (env var validation) | REL-05 (env var audit) | Must know what to validate before building validation |
| REL-07 (preview protection) | REL-03 (Vercel CD) | Requires Vercel deployment pipeline |
| REL-10 (E2E smoke tests) | REL-04 (staging environment) | Mutating tests need staging |
| REL-12 (code splitting) | REL-11 (bundle analyzer) | Must measure before optimizing |
| REL-14 (DR runbook) | SEC-06 (staging Supabase) | Drill should use staging, not production |
| LEG-09 (rollback procedure) | REL-03 (Vercel CD) | Rollback requires deployment pipeline |
| SEC-14 (secrets scanning) | None | Independent CI addition |
| UX-13 (mobile guard) | None | Independent UI addition |
| REL-15 (PITR config) | REL-13 (domain setup) | May require Supabase plan upgrade |
| PM-02 (activation definition) | PM-01 (north star metric) | Activation builds on north star |
| PM-04 (JTBD) | PM-03 (persona model) | JTBD per persona requires personas first |
| PM-05 (first-run onboarding) | PM-03 (persona model) | Onboarding paths vary by persona |
| PM-09 (happy-path matrices) | PM-03 (persona model) | Journeys reference personas |
| PM-10 (recovery-path matrices) | PM-09 (happy-path matrices), support runbooks | Recovery alternates from happy paths |
| PM-11 (usability research) | PM-03 (persona model), PM-05 (onboarding) | Research targets persona-based onboarding |
| PM-14 (analytics taxonomy) | PM-01 (north star), PM-02 (activation) | Analytics events derive from metrics |
| PM-15 (UX scorecard) | PM-09 (happy paths), PM-11 (usability) | Scoring requires journey + research data |

---

## Quick Reference: What Blocks What

### Blocks Beta (count UNKNOWN / NEEDS ROADMAP AUDIT)
SEC-06, SEC-10, SEC-13, SEC-14, UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-11, UX-12, UX-13, LEG-08, LEG-10, LEG-13, REL-01, REL-02, REL-06, REL-08, REL-10, REL-11, REL-12, REL-14, PM-01, PM-02, PM-03, PM-04, PM-05, PM-06, PM-07, PM-08, PM-09, PM-10, PM-11, PM-12

### Blocks Enterprise MVP (12 items)
PDF package, immutable snapshots, feature flags, rate limiting + Turnstile hardening, performance budgets, APM/logging/alerts, backup posture, public claims audit, stronger share receiver, accessibility baseline, support runbooks drilled, @firecms/neat replacement

### Blocks Public Launch (count UNKNOWN / NEEDS ROADMAP AUDIT)
SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-07, SEC-08, SEC-09, SEC-11, SEC-12, SEC-16, UX-09, UX-16, UX-17, LEG-01, LEG-02, LEG-03, LEG-06, LEG-07, LEG-09, LEG-11, REL-03, REL-04, REL-05, REL-07, REL-13

### Nice to Have (10 items)
SEC-15, UX-10, UX-14, UX-15, LEG-14, REL-09, REL-15, PM-13, PM-14, PM-15

### Decisions Resolved (21 of 32)
All 21 owner decisions resolved on 2026-05-30 (see `14-owner-decisions.md`). Remaining 11 decisions are public-launch only or deferred.

---

*Generated from the roadmap README dashboard, production-readiness audit, action plan, and status tracker. All items are traceable to source documents in `.ai/01_roadmap/`. Updated with three-gate structure and 2026-05-30 owner decisions pass.*
