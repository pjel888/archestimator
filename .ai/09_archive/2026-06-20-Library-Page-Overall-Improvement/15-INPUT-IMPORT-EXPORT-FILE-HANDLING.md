# 15 - Input, Import, Export, And File Handling

## Purpose

This doc has TWO clearly separated parts:

1. **CURRENT (executable) — Field Validation for Quick Add (Phase 3):** the four
   required fields + optional fields, validation rules, error copy, and the
   executable test rows. This is the only work in this doc with a current
   execution target.
2. **PHASE-LATER (no current execution target) — Import / Export / File Upload:**
   future-safe design contracts only. There is **no route, component, or test
   file** for bulk import, catalog export, or file upload today. These are
   forward contracts so a future implementer knows the safety rules; they are
   marked `PHASE-LATER` at each section and grouped at the end.

> **Phase-later scope note:** Quick Add (Phase 3) is the only executable work in
> this doc. Import, Export, and File Upload are `PHASE-LATER — no current
> execution target`. Archive vs Delete (C-013) and Quick Add's no-schema-change
> contract (C-011) are stated in the executable part below.

All names, columns, enums, helpers, and test commands here are authoritative in
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (CANON); this doc binds to those
rather than restating the full inventory. User-facing strings are owned by
`22-COPY-DECK-AND-MICROCOPY.md` "Input / File Validation Messages" — every error
string below is the verbatim copy-deck entry; do not invent new phrasing.

## Current — Field Validation (Phase 3, executable)

All four required Quick Add fields and every optional field map to existing
`public.cost_library_items` columns (CANON Quick Add Contract) — Quick Add needs
**no schema change** (C-011: reuses existing columns, app-layer validation only).
Validation is enforced in `createCostLibraryComponent` /
`updateCostLibraryComponent` (`src/lib/component-library/actions.ts`); the Add
and Edit source fields must be normalized so both write the same columns.

| Field | Column | Rule | Bound (numeric) | phase | flag | rollback | evidence (doc 24) |
|-------|--------|------|-----------------|-------|------|----------|-------------------|
| name | `name` (text) | required; trim; length-limited | <= 120 chars | 3 | `library_quick_add` | redeploy flag=false → full `AddComponentModal` advanced path (C-010) | EV-FRONTEND-08 |
| category | `category` (text) | required; **plain text, not an enum** — accept free text or pick-from-existing; do NOT assume a controlled vocabulary | <= 120 chars | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 |
| unit | `unit` (text) | required; trim; normalize casing where possible (e.g. `m2`, `each`, `hr`) | <= 32 chars | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 |
| unit_cost | `unit_cost` (numeric) | required; numeric; non-negative (>= 0) unless explicit credit/allowance is designed later; round to 2 decimal places (currency precision) | >= 0, scale 2 | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 |
| misc_cost | `misc_cost` (numeric) | optional; same non-negative + 2-decimal rule | >= 0, scale 2 | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 |
| supplier / brand | `supplier` / `brand` (text; `supplier_id`/`brand_id` FK) | optional; trim; length-limited | <= 120 chars | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 |
| pricing_date | `pricing_date` (date / null) | optional; valid date; not future-dated (must be <= today; reject any date after the request day) | server-day bound | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 |
| pricing_source | `pricing_source` (text / null) | optional; this **is** the "source URL" — free-text column, no DB constraint; URL validity is checked **app-side** over free text | <= 2048 chars | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 |
| confidence | `confidence` (text / null) | optional; **free-text string, NOT an enum** today — a controlled vocabulary (enum/CHECK) is a DEFERRED migration; validate length only, store verbatim | <= 120 chars | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 |

> **C-013 (Archive vs Delete, cross-ref):** this doc governs Quick Add field
> entry; lifecycle transitions (archive vs delete) are owned by doc 14 + doc 22
> §7. "Archive" = soft-delete (recoverable via `changeCostLibraryComponentLifecycleState`
> out of `archived`); "Delete" = hard-delete (irreversible). Quick Add does not
> touch either; it writes a new `lifecycle_state` (default `draft` on import —
> see the Deferred Import section).
>
> **Gate-row footer for the validation table above (all 9 field rows share
> these 12 dimensions — they are the same Quick Add implementation task):**
> Owner: Frontend lead · Phase: 3 · Flag: `library_quick_add` · Rollback:
> redeploy flag=false → full `AddComponentModal` advanced path (C-010) ·
> Evidence: EV-FRONTEND-08 · Telemetry: `quick_add_field_invalid`
> (register in [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §Quick Add,
> Phase 3 — ID-only payload `field, rule, workspace_id`) · Copy: see
> [22](22-COPY-DECK-AND-MICROCOPY.md) §11 (every rule maps to a copy-deck
> entry in the table below) · A11y: see
> [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §form-validation (field-and-fix
> phrasing, `secondary` token never `tertiary` #7F7F7F per WCAG AA) · Perf:
> n/a (validation is synchronous, client-side, < 1ms per field) ·
> Browser-proof: jsdom (form-validation assertions are plain Testing Library;
> no axe harness exists today — C-014) · i18n: see
> [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) §form-validation (ICU
> MessageFormat for the count-based strings: "Use 120 characters or fewer") ·
> Binding: `src/components/workshop/component-library-manager/AddComponentModal.tsx`
> (Add path; the dirty-discard `window.confirm` at :963 is migrated Phase 0B
> per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)) +
> `src/components/workshop/component-library/NewComponentForm.tsx` (form
> fields) + server-side guard `createCostLibraryComponent` /
> `updateCostLibraryComponent` (`src/lib/component-library/actions.ts`,
> defense-in-depth over RLS).

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

## CSV/Spreadsheet Formula Safety (executable-adjacent — Phase 0A/1 test)

The live export surface for this app is the **proposal/publication workbook**
exporter at `src/lib/proposal-export/create-proposal-workbook.ts`
(`createProposalWorkbook` / `createProposalWorkbookBuffer`, ExcelJS). It already
implements a formula-injection defense — reuse it; do not reinvent it. This is
the one executable-adjacent surface in this doc: the defense already ships, so
the **test** is promotable to an executable Phase-0A/1 row (see Tests below).

Existing guard (F-18, P1-T7) at `create-proposal-workbook.ts:50` (the
`const TEXT_FORMAT = "@"` definition) applied to every data-string column at
`:60-88`: each column config carries `style: { numFmt: TEXT_FORMAT }`, so a cell
whose text begins with `=`, `+`, `-`, or `@` (CSV/formula-injection vectors) is
written and read as **literal text, never a formula**, and shown verbatim (no
leading char stripped, no quote-prefix corruption). Settings carry
`includeFormulas` (`types.ts:48`); `includeFormulas=false` writes computed
values instead of live formulas (F-12). Any Library-catalog export added later
(e.g. a component-list export) MUST route through this same `TEXT_FORMAT`
text-cell path rather than a new raw-CSV writer.

Rules for any new export/import path:

- write exported string cells with the existing `TEXT_FORMAT = "@"` defense (or
  a raw-CSV equivalent that prefixes/escapes cells beginning with `=`, `+`, `-`,
  `@`, tab, or carriage return) — match the verbatim, non-corrupting behavior of
  `create-proposal-workbook.ts`, not a value-stripping one
- validate imported text cells before saving (trim, strip control chars,
  length-limit, app-side URL check for `pricing_source`)
- never execute formulas from import files; treat every imported cell as inert
  text

## Deferred (Phase-later) — Import, Export, File Upload

> The three contracts below are **PHASE-LATER — no current execution target.**
> There is no route, component, server action, or test file for bulk import,
> catalog export, or file upload today. Quick Add (Phase 3, above) + the
> proposal-export formula-safety test (Phase 0A/1, below) are the only
> executable work in this doc. The contracts exist so a future implementer knows
> the safety rules; they delegate the 12-dimension rows (Owner/Rollback/etc.)
> per `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` §3 (C-018/C-019/C-020).

### Import Workflow Contract (PHASE-LATER)

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
to `available`. Trust/freshness is derived per the `22` "Trust chip Labels"
tables (chip, NOT badge — C-002); importing must not bypass that derivation.

**Import preview / error / rollback matrix (Phase-later):**

| Step | Preview shown | Error handling | Rollback |
| --- | --- | --- | --- |
| Parse + map columns | mapped-column preview per row; unmapped columns flagged | invalid header / unmappable column -> block import with `import_row_missing_unit`-style copy (doc 22 §11) | no mutation yet (preview-only) |
| Validate rows | per-row valid/invalid preview; validation summary count | per-row error copy (doc 22 §11 `validation.import_row_missing_unit`); rejected rows excluded from commit | no mutation yet |
| Duplicate detection | duplicate rows flagged in preview | duplicates skipped or merged per user choice | no mutation yet |
| Commit | final commit preview; user confirms | partial failure -> `import_failed_partial_commit`; committed rows kept, failed rows reported | partial-commit reporting (no silent partial commit); full rollback only if no rows committed |

**Telemetry/audit events (Phase-later, cross-ref [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §6A):**
`import_failed_partial_commit` (Warn; `workspaceId`, `rowsAttempted`,
`rowsCommitted`), `upload_rejected_type` / `formula_injection_detected` (Warn;
doc 20 §6A — a formula detected in import), `bulk_export` (Warn; doc 20 §6A —
>50 templates exported in one session). Closed-beta sink = `console.warn`
(C-009); payloads are ID-only, no free-text user content.

### Export Workflow Contract (PHASE-LATER)

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
(`src/lib/publication/actions.ts:389`), which uses an explicit `estimate_row_items`
column allowlist and **never queries `cost_library_items` /
`cost_library_item_price_history`**, plus a public-read sanitizer
`sanitizeProjectPublicationSnapshotForPublicRead` (`src/lib/publication/snapshot.ts:301`)
that re-derives each public row from a fixed allowlist (emitting `rowTotal`
without emitting `unitCost`/`miscCost`/`contingencyPercentage` as own-properties)
— not of a live endpoint, and NOT of `activity-helpers.ts` (which only reads labels
back OUT of an already-built snapshot, never composes the field selection). See
`14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` (line bindings re-verified 2026-06-21).
Any client-safe catalog/proposal export must apply the same field-selection
discipline at build time
(`src/lib/proposal-export/build-proposal-export-model.ts:43` already runs
`applyAudiencePolicy`).

**Export telemetry/audit events (Phase-later, cross-ref [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §6A):**
`export_large_export_logged` (Info; `workspaceId`, `rowsExported` — fires when an
export crosses the large-export threshold), `bulk_export` (Warn; doc 20 §6A —
>50 templates exported in one session). Closed-beta sink = `console.warn` (C-009).
The redaction-notice copy for client-safe exports is
`validation.export_redaction_notice` ("This export excludes private source
details.", doc 22 §11).

Private by default (bound to real `cost_library_items` columns / related tables):

- raw source URLs (`pricing_source` column)
- internal supplier notes (`supplier` / `supplier_id`)
- confidence notes (`confidence` free-text column)
- price history (`cost_library_item_price_history` table)
- provider evidence attachments (storage objects under `thumbnail_path` /
  `image_bucket` / `storage_bucket`)
- internal usage / link history (`source_library_item_id`, `source_snapshot`,
  `link_state` on `estimate_row_items` / `estimate_template_row_items`)

### File Upload Contract (PHASE-LATER)

Component images already have a storage surface: the `thumbnail_path` column on
`cost_library_items`, plus `image_bucket` / `storage_bucket` on price options
(read in `src/lib/repositories/component-library-repository.ts`; written via the
`thumbnailPath` field on `createCostLibraryComponent` /
`updateCostLibraryComponent` in `src/lib/component-library/actions.ts`). Quick
Add does NOT introduce file upload (its required fields are text/numeric only) —
this contract governs any image/attachment work that touches that existing
surface, and is not blocking for Phase 3. **There is no upload route, component,
or test today — this is PHASE-LATER.**

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

**Rollback / recovery contract (Phase-later) — addresses partial uploads and
aborted imports:**

| Failure mode | Recovery rule | Rationale |
| --- | --- | --- |
| Object written, then `cost_library_items` row insert fails | DELETE the storage object in the same handler; surface a single inline error to the user. **No orphan.** | storage orphans are unrecoverable through the UI and accumulate cost; atomicity must be enforced in the mutation handler, not by a later GC pass |
| Upload aborted mid-stream (user cancels / network drops) | the resumable-upload / multipart contract MUST support abort + immediate object cleanup; no partial object retained | a half-uploaded object is not usable and must not be addressable |
| Import preview shown, user cancels before commit | no mutation has occurred (preview-only); no rollback needed | the contract is "no mutation until user confirms preview" (Deferred Import section above) |
| Import partial-commit (some rows committed, some failed) | report the failed rows to the user with per-row error copy (doc 22 §11 `validation.import_row_missing_unit`); **do NOT silently roll back the committed rows** — partial-commit reporting, not silent full rollback | committed rows represent real user intent; rolling them back loses work. Full rollback ONLY if zero rows committed. |
| Import transaction boundary exceeded (DB error mid-batch) | wrap the commit batch in a single transaction; on DB error, the transaction rolls back atomically and the user sees `import_failed_partial_commit` telemetry + a single error message | DB transaction semantics — the DB enforces atomicity per transaction, the app reports the outcome |
| Server crash / disconnect during a long import | on reconnect, the import is NOT resumed automatically; the user re-previews. Any rows already committed are visible in the library; any uncommitted rows are gone (transaction rolled back by the DB) | "resumable import" is out of scope for beta; re-preview is the honest contract |
| Export failure mid-stream (large export) | no partial file is delivered; the user sees `export_large_export_logged` telemetry + an error; the partial buffer is discarded | a partial export file is misleading (looks complete); discard and re-try |

> **Phase-later status:** none of these recovery paths has a current execution
> target (no upload route, no import route, no catalog-export route exists
> today). The contract exists so a future implementer does not ship a partial
> upload/import/export that silently orphans objects or silently rolls back
> committed rows.

**Upload preview / error / rollback matrix (Phase-later):**

| Step | Preview shown | Error handling | Rollback |
| --- | --- | --- | --- |
| Select file | file name + size + thumbnail preview (image) | oversized -> `validation.file_too_large` ("This file is too large. Use a file under {limit}.", doc 22 §11); bad type -> `validation.file_unsupported` | rejected file never uploaded |
| Validate (magic bytes + extension + size) | validation result inline | unsupported type/size -> reject with copy; show per-file error state | no storage write |
| Upload (write to workspace-scoped path) | upload progress | upload failure -> inline error; `upload_rejected_type` telemetry | orphan cleanup: if the row write fails after the object write, delete the object (no orphans) |
| Attach to row | attached preview on the row | `cost_library_items` write failure -> row not created, object cleaned up | atomic row+object write, else rollback the object |

**Telemetry/audit events (Phase-later, cross-ref [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §6A):**
`upload_rejected_type` (Warn; `workspaceId`, `field` — a file rejected for
type/size), `formula_injection_detected` (Warn; doc 20 §6A — a formula detected
in an imported file). Closed-beta sink = `console.warn` (C-009).

**Design-system mapping (Phase-later, cross-ref [23](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md)):**

| Surface | DS primitive / pattern (real path) | Notes |
| --- | --- | --- |
| File picker | native `<input type="file">` wrapped in the shared button primitive at `src/components/ui/button.tsx`; `aria-haspopup`, visible focus ring | reuse `ui/button.tsx`; do not invent a custom dropzone primitive (Phase-later scope — no upload UI exists today) |
| Upload preview | image `thumbnail` using the existing `thumbnail_path` rendering; non-image -> file-icon + name + size | preview is decorative; the accessible name is the file name |
| Error summary | the shared error-summary pattern via `src/components/ui/alert.tsx` (`danger` variant); per-file error states; toasts via `src/components/ui/toast.tsx` for transient upload failures | copy from doc 22 §11 verbatim; `secondary`/`danger` tokens, never `tertiary` (#7F7F7F, fails AA per project memory + [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md)) |
| Validation summary (Quick Add, executable Phase 3) | inline-error per field using the existing inline pattern in `AddComponentModal.tsx`; field-and-fix phrasing per [22](22-COPY-DECK-AND-MICROCOPY.md) §11 | same `secondary`/`danger` AA rule; no axe harness today (C-014) |
| Progress affordance | a standard progress indicator; reduced-motion neutralizes any animation (doc 12 Reduced Motion) | state must be understandable without the animation |

## Current — Error Copy (Phase 3, executable)

The single source of truth for these strings is `22-COPY-DECK-AND-MICROCOPY.md`
"Input / File Validation Messages" — copy verbatim, do not re-author here. Each
Quick Add rule maps to a copy-deck entry (Phase 3):

| Rule | Copy-deck string (`22` §11) |
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

The Phase-later import/export/upload copy rows are owned by doc 22 §11 and are
NOT executable in this pack: `file too large` ("This file is too large. Use a
file under {limit}."), `unsupported file type` ("This file type is not
supported."), `import row missing unit` ("Row {n} is missing a unit."),
`export redaction notice` ("This export excludes private source details.").

Field-and-fix phrasing: name the field, state the fix. Avoid generic
invalid/error copy when the field and fix are known. The WCAG rule from `22`
applies — validation/consequence text must use the `secondary` token
(`#5D5D5D`), never `tertiary` (`#7F7F7F`, fails AA).

## Tests

Run jsdom suites with `bun run test:dom` (all) or `vitest run tests/vitest/<file>`
(one) — NOT `bun test`, which is bound to `tests/unit` only and silently skips
the vitest suites (CANON Test Commands; C-005). Full gate: `bun run validate`.
There is no axe/jest-axe harness today (C-014 — adding `jest-axe` is a Phase 0A
net-new prerequisite); assertions are plain Testing Library checks until then.

### Executable (Phase 0A/1/3) — gate rows

| Test | Command | Pass criterion | Owner | Phase | Evidence (doc 24) | Flag | Rollback | Telemetry | Browser-proof | Binding |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Quick Add field validation | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (+ a new validation suite) | invalid `pricing_source` URL rejected app-side (non-`http(s)` scheme, over-length); unit_cost negative/non-numeric rejected + 2-decimal rounding; name/supplier/brand/confidence over-length rejected at bounds; `pricing_date` future rejected | Frontend lead | 3 | EV-FRONTEND-08 | `library_quick_add` | redeploy flag=false | `quick_add_field_invalid` | jsdom | `AddComponentModal.tsx` + `NewComponentForm.tsx` + `actions.ts` |
| Proposal-export formula safety (executable-adjacent) | `vitest run tests/vitest/proposal-export-formula-safety.test.ts` | unsafe formula-like text (`=`, `+`, `-`, `@`) round-trips as LITERAL TEXT via `create-proposal-workbook.ts` `TEXT_FORMAT` (`:50`, applied to columns at `:60-88`) — the cell is text, not a formula (no leading char stripped, no quote-prefix corruption) | Export lane | 0A/1 | EV-FRONTEND-08 | n/a | n/a | `formula_injection_detected` | jsdom | `src/lib/proposal-export/create-proposal-workbook.ts:50,60-88` |
| Public/client-safe redaction (cross-ref `14` / `32` V-003) | `vitest run tests/vitest/share-snapshot-redaction.test.tsx` | the snapshot builder `buildSnapshotForProject` (`actions.ts:389`, allowlist `.from("estimate_row_items")` at :415) + public-read sanitizer `sanitizeProjectPublicationSnapshotForPublicRead` (`snapshot.ts:301`), and the proposal exporter's `applyAudiencePolicy` (`build-proposal-export-model.ts:43`), exclude the private fields above (snapshot/export field-selection is tested, NOT a live endpoint and NOT `activity-helpers.ts`); pre-registered as `ADV-PUBLIC-REDACTION` | Security lead | 0A | ADV-PUBLIC-REDACTION | n/a | n/a | `redaction_regression` | Playwright (full proof) / jsdom (unit allowlist) | `src/lib/publication/actions.ts:389,415` + `src/lib/publication/snapshot.ts:301` + `src/lib/proposal-export/build-proposal-export-model.ts:43` |

> The remaining 12-dim fields for the executable test rows delegate:
> Copy → [22](22-COPY-DECK-AND-MICROCOPY.md) §11 (verbatim strings in the
> Current-Error-Copy table below) · A11y →
> [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §form-validation · Perf → n/a
> (synchronous validation / ExcelJS round-trip in jsdom) · i18n →
> [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) §form-validation.

### Phase-later (no current execution target)

- oversized file (upload), unsupported file type (upload), cross-workspace
  storage object ID denied before read/delete, import preview with valid and
  invalid rows. These are governed by the Deferred contracts above; telemetry
  events (`upload_rejected_type`, `import_failed_partial_commit`,
  `export_large_export_logged`, `formula_injection_detected`) are registered in
  doc 20 §6A.
