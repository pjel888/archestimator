# Agent Coordination Brief — Library Page Plan Pack → 100/100/100

> **WORKING ARTIFACT (not a scored plan doc).** This brief and the
> `LOOP_LEDGER.md` are the coordination backbone for the parallel agent pass
> driving this pack to a genuine **Rubric B 100/100/100** (planning-achievable
> = implementation-ready, NOT execution-complete). They are read by every
> agent and updated by the lead (orchestrator) between waves. Do not score
> these two files in `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md`.
>
> Lead/orchestrator: Claude (this session). Multiple agents may touch this
> folder concurrently — **strict file-ownership discipline applies** (§4).

---

## 2026-06-22 scope override — Library finalization only

This brief began as a planning-only audit brief. The current pack state is
implementation/evidence closure for the **Library Page Overall Improvement**
work only. Active writes for this pass are limited to:

- Library copy contract/evidence closure.
- Library plan-pack status and evidence rows.
- Cross-pack coordination notes that prevent conflicts with
  `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance`.

Do not use this brief to reopen unrelated landing, auth, public, Project Data,
database reset, or Trust/Governance implementation work. The Trust/Governance
pack may read/cite Library evidence, but it owns its own implementation plan
and must take explicit locks before touching shared Library release artifacts.

---

## 0. The goal (one paragraph)

Drive every scored doc in this pack (`00-PLAN.md` … `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` + `README.md`) to a genuine **100 / 100 / 100** on **Strategy / Quality / Implementation-Readiness** under **Rubric B** (planning-achievable = the plan is complete enough that an engineer can start building without a meeting; execution evidence — rendered UI, green tests, applied migrations, measured perf — stays **pre-registered** in `24-EXECUTION-EVIDENCE-LEDGER.md`, never faked). This is a **planning-only task: do not write or change application code.** You edit plan docs only.

The honest starting point (per `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` §1, 2026-06-21 re-audit): pack average **~81** (S86.1 / Q82.5 / R74.3). The lowest docs are the companion *contract* docs (33=55.7, 28=57.7, 29=64.0, 30=66.0, 31=66.7, 32=66.7, 34=66.3) — they define a dimension but have not grounded it per-surface in real code. Raising them = the bulk of the work.

## 1. What "100/100/100" concretely means (the rubric — read doc 25 §0 + doc 34 §3)

- **Strategy (100):** clear problem, goals, non-goals, user value, phase sequencing, measurable success criteria — grounded in real product reality, not aspirational.
- **Quality (100):** every load-bearing claim is bound to **real code** (`src/...` file:line or named symbol), edge cases + error states named, measurable pass conditions, no vague language ("TBD"/"later"/"should"), cross-doc consistent.
- **Implementation-Readiness (100):** every **gate row** (implementation task / acceptance gate / high-risk contract row — NOT informational rows) either **satisfies all 12 dimensions inline OR delegates each missing one to a named companion doc with a `doc:section` pointer**. The 12 dimensions: Owner · Phase · Flag · Rollback · Evidence-ID · Telemetry · Copy-key · A11y · Perf · Browser-proof · i18n/RTL · Binding(file:line). **Informational rows** (UX principles, user-flow narratives, copy keys, design primitives, event definitions) **delegate** — they do NOT need the inline 12-dim template (doc 34 §3 relaxed scope). This delegation is what makes companion docs load-bearing: their job is to define the dimension the other docs delegate to.

**Do NOT fake execution evidence.** If a gate needs "rendered UI screenshot" or "measured perf baseline," it points to a row in `24-EXECUTION-EVIDENCE-LEDGER.md` (command + pass-criterion + owner + phase) — that is the honest, complete state for a planning task. Never assert a measurement that was not taken.

## 2. Authoritative grounding (read these BEFORE editing; 19 wins all conflicts)

| Source | Why you read it |
|---|---|
| `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` | **KEYSTONE.** Single source of truth for every file:line / enum / query key / RPC / server action / constant / test command. If any other doc disagrees with 19, **19 wins** and you fix the other doc. Phase map: `0A → 0B → 1 → 2 → 3 → 4 → 5`. |
| `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` §3 | Your **work list**: per-doc gaps + concrete fix plans (covers docs 00–24 + README; for companion docs 28–35 derive the path-to-100 from §1 gaps + doc 34). |
| `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` §3 | The 12-dimension standard + **relaxed scope** (gate-rows-only). Defines what counts as an "actionable/gate row" vs "informational row." |
| `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` | The conflict registry (C-001…C-022). If your edit creates or resolves a cross-doc conflict, log it here. **0 unresolved conflicts is a gate.** |
| `24-EXECUTION-EVIDENCE-LEDGER.md` | Where execution-only proof is pre-registered. Gate rows delegate "Evidence-ID" here. |
| `README.md` | Pack orientation + launcher matrix + artifact map. |

### Real-code grounding (the difference between 88 and 100 is binding claims to actual code)

**Liquid-glass mechanism the Library must mirror (the user's marquee priority):**
- `src/components/workshop/estimate-surface-variant.tsx` — exports `EstimateSurfaceVariant = "paper"|"glass"`, `EstimateSurfaceSlot`, `estimateSurfaceClass(variant, slot)`, `EstimateSurfaceVariantProvider` + `useEstimateSurfaceVariant()`. **This is the slot model `librarySurfaceClass(variant, slot)` in doc 35 mirrors.** Read it.
- `src/components/system/LiquidGlassReady.tsx` — deferred arming: paints blur-OFF, then arms after first paint + idle via `<html data-glass="ready">` + animatable `@property` (`--l-blur-amount`). Read it before writing any glass-arming claim.
- Glass tokens use the **`--l-*` prefix** in `src/app/globals.css` (`--l-border`, `--l-bg`, `--l-blur-amount`, `--l-radius`, `--l-nav-*`, …). Estimate sheet glass branches: `surfaceVariant === "glass" ? "border-[color:var(--l-border)] bg-white/30" : "border-hairline bg-white"` (see `EstimateSheetContent.tsx`, `ResizableSidePanel.tsx`).
- Workshop dashboard glass reference: `src/components/workshop/dashboard/` — `WorkshopDashboard.tsx`, `DashboardGlassPanel.tsx`, `DashboardHero.tsx`, `ContinueCard.tsx`, `CreateActions.tsx`, `LibraryHubCard.tsx`, etc.

**Library surfaces (current = 100% paper/flat — `bg-white`, zero `--l-*`, zero backdrop-filter):**
- `src/components/workshop/library/` — `ComponentInspectorDock.tsx`, `EditComponentDrawer.tsx`, `LibraryComponentsRoute.tsx`, `LibraryTabPanel.tsx`, `LibraryTabsLayoutClient.tsx`, `LibraryTitleBarClient.tsx`, `component-facet-filter.tsx`, `overview/` (`LibraryOverview.tsx`, `LibraryOverviewSearch.tsx`, `RecentComponentCard.tsx`), `template-editor/` (`TemplateEditorClient.tsx`, `TemplateEditorSheet.tsx`, `TemplateStructureTree.tsx`, …), `templates-browse/` (`TemplatesBrowseManager.tsx`, `TemplateGallery.tsx`, `TemplatePreviewDock.tsx`, `InsertIntoEstimatePicker.tsx`, `TemplatesBrowsePageClient.tsx`).
- `src/components/workshop/component-library/` — `ComponentCard.tsx`, `NewComponentForm.tsx`, `NewTemplateModal.tsx`, `CommandPalette.tsx`, `helpers.ts`, `index.tsx`, `templates.ts`, `tree/`.
- `src/components/workshop/component-library-manager/` — `ComponentLibraryManager.tsx`, `AddComponentModal.tsx`, `LibraryFolderTree.tsx`.

**DB / schema (for docs 13/14/32/33):** `supabase/migrations/` — `cost_library_items` canonical columns span `20260522064018_component_library_taxonomy_source.sql`, `20260522091621_component_library_templates.sql`, `20260524053500_component_brand_library.sql`, `20260523120957_component_library_item_versioning.sql`, `20260524120322_component_library_variants.sql`, `20260525095729_component_library_name_category_variant_cleanup.sql`, RLS in `20260614144136_command_split_core_public_policies.sql` + `20260614144712_narrow_private_rls_policies_to_authenticated.sql`, mass-deletion governance `20260603160000_mass_deletion_governance.sql`. **No new migrations in phases 0A–5** (doc 33 enforces the no-migration gate).

**Verify bindings with `rg`/`fd` before citing them.** A stale `file:line` ref is the #1 thing that keeps Quality below 100. If a cited line moved, update it.

## 3. Canonical name registries — DO NOT invent new names; reuse or extend these

When a gate row needs a telemetry event / copy key / flag / owner / phase, use the existing canonical name from the owning doc. If a needed name does not exist, **add it to the owning doc AND record it in `LOOP_LEDGER.md` §"New canonical names"** so the lead can reconcile and other agents can adopt it.

| Dimension | Owning doc | Namespace |
|---|---|---|
| Phase labels | `19` phase map | `0A 0B 1 2 3 4 5` (+ `Phase-later`) |
| Owner roles | `27` | the 12 named roles (planning lead, design lead, backend lead, DB lead, security lead, perf lead, a11y lead, i18n lead, QA lead, telemetry lead, copy lead, release lead) |
| Telemetry events | `20` | snake_case `library_*` / `trust_*` / `quick_add_*` / `insert_*` / `overlay_*` |
| Copy keys | `22` | `trust.*`, `confirm.*`, `empty.*`, `error.*` namespaces |
| Feature flags | `21` | env-key + accessor + surface triple |
| A11y criteria | `31` | per-surface pass conditions |
| Perf budget | `30` | provisional until Phase 0A baseline (conflict C-015) |
| Browser-proof | `29` | jsdom-OK vs Playwright-required |
| i18n/RTL | `28` | locale scope + ICU MessageFormat keys |

## 4. File-ownership discipline (CRITICAL — concurrent agents)

- **You may READ any file.** You may **WRITE/EDIT only the docs assigned to you** by the lead (listed in your task prompt) **plus append-only entries to `LOOP_LEDGER.md`**. Editing a doc you don't own = a conflict the lead must revert.
- Every change you make to an owned doc: append a one-line entry to `LOOP_LEDGER.md` (`doc | section | change | why`). This is how agents "talk to each other."
- If you discover a cross-doc conflict or need a canonical name another agent owns, **log it in `LOOP_LEDGER.md` §"Conflicts / requests"** with a proposed resolution. Do not silently edit another agent's doc.
- Keep edits **tight and load-bearing** (ponytail principle): every added section closes a named §3 gap or a doc-34 dimension. No boilerplate, no "for future use" scaffolding. Deletion > addition where a doc is bloated.

## 5. When you finish your assigned docs

1. Re-score each of your owned docs 1–100 on S/Q/R with a one-line evidence justification, targeting 100/100/100. Be honest — if you cannot honestly defend 100, say so and state the residual.
2. Append your scores + any residuals/conflicts/new-names to `LOOP_LEDGER.md`.
3. Return a concise summary to the lead: docs owned, before→after scores, top 3 changes per doc, residuals needing lead resolution, any proposed new doc.
