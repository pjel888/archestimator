# LOOP LEDGER — Domain 12: Dependencies, Supply-Chain & Code-Health

Pack: `.ai/03_plans/2026-06-19-Launch-Readiness-Dependencies-Supply-Chain-Code-Health/`
Seeded: 2026-06-19 by the adversarial verifier + remediation planner.
Blast radius: LOW (build-graph + hygiene; one comment-only `src/**` touch in B2).
A dated LOOP_LEDGER is not strictly required at this blast radius, but is provided so
an implementer can continue without re-deriving context.

**LAUNCH-BLOCKER COUNT: 0.**

---

## DISCOVER
- Prior auditor produced `01-AUDIT-FINDINGS.md` (7 findings DEPS-01..07) + `00-README.md`.
- Domain scope: third-party deps, supply-chain posture, code-health hygiene for a
  pre-launch closed beta (no external users). DB-autonomy only in project
  `ebxxqidacheyapmmzavr`.
- Reconciled against prior packs: `2026-06-14-Codebase-Cleanup-Plan` (F20–F24 dep
  findings, §09) is the primary overlap; memory `supabase-types-not-pure-generated`
  covers DEPS-07.

## PLAN
- Adversarially verify all 7, then write remediation + evidence ledgers.
- Group remediation by coupling: A (one dep-graph PR: d3-shape add + d3/three/cva
  removal + stray-file delete), B (dep bumps + types.ts banner), C (watch/record).

## EXECUTE (this pass = verification + planning only; NO source edits)
- Re-ran: `git ls-files`, source greps (`three`, `cva`, `d3`, `d3-shape`, `as any`,
  `@ts-*`, boundary), `bun.lock` greps, `package.json` read, patch inspection,
  `bun outdated`, cleanup-pack §09 cross-check.
- Wrote `02-REMEDIATION-PLAN.md`, `03-EVIDENCE-AND-VERIFICATION.md`, this ledger.

## VERIFY (verdicts)
- DEPS-01 confirmed (low) · DEPS-02 confirmed (low; added exact-pin nuance) ·
  DEPS-03 confirmed (low) · DEPS-04 confirmed (medium, top item) ·
  DEPS-05 confirmed (low) · DEPS-06 confirmed (low) · DEPS-07 confirmed (info).
- Refuted: none. Severity inflation: none. Launch-blockers: 0.
- `existing_plan_overlap` claims re-checked against real cleanup-pack §09 rows
  (L9-16, 39-43) — all upheld. F23's `server-only` half DID ship (declared at
  `package.json:84`); the `d3-shape` half did not — the load-bearing remainder.

## RECORD
- Findings + proof gates + honest limits captured in `03-EVIDENCE-AND-VERIFICATION.md`.
- Key durable facts: charts depend on **undeclared** `d3-shape` (masked by transitive
  `d3`); `next/react/supabase` pins are **exact** (won't `bun update`); `@firecms/neat`
  is **MIT + Commons Clause** and the patch hits **minified** bundles; `bun audit`
  is NOT runnable in this env (advisory confirmation deferred to a networked run).
- On remediation landing, append a one-line entry to `.ai/10_state/current-state.md`
  and record the neat Commons-Clause owner ack in `.ai/10_state/decisions.md`.

## DECIDE (next implementer actions, in order)
1. **Group A** (single branch, single gate): A1 add `d3-shape`+`@types/d3-shape`
   BEFORE removing `d3`/`@types/d3`; A2 remove `three`/`@types/three`/`cva` (re-grep
   first); A3 `git rm test-table.tsx`. Gate: `bun install` → type-check → build →
   **charts render check** → scoped `test:dom`. Do NOT gate on full `validate`.
2. **B1** dep bumps via explicit pin edits; coordinate `@supabase/ssr 0.10→0.12`
   minor with **domain 1 (Auth)**; manual auth + Resend smoke.
3. **B2** add the hand-maintained banner to `src/lib/supabase/types.ts`.
4. **C1** record neat Commons-Clause owner ack in `decisions.md`; do NOT auto-bump
   neat to 1.0.1. **C2** hand exceljs watch to **domain 9 (Ops)**.
5. Run `bun audit` on a networked machine to close DEPS-02's advisory-confirmation
   gap before beta.

## OPEN OWNER GATES
- Accept Commons-Clause license use of `@firecms/neat` in a paid SaaS? (C1)
- Take the `@supabase/ssr 0.10→0.12` minor pre-beta, or hold? (B1, needs domain-1 sign-off)
