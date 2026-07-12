# 04 — Execution Units (remediation DAG for a FUTURE run)

These units are **proposals for a separate, explicitly authorized implementation
run**. This audit pack does not execute them. Each is self-contained with exact
paths, approach, invariants, proof, and a `TEST_PROPOSAL` where the change
touches a data-integrity/security invariant. Owner picks the subset to authorize.

Dependency layers: all units are **independent** unless they share a file
(noted). Serialize only on shared files. Recommended order = impact/risk:
UNIT-4 (cheap, security) → UNIT-1 (perf, self-contained) → UNIT-3 (small race
fix) → UNIT-2 (activity) → UNIT-5 (error handling) → UNIT-6 (needs owner intent)
→ UNIT-7 (cleanup).

---

## UNIT-1 — Consolidate roster read path (PERF-1, PERF-2)

**Goal:** reduce roster cold-load D1 round-trips (8 → ~3-4) and push
status/search/pagination closer to SQL; eliminate the correlated-subquery
latest-status query.

**Linked findings:** PERF-1, PERF-2.
**Non-goals:** changing the public `ProjectPublicationRosterResult` shape,
the filter param contract, or the `(capped)` UX.

**Exact paths / symbols:**
- `src/lib/publisher/roster-repository.ts` — `readWorkspacePublicationsRoster`
  (`:630`), `readLatestPublicationStatusByProjectId` (`:595`),
  `readRosterPublications` (`:480`), `composePublisherRosterResult` (`:320`).
- Keep `composePublisherRosterResult` export (it has unit tests via
  `composePublisherRosterResult` fixtures — confirm before refactor).

**Approach / invariants:**
1. Derive latest-per-project status from the already-fetched `readRosterPublications`
   rows (ordered `published_at DESC` → first row per project is latest) — delete
   `readLatestPublicationStatusByProjectId`.
2. Merge the 3 grouped aggregates (`recipientCounts`, `latestComment`,
   `latestResponse`) into fewer queries if D1 supports it (e.g. a single query
   with `LEFT JOIN` + conditional aggregates, or 1 multi-CTE). If not cleanly
   expressible, keep 3 but document why.
3. Keep the `truncated` flag logic (`:684`) and the `100`/`1000` scan caps
   unchanged unless owner approves raising them.
4. **Invariant:** the visible roster (rows, statuses, order, pagination) must be
   byte-identical to current JS-derived output for the same input set.

**Test requirement:** `TARGETED` / `MVP_CRITICAL_INVARIANT` — data-integrity:
roster output equivalence. **`TEST_PROPOSAL` only** (named risk + command below);
do NOT run without explicit user `TEST_TASK`.
```
TEST_PROPOSAL UNIT-1: run the existing roster repository/compose unit tests
(vitest) to prove row/status/order/pagination equivalence after consolidation.
Exact command awaits user TEST_TASK authorization; candidate:
`bun run vitest run src/lib/publisher` (scoped).
```
**Non-test proof (default):** type-check (`bun run typecheck` or `tsc --noEmit`)
+ `git diff --check` + a hand-traced equivalence table for status/order/pagination
against the current `composePublisherRosterResult` logic.

**Failure response:** if equivalence can't be proven, revert to current 8-query
path and record the blocker; do not ship a roster whose order/status differs.

**Checkpoint/resume:** unit is atomic; commit-equivalent checkpoint after
type-check + equivalence trace passes.

---

## UNIT-2 — Fix activity source-cap boundary + 250 cap indicator (BUG-1, BUG-5, DEBT-6)

**Goal:** stop silently dropping rows when one activity source dominates; surface
the 250-publication cap.

**Linked findings:** BUG-1, BUG-5, DEBT-6.

**Exact paths:**
- `src/lib/publisher/activity-repository.ts` — `readPublisherWorkspaceActivity`
  (`:246`), per-source `sourceLimit = safeLimit + 1` (`:293`), publication scan
  `LIMIT 250` (`:284`), `runPublisherActivityQuery` (`:230`).
- `src/components/share/SharedLinkActivityFeed.tsx` — `load()` re-entrancy
  (`:346`).

**Approach:**
1. Raise per-source fetch proportionally OR implement a proper k-way merge where
   each source is independently cursor-paginated and merged by
   `(created_at DESC, id DESC)` so no source's older rows are skipped.
2. When the publication scan hits 250, set a `partial`/`capped` signal consumed
   by the feed (extend `PublisherWorkspaceActivityResult` if needed) so the UI
   can show "showing activity for the 250 most recent publications".
3. Add a re-entrancy guard to the manual "Load older activity" `load()` (mirrors
   `loadingRef`).

**Invariant:** cursor pagination remains stable (composite `created_at DESC, id
DESC`); no duplicate or out-of-order rows across pages.

**Test requirement:** `TARGETED` / `MVP_CRITICAL_INVARIANT` — pagination
boundary. **`TEST_PROPOSAL` only.**
```
TEST_PROPOSAL UNIT-2: activity boundary test — seed a source with >51 contiguous
newest rows and assert subsequent pages include them. Awaits user TEST_TASK.
```

---

## UNIT-3 — Catch unique-violation in submitClientResponse (BUG-2)

**Goal:** make concurrent double-submit idempotent (return `null`) instead of
throwing.

**Linked finding:** BUG-2.

**Exact paths:** `src/lib/publication/d1-store.ts:760-779` (`submitClientResponse`
SELECT-then-INSERT).

**Approach:** wrap the INSERT in try/catch; on a `23505`-equivalent (unique
violation on `idx_shared_link_responses_recipient_publication`), return `null`
(matching the existing dedupe intent at `:760-765`). Re-throw other errors.

**Invariant:** a single recipient's response to a single publication is exactly
one row; concurrent attempts yield one row + one idempotent null.

**Test requirement:** `TARGETED` / `MVP_CRITICAL_INVARIANT` — concurrent
idempotency. **`TEST_PROPOSAL` only.**
```
TEST_PROPOSAL UNIT-3: concurrent double-submit returns one row + one null.
Awaits user TEST_TASK.
```

---

## UNIT-4 — Add `Cache-Control: no-store` to share HTML page (SEC-1)

**Goal:** guarantee no CDN caching of unlocked proposal HTML.

**Linked finding:** SEC-1.

**Exact paths:** `src/app/share/[token]/page.tsx` (the public page the Publisher
generates links to; reused structurally by the preview route).

**Approach:** set `Cache-Control: no-store` (and optionally
`Surrogate-Control: no-store`) on the page response, matching the JSON API
siblings. Verify Cloudflare cache rules / `next.config` headers don't override.

**Invariant:** response headers on `/share/[token]` include `no-store` for all
visitors (locked and unlocked).

**Test requirement:** `NOT_REQUIRED` (header presence is verifiable by source
inspection + optional runtime check). `TEST_PROPOSAL` optional for runtime
header verification.

**Note:** confirm with owner whether to also set it on the manager preview route
(the preview is auth-gated so caching is less risky, but defense-in-depth).

---

## UNIT-5 — Manager mutation error handling (BUG-3, SEC-3)

**Goal:** consistent, recoverable error surface for rotate/revoke/republish on
D1 blips; no raw error leakage.

**Linked findings:** BUG-3, SEC-3.

**Exact paths:**
- `src/components/workshop/publisher/usePublisherDrawer.ts:42-58` (add
  `onError`).
- `src/lib/publication/actions.ts:394` (`assertProjectPublicationManager`) and
  the create/republish/rotate/revoke actions — consider `withActionErrors`
  wrapper for parity with `refreshProjectPublicationSummary`.
- `src/components/workshop/publisher/PublisherDrawer.tsx:144-168`
  (`runPublicationUpdate` already wraps — ensure wizard parity).
- `src/components/workshop/publisher/ShareWizard.tsx` (`saveClientLink` feedback).

**Approach:** add a shared `onError` to the 3 mutations surfacing a generic
recoverable message; wrap throw-prone actions to return `{ ok:false, message }`
with redacted text. Keep the existing `PublisherDrawer` try/catch feedback.

**Invariant:** a D1 outage shows a clear "action failed, try again" message, not
a raw stack/error; no new mutation succeeds when it shouldn't.

**Test requirement:** `NOT_REQUIRED` (error-path inspection). `TEST_PROPOSAL`
optional for error-path UI.

---

## UNIT-6 — Resolve PublisherProjectMembersPanel dead code (BUG-6, UX-1)

**Goal:** confirm owner intent; either wire the panel into the drawer or remove
it (+ test references).

**Linked findings:** BUG-6, UX-1.
**⚠ Needs owner decision** (is project-members access in the Publisher drawer an
intended feature or a dropped scaffold?). Do NOT auto-delete (test files
reference it; User Test Authorization Gate).

**Exact paths:**
- `src/components/workshop/publisher/PublisherProjectMembersPanel.tsx` (shim).
- `src/components/workshop/teamwork/ProjectMembersAccessPanel.tsx` (the real
  panel, used by `ProjectTeamAccessPanel.tsx`).
- Test references: `tests/vitest/publisher-access-mode.test.tsx`,
  `publisher-roster-client.test.tsx`, `publisher-page-contract.test`.

**Options (DEC-AUTO-able only if owner confirms intent; else AUTH-owner):**
- (a) If intended: add a drawer tab/section rendering
  `<ProjectMembersAccessPanel>`.
- (b) If dropped: delete the shim, update/remove test references.

**Test requirement:** depends on chosen option; record `TEST_PROPOSAL` if (a).

---

## UNIT-7 — P2/P3 cleanup batch (BUG-4, UX-2, DEBT-1/2/4/7)

**Goal:** low-risk consistency cleanup. Bundle to avoid churn.

**Items:**
- BUG-4: auto-clear `ShareLinkDisplay.message` (`ShareLinkDisplay.tsx`).
- UX-2: `ClientPreviewBanner` amber → theme tokens (confirm with owner given
  DESIGN.md alpha).
- DEBT-1: single source for activity `limit` (`activity-repository.ts`,
  `PublisherActivityFeed.tsx`, `SharedLinkActivityFeed.tsx`).
- DEBT-2: remove/route `console.warn` (`roster-repository.ts:199`).
- DEBT-4: shared locale constant for `en-PH`.
- DEBT-7: resolve `PublisherProjectPicker` double focus directive.

**Test requirement:** `NOT_REQUIRED` (cosmetic/consistency). No behavioral
change to data/security paths.

---

## UNIT-8 — PublisherRosterClient URL/state sync fixes (A-BUG-1/2/3/12/13, D-9)

**Goal:** fix the navigation/state-sync defects in the master/detail client shell.

**Linked findings:** A-BUG-1 (searchValue desync), A-BUG-2 (selectedProjectId stale), A-BUG-3/D-9 (matchMedia at click time + dead mobile empty-state), A-BUG-12 (drawer deep-link vs current-page rows), A-BUG-13 (closeWizard leaves `project` param).

**Exact paths:** `src/components/workshop/publisher/PublisherRosterClient.tsx` (`:120,130-139,190,207-235`); optionally `src/app/workshop/publisher/page.tsx` (server-side `drawer` filter rewrite, mirroring the `wizard` rewrite at `:18-29`).

**Approach:**
1. Add a guarded `useEffect` syncing `searchValue` from `filters.search` (A-BUG-1).
2. Add an effect keeping `selectedProjectId` valid against `roster.rows` (fall back to `rows[0]`) (A-BUG-2).
3. Replace the imperative `matchMedia` read with a `useSyncExternalStore`-backed `useMediaQuery` hook; wire the `mobile` empty-state variant for no-JS/narrow fallback (A-BUG-3/D-9).
4. For `?drawer=` deep links: either add the server-side filter rewrite (like `wizard`) or construct a minimal row from the URL param as a fallback (A-BUG-12).
5. `closeWizard` should also clear `project`/`page` when the wizard was opened via the picker (A-BUG-13).

**Test requirement:** `TARGETED`/`MVP_CRITICAL_INVARIANT` (URL↔state sync + navigation correctness). **`TEST_PROPOSAL` only.**

---

## UNIT-9 — ShareWizard lifecycle + design fixes (A-BUG-4/5/6, D-6/D-8)

**Goal:** fix the wizard state-machine defects and primitive misuse.

**Linked findings:** A-BUG-4 (verificationPending stuck), A-BUG-5 (retryProjectDetails early-return), A-BUG-6 (draft wiped before verify), D-6 (native checkbox), D-8 (picker re-implements AppModal — adjacent).

**Exact paths:** `src/components/workshop/publisher/ShareWizard.tsx` (`:45,51,105-162,309`); `src/components/workshop/publisher/PublisherProjectPicker.tsx` (D-8).

**Approach:**
1. Add a "Return to editor" action from the `verificationPending` error state (A-BUG-4).
2. Separate initial-load retry from post-save retry so `retryProjectDetails` checks the refetch result regardless of `verificationPending` (A-BUG-5).
3. Move the draft reset (`password`, overrides) to after verification succeeds (A-BUG-6).
4. Swap native `<input type="checkbox">` → `<Checkbox>` primitive (D-6).
5. (Optional, D-8) replace picker's manual Dialog chrome with `<AppModal>`.

**Test requirement:** `TARGETED`/`MVP_CRITICAL_INVARIANT` (wizard save/verify state machine). **`TEST_PROPOSAL` only.**

---

## UNIT-10 — Roster listbox + a11y (D-15/D-16)

**Goal:** give the roster list proper listbox/keyboard semantics and a non-color selection cue.

**Linked findings:** D-15 (no listbox/arrow-key nav), D-16 (color-only selection + brand-orange ring).

**Exact paths:** `src/components/workshop/publisher/PublisherRosterClient.tsx` (`:342-358` list container); `src/components/workshop/publisher/PublisherRosterCard.tsx` (`:38,46`).

**Approach:** wrap rows in `<div role="listbox" aria-label="Client links">` + roving `tabIndex` + ArrowUp/Down/Home/End (model on `DropdownSelect` APG pattern), or at minimum `role="list"`/`role="listitem"`; add a non-color selection cue (left-edge border or checkmark) and drop the brand-orange ring.

**Test requirement:** `NOT_REQUIRED` (a11y structure verifiable by inspection; keyboard nav `TEST_PROPOSAL` optional).

---

## UNIT-11 — Bundle splitting + streaming (PF-4/PF-5/PF-7)

**Goal:** code-split user-gated heavy subtrees; fix the double-Suspense.

**Linked findings:** PF-4 (ShareWizard static), PF-5 (Drawer/Picker static), PF-7 (double Suspense).

**Exact paths:** `src/components/workshop/publisher/PublisherRosterClient.tsx` (`:10,13,15` imports); `src/app/workshop/publisher/page.tsx` (`:42-60`).

**Approach:**
1. `next/dynamic(() => import("./ShareWizard"), { ssr:false, loading:… })` (PF-4).
2. `next/dynamic` for `PublisherDrawer` (evaluate `ssr:true`+loading since it's the right pane) and `PublisherProjectPicker` (`ssr:false`) (PF-5).
3. Split `PublisherRosterClient` into a static shell (filters + empty list, outside Suspense) that streams immediately + a roster `Suspense` resolving with rows; or collapse to one boundary (PF-7).

**Invariant:** first-paint roster (list/filter chrome + `PublisherRosterCard`) must render without the lazy chunks; lazy chunks must show a skeleton. Verify against `/workshop/*` <80KB main / <120KB critical-path budgets.

**Test requirement:** `NOT_REQUIRED` (bundle size verifiable by build output inspection; runtime lazy-load `TEST_PROPOSAL` optional — needs build, user-gated).

---

## DAG (all units)

```
UNIT-4 (Cache-Control, independent)   UNIT-7 (P2/P3 cleanup batch)
UNIT-1 (roster-repository + perf)     UNIT-3 (d1-store)        UNIT-5 (actions + drawer error handling)
UNIT-2 (activity-repo + feed)         UNIT-6 (members panel — owner intent)
UNIT-8 (PublisherRosterClient state)  UNIT-9 (ShareWizard lifecycle)   UNIT-10 (listbox a11y)
UNIT-11 (bundle/streaming — depends on UNIT-8/9/10 settling component shape)
```
All independent except: UNIT-11 (bundle) should run AFTER UNIT-8/9/10 so the
dynamic-import sites wrap the final component shape. UNIT-7 overlaps files with
UNIT-8/9/10 (cosmetic changes) — serialize the overlapping files within a run.
Serialize only when two units edit the same file simultaneously.

**Recommended order (impact/risk):** UNIT-4 → (D-12/D-13/D-1 subset of UNIT-7) →
PF-3 (⊂UNIT-1) → UNIT-8 → UNIT-3 → UNIT-9 → UNIT-2 → UNIT-5 → UNIT-10 →
UNIT-11 → UNIT-6 (after owner intent) → rest of UNIT-7.

