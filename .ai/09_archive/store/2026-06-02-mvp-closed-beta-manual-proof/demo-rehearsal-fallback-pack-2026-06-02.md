# Demo Rehearsal Fallback Pack

Date: 2026-06-02
Scope: local fallback demo packet assembled from already captured local artifacts.
Result: partial/local fallback ready except raw workbook retention; live hosted rehearsal remains missing.

This packet is for investor/incubator fallback use if a live demo route fails. It is not evidence that a hosted reviewer account can sign in, reach the seeded workspace, or complete the target journey.

## Seed Anchors

Source: `supabase/seed.sql` and `.ai/03_plans/mvp-launch-readiness-2026-06-01/28-investor-incubator-demo-readiness-plan.md`.

- Workspace: `Archestimator Demo Workspace`.
- Project: `Lewis Residence`, project code `AE-LR-001`, Quezon City.
- Estimate: `Lewis Residence Baseline Estimate`.
- Linked row demo: `600x600 Porcelain Floor Tile`, `linked-clean`.
- Project-specific row demo: `Master bedroom low-VOC paint system`, `detached`.
- Manual rows: site grading, roof framing/waterproofing, and plumbing fixture allowance rows.

## Fallback Artifacts

- Workbook readback: `proposal-workbook-exceljs-summary-sanitized-2026-06-02.json`.
- Raw workbook: withdrawn from git on 2026-06-04 because committed proposal workbooks can contain client-identifying estimate data.
- Component screenshot: `component-library-demo-smoke-2026-06-02.png`.
- Component proof JSON: `component-library-demo-smoke-2026-06-02.json`.
- Template screenshot: `template-library-demo-smoke-2026-06-02.png`.
- Template proof JSON: `template-library-demo-smoke-2026-06-02.json`.
- Template insertion screenshot: `template-insert-local-smoke-2026-06-02.png`.
- Template insertion proof JSON: `template-insert-local-smoke-2026-06-02.json`.

## Local Proof Already Captured

- `tests/vitest/demo-seed-readiness.test.ts` guards seed/demo anchors and the "do not show" constraints.
- `library-demo-smoke-local-2026-06-02.md` records local component and template screenshots.
- `template-insert-local-smoke-2026-06-02.md` records local template insertion into a throwaway estimate with zero residue.
- `spreadsheet-artifact-local-2026-06-02.md` records historical generated-workbook checks, ZIP integrity, sanitized ExcelJS readback, formula readback, and no blank line-total rows.

## Fallback Script

1. If hosted auth or the live environment fails, do not debug live.
2. Open with the problem: Archestimator turns messy estimating inputs into structured estimates, reusable components/templates, project-specific adjustments, and a professional Excel bid/BOQ workbook.
3. Show the component screenshot and call out supplier/source/checked-date trust fields.
4. Show the template screenshot and call out structure plus sample-row preview.
5. Show the template insertion screenshot/JSON summary: 5 inserted nodes, 8 inserted rows, and one `template_inserted` event with cleanup verified.
6. Show the sanitized workbook readback summary: `Bid Form`, `Summary`, `Commercial Terms`, and `Source Breakdown`; no blank line-total rows; grand total formula `B27+B28+B29`.
7. Explain project-specific safety using the seeded linked-clean tile row and detached paint row, without claiming the linked environment unlink smoke has passed.
8. State the closed-beta posture: invite-only, no payment, Ask Flip hidden, support via `support@archestimator.com`, and launch remains proof-gated.

## Do Not Show

- Ask Flip or AI routes.
- Billing/payment UI.
- Provider dashboards.
- Real customer data.
- Raw secrets, raw tokens, service-role keys, cookies, or debug JSON.
- The linked project-specific unlink smoke as a pass; it is currently blocked by missing linked RPC proof.

## Still Missing

- Hosted reviewer account and allowlist proof.
- Live rehearsal screenshots from the target hosted environment.
- Spreadsheet-app open/recalc/print proof.
- Project-specific unlink/export proof in the linked target.
- Owner-approved demo script sign-off.

Closed beta and investor demo remain **NO-GO** until the live rehearsal and provider/manual proof gates pass. Do not recommit raw proposal workbooks or rendered workbook previews as fallback assets.
