# Investor and Incubator Demo Readiness Plan

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Demo Narrative

Archestimator helps design/construction teams move from messy estimating inputs to structured project estimates, reusable component libraries, templates, project-specific adjustments, and professional Excel bid/BOQ exports. MVP credibility comes from structured estimating and Excel-first workflow, not AI.

## Demo Assets Required

| Asset | Requirement |
| --- | --- |
| Demo account | Dedicated account, no real client data, credentials stored outside repo. |
| Demo workspace | Resettable, named clearly as sample/demo. |
| Seed project | Realistic residential/commercial sample with location, client/owner, scope notes. |
| Seed component library | Image-backed, category/supplier/unit/cost fields realistic. |
| Seed templates | Trade-realistic templates with sections/rows. |
| Sample estimate | Enough rows to show tree, grid, totals, Activity/history. |
| Detached row demo | Linked row detached/project-specific with library unchanged. |
| Excel export | Prevalidated workbook artifact. |
| Screenshots/fallback | Landing, workshop, estimate, library, templates, export preview, final workbook. |

## Demo Path

1. Login to demo account.
2. Open seeded workspace and project.
3. Show structured estimate tree/grid.
4. Insert a component from library.
5. Insert a template.
6. Detach a row and explain project-specific pricing without mutating the library.
7. Export workbook and open validated artifact.
8. Show support/legal/beta posture only if asked.

## What Not To Show

- Ask Flip or AI routes.
- Billing/payment UI unless implemented.
- PDF export or bid tabulation.
- Empty placeholders, pending legal copy, raw/debug JSON, provider dashboards.
- Real customer/client data.

## What To Say Is Post-MVP

- AI assistant.
- PDF/formal proposal letter.
- Contractor bid tabulation.
- Billing automation.
- Advanced collaboration/teamspaces.
- Redis/async export jobs if scale requires.

## Metrics To Show

- Number of structured components/templates in demo library.
- Estimate row count/sections.
- Export quality and openability.
- Beta target cohort and feedback process.
- Roadmap gates, not unsupported usage claims.

## Reliability Checklist

- Demo workspace reset.
- Auth works.
- Export artifact opens.
- No AI visible.
- Legal copy not misleading.
- Screenshots available.
- Support contact available.
- Rollback/fallback script ready.

## Investor FAQ Risk Answers

| Question | Answer |
| --- | --- |
| Why defer AI? | MVP trust depends on structured estimating, data integrity, and exports; AI returns after legal/privacy/rate-limit/audit proof. |
| Why Excel first? | Contractors already use Excel bid forms; professional workbook output is the fastest credible workflow bridge. |
| How is data protected? | Supabase RLS, workspace scoping, tokenized share/invite, server-only service role, and pre-launch security proof. |
| How does this scale? | Vercel/Supabase foundation, typed schema, row history, caching/perf gates, Redis/job path if thresholds require. |
| How does library become a moat? | Structured components, templates, pricing provenance, and project-specific learning compound over time. |
| What is beta scope? | Core estimate/library/template/unlink/export workflows with support and known limitations. |
| Revenue path? | Beta/free preview first; paid plan/invoicing after legal, reliability, and feature proof. |

## Demo Failure Fallback

Use screenshots and the prevalidated workbook artifact. Do not debug live during investor/incubator meeting.
