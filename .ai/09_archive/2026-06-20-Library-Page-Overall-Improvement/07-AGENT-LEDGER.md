# 07 — Agent Ledger

> **Status:** Living document. Records the agent skills, parallel lanes,
> source evidence, and validation steps used to produce the Library Page
> Overall Improvement plan pack. **Updated 2026-06-21 parallel-agent pass**
> (META/coherence agent: recorded the 9-agent pass, added §1.5 evidence
> commands, §9.5 drift-check trigger, §13 decision-log split).
>
> **Scope:** Provenance, not product spec. Every codebase binding asserted here
> is reconciled against `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (the
> keystone); defer to that doc for authoritative
> file/column/enum/query-key/server-action/RPC lists.
>
> **Companion docs:** [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md),
> [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md),
> [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md),
> [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md).
>
> **Ledger owner:** Planning lead. **Phase:** all. **Drift trigger:** see §9.5.

---

## 1. One-row claim summary

| Claim | Owner | Evidence | Phase | Status |
|---|---|---|---|---|
| This plan pack is planning-complete (implementation-ready, not execution-complete) per Rubric B — 19 docs edited in the 2026-06-21 parallel pass reach 100/100/100 on Rubric B (§4.5 of doc 34). | Planning lead | `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` §1 (authoritative scores); `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` §4.5 (post-pass matrix); `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` §5 (29/29 conflicts resolved, 0 unresolved). | all | **closed for Rubric B** on the 19 edited docs; execution residual pre-registered in doc 24; docs not edited this pass (00/02/03/05/09/17/23/27/35/README) carry baseline scores for Wave 2 / lead decision. |

### 1.5 Evidence commands (close-the-gap recipes)

> **Added 2026-06-21 parallel pass.** These are the exact commands that fill
> the pre-registered execution-evidence slots in doc 24. Run them during the
> implementation phases (not during planning). Each has a pass criterion.

| Gap | Command | Pass criterion | Owner | Phase | Evidence row |
|---|---|---|---|---|---|
| Screenshot / browser proof | `bun run test:e2e -- --grep '<scenario>'` + capture `playwright-report/` artifacts | screenshot exists in `playwright-report/` for each ADV scenario; no `expect()` failures | QA lead | 0B/1/5/6 | doc 24 "Rendered-UI screenshots" + per-ADV rows |
| DOM test (jsdom) | `bun run test:dom` (all) or `vitest run tests/vitest/<file>` (one) | exit 0; no failed assertions | QA lead | 0A–6 | doc 24 per `ADV-*`/test row |
| Perf seed extension | `bun run scripts/seed-performance-test-data.ts` (after extending it to seed `cost_library_items`) | seed completes; `cost_library_items` has N rows in the test workspace | Perf lead | 0A | doc 24 "Perf seed extension" |
| Perf baseline measurement | `node scripts/bench-hero-browser.mjs` (or equivalent) after seed | baseline JSON in the evidence dir; numbers within doc 30 budget | Perf lead | 0A | doc 24 "Perf baseline measurement note" |
| Cache-bleed cross-workspace test | `vitest run tests/vitest/<cache-test>` | `ADV-WS-SWITCH-CACHE` passes; no cross-workspace leak | Backend lead | 0A | doc 24 `ADV-WS-SWITCH-CACHE` |
| Public-redaction test | `vitest run tests/vitest/<publication-test>` | `ADV-PUBLIC-REDACTION` passes; `pricing_source`/`confidence`/price history absent from `snapshot_json` | Security lead | 0A | doc 24 `ADV-PUBLIC-REDACTION` |

> **Per-row gate-row footer** (this ledger's own gate rows):
> Owner: Planning lead | Phase: all | Flag: n/a | Rollback: n/a | Evidence: EV-PLAN-07 | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` Appendix

---

## 2. Workflow mode

| Statement | Interpretation |
|---|---|
| This was a planning-only goal. | No application code was changed. All execution evidence is pre-registered in `24-EXECUTION-EVIDENCE-LEDGER.md`. |
| Codebase bindings are reconciled to doc 19. | Every path/enum/query key/action/RPC cited below resolves to a verified `src/` binding; if doc 19 changes, this doc must be re-verified (see §6 Drift Check). |
| External orchestration workflows (OMX, `ultragoal`, `autopilot`, `autoresearch`) were treated as planning inputs. | No live OMX/orchestration CLI state was exposed, so no duplicate goal was created. The active Codex goal plus this repo-local pack were the authoritative boundary. |

Owner: Planning lead | Phase: all | Flag: n/a | Rollback: n/a | Evidence: EV-PLAN-07 | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: n/a

---

## 3. Skills and surfaces used

| Requested surface | Applied how | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `product-design:index` | Loaded as router for product-design task selection. | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| `product-design:audit` | Loaded and applied as a source-grounded UX audit. Screenshot capture recorded as deferred execution evidence. | Design lead | 5 | n/a | n/a | EV-DESIGN-05 | n/a | n/a | see `31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md` | n/a | Playwright | n/a | n/a |
| `product-design:design-qa` | Intentionally skipped — no mockup/prototype source provided for source-vs-implementation QA. | Design lead | n/a | n/a | n/a | EV-DESIGN-05 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| `Explore Codebase` | Targeted source inspection plus graph index stats. | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` |
| `compound-engineering:ce-frontend-design` | Applied to design thesis, density, interaction, and verification policy. | Design lead | 1, Phase 5 dense-mode subtrack (formerly 5b) | n/a | n/a | EV-DESIGN-01 | n/a | n/a | see `31` | n/a | Playwright | n/a | n/a |
| `impeccable` | Loaded; context script and detector ran, returned `[]` for scoped Library targets. | Design lead | 1, Phase 5 dense-mode subtrack (formerly 5b) | n/a | n/a | EV-DESIGN-01 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| `design` | Existing `DESIGN.md` treated as guidance, not rewritten (alpha-stage guide, not law). | Design lead | all | n/a | n/a | EV-DESIGN-01 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| `ultrawork` / `ultraqa` / `ultragoal` / `autopilot` / `autoresearch` | Provenance only: orchestration concepts applied through parallel evidence lanes and adversarial matrix in `06-QA-AND-VALIDATION-PLAN.md`. No live runtime launched; no dynamic E2E run because no implementation changed. | Planning lead | all | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

---

## 4. Parallel specialist lanes

| Lane | Role | Outcome | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Code map | `explore` | Mapped Library routes (`/workshop/library`, `/components`, `/templates`, `/templates/[templateId]`), `cost_library_items` data flow, overlay primitives, route state, the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` cache-bleed surface, and native prompt locations. | Planning lead | 0A | n/a | git revert of binding doc | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | `src/app/workshop/library/**/page.tsx`, `src/lib/component-library/query-keys.ts:5` |
| UX critique | `designer` | Selected-component loss → `?component=<id>` route state (0B/1); insert-target opacity → `resolveEstimateTemplateInsertTarget` (4); Add Component overload → quick-add split (3); folder native prompts → text-prompt dialog (0B); inconsistent trust visibility → trust chips bound to real columns (2); bulk-archive copy conflict (0B); template move scaling → `creatable-combobox` (4); dense/density toggle net-new (5). | Design lead | all | see `21-FEATURE-FLAGS-AND-ROLLOUT.md` | redeploy flag=false per `17` | EV-DESIGN-01 | n/a | see `22` | see `31` | see `30` | Playwright | see `28` | `19` |
| External research | `researcher` | Synthesized catalog, filtering, data table, overlay, accessibility, and provenance guidance from current external references. | Design lead | all | n/a | n/a | EV-DESIGN-02 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| QA inventory | `test-engineer` | Mapped existing coverage, gaps, recommended focused tests, and browser-proof boundaries. | QA lead | 0A-5 plus final release gate (historical Phase 6 alias) | n/a | n/a | EV-QA-01 | n/a | n/a | n/a | n/a | see `29` | n/a | `06`, `18`, `24` |
| Product strategy hardening | `ce-product-lens-reviewer` | Rated strategy 78–84%, called out missing beta metrics, MVP cutline, actor split, and trust semantics. | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | `09` |
| Design hardening | `ce-design-lens-reviewer` | Rated UX/readiness 72–86%, called out missing state specs, responsive/a11y contracts, and quick-vs-advanced decisions. | Design lead | 1, Phase 5 dense-mode subtrack (formerly 5b) | n/a | n/a | EV-DESIGN-01 | n/a | n/a | see `31` | see `30` | Playwright | see `28` | `10`, `12`, `23` |
| Feasibility hardening | `ce-feasibility-reviewer` | Rated implementation readiness as low as 58%, called out route/cache/payload/rollback contracts. | Backend lead | 0A–0B | n/a | n/a | EV-BE-01 | n/a | n/a | n/a | see `30` | n/a | n/a | `13`, `16`, `19` |
| Security hardening | `ce-security-lens-reviewer` | Rated security readiness 32–45%, called out authz/RLS, IDOR, public exposure, input/file, and cache-bleed risks. | Security lead | 0B | n/a | n/a | EV-SEC-01 | n/a | n/a | n/a | n/a | n/a | n/a | `14`, `32`, `33` |
| Research hardening | `ce-web-researcher` | Added dense table, filter, import/export, performance, and cost-library implications. | Planning lead | all | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | `04` |
| Verification hardening | `verifier` | Rated overall readiness 76%, called out missing adversarial, security, network, concurrency, and completion gates. | QA lead | Final release gate (historical Phase 6 alias) | n/a | n/a | EV-QA-06 | n/a | n/a | n/a | n/a | see `29` | n/a | `18`, `24` |

---

## 5. Source evidence highlights

Each highlight is a fact; the "Implication" column is interpretation/recommendation.

| # | Fact | Implication | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx` implements overview search (server action `searchLibraryOverview`); component results currently deep-link to Components. | Phase 1 routes them to `?component=<id>` route state. | Frontend lead | 1 | `library_component_deep_link` | redeploy flag=false | EV-FRONTEND-01 | `library_find_started`, `library_find_resolved` | `library.search.placeholder`, `component_card.state.empty` | focus-visible | see `30` | Playwright | key-based | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx:258` |
| 2 | `src/components/workshop/library/overview/RecentComponentCard.tsx` routes recent components generically. | Phase 1 continuity update to honor `?component=<id>`. | Frontend lead | 1 | `library_component_deep_link` | redeploy flag=false | EV-FRONTEND-01 | `library_find_resolved` | `component_card.title` | focus-visible | see `30` | Playwright | key-based | `src/components/workshop/library/overview/RecentComponentCard.tsx` |
| 3 | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:876-882` filters client-side synchronously (`sheetItems.filter(componentMatchesFacets)`). | No out-of-order/stale-response race exists today; server search is FUTURE-if-budget-exceeded only. | Backend lead | 0A | n/a | revert speculative server-search code | EV-BE-02 | n/a | n/a | n/a | see `30` | jsdom | n/a | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:877` |
| 4 | `ComponentLibraryManager.tsx:1493/:1515/:1534` uses `window.prompt`/`window.confirm` for folder create/rename/delete. | Phase 0B replaces these with the inline `ConfirmDialog`+`<input>` pattern from `TemplatesBrowseManager.tsx:531-883`. | Frontend lead | 0B | `library_folder_dialogs` | redeploy flag=false (legacy prompts remain behind flag branch) | EV-FRONTEND-02 | n/a | `folder.create.title`, `folder.rename.title`, `folder.delete.title` | alertdialog | see `30` | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| 5 | `AddComponentModal.tsx:963` uses `window.confirm("Discard this component draft?")`. | Phase 0B replaces with design-system `ConfirmDialog`; Phase 3 adds the quick-add split so the discard path is less common. | Frontend lead | 0B | `library_folder_dialogs` (overlay policy) | git revert of dialog replacement | EV-FRONTEND-03 | `quick_add_abandoned` | `component.dirty_discard.title` | alertdialog | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/AddComponentModal.tsx:963` |
| 6 | `src/components/workshop/component-library/index.tsx:939/:1428` still has live native `window.confirm`/`window.prompt` calls. | In-estimate panel; Phase-later residual per `05-IMPLEMENTATION-ROADMAP.md` §Phase-later and `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-003/C-017. | Planning lead | Phase-later | n/a | n/a | EV-PLAN-RESIDUAL | n/a | n/a | n/a | n/a | n/a | n/a | `src/components/workshop/component-library/index.tsx:939` |
| 7 | `ComponentInspectorDock.tsx` is 315 lines and the strongest source-trust read surface. | Phase 2 trust chips bind here, derived from real columns/helpers. | Frontend lead | 2 | `library_trust_chips` | redeploy flag=false | EV-FRONTEND-04 | `trust_chip_rendered` | `trust.stale.label`, `trust.very_stale.label` | see `31` | n/a | Playwright | key-based | `src/components/workshop/library/ComponentInspectorDock.tsx` |
| 8 | `component-facet-filter.tsx:12` exports `COMPONENT_FACET_STALE_DAYS=90`; `component-facet-filter.tsx:61` exports `getComponentPricingFreshness`. | Reuse these helpers; any `very stale` tier (180-day) extends the same constants/helpers in lockstep. | Backend lead | 2 | `library_trust_chips` | revert constant split | EV-BE-03 | `trust_chip_rendered` | `trust.*.label` | n/a | n/a | jsdom | n/a | `src/components/workshop/library/component-facet-filter.tsx:12` |
| 9 | `BulkDestructivePreviewModal.tsx:107-108` sets `confirmationHint` gated on `canExecute`, so archive and delete both show "This action cannot be undone." | Phase 0B branches the hint on `actionCopy.verb` — archive is reversible. | Frontend lead | 0B | n/a | git revert of hint branch | EV-FRONTEND-05 | n/a | `bulk_archive.hint`, `bulk_delete.hint` | alertdialog | n/a | jsdom | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| 10 | `TemplatesBrowseManager.tsx:531-883` is the model inline text-prompt dialog; remaining `window.prompt` token at :529-530 is a comment. | Copy this pattern for folder create/rename. | Frontend lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-FRONTEND-02 | n/a | `folder.create.title`, `folder.rename.title` | focus-trap | n/a | Playwright | key-based | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:531` |
| 11 | `TemplateEditorClient.tsx` remaining `window.prompt/confirm` token is a comment. | No overlay migration needed here. | Frontend lead | n/a | n/a | n/a | EV-FRONTEND-06 | n/a | n/a | n/a | n/a | n/a | n/a | `src/components/workshop/library/template-editor/TemplateEditorClient.tsx:62` |
| 12 | `InsertIntoEstimatePicker.tsx` is a `Modal`-based picker with implicit target resolution. | Phase 4 makes target explicit via `resolveEstimateTemplateInsertTarget`. | Frontend lead | 4 | `library_trust_chips` (trust summary) | redeploy flag=false | EV-FRONTEND-07 | `insert_target_confirmed`, `insert_target_mismatch` | `insert_target.single_resolved` | see `31` | n/a | Playwright | key-based | `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx` |
| 13 | Overlay primitives live in `src/components/ui/overlays/`; z-index tiers are `z-[1000]`/`z-[1050]`/`z-[1100]`; no shared `PromptDialog` exists. | Reuse `ConfirmDialog`+`<input>` inline; do not invent a new primitive. | Frontend lead | 0B | `library_folder_dialogs` | git revert of primitive extraction if attempted | EV-FRONTEND-02 | n/a | n/a | focus-trap | n/a | jsdom | key-based | `src/components/ui/overlays/confirm-dialog.tsx` |

---

## 6. Repository evidence

| # | Fact | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Requested plan folder existed and was empty before this pack was written. | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/` |
| 2 | Worktree had unrelated dirty changes; they were not modified or reverted. | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | `git status` |
| 3 | Code-review graph stats: 1,429 files, 16,148 nodes, 190,581 edges (last updated 2026-06-19). | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | `.code-review-graph/` |
| 4 | `AddComponentModal.tsx` 2,359 lines, `ComponentLibraryManager.tsx` 1,695 lines, `TemplatesBrowseManager.tsx` 899 lines. | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | `src/components/workshop/component-library-manager/AddComponentModal.tsx` |
| 5 | Text-prompt migration is a 4-file remit: 3 live targets remain, 2 surfaces already migrated. | Planning lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-FRONTEND-02 | n/a | n/a | n/a | n/a | n/a | n/a | `03-MODALS-POPOVERS-AND-OVERLAYS.md` |

---

## 7. Validation performed for this planning pack

| Check | Method | Command | Expected output | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Folder contains expected docs | ls + count | `ls .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ \| wc -l` | 35+ files | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| No whitespace errors | `git diff --check` | `git diff --check -- .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement .ai/10_state/current-state.md` | no output | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| No trailing whitespace | rg | `rg -n "[ \t]+$" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement .ai/10_state/current-state.md` | 0 matches | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| Placeholder scan | rg | `rg -n "TODO\|FIXME\|XXX\|PLACEHOLDER" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/` | 0 unresolved | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| Doc 19 drift check | rg spot-checks | see §8 Evidence Commands | outputs match doc 19 | Planning lead | 0A | n/a | n/a | EV-PLAN-07 | n/a | n/a | n/a | n/a | n/a | n/a | `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` |

---

## 8. Explicit evidence commands

Run these from the repo root to re-verify the facts in this ledger. If any output diverges from doc 19, reconcile the keystone before coding.

```bash
# Routes on disk (expect 4)
fd -t f "page.tsx" src/app/workshop/library/

# Surface file paths exist
ls src/components/workshop/library/ComponentInspectorDock.tsx \
   src/components/workshop/library/component-facet-filter.tsx \
   src/components/workshop/BulkDestructivePreviewModal.tsx \
   src/components/workshop/LibraryPageClient.tsx \
   src/lib/repositories/component-library-repository.ts

# Native overlay debt to migrate (expect the cited line numbers)
rg -n "window\.(prompt|confirm)" src/components/workshop/component-library-manager/ComponentLibraryManager.tsx
rg -n "Discard this component draft" src/components/workshop/component-library-manager/AddComponentModal.tsx
rg -n "window\.(prompt|confirm)" src/components/workshop/component-library/index.tsx

# Client-side synchronous search (no async race)
rg -n "sheetItems\.filter\(\(item\) => componentMatchesFacets" src/components/workshop/component-library-manager/ComponentLibraryManager.tsx

# Inline text-prompt pattern to copy
rg -n "textPrompt" src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx

# Perf seed does NOT cover cost_library_items (expect zero hits)
rg -n "cost_library_items" scripts/seed-performance-test-data.ts

# Test command correctness
rg -n '"test"|"test:dom"|"validate"|"test:e2e"' package.json
```

Owner: Planning lead | Phase: 0A | Flag: n/a | Rollback: n/a | Evidence: EV-PLAN-07 | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` Appendix

---

## 9. Doc 19 drift check

| Trigger | Action | Owner | Evidence |
|---|---|---|---|
| Any `src/` binding cited in this doc changes line number or symbol name. | Update the `Binding:` field in the affected row; re-run §8 commands; if multiple docs affected, log in `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md`. | Planning lead | EV-PLAN-07 |
| Doc 19 phase map changes. | Update all `Phase:` fields in this doc to match the new canonical map. | Planning lead | EV-PLAN-07 |
| New native prompt appears in primary Library files. | Re-open `03-MODALS-POPOVERS-AND-OVERLAYS.md` and add a migration row; do not silently accumulate debt. | Frontend lead | EV-FRONTEND-02 |

### 9.5 Doc 19 drift check — semantic-change triggers (added 2026-06-21)

> The §9 triggers fire on textual change. They must ALSO fire on *semantic*
> change that keeps the same name — the most dangerous drift. These are the
> semantic triggers reconciled from the 2026-06-21 parallel pass (conflicts
> C-023..C-025 in doc 26).

| Semantic trigger | Action | Owner | Conflict |
|---|---|---|---|
| Cache-bleed call-site count changes (the stable identifier `rg -n 'queryKey: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY\|queryKey: \["workspace-component-library"\]' src/` returns ≠ 6 matches) | Reconcile doc 19 Query Keys + Provenance Footer; propagate to docs 13/14/32/06/18/24; log in doc 26. | Planning lead | C-023 |
| Insert-action function signature or location changes (`insertEstimateRowItemFromLibrary` / `replaceEstimateRowItemWithLibrary` / `detachEstimateRowItemFromLibrary`) | Reconcile doc 19 Server Actions section; log in doc 26. | Planning lead | C-024 |
| A migration adds/drops a `cost_library_items` column or an authz primitive (`is_workspace_*`, `can_*`, `is_platform_admin`) | Reconcile doc 33 §2.2/§3.1 first (canonical), then doc 19 §Data Layer/§RLS; log in doc 26. | DB lead + Planning lead | C-025 |
| A new enum value in `component_lifecycle_state` or `estimate_row_link_state`, or a new query-key factory in `query-keys.ts` | Re-verify doc 11 lifecycle/link tables and doc 13 cache table; log in doc 26. | Planning lead | (semantic, §11 note) |

---

## 10. Known gaps and execution evidence ledger

| Gap | Why it is not a planning blocker | Execution evidence row | Owner | Phase |
|---|---|---|---|---|
| No screenshot/browser proof captured. | Planning-only pass; browser proof deferred to implementation phases. | `24-EXECUTION-EVIDENCE-LEDGER.md` "Rendered-UI screenshots" + per-phase `bun run test:e2e` rows. | QA lead | 0B/1/5/6 |
| No tests run. | No application code changed; tests are pre-registered with command + pass criterion. | `24-EXECUTION-EVIDENCE-LEDGER.md` per `ADV-*`/test row. | QA lead | 0A–6 |
| No axe/jest-axe harness. | Harness is a Phase 0A deliverable; pre-harness a11y is manual ARIA/focus assertion. | `24-EXECUTION-EVIDENCE-LEDGER.md` "axe harness config" row. | A11y lead | 0A |
| No measured performance baseline. | Perf seed does not yet cover `cost_library_items`; Phase 0A extends and measures before budgets are claimed. | `24-EXECUTION-EVIDENCE-LEDGER.md` "Perf seed extension" + "Perf baseline measurement note". | Perf lead | 0A |

Owner: Planning lead | Phase: all | Flag: n/a | Rollback: n/a | Evidence: EV-PLAN-07 | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: n/a

---

## 11. Cross-references

> **Doc 19 drift check note (added 2026-06-21):** the §9 drift check fires on
> textual change (line number or symbol name). It must ALSO fire on *semantic*
> change that keeps the same name — the most dangerous drift. Add this row to
> §9 triggers: "New enum value added to `component_lifecycle_state` or
> `estimate_row_link_state`, or a new query-key factory in `query-keys.ts`" ->
> re-verify doc 11 lifecycle/link tables and doc 13 cache table; log in
> `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md`. Owner: Planning lead. The §8
> evidence commands remain the textual re-verification harness.

---

## 12. 2026-06-21 independent re-audit + apply pass

This ledger was originally written against the pack's self-assessed
"100/100/100 planning-achievable" rating. An **independent re-audit on
2026-06-21** (separate agent fleet from the original authors) challenged that and
produced the honest finding below; a follow-on apply pass (this ledger's
"Phase-4 apply workflow") carried the conflict resolutions inline into the
owned docs.

| Item | Detail |
|---|---|
| Audit workflow | Phase-1 audit: a parallel multi-agent fleet re-scored all 38 docs against the keystone (doc 19) and the `26` conflict set, with per-doc `jq`-queryable findings (`.result.reviews[].reviews[]`). |
| Apply workflow | Phase-4 apply: a parallel multi-agent fleet with NON-OVERLAPPING doc ownership edited each assigned doc surgically (this is the apply pass this ledger now records). Each agent read the keystone + its owned docs + the per-doc `jq` findings, then applied the binding conflict resolutions (C-001..C-022) inline. |
| Honest finding | The pack averages ~80 on the **execution-inclusive** Rubric A (S82/Q78/R70 across the cluster), NOT the claimed ~90.3 aggregate or a flat 100. The planning-achievable Rubric B ceiling (100/100/100 = implementation-ready, NOT execution-complete, per C-016) is a separate, correct statement that does not contradict the ~80 execution-inclusive score. |
| Marquee deliverable | `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` v2 (already rewritten by the lead) — a full liquid-glass library redesign as a first-class skin matching the workshop shell, via a per-region surface-variant slot system. Other docs cross-reference it as the material/grid layer. |
| Conflict resolutions applied | C-001 (4-tier beta freshness), C-002 (chip not badge), C-005 (test cmd), C-009 (console.warn beta-sink), C-012 (public snapshot label), C-013 (archive vs delete), C-016 (Rubric B decision rule), C-020 (relaxed per-row dims), plus the path-bug correction (no `src/components/library/`). |
| What this changes in this ledger | §1 headline claim reframed to "planning-complete (Rubric B), not execution-complete"; the ~80 honest score is recorded here and in `08` delta log; the §9 drift check gains a semantic-change trigger. |

This is provenance, not a product claim: the ~80 is an audit of the *documents*
on the execution-inclusive rubric; no application code changed.

---

## 13. Cross-references

- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — authoritative bindings and phase map.
- `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` — 12-dimension row template this doc uses.
- `24-EXECUTION-EVIDENCE-LEDGER.md` — pre-registered execution evidence for every deferred proof item.
- `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` — owner role definitions.
- `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` — binding conflict resolutions.

---

## 14. Decision log — fact / inference / recommendation split (added 2026-06-21)

> **Split added 2026-06-21 parallel pass** to separate factual evidence (which
> an auditor can re-verify by running a command) from interpretive commentary
> (which is a judgment call) from recommendations (which the owner may accept
> or reject). This is the compact decision log the §3 gap asked for; it does
> NOT duplicate §5 (source-evidence highlights) or §6 (repository evidence).

### Facts (re-verifiable by command)

| Fact | Verify command | Verified date |
|---|---|---|
| 6 cache-bleed call sites by stable identifier | `rg -n 'queryKey: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY\|queryKey: \["workspace-component-library"\]' src/ \| grep -v query-keys.ts \| wc -l` → 6 | 2026-06-21 |
| `use-estimate-row-mutations.ts:413` is the actual writer line (keystone says `:432` — drift) | `rg -n 'WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY' src/hooks/use-estimate-row-mutations.ts` | 2026-06-21 |
| `EstimateSheetContent.tsx:1300/1303` are the actual writer lines (keystone says `:1299/1302` — drift +1) | `rg -n 'WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY' src/components/workshop/EstimateSheetContent.tsx` | 2026-06-21 |
| `insertEstimateRowItemFromLibrary` actual line is `:2464` (keystone says `:2477` — drift −13) | `rg -n 'export async function insertEstimateRowItemFromLibrary' src/lib/estimates/actions.ts` | 2026-06-21 |
| 4 native prompts in component-library-manager (3 ComponentLibraryManager + 1 AddComponentModal) | `rg -c 'window\.(prompt\|confirm)' src/components/workshop/component-library-manager/{ComponentLibraryManager,AddComponentModal}.tsx` | 2026-06-21 |
| 4 Library routes on disk | `fd -t f 'page.tsx' src/app/workshop/library/` | 2026-06-21 |
| 3 freshness sources (facet/repo/UI-string at 90 days) | see §8 commands | 2026-06-21 |

### Inferences (judgment calls by the parallel-pass agents)

| Inference | Basis | Agent |
|---|---|---|
| The cache-bleed line drift is cosmetic (not blocking) because the stable identifier holds at 6 matches. | C-023 verify command returns 6 even though 3 line numbers lag. | META/coherence |
| The doc 19 keystone RLS/column incompleteness is a reconciliation residual, not a build blocker, because doc 33 carries the canonical facts. | C-025: doc 33 §2.2/§3.1 verified by `rg`/`fd` against migrations. | db-rls + META |
| The 19 edited docs reach honest 100/100/100 on Rubric B because every gate row satisfies-or-delegates all 12 dims (§4.5 block-check). | doc 34 §4.5 + doc 26 §5 (29/29 conflicts resolved). | META/coherence |
| The Rubric A ~80 average (doc 25 §1) and the Rubric B 100/100/100 ceiling (this ledger §1) do NOT contradict — they measure different things. | C-016 decision rule (doc 26 §1 + doc 08). | META/coherence |

### Recommendations (owner may accept or reject)

| Recommendation | Rationale | Owner decision |
|---|---|---|
| Lead reconciles doc 19 keystone line numbers for C-023/C-024/C-025 before Wave 2 synthesis. | The drift is cosmetic but propagates to 6 sibling docs; reconciling once avoids 6 downstream edits. | Pending lead |
| Lead decides Wave 2 scope for the 10 docs not edited this pass (00/02/03/05/09/17/23/27/35/README). | These carry baseline scores; raising them to 100/100/100 is not required for the 19-doc Rubric B sign-off but may be desired for pack-wide 100. | Pending lead |
| Doc 20/21/24 owners adopt the new telemetry events / flags / evidence IDs registered in docs 11/14/15/32 (C-026/C-027/C-028). | Reconciliation, not new work; closes the canonical-name adoption loop. | Pending lead (lead owns 20/21/24 or delegates) |

---

## 15. 2026-06-21 parallel-agent pass record

> **Recorded by the META/coherence agent.** This section documents the
> parallel pass that drove the pack to Rubric B 100/100/100 on 19 docs. It is
> provenance, not a product claim.

| Item | Detail |
|---|---|
| Pass date | 2026-06-21 |
| Coordination artifacts | `_AGENT-COORDINATION-BRIEF.md` (lead-authored brief); `LOOP_LEDGER.md` (append-only change/conflict ledger) |
| Agent count | 9 agents in Wave 1 (parallel, disjoint file ownership) + 1 META/coherence agent (this agent) |
| Wave 1 agents | data-contracts-route-cache-agent (13), source-trust-state-agent (11), library-surface-specs-agent (10), security-authz-agent (14), db-rls-agent (33/32/15), keystone-bindings-agent (19/18/06/24), i18n-a11y-copy-agent (28/31/22/12), + 2 more (UX/design + perf/QA lanes per `LOOP_LEDGER.md`) |
| META/coherence agent (this) | Owns docs 26/34/07/08. Reconciled `LOOP_LEDGER.md` §3 into doc 26 as C-023..C-029; authored doc 34 §4.5 post-pass matrix; recorded this pass in doc 07; added owner/acceptance/rollback/rubric-rule/delta to doc 08. |
| Docs edited this pass | 19 docs at 100/100/100 on Rubric B (§4.5 of doc 34) |
| New conflicts logged | 7 (C-023..C-029) — all resolved, 0 unresolved (doc 26 §5) |
| New canonical names | See `LOOP_LEDGER.md` §2 (telemetry events, evidence IDs, flags, DB facts) |
| Marquee deliverable | `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` v2 (lead-owned; liquid-glass library redesign) |
| Execution evidence | NOT faked — all execution-only proof (rendered UI, green tests, applied migrations, measured perf) stays pre-registered in `24-EXECUTION-EVIDENCE-LEDGER.md` with command + pass criterion + owner + phase |
| Rubric | This pass targets **Rubric B** (planning-achievable = implementation-ready). Rubric A (execution-inclusive) remains ~81 pack average per doc 25 §1 — it cannot reach 100 from a planning pass by construction. |

Owner: Planning lead | Phase: all | Flag: n/a | Rollback: revert this section + the §1.5/§9.5/§14/§15 additions | Evidence: EV-PLAN-07 | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: `LOOP_LEDGER.md` §1/§4
