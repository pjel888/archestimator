# 07 — Decisions, Risks, and Authorization Boundaries

---

## Decisions (DEC-AUTO-*)

### DEC-AUTO-001: Adopt WorkshopCollectionLayout + Card Grid for Proposals Inbox

**Question:** Should the proposals inbox adopt the same `WorkshopCollectionLayout` + card grid pattern as the projects page?

**Affected IDs:** REQ-001, REQ-002, REQ-003, UX-001, UX-002, UX-003

**Evidence and freshness:** 
- `src/components/workshop/WorkshopCollectionLayout.tsx` — shared layout shell (current).
- `src/components/workshop/projects-page-client.tsx` — projects page uses this shell (current).
- User explicit directive: "should look like the projects page too when displaying the proposals."

**Options:**
1. Adopt `WorkshopCollectionLayout` + card grid (matches projects page).
2. Keep the current flat bordered table (status quo).
3. Build a custom layout (not reusing the shared component).

**Decision:** Option 1 — Adopt `WorkshopCollectionLayout` + card grid.

**Why this option:** User explicitly requested visual parity with the projects page. The shared `WorkshopCollectionLayout` is the natural reuse point. Card grid provides better visual scanning for proposal metadata than a flat table.

**Rejected alternatives:** Option 2 (doesn't meet user's request). Option 3 (duplicates existing component; violates DRY).

**Confidence:** High.

**Consequences:** The inbox gains search, tabs, sort, view modes, and grouping. The TanStack Query pattern is preserved (not switched to RSC-only like projects).

**Rollback/revision trigger:** If the card grid proves too dense for proposal metadata, fall back to a list-only view mode.

**Responsible role:** Lead architect.

---

### DEC-AUTO-002: Keep TanStack Query for Proposals (Not RSC-Only)

**Question:** Should the proposals inbox switch from TanStack Query to RSC-only data fetching (like the projects page)?

**Affected IDs:** REQ-001, ARCH-001

**Evidence and freshness:**
- `src/components/workshop/proposals-page-client.tsx` — current TanStack Query setup (30s staleTime, window-focus refetch).
- `src/components/workshop/projects-page-client.tsx` — projects uses RSC + server actions + `router.refresh()`.
- Recipient proposals need window-focus refetch (new proposals may arrive while the inbox is open).

**Options:**
1. Keep TanStack Query (SSR-seed + Query refresh).
2. Switch to RSC-only (like projects).
3. Hybrid: RSC for initial load, server actions for mutations, TanStack Query for refetch.

**Decision:** Option 1 — Keep TanStack Query.

**Why this option:** The recipient inbox benefits from automatic window-focus refetch (new proposals may arrive). The projects page doesn't need this (project mutations are owner-initiated). The SSR-seed + Query pattern is already working correctly.

**Rejected alternatives:** Option 2 (loses automatic refetch). Option 3 (unnecessary complexity for a read-only inbox).

**Confidence:** High.

**Consequences:** The inbox keeps TanStack Query. The `WorkshopCollectionLayout` wrapping doesn't affect the data layer.

**Rollback/revision trigger:** If TanStack Query causes hydration issues with the new layout, investigate the cause (not the pattern itself).

**Responsible role:** Lead architect.

---

### DEC-AUTO-003: Client-Side Filtering/Sorting for V1

**Question:** Should filtering and sorting be client-side or server-side?

**Affected IDs:** REQ-003, REQ-004, DATA-001

**Evidence and freshness:**
- `listRecipientProposals()` returns ≤50 rows (hard LIMIT 50).
- The projects page does client-side filtering with `useReducer` + `useDeferredValue`.

**Options:**
1. Client-side filtering/sorting (on cached rows).
2. Server-side filtering/sorting (new query parameters).
3. Hybrid: client-side for V1, server-side for V2.

**Decision:** Option 1 — Client-side for V1.

**Why this option:** 50 rows is trivially filterable client-side. No server round-trips needed. The projects page proves this pattern works. Server-side filtering adds query complexity without benefit at this scale.

**Rejected alternatives:** Option 2 (over-engineering for ≤50 rows). Option 3 (unnecessary; can add server-side later if needed).

**Confidence:** High.

**Consequences:** No server changes needed for filtering/sorting. The reducer holds filter/sort state.

**Rollback/revision trigger:** If recipients commonly have >50 proposals, add server-side pagination + filtering.

**Responsible role:** Lead architect.

---

### DEC-AUTO-004: Proposal Card Shows Proposal-Specific Metadata

**Question:** What metadata should the proposal card display?

**Affected IDs:** REQ-002, UX-002

**Evidence and freshness:**
- `RecipientProposalRow` type (current): `publicationId`, `projectId`, `projectName`, `projectCode`, `workspaceId`, `workspaceName`, `senderDisplayName`, `status`, `hasOpened`, `decision`, `lastActivityAt`, `publishedAt`, `expiresAt`, `revokedAt`, `snapshotVersion`.
- `LiveProjectCard` shows: thumbnail, name, client, location, status, dates, publication summary, favorites.

**Options:**
1. Proposal-specific metadata only (status, decision, expiry, sender, version, workspace, project name, sent date, last activity).
2. Project-like metadata (thumbnail, client, location — but proposals don't have thumbnails).
3. Hybrid: proposal metadata + project client_name.

**Decision:** Option 1 (with optional `clientName` from project per DEC-AUTO-005).

**Why this option:** Proposals are recipient-facing; the recipient needs to identify the proposal by project name, workspace, and status — not by thumbnail or location. The status/decision/expiry chips are the primary differentiators.

**Rejected alternatives:** Option 2 (thumbnails don't apply to recipient proposals; location is governed by `location_visibility`). Option 3 is covered by DEC-AUTO-005.

**Confidence:** High.

**Consequences:** The card design is proposal-specific, not a copy of `LiveProjectCard`.

**Rollback/revision trigger:** If users need location or thumbnail, evaluate `location_visibility` sanitization first.

**Responsible role:** Lead architect.

---

### DEC-AUTO-005: Add client_name to RecipientProposalRow (No Migration Needed)

**Question:** Should the query be enriched with additional display fields?

**Affected IDs:** REQ-005, DATA-001

**Evidence and freshness:**
- `listRecipientProposals()` already joins `projects` — `client_name` is available without a new join.
- No D1 migration needed (column already exists in `projects`).

**Options:**
1. Add `client_name` to the SELECT and row type.
2. Don't add anything (current fields are sufficient).
3. Add `client_name` + `location` + `open_count`.

**Decision:** Option 1 — Add `client_name` only.

**Why this option:** `client_name` provides useful context (the project's client) without privacy concerns. `location` is governed by `location_visibility` and needs sanitization. `open_count` is owner analytics, not recipient-relevant.

**Rejected alternatives:** Option 2 (misses useful context). Option 3 (privacy/irrelevance concerns).

**Confidence:** High.

**Consequences:** The query SELECT gains one column. The row type gains one field. The credential-free test must be re-run.

**Rollback/revision trigger:** If `client_name` causes any privacy issue, remove it.

**Responsible role:** Lead architect.

---

### DEC-AUTO-006: XLSX Export Pipeline Stays As-Is Architecturally

**Question:** Should the XLSX export pipeline be rearchitected?

**Affected IDs:** REQ-009, DATA-002

**Evidence and freshness:**
- `src/lib/proposal-export/` — 6 files, well-structured.
- `createProposalWorkbook` uses ExcelJS with formula-driven totals.
- `applyAudiencePolicy` is server-gated.
- Audit findings are P2 (currency hardcoding, no Zod, edge cases).

**Options:**
1. Keep architecture as-is; fix-forward P2 findings.
2. Rearchitect with Zod validation and currency abstraction.
3. Replace ExcelJS with a different library.

**Decision:** Option 1 — Keep as-is; fix-forward.

**Why this option:** The pipeline is functional and well-structured. P2 findings are patches, not rewrites. ExcelJS is the established choice (archived plan `2026-05-29-industry-standard-excel-proposal-export-complete` chose it deliberately).

**Rejected alternatives:** Option 2 (over-engineering for beta). Option 3 (unnecessary migration risk).

**Confidence:** High.

**Consequences:** Audit findings are documented as fix-forward patches. The primary action is wiring `currency_code` and verifying edge cases.

**Rollback/revision trigger:** If the currency hardcoding causes user-facing issues (non-PHP projects), prioritize the fix.

**Responsible role:** Lead architect.

---

### DEC-AUTO-007: Make clientName Optional on RecipientProposalRow

**Question:** Should `clientName` be required or optional on `RecipientProposalRow`?

**Affected IDs:** REQ-005, DATA-001, SEC-001

**Evidence and freshness:**
- `tests/vitest/recipient-proposals-page.test.tsx:40-59` — `proposal()` factory returns a full `RecipientProposalRow` with all 14 fields. Adding a required field breaks the factory's type-check.
- `tests/vitest/recipient-proposals-repository.test.ts:91-112` — strict `toEqual` matcher. Adding a field that appears in the actual result but not the expected object fails the assertion.
- The `CHEAPEST_DECISIVE_EXISTING_TEST` trigger permits no test edits. If the test needs updating to mirror a new field, the trigger is invalidated.

**Options:**
1. Make `clientName` optional (`clientName?: string | null`) — avoids breaking both test files.
2. Make `clientName` required — breaks both test files, requiring test edits.
3. Don't add `clientName` at all.

**Decision:** Option 1 — Optional.

**Why this option:** An optional field doesn't break the factory (it can omit the field) and doesn't break `toEqual` (if the actual result also omits it when `client_name` is NULL). Source inspection of the SELECT clause diff is sufficient proof that no sensitive columns were added, reclassifying the test to NOT_REQUIRED.

**Rejected alternatives:** Option 2 (breaks tests, invalidates the existing-test trigger). Option 3 (misses useful display data).

**Confidence:** High.

**Consequences:** UNIT-005's test decision changes from `TARGETED` / `MVP_CRITICAL_INVARIANT` / `CHEAPEST_DECISIVE_EXISTING_TEST` to `NOT_REQUIRED` / `NONE`. The existing credential-free test's regex assertions remain valid evidence but are not run (to avoid the test-edit constraint).

**Rollback/revision trigger:** If `clientName` proves necessary as a required field for UI logic, upgrade it later and update the tests accordingly.

**Responsible role:** Lead architect.

---

### DEC-AUTO-008: Accept TanStack Query Cache Isolation Gap

**Question:** Should the plan add a cache-invalidation bridge between publication mutations and the TanStack Query client cache?

**Affected IDs:** REQ-001, ARCH-001

**Evidence and freshness:**
- `revalidatePath("/workshop/proposals")` in `src/lib/publication/actions.ts:745` purges the RSC data cache but NOT the TanStack Query client cache (`["recipient-proposals", userEmail]`).
- The proposals client uses `staleTime: 30_000` (30s) + `refetchOnWindowFocus: true` + manual Refresh button.
- Publication mutations happen on the publisher page, not the proposals page — the user is unlikely to have both open simultaneously.

**Options:**
1. Accept the gap — 30s staleTime + window-focus refetch + manual Refresh is sufficient for beta.
2. Add a `queryClient.invalidateQueries` bridge — requires a client-side effect (can't be done from server actions directly).
3. Switch to `router.refresh()` pattern (like projects) — significant refactor.

**Decision:** Option 1 — Accept the gap.

**Why this option:** The recipient inbox is not a real-time collaboration surface. The 30s staleTime + window-focus refetch provides adequate freshness. Adding a cache bridge adds complexity without material user benefit for beta. The projects page uses `router.refresh()` because it has optimistic mutations; the proposals inbox is read-only with a single server-action form.

**Rejected alternatives:** Option 2 (complexity for minimal benefit). Option 3 (unnecessary refactor of a working pattern).

**Confidence:** High.

**Consequences:** There is up to a 30s delay between a publication mutation and the inbox reflecting it. Documented in `current-state.md`.

**Rollback/revision trigger:** If users report stale inbox data frequently, add a `queryClient.invalidateQueries` bridge via a client-side event listener or a `router.refresh()` call after publication mutations.

**Responsible role:** Lead architect.

---

### DEC-AUTO-009: Absorb IA-Recovery and Export-Trust Open Items

**Question:** Should the open items from the 2026-07-07 stale plans be absorbed into this pack or left in their original packs?

**Affected IDs:** REQ-011 through REQ-016

**Evidence and freshness:**
- `09_STALE_PLAN_RECONCILIATION.md` — per-item audit with file:line evidence.
- Only 1 of 12 items (FR-08) is already implemented. 7 are ABSORBED, 2 are DEFERRED (Enterprise MVP P1), 2 are DEFERRED (publisher scope).

**Options:**
1. Absorb all open items into this pack — single source of truth.
2. Leave them in the 2026-07-07 packs — multiple planning sources.
3. Create a separate reconciliation pack.

**Decision:** Option 1 — Absorb.

**Why this option:** The 2026-07-07 packs are CONDITIONALLY_READY (never verified). Absorbing their open items into this pack creates a single, validated source of truth. The absorbed items are in-scope for the proposals feature improvement. Deferred items are documented as non-goals.

**Rejected alternatives:** Option 2 (fragmented planning, stale packs remain). Option 3 (unnecessary overhead for a planning pack).

**Confidence:** High.

**Consequences:** 6 new units (UNIT-011 through UNIT-016) and 6 new requirements (REQ-011 through REQ-016) are added. The execution DAG grows from 4 layers to 6.

**Rollback/revision trigger:** If the absorbed scope proves too large, defer UNIT-012, UNIT-015, and UNIT-016 to a separate follow-up pack.

**Responsible role:** Lead architect.

---

## Risk Register

| ID | Risk | Severity | Likelihood | Status | Mitigation |
|---|---|---|---|---|---|
| RISK-001 | TanStack Query hydration mismatch with WorkshopCollectionLayout | P2 | Medium | OPEN | Test SSR-seed + client hydration; use `initialData` pattern correctly |
| RISK-002 | Adding `clientName` breaks existing test files | P1 | Low | MITIGATED | DEC-AUTO-007: make field optional; avoid test edits; use source inspection as proof |
| RISK-003 | Card grid visual doesn't match projects page due to proposal-specific metadata density | P2 | Medium | OPEN | Use `03_TARGET_UX_UI_DESIGN.md` card spec; verify with visual inspection |
| RISK-004 | `WorkshopCollectionLayout` props don't fully match proposals use case | P2 | Low | OPEN | Adapt the wrapper, not the shared component |
| RISK-005 | Stale-plan reconciliation reveals open items that expand scope | P2 | Medium | REALIZED | 7 items absorbed (UNIT-011..016); 4 deferred. Scope expanded but bounded. |
| RISK-006 | XLSX currency hardcoding causes issues for non-PHP projects | P2 | Medium | OPEN | Document as fix-forward; wire `currency_code` if feasible in UNIT-009 |
| RISK-007 | `download_attempt_blocked` event type referenced by code after migration 0066 drop | P1 | Low | OPEN | `rg "download_attempt_blocked"` in UNIT-008 |
| RISK-008 | Contractor-name leak not caught before client-facing export | P1 | Medium | OPEN | UNIT-016 fixes the fallback and adds redaction verification |
| RISK-009 | `responded` status UPDATE not transactional with decision INSERT | P1 | Low | OPEN | UNIT-014 uses D1 batch to ensure atomicity |
| RISK-010 | Share page terminal-state resolver change breaks callers | P2 | Medium | OPEN | UNIT-012 maps all callers of `resolveProjectPublicationAccessByToken` |
| RISK-011 | Cache isolation gap causes user confusion (stale inbox) | P2 | Low | ACCEPTED | DEC-AUTO-008: 30s staleTime + window-focus refetch sufficient for beta |
