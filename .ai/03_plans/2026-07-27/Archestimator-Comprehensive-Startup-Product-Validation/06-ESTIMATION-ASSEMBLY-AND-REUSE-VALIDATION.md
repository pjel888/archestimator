# Estimation Assembly and Reuse Validation

**Research status:** `DESK_AUDIT_COMPLETE / MARKET_VALIDATION_PENDING`

## Verdict

`ASSEMBLY_MERGE_WITH_TEMPLATES`

**Confidence:** `MEDIUM`

- **Decisive evidence:** `[CODEBASE_FACT | HIGH]` Assembly is not a live first-class entity. Legacy estimate-tree `assembly` nodes normalize to `group`; the current reuse UI exposes Library, Project, and Templates; tests explicitly omit a Save Assembly action.
- **Decisive evidence:** `[CODEBASE_FACT | HIGH]` Templates already support creation from tabs/areas, immutable versions, linked or copied insertion, propagation jobs, archive/restore, and retry—the behavior closest to the historical lightweight Assembly concept.
- **Missing evidence:** `[RESEARCH_GAP | HIGH]` No customer transcript, natural-language card sort, reuse observation, frequency data, or paid commitment establishes a distinct Assembly job.
- **Immediate action:** Treat reusable multi-row structures as Templates and run the language/reuse gate before adding another object.
- **Stop doing:** Stop using “Assembly” as if it were a current differentiated Archestimator capability or a settled cross-segment term.
- **Next decision gate:** Eight target estimators must sort/name examples unprompted; a separate concept proceeds only if at least six recognize it as distinct and at least five select it over Templates or Project Sources for a real task.

## Current and Historical Implementation

### Live Reuse Objects

| Object | Status | Current behavior | Repository evidence | Validation implication |
|---|---|---|---|---|
| Estimate / tab / area / rows | `LIVE` | D1-backed hierarchy, rows, duplication, deletion/restoration, library insertion | `migrations/0015_publication_admin_sidecars.sql:11`; `src/lib/estimates/actions.ts:1788`; `src/components/workshop/EstimateSheetContent.tsx:3419` | A real authoring base exists; feasibility is not the question |
| Shared Component | `PARTIAL` | Versions, price history, usage, linked rows, and detachment; project-to-shared promotion defaults off | `migrations/0028_component_library_action_support.sql:45`; `src/lib/estimates/actions.ts:2700`; `src/lib/estimates/express-components.ts:88` | Fits reusable item/rate identity; promotion behavior still needs user proof |
| Template | `PARTIAL` | Create from tab/area, immutable versions, linked or copied insertion, propagation/retry, archive/restore | `src/lib/feature-gates/catalog.ts:94`; `migrations/0092_linked_estimate_template_instances.sql:7`; `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx:478` | Already performs the most plausible multi-row Assembly job |
| Project Source | `PARTIAL` | Copy estimate/tab/area from another project as a snapshot; no future linkage | `src/lib/reusable-sources/actions.ts:609`; `src/components/workshop/component-library/index.tsx:560` | Strong alternative when users trust proven prior work more than a curated library |
| Group / Area | `LIVE` | Estimate-local hierarchy and scope organization | `src/lib/estimates/tree-hierarchy.ts:21` | Project structure, not necessarily reusable identity |
| Named estimate version | `NOT_PRESENT` | Activity history and row revisions exist; mutable `versionLabel` is not an immutable named estimate version | `src/components/workshop/estimate-sheet/activity-history.tsx:1687`; `src/lib/estimates/actions.ts:1014`; `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:60` | Do not base Assembly semantics on nonexistent estimate-version behavior |
| Assembly | `SUPERSEDED` | Legacy node normalizes to group; bundle-era residue remains but no live entity or current sidebar | `src/lib/estimates/tree-hierarchy.ts:21`; `src/components/workshop/component-library/index.tsx:196`; `tests/vitest/component-library-ui.test.tsx:1219` | A new first-class object would be a fresh product bet, not completion of a live capability |

### Historical Drift

- `[HISTORICAL_FACT | HIGH]` An archived audit describes completed Components/Assemblies/Templates tabs and bundle workflows: `.ai/09_archive/store/2026-05-21-estimate-component-library-sidebar-audit-complete/README.md:41`.
- `[CODEBASE_FACT | HIGH]` Current tests require no “Save assembly” control: `tests/vitest/component-library-ui.test.tsx:1219`.
- `[EVIDENCE_BACKED_INFERENCE | HIGH]` The product has already converged away from the historical Assembly experiment toward Components, Templates, and Project Sources.
- `[CODEBASE_FACT | HIGH]` Public landing content still advertises reusable “assemblies”: `src/components/landing-v3/landing-content.ts:34`.
- `[EVIDENCE_BACKED_INFERENCE | HIGH]` That public term currently describes Template-like behavior, not a separate live object. This is a product-language contradiction, not evidence to rebuild Assembly.

## Ubiquitous-Language Analysis

### Recommended First-ICP Language

| Product term | Meaning | Lifecycle |
|---|---|---|
| **Component** or **Cost Item** | Reusable unit-cost item or scoped row source | Can have shared identity, price/version history, and linked estimate use |
| **Template** | Reusable structure containing groups/areas/rows and defaults | Versioned source; insert as linked instance or independent copy |
| **Prior Project** / **Project Source** | Proven estimate structure copied from a completed or earlier project | Snapshot copy with provenance; no silent future propagation |
| **Group** / **Area** | Project-estimate organization | Local to the estimate unless captured as a Template |
| **Rate Build-up** | Calculated unit rate composed of labor, materials, equipment, waste, overhead, etc. | Add only for an ICP that naturally uses and pays for this model |
| **Work Package** | Project scope with responsibility, deliverables, assumptions, and possibly documents | Keep separate from a generic reusable estimating Template unless research proves convergence |

### Why “Assembly” Is Unsafe as the Ubiquitous Term

- `[EXTERNAL_PRIMARY_EVIDENCE | HIGH]` PlanSwift uses assemblies for materials, waste, and labor applied to takeoff items (SRC-C12).
- `[EXTERNAL_PRIMARY_EVIDENCE | HIGH]` Buildxact and Houzz Pro list assemblies inside broader estimating suites (SRC-C08, SRC-C09).
- `[EVIDENCE_BACKED_INFERENCE | MEDIUM]` The term is real in parts of construction estimating, but vendor usage spans trade material sets, recipes, composite rates, and reusable estimate content.
- `[RESEARCH_GAP | HIGH]` There is no evidence that Archestimator’s candidate architects, contractors, QSs, suppliers, and fit-out firms use the term consistently or expect the same propagation/version behavior.

The domain-design rule is therefore: use the smallest term with one predictable behavior. Today that is **Template**, not Assembly.

## Required Domain Questions Answered

| Question | Desk answer | Evidence status |
|---|---|---|
| Is Assembly distinct from Component? | Potentially: a multi-row/composite structure versus one reusable item, but no user proof exists | `[WORKING_HYPOTHESIS | LOW]` |
| Is it distinct from Template? | Not in current Archestimator behavior; historical lightweight bundles map naturally to smaller Templates | `[EVIDENCE_BACKED_INFERENCE | HIGH]` |
| Is it distinct from Project Source? | A curated reusable source could differ from a copied prior project, but both serve “start from proven work” | `[EVIDENCE_BACKED_INFERENCE | MEDIUM]` |
| Is it distinct from Group/Area? | A reusable source can differ from local hierarchy; current legacy assembly nodes do not preserve that distinction | `[CODEBASE_FACT | HIGH]` |
| Does it need independent identity/lifecycle? | Not demonstrated; Templates already supply identity/version/lifecycle | `[RESEARCH_GAP | HIGH]` |
| Should changes propagate? | Current Templates make linked versus copied semantics explicit; this is safer than one implicit Assembly rule | `[CODEBASE_FACT | HIGH]` |
| What happens when component prices change? | Linked component behavior exists, but the correct propagation/trust model is not customer-validated | `[CODEBASE_FACT | MEDIUM]` + `[RESEARCH_GAP | HIGH]` |
| What provenance is needed? | Source type, source version, insertion time, linked/copied mode, and later detach/update state | `[EVIDENCE_BACKED_INFERENCE | HIGH]` |
| Does first-class Assembly solve a proven problem? | No proof supplied | `[RESEARCH_GAP | HIGH]` |
| Which current concept gives fastest value? | Project Source for immediate copying; Template for curated repeat use; Component for item-level price reuse | `[WORKING_HYPOTHESIS | MEDIUM]` |
| Which compounds after repeated projects? | Components and Templates may compound; Project Sources preserve practical precedent; actual retention is unobserved | `[WORKING_HYPOTHESIS | MEDIUM]` |

## Model Comparison

Scores are directional desk hypotheses from 1 (weak) to 5 (strong), not customer ratings. For maintainability, version complexity, migration, and onboarding, `5` means simpler/lower burden. No model receives market-validation credit from these scores.

### Customer value dimensions

| Model | User recognition | Likely frequency | Time saved | Accuracy | Trust | Price freshness | WTP plausibility | Desk conclusion |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| A. Lightweight bundle | 3 | 3 | 4 | 3 | 3 | 2 | 2 | Useful behavior, but current Template copy mode already covers it |
| B. Versioned composite component | 2 | 3 | 4 | 4 | 3 | 4 | 2 | Potential value cannot justify an independent lifecycle yet |
| C. Rate build-up | 4 for QS/trades; 1–2 elsewhere | 4 in relevant trades | 4 | 5 | 4 | 4 | 3 | Plausible segment-specific product; not a universal Assembly |
| D. Scope/work package | 3 | 3 | 4 | 4 | 4 | 3 | 3 | Valuable in some workflows but crosses into broader scope/document control |
| E. Template subtype | 4 | 4 | 4 | 4 | 4 | 4 | 3 | Best fit with live product and lowest conceptual cost |
| F. Project-source reuse | 5 | 5 | 4 | 3 | 4 | 2 | 3 | Strong immediate behavior; stale/project-specific content is the tradeoff |
| G. No separate Assembly | 5 | 5 | 3 | 4 | 5 | 5 | 2 | Best default until a distinct paid job earns another object |

### Product-model and operating dimensions

| Model | Maintainability | Snapshot semantics | Version complexity | Discoverability | Insertion workflow | Data migration | Differentiation | Onboarding burden | Validation implication |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| A. Lightweight bundle | 4 | 4 | 3 | 4 | 5 | 4 | 2 | 4 | Preserve as copied small-Template behavior |
| B. Versioned composite component | 2 | 3 | 1 | 2 | 3 | 1 | 3 | 2 | Too much nesting/propagation/migration risk without proof |
| C. Rate build-up | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | Test separately with QS/trade users and their formulas |
| D. Scope/work package | 2 | 3 | 1 | 2 | 3 | 1 | 3 | 2 | Defer; overlaps Template, artifact, and commitment domains |
| E. Template subtype | 4 | 4 | 4 | 4 | 4 | 5 | 2 | 4 | Recommended current implementation boundary |
| F. Project-source reuse | 5 | 5 | 5 | 4 | 5 | 5 | 2 | 4 | Keep snapshot semantics and make provenance visible |
| G. No separate Assembly | 5 | 5 | 5 | 5 | 4 | 5 | 1 | 5 | Current default; add only after the language/reuse gate |

### Model A — Lightweight Bundle

- `[HISTORICAL_FACT | HIGH]` Closest to the archived implementation experiment: a named set of items/default quantities expanded into estimate rows.
- `[EVIDENCE_BACKED_INFERENCE | HIGH]` It is behaviorally a small copied Template.
- **Decision:** Preserve as Template insertion behavior, not another library object.

### Model B — Versioned Composite Component

- **Potential value:** One maintained reusable system with formulas, quantities, components, and source history.
- **Risk:** Requires answers for nested versions, price propagation, detach, override, quantity formulas, and historical estimate stability.
- `[RESEARCH_GAP | HIGH]` No evidence supports this complexity.
- **Decision:** Do not build.

### Model C — Rate Build-up

- **Potential value:** High for QSs and trades that calculate repeat unit rates from labor/material/equipment/waste/overhead.
- **Risk:** Different segments use different rate logic and authoritative price sources.
- `[EVIDENCE_BACKED_INFERENCE | MEDIUM]` This could become a distinct future model, but should be named Rate Build-up and tested in its own segment.
- **Decision:** Research separately; do not hide it inside Assembly.

### Model D — Scope or Work Package

- **Potential value:** Reuse hierarchy, rows, assumptions, exclusions, responsibility, and supporting documents.
- **Risk:** Overlaps Templates, project artifacts, multi-artifact Issues, and contract/work-package administration.
- **Decision:** Defer; current evidence does not justify category expansion.

### Model E — Template Subtype

- `[CODEBASE_FACT | HIGH]` Current Templates already support linked and copied insertion plus versions and propagation.
- **Potential value:** “Room template,” “trade template,” or “package template” can be smaller or larger without a new ontology.
- **Decision:** Recommended model.

### Model F — Project-Source Reuse

- `[CODEBASE_FACT | HIGH]` Copying an estimate/tab/area from another project is live and explicitly snapshot-based.
- **Potential value:** Users can start from a trusted precedent without maintaining a separate library.
- **Risk:** Old prices and project-specific assumptions can travel silently unless provenance is visible.
- **Decision:** Keep as a distinct source type and test whether it beats curated Templates in the first ICP.

### Model G — No Separate Assembly

- `[CODEBASE_FACT | HIGH]` This is effectively the current live ontology.
- **Potential value:** Lowest onboarding and maintenance burden.
- **Decision:** Default architecture until disconfirmed.

## User-Value and Switching Analysis

Candidate job:

> When I start a recurring estimate, help me begin from trusted scope and prices without rebuilding rows or accidentally inheriting stale/project-specific assumptions.

### Forces Toward Reuse

- repeated room/trade/system scope;
- bid-time pressure;
- fear of omissions;
- need for consistent structure;
- price and labor knowledge accumulated across projects;
- desire to train less-experienced estimators.

### Forces Against a Maintained Library

- every project is “different enough”;
- copying the last similar project is faster;
- stale prices undermine trust;
- maintaining another object becomes unpaid admin;
- formula/quantity behavior is hard to predict;
- users do not know whether updates propagate;
- one firm’s package does not transfer across another segment.

### Existing Alternatives

- copy/paste from spreadsheet;
- duplicate a prior estimate;
- use a prior project source;
- use a Template;
- maintain rate sheets or cost codes;
- use PlanSwift/Buildxact/Houzz/CostX or another established library/assembly feature;
- rely on estimator memory.

- `[RESEARCH_GAP | HIGH]` No evidence ranks these alternatives for the proposed first ICP.

## Semantics That Must Be Tested

The current product exposes three materially different reuse contracts:

1. **Component link:** shared identity can update linked rows, with detachment behavior.
2. **Template linked/copy:** user chooses ongoing source relationship or independent snapshot.
3. **Project Source copy:** always a snapshot, not future-linked.

- `[EVIDENCE_BACKED_INFERENCE | HIGH]` This distinction is powerful but cognitively risky.
- `[OPEN_DECISION | HIGH]` Product language must make update, detach, and price-freshness behavior predictable without documentation.

Test these tasks:

- “If the library price changes tomorrow, what changes here?”
- “If this Template publishes a new version, what happens to this estimate?”
- “Can you edit this copy without changing the source?”
- “Which source would you trust for a new project, and why?”
- “What provenance do you need before accepting an update?”

## Recommended Product Boundary

For the next evidence cycle:

- keep **Components** for item/rate identity;
- keep **Templates** for reusable multi-row structure, including small packages;
- keep **Project Sources** for precedent snapshot copying;
- keep **Groups/Areas** local to project structure;
- do not introduce Assembly as another persisted object;
- do not promise universal price propagation;
- do not add rate-build-up complexity unless one ICP proves it.

## What Would Reverse the Verdict

Reconsider a first-class model only if primary research shows all of the following:

1. A consistent natural term across the chosen ICP.
2. Repeated use at meaningful cadence.
3. A job Templates and Project Sources cannot perform cleanly.
4. Predictable quantity/formula/price behavior.
5. A need for independent identity and version history.
6. Material time/accuracy value.
7. Willingness to pay or paid retention attributable to the capability.

If the natural term is **Rate Build-up** or **Work Package**, model and name that exact domain object rather than reviving Assembly.

## Red Flags and Data Gaps

- **Red flag:** Current public copy can be read as claiming a capability the live ontology does not expose.
- **Red flag:** “Version” already means component/template versions, Activity history, and a mutable proposal label; adding Assembly versions would deepen ambiguity.
- **Red flag:** Linked propagation can damage trust if users cannot predict price/scope updates.
- **Data gap:** No observed reuse choices, time savings, error reduction, or maintenance burden.
- **Data gap:** No segment-specific vocabulary or pricing evidence.
- **Data gap:** No evidence that a separate reuse object improves activation or retention.
