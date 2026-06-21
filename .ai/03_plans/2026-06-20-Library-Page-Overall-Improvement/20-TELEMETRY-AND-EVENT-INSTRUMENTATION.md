# 20 - Telemetry And Event Instrumentation

## Why This Doc Exists

`09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` names five learnable beta metrics
(component/template find under 30s, Quick Add under 90s, insert accuracy, trust
classification 90%+, privacy 0 leaks). None of them are instrumentable without a
named event taxonomy and a timing methodology. This doc closes that gap: it picks
the substrate to reuse, defines the events, maps each 09 metric to events (or
marks it MANUAL), specifies timing/privacy gating, and sets verification.

This is an observability seam, not a product analytics platform. Closed-beta
needs structured, privacy-safe, debuggable events — not a vendor pipeline. Scope
stays inside the canonical phase map (`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`).

## Substrate Decision: Reuse, Then Extend

The repo already has the exact pattern this doc needs. Verified surfaces:

| Surface | File | Shape | Verdict |
| --- | --- | --- | --- |
| Express-components telemetry | `src/lib/estimates/express-components-telemetry.ts` | `recordExpressComponentEvent(event, payload)`; union event type; ID-only payload; `console.warn` now, swappable for Clarity/Sentry; no-op under `NODE_ENV==="test"` | REUSE the pattern. Add a Library-scoped twin. |
| Realtime telemetry | `src/lib/collaboration/realtime-telemetry.ts` | `reportRealtimeEvent`; `setRealtimeTelemetrySink` registration; sink failure swallowed; coarse `topic`, never raw path | REUSE the sink/registration idea for the prod swap. |
| Landing consent | `src/lib/landing/consent.ts` | `hasLandingAnalyticsConsent(cookieHeader)`; cookie `archestimator_cookie_consent` | REUSE for any non-product-essential client beacon (see gating). |
| Vercel analytics redaction | `src/lib/analytics/vercel-web-analytics.ts` | `redactVercelAnalyticsEvent`; drops `/workshop`, `/share`, `/invite` URLs | Out of scope here; confirms the project already redacts authenticated paths. |
| A/B variant assigner | `src/lib/ab-testing/variant-assigner.ts` | consent-gated cookie assignment | Not needed for these metrics; no Library experiment in scope. |

Decision: do NOT invent a new telemetry framework. Create
`src/lib/component-library/library-telemetry.ts` as a Library twin of
`express-components-telemetry.ts` — same signature shape, same `console.warn`
default, same `NODE_ENV==="test"` no-op, same swappable-sink intent. The one
extension over the express twin: adopt the `setRealtimeTelemetrySink` registration
idiom (`setLibraryTelemetrySink`) so the prod sink can be wired without touching
call sites. This is the only new substrate; everything else is call sites.

Where the substrate MUST be extended (stated plainly):

- New file `src/lib/component-library/library-telemetry.ts` (the twin) — net-new.
- Session-scoped client timers for find-time and Quick Add (see Timing) — net-new
  client utility, no server state.
- A prod sink registration is NOT built in any of the existing seams (express twin
  also only `console.warn`s). Beta ships on `console.warn`; the sink swap is a
  noted future, not a blocker for the 09 metrics that are DOM/e2e provable.

## Glossary Binding

Terms follow `19`/the canonical glossary. "inspector dock" = `ComponentInspectorDock.tsx`.
"stale" = pricing freshness only (`getComponentPricingFreshness`); link/snapshot
state uses the `estimate_row_link_state` value `source-changed`. "actor" =
`workspace_role` (owner/admin/member/viewer). "public/share actor" = the frozen
snapshot surface at `src/app/share/[token]`, never a live Library query.

## Event Taxonomy

All events route through `recordLibraryEvent(event, payload)` in the new twin.
Payload is ID-only and lifecycle-coarse, mirroring the express twin's existing
`projectId`/`estimateId`/`rowId`/`itemId`/`reason` fields. Every event carries
`workspaceId` for actor/workspace scoping. No event ever carries free-text user
content, `pricing_source`, `confidence`, internal notes, raw names, or price values.

| Event | Trigger file / function | Payload fields | Scoping | Excluded (NEVER in payload) |
| --- | --- | --- | --- | --- |
| `library_find_started` | Overview search focus/first keystroke in `LibraryOverviewSearch.tsx` (`SearchInput` :258, `inputRef` :40); components-tab search focus/first keystroke in `ComponentLibraryManager.tsx` (`<input>` :383, state `searchQuery`/`searchOpen`/`searchInputRef` :844-846); emitted via the session-timer util. `LibraryPageClient.tsx` owns data/route-state only (0 `input`/`onFocus`/`search` hits) and is NOT the emit site | `workspaceId`, `surface` (`overview`/`components`/`templates`), `sessionFindId` | actor role tagged; dropped for viewer-only? no — read is allowed, keep | search query text, result ids |
| `library_find_resolved` | `ComponentInspectorDock.tsx` open via `?component=<id>`, or template preview open | `workspaceId`, `surface`, `sessionFindId`, `kind` (`component`/`template`), `durationMs` | per-workspace, per-session | item name, category, price |
| `library_find_abandoned` | navigation away with no resolve, OR session-timer expiry at the `LIBRARY_FIND_ABANDON_TIMEOUT_MS = 120_000` cap (see Timing) | `workspaceId`, `surface`, `sessionFindId`, `durationMs`, `reason` (`navigation`/`timeout`) | per-session | any item identity |
| `quick_add_started` | Quick Add path entry in `AddComponentModal.tsx` (quick mode) | `workspaceId`, `sessionAddId`, `entry` (`library`/`folder`) | editor only (`is_workspace_editor`) | field values |
| `quick_add_saved` | success return of `createCostLibraryComponent` invoked from quick mode | `workspaceId`, `sessionAddId`, `durationMs`, `itemId`, `usedAdvanced` (bool) | editor only | name, category, cost, source, confidence |
| `quick_add_abandoned` | quick-mode dirty-discard confirm accepted (the ConfirmDialog replacing `window.confirm` at `AddComponentModal.tsx:963`) | `workspaceId`, `sessionAddId`, `durationMs`, `reason` (`discarded`/`navigation`) | editor only | field values |
| `quick_add_failed` | error return of `createCostLibraryComponent` | `workspaceId`, `sessionAddId`, `reason` (action-error code from `action-errors.ts`) | editor only | input shape, raw message body |
| `insert_target_confirmed` | success return of the real insert action `insertEstimateTemplateIntoEstimate` (`src/lib/estimates/actions.ts:2309`, RPC `insert_estimate_template_into_estimate_with_history`) — the `InsertIntoEstimatePicker.tsx` submit handler (`:99-125`) first calls `resolveEstimateTemplateInsertTarget` to RESOLVE `targetParentNodeId`, then calls this insert action. The component path fires on the success return of `insertEstimateRowItemFromLibrary` (`src/lib/estimates/actions.ts:2580`) — the single-library-component-into-estimate action, NOT a template action | `workspaceId`, `projectId`, `estimateId`, `sourceKind` (`component`/`template`), `sourceItemId`, `targetStale` (bool) | editor + `can_edit_estimate` | source/target display names |
| `insert_target_mismatch` | resolve step returns no `targetParentNodeId` (no group), or the insert action error-returns at the submit handler (`InsertIntoEstimatePicker.tsx:108-121`) | `workspaceId`, `projectId`, `estimateId`, `reason` (`stale`/`missing`/`forbidden`) | editor | any name |
| `trust_chip_rendered` | first-render-per-surface emit of trust chip on overview/recent/template rows + inspector + insert (Phase 2 component); emitted ONCE per surface per session, keyed by `sessionFindId`+`surface`, never per-row | `workspaceId`, `surface`, `kind`, `freshness` (`fresh`/`stale`/`missing` from `getComponentPricingFreshness`), `hasConfidenceLabel` (bool), `sampled` (true) | per-workspace; once per surface per session, not per-row | `pricing_source`, raw `confidence` string, item name |
| `trust_chip_unclassified` | first-render-per-surface where freshness/confidence cannot be derived; emitted ONCE per surface per session, keyed by `sessionFindId`+`surface`, never per-row (same sampling rule as `trust_chip_rendered`) | `workspaceId`, `surface`, `kind` | per-workspace; once per surface per session | item identity |

Notes on the taxonomy:

- `freshness` is the DERIVED enum from `getComponentPricingFreshness`
  (`component-facet-filter.tsx`), never the raw `pricing_date`. `hasConfidenceLabel`
  is a boolean over `confidence` presence — the free-text `confidence` string is
  NEVER emitted (per `14` data classification and the canonical confidence model).
- `reason` on failure events is an action-error CODE from `action-errors.ts`, not a
  raw exception message (raw messages can echo input). This mirrors the existing
  express-components call sites — e.g. `express-promotion-actions.ts:73` passes
  `reason: error.message` for `promotion_failed` — but adopt that shape ONLY where
  the message is already a known code. The express twin
  (`express-components-telemetry.ts`) itself only declares `reason?: string` (:17)
  and never sets `error.message`; do not attribute the raw-message shape to it.
  Where the value is a raw DB/network message, map to an action-error code first.
- `sessionFindId` / `sessionAddId` are client-generated opaque ids scoping a
  start/stop pair; they are not user or row identifiers.

## Metric To Event Mapping

| 09 Metric | Instrumentation | Start event | Success event | Verdict |
| --- | --- | --- | --- | --- |
| Component find time < 30s | session timer | `library_find_started` (`surface=components`) | `library_find_resolved` (`kind=component`) `durationMs` | INSTRUMENTED (timer) + MANUAL beta-task corroboration |
| Template find time < 30s | session timer | `library_find_started` (`surface=templates`) | `library_find_resolved` (`kind=template`) `durationMs` | INSTRUMENTED (timer) + MANUAL beta-task corroboration |
| Quick Add completion < 90s | session timer | `quick_add_started` | `quick_add_saved` `durationMs` | INSTRUMENTED (timer) + MANUAL beta-task corroboration |
| Insert accuracy (names/uses intended estimate) | server-confirmed event | n/a | `insert_target_confirmed` with `projectId`/`estimateId`; `insert_target_mismatch` flags misroutes | DOM/e2e is the PRIMARY proof (per 09); event is supporting signal |
| Trust classification 90%+ | first-render-per-surface render event | n/a | ratio of `trust_chip_rendered` to (`trust_chip_rendered` + `trust_chip_unclassified`) over the per-surface-per-session emissions | INSTRUMENTED (first-render-per-surface) + UI test (primary) |
| Privacy 0 leaks | static + test assertion, NOT a runtime event | n/a | absence asserted in tests (no private field in any payload; snapshot redaction in `14`) | MANUAL/AUTOMATED ASSERTION, not event-driven |
| Large-list usability (500 rows in budget) | not a telemetry metric | n/a | perf smoke per `16` | MANUAL (perf), out of telemetry scope |

MANUAL-only metrics (no instrumentation owed by this doc): Privacy 0 leaks
(assertion-based, see Verification), Large-list usability (perf smoke in `16`).
Find-time and Quick Add are instrumented but 09 explicitly accepts manual beta-task
timing as evidence — the instrumented timer is the cheaper, repeatable corroborator,
not a replacement for the moderated beta task.

## Timing Methodology

- Find-time and Quick Add use SESSION-SCOPED CLIENT TIMERS, not server timestamps.
  Rationale: "start" is a UI intent (search focus, Quick Add open) with no server
  round-trip, so a server timestamp would miss the user-perceived clock. The timer
  records `performance.now()` at start, computes `durationMs` at the resolve event.
- "Start" definitions: find = first search focus OR first keystroke on a
  `library`/`components`/`templates` surface, whichever is first, per `sessionFindId`.
  Quick Add = the Quick Add open action, per `sessionAddId`.
- "Success" definitions: find = inspector dock open on the intended item via
  `?component=<id>` (component) or template preview open (template). Quick Add =
  the success return of `createCostLibraryComponent`.
- Abandonment: a find session with no resolve emits `library_find_abandoned` on
  whichever fires first — navigation-away (`reason=navigation`) or the timeout cap
  (`reason=timeout`). Timeout cap (canonical): **120000 ms (120s) of no resolve
  measured from the `library_find_started` `performance.now()` start**, exported as
  `LIBRARY_FIND_ABANDON_TIMEOUT_MS = 120_000` from the session-timer util. 120s is
  4x the < 30s success target, so a genuine sub-30s find never trips it while a
  truly stalled session is bounded. Quick Add discard emits `quick_add_abandoned`.
  Abandoned sessions are excluded from the < 30s / < 90s success rate but counted
  in attempt totals (a 100% completion rate over 2 attempts is not the metric).
- Insert accuracy uses the SERVER timestamp implicitly: `insert_target_confirmed`
  fires on the success return of `insertEstimateTemplateIntoEstimate`
  (`src/lib/estimates/actions.ts:2309`), which runs AFTER
  `resolveEstimateTemplateInsertTarget` has re-resolved `targetParentNodeId`, so the
  recorded target is the re-resolved authoritative target (per `13` insert
  contract), not the client's assumed one. No duration is needed; correctness, not
  speed, is the metric.
- Trust classification is a RATIO, not a duration. Sampling rule (canonical): emit
  `trust_chip_rendered`/`trust_chip_unclassified` ONCE per surface per session
  (first-render-per-surface, keyed by `sessionFindId`+`surface`); do NOT emit
  per-row and do NOT use probabilistic 1-in-N sampling. The classified/unclassified
  ratio is computed over these per-surface-per-session emissions. This avoids
  per-row event spam while giving a stable, deterministic ratio an implementer can
  assert against.

## Privacy And Consent Gating

| Channel | Gate | Behavior |
| --- | --- | --- |
| Default (`console.warn` dev/beta sink) | none required | structured, ID-only; no PII to gate; matches express/realtime twins |
| Any future client beacon to an external sink | `hasLandingAnalyticsConsent(cookieHeader)` (`src/lib/landing/consent.ts`) | if consent false: drop the beacon, keep local `console.warn` for debugging |
| Public/share actor | hard drop | the share surface (`src/app/share/[token]`) is a frozen snapshot, not a live Library query — it MUST emit NO Library telemetry; no `recordLibraryEvent` call sites exist on that path |

Field-level exclusions enforced at the `recordLibraryEvent` boundary (not just by
convention): the payload type does not declare `pricingSource`, `confidence`,
`name`, `category`, `notes`, `unitCost`, or `query`. A field that does not exist on
the type cannot be passed — this is the primary leak guard, mirroring how the
express twin's `ExpressComponentTelemetryPayload` only declares ID/coarse fields.

What is dropped for public/share and viewer actors:

- Public/share actor: ALL Library telemetry (no call sites on the snapshot path).
- Viewer actor: editor-gated events (`quick_add_*`, `insert_*`) never fire because
  the actions are blocked by `is_workspace_editor`/`can_edit_estimate`; read events
  (`library_find_*`, `trust_chip_*`) still fire — a viewer browsing the Library is
  in-scope for find-time and trust-coverage learning.

## Verification

| Check | Method | Command |
| --- | --- | --- |
| Events fire with correct shape | Testing Library spy on `recordLibraryEvent`; assert event name + payload keys for find/quick-add/insert/trust | `vitest run tests/vitest/<library-telemetry>.test.tsx` |
| No private fields in any payload | Type-level: payload type has no `pricingSource`/`confidence`/`name`/`query`; runtime: snapshot the emitted payloads and assert key allowlist | same vitest file |
| Timer durations computed at resolve | assert `durationMs` present on `library_find_resolved` / `quick_add_saved` and absent on start events | same vitest file |
| Insert target is server-resolved | e2e: confirm `insert_target_confirmed` carries the re-resolved `projectId`/`estimateId`, and a stale target yields `insert_target_mismatch` | `bun run test:e2e` |
| Public/share emits nothing | grep assertion: no `recordLibraryEvent` import under `src/app/share` or `src/app/api/share`; snapshot redaction proven in `14` | `rg` check + the `14` suite |
| Consent drop for external beacon | unit: with `hasLandingAnalyticsConsent` false, external sink not called, local warn retained | unit suite |

Test-command correctness (per `19` and the verified package.json): the jsdom
suites run under `bun run test:dom` or `vitest run tests/vitest/<file>` — NOT
`bun test tests/vitest/<file>` (that binds to `tests/unit` only). There is no
jest-axe harness; nothing here needs one.

These commands are the proof of the instrumentation; actually RUNNING them is
execution evidence (the build-phase output), pre-registered with owner and phase
in `24-EXECUTION-EVIDENCE-LEDGER.md`. The plan is complete because every check
above names its exact command and pass criterion; a not-yet-run suite is not a
planning gap.

## Phase Placement

Telemetry is wired alongside the feature it measures, not as a separate phase:

- `library_find_*` lands with Phase 1 (Findability) — overview-to-`?component=<id>`
  continuity is the resolve event.
- `trust_chip_*` lands with Phase 2 (Source Trust) — same component that renders the
  chip emits the sampled event.
- `quick_add_*` lands with Phase 3 (Quick Add).
- `insert_target_*` lands with Phase 4 (Templates Insert) and the component insert
  path (`insertEstimateRowItemFromLibrary`, `src/lib/estimates/actions.ts:2580`).
- The new twin `library-telemetry.ts` and the session-timer util are Phase 0A
  scaffolding (contract lock), so call sites in later phases have a stable seam.

Rollout/flag coupling: each event group is gated by the same feature flag as its
host feature in `21-FEATURE-FLAGS-AND-ROLLOUT.md`; disabling a phase flag disables
its events with no orphan call sites.

## Cross-References

- `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` — the metrics this doc instruments.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` — `?component=<id>` route state and the insert
  target contract that `insert_target_confirmed` reads from.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` — data classification and the
  public/share snapshot redaction that backs the Privacy metric.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` — owns the large-list (perf) metric
  this doc marks out of telemetry scope.
- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — authoritative names, enums,
  phase labels, and test commands used throughout.
- `21-FEATURE-FLAGS-AND-ROLLOUT.md` — flags that gate each event group.
- `24-EXECUTION-EVIDENCE-LEDGER.md` — pre-registers the run of every Verification
  command above (owner, phase, pass criterion) as execution evidence.
