# Proposals Page Audit (2026-07-12)

> **Archived unresolved by owner direction.** This historical pack retains the
> high-blast-radius `/workshop/proposals` audit and implementation plan, but is
> no longer an active execution authority. See `ARCHIVE-DISPOSITION.md` for the
> preserved open work.
>
> The predecessor is preserved at
> `.ai/09_archive/store/2026-07-11-Proposals-Feature-superseded/`. Its
> requirements are dispositioned in `11-ABSORBED-2026-07-11-REQUIREMENTS.md`;
> no implementation has been claimed or discarded.

## Outcome (what this pack delivers)

A comprehensive, evidence-grounded audit of the `/workshop/proposals` recipient
inbox page that:

1. **Maps every moving part** — route, server/client boundary, component tree,
   data/repository layer, D1 SQL + schema, server actions, Cloudflare bindings,
   auth/perf/observability, caching/revalidation.
2. **Classifies the page against project intent** — spec
   (`06_specs/proposal-package-system.md`), roadmap (beta = XLSX + shared link +
   recipient inbox; immutable/PDF = Enterprise P1), and the owner directive
   ("the proposals page should look like the projects page").
3. **Registers concrete bugs and risks** with severity, file:line evidence, and a
   recommended fix-forward surface — without authorizing any change here.
4. **States readiness** for first users honestly: what works, what is stale, what
   is broken, what is deferred.

This is a planning artifact only. Per the **User Test Authorization Gate**, no
tests/builds/browser automation were run or authorized for this task. All
evidence is source inspection (`rg`, targeted reads) and `.ai` doc
cross-reference.

## Canonical artifacts in this pack

| Artifact | Role | Purpose |
|---|---|---|
| `README.md` (this file) | entrypoint | Outcome, scope, status, and resume pointer |
| `01-CURRENT-STATE-MAP.md` | audit | Full component/data/server/authz/perf/cloudflare map with file:line refs |
| `02-BUG-AND-RISK-REGISTER.md` | audit | Every defect/risk found (**31: 0×P0 [P0-1 downgraded to P2 round 11], 7×P1, 17×P2, 7×P3**), severity, evidence, recommended surface |
| `03-READINESS-AND-RECOMMENDATIONS.md` | audit | Beta readiness verdict, prioritized recommendations, relationship to the active pack |
| `04-PROJECTS-PAGE-PARITY-GAP-ANALYSIS.md` | design | Feature-by-feature projects-vs-proposals gap; exact primitives/patterns to reuse |
| `05-TARGET-DESIGN-AND-IMPLEMENTATION-DAG.md` | execution DAG | Canonical dependency-ordered units (data hardening + redesign) |
| `06-DECISION-LOG.md` | decisions | Current decisions governing implementation |
| `07-BASELINE-CRITERION-MATRIX.md` | audit | PASS/FAIL/BOUNDARY/N/A snapshot across all Improve-prompt dimensions |
| `08-DOMAIN-AND-INDUSTRY-REQUIREMENTS.md` | research | Construction/RFP/e-sign industry norms (RICS NRM, ESIGN/UETA/eIDAS, RA 8792) vs current code |
| `09-PRIVACY-AND-COMPLIANCE-AUDIT.md` | audit | PII inventory, right-to-be-forgotten, retention, residency, log-leak paths |
| `10-TECHNICAL-DEEP-AUDIT.md` | audit | Bundle, prod monitoring, analytics, mobile, abuse/enumeration, cross-surface, variants |
| `12-ADVERSARIAL-PASS.md` | audit | Round-3 adversarial review (12 hypotheses) + round-4 BOUNDARY closures (cron statically traced, i18n decided, D1 region verified at APAC); convergence verdict |
| `13-NON-STATIC-GAPS-AND-ESCALATION.md` | handoff | The 4 tracks static audit cannot close (browser/UX, legal/counsel, provider delivery, domain/SME) — owner decision: bar is genuinely higher than static |
| `14-UX-HEURISTIC-EVALUATION.md` | ux | Track 1 (non-browser half): Nielsen + WCAG + recipient-job heuristic evaluation; 6 prioritized UX recommendations; 5 `NEEDS-RUNTIME` items feeding the `TEST_TASK` slice |
| `15-COUNSEL-BRIEF-AND-DELIVERY-PLANS.md` | handoff | Track 2 (6-question counsel brief), Track 3 (email delivery test procedure), Track 4 (8-point QS/domain checklist) — route-ready artifacts |
| `16-TRACEABILITY-AND-CONSISTENCY-AUDIT.md` | quality | Round-6 internal consistency proof: every bug→unit→slice mapped (zero orphans), every ID cross-ref resolves, `file:line` citations verified against current source |
| `17-OWASP-AND-SECURITY-HEADERS-AUDIT.md` | security | Round-7 OWASP Top 10 (2021) + security-headers scorecard; CSP Report-Only gap (P2-17), no Permissions-Policy (P3-11), A06 scan gap (P3-12) |
| `18-PERFORMANCE-AND-DEPENDENCY-AUDIT.md` | perf/deps | Round-9 perf-budget coverage + `bun audit` (OWASP A06 **CLOSED clean**); route missing from budget table (P2-18), no route-segment config (P3-13), no bundle CI budget (P3-14) |
| `19-AUTH-BYPASS-VERIFICATION-AND-FRAMEWORK-COVERAGE.md` | security | Round-10: auth-bypass via middleware trust headers **VERIFIED SECURE** (strip-set-compare chain); full framework-coverage enumeration (all authorization-free frameworks checked) |
| `20-EMAIL-DNS-FIX-PLAYBOOK.md` | fix playbook | **Copy-paste-ready P0-1 fix**: root cause (no active CF zone → Email Sending un-onboarded), Option A (migrate DNS) vs B (stay Namecheap + Resend), exact DNS/CLI/verification steps |
| `11-ABSORBED-2026-07-11-REQUIREMENTS.md` | merge receipt | Full predecessor-unit disposition and V1 deferrals |
| `IMPLEMENTATION_PLAN.md` | execution contract | Ordered implementation slices, proof boundaries, and stop condition |
| `LOOP_LEDGER.md` | execution state | Initial NOT_STARTED ledger and merge evidence |
| `plan-pack.json` | manifest | **Machine-validated** schema manifest (`bun run validate:plan-pack` passes); status tuple `CONDITIONALLY_READY / NOT_STARTED / BOUNDARY / ACTIVE` |

This pack carries a **schema-valid `plan-pack.json`** (round-6 addition): `bun run
validate:plan-pack -- .ai/03_plans/2026-07-12/Proposals-Page-Audit` passes.
Status tuple: `package_status: CONDITIONALLY_READY / implementation_status:
NOT_STARTED / release_status: BOUNDARY / terminal_status: ACTIVE`. UNIT-001
(Slice 1, A1+A2) is READY and is the `next_unit`; the full 100%-quality bar is
BOUNDARY on AUTH-001 (the non-static tracks in `13`). `IMPLEMENTATION_PLAN.md`,
`05`, and the ledger remain the human-readable execution control surfaces.

## Scope

### In scope

- `/workshop/proposals` route: `src/app/workshop/proposals/{page,proposals-data,loading,error}.tsx`.
- Client tree: `src/components/workshop/proposals-page-client.tsx`,
  `src/components/workshop/proposals-page/*`, shared workshop chrome
  (`WorkshopRouteHeader`, `WorkshopCanvasWash`, `WorkshopRouteErrorState`).
- Data layer: `src/lib/repositories/recipient-proposals-repository.ts`,
  `src/lib/recipient-proposals/actions.ts`, `src/lib/cloudflare/d1.ts`.
- Server actions reached from the inbox: `openRecipientProposalAction` in
  `src/lib/publication/actions.ts`.
- Revalidation/caching that refreshes the inbox.
- D1 schema for the publication/shared-link tables (`migrations/0014`,
  `migrations/0066`).
- Auth/perf/observability wiring the page depends on.
- Cloudflare bindings (D1 `ARCH_DB`, Email `EMAIL`, R2 `ARCH_UPLOADS_R2`) as they
  relate to the proposals surface.
- Relationship to the XLSX export route and the `/share/[token]` recipient surface
  (the two things the inbox links into).

### Non-goals

- Implementing any fix in this planning merge.
- Re-planning the owner-side publisher or `/share/[token]` redesign (already
  ACHIEVED in `.ai/09_archive/store/2026-07-11-Publisher-And-Shared-Pages-complete/`).
- Designing immutable snapshots or PDF (Enterprise MVP P1, `BLOCKED-EXTERNAL`).
- Running tests, builds, browser automation, or provider audits (User Test
  Authorization Gate — not requested).
- Mutating D1, R2, Email, Git, or any provider.

## Status snapshot (2026-07-12)

| Field | Value | Notes |
|---|---|---|
| Audit status | **P0-1 DOWNGRADED to P2 (round 11)** — email substrate IS wired; live check overturns stale docs | Round 11 `wrangler email sending list` + `dig` show: nameservers on Cloudflare, Email Sending enabled (since 2026-07-01), all 5 `cf-bounce` DNS records published. Outbound mail should pass SPF+DKIM+DMARC. Only DMARC tightening (`p=none`→`p=quarantine`) + real-send verification remain — **not blocking**. The original P0 was correct on June-30 evidence but stale by July-12. |
| Bugs found | **27** | **7 P1**, 14 P2, 6 P3 — see `02` + `09`. P2-7 downgraded to P3 (statically resolved); P2-15 closed by DEC-AUTO-114. |
| Highest-severity open bugs | **Decision race** (P1-7, D1 has no unique constraint), **enumeration oracle** (P1-6, `openRecipientProposalAction` distinct errors + no rate limit), **recipient PII survives removal** (P1-4), **audit log no TTL** (P1-5) | Plus round-1 P1s (`responded` P1-1, one-bad-row-fails-all P1-2) |
| Page vs. owner directive | **MISMATCH** | Page is a flat bordered table; directive wants projects-page card grid. Active pack exists to close this. |
| Domain gaps | 2 beta-recommended | Electronic-consent disclosure (ESIGN/UETA/RA 8792); sender-side assumptions/exclusions block (RICS NRM). See `08`. |
| Privacy posture | Conditional | Marketing disclaims SOC2/GDPR/HIPAA/DPA; beta-defensible but P1-4/P1-5/P2-8 should close before first users. See `09`. |
| Beta readiness | **CONDITIONAL** | Functional + secure on the common path, but the deep audit found data-integrity (P1-7), enumeration (P1-6), privacy (P1-4/P1-5), observability (P2-2/P2-10), and analytics (P2-11) gaps that round 1 missed. |

## One-line architecture (detail in `01-CURRENT-STATE-MAP.md`)

```
/workshop/proposals (RSC, dynamic via cookies/headers)
└─ <WorkshopRouteHeader> + <WorkshopCanvasWash>            shared workshop chrome
└─ <Suspense fallback={<ProposalsListSkeleton/>}>
   └─ ProposalsData (async server component)               proposals-data.tsx
      ├─ requireCurrentUserContext()                       authn → redirects /login
      └─ listRecipientProposals()                          recipient-proposals-repository.ts
         └─ getCloudflareD1Database() → ARCH_DB            one SELECT, JOIN 6 tables, LIMIT 50
      └─ <ProposalsPageClient> ("use client")              proposals-page-client.tsx
         └─ TanStack Query ["recipient-proposals", email]  staleTime 30s, refetchOnWindowFocus
            └─ loadRecipientProposals() server action      re-calls same repo
            └─ <ProposalsList> → <ProposalRow>             useActionState(openRecipientProposalAction)
               └─ Review button → redirect /share/<token>   authorize_recipient_publication_for_current_user
```

## Resume pointer

- **Start here for bugs:** `02-BUG-AND-RISK-REGISTER.md` — sorted by severity (31 bugs: 0 P0, 7 P1, 17 P2, 7 P3). P0-1 downgraded to P2 after round-11 live verification showed the email substrate is wired.
- **Start here for architecture:** `01-CURRENT-STATE-MAP.md`.
- **Start here for "what do we do about it":** `03-READINESS-AND-RECOMMENDATIONS.md`.
- **Start here for the projects-page parity gap:** `04-PROJECTS-PAGE-PARITY-GAP-ANALYSIS.md`.
- **Start here for the implementation plan:** `05-TARGET-DESIGN-AND-IMPLEMENTATION-DAG.md` (Track A = data fixes, Track B = redesign).
- **Start here for closed decisions:** `06-DECISION-LOG.md`.
- **Start here for the readiness snapshot:** `07-BASELINE-CRITERION-MATRIX.md`.
- **Start here for domain/industry norms:** `08-DOMAIN-AND-INDUSTRY-REQUIREMENTS.md` (RICS NRM, ESIGN/UETA/eIDAS, RA 8792).
- **Start here for privacy/compliance:** `09-PRIVACY-AND-COMPLIANCE-AUDIT.md` (PII, retention, DSAR, log leak).
- **Start here for the technical deep audit:** `10-TECHNICAL-DEEP-AUDIT.md` (bundle, monitoring, analytics, mobile, abuse, cross-surface, variants).
- **To execute fixes:** either (a) ship Track A from `05` as a standalone slice (now expanded with P1-4…P1-7 from the deep audit), or (b) fold the deep-audit bugs into the active `.ai/03_plans/2026-07-11/Proposals-Feature/` pack and continue from its `UNIT-001`.

## Provenance

- Audit performed: 2026-07-12.
- Method: parallel read-only codebase exploration (4 lanes) + direct source reads
  of the 4 route files, the repository, the client, `ProposalRow`, and the
  actions wrapper; `.ai` doc cross-reference.
- Baseline HEAD: confirm with `git rev-parse HEAD` before any fix work.
- Test decision: `NOT_REQUIRED` for this audit task (User Test Authorization
  Gate). Where a bug warrants a test, `02` records a `TEST_PROPOSAL` and waits
  for explicit owner authorization.
