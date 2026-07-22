# Current-State Audit and Estimate Scenario Matrix

## Executive Finding

The observed XLSX failure occurs before workbook generation: ordinary proposal-export rate-limit events reference the later support-only `dedupe_hash` column outside the route catch. Independent source audit also found four correctness risks that the previous plan did not resolve safely: absent scope is contractually included, several proposed export settings do not exist in the current product, workbook formulas diverge from canonical rounding/scope behavior, and guessed rendered-output caps could reject valid current exports without evidence.

The repair order is therefore: split rate-limit persistence, lock current estimate/request semantics, complete workbook/OOXML correctness, share preparation across review/download, replace the misleading preview, then reconcile evidence and measured runtime capacity.

## Evidence Register

### Observed rate-limit failure

- `logs/dev.ndjson:63-64` records `D1_ERROR: table security_rate_limit_events has no column named dedupe_hash` for the XLSX route.
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:394` awaits rate limiting before the catch beginning at line 424.
- `src/lib/security/durable-rate-limit-d1.ts:50-64` always lists `dedupe_hash`.
- `migrations/0006_ai_audit_rate_limits.sql` creates the base table without it; `migrations/0100_user_support_system.sql` adds it for support dedupe.
- The current limiter hashes its key parts before persistence, so the repair must preserve that privacy property.

### Scope and row semantics

- `src/lib/estimates/types.ts:154-156` defines an absent scope as included.
- `src/lib/proposal-export/build-proposal-export-model.ts:85-90` currently maps missing and unknown scope to included; normalization must separate those cases.
- `EstimateRowItem` link/lifecycle fields describe provenance and source freshness. Loaders already emit the effective persisted estimate-row values. Link/lifecycle state is not an independent totals filter.
- `linked-clean`, `linked-overridden`, `detached`, `source-changed`, and `unlinked` rows export their effective persisted values. `source-changed` may warn. Archived/discontinued source lifecycle does not remove an intentionally attached estimate row; deleted/archived estimate rows/tabs are filtered by loaders.

### Current request and server settings

- The current UI wire exposes scope/tab, `audience`, `includeFormulas`, contingency rate/mode, and VAT rate/mode.
- Saved sheet adjustment is loaded server-side from estimate settings.
- Source Breakdown and supplier/source remarks follow requested internal detail and effective server audience.
- Zero-row exclusion and excluded-row inclusion are current product defaults, not user controls.
- Dead `summary-only` and consolidation-mode types are not an instruction to add UI behavior.

### Financial and formula gaps

- `src/lib/proposal-export/create-proposal-workbook.ts:335-346` combines live quantity/unit-cost cells with literal adjustment/misc suffixes; percentage adjustments therefore become stale after edits.
- The same scope formula enumerates exclusions but omits `BY OWNER` and `ALTERNATE`; positive `INCLUDED` gating is safer and matches current semantics.
- Project charge and cost/SQM formulas around lines 442-486 do not reproduce the `ROUND(..., 2)` stages used by `src/lib/proposal-export/settings.ts:39-50`.
- Multi-tab totals around lines 624-631 reduce floating values instead of currency minor units and do not explicitly reject mixed currency.

### Workbook presentation loss

- `create-proposal-workbook.ts` assigns fonts, fills, borders, alignment, number formats, merges, dimensions, panes, and print settings.
- `xlsx-workbook.ts:258-321` registers only number formats and emits custom formats with default font/fill/border; alignment is discarded.
- A correct serializer needs deterministic effective style precedence and deduplicated font/fill/border/alignment/numFmt records with valid IDs and XML escaping.

### Review, authorization, and activation

- The client builds a mounted-data summary, then downloads from a route that rereads saved state. All-tabs summary and requested internal detail can therefore differ from server output.
- Internal authorization is resolved server-side. Confirmed non-members may be downgraded; a failed membership lookup cannot be treated as a confirmed non-member.
- The existing client posts `/api/activation/proposal-export-completed` only after receiving a successful blob. That telemetry is best-effort and must not invalidate the download.

### Runtime and framework evidence

- `wrangler.jsonc` configures Worker `archestimator-proof`, compatibility date `2026-06-29`, and `nodejs_compat`; no lower CPU limit is configured.
- The route currently exports `runtime = "nodejs"`, `dynamic = "force-dynamic"`, and `maxDuration = 60`. Preserve them. OpenNext Cloudflare supports Route Handlers through the Node runtime and does not support switching this route to Next's edge runtime.
- Cloudflare documents a 128 MB isolate memory limit shared across concurrent requests and no enforced response-body limit. It does not publish safe XLSX row/cell/text/output thresholds.
- Streams can avoid response buffering only when generation is incremental; the current in-memory XLSX build still pays its generation peak.
- Excel cells have an exact 32,767-character limit.
- Official references retrieved 2026-07-22:
  - https://developers.cloudflare.com/workers/platform/limits/
  - https://developers.cloudflare.com/workers/runtime-apis/streams/
  - https://developers.cloudflare.com/workers/runtime-apis/nodejs/
  - https://opennext.js.org/cloudflare/
  - https://opennext.js.org/cloudflare/get-started
  - https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/053027c9-6036-4155-a16a-ba3a10e4ecc0

### Coverage and consumer drift

- Model/workbook/route tests retain parts of the removed labor-era ten-column layout; current output is eight-column material-only.
- Route tests mock workbook generation and do not prove redaction in generated bytes.
- Current consumers omitted by the prior plan include estimate header/store/extracted/atomic contract tests, calculation parity, estimate unification, auth-sensitive boundaries, hosted-smoke-script contract, and route privacy source checks.
- `scripts/verify-hosted-export-route.ts` is a compatibility consumer but executing it against a host is an external boundary.

## Current End-to-End Flow

1. Header action opens `ProposalExportPreviewDialog`.
2. `use-estimate-proposal-preview.ts` builds a client model and download URL.
3. The dialog renders client-derived counts/totals/sheet claims.
4. Client fetches `.xlsx`, converts success to a blob, then posts activation telemetry best-effort.
5. Route authenticates, rate limits, parses current settings, loads tabs with legacy fallback, authorizes audience, builds models/workbook, and returns bytes.
6. Failures before the existing catch escape typed JSON mapping.

The target preserves the route, source caps, Node runtime, lazy workbook import, and activation lifecycle while replacing duplicated/client-derived semantics with one server preparation service.

## Estimate Scenario Matrix

| ID | Estimate shape | Required truth and evidence |
| --- | --- | --- |
| `S1` | Legacy estimate without tabs | Synthetic Main exports once; review/download agree; no migration detail leaks. |
| `S2` | One active tab | Active/all normalize deterministically; filename and sheet name are stable. |
| `S3` | Multiple active tabs | Active exports one; all exports every active tab in order; workbook totals reconcile. |
| `S4` | Archived/deleted tab mixed with active | Filtered tab never appears or contributes. |
| `S5` | Empty estimate/tab | `422 EXPORT_EMPTY`; no workbook bytes. |
| `S6` | Groups/areas/deep paths | Path, source node, sort, label, grouping, and traceability are deterministic. |
| `S7` | Linked/overridden/detached/source-changed/unlinked | Effective persisted values export; state does not remove totals; source-changed may warn safely. |
| `S8` | Source lifecycle/variants | Effective attached row exports even if source is archived/discontinued; deleted estimate rows do not reappear. |
| `S9` | Quantity plus contingency/legacy percentage | Normalization matches canonical row-cost calculation and formula provenance. |
| `S10` | Zero quantity/cost | Current default excludes zero rows without changing nonzero totals; no new UI setting. |
| `S11` | Every recognized scope | Only `included` contributes; every recognized exclusion remains visible but contributes zero. |
| `S12` | Missing versus invalid scope | Missing/blank is included; unknown non-empty is excluded with row-linked issue. |
| `S13` | Current consolidation | Commercial key plus formula provenance preserves totals/source references/order; incompatible provenance splits or becomes static. |
| `S14` | Missing taxonomy labels | Stable non-empty fallback and deterministic order. |
| `S15` | Row misc/adjustment plus saved sheet adjustment | Applies once; live/static promise is truthful. |
| `S16` | Contingency/VAT, including included modes | Canonical order and ROUND stages match cached values/formulas. |
| `S17` | Client/internal request | Accepted, downgraded, and authorization-unavailable paths are distinct; client content is redacted. |
| `S18` | Source Breakdown with consolidated rows | References reconcile; sheet counts in capacity; effective audience controls presence. |
| `S19` | At/beyond source/runtime boundaries | Current 1,200-node/3,000-row/50-tab caps and 32,767-char cell limit enforce before ZIP; current caps are retained or lowered only from measured Worker evidence. |

## Prepared Workbook Manifest

| Shape | Exact ordered sheet kinds |
| --- | --- |
| Single/legacy Main | `bid-form`, `summary`, `commercial-terms`, optional `source-breakdown` |
| Multiple tabs | `summary`, one `bid-form` per active tab in server order, `commercial-terms`, optional `source-breakdown` |

Review and workbook consume the same prepared manifest. UI never reconstructs sheet order.

## Formula and Financial Invariants

1. Normalize each source row once from effective persisted values.
2. Missing scope is included; invalid non-empty scope is excluded and reported.
3. Included line total uses canonical minor-unit/ROUND semantics; excluded rows contribute zero at every later layer.
4. Positive `INCLUDED` formula gating prevents future exclusions from becoming billable.
5. Consolidation preserves the sum and source traceability; live aggregates require compatible provenance.
6. Material, percentage adjustment, and misc are independently rounded to minor units before summing; saved sheet adjustment, project contingency, and VAT each apply once in canonical order with two-decimal rounding at the same stages as the server.
7. Multi-tab totals aggregate compatible currency in minor units; currency mismatch is a typed blocker.
8. Review totals, model totals, cached values, and formulas match at currency precision.
9. A row is fully live or fully static; no live base plus frozen percentage.
10. Client/internal detail changes presentation only, never financial truth.

## Workbook Structure Invariants

- Names are unique/deterministic and at most 31 characters.
- Relationships/content types reference every emitted part exactly once.
- Effective style precedence is `cell > row > column > default` per property; cells reference valid deduplicated style records.
- Merges, panes, widths/heights, print area/orientation/margins/repeating headers serialize when configured.
- Formula cells include matching cached values.
- Client archives contain no internal source/supplier strings in XML, properties, filenames, or relationships.
- ZIP parses without repair, duplicate parts, or silent cell truncation.

## Root-Cause and Migration Boundary

No new migration is required. Ordinary SQL lists `id, scope, key_hash, metadata_json, occurred_at, expires_at`; deduplicated SQL additionally lists `dedupe_hash` and preserves `INSERT OR IGNORE`. Proposal export uses ordinary inserts; support intake retains dedupe. Missing base storage fails closed and the route converts it to a typed response. Remote migration work is outside this local plan.

## History Note

The local GitNexus index was stale relative to current source and was not used as authority. Current source, logs, migrations, git history, local framework docs, and official provider documentation form the evidence base. History confirms the custom serializer replaced runtime ExcelJS for Worker compatibility, so this plan completes it rather than reverting reflexively.
