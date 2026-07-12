# 02 — Workshop Library Bug & Risk Register

> Every entry has `file:line` evidence from current source (2026-07-12).
> Severity: **P1** = fix before first users; **P2** = fix soon / real bug with
> bounded blast radius; **P3** = cleanup / hardening / minor.
>
> No tests were run (User Test Authorization Gate). Where a bug warrants a test,
> a `TEST_PROPOSAL` (named risk + exact command) is recorded for explicit owner
> authorization.
>
> **v2 note:** this register supersedes the first-pass version. Three new P1s
> were found by the deep-dive passes (`04`/`05`/`06`): BUG-VA-01, BUG-VA-02,
> BUG-TM-01. First-pass BUG-P2-01 (`useTemplateEditor.run` race) was
> **downgraded/removed** after re-analysis in `06` §7 (the pattern is correct).
> First-pass DATA-DRIFT-01 was **resolved** (not a bug) in `04` §3.

## P1 — fix before first users

### BUG-P1-01 — direct-upload authz gap (viewers can upload)

- **Location:** `src/app/api/component-library/attachments/direct-upload/route.ts:486-488,499-501`
- **What:** POST (create session) and PUT (upload bytes) only check
  `if (profile?.id && profile.id !== currentUser.userId) return 403`. They do
  **not** call `canManageLibrary` / `isWorkspaceEditorInD1`.
- **Impact:** any logged-in member who resolves to the default workspace —
  including a `viewer` or suspended-role member — can reserve upload sessions
  and push attachment objects to R2, bypassing the editor gate enforced by the
  sibling `attachments/route.ts` and `images/route.ts`. Since
  `component-attachment` is the virus-scan surface, this also widens the upload
  surface for files that later require scan overrides.
- **Recommended surface:** add `canManageLibrary()` check before
  `createSignedUpload`/`uploadToCloudflareR2` (mirror `attachments/route.ts`).
- **Proof class:** source inspection. `TEST_PROPOSAL`: authz — attempt a
  direct-upload `create` as a workspace viewer; expect 403 (currently succeeds).

### BUG-P1-02 — non-atomic upload record writes strand R2 orphans

- **Location:** `src/lib/uploads/upload-records.ts:90-216` (`recordUploadAsset`)
- **What:** `upload_sessions`, `upload_assets`, `upload_events` are 3
  sequential non-transactional INSERTs. A D1 failure between them leaves an
  orphan `finalized` session with no asset row — and (in the POST attachments
  path) an orphan R2 object. The cleanup job keys off
  `upload_assets.status='deleted'` and
  `upload_sessions.status IN (reserved/failed/expired/deleted)`, so a
  `finalized` session with no asset is **never cleaned**.
- **Impact:** R2 orphans + dangling sessions accumulate under any D1 write
  hiccup. Affects `attachments/route.ts` POST and `images/route.ts` POST.
- **Recommended surface:** wrap the 3 inserts in D1 `batch()`, or add a
  compensating delete of the session/asset on partial failure.
- **Proof class:** source inspection. `TEST_PROPOSAL`: simulate a mid-sequence
  D1 failure and assert cleanup eligibility.

### BUG-VA-01 [P1] — variant attachments are never persisted (silent data loss)

- **Location:** `src/lib/component-library/actions.ts:1012-1180`
  (`upsertComponentPriceOptionInD1`); modal at
  `src/components/workshop/component-library-manager/AddComponentModal.tsx:1231-1263, 1126-1133`
- **What:** `AddComponentModal` uploads attachments per variant to R2 +
  `upload_assets` (POST `/api/component-library/attachments`), validates them
  server-side (`validatePriceOptions`), transmits them in the create payload —
  but `upsertComponentPriceOptionInD1` **never inserts a row into
  `cost_library_item_variant_attachments`**. Verified: zero production
  `INSERT INTO cost_library_item_variant_attachments` in `src/` (only the proof
  harness `upload-lifecycle-proof-router.ts:268` writes it).
- **Impact:** uploaded attachment files orphan in R2 + `upload_assets` with no
  link to any price option/item. On next library read, the modal shows "No files
  attached." The user sees a successful "Add Component" and the attachment chips
  silently disappear. The entire `cost_library_item_variant_attachments` review
  workflow (`uploaded/approved/rejected/superseded`) is unreachable. Detail in
  `04` §5.
- **Recommended surface:** add the attachment-row INSERT in
  `upsertComponentPriceOptionInD1` (or a sibling batched write); surface
  `scanStatus`/review state in the modal.
- **Proof class:** source inspection + grep. `TEST_PROPOSAL`: create a component
  with an attachment, reload, assert the attachment row exists + chip renders.

### BUG-VA-02 [P1] — in-estimate component edit mutates local state only

- **Location:** `src/components/workshop/EstimateSheetContent.tsx:1740-1765`
  (`updateComponentFromEditor`); modal save at
  `AddComponentModal.tsx:1530-1531`
- **What:** `EstimateSheetContent` opens `AddComponentModal` in edit mode
  (`editingItem`). On save, `onComponentUpdated(buildEditedItem())` calls
  `updateComponentFromEditor`, which only calls `updateRowItem(...)` — a local
  estimate-row state update. It never calls `updateCostLibraryComponent` or
  `upsertCostLibraryComponentPriceOption`.
- **Impact:** users editing a library component from inside an estimate sheet
  believe they edited the library; they only edited the row. The rich
  multi-variant edit UI (`AddComponentModal` edit branch + `buildEditedItem`) is
  a UI-only transformation on that surface. Detail in `04` §1/§6.
- **Recommended surface:** either persist the edit to the library via the
  existing server actions, or clearly label the in-estimate editor as
  "row-only" and disable library-mutation affordances there.
- **Proof class:** source inspection. `TEST_PROPOSAL`: edit a library component
  from an estimate, reload the library, assert the change is/isn't present per
  the chosen intent.

### BUG-TM-01 [P1] — template insert stale-link blindness

- **Location:** `src/lib/repositories/component-library-repository.ts:988, 952-995`
  (`normalizeTemplateRowItem`); gate at
  `src/components/workshop/library/source-trust-model.ts:463-588`
- **What:** `getTemplateDependencyHealth` gates insert on
  `row.lifecycleState`/`row.linkState`, but the row normalizer reads
  `lifecycleState` from the insert-time **snapshot** (`sourceSnapshot.lifecycleState`)
  — not a live join to `cost_library_items.lifecycle_state`. And `row.link_state`
  is **never copied onto the output object** (absent from the returned shape),
  so `rowLinkState` always falls back to `linked-clean`/`unlinked`. The only
  `link_state` write sites stamp `"linked-clean"`/`"unlinked"` — never
  `"source-changed"`. `pricingDate` falls back to `row.created_at` slice.
- **Impact:** when a referenced component is archived/deleted/price-changed
  *after* the template row was created, the insert picker reports the template
  as `healthy` and allows insert with no override. The "archived dependency"
  hard-block (`source-trust-model.ts:471-481`) is effectively unreachable
  through browse→insert. No broken-link UX. Detail in `06` §4.
- **Recommended surface:** live-join `source_library_item_id → cost_library_items`
  for current lifecycle at read time (or at insert-resolution time); surface
  `row.link_state` and recompute it; add a broken-link UX.
- **Proof class:** source inspection. `TEST_PROPOSAL`: archive a component
  referenced by a template, open the insert picker, assert the hard-block fires.

### BUG-DOM-01 [P1] — money stored/computed as float (REAL); estimate/proposal totals drift

- **Location:** money oracle `src/lib/estimates/estimate-row-total.ts:28-33`;
  storage `migrations/0026:48-49,83-84`, `0028:70-71`, `0015:19-26`; client
  mirrors `editable-row-model.ts:300,320`, `template-editor-model.ts:8-20`.
- **What:** all money columns are `REAL` (IEEE-754 double) on the live D1 path.
  The single line-total oracle is raw float (`subTotal + miscCost + (subTotal *
  adjustmentPercentage)/100`), summed un-rounded. No integer-cents, no Decimal
  library (confirmed: none in `package.json`). Rounding exists only at input
  ingest (`roundQuickAddMoney` `quick-add-validation.ts:96-98`) and the
  proposal-export boundary (`roundMoney` `proposal-export/settings.ts:3-5`).
- **Impact:** on large BOQs the on-screen estimate total, the
  persisted/server-aggregated total, and the exported proposal workbook can
  differ by sub-cent to a few centavos (sum order + round points differ). On a
  *bid document* (proposal to a client), centavo-level discrepancies are
  reputation-critical and can cause disputes. `misc_cost` added un-rounded is
  the classic 0.1+0.2 accumulation vector. **Highest-stakes domain risk for an
  estimating SaaS.** Detail in `07` §1.
- **Recommended surface:** pick ONE canonical money representation (integer
  cents `INTEGER` + scale, or Decimal library) and round identically at every
  tier boundary across the JS oracle, client model, and SQL function.
  Cross-cutting data-integrity change (migrations + oracle + client models) —
  high blast radius. `TEST_PROPOSAL`: construct a BOQ where float accumulation
  produces a visible discrepancy between estimate total and exported proposal.

### BUG-DOM-04 [P1] — no outbound propagation when a library component is edited/archived

- **Location:** `src/lib/component-library/actions.ts` (never issues
  `UPDATE estimate_row_items`); commit-time inbound guard only at
  `src/lib/estimates/actions.ts:1696-1720` (`assertCurrentLibrarySourceForEstimateCommit`).
- **What:** editing a library component's `unit_cost` leaves every referencing
  estimate row at the old price with `link_state` still `linked-clean` —
  visually indistinguishable from a fresh link. No re-sync, no stale-pricing
  flag, no notification/activity-feed entry (feed is project-scoped; library
  events don't fan out). `source-changed`/`detached` link states are **never
  persisted** — derived client-side only.
- **Impact:** an estimator's committed estimate silently carries stale library
  pricing with no signal. The *estimate-side* mirror of BUG-TM-01 (same root
  cause: no live-join, no outbound write). Note: estimates *intentionally*
  freeze a price at commit (correct for a locked bid); the bug is the **lack of
  signal**, not the freezing. Detail in `07` §3.
- **Recommended surface:** async stale-flag write on library edit/archive, or a
  derived "library moved since row_revision" signal the trust model reads
  server-side; persist `source-changed`/`detached` rather than deriving client-side.

### BUG-DOM-05 [P1] — bulk archive: no audit trail, no version bump, no referential check

- **Location:** `src/lib/component-library/actions.ts:1705-1764`
  (`executeBulkArchiveLibraryComponents`); preview `:1651-1703`.
- **What:** the bulk archive's ONLY write is a single UPDATE setting
  `lifecycle_state='archived'` + timestamps (`:1739-1751`). It does NOT bump
  `current_version_number`, write `state_history`, write a `versions` row, or
  emit telemetry. The preview only blocks not-found/already-archived — **no
  referential check** against `estimate_row_items.source_library_item_id` or
  `estimate_template_row_items.source_library_item_id`.
- **Impact:** archiving a component used by 200 live estimates is silent and
  succeeds. The most common lifecycle operation has the thinnest audit trail.
  Combined with BUG-DOM-04, estimator rows silently freeze with no signal.
  Detail in `07` §4.
- **Recommended surface:** make bulk archive call the same history/version/
  telemetry writes as `changeCostLibraryComponentLifecycleState`; consult
  `getCostLibraryComponentUsage` (`:2844-2879`) and warn/block on in-use.

### BUG-OPS-02 [P1] — templates eager-load query bomb (~300k rows worst case)

- **Location:** `src/lib/repositories/component-library-repository.ts:1291-1328`
  (`loadCurrentWorkspaceEstimateTemplatesAppPath`).
- **What:** `SELECT * FROM estimate_templates WHERE workspace_id = ?` (no LIMIT,
  up to 2 000), then `SELECT * FROM estimate_template_nodes WHERE template_id IN (...)`
  (no LIMIT, worst case ~100 000), then `SELECT * FROM estimate_template_row_items
  WHERE template_id IN (...)` (no LIMIT, worst case ~200 000). Runs eagerly on
  every cold Templates-route load + every cache miss.
- **Impact:** at the 2 000-template cap with realistic node/row counts, a single
  cold load can pull ~300k rows in one D1 round trip. D1 per-query row/size
  limits + Workers CPU/wall-clock limits make this a real failure/timeout risk
  before the cap. Detail in `08` §2.
- **Recommended surface:** paginate the templates browse load (page or
  cursor); lazy-load nodes/row_items per-template on expand; add per-query
  `traced` spans. Perf budget doc only targets 1 000 items, not the 2k/10k caps.

### BUG-OPS-08 [P1] — no live export/import; pricing page overpromises

- **Location:** dead helpers `src/components/workshop/component-library/helpers.ts:409,433,463,487`;
  defined-but-unemitted telemetry `library-telemetry.ts:26,41`; marketing
  `src/app/pricing/page.tsx:14` ("never metered on estimating, exports, or BOQ
  lines").
- **What:** no CSV/XLSX/JSON download or import UI in the library surface. The
  export helpers + telemetry events exist but have zero callers. The pricing
  page advertises exports; the perf budget references an XLSX trigger. None is
  wired.
- **Impact:** for a Philippines-first startup expecting first users: no way to
  export/import the component library or templates. GDPR art. 20 data
  portability + "I want my data"/"I want to migrate" unserved. Marketing
  overpromises. Detail in `08` §7.
- **Recommended surface:** either delete the dead code or wire it up before
  charging users.

### BUG-DOM-18 [P1] — AI (Ask Flip) library-component create bypasses all input validation + quota

- **Location:** `src/lib/ai/package-builder/apply.ts:1671-1896`
  (`applyComponentCreateDraft`); direct `INSERT INTO cost_library_items` at
  `:1783` + `INSERT INTO cost_library_item_price_options` at `:1832`; human path
  at `src/lib/component-library/actions.ts:1242-1392`.
- **What:** the AI apply path issues direct SQL INSERTs and calls **none** of the
  guards the human path runs (grep-confirmed empty): no `validatePriceOptions`
  (exactly-one-default, non-negative costs, attachment MIME), no
  `validateQuickAddComponentInput` (required fields, length limits), no
  `normalizeQuickAddText` (control-char strip), **no spreadsheet-formula-prefix
  rejection** (`=+-@`), no money bounds check, no `pricingSource` URL validation,
  no future-date rejection, **no `assertWithinLibraryQuota`** (the 10k cap). The
  AI hardcodes a single "Default" price option (`:1707-1738`). Authz
  (`isWorkspaceEditorInD1` `:1751`) IS mirrored — so a viewer can't trigger AI
  writes — but every input-validation + quota guard is bypassed.
- **Impact:** amplifies BUG-DOM-14 from a dedup-bypass into a full input-
  validation bypass. An AI-suggested component named `=HYPERLINK("…","click")`
  (formula injection into any downstream spreadsheet/XLSX export), with a 50KB
  description (no length cap), negative cost (no money validation), and a
  non-https `pricingSource`, would persist where the human modal rejects all of
  those. AI can also blow past the 10k workspace quota. A human approves the
  draft, but the approval UI shows the draft content, not a re-validation report,
  so the approver has no signal that validation was skipped.
- **Recommended surface:** route AI library-component creates through
  `createCostLibraryComponent` (or a shared validator), not direct SQL; OR re-run
  the full `validatePriceOptions`/`validateQuickAddComponentInput`/
  `assertWithinLibraryQuota` stack on the AI draft before the INSERT. At minimum,
  apply the formula-prefix + length + money + quota guards.
- **Proof class:** source inspection (grep confirms the validators are absent
  from `src/lib/ai/package-builder/apply.ts`; present in
  `src/lib/component-library/actions.ts:54,561,637,737,752`). `TEST_PROPOSAL`:
  submit an AI draft with a `=`-prefixed name + negative cost + over-quota
  workspace, apply, assert it's rejected (currently persists).

### BUG-SEC-04 [P1] — D1 foreign-key enforcement is OFF; every `ON DELETE CASCADE` is inert

- **Location:** `PRAGMA foreign_keys` / `foreign_keys=ON` appears NOWHERE in
  `wrangler.jsonc`, `worker.ts`, or `src/lib/cloudflare/**` (grep-confirmed
  empty). D1/SQLite defaults `foreign_keys` to OFF. Affected library constraints:
  `cost_library_item_price_options.item_id ON DELETE CASCADE` (`0026:80`),
  `cost_library_items.workspace_id` (`0026:37`), `library_folders.workspace_id`
  (`0026:21`), `cost_library_item_versions.item_id ON DELETE CASCADE`
  (`0028:47`), `cost_library_item_variant_cost_entries` (`0028:68-69`),
  `cost_library_item_price_history` (`0028:94-95`),
  `cost_library_item_state_history` (`0028:112-113`),
  `cost_library_component_drafts.converted_item_id` (`0036:13`).
- **What:** deleting a `cost_library_items` row will NOT cascade to its price
  options, versions, cost entries, or history — despite the schema declaring
  `ON DELETE CASCADE`. The only FK check anywhere is a one-shot post-hoc audit
  in `migrations/0066:378` (`pragma_foreign_key_check`) for publication tables
  only; it doesn't enable FKs for library tables or persist.
- **Impact:** if/when a hard-delete path is ever added (or via direct DB access),
  orphan rows accumulate — price options/versions/history/attachments left
  dangling with no parent item, resurfacing as ghost/duplicate data in joins.
  Today the library has no hard-delete (only archive), so this is **latent**, but
  it's a structural integrity trap: the schema *promises* cascade cleanup that
  the runtime does not deliver.
- **Recommended surface:** either enable `PRAGMA foreign_keys=ON` per-connection
  (verify the D1 binding honors it), OR add explicit app-layer cascade deletes
  in every delete path. At minimum, document that CASCADE constraints are inert.
- **Proof class:** source inspection (grep confirms no PRAGMA anywhere).

### BUG-SEC-05 [P1] — XLSX formula-injection: `unit_cost`/labor/misc leak to client audience; most text fields have no input-side formula guard

- **Location:** `src/lib/proposal-export/create-proposal-workbook.ts:85-88,381-382`
  (MATERIAL/LABOR/MISC columns written with no audience gate);
  `src/lib/proposal-export/xlsx-workbook.ts:349-376` (sole defense = inline-string
  + `@` numFmt, producer-side only); input-side guard
  `src/lib/component-library/quick-add-validation.ts:58,158-164` covers only
  name/category/unit/supplier/brand/pricingSource/confidence — NOT
  description/notes/material/sku/variantDescription.
- **What:** two compounding issues. (1) **Field exposure**: the client-audience
  XLSX writes per-row `materialUnitCost`/`laborUnitCost`/misc into the Bid Form
  for EVERY row with NO audience gate (`create-proposal-workbook.ts:381-382`),
  while the client portal treats `unit_cost` as CONTROLLED (default-hidden,
  `client-portal/policy.ts:122,231`). A client who downloads the XLSX sees the
  firm's full costing basis; the same client in the portal does not. (2)
  **Formula injection**: `description`/`notes`/`material`/`sku`/`variantDescription`
  reach XLSX cells with no input-side formula-prefix guard (only `name`/`category`/
  `unit`/`supplier`/`brand` are guarded at `quick-add-validation.ts:158-164`), and
  the guard is bypassed on the AI path (BUG-DOM-18). The sole barrier is the
  producer-side inline-string + `@` numFmt (`xlsx-workbook.ts:373-376`), which
  most spreadsheet apps honor but importers/BI tools may not.
- **Impact:** (1) a client can reverse-engineer the firm's costing basis from the
  XLSX — an inter-surface policy inconsistency that undermines the portal's
  default-hide. (2) a `=HYPERLINK(...)`/`=cmd|...` payload in an unguarded field,
  if evaluated by a consumer that ignores `t="inlineStr"`, executes. Combined with
  BUG-DOM-18 (AI bypasses even the name guard), the injection surface is wider
  than the input-side defense covers.
- **Recommended surface:** audience-gate the MATERIAL/LABOR/MISC columns (drop or
  redact for client audience) to match the portal; add belt-and-suspenders
  leading-char neutralization at `renderCellValue` string branch; extend the
  formula-prefix guard to description/notes/material/sku/variantDescription.
- **Proof class:** source inspection. `TEST_PROPOSAL`: download a client-audience
  XLSX, assert MATERIAL/LABOR columns are absent (currently present); set a
  component `description` to `=HYPERLINK("x","y")`, export, open in a permissive
  consumer, assert it's not evaluated.

## P2 — real bugs, bounded blast radius

### BUG-P2-02 — render-phase derived setState (3 sites)

- **Locations:**
  - `use-template-editor.ts:57-60`
  - `EditComponentDrawer.tsx:77-81`
  - `TemplateEditorSheet.tsx:119-127` (`TemplateEditableRow`)
- **What:** setState called during render guarded by an id/reference inequality
  check. React tolerates this (id-guard prevents infinite loop), but it's flagged
  by react-doctor-style linters and is fragile.
- **Note:** the `use-template-editor.ts:57-60` site was re-analyzed in `06` §3
  and is a **correct guarded prop-sync** (React permits setState-during-render
  when conditional on a prop change targeting the same component) — keep as a
  defensive-pattern observation, not an active bug. The other two sites remain
  candidates for `useEffect`/`useMemo`.
- **Recommended surface:** move `EditComponentDrawer` and `TemplateEditableRow`
  sites to `useEffect`/`useMemo` keyed on the id/ref.

### BUG-P2-03 — `createCostLibraryComponent` non-atomic multi-statement

- **Location:** `src/lib/component-library/actions.ts:1294-1384`
- **What:** INSERT item → looped `upsertComponentPriceOptionInD1` (each its own
  statements) → UPDATE `active_price_option_id` → `insertComponentVersion`, no
  transaction. A mid-sequence failure leaves a partial component (item + some
  price options, no version, possibly stale `active_price_option_id`). Same
  pattern in `updateCostLibraryComponent`,
  `upsertCostLibraryComponentPriceOption`,
  `changeCostLibraryComponentLifecycleState`. Template-duplication paths
  acknowledge this and compensate; component paths do not.
- **Recommended surface:** wrap multi-statement sequences in D1 `batch()` with
  compensating deletes, mirroring `insertTemplateIntoTemplate`.

### BUG-P2-04 — route-state write bypasses Next router

- **Location:** `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:2365-2374, 2400-2408`
- **What:** `?component=` written via raw `window.history.pushState/replaceState`
  + internal `componentRouteStateVersion` counter. Bypasses Next's router, so
  `useSearchParams` subscribers don't observe the change.
- **Impact:** currently compensated by the internal counter; any future
  framework subscriber sees stale `?component=` until a real navigation.
- **Recommended surface:** use `router.push`/`router.replace` from
  `next/navigation`.

### BUG-P2-05 — quota TOCTOU

- **Location:** `src/lib/component-library/actions.ts:561-578` (`assertWithinLibraryQuota`)
- **What:** COUNT-then-INSERT lets concurrent requests both pass the cap.
- **Impact:** tiny (caps are 10 000 / 2 000 / 100). Real but low.

### BUG-P2-06 — scan-override audit can detach from the override

- **Location:** `src/lib/uploads/scan-override.ts:184-191`
- **What:** conditional UPDATE commits, then `insertScanOverrideEvent` runs
  separately with no transaction. If the event INSERT fails, the override is
  live but unaudited.
- **Recommended surface:** `batch()` the UPDATE + INSERT.

### BUG-P2-07 — `finalizeUploadSessionAsset` can strand a session

- **Location:** `src/lib/uploads/direct-upload-records.ts:493-563`
- **What:** session flipped to `finalized` **before** the asset INSERT. If the
  asset INSERT fails, session is `finalized` with no asset; a retry hits the
  `status === 'finalized'` branch (`:456-464`), finds no existing asset, throws
  → permanently stuck, object orphaned in R2.
- **Recommended surface:** insert the asset first, then flip the session; or use
  `batch()`.

### BUG-P2-08 — non-constant-time secret compare on internal job routes

- **Locations:** `src/app/api/internal/upload-scan/route.ts:42`,
  `src/app/api/internal/upload-cleanup/route.ts:47`
- **What:** `authHeader === \`Bearer ${secret}\`` (non-constant-time). Low-risk
  (secret isn't user-supplied) but a best-practice miss.
- **Recommended surface:** `crypto.timingSafeEqual`.

### BUG-P2-09 — image GET has no per-object capability check

- **Location:** `src/app/api/component-library/images/route.ts:174-193`
- **What:** GET only resolves workspace + checks `parsedPath.workspaceId !==
  workspace.id`. Any member of workspace X can GET any image under `X/...` by
  guessing object keys (no editor gate, no ownership check). Cross-workspace is
  blocked; within-workspace enumeration is possible.
- **Impact:** likely acceptable (images aren't secret within a workspace), but
  confirm the threat model.

### BUG-P2-10 — `recordAttachmentDownloadIssued` failure aborts the download

- **Location:** `src/app/api/component-library/attachments/route.ts:414-415`
- **What:** if the audit INSERT fails, the user gets a 409-equivalent and the
  (valid, clean) attachment is not served. Sacrifices availability for audit
  completeness.
- **Recommended surface:** decide intended priority; treat audit failure as
  non-fatal if availability matters more.

## P3 — cleanup / hardening / minor

### BUG-P3-01 — admission-control state is per-isolate + never sweeps

- `src/lib/uploads/admission-control.ts:30-32` — module-global Maps, no
  cross-instance coordination on Workers; never sweeps expired entries (minor
  memory leak). The D1-backed durable cap is the real gate. IP from
  `cf-connecting-ip` only (collapses to `"unknown"` behind non-CF routing).

### BUG-P3-02 — upload idempotency is per-batch only

- `src/lib/cloudflare/upload-job-queue.ts:338` — `seenIdempotencyKeys` is local
  to one batch; two deliveries in different batches both execute. Underlying job
  routes are idempotent-ish, so blast radius is limited.

### BUG-P3-03 — direct-upload checksum optional at create

- `src/app/api/component-library/attachments/direct-upload/route.ts:215,266` —
  `checksumSha256` optional; finalize succeeds on R2 etag alone. Weakens the
  content-integrity story but R2 etag still binds the bytes.

### BUG-P3-04 — `isUniqueViolation` checks Postgres code in a D1 codebase

- `src/lib/workshop/group-actions.ts:54-56` — `code === "23505"` is dead
  Postgres-era code. The string-based `isDuplicateNameViolation` (`:61-70`) is
  what actually catches D1/SQLite `UNIQUE constraint failed: ...`. Confirm the
  D1 driver surfaces those messages, else duplicate-name errors surface as 500s.

### BUG-P3-05 — `INSERT OR IGNORE` that can never ignore

- `src/lib/component-library/actions.ts:991, 1614` — keyed on random UUID PK, so
  `OR IGNORE` is a no-op. Harmless noise.

### BUG-P3-06 — `lifecycleState` not app-validated

- `src/lib/component-library/actions.ts:708` (`normalizeComponentInput`) doesn't
  validate the enum; DB CHECK (`0026:50-52`) catches invalid values → surfaces
  as a generic D1 write failure rather than a clean validation message.

### BUG-P3-07 — personal-email special-casing in shared library code

- `src/lib/repositories/workspace-repository.ts:1418` —
  `context.email === "philipjonlewis@gmail.com"` branches the default workspace
  name. Smell; move to config.

### BUG-P3-08 — giant components (review velocity + TTI)

- `ComponentLibraryManager.tsx` (~2900L), `AddComponentModal.tsx` (~2370L),
  `LibraryFolderTree.tsx` (~1458L), `TemplatesBrowseManager.tsx` (~1200L) all
  carry `react-doctor-disable-next-line react-doctor/no-giant-component`. Split
  for review velocity + cold-load.

### BUG-P3-09 — multiple lazy `dynamic()` imports in one surface

- `ComponentLibraryManager.tsx:92-123` — 4 separate chunks (folder tree, add
  modal, inspector dock, edit drawer). On a cold load with all four triggered,
  that's 4 round-trips. Consider preloading inspector/drawer on first hover.

### BUG-P3-10 — `buildCatalogueOutline`/`buildCatalogueFolderMaps` cost

- `ComponentLibraryManager.tsx:488-593` — walks every item + every folder per
  invocation. Verify `useMemo` guard at the call site (folderNodes memoized at
  `:2210`; confirm outline memoization).

### BUG-P3-11 — virtualization fallback double-layout

- `ComponentLibraryManager.tsx:1029-1044` — when `useVirtualizer` returns 0
  items on first paint, a synthetic row array is constructed; double-layout on
  first mount for large lists.

### BUG-OPS-04 [P3] — currency hardcoded PHP in ~12 sites; no central constant, no multi-currency display

- `src/lib/repositories/component-library-repository.ts:474-476`;
  `src/components/workshop/component-library/helpers.ts:18-22`; defaults
  `actions.ts:770,784,812`, `estimate-templates.ts:45`, `repository.ts:510,963`,
  `helpers.ts:229,357,641`. Schema stores `currency` per price option/cost entry
  but no currency picker in the library UI; all rendering assumes PHP. A USD row
  renders with a ₱ prefix. Detail in `08` §4.

### BUG-OPS-05 [P3] — binary collation mis-sorts Filipino names (Ñ / Ng)

- `ORDER BY name ASC` / `ORDER BY category ASC, name ASC`
  (`repository.ts:398,426,712,1128,1136,1305`) uses D1/SQLite default binary
  collation, not Filipino (`fil-PH`) locale. Filipino's 28-letter alphabet (adds
  Ñ + the Ng digraph) is mis-sorted. For a Philippines-first catalog with
  Filipino category names this is a correctness gap. Detail in `08` §4.

### BUG-OPS-09 [P3] — repository/actions layer untraced; display rounding inconsistent

- No `withPerfTraceRequest`/`traced` in `src/lib/component-library/`,
  `component-library-repository.ts`, or `api/component-library/` — the 6-query
  waterfall + unbounded reads are invisible individually (route-level trace
  measures the whole `Promise.all`). Display: `row-table.tsx:181` `toFixed(6)`
  vs `:192` `toFixed(2)` vs proposal `roundMoney` — inconsistent. Detail in
  `08` §3.

### BUG-DOM-21 [P3/model] — change-order plumbing exists (legacy only) but domain layer is 0%; markets the feature

- **Location:** data-capture plumbing exists but **only in the LEGACY Postgres
  stack** (`supabase/migrations/20260524033151_estimate_sheet_version_control.sql`
  — `estimate_sheet_versions` with 5MB snapshot cap + `estimate_sheet_events.total_delta` + `changed_fields` + `old_snapshot`/`new_snapshot` +
  `restore_estimate_sheet_version_as_copy` RPC). **CORRECTION (v8):** grep
  confirms `estimate_sheet_versions` appears in ZERO active `migrations/` files
  and ZERO `src/` files — it is NOT in the active D1 stack. The active D1 analog
  is `cost_library_item_versions` (`0028:45-60`) which has only `snapshot_json`
  (no size cap, no delta/changed_fields columns, no restore RPC). The live
  baseline/comparand delta engine `src/lib/project-charts/project-comparison-view.ts:37,197-200,284-297`
  reads live estimate rows, not snapshots. Publication `snapshot_json`/`snapshot_version`
  (`migrations/0066:75,80`) is live and is a second natural baseline point.
- **What (revised):** the "70% plumbing" claim from v6 was overstated — the
  version-snapshot/delta plumbing is **legacy Postgres, not active D1**. In the
  active stack, ~30% (comparison engine + publication snapshot) is reusable; the
  version-snapshot/delta/restore plumbing would need to be ported to D1. 0% of
  the domain layer (change-order entity, baseline-pinning, status transitions,
  diff-vs-snapshot, client-facing variation document) exists in either stack.
  `estimates.status` enum (`draft/active/issued/archived`) has no
  `awarded`/`locked` and is never written. Yet the landing page promises
  "Change orders without the paper trail" / "Edit, re-send, re-approve"
  (`landing-v3/ArchestimatorLandingPage.tsx:383-386`). Compounds BUG-DOM-17.
- **Recommended surface:** product decision — either port the version-snapshot
  plumbing to D1 + build the domain layer, or soften the landing-page claim. The
  v6 "~70%" estimate should not be relied on; the reusable portion in the active
  stack is smaller.

### BUG-DOM-22 [P3/model] — proposal financial gaps: no profit/overhead/indirect-cost; GFA source unreliable; reserved-but-nonexistent redacted fields

- **Location:** proposal stops at Direct Cost + contingency + VAT
  (`proposal-export/settings.ts:39-45`); no overhead/profit/margin/fee field
  anywhere (grep `overhead|profit|markup|indirect.cost|\bfee\b` = only CSS/React
  noise). GFA read from soft JSONB metadata with no typed column/unit/UI
  (`export/proposal.xlsx/route.ts:113-126`). `client-portal/policy.ts:121`
  redacts `margin`/`internal_markup` in `NEVER_PUBLIC_FIELDS` but those columns
  **don't exist** (forward-compatible placeholders). No selectable rounding mode
  (grep `roundup|rounddown|roundingMode` = zero); hardcoded round-half-up.
- **What:** (a) no profit/overhead/indirect-cost model — the proposal can't
  represent the contractor's fee structure beyond contingency/adjustment/misc;
  (b) cost-per-sqm depends on a GFA pulled from unvalidated JSONB; (c) the portal
  pre-redacts fields that don't exist yet; (d) no rounding-direction choice;
  (e) `unit_cost` shown in client proposal workbook but CONTROLLED (default-
  hidden) in the client portal — inconsistent exposure. Detail in v6 proposal
  deep-dive §B.
- **Recommended surface:** add profit/overhead fields if estimators need them;
  promote GFA to a typed column with validation; reconcile the redaction list
  with real fields; decide on a rounding mode; align workbook vs portal
  `unit_cost` exposure.

### BUG-DOM-24 [P2] — migration 0037 is an irreversible unguarded multi-table data purge with no transactional wrapper

- **Location:** `migrations/0037_remove_preloaded_component_categories.sql:5-23`
  — four full-scan `UPDATE ... SET category_node_id = NULL`/`source_category_node_id = NULL`
  across `library_folders`, `cost_library_items`, `estimate_row_items`,
  `estimate_template_row_items` + `DELETE FROM component_category_nodes`. No
  pre-snapshot, no `BEGIN/COMMIT`, no indexes on the filtered `category_node_id`
  columns.
- **What:** D1 applies migrations statement-by-statement; a mid-run failure
  (e.g. statement 3 erroring) leaves statements 1-2 committed and 4 + DELETE
  unrun → half-purged workspace (some tables nulled, taxonomy table possibly
  still populated) with no reconciliation path. The information loss is permanent
  (no archive of the pre-purge `component_category_nodes`).
- **Impact:** if it hasn't already run cleanly on prod, it's a one-shot risk. If
  it has, this is historical. Either way it's the highest-risk migration in the
  library surface and the schema-debt behind DEAD-SCHEMA-01.
- **Recommended surface:** for future destructive migrations, wrap in
  `BEGIN/COMMIT` (verify D1 honors it for DML) or add a pre-snapshot archive
  table. For 0037 specifically: nothing to do if already applied; document the
  purge as irreversible.

### BUG-DOM-25 [P2] — schema-drift is broader than DATA-DRIFT-01 reported: ~15 ComponentPriceOptionRow columns have NO D1 backing; reverse drift on attachment row

- **Location:** `src/lib/repositories/component-library-repository.ts:150-177`
  (`ComponentPriceOptionRow` declares `sku`, `variant_description`,
  `variant_sort_order`, `pricing_date`, `source_url`, `notes`,
  `active_cost_entry_id`, `package_quantity`, `package_unit`, `dimension_*`,
  `mass`, `mass_unit`, `image_bucket`, `image_path`, `thumbnail_path`,
  `image_metadata`, `variant_metadata`); D1 table
  `migrations/0026_component_promotion_support.sql:77-98` has none of these;
  **no `ALTER TABLE cost_library_item_price_options` exists in any migration**
  (grep-confirmed). Reverse drift: `ComponentVariantAttachmentRow` (`:239-252`)
  omits the review-workflow columns D1 has (`review_status`,
  `is_current_approved`, `reviewed_by`, `review_revision`, etc., `0022:32-53`).
- **What:** DATA-DRIFT-01 (v2) resolved this as "tolerant read model via
  `metadata_json` round-trip." v8 sharpens it: these are declared as **discrete
  typed columns** on the TS type but **do not exist as D1 columns at all**. Any
  code doing `SELECT sku, dimension_length` or `INSERT (sku, dimension_length)`
  against the table will throw "no such column" at runtime; `SELECT *` always
  returns `undefined` for them. **TypeScript cannot catch this** because the types
  are hand-written (`package.json:20` only generates env bindings, not D1 row
  types). The read-hydration fallback to `metadata.*` (repo:580-632) masks it for
  reads, but the columns-vs-metadata fragility noted in DATA-DRIFT-01 is sharper
  than "latent" — it's a class of bug the compiler won't catch.
- **Impact:** a future writer that sets a column (believing the TS type) silently
  shadows the `metadata_json` value or throws. The reverse drift means review-
  workflow state can't be read without manual aliasing.
- **Recommended surface:** either codegen D1 row types (eliminate hand-written
  drift), or add `SELECT` column-list discipline + trim the TS type to only real
  columns; document the JSON-blob contract explicitly. Generate types via a D1
  schema introspection step.

### BUG-DOM-26 [P3] — active D1 version table has no size cap + no immutability guard

- **Location:** `migrations/0028:45-60` (`cost_library_item_versions.snapshot_json`
  has only `json_valid` + object check — no byte limit, no `prevent_update`/
  `prevent_delete` trigger). Contrast `estimate_revision_facts` in
  `migrations/0072:100-110` which IS properly append-only via triggers.
- **What:** the legacy Postgres `estimate_sheet_versions` had a 5MB CHECK cap
  (`supabase/.../20260524033151...sql:53`); the active D1 analog has none. A
  runaway snapshot or a future UPDATE would silently mutate "immutable" history.
  The code only ever INSERTs (`actions.ts:991`), so today it's immutable by
  convention, not by enforcement.
- **Recommended surface:** add a `snapshot_json` byte cap (CHECK length < N) +
  `prevent_update`/`prevent_delete` triggers mirroring `estimate_revision_facts`.

### BUG-SEC-06 [P2] — client XLSX leaks `notes` always; portal never surfaces `notes` (manager expectation gap)

- **Location:** `buildRemarks` (`build-proposal-export-model.ts:78`) unconditionally
  appends free-form `notes` to remarks regardless of audience; the portal snapshot
  (`snapshot.ts:221-245`) never captures `notes`.
- **What:** a manager who assumes "notes are internal" (because they never appear
  in the portal) will have them printed in the client XLSX NOTES/REMARKS column.
  The audience-policy gate (`applyAudiencePolicy`) does NOT gate `notes`.
- **Impact:** accidental leak of internal notes to clients via the XLSX path.
- **Recommended surface:** audience-gate `notes` in `buildRemarks` (omit for
  client audience, or add a `showNotesInRemarks` toggle defaulting off).

### Audience-policy gate: CONFIRMED robust (positive record)

- The audience gate is **genuinely server-derived and not bypassable** by query/body.
  `resolveExportAudience` (`route.ts:81-90`) returns `"client"` unless
  (`requestedInternal && isWorkspaceMemberInD1(...)`); the wire value cannot set
  `settings.audience`; the gate is applied twice (model builder + workbook
  chokepoint). Anonymous/recipient actors cannot reach the route (lives under
  `/api/projects/...`, requires `getCurrentUserContext`). A non-member passing
  `?audience=internal` gets `"client"`. Errors fail-closed to `"client"`. This is
  a well-designed defense — recorded positively so it's not re-questioned.

### BUG-DOM-27 [P2] — no byte cap on `metadata_json`/`metadata` across 4 tables (inconsistent with the 64KB `draft_json` cap)

- **Location:** `cost_library_items.metadata_json` (`0026:57-60`),
  `cost_library_item_price_options.metadata_json` (`0026:92-95`),
  `estimate_template_row_items.metadata` (`0024:69-72`),
  `estimate_row_items.metadata_json` (`0021:8-11`) — all have only
  `json_valid`+object CHECK, **no byte cap**. Contrast
  `cost_library_component_drafts.draft_json` which IS capped at 64KB both in DB
  (`0038:1-13` trigger) and app (`actions.ts:382,580-586`). Grep for
  `metadata_json.*length|metadata.*65536|metadata.*<=` in migrations + app =
  empty.
- **What:** `readMetadataObject` (`actions.ts:869-872`) only checks
  `typeof === "object" && !Array.isArray` — no key filter, no count cap, no byte
  cap, no `__proto__`/`constructor` strip. A client can store an unbounded JSON
  object per row. On create, server keys (`source`/`isCustom`/`createdFrom`)
  override 3 keys; on update (`actions.ts:1442,1484`) the client owns the entire
  blob. Compounds the BUG-DOM-25 schema-drift (the blob is the real store for
  ~15 variant fields).
- **Impact:** resource-unbounded storage per row; a workspace could inflate
  storage/costs via large metadata blobs. Read-hydration is SAFE (coercion
  helpers prevent type-confusion/prototype-pollution — verified), and
  `metadata_json` free-text does NOT reach the LLM (only numeric `laborUnitCost`
  does). So this is a resource/integrity gap, not an injection vector.
- **Recommended surface:** add a byte cap (CHECK length < N or a trigger)
  mirroring `draft_json`'s 64KB posture; add a key allowlist or cap key count.

### BUG-OPS-13 [P2] — unbounded reads have no Workers memory/CPU guard; memory exhaustion is the realistic failure

- **Location:** templates eager load (`repository.ts:1291-1328`, three unbounded
  `SELECT *`); components "Load all" paging (`repository.ts:419-432` items +
  `:327-351` price options/cost entries — 30+ D1 subrequests at 10k items);
  `wrangler.jsonc` has NO `[limits]` block (no `cpu_ms`); `worker.ts` has no
  `AbortController`/deadline. Grep for `AbortController|cpuTime|deadline|
  MAX_PAGES|maxIterations` in `src/lib/repositories/` = empty.
- **What:** D1 `prepare().bind().all()` materializes the full result set in
  Worker memory (128 MB ceiling — Cloudflare platform fact). The templates
  ~300k-row load + the components "Load all" both retain the full result set; at
  large workspace size the Worker hits 128 MB before the 30s default CPU budget.
  No graceful degradation — a too-large workspace produces an unhandled 500 from
  the top-level `worker.ts:190-193` catch. Subrequests are NOT the binding
  constraint on Paid (10,000/invocation; ~30 used).
- **Impact:** at the documented 10k-component / 2k-template caps, a cold "Load
  all" or templates browse can OOM-fail the Worker. The pack's BUG-OPS-02 and
  PERF-01 are correct; this finding adds that there is no guard AND no graceful
  fallback.
- **Recommended surface:** add an iteration cap / `Date.now()` deadline /
  row-count ceiling to the repository loops; stream or paginate the templates
  load; configure `[limits] cpu_ms` if longer budget is needed; return a
  degraded "workspace too large, refine your filter" response instead of a 500.

### BUG-OPS-14 [P1] — orphan-reaping design is structurally incapable of catching the orphans the pack identified

- **Location:** `src/lib/uploads/cleanup-job.ts:466-488` (reaper selects only
  `upload_assets WHERE status='deleted'` + `upload_sessions WHERE status IN
  ('reserved','failed','expired','deleted')`); `src/lib/uploads/cleanup.ts:108-167`
  (`cleanupReasonFor` returns `null` → `not_cleanup_eligible` for anything else,
  incl. `finalized`). No generic unreferenced-object sweep (grep
  `orphan|unreferenced|dangling|reap|gc` in cleanup paths = empty).
- **What:** the reaper is **100% status-column-driven**. It can only reap objects
  whose `upload_assets.status='deleted'` or whose session has expired. But the
  orphan classes the pack identified are:
  - **BUG-P1-02** (`finalized`-session-no-asset) — `finalized` is not in either
    SELECT's status filter → permanent orphan.
  - **BUG-VA-01** (variant attachments never persisted) — object sits in R2 +
    `upload_assets(finalized)`, no `cost_library_item_variant_attachments` link →
    never becomes `deleted` → permanent orphan, unreachable from the UI.
  - Archived components' images/attachments — archive never sets `deleted` →
    permanent.
- **Impact:** R2 orphans from the known buggy write paths accumulate **forever**.
  No R2 lifecycle/expiration policy is configured either (`wrangler.jsonc:33-39`
  has no rules; R2 lifecycle must be set via dashboard/API — none referenced in
  code/docs). This is a slow cost leak that compounds with every failed upload
  + every archived component.
- **Recommended surface:** add either (a) a generic unreferenced-object
  reconciliation (`LEFT JOIN ... WHERE pk IS NULL` or periodic `r2.list()` sweep),
  or (b) a broader status filter + a transition path that marks the BUG-P1-02/
  VA-01/archive orphans `deleted`. Configure an R2 lifecycle rule as defense-in-
  depth.
- **Proof class:** source inspection (grep confirms status-filter + no generic
  sweep + no lifecycle policy).

### BUG-OPS-15 [P2] — reaper never updates `upload_assets.status` after reaping; backlog never drains

- **Location:** `src/lib/uploads/cleanup-job.ts:279-385` — writes `upload_events`
  (audit) but **never** `UPDATE upload_assets`/`SET status` (grep
  `UPDATE upload_assets|SET status` in cleanup-job.ts = empty).
- **What:** after reaping (R2 `removeObjects`), the `upload_assets` rows stay at
  `status='deleted'`. The next cron tick re-selects the same rows and re-attempts
  R2 delete (a no-op on missing keys — effectively idempotent at the storage
  layer) and re-emits audit events. The candidates **never leave the backlog**.
  Once ≥250 `deleted` rows accumulate, the `cleanup_backlog` alert
  (`cleanup.ts:254-266`) fires **permanently**.
- **Impact:** operational noise + a backlog that can only grow; alert fatigue.
- **Recommended surface:** after successful reaping, hard-delete or mark the
  `upload_assets`/`upload_sessions` rows reaped (e.g. `status='reaped'` or
  `DELETE`) so the backlog drains.

### BUG-OPS-16 [P2] — images/attachments DELETE routes delete R2 but never reconcile DB rows

- **Location:** `src/app/api/component-library/images/route.ts:312-329` (DELETE
  → `removeObjects` only; no `upload_assets` update/delete);
  `src/app/api/component-library/attachments/route.ts:533-572` (DELETE →
  `removeObjects` only; no `cost_library_item_variant_attachments` or
  `upload_assets` update/delete).
- **What:** the DELETE routes remove the R2 object but leave the DB rows at
  `status='finalized'` (images) / unchanged (attachments). Result: dangling DB
  rows — GET-by-path would 404 while DB says live; the reaper never learns the
  object was deleted (it only reaps `status='deleted'`, which neither route
  sets). The correct pattern for this design is DB-soft-delete (`status='deleted'`)
  FIRST, then reaper deletes R2 — which is exactly what the reaper exists for but
  neither route uses.
- **Impact:** DB/R2 inconsistency; orphan-reaper can't observe these deletes;
  archived components' objects are never cleaned (no path marks them `deleted`).
- **Recommended surface:** DELETE routes should `UPDATE upload_assets SET
  status='deleted'` (let the reaper handle R2), mirroring the designed pattern.

### BUG-OPS-17 [P2] — upload-jobs DLQ has no consumer/alert; provider-proof receipt skipped for real messages

- **Location:** `wrangler.jsonc:98` (DLQ `archestimator-upload-jobs-dlq`
  configured); `src/lib/cloudflare/upload-job-queue.ts:234` (provider-proof
  receipt early-returns when `providerProof.id` absent — and real cron messages
  built at `:124-141` never set it); `alert-scenarios.ts:134-161` (S-04 DLQ alert
  is generic synthetic probe, not an upload-jobs-DLQ-specific depth poller);
  `worker.ts:268-282` (no DLQ consumer).
- **What:** the DLQ exists and the runtime routes exhausted messages to it, but
  (a) nothing consumes `archestimator-upload-jobs-dlq`, (b) no app code polls its
  depth, (c) for real production messages the R2 proof-receipt is **never
  written** (skipped at `:234`), so the only trace is a `console.log` batch
  summary. A persistently-failing cleanup/scan job silently accumulates in the
  DLQ until someone manually inspects the Cloudflare dashboard.
- **Impact:** silent failure accumulation in the DLQ; no alerting on the library
  upload-pipeline's dead letters.
- **Recommended surface:** add a DLQ consumer or a depth-poll alert specific to
  `archestimator-upload-jobs-dlq`; write the proof-receipt for real messages too
  (or replace it with structured logging).

### BUG-OPS-18 [P3] — IMAGES binding failure collapses to misleading `decode-error` (no sharp fallback)

- **Location:** `src/lib/uploads/server-image-processing.ts:171-173` (`catch` →
  `decode-error`); `src/app/api/component-library/images/route.ts:238-240`
  (maps `decode-error` → 400 "Could not decode image safely").
- **What:** when provider is `cloudflare-images` and the binding hiccups (auth,
  rate-limit, transient 5xx), the catch collapses ALL failures to `decode-error`,
  the route returns a misleading client-side "bad image" 400, and there's **no
  fallback to `sharp`** (the function returns immediately without trying Node).
  By contrast, when provider is NOT `cloudflare-images`, `loadSharp()` is tried.
  The asymmetry means a Cloudflare Images outage fails uploads hard with a
  confusing error rather than degrading. (No cost leak — IMAGES is used
  transcode-and-return-bytes only, no stored copies: `server-image-processing.ts:
  125-174`, `.input().transform().output()`.)
- **Recommended surface:** on IMAGES binding failure, fall back to `sharp`;
  distinguish binding errors from genuine decode errors in the status.

### Defenses confirmed (positive record)

- **DLQ IS configured** for the upload-jobs queue (`wrangler.jsonc:98`) — corrects
  any assumption there's no DLQ. Poison messages are contained to 3 attempts then
  DLQ'd and do NOT block their batch (`upload-job-queue.ts:341,373,389`).
- **IMAGES binding stores no copies** — used only for on-the-fly
  `input/transform/output` transcoding (`server-image-processing.ts:125-174`,
  `provider-proof-router.ts:146-150`); the durable store is R2 only. No Cloudflare
  Images per-image-storage cost leak.
- **R2 delete of missing keys is a no-op** — so the never-draining backlog
  (BUG-OPS-15) is *effectively* idempotent at the storage layer (no double-free
  crash), even though the backlog + audit events accumulate.

### BUG-SEC-07 [P2] — images GET skips the editor gate (asymmetry vs POST/DELETE + attachments)

- **Location:** `src/app/api/component-library/images/route.ts` — GET handler
  (`:174-193`) requires session + workspace match (`parsedPath.workspaceId !==
  workspace.id`, `:180`) but does NOT call `canManageLibrary`; POST (`:202`) and
  DELETE (`:314`) DO. Contrast `attachments/route.ts` GET (`:393`) which calls
  `canManageLibrary`.
- **What:** any authenticated workspace member (including a `viewer`) can GET
  any image path whose first segment is the workspace id, by guessing/
  enumerating the `userId/` segment. Cross-workspace is blocked. Low impact
  (library images are shared workspace content) but inconsistent with the editor
  gate applied everywhere else.
- **Recommended surface:** add `canManageLibrary` to the images GET, OR document
  that images are intentionally workspace-shared-readable.

- **Location:** `src/app/api/component-library/images/route.ts` — GET handler
  (`:174-193`) requires session + workspace match (`parsedPath.workspaceId !==
  workspace.id`, `:180`) but does NOT call `canManageLibrary`; POST (`:202`) and
  DELETE (`:314`) DO. Contrast `attachments/route.ts` GET (`:393`) which calls
  `canManageLibrary`.
- **What:** any authenticated workspace member (including a `viewer`) can GET
  any image path whose first segment is the workspace id, by guessing/
  enumerating the `userId/` segment. Cross-workspace is blocked. Low impact
  (library images are shared workspace content) but inconsistent with the editor
  gate applied everywhere else.
- **Recommended surface:** add `canManageLibrary` to the images GET, OR document
  that images are intentionally workspace-shared-readable.

### Auth/session surface: CONFIRMED robust (positive record)

- **Per-action session validation is uniform + mandatory** across all 30+ library
  actions + 4 API routes (`ensureDefaultWorkspace` + `requireCurrentUserContext`).
- **No stale-session window:** `disableCookieCache: true`
  (`better-auth-cloudflare.ts:318`) + `cookieCache.enabled: false` (`:201-203`)
  → every request hits D1; revocation is immediate on next request.
- **Membership is probed per-call** (`isWorkspaceEditorInD1`/`isWorkspaceMemberInD1`
  raw D1 SELECT each call); no cross-request membership cache → removal takes
  effect next request.
- **CSRF:** Next.js Server Action origin checks are NOT disabled
  (`next.config.ts` has no `serverActions.allowedOrigins`/`csrf` key).
- **No client-supplied secrets** in any library action body (grep
  `token|secret|apiKey` = empty); the AI draft HMAC token is correctly confined
  to `/api/ai/package-builder` with `timingSafeEqual` + expiry + binding.
- **No XSS-to-cookie-theft:** zero `dangerouslySetInnerHTML` across the library
  render surface (user-typed text renders as React text children → auto-escaped).
- **Cookie scope:** relies on Better Auth defaults (HttpOnly/SameSite=Lax/Secure)
  — correct today; P3 note to pin explicit `cookieOptions` so a BA upgrade can't
  silently weaken them.

### BUG-UX-07 [P3] — a11y: bulk-archive progress not announced; assertive live regions never used; virtualized table is 500 Tab stops

- **Location:** bulk-archive progress (`ComponentLibraryManager.tsx:2583-2619`)
  sets `archiveComponentState` but binds no live region to it; only terminal
  success via the `polite` `<output>` at `:1849`. `aria-live="assertive"` used
  **zero times** in library surfaces (grep-confirmed). Virtualized table rows
  are each `tabIndex={0}` (`:1154`) with no `role="grid"`/roving-tabindex pattern
  → 500 Tab stops.
- **What:** during a long bulk archive (up to 500 items) there's no "Archiving
  12 of 500…" announcement; errors only use `polite`; keyboard users tab through
  every row of a large table. Detail in v6 a11y deep-dive §B4/§B5.
- **Recommended surface:** bind an `aria-live` region to
  `archiveComponentState`; use `assertive` for operation-failure; adopt the
  grid/roving-tabindex pattern for the virtualized table.

- **Location:** bulk-archive progress (`ComponentLibraryManager.tsx:2583-2619`)
  sets `archiveComponentState` but binds no live region to it; only terminal
  success via the `polite` `<output>` at `:1849`. `aria-live="assertive"` used
  **zero times** in library surfaces (grep-confirmed). Virtualized table rows
  are each `tabIndex={0}` (`:1154`) with no `role="grid"`/roving-tabindex pattern
  → 500 Tab stops.
- **What:** during a long bulk archive (up to 500 items) there's no "Archiving
  12 of 500…" announcement; errors only use `polite`; keyboard users tab through
  every row of a large table. Detail in v6 a11y deep-dive §B4/§B5.
- **Recommended surface:** bind an `aria-live` region to
  `archiveComponentState`; use `assertive` for operation-failure; adopt the
  grid/roving-tabindex pattern for the virtualized table.

### BUG-VA-03 [P2] — image metadata lost on re-edit

- `AddComponentModal.tsx:569-580` (`toExistingVariantImageDraft`) discards
  `bucket/path/thumbnailStoragePath/imageMetadata` on edit-hydrate. A re-edit
  that changes only the label and saves will overwrite the stored image paths
  with empty strings. Data-loss-on-re-edit. Detail in `04` §5.

### BUG-VA-04 [P2] — non-atomic serial writes in `createCostLibraryComponent`

- `actions.ts:1294-1384`: INSERT item → serial `for` loop of
  `upsertComponentPriceOptionInD1` per variant → UPDATE
  `active_price_option_id` → `insertComponentVersion`, no transaction, no
  rollback. A failure on variant 3 orphan-commits the item + first two variants.
  Same non-atomicity in `updateCostLibraryComponent` and
  `upsertCostLibraryComponentPriceOption`. Detail in `04` §6.

### BUG-VA-05 [P2] — optimistic update reconciliation by label is fragile

- `AddComponentModal.tsx:1333` (`buildOptimisticItem`) matches draft variants to
  server-returned `priceOptions` by `option.label === entry.label`. Duplicate
  labels (which validation permits) → wrong persisted id or a dangling
  `optimistic-` prefixed id.

### BUG-VA-06 [P2] — optimistic update drops miscCost/pricingSource/confidence/sourceUrl/notes

- `AddComponentModal.tsx:1337-1371` hardcodes `miscCost: 0`,
  `pricingSource: null`, etc. regardless of input/server truth. Until a full
  refetch, the UI shows zero misc cost + no pricing provenance.

### BUG-VA-07 [P2] — race on concurrent default mutation

- `actions.ts:1038-1050`: `upsertComponentPriceOptionInD1` clears sibling
  defaults in a separate statement before the upsert, no transaction. Two
  concurrent upserts for different variants on the same item can interleave →
  both end `is_default=1`. `validatePriceOptions` runs only on the in-memory
  input array, not stored rows.

### BUG-UX-01 [P1] — Overview route skeleton/reality divergence + dead-end body

- `src/app/workshop/library/loading.tsx:7-61` paints an elaborate skeleton
  (search row, 6 component cards, 4 template rows, health-line) but
  `LibraryOverview.tsx:7` renders a completely empty `<div>`. The skeleton's own
  comment says it "mirrors LibraryOverview … Components/Templates/health line" —
  it describes a previous design. First-user sees a rich loading state vanish
  into a blank canvas with no orientation (no "Welcome," no CTA). Detail in `05`
  §8.
- **Recommended surface:** either restore real Overview content (wire the
  already-built `RecentComponentCard`) or replace the skeleton with one matching
  reality + add an in-body orientation panel. Owner decision; the skeleton
  divergence + dead-end body are almost certainly not intended.

### BUG-TM-02 [P2] — `insertTemplateIntoTemplate` non-atomic across node+row insert

- `template-editor-actions.ts:1009, 1027-1038`: node insert + row insert are
  separate `runBatch` calls with no DB transaction; compensating delete only
  fires on row-insert failure, not node-insert partial failure. Detail in `06`
  §5.

### BUG-UX-02 [P2] — drag-only folder reorder + component-move (no keyboard path)

- `LibraryFolderTree.tsx:602-624` (folder reorder) and `:579-600`
  (component→folder move) have no keyboard alternative, violating the project's
  own "every drag has a non-drag path" rule codified at
  `TemplatesBrowseManager.tsx:407-412` (which templates honors via "Move to
  group…"). Detail in `05` §3/§4.

### BUG-UX-03 [P2] — reduced-motion unhandled in the library surface

- Grep for `prefers-reduced-motion`/`prefers-reduced-transparency` across
  `library/**` + `component-library-manager/**` = zero hits, yet the surface
  uses card hover scale (`ComponentLibraryManager.tsx:795,805`), caret rotation
  (`TemplateEditorSheet.tsx:372`), row transitions. DESIGN.md (`:586`) mandates
  it. (A global stylesheet override may exist outside these files —
  unverifiable from source.) Detail in `05` §4.

### BUG-UX-04 [P2] — templates-browse source dock hard-hidden below `lg`

- `TemplatesBrowseManager.tsx:1088`: `EstimateRightSidebar` is `hidden … lg:flex`
  with no drawer fallback (unlike the inspector, which uses `ResizableSidePanel`).
  Below 1024px the entire source dock disappears. Detail in `05` §5.

### BUG-UX-05 [P2] — a11y: no skip-to-main-content, no library landmark hierarchy, duplicate `<main>` in modal

- **Location:** one `<main aria-label="Workshop">` for ALL workshop routes
  (`WorkshopShell.tsx:81`); `WorkshopRouteHeader.tsx` has no `role`/`<header>`
  landmark (grep empty); no skip-to-main-content link anywhere in
  `WorkshopShell.tsx`/`WorkshopRouteHeader.tsx`/`library/layout.tsx`;
  `AddComponentModal.tsx:1682` renders `<main role="form">` inside a modal → a
  second/duplicate `<main>` with a conflicting role.
- **What:** beyond the ARIA roles `05` already covered (tablist/tabpanel/tree/
  dialog traps), the landmark structure is weak: a keyboard user must tab
  through the entire sidebar + title bar on every navigation (no skip link); the
  library has no banner/navigation landmark of its own; the add-component modal
  opens a second `<main>` which AT announces as a competing landmark.
- **Impact:** keyboard + screen-reader navigation fatigue; landmark-based AT
  navigation ("jump to main") is unreliable (two mains when modal open). Detail
  in v6 a11y deep-dive §B1.
- **Recommended surface:** add a skip-to-main-content link; remove the
  `<main role="form">` from `AddComponentModal` (use `<form>` or a plain
  `role="form"` div); give `WorkshopRouteHeader` a `role="banner"` or
  `<header>`.

### BUG-UX-06 [P2] — a11y: template-editor route has no `<h1>`; ⌘K not discoverable by AT

- **Location:** `LibraryTitleBarClient.tsx:26-88` renders a breadcrumb `<nav>`
  (no heading) when `isTemplateEditorRoute`; the `<h1>Library</h1>` at `:94` is
  only the else branch → `/workshop/library/templates/[templateId]` has **zero
  `<h1>`**. Separately: **zero `aria-keyshortcuts`** in the entire `src/`
  (grep-confirmed) → the ⌘K shortcut is invisible to screen readers
  (`LibraryOverviewSearch.tsx:283`, `LibraryTabsLayoutClient.tsx:197`).
- **What:** the template editor route (a primary destination) has no top-level
  heading for AT heading-quick-nav. The ⌘K shortcut — the primary search
  affordance — is shown visually but not exposed programmatically to AT.
- **Impact:** screen-reader users can't heading-navigate the editor or discover
  the search shortcut. Detail in v6 a11y deep-dive §B2/§B6.
- **Recommended surface:** add an `<h1>` (sr-only ok) for the template name on
  the editor route; add `aria-keyshortcuts="Meta+K"` to the search inputs.

### BUG-DOM-19 [P2] — AI-created components have no UI provenance badge; `created_by` masks AI origin

- **Location:** provenance in `metadata_json` at `apply.ts:1671-1691` (rich
  `aiPackageBuilder` block); but `created_by` set to the **human approver's**
  userId (`:1705,1825`), and the manager card badge
  (`ComponentLibraryManager.tsx:718-754`) only reflects `lifecycleState`, not
  provenance.
- **What:** AI-generated components are well-tracked in `metadata_json` but
  invisible in the UI and masked in the `created_by` actor column. A librarian
  cannot tell at a glance which components were AI-created vs human-created; the
  `ai_package_apply_commands` audit table exists but isn't surfaced.
- **Impact:** trust + auditability gap — an AI-introduced error (compounding
  BUG-DOM-18) is hard to attribute or filter out. Detail in v6 AI deep-dive §A4.
- **Recommended surface:** add an `is_ai_generated` column or a UI badge sourced
  from `metadata_json.aiPackageBuilder`; set `created_by` to a system/AI user (or
  add an `created_by_kind` discriminator); surface the audit table in the
  library manager.

### BUG-DOM-20 [P2] — prompt-injection: AI reads untrusted library data with no structural isolation

- **Location:** `src/lib/ai/package-builder/provider.ts:239-246,277` (library
  data serialized into the prompt via string concatenation; instruction-level
  defense only); model output `roomNames`/`searchTerms` echoed into
  `estimate_nodes.name`/`estimate_row_items.material` (`draft.ts:855,1339`).
- **What:** user-typed supplier names/descriptions/brands flow into the LLM
  prompt with only prompt-level "treat as untrusted data" instructions + a strict
  JSON output schema as backstop — no delimiter/quoting/structural isolation of
  the untrusted context. A supplier name containing a newline + "User message:"
  could re-anchor the prompt. The model's `roomNames`/`searchTerms` output then
  persists as node/row material text **without the human-path sanitization**
  (compounding BUG-DOM-18).
- **Impact:** a malicious supplier name in the library could influence the AI to
  emit a `roomName`/`searchTerm` that becomes a persisted row — indirect
  persistence of injected content. Low likelihood (temp 0.1, strict output
  schema) but the data path is real. Detail in v6 AI deep-dive §A5.
- **Recommended surface:** structurally isolate untrusted context (XML/tag
  delimiters + explicit end marker); run the `roomNames`/`searchTerms` output
  through `normalizeQuickAddText` + formula-prefix rejection before persisting.

### BUG-DOM-02 [P2] — content conversion (packageQuantity) captured but never applied to pricing

- **Location:** stored/read `src/lib/component-library/actions.ts:821-822`;
  `src/lib/repositories/component-library-repository.ts:613-614`; collected in
  `AddComponentModal.tsx:869,1026,1120,1353,1451,1750,2191-2193`. **No pricing
  site divides by it** (grep of estimates/repositories/proposal-export =
  only `types.ts:63` + `repository.ts:613`).
- **What:** a "box of 10 tiles @ ₱1000/box" is priced at ₱1000 × quantity, never
  ₱100/each. Content conversion is metadata-only, not a pricing transform.
- **Impact:** estimators expecting per-each derived pricing are **silently
  mispriced** — a money-correctness bug disguised as an unfinished feature.
  Detail in `07` §2.
- **Recommended surface:** either finish the feature (divide unit cost by
  packageQuantity at pricing time) or stop collecting the input.

### BUG-DOM-03 [P2] — units never validated against the enum

- **Location:** `src/lib/component-library/quick-add-validation.ts:136,149,153,160`
  (only non-empty/≤32/no-formula); no DB CHECK (`migrations/0026:47`).
- **What:** `unit` is free-text; "whatevs" persists. Typos silently break any
  future unit-aware feature (content conversion, coverage math, unit-normalized
  reporting). Detail in `07` §2.
- **Recommended surface:** enum validation at write (server action + DB CHECK
  against `COMPONENT_UNIT_OPTIONS`).

### BUG-DOM-06 [P2] — version column bumped but never used as a guard (last-write-wins + lost audit rows)

- **Location:** `src/lib/component-library/actions.ts:1446,1467-1468,1523,1548-1549,1596,1606-1607`
  (WHERE has no version guard); `:991-1009` (`INSERT OR IGNORE` on versions).
- **What:** two concurrent editors both read `version=N`, both UPDATE
  successfully (WHERE is `id+workspace` only, no row-count check), both compute
  `N+1`; the second version-row INSERT is silently ignored → `current_version_number`
  is `N+1` regardless of how many concurrent edits landed, and the version table
  **loses one editor's snapshot**. Client reads `versionNumber` for display only
  — no stale detection. Detail in `07` §5.
- **Recommended surface:** add `AND current_version_number = ?` + row-count check
  (409 conflict on mismatch), or a client optimistic-concurrency handshake; fix
  the `INSERT OR IGNORE` dedup so contention doesn't lose audit rows.

### BUG-DOM-07 [P2] — audit trail structurally incomplete

- **Location:** `src/lib/component-library/actions.ts` (CREATE `writeHistory:false`
  `:1341`; `updateCostLibraryComponent` bypasses price_history + state_history
  `:1437-1505`; bulk archive writes nothing — see BUG-DOM-05).
- **What:** (1) initial price never recorded in `price_history`; (2)
  `updateCostLibraryComponent` — the un-archive path via the modal dropdown —
  bypasses both `price_history` and `state_history`; (3) `change_reason`
  frequently defaulted to hardcoded strings (`AddComponentModal.tsx:540,562`),
  bulk archive captures none; (4) audit tables are CASCADE-deletable + mutable
  (`0028:47,68,95,112`); (5) `operation_key` time-based dedup can lose one of
  two same-timestamp changes. Detail in `07` §6.
- **Recommended surface:** route lifecycle-affecting changes through
  `changeCostLibraryComponentLifecycleState`; write `price_history` on create;
  make bulk archive write audit rows; make audit tables append-only (trigger or
  app guard).

### BUG-DOM-08 [P2] — zero domain-event telemetry on mutations

- **Location:** `src/lib/component-library/library-telemetry.ts:1-43` (event set
  is UX/anti-abuse only); no telemetry calls inside `createCostLibraryComponent`,
  `updateCostLibraryComponent`, `changeCostLibraryComponentLifecycleState`,
  `executeBulkArchiveLibraryComponents`, `upsertCostLibraryComponentPriceOption`.
- **What:** missing `component_created/updated/archived/price_changed/lifecycle_changed/
  library_component_searched`. Create/edit/archive/delete/price-change are
  completely blind at the telemetry layer. Detail in `07` §7 / `08` §3.

### BUG-OPS-01 [P2] — LIKE-based search won't scale past ~5-10k (no FTS5 on D1)

- **Location:** `src/lib/component-library/actions.ts:2905-2944`
  (`searchLibraryOverview`); `helpers.ts:102-125` (`searchComponents`).
- **What:** the only server-side search does leading-wildcard `LIKE %x%` on 3
  columns with `COALESCE` wrapping → cannot use a B-tree index, forces full
  scan per keystroke per workspace. D1 has no FTS5. Perf budget only targets
  1 000 items, not the 10k cap. Detail in `08` §1.
- **Recommended surface:** app-level `search_tsv` column + covering index (near-
  term), or n-gram index table; Postgres+pg_trgm if the library store migrates
  off D1.

### BUG-OPS-03 [P2] — action errors lose context; some swallowed

- **Location:** `src/lib/component-library/action-errors.ts:8-18`
  (`throwActionError` logs only `user_message` — no workspace/user/action/SQL);
  swallows at `actions.ts:516,537,556`; `runBatch` `:159-161` discards
  per-statement errors.
- **What:** errors are hard to triage — no workspace/user/action context on the
  log record; preferences/telemetry saves silently fail; D1 batch failures lose
  per-statement detail. Detail in `08` §3.

### BUG-OPS-06 [P2] — multi-user staleness (5-min window, no refetch/realtime)

- **Location:** `LibraryPageClient.tsx:107-113`; `TemplatesBrowsePageClient.tsx:79-84`
  (5-min `staleTime`, no `refetchOnWindowFocus`/`refetchInterval`/realtime).
- **What:** shared-workspace product; User B's library view is stale up to 5 min
  after User A edits — even on tab refocus. No Pusher/Supabase Realtime/polling.
  After 5 min the refetch pulls the full unbounded dataset (BUG-OPS-02/PERF-01).
  Detail in `08` §5.

### BUG-OPS-07 [P2] — folder delete has no size cap / no preview hash

- **Location:** `src/lib/component-library/actions.ts:1835-1859` (`deleteLibraryFolder`).
- **What:** unlike bulk archive (500-id cap + hash gate), folder delete is
  one-click with no confirmation. Semantics are safe-by-orphan (components
  unassigned, not deleted), but a 10k-row UPDATE with no preview is an ops risk.
  Detail in `08` §6.

### BUG-DOM-09 [P2] — VAT is export-only, hardcoded, not configurable, not shown in the estimate

- **Location:** `src/lib/proposal-export/settings.ts:20-21,42-45`;
  `create-proposal-workbook.ts:413-470`; **absence** of `vat_*` columns in
  `migrations/` and VAT term in `src/lib/estimates/estimate-row-total.ts`.
- **What:** 12% Philippine VAT is a hardcoded default in proposal-export only;
  not stored per-workspace/proposal in D1; not surfaced in the estimate/library
  UI (estimators don't see the tax-loaded total while building the bid); no
  tax-code field on components (vatable/zero-rated/exempt); `vatMode:"included"`
  zeroes the VAT line instead of back-calculating the component. Detail in `07`
  §8.1.
- **Impact:** a workspace cannot configure VAT for zero-rated/exempt clients;
  estimators don't see the committed tax-loaded number until export; BIR-compliant
  invoices that must show the VAT component of an inclusive price can't.
- **Recommended surface:** workspace/proposal VAT setting in D1; show
  VAT-inclusive total in estimate UI; tax-code field on components; back-calc
  for included mode.

### BUG-DOM-12 [P2] — no rate limiting on library server actions

- **Location:** absence in `src/lib/component-library/actions.ts` +
  `template-editor-actions.ts`; the reusable limiter at
  `src/lib/estimates/action-rate-limit.ts` (used by `estimates/actions.ts:9`,
  `collaboration`, `publication`, `auth`).
- **What:** every library mutation (create/update/archive/duplicate/reorder,
  template node ops, folder CRUD) has no rate limit. `grep
  "action-rate-limit" src/lib/component-library/` = empty. Every comparable
  mutation surface rate-limits; the library does not. Detail in `07` §9.
- **Impact:** a scripted/compromised editor can fire unbounded mutations —
  Worker CPU/CPU-time exhaustion, D1 write amplification, faster path to the
  quota. Combined with BUG-DOM-08 (no mutation telemetry), the abuse is
  invisible.
- **Recommended surface:** reuse `assertEstimateActionRateLimit` with a
  `component-library-mutation` surface key; apply to the create/update/archive/
  duplicate/reorder actions.

### BUG-DOM-10 [P3 / product-scope] — no retention/retainage or progress-billing model

- **Location:** absence across `src/` + `migrations/` (grep for
  `retainage|progress_billing|payment_application` excluding data-privacy =
  empty).
- **What:** no feature exists for progress billing (billing against milestones/
  %-complete), retainage withholding (standard 10% PH construction, released at
  handover + defect-liability end), or payment-application scheduling. The
  estimate/proposal is lump-sum only. Detail in `07` §8.2.
- **Impact:** for PH contractors managing active projects, the product can't
  model the contract's payment structure — a competitive gap vs dedicated
  construction-billing tools.
- **Recommended surface:** product decision — is progress billing in MVP scope?
  Document as a known limitation if not.

### BUG-DOM-11 [P3] — contingency vs adjustment semantics confusing/overlapping

- **Location:** `migrations/0024:56-62`; `estimate-row-total.ts:33`;
  `template-editor-model.ts:10` (legacy bridge);
  `proposal-export/settings.ts:19,41` (project-level contingency).
- **What:** two row-level percentage fields (`contingency_percentage` 0–100,
  `adjustment_percentage` -100..100) with a legacy bridge that reinterprets one
  as the other for rows without `quantity_base`; plus a separate project-level
  export contingency. The money oracle only applies `adjustment_percentage`;
  row-level `contingency_percentage` is stored but folded into adjustment.
  Estimators see two overlapping fields and can't confidently predict the math.
  Detail in `07` §8.3.
- **Recommended surface:** pick one canonical row-level adjustment field;
  deprecate or clearly document `contingency_percentage`; distinguish row vs
  project contingency in the UI.

### BUG-DOM-13 [P3] — no cost-type separation (partial material/labor in metadata_json)

- **Location:** no `cost_type` column on `cost_library_items` (`migrations/0026:
  35-65`) or `estimate_row_items` (`migrations/0015:11-34`); partial labor split
  in `estimate-row-total.ts:40,163,177,196,212` + `publication/actions.ts:714` +
  `proposal-export/create-proposal-workbook.ts:85-86`.
- **What:** no `cost_type` enum; 2 of 4 canonical construction cost types
  (material + labor) are loosely modeled via `metadata_json.labor_rate`;
  equipment + subcontractor are entirely absent. The labor split is undocumented
  and fragile (same class as DATA-DRIFT-01). Detail in `07` §10.
- **Impact:** PH contractors who track labor-vs-material for wage compliance,
  productivity analysis, or subcontractor management cannot represent it
  cleanly.
- **Recommended surface:** add a `cost_type` enum (material/labor/equipment/
  subcontractor); promote `labor_rate` to a first-class column.

### BUG-DOM-14 [P2] — duplicate detection is client-side only (bypassable)

- **Location:** client index `AddComponentModal.tsx:366,803-814` (keyed on
  name+category+supplier/brand), "acknowledge-and-proceed"
  (`duplicateAcknowledged`, `:736`); **absence** in `src/lib/component-library/
  actions.ts`.
- **What:** the server action `createCostLibraryComponent` has **zero**
  duplicate checks. A scripted client (or any non-modal caller: API, AI copilot,
  future import) bypasses the modal's in-memory index and creates dupes silently.
  Compounds BUG-DOM-03 (no UNIQUE on names). Detail in `07` §11.
- **Recommended surface:** add a server-side duplicate heuristic (normalized
  name+category+supplier within workspace) in
  `createCostLibraryComponent`/`updateCostLibraryComponent`.

### BUG-DOM-15 [P2] — suppliers/brands have no CRUD actions (no merge/rename/delete)

- **Location:** tables `component_suppliers`/`component_brands`
  (`migrations/0028:9-43`, `UNIQUE(workspace_id, normalized_name)`); grep for
  `createComponentSupplier`/`rename`/`merge`/`delete`/`upsert` = **zero** action
  functions.
- **What:** suppliers/brands are auto-populated on component create but have no
  management surface — no rename, no merge duplicates, no delete, no "show all
  components using this supplier." A typo'd supplier ("GROHE" vs "Grohe") lives
  forever and can't be reconciled. Detail in `07` §11.
- **Impact:** data-hygiene rot — the directories accumulate case-variant and
  typo duplicates with no cleanup path, making the library feel untrustworthy
  over time.
- **Recommended surface:** add a supplier/brand management surface (list +
  rename + merge + reassign components + delete-if-unused).

### BUG-SEC-01 [P2] — direct-upload trusts client `contentType`; no magic-byte sniff at finalize

- **Location:** `src/app/api/component-library/attachments/direct-upload/route.ts:208,370-385`
  (create validates `ALLOWED_MIME_TYPES.has(contentType)` on the client-declared
  type only; finalize `validateProviderObjectHead` compares R2-reported
  content-type/size to session, but **neither side inspects bytes**). Compare the
  server-mediated route at `attachments/route.ts:81,458` which DOES `readMagicMime`.
- **What:** combined with BUG-P1-01 (the authz gap), a viewer can upload an
  arbitrary file labelled `application/pdf` into `component-attachments`. The GET
  route's `ALLOWED_MIME_TYPES.has(content_type)` + scan gate still block *serving*
  a non-PDF/XLS content type, but the bytes-on-disk/content-type mismatch is a
  real weakness vs. the server-mediated route.
- **Impact:** a polyglot or mislabeled file can sit in R2 under a trusted
  content-type until scan flags it. Defense-in-depth gap.
- **Recommended surface:** add magic-byte verification at finalize (download head
  bytes + re-run `readMagicMime`), mirroring the server-mediated route.
- **Proof class:** source inspection (grep confirms `readMagicMime` absent from
  `direct-upload/route.ts`; present at `attachments/route.ts:81,458`).

### BUG-SEC-02 [P2] — `pricingSource`/`source_url` have no internal-IP blocklist (latent SSRF)

- **Location:** `src/lib/component-library/quick-add-validation.ts:115-125`
  (`isInvalidPricingSource` checks protocol only); `src/lib/component-library/
  source-url.ts:7-22` (`sanitizeComponentSourceUrl`). No blocklist for
  `169.254.169.254` (cloud metadata), `localhost`, `127.x`, `10.x`, `192.168.x`,
  `.internal`.
- **What:** stored URLs are display-only today (the library never server-fetches
  them — confirmed), so SSRF is NOT exploitable now. But if any future feature
  server-side fetches `pricingSource` (price verification, favicon proxy, AI
  enrichment), stored internal URLs become an instant SSRF vector.
- **Impact:** latent, not active. Worth pre-emptive hardening.
- **Recommended surface:** block private/link-local IP ranges + require a
  resolvable public hostname in `sanitizeComponentSourceUrl`.

### BUG-SEC-03 [P3] — `pricingSource` accepts non-URL free-text despite "URL" labeling

- **Location:** `src/lib/component-library/quick-add-validation.ts:117` —
  `isInvalidPricingSource` returns `false` (valid) for any value that doesn't
  match the URL scheme pattern. The field is labeled "source URL" but effectively
  free-text.
- **Impact:** defense-in-depth weakness; not a direct vuln. Inconsistent
  validation vs. the UI labeling.

### BUG-DOM-23 [P2] — `link_state = 'source-changed'` is a read-only phantasm (never written server-side)

- **Location:** grep for `link_state = 'source-changed'` / `linkState: "source-changed"`
  as a **write** across `src/` = **zero** (the string appears only in type defs +
  read-side comparisons: `source-trust-model.ts:300,431,510`,
  `evaluate-estimate-health.ts:58`, `cells-model.ts:64`). Writers only set
  `'linked-clean'` (`express-promotion-actions.ts:443`),
  `'linked-overridden'` (`actions.ts:3473`), `'detached'`
  (`d1-action-client.ts:2788`), `'unlinked'` (`d1-action-client.ts:2679`).
- **What:** the entire "Source changed" trust chip (`source-trust-model.ts:90`
  label "Source changed"), the health evaluator
  (`evaluate-estimate-health.ts:58` → warning), and the template-dependency
  health gate (`source-trust-model.ts:510-520`) render UI for a **state no server
  code path can ever produce**. Compounds BUG-DOM-04 (no outbound propagation —
  which is *why* no writer exists).
- **Impact:** the trust UI promises divergence detection that does not exist.
  Estimators see "Local override" forever; they never get a "Source changed"
  signal even when the library price has materially diverged after their override.
- **Recommended surface:** add a server-side writer that sets `'source-changed'`
  when a library edit/archive touches a referenced component (ties to the
  BUG-DOM-04 outbound-propagation fix); OR remove the dead "Source changed" UX
  until the writer exists.
- **Proof class:** source inspection (grep confirms zero write sites after
  filtering read-side/type/comparison usage).

### BUG-OPS-10 [P2] — supplier names, pricing URLs, unit costs, attachment paths not redacted in logs (PII-rule violation)

- **Location:** `src/lib/observability/redact.ts:9-25` (`NEVER_LOG_KEYS` =
  credentials only), `:27` (`HASHED_ONLY_KEYS` = emails only), `:50-103`
  (`redactMessage` scrubs emails/Bearer/JWT/share-tokens/invite-tokens only). No
  coverage for `supplier`, `pricing_source`, `source_url`, `unit_cost`,
  `attachment` paths. Violates `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:38,122`
  ("No … estimate costs … in error payloads or log messages").
- **What:** a library error that interpolates a supplier name, pricing URL, or
  unit cost into `message` or `context` ships to the dev log / Workers Logs
  verbatim. Library context objects routinely carry these (`d1-action-client.ts:
  2190` `row_context: {material, supplier}`; `express-promotion-actions.ts:375`
  supplier snapshots). Only the incident-alert *webhook* path sanitizes
  attachment paths (`operational-alerts.ts:164-181`), not the general logger.
- **Impact:** PII/commercial-sensitive data leak into observability surfaces.
- **Recommended surface:** extend `NEVER_LOG_KEYS`/`redactMessage` to cover
  supplier/brand names, pricing-source URLs, unit costs, attachment paths.

### BUG-OPS-11 [P2] — library surfaces have no alert scenarios; errors never auto-create incidents

- **Location:** `src/lib/observability/alert-scenarios.ts:49-246` (7 scenarios
  S-01..S-07, none for library surfaces); `recordOperationalIncidentInD1`
  (`incident-record.ts:8-60`) has **zero callers** outside its own definition;
  library telemetry events (`library-telemetry.ts:1-43`) are emitted via
  console.warn-style seams, not wired to alerts.
- **What:** bulk-archive failure, quota hit, scan-override approval, AI
  package-apply failure, express-promotion failure — none trigger an alert or
  auto-create an incident. Incidents are human-declared only. Combined with
  BUG-OPS-03 (action errors lose context) and BUG-DOM-08 (no mutation telemetry),
  the library is operationally blind on failures.
- **Impact:** silent failures in the highest-volume lifecycle operations.
- **Recommended surface:** add alert scenarios for bulk-archive/quota/
  scan-override/AI-apply/promotion; wire library errors to
  `recordOperationalIncidentInD1`.

### BUG-OPS-12 [P3] — `/workshop/library` route has no CI perf budget (gate excludes it)

- **Location:** `.github/workflows/ci.yml` runs `bun run test:e2e:perf` against
  `e2e/route-transition-performance-budgets.json` (routes: public, protected-
  redirect, slow3g, workshop-transition — **grep "library" = zero**) +
  `scripts/check-route-transition-readiness.ts`. The perf doc
  (`27-performance-budget-and-regression-gates.md:231`) itself flags "LIMITED …
  No bundle-size CI budget."
- **What:** the library route (which the perf doc claims was optimized 618KB→
  231KB at `:215`) has no enforced CI budget. Regressions caught only by manual
  `ANALYZE=true bun run build`.
- **Recommended surface:** add `/workshop/library` to the budgets JSON + readiness
  gate.

### BUG-DOM-16 [P2] — currency mismatch: projects default to 'USD', library renders PHP-only

- **Location:** `projects.currency_code TEXT NOT NULL DEFAULT 'USD'`
  (`migrations/0015:3`); `estimates.currency_code DEFAULT 'PHP'` (`0029:2`);
  account `default_currency DEFAULT 'PHP'` (`0005:59`); library `currency
  DEFAULT 'PHP'` (`0026:85`); new-project form offers 20 currencies
  (`new-project-form-currency-options.ts`); library renders PHP-only
  (`formatPeso`).
- **What:** three different default currencies across the schema. The new-project
  form lets a user pick USD/EUR/SGD/etc. But the library surface renders **all**
  prices as PHP with no awareness of the project's currency. A USD project
  pulling a component gets a ₱-prefixed price with no conversion and no warning.
  Compounds BUG-OPS-04. Detail in `07` §11.
- **Impact:** silent currency mismatch on cross-currency estimates — a money-
  correctness bug. For a product whose new-project form explicitly offers
  USD/EUR/SGD/etc., this will hit any non-PHP project.
- **Recommended surface:** pick one source of truth for currency (project-level,
  flowing into estimate + library reads); render in the project's currency or
  add explicit conversion; align the `projects.currency_code` default with the
  PH-first posture (PHP).

### BUG-DOM-17 [P3/marketing] — change orders marketed on landing page but no backing model

- **Location:** landing marketing `landing-v3/ArchestimatorLandingPage.tsx:325,
  383, 385`; `landing-new/NewLandingPage.tsx:152,196`; **absence** of any
  `change_order`/`variation_order`/`amendment` table or entity in
  `migrations/*.sql`.
- **What:** the landing pages market "Change orders without the paper trail" and
  "change orders price themselves later" but there is **no change-order /
  variation-order entity** in the schema or app logic. Same
  marketing-overpromises shape as BUG-OPS-08 (exports). Detail in `07` §11.
- **Recommended surface:** either build a lightweight variation/change-order
  entity, or remove the landing-page claim until the feature ships.

### §12 Niche features — investigated and recorded as absent (deferred-future scope)

> Definitive grep-confirmed record in `07` §12. Eight niche construction
> features (insurance/bonding, lien waivers, certified payroll, LEED/
> sustainability, BIM/IFC/Revit, RFIs/submittals, overhead/profit/markup,
> price-escalation clauses) are **absent** from the codebase and **deferred-
> future scope** for a PH-first pre-launch estimating product — none are
> MVP-blocking. Recorded so the pack can say each was checked and to prevent
> re-investigation.

## Performance findings

### PERF-01 — workspace-wide paged table scans to filter by itemIds

- `src/lib/repositories/component-library-repository.ts:327-351`
  (`collectComponentLibraryWorkspaceRowsForItems`). Pages
  `SELECT * WHERE workspace_id = ? LIMIT 1000 OFFSET n` over 6 tables
  (`cost_library_item_price_options`, `cost_library_item_variant_cost_entries`,
  `cost_library_item_versions`, `cost_library_item_price_history`,
  `cost_library_item_state_history`, `cost_library_item_variant_attachments`)
  then filters in JS. For a workspace with thousands of components this is a
  6× full-table-scan waterfall per cold load. The bounded path (`:353-369`) does
  the right thing with `WHERE item_id IN (...)`.
- **Fix:** always use the `IN (...)` path when `itemIds` is non-empty
  (`loadCurrentWorkspaceComponentRowsLibraryAppPath` always supplies
  `loadedItemIds`).

### PERF-02 — `cost_library_items` sort-scan under `lifecycle_state <> 'archived'`

- Repo runs `WHERE workspace_id = ? AND lifecycle_state <> 'archived' ORDER BY
  updated_at DESC, id ASC`. Existing
  `idx_cost_library_items_workspace_lifecycle (workspace_id, lifecycle_state,
  updated_at DESC)` can't use a range on the `<>` predicate → sort scan. No
  library index was added in `0031` or `0050`.
- **Fix:** partial index `WHERE lifecycle_state <> 'archived' ON (workspace_id,
  updated_at DESC, id)`.

### PERF-03 — `getLibraryOverviewAppPath` 12-query fan-out + unbounded discontinued scan

- `component-library-repository.ts:1713-1910` — 12 parallel D1 round-trips per
  overview render + `SELECT id ... WHERE lifecycle_state = 'discontinued'` with
  no LIMIT (`:1806-1810`). Bounded by workspace size but worth a cap.

### PERF-04 — unbounded `SELECT *` on templates

- `loadCurrentWorkspaceEstimateTemplatesAppPath:1300-1307` — all templates +
  nodes + row_items `SELECT * WHERE template_id IN (...)`, no LIMIT. Heavy at
  the 2000-template cap. Recent-templates path caps at 5; full load does not.

### PERF-05 — `searchLibraryOverview` 3 LIKE patterns per row

- `actions.ts:2914-931` — `LOWER(name) LIKE … OR LOWER(supplier) LIKE … OR
  LOWER(brand) LIKE …` (leading `%`). Result capped at 6/3 but scan cost grows
  with workspace size. Consider FTS if this surface gets heavy use.

## Data / schema drift

### DATA-DRIFT-01 — `ComponentPriceOptionRow` type vs D1 columns — RESOLVED (not a bug)

- `component-library-repository.ts:145-182` declares `sku`,
  `variant_description`, `package_quantity`, `dimension_length/width/height`,
  `mass`, `image_bucket/image_path`, `source_url`, `active_cost_entry_id`, etc.
  D1 `cost_library_item_price_options` (`0026:77-98`) has none of these as real
  columns, and no migration ALTERs them in.
- **Resolution (v2):** variant data persists INTO `metadata_json` via
  `priceOptionSnapshot` (`actions.ts:909-944`, bound at `:1090`) and reads BACK
  OUT of `metadata_json` via `normalizePriceOption` (`repository.ts:580-632`)
  with a column-first, metadata-fallback ladder. ORDER BY uses
  `json_extract(metadata_json, '$.variantSortOrder')` (`repository.ts:1162`).
  The type is a **tolerant read model** over the JSON-enriched shape, not a
  missing-column bug. The round-trip works. Detail in `04` §3.
- **Latent fragility (not data loss today):** the typed columns are never
  written by the actions layer — they exist only as a fallback ladder that
  always falls through to `metadata_json`. If a future writer sets a stale
  column while `metadata_json` holds truth, the column wins and the blob is
  silently shadowed. Recommend documenting the JSON-blob contract in code.

### DATA-02 — missing UNIQUE constraints (name uniqueness)

- `cost_library_items` — no `(workspace_id, name)` or `(workspace_id,
  library_folder_id, name)`. `estimate_templates` — no `(workspace_id, name)`.
  `cost_library_item_price_options` — no `(item_id, label)`. Folders + suppliers
  + brands DO have name uniqueness. Inconsistent → duplicate names allowed.

### DATA-03 — soft-FK orphan risks

- `upload_assets.upload_session_id` (0010:50), `upload_events.upload_session_id`
  (0010:130), `cost_library_item_variant_attachments.price_option_id` (0022:3) +
  `.item_id` (0022:4), `cost_library_items.active_price_option_id` (0026:54),
  `cost_library_items.source_estimate_row_item_id` (0026:56),
  `estimate_template_row_items.source_library_item_id` (0024:42),
  `.category_node_id` (0024:47), `.supplier_id` (0024:48),
  `estimate_row_items.source_library_item_id` (0021:4) — no FKs; can orphan
  (only workspace CASCADE clears them).

## Dead / outdated code

### DEAD-UI-01 — `TemplatePreviewDock.tsx` (component) is dead

- `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx` —
  never imported. Browse flow uses in-column `SelectedTemplatePreview`. **Keep
  `TemplatePreviewDockModel.ts`** (LIVE, consumed by `TemplateGallery.tsx:24`).

### DEAD-UI-02 — `RecentComponentCard.tsx` is dead

- `src/components/workshop/library/overview/RecentComponentCard.tsx` — exported,
  never imported. Overview tab is intentionally empty, so no host. Safe to
  remove when the Overview tab is rebuilt.

### DEAD-UI-03 — dead helper exports in `helpers.ts`

- `src/components/workshop/component-library/helpers.ts` —
  `createDefaultLibraryBundles` (:571), `expandLibraryBundle` (:600),
  `getLibraryBundleTotal` (:616), `exportLibraryItemsToJson` (:463),
  `exportLibraryItemsToCsv` (:487), `parseLibraryCsv` (:409),
  `parseLibraryJson` (:433), `groupComponents` (:169). An unwired CSV/JSON
  import/export + bundle feature set.

### DEAD-UI-04 — `buildComponentLibraryNavigationTree` dead

- `src/components/workshop/component-library/tree/buildLibraryTree.ts:486` —
  re-exported via `tree/index.ts:18` but never consumed. Sibling
  `getLibraryItemsForTreeNode` (:496) is LIVE.

### DEAD-UI-05 — `componentLibraryDatasetVersion` (verify)

- `component-library-repository.ts:2030` — `const` declared at file end; verify
  it's exported/consumed. If not, dead.

### DEAD-UI-06 — `reorderEstimateTemplateRowItems` exported but unused

- `template-editor-actions.ts:889-917` — full authz but no client caller. The
  editor reorders nodes via drag (`moveEstimateTemplateNode`), not row reorder.
  Wire it to a row drag handle or remove. Detail in `06` §7.

### DEAD-UI-07 — template editor read-only branch dead at the only call site

- `TemplateEditorClient.tsx:503-529` renders a read-only dock when
  `!canEditTemplate`, but `templates/[templateId]/page.tsx:23` always passes
  truthy. The `canEditTemplate`/`canEdit` guards across the editor are defensive
  dead code in the current routing. Detail in `06` §7.

### DEAD-SCHEMA-01 — empty `component_category_nodes` + dead `*_category_node_id` columns

- `0037_remove_preloaded_component_categories.sql` purged all rows + NULLed
  references but left the table, its index, and the `*_category_node_id`
  columns on `cost_library_items`, `library_folders`, `estimate_row_items`,
  `estimate_template_row_items`. Repo still queries
  `component_category_nodes` unconditionally
  (`component-library-repository.ts:1121, 1741`). Schema-debt artifact.

### OUTDATED-01 — stale RLS comments

- `component-library-repository.ts:1958-1960` ("RLS keeps cross-workspace ids
  invisible"), `component-library/actions.ts:337` ("defense-in-depth on top of
  the RLS editor-write split"), `:2841` ("RLS-scoped"). No RLS exists — D1/SQLite
  with app-enforced `workspace_id`. Behavior correct; comments misleading.

### OUTDATED-02 — Postgres error-code check

- `src/lib/workshop/group-actions.ts:54-56` — `code === "23505"` (Postgres).
  See BUG-P3-04.

### OUTDATED-03 — `supabase/migrations` variant file

- `supabase/migrations/20260524120322_component_library_variants.sql` is the
  only place the price-option variant columns are defined as real columns. Do
  NOT re-apply; it is migration archaeology (historical provider-exit evidence).
  Relevant only to DATA-DRIFT-01 resolution.

## UX / UI notes

> Full UX/UI + visual-design analysis with prioritized recommendations lives in
> `05-UX-UI-DESIGN-ANALYSIS.md`. Summary below.

- **Overview tab is intentionally empty** (`LibraryOverview.tsx` returns an empty
  div, owner's request), BUT `library/loading.tsx` paints an elaborate skeleton
  (cards/templates/health-line) that doesn't match reality, and the empty body
  has no orientation. This is BUG-UX-01 (P1). The `LibraryOverviewSearch` (⌘K
  combobox) is the only live Overview content. `RecentComponentCard` is dead
  because the host was cleared.
- The three-tab split (Overview / Components / Templates) is well-coordinated;
  active tab is derived purely from `usePathname` (no drift). Tab strip hides on
  the template-editor sub-route.
- Facet filter + source-trust chips + freshness thresholds (90/180 days) are a
  deliberate, modern filtering design. Two parallel filter implementations exist
  (new facet model vs. legacy `filterComponents` in `helpers.ts`) — they serve
  different surfaces (workshop route vs. estimate sidebar), not duplicates.
- The component-library-manager (new) and component-library (legacy estimate
  sidebar) coexist intentionally; not duplicates.
- Accessibility is generally solid: combobox + listbox ARIA on search,
  `role="tablist"/"tabpanel"` (textbook), full tree keyboard nav, `aria-live`
  announcements widely + correctly, Dialog/Sheet focus traps, focus restore on
  close. **Gaps:** drag-only folder reorder/component-move with no keyboard path
  (BUG-UX-02), reduced-motion unhandled in this surface (BUG-UX-03),
  double-click-to-rename undiscoverable, templates-browse source dock hard-hidden
  below `lg` (BUG-UX-04).
- Missing empty states: zero-component workspace, zero-template workspace,
  empty folder, no-results-after-filtering in both bodies (all flagged in `05`
  §2/§9 as P1).
- Design-system reuse is strong (`src/components/ui` primitives throughout);
  typography + theming (`library-surface-class.ts`) compliant + well-factored.
  Minor hand-rolls flagged in `05` §6.
