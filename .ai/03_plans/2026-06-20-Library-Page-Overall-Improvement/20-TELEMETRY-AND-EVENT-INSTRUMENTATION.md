# 20 — Telemetry And Event Instrumentation

> **Status:** Living document. Defines the event taxonomy, timing methodology, privacy gating, sink contract, and verification for the Library closed-beta metrics in `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md`.
>
> **Scope:** Event names, properties, instrumentation points, schema/version policy, beta-sink rationale, backpressure/sampling budget, i18n-safe label strategy, and code-owner per event family. Resolves `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-009 (`console.warn` sufficient for beta) and C-020 (telemetry per row).
>
> **Companion docs:** [09-MVP-STRATEGY-AND-SUCCESS-METRICS.md](09-MVP-STRATEGY-AND-SUCCESS-METRICS.md), [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md), [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md), [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md), [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md), [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md), [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md), [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md).

---

## 1. Why this doc exists

`09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` names five learnable beta metrics. None are instrumentable without a named event taxonomy and timing methodology. This doc closes that gap: it picks the substrate to reuse, defines events, maps each 09 metric to events (or marks it MANUAL), specifies timing/privacy gating, and sets verification.

This is an observability seam, not a product analytics platform. Closed-beta needs structured, privacy-safe, debuggable events — not a vendor pipeline. Scope stays inside the canonical phase map (`19`).

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
| Why `console.warn` is enough for beta | Closed beta has no external users, no SLA dashboard, and no analytics vendor contract. The 09 metrics are learnable from structured logs, DOM/e2e tests, and moderated beta tasks. A prod sink is Phase-later. |
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
| Sampling | No probabilistic sampling for beta. `trust_chip_*` uses deterministic first-render-per-surface sampling. If volume exceeds 1,000 events/session, add `sampled: true` flag and switch to 1-in-10 for `library_find_started` only. | Telemetry lead | 5 | n/a | revert sampling config | EV-TELEMETRY-03 | `library_find_started` | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/library-telemetry.ts` |
| Budget | Telemetry must not add > 5 KB to initial bundle or > 1 ms per event emission. | Perf lead | 0A | n/a | n/a | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | n/a | n/a | `30-PERF-BUDGET-AND-REGRESSION-GATES.md` §3 |

---

## 6. Event taxonomy

All events route through `recordLibraryEvent(event, payload)` in the new twin. Code owner per event family is listed.

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
| `trust_chip_unclassified` | Backend lead | first-render-per-surface where freshness/confidence cannot be derived | `workspaceId`, `surface`, `kind` | once per surface per session | item identity |

### Notes

- `freshness` is the DERIVED 4-tier enum from `getComponentPricingFreshness` (`fresh`/`stale`/`very stale`/`missing`). `hasConfidenceLabel` is a boolean over `confidence` presence — the free-text `confidence` string is NEVER emitted.
- `reason` on failure events is an action-error CODE from `action-errors.ts`, not a raw exception message.
- `sessionFindId` / `sessionAddId` are client-generated opaque ids scoping a start/stop pair.

Owner: Telemetry lead | Phase: 0A | Evidence: EV-TELEMETRY-01 | Binding: `src/lib/component-library/library-telemetry.ts`

---

## 7. Metric to event mapping

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

Rollout/flag coupling: each event group is gated by the same feature flag as its host feature in `21`; disabling a phase flag disables its events with no orphan call sites.

---

## 13. Cross-references

- `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` — the metrics this doc instruments.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` — `?component=<id>` route state and insert target contract.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` — data classification and public/share snapshot redaction.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` — large-list perf metric (out of telemetry scope).
- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — authoritative names, enums, phase labels, test commands.
- `21-FEATURE-FLAGS-AND-ROLLOUT.md` — flags that gate each event group.
- `24-EXECUTION-EVIDENCE-LEDGER.md` — pre-registered run of every verification command.
- `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-009 — `console.warn` sufficient for beta.
