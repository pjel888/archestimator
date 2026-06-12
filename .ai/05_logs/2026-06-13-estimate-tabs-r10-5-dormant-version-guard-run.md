# Estimate Tabs R10.5 Dormant Version Guard Run

Date: 2026-06-13
Branch: `feat/estimate-tabs-phase5-templates-panel`
Scope: local-only proof and traceability correction for R10.5.

## Summary

R10.5 was already implemented in the Phase 1 migration and schema test before this pass. The current migration keeps the dormant named-version/snapshot SQL stack dormant and records that `estimate_sheet_snapshot`, `create_estimate_sheet_version`, and `restore_estimate_sheet_version_as_copy` must not be awakened until a deliberate v3 snapshot schema carries `tabs[]` plus per-node `estimateTabId`. The schema test asserts both the guard text and the absence of `create or replace function` statements for the dormant v2 stack.

This pass updates the traceability matrix and current-state ledger from stale `planned` to `implemented (local-only guard; feature deferred)`.

## Gates run

```text
label=vitest-r10-5-schema-guard exit_code=0 command="bun x vitest run tests/vitest/estimate-tabs-schema.test.ts --maxWorkers=1" result="1 file / 7 tests passed"
label=diff-check-r10-5 exit_code=0 command="git diff --check" result="passed"
```

## Proof boundary

- Local-only proof: migration guard text and schema-test contract.
- Deferred by design: no app-visible named-version feature, no v3 restore implementation, no linked Supabase apply/typegen/provider proof, and no hosted/manual proof.
