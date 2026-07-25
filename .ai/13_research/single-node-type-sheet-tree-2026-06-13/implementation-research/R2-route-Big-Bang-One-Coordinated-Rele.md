# Big-Bang: One Coordinated Release Behind a Maintenance Window

**Thesis:** Ship the entire group/area collapse — reads, migration, writes, layout, rename, templates, tests — as ONE merge to main during a short maintenance window, fronted by a manual logical dump and fully rehearsed on a disposable Supabase branch, ordered internally so that code that makes reads safe is deployed before (or atomically with) the migration that allows the dangerous writes.

**Point of no return:** The first user-created mixed-content node after the maintenance window reopens (end of Phase 1, step 6). Up to and including the post-migration integrity check, rollback is clean: revert the app deploy and restore the pre-migration logical dump, because no production node yet holds rows on a non-area node, so re-adding the old area-only constraints/triggers still succeeds. The instant a real mixed-content node is written, constraint 2 (forward-only) bites — the old constraints will FAIL to re-apply on real data, and the dump becomes stale (restoring it would discard all post-reopen user work). There is no clean rollback after that point; recovery would be forward-fix only.

**Self-critique:** 1) Review quality is the weakest link. The Phase 1 PR is genuinely large (reads + migration + writes + layout + rename + templates + a full test rewrite), and big-bang's whole premise is 'fewest inconsistent states' — but that trades directly against reviewability. A subtle bug in a read-path gate-deletion (especially reconstruct-share-tree.ts:297 on the LIVE public share path) that the rehearsal smoke didn't exercise on the exact production data shape would ship straight to prod inside the atomic merge with no intermediate phase to catch it. The commit-stack mitigation helps reading but doesn't change that everything lands together. 2) The dump is a coarse rollback instrument and the rehearsal does not perfectly model production. Supabase PITR is off, so the ONLY rollback is a logical dump that is point-in-time as of the window open; if the integrity check is weak or misses an edge (e.g. an orphaned snapshot row, or a publication created mid-window), restoring it could itself lose data, and the Supabase-branch rehearsal runs on branch data that may not contain the gnarliest real cohort estimates. The route leans hard on the integrity check and the rehearsal being faithful — if either is shallow, the safety net has holes. 3) The 'reopen' decision is a single high-pressure human gate. All the data-safety hinges on NOT reopening until the migration, app, and integrity check all pass — but that is one judgment call under maintenance-window time pressure, and reopening one step too early (e.g. before confirming template triggers were actually relaxed, constraint 5) silently re-opens the data-loss window for save-as-template. There is no automated interlock forcing the order; it is a runbook discipline, which is the fragile part of any big-bang.

---

# Big-Bang Route: One Coordinated Release Behind a Maintenance Window

## Thesis
Collapse the estimate group/area distinction in a **single atomic merge to main**, executed during a short maintenance window for the small allowlisted beta cohort. The entire change set — read-path fixes (a), the forward-only migration (b), write/create-flow changes (c), layout (d), the 'Area' rename (e), template-editor parity (f), and the full test rewrite (g) — ships together, fronted by a manual logical dump (h) and **fully rehearsed on a disposable Supabase branch** before it ever touches production.

The big-bang is *acceptable here* for three concrete reasons grounded in the constraints:
- **The substrate is already kind-agnostic (constraint 8).** buildEstimateTree attaches rows to any node, computeNodeTotal sums own+children, and branch renders a row table in every node. So most of (a) is *deleting* a `kind==='area'` gate, not writing new architecture. Big-bang risk scales with how much *new* behavior ships untested; here the new behavior is mostly subtraction.
- **The cohort is small and a maintenance window is acceptable (constraint 7).** The forward-only hazard (constraint 2) is only dangerous *while users are writing*. A window lets us do the irreversible migration with writes frozen, so the irreversible step happens with zero concurrent user data being created.
- **Supabase branches exist (constraint 3).** We can rehearse the *entire* irreversible migration on a throwaway database, including a dump-restore drill, before committing.

The big-bang is *dangerous* exactly where this route concentrates its attention: the data-loss window (constraint 1) and the forward-only migration (constraint 2). Both are handled by **ordering inside the cutover**, not by feature flags (which constraint 4 rules out and which can't gate a trigger function anyway).

## The core safety argument: ordering, not flags
Constraint 1 is precise: relaxing the DB lets rows live on any node, but ~10 read paths still gate on `kind`/`Area` and will silently drop rows or throw. The decisive observation is that **relaxing reads before allowing writes is a safe no-op in production today** — no node currently holds both children and rows, so deploying the kind-agnostic reads changes nothing observable until a mixed node exists. That gives us a clean ordering inside the single release:

1. **Close the window** (freeze writes for the cohort).
2. **Take the final pre-migration dump** (h) against the now-frozen DB — this is the only rollback artifact since PITR is off.
3. **Deploy the new app build** — reads (a) are now kind-agnostic; still a no-op because no mixed node exists yet.
4. **Apply the migration** (b) to BOTH estimate and template tables in lockstep (constraint 5): drop active-kind checks, rewrite validate_estimate_node_tree + validate_estimate_template_tree to keep only missing-parent/cross-tab/cycle, drop both area-row triggers, relax insert_estimate_row_item_with_history + both template-insert group-target guards + the reorder hierarchy block.
5. **Run the post-migration integrity check** (row counts unchanged, orphan scan, function/trigger DDL matches expected). **This is the last clean abort point.**
6. **Reopen the window.** Only now can writes (c) create mixed-content nodes — and by this instant every read path and every template trigger is already correct.

At no production instant does a mixed-content node meet a stale read path or a stale template trigger. The data-loss window never opens.

## Why template lockstep is in the same merge
Constraint 5 makes the template side non-optional: save-as-template (component-library/actions.ts:768) copies estimate subtrees into template tables. If the estimate side allows rows-on-group but template triggers still reject them, save-as-template breaks the instant a user does it. So (b) relaxes template triggers and (f) ships the template editor UI in the **same** atomic merge. There is never a production instant where the estimate schema and template schema disagree.

## The activity-scope detail
Constraint 6 is folded into layout (d) in the same release: includeDescendants becomes a **stored, stable user choice**, never derived from has-children. Deriving it from child count would make the activity cache key `node:{id}:{desc|direct}` time-varying as children are added — a latent correctness bug. This is shipped together so the cache semantics are stable from the first mixed node onward.

## The brittle tests
Constraint 9: live-estimate-node-route.test.ts (138 source-string asserts) and supabase-performance-migrations.test.ts assert the two-kind contract by reading source/migration text. They **must** be rewritten in the same branch as (b)/(c) or CI is red on the merge — they are not a follow-up. (g) rewrites them to assert the one-kind contract and adds rows-at-any-depth parity, cycle + cross-tab regression on the rewritten validators, single-Add, and the stable-includeDescendants cache-key test.

## Rollback posture
- **Reversible zone:** everything up to and including the Phase 1 integrity check (step 5). Abort = revert the app deploy + restore the dump; re-adding the old constraints succeeds because no real mixed-content data exists yet.
- **Point of no return:** the first user-created mixed-content node after reopen. Constraint 2 then bites — old constraints fail to re-apply on real data, and the dump is stale. Recovery becomes forward-fix only.

## Honest verdict
Big-bang wins on the stated objectives — fewest intermediate inconsistent states (there is essentially one transition, behind a window), fastest total completion (one release, one review cycle, one window), and simplest mental model (the system is two-kind, then it is one-kind). It loses on reviewability and on having no automated interlock forcing the cutover order. That trade is defensible *for this cohort and this already-kind-agnostic substrate*, and would be reckless for a large live user base or a less-rehearsable migration.