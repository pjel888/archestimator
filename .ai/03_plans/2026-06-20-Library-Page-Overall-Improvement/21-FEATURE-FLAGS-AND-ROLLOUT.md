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

### Pattern to mirror (quoted from `src/lib/collaboration/feature-flags.ts`)

The new `src/lib/component-library/feature-flags.ts` module mirrors this exact shape so an
implementer need not open the pattern file. `readFlag` normalizes truthy/falsy env strings and
returns `boolean | null` (null = unset); each accessor defaults via `??`:

```ts
function readFlag(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "on", "true", "yes", "enabled"].includes(normalized)) return true;
  if (["0", "off", "false", "no", "disabled"].includes(normalized)) return false;
  return null;
}

// Per-flag accessor: default via ?? (false = safe off posture for all Library flags)
export function isLibraryDenseModeEnabled(): boolean {
  return readFlag(process.env.NEXT_PUBLIC_LIBRARY_DENSE_MODE) ?? false;
}
// ...one accessor per flag; `express-components.ts` uses an injectable `env` seam
// (readFeatureFlag(value, fallback)) for testability — mirror that for unit tests.
```

Each Library flag accessor defaults `?? false` (beta-safe off posture). The grouped reader
returns the typed `LibraryFeatureFlags` object over the same env reads.

---

## 4. Flag registry (normalized naming)

Each flag is a **build-time env var** (house pattern, §2); flipping any one requires a Vercel
env change + redeploy. **All rollback cells mean "fix-forward via redeploy previous env value
(~5 min), NOT instant kill" (resolves C-010).** A genuine runtime kill-switch is Phase-later
(§13). The `Owner` column matches §5 lane-specific verification (Release lead owns rollout
posture only).

| Env key | Accessor | Surface | Phase | Beta default | Stable default | Owner | Toggled via | Rollback |
|---|---|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_LIBRARY_COMPONENT_DEEP_LINK` | `isLibraryComponentDeepLinkEnabled()` | `?component=<id>` route state, overview-to-component continuity, inspector deep-link | 0B/1 | off | on | Frontend lead | Vercel env + redeploy | redeploy flag=false (~5 min fix-forward) |
| `NEXT_PUBLIC_LIBRARY_QUICK_ADD` | `isLibraryQuickAddEnabled()` | Quick Add trigger and required-field path | 3 | off | on | Frontend lead | Vercel env + redeploy | redeploy flag=false (~5 min fix-forward) |
| `NEXT_PUBLIC_LIBRARY_TRUST_CHIPS` | `isLibraryTrustChipsEnabled()` | Trust chips on overview/recent/template rows + inspector + insert + template trust summary | 2/4 | off | on | Backend lead | Vercel env + redeploy | redeploy flag=false (~5 min fix-forward) |
| `NEXT_PUBLIC_LIBRARY_FOLDER_DIALOGS` | `isLibraryFolderDialogsEnabled()` | Folder create/rename/delete text-prompt dialogs (replaces native prompts) | 0B | off | on | Frontend lead | Vercel env + redeploy | redeploy flag=false (~5 min fix-forward; legacy prompts remain behind flag branch) |
| `NEXT_PUBLIC_LIBRARY_DENSE_MODE` | `isLibraryDenseModeEnabled()` | Card/dense view toggle and dense table/list | 5 | off | on | Frontend lead | Vercel env + redeploy | redeploy flag=false (~5 min fix-forward) |
| `NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED` | `isLibraryVirtualizationEnabled()` | List virtualization reuse (`@tanstack/react-virtual`) | 5 | off | on | Frontend lead | Vercel env + redeploy | redeploy flag=false (~5 min fix-forward) |
| `NEXT_PUBLIC_LIBRARY_CACHE_SCOPE` | `isLibraryCacheScopeEnabled()` | Scope the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]` by `workspaceId` (closes the one cache-bleed surface; the scoping migration touches all 6 call sites — reader `TemplateEditorClient.tsx:160`, self-invalidate `:166`, writers `LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:432`, `EstimateSheetContent.tsx:1299`+`:1302`) | 0B | off | on | Backend lead | Vercel env + redeploy | redeploy flag=false (~5 min fix-forward; the un-scoped key returns as the bleed surface, documented in doc 13 §251 + doc 32 V-001) |

> **Naming normalization (resolves C-004):** `library_dense_mode` and
> `library_virtualization_enabled` are **independent** build-time env flags with **separate**
> env keys (`NEXT_PUBLIC_LIBRARY_DENSE_MODE` and
> `NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED`), each defaulting `off`. Earlier drafts showed
> `library_dense_mode` as "no own env; reads `WORKSHOP_VIRTUALIZATION_FLAGS`" — that was
> conceptually broken (it left dense mode with no independent lever and made the
> dense-on/virtualization-off combination unreachable). The two flags now have their own env
> keys so all four combinations in `16` §4 (dense × virtualization) are addressable. Dense
> mode can render with or without virtualization; virtualization can render in card or dense
> mode. The dense accessor no longer derives from `WORKSHOP_VIRTUALIZATION_FLAGS` — it reads
> its own env. Virtualization still reuses the `@tanstack/react-virtual` machinery from
> `src/lib/workshop/virtualization-flags.ts`, but is gated by its own Library env var, not the
> workshop-wide virtualization const.

> **Phantom-flag notice (release-blocking defect, reconciled here):** docs 06 and 18 earlier
> referenced a `library_overlays_v2` flag for Phase 5 (`ADV-MOBILE-BROWSE`). That flag is
> **registered NOWHERE** — not in `src/`, not in this registry, not in docs 19/26 (verified by
> `rg "library_overlays_v2"`). It is a phantom reference. Doc 18 `ADV-MOBILE-BROWSE` now uses
> `library_dense_mode` (the real Phase 5 flag); doc 06 already corrected the same way. There
> is **no** `library_overlays_v2` flag and there must not be one — if a distinct overlay flag
> is ever needed, register it here FIRST, then reference it.

Notes:
- Beta default `off` means: ship code behind a flag that is unset in production until the phase gate passes; enable in preview/staging first.
- Stable default `on` is the eventual posture; once a flag is on in production and stable for the cleanup window, remove it.

---

## 4.5 Env readiness, stale-env detection, and local-dev guidance

Closes the §3 gap "no env readiness/stale-env detection automation." Because every Library flag is a build-time `NEXT_PUBLIC_*` env var (§2), a missing or mis-named env var silently defaults `?? false` (beta-safe off) — which is correct for production but masks "the flag was never set" during local dev and CI. The checks below surface stale/missing env vars before they cause "why isn't my flag working?" debugging.

### Vercel env readiness check (pre-deploy)

Owner: Release lead | Phase: 0A | Evidence: EV-RELEASE-01 | Binding: `scripts/check-vercel-env-readiness.ts`

`scripts/check-vercel-env-readiness.ts` (existing, run pre-deploy) MUST be extended in Phase 0A to assert that **every flag in §4** is present in the Vercel project env for the target environment (preview or production), with a value in the §2 normalized set (`1|on|true|yes|enabled` or `0|off|false|no|disabled`). A flag missing from Vercel is a release-blocker: the build inlines `undefined` and the flag silently defaults off.

| Check | Pass condition | Failure action | Owner |
|---|---|---|---|
| Flag present in Vercel env | All 7 §4 flags resolved to a normalized value | Block deploy; add the missing var in Vercel; redeploy | Release lead |
| `.env.example` in sync | Every §4 flag appears in `.env.example` with the beta-safe default `false` and a one-line comment | Add missing rows to `.env.example`; commit | Release lead |
| No orphan env vars | No `NEXT_PUBLIC_LIBRARY_*` var exists in Vercel/`.env.example` without a row in §4 | Remove the orphan OR add a §4 row for it | Release lead |
| Flag-deletion verification (post-cleanup) | After step 2 of §9, `rg "NEXT_PUBLIC_LIBRARY_<DELETED_FLAG>" src .env.example scripts/check-vercel-env-readiness.ts` returns zero hits | Re-do step 2; the deletion was incomplete | Release lead |

### Local-dev stale-env detection

Owner: Release lead | Phase: 0A | Evidence: EV-RELEASE-01 | Binding: `src/lib/component-library/feature-flags.ts` (net-new)

The grouped reader `getLibraryFeatureFlags(env?)` (§3) is called once at app boot in dev and surfaces a single `console.warn` if **any** flag env var is missing or carries an unrecognized value. The warn is suppressed in production (noise control) and is a `console.warn` not an error (the build is still correct, just surfaces the drift). This mirrors the C-009 telemetry-sink pattern (console.warn for beta).

```ts
// dev-only staleness guard (mirrors the §3 grouped reader)
if (process.env.NODE_ENV !== "production") {
  const flags = getLibraryFeatureFlags();
  const missing = Object.entries(flags).filter(([_, v]) => v === null).map(([k]) => k);
  if (missing.length) console.warn(`[library-feature-flags] unset env vars (defaulting to false): ${missing.join(", ")}`);
}
```

### CI guard

Owner: Release lead | Phase: 0A | Evidence: EV-RELEASE-01 | Browser-proof: jsdom | Binding: `scripts/check-vercel-env-readiness.ts`

A new CI step in the `bun run validate` chain (or a dedicated `bun run check:flags`) runs `scripts/check-vercel-env-readiness.ts` against `.env.example` and fails the build if (a) any §4 flag is missing from `.env.example`, or (b) `.env.example` carries an orphan `NEXT_PUBLIC_LIBRARY_*` var. This catches "flag added to §4 but `.env.example` not updated" drift at PR time.

---

## 5. Per-flag verification rows

Each row names the **on-pass** and **off-pass** (rollback-confirmation) criterion: a flag is
only verified when BOTH the on-state behaves and the off-state (flip back) reverts cleanly to
the documented off behavior. **Rollback confirmation = the off-pass**, run after any flag flip
in either direction, recorded under the flag's EV row in
`24-EXECUTION-EVIDENCE-LEDGER.md`.

| Flag | Verification command (on + off) | On-pass condition | Off-pass (rollback confirmation) | Owner | Phase | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `library_component_deep_link` | `bun run test:dom` route-state tests + `bun run test:e2e e2e/workshop-library-routes.spec.ts` | `?component=<id>` opens inspector when on | URL param parsed and ignored harmlessly when off; broad route renders; no stranded fetch | Frontend lead | 0B/1 | EV-FRONTEND-01 | `library_find_*` | `library.search.*` | focus-visible | see `30` | Playwright | key-based | `src/components/workshop/LibraryPageClient.tsx` |
| `library_quick_add` | `bun run test:dom` quick-add validation + `bun run test:e2e` save flow | Quick Add trigger visible and save succeeds when on | trigger hidden; full `AddComponentModal` advanced path used | Frontend lead | 3 | EV-FRONTEND-08 | `quick_add_*` | `quick_add.*` | see `31` | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/AddComponentModal.tsx` |
| `library_trust_chips` | `bun run test:dom` chip-render assertions + `bun run test:e2e` screenshot | Chips render over real columns when on | existing card/row hierarchy shown; real stale/source-changed warnings still present | Backend lead | 2/4 | EV-BE-04 | `trust_chip_*` | `trust.*.label` | see `31` | n/a | Playwright | key-based | `src/components/workshop/library/component-facet-filter.tsx:61` |
| `library_folder_dialogs` | `bun run test:dom` overlay focus tests + `bun run test:e2e` folder CRUD | Text-prompt dialogs used when on | legacy native prompts used as emergency fallback only | Frontend lead | 0B | EV-FRONTEND-02 | n/a | `folder.*` | alertdialog, focus-trap | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| `library_dense_mode` (`NEXT_PUBLIC_LIBRARY_DENSE_MODE`) | `bun run test:e2e` narrow-viewport browse + perf measurements (all 4 combos from `16` §4) | dense toggle + table render within `30` budget (PROVISIONAL until 0A per C-015) when on | toggle + dense table gone; card grid only; `library_virtualization_enabled` state untouched (independent key) | Frontend lead | 5 | EV-FRONTEND-09 | `dense_mode_rendered` | `dense_mode.*` | see `31` | see `30` | Playwright | key-based | `src/lib/workshop/virtualization-flags.ts` |
| `library_virtualization_enabled` (`NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED`) | `bun run test:e2e` large-list perf (dense-on/virt-off is the riskiest combo) | list virtualizes within `30` budget when on | de-virtualizes to full DOM; `library_dense_mode` state untouched (independent key) | Frontend lead | 5 | EV-FRONTEND-09 | `dense_mode_rendered` | n/a | see `31` | see `30` | Playwright | key-based | `src/lib/workshop/virtualization-flags.ts` |
| `library_cache_scope` (`NEXT_PUBLIC_LIBRARY_CACHE_SCOPE`) | `bun run test:dom` workspace-switch cache-bleed tests (EV-CACHE-01) + `bun run test:e2e` workspace-switch inspector-dock swap (EV-WS-SWITCH-CACHE) | `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` reads scoped to `workspaceId` across all 6 call sites when on; switching workspace refetches (no bleed) | un-scoped key returns (the original bleed surface); inspector dock on workspace switch MAY show the prior workspace's component briefly; `workspace_switch_cache_recovery` telemetry fires | Backend lead | 0B | EV-CACHE-01 (doc 24); EV-WS-SWITCH-CACHE | `workspace_switch_cache_recovery` (doc 20 + doc 13 §"Telemetry hooks") | n/a (no new UI) | n/a | see `31` | n/a | Playwright (workspace-switch behavior) | n/a (no user-visible copy) | `src/lib/component-library/query-keys.ts`; 6 call sites (doc 19 Query Keys section) |

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

### `library_dense_mode` (`NEXT_PUBLIC_LIBRARY_DENSE_MODE`)

| Field | Value |
|---|---|
| Gates | Net-new card/dense view toggle and dense table/list (roadmap `LIB-P5-01`, doc 12). Decides whether the dense surface ships. |
| Off behavior | Components tab renders card grid only; no dense toggle shown. Estimate-tree/rows virtualization flags unaffected (independent env var). |
| Perf gate | Must pass `30-PERF-BUDGET-AND-REGRESSION-GATES.md` 500-row budget (PROVISIONAL until Phase 0A baseline per C-015) or ship documented fallback before prod-on. |
| Rollback | redeploy `NEXT_PUBLIC_LIBRARY_DENSE_MODE=false` (fix-forward, ~5 min per C-010) |
| Evidence | EV-FRONTEND-09 |
| Binding | `src/lib/workshop/virtualization-flags.ts` (reuses the dense-table render path; the flag now has its own env key, not a derivation from `WORKSHOP_VIRTUALIZATION_FLAGS`) |

### `library_virtualization_enabled` (`NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED`)

| Field | Value |
|---|---|
| Gates | List virtualization reuse (`@tanstack/react-virtual`) for dense or large card lists. Independent of dense mode — virtualization can run in card mode too. |
| Off behavior | Lists render full DOM; estimate-tree/rows virtualization flags unaffected. |
| Perf gate | Same `30` 500-row gate; the dense-on/virtualization-off combination is the riskiest and must be measured (see `16` §4 four-combination matrix). |
| Rollback | redeploy `NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED=false` (fix-forward, ~5 min per C-010) |
| Evidence | EV-FRONTEND-09 |
| Binding | `src/lib/workshop/virtualization-flags.ts` (reuses `@tanstack/react-virtual`; gated by its own Library env var) |

### `library_cache_scope` (`NEXT_PUBLIC_LIBRARY_CACHE_SCOPE`)

| Field | Value |
|---|---|
| Gates | Scoping the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]` by `workspaceId` to close the one workspace-switch cache-bleed surface (doc 13 §251, doc 32 V-001, doc 19 Query Keys section). The scoping migration MUST touch all 6 verified call sites: reader `TemplateEditorClient.tsx:160`, self-invalidate `:166`, writers `LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:432`, `EstimateSheetContent.tsx:1299`+`:1302`. A migration that touches only 4 sites misses the `:166` self-invalidate and the `:1302` second writer — the bleed stays open. |
| Off behavior | Un-scoped key returns — switching workspace with the inspector dock open may show the prior workspace's component detail until refetch (the documented bleed; doc 14 ADV-WS-SWITCH-CACHE). No new UI; no user-visible copy. |
| Authz gate | Scoping MUST NOT broaden read access — RLS already denies cross-workspace rows server-side; scoping closes the CLIENT-side stale-cache leak, not a server-side hole. Verified by doc 14 + doc 33 §3.2. |
| Rollback | redeploy `NEXT_PUBLIC_LIBRARY_CACHE_SCOPE=false` (fix-forward, ~5 min per C-010); the un-scoped key returns as the documented bleed surface. |
| Evidence | EV-CACHE-01 (doc 24; create/update/lifecycle/bulk-archive invalidation), EV-WS-SWITCH-CACHE (doc 24 / doc 18 ADV row) |
| Telemetry | `workspace_switch_cache_recovery` (defined in doc 20 §6A; bound to route-state outcomes in doc 13 §"Telemetry hooks") |
| Binding | `src/lib/component-library/query-keys.ts`; 6 call sites (doc 19 Query Keys section — re-run the keystone Provenance Footer verify-command #2 before relying on line numbers, as they drift on every edit to the host file) |

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
| 0B | "Re-enable the un-scoped key as the documented bleed surface; ship a follow-up scoping migration." | `library_cache_scope` off → un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY`; bleed returns | Release lead | EV-CACHE-01 |
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
| `library_cache_scope` | off | preview-on, prod-off until gate | on | on | on | on | on | removed (on) |

Rollout rule: a flag goes prod-on only after its phase gate in `05-IMPLEMENTATION-ROADMAP.md` "Phase Gate Matrix" passes and (for trust/dense) the exposure/perf gates in `14` and `30` pass.

---

## 9. Cleanup path

| Step | Action | Owner | Evidence |
|---|---|---|---|
| 1 | Flag prod-on and stable for one full release cycle with no kill-switch usage and no open trust/perf regression. | Release lead | EV-RELEASE-02 |
| 2 | Delete env var read, accessor, and `else` branch. For `library_folder_dialogs`, finally delete legacy `window.prompt`/`window.confirm` calls and tighten grep guard to unconditional. **Record the flag-deletion commit hash in `24-EXECUTION-EVIDENCE-LEDGER.md` under EV-RELEASE-02, with the `rg` output proving zero residual references to the deleted env var / accessor** (e.g. `rg "NEXT_PUBLIC_LIBRARY_DENSE_MODE" src .env.example` returns nothing). | Release lead | EV-RELEASE-02 |
| 3 | Update `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` event names if any carried a flag dimension. | Telemetry lead | EV-TELEMETRY-01 |
| 4 | Remove env var from Vercel and `.env.example` / `scripts/check-vercel-env-readiness.ts`. | Release lead | EV-RELEASE-02 |
| 5 | Record removal in `.ai/10_state/decisions.md`. | Planning lead | EV-PLAN-07 |

---

## 10. Kill-switch runbook and incident owner/escalation matrix

| Field | Value |
|---|---|
| Who flips | Philip (owner) or delegated lane lead with Vercel project access |
| Where | Vercel project env (`NEXT_PUBLIC_LIBRARY_*` vars — incl. `NEXT_PUBLIC_LIBRARY_DENSE_MODE` and `NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED`, each its own key) |
| How | Set var to `off`/`0`/`false` for affected environment, then trigger redeploy so Next re-inlines it |
| Latency | Redeploy time (minutes), NOT instant — this is a **fix-forward** rollback, not an instant kill (resolves C-010). A genuine runtime (no-redeploy) kill-switch does not exist today; it is a Phase-later item (§13). |
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
| `library_dense_mode` (`NEXT_PUBLIC_LIBRARY_DENSE_MODE`) | dense table/toggle disappears (flipping dense off does NOT touch virtualization — independent keys) | card grid only; virtualization may still run in card mode if its own flag is on; estimate tree/rows virtualization unaffected |
| `library_virtualization_enabled` (`NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED`) | list de-virtualizes to full DOM render | full-DOM list; dense toggle unaffected (its own key); estimate tree/rows virtualization unaffected |
| `library_cache_scope` (`NEXT_PUBLIC_LIBRARY_CACHE_SCOPE`) | un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` returns; switching workspace with inspector dock open may briefly show prior workspace's component (the documented bleed, doc 14 ADV-WS-SWITCH-CACHE) | full bleed surface returns; `workspace_switch_cache_recovery` telemetry fires on each workspace switch while off |
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

## 13. Phase-later: runtime kill-switch (Postgres-backed flag store)

Today every Library flag is a build-time env var: flipping it requires a Vercel env change +
redeploy (fix-forward, ~5 min — see §4 / §10). This is honest for closed beta. A **runtime**
(no-redeploy) kill-switch is explicitly **Phase-later** — it is NOT built in phases 0A–5 and
must not be implied as available. Tracked here so the gap is visible, not silent.

| Field | Value |
|---|---|
| Scope | a Postgres-backed per-workspace/per-environment flag store read at request time (server) + a `NEXT_PUBLIC_*`-derived client default, enabling instant kill without redeploy |
| Why deferred | closed beta has a controlled user set; the ~5 min fix-forward redeploy is acceptable. A runtime store is new infra (table + RLS + read path + cache invalidation) and is not justified at beta scale |
| Owner | Release lead + Backend lead (design), Planning lead (scope decision) |
| Phase | Phase-later (post-stable, not in 0A–5) |
| Evidence | EV-RELEASE-PHASE-LATER (registered when scoped) |
| Pre-requisites | must NOT reintroduce the cache-bleed pattern — a runtime flag read is workspace-scoped or environment-global, never a shared un-scoped key (cf. `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` defect, doc 13 §251) |
| Telemetry | a flag-state-change event (`library_flag_toggled` with `{flag, from, to, actor}`) must emit to the prod sink (Phase-later sink per C-009) |
| Rollback | the runtime store itself is revertible; build-time env vars remain the floor (env value still wins if the store is unavailable) |

This row exists so an incident responder does not assume an instant kill-switch exists today.
Until this ships, the §10 kill-switch runbook (fix-forward redeploy) is the only mechanism.

---

## 14. Cross-references

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
