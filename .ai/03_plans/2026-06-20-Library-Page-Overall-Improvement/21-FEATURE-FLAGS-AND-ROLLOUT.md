# 21 - Feature Flags, Progressive Rollout, And Kill-Switch

This doc makes the `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` rollback rows real. Doc 17
says "disable selected-object param", "hide Quick Add trigger", "hide new trust fields",
"re-enable old folder actions" — these are verbal gestures with no mechanism. Here each
becomes a concrete, named flag bound to an existing repo pattern, with a default per
canonical phase, a cleanup path, a kill-switch runbook, and route-state/cache rules so a
flipped flag never strands a `?component=<id>` URL or a stale TanStack query entry.

Authoritative names come from `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`. Phase
labels are the canonical 0A/0B/1/2/3/4/5 map, which doc 17 now uses directly; this doc
binds each doc-17 rollback row to that same canonical phase in the rollback mapping table
below.

## Honest Constraint: This Repo Has No Runtime Flag Store

There is no per-user, per-workspace, or DB-backed feature-flag service in this codebase.
Every existing flag is a `NEXT_PUBLIC_*` (or plain server) environment variable read at
module load and inlined by Next.js at build time. Verified existing patterns:

| Pattern file | Shape | Toggle mechanism |
| --- | --- | --- |
| `src/lib/collaboration/feature-flags.ts` | `readFlag(): boolean \| null`, per-flag `is*Enabled()` accessors, kill-switch comments | `NEXT_PUBLIC_*` env, build-time inline |
| `src/lib/ai/package-builder/feature-flags.ts` | `getPackageBuilderFeatureFlags()` returns one typed object of booleans | env, build-time inline |
| `src/lib/estimates/express-components.ts` | exported flag-name const + `readFeatureFlag(value, fallback)` with an injectable `env` seam for tests | env, build-time inline |
| `src/lib/workshop/virtualization-flags.ts` | `readPublicFlag(value, default)` + `WORKSHOP_VIRTUALIZATION_FLAGS` const object | env, build-time inline |

Consequence: "toggle without redeploy" is NOT free here. Flipping a `NEXT_PUBLIC_*` value
on Vercel triggers a redeploy to re-inline it into the client bundle. This doc does not
invent a runtime registry (that would be new infra, out of scope for an MVP UI pack). It
specifies env flags in the existing house pattern, and is explicit about the redeploy
cost. A genuine no-redeploy kill-switch is listed as a deferred follow-up, not a
dependency.

## Flag Module

Create one module, `src/lib/component-library/feature-flags.ts`, reusing the
`express-components.ts` shape (exported name const per flag + `readFeatureFlag(value,
fallback)` with an injectable `env` seam so DOM tests can pass a fake env without touching
`process.env`). Expose a grouped reader `getLibraryFeatureFlags(env?)` returning a typed
`LibraryFeatureFlags` object, mirroring `getPackageBuilderFeatureFlags()`. Do not add a
fourth bespoke flag dialect.

`library_dense_mode` is the one flag that does not own its own env var: it is a thin
wrapper that reads from `WORKSHOP_VIRTUALIZATION_FLAGS` (`src/lib/workshop/virtualization-flags.ts`)
so the dense table reuses the same virtualization posture as the estimate tree/rows
rather than diverging. See `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` for the fallback
ladder the dense table inherits.

## Flag Registry

Scope is build-time env for all five (no per-user/per-workspace store exists). "Scope"
below records the intended audience the env value targets per environment, not a runtime
partition. Owner is the implementing lane; final flips are Philip's call.

| Flag key (env var) | Accessor | Scope | Phase | Beta default | Stable default | Owner | Toggled via |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_LIBRARY_COMPONENT_DEEP_LINK` | `isLibraryComponentDeepLinkEnabled()` | global (env) | 0B | off | on | route-state lane | Vercel env + redeploy |
| `NEXT_PUBLIC_LIBRARY_QUICK_ADD` | `isLibraryQuickAddEnabled()` | global (env) | 3 | off | on | add/edit lane | Vercel env + redeploy |
| `NEXT_PUBLIC_LIBRARY_TRUST_CHIPS` | `isLibraryTrustChipsEnabled()` | global (env) | 2 | off | on | trust lane | Vercel env + redeploy |
| `library_dense_mode` (no own env; reads `WORKSHOP_VIRTUALIZATION_FLAGS`) | `isLibraryDenseModeEnabled()` | global (env) | 5 | off | on | dense/perf lane | Vercel env (virtualization vars) + redeploy |
| `NEXT_PUBLIC_LIBRARY_FOLDER_DIALOGS` | `isLibraryFolderDialogsEnabled()` | global (env) | 0B | off | on | overlay lane | Vercel env + redeploy |

Notes:

- Beta default `off` means: ship the code behind a flag that is unset in production until
  the phase gate in `05-IMPLEMENTATION-ROADMAP.md` passes; enable in preview/staging first.
- Stable default `on` is the eventual posture; once a flag is on in production and stable
  for the cleanup window, remove the flag and its branch (see Cleanup Path).
- `library_dense_mode` has no dedicated env var by design: the dense table is gated by the
  same `NEXT_PUBLIC_*_VIRTUALIZATION` posture already in `WORKSHOP_VIRTUALIZATION_FLAGS`,
  plus a card/dense UI toggle that is purely client state, not an env flag. The flag
  decides whether the dense surface ships at all; the toggle decides which view the user
  sees once it ships.

## Per-Flag Spec

### `library_component_deep_link`

- Gates: the `?component=<id>` route-state param wiring (open inspector dock, highlight
  card, overview-search continuity) from `13-DATA-CONTRACTS-ROUTE-CACHE.md` "Component
  Route State" and roadmap `LIB-P0B-01` / `LIB-P1-02`.
- Off behavior: overview search returns to broad route navigation (lands on the Components
  tab without selecting an item); the inspector opens only via in-tab click. Existing
  search/filter/folder/sort params remain intact.
- Route-state interaction: see "Flags And Route State / Cache" — when off, the param must
  be parsed and dropped harmlessly, never resolved.

### `library_quick_add`

- Gates: the Quick Add trigger and the short required-field path (`name`, `category`,
  `unit`, `unit_cost`; optional supplier/brand, `pricing_date`, `pricing_source`,
  `confidence`; optional `libraryFolderId`) per the CANON Quick Add contract and roadmap
  `LIB-P3-01`.
- Off behavior: hide the Quick Add trigger; route users to the existing full
  `AddComponentModal` (`component-library-manager/AddComponentModal.tsx`) advanced path,
  which is unchanged. No schema dependency (all columns exist), so the flag is purely a UI
  cutline.

### `library_trust_chips`

- Gates: source-trust chips on overview/recent cards, inspector dock, insert surfaces, and
  template trust summary (roadmap `LIB-P2-01`/`LIB-P2-02`), bound to real columns
  (`pricing_date`, `confidence` free text, `lifecycle_state`, `supplier`/`brand`,
  `updated_at`) and helpers `getComponentPricingFreshness` (component-facet-filter.tsx)
  and `getStalenessTone`/`getStalenessLabel` (component-library/helpers.ts).
- Off behavior: hide new trust chips; cards/rows fall back to the existing hierarchy.
  Payload additions from doc 13 that were tested can remain (they are safe derived
  fields); only the rendering is gated. Do NOT gate away real stale/source-changed risk
  signals that already exist — the flag hides the new chip layer, not existing warnings.

### `library_dense_mode`

- Gates: the net-new card/dense view toggle and dense table/list (roadmap `LIB-P5-01`,
  doc 12). Ties to `WORKSHOP_VIRTUALIZATION_FLAGS` so the dense table reuses
  `@tanstack/react-virtual` and the tree `minRows` posture rather than a parallel
  implementation.
- Off behavior: Components tab renders the card grid only; no dense toggle is shown. The
  estimate-tree/rows virtualization flags are unaffected (this flag only governs the
  Library dense surface).
- Perf gate: must pass the `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` 500-row budget or
  ship the documented fallback before this flag goes on in production. Phase 0A must extend
  `scripts/seed-performance-test-data.ts` to seed N `cost_library_items` and measure first.

### `library_folder_dialogs`

- Gates: folder create/rename/delete moved off native `window.prompt`/`window.confirm`
  (`ComponentLibraryManager.tsx:1493`/`:1515`/`:1534`) onto the text-prompt dialog pattern
  (inline `ConfirmDialog` + child `<input>`, the `TemplatesBrowseManager.tsx:531-883`
  pattern). Roadmap `LIB-P0B-02`.
- Off behavior: re-enable the old native folder actions as an emergency internal fallback
  ONLY (doc 17 phase-3 row). This is the one flag whose "off" path restores legacy code, so
  the legacy `window.prompt`/`window.confirm` calls must be kept behind the flag branch
  (not deleted) until the flag is removed at cleanup. The static grep guard from
  `LIB-P0B-02` (no `window.prompt`/`window.confirm` in primary Library files) must therefore
  be scoped to allow the flagged-off branch, or assert the calls are unreachable when the
  flag is on.

## Doc-17 Rollback Row To Flag Mapping

Every doc-17 rollback row gets a concrete flag and a canonical phase. Doc 17 now labels its
phases with the canonical 0A/0B/1-5 map, so each row below is keyed by that canonical phase
directly (no bespoke-number translation step).

| Canonical phase | Doc 17 rollback row (verbatim intent) | Flag (off posture reverts to) |
| --- | --- | --- |
| 0B (param) + 1 (search continuity) | "Disable selected-object param and return overview search to broad route." | `library_component_deep_link` off -> broad route, no inspector deep-link |
| 2 | "Hide new trust fields behind existing card/row hierarchy while preserving safe payload changes if tested." | `library_trust_chips` off -> existing card/row hierarchy, safe payload kept |
| 3 | "Hide Quick Add trigger and route users to existing Add Component flow." | `library_quick_add` off -> full `AddComponentModal` advanced path |
| 0B | "Re-enable old folder actions only as emergency internal fallback, then immediately schedule replacement." | `library_folder_dialogs` off -> legacy native folder prompts (emergency only) |
| 2 / 4 | "Hide new template trust warnings only if they are wrong; do not hide real stale/deleted dependency risk." | `library_trust_chips` off hides only the new chip/summary layer; real stale/source-changed dependency risk is NOT flag-gated |
| 5 | "Revert responsive layout changes by width class; keep focus/a11y fixes when independent." | `library_dense_mode` off -> card grid only; responsive/a11y fixes that are flag-independent stay |
| 0A | "Revert docs/test scaffolding; no UI dependency yet." | no flag (contract/test only; plain git revert) |
| release gate | "Hold release; no rollback claim without passing no-go checklist." | no flag (release hold; see `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`) |

Rows not in doc 17 but implied by the canonical phases: the bulk-archive copy fix
(`BulkDestructivePreviewModal.tsx`, branch on `actionCopy.verb`) and the Add dirty-discard
confirm (`AddComponentModal.tsx:963`) are corrective fixes, not new surfaces — they ship in
0B without a flag because their "rollback" is a one-line git revert, not a runtime toggle.

## Default-On/Off Per Canonical Phase

The progressive rollout posture across environments. "Preview" = Vercel preview/staging,
"Prod" = production.

| Flag | 0A | 0B | 1 | 2 | 3 | 4 | 5 | Stable (post-cleanup) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `library_folder_dialogs` | off | preview-on, prod-off until gate | on | on | on | on | on | removed (on) |
| `library_component_deep_link` | off | preview-on, prod-off until gate | on | on | on | on | on | removed (on) |
| `library_trust_chips` | off | off | off | preview-on, prod-off until gate | on | on | on | removed (on) |
| `library_quick_add` | off | off | off | off | preview-on, prod-off until gate | on | on | removed (on) |
| `library_dense_mode` | off | off | off | off | off | off | preview-on, prod-off until perf gate | removed (on) |

Rollout rule: a flag goes prod-on only after its phase gate in
`05-IMPLEMENTATION-ROADMAP.md` "Phase Gate Matrix" passes and (for trust/dense) the
exposure/perf gates in `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` and
`16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` pass.

## Cleanup Path

A flag is debt the moment it is born. Per the existing house pattern, flags are removed,
not left forever.

1. Flag prod-on and stable for one full release cycle with no kill-switch usage and no
   open trust/perf regression.
2. Delete the env var read, the accessor, and the `else` branch (legacy or hidden path).
   For `library_folder_dialogs` this is where the legacy `window.prompt`/`window.confirm`
   calls are finally deleted and the `LIB-P0B-02` grep guard tightens to unconditional.
3. Update `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` event names if any carried a flag
   dimension.
4. Remove the env var from Vercel and from any `.env.example`/`scripts/check-vercel-env-readiness.ts`
   readiness list so a deleted flag is not flagged as missing.
5. Record the removal in `.ai/10_state/decisions.md`.

Do not leave a flag in the "removed" column of the phase table set but still present in
code. The CANON treats a stable flag still in code as a residual.

## Kill-Switch Runbook

A kill-switch flip here is a Vercel env change plus a redeploy (no runtime store exists).
Be honest about the blast radius and latency.

| Field | Value |
| --- | --- |
| Who flips | Philip (owner) or a delegated lane lead with Vercel project access |
| Where | Vercel project env (the `NEXT_PUBLIC_LIBRARY_*` vars; `library_dense_mode` flips via the `NEXT_PUBLIC_*_VIRTUALIZATION` vars) |
| How | Set the var to `off`/`0`/`false` for the affected environment, then trigger a redeploy so Next re-inlines it |
| Latency | Redeploy time (minutes), NOT instant — this is the key honesty caveat vs. a runtime store |
| Blast radius | Global for the affected environment; there is no per-user/per-workspace partition |
| Reverts to | The flag's documented "off behavior" above (the legacy or hidden path) |

Per-flag kill-switch effect:

| Flag set off | Immediate effect | Reverts to |
| --- | --- | --- |
| `library_component_deep_link` | inspector deep-links and overview-search continuity stop | broad route navigation; in-tab click still opens inspector |
| `library_quick_add` | Quick Add trigger disappears | full `AddComponentModal` advanced path |
| `library_trust_chips` | new trust chips/summary disappear | existing card/row hierarchy; safe payload retained; real stale/source-changed warnings unaffected |
| `library_dense_mode` (virtualization vars off) | dense table/toggle disappears or de-virtualizes | card grid only; estimate tree/rows virtualization unaffected unless those same vars are the ones flipped |
| `library_folder_dialogs` | new folder text-prompt dialogs disappear | legacy native `window.prompt`/`window.confirm` folder actions (emergency only; schedule re-fix) |

Escalation: if a kill-switch flip does not resolve the incident (e.g. data integrity, not
just UI), follow `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` "Stop Conditions" and hold the
release; a flag flip cannot substitute for a real revert when the issue is server-side.

## Flags And Route State / Cache

A flipped flag must never strand a `?component=<id>` URL or a stale TanStack query entry.
Bind to the real route params (doc 13) and real query keys (`src/lib/component-library/query-keys.ts`).

Route state:

- When `library_component_deep_link` is off, the `?component=<id>` param (and any
  `/workshop/library/templates/[templateId]` segment route — there is no `?template=<id>` param)
  must still be parsed and then ignored gracefully — never resolved into a fetch and
  never thrown on. The page renders the broad Components/Templates view; the param sits inert
  in the URL. Re-enabling the flag must resolve the same URL correctly (idempotent parse).
- An invalid/cross-workspace `component` id must show the inspector-level not-found state
  and must not leak whether a cross-workspace object exists (doc 13 invalid-param rules),
  regardless of flag state.
- Flipping a flag must not require URL rewriting on existing tabs. A user holding a
  `?component=<id>` URL when the flag goes off sees the broad view, not an error.

Cache:

- Flags do not change query-key identity. `library_dense_mode` and
  `library_trust_chips` change rendering/derived shape, not the cache key — they read from
  the same `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` /
  `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)` dataset. Do NOT fork a
  per-flag query key; a flag flip then a flip-back must reuse the warm cache, not orphan it.
- If a trust chip needs a payload field the browse dataset already carries (doc 13 overview
  additions), the field ships in the dataset under the existing key whether or not
  `library_trust_chips` is on, so toggling the flag never triggers a refetch or a
  shape-mismatch on the shared key.
- The known cross-workspace bleed surface is the UN-SCOPED
  `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]` (used by
  `TemplateEditorClient` + the in-estimate dock). No Library flag in this pack touches that
  key's identity; the scoping fix is a separate doc-13/14 concern. Flags must not be used to
  paper over that bleed.
- On workspace switch, the workspace-scoped keys
  (`workspaceComponentRowsLibraryQueryKey`, `workspaceEstimateTemplatesQueryKey`) already
  refetch/clear; a flag flip does not change that. A flag must never cache previous-workspace
  data under a flag-suffixed key.

## Cross-References

- `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` - the rollback rows this doc makes concrete.
- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` - authoritative names, enums, query
  keys, file:line anchors, and the canonical phase map used here.
- `05-IMPLEMENTATION-ROADMAP.md` - the `LIB-P*` work items and Phase Gate Matrix that gate
  each prod-on flip.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` - `?component=<id>` + `/templates/[templateId]` segment
  route-state and mutation cache contracts the flag interaction rules bind to.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` - exposure gate for `library_trust_chips`.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` - perf gate and virtualization fallback for
  `library_dense_mode`.
- `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` - events that may carry a flag dimension and
  must be cleaned up when a flag is removed.
- `22-COPY-DECK-AND-MICROCOPY.md` - off-state and fallback copy must stay consistent when a
  flag hides a surface.
- `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` - the `ConfirmDialog`+input and dense-table
  primitives the flagged surfaces use.
