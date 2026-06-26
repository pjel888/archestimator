# 17 — Adversarial Review (Wave 2 · B1)

**Author**: B1 (independent; did NOT author any Wave 1 deliverable)
**Date**: 2026-06-25
**Method**: Read all docs 00–16; verified 12 file:line citations against `src/`; adjudicated the 3 lead-flagged contradictions; hunted more.

## 1. Assumptions Challenged (8)

**A1.** F-19's "P1, not P0" severity rests entirely on RLS correctness, which `13` §13.2 concedes was never read. If any `estimate_nodes` write policy has a gap, F-19 is effectively P0. Severity should be conditional on the F-10 audit, not fixed P1.

**A2.** The `_with_history` audit-trail claim ("one event per mutation") assumes RPC bodies never read (T-11 concedes "Medium pending"). `09` F-03 asserts "existing delete tests pass unchanged" when dropping a fetch whose result feeds the audit-correlated return shape — no evidence the audit row is independent of that fetch.

**A3.** Q-17 / T-09 dismiss LWW lost-update risk for v1 with zero AEC co-editing data. Philippines/SEA is the primary market; no observation cited.

**A4.** Q-20 "max depth 100" rests on "Construction estimates rarely exceed depth 10" — no AEC reference, no seed-data histogram. Cap is arbitrary though T-14 rates unbounded-depth residual "High".

**A5.** F-02's recommendation ("use `getEstimateTreeStructureSignature` plus a `name` field") is under-specified. I read the function (`estimate-tree-reorder.ts:220-234`): it serializes only `path:id` + `kind` — **no `name`, no `sortOrder`**. Recommendation adds `name` but is silent on `sortOrder`, so a reorder that only shifts `sort_order` would stop triggering `syncLocalNodesFromProps`. Target signature must be `(id, parent_id, kind, name, sortOrder)`.

**A6.** F-03 drops the pre-delete fetch without analyzing post-delete-RPC failure. Pre-delete projection currently backs the client's rollback; `09` F-03 "Regression risks: None" is an assertion.

**A7.** "Virtualization threshold 150" (`07` §7.4.2) is inherited, not measured. Could be 80 or 400.

**A8.** `13` §10's "6 decisions" is assumed complete — see O3, O4.

## 2. Omissions (6)

**O1.** No i18n / Unicode analysis for node names. F-IME is named in `02`/`03` but never gets an F-ID in `09`. Relevant for Philippines/SEA.

**O2.** No supply-chain / dependency risk (react-complex-tree, @tanstack/react-virtual, Radix). `14` excludes; `15` doesn't pick up.

**O3.** HIGH-band risk acceptances are orphans. `15` §4 names six (F-02, F-03, F-11, F-15, F-20, F-21) "requiring Philip's explicit acceptance" — none in `13` §10, none with a deadline in `12`. The acceptance surface is ~12 items, not 6.

**O4.** T-13 (share-token URL Referer leak) is net-new in `14` §6 but has no home in `12` or `13` §10. Security decision with no deadline.

**O5.** No CI enforcement for the perf budget (`13` §7). `bun run validate` doesn't enforce ≤16 ms / ≤2 UPDATE rows. Budget is advisory.

**O6.** No post-launch monitoring runbook. `11` §11.14 lists four "track" items with no owner/tool/threshold.

## 3. Contradictions (8)

**C1. P2 count (lead-flagged).** Truth is **14** (F-03, F-04, F-05, F-07, F-08, F-10, F-12, F-13, F-14, F-15, F-17, F-18, F-20, F-21). `09` Severity Summary says 13; `00` §4 says 13. `15` §2 footnote correctly keeps 14 rows. **Fix**: `09` + `00` must read 14. (P3 row has the mirror error: says 9, lists 8. Pack total 27 holds only because 14+8+5.)

**C2. `assertCanEditEstimate` location (lead-flagged).** Verified: function is at `src/lib/estimates/actions.ts:414` (grep returned nothing for `permissions.ts`). `14` T-04 citation is correct; `00` §11 and `13` §5 (`src/lib/estimates/permissions.ts`) are **wrong**.

**C3. Top-5 ordering (lead-flagged).** Both lists defensible; divergence already disclosed in `15` §3.1 ("canonical for launch gating, composite for sequencing"). Not a defect — but `00` §5 / `09` should add a footnote pointing at `15` §3.1.

**C4. NEW — Deadline mismatch `13` §10 vs `12`.** None of the six agree:

| Q | `13` §10 | `12` table |
|---|---|---|
| Q-06 | 2026-06-27 | 2026-07-08 |
| Q-11 | 2026-06-30 | 2026-08-15 |
| Q-14 | 2026-06-27 | 2026-07-28 |
| Q-19 | 2026-06-27 | 2026-07-28 |
| Q-20 | 2026-06-27 | 2026-06-30 |
| Q-22 | 2026-06-30 | 2026-06-26 |

`13` §10 is Wave-0 stale; `12` aligns with `09`. **Regenerate `13` §10 from `12`.** Largest single contradiction in the pack.

**C5. NEW — `01` §10 line numbers off by 67–87.** `createEstimateNode` cited L2102 vs actual L2035; `renameEstimateNode` L2141 vs 2130; `deleteEstimateNode` L2167 vs 2155; `deleteEstimateNodesBulk` L2243 vs 2187; `reorderEstimateTreeNodes` L1459 vs 1372. `01` §8 cites correct lines; `01` §10 contradicts §8 internally.

**C6. NEW — `insertEstimateTemplateIntoEstimate` citation.** `09` F-19 + `14` T-04 say "L2296". Function is defined at **L2281**; L2296 is the `assertCanEditEstimate` *call site* inside it. Ambiguous.

**C7. NEW — F-04 sibling count.** `09` says "50 siblings"; `13` §6 and `16` §3.7 say "30". `09` is the outlier.

**C8. NEW — `13` §9 contradiction audit is itself defective.** Claims "No unresolved cross-document contradictions found" and endorses the false P2=13. Given C1, C2, C4, C5, C7, that section is a false negative and must be rewritten.

## 4. Over-claims (7)

**OC1.** `13` §9 "no contradictions" is false — see §3 (8 exist, audit caught 0).
**OC2.** `14` "15 threats" inflates net-new. T-04/06/07/08/10/11/15 restate F-19/01/06/07/18/10/03. **8 of 15 are net-new** (T-01/02/03/05/09/12/13/14).
**OC3.** `09` ranks F-19 #3 "most consequential" while F-19 confidence is "Medium (depends on RLS)". Footnote the gap.
**OC4.** `10` Effort Summary "30–40 days" omits Phase 0.5 (~2–3 days). Real total **32–45**.
**OC5.** `11` §11.13 DoD ("All P2 resolved") vs `13` §6 ("≥10/13 fixed") — different bars, neither agrees on denominator (14 vs 13).
**OC6.** `00` §1 "production-quality feature" — marketing claim in a technical audit that found 5 P1s + a WCAG legal exposure + an unverified security backstop.
**OC7.** `13` §3.1 gives `09` Doc Quality = 92 despite count error + citation slips. 85–88 is more honest.

## 5. Risk Blind Spots (6 — absent from `14`/`15`)

**RB1.** Audit-trail *tampering* (editor mutating `estimate_sheet_events`) — T-11 covers absence only.
**RB2.** Scripted abuse / rate-limiting — T-15 covers DB cost, not a client firing 1000 creates/min.
**RB3.** Error-message info disclosure (`04` §4.10.3 shows raw RPC errors in toasts).
**RB4.** Share-recipient bulk scraping of pricing/supplier IP — T-01/03 cover access, not exfiltration volume.
**RB5.** Token rotation/revocation operational workflow — pack silent.
**RB6.** Client-side optimistic DoS — `isTreeMutationSaving` is the only barrier and it is client-side.

## 6. Testability Gaps (4)

**TG1.** F-19 acceptance in `10`: "`grep -c "assertCanEditEstimate"` in `actions.ts` = 6". Verified: file has **10** call sites today (9 in-action + `options.requireEdit` wrapper at L752); after fix ~14, never 6. Rephrase as a per-action body assertion.

**TG2.** F-26 acceptance ("decision recorded in `12`; index matches decision") is conditional on a top-vs-bottom decision not yet made. Blocked.

**TG3.** F-04 has two denominators (50 in `09`, 30 in `13`/`16`). Pick one.

**TG4.** T-13 has no acceptance criterion — "confirm acceptable for v1" is a decision, not a pass condition. Add: `grep -c 'Referrer-Policy.*no-referrer' src/proxy.ts` ≥ 1.

## 7. What Wave 1 Got Right

- `15` §2 footnote flags P2=13/14 honestly instead of silently "fixing" it.
- `16` M-02-before-M-03 ordering is sound (M-03's `numeric` arg requires M-02's `numeric` column); M-01 independent. Verified.
- `14` T-13 (Referer leak) is genuine net-new analysis.
- `10` Rollout table covers all phases; P3-ships-unflagged is disclosed, not hidden.
- 8 of 8 sampled finding citations (F-02/03/06/11/18/19/20/21) verified accurate against source. Findings stand; sloppiness is in citation precision and counts, not defects.

## 8. Required Fixes for PASS

**Hard blockers** (Wave 3 must fix before B2 scores ≥90):

1. **C1**: P2→14, P3→8 in `09` Summary + `00` §4.
2. **C2**: `permissions.ts` → `actions.ts:414` in `00` §11 + `13` §5.
3. **C4**: regenerate `13` §10 from `12` (or strike and point at `12`).
4. **C8**: rewrite `13` §9 to acknowledge C1/C2/C4/C5/C7 — current "no contradiction" verdict is false.
5. **TG1**: rephrase F-19 acceptance as per-action grep, not file-wide count.
6. **A5**: spell F-02 target signature as `(id, parent_id, kind, name, sortOrder)` — `sortOrder` is the missing piece.

**Soft findings** (recommend): fix C5/C6/C7; add T-13 to `12` (O4); acknowledge OC2; reconcile OC5; close OC4.

## 9. Verdict

**PASS-WITH-FINDINGS**

The pack is genuinely strong: findings are evidence-backed (8/8 sampled citations point at real defects), the implementation plan is phased and dependency-ordered, threat model and risk register add marginal value, and the migration plan's ordering logic is sound. Wave 1 closed real gaps (G-01, G-03, G-04, G-05, G-06).

But the pack cannot score ≥90 as-is. Six hard blockers remain: a false contradiction audit (`13` §9), a stale deadline table (`13` §10), a mis-located function (`00`/`13`), a mis-numbered severity summary (`09`/`00`), a non-binary acceptance (`10` F-19 grep), and an under-specified fix (F-02 signature). None require new analysis — all are corrections to existing text. Wave 3 can close all six in one pass.

After the six fixes, B2 should be free to score 88–93. The residual gap to 100 is honest: RLS unverified (A1), RPC bodies unread (A2), LWW unvalidated (A3), no runtime evidence, and RB1–RB6 are genuinely out of scope for a static-analysis pack.

---

**Counts**: 8 assumptions · 6 omissions · 8 contradictions (3 lead-flagged + 5 new) · 7 over-claims · 6 risk blind spots · 4 testability gaps.
**Hard blockers**: 6 (§8).
**Verdict**: **PASS-WITH-FINDINGS**.
