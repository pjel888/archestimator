# 15 - Input, Import, Export, And File Handling

## Purpose

Quick Add (Phase 3 per `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`) and
future catalog import/export must be designed around safe data entry. Even if
bulk import/export is deferred, the MVP should avoid choices that make future
file workflows unsafe.

All names, columns, enums, helpers, and test commands here are authoritative in
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (CANON); this doc binds to those
rather than restating the full inventory. User-facing strings are owned by
`22-COPY-DECK-AND-MICROCOPY.md` "Input / File Validation Messages" — every error
string below is the verbatim copy-deck entry; do not invent new phrasing.

## Field Validation

All four required Quick Add fields and every optional field map to existing
`public.cost_library_items` columns (CANON Quick Add Contract) — Quick Add needs
**no schema change**. Validation is enforced in `createCostLibraryComponent` /
`updateCostLibraryComponent` (`src/lib/component-library/actions.ts`); the Add
and Edit source fields must be normalized so both write the same columns.

| Field | Column | Rule | Bound (numeric) |
|-------|--------|------|-----------------|
| name | `name` (text) | required; trim; length-limited | <= 120 chars |
| category | `category` (text) | required; **plain text, not an enum** — accept free text or pick-from-existing; do NOT assume a controlled vocabulary | <= 120 chars |
| unit | `unit` (text) | required; trim; normalize casing where possible (e.g. `m2`, `each`, `hr`) | <= 32 chars |
| unit_cost | `unit_cost` (numeric) | required; numeric; non-negative (>= 0) unless explicit credit/allowance is designed later; round to 2 decimal places (currency precision) | >= 0, scale 2 |
| misc_cost | `misc_cost` (numeric) | optional; same non-negative + 2-decimal rule | >= 0, scale 2 |
| supplier / brand | `supplier` / `brand` (text; `supplier_id`/`brand_id` FK) | optional; trim; length-limited | <= 120 chars |
| pricing_date | `pricing_date` (date / null) | optional; valid date; not future-dated (must be <= today; reject any date after the request day) | server-day bound |
| pricing_source | `pricing_source` (text / null) | optional; this **is** the "source URL" — free-text column, no DB constraint; URL validity is checked **app-side** over free text | <= 2048 chars |
| confidence | `confidence` (text / null) | optional; **free-text string, NOT an enum** today — a controlled vocabulary (enum/CHECK) is a DEFERRED migration; validate length only, store verbatim | <= 120 chars |

Notes:

- "source confidence" is **free text**, not a controlled enum. The UI derives a
  badge/label over the free text (see `22` "Confidence" table); validation here
  only trims and length-limits the raw string. A controlled vocabulary is a
  future migration, out of scope for this pack.
- "category" is a **plain text column**, not a controlled fallback enum. Treat it
  as required free-text taxonomy (CANON glossary: distinct from the optional
  `library_folder_id` "folder" axis — never conflate the two).
- `pricing_source` is the canonical "source URL" home: a free-text column. URL
  scheme/shape validation ("must be a valid `https` URL") is **app-side only**,
  not DB-enforced — Postgres stores any string. Reject non-`http(s)` schemes and
  over-length URLs in the action before write.

Text fields (all of `name`, `category`, `unit`, `supplier`, `brand`,
`pricing_source`, `confidence`):

- trim leading/trailing whitespace
- reject or neutralize control characters (strip C0/C1 control chars; keep
  printable Unicode)
- preserve normal punctuation needed for construction names (e.g. `1/2"`, `Ø`,
  `×`, `m²`)
- avoid rendering raw HTML — render as text, never `dangerouslySetInnerHTML`

## CSV/Spreadsheet Formula Safety

The live export surface for this app is the **proposal/publication workbook**
exporter at `src/lib/proposal-export/create-proposal-workbook.ts`
(`createProposalWorkbook` / `createProposalWorkbookBuffer`, ExcelJS). It already
implements a formula-injection defense — reuse it; do not reinvent it.

Existing guard (F-18, P1-T7) at `create-proposal-workbook.ts:45-50`: every data
string column carries the text number-format `TEXT_FORMAT = "@"`, so a cell whose
text begins with `=`, `+`, `-`, or `@` (CSV/formula-injection vectors) is written
and read as **literal text, never a formula**, and shown verbatim (no leading
char stripped, no quote-prefix corruption). Settings carry `includeFormulas`
(`types.ts:48`); `includeFormulas=false` writes computed values instead of live
formulas (F-12). Any Library-catalog export added later (e.g. a component-list
export) MUST route through this same `TEXT_FORMAT` text-cell path rather than a
new raw-CSV writer.

Rules for any new export/import path:

- write exported string cells with the existing `TEXT_FORMAT = "@"` defense (or
  a raw-CSV equivalent that prefixes/escapes cells beginning with `=`, `+`, `-`,
  `@`, tab, or carriage return) — match the verbatim, non-corrupting behavior of
  `create-proposal-workbook.ts`, not a value-stripping one
- validate imported text cells before saving (trim, strip control chars,
  length-limit, app-side URL check for `pricing_source`)
- never execute formulas from import files; treat every imported cell as inert
  text

## Import Workflow Contract

Bulk import is deferred, but future-safe design requires:

- preview before commit
- column mapping
- validation summary
- duplicate detection
- per-row error reporting
- rollback or partial-commit reporting
- private-field classification before import
- no mutation until user confirms preview

Imported rows should not become trusted/current automatically unless the import
source is verified and the user confirms source confidence. Concretely: imported
rows default to `lifecycle_state = draft` (CANON `component_lifecycle_state`:
`draft | in_production | available | discontinued | archived`), with empty
`confidence` and a flagged-stale `pricing_date` (or null) — never auto-promoted
to `available`. Trust/freshness is derived per the `22` "Trust Badge Labels"
tables; importing must not bypass that derivation.

## Export Workflow Contract

Future export must support:

- protected workspace export for authorized editors (gate on
  `is_workspace_editor` / `is_workspace_member` RPCs, matching the action layer)
- public/client-safe export with private fields redacted
- clear indication of included/excluded fields
- rate/size limits
- audit/log entry for large exports when practical

The public/client-safe surface today is **not** a live Library query — it is the
**frozen snapshot** at `src/app/share/[token]` +
`src/app/api/share/[token]/route.ts`, rendered from
`project_publications.snapshot_json` (versioned by `snapshot_version`).
Redaction is therefore a property of **what the snapshot builder PUTS INTO**
`snapshot_json` — the builder is `buildSnapshotForProject`
(`src/lib/publication/actions.ts:376`), which uses an explicit `estimate_row_items`
column allowlist and **never queries `cost_library_items` /
`cost_library_item_price_history`**, plus a public-read sanitizer
`sanitizeProjectPublicationSnapshotForPublicRead` (`src/lib/publication/snapshot.ts:112`)
that re-derives each public row from a fixed allowlist (dropping `unitCost`/`miscCost`)
— not of a live endpoint, and NOT of `activity-helpers.ts` (which only reads labels
back OUT of an already-built snapshot, never composes the field selection). See
`14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`. Any client-safe catalog/proposal export
must apply the same field-selection discipline at build time
(`src/lib/proposal-export/build-proposal-export-model.ts:43` already runs
`applyAudiencePolicy`).

Private by default (bound to real `cost_library_items` columns / related tables):

- raw source URLs (`pricing_source` column)
- internal supplier notes (`supplier` / `supplier_id`)
- confidence notes (`confidence` free-text column)
- price history (`cost_library_item_price_history` table)
- provider evidence attachments (storage objects under `thumbnail_path` /
  `image_bucket` / `storage_bucket`)
- internal usage / link history (`source_library_item_id`, `source_snapshot`,
  `link_state` on `estimate_row_items` / `estimate_template_row_items`)

## File Upload Contract

Component images already have a storage surface: the `thumbnail_path` column on
`cost_library_items`, plus `image_bucket` / `storage_bucket` on price options
(read in `src/lib/repositories/component-library-repository.ts`; written via the
`thumbnailPath` field on `createCostLibraryComponent` /
`updateCostLibraryComponent` in `src/lib/component-library/actions.ts`). Quick
Add does NOT introduce file upload (its required fields are text/numeric only) —
this contract governs any image/attachment work that touches that existing
surface, and is not blocking for Phase 3.

If images, attachments, or import files are touched:

- validate file type by content (magic bytes) and extension when possible
- enforce size limits (define the limit alongside the copy `22` "File too large"
  string; surface the limit value in the message)
- scan or reject unsupported formats
- store files under workspace-scoped storage paths keyed by `workspace_id`
  (mirror the existing `image_bucket` / `storage_bucket` + `thumbnail_path`
  layout; do not write to an unscoped global bucket)
- verify object ownership against `workspace_id` before read/delete (defense in
  depth over Storage RLS, matching the `is_workspace_editor` action guards)
- strip or ignore unsafe metadata where practical (e.g. EXIF on uploaded images)
- show per-file error states
- do not leave orphaned storage objects after a failed `cost_library_items`
  mutation when avoidable (write the row and the object atomically, or clean up
  the object if the row write fails)

## Error Copy

The single source of truth for these strings is `22-COPY-DECK-AND-MICROCOPY.md`
"Input / File Validation Messages" — copy verbatim, do not re-author here. Each
rule above maps to a copy-deck entry:

| Rule | Copy-deck string (`22`) |
|------|-------------------------|
| name missing | Enter a component name. |
| name too long | Use 120 characters or fewer for the name. |
| category missing | Choose or enter a category. |
| unit missing | Enter a unit (e.g. each, m2, hr). |
| unit_cost missing | Enter a unit cost. |
| unit_cost not numeric | Enter a number for unit cost. |
| unit_cost negative | Enter a unit cost of zero or more. |
| supplier/brand too long | Use 120 characters or fewer. |
| pricing_date invalid | Enter a valid date. |
| pricing_date far future | Enter a pricing date that is not in the future. |
| source URL invalid | Enter a valid https URL. |
| source URL too long | Shorten this URL. |
| confidence note too long | Use 120 characters or fewer for the confidence note. |
| file too large (future) | This file is too large. Use a file under {limit}. |
| unsupported file type (future) | This file type is not supported. |
| import row missing unit (future) | Row {n} is missing a unit. |
| export redaction notice (future) | This export excludes private source details. |

Field-and-fix phrasing: name the field, state the fix. Avoid generic
invalid/error copy when the field and fix are known. The WCAG rule from `22`
applies — validation/consequence text must use the `secondary` token
(`#5D5D5D`), never `tertiary` (`#7F7F7F`, fails AA).

## Tests To Add When Implemented

Run jsdom suites with `bun run test:dom` (all) or `vitest run tests/vitest/<file>`
(one) — NOT `bun test`, which is bound to `tests/unit` only and silently skips
the vitest suites (CANON Test Commands). Full gate: `bun run validate`. There is
no axe/jest-axe harness; assertions are plain Testing Library checks unless
`jest-axe` is added as an explicit prerequisite.

- invalid `pricing_source` URL rejected app-side (non-`http(s)` scheme,
  over-length) in `createCostLibraryComponent` / `updateCostLibraryComponent`
- unit_cost negative / non-numeric rejected; 2-decimal rounding applied
- name / supplier / brand / confidence over-length rejected at the bounds above
- `pricing_date` in the future rejected
- unsafe formula-like text (`=`, `+`, `-`, `@`) round-trips as literal text via
  `create-proposal-workbook.ts` `TEXT_FORMAT` (assert the cell is text, not a
  formula)
- oversized file (future upload)
- unsupported file type (future upload)
- cross-workspace storage object ID denied before read/delete
- import preview with valid and invalid rows (future)
- public/client-safe path: the snapshot builder `buildSnapshotForProject`
  (`src/lib/publication/actions.ts:376`) + public-read sanitizer
  `sanitizeProjectPublicationSnapshotForPublicRead` (`src/lib/publication/snapshot.ts:112`),
  and the proposal exporter's `applyAudiencePolicy`
  (`src/lib/proposal-export/build-proposal-export-model.ts:43`), exclude the
  private fields listed above (it is the snapshot/export field-selection that is
  tested, NOT a live library endpoint and NOT `activity-helpers.ts` — per `14`;
  the snapshot redaction proof is `ADV-PUBLIC-REDACTION`,
  `vitest run tests/vitest/share-snapshot-redaction.test.tsx`, in
  `24-EXECUTION-EVIDENCE-LEDGER.md`)
