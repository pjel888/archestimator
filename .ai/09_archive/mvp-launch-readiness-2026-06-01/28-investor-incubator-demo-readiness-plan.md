# Investor and Incubator Demo Readiness Plan

## Fourth-Pass Closed Beta Investor Reframe - 2026-06-02

Investor and incubator reviewers should experience the same closed beta controls as beta users.

Demo requirements:

- Add reviewer emails to the allowlist.
- Use Google Sign-In.
- Seed or manually prepare a demo workspace.
- Show project, estimate, component/template value, unlink safety, and Excel export.
- Explain closed beta cohort and feedback loop.
- Explain pricing as future roadmap only.
- Do not show checkout, paid plans, active billing, or Ask Flip as a live production promise.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Demo Narrative

Archestimator helps design/construction teams move from messy estimating inputs to structured project estimates, reusable component libraries, templates, project-specific adjustments, and professional Excel bid/BOQ exports. MVP credibility comes from structured estimating and Excel-first workflow, not AI.

## Demo Assets Required

| Asset | Requirement |
| --- | --- |
| Demo account | Dedicated account, no real client data, credentials stored outside repo. |
| Demo workspace | Resettable, named clearly as sample/demo. Local seed anchor: `Archestimator Demo Workspace` in `supabase/seed.sql`. |
| Seed project | Realistic residential/commercial sample with location, client/owner, scope notes. Local seed anchor: `DEMO_PROJECT_PLACEHOLDER`, project code `DEMO_PROJECT_CODE_PLACEHOLDER`, PROJECT_CITY_PLACEHOLDER, PHP. |
| Seed component library | Image-backed, category/supplier/unit/cost fields realistic. |
| Seed templates | Trade-realistic templates with sections/rows. |
| Sample estimate | Enough rows to show tree, grid, totals, Activity/history. Local seed anchor: `DEMO_PROJECT_PLACEHOLDER Baseline Estimate`, `Rev 0`, with seeded row items across site works, architectural finishes, roof, and plumbing. |
| Detached row demo | Linked row detached/project-specific with library unchanged. Local seed includes one `linked-clean` tile row and one `detached` paint row with preserved `source_snapshot`. |
| Excel export | Fresh authorized workbook export plus sanitized readback evidence. |
| Screenshots/fallback | Landing, workshop, estimate, library, templates, export preview, final workbook. |

## Local Seed Anchors

Use `supabase db reset` only against local/staging disposable data, never production.

| Anchor | Value |
| --- | --- |
| Workspace | `UUID_PLACEHOLDER` / `Archestimator Demo Workspace` |
| Project | `PROJECT_ID_PLACEHOLDER` / `DEMO_PROJECT_PLACEHOLDER` |
| Estimate | `PROJECT_ID_PLACEHOLDER` / `DEMO_PROJECT_PLACEHOLDER Baseline Estimate` |
| Linked row | `UUID_PLACEHOLDER` / `600x600 Porcelain Floor Tile` / `linked-clean` |
| Project-specific row | `UUID_PLACEHOLDER` / `Master bedroom low-VOC paint system` / `detached` |
| Manual rows | Site grading, roof framing/waterproofing, and plumbing fixture allowance rows |

## Demo Rehearsal Checklist

1. Add reviewer email to `closed_beta_allowed_emails` in the target environment.
2. Confirm `CLOSED_BETA_ACCESS_ENABLED=true`, `ARCHESTIMATOR_AI_ENABLED=false`, and `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`.
3. Load or recreate the demo workspace from `supabase/seed.sql` in a disposable environment.
4. Open `DEMO_PROJECT_PLACEHOLDER` and `DEMO_PROJECT_PLACEHOLDER Baseline Estimate`.
5. Show the estimate tree with seeded rows and totals.
6. Show the linked tile row, then demonstrate a project-specific row using the detached paint row.
7. Insert one component and one template if using a writable rehearsal environment.
8. Export the workbook and open the validated artifact.
9. Keep screenshots and sanitized workbook readback ready as fallback if live auth/deploy fails. Regenerate a fresh workbook only when needed; do not commit raw proposal exports.
10. Do not show provider dashboards, real customer data, Ask Flip, billing, or unfinished post-MVP pages.

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

Use screenshots and the sanitized workbook readback. Do not debug live during investor/incubator meeting, and do not use a committed raw workbook as demo proof.

Current local fallback packet: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/demo-rehearsal-fallback-pack-2026-06-02.md`.

This packet is not live rehearsal approval. Hosted reviewer account proof, allowlist proof, target-environment screenshots, spreadsheet-app workbook proof, and owner sign-off remain required.
