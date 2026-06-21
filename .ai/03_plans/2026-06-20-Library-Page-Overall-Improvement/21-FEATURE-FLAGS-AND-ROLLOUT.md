# 21 — Feature Flags, Progressive Rollout, And Kill-Switch

> **Status:** Living document. Makes the `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` rollback rows concrete: named flags, env keys, accessors, surfaces, defaults, per-flag verification, incident owner/escalation, and a11y/i18n regression checklists.
>
> **Scope:** Per-phase feature flags, rollout sequence, rollback mapping, and cache/route-state rules. Resolves `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-004 (`library_dense_mode` vs `library_virtualization_enabled` independence), C-010 (build-time env vs runtime kill-switch), and C-019 (per-row rollback).
>
> **Companion docs:** [17-BLAST-RADIUS-SEQUQUENCING-ROLLBACK.md](17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md), [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md), [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md), [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md), [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md), [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md), [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md), [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md), [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md), [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md), [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md), [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md).

---

## 1. Rollout philosophy: beta vs stable

| Environment | Posture | Rationale | Owner | Phase | Evidence |
|---|---|---|---|---|---|
| Beta (preview/staging) | Flags default `off` until phase gate passes; then preview-on, prod-off until release gate passes. | Beta users are internal/controlled; enable early for dogfooding. | Release lead | 0A–5 | EV-RELEASE-01 |
| Stable production | Flags default `off` at first; prod-on only after phase gate + exposure/perf gates pass. | Protect live users from incomplete features. | Release lead | per phase | EV-RELEASE-01 |
| Post-cleanup | Flags removed after one stable release cycle with no kill-switch usage and no open regressions. | Flags are debt; the house pattern removes them. | Release lead | stable | EV-RELEASE-02 |
| Build-time-only | No runtime per-user/per-workspace flag store exists. Flipping a flag requires a Vercel env change + redeploy. | Honest constraint; avoids inventing new infra for MVP. | Release lead | all | EV-RELEASE-01 |

Owner: Release lead | Phase: 0A | Flag: n/a | Rollback: n/a | Evidence: EV-RELEASE-01 | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: `src/lib/component-library/feature-flags.ts` (net-new)

---

## 2. Honest constraint: this repo has no runtime flag store

| Pattern file | Shape | Toggle mechanism | Owner | Evidence |
|---|---|---|---|---|
| `src/lib/collaboration/feature-flags.ts` | `readFlag(): boolean \| null`, per-flag `is*Enabled()` accessors, kill-switch comments | `NEXT_PUBLIC_*` env, build-time inline | Release lead | EV-RELEASE-01 |
| `src/lib/ai/package-builder/feature-flags.ts` | `getPackageBuilderFeatureFlags()` returns typed boolean object | env, build-time inline | Release lead | EV-RELEASE-01 |
| `src/lib/estimates/express-components.ts` | exported flag-name const + `readFeatureFlag(value, fallback)` with injectable `env` seam | env, build-time inline | Release lead | EV-RELEASE-01 |
| `src/lib/workshop/virtualization-flags.ts` | `readPublicFlag(value, default)` + `WORKSHOP_VIRTUALIZATION_FLAGS` const object | env, build-time inline | Release lead | EV-RELEASE-01 |

Consequence: "toggle without redeploy" is NOT free. Flipping a `NEXT_PUBLIC_*` value on Vercel triggers a redeploy to re-inline it into the client bundle. This doc uses env flags in the existing house pattern and is explicit about the redeploy cost. A genuine no-redeploy kill-switch is a deferred follow-up.

---

## 3. Flag module

| Decision | Value | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Module path | `src/lib/component-library/feature-flags.ts` | Release lead | 0A | n/a | delete module | EV-RELEASE-01 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/feature-flags.ts` |
| Pattern to reuse | `express-components.ts` shape: exported name const per flag + `readFeatureFlag(value, fallback)` with injectable `env` seam. | Release lead | 0A | n/a | n/a | EV-RELEASE-01 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/estimates/express-components.ts` |
| Grouped reader | `getLibraryFeatureFlags(env?)` returning typed `LibraryFeatureFlags` object. | Release lead | 0A | n/a | n/a | EV-RELEASE-01 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/feature-flags.ts` |

---

## 4. Flag registry (normalized naming)

| Env key | Accessor | Surface | Phase | Beta default | Stable default | Owner | Toggled via | Rollback |
|---|---|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_LIBRARY_COMPONENT_DEEP_LINK` | `isLibraryComponentDeepLinkEnabled()` | `?component=<id>` route state, overview-to-component continuity, inspector deep-link | 0B/1 | off | on | Release lead | Vercel env + redeploy | redeploy flag=false |
| `NEXT_PUBLIC_LIBRARY_QUICK_ADD` | `isLibraryQuickAddEnabled()` | Quick Add trigger and required-field path | 3 | off | on | Release lead | Vercel env + redeploy | redeploy flag=false |
| `NEXT_PUBLIC_LIBRARY_TRUST_CHIPS` | `isLibraryTrustChipsEnabled()` | Trust chips on overview/recent/template rows + inspector + insert + template trust summary | 2/4 | off | on | Release lead | Vercel env + redeploy | redeploy flag=false |
| `NEXT_PUBLIC_LIBRARY_FOLDER_DIALOGS` | `isLibraryFolderDialogsEnabled()` | Folder create/rename/delete text-prompt dialogs (replaces native prompts) | 0B | off | on | Release lead | Vercel env + redeploy | redeploy flag=false (legacy prompts remain behind flag branch) |
| `library_dense_mode` (no own env; reads `WORKSHOP_VIRTUALIZATION_FLAGS`) | `isLibraryDenseModeEnabled()` | Card/dense view toggle and dense table/list | 5 | off | on | Release lead | Vercel env (virtualization vars) + redeploy | redeploy virtualization vars=false |
| `library_virtualization_enabled` (reads `WORKSHOP_VIRTUALIZATION_FLAGS`) | `isLibraryVirtualizationEnabled()` | List virtualization reuse (`@tanstack/react-virtual`) | 5 | off | on | Release lead | Vercel env (virtualization vars) + redeploy | redeploy virtualization vars=false |

Notes:
- `library_dense_mode` and `library_virtualization_enabled` are INDEPENDENT (resolves C-004). Dense mode can render with or without virtualization. See `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` for the 4 combinations and fallback ladder.
- Beta default `off` means: ship code behind a flag that is unset in production until the phase gate passes; enable in preview/staging first.
- Stable default `on` is the eventual posture; once a flag is on in production and stable for the cleanup window, remove it.

---

## 5. Per-flag verification rows

| Flag | Verification command | Pass condition | Owner | Phase | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `library_component_deep_link` | `bun run test:dom` route-state tests + `bun run test:e2e e2e/workshop-library-routes.spec.ts` | `?component=<id>` opens inspector when on; URL param parsed and ignored harmlessly when off. | Frontend lead | 0B/1 | EV-FRONTEND-01 | `library_find_*` | `library.search.*` | focus-visible | see `30` | Playwright | key-based | `src/components/workshop/LibraryPageClient.tsx` |
| `library_quick_add` | `bun run test:dom` quick-add validation + `bun run test:e2e` save flow | Quick Add trigger visible and save succeeds when on; hidden and full `AddComponentModal` path used when off. | Frontend lead | 3 | EV-FRONTEND-08 | `quick_add_*` | `quick_add.*` | see `31` | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/AddComponentModal.tsx` |
| `library_trust_chips` | `bun run test:dom` chip-render assertions + `bun run test:e2e` screenshot | Chips render over real columns when on; existing card/row hierarchy shown when off; real stale/source-changed warnings unaffected. | Backend lead | 2/4 | EV-BE-04 | `trust_chip_*` | `trust.*.label` | see `31` | n/a | Playwright | key-based | `src/components/workshop/library/component-facet-filter.tsx:61` |
| `library_folder_dialogs` | `bun run test:dom` overlay focus tests + `bun run test:e2e` folder CRUD | Text-prompt dialogs used when on; legacy native prompts used only as emergency fallback when off. | Frontend lead | 0B | EV-FRONTEND-02 | n/a | `folder.*` | alertdialog, focus-trap | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| `library_dense_mode` + `library_virtualization_enabled` | `bun run test:e2e` narrow-viewport browse + perf measurements | Dense toggle and table render within `30` budget when on; card grid only when off. | Frontend lead | 5 | EV-FRONTEND-09 | n/a | `dense_mode.*` | see `31` | see `30` | Playwright | key-based | `src/lib/workshop/virtualization-flags.ts` |

---

## 6. Per-flag spec

### `library_component_deep_link`

| Field | Value |
|---|---|
| Gates | `?component=<id>` route-state param wiring, inspector dock open/highlight, overview-search continuity (`13` §Component Route State; roadmap `LIB-P0B-01` / `LIB-P1-02`). |
| Off behavior | Overview search returns to broad route navigation (lands on Components tab without selecting item); inspector opens only via in-tab click. Existing search/filter/folder/sort params remain intact. |
| Route-state interaction | When off, `?component=<id>` is parsed and dropped harmlessly, never resolved, never thrown. Re-enabling the flag resolves the same URL idempotently. |
| Rollback | redeploy `NEXT_PUBLIC_LIBRARY_COMPONENT_DEEP_LINK=false` |
| Evidence | EV-FRONTEND-01 |
| Binding | `src/components/workshop/LibraryPageClient.tsx` |

### `library_quick_add`

| Field | Value |
|---|---|
| Gates | Quick Add trigger and short required-field path (`name`, `category`, `unit`, `unit_cost`; optional supplier/brand, `pricing_date`, `pricing_source`, `confidence`; optional `libraryFolderId`) per Quick Add Contract and roadmap `LIB-P3-01`. |
| Off behavior | Hide Quick Add trigger; route users to existing full `AddComponentModal` advanced path, unchanged. No schema dependency. |
| Rollback | redeploy `NEXT_PUBLIC_LIBRARY_QUICK_ADD=false` |
| Evidence | EV-FRONTEND-08 |
| Binding | `src/components/workshop/component-library-manager/AddComponentModal.tsx` |

### `library_trust_chips`

| Field | Value |
|---|---|
| Gates | Source-trust chips on overview/recent/template rows, inspector dock, insert surfaces, and template trust summary (roadmap `LIB-P2-01`/`LIB-P2-02`), bound to real columns and helpers. |
| Off behavior | Hide new trust chips; cards/rows fall back to existing hierarchy. Safe derived payload fields can remain. Do NOT gate away real stale/source-changed risk signals that already exist. |
| Rollback | redeploy `NEXT_PUBLIC_LIBRARY_TRUST_CHIPS=false` |
| Evidence | EV-BE-04 |
| Binding | `src/components/workshop/library/component-facet-filter.tsx:61` |

### `library_dense_mode` + `library_virtualization_enabled`

| Field | Value |
|---|---|
| Gates | Net-new card/dense view toggle and dense table/list (roadmap `LIB-P5-01`, doc 12). `library_dense_mode` decides whether the dense surface ships; `library_virtualization_enabled` decides whether the list virtualizes. |
| Off behavior | Components tab renders card grid only; no dense toggle shown. Estimate-tree/rows virtualization flags unaffected. |
| Perf gate | Must pass `30-PERF-BUDGET-AND-REGRESSION-GATES.md` 500-row budget or ship documented fallback before prod-on. |
| Rollback | redeploy virtualization env vars=false |
| Evidence | EV-FRONTEND-09 |
| Binding | `src/lib/workshop/virtualization-flags.ts` |

### `library_folder_dialogs`

| Field | Value |
|---|---|
| Gates | Folder create/rename/delete moved off native `window.prompt`/`window.confirm` onto text-prompt dialog pattern (`ComponentLibraryManager.tsx:1493`/`:1515`/`:1534`). Roadmap `LIB-P0B-02`. |
| Off behavior | Re-enable old native folder actions as emergency internal fallback ONLY. Legacy calls must be kept behind the flag branch until cleanup. The `LIB-P0B-02` grep guard must allow the flagged-off branch. |
| Rollback | redeploy `NEXT_PUBLIC_LIBRARY_FOLDER_DIALOGS=false` |
| Evidence | EV-FRONTEND-02 |
| Binding | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |

---

## 7. Doc-17 rollback row to flag mapping

| Canonical phase | Doc 17 rollback row (verbatim intent) | Flag (off posture reverts to) | Owner | Evidence |
|---|---|---|---|---|
| 0B (param) + 1 (search continuity) | "Disable selected-object param and return overview search to broad route." | `library_component_deep_link` off → broad route, no inspector deep-link | Release lead | EV-RELEASE-03 |
| 2 | "Hide new trust fields behind existing card/row hierarchy while preserving safe payload changes if tested." | `library_trust_chips` off → existing hierarchy, safe payload kept | Release lead | EV-RELEASE-03 |
| 3 | "Hide Quick Add trigger and route users to existing Add Component flow." | `library_quick_add` off → full `AddComponentModal` advanced path | Release lead | EV-RELEASE-03 |
| 0B | "Re-enable old folder actions only as emergency internal fallback, then immediately schedule replacement." | `library_folder_dialogs` off → legacy native folder prompts | Release lead | EV-RELEASE-03 |
| 2 / 4 | "Hide new template trust warnings only if they are wrong; do not hide real stale/deleted dependency risk." | `library_trust_chips` off hides only new chip/summary layer; real risk NOT flag-gated | Release lead | EV-RELEASE-03 |
| 5 | "Revert responsive layout changes by width class; keep focus/a11y fixes when independent." | `library_dense_mode` off → card grid only; independent a11y fixes stay | Release lead | EV-RELEASE-03 |
| 0A | "Revert docs/test scaffolding; no UI dependency yet." | no flag (contract/test only; plain git revert) | Release lead | EV-RELEASE-03 |
| release gate | "Hold release; no rollback claim without passing no-go checklist." | no flag (release hold; see `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`) | QA lead | EV-QA-06 |

---

## 8. Default-on/off per canonical phase

| Flag | 0A | 0B | 1 | 2 | 3 | 4 | 5 | Stable (post-cleanup) |
|---|---|---|---|---|---|---|---|---|
| `library_folder_dialogs` | off | preview-on, prod-off until gate | on | on | on | on | on | removed (on) |
| `library_component_deep_link` | off | preview-on, prod-off until gate | on | on | on | on | on | removed (on) |
| `library_trust_chips` | off | off | off | preview-on, prod-off until gate | on | on | on | removed (on) |
| `library_quick_add` | off | off | off | off | preview-on, prod-off until gate | on | on | removed (on) |
| `library_dense_mode` | off | off | off | off | off | off | preview-on, prod-off until perf gate | removed (on) |
| `library_virtualization_enabled` | off | off | off | off | off | off | preview-on, prod-off until perf gate | removed (on) |

Rollout rule: a flag goes prod-on only after its phase gate in `05-IMPLEMENTATION-ROADMAP.md` "Phase Gate Matrix" passes and (for trust/dense) the exposure/perf gates in `14` and `30` pass.

---

## 9. Cleanup path

| Step | Action | Owner | Evidence |
|---|---|---|---|
| 1 | Flag prod-on and stable for one full release cycle with no kill-switch usage and no open trust/perf regression. | Release lead | EV-RELEASE-02 |
| 2 | Delete env var read, accessor, and `else` branch. For `library_folder_dialogs`, finally delete legacy `window.prompt`/`window.confirm` calls and tighten grep guard to unconditional. | Release lead | EV-RELEASE-02 |
| 3 | Update `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` event names if any carried a flag dimension. | Telemetry lead | EV-TELEMETRY-01 |
| 4 | Remove env var from Vercel and `.env.example` / `scripts/check-vercel-env-readiness.ts`. | Release lead | EV-RELEASE-02 |
| 5 | Record removal in `.ai/10_state/decisions.md`. | Planning lead | EV-PLAN-07 |

---

## 10. Kill-switch runbook and incident owner/escalation matrix

| Field | Value |
|---|---|
| Who flips | Philip (owner) or delegated lane lead with Vercel project access |
| Where | Vercel project env (`NEXT_PUBLIC_LIBRARY_*` vars; dense/virtualization flags flip via `NEXT_PUBLIC_*_VIRTUALIZATION` vars) |
| How | Set var to `off`/`0`/`false` for affected environment, then trigger redeploy so Next re-inlines it |
| Latency | Redeploy time (minutes), NOT instant |
| Blast radius | Global for affected environment; no per-user/per-workspace partition |
| Reverts to | Flag's documented off behavior |

### Incident owner/escalation matrix

| Symptom | First owner | Escalation if flip does not resolve | Stop condition |
|---|---|---|---|
| UI regression (layout, focus, copy) | Frontend lead | Design lead → Planning lead | Hold release if a11y/i18n regressions remain |
| Trust chips show wrong state | Backend lead | Security lead → Planning lead | Hold release if data-integrity risk |
| Quick Add data corruption | Backend lead | DB lead → Planning lead | Hold release; do not flip, revert commit |
| Perf regression (jank, memory) | Perf lead | Frontend lead → Planning lead | Hold Phase 5 release |
| Cache/route-state inconsistency after flip | Backend lead | Security lead → Planning lead | Hold release |
| Data integrity / authz issue | Security lead | Planning lead → Philip | Hold release; flag flip cannot substitute for real revert |

### Per-flag kill-switch effect

| Flag set off | Immediate effect | Reverts to |
|---|---|---|
| `library_component_deep_link` | inspector deep-links and overview-search continuity stop | broad route navigation; in-tab click still opens inspector |
| `library_quick_add` | Quick Add trigger disappears | full `AddComponentModal` advanced path |
| `library_trust_chips` | new trust chips/summary disappear | existing card/row hierarchy; safe payload retained; real warnings unaffected |
| `library_dense_mode` (virtualization vars off) | dense table/toggle disappears or de-virtualizes | card grid only; estimate tree/rows virtualization unaffected unless those same vars flipped |
| `library_folder_dialogs` | new folder text-prompt dialogs disappear | legacy native `window.prompt`/`window.confirm` folder actions (emergency only) |

---

## 11. A11y/i18n regression checklist for flag hide/reveal

| Check | On-flag verification | Off-flag verification | Owner | Evidence |
|---|---|---|---|---|
| Focus management | Focus lands correctly on newly revealed surface; focus trap works for overlays. | Focus does not trap on hidden surface; previously focused element is not lost. | A11y lead | EV-A11Y-01 |
| Screen-reader announcements | Live region announces state changes (e.g., "Trust chips visible"). | No stale announcements for hidden surface. | A11y lead | EV-A11Y-01 |
| Keyboard navigation | Tab order correct for revealed controls. | Hidden controls removed from tab order. | A11y lead | EV-A11Y-01 |
| Copy consistency | New copy keys render; no hardcoded fallback strings. | Off-state copy keys render (no bare "Loading" or "Error"). | Copy lead | EV-COPY-01 |
| i18n key coverage | Every revealed string has a key in `22`. | Every fallback string has a key in `22`. | i18n lead | EV-I18N-01 |
| RTL layout | Revealed surface mirrors correctly in RTL (logical properties). | Hidden surface leaves no RTL artifacts. | i18n lead | EV-I18N-01 |
| Color/contrast | New chips/buttons meet AA. | Off-state hierarchy still meets AA. | Design lead | EV-DESIGN-01 |
| Route/cache state | No stranded `?component=<id>` fetch or stale TanStack entry. | Param ignored gracefully; warm cache reused on re-enable. | Backend lead | EV-BE-11 |

---

## 12. Flags and route state / cache

### Route state

- When `library_component_deep_link` is off, `?component=<id>` is parsed and ignored gracefully — never resolved into a fetch and never thrown. The page renders the broad Components/Templates view; the param sits inert in the URL.
- An invalid/cross-workspace `component` id shows the inspector-level not-found state and does not leak cross-workspace existence (`13` invalid-param rules), regardless of flag state.
- Flipping a flag does not require URL rewriting on existing tabs.

### Cache

- Flags do not change query-key identity. `library_dense_mode` and `library_trust_chips` change rendering/derived shape, not the cache key.
- Do NOT fork a per-flag query key; a flag flip then flip-back must reuse the warm cache.
- If a trust chip needs a payload field the browse dataset already carries, the field ships in the dataset under the existing key whether or not `library_trust_chips` is on.
- The un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]` is a separate doc-13/14 concern; flags must not paper over that bleed.
- On workspace switch, workspace-scoped keys already refetch/clear; a flag flip does not change that.

Owner: Backend lead | Phase: 0B | Evidence: EV-BE-11 | Binding: `src/lib/component-library/query-keys.ts`

---

## 13. Cross-references

- `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` — rollback rows this doc makes concrete.
- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — authoritative names, enums, query keys, phase map.
- `05-IMPLEMENTATION-ROADMAP.md` — `LIB-P*` work items and Phase Gate Matrix.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` — `?component=<id>` + `/templates/[templateId]` route-state and cache contracts.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` — exposure gate for `library_trust_chips`.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` — perf gate and virtualization fallback for dense/virtualization flags.
- `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` — events that may carry a flag dimension.
- `22-COPY-DECK-AND-MICROCOPY.md` — off-state and fallback copy.
- `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` — `ConfirmDialog`+input and dense-table primitives.
- `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-004, C-010, C-019 — resolved conflicts.
