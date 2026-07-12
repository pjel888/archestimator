# Proposals Page Audit (2026-07-12)

> **Audit / readiness digest. Not an implementation plan.**
> Profile: `high-blast-radius` (cross-cutting audit: UI/UX, data, server, authz,
> performance, Cloudflare/Workers). This is a **read-only audit** of
> `/workshop/proposals` and everything it touches. No code, migrations, config,
> or provider state was changed to produce this pack.
>
> Scope authority: this pack describes and classifies what exists today. The
> separate, **active** implementation pack is
> `.ai/03_plans/2026-07-11/Proposals-Feature/` (`CONDITIONALLY_READY /
> NOT_STARTED / NOT_EVALUATED / ACTIVE / ACTIVE`). This audit is intentionally
> **complementary**: it re-verifies the codebase against current source on
> 2026-07-12, records concrete bugs with file:line evidence, and feeds
> readiness findings into that implementation pack rather than duplicating its
> execution DAG.

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
| `README.md` (this file) | entrypoint | Outcome, scope, map, status, resume pointer |
| `01-CURRENT-STATE-MAP.md` | audit | Full component/data/server/authz/perf/cloudflare map with file:line refs |
| `02-BUG-AND-RISK-REGISTER.md` | audit | Every defect/risk found (**25: 7×P1, 11×P2, 7×P3** after deep audit), severity, evidence, recommended surface |
| `03-READINESS-AND-RECOMMENDATIONS.md` | audit | Beta readiness verdict, prioritized recommendations, relationship to the active pack |
| `04-PROJECTS-PAGE-PARITY-GAP-ANALYSIS.md` | design | Feature-by-feature projects-vs-proposals gap; exact primitives/patterns to reuse |
| `05-TARGET-DESIGN-AND-IMPLEMENTATION-DAG.md` | design | Two-track implementation DAG (data hardening + redesign), units grounded in real paths |
| `06-DECISION-LOG.md` | decisions | 10 `DEC-AUTO-*` closures + 3 `AUTH-*` owner boundaries; re-confirms active-pack decisions |
| `07-BASELINE-CRITERION-MATRIX.md` | audit | PASS/FAIL/BOUNDARY/N/A snapshot across all Improve-prompt dimensions |
| `08-DOMAIN-AND-INDUSTRY-REQUIREMENTS.md` | research | Construction/RFP/e-sign industry norms (RICS NRM, ESIGN/UETA/eIDAS, RA 8792) vs current code |
| `09-PRIVACY-AND-COMPLIANCE-AUDIT.md` | audit | PII inventory, right-to-be-forgotten, retention, residency, log-leak paths |
| `10-TECHNICAL-DEEP-AUDIT.md` | audit | Bundle, prod monitoring, analytics, mobile, abuse/enumeration, cross-surface, variants |

No `plan-pack.json` manifest is emitted because this is an **audit-only** pack
(no implementation units, gates, or status tuple to enforce). Emitting a
manifest would imply an executable plan, which this is not. If the owner wants
these findings turned into an executable plan, the 2026-07-11 `Proposals-Feature`
pack is the canonical home (see `03` §"Relationship to the active pack").

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

- Implementing any fix. This is audit-only.
- Re-planning the owner-side publisher or `/share/[token]` redesign (already
  ACHIEVED in `.ai/09_archive/store/2026-07-11-Publisher-And-Shared-Pages-complete/`).
- Designing immutable snapshots or PDF (Enterprise MVP P1, `BLOCKED-EXTERNAL`).
- Running tests, builds, browser automation, or provider audits (User Test
  Authorization Gate — not requested).
- Mutating D1, R2, Email, Git, or any provider.

## Status snapshot (2026-07-12)

| Field | Value | Notes |
|---|---|---|
| Audit status | COMPLETE | Full surface mapped; every claim has file:line evidence |
| Bugs found | 14 | 3 P1, 7 P2, 4 P3 — see `02-BUG-AND-RISK-REGISTER.md` |
| Highest-severity open bug | **`responded` delivery status never written** (`d1-store.ts:377,410`) + **single bad row fails the whole inbox** (`recipient-proposals-repository.ts:65,157`) | Both P1 |
| Page vs. owner directive | **MISMATCH** | Page is a flat bordered table; directive wants projects-page card grid. Active pack exists to close this. |
| Beta readiness | **CONDITIONAL** | Inbox is functional and secure for the common path, but has data-truncation, error-swallowing, and UX gaps that will bite at >50 proposals or on any single corrupt row. |

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

- **Start here for bugs:** `02-BUG-AND-RISK-REGISTER.md` — sorted by severity.
- **Start here for architecture:** `01-CURRENT-STATE-MAP.md`.
- **Start here for "what do we do about it":** `03-READINESS-AND-RECOMMENDATIONS.md`.
- **Start here for the projects-page parity gap:** `04-PROJECTS-PAGE-PARITY-GAP-ANALYSIS.md`.
- **Start here for the implementation plan:** `05-TARGET-DESIGN-AND-IMPLEMENTATION-DAG.md` (Track A = data fixes, Track B = redesign).
- **Start here for closed decisions:** `06-DECISION-LOG.md`.
- **Start here for the readiness snapshot:** `07-BASELINE-CRITERION-MATRIX.md`.
- **To execute fixes:** either (a) ship Track A from `05` as a standalone slice, or (b) fold Track A's 3 new bugs into the active `.ai/03_plans/2026-07-11/Proposals-Feature/` pack and continue from its `UNIT-001`.

## Provenance

- Audit performed: 2026-07-12.
- Method: parallel read-only codebase exploration (4 lanes) + direct source reads
  of the 4 route files, the repository, the client, `ProposalRow`, and the
  actions wrapper; `.ai` doc cross-reference.
- Baseline HEAD: confirm with `git rev-parse HEAD` before any fix work.
- Test decision: `NOT_REQUIRED` for this audit task (User Test Authorization
  Gate). Where a bug warrants a test, `02` records a `TEST_PROPOSAL` and waits
  for explicit owner authorization.
