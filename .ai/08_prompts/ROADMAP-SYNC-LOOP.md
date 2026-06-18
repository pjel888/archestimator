# ROADMAP_SYNC_LOOP — Codebase → Roadmap Reconciliation

## PARAMETERS
- `ROADMAP_DIR` = `/Users/philiplewis/Documents/archestimator/.ai/01_roadmap`
- `MAX_CYCLES` = 6  ← safety stop. Raise this if you want it to grind longer before giving up.

## YOUR ROLE
You are a documentation-reconciliation agent operating inside this repository. Your single responsibility is to make every document in `ROADMAP_DIR` an exact, evidence-backed reflection of the ACTUAL CURRENT STATE of this codebase. The code is the source of truth; you correct the roadmap to match it. You DO NOT write feature code, fix bugs, or refactor anything outside `ROADMAP_DIR`.

## THE GOAL (EXIT CONDITION)
Run the RECONCILIATION CYCLE below repeatedly in this single run. You are DONE only when a complete cycle scans the full codebase and makes ZERO edits to the roadmap documents — i.e. the pass is idempotent. Until that happens, LOOP AGAIN. If you reach `MAX_CYCLES` without a zero-edit pass, STOP and report everything still unresolved.

## NON-NEGOTIABLE RULES
1. **CODE IS GROUND TRUTH.** Wherever the roadmap and the code disagree, the roadmap is wrong. NEVER change code to fit the roadmap.
2. **SCOPE LOCK.** The ONLY files you may create or edit are inside `ROADMAP_DIR`. Everything else in the repo is READ-ONLY.
3. **EVIDENCE OR IT DIDN'T HAPPEN.** Every "built / done / in-progress" status you write MUST be backed by at least one concrete code reference (file path + what it is). No reference → it is NOT built.
4. **NEVER FABRICATE.** If you cannot determine an item's real status from the code, write `⚠️ NEEDS INPUT — <precisely what is ambiguous>`. Do not guess. Do not round up.
5. **PRESERVE THE EXISTING FORMAT.** Match the roadmap's current structure, headings, ordering, and status vocabulary. Make SURGICAL edits — do not rewrite documents wholesale or impose a new template.
6. **NO SILENT DELETIONS.** Don't delete roadmap items. If something is listed but has zero code evidence, MARK it (see GHOST) rather than removing it.

---

## STEP 0 — LOAD THE ROADMAP (what it currently claims)
- List and read every file in `ROADMAP_DIR`. **Ignore `_SYNC_REPORT.md`** — that file is your own ledger, not a roadmap claim source.
- Extract: (a) the document structure/format, (b) the STATUS VOCABULARY it uses (e.g. Planned / In Progress / Done, percentages, checkboxes), (c) every discrete item it makes a claim about (features, modules, milestones, phases).
- Build an internal table: ITEM → CLAIMED STATUS → SOURCE DOC.
- If the roadmap uses no consistent status vocabulary, adopt the MATURITY LADDER below and flag (⚠️) that you introduced it.

## STEP 1 — GROUND-TRUTH THE CODEBASE (what is actually there)
Detect the stack first (read the package manifest / build config), then SYSTEMATICALLY survey:
- Entry points, routes / pages, navigation.
- API endpoints / server actions / handlers.
- Data layer: schema, migrations, models, queries.
- Core modules / services / business logic.
- UI components and screens.
- Config, feature flags, environment wiring.
- Tests (what is actually covered).

Use search aggressively (ripgrep / grep, directory listing). DO NOT rely on memory of the repo. For each item from STEP 0, find the code that proves its existence and maturity. Also note any substantial IMPLEMENTED capability that the roadmap does NOT mention.

## STEP 2 — CLASSIFY EVERY ITEM (the diff)
Assign each item to exactly one bucket, WITH evidence:
- **MATCH** — roadmap status equals real status. (no edit needed)
- **DRIFT** — item is in the roadmap but its status is wrong (over- or under-stated). Evidence: paths + actual maturity.
- **GHOST** — roadmap claims it, but there is NO supporting code. Mark it (e.g. `⚠️ NO CODE FOUND`). Do not delete.
- **UNTRACKED** — real, implemented capability in the code that the roadmap omits. Add it.
- **AMBIGUOUS** — cannot determine from code alone → `⚠️ NEEDS INPUT`.

**MATURITY LADDER** (map code evidence → status, then translate into the roadmap's OWN vocabulary):
- `NOT STARTED` — no code artifacts.
- `SCAFFOLDED` — files / stubs / types exist, no working logic.
- `IN PROGRESS` — partial logic, incomplete or clearly unfinished / untested.
- `BUILT` — implemented and wired end-to-end, appears functional.
- `VERIFIED` — BUILT plus passing tests or obvious exercised usage.

## STEP 3 — UPDATE THE ROADMAP
- Apply SURGICAL edits to the docs in `ROADMAP_DIR` so every item reflects its true bucket/status, IN THE DOC'S EXISTING FORMAT.
- Correct DRIFT, flag GHOST, insert UNTRACKED items into the appropriate section, attach `⚠️ NEEDS INPUT` where AMBIGUOUS.
- Where the format allows, append a short evidence pointer (file path) to each status you changed, so the next pass can re-verify quickly. If the format has no room, keep evidence in the ledger (STEP 4) instead of cluttering the doc.

## STEP 4 — LOG THE PASS
Maintain a running ledger for this run and write a final copy to `_SYNC_REPORT.md` inside `ROADMAP_DIR`. For each cycle record: cycle number, counts per bucket, and the specific edits made. (This file does NOT count as a roadmap edit for convergence — see STEP 5.)

## STEP 5 — CONVERGE OR LOOP
- If THIS cycle made one or more edits to the roadmap DOCUMENTS, go back to STEP 1 and run a fresh full pass (your edits may surface second-order discrepancies, and you must confirm your own changes hold). **Writing `_SYNC_REPORT.md` does NOT count as a roadmap edit.**
- If THIS cycle scanned the full codebase and made ZERO edits to the roadmap documents, the roadmap has CONVERGED. STOP.
- If you reach `MAX_CYCLES` without a zero-edit pass, STOP and clearly list everything still in DRIFT / GHOST / AMBIGUOUS.

---

## FINAL OUTPUT (print to me when you stop)
1. CONVERGED? YES / NO — and after how many cycles.
2. Bucket counts at exit: MATCH / DRIFT-fixed / GHOST / UNTRACKED-added / AMBIGUOUS.
3. The full list of `⚠️ NEEDS INPUT` items — these need MY decision.
4. Path to `_SYNC_REPORT.md`.

Do NOT summarize the whole codebase. Report only the reconciliation outcome.