You are the lead implementation agent working inside the local Archestimator repository:

/Users/philiplewis/archestimator

Your job is to FULLY IMPLEMENT the approved plan pack at:

/Users/philiplewis/archestimator/.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates

covering four coupled features:

1. Multi-tab support inside every estimate (first-class `estimate_tabs`).
2. User-facing rebrand of "sheets" to "tabs" (and "estimate sheet" to "estimate").
3. Templates panel unification: custom templates + virtual project-derived sources.
4. Tab-aware XLSX export mapping estimate tabs to Excel worksheet tabs.

This is an IMPLEMENTATION pass. The planning pass is complete (verdict:
READY_FOR_IMPLEMENTATION_PLANNING_COMPLETE in 16_COMPLETION_AUDIT.md). Do not
re-plan, do not re-litigate decisions D-1 through D-15, do not produce more
planning documents. Produce working, validated, regression-free code.

================================================================================
STRICT EXECUTION CONTRACT — 100% OR NOT DONE
================================================================================

Your stop condition is NOT "some phases are implemented". Your stop condition is
ALL of the following, simultaneously true and evidenced:

 1. Every phase 0–8 of `10_IMPLEMENTATION_PHASES.md` has met its written
    Definition of Done.
 2. Every row of `13_REQUIREMENTS_TRACEABILITY_MATRIX.md` with status
    `planned` has been implemented AND verified (rows marked `deferred` or
    `product decision needed` are honored as deferred/default — they are NOT
    license to skip planned work).
 3. Zero NEW failures versus the Phase 0 recorded baseline across:
    `bun run validate`, `bun run build`, targeted Playwright specs, the RLS
    proof harness, and the export regression suites. All NEW tests you create
    are 100% green. The documented pre-existing red baseline
    (`.ai/10_state/current-state.md:60-68`; e.g. `tests/unit/reset-baseline.test.ts:54`)
    must not grow by even one failure; you are not required to fix it, but you
    must never hide behind it.
 4. Every edge case in the EDGE-CASE CATALOG below is covered by an automated
    test or an executed-and-logged manual QA step.
 5. All 9 denial scenarios in `08_ACCESS_SECURITY_RLS_PLAN.md` §7 are proven
    by tests/harness runs.
 6. The performance budgets in `02_TARGET_ARCHITECTURE.md` §12 are met
    (tab-switch query budget; templates-panel lazy-load call counts and
    outline p95 < 500 ms local; export 5×500 under 1.5 s / <10 MB buffer;
    single-tab workbook within 10% of the current benchmark).
 7. The release gate D-15 is honored: multi-tab creation/duplication is never
    user-visible before tab-aware export (Phase 6) is complete in the same
    release train; if shipping Phase 3 alone, hide create/duplicate controls
    and show the interim export banner per `07_XLSX_EXPORT_TABS_PLAN.md` §10.
 8. A final implementation completion audit (see COMPLETION AUDIT AND
    ARCHIVAL) proves every item above with command outputs, and `.ai` truth
    surfaces are updated.
 9. ONLY AFTER 1–8: the entire plan folder has been archived to
    `.ai/09_archive/store/2026-06-12-Projects-Auto-Added-To-Templates/`
    (see ARCHIVAL step — this is mandatory and is the very last action).

Do not ask the user for permission to proceed on anything local. Make
reasonable engineering decisions inside the plan's boundaries. The ONLY
legitimate pause points are the owner-gated provider actions listed in
PROVIDER/MANUAL PROOF BOUNDARY — and even at those, you must first exhaust all
remaining local work before pausing, and you must state exactly what
authorization is needed and what command will run.

================================================================================
AUTONOMOUS LOOP PROTOCOL — YOU MUST LOOP UNTIL 100%
================================================================================

You operate as a continuous improve-verify loop. Never end your run because a
phase "mostly works", because output is long, because a test is flaky, or
because you have been running for a long time. End only on the stop condition
above or a true owner-gated blocker.

OUTER LOOP (runs until the stop condition holds):
  1. SELECT the lowest incomplete phase (or the highest-value fix if a later
     phase exposed a defect in an earlier one).
  2. EXECUTE the inner loop for that phase.
  3. AUDIT globally: re-run the cross-cutting gates (validate, build, targeted
     suites) and re-read `13_REQUIREMENTS_TRACEABILITY_MATRIX.md`, flipping
     each completed row to `implemented` with evidence in your ledger.
  4. ADVERSARIAL PASS: act as your own reviewer (maker/checker separation per
     `AGENTS.md`): hunt for missed edge cases, permission gaps, copy-table
     residue, perf regressions, and untested branches in the code you just
     wrote. Anything found becomes new work items — loop again.
  5. If and only if every checklist in COMPLETION AUDIT passes, exit the loop
     and perform the ARCHIVAL step.

INNER LOOP (per phase; repeat until the phase DoD is met):
  implement → run the phase's validation gates → read every failure fully →
  root-cause (use systematic debugging; never patch blind) → fix → re-run →
  update the ledger. A failing gate is never a reason to move on; it is the
  next task.

ANTI-STAGNATION RULES:
  - Every iteration must produce a measurable delta (a passing test that
    failed, a new test, a fixed defect, a completed checklist item). If two
    consecutive iterations produce no delta, STOP repeating the same action:
    re-read the relevant plan doc section, re-read the live code, form a new
    hypothesis, and attack the root cause differently.
  - Never weaken, skip, or delete an existing assertion to make a gate pass,
    except where `09_TEST_AND_VALIDATION_PLAN.md` §10 explicitly schedules
    that test for a copy/structure update — and then only in the same commit
    as the source change it tracks.
  - Never mark a checklist item done without the command output that proves it.

DURABLE STATE (loops must survive context loss — per AGENT_FRAMEWORK_PROTOCOL):
  - Maintain a run ledger at
    `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md` updated
    every iteration: phase, iteration #, what changed, gates run with exit
    codes, failures remaining, RTM rows flipped, next action.
  - Per-phase run logs follow `.ai/05_logs/YYYY-MM-DD-<slug>-implementation-run.md`
    convention with branch/commit/dirty status, commands + exit codes, files
    changed, validation results, proof-boundary labels.
  - Commit in small, phase-scoped increments on feature branches
    (`feat/estimate-tabs-phase<N>-<slug>`) so progress is recoverable from git.

================================================================================
BEFORE CODING — PHASE 0 GATE (mandatory first actions)
================================================================================

Handoff note from the planning agent, binding:
"Before coding, run the plan's Phase 0 validation commands from
09_TEST_AND_VALIDATION_PLAN.md, especially lint/design checks, targeted Vitest
characterization suites, RLS harness tests, and export regression tests.
Provider/manual proof remains intentionally unperformed in this docs-only pass."

Concretely, in order:
 1. `git fetch --prune` · `git status --short --branch` · confirm a clean
    start; branch from current `origin/main`. Unrelated dirty files must not
    be staged, edited, or reformatted.
 2. Run and RECORD VERBATIM into the ledger (this is the baseline that defines
    "no NEW failures" for the entire run):
       bun run type-check
       bun run lint
       bun run lint:design-system
       bun run lint:design
       bun run test
       bun run test:dom
       bun run build
 3. Run the targeted characterization suites and record results (these protect
    the estimate sheet during all later phases):
       bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1
       bunx vitest run tests/vitest/perf --maxWorkers=1
 4. Run the existing export regression suites and record results:
       bunx vitest run tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts --maxWorkers=1
 5. RLS harness note: `scripts/prove-estimate-tabs-postgres.mjs` does NOT exist
    yet — Phase 1 creates it (cloning `scripts/prove-notification-rls-postgres.mjs`,
    which uses Homebrew Postgres 16, no Docker). From Phase 1 onward it is a
    standing gate. At Phase 0, optionally run
    `node scripts/prove-notification-rls-postgres.mjs` once to verify the
    harness pattern works on this machine.
 6. Confirm the plan pack is intact (17 files, 00–16) and re-verify five
    random file:line citations from `01_CURRENT_STATE_AUDIT.md` against live
    code (per `15_REVIEW_CHECKLIST.md` §9). If a citation has drifted, trust
    live code and note the drift in the ledger — do not halt.

Do not write feature code until steps 1–6 are logged.

================================================================================
MANDATORY READING ORDER
================================================================================

1. `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/00_INDEX.md`
2. `01_CURRENT_STATE_AUDIT.md` — repo reality + §16 terminology buckets + §17 keep-list
3. `02_TARGET_ARCHITECTURE.md` — decisions, diagrams, §12 performance budgets
4. `10_IMPLEMENTATION_PHASES.md` — your execution spine (authoritative DoDs)
5. `14_IMPLEMENTATION_HANDOFF.md` — execution contract, do-not-do list, proof boundaries
6. The per-domain doc for the active phase:
   `03_DATABASE_MIGRATION_PLAN.md` (Phase 1) · `04_DOMAIN_AND_REPOSITORY_PLAN.md`
   (Phase 2) · `05_ESTIMATE_TABS_UI_UX_PLAN.md` (Phases 3–4) ·
   `06_TEMPLATES_PANEL_UNIFICATION_PLAN.md` (Phase 5) ·
   `07_XLSX_EXPORT_TABS_PLAN.md` (Phase 6) · `08_ACCESS_SECURITY_RLS_PLAN.md`
   (Phases 1, 5, 7)
7. `09_TEST_AND_VALIDATION_PLAN.md` + `11_RISK_REGISTER.md` before claiming any phase done
8. `12_OPEN_QUESTIONS_AND_DECISIONS.md` — D-1..D-15 are settled; Q-1..Q-4 ride at defaults
9. Repo governance: `AGENTS.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`,
   `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`, `DESIGN.md`
10. The live code itself — the plan is dated 2026-06-12 @ `4289baff`; live code
    wins over any drifted citation.

================================================================================
BINDING DECISIONS (do not re-open)
================================================================================

D-1 first-class `estimate_tabs` (Option A) · D-2 no `tab_code` column in v1 ·
D-3 backfilled default tab named `Main` · D-4 route shape unchanged, tab derived
from node, no `/tabs/[tabId]` · D-5 tab-level access deferred (tabs inherit
estimate access) · D-6 new RPCs use strict `can_edit_estimate` · D-7 no
cross-tab node drag in v1 (toast + workarounds) · D-8 project-derived sources
hidden in the template editor in v1 · D-9 no rewrite of persisted "Sheet" names
or stored `sheet_*` event values · D-10 export = all tabs by default (Option C),
`?tab=` for active tab, single-tab byte-shape identical · D-11 project-derived
sources are virtual/read-through; persistence only via explicit "Save as
template" · D-12 `sheet_code` relabels to "Estimate code" · D-13 tab strip at
the top of the sheet center column · D-14 no feature flags; phased rollout with
wrappers · D-15 **release gate: no user-visible multi-tab creation before
tab-aware export ships in the same release train**.

Owner-question defaults (proceed with these unless the owner answers):
Q-1 marketing/landing copy stays as-is (product surfaces flip) · Q-2 default
tab name `Main` · Q-3 global Source Breakdown with a Tab column · Q-4
save-as-template conflicts prompt pre-filled with " (2)" suffix.

================================================================================
PHASE EXECUTION CONTRACT (summaries — 10_IMPLEMENTATION_PHASES.md is authoritative)
================================================================================

PHASE 0 — Baseline + citation spot-check (above). No product code.

PHASE 1 — Database tab foundation. Author migration M1 (estimate_tabs table,
RLS mirroring estimate_nodes, indexes incl. partial-unique default, nullable
`estimate_nodes.estimate_tab_id` + composite same-estimate FK, backfill,
proofs P1–P5, NOT NULL flip, unique-sort constraint swap to
`(estimate_tab_id, parent_id, sort_order)`, `validate_estimate_node_tree`
per-tab evolution, tab `*_with_history` RPCs with `can_edit_estimate`,
template-insert RPC tab fix, `estimate_sheet_events.estimate_tab_id`, guard
comment for the dormant snapshot/version RPC stack). Build
`scripts/prove-estimate-tabs-postgres.mjs` + `tests/vitest/estimate-tabs-schema.test.ts`.
Update `createEstimateWithDefaultTree` to create the default tab. App behavior
must remain byte-identical (smoke: open estimate, edit row, export).
LINKED APPLY + TYPE REGEN ARE OWNER-GATED — see PROVIDER BOUNDARY. Until
granted, code against locally-derived types behind the harness proof and queue
the apply; structure work so Phase 2 type needs are explicit.

PHASE 2 — Repository/domain tab support behind compatibility wrappers. New
types (EstimateTab, EstimateTabSummary, EstimateTabTree, EstimateWithTabs,
ReusableEstimateSource), query-key extensions (tabs / tabTree keys; legacy
areaTree alias), loaders (getEstimateTabs, getDefaultEstimateTab,
getEstimateTabTree, resolveEstimateTabRouteContext), tab CRUD actions, root
node create takes estimateTabId, reorder gains same-tab validation, mutation
invalidation re-keyed, per-tab selection/expansion store records, activity
composer `tab_*` labels. Wrapper-equivalence test: old loader output ≡ wrapper
output on single-tab fixtures. Characterization suites untouched and green.

PHASE 3 — Editor multi-tab UI. EstimateTabStrip (top of center column; WAI-ARIA
tablist; overflow scrolling; context menus; inline rename; keyboard reorder
Cmd/Ctrl+Shift+arrows; spring-loaded drop switching; focus fallback on delete;
live-region announcements), per-tab tree/selection/expansion, empty-tab state,
cursor tabId payload + render filter, per-tab URL continuity via the existing
replaceState path, last-tab delete refusal + default re-pointing, archived-tab
handling. Strip mounts OUTSIDE memoized row tables (perf suites are the
tripwire). D-15: keep create/duplicate internal-only until Phase 6 in the same
train. e2e scenarios 1–5. Design-system gate applies fully (≤12px explicit
sizes, regular/medium weights, rounded-xs, zero tracking, regular Phosphor).

PHASE 4 — Terminology rebrand. Apply the complete copy table in
`05_ESTIMATE_TABS_UI_UX_PLAN.md` §10. The typed deletion phrase flip
(`DELETE SHEET`→`DELETE ESTIMATE`) MUST change `ProjectEstimatesTable.tsx` and
`src/lib/mass-deletion/bulk-action.ts` tokens in the same commit. AI intent
regexes gain "tab" ADDITIVELY (keep matching "sheet"). Copy-coupled test
updates land in the same commits (list: `09` §10). Exit grep: remaining
`rg -i 'sheet' src/` user-facing residue = only the intentional keep-list
(Excel vocabulary, `Sheet` overlay primitive, construction materials,
marketing per Q-1).

PHASE 5 — Templates panel unified sources. `ReusableSourceDatum` union
(extends, never replaces, TemplatesTreeDatum), two-section tree (Custom
Templates / Projects with current-project affinity), lazy per-level reads via
RLS-scoped user clients ONLY (never admin client), server-backed search,
preview dock with live metadata (project/estimate/tab/node path/updated/row
count/total), new drag mime `application/x-archestimator-project-source` +
parser, ONE new SECURITY DEFINER RPC
`insert_estimate_subtree_into_estimate_with_history` (checks in order: source
`can_access_estimate` → target `can_edit_estimate` → same workspace → target
parent is group → post-copy validation; provenance metadata stamps;
`project_source_inserted` event), wrap-group flow parity for area targets,
save-as-template via `createEstimateTemplateFromEstimateNode`, action-matrix
divergence (project sources: insert/preview/save-as/open-in-project; NO
rename/delete/category ops — menu items absent, not disabled), browse-route
picker gains a Tab select, bulk mixed selection. All 9 denial scenarios proven.
Custom-template management suites stay green untouched.

PHASE 6 — XLSX export tabs. New `src/lib/proposal-export/worksheet-name.ts`
sanitizer (invalid chars []:*?/\, edge apostrophes, 31-char cap with dedupe
headroom, case-insensitive dedupe " (2)" deterministic by sort_order, reserved
names History/Summary/Commercial Terms/Source Breakdown, apostrophe-doubling
in `'{name}'!H{n}` refs). Multi-tab workbook: Summary first (per-tab blocks,
computed anchors), one bid-form worksheet per tab named after the tab,
Commercial Terms + Source Breakdown (+Tab column) global. SINGLE-TAB EXPORTS
MUST REMAIN BYTE-SHAPE IDENTICAL — existing pinned assertions in
`proposal-workbook.test.ts` / `proposal-export-route-workbook.test.ts` pass
UNMODIFIED for single-tab fixtures. Route: bare URL = all tabs; `?tab=` =
that tab in today's four-sheet shape; unknown/archived tab → 404; 413 ceilings
global. Filename gains tab slug only for `?tab=`. Preview dialog scope chips +
extended staleness signature. Benchmark 5×500 within budget. Clears D-15.

PHASE 7 — Hardening. Full test matrix, RLS harness, denial scenarios 1–9,
perf budgets verified, publication snapshot v1.2 (tabs additive) + v1.1
side-by-side rendering, two-browser cursor QA, manual QA list
(`05` §14 scenarios 1–10 desktop + 375px), invite deep-link QA, old-bookmark
export QA. Fix-forward until zero new failures.

PHASE 8 — Docs, rollout, cleanup. Update `.ai/10_state/current-state.md` and
`.ai/10_state/decisions.md` with the shipped reality. Shim deletion ONLY per
the gate in `04` §12 (grep-verified no callers; explicit all-tabs loaders in
export/snapshot/AI; stability window). Optional `EstimateSheet*`→`EstimateTab*`
rename batches ship WITH their source-contract test updates or not at all.
Evidence bundle assembled per `14` §9.

================================================================================
EDGE-CASE CATALOG — every item needs a test or a logged manual QA step
================================================================================

Tabs/data: last unarchived tab cannot be deleted/archived · deleting the
default tab re-points is_default atomically · duplicate-tab name collision
dedupe · empty tab (no nodes) renders empty state, accepts drops, root create
carries estimateTabId · archived tabs hidden by default, restorable, excluded
from export and `?tab=` 404s · tab with exactly the 1,200/3,000 load-limit
contents · concurrent row edit while switching tabs (per-row queues flush;
no cross-tab cache bleed) · optimistic tab create/rename/reorder rollback on
server failure · reorder RPC rejects cross-tab parents · backfill P1–P5 proofs.

Routing/URLs: old node-id URL → node's tab · old estimate-id URL → default
tab first area · URL of a node in tab B after switching from tab A (replaceState,
no reload) · invite deep link to an estimate-scoped invite lands correctly ·
Ask Flip URL regex still matches (route shape unchanged).

Rebrand: DELETE phrase client+server atomic (mass-deletion confirm works
mid-flip in neither half) · stored names `"… Estimate Sheet"` render unchanged
(D-9) · "sheet" residue grep = keep-list only · AI regexes match both "sheet"
and "tab" · e2e label assertions updated with copy (`text=Sheets`,
"Component sheet" family).

Templates panel: unreadable project/estimate/tab never listed (denial 1–3) ·
forged insert payloads fail closed, nothing written, no event (denial 4–5) ·
cross-workspace source rejected (denial 6) · source deleted between browse and
insert → typed error (denial 7) · stale preview vs re-read-at-insert · whole-tab
insert = all root groups, order preserved · insert into area target triggers
wrap-group · bulk mixed selection partial failure reported per unit ·
save-as-template from a source the user can read but whose project they can't
edit (allowed — read is sufficient) · single-tab estimate collapses the tab
level in the tree but payloads still carry tabId.

Export: tab named `[Bid]: Form/2026?` sanitized correctly · two tabs named
"Ground Floor" dedupe deterministically · 31+ char tab name truncated with
dedupe headroom · tab named `Summary` or `History` collides into dedupe ·
apostrophe in tab name escapes inside formula refs · single-tab workbook
byte-shape regression · multi-tab Summary cross-sheet refs resolve after
`ExcelJS.load` round-trip · >12 sections in one tab does not collide with the
grand-total block (computed anchors) · `?tab=` with archived/unknown/foreign
tab id → 404 · anonymous export → login redirect (denial 8) · 413 with
multi-tab totals over global ceilings.

Collaboration/snapshots: cursors never ghost across tabs (tabId filter) ·
presence payload additive · publication snapshot v1.2 renders AND a stored
v1.1 snapshot renders unchanged · share-page comment/decision anchoring
unaffected · activity feed shows tab_* events with correct labels and the tab
scope filter works; pre-tab events (NULL tab) render under the estimate scope.

================================================================================
DO-NOT-DO (hard rules — violating any of these is a failed iteration)
================================================================================

- Do NOT rename anything on the `01_CURRENT_STATE_AUDIT.md` §17 keep-list:
  `estimate_sheet_*` tables, `sheet_code`, RPC names, stored `sheet_*` event
  values, `EstimateSheet*` components/files (until Phase 8 batches),
  mass-deletion tokens (outside the atomic Phase 4 flip), localStorage keys.
- Do NOT touch the three "sheet" false-friends: ExcelJS/worksheet vocabulary,
  the `Sheet` overlay primitive (`src/components/ui/overlays/sheet-drawer.tsx`),
  construction-material strings ("sheet vinyl", "Sheet Membranes", unit "sheet").
- Do NOT run `supabase db push`, linked SQL, hosted type regen, Vercel deploys,
  or any provider-mutating command without explicit owner authorization in the
  run context. Project boundary: `ebxxqidacheyapmmzavr` only; never SlateCamp.
- Do NOT use the service-role/admin client for project-derived source reads or
  the new insert path.
- Do NOT parallelize vitest (`--maxWorkers=1` is load-bearing) or reorder the
  serial test config.
- Do NOT mount the tab strip (or any new provider) inside the memoized
  row-table subtree — the zero-re-render perf suites are correct when they fail.
- Do NOT weaken/skip/delete existing assertions to get green (see loop rules).
- Do NOT expose multi-tab creation to beta users before Phase 6 (D-15).
- Do NOT persist project-derived sources into template tables implicitly (D-11).
- Do NOT commit secrets, print env values, or stage unrelated dirty files.
- Do NOT claim provider/manual proof from local checks — label every claim
  `local-only` / `provider-proven` / `manual-proof-pending`.

================================================================================
PROVIDER/MANUAL PROOF BOUNDARY
================================================================================

Owner-gated (the only permitted pause points; queue them, keep working locally,
then request with exact commands):
  - Linked migration apply: `npx supabase@2.98.2 db push` + `migration list`
    (process per `.ai/00_system/VALIDATION_MATRIX.md:165-179`).
  - Type regeneration against the linked project
    (`npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts`);
    note the pre-existing stale-types diff (`profile_role_hardening_audit`) is
    expected.
  - `bun run launch:verify-hosted-export` against production.
  - Supabase advisor re-check; Vercel deploy/promote.
Manual proof (perform when a browser/spreadsheet is available; otherwise log
`manual-proof-pending` and surface it in the completion audit honestly):
  spreadsheet-app workbook inspection; two-browser collaboration QA; 375px
  responsive pass; old-bookmark export link. Workshop verification runs through
  the user's Chrome session; background tabs suspend the workshop; fresh
  worktrees need `.env.local` copied before dev servers pass login.

The unrelated advisory on `public.profile_role_hardening_audit` (RLS disabled,
grants revoked) stays OUT OF SCOPE unless separately authorized.

================================================================================
STANDING VALIDATION GATES (exact commands)
================================================================================

Per inner-loop iteration (scoped): the suites named for the active phase in
`09_TEST_AND_VALIDATION_PLAN.md` §8.
Per phase exit AND per outer-loop audit:
    bun run validate
    bun run build
    node scripts/prove-estimate-tabs-postgres.mjs        (Phase 1+)
    bunx vitest run tests/vitest/perf --maxWorkers=1     (Phase 3+)
    targeted Playwright specs (flag-gated; seed via service-role fixtures):
      bunx playwright test e2e/estimate-tabs.spec.ts e2e/workshop-template-insert-smoke.spec.ts e2e/workshop-project-specific-unlink-smoke.spec.ts
Definition of green: zero NEW failures vs the Phase 0 baseline; all new tests
pass; exit codes logged in the ledger.

================================================================================
COMPLETION AUDIT AND ARCHIVAL (the final loop exit — in this exact order)
================================================================================

1. Write `.ai/05_logs/2026-06-12-estimate-tabs-implementation-completion-audit.md`
   containing: the stop-condition checklist 1–8 each with command output
   evidence; the full RTM flip table (every `planned` row → implemented +
   evidence pointer); the edge-case catalog with per-item proof; denial
   scenarios 1–9 results; perf budget numbers; baseline-vs-final failure
   comparison; proof-boundary ledger (`local-only` / `provider-proven` /
   `manual-proof-pending` items enumerated honestly); remaining deferred items
   (D-5, D-7, D-8 follow-ups, R11.3) restated as future work.
   If ANY item fails → you are NOT done → return to the OUTER LOOP. Do not
   rationalize. Do not archive.
2. Update `.ai/10_state/current-state.md` (new top entry: estimate tabs
   shipped, what changed, evidence pointers) and `.ai/10_state/decisions.md`
   (tab architecture + rebrand decisions with dates; mark superseded items).
3. ARCHIVE THE PLAN PACK (mandatory, only now):
     git mv .ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates \
            .ai/09_archive/store/2026-06-12-Projects-Auto-Added-To-Templates
   (`.ai/09_archive/store/` is the canonical archive home per
   `.ai/00_system/ai-folder-canonical-map.md`; this satisfies "archive the
   whole plan folder into `.ai/09_archive`".) Then:
   - add a one-line pointer in the archived folder's new location or the
     archive README if the convention there expects it;
   - verify `.ai/03_plans/` no longer contains the folder and
     `git status` shows the move cleanly;
   - update any links in `.ai/10_state/current-state.md` you just wrote to the
     archived path.
4. Final commit(s) with the archive move included. Do not push or open PRs
   beyond the repo's normal flow unless the owner has asked.

================================================================================
FINAL RESPONSE REQUIREMENT
================================================================================

After the archival step, print a concise completion report containing:
- per-phase outcomes (0–8) with one-line evidence each;
- the stop-condition checklist 1–9 each marked with its proof reference;
- exact validation commands run in the final audit with their results;
- the proof-boundary ledger (what is local-only, provider-proven,
  manual-proof-pending);
- the archived plan path and the `.ai` truth-surface entries you updated;
- any deferred follow-ups restated.

If any stop-condition item is not satisfied, do NOT claim completion: state
NOT_DONE, list the exact failing items, and continue the loop. Honesty about
an incomplete state is acceptable; a false completion claim is not.
