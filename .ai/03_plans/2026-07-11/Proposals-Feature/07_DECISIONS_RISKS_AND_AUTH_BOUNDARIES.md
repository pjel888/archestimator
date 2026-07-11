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

## Risk Register

| ID | Risk | Severity | Likelihood | Status | Mitigation |
|---|---|---|---|---|---|
| RISK-001 | TanStack Query hydration mismatch with WorkshopCollectionLayout | P2 | Medium | OPEN | Test SSR-seed + client hydration; use `initialData` pattern correctly |
| RISK-002 | Credential-free repository test breaks when adding `client_name` | P1 | Low | OPEN | Run existing test after query change (UNIT-005) |
| RISK-003 | Card grid visual doesn't match projects page due to proposal-specific metadata density | P2 | Medium | OPEN | Use `03_TARGET_UX_UI_DESIGN.md` card spec; verify with visual inspection |
| RISK-004 | `WorkshopCollectionLayout` props don't fully match proposals use case | P2 | Low | OPEN | Adapt the wrapper, not the shared component |
| RISK-005 | Stale-plan reconciliation reveals open items that expand scope | P2 | Medium | OPEN | Absorb or defer per `02_SCOPE_NON_GOALS_AND_TERMINOLOGY.md` non-goals |
| RISK-006 | XLSX currency hardcoding causes issues for non-PHP projects | P2 | Medium | OPEN | Document as fix-forward; wire `currency_code` if feasible in UNIT-009 |
| RISK-007 | `download_attempt_blocked` event type referenced by code after migration 0066 drop | P1 | Low | OPEN | `rg "download_attempt_blocked"` in UNIT-008 |

---

## Authorization Boundaries

**No active `AUTH-*` boundaries.** All work is within:
- Standing Cloudflare-resource authorization (D1/R2/DO/Queue/Email changes within `wrangler.jsonc` bindings).
- Local implementation scope (`IMPLEMENT_LOCAL`).
- No paid add-ons, no external provider mutations, no destructive Git history work.

**Potential future `AUTH-*` (not active in this pack):**
- PDF renderer licensing decision (DEC-FORMAT-1 in the 2026-07-07 export trust plan) — BLOCKED-EXTERNAL, awaiting Philip. Not triggered by this pack (PDF is a non-goal).
