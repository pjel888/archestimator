â Estimate Master Column (EMC) Improvement Plan â complete

A comprehensive planning / audit / readiness pack now lives at .ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/ â 10 documents, ~2,900 lines, every claim anchored to a real file:line, adversarially reviewed and fixed. No code was changed.

How it was built (ultracode orchestration)

- 27 agents across 3 workflows: 7-perspective investigation â 8 doc writers â 2 adversarial reviewers â 8 parallel fixers (~3.3M tokens).
- Both reviewers returned ready-with-fixes; all blocker/major/minor fixes applied and verified (cross-links resolve across all 10 docs, blocker test-matcher corrected, doc 07â08 ordering contradiction reconciled).

The document set

ââââââââââââââââââââââââââââââââââââââ¬ââââââââââââââââââââââââââââââââââââââââââââââââââ
â                Doc                 â                     Purpose                     â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 00-README                          â Index + plan-pack metadata + requirement        â
â                                    â traceability                                    â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 01-CONTEXT-AND-ARCHITECTURE        â Entity model (Tab â Node â Row â Component), P6 â
â                                    â  single-node model, file map, shared seams      â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 02-CRUD-CAPABILITY-MATRIX          â Req 4 centerpiece â 49-operation master matrix  â
â                                    â (29 works / 7 partial / 6 broken / 7 missing)   â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 03-UXUI-AUDIT                      â Spacing scale, disclosure UX,                   â
â                                    â typography/color/borders, accessibility         â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 04-FEATURE-READINESS-AND-BUG-AUDIT â Caret-bug root cause + truth table, edge-case   â
â                                    â catalogue                                       â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 05-PERFORMANCE-AUDIT               â Memoization map, perf guards, per-change        â
â                                    â neutrality proofs                               â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 06-DATABASE-AND-NETWORK-AUDIT      â Schema, persistence per mutation, the DBNET-1   â
â                                    â blocker                                         â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 07-BLAST-RADIUS-AND-RISK           â Shared seams, breaking-test map, risk table     â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 08-IMPLEMENTATION-PLAN             â Phased, TDD-first, committable tasks with real  â
â                                    â code                                            â
ââââââââââââââââââââââââââââââââââââââ¼ââââââââââââââââââââââââââââââââââââââââââââââââââ¤
â 09-OPEN-DECISIONS                  â Consolidated register OD-1â¦OD-19 with           â
â                                    â recommendations                                 â
ââââââââââââââââââââââââââââââââââââââ´ââââââââââââââââââââââââââââââââââââââââââââââââââ

What the audit found

Your three named issues are all real â and #3 is a deeper bug:
1. "Own items" (branch.tsx:241-248) only renders on mixed nodes, so removing it there removes it entirely â safe and presentational. â ï¸ The charts "Own items" leaf (aggregate-project-charts.ts:300-309) is a separate money-attribution surface and must not be deleted with it.
2. Spacing "feels bad" partly because groupGap's rhythm is dead code â usesSiblingGroupRhythm is never threaded through the recursion, so every nested node collapses to mt-0.
3. Missing carets = a genuine bug with a deeper cause: the caret gates on hasChildren only (branch.tsx:182), so a rows-only node (the most common node under your single-node model) can't be collapsed. The fix keys off hasContents and is perf-positive (collapsing unmounts the heavy table).

The matrix surfaced 5 more bugs you didn't ask about:
- ð´ Insert kind-gate (P6 violation): insertLibraryItem silently no-ops on group-kind nodes (EstimateSheetContent.tsx:1649) â add-row/insert/drop all fail with no toast.
- ð´ DBNET-1 (P0 readiness blocker): the committed insert RPC still hard-codes kind='area'; prod is believed relaxed but unverified â a fresh/CI apply would reject mixed-node inserts.
- ð  No canEditEstimate UI gating on the left tree / EMC rows (server-only).
- ð  Phantom row-reorder grip (row-table.tsx:201-204) â looks draggable, isn't.
- ð  Destructive clear-on-failed-drag (cells.tsx:151-154) â a cancelled drag deletes the component.

Your next decision

Walk 09-OPEN-DECISIONS â the one genuinely blocking item is OD-9 / DBNET-1 (confirm prod RPC + land a committed relax migration before lifting the client kind-gate). The presentational fixes (Reqs 1â3) need no DB change and can proceed once you approve the 08-IMPLEMENTATION-PLAN phase ordering (R3 caret â R1 label â R2 spacing â R4 CRUD).

A project memory pointer was saved and the pack is registered in .ai/03_plans/README.md.