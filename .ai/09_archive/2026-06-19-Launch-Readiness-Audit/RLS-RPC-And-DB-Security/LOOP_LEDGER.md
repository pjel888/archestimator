# LOOP_LEDGER — Launch-Readiness: RLS, RPC & DB Security (Domain 2)

Project: `ebxxqidacheyapmmzavr` · Opened: 2026-06-19 · Owner gate: Philip
Blast radius: audit = low (read-only). R1 remediation = **HIGH** (DB/ledger) → dated pack + Codex
review gate required if R1 is undertaken.

**Launch-blocker count (this domain): 0.**

---

## DISCOVER
- Inputs: prior auditor's `01-AUDIT-FINDINGS.md` + `00-README.md` (6 findings RLS-01..06).
- Re-read both from disk. Re-ran 16 live probes via Supabase MCP (see `03 §A`). Read every cited
  migration/source file. Swept all 14 `.upsert(` sites. Reconciled against
  `2026-06-01-security-owasp-compliance-audit`, archived `2026-06-13-Shared-Link-Improvement-Plan`,
  `migrations-pending-review/README.md`, and `current-state.md`.

## PLAN
- Adversarially verify each finding (refute by default), correct severity/overlap inflation, then
  write a prioritized remediation plan + evidence/proof-gate doc + this ledger.

## EXECUTE (verification pass — read-only, complete)
- RLS-01 drift: CONFIRMED. Ledger ≥20260618 = 0 rows; objects live. Overlap citation corrected
  (cited plan is archived; real tracker is `migrations-pending-review/README.md`).
- RLS-02 upsert grants: CONFIRMED info. Both UPDATE grants live; full sweep clean.
- RLS-03 SD search_path: CONFIRMED info. **0** live SD funcs without search_path (decisive).
- RLS-04 force RLS: **ADJUSTED**. Audit's example is wrong — **0** tables force RLS (not 1); the
  rate-limit table uses plain `enable`. Direction/severity (low, defer) unchanged.
- RLS-05 broad `true` policies: CONFIRMED info. Exactly 1 non-service_role `true` policy
  (`component_category_nodes` SELECT, intentional reference data).
- RLS-06 service-role provenance: CONFIRMED info. No client leak; dev bypass triple-gated.

## VERIFY
- Live ground truth: 55 tables, 0 RLS-disabled, 113 policies, 74 SD-exec WARN advisors (1 anon by
  design), 0 SD-without-search_path. No exploitable tenant-isolation defect found.
- Proof gates for R1/R2/R3 defined in `03 §C`, honest about local limits (no Docker → R1 needs a
  remote scratch branch; prove scripts need PG17; no live exploit attempted).

## RECORD
- Deliverables written (read-only on source; writes confined to this folder):
  - `02-REMEDIATION-PLAN.md` (R1 ledger/tree reconcile, R2 force-RLS deferrable, R3 upsert proof).
  - `03-EVIDENCE-AND-VERIFICATION.md` (verdicts + refutations + proof gates).
  - this `LOOP_LEDGER.md`.

## DECIDE (next actor)
- **Owner decision needed:** is the RLS-01 ledger/tree drift acceptable to defer past closed-beta
  launch (prod is correct; risk is only on `db reset`/branch-promotion/recovery, compounded by PITR
  off)? If yes → this can be a post-launch tracked item; if no → run R1 as a HIGH-blast-radius dated
  pack with Codex gate before launch.
- **If R1 proceeds:** start at `02 R1` step 1 (snapshot live truth), co-author with Domain 3 for the
  index objects, keep T4 P2 gated, prove via scratch-branch `db reset` zero-diff.
- R2 (force RLS) and R3 (upsert prove script) are post-launch / optional; not blockers.
- No `src/**` change anticipated for any item.

## OPEN QUESTIONS / RESIDUAL
- Local `prove:*` RLS scripts were NOT run this pass (need PG17) — implementer should run them as the
  regression gate.
- The anon DML grant baseline on `estimate_row_items` / `workspace_account_settings` /
  `user_onboarding_profiles` (RLS-02 nuance) is a Domain 3 hygiene backlog note, not a Domain 2
  blocker.
