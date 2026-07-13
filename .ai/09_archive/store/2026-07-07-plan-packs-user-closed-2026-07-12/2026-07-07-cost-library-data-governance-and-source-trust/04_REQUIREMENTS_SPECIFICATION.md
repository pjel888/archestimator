# 04 — Requirements Specification

Every requirement has a stable ID, rationale, source, priority, dependencies, acceptance criteria (objective + testable), validation method, affected code areas, risks, and status. Priorities: `P0` (blocks first-user trust / data integrity / security), `P1` (required for complete governance), `P2` (important, can phase). Status: `pending` until implementation.

Source-strength tags: `brief` (PROMPT.md), `repo evidence` (source/migrations/tests), `official docs`, `provider proof`, `assumption`, `derived`, `owner-delegated decision`.

## Requirement families

### Provenance (FR/ARCH/DATA)

#### `REQ-1` / `FR-1` — Record full provenance on every cost-library cost entry
- **Statement:** Every `cost_library_item_variant_cost_entry` (and the denormalized `cost_library_items`/`cost_library_item_price_options` fields) MUST record: `pricingSource`, `pricingDate`, `confidence`, `currency`, `sourceUrl`, `supplierId`, plus region/version labels where applicable, with validation at the trust boundary.
- **Rationale:** PROMPT.md "source provenance"; first-user trust; honest surfacing.
- **Source:** `brief` (PROMPT.md "Define data sources, provenance model"), `repo evidence` (existing columns in `0026`/`0028`).
- **Priority:** P0.
- **Dependencies:** `REQ-7` (region/version labels), `REQ-19` (structured confidence).
- **Acceptance criteria:**
  - `AC-1.1` Creating a component via `createCostLibraryComponent` without a pricing date yields a `missing` freshness chip (provenance present-but-incomplete), not a crash. (test: `library-source-trust.test.ts` extension)
  - `AC-1.2` `validateQuickAddComponentInput` rejects future pricing dates, non-https pricingSource, formula-prefixed confidence (already true; extend to new fields). (test: `quick-add-validation` unit test)
  - `AC-1.3` Region/version label, if provided, is a non-empty trimmed string ≤120 chars; empty allowed (defaults to workspace default). (test: unit)
- **Validation:** Unit tests on validators; D1 insert/read round-trip test.
- **Affected code:** `src/lib/component-library/quick-add-validation.ts`, `actions.ts` (create/update paths), `src/lib/repositories/component-library-repository.ts`, migration `0038` (additive columns).
- **Risks:** Backfill of NULL region/version on existing rows (default NULL or workspace default — `OPEN-2`).
- **Status:** pending.

#### `REQ-2` / `FR-2` — Distinguish owner-accepted provenance from imported/unverified
- **Statement:** Provenance MUST carry an `origin` marker: `owner-accepted` | `imported` | `user-entered` | `supplier-quote` | `promoted-from-estimate`, recorded at creation and editable only by governance-admin.
- **Rationale:** PROMPT.md "do not invent authoritative cost data … mark owner decisions"; first-user trust requires distinguishing owner authority from imported bulk data.
- **Source:** `brief`, `derived` (no existing concept — `G9`).
- **Priority:** P0.
- **Dependencies:** `REQ-1`, `REQ-9` (review state).
- **Acceptance criteria:**
  - `AC-2.1` Every cost entry has a non-null `origin` defaulting to `user-entered`. (migration backfill + test)
  - `AC-2.2` Bulk import sets `origin='imported'`. (import path test)
  - `AC-2.3` Promotion-from-estimate sets `origin='promoted-from-estimate'`. (promotion action test)
  - `AC-2.4` Only governance-admin can set `origin='owner-accepted'`; non-admin attempt returns authorization error. (denial test)
- **Validation:** Unit + authz denial tests; migration backfill proof.
- **Affected code:** `actions.ts` (create/promote paths), new import action, `src/lib/authz/d1-access.ts` (new helper), migration `0038`.
- **Risks:** Mislabeling owner-accepted data — mitigation: admin-only + audit.
- **Status:** pending.

### Review workflow (FR/DATA/SEC/ARCH)

#### `REQ-3` / `FR-3` — Review state machine on D1 cost entries
- **Statement:** Each cost entry MUST have a `reviewStatus` in `{proposed, needs_review, accepted, rejected, superseded}` with CHECK constraints enforcing consistency (lock consistency, reviewed consistency, supersede consistency, revision positive), ported from the Supabase governance contract.
- **Rationale:** PROMPT.md "review states"; first-user trust; parity with the durable governance model.
- **Source:** `repo evidence` (`SRC-SUPABASE-GOV`: enum + 7 CHECKs), `brief`.
- **Priority:** P0.
- **Dependencies:** `REQ-1`, `G2`.
- **Acceptance criteria:**
  - `AC-3.1` Migration `0038` adds the column + CHECKs; applies cleanly on a DB with `0001..0037` applied (current D1 tip = `0037_remove_preloaded_component_categories.sql`); `wrangler d1 migrations list --local` shows it pending then applied. (D1 apply proof)
  - `AC-3.2` Existing current entries backfill to `accepted` (owner-gated default, `OPEN-1`) OR `proposed` if owner chooses "no seed trust"; backfill idempotent. (migration test on temp SQLite)
  - `AC-3.3` Inserting a row with `reviewStatus='accepted'` but no `reviewed_by` violates CHECK and is rejected. (constraint test)
  - `AC-3.4` At most one `accepted`+`is_current` entry per price option (unique partial index `cost_entries_one_accepted_current_per_option`). (constraint test)
- **Validation:** D1 migration apply + constraint tests; provider readback in `13`.
- **Affected code:** migration `0038`, `actions.ts` (insert/update respect state).
- **Risks:** Backfill default choice blocks full readiness (`OPEN-1`).
- **Status:** pending.

#### `REQ-4` / `FR-4` — Reviewer assignment and due dates
- **Statement:** A governance-admin MUST be able to assign a cost entry for review (`assigned_to`, `review_due_at`) and the system MUST record the assignment in an append-only review-event audit.
- **Rationale:** PROMPT.md "review states"; cadence/accountability.
- **Source:** `repo evidence` (Supabase `assign_cost_library_cost_refresh`), `brief`.
- **Priority:** P1.
- **Dependencies:** `REQ-3`, `REQ-9`.
- **Acceptance criteria:**
  - `AC-4.1` `assignCostEntryForReview({entryId, assigneeUserId, dueAt})` sets both fields and writes a review event. (action test)
  - `AC-4.2` Non-admin caller gets authorization denied. (denial test)
  - `AC-4.3` Assigning to a user outside the workspace fails. (constraint test)
- **Validation:** Action + denial tests.
- **Affected code:** `actions.ts`, `src/lib/authz/d1-access.ts`, review-event table.
- **Risks:** Stale assignments — mitigation: overview query surfaces overdue.
- **Status:** pending.

#### `REQ-5` / `FR-5` — Accept / reject / supersede / lock / unlock actions
- **Statement:** Governance-admin actions `acceptCostEntry`, `rejectCostEntry`, `supersedeCostEntry`, `lockCostEntry`, `unlockCostEntry` MUST exist on the D1 path with optimistic-revision conflict guards (`expectedReviewRevision` → conflict error on mismatch), mirroring the Supabase RPC contract.
- **Rationale:** PROMPT.md "review states"; parity; concurrent-review safety.
- **Source:** `repo evidence` (Supabase RPCs + `'40001'` conflict), `brief`.
- **Priority:** P0.
- **Dependencies:** `REQ-3`, `REQ-12` (authz).
- **Acceptance criteria:**
  - `AC-5.1` `acceptCostEntry` with stale `expectedReviewRevision` returns conflict (not silent overwrite). (concurrency test)
  - `AC-5.2` `supersedeCostEntry` sets old entry `superseded` + `superseded_by` and promotes new entry to `accepted`+`is_current` atomically. (transaction test)
  - `AC-5.3` `lockCostEntry` sets `locked_by/locked_at/lock_reason`; further mutations blocked until unlock. (constraint test)
  - `AC-5.4` Non-admin caller denied on all five. (denial tests)
- **Validation:** Action + concurrency + denial tests; D1 transaction proof.
- **Affected code:** `actions.ts` (new actions), `src/lib/authz/d1-access.ts`, migration `0038` (columns).
- **Risks:** D1 transaction limitations — mitigation: app-level transaction with revalidation; `cf:d1-rpc-transaction-proof.ts` pattern.
- **Status:** pending.

#### `REQ-6` / `FR-6` — Append-only review-event audit trail
- **Statement:** Every review-state transition, assignment, lock/unlock, accept/reject/supersede MUST write an append-only review event with `event_type, actor_user_id, from_state, to_state, note, review_revision, correlation_id, created_at`, queryable by governance-admin for the workspace.
- **Rationale:** PROMPT.md "audit trail"; accountability; supersede traceability.
- **Source:** `repo evidence` (Supabase `cost_library_cost_review_events`), `brief`.
- **Priority:** P0.
- **Dependencies:** `REQ-3`, `DEC-3` (extend existing history vs new table).
- **Acceptance criteria:**
  - `AC-6.1` Each accept/lock/etc. writes exactly one event row. (test)
  - `AC-6.2` Events are append-only (no UPDATE/DELETE path in code; constraint/test). (test)
  - `AC-6.3` Workspace-scoped query returns only that workspace's events; cross-workspace query denied. (authz test)
- **Validation:** Action + authz tests.
- **Affected code:** new table or extended `cost_library_item_state_history`, `actions.ts`.
- **Risks:** Audit-table growth — mitigation: retention policy in `13`.
- **Status:** pending.

### Trust labels (FR/UX)

#### `REQ-7` / `FR-7` — Trust chips reflect review state + freshness + confidence
- **Statement:** `getComponentSourceTrustChips` and `getTemplateSourceTrustChips` MUST include a review-state chip (`Accepted`/`Needs review`/`Proposed`/`Rejected`/`Superseded`/`Locked`) in addition to existing freshness/confidence/lifecycle/source-presence chips.
- **Rationale:** PROMPT.md "trust labels"; honest surfacing.
- **Source:** `repo evidence` (`SRC-TRUST-MODEL`), `brief`.
- **Priority:** P0.
- **Dependencies:** `REQ-3`.
- **Acceptance criteria:**
  - `AC-7.1` A `needs_review` entry shows a warning-tone "Needs review" chip. (DOM/unit test)
  - `AC-7.2` A `locked` entry shows a neutral "Locked" chip with reviewer tooltip. (unit)
  - `AC-7.3` Chips count toward template dependency health (`getTemplateDependencyHealth`). (unit)
- **Validation:** Unit tests on `source-trust-model.ts`.
- **Affected code:** `src/components/workshop/library/source-trust-model.ts`, consumers.
- **Risks:** Chip clutter — mitigation: tone + title guidance in `05`.
- **Status:** pending.

#### `REQ-8` / `FR-8` — Estimate commit trust gate reads review state
- **Statement:** `getLibraryCommitTrustGate` MUST treat `rejected`/`superseded` cost entries as `block` (like `archived`) and `needs_review`/`proposed` as `warn`.
- **Rationale:** PROMPT.md "estimate impact"; prevent committing untrusted costs.
- **Source:** `repo evidence`, `brief`.
- **Priority:** P0.
- **Dependencies:** `REQ-3`, `REQ-7`.
- **Acceptance criteria:**
  - `AC-8.1` Inserting a `rejected` entry triggers `trust_insert_gate_blocked`. (test + telemetry)
  - `AC-8.2` Inserting a `needs_review` entry triggers `trust_insert_gate_warned`. (test)
- **Validation:** Unit + handler tests.
- **Affected code:** `source-trust-model.ts`, `use-estimate-row-handlers.ts`.
- **Risks:** Over-blocking legitimate flows — mitigation: `warn` not `block` for review-in-progress.
- **Status:** pending.

### Roles & permissions (SEC/FR)

#### `REQ-9` / `SEC-1` — Governance-admin authorization
- **Statement:** A new app-authz helper `isCostLibraryGovernanceAdminInD1` (workspace admin OR platform admin, parity with Supabase `require_cost_library_governance_admin`) MUST gate all review/accept/lock/supersede/assign/origin-change actions; editors retain create/update/draft but not accept.
- **Rationale:** PROMPT.md "role permissions"; least privilege; parity.
- **Source:** `repo evidence` (`SRC-AUTHZ` + Supabase parity), `brief`.
- **Priority:** P0.
- **Dependencies:** `OPEN-5` (reviewer role boundary).
- **Acceptance criteria:**
  - `AC-9.1` Workspace editor can create/update but cannot accept/lock/supersede. (denial test)
  - `AC-9.2` Workspace admin can accept/lock/supersede. (allow test)
  - `AC-9.3` Cross-workspace admin cannot act on another workspace's entries. (denial test)
  - `AC-9.4` Platform admin bypass works and is audited. (test)
- **Validation:** Role-matrix denial tests.
- **Affected code:** `src/lib/authz/d1-access.ts`, `actions.ts`.
- **Risks:** Role model ambiguity (`OPEN-5`).
- **Status:** pending.

### Stale / region / version labels (DATA/UX)

#### `REQ-10` / `FR-9` — Stale propagation to estimate rows
- **Statement:** When an `accepted`+`is_current` cost entry is updated or superseded, consuming estimate rows (`estimate_row_items.source_library_item_id` matches) MUST become reachable as `source-changed` so the commit gate's stale branch is no longer dead.
- **Rationale:** PROMPT.md "stale data … estimate update behavior"; closes `G3` dead-branch.
- **Source:** `repo evidence` (`G3`), `brief`.
- **Priority:** P0.
- **Dependencies:** `DEC-4` (mechanism).
- **Acceptance criteria:**
  - `AC-10.1` After updating an accepted cost entry, an estimate row referencing it reports `source-changed` on next read (computed-on-read) OR via materialized flag within bounded latency. (integration test)
  - `AC-10.2` The trust gate surfaces "Source changed" warning for such rows. (test)
  - `AC-10.3` Template dependency health counts `source-changed` rows. (test)
- **Validation:** Integration test across library action + estimate read.
- **Affected code:** `actions.ts` (update path), `src/lib/repositories/estimate-repository.ts` (read), `source-trust-model.ts`.
- **Risks:** Fan-out write cost if materialized — `DEC-4` prefers computed-on-read.
- **Status:** pending.

#### `REQ-11` / `FR-10` — Region/version labels recorded and filterable
- **Statement:** Cost entries MAY carry `region` and `version_label` (free-text, normalized); the facet filter (`component-facet-filter`) exposes them when present.
- **Rationale:** PROMPT.md "stale/region/version labels".
- **Source:** `brief`, `repo evidence` (no existing columns — `G7`).
- **Priority:** P2 (depends on `OPEN-2`).
- **Dependencies:** `REQ-1`, `OPEN-2`.
- **Acceptance criteria:**
  - `AC-11.1` Setting region/version on create persists and round-trips. (test)
  - `AC-11.2` Facet filter narrows by region when ≥1 entry has a region. (DOM test)
- **Validation:** Unit + DOM tests.
- **Affected code:** migration `0038`, `actions.ts`, `component-facet-filter*.ts`.
- **Risks:** Scope creep into multi-region libraries — non-goal.
- **Status:** pending (gated by `OPEN-2`).

#### `REQ-12` / `FR-11` — Freshness windows honored everywhere
- **Statement:** `COMPONENT_FACET_STALE_DAYS=90` / `VERY_STALE=180` MUST drive chips, commit gate, template health, overview, and export metadata consistently (single source of truth).
- **Rationale:** PROMPT.md "stale data"; avoid drift.
- **Source:** `repo evidence` (`SRC-TRUST-MODEL`).
- **Priority:** P1.
- **Dependencies:** `REQ-7`.
- **Acceptance criteria:**
  - `AC-12.1` Export metadata includes pricing date + computed freshness tier. (test)
  - `AC-12.2` Overview counts use the same thresholds as chips. (test)
- **Validation:** Unit tests.
- **Affected code:** `source-trust-model.ts`, overview repo, export.
- **Status:** pending.

### Import validation (FR/SEC)

#### `REQ-13` / `FR-12` — Safe library import (CSV first, JSON round-trip)
- **Statement:** A library import action MUST accept CSV (and JSON for round-trip) with: dry-run preview, row cap (`LIBRARY_COMPONENT_CAP` aware), formula-injection guard (strip/reject `=+-@` prefixes), provenance normalization (set `origin='imported'`, default `reviewStatus='proposed'`), and never overwrite `accepted` entries without explicit re-review.
- **Rationale:** PROMPT.md "import validation"; first-user safety; `G4`.
- **Source:** `brief`, `repo evidence` (no importer exists — `G4`).
- **Priority:** P1.
- **Dependencies:** `REQ-1`,`REQ-3`,`OPEN-6`.
- **Acceptance criteria:**
  - `AC-13.1` Dry-run returns row count + per-row validation errors without writing. (test)
  - `AC-13.2` Formula-prefixed cells are rejected or neutralized; result testable. (test)
  - `AC-13.3` Import beyond quota is rejected with a clear error. (test)
  - `AC-13.4` Import respects workspace authorization; cross-workspace import denied. (denial test)
  - `AC-13.5` `accepted` entries are never overwritten; import creates new `proposed` entries. (test)
- **Validation:** Unit + action + denial tests.
- **Affected code:** new `src/lib/component-library/import-export.ts` (or similar), new Server Action, `quick-add-validation.ts` (shared guards).
- **Risks:** Large-file memory — mitigation: streaming parse, row cap.
- **Status:** pending.

#### `REQ-14` / `FR-13` — Library export with provenance + review state
- **Statement:** A library export action MUST emit CSV/JSON including provenance, review state, freshness tier, and origin; redact nothing structural but exclude internal ids unless requested.
- **Rationale:** PROMPT.md "import/export safety"; audit portability.
- **Source:** `brief`.
- **Priority:** P2.
- **Dependencies:** `REQ-13`.
- **Acceptance criteria:**
  - `AC-14.1` Export round-trips through import without loss of provenance/review fields (review state resets to `proposed` on import by design). (round-trip test)
  - `AC-14.2` Export denied for non-workspace-member. (denial test)
- **Validation:** Round-trip + denial tests.
- **Affected code:** import-export module, action.
- **Status:** pending.

### Estimate update behavior (FR/UX)

#### `REQ-15` / `FR-14` — Estimate row detail shows review state of linked source
- **Statement:** The estimate row inspector (`ComponentInspectorDock`, row detail) MUST show the linked library cost entry's review state, freshness, and last reviewer.
- **Rationale:** PROMPT.md "estimate impact"; honest surfacing at point of use.
- **Source:** `brief`, `repo evidence`.
- **Priority:** P1.
- **Dependencies:** `REQ-7`,`REQ-10`.
- **Acceptance criteria:**
  - `AC-15.1` Inspector renders review-state chip for linked rows. (DOM test)
  - `AC-15.2` Detached/unlinked rows show "Detached"/"Not linked". (test)
- **Validation:** DOM test.
- **Affected code:** `ComponentInspectorDock.tsx`, `PreviewPanel.tsx`.
- **Status:** pending.

### Audit trail (DATA/OPS)

(Covered by `REQ-6`.) Additional:

#### `REQ-16` / `DATA-1` — Existing version/price/state history preserved and extended
- **Statement:** `cost_library_item_versions`, `cost_library_item_price_history`, `cost_library_item_state_history` MUST remain the versioning backbone; review events extend (not duplicate) them per `DEC-3`.
- **Rationale:** Reuse over silo.
- **Source:** `repo evidence`, `DEC-3`.
- **Priority:** P1.
- **Dependencies:** `REQ-6`.
- **Acceptance criteria:**
  - `AC-16.1` No data loss to existing history tables after migration. (migration test)
- **Validation:** Migration apply + readback.
- **Status:** pending.

### Tests & evidence (TEST) — see `12`

### Performance (PERF) — see `09`

### Reliability/Ops (REL/OPS) — see `09`/`13`

## Shadow-path matrices

### Matrix A — Accept cost entry (`acceptCostEntry`)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Accept | 200, state→accepted, event written | 400 missing entryId/revision | 404 entry not found | 409 revision conflict | 403 non-admin | 500 D1 error → no state change | two concurrent accepts: first wins, second 409 | idempotent only if revision unchanged | "Accepted" chip + toast | `accept-cost-entry.test.ts` (new) |

### Matrix B — Supersede cost entry (`supersedeCostEntry`)

| Flow | Happy | Missing input | Empty | Invalid | Auth denied | Upstream err | Concurrency | Retry/idempotency | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Supersede | old→superseded, new→accepted+current, atomically | 400 | 404 | 409 revision | 403 | 500 rollback | concurrent supersede: first wins | not idempotent (creates new entry) | "Superseded" + "Accepted" chips | `supersede-cost-entry.test.ts` (new) |

### Matrix C — Library import (CSV)

| Flow | Happy | Missing/nil | Empty file | Invalid (formula/injection) | Auth denied | Upstream err | Concurrency | Retry/idempotency | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Import | dry-run preview → confirm → rows inserted as `proposed` | 400 missing file | 400 empty | cells neutralized/rejected, reported per-row | 403 non-member | 500 no partial writes | two simultaneous imports: quota check at write | re-import same rows creates duplicates unless `source_hash` dedupe | success toast + count | `library-import.test.ts` (new) |

### Matrix D — Stale propagation (library update → estimate read)

| Flow | Happy | Missing | Empty | Invalid | Auth denied | Upstream err | Concurrency | Retry/idempotency | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Update accepted cost | estimate row reads `source-changed` next load | n/a | n/a | n/a | 403 non-editor | 500 | concurrent update+read: read sees pre- or post-update consistently | computed-on-read is naturally idempotent | "Source changed" warning in gate | `stale-propagation.test.ts` (new) |

### Matrix E — Lock/unlock

| Flow | Happy | Missing | Empty | Invalid | Auth denied | Upstream err | Concurrency | Retry/idempotency | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Lock | locked_by/at set, mutations blocked | 400 | 404 | 409 already locked by other | 403 non-admin | 500 | two lock attempts: first wins, second 409 | unlock then re-lock allowed | "Locked" chip | `lock-cost-entry.test.ts` (new) |

All applicable shadow-path cells answered. "Not applicable" cells (e.g., auth-denied for a read-only computed-on-read) are marked n/a with reason.

## Credential material taxonomy — not applicable

No new credentials, tokens, hashes, cookies, or share URLs introduced by this plan. Existing session/auth identity reused for `created_by/reviewed_by/assigned_to`. (`REQ-9` relies on existing Better Auth session, no new credential material.)

## Summary table

| ID | Family | Priority | Status |
|---|---|---|---|
| REQ-1/FR-1 | Provenance | P0 | pending |
| REQ-2/FR-2 | Owner-accepted origin | P0 | pending |
| REQ-3/FR-3 | Review state machine | P0 | pending |
| REQ-4/FR-4 | Assignment/due dates | P1 | pending |
| REQ-5/FR-5 | Accept/reject/supersede/lock/unlock | P0 | pending |
| REQ-6/FR-6 | Review-event audit | P0 | pending |
| REQ-7/FR-7 | Trust chips w/ review state | P0 | pending |
| REQ-8/FR-8 | Commit gate reads review state | P0 | pending |
| REQ-9/SEC-1 | Governance-admin authz | P0 | pending |
| REQ-10/FR-9 | Stale propagation | P0 | pending |
| REQ-11/FR-10 | Region/version labels | P2 | pending (OPEN-2) |
| REQ-12/FR-11 | Freshness consistency | P1 | pending |
| REQ-13/FR-12 | Safe import | P1 | pending (OPEN-6) |
| REQ-14/FR-13 | Export | P2 | pending |
| REQ-15/FR-14 | Inspector review state | P1 | pending |
| REQ-16/DATA-1 | History preserved/extended | P1 | pending |
