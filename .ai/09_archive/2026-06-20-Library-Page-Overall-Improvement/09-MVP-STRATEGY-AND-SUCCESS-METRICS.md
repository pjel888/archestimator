# 09 — MVP Strategy And Success Metrics

> **Status:** Living document. Defines the closed-beta Library MVP strategy: product thesis, users, hypotheses, success metrics, fail-fast thresholds, rollback triggers, release cutline, and execution evidence.
>
> **Scope:** Beta strategy and measurable outcomes. All codebase bindings defer to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`. Trust states use the beta-scope **4-tier** taxonomy (`fresh`/`stale`/`very stale`/`missing`) per `11-SOURCE-TRUST-STATE-MATRIX.md` and `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-001. **Today's code returns only `fresh`/`stale`/`missing`** (`getComponentPricingFreshness`, `component-facet-filter.tsx:61`); the 180-day `very stale` tier is **net-new Phase 2 work** that must extend `COMPONENT_FACET_STALE_DAYS`, `LIBRARY_OVERVIEW_STALE_PRICING_DAYS`, the `LibraryOverview.tsx:114` string, and `getComponentPricingFreshness` in lockstep before any `very stale` metric can be measured (`19` §Confidence and Freshness Models).
>
> **Companion docs:** [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md), [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md), [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md), [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md), [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md), [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md), [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md), [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md), [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md).

---

## 1. Product thesis

| Thesis statement | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| The Library should become Archestimator's protected workspace memory for reusable estimating intelligence. The closed-beta version makes reuse fast, trustworthy, and private — not a full catalog-management platform. | Planning lead | all | n/a | scope reduction to Phase 0B only | EV-PLAN-09 | n/a | `library.title`, `library.subtitle` | n/a | n/a | n/a | key-based | `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` §Verified File Paths |

---

## 2. Primary beta users

| User | Need | Winning outcome | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Estimator/owner (`workspace_role` owner/admin) | Reuse known costs and assemblies quickly. | Can find, verify, and insert trusted items without rebuilding estimates. | Planning lead | all | n/a | n/a | EV-PLAN-09 | n/a | n/a | n/a | n/a | n/a | key-based | `19` §RLS/Authz Primitives |
| Project collaborator (`member`) | Understand where estimate numbers came from. | Can read source/freshness in the inspector dock without editing protected library data. | Planning lead | all | n/a | n/a | EV-PLAN-09 | `trust_chip_rendered` | `trust.*.label` | see `31` | n/a | Playwright | key-based | `src/components/workshop/library/ComponentInspectorDock.tsx` |
| Viewer (`viewer`) | Read estimates without changing library data. | Sees trust cues read-only; editor-gated actions blocked by `is_workspace_editor`/`can_edit_estimate`. | Security lead | 0B | n/a | revert authz relaxation | EV-SEC-01 | n/a | `library.permission_denied` | n/a | n/a | jsdom | key-based | `19` §RLS/Authz Primitives |
| Public proposal recipient | Understand proposal output. | Sees only the frozen `project_publications.snapshot_json` client-safe context — no `pricing_source`/`confidence`/price-history. Per C-012, trust chips are REDACTED from public/shared snapshots (live workspace only); the public snapshot shows "Snapshot verified on <date>" (copy key `trust.public_snapshot.label`). | Security lead | 0B | n/a | revert snapshot builder change | EV-SEC-02 | n/a | `trust.public_snapshot.label` | n/a | n/a | Playwright | key-based | `src/app/share/[token]/page.tsx` |

---

## 3. Beta hypotheses

> **Instrumentation note:** every `recordLibraryEvent`-based signal below is net-new (per `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md`) and ships with its owning phase. `stale` means PRICING freshness only, derived from `getComponentPricingFreshness` (`component-facet-filter.tsx`). The canonical trust taxonomy is 4-tier: `fresh`/`stale`/`very stale`/`missing` (resolves `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-001).

| # | Hypothesis | Confirming signal | Refuting signal | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H1 | If users can see source freshness next to price, they reuse more library items with fewer manual checks. | `trust_chip_rendered` coverage at 90%+ per surface AND rising `insert_target_confirmed` rate with `targetStale=false`. | `insert_target_confirmed` rate flat/falling, or beta interviews report users re-checking prices outside Library. | Planning lead | 2 | `library_trust_chips` | redeploy flag=false | EV-PLAN-09 | `trust_chip_rendered`, `trust_chip_unclassified`, `insert_target_confirmed` | `trust.*.label` | see `31` | n/a | Playwright | key-based | `src/components/workshop/library/component-facet-filter.tsx:61` |
| H2 | If overview search opens the exact component/template, users trust Library as a navigation hub instead of bypassing it. | `library_find_resolved` (`kind=component`/`template`) fires with median `durationMs` under target; low `library_find_abandoned` ratio. | High `library_find_abandoned` (`reason=navigation`) ratio, or find sessions never reach `?component=<id>` resolve. | Frontend lead | 1 | `library_component_deep_link` | redeploy flag=false | EV-FRONTEND-01 | `library_find_started`, `library_find_resolved`, `library_find_abandoned` | `library.search.placeholder` | focus-visible | see `30` | Playwright | key-based | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx:258` |
| H3 | If Quick Add asks for only required fields, users capture more reusable components during real estimating work. | `quick_add_saved` count rises with `usedAdvanced=false` dominant and median `durationMs` under 90s. | High `quick_add_abandoned` (`reason=discarded`) ratio, or `quick_add_saved` skews `usedAdvanced=true`. | Frontend lead | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 | `quick_add_started`, `quick_add_saved`, `quick_add_abandoned` | `quick_add.*` | see `31` | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| H4 | If the public/share snapshot omits private source metadata by default, the team can expand collaboration without delaying beta. | Privacy assertion green: frozen `snapshot_json` carries no `pricing_source`/`confidence`/internal-notes/price-history, and `src/app/share/[token]` emits NO Library telemetry. | Any private source field in `snapshot_json`, or any `recordLibraryEvent` import under `src/app/share` / `src/app/api/share`. | Security lead | 0B | n/a | revert snapshot builder change | EV-SEC-02 | n/a (assertion, not event) | `trust.public_snapshot.label` | n/a | n/a | `rg` + Playwright | key-based | `src/app/share/[token]/page.tsx` |

---

## 4. Success metrics

> Every metric below has an owner, cadence, fail-fast threshold, rollback trigger, and manual-sampling fallback. All event-driven metrics route through `recordLibraryEvent` in the **net-new** `src/lib/component-library/library-telemetry.ts` — that file does not exist yet and is a Phase 0A prerequisite owned by the Telemetry lead; until it ships, every `INSTRUMENTED` metric below falls back to the **manual-sampling table** that follows, which is the live measurement path during closed beta. The beta-sufficient sink is `console.warn` (per `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` C-009); a production telemetry sink is Phase-later.

| Metric | Target | Fail-fast threshold | Rollback trigger | Owner / Cadence | Mode | Start / Stop | Instrumentation owner (doc 20) | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Component find time | < 30s for seeded known item. | > 60s median over 10 attempts | `library_component_deep_link` off + schedule perf review | Frontend lead / weekly | INSTRUMENTED (timer) + MANUAL beta-task | Start: `library_find_started` (`surface=components`). Stop: `library_find_resolved` (`kind=component`) when `ComponentInspectorDock.tsx` opens via `?component=<id>`. | `library_find_*` (Phase 1) | EV-FRONTEND-01 | `library_find_started`, `library_find_resolved` | `library.search.placeholder` | focus-visible | see `30` | Playwright | key-based | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx:258` |
| Template find time | < 30s for seeded known template. | > 60s median over 10 attempts | `library_component_deep_link` off + schedule perf review | Frontend lead / weekly | INSTRUMENTED (timer) + MANUAL beta-task | Start: `library_find_started` (`surface=templates`). Stop: `library_find_resolved` (`kind=template`) on template preview open. | `library_find_*` (Phase 1) | EV-FRONTEND-01 | `library_find_started`, `library_find_resolved` | `template.preview.title` | focus-visible | see `30` | Playwright | key-based | `src/app/workshop/library/templates/[templateId]/page.tsx` |
| Trust classification | 90%+ of visible items show a freshness state (today `fresh`/`stale`/`missing`; the `very stale` 180-day tier lands only if Phase 2 extends `getComponentPricingFreshness` + the three 90-day constants in lockstep — C-001). Low-confidence cue where `confidence` is empty. | < 70% classified over 50 sampled renders | `library_trust_chips` off; investigate data quality | Backend lead / weekly | INSTRUMENTED (first-render-per-surface, pending `library-telemetry.ts`) + UI test | Ratio: `trust_chip_rendered` / (`trust_chip_rendered` + `trust_chip_unclassified`) per surface. | `trust_chip_*` (Phase 2) | EV-BE-04 | `trust_chip_rendered`, `trust_chip_unclassified` | `trust.*.label` | see `31` | n/a | jsdom + Playwright | key-based | `src/components/workshop/library/component-facet-filter.tsx:61` |
| Quick Add completion | Basic component saved in < 90s. | > 180s median over 10 attempts | `library_quick_add` off; review required-field set | Frontend lead / weekly | INSTRUMENTED (timer) + MANUAL beta-task | Start: `quick_add_started`. Stop: `quick_add_saved` on success return of `createCostLibraryComponent`. | `quick_add_*` (Phase 3) | EV-FRONTEND-08 | `quick_add_started`, `quick_add_saved` | `quick_add.*` | see `31` | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Insert accuracy | Insert names and uses intended estimate/project. | Any `insert_target_mismatch` > 1% of attempts | `library_trust_chips` off if related to trust summary; otherwise hold release | Frontend lead / per-phase gate | DOM/e2e (PRIMARY) + supporting event | n/a (correctness). | `insert_target_*` (Phase 4) | EV-FRONTEND-07 | `insert_target_confirmed`, `insert_target_mismatch` | `insert_target.*` | see `31` | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Privacy | 0 private source fields in public/share `snapshot_json`. | Any private field present | Hold release; revert snapshot builder change | Security lead / per-release | AUTOMATED/MANUAL ASSERTION | n/a. | none (assertion) | EV-SEC-02 | n/a | `trust.public_snapshot.label` | n/a | `rg` + Playwright | key-based | `src/app/share/[token]/page.tsx` |
| Large-list usability | 500 visible rows within Phase-0A-measured budget. | Exceeds `30-PERF-BUDGET-AND-REGRESSION-GATES.md` no-go thresholds | Apply fallback ladder in `30` §6; if exhausted, hold Phase 5 | Perf lead / Phase 0A + 5 | MANUAL (perf smoke) | n/a. | none (owned by `16`) | EV-PERF-01 | n/a | n/a | n/a | see `30` | Playwright | n/a | `src/lib/workshop/virtualization-flags.ts` |

### Manual-sampling fallback

If telemetry lands late or the `recordLibraryEvent` seam is not ready (the net-new `src/lib/component-library/library-telemetry.ts` is a Phase-0A prerequisite owned by the Telemetry lead; until it ships, every INSTRUMENTED metric falls back to the manual path below — this is the live measurement path during closed beta):

| Metric | Fallback method | Owner | Evidence |
|---|---|---|---|
| Component/template find time | Moderated beta task with stopwatch + screen recording. | QA lead | EV-QA-FIND-01 |
| Quick Add completion | Moderated beta task with stopwatch + screen recording. | QA lead | EV-QA-QUICK-01 |
| Trust classification | Manual spreadsheet audit of 50 rendered items across surfaces. | QA lead | EV-QA-TRUST-01 |
| Insert accuracy | DOM/e2e assertions on `resolveEstimateTemplateInsertTarget` return remain the primary proof. | QA lead | EV-QA-INSERT-01 |
| Privacy | Static `rg` + snapshot redaction test remain primary. | Security lead | EV-SEC-02 |
| Large-list usability | Perf smoke with Playwright + DevTools Performance. | Perf lead | EV-PERF-01 |

### Reporting surface and review cadence (closes §3 gap "no metric dashboard/owner cadence")

There is no production telemetry dashboard in closed beta (the sink is `console.warn` per C-009). The reporting surface is:

| Signal | Sink | Review cadence | Owner | Trigger if threshold breached |
|---|---|---|---|---|
| `library_find_*`, `trust_chip_*`, `quick_add_*`, `insert_target_*`, `dense_mode_*` events | browser DevTools console (captured during moderated beta tasks) + recorded screen sessions | weekly beta review | Planning lead | apply the per-metric rollback trigger (table above) + schedule a fix |
| Manual-sampling fallback results (stopwatch, screen recording, audit spreadsheet) | shared beta-review doc (QA lead owned) | weekly beta review | QA lead | compare against the same thresholds; if breached, applies the same rollback trigger |
| Snapshot redaction assertion | CI / pre-release `rg` + Playwright | per release | Security lead | hold release (no-go) |
| `bun run test:dom` suite status | CI | per PR | Release lead | any failure blocks merge |
| Phase-0A perf baseline + dense-mode steady-state frame | doc 24 §"Perf baseline measurement note" artifact (Playwright `--trace on` median of ≥3 runs) | Phase 0A gate, then re-measured at Phase 5 dense | Perf lead | apply fallback ladder in `30` §6; if exhausted, hold Phase 5 |

### `very stale` tier resolution (closes §3 gap "resolve `very stale` tier scope vs doc 11")

Per `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-001/C-021: the 4-tier trust taxonomy (`fresh`/`stale`/`very stale`/`missing`) is the **beta-target state**, but today's code returns only `fresh`/`stale`/`missing` via `getComponentPricingFreshness` (`src/components/workshop/library/component-facet-filter.tsx:61`). The `very stale` 180-day tier is **net-new Phase-2 work** — implementing it requires lockstep edits to `COMPONENT_FACET_STALE_DAYS` (`component-facet-filter.tsx:12`), `LIBRARY_OVERVIEW_STALE_PRICING_DAYS` (`src/lib/repositories/component-library-repository.ts:827`), the hardcoded "90 days" string at `src/components/workshop/library/overview/LibraryOverview.tsx:114`, AND `getComponentPricingFreshness` itself. **Until that Phase-2 work lands, the "Trust classification" metric above is measured against the 3-tier reality** (no `very stale` data exists to classify). The Phase-2 extension is owner = Backend lead, evidence = EV-BE-04, flag = `library_trust_chips`.

---

## 5. Release cutline

Ship across the canonical phase order (0A → 0B → 1 → 2 → 3 → 4 → 5; see `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` §Canonical Phase Map). The MVP cutline is everything through Phase 5.

| Cutline item | Phase | Real binding | QA/browser proof marker | Owner | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Actor/authz + data-exposure tests; cache-invalidation tests; perf-seed baseline | 0A Contract Lock | Scaffold route-state/authz/cache/stale-target tests; extend `scripts/seed-performance-test-data.ts`; mutation rows name EXACT query key(s) to invalidate (`WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` is the un-scoped cache-bleed surface). | `bun run test:dom` green; `_PHASE-0A-PERF-BASELINE.md` exists. | Backend lead | n/a | git revert of test scaffolding | EV-BE-01 | n/a | n/a | n/a | see `30` | jsdom | n/a | `19` §Query Keys |
| Folder create/rename/delete app-owned overlays; selected-component URL param with inspector open/close | 0B Overlay & Route-State | Replace `ComponentLibraryManager.tsx` `window.prompt`/`window.confirm` (create `:1493`, rename `:1515`, delete `:1534`) + `AddComponentModal.tsx:963` dirty-discard with text-prompt dialog; add `?component=<id>` route state in `LibraryPageClient.tsx`; fix bulk-archive copy (`BulkDestructivePreviewModal.tsx:107-108`). | `bun run test:e2e` on `e2e/workshop-library-routes.spec.ts`; overlay focus assertions pass. | Frontend lead | `library_folder_dialogs`, `library_component_deep_link` | redeploy flag=false | EV-FRONTEND-02 | `library_find_*` (route state), `quick_add_abandoned` | `folder.*`, `component.dirty_discard.*`, `bulk_archive.*` | alertdialog, focus-trap | see `30` | Playwright | key-based | `19` §Verified File Paths |
| Overview hierarchy that routes to exact item | 1 Findability | Overview search continuity to `?component=<id>` (`searchLibraryOverview` already returns `id`s at `actions.ts:1576-1590`); applied-filter chips + reset; result count/scope strip. | `bun run test:dom` search continuity test; Playwright screenshot of filter chips. | Frontend lead | `library_component_deep_link` | redeploy flag=false | EV-FRONTEND-01 | `library_find_*` | `library.search.*`, `component_card.count` | focus-visible | see `30` | Playwright | ICU plural | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx:258` |
| Glass redesign — Phase 1 skeleton | 1 Findability (glass) | Liquid-glass skin as a first-class surface: `librarySurfaceClass(variant, slot)` slot system mirroring `estimate-surface-variant.tsx`; glass workspace well + rails + paper centre + chrome + liquid buttons + warm-glass CTA + provider + grids on both tabs; cards stay paper this phase. See `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md`. | Playwright screenshot diff vs `dashboard-glass` reference; deferred-blur arming (`data-glass="ready"`); jsdom never asserts blur. | Design lead | `library_glass_shell` | remove provider (defaults to `paper`) | EV-G-008/009/010/013 | `library.surface.rendered{variant}` | n/a | AA contrast both variants; reduced-transparency fallback | one blur per region; LCP <100 ms vs baseline (`30`) | Playwright paper+glass at `xl`/`md` | no text change; RTL preserved | NEW `src/components/workshop/library/library-surface-variant.tsx` mirroring `src/components/workshop/estimate-surface-variant.tsx` |
| Component row/inspector source trust | 2 Source Trust | Trust chips bound to real columns (`pricing_date`, `pricing_source`, `confidence`) and helpers (`getComponentPricingFreshness`, `getStalenessTone`/`getStalenessLabel`) on overview/recent/template rows + `ComponentInspectorDock.tsx` + insert. | UI test asserting chip render over real columns; Playwright screenshot. | Backend lead | `library_trust_chips` | redeploy flag=false | EV-BE-04 | `trust_chip_rendered`, `trust_chip_unclassified` | `trust.*.label`, `trust.*.tooltip` | see `31` | n/a | Playwright | key-based | `src/components/workshop/library/component-facet-filter.tsx:61` |
| Quick Add required-field flow | 3 Quick Add | Quick-add path in `AddComponentModal.tsx` per the CANONICAL QUICK ADD CONTRACT. | `bun run test:dom` quick-add validation test; Playwright end-to-end save. | Frontend lead | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 | `quick_add_*` | `quick_add.*` | see `31` | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/AddComponentModal.tsx` |
| Template preview trust summary | 4 Templates | `resolveEstimateTemplateInsertTarget` insert target, `ui/creatable-combobox.tsx` move, computed-join template trust summary. | `bun run test:e2e` insert-target flow; DOM asserts on returned `projectId`/`estimateId`. | Frontend lead | `library_trust_chips` (summary) | redeploy flag=false | EV-FRONTEND-07 | `insert_target_confirmed`, `insert_target_mismatch` | `insert_target.*` | see `31` | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Component card/dense state hierarchy | 5 Dense Maintenance | Net-new density toggle + table-vs-grid per `12`, reusing `src/lib/workshop/virtualization-flags.ts`; promote template gallery rows to content-grade `.workshop-project-card-glass` (component cards promoted in Phase 2). Glass+density collision: card geometry holds at dense row heights; glass slots degrade to `--glass-bg-fallback` when `data-glass="ready"` unset. LAST. | `bun run test:e2e` narrow-viewport browse proof (`ADV-MOBILE-BROWSE`); dense-mode keyboard assertions; Playwright glass-card screenshot vs dashboard reference. | Frontend lead | `library_dense_mode` + `library_virtualization_enabled` + `library_card_glass` | redeploy flag=false | EV-FRONTEND-09, EV-G-012 | n/a | `dense_mode.*` | see `31` | see `30` | Playwright | key-based | `src/lib/workshop/virtualization-flags.ts`; `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` §4.4/§11 |

Deferred (future-safe but not in cutline):

| Deferred item | Owner | Phase | Rationale | Evidence |
|---|---|---|---|---|
| Bulk import/export UI | Backend lead | Phase-later | No current route/component target; future-safe validation in `15`. | EV-PLAN-09 |
| Advanced file attachment management | Frontend lead | Phase-later | Out of MVP scope. | EV-PLAN-09 |
| Provider synchronization | Backend lead | Phase-later | Out of MVP scope. | EV-PLAN-09 |
| Marketplace integrations | Planning lead | Phase-later | Out of MVP scope. | EV-PLAN-09 |
| Proposal-publishing controls for cost-source metadata | Security lead | Phase-later | Snapshot builder currently redacts; explicit publishing is future. | EV-SEC-02 |
| Full template-builder redesign | Frontend lead | Phase-later | Out of MVP scope. | EV-PLAN-09 |

---

## 6. Quick Add decision

| Statement | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Quick Add is in the MVP because it supports beta learning. It follows the CANONICAL QUICK ADD CONTRACT and writes `public.cost_library_items` via `createCostLibraryComponent` with NO schema change. Required: `name`, `category` (free text, required taxonomy axis), `unit`, `unit_cost`. Optional: supplier/brand, `pricing_date`, `pricing_source` (source URL, validated app-side), `confidence` (free text). `libraryFolderId` optional; defaults to selected folder. Folder and category are distinct axes. | Frontend lead | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 | `quick_add_*` | `quick_add.*` | see `31` | n/a | Playwright | key-based | `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` §Canonical Quick Add Contract |
| A controlled vocabulary for `category`/`confidence` would need a migration and is DEFERRED. Price history, lifecycle state changes, and attachments belong in Advanced Edit. | Planning lead | Phase-later | n/a | n/a | EV-PLAN-09 | n/a | n/a | n/a | n/a | n/a | n/a | `19` §Data Layer |

---

## 7. Trust and privacy decision

| Statement | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Source trust is visible inside protected workspace Library surfaces (gated by RLS + `is_workspace_editor`/`is_workspace_member`; viewer is read-only). The public/share surface is a FROZEN snapshot — `src/app/share/[token]` + `src/app/api/share/[token]/route.ts` render `project_publications.snapshot_json`, never a live Library query. | Security lead | 0B | n/a | revert snapshot builder change | EV-SEC-02 | n/a | `trust.public_snapshot.label` | n/a | n/a | Playwright | key-based | `src/app/share/[token]/page.tsx` |
| Raw `pricing_source` URLs, internal supplier notes, free-text `confidence`, workspace-only `cost_library_item_price_history`, and source linkage stay out of `snapshot_json` unless a later explicit publishing feature changes the rule. | Security lead | 0B | n/a | revert snapshot builder change | EV-SEC-02 | n/a | `trust.public_snapshot.label` | n/a | n/a | `rg` + Playwright | key-based | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` |

---

## 8. Product risks

| Risk | Mitigation | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Users treat stale prices as current. | Derive freshness via `getComponentPricingFreshness` (`fresh`/`stale`/`very stale`/`missing`, 90-day window) beside price; warn on insert when `targetStale=true`. | Backend lead | 2 | `library_trust_chips` | redeploy flag=false | EV-BE-04 | `trust_chip_rendered`, `insert_target_confirmed` | `trust.*.label`, `insert_target.stale_target` | see `31` | n/a | Playwright | key-based | `src/components/workshop/library/component-facet-filter.tsx:12` |
| Quick Add creates low-quality data. | Hold required set to 4 fields per Quick Add Contract; validate at `createCostLibraryComponent`; surface `missing` cue when `pricing_date`/`pricing_source` absent. | Frontend lead | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 | `quick_add_failed` | `quick_add.validation.*` | see `31` | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Dense mode becomes hard to use. | Keep card and dense modes complementary with visible applied-filter chips/reset; density toggle is Phase 5 LAST and reuses `src/lib/workshop/virtualization-flags.ts`. | Frontend lead | 5 | `library_dense_mode` | redeploy flag=false | EV-FRONTEND-09 | n/a | `dense_mode.*` | see `31` | see `30` | Playwright | key-based | `src/lib/workshop/virtualization-flags.ts` |
| Library exposes proprietary cost intelligence. | Public surface is frozen `snapshot_json`; enforce omission in snapshot builder and test per `14`; assert no `recordLibraryEvent` under `src/app/share`. | Security lead | 0B | n/a | revert snapshot builder change | EV-SEC-02 | n/a | `trust.public_snapshot.label` | n/a | n/a | `rg` + Playwright | key-based | `src/app/share/[token]/page.tsx` |
| Scope expands into full catalog management. | Hold MVP cutline through Phase 5; import/export remains future-safe but deferred (see `15`). | Planning lead | all | n/a | scope reduction | EV-PLAN-09 | n/a | n/a | n/a | n/a | n/a | n/a | `00-PLAN.md` |

---

## 9. Cross-references

- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — authoritative names, enums, query keys, server actions, phase labels, glossary, and Quick Add contract.
- `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` — event taxonomy and timing methodology.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` — `?component=<id>` route state and `resolveEstimateTemplateInsertTarget` insert contract.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` — data classification and frozen `snapshot_json` redaction.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` — large-list budget and payload/concurrency work.
- `21-FEATURE-FLAGS-AND-ROLLOUT.md` — per-phase flags and rollback.
- `24-EXECUTION-EVIDENCE-LEDGER.md` — pre-registered proving commands and pass criteria.
- `30-PERF-BUDGET-AND-REGRESSION-GATES.md` — final perf budgets and no-go thresholds.
- `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-001 — `very stale` tier resolution.
