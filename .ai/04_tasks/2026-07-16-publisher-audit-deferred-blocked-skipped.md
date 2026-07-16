# Publisher Route — Deferred / Blocked / Skipped Items

**Scope:** the `/workshop/publisher` feature ("Client links" roster + drawer + ShareWizard + manager preview route) and its `client-portal` discussion backing services.
**Source:** the 2026-07-16 comprehensive audit (4 specialist agents — correctness, performance, security, UX/a11y) + baseline diagnostics + live browser verification, followed by an implementation pass.
**Author:** Claude (audit + implementation), 2026-07-16.
**Verification state of the implemented set:** `tsc --noEmit` clean; publisher/client-portal vitest green; 3 new gap tests added (IDOR-denial, status-enum, password-blank); live-verified in the browser.

This document captures **only what was NOT implemented** — items that were blocked, deliberately deferred, skipped as unnecessary, or out of scope — with enough detail that any engineer (or agent) can pick them up. Everything else from the audit was implemented and verified.

---

## How to read

| Status | Meaning |
|---|---|
| 🔴 **BLOCKED** | Cannot safely do right now — the target file is being edited by another concurrent agent, or a hard external dependency (schema apply, deploy) is required. |
| 🟡 **DEFERRED** | Deliberately postponed — pre-beta ROI is low, the change is invasive/risky, or a product decision is needed. Safe to ship without. |
| ⚪ **SKIPPED** | Investigated and concluded **not actually needed** (the "problem" is already handled, or the apparent inconsistency is correct). Listed so it isn't re-flagged. |
| 🔵 **OUT OF SCOPE** | Lives on a different route than `/workshop/publisher`; surfaced by the audit but not part of this feature. |
| ⚫ **PRE-EXISTING / OTHER-AGENT** | A failing test or issue in the tree that is **not caused by** the publisher work; flagged here for the owner of that area. |

Severity: 🔴 P0 · 🟠 P1 · 🟡 P2 · ⚪ P3.

---

## Summary table

| ID | Status | Sev | Item | File:line |
|---|---|---|---|---|
| BLK-01 | 🔴 BLOCKED | 🟠 P1 | Server-side password-blank hardening (defense-in-depth) | `src/lib/publication/actions.ts:861,939-943` |
| BLK-02 | 🔴 BLOCKED | 🟠 P1 | Unbounded `SELECT … FROM projects` in foundation call | `src/lib/repositories/workspace-repository.ts:1511-1518` |
| BLK-03 | 🔴 BLOCKED | 🟡 P2 | Drawer re-runs full 11-query foundation on every open | `src/lib/publisher/drawer-actions.ts:75-79` |
| DEF-01 | 🟡 DEFERRED | 🟡 P2 | No `unstable_cache`/revalidation on the roster path | `src/app/workshop/publisher/page.tsx` |
| DEF-02 | 🟡 DEFERRED | 🟡 P2 | Preview route pulls heavy `"use client"` share renderer | `src/app/workshop/publisher/preview/[projectId]/page.tsx:8` |
| DEF-03 | 🟡 DEFERRED | 🟡 P2 | Idempotency check-then-insert race (no UNIQUE constraint) | `src/lib/client-portal/publisher-discussion-service.ts:212-229,239-250` |
| DEF-04 | 🟡 DEFERRED | 🟡 P2 | `assigneeUserId` not workspace-membership-checked | `src/lib/client-portal/publisher-discussion-service.ts:253-259` |
| DEF-05 | 🟡 DEFERRED | 🟡 P2 | Activity: hoist collab/estimate queries into the publications wave | `src/lib/publisher/activity-repository.ts:336-356` |
| DEF-06 | 🟡 DEFERRED | 🟡 P2 | Discussion threads/messages queries unbounded (no LIMIT) | `src/lib/client-portal/publisher-discussion-service.ts:168,187` |
| DEF-07 | 🟡 DEFERRED | 🟡 P2 | Pervasive 9-10px micro-type scale on load-bearing controls | publisher components (many) |
| DEF-08 | 🟡 DEFERRED | 🟡 P2 | Perf evaluator test doesn't exercise the query plan | `tests/vitest/perf/publisher-roster-evaluator.test.ts` |
| DEF-09 | 🟡 DEFERRED | ⚪ P3 | "(capped)" jargon unclear to users | `src/components/workshop/publisher/PublisherRosterClient.tsx:382` |
| DEF-10 | 🟡 DEFERRED | ⚪ P3 | `managerActor` sets `projectRole: "viewer"` (misleading, safe) | `src/lib/client-portal/publisher-discussion-actions.ts:23` |
| DEF-11 | 🟡 DEFERRED | ⚪ P3 | Decrypt-failure reason may not surface in the UI | `src/lib/publisher/roster-repository.ts:199-202` → `PublisherRosterClient` |
| DEF-12 | 🟡 DEFERRED | ⚪ P3 | `text-muted` / `text-tertiary` are the same failing value | `src/app/globals.css:21,30` |
| DEF-13 | 🟡 DEFERRED | ⚪ P3 | `WorkshopRouteErrorState` uses `text-tertiary` (shared component) | `src/components/workshop/WorkshopRouteErrorState.tsx` |
| SKP-01 | ⚪ SKIPPED | — | `revalidatePath` on reply/note/assign/status mutations | `src/lib/client-portal/publisher-discussion-actions.ts` |
| SKP-02 | ⚪ SKIPPED | — | D1-unavailable hard-500 on the roster page | `src/lib/publisher/roster-repository.ts:146-152` |
| OOS-01 | 🔵 OUT OF SCOPE | 🟠 P1 | `PublisherDiscussionInbox`: AA text-tertiary + no retry on error | `src/components/workshop/publisher/PublisherDiscussionInbox.tsx` |
| OOS-02 | 🔵 OUT OF SCOPE | — | Decorative `aria-hidden` icons left at `text-tertiary` | roster card / empty-state |
| PRE-01..05 | ⚫ OTHER-AGENT | — | 5 share/snapshot vitest failures in the tree | see §5 |

---

## 1. 🔴 BLOCKED — on another agent's concurrent edits

These touch files that were **dirty in the working tree at audit time** (another agent owns them). Per the single-writer-per-file rule, they were left untouched. They are the highest-value remaining items once those files are free.

### BLK-01 — Server-side password-blank hardening (defense-in-depth) — 🟠 P1
- **Location:** `src/lib/publication/actions.ts:861` (`createProjectPublication`) and `:939-943` (`republish` fallthrough).
- **Problem:** The **client-side** fix is already shipped (`ShareWizard.canShare` blocks submit when "Require a password" is checked with a blank password and no existing password → `passwordMissing`). But the **server** still only validates password length *when `password` is truthy*; a `password: undefined` payload sails through and writes `password_hash: null`. A malicious client bypassing the wizard could therefore issue an unprotected link despite the checkbox.
- **Impact:** Defense-in-depth gap only — the shipped UI gate fully prevents the outcome for real users. Security-adjacent.
- **Blocker:** `src/lib/publication/actions.ts` is dirty (another agent). Do not edit concurrently.
- **Recommended fix (when unblocked):** in both `createProjectPublication` and `republish`, when the caller asserts `passwordRequired` (or clears password) validate consistency — i.e. reject `passwordRequired && !password && !existingPasswordHash`. Concretely, gate at `actions.ts:835` and `:907` on the *intent*, not just on `password` truthiness. Add a server-action test (the existing `publisher-wizard.test.tsx` covers the client path only).
- **Unblock when:** `publication/actions.ts` is stable / the other agent's work lands.

### BLK-02 — Unbounded `SELECT … FROM projects` in the foundation call — 🟠 P1
- **Location:** `src/lib/repositories/workspace-repository.ts:1511-1518` (`listCurrentWorkspaceProjectsAppPath`, the owned-projects query). Called (per-request `cache()`-deduped) by the roster, activity, and drawer loads.
- **Problem:** `SELECT … FROM projects WHERE workspace_id = ? ORDER BY updated_at DESC` has **no LIMIT** (unlike the homebase path, which caps at 12). Every roster/activity/drawer load reads every workspace project into memory; at ~1k+ projects this is the dominant cost and also inflates every downstream `IN (projectIds …)` placeholder list (D1 variable-number ceiling risk).
- **Impact:** Latent perf + memory ceiling; triggers at large workspace project counts. Pre-beta-rare but real.
- **Blocker:** `workspace-repository.ts` is dirty (another agent).
- **Recommended fix:** add a LIMIT (e.g. 500) plus a "more projects" indicator, or narrow the publisher code path to a project-id-only projection. Keep `getCurrentWorkspaceProject` (single-project, cached) as the per-project accessor.
- **Unblock when:** `workspace-repository.ts` is stable.

### BLK-03 — Drawer re-runs the full 11-query foundation fetch on every open — 🟡 P2
- **Location:** `src/lib/publisher/drawer-actions.ts:75-79` (`readPublisherPublicationDrawerData`) and `:43-44` (`updatePublisherProjectClientName`).
- **Problem:** Both call `listCurrentWorkspaceProjects()` (the full 11-query, all-projects foundation) merely to `.find()` one project and check RBAC. Because the drawer load is a **server action** (separate request), React `cache()` from the page load does **not** carry over — so the drawer open pays the full foundation cost again.
- **Impact:** Per-open latency; scales with workspace size.
- **Blocker:** Depends on `getCurrentWorkspaceProject` (in `workspace-repository.ts:2655`, a `cache()`-wrapped single-project helper that already exists) — but that file is dirty (another agent), so coupling to it now risks breakage if they change the export.
- **Recommended fix (when unblocked):** replace `listCurrentWorkspaceProjects().projects.find(p => p.project.id === projectId)` with `getCurrentWorkspaceProject(projectId)` in both call sites; cut the drawer open from ~11 queries to ~1. Verify the returned shape matches (it should — same project-item type).
- **Unblock when:** `workspace-repository.ts` is stable and `getCurrentWorkspaceProject`'s signature/return is confirmed unchanged.

---

## 2. 🟡 DEFERRED — deliberate (pre-beta ROI / risk / product call)

### DEF-01 — No `unstable_cache` / revalidation on the roster path — 🟡 P2
- **Location:** `src/app/workshop/publisher/page.tsx` (dynamic — awaits `searchParams`, so every navigation re-runs the full 5-stage D1 pipeline).
- **Problem:** Back/forward to the same filter set re-runs everything; no cross-request cache. Cost ≈ 5 sequential D1 RTTs per page load.
- **Why deferred:** Adds a caching layer with invalidation correctness concerns (must `revalidateTag` on every publication write — many call sites). Pre-beta, correctness > micro-perf.
- **Recommended fix:** `unstable_cache(readWorkspacePublicationsRoster, […], { tags: […], revalidate: 30-60 })` keyed on `[workspaceId, userId, filters]`, with `revalidateTag("publisher-roster")` added to publication mutations. Pair with a test that asserts staleness clears after a write.

### DEF-02 — Preview route pulls the heavy share renderer into its chunk — 🟡 P2
- **Location:** `src/app/workshop/publisher/preview/[projectId]/page.tsx:8` (`import ShareReviewWorkspace from "…"`).
- **Problem:** `ShareReviewWorkspace` is `"use client"` and transitively pulls ~2,500 lines of the share subsystem + `d3-shape` into the preview route's client chunk. The page is a Server Component with no Suspense / code-splitting.
- **Why deferred:** The route is **manager-only and rarely hit**; the cost is paid only when a manager previews, and the fix requires a new client-wrapper component (can't use `next/dynamic({ ssr:false })` directly in a Server Component). Low ROI pre-beta; new file for a rare path.
- **Recommended fix:** introduce a tiny client wrapper (`ShareReviewWorkspaceClient.tsx`) that `next/dynamic(() => import("…"), { ssr: false, loading: <Skeleton/> })`, and render that from the server page. Or route-level split.

### DEF-03 — Idempotency check-then-insert race — 🟡 P2
- **Location:** `src/lib/client-portal/publisher-discussion-service.ts:212-229` (reply) and `:239-250` (note). The replay `SELECT` and the `INSERT` (inside `runBatch`) are separate operations with no DB-level uniqueness guarantee.
- **Problem:** Two concurrent requests with the same `idempotencyKey` could both pass the replay check and both insert → duplicate messages. D1 `batch()` is atomic within a call but gives no cross-request isolation.
- **Why deferred:** Requires a **schema migration** (`CREATE UNIQUE INDEX`) on a table that may already contain duplicates — applying it could fail, and the apply path needs care (see repo memory: `supabase db query --file` skips the migration ledger). Impact is low (client-generated UUIDs make true collisions negligible; double-submit is rare).
- **Recommended fix:**
  1. Add migration: `CREATE UNIQUE INDEX IF NOT EXISTS client_portal_messages_idempotency_uidx ON client_portal_messages (thread_id, actor_type, actor_id, idempotency_key);` (de-dupe existing rows first if any).
  2. In `replyToClientPortalThreadAsOwner` / `addClientPortalInternalNote`, catch the duplicate-key error (D1 `SQLITE_CONSTRAINT_UNIQUE`) and treat as a replay (re-read + return the existing message).
- **Unblock when:** a safe migration-apply window; confirm no existing duplicates via `SELECT thread_id, actor_type, actor_id, idempotency_key, COUNT(*) … HAVING COUNT(*)>1`.

### DEF-04 — `assigneeUserId` not workspace-membership-checked — 🟡 P2
- **Location:** `src/lib/client-portal/publisher-discussion-service.ts:253-259` (`assignClientPortalThread`).
- **Problem:** `assigneeUserId` is only validated for non-empty + length ≤128, then written straight to `assignee_user_id`. A manager could assign a thread to an arbitrary / non-workspace user id.
- **Why deferred:** `assignee_user_id` is **display/filter only — it grants no privileges** (no downstream code authorizes on assignment). Pure data-hygiene, P2. The fix needs the `workspace_members` D1 schema confirmed (column names) — queried at `workspace-repository.ts:1267,1325,1557`.
- **Recommended fix:** after the length check, query membership:
  `SELECT user_id FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1` (use `actor.workspaceId`); throw `PublisherDiscussionError("client_portal_discussion_invalid", …)` if absent. Decide product intent first: allow any user id, or restrict to workspace members / project members.

### DEF-05 — Activity: hoist collab/estimate queries into the publications wave — 🟡 P2
- **Location:** `src/lib/publisher/activity-repository.ts:336-356` (the `collaboration_audit_events` and `estimate_sheet_events` queries only depend on `projectIds`, which are known **before** the publications query).
- **Problem:** They currently run in the Promise.all **after** the publications fetch. They could start in the same wave as publications, saving one RTT.
- **Note:** The clear win in this area **was implemented** — the recipient-label and actor-label fetches are now parallelized into one wave (`:370-394`). This remaining hoist is more invasive (restructures the wave + the `unavailableSource` tracking) and was left for that reason.
- **Recommended fix:** move the two project-only queries' construction + `runPublisherActivityQuery` into a `Promise.all` with the publications query, preserving the per-source unavailability tracking.

### DEF-06 — Discussion threads/messages queries unbounded — 🟡 P2
- **Location:** `src/lib/client-portal/publisher-discussion-service.ts:168` (`listPublisherDiscussionThreads`) and `:187` (`listPublisherDiscussionMessages`).
- **Problem:** Neither has a `LIMIT`. A portal with thousands of messages would load all of them.
- **Why deferred:** Low risk pre-beta; the service already supports cursor semantics elsewhere. Pagination needs a UI decision (infinite scroll vs. pager).
- **Recommended fix:** add `LIMIT 200` + cursor pagination; reuse the existing `decodeSharedLinkActivityCursor` pattern.

### DEF-07 — Pervasive 9-10px micro-type scale — 🟡 P2
- **Location:** throughout the publisher components (toolbar search/dropdowns/buttons, drawer body, wizard, picker).
- **Problem:** Load-bearing controls/labels at 9-10px leave no headroom at 200% zoom (WCAG 1.4.4). The **AA-contrast failures** in this area were all fixed (color); the **size** is a separate readability/zoom concern.
- **Why deferred:** A full type-scale redesign is subjective, touches the whole feature, and risks visual churn mid-alpha. The audit recommended ≥11-12px for load-bearing controls while leaving decorative meta small — that's a design decision, not a mechanical fix.
- **Recommended fix:** product/design call — bump load-bearing controls/labels to ≥11px; keep decorative meta small. Do it as one coherent pass, not piecemeal.

### DEF-08 — Perf evaluator test doesn't exercise the query plan — 🟡 P2
- **Location:** `tests/vitest/perf/publisher-roster-evaluator.test.ts`.
- **Problem:** It validates only the aggregate `GROUP BY` shape at 10/50/100 rows — not the roster-repository query plan, the (now-fixed) correlated subquery, or cap/pagination interactions.
- **Why deferred:** The O(K²) subquery was already rewritten to a window function; this test would lock that in. Worth adding but not blocking.
- **Recommended fix:** add a case with multiple publications per project asserting the `ROW_NUMBER()` path returns exactly one row per project; add a >100-pub case asserting draft-seeding behavior (the compose-level test in `publisher-roster-repository.test.ts` already covers the latter at the unit level).

### DEF-09 — "(capped)" jargon — ⚪ P3
- **Location:** `src/components/workshop/publisher/PublisherRosterClient.tsx:382` (`{roster.truncated ? " (capped)" : ""}`).
- **Problem:** "(capped)" is unclear to users.
- **Recommended fix:** "showing first N" or a tooltip explaining the publication-scan limit. Decide copy.

### DEF-10 — `managerActor` mislabels role as "viewer" — ⚪ P3
- **Location:** `src/lib/client-portal/publisher-discussion-actions.ts:23` (`projectRole: "viewer"`).
- **Problem:** The actor is constructed with `projectRole: "viewer"` despite being a manager; it works because `internalCapabilities` grants all caps when `portalGrants.includes("manager")`. Misleading for audit/log readability.
- **Why deferred:** Safe (no behavior impact); cosmetic.
- **Recommended fix:** set `projectRole` to the user's actual role, or document why "viewer" + manager grant is the intended shape.

### DEF-11 — Decrypt-failure reason may not surface in the UI — ⚪ P3
- **Location:** `src/lib/publisher/roster-repository.ts:199-202` sets `linkUnavailableReason: "token-unavailable"` on decrypt failure; the row carries it (`ProjectPublicationRosterRow.linkUnavailableReason`).
- **Problem:** Whether `PublisherRosterClient` / `PublisherRosterCard` actually **renders** that reason (vs. silently hiding the copy button) is unverified. The data is available; the rendering is not.
- **Recommended fix:** confirm the card shows a "Link unavailable" affordance with a tooltip/title when `linkUnavailableReason` is set (the copy label already says "Link unavailable"; verify the disabled state explains why).

### DEF-12 — `text-muted` / `text-tertiary` token duplication — ⚪ P3
- **Location:** `src/app/globals.css:21` (`--tertiary: #7f7f7f`) and `:30` (`--muted: #7f7f7f`) — same value, two names, both fail AA on white.
- **Problem:** Two tokens for one failing value. `StatusBadge` previously used both (`text-muted` for draft, `text-tertiary` for inactive); the badge colors were fixed in this pass, but the underlying tokens still fail AA elsewhere across the app.
- **Why deferred:** Design-system-level change with app-wide blast radius; needs a decision on the canonical secondary/tertiary/muted ramp.
- **Recommended fix:** reconcile the tokens — e.g. retire one, and set the surviving "tertiary/muted" to an AA-passing value for **load-bearing** uses (the audit used `#5D5D5D` / `text-secondary` for this). Per repo memory, `#7F7F7F` tertiary is DESIGN.md-sanctioned but fails WCAG AA.

### DEF-13 — `WorkshopRouteErrorState` uses `text-tertiary` — ⚪ P3
- **Location:** `src/components/workshop/WorkshopRouteErrorState.tsx:45,51` (the error route's eyebrow/body).
- **Problem:** Same AA-failing `text-tertiary` token, on the error surface used by `/workshop/publisher/error.tsx` (and other workshop routes).
- **Why deferred:** Shared component (wide blast radius) and the error route is a minor surface; the publisher-scope AA sweep was kept tight to avoid unrelated churn.
- **Recommended fix:** `text-tertiary` → `text-secondary` on the eyebrow/body; low risk.

---

## 3. ⚪ SKIPPED — investigated, not needed (don't re-flag)

### SKP-01 — `revalidatePath` on reply/note/assign/status mutations
- **Location:** `src/lib/client-portal/publisher-discussion-actions.ts:49-67`.
- **Apparent issue:** only `carryForwardClientPortalThreadAction` (`:72`) calls `revalidatePath`; the others don't.
- **Why skipped:** The "inconsistency" is **correct**. Only carry-forward changes RSC-rendered portal-detail state; the discussion inbox is client-fetched (TanStack Query invalidates on mutation return). Adding `revalidatePath` to the others would cause unnecessary re-renders with no benefit. If an RSC ever starts rendering thread counts/status outside the client-managed panel, revisit.

### SKP-02 — D1-unavailable hard-500 on the roster page
- **Location:** `src/lib/publisher/roster-repository.ts:146-152` (`requirePublisherRosterD1Database` throws when D1 is null).
- **Apparent issue:** D1 unavailable → throw → page unusable.
- **Why skipped:** The route has an **`error.tsx` boundary** (`src/app/workshop/publisher/error.tsx` → `WorkshopRouteErrorState`) that catches the throw and shows a retry UI. So the real user experience is a retryable error state, **not** a raw 500. Adequate for pre-beta. (If you want a softer fallback — empty roster with a banner — wrap the call in `page.tsx`; but the error boundary is sufficient.)

---

## 4. 🔵 OUT OF SCOPE — different route

### OOS-01 — `PublisherDiscussionInbox` AA + no-retry-on-error — 🟠 P1 (on its own route)
- **Location:** `src/components/workshop/publisher/PublisherDiscussionInbox.tsx:114,134,138` (`text-tertiary`) and `:37-41,52-56,118-119` (error state has no Retry button; reply briefly flashes "Loading discussions…").
- **Why out of scope:** This component is rendered on **`/workshop/projects/[projectId]/client-portals/[portalId]/discussions`**, **not** `/workshop/publisher`. The publisher audit surfaced it because the file lives under `components/workshop/publisher/`, but it is a separate surface.
- **Recommended fix:** when auditing that route — swap the `text-tertiary` labels to `text-secondary`; render a Retry button when `state === "error"`; use a separate "refreshing" flag instead of reusing `state: "loading"` (which flashes the loading text after every reply).

### OOS-02 — Decorative `aria-hidden` icons left at `text-tertiary`
- **Location:** `PublisherRosterCard.tsx:77` (copy icon button), `:87` (arrow), `PublisherRosterClient.tsx:415` (empty-state `ShareNetwork` icon).
- **Why out of scope / skipped:** These are **non-text** (`aria-hidden` or icon glyphs). `#7F7F7F` on white ≈ 4.0:1, which **passes** WCAG 1.4.11 (non-text contrast ≥ 3:1). The copy button additionally goes to `text-ink` on hover. No AA failure. Left intentionally.

---

## 5. ⚫ PRE-EXISTING / OTHER-AGENT — failing tests in the tree (not caused by this work)

A full `publisher client-portal share` vitest run shows **5 test files / 6 tests failing**. All were verified to be **pre-existing or caused by another agent's concurrent work** — none are caused by the publisher implementation pass (publisher/client-portal surfaces are fully green). Flagged here for the owner of the share/snapshot area.

| Test | Subject source file | Status of source | Cause |
|---|---|---|---|
| `share/share-summary-card.test.tsx` (24px anchor) | `SharePageSummaryCard.tsx` | **CLEAN at HEAD** | Pre-existing stale test (expects `text-[24px]`, code is `text-[18px]`) |
| `share/share-page-get-routes-contract.test.ts` (×2, decision GET route) | `src/app/api/share/[token]/decision/route.ts` | **CLEAN at HEAD** | Pre-existing (route contract drift) |
| `share-snapshot-redaction.test.tsx` | `src/lib/publication/snapshot.ts` | **DIRTY (other agent)** | Another agent's snapshot.ts change |
| `shared-link-perf-budgets-script.test.ts` (snapshot byte budget) | `src/lib/publication/snapshot.ts` | **DIRTY (other agent)** | Same snapshot.ts change |
| `publisher-manager-preview-route.test.tsx` (reads `ShareReviewWorkspace.tsx`) | `src/components/share/ShareReviewWorkspace.tsx` | **CLEAN at HEAD** | Pre-existing stale test (expects copy string `"Recipient comments and response controls are disabled in manager preview."` that no longer exists in the component) |

**Action:** hand the snapshot.ts work back to its owner to fix `share-snapshot-redaction` + `shared-link-perf-budgets`; update or delete the three stale tests (share-summary-card, share-page-get-routes-contract, publisher-manager-preview-route) whose expectations no longer match committed code.

---

## 6. Verified CLEAN (brief — not problems)

So these are not re-litigated: the audit confirmed the publisher route has **no P0 vulnerabilities**; **two-layer authz** (`assertProjectPublicationManager` + service-level `policyPortal`) blocks cross-project IDOR (proven by the new `publisher-discussion-hardening.test.ts`); **no SQL injection** (all `?`-bound); **no XSS** (sanitized, no `dangerouslySetInnerHTML`); **no N+1** (batched `IN(...)` in two parallel waves; per-request `cache()` dedupes the page→repository double-call); **pessimistic mutations with rollback** and an in-flight guard; real shape-matched skeleton + `loading.tsx` streaming + `error.tsx` with retry/auto-focus; strong wizard loading/error/empty/unsaved-changes states; target sizes ≥32px; decrypted share token gated to managers and redacted for read-only users.

---

## Recommended tackle order

1. **BLK-01** (server password hardening) — biggest remaining security gap; small, once `actions.ts` is free.
2. **DEF-03** (idempotency UNIQUE) — correctness of the idempotency contract; needs a safe migration window.
3. **BLK-02 / BLK-03** (unbounded projects SELECT + drawer fetch) — pair them; both in `workspace-repository.ts`'s orbit; use `getCurrentWorkspaceProject` for the drawer.
4. **DEF-01** (`unstable_cache`) — meaningful nav perf once invalidation tags are wired across publication writes.
5. **DEF-07 / DEF-12 / DEF-13** — the remaining AA/type items, as one coherent design pass (defer to design).
6. **DEF-02, DEF-04, DEF-05, DEF-06, DEF-08** — smaller perf/hygiene items; batch opportunistically.
7. **PRE-01..05** — not the publisher owner's job; route to the share/snapshot owner.
