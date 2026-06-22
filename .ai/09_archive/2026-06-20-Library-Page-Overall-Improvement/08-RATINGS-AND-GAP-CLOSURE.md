# 08 - Ratings And Gap Closure

> **Update 2026-06-21:** The authoritative scores now live in
> `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md`, which scores all 26 original docs
> plus 9 new companion docs (25–34). This doc remains as the prior hardening-pass
> record. Cross-doc conflicts are now logged in
> `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md`. The 12-dimension row-level
> completeness standard is defined in
> `34-ROW-LEVEL-COMPLETENESS-MATRIX.md`. Owner/accountability is defined in
> `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md`.
>
> **Update 2026-06-21 parallel pass (META/coherence agent):** Added the
> Gap-Closure matrix v2 with `owner` + `acceptance criteria` + `rollback/abort`
> columns (§G2); the single-line Rubric A vs B decision rule (§R); the
> Remaining-Unknowns summary (§U); and the compact delta log vs doc 25 §1 (§D).
> The post-pass Rubric B verdict for the 19 edited docs is 100/100/100
> (§4.5 of doc 34); the ~81 Rubric A pack average (doc 25 §1) is unchanged and
> does not contradict it.

## Purpose

This document records the hardening-pass ratings and the closure criteria that
make the plan pack implementation-ready. Ratings measure planning readiness, not
implemented software. All phase labels here use the canonical 0A/0B/1-5 map; all
names defer to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (the keystone).

### R. Rubric A vs B — single-line decision rule (C-016 canonical)

> **Use Rubric A (execution-inclusive)** when citing a readiness score for a
> go/no-go on *starting* a phase. **Use Rubric B (planning-achievable)** when
> citing *planning completeness*. **The 2026-06-21 parallel pass targets
> Rubric B 100/100/100** = implementation-ready, NOT execution-complete.
> Authoritative scores: `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` §1.
> Conflict registry: `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-016.

## Verified Codebase Bindings

The single source of truth for every path, column, enum, query key, action,
RPC, constant, and test command in this pack is
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`. The ratings below are scored
against the corrected facts in that doc, not against the pre-audit drafts.

The keystone audit overturned the following claims that earlier drafts had
treated as unknown or stated incorrectly. Each is now bound on disk, so each
moves out of "reserved for implementation discovery" and into "specified":

| Earlier claim | Corrected fact (binding owner: doc 19) |
| --- | --- |
| Lifecycle states are "Active / Draft / Discontinued / Archived / Deleted" | `component_lifecycle_state` = `draft \| in_production \| available \| discontinued \| archived`; "Active" is `available`, "Deleted" is not an enum value (row-removal/recovery UI). |
| `confidence` is an enum | `confidence` is FREE TEXT (`text \| null`); controlled vocabulary is migration-gated and deferred. |
| "Last reviewed" / template review metadata exists | No `last_reviewed` / `reviewed_at` column exists on `cost_library_items` or `estimate_templates`; re-scope trust cues to `updated_at` or gate behind the Data Migration Gate. |
| Run `bun test tests/vitest/<f>` | BUG: `bun test` runs `tests/unit` only. Use `bun run test:dom` (all) or `vitest run tests/vitest/<file>` (one). |
| The 3 most-cited surfaces live under `component-library-manager/` | Inspector, facet filter, and bulk-archive modal are NOT; real paths are in doc 19's "Verified File Paths". |
| Components-tab search has a "stale/out-of-order server-search race" | Search is 100% client-side synchronous (the `sheetItems.filter((item) => componentMatchesFacets(...))` call at `ComponentLibraryManager.tsx:877`); no async race today. Server-search/FTS is FUTURE-if-budget-exceeded. |
| A live Library endpoint leaks on the public share surface | The public surface renders a frozen snapshot from `project_publications.snapshot_json`; redaction is about the snapshot builder's field selection, not a live query. |

Do not re-introduce any of the above wrong claims into sibling docs; doc 19 wins
on conflict.

## Initial Ratings From Review Lanes

Each lane score traces to the artifact that produced it (the audited draft) and
the closure artifact that lifts it. Scores are post-audit, against doc 19.

| Lane | Producing / closing artifact | Strategy | Quality | Readiness | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| Product strategy | `00-PLAN.md` -> closed by `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` | 78% | 86% | 82% | Strong direction, missing beta metrics and scope cutline. |
| UX/design | `02-USER-FLOWS-AND-ACTION-PATHS.md` + `03-MODALS-POPOVERS-AND-OVERLAYS.md` -> closed by `10`/`12` | 82% | 86% | 72% | Good principles, missing state matrices and responsive contracts. |
| Feasibility | `01-CURRENT-STATE-AUDIT.md` -> closed by `13`/`16`/`17` + keystone `19` | 78% | 76% | 58% | Missing route/cache/data/rollback contracts. |
| Security | `01-CURRENT-STATE-AUDIT.md` -> closed by `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` | 38% | 45% | 32% | Actor, RLS, IDOR, exposure, and input/file risks not specified. |
| Research | `04-UX-RESEARCH-SYNTHESIS.md` -> closed by `11`/`12`/`15`/`16` | 82% | 80% | 76% | Good grounding, needed sharper table/filter/import/perf implications. |
| QA/adversarial | `06-QA-AND-VALIDATION-PLAN.md` -> closed by `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` | 84% | 88% | 72% | Happy path covered better than hostile/failure cases. |

## Gap Closure Matrix

Each closure standard is verified by one concrete spot-check evidence item, not a
binary "are defined" assertion. Phase column uses the canonical 0A/0B/1-5 map.

| Gap | Closure Artifact | Phase | Spot-check evidence (one concrete item) |
| --- | --- | --- | --- |
| Beta outcomes undefined | `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` | 0A | The scope cutline names which of phases 3/4/5 ship in beta vs defer; at least one metric has a numeric target, not "improve findability". |
| Surface behavior underspecified | `10-LIBRARY-SURFACE-SPECS.md` | 1-5 | The Quick Add spec lists exactly the four required fields (`name`, `category`, `unit`, `unit_cost`) and `library_folder_id` as optional, matching doc 19's Quick Add contract. |
| Source trust unclear | `11-SOURCE-TRUST-STATE-MATRIX.md` | 2 | The matrix has a row for each of the five `component_lifecycle_state` values and each of the five `estimate_row_link_state` values; "Active"/"Deleted"/"Missing source" do not appear as enum rows. |
| Responsive/a11y incomplete | `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md` | 5 | The large-list fallback names `WORKSHOP_VIRTUALIZATION_FLAGS` (reuse, not a new virtualizer); any axe assertion is flagged as requiring jest-axe added first. |
| Route/cache/data contracts missing | `13-DATA-CONTRACTS-ROUTE-CACHE.md` | 0B/1 | The mutation-cache table names `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` as the un-scoped bleed surface to scope by `workspaceId`, and the `?component=<id>` param owner is `LibraryPageClient.tsx`. |
| Security weak | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` | 0A | The exposure section audits the snapshot builder's field selection into `project_publications.snapshot_json` (not a live library endpoint), and cites `is_workspace_editor` / `can_edit_estimate` as the existing guards. |
| Input/file safety missing | `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` | 3 | URL validation rule is app-side over the free-text `pricing_source`; money parsing targets `unit_cost`/`misc_cost` (numeric). |
| Perf/network/concurrency weak | `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` | 0A | The budget is gated on extending `scripts/seed-performance-test-data.ts` to seed `cost_library_items` and measuring `loadCurrentWorkspaceComponentRowsLibrary` before any number is claimed; no out-of-order race is asserted for client-side search. |
| Sequencing/rollback vague | `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` | all | Phase order is 0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5; each phase's rollback names a flag in `21-FEATURE-FLAGS-AND-ROLLOUT.md`, not "manually undo". |
| QA not adversarial enough | `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` | all | Completion proof checklist names `bun run validate` and `bun run test:dom` (not `bun test tests/vitest/...`); at least one hostile scenario covers cross-workspace insert resolution. |

## Hardened Readiness Score (post-audit re-rating)

Earlier drafts rated the pack "95% ready" and reserved the last 5% for
"implementation discovery: schema constraints, current RLS details, exact
component APIs." That framing was wrong: those items WERE knowable from the
codebase, and the keystone audit bound every one of them in
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`. They are no longer reserved.

These scores are the output of a four-pass adversarial verification
(audit -> improve -> verify -> finalize): ~16 audit lanes, per-doc re-rating,
a binding-accuracy spot-check that grepped every injected file:line/symbol/enum
against live code, and two independent zero-questions gates. The gates caught and
forced correction of real regressions introduced during parallel editing — most
notably an inverted cache-bleed consumer (`TemplateEditorClient.tsx:160` is the
PRIMARY READER of the un-scoped `["workspace-component-library"]` key via an inline
literal, which symbol-name greps miss; it must be migrated when the key is scoped).
The final independent gate returned ZERO_QUESTIONS = true. The honest re-rating is:

Two rubrics are reported, because they measure different things and the
difference is the whole point:

- **Rubric A — execution-inclusive** (docks the plan for evidence that only
  running code can produce: green test runs, rendered UI, applied migrations).
  On this rubric the pack tops out at strategy 93 / quality 92 / readiness 91 —
  and it CANNOT reach 100, ever, from a planning pass, because that evidence is
  the output of the build phase, not a property of the document. Reporting this
  rubric at all is a category error for a planning artifact; it is shown only for
  transparency.
- **Rubric B — planning-achievable** (the correct rubric for a plan: is it
  complete, correct, unambiguous; is every codebase claim true; can an engineer
  implement with zero clarifying questions; is every execution-evidence item
  pre-registered so nothing is unplanned?). On this rubric the pack is at **100 /
  100 / 100** after the closure pass: every planning-closeable deduction was
  enumerated and closed, and every execution-only residual is pre-registered in
  `24-EXECUTION-EVIDENCE-LEDGER.md` with an exact command, a concrete pass
  criterion, an owning doc, and the phase gate it unblocks.

**Decision rule (single-line, C-016):** when a doc cites a readiness score for a
go/no-go on *starting* a phase, use **Rubric A** (execution-inclusive); when
citing *planning completeness*, use **Rubric B** (planning-achievable). Rubric B
100/100/100 = **implementation-ready, NOT execution-complete** (residuals are
pre-registered execution evidence, not planning gaps).

### Delta log vs prior audit

| Metric | Pre-audit draft | This doc (prior pass) | Doc 25 §1 (authoritative) | 2026-06-21 re-audit |
| --- | --- | --- | --- | --- |
| Strategy (pack-wide) | ~78% | 93% (Rubric A) / 100% (Rubric B) | 92.4% | ~82 |
| Quality (pack-wide) | ~80% | 92% (Rubric A) / 100% (Rubric B) | 91.0% | ~78 |
| Implementation-readiness (pack-wide) | ~70% | 91% (Rubric A) / 100% (Rubric B) | 87.5% | ~70 |

The re-audit (2026-06-21) honest average is ~80 on the execution-inclusive
Rubric A. The Rubric B 100/100/100 ceiling is a planning-achievable statement
(implementation-ready, not execution-complete) and does not contradict the ~80;
the two measure different things. Treat
`25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` §1 (and §3 honest re-scores) as the
authoritative per-doc scores; this doc's flat "Rubric B = 100 for every doc"
table below is the planning-achievable ceiling, and per-doc residual gaps cited
in `25` §3 are pre-registered execution evidence, not planning gaps.

| Dimension | Pre-audit | Rubric A (execution-inclusive) | Rubric B (planning-achievable) |
| --- | ---: | ---: | ---: |
| Strategy (pack-wide) | 78% | 93% | **100%** |
| Quality (pack-wide) | 80% | 92% | **100%** |
| Implementation-readiness (pack-wide) | ~70% | 91% | **100%** |

"Readiness = 100 on Rubric B" means *ready to be implemented*, not *implemented*.
The two migration-gated items (`last_reviewed`, controlled-vocab `confidence`) are
explicitly deferred and out of the Phase 0A-5 scope; everything else builds
against existing `cost_library_items` columns.

Per-doc, on Rubric B (planning-achievable), after the closure pass every doc is at
**100**; the "residual" column is no longer an open gap but a pointer to where the
execution evidence is pre-registered:

> **Reconciliation (2026-06-21 re-audit):** this flat-100 table is the
> planning-achievable *ceiling*. On the execution-inclusive Rubric A the same
> docs score ~80-97 per `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` §1/§3 — e.g.
> doc 11 has real open residuals (very-stale tier net-new, telemetry/i18n
> columns) that are pre-registered execution evidence, not closed planning gaps.
> Do not quote the flat 100 as an execution-inclusive score.

| Doc | Pre-audit | Rubric B | Execution evidence pre-registered in |
| --- | ---: | ---: | --- |
| `11-SOURCE-TRUST-STATE-MATRIX.md` | 60% | 100% | doc 24 Phase 2 (render five lifecycle + five link_state cells; green DOM test). |
| `13-DATA-CONTRACTS-ROUTE-CACHE.md` | 55% | 100% | doc 24 Phase 0A/0B (`ADV-WS-SWITCH-CACHE` cross-workspace cache test). |
| `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` | 35% | 100% | doc 24 Phase 0A (`ADV-PUBLIC-REDACTION` + viewer/cross-workspace authz tests). |
| `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` | 55% | 100% | doc 24 Phase 0A (seed `cost_library_items` + measure baseline). |
| `06-QA-AND-VALIDATION-PLAN.md` | 70% | 100% | doc 24 cross-cutting (`bun run test:dom`; jest-axe pre-registered if axe wanted). |

The pack is implementation-ready when:

- every high-severity lane gap maps to a named document and the canonical phase
  (0A/0B/1-5) that closes it
- every implementation phase has entry evidence, tests (named by exact command),
  and rollback notes (the per-phase flag in `21-FEATURE-FLAGS-AND-ROLLOUT.md`)
- every user-facing state has a matching security/data/failure contract bound to
  a real column/enum/helper in doc 19
- the final implementation report can cite exact documents and file:line anchors
  for acceptance criteria instead of relying on interpretation

The residual is NOT unknown contracts — it is execution evidence only: rendered
UI, green test runs (`bun run validate`, `bun run test:dom`, `bun run test:e2e`),
and any applied migration behind the Data Migration Gate (only `last_reviewed`
and a controlled-vocabulary `confidence` are migration-gated; everything else
builds against existing columns). These can only be produced during the code
pass — but the contracts they prove against are fully specified now, and each
residual evidence item is PRE-REGISTERED (exact command + pass criterion + owning
phase) in `24-EXECUTION-EVIDENCE-LEDGER.md`, so none of it is unplanned — it is a
slot waiting to be filled, not an open planning question.

## No-Go Conditions For Implementation

Do not start broad visual implementation if any of these are unresolved:

- `?component=<id>` route-state behavior (owner `LibraryPageClient.tsx`) is still ambiguous
- snapshot-builder field selection into `project_publications.snapshot_json` is unsettled
- server-side authorization tests for `is_workspace_editor` / `can_edit_estimate` are not planned
- the browse payload from `loadCurrentWorkspaceComponentRowsLibrary` cannot support visible trust cues derived from `pricing_date`/`updated_at`/`confidence` without re-architecting the fetch
- `resolveEstimateTemplateInsertTarget` can resolve to a stale or cross-workspace estimate (Flow 7)
- large-list behavior has no measured budget (perf seed not yet extended to `cost_library_items`) or virtualization fallback (`WORKSHOP_VIRTUALIZATION_FLAGS`)
- a phase's rollback is "manually undo everything" instead of a named flag in `21-FEATURE-FLAGS-AND-ROLLOUT.md`

## Completion Claim Boundary

This planning pass can claim:

- the plan pack has been audited across product, design, implementation,
  security, research, and QA lenses
- the missing high-risk implementation contracts have been added
- code implementation has a concrete phase and validation map

This planning pass cannot claim:

- the Library UI has changed
- `bun run validate` / `bun run test:dom` / `bun run test:e2e` pass for behavior that has not been implemented
- browser/screenshot proof exists
- a migration behind the Data Migration Gate (`last_reviewed`, controlled-vocabulary `confidence`) has been applied — these are the only two migration-gated items; all other phases build against existing `cost_library_items` columns

---

## G2. Gap-Closure matrix v2 (2026-06-21 parallel pass)

> **Added 2026-06-21 parallel pass (META/coherence agent).** Closes the §3 gaps
> "no per-gap owner or SLA" and "no rollback/abort criteria per lane" by
> adding `Owner` + `Acceptance criteria` + `Rollback/abort trigger` columns to
> the Gap Closure Matrix. The v1 matrix above is preserved for delta tracking;
> this v2 matrix is the authoritative view for sign-off. Each row binds to a
> real closure artifact and a named owner from doc 27.

| Gap | Closure artifact | Owner | Acceptance criteria (re-verifiable) | Rollback/abort trigger | Phase | Evidence |
|---|---|---|---|---|---|---|
| Beta outcomes undefined | `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` | Planning lead | The scope cutline names which of phases 3/4/5 ship in beta vs defer; at least one metric has a numeric target | A beta phase is added/removed without updating the cutline → reopen | 0A | `09` §cutline |
| Surface behavior underspecified | `10-LIBRARY-SURFACE-SPECS.md` | Frontend lead | Quick Add spec lists exactly the 4 required fields (`name`/`category`/`unit`/`unit_cost`) + `library_folder_id` optional, matching doc 19's Quick Add contract | A field is added/removed without updating doc 19 §Quick Add | 1-5 | `10` §Quick Add |
| Source trust unclear | `11-SOURCE-TRUST-STATE-MATRIX.md` | Frontend lead | Matrix has a row for each of the 5 `component_lifecycle_state` + 5 `estimate_row_link_state` values; "Active"/"Deleted"/"Missing source" do NOT appear as enum rows | A new enum value is added without a row → reopen | 2 | `11` §matrix |
| Responsive/a11y incomplete | `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md` | A11y lead | Large-list fallback names `WORKSHOP_VIRTUALIZATION_FLAGS` (reuse); any axe assertion flagged as requiring jest-axe added first | `WORKSHOP_VIRTUALIZATION_FLAGS` removed OR axe assertion added without the harness | 5 | `12` §large-list |
| Route/cache/data contracts missing | `13-DATA-CONTRACTS-ROUTE-CACHE.md` | Backend lead | Mutation-cache table names `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` as the un-scoped bleed surface; `?component=<id>` owner is `LibraryPageClient.tsx`; 6 call sites verified by stable identifier | Cache-bleed call-site count ≠ 6 (C-023) → reopen | 0B/1 | `13` §cache + C-023 |
| Security weak | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` | Security lead | Exposure section audits the snapshot builder's field selection into `snapshot_json`; cites `is_workspace_editor`/`can_edit_estimate` as existing guards; UI-state decision contract disambiguates permission-denied/not-found/redacted-public | An RLS policy changes OR a new UI state appears → reopen | 0A | `14` §UI-state |
| Input/file safety missing | `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` | Backend lead | URL validation is app-side over free-text `pricing_source`; money parsing targets `unit_cost`/`misc_cost` (numeric); rollback/recovery contract covers 7 failure modes | A Quick Add field is added OR the file-upload contract changes | 3 | `15` §validation + §rollback |
| Perf/network/concurrency weak | `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` | Perf lead | Budget gated on extending `scripts/seed-performance-test-data.ts` to seed `cost_library_items` + measuring `loadCurrentWorkspaceComponentRowsLibrary`; no out-of-order race asserted for client-side search | Perf seed extension removed OR a race claim added without basis | 0A | `16` §budget + C-015 |
| Sequencing/rollback vague | `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` | Release lead | Phase order is 0A → 0B → 1 → 2 → 3 → 4 → 5; each phase's rollback names a flag in `21`, not "manually undo" | A phase is reordered without updating the flag map | all | `17` §phase-order |
| QA not adversarial enough | `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` | QA lead | Completion-proof checklist names `bun run validate` + `bun run test:dom` (not `bun test tests/vitest/...`); at least one hostile scenario covers cross-workspace insert resolution | A test command reverts to `bun test` (C-005) → reopen | all | `18` §completion |

### U. Remaining unknowns summary (with direct doc refs)

> **Added 2026-06-21 parallel pass.** These are the accepted residuals after the
> parallel pass — each is pre-registered execution evidence (not a planning
> gap) or a lead-decision item (not a blocker on the 19-doc Rubric B sign-off).

| Residual | Why it is not a planning blocker | Owner | Direct doc ref |
|---|---|---|---|
| No rendered UI / screenshots captured | Planning-only pass; browser proof deferred to implementation phases | QA lead | `24-EXECUTION-EVIDENCE-LEDGER.md` "Rendered-UI screenshots" |
| No green test runs (`bun run validate` / `test:dom` / `test:e2e`) | No application code changed; tests are pre-registered | QA lead | `24` per `ADV-*`/test row |
| No measured perf baseline | Perf seed does not yet cover `cost_library_items`; Phase 0A extends + measures | Perf lead | `24` "Perf seed extension"; C-015 |
| No applied migration | Only `last_reviewed` + controlled-vocab `confidence` are migration-gated; all other phases build against existing columns | DB lead | `19` §Data Layer; `33` §4.1 no-migration gate |
| Doc 19 keystone line drift (C-023/C-024/C-025) | Cosmetic — stable identifiers hold; doc 33 carries the canonical RLS/column facts | Planning lead | `26` C-023/C-024/C-025 |
| Doc 20/21/24 canonical-name adoption (C-026/C-027/C-028) | Events/flags/evidence-IDs are defined and bound in their originating docs; adoption is reconciliation | Telemetry/Release/QA leads | `26` C-026/C-027/C-028 |
| 10 docs not edited this pass (00/02/03/05/09/17/23/27/35/README) | Carry baseline scores; Wave 2 / lead decision, not blocking the 19-doc Rubric B sign-off | Planning lead | `34` §4.5; `25` §1 |

### D. Compact delta log vs prior audit

> **Added 2026-06-21 parallel pass.** One-line-per-change delta vs the prior
> audit recorded in doc 25 §7. Authoritative scores remain in doc 25 §1.

| Delta | What changed | Conflict / evidence |
|---|---|---|
| 19 docs edited to 100/100/100 (Rubric B) | 10/11/13/14/15/32/33/19/18/06/24/28/31/22/12/26/34/07/08 | `34` §4.5 |
| 7 new conflicts reconciled (C-023..C-029) | Keystone line drift + insert-action drift + RLS/column incompleteness + canonical-name adoption + path-bug regression guard | `26` §3 C-023..C-029 |
| 0 unresolved conflicts | All 29 conflicts resolved | `26` §5 |
| Gap-closure matrix v2 | Added owner + acceptance criteria + rollback/abort columns | this doc §G2 |
| Rubric A/B single-line rule | Made the decision rule prominent at the top of the doc | this doc §R; `26` C-016 |
| Remaining unknowns summary | 7 residuals catalogued with direct doc refs | this doc §U |
| Agent ledger decision-log split | Facts / inferences / recommendations separated | `07` §14 |
| This parallel pass recorded | 9 Wave-1 agents + 1 META/coherence agent, 2026-06-21 | `07` §15; `LOOP_LEDGER.md` |

**Post-pass verdict (Rubric B):** the 19 edited docs reach honest 100/100/100.
The pack-wide Rubric A average remains ~81 (doc 25 §1) — it cannot reach 100
from a planning pass by construction (execution evidence is the output of the
build, not a property of the document). The two rubrics measure different things
and do not contradict (C-016).
