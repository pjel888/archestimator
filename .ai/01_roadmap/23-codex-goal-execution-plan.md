# Codex /goal Execution Plan

**Last updated:** 2026-05-30
**Purpose:** The single document that tells Codex how to use the roadmap. This is the most important document in the roadmap.

## Execution Philosophy

1. **One goal at a time.** Codex must NOT implement the entire roadmap in one goal. Pick ONE bounded goal card from 26-codex-goal-cards.md.
2. **Every goal produces evidence.** No evidence = not done. Evidence saved per 28-evidence-artifact-index.md.
3. **Every goal preserves performance.** Must not regress route transitions, sheet editing latency, or bundle size. Check 27-performance-budget-and-regression-gates.md.
4. **Every goal preserves design-system rules.** SF Pro only, 12px max font, xs-only border radius, zero letter-spacing, neutral palette only, Phosphor icons only. Run `bun run lint:design-system` after changes.
5. **Every goal updates roadmap status.** After implementation, update 00-production-readiness-dashboard.md status.
6. **Every goal stops at owner decisions.** If a card says OWNER DECISION REQUIRED, Codex must NOT implement. Report the block and move to next unblocked card.
7. **Implementation agents must not run external service commands** (Supabase project creation, Vercel project creation, domain configuration, DNS changes, third-party service signup) unless explicitly authorized later. Agents may prepare configuration files, instructions, and checklists, but must not execute provisioning commands.

## How to Use This Plan

**For Philip:**
1. Owner defaults are already codified (see `29-enterprise-mvp-scope-and-owner-defaults.md`). No further decisions block implementation.
2. Start with Wave 1 (environment/staging foundation)
3. Proceed wave by wave, in order
4. For each wave, pick one goal card from 26-codex-goal-cards.md
5. Run Codex `/goal` with that single card
6. Verify evidence produced
7. Update dashboard status
8. Move to next goal card

**For Codex:**
1. Read this document first
2. Check which wave is active
3. Find the next READY FOR CODEX card in 26-codex-goal-cards.md
4. Run ONLY that card
5. Produce evidence artifacts
6. Report completion with evidence paths
7. Do NOT proceed to next card — wait for Philip

---

## Wave 0 — Owner Defaults Codified

**Objective:** Eliminate decision bottleneck before implementation begins.
**Status:** **COMPLETE** — decisions codified in `29-enterprise-mvp-scope-and-owner-defaults.md`.

**What was resolved:**
1. Beta scope: 3-5 known contractors, invite-only
2. Staging Supabase: Yes, separate project
3. PDF before beta: No, enterprise MVP
4. Rate limiting: Persistent/durable required for beta (BETA P0)
5. CAPTCHA: Deferred to BETA P1 (Turnstile if rate limiting first)
6. Analytics: Minimal first-party north star events only
7. Support channel: support@ email
8. Mobile workshop: Desktop guard only for beta
9. Package-builder: Optional, confirmation-gated
10. Legal before beta: Written limitation disclosure
11. Immutable proposals: Enterprise MVP, not beta
12. Enterprise MVP scope: Defined and gated separately from beta

**Success criteria:** All owner decisions recorded. No further owner input required to begin implementation.

**Validation:** Philip has reviewed and signed off on `29-enterprise-mvp-scope-and-owner-defaults.md`.

**Performance gates:** N/A (docs only)

**Security gates:** N/A (docs only)

**UX gates:** N/A (docs only)

**Explicit non-goals:** Implementing anything, running commands, modifying source code, creating infrastructure.

---

## Wave 1 — Environment & Staging Foundation

**Objective:** Create a safe, isolated environment where all subsequent evidence can be gathered.
**Why now:** Security tests (Wave 2) need a staging Supabase to run against. No safe environment = no safe way to prove tenant isolation. This MUST come before security test execution.
**Prerequisites:** Wave 0 complete (owner defaults codified)

**Goal cards:** BETA-P0-INF-001

**Success criteria:**
- Staging Supabase project created, separate from dev (different URL, different service-role key)
- Staging Vercel preview configured and deployable
- Preview protection active (auth-gated or equivalent)
- Environment variable inventory complete across local / staging / (future) production
- Staging confirmed reachable and functional (smoke test passes)

**Validation commands:**
```bash
# Verify staging Supabase URL differs from production
# Verify staging Vercel URL differs from production
# Run smoke test against staging: key routes return 200
# Verify env var table complete per environment
```

**Performance gates:** Staging environment should mirror production for realistic performance testing.

**Security gates:** Staging must use separate service-role keys. Preview deployments must not be publicly accessible. Staging must not share any credentials with dev or production.

**UX gates:** N/A (infrastructure work)

**Owner decisions required:** None (all resolved in Wave 0)

**Explicit non-goals:** Production CD pipeline (Wave 8), multi-region deployment (POST-MVP), complex monitoring dashboards, PITR configuration (ENTERPRISE MVP). Agents must NOT run `supabase project create` or `vercel project add` commands — prepare instructions for Philip to execute.

---

## Wave 2 — Security Evidence Foundation

**Objective:** Prove tenant isolation, data boundaries, and auth safety before any external user touches the system.
**Why now:** Staging exists (Wave 1). Now prove RLS/storage/auth boundaries with real tests against staging. Security evidence is the highest-leverage work before beta.
**Prerequisites:** Wave 1 (staging environment for test execution)

**Goal cards:** BETA-P0-SEC-001, BETA-P0-SEC-002, BETA-P0-SEC-003, BETA-P0-SEC-004, BETA-P0-SEC-005

**Success criteria:**
- RLS denial test suite passes against staging for all user-data tables
- Storage denial test suite passes (cross-workspace access blocked)
- API/server-action authorization audit complete with no bypasses found
- Secrets scanning active in CI (blocks credential commits)
- Service-role key verified never in client bundle
- Persistent rate limiting or equivalent durable protection verified (survives restart, enforces lockout)

**Validation commands:**
```bash
bun run test tests/integration/rls-isolation.test.ts  # must pass against staging
bun run test tests/integration/storage-isolation.test.ts  # must pass against staging
# API auth audit: manual review of all src/app/api/ routes
# Secrets scanning: push commit with fake key, CI must fail
# Rate limiting: restart + verify lockout state persists
```

**Performance gates:** Test suite must run in under 5 minutes. Must not slow CI pipeline.

**Security gates:** ALL security tests must pass. Zero bypasses tolerated. Any RLS gap found must be reported as BLOCKER. Rate limiting must survive process restart.

**UX gates:** N/A (backend security work)

**Owner decisions required:** None (all resolved in Wave 0)

**Explicit non-goals:** Fixing every RLS policy gap (report only), penetration testing, implementing new auth features, modifying RLS policies without test coverage first. Agents may run tests against staging Supabase but must not modify staging infrastructure.

---

## Wave 3 — Observability & Performance Foundation

**Objective:** Establish error visibility and baseline performance before beta users report issues.
**Why now:** Security evidence exists (Wave 2). Now wire observability and performance baselines so beta issues are detectable, not invisible.
**Prerequisites:** Wave 1 (staging environment), Wave 2 (security evidence foundation)

**Goal cards:** BETA-P0-OBS-001, BETA-P0-ANA-001, BETA-P0-PERF-001, BETA-P0-PERF-002

**Success criteria:**
- Sentry (or equivalent) configured capturing client + server errors from staging with source maps
- Basic log visibility path exists (Vercel logs or log drain)
- Bundle analyzer integrated and baseline established
- Heavy modules (ExcelJS, D3, Three.js) dynamically imported via `next/dynamic`
- Route transition benchmarks established for all workshop routes
- Estimate sheet large-row benchmark established (>100 rows)
- Tree render benchmark (500 nodes) established
- XLSX export benchmark (100 rows) established
- Share receiver FMP benchmark established
- AI timeout/degraded-state behavior validated

**Validation commands:**
```bash
bun run build  # inspect bundle analyzer output
# Trigger deliberate error in staging, verify it appears in Sentry dashboard
# Lighthouse on key routes
```

**Performance gates (beta targets):**

| Metric | Beta Target | Public Launch Target |
|--------|------------|---------------------|
| Route transitions | < 200ms acceptable, < 100ms target | < 100ms |
| Estimate row edit latency | < 200ms | < 100ms |
| Tree render (500 nodes) | < 1s | < 500ms |
| Share receiver FMP | < 2s | < 1.5s |
| AI timeout UI | Clear by 30s | Clear by 30s |
| Main bundle chunk | < 200KB gzipped | < 150KB gzipped |
| Total JS bundle | < 500KB gzipped | < 400KB gzipped |

**Security gates:** Error pages must not leak stack traces or internal paths. Sentry must sanitize PII in error reports.

**UX gates:** N/A (infrastructure and benchmarking work)

**Owner decisions required:** None (all resolved in Wave 0)

**Explicit non-goals:** Achieving all public-launch performance targets, implementing complex caching, offline mutation queue, circuit breakers. Agents may configure Sentry project settings but must not create the Sentry account — prepare instructions for Philip.

---

## Wave 4 — Core UX & Onboarding Activation

**Objective:** Make first users reach value without confusion or external help.
**Why now:** Security proven (Wave 2), observability wired (Wave 3). Now the product must be usable and the first-value path must work.
**Prerequisites:** Wave 1 (staging), Wave 2 (security evidence), Wave 3 (error boundaries and performance baselines)

**Goal cards:** BETA-P0-UX-001, BETA-P0-UX-002, BETA-P0-UX-004, BETA-P0-REL-001

**Success criteria:**
- First-run onboarding path guides user from login to first estimate with visible cost
- Empty-state CTAs exist on all blank surfaces (workshop, project, estimate, library)
- Login → project → estimate → rows → cost visible is a smooth, guided path
- Invite onboarding: collaborator signed-out accept, signed-in accept, wrong-account recovery
- Desktop guard overlay active at <768px viewport with clear message
- Design-system consistency: `bun run lint:design-system` passes on all workshop routes
- Error boundaries on all workshop-level components (estimate sheet, tree, AI panel, charts)
- Custom `not-found.tsx` for workshop routes using design system
- Custom `error.tsx` with retry button using design system

**Validation commands:**
```bash
bun run lint:design-system  # must pass
# Manual: new user test - can they create estimate without guidance?
# Manual: invite test - does collaborator land on correct project?
# Manual: resize browser to <768px on /workshop → desktop guard overlay
# Manual: visit /workshop/nonexistent → custom 404
```

**Performance gates:** Must not regress route transitions, sheet editing latency, or bundle size. Loading states must use design-system Skeleton. Onboarding path must not add bundle weight to authenticated routes.

**Security gates:** All new onboarding paths must respect auth boundaries. Unauthenticated users must not reach workshop routes.

**UX gates:** Every empty state has a clear CTA. Every loading state uses Skeleton. Error states show recovery path. Success states are subtle but present. Font: SF Pro only, 12px max in app, xs radius only, zero letter-spacing, neutral palette.

**Owner decisions required:** None (all resolved in Wave 0)

**Explicit non-goals:** Product-led self-serve onboarding for public launch (Wave 8), full accessibility audit (BETA P1), mobile workshop editing (ENTERPRISE MVP), PDF export (ENTERPRISE MVP), tooltip tours and progressive disclosure (Wave 8).

---

## Wave 5 — Share / Export / AI Validation

**Objective:** Prove external-facing and AI flows are safe, understandable, and truthful.
**Why now:** Core UX works (Wave 4). Now validate that external clients understand shared estimates and that AI features are safe and clearly scoped.
**Prerequisites:** Wave 1 (staging), Wave 2 (security evidence for shared links and AI auth), Wave 4 (UX polish)

**Goal cards:** BETA-P0-UX-003, BETA-P0-AI-001

**Success criteria:**
- Shared link receiver: non-technical user can view estimate, navigate tabs, leave comment without guidance
- Password-gated share: lockout works, evidence captured
- Comments/decisions/activity: all work in shared receiver
- XLSX export: downloads valid file for 50/200/500 row estimates
- AI Ask: user understands it's read-only, scoped to workspace
- AI Package-builder: user understands confirmation-gated flow
- Public claims audit: no claim on landing/about/features/pricing pages implies unshipped capability
- AI safety: no cross-workspace leakage, no autonomous writes

**Validation commands:**
```bash
bun run test:e2e  # shared link specs must pass
# Manual: non-technical user shared-link comprehension test
# Manual: AI Ask - ask about another workspace's data (must fail)
# Manual: Package-builder - generate draft, verify confirmation required
```

**Performance gates:**

| Metric | Target |
|--------|--------|
| Share receiver FMP | < 2s |
| XLSX 100 rows | < 3s |
| XLSX 500 rows | < 10s |
| AI timeout | clear UI by 30s |

**Security gates:** Shared link tokens must not be enumerable. AI must not access other workspaces. Package-builder must require explicit confirmation before writing data. AI provider correctly identified as DeepSeek.

**UX gates:** AI features must have clear disclaimers. Shared receiver must be understandable by non-technical users. Public claims must be audited for truthfulness.

**Owner decisions required:** None (all resolved in Wave 0)

**Explicit non-goals:** PDF export (ENTERPRISE MVP), immutable proposals (ENTERPRISE MVP), AI conversation history (POST-MVP), vector/RAG/embeddings (DEFERRED), autonomous AI mutations (NEVER).

---

## Wave 6 — Enterprise MVP Features

**Objective:** Ship the features that distinguish enterprise-ready product from beta prototype.
**Why now:** Beta-validated UX (Wave 4), external flows proven (Wave 5). Now build the enterprise features that customers expect in a paid product.
**Prerequisites:** Waves 1-5 complete with evidence

**Goal cards:** ENTERPRISE-P1-PROD-001, ENTERPRISE-P1-PROD-002, ENTERPRISE-P1-LEGAL-001, ENTERPRISE-P1-SEC-001, ENTERPRISE-P1-UX-001

**Success criteria:**
- PDF package workflow: generate styled PDF proposal from estimate tree
- Immutable issued snapshots: versioned, immutable snapshots with issuance workflow
- Public-ready legal review: counsel-reviewed ToS, Privacy Notice, subprocessor list published
- Strict CSP on workshop routes: enforced, not just Report-Only
- Feature flags: operational with at least 3 flags for controlled rollout
- Accessibility baseline: aXe/WAVE audit pass on all workshop routes
- Self-serve DSAR/export/delete: user-facing flows operational
- Full restore drill/PITR: documented and verified
- Full browser matrix: Chrome, Safari, Firefox, Edge passing smoke tests
- Full mobile editing: responsive estimate editing on mobile viewports

**Validation commands:**
```bash
bun run test:e2e  # enterprise feature specs must pass
# Manual: PDF export generates valid, well-formatted proposal
# Manual: snapshot created, retrieved, verified immutable
# Manual: CSP headers verified strict on all workshop routes
# Manual: aXe/WAVE audit on all workshop routes
# Manual: DSAR export produces complete user data
# Manual: full browser matrix smoke tests pass
# Manual: mobile editing on 375px and 768px viewports
```

**Performance gates:** PDF generation must not block UI. XLSX export benchmarks from Wave 3 must be maintained. Mobile editing must meet same row-edit latency targets as desktop.

**Security gates:** Strict CSP must have zero violations on workshop routes. DSAR export must be auth-gated. Feature flags must not leak feature state to unauthorized users.

**UX gates:** PDF output must be professionally styled. Snapshot UI must clearly communicate immutability. DSAR flows must be discoverable and understandable.

**Owner decisions required:** None (all resolved in Wave 0)

**Explicit non-goals:** Billing/payment integration (Wave 8), admin dashboard (Wave 8), enterprise SSO (POST-MVP), i18n (POST-MVP).

---

## Wave 7 — Controlled Beta Go/No-Go

**Objective:** Decide if design-partner beta can start.
**Why now:** Core implementation waves complete (Waves 1-5). Time for the hard decision.
**Prerequisites:** Waves 1-5 complete with evidence (Wave 6 enterprise features are NOT prerequisites for beta)

**Goal cards:** BETA-P0-BETA-001, BETA-P0-OPS-001, BETA-P0-LEGAL-001

**Success criteria:**
- Beta checklist: all BETA P0 items marked DONE with evidence
- Risk acceptance register: Philip signs off on accepted BETA P1 risks
- Beta partner list: 3-5 named design partners committed
- Beta kickoff script: 30-min facilitated session outline written
- Support runbooks: 4 critical templates drilled (auth outage, data leak, bad deploy, invite failure)
- Known limitations disclosure: published and ready to share with beta users
- Feedback intake workflow: defined (how users report issues, how Philip triages)
- Weekly review ritual: template ready (see PM operating model)
- Support email (support@) configured with auto-responder
- Philip signs off: "go for controlled beta"

**Validation:** Philip reviews all Wave 1-5 evidence artifacts. Philip signs beta approval.

**Performance gates:** All beta performance targets met (see Wave 3 + Wave 5 targets).

**Security gates:** All BETA P0 security evidence complete. Zero known critical/High vulnerabilities.

**UX gates:** Core happy path validated by at least one non-technical user.

**Owner decisions required:** Philip beta signoff (all other decisions resolved in Wave 0)

**Explicit non-goals:** Public launch, open signup, payment processing, marketing website update. Enterprise MVP features (Wave 6) are not blockers for beta.

---

## Wave 8 — Public / Paid Launch Hardening

**Objective:** Harden for public traffic, paid tiers, and open signup.
**Why now:** Beta validated (Wave 7). Enterprise features shipped (Wave 6). Now scale to public.
**Prerequisites:** All Waves 0-7 complete, beta learnings incorporated

**Goal cards:** PUBLIC-P0-LEGAL-001, PUBLIC-P0-INF-001, PUBLIC-P0-SEC-001, PUBLIC-P0-OPS-001

**Success criteria:**
- Final Privacy Notice published (counsel-reviewed)
- Final Terms of Service published (counsel-reviewed)
- Subprocessor list published
- Launch jurisdiction decision recorded
- Public OAuth verification complete (Google Cloud Console verified status)
- Redis-backed persistent rate limiting at scale
- Production CI/CD pipeline operational
- Domain/DNS/HTTPS configured
- Rollback drilled and verified
- All major runbooks drilled
- Public accessibility baseline (WCAG 2.1 AA) proven
- Full validation matrix passing
- Performance budgets proven at public-launch targets
- Public claims audit: zero unsubstantiated claims
- Public support path scaled
- Billing/payment integration (Stripe or equivalent)
- Admin panel operational
- Legal/compliance signoff from counsel

**Validation commands:**
```bash
bun run test:e2e  # all specs must pass
bun run test:dom  # all DOM tests pass
bun run validate  # type-check + lint + design-system + unit + dom
# Manual: payment flow end-to-end (test mode)
# Manual: rollback drill documented and verified
```

**Performance gates:** All public-launch targets met (see Wave 3 targets table).

**Security gates:** Strict CSP enforced, OAuth verified, rate limiting at scale, all runbooks drilled.

**UX gates:** Full accessibility baseline, mobile editing, public support path.

**Owner decisions required:** Philip launch signoff

**Explicit non-goals:** Multi-region deployment (POST-MVP), enterprise SSO (POST-MVP), i18n (POST-MVP).

---

## What Codex Must NEVER Do

1. Run a broad `/goal` against the whole roadmap — always one card at a time
2. Skip evidence production — no evidence = not done
3. Modify source code outside the goal card's scope
4. Make owner decisions — report the block, do not proceed
5. Deploy to production without Philip approval
6. Change Supabase/RLS policies without corresponding denial tests
7. Add new npm dependencies without bundle-impact analysis
8. Remove or disable design-system linting
9. Modify AGENTS.md without Philip approval
10. Claim "DONE" without evidence artifact paths
11. Run external service provisioning commands (supabase project create, vercel project add, sentry account creation, DNS changes, Stripe setup) unless explicitly authorized by Philip — prepare instructions and checklists instead
12. Execute Wave 2 security tests before Wave 1 staging environment is confirmed operational
13. Skip waves — dependencies are strict, staging must exist before security tests can run against it
14. Treat enterprise MVP features (Wave 6) as beta blockers — beta go/no-go (Wave 7) depends on Waves 1-5 only

## Wave Dependency Graph

```
Wave 0 (owner defaults) ← DONE — decisions codified
    ↓
Wave 1 (environment/staging) ← depends on Wave 0
    ↓
Wave 2 (security evidence) ← depends on Wave 1 (needs staging to test against)
    ↓
Wave 3 (observability + performance) ← depends on Waves 1, 2
    ↓
Wave 4 (core UX + onboarding) ← depends on Waves 1, 2, 3
    ↓
Wave 5 (share/export/AI validation) ← depends on Waves 1, 2, 4
    ↓
    ├─→ Wave 6 (enterprise MVP features) ← depends on Waves 1-5 (beta validated)
    │       ↓
    │   Wave 8 (public/paid launch) ← depends on Waves 6, 7
    │
    └─→ Wave 7 (beta go/no-go) ← depends on Waves 1-5 only (NOT Wave 6)
            ↓
        Wave 8 (public/paid launch) ← depends on Waves 6, 7
```

**Key dependency rules:**
- Wave 1 (staging) MUST complete before Wave 2 (security tests) — tests need a safe Supabase to run against
- Wave 7 (beta go/no-go) depends on Waves 1-5 only — enterprise MVP features (Wave 6) are NOT required for beta
- Wave 8 (public launch) depends on both Wave 6 (enterprise features) AND Wave 7 (beta validation)

## Recommended First Action

**Start with Wave 1: BETA-P0-INF-001.** Owner defaults are already codified (Wave 0 is DONE — see `29-enterprise-mvp-scope-and-owner-defaults.md`). Staging/environment foundation is the first implementation work. Codex should prepare the staging plan and configuration, produce instructions for Philip to execute the provisioning commands, and verify the staging environment is operational.

## Post-Launch (not yet planned)

After public launch, additional work will be planned based on:
- Beta and enterprise customer feedback
- Performance data from real usage
- Feature requests and market signals
- POST-MVP deferred items

These will be planned AFTER public launch, not before.

## Critical Sequencing Note

Security tests (Wave 2) require either:
1. A staging Supabase project (preferred — isolates test traffic from dev data), OR
2. A safe local Supabase harness with identical RLS/storage configuration.

Staging setup (Wave 1) comes BEFORE RLS/storage test execution (Wave 2) — this ordering is intentional and must not be reversed. Running denial tests against the dev Supabase project risks corrupting development data and does not prove staging/production safety.
