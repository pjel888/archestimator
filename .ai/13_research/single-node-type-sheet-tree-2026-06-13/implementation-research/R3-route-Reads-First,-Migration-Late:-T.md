# Reads-First, Migration-Late: The Silent-Drop Firewall

**Thesis:** Make every read path kind-agnostic and ship the layout/vocabulary win FIRST (all no-ops in prod because no node yet holds both), so the data-loss window is sealed shut before the forward-only migration becomes the only thing standing between users and mixed-content writes.

**Point of no return:** The first production write that creates a mixed-content node (a node holding both child nodes AND estimate_row_items), possible only after Phase 5 (migration) AND Phase 6 (write/create flow) are both live. Everything through Phase 5 is reversible: read fixes by git revert, and the DB by re-applying the old constraints — which still SUCCEEDS because no real data violates them yet (verified: no prod node currently holds both). The instant a beta user saves the first mixed-content node, re-adding the old validate_estimate_node_tree rows-must-be-area check and the area-row triggers FAILS on real rows; from then the only recovery is the pre-migration logical dump (Phase 5h, the sole artifact since PITR is off) plus a forward fix. Phases 0–5 are a clean-rollback corridor; Phase 6 is the trapdoor. The route deliberately front-loads ALL user-visible value into the reversible corridor (Phase 4) so the trapdoor opens last and carries the least surprise.

**Self-critique:** WEAKNESS 1 — Promise gap between Phase 4 and Phase 6. Layout/vocabulary ('Area' everywhere, rows-first mixed-content layout) ships before users can actually create mixed content. On all-area trees this is invisible, but a curious beta user who reads the new copy may try the new thing and find the create flow unchanged. Mitigation: keep Phases 4→6 close in calendar time, or hold the most suggestive empty-state copy ('add rows or sub-areas here') until Phase 6. I accepted this because the cohort is small and the data-safety gain of decoupling presentation from the irreversible write outweighs a brief cosmetic-only inconsistency.

WEAKNESS 2 — Phase 5 (irreversible DDL) ships with zero user-visible value, which is operationally unsatisfying and tempting to merge into Phase 6 to 'ship the win with the migration.' Merging them would be a real mistake: it couples the irreversible DDL and the first mixed write into one release, so a failure can't be attributed to migration vs write-flow, and it crosses the point-of-no-return and changes user behavior in the same step. My route eats a value-less release to keep the trapdoor (DDL) and the behavior change (writes) separately diagnosable and revertible-until-used. The cost is a third deploy and the discipline to NOT enable writes in the migration release — easy to violate under pressure.

WEAKNESS 3 — The entire thesis rests on 'no prod node currently holds both rows and children,' which makes Phases 1–3 no-ops and the Phase-5 migration cleanly reversible-until-first-write. I verified the read gates and the migration body (validate_estimate_node_tree carries exactly missing-parent + cross-tab + hierarchy + rows-must-be-area + cycle) but did NOT run a live prod query to PROVE zero pre-existing anomalies (orphaned rows, or data the current triggers tolerate but the rewritten validate_* surfaces differently). If that assumption is wrong, the Phase-5 dump is the only net and PITR is off. I added a HARD-GATE prod integrity pre-flight as the first step of Phase 5h, but it is a named assertion I am asking the team to run, not something I have already confirmed against prod data — so residual risk remains until that query returns clean.

---

## Route: Reads-First, Migration-Late — "The Silent-Drop Firewall"

### Core thesis
The central hazard is the data-loss window: the DB migration RELAXES constraints, but ~9 read paths still gate on `kind==='area'` and will silently drop rows or throw the instant a row lands on a non-area node. The verified facts that make a value-first route possible:

- The data/render substrate is ALREADY kind-agnostic (`buildEstimateTree` attaches rows to any node, `computeNodeTotal` sums own+children, `branch` renders a row table in every node). So read-path fixes are GATE DELETIONS, not new architecture (verified at the cited lines).
- TODAY no prod node holds both rows and children, so every read-path fix is a NO-OP in production — which means it is safe to ship early AND it is what makes the later migration cleanly reversible-until-first-write.
- The read-path fixes are MONOTONIC: they only ever cause MORE rows to be counted/rendered, never fewer. So they are safe to keep even if a later phase is reverted.

The route exploits all three: relax every read FIRST (Phases 1–3), ship the user-visible layout + vocabulary win SECOND (Phase 4) — still entirely pre-migration and 100% reversible — then run the forward-only DDL (Phase 5) with NO behavior change, and only LAST enable the writes that can actually create mixed nodes (Phase 6). The data-loss window opens only at Phase 6, by which point nothing can fall through it.

### The ordering and why it is minimal-safe

**Reads before the migration are mandatory, not optional.** Relaxing reads before allowing writes is a no-op in prod today, but it is the entire safety mechanism: once a write can place a row on a non-area node, every un-fixed read silently drops it (share understates the client total) or throws (optimistic row-move crash). So all of (a) is BLOCKING and must land before (b)+(c).

**The public share path is the single highest-risk read and goes first (Phase 1)**, alone, because `reconstruct-share-tree.ts:297` is the LIVE public/publication path that understates client-facing money. It must be incapable of silent drop before anything else moves.

**The migration must NOT carry the write flow.** Phase 5 relaxes the DB but withholds the create/write flow to Phase 6. This isolates the irreversible DDL from the first mixed write so each is independently diagnosable and the DDL stays reversible-until-used.

**Template moves in lockstep with the migration (constraint 5).** Phase 5 relaxes BOTH `estimate_nodes` and `estimate_template_nodes` and ships template-editor UI parity (f) in the same release, or `save-as-template` (actions.ts:768, which copies estimate subtrees into template tables and passes `kind` straight through) breaks the instant the estimate side allows rows-on-group while template triggers still reject them.

**The activity-scope fix (constraint 6) lands in Phase 3, pre-migration.** Verified: `EstimateSheetContent.tsx:413` is literally `includeDescendants: isGroup`, and the cache key at line 1006 is `node:{id}:{desc|direct}`. After unification `isGroup` disappears; deriving scope from has-children makes the cache key time-varying. Fixing it while the tree is still all-area avoids retroactively poisoning activity-history cache semantics.

**The brittle source-string tests are demolished first (Phase 0).** `live-estimate-node-route.test.ts` (138 source-string asserts) and `supabase-performance-migrations.test.ts` read source/migration text and break on token changes; they assert the two-kind contract we are removing. Neutralize them up front and replace with a golden-master numeric oracle (totals/share/export/snapshot for an all-area tree) that every later phase must reproduce — that oracle is how we PROVE no row or dollar is lost.

### Data-safety summary against the two named hazards
- **Data-loss window:** opens only at Phase 6. Sealed before then by Phases 1–3 making all reads kind-agnostic and non-throwing, while Phases 4–5 add zero write capability.
- **Forward-only migration:** the DDL (Phase 5) is cleanly reversible at the instant it lands (re-adding old constraints succeeds because no row violates them). It becomes irreversible only at the first Phase-6 mixed write. The pre-migration logical dump (h) — the ONLY artifact since PITR is off — is taken immediately before the Phase-5 prod apply, gated behind a Supabase-branch dry run and a prod integrity pre-flight.

### Point of no return
The first production save of a mixed-content node (possible only after Phase 5 AND Phase 6 are both live). Phases 0–5 form a clean-rollback corridor; Phase 6 is the trapdoor. The route front-loads all user value into the reversible corridor so the trapdoor opens last and carries the least surprise.