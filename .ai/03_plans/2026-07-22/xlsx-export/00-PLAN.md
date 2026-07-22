# XLSX Export Reliability and Review Redesign Plan

## Status

- **Mode:** Plan Pack
- **Profile:** high-blast-radius
- **Package:** `PLAN-2026-07-22-xlsx-export`
- **Implementation:** not started
- **First ready unit:** `UNIT-001`
- **Stop condition:** every requirement is reconciled against fresh evidence; review and download agree for the same saved state; workbook values, formulas, styles, redaction, and failure behavior are correct; runtime caps are evidence-derived; external deployment remains separate.

## Execution Contract

- **Target result:** a dependable XLSX export whose server review truthfully describes the exact downloadable workbook.
- **Success criteria:** `AC-001` through `AC-009` pass with their own evidence; no acceptance criterion inherits a neighboring result.
- **Constraints:** preserve the current `.xlsx` route, current user-facing setting surface, canonical estimate calculations, custom Worker-safe serializer, Node.js route runtime, existing source caps until measurement justifies a lower cap, and the user-controlled test gate.
- **Owner:** one lead executor owns integration and final verification. Optional specialists are read-only unless a later execution plan assigns a disjoint path set.
- **Write discipline:** only one writer owns a path at a time. `UNIT-001` and `UNIT-002` may run concurrently because their production and conditional test paths do not overlap. A synchronization barrier follows both units.
- **Allowed tools:** repository inspection, `apply_patch`, TypeScript/LSP, targeted lint/static checks, and the plan-pack validator. Product tests, builds used as test gates, browser automation, screenshots, and spreadsheet-app automation require `AUTH-001`.
- **Authoritative inputs:** current route/model/serializer/UI source, estimate calculation helpers and types, migrations `0006` and `0100`, `wrangler.jsonc`, local Next.js 16 documentation, and the provider references in `01-CURRENT-STATE-AUDIT.md`.
- **Escalate only if:** implementing the current contract would require a new dependency, a remote mutation/deployment, an irreversible data change, or a product decision that changes the existing export settings or financial semantics.
- **Stop:** finish after local implementation and authorized evidence are reconciled. Do not turn hosted deployment into an implementation prerequisite.

## Outcome Contract

Archestimator must provide a dependable XLSX export from the authenticated estimate workspace. The interaction must review what the server will export, authorize internal-only content on the server, preserve current estimate financial semantics across supported shapes, and produce a valid styled editable workbook within Cloudflare Worker constraints.

### In scope

- Estimate-sheet XLSX trigger, dialog, hook, and state.
- Proposal export semantic model, current settings, workbook builder, and custom serializer.
- Existing XLSX route plus one server-authoritative review route.
- Durable proposal-export rate limiting and typed route failures.
- Legacy Main, estimate tabs, archived filtering, areas/groups, row link/lifecycle states, scope, adjustments, contingency, VAT, source breakdown, naming, and limits.
- Conditional repair/expansion of the exact targeted tests in this pack after `AUTH-001` opens.

### Out of scope

- New consolidation modes, summary-only exports, export-setting persistence, jobs/queues/R2 artifacts, history, or a new spreadsheet dependency.
- User overrides for saved sheet adjustment, supplier/source visibility, zero-row policy, or excluded-row policy.
- Remote D1 mutation, Cloudflare deployment, hosted proof, paid services, or external uploads.
- Product tests, builds, browser/visual proof, screenshots, or spreadsheet automation during this planning task.

## Requirements

| ID | Requirement | Completion evidence |
| --- | --- | --- |
| `OPS-001` | Ordinary proposal-export rate limiting must not depend on support-only schema; storage failures must produce a typed, logged, retryable response. | Both D1 insert branches plus route error-envelope evidence. |
| `DATA-001` | The export model must preserve estimate financial truth for supported row, hierarchy, tab, scope, adjustment, contingency, VAT, and consolidation cases. | Scenario fixtures with exact totals, warnings, and inclusion invariants. |
| `DATA-002` | Scope, tabs, archived filtering, legacy fallback, naming, sheet order, settings, limits, and issues must be deterministic and identical between review and download. | Shared preparation-service and fingerprint evidence. |
| `SEC-001` | Auth, ownership, audience resolution, redaction, and errors must not disclose unauthorized content. | Authorization matrix and generated-byte inspection. |
| `OPS-002` | Workbooks must be valid OOXML and preserve builder-used styles, layout, formulas, cached values, and print configuration. | Raw XML, independent parser, and conditional consumer evidence. |
| `DATA-003` | Every advertised editable formula must remain financially correct after supported edits; otherwise the row is intentionally static. | Formula provenance and mutation/recalculation evidence. |
| `UX-001` | The workspace must offer a truthful server-authoritative `Export Excel workbook` flow with exact contents and actionable typed recovery. | UI state plus review/download parity evidence. |
| `UX-002` | The dialog must be keyboard/screen-reader coherent and fit narrow mobile and zoomed layouts. | Component semantics plus conditional viewport evidence. |
| `PERF-001` | Preparation/serialization must remain bounded under the Worker memory/time envelope without unsupported guessed row/byte ceilings. | Measured near-cap profile, source-cap decision, lazy import, and timeout evidence. |

## Architecture Decisions

### `DEC-AUTO-001` Retain and finish the custom serializer

Keep `src/lib/proposal-export/xlsx-workbook.ts`. It exists for Cloudflare compatibility and already covers the needed workbook subset. Complete its style registry and OOXML output; do not reintroduce runtime ExcelJS or add a dependency. An existing parser may be used only in conditional tests and must not enter the Worker bundle.

### `DEC-AUTO-002` Replace preview with export review

The current modal is not a visual workbook preview. Rename the header action to `Export XLSX` and the dialog to `Export Excel workbook`. Show the server-confirmed filename, ordered sheets, counts, totals, effective audience, settings, validation notices, and capacity. Do not imitate a spreadsheet.

### `DEC-AUTO-003` Use one server preparation boundary

Add `src/lib/proposal-export/prepare-proposal-export.ts`. Both endpoints use it for saved-state loading, ownership-adjacent scope resolution, legacy fallback, archived filtering, effective settings/audience, models, issues, limits, filename, ordered sheet manifest, and deterministic fingerprint. Workbook bytes are a downstream output, not a second semantics path.

### `DEC-AUTO-004` Make review/download parity explicit

The review returns a fingerprint of saved export inputs and effective server decisions. Download sends that fingerprint. A different preparation result returns `409 EXPORT_REVIEW_STALE`; timestamp-only changes do not. Local dirty rows block review before the request because the server cannot observe unsaved client edits.

### `DEC-AUTO-005` Remove support-schema coupling from ordinary rate limits

`insertDurableRateLimitEvent` uses SQL without `dedupe_hash` when no dedupe hash is supplied. Only deduplicated support callers use the later column and `INSERT OR IGNORE`. Proposal export remains fail-closed, but storage errors are caught by the route and mapped to `503 EXPORT_RATE_LIMIT_UNAVAILABLE`.

### `DEC-AUTO-006` Preserve absent scope; reject invalid scope

Current estimate semantics define absent/blank scope as included. Preserve that backward-compatible behavior. Recognized statuses retain their contract. An unknown non-empty status is excluded, produces a safe row-linked validation issue, and is visibly excluded from totals. Normalization must distinguish absent from invalid instead of collapsing them.

### `DEC-AUTO-007` Make formula editability provenance-based

The model carries only the operands needed to reproduce canonical calculation:

```ts
type ProposalRowFormulaStrategy =
  | {
      kind: "live";
      calculationVersion: number;
      adjustmentPercentage: number;
      miscAmount: number;
    }
  | {
      kind: "static";
      reason: "heterogeneous-provenance" | "unsupported-provenance";
    };
```

For an included live row, the exported effective quantity and unit cost calculate `material = ROUND(quantity * unitCost, 2)`, `adjustment = ROUND(material * adjustmentPercentage / 100, 2)`, `misc = ROUND(miscAmount, 2)`, then `line = ROUND(material + adjustment + misc, 2)`. This matches the canonical independent minor-unit rounding of material, adjustment, and misc. Scope uses positive inclusion, `IF(scopeCell="INCLUDED", line, 0)`, so new exclusion labels cannot become billable by omission. Cached values equal server values.

Consolidation may stay live only when currency, calculation version, unit cost, adjustment percentage, and misc semantics are compatible. Prefer splitting the grouping key by formula provenance; if a faithful editable aggregate is impossible, emit a fully static line. Never mix a live base with a frozen percentage suffix.

Workbook-level formulas must reproduce `settings.ts` ordering and `ROUND(..., 2)` at each canonical stage for sheet adjustment, contingency, VAT, grand total, and cost/SQM. Multi-tab aggregation uses currency minor units and rejects mixed currency instead of reducing binary floats.

### `DEC-AUTO-008` Preserve the current settings surface

One parser/serializer serves review and download. Its normalized contract is:

```ts
type ProposalExportRequestV1 = {
  version: 1;
  scope:
    | { kind: "all-active-tabs" }
    | { kind: "active-tab"; tabId: string };
  requestedAudience: "client" | "internal";
  includeFormulas: boolean;
  contingency: { rate: number; mode: "percentage" | "included" };
  vat: { rate: number; mode: "percentage" | "included" };
};
```

Canonical query mapping is exact: absent `tab` means all active tabs, collapsing naturally to the only/legacy tab; one non-blank `tab=<id>` means active-tab. Absent audience/formula/charge keys default to client, formulas enabled, contingency 10% percentage, and VAT 12% percentage. Allowed query keys are `tab`, `audience`, `includeFormulas`, `contingencyRate`, `contingencyMode`, `vatRate`, and `vatMode`; download additionally requires `fingerprint=<64 hexadecimal characters>`. Each allowed key may occur once. Unknown, repeated, blank-required, non-finite/out-of-range, or invalid enum/boolean values return `400 EXPORT_INVALID_REQUEST`. The serializer emits one canonical value per non-default key; download replays the exact accepted normalized request plus the lowercase fingerprint.

The currently accepted but non-UI query keys `includeZeroRows`, `includeExcludedRows`, and `includeSourceBreakdownSheet` are rejected with `400` rather than remaining an undocumented settings surface. This deliberate compatibility break is confined to dormant non-UI controls; the route path and every current UI-generated query remain stable. Remove unused `ProposalExportMode`/`summary-only` and dead consolidation-mode types instead of implementing them.

Saved sheet adjustment remains server-derived. Source Breakdown and supplier/source remarks derive from requested internal detail plus effective audience. `includeZeroRows=false` and `includeExcludedRows=true` remain server product defaults. No new UI controls or wire keys are added for those values.

### `DEC-AUTO-009` Derive runtime capacity from evidence

Preserve the exact current source caps: 1,200 fetched nodes, 3,000 source rows, and 50 active tabs. Enforce Excel's exact 32,767-character cell limit before serialization and do not silently truncate. Source Breakdown counts in measured prepared rows/cells/text and workbook size, but the plan does not invent 10,000-row, 100,000-cell, or 4 MiB text rejection thresholds without evidence.

The provider boundary is 128 MB per isolate, shared across concurrent requests. An authorized benchmark profiles row-dominant, text-dominant, 50-tab, and Source-Breakdown fixtures in local `wrangler dev` using the real model/workbook/serializer. Its harness samples Worker-inspector `Runtime.getHeapUsage` fields (`usedSize`, `embedderHeapUsedSize`, and `backingStorageSize`) during two concurrent requests and records workerd RSS only as a secondary diagnostic. Acceptance requires `1.2 × observed concurrent peak isolate bytes < 128 MiB` and near-cap p95 preparation/serialization below 45 seconds within the current 60-second guard. If a source or prepared-text axis fails, lower the relevant existing cap or add an evidence-derived prepared UTF-8/output budget at the largest passing value, then repeat. Do not jump to queues/R2/streaming unless measurement proves synchronous export cannot serve the required product shape. Response streaming alone does not remove the current in-memory generation peak.

### `DEC-AUTO-010` Keep testing behind its existing boundary

Implementation is local and reversible. The pack specifies exact product tests but does not write or run them until `AUTH-001` opens for implementation. Static type/lint/source checks remain available. External deployment is out of scope, not a completion gate.

## Target Flow

1. User selects `Export XLSX`.
2. Existing dirty-row comparison blocks server work with `save-required` if local edits are unsaved.
3. Otherwise the dialog requests a no-store server review for the saved estimate and current request settings.
4. Server resolves auth/ownership, tabs, effective audience, saved settings, models, limits, issues, exact sheets, filename, and fingerprint through one preparation service.
5. The dialog renders a terminal or recoverable state from the typed response.
6. `Download XLSX` sends the accepted normalized request and fingerprint.
7. Download re-prepares, returns `409` on drift, or lazily builds workbook bytes under the existing 60-second guard.
8. Client distinguishes JSON errors from XLSX, retains dialog selections on failure, and reports only that the download started.
9. After a successful blob response, the existing activation POST remains best-effort; telemetry failure never changes download success.

## API Contract

### Review endpoint

Add `GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal/review`. It uses the shared parser and returns `Cache-Control: no-store`:

```ts
type ProposalExportReview = {
  effectiveAudience: "client" | "internal";
  audienceDecision: "accepted" | "downgraded";
  estimate: { id: string; name: string; versionLabel: string };
  filename: string;
  scope: { kind: "active-tab" | "all-tabs"; activeTabId: string | null };
  tabSummaries: Array<{
    tabId: string;
    tabName: string;
    includedRowCount: number;
    excludedRowCount: number;
    totals: ProposalExportTotals;
  }>;
  workbookSheets: Array<
    | { kind: "summary"; worksheetName: "Summary" }
    | { kind: "bid-form"; tabId: string; tabName: string; worksheetName: string; rowCount: number }
    | { kind: "commercial-terms"; worksheetName: "Commercial Terms" }
    | { kind: "source-breakdown"; worksheetName: "Source Breakdown"; rowCount: number }
  >;
  workbookTotals: ProposalExportTotals;
  validationIssues: ProposalExportValidationIssue[];
  capacity: {
    tabs: { used: number; limit: number };
    fetchedNodes: { used: number; limit: number };
    sourceRows: { used: number; limit: number };
    renderedRows: number;
    renderedCells: number;
    cellTextUtf8Bytes: number;
    outputBytesEstimate?: number;
    longestCellCharacters: { used: number; limit: 32767 };
  };
  normalizedRequest: ProposalExportRequestV1;
  snapshotFingerprint: string;
  generatedAt: string;
};
```

Single/legacy order is Bid Form, Summary, Commercial Terms, optional Source Breakdown. Multi-tab order is Summary, Bid Forms in server tab order, Commercial Terms, optional Source Breakdown. The manifest is built once and consumed by UI and workbook.

### Effective audience

- Client request: skip internal membership lookup and produce client output.
- Internal request plus authorized project member: internal output.
- Internal request plus confirmed non-member: client output with `audienceDecision: "downgraded"`.
- Internal membership lookup failure: `503 EXPORT_AUTHORIZATION_UNAVAILABLE`; do not silently downgrade when authorization truth is unavailable.

### Canonical fingerprint

Hash a versioned stable JSON payload with SHA-256. Recursively sort object keys, preserve semantic array order, normalize numeric/currency values, and exclude `generatedAt`, request timestamps, logs, and all other volatile fields. Include effective audience and decision, normalized current request, server-derived saved settings, ordered tabs/models, exact sheet manifest, issues, capacity, and filename.

### Review rate policy

Add `proposal_export_review` to `PublicationRateLimitScope` in `UNIT-001`, separate from download. Initial product policy is 30/minute and 300/hour per hashed user-plus-client-IP key; download remains 12/minute and 120/hour. The existing limiter hashes key parts before storage. UI debounces discrete changes, commits numeric rates on blur/Enter, aborts superseded requests, and honors `Retry-After` without loops.

### Error envelope

```ts
type ProposalExportErrorResponse = {
  error: {
    code:
      | "EXPORT_INVALID_REQUEST"
      | "EXPORT_UNAUTHORIZED"
      | "EXPORT_NOT_FOUND"
      | "EXPORT_REVIEW_STALE"
      | "EXPORT_EMPTY"
      | "EXPORT_CURRENCY_MISMATCH"
      | "EXPORT_LIMIT_EXCEEDED"
      | "EXPORT_RATE_LIMITED"
      | "EXPORT_RATE_LIMIT_UNAVAILABLE"
      | "EXPORT_AUTHORIZATION_UNAVAILABLE"
      | "EXPORT_PREPARATION_FAILED"
      | "EXPORT_GENERATION_FAILED";
    message: string;
    retryAfter?: number;
    limit?: {
      resource:
        | "tabs"
        | "fetched_nodes"
        | "source_rows"
        | "cell_characters"
        | "prepared_text_bytes"
        | "estimated_output_bytes";
      observed: number;
      limit: number;
      unit: "count" | "characters" | "bytes";
    };
  };
};
```

All JSON errors send `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Statuses: invalid `400`, unauthenticated `401`, inaccessible/missing `404`, stale `409`, empty or currency mismatch `422`, limit `413`, rate `429` with `Retry-After`, rate/auth storage unavailable `503`, preparation/generation `500`. A `413` includes exactly one triggering `limit` record with the observed value and active limit; it never includes cell text, raw row IDs, or private names. Other messages exclude SQL, D1 internals, stacks, private names, raw row IDs, and internal-only content.

Review and download each emit one terminal structured record with outcome, duration, error code, and non-sensitive tab/row/sheet counts. Do not log models, filenames, project/estimate names, cell text, supplier/source values, fingerprints, or every client-aborted superseded review.

## Execution DAG

```text
UNIT-001 ─┐
          ├─ synchronization barrier ─> UNIT-003 ─> UNIT-004 ─> UNIT-005 ─> UNIT-006
UNIT-002 ─┘
```

## Unit Contracts

### `UNIT-001` Repair shared rate-limit persistence

- **Status:** READY
- **Depends on:** none
- **Owned production paths:** `src/lib/security/durable-rate-limit-d1.ts`, `src/lib/security/durable-rate-limits.ts`, `src/lib/publication/public-rate-limits.ts`.
- **Conditional test ownership:** `tests/vitest/durable-public-rate-limit-contract.test.ts`, `tests/vitest/client-portal-public-rate-limit.test.ts` after `AUTH-001`.
- **Work:** split ordinary and deduplicated SQL; preserve support dedupe; define both proposal download and review scopes/helpers now; preserve hashed keys and fail-closed storage behavior.
- **Acceptance:** ordinary insert works against the base schema without `dedupe_hash`; support dedupe retains the later branch; review/download scopes are independent; storage errors remain typed for route mapping by `UNIT-004`.
- **Recovery:** revert only the SQL split/helper additions; never bypass rate limiting.

### `UNIT-002` Lock estimate and request semantics

- **Status:** READY
- **Depends on:** none
- **Owned production paths:** `src/lib/proposal-export/types.ts`, `settings.ts`, new `request.ts`, new `workbook-manifest.ts`, `build-proposal-export-model.ts`.
- **Conditional test ownership:** `tests/vitest/proposal-export-model.test.ts`, `proposal-export-tab-grouping.test.ts`, `estimate-unification-oracle.test.ts` after `AUTH-001`.
- **Work:** implement the S1-S19 model contract; distinguish absent/invalid scope; remove dead mode/consolidation types; preserve only current request settings; encode live/static formula provenance; use effective persisted row values; make consolidation include formula provenance; aggregate totals in minor units and reject currency mismatch.
- **Acceptance:** every model scenario has deterministic rows, issues, source traceability, inclusion, and exact totals; absent scope stays included; invalid non-empty scope is excluded with a warning; link/lifecycle state never independently changes totals.
- **Recovery:** migrate consumers in downstream order; do not retain parallel legacy semantics.

### `UNIT-003` Complete workbook and serializer correctness

- **Status:** READY
- **Depends on:** `UNIT-002` and the synchronization barrier.
- **Owned production paths:** `src/lib/proposal-export/create-proposal-workbook.ts`, `xlsx-workbook.ts`, new `resource-budget.ts`, `worksheet-name.ts`.
- **Conditional test ownership:** `tests/vitest/proposal-workbook.test.ts`, `calculation-output-parity.test.ts`, `proposal-worksheet-name.test.ts`, `proposal-workbook-benchmark.test.ts`, new `scripts/benchmark-proposal-export-worker.ts`, and new isolated fixtures under `tests/fixtures/proposal-export-worker/` after `AUTH-001`.
- **Work:** implement formula/ROUND/scope/cached-value parity; minor-unit multi-tab totals; exact current eight-column contract; deterministic style registry with `cell > row > column > default` precedence; dedupe font/fill/border/alignment/numFmt records; preserve merges, panes, dimensions, print setup, XML escaping, and valid IDs; measure Source Breakdown resources; avoid copies only when evidence shows correctness.
- **Acceptance:** formulas match canonical calculations, positive scope inclusion, and cached values; styled cells resolve to correct XML records; workbook parts/relationships parse without repair; cell length rejects before ZIP creation; no invented rendered-budget threshold.
- **Recovery:** isolate unsupported style properties behind the existing serializer interface; do not replace the serializer wholesale.

### `UNIT-004` Unify preparation, review, and download

- **Status:** READY
- **Depends on:** `UNIT-001`, `UNIT-002`, `UNIT-003`.
- **Owned production paths:** new `src/lib/proposal-export/prepare-proposal-export.ts`, new `review.ts`, new `export-errors.ts`, new review route, existing `.xlsx/route.ts`, `.xlsx/filename.ts`.
- **Conditional test ownership:** `tests/vitest/proposal-export-route.test.ts`, `proposal-export-route-workbook.test.ts`, `auth-sensitive-api-boundaries.test.ts`, `hosted-export-route-smoke-script.test.ts`, `project-location-privacy-source.test.ts` after `AUTH-001`. `scripts/verify-hosted-export-route.ts` is a compatibility consumer only; running it against a host is out of scope.
- **Work:** centralize loading/ownership/tabs/audience/saved settings/models/issues/capacity/manifest/filename/fingerprint; map limiter failures; add review and one safe terminal telemetry record per endpoint; require fingerprint for download once UI lands; preserve `runtime="nodejs"`, `dynamic="force-dynamic"`, `maxDuration=60`, dynamic workbook import, and post-auth data access.
- **Acceptance:** review/download prepare identically; normal client requests skip membership lookup; downgrade and unavailable states are distinct; empty returns `422` before bytes; every JSON error has security/cache headers; no internal content enters client review or bytes.
- **Recovery:** preserve the route path and current UI-generated query semantics; fingerprint may be temporarily optional only inside this unit and must be required before `UNIT-005` completes.

### `UNIT-005` Replace the misleading preview UI

- **Status:** READY
- **Depends on:** `UNIT-004`.
- **Owned production paths:** new `XlsxExportDialog.tsx`, new `use-estimate-xlsx-export.ts`, new `xlsx-export-review.ts`, delete old preview dialog/hook/model, and update `EstimateHeaderActions.tsx`, `EstimateSheetContent.tsx`, `use-estimate-header-actions-store.ts`.
- **Conditional test ownership:** rename/rewrite `tests/vitest/proposal-export-preview.test.tsx` as `tests/vitest/xlsx-export-dialog.test.tsx`; update `estimate-header-actions.test.tsx`, `estimate-header-actions-store.test.ts`, `estimate-sheet-extracted-models.test.ts`, `estimate-sheet-center-atomic-contracts.test.ts`, and `proposal-export-activation-route.test.ts` only if the activation call contract changes.
- **Work:** implement the state contract in `02-UX-AND-VERIFICATION-CONTRACT.md`; preserve the dirty gate; abort/debounce review; render server sheets/totals/settings/issues; use native semantic controls and a mobile-safe footer; keep activation telemetry best-effort after blob acceptance.
- **Acceptance:** exact copy and state behavior; no client-derived all-tabs truth; selections survive failure; stale/rate/unavailable recovery is actionable; focus/announcements/320px layout contracts are implemented without a fake spreadsheet.
- **Recovery:** preserve the header action slot and endpoint; delete old files only after imports and states migrate.

### `UNIT-006` Reconcile evidence and runtime capacity

- **Status:** READY
- **Depends on:** `UNIT-003`, `UNIT-004`, `UNIT-005`.
- **Owned paths:** plan-pack evidence only. No production or test file ownership.
- **Work:** run static checks; if `AUTH-001` opens, execute only `TEST-001` through `TEST-006` using the already-owned test files, inspect outputs, perform the Worker-cap measurement, and update criteria/evidence. If it stays closed, record the exact boundary without claiming pass.
- **Acceptance:** every criterion has its own PASS evidence or explicit boundary; capacity decision records fixture, baseline, concurrency, memory, elapsed time, and final caps; no release/hosted claim is implied.
- **Recovery:** route failures back to the owning unit; do not weaken assertions or invent thresholds to close evidence.

## Verification Strategy

1. Static/source checks on changed paths, including route exports/headers/imports and `git diff --check`.
2. Model scenarios and canonical calculation parity.
3. Raw OOXML parts/styles/formulas/cached values plus independent parser.
4. Review/download preparation, authorization, fingerprint, limits, and real generated bytes.
5. UI state/race/semantics checks; manual viewport or spreadsheet checks only if authorized.
6. Worker-compatible near-cap measurement before deciding whether current source caps are safe.

Exact commands and assertions are in `02-UX-AND-VERIFICATION-CONTRACT.md`.

## Gates and Authorization Boundaries

### `AUTH-001` User Test Authorization Gate

Active. Automated product tests, builds used as test gates, browser automation, screenshots, visual QA, and spreadsheet-app automation require explicit authorization for implementation. The pack may describe but not create/edit/run those tests until the gate opens. Static plan validation is not a product test.

### Triggered implementation gates

- `GATE-DATA-01`: estimate and financial truth.
- `GATE-SEC-01`: auth, ownership, audience, and byte redaction.
- `GATE-NEXT-01`: Next.js route/client boundaries and response semantics.
- `GATE-CF-01`: Node-runtime Worker compatibility, memory, timeout, lazy import.
- `GATE-UX-01`: truthful states, narrow layout, keyboard and screen reader.
- `GATE-VERIFY-01`: targeted product tests, bounded by `AUTH-001`.

The manifest `release_status` remains `BOUNDARY` only because its schema requires that state while `AUTH-001` is active; this pack does not define a deployment gate.

## Risks and Controls

| Risk | Failure mode | Control |
| --- | --- | --- |
| `RISK-001` | Rate-limit repair breaks support dedupe or still escapes the route boundary. | Separate SQL branches; `UNIT-001` owns shared helpers, `UNIT-004` owns route mapping. |
| `RISK-002` | Review/download rereads drift. | One preparation service, versioned fingerprint, `409` refresh. |
| `RISK-003` | Editable formulas preserve only part of a calculation. | Formula provenance, split grouping key, static fallback, ROUND parity. |
| `RISK-004` | OOXML styles are invalid or ignored. | Deterministic registry, raw XML, parser, conditional consumer proof. |
| `RISK-005` | Near-cap generation exceeds shared isolate limits. | Evidence-derived caps, concurrent measurement, guard/lazy import, no guessed thresholds. |
| `RISK-006` | Stale labor-era assertions create false confidence. | Repair current eight-column coordinates before feature assertions. |
| `RISK-007` | Client output leaks internal source/supplier content. | Server effective audience, unavailable-vs-downgrade distinction, byte inspection. |
| `RISK-008` | Dialog remains inaccessible or mobile-hostile. | Explicit focus/state/semantic/320px contracts and conditional viewport proof. |

## Requirement Traceability

| Requirement | Units | Acceptance criteria |
| --- | --- | --- |
| `OPS-001` | `UNIT-001`, `UNIT-004` | `AC-001` |
| `DATA-001` | `UNIT-002`, `UNIT-004` | `AC-002` |
| `DATA-002` | `UNIT-002`, `UNIT-004`, `UNIT-005` | `AC-003` |
| `SEC-001` | `UNIT-002`, `UNIT-003`, `UNIT-004`, `UNIT-005` | `AC-004` |
| `OPS-002` | `UNIT-003`, `UNIT-006` | `AC-005` |
| `DATA-003` | `UNIT-002`, `UNIT-003`, `UNIT-006` | `AC-006` |
| `UX-001` | `UNIT-004`, `UNIT-005`, `UNIT-006` | `AC-007` |
| `UX-002` | `UNIT-005`, `UNIT-006` | `AC-008` |
| `PERF-001` | `UNIT-003`, `UNIT-004`, `UNIT-006` | `AC-009` |

## Finish and Resume Contract

- **Exact next action:** execute `UNIT-001` against the observed ordinary-insert schema coupling.
- **Parallel-safe action:** `UNIT-002` may run concurrently; neither unit may touch the other's paths.
- **Barrier:** reread shared source and reconcile both outputs before `UNIT-003`.
- **Do not skip:** absent-vs-invalid scope, formula ROUND parity, current-only settings, membership lookup failure, raw style XML, Source Breakdown capacity, and byte redaction.
- **Finish:** update manifest evidence against actual results; leave tests unresolved if `AUTH-001` is closed; do not require hosted proof.
- **Resume:** revalidate affected units when a stale-trigger path or estimate/runtime contract changes.
