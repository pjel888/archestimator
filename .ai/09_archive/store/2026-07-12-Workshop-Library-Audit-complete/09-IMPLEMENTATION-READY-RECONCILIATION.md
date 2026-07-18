# 09 — Implementation-Ready Reconciliation & Recommended Actions

> **Status:** `implementation-ready` (audit reconciled against current source).
> **Date:** 2026-07-14.
> **Purpose:** Turn the audit pack into an executable, drift-corrected, lean
> implementation plan. This file supersedes the finding-level recommendations in
> `02` and `03` wherever it cites fresher source evidence. It is the single
> document to read before writing any fix code for this surface.
> **Baseline HEAD (reconciled):** `ad2187d23` (`git rev-parse --short HEAD`).

## How to use this file

- The 2026-07-12 audit is **partially stale**. Source moved after the audit
  (commits `837251941`, `973e15cc4`, `9ee7f9a30`, `ad2187d23`, …) and **fixed 3
  headline P1s** and half-fixed a 4th. Read §A before touching anything.
- §B is the executable unit DAG. Each unit is independently shippable and lists
  its own acceptance evidence, recovery, and the exact file:line it owns.
- §C is the anti-over-engineering / anti-over-testing contract every unit must
  obey. This is binding, not advisory.
- §D is the per-finding recommended-action table (open, fixed, partial, defer).
- No tests, builds, browser QA, or migrations run for this reconciliation
  (`NOT_REQUIRED` — User Test Authorization Gate). §E lists `TEST_PROPOSAL`s
  that await explicit owner authorization.

---

## A. Drift reconciliation — what the audit got wrong (read first)

The audit (README "v12", `02`, `03`) was written against 2026-07-12 source. Six
commits landed afterward on the exact surface it audited. **Three of the
sixteen headline P1s are already fixed in current source.** Acting on the audit
as-written would re-implement completed work.

| Finding | Audit verdict | Current HEAD (`ad2187d23`) | Reconciled status |
|---|---|---|---|
| **BUG-VA-02** in-estimate edit is local-only | P1 open | `EstimateSheetContent.tsx:2133` now calls `updateCostLibraryComponent(...)`; result fed back via `updateComponentFromEditor` (`:2177`). The "persist to library" intent was chosen. | **FIXED** — verify intent matches, then drop |
| **BUG-DOM-01** money-as-float | P1 open | `estimate-row-total.ts` now computes in **integer minor units** via `toMinorUnits` + `checkedAdd`; emits `totalMinorUnits` + scale (`:204-242`). No Decimal lib needed; the recommended canonical representation is in. | **FIXED** — residual: confirm storage columns + export round-trip use the same scale (§D) |
| **BUG-DOM-04** no outbound propagation | P1 open | `actions.ts:474-528` adds `buildLinkedEstimateRowsSyncStatement` → `UPDATE estimate_row_items WHERE source_library_item_id = ?`; reconciled via `reconcileLinkedEstimateRowsForLibraryComponent` (`:554`) on the edit path, with a revision-fingerprint guard (`:425`, `:1385`, `:1911`). | **FIXED on edit** — verify archive path also reconciles (§D) |
| **BUG-DOM-05** bulk archive audit/referential | P1 open | `executeBulkArchiveLibraryComponents` now has a `previewHash` guard + `readLibraryComponentUsageTotals` for the referential half; **but the execution body still issues a single bare `UPDATE … SET lifecycle_state='archived'` with no version bump, no `state_history`, no telemetry, no in-use block.** | **PARTIAL** — audit/version/telemetry writes + in-use block remain (Unit U3) |
| BUG-P1-01 direct-upload authz | P1 open | unchanged — still only `profile?.id !== currentUser.userId` (`direct-upload/route.ts:486,499`), no `assertCanManageLibrary` | **OPEN** (U1) |
| BUG-P1-02 upload-record atomicity | P1 open | unchanged — 3 sequential INSERTs (`upload-records.ts:93,137,190`), no `batch()` | **OPEN** (U2) |
| BUG-VA-01 variant attachments never persisted | P1 open | unchanged — no `INSERT INTO cost_library_item_variant_attachments` in `src/` prod code; `upsertComponentPriceOptionInD1` at `actions.ts:1604` still skips it | **OPEN** (U2) |
| BUG-TM-01 template stale-link blindness | P1 open | unchanged — `normalizeTemplateRowItem` still reads `sourceSnapshot.lifecycleState` (`repository.ts:981`), no live join | **OPEN** (U4) |
| BUG-OPS-02 templates query bomb | P1 open | unchanged — `loadCurrentWorkspaceEstimateTemplatesAppPath` still runs 3 unbounded `IN (...)` SELECTs (`repository.ts:1283-1335`) | **OPEN** (U4) |
| BUG-OPS-08 no export; pricing overpromises | P1 open | unchanged — `exportLibraryItemsToJson`/`exportLibraryItemsToCsv` (`helpers.ts:463,487`) still have **zero callers** | **OPEN** (U6 — decision first) |
| BUG-DOM-18 AI create bypasses validation+quota | P1 open | unchanged — `applyComponentCreateDraft` (`apply.ts:1737`) direct-INSERTs (`:1778,:1825`); none of `validatePriceOptions`/`validateQuickAddComponentInput`/`assertWithinLibraryQuota` present | **OPEN** (U3) |
| BUG-SEC-04 D1 FK enforcement OFF | P1 open (latent) | unchanged — no `PRAGMA foreign_keys` anywhere (`wrangler.jsonc`, `src/lib/cloudflare/**`); all `ON DELETE CASCADE` inert | **DEFER** (latent; §D) |
| BUG-SEC-05 XLSX leaks unit_cost + formula gap | P1 open | unchanged — `materialUnitCost`/`laborUnitCost` written with no audience gate (`create-proposal-workbook.ts:114-115,381-382`) | **OPEN** (U5) |
| **BUG-DOM-28** estimate→library promotion bypass | P1 open (audit: "flag-gated off by default") | **Audit claim is stale.** `promoteExpressRowToLibraryComponent` (`express-promotion-actions.ts:514`) calls `promoteEstimateRowToLibraryComponent` (`:241`) with only `requireAuth()` — **no feature flag**, direct `INSERT INTO cost_library_items` at `:340`, no validators. Not gated off. | **OPEN, un-gated** (U3 — same class as DOM-18) |

### A.1 Internal contradiction to fix

The README self-describes as **v12** while `03-READINESS-AND-RECOMMENDATIONS.md`
is frozen at **v3** (it still lists "**eight P1 defects**" and omits DOM-18,
SEC-04, SEC-05, DOM-28, OPS-14 found later). The "16 P1" count in the README
status table double-counts items the audit itself later downgraded/merged.

**Resolution applied by this file (do not propagate to `03` mechanically):**
- Authoritative P1 list for implementation = §D here.
- Fixed P1s (VA-02, DOM-01, DOM-04) are removed from the "before first users"
  queue. They become **verify-and-close** items, not work items.
- `03` should be regenerated to match §D only if the owner wants a refreshed
  readiness doc; it is not a blocker for implementation.

---

## B. Implementation unit DAG (dependency-ordered, independently shippable)

Units are ordered so each is the "next ready unit" when its dependencies are
done. File scopes are **disjoint** — parallelizable per the Multi-Agent
Execution Directive when lanes don't share files.

```
U1 upload authz (direct-upload/route.ts)            ── no deps ──┐
U2 upload+attachment atomicity (upload-records.ts,  ── no deps ──┤
     actions.ts upsert price option)                              │
U3 library write-guard consolidation                ── no deps ──┤
     (actions.ts bulk archive + apply.ts AI +                       │
      express-promotion-actions.ts)                                │  all parallel
U4 templates read path (repository.ts:              ── no deps ──┤
     normalizeTemplateRowItem + load templates)                    │
U5 proposal-export audience gate                    ── no deps ──┤
     (create-proposal-workbook.ts + xlsx + quick-add)              │
U6 export/import decision                           ── owner gate ┘
     (helpers.ts callers OR delete + pricing-page copy)
```

**First ready unit:** U1 (smallest, single file, no deps, pure authz addition).

---

### U1 — Close direct-upload authz gap (BUG-P1-01)

- **Goal:** viewers/suspended members can no longer reserve upload sessions or
  push bytes to R2 via the direct-upload route.
- **Owns:** `src/app/api/component-library/attachments/direct-upload/route.ts`
  (POST `:484-494`, PUT `:497-501`).
- **Recommended action:** replace the `profile?.id !== currentUser.userId` check
  in both handlers with the same gate the sibling route uses. Mirror
  `src/app/api/component-library/attachments/route.ts` — call
  `assertCanManageLibrary(database, workspace.id, currentUser)` (already used in
  `actions.ts`) before `createSignedUpload`/`uploadToCloudflareR2`.
- **Acceptance evidence (NOT_REQUIRED):** source diff shows
  `assertCanManageLibrary` (or `canManageLibrary`) on both POST create + PUT
  paths; grep confirms no remaining `profile?.id`-only gate on the route.
- **Recovery:** revert the single file. No migration, no flag.
- **Over-engineering guard:** do NOT add a new permission system, role table, or
  rate limiter here. Reuse the existing editor gate. One-line-class change.
- **TEST_PROPOSAL (not authorized):** sign in as a workspace viewer, POST
  `/api/component-library/attachments/direct-upload` `action=create` → expect
  403 (currently 200).

---

### U2 — Atomic upload + persist variant attachments (BUG-P1-02 + BUG-VA-01)

- **Goal:** (a) the 3 upload-record INSERTs are atomic; (b) a component created
  with a variant attachment actually links that attachment — it stops
  disappearing on reload.
- **Owns:**
  - `src/lib/uploads/upload-records.ts` (`recordUploadAsset` `:76-216`, 3
    INSERTs at `:93,:137,:190`).
  - `src/lib/component-library/actions.ts` (`upsertComponentPriceOptionInD1`
    `:1604`).
- **Recommended action:**
  1. Wrap the 3 INSERTs in `database.batch([...])`. On any statement failure the
     batch rolls back the partial session/asset rows, so no `finalized`-session-
     with-no-asset orphan can form. If the existing query helper doesn't expose
     `batch`, use the same `batch()` already used elsewhere in `actions.ts` for
     multi-statement writes (see `insertTemplateIntoTemplate` pattern).
  2. In `upsertComponentPriceOptionInD1`, after the price-option INSERT, add a
     batched `INSERT INTO cost_library_item_variant_attachments (variant_id,
     upload_asset_id, status, …)` for each attachment in the option payload. The
     table + review workflow already exist; only the write is missing. The
     attachment `upload_asset_id`s are already validated upstream by
     `validatePriceOptions`.
  3. Surface `scanStatus` in the modal read-back only if the chip is already
     rendered conditionally — do not add new UI affordances in this unit.
- **Acceptance evidence (NOT_REQUIRED):** diff shows `batch(...)` around the
  3 inserts; diff shows the variant-attachment INSERT wired from
  `upsertComponentPriceOptionInD1`; grep confirms a prod
  `INSERT INTO cost_library_item_variant_attachments` site in `src/` (not only
  the proof harness).
- **Recovery:** both files revert independently. No migration.
- **Over-engineering guard:** do NOT introduce a transactions abstraction, a
  saga, or a new cleanup job. `batch()` is the existing primitive. Do NOT add an
  attachment orphan-reaper redesign here — that is a separate latent issue
  (BUG-OPS-14, §D DEFER).
- **TEST_PROPOSAL (not authorized):** (a) simulate mid-sequence D1 failure in
  `recordUploadAsset`, run the cleanup job → orphan reaped; (b) create a
  component with an attachment, reload, assert the attachment row exists + chip
  renders (currently orphans).

---

### U3 — Consolidate library write guards (BUG-DOM-05 audit half + BUG-DOM-18 + BUG-DOM-28)

These three share **one root cause**: three direct-write paths to the library
tables (bulk archive, AI create, estimate→library promotion) bypass the guards
the human modal runs. The smallest coherent fix is to route all three through
the same validation/version/telemetry surface — **not** to add three bespoke
fixes.

- **Goal:** every library-table write — modal, AI, promotion, bulk archive —
  passes the same input-validation, quota, version-bump, audit, and telemetry
  guards.
- **Owns:**
  - `src/lib/component-library/actions.ts`
    (`executeBulkArchiveLibraryComponents` body + the shared
    `createCostLibraryComponent` validator stack at `:54,561,637,737,752`).
  - `src/lib/ai/package-builder/apply.ts` (`applyComponentCreateDraft` `:1737`,
    direct INSERTs `:1778,:1825`).
  - `src/lib/estimates/express-promotion-actions.ts`
    (`promoteEstimateRowToLibraryComponent` `:241`, direct INSERT `:340`).
- **Recommended action (preferred, minimal):**
  1. Extract the validator stack already on the human path
     (`validatePriceOptions`, `validateQuickAddComponentInput`,
     `normalizeQuickAddText`, the `=+-@` formula-prefix reject, money bounds,
     `pricingSource` URL check, future-date reject, `assertWithinLibraryQuota`)
     into a single `assertLibraryItemWritable(database, input)` helper if one
     doesn't already exist; otherwise call them inline.
  2. Make `applyComponentCreateDraft` call that helper before its INSERTs (or
     route it through `createCostLibraryComponent`).
  3. Make `promoteEstimateRowToLibraryComponent` call the same helper before its
     INSERT. **Drop the stale "flag-gated off" assumption** — current source has
     no flag (`express-promotion-actions.ts:514-516`).
  4. In `executeBulkArchiveLibraryComponents`: before the single UPDATE, write
     the same `current_version_number` bump + `cost_library_item_state_history`
     row + telemetry that `changeCostLibraryComponentLifecycleState` writes; and
     surface `readLibraryComponentUsageTotals` (already present) as a
     block/warn in the **preview** so archiving a component used by N estimates
     is not silent.
- **Acceptance evidence (NOT_REQUIRED):** grep confirms
  `validatePriceOptions`/`assertWithinLibraryQuota` (or the extracted helper)
  appears in `apply.ts` and `express-promotion-actions.ts`; diff shows bulk
  archive writes version + state_history + telemetry and consults usage totals
  in preview.
- **Recovery:** three files revert independently; the extracted helper is
  additive. No migration.
- **Over-engineering guard:** do NOT build a generic "policy engine" or a rules
  DSL. Reuse the existing validators verbatim. Do NOT add feature flags or a
  rollout for the promotion path — alpha/pre-beta, fix-forward.
- **TEST_PROPOSAL (not authorized):** (a) submit an AI draft with a
  `=`-prefixed name + negative cost + over-quota workspace → rejected; (b)
  promote a row with an over-quota workspace → rejected; (c) bulk-archive a
  component used by an estimate → preview warns; after execute, assert
  `state_history` + `versions` rows exist.

---

### U4 — Templates read path: live-join + paginate (BUG-TM-01 + BUG-OPS-02)

- **Goal:** (a) the insert picker blocks on a *currently* archived/changed
  dependency, not the insert-time snapshot; (b) the Templates cold load stops
  pulling up to ~300k rows in one round trip.
- **Owns:** `src/lib/repositories/component-library-repository.ts`
  (`normalizeTemplateRowItem` `:927-986`, esp. `:981`;
  `loadCurrentWorkspaceEstimateTemplatesAppPath` `:1283-1335`).
- **Recommended action:**
  1. **TM-01:** in `normalizeTemplateRowItem`, replace
     `lifecycleState: readString(sourceSnapshot.lifecycleState)` with a live
     lookup: join `source_library_item_id → cost_library_items.lifecycle_state`
     for the rows that have one (single batched `SELECT id, lifecycle_state FROM
     cost_library_items WHERE id IN (...)` keyed off the row set). Map the
     result onto each row; copy `row.link_state` onto the returned shape so the
     trust model (`source-trust-model.ts:463-588`) can read it. Keep the
     snapshot as the fallback when no `source_library_item_id`.
  2. **OPS-02:** add `LIMIT ? OFFSET ?` to the templates SELECT (page size from
     the existing `SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT`/`MAX_LIMIT` pattern
     at `:258-259`), and lazy-load nodes/row_items **per template on expand**
     instead of one `IN (...)` for the whole workspace. If full lazy-load is too
     large for this unit, the minimum coherent fix is: cap each of the 3 queries
     (`LIMIT`) and paginate the top-level templates SELECT. That alone removes
     the ~300k single-round-trip risk.
- **Acceptance evidence (NOT_REQUIRED):** diff shows the live-join SELECT +
     `link_state` propagation; diff shows `LIMIT` on all 3 queries and the
     templates SELECT paginated.
- **Recovery:** single file. No migration.
- **Over-engineering guard:** do NOT introduce FTS5, a search rewrite, or a
     cursor infra in this unit. That is BUG-OPS-01 (P2, §D DEFER-to-Tier1).
     Smallest change that kills the query bomb = LIMIT + paginate top-level.
- **TEST_PROPOSAL (not authorized):** (a) archive a component referenced by a
     template, open the insert picker → hard-block fires; (b) seed 2000
     templates × 50 nodes × 100 rows, cold-load → D1 round-trip bounded.

---

### U5 — Proposal-export audience gate (BUG-SEC-05)

- **Goal:** a client who downloads the proposal XLSX cannot see the firm's
  costing basis, matching the client-portal default-hide; and unguarded text
  fields stop being formula-injection vectors.
- **Owns:** `src/lib/proposal-export/create-proposal-workbook.ts`
  (`:114-115` column defs, `:381-383,:427-429,:675-676` cell writes);
  `src/lib/proposal-export/xlsx-workbook.ts` (render-cell string branch);
  `src/lib/component-library/quick-add-validation.ts` (`:58,158-164`).
- **Recommended action:**
  1. Audience-gate the MATERIAL/LABOR/MISC columns: when the export audience is
     `client` (the portal's `client-portal/policy.ts:122,231` already treats
     `unit_cost` as CONTROLLED), drop or redact those columns. Mirror the portal
     policy — do not invent a new audience enum.
  2. Extend the existing formula-prefix guard (`=+-@` reject) at
     `quick-add-validation.ts:158-164` to `description`/`notes`/`material`/
     `sku`/`variantDescription`. Same guard, more fields — not a new defense.
  3. (Belt-and-suspenders, cheap) in `xlsx-workbook.ts` string render, prefix a
     leading `'` or neutralize when the cell value starts with `=+-@`. Keep the
     existing inline-string + `@` numFmt.
- **Acceptance evidence (NOT_REQUIRED):** diff shows client-audience branch
     omits material/labor/misc columns; diff shows the extended field list on
     the formula guard; grep confirms the neutralization in the render path.
- **Recovery:** proposal-export + quick-add-validation revert independently.
- **Over-engineering guard:** do NOT build a spreadsheet-sanitizer library or a
     per-consumer export-profile system. One audience branch + one guard
     extension.
- **TEST_PROPOSAL (not authorized):** download a client-audience XLSX →
     MATERIAL/LABOR columns absent; set `description` to `=HYPERLINK(...)`,
     export, open in a permissive consumer → not evaluated.

---

### U6 — Export/import: ship it or stop promising it (BUG-OPS-08) — **owner decision**

- **Goal:** resolve the trust/marketing gap (pricing page advertises exports the
  library doesn't deliver) without building unrequested scope.
- **Owns (decision-dependent):** either
  `src/components/workshop/component-library/helpers.ts:463,487` (wire the dead
  exports) + a UI trigger, **or** `src/app/pricing/page.tsx:14` +
  `src/lib/component-library/library-telemetry.ts:26,41` (delete dead code +
  fix copy + drop dead events).
- **Recommended action:** this is a **product decision**, not an engineering
  one. Two coherent options:
  - **Option A (smaller, recommended for first users):** delete the dead export
    helpers + dead telemetry events AND fix the pricing-page/perf-budget copy to
    not promise exports. Removes the overpromise with ~no new surface.
  - **Option B (build):** wire the existing helpers to a "Export library"
    button (CSV/JSON), add an import path. Larger; only if exports are a stated
    first-user need.
- **Authorization:** needs an owner pick (A vs B) before code. This unit is
  **blocked on decision, not on engineering**.
- **Over-engineering guard:** if Option A, do NOT leave the dead helpers "in
  case we build it later" — that's exactly the debt that caused this finding.

---

## C. Anti-over-engineering & anti-over-testing contract (binding)

Every unit above, and any follow-up Tier-1/2/3 work from `02`/`03`, must obey:

1. **Reuse, don't invent.** Use the existing gate (`assertCanManageLibrary`),
   the existing atomic primitive (`database.batch`), the existing validators
   (`validatePriceOptions` et al.), the existing pagination constants. No new
   permission/transaction/policy/pagination abstractions. (AGENTS.md:
   "Prefer deletion, existing utilities, and current patterns.")
2. **No compatibility/flag/rollout ceremony.** This is alpha/pre-beta. No
   feature flags, dual-paths, rollback machinery, or staged rollout for any
   unit here. Fix forward. (PLAN_PACK_EXECUTION_POLICY.md: "Do not add
   compatibility, dual paths, flags, rollout, rollback … without a proven
   current obligation.")
3. **MVP cut is explicit.** The following audit findings are **out of scope for
   first-user hardening** and must not be pulled into these units:
   - FTS5 / full search rewrite (BUG-OPS-01) — Tier-1 plan only; LIKE is fine
     under the documented 1k-target until load says otherwise.
   - R2 orphan-reaper redesign (BUG-OPS-14/15/16) — latent; U2's `batch()` fix
     stops the *new* orphan class. Do not redesign the reaper here.
   - `PRAGMA foreign_keys=ON` (BUG-SEC-04) — latent (no hard-delete path exists);
     document instead of enabling (see §D). Enabling it cluster-wide is a
     separate high-blast-radius migration with its own plan pack.
   - Niche construction finance (retention/retainage, bonds, LEED, BIM, RFIs —
     `07` §12) — future scope, not first-user.
   - Component splitting / taxonomy table migration (`02` §Tier-3) — not a bug.
4. **Testing stays user-gated.** All unit acceptance evidence is `NOT_REQUIRED`
   (source/diff/grep). §E `TEST_PROPOSAL`s name a risk + exact command and
   **do not authorize execution**. Do not create, expand, or run tests, builds,
   browser QA, or Storybook unless the owner explicitly requests testing for the
   current unit. (VALIDATION_MATRIX.md.)
5. **One coherent change per unit; revertible.** Each unit is a small diff over
   disjoint files. No unit depends on another (the DAG is flat). If a unit
   starts needing a migration, a flag, or a second surface, **stop and split**.
6. **Verify the drift table, not the audit.** Before implementing any finding,
   confirm it is still OPEN against current HEAD using the file:line in §A/§D.
   The audit's own line numbers are stale.

---

## D. Per-finding recommended-action register (authoritative)

`Status`: **OPEN** (implement per unit) · **FIXED** (verify + drop) · **PARTIAL**
(unit covers the rest) · **DEFER** (out of first-user scope, with reason).

### P1

| ID | One-line | Status | Recommended action |
|---|---|---|---|
| BUG-P1-01 | direct-upload authz | OPEN | **U1** — add `assertCanManageLibrary` to POST+PUT (`direct-upload/route.ts:486,499`). |
| BUG-P1-02 | upload-record non-atomic | OPEN | **U2** — wrap 3 INSERTs in `batch()` (`upload-records.ts:93,137,190`). |
| BUG-VA-01 | variant attachments never persisted | OPEN | **U2** — add variant-attachment INSERT in `upsertComponentPriceOptionInD1` (`actions.ts:1604`). |
| BUG-VA-02 | in-estimate edit local-only | **FIXED** | Verify intent: `EstimateSheetContent.tsx:2133` now persists via `updateCostLibraryComponent`. Close. |
| BUG-TM-01 | template stale-link blindness | OPEN | **U4** — live-join lifecycle in `normalizeTemplateRowItem` (`repository.ts:981`); propagate `link_state`. |
| BUG-DOM-01 | money-as-float | **FIXED** | Core fixed (`estimate-row-total.ts` minor-units). Residual check only: confirm D1 money columns + proposal-export use the same scale; if a column is still `REAL`, file a focused follow-up — do not re-architect. |
| BUG-DOM-04 | no outbound propagation | **FIXED on edit** | Edit path reconciles (`actions.ts:474-657`). Residual: confirm the **archive** path also calls `reconcileLinkedEstimateRowsForLibraryComponent`; if not, fold into U3's bulk-archive work. |
| BUG-DOM-05 | bulk archive no audit/referential | **PARTIAL** | Referential half present (`readLibraryComponentUsageTotals`); audit/version/telemetry + in-use preview block still missing → **U3**. |
| BUG-OPS-02 | templates query bomb | OPEN | **U4** — LIMIT + paginate top-level templates SELECT; lazy-load or cap nodes/rows (`repository.ts:1283-1335`). |
| BUG-OPS-08 | no export; pricing overpromises | OPEN (decision) | **U6** — owner picks delete-and-fix-copy (A) vs build (B). Blocked on decision. |
| BUG-DOM-18 | AI create bypasses validation+quota | OPEN | **U3** — route `applyComponentCreateDraft` (`apply.ts:1737`) through the human-path validators + quota. |
| BUG-SEC-04 | D1 FK enforcement OFF | **DEFER** | Latent — no hard-delete path exists (archive only). Do NOT enable `PRAGMA foreign_keys=ON` in these units (cluster-wide blast radius). **Document** that CASCADEs are inert in code comments at the migration sites; file a separate plan pack if a hard-delete path is ever added. |
| BUG-SEC-05 | XLSX leaks unit_cost + formula gap | OPEN | **U5** — audience-gate material/labor/misc for client; extend formula guard to more fields. |
| BUG-DOM-28 | estimate→library promotion bypass | OPEN (un-gated) | **U3** — `promoteEstimateRowToLibraryComponent` (`express-promotion-actions.ts:241`) direct-INSERTs (`:340`) with no validators and **no flag**. Apply the same validator+quota stack as DOM-18. |
| BUG-OPS-14 | orphan-reaper can't catch identified orphans | DEFER | Latent. U2's `batch()` stops the new orphan class. Redesigning the reaper is out of first-user scope. |
| BUG-SEC-09 | legacy snapshot_json no integrity | DEFER | Mitigated by the ongoing migration freeze to the new per-section SHA-256 path. Not first-user work. |

**P1 count reconciled:** 9 OPEN (U1–U6) · 3 FIXED · 1 PARTIAL (folded into U3) ·
3 DEFERRED (latent, documented). The README's "16 P1" double-counts; this is the
authoritative implementation queue.

### P2 / P3 — guidance, not units

The P2/P3 registers in `02` remain valid as a backlog. Apply the same §C
contract. Priorities for "fix soon" without over-engineering:

- **Do as direct/Brief edits (no plan pack):** BUG-P2-02 (render-phase setState
  → `useEffect`, 2 sites), BUG-P2-04 (`window.history` → `router.push`), BUG-P2-06
  (scan-override batch), BUG-P2-08 (`timingSafeEqual` on internal routes),
  BUG-DOM-03 (unit enum validation at write + DB CHECK), BUG-DOM-06 (optimistic
  lock: `AND current_version_number = ?` + 409), the dead-code deletions
  (DEAD-UI-01..06), and the stale-comment fixes (RLS/Postgres OUTDATED-01/02).
  These are each bounded, single-surface, reversible.
- **Do only with an owner nod:** BUG-DOM-09 (configurable VAT — product scope),
  BUG-OPS-01 (FTS5 — search at scale), the component-split refactor
  (BUG-P3-08 — velocity, not correctness), the taxonomy-table migration
  (DEAD-SCHEMA-01 — product roadmap decision).
- **Drop / re-classify if stale:** before acting on any P2/P3 entry, re-confirm
  its file:line against HEAD — the same drift that fixed the P1s likely touched
  some P2s too (e.g., the version-guard plumbing cited in DOM-06 now partially
  exists via `buildLinkedEstimateRowsRevisionGuardStatement`).

---

## E. TEST_PROPOSALs (await explicit owner authorization — do not run)

All units are `NOT_REQUIRED` for acceptance (source/diff/grep evidence). The
following tests would materially de-risk specific units but **are not
authorized**; they are recorded per the Validation Matrix so the owner can
approve the exact command.

| Unit / risk | Exact proposed command | Proves |
|---|---|---|
| U1 / direct-upload authz | (e2e) sign in as a workspace viewer, POST `/api/component-library/attachments/direct-upload` `action=create` | viewer gets 403 (currently 200) |
| U2 / upload atomicity | (integration) simulate mid-sequence D1 failure in `recordUploadAsset`, run cleanup job | no `finalized`-no-asset orphan remains |
| U2 / attachments persist | (integration) create a component with an attachment, reload, assert `cost_library_item_variant_attachments` row + chip | attachment persists (currently orphans) |
| U3 / AI bypass | (integration) AI draft with `=`-name + negative cost + over-quota workspace, apply | rejected (currently persists) |
| U3 / promotion bypass | (integration) promote a row into an over-quota workspace | rejected (currently persists) |
| U3 / bulk archive audit | (integration) bulk-archive a component, assert `state_history` + `versions` rows + in-use preview warning | audit complete (currently empty) |
| U4 / stale-link | (integration) archive a component referenced by a template, open insert picker | hard-block fires (currently unreachable) |
| U4 / query bomb | (perf) seed 2000 templates × 50 nodes × 100 rows, cold-load Templates route | D1 round-trip bounded (currently ~300k rows) |
| U5 / XLSX audience | (e2e) download client-audience XLSX | MATERIAL/LABOR absent (currently present) |

---

## F. Completion criterion for this pack

This pack (the audit) becomes **implementation-ready** when §A–§E are true:
- every OPEN P1 maps to exactly one unit in §B with current-HEAD file:line;
- every FIXED/PARTIAL/DEFER item is reconciled with a reason;
- §C guardrails are stated and obeyed by every unit;
- no unit proposes a flag, compatibility layer, new abstraction, unrequested
  test, or deferred-scope item (FTS5 / reaper / FK-PRAGMA / niche finance).

That criterion is met by this file. The audit's original "bounded completion"
criterion (README §"Bounded completion criterion") still holds for the **audit**
dimension; this file adds the **implementation-readiness** dimension the audit
explicitly deferred ("If the owner wants these findings turned into an
executable plan, a dated implementation pack is the canonical next step").

## Provenance

- Reconciled 2026-07-14 against HEAD `ad2187d23`.
- Method: read-only source inspection — `git log --since=2026-07-12` on the
  library surface, then per-finding grep/read against current file:line for all
  16 P1s.
- No code, migrations, config, or provider state changed.
- Test decision: `NOT_REQUIRED` (User Test Authorization Gate). §E records
  `TEST_PROPOSAL`s only.
