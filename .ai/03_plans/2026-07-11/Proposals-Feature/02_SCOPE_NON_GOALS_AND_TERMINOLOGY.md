# 02 — Scope, Non-Goals, and Terminology

---

## 1. Terminology Reconciliation

The feature uses two terms for the same concept. This section establishes the
canonical vocabulary for this plan pack and for implementation.

| Canonical term | User-facing term | Data-model term | When to use which |
|---|---|---|---|
| **Proposal** | "Proposal" (sidebar, page title, card labels) | `project_publications` row | Use "proposal" in all user-facing copy, component names, route names. |
| **Publication** | (not shown to users) | `project_publications` | Use "publication" in repository layer, server actions, D1 queries, internal type names. |
| **Recipient** | (the client reviewer) | `shared_link_recipients` row | Use "recipient" in data/auth code. |
| **Decision** | "Decision" (Accepted / Declined / Revision requested) | `shared_link_responses.decision` | Same term both sides. |
| **Snapshot** | (not shown to users) | `project_publications.snapshot_json` | Data-model only. |
| **Export** | "Export" / "Download" | XLSX workbook | The XLSX file generated from an estimate. |

**Rule:** User-facing copy always says "proposal." Internal code may use
"publication" where it refers to the data model. The inbox route stays
`/workshop/proposals` (user-facing). The repository stays
`recipient-proposals-repository.ts` (already named).

---

## 2. Entity Model

```
Workspace (1)
  └── Project (N)
        ├── Estimates (N) ← source data for proposal snapshot
        └── Project Publication (0..1 live "published") ← the "proposal"
              ├── Snapshot JSON (frozen estimate data at publish time)
              ├── Selected Estimate IDs (JSON array)
              ├── Shared Link Recipients (N) ← the invited clients
              │     ├── Recipient Token Hash (credential)
              │     ├── Last Opened At
              │     └── Delivery Status (email tracking)
              ├── Shared Link Comments (N)
              ├── Shared Link Responses (0..1 per recipient) ← the decision
              │     ├── Decision (accepted|declined|revision_requested)
              │     ├── Signer Name
              │     └── Signature Intent Hash
              ├── Shared Link Events (N) ← open/comment/decision analytics
              └── Publication Events (N) ← open/password analytics
```

**Key invariants:**
- At most 1 `published` publication per project (partial UNIQUE index).
- A publication's `snapshot_json` is immutable after publish (republish creates a new row).
- `selected_estimate_ids` determines which estimates are included in the snapshot.
- Recipient matching is by `lower(email)` against the signed-in user's email.

---

## 3. In-Scope Workstreams

| Workstream | Description | Primary artifact |
|---|---|---|
| Inbox collection-layout adoption | Replace the flat bordered table with `WorkshopCollectionLayout` (search + toolbar + tabs + content shell) matching the projects page | `03_TARGET_UX_UI_DESIGN.md`, `06_IMPLEMENTATION_PLAN.md` UNIT-001 |
| Proposal card component | Build `ProposalCard` mirroring `LiveProjectCard`'s glass-card visual language with proposal-specific metadata | `03_TARGET_UX_UI_DESIGN.md`, UNIT-002 |
| Status tabs, search, sort, view modes | Add filtering (status tabs), instant search, sort dropdowns, view-mode toggle (list/cards) | `03_TARGET_UX_UI_DESIGN.md`, UNIT-003 |
| Grouping | Optional grouping by workspace or status | `03_TARGET_UX_UI_DESIGN.md`, UNIT-004 |
| Data layer improvements | Client-side filtering/sorting (no server changes needed for V1); evaluate pagination beyond 50 | `04_DATA_API_AND_REPOSITORY_DESIGN.md`, UNIT-005 |
| State parity | Skeleton, empty states, error states matching projects page patterns | `03_TARGET_UX_UI_DESIGN.md`, UNIT-006 |
| XLSX export audit | Audit export pipeline for edge cases, currency handling, validation | `04_DATA_API_AND_REPOSITORY_DESIGN.md`, UNIT-009 |
| Share/review surface audit | Verify Publisher-And-Shared-Pages output; check IA recovery plan open items | UNIT-007 |
| Publisher flow audit | Verify publish/republish/revoke lifecycle correctness | UNIT-008 |
| Stale-plan reconciliation | Check 2026-07-07 plans' open items against current implementation; mark superseded or absorb | UNIT-010 |

---

## 4. Non-Goals

| Non-goal | Owned by / reason |
|---|---|
| Server-generated PDF export | Enterprise MVP P1 (D-009); renderer decision is BLOCKED-EXTERNAL (DEC-FORMAT-1) awaiting Philip. |
| Immutable issued proposal snapshots | Enterprise MVP P1 (D-008/ENTERPRISE-P1-PROD-001). Current export is mutable XLSX by design. |
| New `proposals` table separate from `project_publications` | Deferred — `project_publications` is the canonical record. |
| Cloudflare Email bounce ingestion | BLOCKED-EXTERNAL per client-ready-proposal-workflow REL-01. |
| In-app notification dispatch for recipient events | Phase 5 of client-ready-proposal-workflow; OPEN-IA-04. |
| Changing decision immutability schema (allowing revision) | OPEN-IA-03; future pack. |
| Owner-side publisher workflow redesign | Already completed in Publisher-And-Shared-Pages (archived 2026-07-11). |
| Landing page / marketing copy changes | Not a product feature. |
| DnD reordering of proposals | Proposals are recipient-side read-only data; not applicable. |
| Bulk selection/delete on proposals | Not applicable to recipient inbox. |
| Favorites on proposals | Not applicable. |
| Proposal creation/editing from the inbox | Recipients don't create proposals; creation is the publisher flow. |
| Server-side pagination for V1 | Recipient list is ≤50 rows; client-side filtering is sufficient. Server pagination deferred to when >50 recipients becomes common. |

---

## 5. Constraints

1. **Privacy:** The recipient-visible data is the whitelisted `RecipientProposalRow` — never token hashes, encrypted tokens, recipient tokens, or password hashes. The existing repository credential-free assertion must be preserved.
2. **Token sensitivity:** Publication and recipient raw tokens are credentials. They appear only in URLs and email links; never logged, rendered, or persisted raw.
3. **Stack:** Next.js 16 + React 19 + TanStack Query + D1 `ARCH_DB` + signed cookies + Better Auth + Cloudflare Email.
4. **Shared worktree:** Multiple agents/humans may be active. No branch/worktree operations; file-scope ownership and fresh `git status` checks before edits.
5. **Design system:** `DESIGN.md` is alpha-stage guidance — defer to Philip on design decisions. Don't block on design-system grounds.
6. **Cost posture:** Stay on free-tier Cloudflare limits. No paid add-ons without explicit approval.
7. **Migration discipline:** `migrations/` is the only active directory. Supabase migrations are historical only. If a migration is needed, re-check `ls migrations/ | sort | tail -3` before creating.
8. **Verification:** Tests default to `NOT_REQUIRED`. Use the cheapest decisive evidence. No test creation unless a named MVP-critical invariant cannot be proved more cheaply.

---

## 6. Success Metrics (Planning-Level)

- The proposals inbox uses `WorkshopCollectionLayout` with search, status tabs, sort, and view modes — visually consistent with the projects page.
- A recipient can search proposals by project name, workspace, or project code.
- A recipient can filter by status (New / Opened / Decision submitted / Expired / Revoked).
- A recipient can switch between card grid and list view.
- Proposal cards show all relevant metadata (status, decision, expiry, sender, version, workspace, project name, sent date, last activity).
- Empty/loading/error states match the projects page patterns.
- The XLSX export pipeline is audited with documented edge-case findings.
- The share/review surface and publisher flow are audited with documented findings.
- All stale plans are reconciled (superseded items marked, open items absorbed).
- No owner/internal data or raw tokens leak to recipients.

---

## 7. Failure Metrics (What Would Make This Plan a Failure)

- The pack leaves any inbox UX/UI gap ambiguous (no design, no component, no behavior).
- The pack exposes or recommends exposing owner/internal data or raw tokens to recipients.
- The pack duplicates or contradicts the archived Publisher-And-Shared-Pages plan's scope.
- The pack recommends a schema change that is not paired with a rollback/fix-forward strategy.
- The pack leaves any internally resolvable decision open.
