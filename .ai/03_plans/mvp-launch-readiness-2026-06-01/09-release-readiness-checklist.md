# Release Readiness Checklist

Status values: Open, Pass, Fail, Blocked, Waived. P0 cannot be Waived for launch.

## P0 Gates

| Gate | Owner | Evidence required | Artifact path | Pass/fail criteria | Phase | Ticket | Status | Rollback trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AI footer hidden by default | Eng | DOM test and screenshot/smoke | `14-evidence-index.md`, future `evidence/ai-footer-hidden.md` | Ask Flip absent unless flag true | PR 1 | MVP-AI-001 | Open | Ask Flip visible in production |
| AI routes disabled by default | Eng | Route tests proving no handler/provider/context/audit calls | `14-evidence-index.md` | 403 disabled response before handler | PR 1 | MVP-AI-002/003 | Open | Provider/context call observed |
| Unlink RPC schema valid | Eng | Migration test and generated types | `17-data-contracts-rpc-migrations.md`, future migration proof | Uses `node_id`, valid event columns, row revision conflict | PR 2 | MVP-ROW-001 | Open | Bad history row or data corruption |
| Row unlink UX works | Eng/Product | DOM test and manual smoke | future `evidence/row-unlink-smoke.md` | Detach confirmation, badge, revision, history pass | PR 3 | MVP-ROW-003/005 | Open | Revision conflicts or silent data change |
| Export workbook spec met | Eng/Product | ExcelJS tests and manual app QA | future `evidence/export-manual-qa.md` | Sheet spec, formulas, no blank totals, commercial blocks | PR 6 | MVP-XLS-001/002/003 | Open | Formula mismatch or broken workbook |
| Full command baseline | Eng | Exact command output | `14-evidence-index.md` | install/type/lint/design/test/dom/build pass | PR 7 | MVP-QA-001 | Fail | Any P0 command fails |
| Supabase migration proof | Eng | Linked migration apply and verify output | future `evidence/supabase-migration-proof.md` | Applied exact files, repaired history if needed, direct SQL verification | PR 7 | MVP-QA-001 | Open | Migration apply failure |
| Vercel deployment proof | Eng | Preview/staging/prod deployment URLs and env audit | future `evidence/vercel-deployment-proof.md` | Correct env vars, build green, protected routes smoke pass | PR 7 | MVP-QA-001 | Open | Bad env or route smoke fail |
| Production auth proof | Eng | Login/callback/workshop smoke | future `evidence/production-auth-proof.md` | Login lands in `/workshop` and no onboarding gate | PR 7 | MVP-QA-001 | Open | Callback failure |
| Owner sign-off | Philip | Signed launch gate | `12-final-mvp-launch-gate.md` | All P0 Pass and owner signature present | Final | MVP-QA-001 | Open | Any owner no-go |

## P1 Gates

| Gate | Owner | Evidence required | Artifact | Phase | Ticket | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Library polish | Eng/Product | DOM/repository tests and visual QA notes | future `evidence/library-qa.md` | PR 4 | MVP-LIB-001/002 | Open |
| Template polish | Eng/Product | DOM/repository/action tests and visual QA notes | future `evidence/template-qa.md` | PR 5 | MVP-TPL-001/002 | Open |
| Export commercial defaults approved | Philip | Written decision for VAT/terms/warranty/duration | `18-excel-reference-analysis.md` or decision log | Before PR 6 | MVP-XLS-001 | Open |
| Share source-contract failure triaged | Eng | Passing `test:dom` or scoped fix note | `14-evidence-index.md` | PR 7 | MVP-QA-001 | Open |

## P2 Gates

| Gate | Owner | Evidence | Status |
| --- | --- | --- | --- |
| Route-transition production benchmark | Eng | Existing memory says not complete without production/manual proof. | Deferred outside MVP unless regressions appear. |
| Public landing copy updates | Product | Claims matrix and analytics proof. | Deferred unless copy changes. |
| Teamspaces/collaboration | Product | Spec only. | Deferred. |

## Current Command Evidence

| Command | Status |
| --- | --- |
| `bun install --frozen-lockfile` | Pass |
| `bun run type-check` | Pass |
| `bun run lint` | Pass with warnings |
| `bun run lint:design-system` | Pass |
| `bun run test` | Pass |
| `bun run test:dom` | Fail: 3 source-contract failures |
| `bun run build` | Pass |
| Focused AI bundle | Pass |
| Focused row bundle | Pass |
| Focused library/template bundle | Pass |
| Focused export bundle | Pass |

## No-Go Criteria

Do not launch if:

- Ask Flip is visible by default.
- Either AI route can reach provider/context/audit with default env.
- Unlink SQL references nonexistent schema.
- Export workbook has blank line totals.
- `test:dom` still fails without an explicit owner-approved blocker disposition.
- Supabase linked migration proof is absent.
- Vercel production env proof is absent.
- Owner signature is absent.
