# `/workshop/proposals` — Deferred, Blocked & Skipped Follow-ups

| | |
|---|---|
| **Route** | `http://localhost:3000/workshop/proposals` (recipient proposals inbox) |
| **Audit date** | 2026-07-15 → 2026-07-16 |
| **Source** | 5-agent parallel audit (correctness, security, performance, a11y, React/UX) + lead verification |
| **Implementation** | P1/P2 bugs fixed; **this doc lists only what was NOT changed and why** |
| **Test state after impl** | 31/31 green (proposals + auth suites); react-doctor proposals-page 100/100 |
| **Committed?** | **No** — see §E (concurrent agents in the tree) |

> **One-line summary:** Of the audit's ~16 findings, the real bugs were fixed. Three findings that *looked* like bugs were **deliberate, tested safety invariants** (the suite caught each when I tried to "fix" it) and were reverted. A handful are **design-system-level** (fixing them on one route would cause inconsistency). A few are **accepted tradeoffs** of the bearer-link model, and some **verification steps were skipped** because of concurrent-agent activity in the working tree.

---

## How to read this

Each item below is tagged with a **disposition**:

- **INVARIANT** — looks like a bug, is actually a deliberate, test-pinned safety feature. Do not "fix" without explicit sign-off and a plan to preserve the invariant.
- **DESIGN-SYSTEM** — a real issue, but app-wide in nature; fixing it only on `/workshop/proposals` would create inconsistency. Belongs to a design-system-level pass.
- **ACCEPTED** — a known tradeoff of an established design model, not a defect. Documented for awareness.
- **VERIFY-GAP** — a verification step I did not run, with the reason and the command to run it later.
- **PROCESS** — a workflow constraint (no commit, shared-file ownership) relevant to landing the work.

---

## §A — Intentional invariants (DO NOT "fix" without sign-off)

These three were flagged by the audit (correctness/perf), I implemented "fixes," the **test suite failed**, and investigation showed the behavior is a **deliberate safety invariant** with a test pinning it. All were reverted. Code comments now document each as intentional.

### A1 — Whole-inbox fails on a single corrupt row  · `INVARIANT`
- **Finding (#16, P3):** `listRecipientProposals` returns `{ ok: false, error: "unknown" }` for the *entire inbox* if any one row fails to normalize (`normalizeDecision` → undefined, or non-finite `snapshotVersion`). "One bad row poisons the inbox."
- **Location:** `src/lib/repositories/recipient-proposals-repository.ts` — `if (rows.some((row) => row === null)) return { ok: false, error: "unknown" };`
- **My attempted fix (reverted):** filter corrupt rows and continue.
- **Why it's intentional:** Fail-closed safety — the system never serves a *partial* inbox derived from unexpected/corrupt data. Schema `CHECK` constraints (`migrations/0014_publication_shared_links.sql:130` decision CHECK, `:9` snapshot_version CHECK) make corruption near-impossible, so this is defense-in-depth for the impossible case.
- **Pinning tests:**
  - `tests/vitest/recipient-inbox-dead-end.test.tsx:10` — asserts the exact source line exists.
  - `tests/vitest/recipient-proposals-repository.test.ts:122-130` — malformed `decision` → `{ ok: false, error: "unknown" }`.
- **What a *legitimate* change would require:** (1) product sign-off that fail-closed → fail-soft is acceptable; (2) skip-and-log the corrupt row + surface a soft warning; (3) update **both** pinning tests deliberately. Not a quick fix.

### A2 — Serial auth waterfall (access check before profile lookup)  · `INVARIANT`
- **Finding (#9, P1 perf):** `getBetterAuthCurrentUserContext` awaits the closed-beta access check, *then* the profile lookup, serially. They're independent D1 reads that could run concurrently, saving one D1 round-trip on every authenticated request's critical path.
- **Location:** `src/lib/auth/session.ts:65-77` (`getBetterAuthCurrentUserContext`).
- **My attempted fix (reverted):** `Promise.all([...])` the two reads.
- **Why it's intentional:** **Fail-fast denial.** Revoked / closed-beta-denied users are rejected *before* any profile lookup runs (cost discipline + security principle). Parallelizing would fetch a profile for every denied user.
- **Pinning test:** `tests/vitest/auth-session-closed-beta.test.ts:77` — test name is literally *"blocks revoked users before loading or creating a profile"*; it asserts `getProfileByEmailFromCloudflareD1` is **not called** when access is denied.
- **What a *legitimate* change would require:** The naive `Promise.all` is blocked by the invariant. Real options: (a) cache the profile lookup so denial doesn't pay full cost; (b) accept the invariant and optimize elsewhere; (c) restructure so the denial fast-path is preserved *and* allowed users get concurrency (hard — you need the access result to know which path you're on). Any of these is a cross-cutting auth-layer change owned by the auth maintainer, not this route.

### A3 — Expiry timestamp counts as "last activity"  · `INVARIANT` (judgment call)
- **Finding (#11, P2):** `last_activity_at`'s `MAX(...)` includes a `CASE` that contributes `expires_at` once expiry has passed, so a recently-expired proposal sorts to the top of the inbox and its "Last activity" label shows the expiry time. "Not an activity; misleading."
- **Location:** `src/lib/repositories/recipient-proposals-repository.ts:114-123` (the `MAX(...)` block).
- **My attempted fix (reverted):** dropped the expiry `CASE` from the `MAX`.
- **Why it's intentional / a judgment call:** Surfacing a recently-expired proposal at the top can be read as a *feature* (the recipient should notice their proposal expired). Reversing it also changes the SQL bind structure (removes one `now` parameter), which `recipient-proposals-repository.test.ts:118` pins (`query.values` expects 4 binds incl. two `now`).
- **What a *legitimate* change would require:** (1) product decision on whether expiry should count as activity; (2) if yes-but-mislabeled, rename the UI label "Last activity" → "Last updated"; (3) if no, drop the `CASE` **and** update the `query.values` assertion (50/51 binding count stays, but the `now` count drops).

---

## §B — Design-system-level (deferred; a route-only fix would cause inconsistency)

Real issues, but they originate in the app-wide design vocabulary. Fixing them only on this route would make it inconsistent with every other workshop screen.

### B1 — Sub-12px font sizes everywhere  · `DESIGN-SYSTEM`
- **Finding (a11y P2-8):** `text-[9px]` and `text-[10px]` are used pervasively for load-bearing metadata. Live HTML for this route: **3× `text-[9px]`, 23× `text-[10px]`**. Below any conventional readability floor (the design system's own landing caption floor is 14px).
- **Locations:** `ProposalRow.tsx` (workspace name, project code, version/sent/from meta, chips, expiry, last-activity, action error), `proposals-page-client.tsx` (toolbar), and the same pattern across the entire workshop.
- **Why deferred:** These sizes are deliberate and consistent across the whole app; the `impeccable` design hook approved them as non-anti-pattern. Bumping only this route breaks visual consistency.
- **Recommended approach:** Design-system-level decision — establish a metadata floor (e.g., 11px) and migrate token-by-token app-wide, not route-by-route. Pair with the existing contrast work (B-series tokens).

### B2 — `truncate` hides identity at narrow widths / zoom  · `DESIGN-SYSTEM`
- **Finding (a11y P2-9):** the project-name `<h3>` and the toolbar email use CSS `truncate` (single-line ellipsis). Screen readers get the full string (DOM intact — good), but sighted users at 200% zoom or narrow widths see only the prefix.
- **Location:** `ProposalRow.tsx:101` (project name), `proposals-page-client.tsx` (email).
- **Why deferred:** Cosmetic; the `impeccable` hook approved the current layout. Switching to `line-clamp-2` changes row height and is a judgment call.
- **Recommended approach:** Project name → `line-clamp-2`; truncated email → add a `title` attribute. Low effort, but route the change through the design system so all truncated headings behave consistently.

### B3 — Shared route error boundary fails AA  · `DESIGN-SYSTEM` (shared file)
- **Finding (a11y P2-12):** the route-level error boundary (`error.tsx` → `WorkshopRouteErrorState.tsx`) renders the route label at `text-[8px]` and the description at `text-[10px]`, both in `text-tertiary` (#7F7F7F, 4.0:1) — a **double AA fail** (contrast + size).
- **Location:** `src/components/workshop/WorkshopRouteErrorState.tsx` (shared by **all** workshop error boundaries).
- **Why deferred:** Shared file, cross-cutting (every workshop route's error state), and concurrent agents are active → high collision risk for an edit that isn't proposals-specific.
- **Recommended approach:** In `WorkshopRouteErrorState.tsx`, switch `text-tertiary` → `text-secondary` (#5D5D5D, 6.58:1). One-line, but coordinate as a shared-file change.

---

## §C — Accepted tradeoffs (documented, not defects)

### C1 — Bearer publication token in the URL  · `ACCEPTED`
- **Finding (security P2):** `openRecipientProposalAction` decrypts the publication token and redirects to `/share/<token>`. The bearer credential lives in the address bar, browser history, and any server access log that records the full URL.
- **Why accepted:** This is the established bearer-link model, consistent with the publisher side (`publication/actions.ts:841`, `:1320` email body). The primary active-leak vector (Referer header to outbound links/subresources) is **mitigated globally** by `Referrer-Policy: no-referrer` (`next.config.ts:195`, catch-all `:284`, share route `:203-218`). The token is 32 random bytes (infeasible to guess). Residual exposure is passive (local history / log aggregation), not an active remote exploit.
- **If hardening is ever wanted:** prefer the session cookie (already set for non-password publications at `publication/actions.ts:356-372`) as the sole credential and redirect to a tokenless URL keyed off the cookie. At minimum, confirm server access logs strip the `/share/` path before forwarding to third-party SIEMs.

### C2 — No row-level security on D1  · `ACCEPTED` (defense-in-depth note)
- **Finding (security residual):** Cloudflare D1 is SQLite-based with no RLS concept. The recipient inbox's only user scoping is application-level: `WHERE lower(recipient.email) = ?`, bound to the auth-derived email. There is no DB-level guardrail.
- **Why accepted currently:** Correct and not exploitable today — `currentUser.email` is a trusted, better-auth-derived value and the SQL is parameterized (no injection). The "admin client" is just a query builder over the same binding (no service-role-over-RLS to bypass, because there's no RLS).
- **Risk:** defense-in-depth. If any future caller passes a spoofable email, or if better-auth identity resolution weakens, every recipient row across all tenants becomes readable through this path. Worth a regression test (see §D / test gaps).

### C3 — Dev-auth-bypass trusts an env flag  · `ACCEPTED` (deployment hygiene)
- **Finding (security residual):** `getDevCurrentUserContext` runs first in `getCurrentUserContext` and, when `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`, returns a context derived from a server env var with no signed-token verification. The entire recipient auth path trusts that this flag is unset in production.
- **Why accepted:** Gated on `NODE_ENV !== "production"` (`src/lib/auth/dev-auth-gate.ts:13`), so it's off in prod by construction; requires a seeded D1 profile.
- **If hardening is wanted:** add a fail-fast deployment guard — throw if `NODE_ENV === "production"` and the bypass flag is set.

---

## §D — Verification gaps (steps not run, and why)

### D1 — No full `next build`  · `VERIFY-GAP`
- **What I ran instead:** targeted `tsc --noEmit` filtered to the touched files (clean), `vitest` (31/31), `react-doctor` scoped to proposals-page (100/100), and an SSR `curl` of the live route (HTTP 200, correct markers).
- **Why not a full build:** the working tree carries ~30 uncommitted files from **concurrent agents** (component-library, publisher, uploads, etc.); a full build could fail on their WIP, not mine, and the signal would be noise.
- **To close before release:** on a clean checkout (or after the other agents' work lands), run `bun run build` and confirm no errors introduced by these changes.

### D2 — No interactive browser session  · `VERIFY-GAP`
- **What I ran instead:** SSR HTML fetch via the dev-auth bypass + 31 jsdom DOM tests that render the real component tree (empty/error/list/refresh/error-action states).
- **Why not a full Playwright session:** the DOM tests cover the render/interaction paths; the dev server was mid-recompile during edits (8s first-request latency). An interactive pass was lower marginal value.
- **To close:** a Playwright journey — load inbox → click **Review** → assert redirect to `/share/<token>`; trigger window-focus refetch; exercise the refresh/retry flow. Most valuable once D1 is closed.

### D3 — No in-production performance measurement  · `VERIFY-GAP`
- **Finding context:** the auth-waterfall TTFB cost (#9 / A2) and any perf change must be measured **on Vercel in-region**; local TTFB (~0.95s) is dominated by the cross-region RTT to hosted Supabase and is not representative.
- **To close:** use the bench harness (`scripts/bench-hero-browser.mjs`) and the runbook in the `2026-06-20` Hero-Path plan against a hosted/in-region deployment before claiming a perf win.

### D4 — Security "test gaps" from the audit — already covered  · `VERIFY-GAP` (resolved)
- The security reviewer flagged missing tests for: IDOR on `openRecipientProposalAction`, password-protected-cookie-skip, revoked/expired redirect suppression. On inspection these **already exist** in `tests/vitest/recipient-proposals-action.test.ts`:
  - "rejects invalid publication ids before RPC or service-role access"
  - "returns not-a-recipient when the authorization RPC finds no recipient row" (IDOR)
  - "returns unavailable for inactive or expired publications after recipient authorization"
  - "does not mint shared-link session cookies for password-protected publications"
  - "mints the shared-link session cookies for publications without a password and redirects"
- The one genuinely-useful **new** test added during this work: a regression test pinning the refetch loop (`recipient-proposals-page.test.tsx` → "does not loop refresh when a row action errors").
- Still genuinely missing: a negative-authz test that user A (recipient of pub X) submitting pub Y's id is rejected — the "not-a-recipient" test covers the no-row case but not the cross-recipient case. Low priority (UUIDs are unguessable).

### D5 — react-doctor full-scope noise  · `VERIFY-GAP` (explained)
- `bun run doctor -- --verbose --scope changed` reported **49 issues / score 81**, but **all 49 are in other agents' WIP files** (`AddComponentModal.tsx`, `ComponentLibraryManager.tsx`, `PublisherRosterClient.tsx`, `ShareWizard.tsx`) — not in any proposals file.
- The proposals-page directory scanned in isolation: **100/100, 0 warnings, 0 errors.**
- No action needed on this route; the 49 belong to the other agents' slices.

---

## §E — Process notes (landing the work)

### E1 — Nothing was committed  · `PROCESS`
- The goal instructed awareness that **other AI agents are working in the codebase concurrently**, and the working tree already held ~30 uncommitted files of unrelated in-flight work. Per the Multi-Agent Execution Directive ("use one writer for shared files; formal leases only for actual concurrent contention"), I did **not** commit, to avoid entangling these changes with other agents' work.
- **To land:** review the proposals-scoped diff and commit as its own focused commit/branch. Suggested message scope: `fix(workshop/proposals): refetch loop, hydration, a11y, truncation signal`.

### E2 — Files touched
- **Source (6):** `src/components/workshop/proposals-page-client.tsx`, `src/components/workshop/proposals-page/{ProposalRow,ProposalsList,ProposalsListSkeleton,ProposalsErrorState}.tsx`, `src/lib/repositories/recipient-proposals-repository.ts`.
- **Tests (3):** `tests/vitest/recipient-proposals-page.test.tsx`, `tests/vitest/recipient-proposals-repository.test.ts`, `tests/vitest/recipient-inbox-dead-end.test.tsx`.
- **Net-zero (edited then reverted — verify with `git diff`):** `src/lib/auth/session.ts` (the A2 attempt; should show no diff).

### E3 — Shared-file ownership note
- The only shared/cross-cutting file I considered editing was `session.ts` (A2). I edited it, the auth test failed, and I reverted. Net effect: no change to shared files. If A2 is ever pursued, it must be coordinated with whoever owns the auth layer.

---

## Appendix A — Full findings → disposition map

| # | Finding | Severity | Disposition | Note |
|---|---|---|---|---|
| 1 | Self-sustaining refetch loop (unstable `onActionError`) | P1 | **FIXED** | latest-callback ref + regression test |
| 2 | `Intl` date hydration mismatch | P1 | **FIXED** | pinned `"en-US"`, hoisted formatter |
| 3 | Contrast: `text-tertiary` + success/warning chips fail AA | P2 | **FIXED** | in-component token swap (not the global token) |
| 4 | Duplicate `<h1>` + per-row `<h2>`s | P2 | **FIXED** | dropped body h1; rows `h2`→`h3` |
| 5 | Silent 50-row truncation | P2 | **FIXED** | `hasMore` signal + UI note |
| 6 | Stale `actionState.error` persists forever | P2 | **FIXED** | list keys rows by `id:status` |
| 7 | Skeleton + full-page error silent to AT | P2 | **FIXED** | `role=status` / `role=alert` |
| 8 | Disabled Review button unreachable + tooltip killed | P2 | **FIXED** | `aria-disabled` + `type="button"` |
| 9 | Serial auth waterfall | P2 (perf P1) | **A2 — INVARIANT** | fail-fast denial; test-pinned; reverted |
| 10 | Over-aggressive focus refetch (30s) | P2 | **FIXED** | `staleTime` 30s → 120s |
| 11 | Expiry counted as "last activity" | P2 | **A3 — INVARIANT** | judgment call; bind-pinned; reverted |
| 12 | Brittle focus management | P2 | **FIXED** | removed focus-stealing effect |
| 13 | Banner flaps / redundant Refresh vs Retry | P2 | **FIXED** | removed banner Retry button |
| 14 | 2 drifting/failing tests | P2 | **FIXED** | copy + aria-label; self-resolved |
| 15 | Skeleton↔live grid mismatch (CLS) | P3 | **FIXED** | grid template aligned |
| 16 | Single corrupt row fails whole inbox | P3 | **A1 — INVARIANT** | fail-closed safety; test-pinned; reverted |
| — | a11y P1-7 focus theft on bg refetch | P1 | **FIXED** | no programmatic focus stealing |
| — | a11y P2-10 aria-label ≠ visible text | P2 | **FIXED** | removed divergent aria-label |
| — | a11y P2-11 inline Retry touch target | P2 | **FIXED** | banner Retry removed entirely |
| — | a11y P2-8 sub-12px font sizes | P2 | **B1 — DESIGN-SYSTEM** | app-wide pattern |
| — | a11y P2-9 `truncate` hides identity | P2 | **B2 — DESIGN-SYSTEM** | cosmetic; design call |
| — | a11y P2-12 shared error-boundary tertiary 8px | P2 | **B3 — DESIGN-SYSTEM** | shared file; coordinate |
| — | sec token-in-URL | P2 | **C1 — ACCEPTED** | bearer-link model; Referrer-Policy mitigated |
| — | sec no D1 RLS | residual | **C2 — ACCEPTED** | app-level scoping; defense-in-depth |
| — | sec dev-auth-bypass env trust | residual | **C3 — ACCEPTED** | prod-gated; deployment hygiene |

---

## Appendix B — What WAS fixed (for contrast)

1. **Refetch loop** — `ProposalRow` action-error effect now uses a latest-callback ref (`onActionErrorRef`) and depends only on `actionState`, so an unstable parent callback can no longer drive a refresh→refetch→re-render loop. Pinned by a new regression test.
2. **Hydration** — `Intl.DateTimeFormat` pinned to `"en-US"` and hoisted to module scope (also a react-doctor perf fix).
3. **Contrast** — load-bearing `text-tertiary` → `text-secondary`; success/warning chips moved from `/10` tint to white bg (~5:1).
4. **Heading outline** — removed the duplicate body `<h1>`; per-row project name `h2` → `h3`. Live `<h1>` count: 2 → 1.
5. **Truncation signal** — repo fetches `PAGE_SIZE + 1` and returns `hasMore`; list shows "Showing the 50 most recent proposals" when capped.
6. **Stale error** — list keys rows by `${publicationId}:${status}`, so a post-refresh status flip remounts the row with fresh `useActionState`.
7. **AT announcements** — skeleton `role="status" aria-live`; full-page error `role="alert"`.
8. **Disabled button** — `aria-disabled` + `type="button"` (focusable, truly inert, no `preventDefault`); accessible name == visible text.
9. **Focus** — deleted the focus-stealing effect; Refresh/Retry stay enabled during load (deduped) so focus is retained, never stolen on background refetch.
10. **Redundancy** — removed the banner's Retry button (header Refresh is the single recovery control).
11. **Refetch policy** — `staleTime` 30s → 120s.
12. **Skeleton CLS** — grid template aligned to the real row.
13. **Tests** — fixed both drifting failures; added the refetch-loop regression.

---

## Suggested next actions (if pursued)

1. **Quick wins, route-local, low risk:** B2 (project name `line-clamp-2` + email `title`).
2. **Design-system pass (coordinate):** B1 (metadata font floor) + B3 (shared error-boundary `text-tertiary` → `text-secondary`).
3. **Cross-cutting, needs auth owner:** A2 (auth waterfall) — only via caching or a restructure that preserves fail-fast denial.
4. **Defense-in-depth:** C2 (negative-authz cross-recipient test) + C3 (prod dev-bypass fail-fast guard).
5. **Verification before release:** D1 (clean-tree `next build`) + D2 (Playwright journey) + D3 (in-region perf measurement).
