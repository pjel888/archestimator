# Supabase type-reference retirement inventory

Generated: 2026-07-04T08:59:53.266Z

Non-destructive Supabase type-reference retirement inventory. This script reads active source, scripts, e2e, and tests only; skips supabase/** migration archaeology and .ai/** planning artifacts; and does not read environment files, mutate providers, deploy, or delete data.

## Readiness

| Gate | Status |
|---|---|
| allReferencesClassified | PASS |
| negativeImportGuardsSeparated | PASS |
| typeReferenceDeletionReady | PASS |

## Usage Kind Counts

| Usage Kind | Files |
|---|---:|
| type-import-fixture | 0 |
| schema-source-read | 0 |
| file-existence-guard | 0 |
| negative-import-guard | 2 |
| retirement-audit-tooling | 2 |
| historical-comment | 0 |
| unknown-reference | 0 |

## Blockers

- none

## Files

| File | Usage Kinds | Blocks Deletion | Retirement Action | Imported Types |
|---|---|---|---|---|
| scripts/generate-supabase-type-reference-retirement-inventory.ts | retirement-audit-tooling | no | keep-retirement-audit-tooling |  |
| tests/vitest/legal-terms-d1-store.test.ts | negative-import-guard | no | keep-or-generalize-negative-guard |  |
| tests/vitest/project-estimate-list-row-contract.test.ts | negative-import-guard | no | keep-or-generalize-negative-guard |  |
| tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts | retirement-audit-tooling | no | keep-retirement-audit-tooling | Database, Tables |
