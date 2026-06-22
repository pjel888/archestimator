# Testing Loop And Validation Notes

Date: 2026-06-22

## What Was Tested In This Pass

This pass performed source/test-based user-story verification, second-pass persona expansion, and status mapping. It did not run broad app automation because current project state records broad `bun run validate` and all-DOM runs as red/hanging. The canonical CSV therefore separates:

- feature implemented in current code,
- existing automated evidence identified,
- evidence status for this pass,
- targeted verification ID,
- testing status and external proof needed,
- issue ID and issue severity,
- current UX/logistical error,
- best fix,
- post-fix scenario,
- post-fix assessment.

The second pass expanded the canonical spreadsheet from 55 rows and 15 columns to 93 rows and 22 columns. The expansion added route/API coverage rows, evidence-quality columns, and underrepresented persona stories for estimators, contractors, field operators, PMs, business owners, client recipients, suppliers/vendors, support, legal/privacy, provider readiness, monitoring, and launch operations.

## Test Inventory Evidence

Observed local test inventory during this pass:

- 429 Vitest files under `tests/vitest` (corrected 2026-06-22 from a stale `425`; re-derive with `rg --files tests/vitest | wc -l` — the drift-guard validator is in `12-keystone-code-binding-and-drift-protection.md` §3).
- 21 Playwright/e2e files under `e2e`.
- 5 Bun unit files under `tests/unit`.

The independent test-coverage lane also mapped the representative suites by feature area.

## Known Existing Validation Gaps

- Broad `bun run validate` is not currently a reliable green signal. Current project state records chart `set-state-in-effect` lint reds, `ProposalExportPreviewDialog` design-lint reds, and an all-DOM phase that can hang.
- `workspace-repository-project-list.test.ts` is recorded in project state as red from pre-existing repository text expectations.
- Provider proof is uneven for Supabase/RLS/RPC, Resend delivery, Google Maps/Places, hosted share/export/auth, monitoring alerts, legal/DSAR readiness, and Vercel runtime behavior.
- Many tests are contract/component tests. Browser-level authenticated user journeys remain targeted follow-up proof, not claimed here.
- Recipient, supplier/vendor, contractor/builder, field-operator, PM, owner-governance, and operator stories now have canonical rows, but many are marked as underrepresented or related-test-only because the current implementation does not yet have access-path-specific proof.
- First-pass raw issue labels were normalized to canonical `UX-*` IDs in the expanded CSV.
- The Resend webhook route reference was corrected to `/api/webhooks/resend`.

## Evidence Status Categories

Use these proof-level meanings when reading `canonical-feature-status.csv`. The exact controlled values and their proof-level mapping live in `08-csv-schema-and-validation-contract.md`.

| Category | Meaning |
|---|---|
| `Concrete local tests identified` | A concrete local test file or narrow test family exists, but this documentation pass did not execute it. |
| `Inventory only; related tests identified; not executed in second pass` | Related tests exist, but they are not full user-story/browser/provider proof. |
| `Source evidence only; missing user-story test` | Code or route evidence exists, but a focused user-story test was not found. |
| `Browser proof not run` | The claim requires browser/user-journey proof before it should be treated as proven. |
| `Provider proof not run` | The claim depends on hosted or third-party behavior such as Resend, Maps, Supabase runtime, monitoring, or Vercel. |
| `Known red or blocked broad validation; targeted proof required` | Broad validation is not an actionable signal for this row; use the targeted verification ID. |

## Planning Readiness Layer

The first six files in this folder proved the audit was structurally valid. The 100% implementation-readiness layer is:

- `00-readiness-scorecard.md`
- `01-beta-product-thesis-and-prioritization.md`
- `02-implementation-decomposition.md`
- `03-sequencing-dependencies-and-conflicts.md`
- `04-ux-state-accessibility-and-content-contracts.md`
- `05-security-data-and-provider-blast-radius.md`
- `06-verification-matrix-and-proof-runbook.md`
- `07-agent-execution-brief.md`
- `08-csv-schema-and-validation-contract.md`
- `09-decision-ledger.md`
- `10-access-path-and-persona-taxonomy.md`
- `11-access-path-rbac-ux-review.md`

Future coding work must treat those files as the execution contract over the CSV and issue log.

## Recommended Execution Order For Full User-Story Testing

1. Fix or quarantine the known broad validation blockers so full-app QA can produce actionable output.
2. Run targeted suites by verification ID:
   - `TV-PUBLIC`: public and legal pages.
   - `TV-AUTH` and `TV-INVITE`: auth, closed-beta, terms, invite accept/continue/sign-out, invite repair.
   - `TV-WORKSHOP-ADMIN`: workshop shell, account/settings, beta admin, support repair.
   - `TV-PROJECT-DASHBOARD`: project list, dashboard, PM readiness, owner governance.
   - `TV-ESTIMATE-SHEET`: estimate list, sheet, tabs, tree, costs, validation, alternatives.
   - `TV-FIELD-HANDOFF`: contractor/builder and field package contents, access-path behavior, receipt, constraints, feedback.
   - `TV-LIBRARY-SOURCING`: supplier/brand/cost-source governance and attachment approval.
   - `TV-DATA-MAPS`: charts/data and map provider fallback.
   - `TV-COLLABORATION`: teamspace, invites, permission-limited access, presence/reconnect.
   - `TV-SHARE-RECIPIENT`: share link, password/session, recipient comprehension, print, comment, decision, activity.
   - `TV-ASSET-API`: project images, component-library images, attachments.
   - `TV-AI`: AI disabled/quota/provider/draft/apply states.
   - `TV-OPS-SUPPORT`: feedback, notifications, monitoring, provider readiness, legal/privacy, launch operations.
   - `TV-ROUTE-ALIASES`: route/API inventory and legacy alias checks.
3. Run targeted suites by feature group:
   - Auth/legal/beta: auth, closed-beta, terms, beta access tests.
   - Projects/dashboard: project page, dashboard shell, grouping, favorites, create/edit/delete tests.
   - Estimates: estimate sheet, tabs, tree DnD, row/cost, library insert, version-control tests.
   - Publication/share: project-publication, share, security/no-store, recipient tests.
   - Proposal/data/maps: proposal export, charts/data, location/map tests.
   - AI: ask, package-builder, audit, floating button tests.
   - Notifications/feedback: notification center/provider/actions, release modal, feedback form/review tests.
4. Run browser/provider proof only where the claim is inherently browser/provider dependent:
   - closed-beta sign-in through Terms,
   - project dashboard and estimate sheet edit journey,
   - share-link recipient journey,
   - proposal export preview and generated workbook open check,
   - map provider missing/configured behavior,
   - two-user collaboration/presence,
   - Resend inbox delivery,
   - monitoring alert/drain proof.
5. After each issue fix, execute the matching scenario in `post-fix-scenario-tests.md`.
6. Update only `canonical-feature-status.csv` for status changes so the spreadsheet stays canonical.

## Validation Commands Run For This Documentation Pack

These checks were run after synthesis:

- `rg --files tests/vitest | wc -l`
  - Result after this planning-readiness pass: `429` (corrected from stale `425`; drift-guard validator in `12-keystone-code-binding-and-drift-protection.md` §3)
- `find e2e -type f | wc -l`
  - Result after this planning-readiness pass: `21`
- `rg --files tests/unit | wc -l`
  - Result: `5`
- `ruby -rcsv -e '...' .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv`
  - Result after second-pass expansion: `headers=22 rows=93 dupes=0 bad_issue_rows=0`
- `ruby -rcsv -e '...'` controlled vocabulary check for `Coverage Class`, `Targeted Verification`, `Feature Status`, `Evidence Status`, and `Row Impact Severity`
  - Expected result after this pass: `controlled_vocab=ok`
- `ruby -rcsv -e '...'` source-evidence path check for repo-local `src/`, `supabase/`, `tests/`, `e2e/`, `scripts/`, and `package.json` references
  - Expected result after this pass: `source_paths=ok`
- `ruby -rcsv -e '...'` issue reference cross-check across CSV, issue log, and post-fix scenarios
  - Result after second-pass expansion: `csv_issue_ids=44 issue_log_ids=44 post_fix_ids=44 missing_issue_log=0 missing_post_fix=0`
- Stale-marker scan for old raw issue labels and the old Resend webhook route
  - Result after second-pass expansion: no stale first-pass issue IDs or incorrect webhook path in the synthesized pack.
- `git diff --check -- .ai/16_user-experience`
  - Result: exit 0 with no whitespace errors.

## Binding-Integrity Sweep (recurring)

Before any status promotion or widen-beta gate, re-derive every hardcoded count, cited route path, cited migration filename, and cited script name against the live repo and report deltas. Canonical commands and the drift-remediation protocol live in `12-keystone-code-binding-and-drift-protection.md` §4 and §5. This sweep is what catches anchor drift (e.g. the 2026-06-22 425→429 vitest correction) between audits, together with the 5th validator (inventory drift guard) and the conflict-coverage invariant in `08-csv-schema-and-validation-contract.md`.

## Artifact Validation Result

- The audit folder contains the original six synthesized audit files plus the twelve-file implementation-readiness layer: `00-readiness-scorecard.md` through `11-access-path-rbac-ux-review.md`.
- The canonical CSV parsed successfully as a 22-column spreadsheet with 93 feature/user-story rows.
- Every `UX-*` issue referenced by the CSV exists in both `ux-logistical-errors-and-fixes.md` and `post-fix-scenario-tests.md`.
- `Row Impact Severity` is row-specific and intentionally differs from issue-level severity where a reused `UX-*` issue has different impact by story row.
- `git diff --check -- .ai/16_user-experience` returned no whitespace errors.
- The working tree has unrelated pre-existing edits outside `.ai/16_user-experience`; this pass did not edit or revert them.
