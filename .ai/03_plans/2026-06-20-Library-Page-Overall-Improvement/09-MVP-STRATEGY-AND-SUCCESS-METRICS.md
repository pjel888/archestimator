# 09 - MVP Strategy And Success Metrics

## Product Thesis

The Library should become Archestimator's protected workspace memory for
reusable estimating intelligence. The closed-beta version does not need every
catalog feature. It needs to make reuse fast, trustworthy, and private.

## Primary Beta Users

| User | Need | Winning Outcome |
| --- | --- | --- |
| Estimator/owner (`workspace_role` owner/admin) | Reuse known costs and assemblies quickly. | Can find, verify, and insert trusted items without rebuilding estimates. |
| Project collaborator (`member`) | Understand where estimate numbers came from. | Can read source/freshness in the inspector dock (`ComponentInspectorDock.tsx`) without editing protected library data. |
| Viewer (`viewer`) | Read estimates without changing library data. | Sees trust cues read-only; editor-gated actions stay blocked by `is_workspace_editor`/`can_edit_estimate`. |
| Public proposal recipient | Understand proposal output. | Sees only the frozen `project_publications.snapshot_json` client-safe context — no `pricing_source`/`confidence`/price-history. |

## Beta Hypotheses

Each hypothesis names the confirming signal and the refuting signal it must be
tested against. Event names are the canonical taxonomy in
`20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` (all route through
`recordLibraryEvent`); "stale" means PRICING freshness only, derived from
`getComponentPricingFreshness` (`component-facet-filter.tsx`).

| # | Hypothesis | Confirming signal | Refuting signal |
| --- | --- | --- | --- |
| H1 | If users can see source freshness next to price, they reuse more library items with fewer manual checks. | `trust_chip_rendered` coverage at 90%+ per surface AND a rising rate of `insert_target_confirmed` where `targetStale=false`. | `insert_target_confirmed` rate flat/falling, or beta-task interviews report users still re-checking prices outside the Library. |
| H2 | If overview search opens the exact component/template, users trust the Library as a navigation hub instead of bypassing it. | `library_find_resolved` (`kind=component`/`template`) fires with median `durationMs` under target; low `library_find_abandoned` ratio. | High `library_find_abandoned` (`reason=navigation`) ratio, or find sessions that never reach `?component=<id>` resolve. |
| H3 | If Quick Add asks for only required fields, users capture more reusable components during real estimating work. | `quick_add_saved` count rises with `usedAdvanced=false` dominant and median `durationMs` under 90s. | High `quick_add_abandoned` (`reason=discarded`) ratio, or `quick_add_saved` skews to `usedAdvanced=true` (required set is too thin). |
| H4 | If the public/share snapshot omits private source metadata by default, the team can expand collaboration without delaying beta. | Privacy assertion green: the frozen `project_publications.snapshot_json` built per `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` carries no `pricing_source`/`confidence`/internal-notes/price-history, and `src/app/share/[token]` emits NO Library telemetry (no `recordLibraryEvent` call site on that path). | Any private source field present in `snapshot_json`, or any `recordLibraryEvent` import under `src/app/share` / `src/app/api/share`. |

Note: H4 is about what the snapshot builder PUTS INTO
`project_publications.snapshot_json` (a frozen snapshot rendered by
`src/app/share/[token]` + `src/app/api/share/[token]/route.ts`), NOT about a live
Library query leaking — there is no live public Library endpoint to redact.

## Success Metrics

> Instrumentation banner: every `recordLibraryEvent`-based metric below is
> NET-NEW (per `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md`) and NOT YET EMITTING —
> the events ship with their owning phase. The `Mode` column marks each row as
> INSTRUMENTED-ONCE-BUILT (timer/sampling/event, fires only after its phase lands
> the `recordLibraryEvent` call site) versus MANUAL/AUTOMATED assertion (beta task,
> UI/DOM test, `rg`/snapshot assertion) that does not depend on the new telemetry.

Instrumentation owner = the event group in
`20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` (all events route through
`recordLibraryEvent` in the net-new twin `src/lib/component-library/library-telemetry.ts`).
Find-time and Quick Add use SESSION-SCOPED CLIENT TIMERS (`performance.now()` at
start, `durationMs` at resolve, scoped by `sessionFindId`/`sessionAddId`) — see
the Timing Methodology in `20`. Trust-classification states bind to the canonical
freshness enum from `getComponentPricingFreshness`: `fresh` / `stale` / `missing`
(plus a derived low-confidence cue over the free-text `confidence` column); there
is NO `current` state — "current" was loose wording for `fresh`.

| Metric | Target | Mode | Start / Stop | Instrumentation owner (doc 20) | Evidence |
| --- | ---: | --- | --- | --- | --- |
| Component find time | Under 30 seconds for a seeded known item. | INSTRUMENTED (timer) + MANUAL beta-task | Start: `library_find_started` (`surface=components`) on first search focus/keystroke. Stop: `library_find_resolved` (`kind=component`) when `ComponentInspectorDock.tsx` opens via `?component=<id>`. | `library_find_*` (Phase 1) | `durationMs` median + moderated beta task. |
| Template find time | Under 30 seconds for a seeded known template. | INSTRUMENTED (timer) + MANUAL beta-task | Start: `library_find_started` (`surface=templates`). Stop: `library_find_resolved` (`kind=template`) on template preview open. | `library_find_*` (Phase 1) | `durationMs` median + moderated beta task. |
| Trust classification | 90%+ of visible items show a `fresh`/`stale`/`missing` freshness state (low-confidence cue where `confidence` is empty). | INSTRUMENTED (sampling) + UI test (primary) | Ratio, not a duration: `trust_chip_rendered` over (`trust_chip_rendered` + `trust_chip_unclassified`) per surface. | `trust_chip_*` (Phase 2) | UI test asserting chip render over real columns/helpers; sampled-event ratio corroborates. |
| Quick Add completion | Basic component saved in under 90 seconds. | INSTRUMENTED (timer) + MANUAL beta-task | Start: `quick_add_started` on Quick Add open. Stop: `quick_add_saved` on success return of `createCostLibraryComponent`. | `quick_add_*` (Phase 3) | `durationMs` median + moderated beta task. |
| Insert accuracy | Insert names and uses the intended estimate/project. | DOM/e2e (PRIMARY) + supporting event | n/a (correctness, not duration). | `insert_target_*` (Phase 4) | DOM/e2e on `resolveEstimateTemplateInsertTarget` return; `insert_target_confirmed` carries server-re-resolved `projectId`/`estimateId`, `insert_target_mismatch` flags misroutes. |
| Privacy | 0 private source fields in the public/share `snapshot_json`. | AUTOMATED/MANUAL ASSERTION (not event-driven) | n/a. | none (assertion, not a runtime event) | `14`-suite assertion that `project_publications.snapshot_json` omits `pricing_source`/`confidence`/notes/price-history; `rg` proof of no `recordLibraryEvent` under `src/app/share`. |
| Large-list usability | 500 visible rows within a Phase-0A-measured budget. | MANUAL (perf smoke) — out of telemetry scope | n/a. | none (owned by `16`, not `20`) | Perf smoke per `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` reusing `src/lib/workshop/virtualization-flags.ts`. |

### Threshold Baselines

Every number above is a TARGET-TO-VALIDATE, not an observed baseline — the repo
has no pre-existing Library timing or trust-coverage measurement to anchor to.
Phase 0A (Contract Lock) establishes the baseline before any number is treated as
a pass/fail gate:

| Threshold | Status | Baseline source / Phase 0A action |
| --- | --- | --- |
| 30s find time | Target-to-validate | No existing find-time data. Phase 0A extends the perf seed (`scripts/seed-performance-test-data.ts`, which does NOT yet cover `cost_library_items`) to seed N known items, then a moderated beta task + `library_find_resolved` `durationMs` set the real distribution; ratify or adjust 30s after first beta cohort. |
| 90s Quick Add | Target-to-validate | No existing Quick Add timing. Validated by `quick_add_saved` `durationMs` median against the CANONICAL QUICK ADD CONTRACT field set (4 required fields); confirm 90s is reachable on the quick path before gating. |
| 90% trust classification | Target-to-validate | Computed, not guessed: Phase 2 measures actual `fresh`/`stale`/`missing` coverage over seeded `cost_library_items` via the sampled `trust_chip_rendered` / `trust_chip_unclassified` ratio. 90% is the entry target; real coverage depends on how many seeded rows have a `pricing_date`. |
| 500 rows in budget | Target-to-validate | NO budget number may be claimed until Phase 0A seeds N components and MEASURES `loadCurrentWorkspaceComponentRowsLibrary` (per `16` and `19` Performance Reality). The browse fetch eagerly loads the full nested detail graph per item, so the budget is set by that measured payload, not assumed. |

## Release Cutline

Ship across the canonical phase order (0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5; see the
Canonical Phase Map in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`). The MVP
cutline is everything through Phase 5; the listed items map to their owning phase:

| Cutline item | Phase | Real binding |
| --- | --- | --- |
| Actor/authz + data-exposure tests; cache-invalidation tests; perf-seed baseline | Phase 0A Contract Lock | scaffold route-state/authz/cache/stale-target tests; extend `scripts/seed-performance-test-data.ts`; mutation rows name the EXACT query key(s) to invalidate (`WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` is the un-scoped cache-bleed surface). |
| Folder create/rename/delete app-owned overlays; selected-component URL param with inspector open/close | Phase 0B Overlay & Route-State | replace `ComponentLibraryManager.tsx` `window.prompt`/`window.confirm` (folder create :1493, rename :1515, delete :1534) + `AddComponentModal.tsx:963` dirty-discard with the text-prompt dialog (inline `ConfirmDialog`+input from `TemplatesBrowseManager.tsx:531-883`); add `?component=<id>` route state in `LibraryPageClient.tsx`; fix bulk-archive copy (`BulkDestructivePreviewModal.tsx:107-108` — branch the `:107` `confirmationHint` on `actionCopy.verb` so archive does not show the irreversible-delete string at `:108`). |
| Overview hierarchy that routes to the exact item | Phase 1 Findability | overview search continuity to `?component=<id>` (`searchLibraryOverview` already returns component/template `id`s at `actions.ts:1576-1590`, so Phase 1 is route-state wiring, not a new query); applied-filter chips + reset; result count/scope strip. |
| Component row/inspector source trust | Phase 2 Source Trust | trust chips bound to real columns (`pricing_date`, `pricing_source`, `confidence`) and helpers (`getComponentPricingFreshness`, `getStalenessTone`/`getStalenessLabel`) on overview/recent/template rows + `ComponentInspectorDock.tsx` + insert. |
| Quick Add required-field flow | Phase 3 Quick Add | quick-add path in `AddComponentModal.tsx` per the CANONICAL QUICK ADD CONTRACT (see Quick Add Decision below). |
| Template preview trust summary | Phase 4 Templates | `resolveEstimateTemplateInsertTarget` insert target, `ui/creatable-combobox.tsx` move, computed-join template trust summary. |
| Component card/dense state hierarchy | Phase 5 Dense Maintenance | net-new density toggle (does NOT exist yet) + table-vs-grid per `12`, reusing `src/lib/workshop/virtualization-flags.ts`. LAST. |

Defer:

- bulk import/export UI
- advanced file attachment management
- provider synchronization
- marketplace integrations
- proposal-publishing controls for cost-source metadata
- full template-builder redesign

## Quick Add Decision

Quick Add is in the MVP because it directly supports beta learning. The field set
follows the CANONICAL QUICK ADD CONTRACT (see
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`) and writes
`public.cost_library_items` via `createCostLibraryComponent`:

- Required: `name`, `category` (free text, required taxonomy axis), `unit`,
  `unit_cost`.
- Optional: `supplier`/`brand` (or `supplier_id`/`brand_id`), `pricing_date`,
  `pricing_source` (the source URL, validated app-side over free text),
  `confidence` (free text, not an enum).
- Folder: `libraryFolderId` is OPTIONAL and defaults to the currently selected
  folder. Folder (org axis) and `category` (required taxonomy) are TWO DISTINCT
  axes and are never conflated.

No schema change is needed — every field above already exists as a column on
`cost_library_items`, so Quick Add does NOT violate the `00-PLAN.md` "no schema
changes" non-goal. A controlled vocabulary for `category`/`confidence` would need
a migration and is DEFERRED. Everything beyond this set (price history, lifecycle
state changes, attachments) belongs in Advanced Edit until beta evidence says
otherwise; the quick path records `usedAdvanced` so `quick_add_saved` can show
whether the required set is sufficient.

## Trust And Privacy Decision

Source trust is visible inside protected workspace Library surfaces (gated by RLS
+ `is_workspace_editor`/`is_workspace_member`; only `viewer` is read-only). The
public/share surface is a FROZEN snapshot — `src/app/share/[token]` +
`src/app/api/share/[token]/route.ts` render `project_publications.snapshot_json`,
never a live Library query — so privacy is enforced by what the snapshot builder
PUTS INTO `snapshot_json` (per `activity-helpers.ts`), not by redacting a live
endpoint. Raw `pricing_source` URLs, internal supplier notes, the free-text
`confidence` field, workspace-only `cost_library_item_price_history`, and source
linkage (`source_library_item_id`/`source_snapshot`/`link_state`) stay out of
`snapshot_json` unless a later explicit publishing feature changes that rule. See
`14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` for the data classification and snapshot
redaction tests.

## Product Risks

| Risk | Mitigation |
| --- | --- |
| Users treat stale prices as current. | Derive freshness via `getComponentPricingFreshness` (`fresh`/`stale`/`missing`, 90-day `COMPONENT_FACET_STALE_DAYS` window) beside price; warn on insert when `targetStale=true` (`insert_target_confirmed`). |
| Quick Add creates low-quality data. | Hold the required set to `name`/`category`/`unit`/`unit_cost` per the Quick Add Contract; validate those at `createCostLibraryComponent` and surface a `missing`-freshness cue when `pricing_date`/`pricing_source` are absent. |
| Dense mode becomes hard to use. | Keep card and dense modes complementary with visible applied-filter chips/reset; density toggle is Phase 5 (LAST) and reuses `src/lib/workshop/virtualization-flags.ts`. |
| Library exposes proprietary cost intelligence. | The public surface is a frozen `project_publications.snapshot_json`, not a live query: enforce omission in the snapshot builder and test it per `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`; assert no `recordLibraryEvent` call site under `src/app/share`. |
| Scope expands into full catalog management. | Hold the MVP cutline through Phase 5; import/export remains future-safe but deferred (see `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md`). |

## Cross-References

- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — authoritative names, enums,
  query keys, server actions, phase labels, glossary, and the Quick Add contract
  this doc binds to (not restated here).
- `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` — the event taxonomy and timing
  methodology that instrument the Success Metrics and Beta Hypotheses above.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` — `?component=<id>` route state and the
  `resolveEstimateTemplateInsertTarget` insert contract behind insert accuracy.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` — data classification and the frozen
  `snapshot_json` redaction that backs the Privacy metric and H4.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` — owns the 500-row/large-list
  budget that Phase 0A must measure before it is gated.
- `21-FEATURE-FLAGS-AND-ROLLOUT.md` — per-phase flags and rollback for the cutline.
- `24-EXECUTION-EVIDENCE-LEDGER.md` — pre-registers each Success Metric's and
  Cutline item's exact proving command, concrete pass criterion, owner, and phase
  (e.g. the trust-classification metric maps to the trust-chip rendering test; the
  privacy metric to `share-snapshot-redaction.test.tsx`; the 500-row budget to the
  Phase 0A seed+measure rows). The metric numbers here are targets-to-validate;
  doc 24 names the command that proves each, so no metric is left as an open
  question for the implementer.
