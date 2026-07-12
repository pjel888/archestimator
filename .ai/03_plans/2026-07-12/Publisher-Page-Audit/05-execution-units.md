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

## DAG

```
UNIT-4 (independent)          UNIT-7 (independent, batch)
UNIT-1 (roster-repository)    UNIT-3 (d1-store)          UNIT-5 (actions + 3 components)
UNIT-2 (activity-repo + feed) UNIT-6 (needs owner intent)
```
All independent except shared-file overlap (note: UNIT-1 and UNIT-2/5/7 touch
different files → safe parallel; UNIT-5 touches `actions.ts` which UNIT-3's
`d1-store.ts` does not → safe). Serialize only when two units edit the same file
in one run.
