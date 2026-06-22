# Agent Execution Brief

Date: 2026-06-22

This brief is for future coding agents implementing this UX audit. It prevents scope creep, stale proof, and multi-agent conflicts.

## Mission

Implement one scoped implementation unit from `02-implementation-decomposition.md`, verify it with `06-verification-matrix-and-proof-runbook.md`, and update status only after evidence exists.

## Non-Negotiable Rules

1. This packet is the planning source, not proof that features are built.
2. Read the current source before editing; this repository has a dirty worktree and active concurrent work.
3. Do not revert unrelated changes.
4. Do not treat related tests as user-story proof.
5. Do not add new roles, migrations, approval states, provider surfaces, or support repair powers without the security/data blast-radius checklist.
6. Do not update `canonical-feature-status.csv` from intent; update only from evidence.
7. Do not run broad browser/provider proof unless the claim needs it.
8. Do not implement two conflict groups in parallel unless a lead owns integration.

## Start Checklist

Before editing:

- Pick one implementation unit from `02-implementation-decomposition.md`.
- Confirm its priority tier in `01-beta-product-thesis-and-prioritization.md`.
- Check its conflict group in `03-sequencing-dependencies-and-conflicts.md`.
- Identify required UX state/copy/a11y contract in `04-ux-state-accessibility-and-content-contracts.md`.
- Run the blast-radius checklist in `05-security-data-and-provider-blast-radius.md` if the unit touches auth, data, share, provider, AI, storage, support/admin, or logging.
- Choose the proof path from `06-verification-matrix-and-proof-runbook.md`.
- If editing the CSV, run `08-csv-schema-and-validation-contract.md` validation after the change.
- If the unit is decision-gated, check `09-decision-ledger.md` before coding.

## Performance Risk Handoff

Before editing any unit whose owner verification is `TV-ESTIMATE-SHEET`, `TV-PROJECT-DASHBOARD`, `TV-AUTH`, or `TV-SHARE-RECIPIENT`, read `13-performance-engagement-and-observability.md` §2 (known root causes) and §4 (per-surface risk handoff), and run the listed before/after perf script. These surfaces sit on known hot paths (estimate-sheet skeleton cascade + 5-RTT server path; hero/auth hosted-Supabase RTT; dashboard query batching; liquid-glass blur arming). A unit that changes these surfaces without a perf before/after measurement is not complete.

## Work Ownership Template

Use this template in implementation plans:

```text
Unit:
Issues:
Priority:
Conflict group:
Files expected:
Data/provider/security boundaries:
UX states/copy/a11y affected:
Perf budget / known risk (see `13-performance-engagement-and-observability.md`):
Tests/proof:
Status rows to update after proof:
Do not touch:
```

## Multi-Agent Collision Rules

| If you are working on | Do not let another agent concurrently work on |
|---|---|
| Collaboration permissions/invites | Field package, support repair, share recipient permissions. |
| Share/publication recipient | Share security headers, publication lifecycle, recipient events. |
| Library/cost governance | Attachment storage, accepted-cost state, supplier directory. |
| Project dashboard readiness | Publication lifecycle, owner approval, charts owner alerts. |
| Auth/account recovery | Beta admin, invite repair, workspace membership repair. |
| Provider readiness scripts/docs | CSV proof status, operations dashboard, monitoring claims. |
| CSV/schema/status | Any proof lane that has not completed. |

## Stop Conditions

Stop and report instead of coding when:

- The unit's scope posture in `02-implementation-decomposition.md` is `Decision required` (or it is linked to a `DEC-UX-*` row) and `09-decision-ledger.md` does not record an `Accepted for MVP` or `Accepted as lightweight first step` decision with named guardrails. (`Decision required` is a doc-02 scope-posture value and a doc-09 state — check doc 02 and doc 09, not the CSV.)
- The implementation would create a new permission role, migration, table, enum, RPC, storage bucket, or provider integration and no data/security plan exists.
- Current source contradicts the audit packet.
- A required provider credential or hosted target is missing.
- Another active change already touches the same conflict group.
- Proof would require destructive, production, paid, or cross-provider action not explicitly authorized.

## Completion Evidence

A future implementation is complete only when it can show:

- Files changed.
- Issue IDs and story IDs addressed.
- User-visible behavior before/after.
- Tests/proof run with result.
- Browser/provider/manual proof gap if skipped.
- CSV status update or explicit reason no status changed.
- No unresolved conflict-group collision.

## Status Update Wording

Use these meanings:

- `Source evidence only`: code path exists, no user-story proof.
- `Concrete local tests identified`: test file exists but was not run in the current pass.
- `Local targeted proof passed`: targeted test was run and passed for the row claim.
- `Browser proof passed`: real browser/user journey was run and passed.
- `Provider proof passed`: hosted/provider/manual artifact proves the provider claim.
- `Blocked`: proof or implementation cannot proceed without a named missing input.

If the exact wording is not already in the CSV contract, update `08-csv-schema-and-validation-contract.md` before using it.
