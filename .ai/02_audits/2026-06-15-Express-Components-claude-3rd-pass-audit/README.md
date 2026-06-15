---
title: Express Components — 3rd-Pass Verification Audit (Claude)
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
subject: .ai/03_plans/2026-06-15-Express-Components/ (at HEAD a110ea43, after remediation commits 7816be38 + a110ea43)
method: full revised-pack read + 7-lane parallel ground-truth Workflow (16 agents, adversarial cross-checking) @a110ea43 + orchestrator code spot-checks
relation: verifies the pack AFTER the pass-2 findings were applied; pass-2 audit archived at .ai/09_archive/store/2026-06-15-Express-Components-claude-readiness-verification-audit/
---

# Express Components — 3rd-Pass Verification Audit

## What this pass is

Between pass 2 and now, an applying agent rewrote the plan pack (commit `7816be38`,
+1,772 lines, all 14 docs) to absorb the pass-2 audit, added a new
`00-scope-and-premise-decision.md`, and archived the pass-2 audit. This 3rd pass:

1. **Verifies the remediation actually landed** — every pass-2 finding (V1–V14) and every
   strategic decision (S0.1–S0.3), checked against the revised docs *and* the live code.
2. **Goes deeper into the codebase than passes 1–2 did** — a 16-agent workflow with
   per-finding adversarial verification, every RPC cited at its *latest* `create or replace`
   (the explicit guard against the V1 stale-migration error class).
3. **Re-rates** readiness / strategy / quality and produces a tight, actionable fix list.

## The one-sentence finding

**The remediation is excellent — all 14 pass-2 findings and all 3 strategic decisions are
genuinely absorbed (absorption 92/100) with no false-positive repeats — but going one layer
deeper into the code exposed a coherent new class of issue the doc-only passes structurally
could not catch: the plan asserts several behaviors as already-handled that the codebase does
not actually have.** Five concrete examples (all adversarially confirmed against live code):

| The plan says… | The code actually… | Finding |
|---|---|---|
| "server actions/RPCs are authoritative; viewers cannot add/edit" (R14/AE10) | the 3 express write actions never call `assertCanEditEstimate`; the RPC checks only *membership* — **a viewer can write** | DB-N1 (P1) |
| "peers see the row through normal realtime/cache refresh paths" (doc 11) | has **no `postgres_changes` row sync at all** (staleTime 5min, `refetchType:'none'`) | SEC-N2 (P1) |
| "project-source copy rekeys `metadata.expressComponent.id`" (KTD2/U8/Q14) | the copy RPC copies metadata **verbatim** — no code rekeys it | BR-N2 (P1) |
| drag/drop move "preserves express fields" | the server `replace` RPC **wholesale-overwrites** metadata + source_snapshot | BR-N1 (P1) |
| promotion gate = "strict editor/admin… match library write policy exactly" | the real library-write policy **is** `is_workspace_editor` (member-inclusive) — the two instructions contradict | SEC-N1 (P1, fast-follow) |

These are not doc-quality defects; they are plan-vs-reality mismatches that would surface as
implementation surprises. They are all fixable, most with doc corrections plus a few real
code-gating tasks.

## How to read this package

| File | Contents |
|------|----------|
| `00-executive-summary-and-ratings.md` | Verdict, the three ratings (readiness/strategy/quality), the 66→78→84 trajectory, go/no-go. **Start here.** |
| `01-remediation-verification.md` | Every pass-2 finding (V1–V14) + S0.1–S0.3: applied-correctly / misapplied, with code evidence. Confirms the remediation; flags the V6 + V4b nuances. |
| `02-new-defects-master-table.md` | All 21 new findings (`DB-N*`, `BR-N*`, `UX-N*`, `CO-N*`, `SEC-N*`, `STRAT-N*`, `PERF-N*`, `DM-N*`, `OB-N*`), deduped, severity-ranked, with the plan-vs-code theme. |
| `03-day0-blockers-deep-dive.md` | Full evidence for the 6 day-0 P1s + the 2 day-0 coherence/strategy P1s. |
| `04-fast-follow-and-p2-findings.md` | The promotion-gate contradiction (fast-follow) + all 13 P2s. |
| `07-actionable-remediation-checklist.md` | The prioritized work queue, each finding → exact doc/section + fix. **The work list.** |
| `evidence/lane-scores.md` | 7 lane scores, the adversarial verdicts, and method notes. |

## Bottom line

The pack is now an unusually strong, document-complete, internally coherent plan whose core
architecture is verified sound. It is **not yet at "very close to perfect"** because of **6
day-0 P1s** (one of them a real authorization gap) and **~14 P2s** — but the list is now
narrow, concrete, and mostly doc-correction work. After this pass, the largest remaining risk
is not the plan's *quality* but its *fidelity to the codebase*: the implementer must treat the
five "plan-says / code-does" mismatches above as real work, not as already-solved.
