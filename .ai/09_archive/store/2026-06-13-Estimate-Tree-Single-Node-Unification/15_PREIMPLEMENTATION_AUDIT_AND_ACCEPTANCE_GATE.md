# 15 - Preimplementation Audit & Acceptance Gate

**Purpose:** turn the "100% bug-free" concern into an executable gate. A plan cannot promise zero bugs, but implementation must not proceed unless every known two-kind assumption is either changed, tested, or explicitly quarantined with evidence.

This is a second-pass supplement to [06](06_GROUND_TRUTH_AND_CORRECTED_ANCHORS.md)-[14](14_EFFORT_AND_PR_SEQUENCE.md), based on a fresh live-source sweep on 2026-06-13 from branch `claude/2026-06-13-unification-plan-deepening`.

---

## A. Live sweep evidence

Fresh commands run during this pass:

```bash
rg -n "canNodeReceiveRows|canNestEstimateNodeKind|getEstimateNodeDisplayKind|kind === \"area\"|kind !== \"area\"|kind === \"group\"|kind !== \"group\"|node\\.kind|row\\.kind" src tests supabase scripts
rg -n "estimate_template_nodes|validate_estimate_template_tree|estimate_template_row_items|TemplateEditor|TemplateStructureTree|TemplatePreviewDock|TemplatesTree" src tests supabase .ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification
rg -n "reconstruct-share-tree|buildProposalExportModel|aggregate-project-charts|project-charts-repository|activityScope|includeDescendants|estimate_node_id|node:\\$\\{|getActivityScopeKey|estimate_sheet_total|contingency" src tests supabase .ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification
rg -n "ARCH_ESTIMATOR|ARCHESTIMATOR|E2E|dev-auth|DEV_AUTH|playwright|workshop-template|share.*smoke|proposal export|charts" e2e tests package.json playwright.config.*
```

High-signal result: the existing plan catches the core data-loss and migration hazards, but implementation still needs a source-sweep gate for adjacent display/read surfaces and false-green traps.

---

## B. Drift found in the current tree

Exact line anchors in `EstimateSheetContent.tsx` drifted again after the 06 table. Treat all older line anchors as orientation only; re-run the sweep before every PR.

| Surface | Current live anchor | Why it matters |
|---|---:|---|
| activity `includeDescendants` derived from kind | `src/components/workshop/EstimateSheetContent.tsx:465-474` | P3 must stop deriving scope from `group`. |
| activity row emission gate | `src/components/workshop/EstimateSheetContent.tsx:483` | Rows on former-group nodes vanish from activity scope until this is removed. |
| inline activity request cache key | `src/components/workshop/EstimateSheetContent.tsx:1080` | P3 must keep `node:{id}:{desc|direct}` stable. |
| template insert target/wrap assumptions | `src/components/workshop/EstimateSheetContent.tsx:951-967` | P6 must delete the wrap/ancestor targeting path, not only the sidebar tree path. |

**Gate:** every phase PR starts with a local "anchor refresh" note in its PR/run log. If a line moves, update the touched plan doc or cite the fresh line in the PR evidence before editing code.

---

## C. Additional surfaces that must be classified

### C1. Passive AI/copilot surfaces are not fully dormant

The plan correctly keeps AI package-builder write/apply behavior out of scope, but some passive AI/read UI is visible or Ask-only. Those surfaces must not keep saying "Group" or dropping area context after unification.

| Surface | Current anchor | Required phase decision |
|---|---:|---|
| Copilot draft area count | `src/components/workshop/EstimateCopilotFloatingButton.tsx:186-188` | P4/P6: rename from area-count semantics to node/area count or hide while AI apply remains disabled. |
| Copilot draft preview "Group"/"Area" labels | `src/components/workshop/EstimateCopilotFloatingButton.tsx:321-338` | P4: de-kind display copy if the preview remains visible. |
| Ask read-context chart node facts | `src/lib/ai/read-context.ts:1112-1118` | P2: must follow the chart own-bucket semantics or be quarantined as Ask-only stale display. |
| Ask current-estimate row `areaName` | `src/lib/ai/read-context.ts:1222-1233` | P2/P4: row provenance must use owning node/path, not `node.kind === "area"`. |

**Quarantine rule:** "AI package-builder is dormant" is not enough for files that render UI or feed Ask-read context. Each match must be one of:
- `changed`: reconciled with the one-node model;
- `feature-gated`: unreachable because AI is disabled and the PR proves the flag path;
- `dormant-write-only`: package-builder draft/apply internals, with no visible read/display path.

If AI or package-builder surfaces are reactivated during or before this rollout, add a dedicated follow-on phase before P6. Do not silently reactivate them under the main unification PRs.

### C2. Template/library browse and summary surfaces

The existing [13](13_TEMPLATE_EDITOR_PARITY.md) catches the editor and browse tree, but the sweep found adjacent summary/copy surfaces that must ride P4/P5.

| Surface | Current anchor | Required change |
|---|---:|---|
| template summary `groupCount` / `areaCount` | `src/lib/component-library/estimate-templates.ts:367-386` | Replace split counts with node/sub-area/row summary. |
| New Template modal source summary | `src/components/workshop/component-library/NewTemplateModal.tsx:36-45` and `:170-188` | Single icon/copy; no "Select a Group or Area Node" empty instruction. |
| Templates browse tree icon/aria | `src/components/workshop/component-library/tree/TemplatesTree.tsx:130-167` | Single icon and kind-neutral aria label. |
| template preview dock | `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx` | Same one-icon rule as [13 §I](13_TEMPLATE_EDITOR_PARITY.md). |

### C3. Reusable-source and publication metadata

These are mostly display/provenance surfaces, not direct data-loss gates, but stale kind labels can leak into search, source pickers, or published snapshots.

| Surface | Current anchor | Required decision |
|---|---:|---|
| reusable project-node source collection | `src/lib/reusable-sources/source-collectors.ts:71-90` and `:117-128` | P4/P5: keep every node collectible; rename `nodeKind` display contract or mark it vestigial display-only. |
| publication snapshot node kind normalization | `src/lib/publication/actions.ts:453-460` and `src/lib/publication/snapshot.ts:143` | P1/P4: preserve old snapshot compatibility, but do not let publication display rows only for `area`. |
| workspace repository tree build | `src/lib/repositories/workspace-repository.ts:1714-1733` | Keep build kind-normalization only as a legacy DB label; never use it as a behavior discriminator after P6. |

### C4. Historical migration string traps

Several old migrations still contain two-kind logic (`20260519192045`, `20260524132800`, `20260611031500`). They are historical definitions or superseded function bodies. Do **not** edit past migrations for style. Instead:

- P0 neutralizes brittle tests that scan historical migration text as if every old body were active.
- P5 tests assert the latest active replacement definitions and the new P5 migration body.
- Any static grep gate must allow-list historical migrations unless the migration is the current phase artifact.

---

## D. Mandatory source-sweep acceptance gate

Before any phase is marked complete, produce a small evidence table in that phase's run log:

| Match class | Required evidence |
|---|---|
| load-bearing read gate | changed before P5, covered by oracle all-area + mixed fixture |
| write/create/nesting gate | held until P6, then covered by e2e create/write proof |
| display/vocabulary only | updated in P4/P5, covered by rendered copy test and browser screenshot |
| template/editor parity | updated in P5, covered by template editor test + save-as-template proof |
| AI passive/read surface | changed or feature-gated; write/apply internals may be quarantined |
| historical migration | allow-listed with reason; final active migration assertion covers behavior |
| dormant snapshot/version-control v2 | explicitly untouched; current divergence tracked as O-DIV-1 |

**Fail condition:** any unclassified `kind === "area"`, `kind !== "area"`, `kind === "group"`, `kind !== "group"`, `nodeKind`, `kind: "group" | "area"`, `.in("kind", ["group", "area"])`, rendered source-label/drag-label patterns, `canNestEstimateNodeKind`, `canNodeReceiveRows`, or `getEstimateNodeDisplayKind` match outside the phase's allow-list blocks completion.

---

## E. Phase-specific bug-prevention additions

### PR0 / P0
- Add a source-sweep artifact path, e.g. `.ai/05_logs/2026-06-13-estimate-tree-unification-source-sweep.md`.
- Add a static allow-list file or test fixture for remaining two-kind matches, split by phase and out-of-scope reason.
- Confirm `next-env.d.ts` and generated files are either unchanged or intentionally regenerated; do not bury generated churn inside planning/code PRs.

### PR1 / P1
- Public share proof must include a pre-existing all-area published snapshot and a synthetic mixed snapshot.
- Add negative proof: an orphan row still routes to the existing fallback/unassigned behavior, not a silent drop.

### PR2 / P2
- Chart/export proof must include Ask read-context if Ask is enabled in beta, or a feature-gate proof if not.
- The source-sweep gate must show no remaining live read path that filters rows by `node.kind === "area"`.

### PR3 / P3
- Activity proof must include toggling "this node only" vs descendants on a node before and after adding a child.
- Add stale-request proof for `inspectorScopeRef`: a delayed response for `node:A:desc` must not overwrite `node:A:direct`.

### PR4 / P4
- Browser proof must include desktop and 375px widths, with a 20+ row mixed-node fixture and children below it.
- Copy proof must assert no rendered "Group Node", "Area Node", or "select a group first" remains in tree/editor/template browse surfaces, except historical docs/tests.
- Apply the form-alignment principle: any new toggle or paired controls in the activity inspector must reserve helper/error space and align labels/inputs.

### PR5 / P5
- Run the local PG proof and hosted branch dry-run separately; do not call local proof provider proof.
- Confirm the grant-revoke write fence exact function signatures live before using the runbook.
- Template editor and DB relax must be verified in one PR: rows on any template node, children under any template node, save-as-template from a former mixed node.

### PR6 / P6
- The first mixed-write smoke must cover: create child under row-owning node, add row to child-owning node, drag row onto child-owning node, insert template/project subtree into a mixed-capable target, then verify share/export/charts/activity.
- Project-source insertion is a P6 write-boundary surface: update the live `EstimateSheetTree.tsx` / `EstimateSheetContent.tsx` gating, reusable-source metadata if needed, and `insert_estimate_subtree_into_estimate` RPC guard together. If this is not completed, project-source insertion must be feature-fenced from mixed targets.
- Cleanup proof is required for any E2E data. No pass without confirming test estimates/templates/users were removed or intentionally retained.

### PR7 / P7
- Dead-code deletion cannot precede a green source-sweep gate.
- Optional `kind` column removal remains out of scope unless a new dedicated migration plan exists.

---

## F. UltraQA scenario matrix for implementation

| ID | Scenario | Surface | Expected proof |
|---|---|---|---|
| UQA-01 | malformed drag/create target IDs | UI + server actions/RPCs | rejects with no tree corruption |
| UQA-02 | repeated row moves between mixed-capable nodes | e2e + DB diff | exactly one row owner, totals unchanged |
| UQA-03 | stale activity responses after scope toggle | browser or DOM harness | stale response ignored by scope key |
| UQA-04 | misleading green from skipped E2E env gates | Playwright output audit | skip count and env gates reported separately from pass |
| UQA-05 | dirty worktree/generated file churn | git status before/after | unrelated files not edited/staged |
| UQA-06 | P5 grant fence interrupted before re-grant | SQL runbook drill | re-grant receipt and mutation smoke after thaw |
| UQA-07 | hidden display copy still says Group/Area Node | browser + DOM tests | no stale rendered copy outside historical docs |
| UQA-08 | performance on large mixed tree | Vitest/perf or Playwright trace | no new N+1, acceptable render/export/chart timing |

These scenarios supplement, not replace, `bun run validate`, the oracle, `prove:unify-kinds`, and phase-specific e2e smokes.

---

## G. Completion standard

Implementation is not "bug free" because the phrase is not falsifiable. It is acceptable to call the plan implementation-ready only when:

1. every source-sweep match is classified;
2. every load-bearing match has a phase, test, and proof surface;
3. every out-of-scope match has a live feature-gate or dormancy reason;
4. every phase has a rollback/cleanup note;
5. maker/checker review approves the diff; and
6. UltraQA scenarios are passed or explicitly blocked with a safe substitute.

Anything weaker is a false-green risk.
