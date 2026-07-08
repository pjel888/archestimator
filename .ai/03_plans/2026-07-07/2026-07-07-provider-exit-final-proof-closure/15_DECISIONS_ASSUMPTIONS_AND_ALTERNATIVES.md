# 15 — Decisions, Assumptions, and Alternatives

## 15.1 Decisions (DEC-*)

### DEC-PE-01 — Closure is operator/hosted-proof-bound, not code-bound
- **Problem**: how to flip `providerExitReady` to true.
- **Constraints**: the 4 open gates require human/owner actions, not code.
- **Options**: (A) add code to auto-prove (impossible — gates need real
  persona/mailbox/export); (B) accept local evidence as proxy (rejected —
  violates evidence-class honesty); (C) document the operator procedure and
  mark externally blocked (chosen).
- **Advantages of C**: honest, safe, no mutation, gives executor a precise path.
- **Disadvantages**: closure outcome remains pending owner action.
- **Security/Performance/Ops implications**: none (documentation).
- **Recommended**: C.
- **Reason**: the gates are definitionally external; only C is truthful.
- **Conditions that would change it**: if a gate's evidence source became
  automatable (e.g., a hosted proof API), the procedure could add a step.

### DEC-PE-02 — No-mutation until decision; procedure is read-only
- **Problem**: risk of accidental provider mutation during closure.
- **Options**: (A) allow scoped mutation (rejected — out of bounds and
  unnecessary); (B) strict no-mutation procedure (chosen).
- **Reason**: `AGENTS.md` + PROMPT Constraints forbid mutating Supabase/Vercel/
  Resend; closure doesn't require mutation.

### DEC-PE-03 — Data-loss acceptance rule
- **Problem**: `accepted-loss` is generator-permissible by attestation alone.
- **Options**: (A) permit freely (rejected — unsafe); (B) forbid entirely
  (rejected — owner may legitimately accept loss of redundant migration
  source data); (C) permit only with owner acceptance + proven sole-runtime +
  export-attempt-or-provable-redundancy (chosen).
- **Reason**: balances owner authority with data-integrity honesty.

### DEC-PE-04 — Rollback posture is decision-dependent
- **Problem**: what rollback surface remains after closure.
- **Options**: (A) always preserve Supabase (rejected — owner may want to
  exit fully); (B) always no-rollback (rejected — unsafe default); (C)
  decision-dependent (`exported`→window, `retention`→Supabase, `loss`→none)
  (chosen).
- **Reason**: the export decision is the owner's to make; rollback follows.

### DEC-PE-05 — Recommended decision is `accepted-retention`
- **Problem**: which decision to recommend for OPEN-PE-01.
- **Options**: exported (more work, preserves window), accepted-retention
  (cheapest, preserves Supabase as rollback), accepted-loss (riskiest).
- **Recommended**: `accepted-retention`.
- **Reason**: lowest cost, lowest risk, no data-loss exposure, preserves
  rollback. Owner may override.

### DEC-PE-06 — Pack JSON is the single closure truth
- **Problem**: md and JSON could diverge.
- **Decision**: `providerExitReady` in the generated JSON is the only closure
  signal; the md is a rendering. Any discrepancy → JSON wins.

## 15.2 Assumptions (ASSUMP-*)

| ID | Assumption | Validated? | Source |
|---|---|---|---|
| ASSUMP-PE-01 | Last pack run (2026-07-05) reflects current gate state | yes | `rg -i supabase src/`=0 matches scan blockers=0 |
| ASSUMP-PE-02 | 5 upstream artifacts remain valid | assumed | generator trusts them; stale-revalidation covers drift |
| ASSUMP-PE-03 | Cloudflare free-tier posture unchanged | assumed | no paid add-on in `wrangler.jsonc` |
| ASSUMP-PE-04 | Operator record is the single source for operator gates | yes | generator `buildOperatorRecordDiagnostics` |
| ASSUMP-PE-05 | Worker is deployed at 100% traffic on `archestimator.com` | yes | deploy-source-smoke artifact + `current-state.md` |
| ASSUMP-PE-06 | `supabase/` is archaeology only (not runtime) | yes | `supabase/README.md` banner |

## 15.3 Open decisions (OPEN-*)

| ID | Decision | Why open | Options | Recommendation | Owner | Unblocks |
|---|---|---|---|---|---|---|
| OPEN-PE-01 | Supabase export/retention/loss posture | requires owner risk decision | exported / accepted-retention / accepted-loss | accepted-retention (DEC-PE-05) | Philip | providerExitReady (gate 7) |
| OPEN-PE-02 | Post-exit smoke run | requires operator to run commands | run now / defer | run after OPEN-PE-01 | operator | providerExitReady (gate 10) |
| OPEN-PE-03 | Non-owner Google proof vs deferral | requires real persona or owner deferral | real journey / accepted-deferral | deferral if persona unavailable; proof if feasible | Philip/operator | providerExitReady (gate 11) |
| OPEN-PE-04 | Recipient mailbox proof vs deferral | requires real mailbox or owner deferral | real receipt / accepted-deferral | deferral if mailbox unavailable; proof if feasible | Philip/operator | providerExitReady (gate 12) |
| OPEN-PE-05 | Independent review of this pack | emulated verification caps status | independent reviewer / owner accepts | independent review before merge | Philip | IMPLEMENTATION-READY status |

## 15.4 Alternatives considered and rejected

- **Re-implement the generator**: rejected — it works; documenting it is
  cheaper and safer than modifying gate logic.
- **Add a hosted-proof API call inside the generator**: rejected — out of
  scope (no mutation), and persona/mailbox proof is inherently human.
- **Cancel Supabase/Resend/Vercel as part of closure**: rejected — that is a
  separate owner action gated on OPEN-PE-01; this plan is no-mutation.
- **Use a branch/worktree for closure**: rejected — shared live worktree
  policy; closure edits one JSON file, coordinate via LOOP_LEDGER.
- **Skip the persona/mailbox gates via local evidence**: rejected — violates
  evidence-class honesty; only `accepted-deferral` with owner rationale is
  permissible.
