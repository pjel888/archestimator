# 10 — Product/Architecture Strategy & Success Metrics

**What this is:** The strategic layer the first pass deferred — *should* this feature be completed, *is the architecture right*, and *what does "working well" mean in numbers*. Without this, "implementation readiness" is tactical only; this doc makes the strategy explicit so the build is aimed correctly.

---

## 1. Is "Projects Auto-Added To Templates" the right feature?

**Premise (owner-stated):** Templates is a top feature; reuse across projects is core to estimator productivity.

**Strategic case FOR completing it:** Estimators repeatedly rebuild the same structures (a powder room, a kitchen, a service-floor block) across projects. Today reuse requires either (a) hand-saving each as a custom template, or (b) rebuilding from scratch. Letting any prior project's tab/group/area be **browsed and inserted live** removes that friction and compounds value as the workspace grows — it turns every estimate into reusable inventory automatically. That is a genuine, defensible productivity lever for an estimating tool, not scope creep.

**Strategic case AGAINST (the honest counter):** It adds a second, fundamentally different source model (virtual read-through) on top of persisted templates, with its own access, performance, and staleness surface. The first pass shows that complexity has already produced a broken, half-built result. If the team cannot fund the insert path, hardening, perf, and tests, the *responsible* alternative is to **scope project sources to "browse + Save as template"** (which already works) and remove the dead insert/drag seams — delivering a coherent smaller feature instead of an incoherent larger one.

**Recommendation:** Complete it (build the insert path) — the productivity case is real and the architecture is sound (see §2). But treat **D-B as a genuine fork**: only commit to the full build if Phases 1–2 of [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) (U2/U4) can be funded with their tests (U3 — the library-route removal — is cheap and ships regardless). A shipped UI shell with no write path (today's state) is the worst of both worlds and must not recur.

---

## 2. Is the architecture (virtual read-through sources) right?

**Decision under review:** origin D-11 — project-derived sources are *virtual/read-through*, never persisted into template tables unless explicitly saved.

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Virtual read-through (current)** | always fresh; zero duplication; no sync job; "browse any project live" | couples templates to live estimate access + perf; staleness-vs-insert needs care; per-level fan-out | **Keep** — correct for an always-fresh "reuse anything" model |
| B. Persist-on-save only (cut the live browse) | simplest; one source model; no perf/access coupling | loses the headline value (can't browse projects live); estimators must pre-curate | Fallback if D-B = cut |
| C. Materialized/denormalized project-source index | fast search; bounded reads | a sync pipeline + staleness window + storage; heavy | Over-build now; revisit only if perf at scale demands it after A is correct |

**Conclusion:** Option A is the right model *provided* its three known weaknesses are engineered, not assumed: (1) **access** — reads/inserts must be RLS-scoped and the insert must re-check `can_edit` (SEC-1/U4); (2) **performance** — search and outline must be server-side/cached, not per-keystroke tree fan-out (PERF-1/3, U5/U6); (3) **staleness** — insert must re-read the source by id at insert time (DATA-4, U2). The current implementation skipped all three; the plan's job is to supply them. The architecture is not the problem — the unfinished engineering is.

**Architectural guardrail:** do **not** drift toward Option C (a materialized index) as a shortcut for the PERF-1 search cost. Server-side SQL search over indexed name columns (U5) solves it within Option A; a sync pipeline would add a staleness surface the read-through model was chosen to avoid.

### 2a. Surface scoping — where each source class belongs (D-C, decided 2026-06-13)

The two template surfaces are **intentionally different**, by product decision:

| Source class | Templates **library** route (`/workshop/library/templates`) | **In-estimate** Templates panel |
|---|---|---|
| Custom user templates | ✅ shown | ✅ shown |
| Supplier templates (future) | ✅ planned | ✅ planned |
| Project-derived (read-through) sources | ❌ **removed** (D-C) | ✅ shown |

Rationale: the **library** is a curated catalogue of reusable *template-class assets* — things authored to be reused (custom now, supplier-provided soon). Project-derived sources are a different thing: live, transient reuse that only makes sense **in the act of building an estimate**, where you reach for "that powder room I did on another project." Surfacing live projects in the library conflated a catalogue with an insertion affordance, produced the inert rows ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) DEF-3 / [02](02_UX_UI_AUDIT.md) UX-1/UX-2), and added perf/access surface to a route that didn't need it. **D-C removes project sources from the library route** (implemented in [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U3) and keeps the full project-source experience in the in-estimate panel. This supersedes the first pass's "bring the route to parity" suggestion — removal is the cleaner, lower-risk resolution and clarifies the information architecture.

**Forward note (suppliers):** design the library tree's section model so a **"Suppliers"** section slots in beside "Custom Templates" without reintroducing a project section — the library's source union should be *template-class only* (custom ∪ supplier), never project-derived.

### 2b. Supplier templates are blocked below the UI — a spike that must precede U2/U4

Treating "Suppliers" as just another tree section (§2a) understates it. Supplier templates — especially a **cross-workspace / global** catalogue — are blocked at the **data model, RLS, and RPC** layers:

- **Data model:** `estimate_templates.workspace_id` is `NOT NULL` FK → `workspaces` (`supabase/migrations/20260522091621_component_library_templates.sql:6`). A global/shared catalogue needs either a nullable/sentinel workspace, a `licensed_workspaces` join, or a separate `supplier_templates` table.
- **RLS:** all three template policies gate on `is_workspace_member(workspace_id)` (`:583-620`) — there is no global-read path. Suppliers need a read (global/licensed) + write (admin-only) split.
- **Insert RPC:** `insert_estimate_template_into_estimate` **hard-rejects** any template whose workspace differs from the target estimate (`:250-252`). A supplier insert would need an explicit cross-workspace-copy exception.
- **Cache key (S-2):** `["workspace-component-library"]` is **not workspace-scoped** (`EstimateSheetContent.tsx:723`). No bug today (no workspace switcher exists), but multi-tenant/supplier work would make it serve the wrong workspace's library — key it by workspace when that lands.
- **Pricing freshness (S-3):** supplier templates are *persisted* rows whose prices drift against supplier reality — the **opposite** staleness problem from the project-source read-through model. The existing `source_snapshot` + price-date columns (`:41,543-544`) are a foundation, but there's no re-pricing / "as-of" / attribution policy.

**Action:** add a **supplier-templates data-model spike** that decides owning-scope (global vs licensed-per-workspace), the RLS read/write split, the RPC cross-workspace-copy exception, and the price-provenance policy — **sequenced before U2's insert-RPC migration and U4's hardening**, so the security-critical RPC isn't built on a workspace-equality assumption a later supplier phase must rip out.

**Prior art (reasoned, no web access):** the chosen **copy-on-insert** stance (the RPC duplicates the subtree rather than linking, `…templates.sql:312-386`) matches the safer end of the Figma/Notion *instance-vs-copy* spectrum and the estimating-tool *cost-book/assembly* pattern. For suppliers, borrow the **versioned, read-only, licensed catalogue** model (distinct from user-authored editable rows) rather than dropping supplier rows into the same editable `estimate_templates` space.

---

## 3. Strategic lessons (so this doesn't recur)

- **Don't ship UI/drag seams without the write path.** The dead `onInsertProjectSource` / `readProjectSourceDragPayload` seams ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) DEF-2) created the *appearance* of a feature. Feature flags or hiding the entry points would have been more honest than a disabled-with-reason menu item shipped to a top surface.
- **Mock-only tests hide environment-coupled breaks.** `reusable-sources-actions.test.ts` mocks Supabase, so the live 500 is invisible in CI. Any feature whose correctness depends on schema/migration state needs at least one **integration test against a migration-applied DB** (U1/U16).
- **"Merge-ready" needs a live smoke, not just green unit tests.** The completion audit's claim ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) DEF-5) would have been caught by one authenticated click-through of the exact flow — which this audit did.

---

## 4. Success metrics & Definition of Done (feature-level)

"100% effective" needs measurable targets. The feature is **done** when all of the following hold (each maps to plan units in [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) and [11](11_REQUIREMENTS_TRACEABILITY_AND_SEQUENCING.md)):

**Correctness / reliability**
- Project-source outline loads with **0 server errors** in the live env (U1) — measured: expand every project→estimate in a seeded workspace, expect 0 × HTTP 500.
- **0 raw-error leaks** to the UI; all failures render a friendly, `role="alert"` message (U1b).
- Project-source insert succeeds end-to-end (drag + menu + bulk) with provenance recorded (U2).

**Security**
- All **9 denial scenarios proven** by the RLS harness/action tests, including 4–7 once the insert exists (U2/U4/U16).
- A workspace-member *viewer* on a restricted estimate **cannot** insert (SEC-1 closed, U4).

**Performance (runtime budgets — manual-proof-pending until measured)**
- Reusable-source search: **≤ a small constant** number of DB round-trips per query (not O(projects×tabs)) (U5).
- Outline p95 **< 500 ms** local; cached so collapse+re-expand fires **0** refetches within the window (U6).
- Editor tab tree honors the **1200/3000** load limits (U7).
- **In-estimate panel first paint:** interactive **< ~800ms p95 on a warm cache**, and the cold-cache library fetch is **≤ a small bounded number of round-trips** (not the current ~12-query/~4-stage waterfall — [03](03_PERFORMANCE_AUDIT.md) PERF-9). This is the acceptance bar for U18/U19 and the metric the 3–6s skeleton was missing.

**Coherence / UX**
- Editing a template anywhere is reflected in an open estimate panel **without remount** (DATA-1/U10).
- Library route shows **no** project sources (template-class only); the in-estimate panel carries the full project-source experience (U3, per D-C).
- `bun run lint:design-system` passes (design-system fixes, U13).

**Adoption (post-launch, leading indicators)**
- % of new estimates that use at least one project-source or template insert (target set by owner).
- Ratio of project-source inserts to manual rebuilds for repeated structures.

**Definition of Done = all "Correctness/Security/Coherence/UX" items green + runtime budgets measured and met + the traceability matrix in [11](11_REQUIREMENTS_TRACEABILITY_AND_SEQUENCING.md) fully `implemented`.**

## Truth & integrity

- **VERIFIED:** the architecture trade-offs reference real findings (SEC-1, PERF-1/3, DATA-4, DEF-2) proven elsewhere in this package.
- **JUDGMENT:** the build-vs-cut recommendation and adoption targets are strategic judgment for owner ratification, not facts; §4 runtime targets restate the origin §12 budgets (manual-proof-pending).
