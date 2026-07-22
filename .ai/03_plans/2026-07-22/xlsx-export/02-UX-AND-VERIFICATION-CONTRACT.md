# UX and Verification Contract

## Product Position

This authenticated estimate-workspace operation lets an estimator confirm the exact server-prepared workbook, resolve blockers, and start a trustworthy XLSX download. It is not a spreadsheet preview.

## Naming and Copy Contract

| Surface | Required copy |
| --- | --- |
| Header action | `Export XLSX` |
| Dialog title | `Export Excel workbook` |
| Loading | `Preparing export details...` |
| Primary action | `Download XLSX` |
| Drift recovery | `Refresh export details` |
| Unsaved state | `Save the estimate before exporting.` |
| Empty state | `There are no exportable rows for these settings.` |
| Internal downgrade | `Internal details are not available for this export.` |
| Rate limit | `Too many export attempts. Try again in {time}.` |
| Service failure | `Export details are temporarily unavailable. Try again.` |

Avoid `preview`, `live preview`, or `saved successfully`. The browser can confirm response acceptance, not final disk persistence.

## Dialog Information Architecture

### Header and scope

- Title, purpose, close control, and only actionable status labels.
- Native radio group: current tab and all active tabs; archived tabs never appear.
- Scope/toggle changes invalidate the fingerprint and debounce review. Numeric rates commit on blur/Enter.

### Exact workbook contents

- Server filename and ordered `workbookSheets`.
- Per-tab included/excluded counts and totals; all-tabs data is never inferred from the active tab.
- Summary, Bid Forms, Commercial Terms, and conditional Source Breakdown are named exactly as prepared.
- Long sheet lists use a bounded disclosure/list, not a page-height fake workbook.

### Financial summary

- Direct cost, saved sheet adjustment, project contingency, VAT, and grand total.
- One-column definition list on narrow screens; compact two-column layout when space permits.

### Current export settings

- Scope/tab.
- Requested versus effective audience and downgrade message.
- Formulas.
- Contingency rate/mode.
- VAT rate/mode.
- Server-derived saved sheet adjustment and internal Source Breakdown/remarks shown read-only when relevant.
- Do not add controls for consolidation, summary-only, zero rows, excluded rows, supplier remarks, or sheet adjustment.

### Validation, capacity, and footer

- Errors before warnings before info; safe source labels only.
- Show current source-cap usage near/over limits and measured rendered counts as information, not invented caps.
- Blocking issues disable download only when the prepared result says so.
- Sticky mobile-safe footer with `Close` and `Download XLSX`; pending download prevents duplicates and announces progress.

## State Machine

```text
closed
  -> save-required
  -> preparing-review
      -> review-ready
      -> empty
      -> limit-exceeded
      -> unauthorized/access-denied
      -> rate-limited
      -> authorization-unavailable
      -> unavailable
      -> network-error

review-ready
  -> preparing-review
  -> downloading
      -> download-started
      -> review-stale
      -> rate-limited
      -> authorization-unavailable
      -> generation-failed
      -> network-error

review-stale -> preparing-review
```

### State rules

- Dirty saved-state comparison runs before opening/requesting and blocks both review/download.
- Opening shows no stale client summary while review loads.
- Settings changes abort the prior request, clear its fingerprint, and ignore late responses by request identity.
- Download uses the accepted normalized request and fingerprint exactly.
- Failure preserves selections and accepted review unless it is stale.
- Closing aborts review and returns focus to the trigger.
- Review and download quotas are separate and honor `Retry-After` without auto-looping.
- `download-started` occurs after the blob response is accepted. Activation telemetry runs afterward best-effort and never changes that state.

## Review and Download Error Matrix

| Condition | Review/download response | Recovery |
| --- | --- | --- |
| Invalid request | `400 EXPORT_INVALID_REQUEST` | Preserve selections; focus invalid control. |
| Missing session | `401 EXPORT_UNAUTHORIZED` | Preserve context; offer session refresh/sign-in. |
| Inaccessible/missing resource | `404 EXPORT_NOT_FOUND` | Close to estimate boundary. |
| Saved inputs changed | download `409 EXPORT_REVIEW_STALE` | Refresh; never reuse fingerprint. |
| No exportable rows | `422 EXPORT_EMPTY` | Change scope/settings or add priced rows. |
| Currency mismatch across prepared tabs | `422 EXPORT_CURRENCY_MISMATCH` | Export compatible tabs separately or correct estimate currency. |
| Source/cell/evidence-derived cap | `413 EXPORT_LIMIT_EXCEEDED` with one exact `limit` record | Show the triggering resource's observed/limit values and reduce scope/content. |
| Review/download quota | `429 EXPORT_RATE_LIMITED` | Count down `Retry-After`; preserve state. |
| Rate storage unavailable | `503 EXPORT_RATE_LIMIT_UNAVAILABLE` | Manual retry; internal cause logged only. |
| Internal membership lookup failed | `503 EXPORT_AUTHORIZATION_UNAVAILABLE` | Manual retry; do not downgrade silently. |
| Preparation failed | `500 EXPORT_PREPARATION_FAILED` | Retry without losing selections. |
| Workbook generation failed | download `500 EXPORT_GENERATION_FAILED` | Retry without losing selections. |
| Superseded client abort | no error UI | Ignore. |
| Genuine network failure | client state | Offer retry. |

Every JSON error is no-store and nosniff.

## Accessibility Contract

- Existing authenticated dialog primitive with accessible name/description, Escape, focus trap, and focus return.
- Programmatic labels/descriptions for every setting; native radio/checkbox semantics.
- Restrained `aria-live` for loading/terminal changes.
- Error summary receives focus after a user-triggered failure, not every background refresh.
- Visible focus and practical 44px targets; color is never the only status signal.
- Semantic lists and financial definition list/table.
- Operable at 200% zoom and 320 CSS pixels without horizontal scrolling.
- Reduced motion disables nonessential transitions.

## Responsive Contract

- At narrow widths, use a near-full-height single-column sheet with bounded header/footer and scrollable body.
- Labels, filenames, sheet names, and financial values wrap without horizontal overflow.
- At wider widths, use a centered readable maximum width and at most two columns where both remain legible.
- Avoid nested scroll traps and fixed three-column density.

## Acceptance Criteria

| ID | Acceptance criterion | Decisive evidence |
| --- | --- | --- |
| `AC-001` | Ordinary rate events work on base schema; support dedupe remains; exceeded/unavailable route states are typed. | Split-SQL and route assertions. |
| `AC-002` | S1-S19 yield exact rows, issues, traceability, inclusion, and totals, including absent-vs-invalid scope and link/lifecycle rules. | Table-driven model fixtures. |
| `AC-003` | Identical saved inputs resolve identical audience/request/settings/sheets/rows/names/issues/capacity/totals; drift returns `409`. | Preparation and route parity. |
| `AC-004` | Unauthorized users receive no export data; client review/bytes contain no internal strings; lookup failure is not downgrade. | Auth matrix and archive inspection. |
| `AC-005` | Generated bytes are valid OOXML and preserve builder-used style/layout features without repair. | Raw XML, parser, conditional consumer proof. |
| `AC-006` | Cached values equal server totals; every live edit recalculates canonical row/workbook components with exact ROUND stages. | Formula XML and mutation fixtures. |
| `AC-007` | UI uses only server review truth, current settings, exact sheets, and actionable typed recovery without selection loss. | Hook/component state evidence. |
| `AC-008` | Keyboard/screen-reader semantics and narrow/zoom layout remain coherent without clipping/overflow. | Static/component and conditional viewport evidence. |
| `AC-009` | Current source caps are retained or lowered from Worker-compatible measurement; near-cap time/memory meets the defined envelope; over-cap rejects before ZIP. | Benchmark profile and route cap evidence. |

## Proposed Tests

All are `TEST_PROPOSAL` and remain uncreated/unmodified/unrun until `AUTH-001` opens.

### `TEST-001` Rate-limit persistence

```bash
bun run test:dom -- tests/vitest/durable-public-rate-limit-contract.test.ts tests/vitest/client-portal-public-rate-limit.test.ts
```

Prove ordinary base-schema insert omits `dedupe_hash`; dedupe branch preserves `INSERT OR IGNORE`; download/review scopes are independent; hashed-key behavior remains; injected storage failure reaches the typed route mapping in `TEST-004`.

### `TEST-002` Estimate model truth

```bash
bun run test:dom -- tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-tab-grouping.test.ts tests/vitest/estimate-unification-oracle.test.ts
```

Cover S1-S19 model subsets: missing scope included, invalid non-empty excluded/issued, effective linked/lifecycle values, current consolidation/provenance, redaction, canonical ROUND/minor-unit totals, mixed-currency blocker, current defaults, and deterministic ordering.

### `TEST-003` Workbook and OOXML

```bash
bun run test:dom -- tests/vitest/proposal-workbook.test.ts tests/vitest/calculation-output-parity.test.ts tests/vitest/proposal-worksheet-name.test.ts
```

Prove the current eight columns; positive `INCLUDED` scope gate; exact live/static formulas and cached values including fractional misc independent rounding; sheet/project ROUND parity; minor-unit multi-tab totals; effective style precedence and valid font/fill/border/alignment/numFmt IDs; merges/panes/print setup/XML escaping; client redaction; unique valid sheet names.

### `TEST-004` Preparation and routes

```bash
bun run test:dom -- tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/hosted-export-route-smoke-script.test.ts tests/vitest/project-location-privacy-source.test.ts
```

Prove review/download use the same preparation, stable fingerprint excludes timestamps, canonical query defaults/serialization, repeated/unknown/legacy-hidden key rejection, `409` drift, every status/header/code mapping, exact safe `413 limit` payloads, `422` empty/currency mismatch before bytes, client/internal/downgrade/lookup-unavailable behavior, no internal bytes, Node/dynamic/maxDuration exports, endpoint-safe telemetry, and hosted-script source compatibility without contacting a host.

### `TEST-005` Export dialog and consumers

```bash
bun run test:dom -- tests/vitest/xlsx-export-dialog.test.tsx tests/vitest/estimate-header-actions.test.tsx tests/vitest/estimate-header-actions-store.test.ts tests/vitest/estimate-sheet-extracted-models.test.ts tests/vitest/estimate-sheet-center-atomic-contracts.test.ts tests/vitest/proposal-export-activation-route.test.ts
```

Prove exact copy, dirty gate, current-only controls, debounce/abort/late-response handling, all-tabs server truth, stale/429/503 recovery, selection preservation, focus/labels/announcements, no fixed desktop-only layout contract, and best-effort activation after accepted blob.

### `TEST-006` Runtime capacity

```bash
bun run test:dom -- tests/vitest/proposal-workbook-benchmark.test.ts
```

The in-process test records exact fixture/caps, warm-up, at least five measured iterations, median/p95/worst elapsed time, output bytes, RSS/heap deltas, rendered counts/text, and Source Breakdown impact. It is regression evidence, not sufficient Worker proof by itself.

When `AUTH-001` also authorizes build/runtime gates, execute:

```bash
bun run cf:build
bun run scripts/benchmark-proposal-export-worker.ts --concurrency 2 --iterations 5
```

The new harness owns startup/teardown of local `wrangler dev` against `tests/fixtures/proposal-export-worker/wrangler.jsonc`; the fixture Worker imports the real model/workbook/serializer and exposes deterministic row-dominant, text-dominant, 50-tab, and Source-Breakdown cases without app auth or D1. The harness waits for readiness, issues each case twice concurrently, captures elapsed/output/counts, samples inspector `Runtime.getHeapUsage` (`usedSize + embedderHeapUsedSize + backingStorageSize`) throughout, and records workerd RSS only as secondary context. Pass when all functional outputs agree, p95 is below 45 seconds, and `1.2 × observed concurrent peak isolate bytes < 128 MiB`. On failure, the owning unit lowers or adds the measured binding cap and reruns. The separate `cf:build` proves the actual OpenNext bundle still compiles with the route; it does not substitute for isolated runtime measurement.

## Static Verification

Static checks do not open `AUTH-001`:

```bash
bun run type-check
bun run lint -- <changed production paths>
git diff --check -- <changed paths>
```

Use the narrowest valid lint path list. Inspect route exports, no-store/nosniff headers, dynamic serializer import, dead preview imports, and exact ownership diff. A build is not a static substitute and remains gated.

## Stale Test Repair Order

1. Remove labor-column assertions and map current eight-column coordinates.
2. Reconfirm baseline values/formulas/summary/sheet names against source.
3. Replace at least one workbook mock with real bytes.
4. Add scope/rounding/style XML assertions.
5. Add shared preparation/fingerprint/auth cases.
6. Add UI race/state/semantics cases.
7. Add capacity measurement only after functional fixtures are stable.

Test writers remain the owning units; `UNIT-006` only runs/reconciles authorized evidence.

## Manual Evidence Boundary

If separately authorized, keyboard-test the full state path at 320px/representative phone/tablet/desktop/200% zoom, and open representative client/internal workbooks in current Excel plus LibreOffice or Numbers. Record repair prompts, recalculation, redaction, and focus behavior. Browser automation/screenshots are not default and never replace data/workbook correctness.

## Completion Evidence Format

For each criterion record the claim, command/inspection, exact fixture/path, result/counts, source revision, local/manual/hosted/boundary scope, and remaining risk or `none`. No criterion passes because a mock downloaded, an adjacent test passed, or one parser accepted the ZIP.
