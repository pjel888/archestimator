# Second-Pass CSV Evidence Quality Review

Date: 2026-06-22

## Verdict

PARTIAL

The canonical CSV is parseable and has unique `Story ID` values, but it is not yet strong enough as the canonical spreadsheet because issue linkage and automated-evidence quality are inconsistent. The main risks are traceability gaps, mixed issue namespaces, and automated evidence cells that name broad categories instead of exact executable proof.

## Evidence

- `python3` CSV parse of `canonical-feature-status.csv` succeeded with 15 headers and 55 data rows.
- `Story ID` uniqueness check found 55 unique IDs, zero blanks, and zero duplicates.
- `ux-logistical-errors-and-fixes.md` and `post-fix-scenario-tests.md` both contain `UX-001` through `UX-029`, with no missing or duplicate canonical issue IDs.
- `rg -n "UXLOG-|UX-[0-9]{3}|PUB-[0-9]{3}|SETTINGS-[0-9]{3}|FEEDBACK-[0-9]{3}" .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit` found canonical issue IDs in the issue/scenario docs, but legacy/source IDs in CSV and issue-log evidence cells.
- `git diff --check -- .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit` exited 0.

## Findings

### 1. CSV issue references use noncanonical IDs

The issue log's canonical IDs are `UX-001` through `UX-029`, but the CSV references `UXLOG-*` labels in free-text testing-status cells:

| CSV line | Story ID | Current reference | Recommended canonical reference |
|---:|---|---|---|
| 17 | `PROJECT-002` | `UXLOG-02` | `UX-006` |
| 18 | `PROJECT-003` | `UXLOG-05` | `UX-007` |
| 21 | `PROJECT-006` | `UXLOG-01` | `UX-008` |
| 23 | `ESTLIST-002` | `UXLOG-06` and `UXLOG-07` | `UX-010` and `UX-011` |
| 54 | `FEEDBACK-001` | `UXLOG-04` | `UX-025` |

Patch recommendation: add a dedicated `Issue IDs` column to `canonical-feature-status.csv` and populate canonical `UX-*` IDs there. Do not keep issue IDs only inside `Testing Status`. If `UXLOG-*` IDs are useful as raw-agent evidence labels, move them to an `Evidence Notes` field or define them explicitly in `README.md`; otherwise replace them.

### 2. The issue log still contains old/source report labels

`ux-logistical-errors-and-fixes.md` uses canonical issue IDs in the first column, but several evidence cells still cite noncanonical labels:

- `UXLOG-01` through `UXLOG-07`
- `SETTINGS-009`
- `PUB-001`, `PUB-002`, `PUB-004`
- `FEEDBACK-016`

Patch recommendation: rewrite those evidence cells to cite canonical story IDs plus concrete source/test evidence. Examples:

- `UX-005`: replace `SETTINGS-009 report` with `SHELL-003; src/app/workshop/settings/page.tsx; src/components/workshop/WorkshopSettingsModalContentView.tsx`.
- `UX-009`: replace `UXLOG-03` with `SHARE-001; src/lib/publication; project-publication tests`.
- `UX-022`: replace `PUB-001, PUB-002, SHARE-003, SHARE-004` with canonical story IDs or documented raw report links.
- `UX-026`: replace `FEEDBACK-016 report` with `FEEDBACK-002; src/app/workshop/settings/feedback/page.tsx; beta-feedback-review tests`.

### 3. CSV cannot be joined cleanly to the issue log

The README says `canonical-feature-status.csv` is the single canonical spreadsheet, and `post-fix-scenario-tests.md` says to record results back in the CSV. However, the CSV has no structured `Issue IDs` or `Severity` column, while the issue log owns both issue IDs and severity.

Patch recommendation: either:

1. Add `Issue IDs` and `Issue Severity` columns to the CSV, making the CSV truly canonical; or
2. State in the README that issue severity is canonical only in `ux-logistical-errors-and-fixes.md`, and add a stable join key from each issue row back to `Story ID`.

The first option is cleaner for spreadsheet use.

### 4. Automated evidence is often inventory, not proof

The CSV's `Automated Evidence` column often names test areas or discovered tests without recording an executable command, pass/fail result, date, or exact path. These rows are the weakest:

| CSV line | Story ID | Weak evidence pattern |
|---:|---|---|
| 2 | `PUBSITE-001` | `landing tests ... identified by test map` |
| 3 | `PUBSITE-002` | `landing security/header tests identified` |
| 7 | `AUTH-003` | `access status parser tests` |
| 10 | `SHELL-001` | `main-sidebar-favorites tests; app-provider tests; route shell tests` |
| 12 | `SHELL-003` | `partial modal/page tests identified by auth report` |
| 18 | `PROJECT-003` | `project dashboard tests` |
| 20 | `PROJECT-005` | `main-sidebar-favorites tests` |
| 21 | `PROJECT-006` | `project management tests` |
| 24 | `EST-001` | `estimate route loading/query-error tests identified` |
| 31 | `EST-008` | `schema/db tests` |
| 36 | `DATA-001` | `project-data tests` |
| 40 | `COLLAB-002` | `collaboration invite tests` |
| 42 | `SHARE-001` | `project-publication-*.test.tsx` wildcard |
| 43 | `SHARE-002` | `project-publication-recipient tests` |
| 49 | `AI-002` | `draft/apply/memory/security/schema/read-tools tests` |
| 56 | `OPS-001` | `resend tests; support readiness tests; launch/readiness scripts` |

Patch recommendation: convert each generic label to exact repo paths and, where possible, a command/result tuple. Example format:

`tests/vitest/project-estimates-create-optimistic.test.tsx; tests/vitest/project-estimates-delete-duplicate.test.tsx; status=inventory-only; last_run=not run in this pass`

For rows where tests were only discovered, use `Testing Status = Inventory only; not executed in this pass` rather than implying mapped test proof.

### 5. Pathless test names are resolvable but weak for a canonical spreadsheet

Many evidence cells use basenames such as `auth-onboarding-contract.test.ts` instead of exact paths. A repo lookup resolved many of them under `tests/vitest` or `e2e`, so this is not a missing-file failure, but it is still weak canonical evidence.

Patch recommendation: normalize evidence references to exact paths:

- `auth-onboarding-contract.test.ts` -> `tests/vitest/auth-onboarding-contract.test.ts`
- `workshop-library-routes.spec.ts` -> `e2e/workshop-library-routes.spec.ts`
- `route-transition-performance.spec.ts` -> `e2e/route-transition-performance.spec.ts`

Do this for every test filename, not just the examples above.

### 6. Provider/manual gaps are mixed into test evidence

Several `Testing Status` cells correctly say provider or browser proof was not run, but the adjacent `Automated Evidence` cells still read like proof rather than inventory. Examples include live provider proof for legal, Resend, Maps, AI provider behavior, realtime, and operational readiness.

Patch recommendation: split proof state into structured columns:

- `Automated Evidence`
- `Evidence Status` with values such as `passed`, `inventory-only`, `known-red`, `provider-not-run`, `browser-not-run`
- `External Proof Needed`

This would preserve the useful caveats from `testing-loop-and-validation.md` while keeping the CSV machine-filterable.

## Gaps

- I did not run the referenced Vitest or Playwright suites; this lane verified spreadsheet quality, parseability, cross-document IDs, and evidence specificity.
- I did not edit canonical files by instruction. Recommendations above are patch targets for a later canonicalization pass.

## Risks

- If the CSV remains the stated canonical spreadsheet without structured issue IDs, severity, and evidence status, future agents can update the issue log or scenario tests without updating the CSV.
- Generic automated-evidence labels can be mistaken for executed proof even when the folder explicitly says this pass was source/test mapping and did not run broad automation.
