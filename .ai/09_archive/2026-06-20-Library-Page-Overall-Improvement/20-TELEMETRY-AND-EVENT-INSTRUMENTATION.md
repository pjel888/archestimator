# 20 — Telemetry And Event Instrumentation

> **Status:** Living document. Defines the event taxonomy, timing methodology, privacy gating, sink contract, and verification for the Library closed-beta metrics in `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md`.
>
> **Scope:** Event names, properties, instrumentation points, schema/version policy, beta-sink rationale, backpressure/sampling budget, i18n-safe label strategy, and code-owner per event family. Resolves `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-009 (`console.warn` sufficient for beta) and C-020 (telemetry per row).
>
> **Companion docs:** [09-MVP-STRATEGY-AND-SUCCESS-METRICS.md](09-MVP-STRATEGY-AND-SUCCESS-METRICS.md), [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md), [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md), [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md), [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md), [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md), [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md), [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md).
>
> **§3 gap closure status (auditor index, 2026-06-21):** all five doc-25 §3 gaps for
> this doc are closed inline: (1) **event persistence/sink destination** — §4 names
> `console.warn` (beta) and a Postgres `events` table / analytics platform (Phase-later
> prod sink) wired via `setLibraryTelemetrySink`; (2) **event volume/backpressure/sampling
> budget** — §5 (coarse lifecycle-scoped volume; `console.warn` has no network
> backpressure; future async sink must swallow failures; deterministic sampling for
> `trust_chip_*`, probabilistic 1-in-N gated on prod sink); (3) **telemetry
> versioning/backward-compat policy** — §3 "Backward compatibility" row (additive-only
> for beta; rename/remove requires new schema version + migration window); (4) **i18n-safe
> label strategy** — §10 (ASCII snake_case event names + payload keys; localized labels
> via copy keys in doc 22; `reason` codes are stable action-error codes); (5) **code-owner/
> phase-owner per event family** — §6 "Code owner" column per event + §12 phase-placement
> table. New event families registered 2026-06-21: §6A (15 security events, EV-TELEMETRY-SEC),
> §6B (6 route-state/cache-recovery events, EV-TELEMETRY-ROUTE), §6C (11 input/trust-gate/
> bulk-action events, EV-TELEMETRY-INPUT).

---

## 1. Why this doc exists

`09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` names five learnable beta metrics. None are instrumentable without a named event taxonomy and timing methodology. This doc closes that gap: it picks the substrate to reuse, defines events, maps each 09 metric to events (or marks it MANUAL), specifies timing/privacy gating, and sets verification.

This is an observability seam, not a product analytics platform. Closed-beta needs structured, privacy-safe, debuggable events — not a vendor pipeline. Scope stays inside the canonical phase map (`19`).

**Non-goal:** the liquid-glass library redesign (doc 35 v2) has NO dedicated
telemetry family in this taxonomy. If the glass surface lands and its render
arming (`data-glass="ready"`) or one-blur-per-region behavior needs measuring,
add a `library_glass_*` family (rendered/armed/deferred) bound to the glass
provider and `--glass-*` tokens; until then it is out of telemetry scope.

Owner: Telemetry lead | Phase: 0A | Flag: n/a | Rollback: revert `library-telemetry.ts` file | Evidence: EV-TELEMETRY-01 | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: n/a

---

## 2. Substrate decision: reuse, then extend

| Surface | File | Shape | Verdict | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Express-components telemetry | `src/lib/estimates/express-components-telemetry.ts` | `recordExpressComponentEvent(event, payload)`; union event type; ID-only payload; `console.warn` now, swappable; no-op under `NODE_ENV==="test"` | REUSE the pattern. Add a Library-scoped twin. | Telemetry lead | 0A | n/a | revert twin creation | EV-TELEMETRY-01 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/estimates/express-components-telemetry.ts` |
| Realtime telemetry | `src/lib/collaboration/realtime-telemetry.ts` | `reportRealtimeEvent`; `setRealtimeTelemetrySink` registration; sink failure swallowed; coarse `topic`, never raw path | REUSE the sink/registration idea for the prod swap. | Telemetry lead | 0A | n/a | revert sink registration | EV-TELEMETRY-01 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/collaboration/realtime-telemetry.ts` |
| Landing consent | `src/lib/landing/consent.ts` | `hasLandingAnalyticsConsent(cookieHeader)`; cookie `archestimator_cookie_consent` | REUSE for any future client beacon to an external sink. | Telemetry lead | Phase-later | n/a | n/a | EV-TELEMETRY-02 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/landing/consent.ts` |
| Vercel analytics redaction | `src/lib/analytics/vercel-web-analytics.ts` | `redactVercelAnalyticsEvent`; drops `/workshop`, `/share`, `/invite` URLs | Out of scope here; confirms authenticated paths are already redacted. | Telemetry lead | Phase-later | n/a | n/a | EV-TELEMETRY-02 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/analytics/vercel-web-analytics.ts` |

Decision: do NOT invent a new telemetry framework. Create `src/lib/component-library/library-telemetry.ts` as a Library twin of `express-components-telemetry.ts` — same signature shape, same `console.warn` default, same `NODE_ENV==="test"` no-op, same swappable-sink intent. The one extension: adopt the `setRealtimeTelemetrySink` registration idiom (`setLibraryTelemetrySink`) so the prod sink can be wired without touching call sites.

### Beta-sink rationale: `console.warn` is sufficient

| Aspect | Rationale |
|---|---|
| Why `console.warn` is enough for beta | Closed beta has no external users, no SLA dashboard, and no analytics vendor contract. The 09 metrics are learnable from structured logs, DOM/e2e tests, and moderated beta tasks — specifically: (1) component find time < 30s is learnable from `library_find_*` durations in a moderated beta task; (2) template find time < 30s same; (3) Quick Add completion < 90s from `quick_add_*` durations; (4) insert accuracy from the server-confirmed `insert_target_confirmed`/`insert_target_mismatch` ratio (DOM/e2e primary); (5) trust classification 90%+ from the `trust_chip_rendered`/`unclassified` ratio. All five are derivable from console.warn + test spies + a human reading the log — no aggregation pipeline required. A prod sink is Phase-later. |
| What "done" means for beta telemetry | Events emit correctly to `console.warn` with the correct schema; tests spy on `recordLibraryEvent` and assert payload shape. |
| Future sink path | `setLibraryTelemetrySink(sink)` registers an async function; default remains `console.warn`; failures swallowed so telemetry never blocks user actions. |
| No PII/price leakage | Payload type does not declare free-text user content, `pricing_source`, `confidence`, names, or prices. |

Owner: Telemetry lead | Phase: 0A | Flag: n/a | Rollback: revert sink contract | Evidence: EV-TELEMETRY-01 | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: `src/lib/component-library/library-telemetry.ts` (net-new)

---

## 3. Schema and version note

| Item | Value | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Schema version | `v1` (semver) | Telemetry lead | 0A | n/a | revert version bump | EV-TELEMETRY-01 | all events | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/library-telemetry.ts` |
| Payload contract | ID-only, workspace-scoped, lifecycle-coarse, no free-text user content or prices. | Telemetry lead | 0A | n/a | revert payload type | EV-TELEMETRY-01 | all events | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/library-telemetry.ts` |
| Backward compatibility | Additive-only for beta. Renaming/removing fields or events requires a new schema version and a migration window. | Telemetry lead | all | n/a | n/a | EV-TELEMETRY-01 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| Event name prefix | `library_`, `quick_add_`, `insert_target_`, `trust_chip_` | Telemetry lead | 0A | n/a | n/a | EV-TELEMETRY-01 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

### Base payload type (v1)

```typescript
type LibraryTelemetryPayload = {
  workspaceId: string;
  // optional, per event family:
  projectId?: string;
  estimateId?: string;
  itemId?: string;
  rowId?: string;
  sessionFindId?: string;
  sessionAddId?: string;
  surface?: 'overview' | 'components' | 'templates';
  kind?: 'component' | 'template';
  durationMs?: number;
  reason?: string; // action-error code or abandon reason
  sourceKind?: 'component' | 'template';
  targetStale?: boolean;
  freshness?: 'fresh' | 'stale' | 'very stale' | 'missing';
  hasConfidenceLabel?: boolean;
  sampled?: boolean;
  usedAdvanced?: boolean;
};
```

> **Freshness tier status (binding vs intent):** `getComponentPricingFreshness`
> (`component-facet-filter.tsx:61`) returns `fresh | stale | missing` (3 tiers)
> **today**. The `very stale` value in the payload union is **beta-target scope**
> (per `11` "Phase-2 helper-extension binding" and `26` C-001/C-021): the helper
> is extended additively to a 180-day `very_stale` tier in Phase 2 — no schema
> change, app-layer only. Until that extension lands, `trust_chip_rendered`
> emits the 3 reachable values; the `very stale` arm goes live with Phase 2.

Owner: Telemetry lead | Phase: 0A | Evidence: EV-TELEMETRY-01 | Binding: `src/lib/component-library/library-telemetry.ts`

---

## 4. Sink-registration stub and Phase-later row

| Surface | Stub | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Beta sink | `console.warn` default, no registration required. | Telemetry lead | 0A | n/a | revert to no-op | EV-TELEMETRY-01 | all events | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/library-telemetry.ts` |
| `setLibraryTelemetrySink` | Exports a registration function matching `setRealtimeTelemetrySink` shape. Default sink remains `console.warn`. | Telemetry lead | 0A | n/a | revert export | EV-TELEMETRY-01 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/library-telemetry.ts` |
| Prod sink (Postgres `events` table or analytics platform) | Phase-later — NOT required for beta launch. Exit criteria: schema v1 stable for one release cycle; privacy review passed; vendor/DB sink wired via `setLibraryTelemetrySink`. | Telemetry lead | Phase-later | n/a | remove sink wiring | EV-TELEMETRY-02 | n/a | n/a | n/a | n/a | n/a | n/a | `24-EXECUTION-EVIDENCE-LEDGER.md` Phase-later row |

---

## 5. Event volume, backpressure, and sampling budget

| Concern | Policy | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Volume | Events are coarse and lifecycle-scoped, not per-row. `trust_chip_*` emits ONCE per surface per session. Find/Quick Add sessions are bounded by timeout caps. | Telemetry lead | 0A | n/a | n/a | EV-TELEMETRY-01 | all events | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/library-telemetry.ts` |
| Backpressure | `console.warn` is synchronous and local; no network backpressure. Future async sink must swallow failures and never block UI. | Telemetry lead | 0A | n/a | n/a | EV-TELEMETRY-01 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/library-telemetry.ts` |
| Sampling | No probabilistic sampling in beta — `console.warn` is unaggregated, so a session-volume trigger is unobservable. `trust_chip_*` uses deterministic first-render-per-surface sampling (`sampled: true` is always true for that family). A probabilistic 1-in-N policy for `library_find_started` is a Phase-later prerequisite gated on a prod sink (`setLibraryTelemetrySink`) that can report session volume; until then `sampled` is a stable flag, not a measured threshold. | Telemetry lead | 5 | n/a | revert sampling config | EV-TELEMETRY-03 | `library_find_started` | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/library-telemetry.ts` |
| Budget | Telemetry must not add > 5 KB to initial bundle or > 1 ms per event emission. | Perf lead | 0A | n/a | n/a | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | n/a | n/a | `30-PERF-BUDGET-AND-REGRESSION-GATES.md` §3 |

---

## 6. Event taxonomy

All events route through `recordLibraryEvent(event, payload)` in the new twin. Code owner per event family is listed.

> **Instrumentation status:** the twin file `library-telemetry.ts` is NET-NEW
> and NONE of the trigger file:line anchors below contain a `recordLibraryEvent`
> call today — they are INSERTION TARGETS, not existing calls. The host phase
> adds each call site; one evidence row in `24-EXECUTION-EVIDENCE-LEDGER.md`
> per event group proves the call was added.

| Event | Code owner | Trigger file / function | Payload fields | Scoping | Excluded (NEVER in payload) |
|---|---|---|---|---|---|
| `library_find_started` | Frontend lead | Overview search focus/first keystroke in `LibraryOverviewSearch.tsx:258`; components-tab search in `ComponentLibraryManager.tsx:383` | `workspaceId`, `surface`, `sessionFindId` | actor role tagged | search query text, result ids |
| `library_find_resolved` | Frontend lead | `ComponentInspectorDock.tsx` open via `?component=<id>`, or template preview open | `workspaceId`, `surface`, `sessionFindId`, `kind`, `durationMs` | per-workspace, per-session | item name, category, price |
| `library_find_abandoned` | Frontend lead | navigation away with no resolve, OR session-timer expiry at `LIBRARY_FIND_ABANDON_TIMEOUT_MS = 120_000` | `workspaceId`, `surface`, `sessionFindId`, `durationMs`, `reason` | per-session | any item identity |
| `quick_add_started` | Frontend lead | Quick Add path entry in `AddComponentModal.tsx` (quick mode) | `workspaceId`, `sessionAddId`, `entry` | editor only | field values |
| `quick_add_saved` | Frontend lead | success return of `createCostLibraryComponent` from quick mode | `workspaceId`, `sessionAddId`, `durationMs`, `itemId`, `usedAdvanced` | editor only | name, category, cost, source, confidence |
| `quick_add_abandoned` | Frontend lead | quick-mode dirty-discard confirm accepted | `workspaceId`, `sessionAddId`, `durationMs`, `reason` | editor only | field values |
| `quick_add_failed` | Frontend lead | error return of `createCostLibraryComponent` | `workspaceId`, `sessionAddId`, `reason` | editor only | input shape, raw message body |
| `insert_target_confirmed` | Frontend lead | success return of `insertEstimateTemplateIntoEstimate` (template) or `insertEstimateRowItemFromLibrary` (component) | `workspaceId`, `projectId`, `estimateId`, `sourceKind`, `sourceItemId`, `targetStale` | editor + `can_edit_estimate` | source/target display names |
| `insert_target_mismatch` | Frontend lead | resolve step returns no `targetParentNodeId`, or insert action error-returns | `workspaceId`, `projectId`, `estimateId`, `reason` | editor | any name |
| `trust_chip_rendered` | Backend lead | first-render-per-surface emit of trust chip on overview/recent/template rows + inspector + insert | `workspaceId`, `surface`, `kind`, `freshness`, `hasConfidenceLabel`, `sampled: true` | per-workspace; once per surface per session | `pricing_source`, raw `confidence`, item name |
| `trust_chip_unclassified` | Backend lead | first-render-per-surface where freshness is `missing` AND `hasConfidenceLabel` is false (concrete denominator below) | `workspaceId`, `surface`, `kind` | once per surface per session | item identity |

> **Classification denominator (concrete):** `hasConfidenceLabel` =
> `confidence` IS NOT NULL AND non-empty after trim. `trust_chip_unclassified`
> fires when `freshness === 'missing'` AND `hasConfidenceLabel === false`. The
> "Trust classification 90%+" metric (§7) =
> `trust_chip_rendered / (trust_chip_rendered + trust_chip_unclassified)` over
> that exact definition. Confidence is free text (doc 19), so any non-empty
> string "derives" a label and is NOT unclassified.

### Notes

- `freshness` is the derived freshness STATUS from `getComponentPricingFreshness` (`component-facet-filter.tsx:61`), today `fresh`/`stale`/`missing`. The `very stale` (180-day) tier is beta-target scope (Phase 2, per `11` "Phase-2 helper-extension binding" and `26` C-001/C-021) — it is added additively to the helper and goes live in Phase 2; the payload union declares it so the schema does not change when the tier lands. `hasConfidenceLabel` is a boolean over `confidence` presence (non-null, non-empty after trim) — the free-text `confidence` string is NEVER emitted.
- `reason` on failure events is an action-error CODE from `action-errors.ts`, not a raw exception message.
- `sessionFindId` / `sessionAddId` are client-generated opaque ids scoping a start/stop pair.

Owner: Telemetry lead | Phase: 0A | Evidence: EV-TELEMETRY-01 | Binding: `src/lib/component-library/library-telemetry.ts`

---

## 6A. Security telemetry events (source: doc 32 §5, EV-TELEMETRY-SEC)

Doc 32 §5 defines 15 security/abuse events. They are REGISTERED HERE so this doc
remains the single telemetry source and so the schema/version, sink, sampling,
i18n-label, and code-owner rules in §§3-5/10 apply uniformly. These are
**net-new** (no call sites today; Phase 0B insertion targets, per §6
"Instrumentation status" note). Closed beta sink: `console.warn` is sufficient
(C-009) — security events are coarse, ID-only, and monitored by the security lead
reading the log + a grep assertion (§11 "Public/share emits nothing" pattern).

| Event | Trigger | Payload (privacy-safe) | Severity | Sink (beta) | Code owner | Phase | Evidence |
|---|---|---|---|---|---|---|---|
| `authz_denied` | user attempts action their role lacks | `workspaceId`, `action`, `role` (NO user_id in beta payload) | Info | `console.warn` | Security lead | 0B | EV-TELEMETRY-SEC |
| `idor_attempt` | user attempts resource outside their workspace | `workspaceId`, `resourceId` | Warn | `console.warn` | Security lead | 0B | EV-TELEMETRY-SEC |
| `cache_bleed_detected` | cross-workspace data detected in cache | `workspaceAId`, `workspaceBId`, `cacheKey` | Error | `console.warn` | Security lead | 0A | EV-TELEMETRY-SEC |
| `redaction_regression` | trust chip appears in public snapshot | `snapshotId`, `componentId` | Error | `console.warn` | Security lead | 0B | EV-TELEMETRY-SEC |
| `xss_attempt` | script tag detected in user input | `workspaceId`, `field`, `violationCode`, `inputHash`, `inputLength`, `inputCategory` (no raw or truncated input) | Warn | `console.warn` | Security lead | 3 | EV-TELEMETRY-SEC |
| `formula_injection_detected` | formula detected in import | `workspaceId`, `field` | Warn | `console.warn` | Security lead | Phase-later | EV-TELEMETRY-SEC |
| `csrf_attempt` | server action called from wrong origin | `origin`, `action` | Warn | `console.warn` | Security lead | 0B | EV-TELEMETRY-SEC |
| `rate_limit_exceeded` | user exceeds rate limit | `workspaceId`, `endpoint`, `count` | Info | `console.warn` | Security lead | Phase-later | EV-TELEMETRY-SEC |
| `snapshot_bypass_attempt` | attempt to access live component via shared URL | `workspaceId`, `url` | Warn | `console.warn` | Security lead | 0B | EV-TELEMETRY-SEC |
| `telemetry_pii_leak` | PII detected in a telemetry payload (meta-monitoring) | `eventName`, `field` | Error | `console.warn` | Telemetry lead | 0A | EV-TELEMETRY-SEC |
| `search_rate_anomaly` | >100 searches/minute | `workspaceId`, `count`, `window` | Warn | `console.warn` | Security lead | Phase-later | EV-TELEMETRY-SEC |
| `snapshot_enumeration_pattern` | >10 snapshot accesses/minute from same IP | `ipHash`, `count`, `window` | Warn | `console.warn` | Security lead | Phase-later | EV-TELEMETRY-SEC |
| `folder_api_anomaly` | abnormal folder API usage | `workspaceId`, `pattern` | Warn | `console.warn` | Security lead | Phase-later | EV-TELEMETRY-SEC |
| `bulk_export` | >50 templates exported in one session | `workspaceId`, `count` | Warn | `console.warn` | Security lead | Phase-later | EV-TELEMETRY-SEC |
| `trust_state_tamper` | client attempts to set trust state | `workspaceId`, `attemptedValue` | Error | `console.warn` | Security lead | 2 | EV-TELEMETRY-SEC |

### Security-event rules

- **Schema/version:** same `v1` schema, same `recordLibraryEvent(event, payload)`
  twin, additive-only (§3). Security events share the `workspaceId`-only scoping
  rule; no raw user identity in beta payload (prod sink adds stable actor id under
  its own privacy review).
- **i18n-safe labels:** event names are ASCII snake_case; dashboard labels localize
  via copy keys in doc 22, never embedded (§10).
- **Backpressure/volume:** coarse and threshold-triggered (e.g. >100/min), not
  per-row; `console.warn` is local so no network backpressure (§5). A prod sink
  via `setLibraryTelemetrySink` swallows failures and never blocks UI.
- **PII meta-monitoring:** `telemetry_pii_leak` is the self-check that no event
  payload carries PII; asserted in tests (§11).
- **Cross-ref:** threat vectors and abuse cases are owned by doc 32; ADV scenarios
  by doc 18. This doc owns only the telemetry shape.

---

## 6B. Route-state and cache-recovery telemetry (source: doc 13 §"Telemetry hooks for route-state", EV-TELEMETRY-ROUTE)

Doc 13 §"Telemetry hooks for route-state" defines 6 events for the `?component=<id>`
component lifecycle, the `/workshop/library/templates/[templateId]` segment-route
template lifecycle, and the workspace-switch cache-bleed
recovery path. They are REGISTERED HERE so the schema/version, sink, sampling, i18n-label,
and code-owner rules in §§3-5/10 apply uniformly. These are **net-new** (no call sites
today; Phase 0B insertion targets, per §6 "Instrumentation status" note). Closed beta
sink: `console.warn` is sufficient (C-009) — route-state events are coarse, ID-only, and
verified by DOM/e2e test spies (§11).

| Event | Trigger | Payload (privacy-safe) | Severity | Sink (beta) | Code owner | Phase | Evidence |
|---|---|---|---|---|---|---|---|
| `library_component_selected` | user opens component via `?component=<id>` (deep link or click) | `workspaceId`, `surface`, `kind='component'`, `itemId` | Info | `console.warn` | Frontend lead | 0B | EV-TELEMETRY-ROUTE |
| `component_route_not_found` | `?component=<id>` resolves to not-found / permission-denied | `workspaceId`, `surface`, `reason` (action-error code: `not_found`/`permission_denied`) | Warn | `console.warn` | Frontend lead | 0B | EV-TELEMETRY-ROUTE |
| `route_state_authz_denied` | route-state load rejected by object-level authz | `workspaceId`, `resourceKind='component'`, `reason` | Warn | `console.warn` | Security lead | 0B | EV-TELEMETRY-ROUTE |
| `workspace_switch_cache_recovery` | workspace switch clears `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` before stale data renders | `workspaceAId`, `workspaceBId`, `cacheKey` (hashed), `recovered: true` | Info | `console.warn` | Backend lead | 0A | EV-TELEMETRY-ROUTE |
| `library_template_opened` | user opens template via `/workshop/library/templates/[templateId]` | `workspaceId`, `surface='templates'`, `kind='template'`, `itemId` | Info | `console.warn` | Frontend lead | 4 | EV-TELEMETRY-ROUTE |
| `template_route_not_found` | `/workshop/library/templates/[templateId]` resolves to not-found / permission-denied | `workspaceId`, `surface='templates'`, `reason` | Warn | `console.warn` | Frontend lead | 4 | EV-TELEMETRY-ROUTE |

### Route-state event rules

- **Schema/version:** same `v1` schema, same `recordLibraryEvent(event, payload)` twin,
  additive-only (§3). Route-state events share the `workspaceId`-only scoping rule; the
  hashed `cacheKey` on `workspace_switch_cache_recovery` is the SHA-256 short-prefix of
  the literal cache key, never the raw key (which would leak workspace identity into a
  hashable shape).
- **i18n-safe labels:** event names are ASCII snake_case; the `reason` enum is a stable
  action-error code from `action-errors.ts`, never a translated string (§10).
- **Backpressure/volume:** coarse and lifecycle-scoped (open/not-found/recovery), not
  per-row; `console.warn` is local so no network backpressure (§5).
- **PII:** `itemId` is the canonical UUID; no name/category/price. `reason` is an
  action-error code, never a raw exception message or user-supplied text.
- **Cross-ref:** route-state UX matrix and cache-invalidation test mapping are owned by
  doc 13 (§"Route-state UX matrix", §"Cache-invalidation test mapping"); ADV scenarios
  by doc 18. This doc owns only the telemetry shape.

Owner: Telemetry lead | Phase: 0A | Evidence: EV-TELEMETRY-01 | Binding: `src/lib/component-library/library-telemetry.ts` (net-new twin)

---

## 6C. Input, import/export, trust-gate, and bulk-action telemetry (sources: doc 11 §"Trust-chip Telemetry", doc 15 §File-Upload/Import/Export telemetry, doc 32 §5, EV-TELEMETRY-INPUT)

Docs 11, 15, and 32 define 11 events for the trust-state insert gate, file upload/import
rejection, export volume, bulk-archive hash-lock, and trust-state tamper. They are
REGISTERED HERE so the schema/version, sink, sampling, i18n-label, and code-owner rules
in §§3-5/10 apply uniformly. These are **net-new** (no call sites today; insertion targets
per the host phase). Closed beta sink: `console.warn` is sufficient (C-009).

| Event | Trigger | Payload (privacy-safe) | Severity | Sink (beta) | Code owner | Phase | Evidence |
|---|---|---|---|---|---|---|---|
| `trust_insert_gate_warned` | user attempts to insert a stale/very-stale item and sees the confirmation gate (gate shown) | `workspaceId`, `freshness` (`stale`/`very stale`), `surface` | Warn | `console.warn` | Backend lead | 2 | EV-TELEMETRY-INPUT |
| `trust_insert_gate_confirmed` | user confirms the stale-insert gate and the insert proceeds | `workspaceId`, `freshness`, `surface` | Info | `console.warn` | Backend lead | 2 | EV-TELEMETRY-INPUT |
| `trust_insert_gate_blocked` | insert blocked by policy (e.g. very-stale + viewer role) | `workspaceId`, `freshness`, `role`, `reason` | Warn | `console.warn` | Security lead | 2 | EV-TELEMETRY-INPUT |
| `quick_add_field_invalid` | Quick Add field fails validation (per doc 15 §Current validation) | `workspaceId`, `field` (canonical field name, never the value), `rule` | Info | `console.warn` | Frontend lead | 3 | EV-TELEMETRY-INPUT |
| `formula_injection_detected` | CSV import cell matches formula-injection pattern (per doc 15 §CSV formula safety + doc 32 §5) | `workspaceId`, `field` (column name), `rowIndex` (1-based, no row data) | Warn | `console.warn` | Security lead | Phase-later | EV-TELEMETRY-INPUT |
| `upload_rejected_type` | file upload rejected by MIME/extension allowlist (per doc 15 §File Upload telemetry) | `workspaceId`, `mimeType`, `extension` | Info | `console.warn` | Security lead | Phase-later | EV-TELEMETRY-INPUT |
| `import_failed_partial_commit` | import transaction rolled back OR partially committed then aborted (per doc 15 §Import telemetry) | `workspaceId`, `rowCount`, `reason` (action-error code) | Error | `console.warn` | Backend lead | Phase-later | EV-TELEMETRY-INPUT |
| `export_large_export_logged` | single export exceeds the large-export row threshold (per doc 15 §Export telemetry) | `workspaceId`, `count`, `format` | Info | `console.warn` | Backend lead | Phase-later | EV-TELEMETRY-INPUT |
| `bulk_export` | >50 templates exported in one session (per doc 15 §Export + doc 32 §5 A-004) | `workspaceId`, `count`, `window` | Warn | `console.warn` | Security lead | Phase-later | EV-TELEMETRY-INPUT |
| `bulk_archive_hash_mismatch` | `execute_bulk_archive_library_components` `expected_preview_hash` does not match the re-previewed hash (per doc 32 §3 V-014 + §5) | `workspaceId`, `itemId` (the item that drifted, if known) | Error | `console.warn` | Security lead | 0B | EV-TELEMETRY-INPUT |
| `trust_state_tamper` | client attempts to set/override trust state (per doc 32 §3 V-013 + §5 A-005; trust is server-derived, never client-set) | `workspaceId`, `attemptedValue` (the rejected value's tier label, never raw input) | Error | `console.warn` | Security lead | 2 | EV-TELEMETRY-INPUT |

### Input/trust-gate event rules

- **Schema/version:** same `v1` schema, same `recordLibraryEvent(event, payload)` twin,
  additive-only (§3). All events share the `workspaceId`-only scoping rule; no raw user
  identity in beta payload.
- **PII discipline (binding):**
  - `quick_add_field_invalid.field` is the **canonical field name** (`name`/`category`/
    `unit_cost`/…), NEVER the user-typed value. `rule` is the validation rule id
    (`required`/`max_length`/`pattern`/…).
  - `formula_injection_detected` carries the **column name** and **row index** only; the
    matched cell content is NEVER emitted (per doc 32 §5 "V-012 XSS payload should not
    store raw script").
  - `upload_rejected_type` carries MIME type + extension only; never the filename (which
    could carry PII).
  - `trust_state_tamper.attemptedValue` is the rejected **tier label**
    (`fresh`/`stale`/`very stale`/`missing`), never the raw client payload.
- **i18n-safe labels:** event names + `rule`/`reason` codes are ASCII snake_case; the
  `freshness` enum mirrors the base payload (§3); localized display maps in doc 22 (§10).
- **Backpressure/volume:** coarse and event-triggered (validation failure, gate decision,
  hash mismatch), not per-row; `console.warn` is local so no network backpressure (§5).
- **Cross-ref:** trust-gate UX is owned by doc 11 (§"Trust-chip Telemetry"); upload/import
  validation by doc 15; threat vectors V-013/V-014 by doc 32. This doc owns only the
  telemetry shape.

Owner: Telemetry lead | Phase: 0A | Evidence: EV-TELEMETRY-01 | Binding: `src/lib/component-library/library-telemetry.ts` (net-new twin)

---

| 09 Metric | Instrumentation | Start event | Success event | Verdict | Owner | Phase | Flag | Evidence |
|---|---|---|---|---|---|---|---|---|
| Component find time < 30s | session timer | `library_find_started` (`surface=components`) | `library_find_resolved` (`kind=component`) `durationMs` | INSTRUMENTED + MANUAL beta-task | Frontend lead | 1 | `library_component_deep_link` | EV-FRONTEND-01 |
| Template find time < 30s | session timer | `library_find_started` (`surface=templates`) | `library_find_resolved` (`kind=template`) `durationMs` | INSTRUMENTED + MANUAL beta-task | Frontend lead | 1 | `library_component_deep_link` | EV-FRONTEND-01 |
| Quick Add completion < 90s | session timer | `quick_add_started` | `quick_add_saved` `durationMs` | INSTRUMENTED + MANUAL beta-task | Frontend lead | 3 | `library_quick_add` | EV-FRONTEND-08 |
| Insert accuracy | server-confirmed event | n/a | `insert_target_confirmed` with `projectId`/`estimateId`; `insert_target_mismatch` flags misroutes | DOM/e2e PRIMARY; event supporting | Frontend lead | 4 | `library_trust_chips` | EV-FRONTEND-07 |
| Trust classification 90%+ | first-render-per-surface render event | n/a | ratio `trust_chip_rendered` / (`trust_chip_rendered` + `trust_chip_unclassified`) | INSTRUMENTED + UI test | Backend lead | 2 | `library_trust_chips` | EV-BE-04 |
| Privacy 0 leaks | static + test assertion, NOT runtime event | n/a | absence asserted in tests | MANUAL/AUTOMATED ASSERTION | Security lead | 0B | n/a | EV-SEC-02 |
| Large-list usability | not a telemetry metric | n/a | perf smoke per `16` | MANUAL (perf) | Perf lead | 0A, 5 | `library_dense_mode` | EV-PERF-01 |

---

## 8. Timing methodology

| Aspect | Rule | Owner | Phase | Evidence |
|---|---|---|---|---|
| Find-time / Quick Add timers | SESSION-SCOPED CLIENT TIMERS (`performance.now()` at start, `durationMs` at resolve). | Frontend lead | 1, 3 | EV-FRONTEND-01, EV-FRONTEND-08 |
| Find start | First search focus OR first keystroke on a `library`/`components`/`templates` surface, whichever is first, per `sessionFindId`. | Frontend lead | 1 | EV-FRONTEND-01 |
| Find success | Inspector dock open on intended item via `?component=<id>` (component) or template preview open (template). | Frontend lead | 1 | EV-FRONTEND-01 |
| Quick Add start | Quick Add open action, per `sessionAddId`. | Frontend lead | 3 | EV-FRONTEND-08 |
| Abandonment timeout | `LIBRARY_FIND_ABANDON_TIMEOUT_MS = 120_000` ms (120s) from start. | Frontend lead | 1 | EV-FRONTEND-01 |
| Insert accuracy | `insert_target_confirmed` fires AFTER `resolveEstimateTemplateInsertTarget` re-resolves `targetParentNodeId`; recorded target is authoritative. | Frontend lead | 4 | EV-FRONTEND-07 |
| Trust classification ratio | Emit `trust_chip_rendered`/`trust_chip_unclassified` ONCE per surface per session; do NOT emit per-row. | Backend lead | 2 | EV-BE-04 |

---

## 9. Privacy and consent gating

| Channel | Gate | Behavior | Owner | Phase | Evidence |
|---|---|---|---|---|---|
| Default (`console.warn` dev/beta sink) | none required | structured, ID-only; no PII to gate | Telemetry lead | 0A | EV-TELEMETRY-01 |
| Future external beacon | `hasLandingAnalyticsConsent(cookieHeader)` | if consent false: drop beacon, keep local `console.warn` | Telemetry lead | Phase-later | EV-TELEMETRY-02 |
| Public/share actor | hard drop | share surface emits NO Library telemetry; no `recordLibraryEvent` call sites on that path | Security lead | 0B | EV-SEC-02 |
| Viewer actor | editor-gated events never fire; read events still fire | `quick_add_*`, `insert_*` blocked by `is_workspace_editor`/`can_edit_estimate`; `library_find_*`, `trust_chip_*` allowed | Security lead | 0B | EV-SEC-01 |

---

## 10. i18n-safe label strategy

| Rule | Rationale | Owner | Phase | Evidence |
|---|---|---|---|---|
| Event names and payload keys are ASCII snake_case, never user-facing. | Telemetry schema is invariant across locales. | Telemetry lead | 0A | EV-TELEMETRY-01 |
| Human-readable labels for dashboards are looked up via copy keys in `22`, not embedded in events. | Labels localize without schema changes. | Copy lead | all | EV-COPY-01 |
| `reason` values are stable action-error codes, never translated strings. | Dashboards can map codes to localized labels. | Telemetry lead | 0A | EV-TELEMETRY-01 |
| `surface`, `kind`, `freshness` enums are canonical English values; localized display maps in `22`. | Keeps event schema small and stable. | Telemetry lead | 0A | EV-TELEMETRY-01 |

---

## 11. Verification

| Check | Method | Command | Pass condition | Owner | Phase | Flag | Evidence |
|---|---|---|---|---|---|---|---|
| Events fire with correct shape | Testing Library spy on `recordLibraryEvent` | `bun run test:dom` (or `vitest run tests/vitest/<file>`) | event name + payload keys match taxonomy | Frontend lead | 0A–5 | per-phase flag | EV-TELEMETRY-01 |
| No private fields in any payload | Type-level + runtime snapshot | same vitest file | payload has no `pricingSource`/`confidence`/`name`/`query` | Telemetry lead | 0A | n/a | EV-TELEMETRY-01 |
| Timer durations computed at resolve | assert `durationMs` | same vitest file | `durationMs` present on resolve/saved; absent on start | Frontend lead | 1, 3 | `library_component_deep_link`, `library_quick_add` | EV-FRONTEND-01, EV-FRONTEND-08 |
| Insert target is server-resolved | e2e | `bun run test:e2e` | `insert_target_confirmed` carries re-resolved `projectId`/`estimateId`; stale target yields `insert_target_mismatch` | Frontend lead | 4 | `library_trust_chips` | EV-FRONTEND-07 |
| Public/share emits nothing | grep assertion | `rg "recordLibraryEvent" src/app/share src/app/api/share` | 0 matches | Security lead | 0B | n/a | EV-SEC-02 |
| Consent drop for external beacon | unit test | `bun run test:dom` | with consent false, external sink not called, local warn retained | Telemetry lead | Phase-later | n/a | EV-TELEMETRY-02 |

> Test-command correctness: jsdom suites run under `bun run test:dom` or `vitest run tests/vitest/<file>` — NOT `bun test tests/vitest/<file>` (that binds to `tests/unit` only).

---

## 12. Phase placement

| Event group | Phase | Flag | Owner | Evidence |
|---|---|---|---|---|
| `library_find_*` | 1 | `library_component_deep_link` | Frontend lead | EV-FRONTEND-01 |
| `trust_chip_*` | 2 | `library_trust_chips` | Backend lead | EV-BE-04 |
| `quick_add_*` | 3 | `library_quick_add` | Frontend lead | EV-FRONTEND-08 |
| `insert_target_*` | 4 | `library_trust_chips` | Frontend lead | EV-FRONTEND-07 |
| `library-telemetry.ts` twin + session-timer util | 0A | n/a | Telemetry lead | EV-TELEMETRY-01 |
| Security events (`authz_denied`/`idor_attempt`/`cache_bleed_detected`/`redaction_regression`/`snapshot_bypass_attempt` + 10 more, §6A) | 0A/0B/2/3/Phase-later per row | n/a (security is always on) | Security lead | EV-TELEMETRY-SEC |
| Route-state events (`library_component_selected`/`component_route_not_found`/`route_state_authz_denied`/`workspace_switch_cache_recovery`/`library_template_opened`/`template_route_not_found`, §6B) | 0A/0B/4 per row | `library_component_deep_link` | Frontend lead / Security lead / Backend lead | EV-TELEMETRY-ROUTE |
| Input/trust-gate events (`trust_insert_gate_*`/`quick_add_field_invalid`/`formula_injection_detected`/`upload_rejected_type`/`import_failed_partial_commit`/`export_large_export_logged`/`bulk_export`/`bulk_archive_hash_mismatch`/`trust_state_tamper`, §6C) | 2/3/0B/Phase-later per row | `library_trust_chips` / `library_quick_add` | Backend lead / Security lead / Frontend lead | EV-TELEMETRY-INPUT |

Rollout/flag coupling: each event group is gated by the same feature flag as its host feature in `21`; disabling a phase flag disables its events with no orphan call sites. Security events (`§6A`) and route-state authz events (`route_state_authz_denied`) are always-on (no feature flag) because they monitor invariants, not features.

---

## 13. Cross-references

- `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` — the metrics this doc instruments.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` — `?component=<id>` route state and insert target contract.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` — data classification and public/share snapshot redaction.
- `32-SECURITY-THREAT-MODEL-EXPANSION.md` §5 — source of the 15 security/abuse telemetry events registered in §6A.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` — large-list perf metric (out of telemetry scope).
- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — authoritative names, enums, phase labels, test commands.
- `21-FEATURE-FLAGS-AND-ROLLOUT.md` — flags that gate each event group.
- `24-EXECUTION-EVIDENCE-LEDGER.md` — pre-registered run of every verification command.
- `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-009 — `console.warn` sufficient for beta.
