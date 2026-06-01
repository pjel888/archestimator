# Final MVP Launch Gate

Current decision: NO-GO.

Reason: P0 implementation and evidence gates remain open, and `bun run test:dom` fails at commit `b6184cf7123ed46f4cd8b9a467feb5232f0b46bf`.

## Required Linked Docs

- Checklist: `09-release-readiness-checklist.md`
- Risk register: `10-technical-risk-register.md`
- Evidence index: `14-evidence-index.md`
- Blast radius: `15-blast-radius-register.md`
- Ticket map: `16-implementation-ticket-map.md`
- Data contracts: `17-data-contracts-rpc-migrations.md`
- Test strategy: `19-test-strategy-and-fixtures.md`
- Runbook: `20-launch-runbook.md`

## Go/No-Go Table

| Gate | Current status | Go condition |
| --- | --- | --- |
| AI hidden by default | Open | Footer absent with default env. |
| AI routes disabled by default | Open | 403 before handler, no provider/context/audit. |
| Unlink data contract | Open | Migration/RPC/action tests pass with real schema. |
| Row UX | Open | Badge/confirmation/editor/history tests pass. |
| Library polish | Open | DOM/repository tests and visual QA pass. |
| Template polish | Open | DOM/repository/action tests and visual QA pass. |
| Excel export | Open | Workbook spec, formula tests, and manual QA pass. |
| Full command baseline | Fail | All required commands pass. |
| Supabase proof | Open | Linked apply/verify artifact captured. |
| Vercel proof | Open | Deployment/env/smoke artifact captured. |
| Production auth proof | Open | Login/callback/workshop smoke pass. |
| Owner sign-off | Open | Philip signs final section. |

## Current Command Proof

Pass:

- `bun install --frozen-lockfile`
- `bun run type-check`
- `bun run lint` with warnings only
- `bun run lint:design-system`
- `bun run test`
- `bun run build`
- Focused AI, row, library/template, and export bundles

Fail:

- `bun run test:dom`: 2 failed files, 3 failed tests.

## Manual QA Proof Required

| Proof | Required artifact |
| --- | --- |
| Excel opens in Microsoft Excel | Screenshot or notes with generated filename, date, totals checked. |
| Excel opens in Apple Numbers | Screenshot or notes. |
| Excel opens in LibreOffice | Screenshot or notes. |
| Excel opens in Google Sheets | Screenshot or notes. |
| Export formulas recalc | Formula cell sample and total match. |
| No blank line totals | Row inspection summary. |
| Workshop protected smoke | Route checklist. |
| Auth callback | Login/callback proof. |

## Production Proof Required

- Vercel deployment URL.
- Vercel env variable list with secret values redacted.
- Supabase migration version list.
- `/workshop` auth smoke.
- `/workshop/library` smoke.
- `/workshop/templates` smoke.
- Estimate sheet row edit smoke.
- Export download smoke.
- AI disabled route smoke.

## Unresolved Debt List

- Labor/material split remains compatibility mode.
- Terms/VAT/warranty defaults need owner approval.
- AI feature remains deferred.
- Template authoring UI deferred.
- Bulk library import/export deferred.
- Route-transition production benchmark remains outside this MVP launch package unless required by owner.

## Do Not Launch If

- Any P0 gate in `09-release-readiness-checklist.md` is not Pass.
- Any AI route can reach provider/context/audit with default env.
- Ask Flip footer is visible by default.
- Unlink RPC uses invalid schema or lacks row revision conflict protection.
- Export workbook has blank line total cells.
- Export total formulas do not match preview totals.
- Supabase migration proof is missing.
- Vercel env proof is missing.
- Production auth proof is missing.
- Owner signature is missing.

## Owner Signature

Owner: Philip Lewis

Decision:

- [ ] GO
- [ ] NO-GO

Signature/date:

Notes:
