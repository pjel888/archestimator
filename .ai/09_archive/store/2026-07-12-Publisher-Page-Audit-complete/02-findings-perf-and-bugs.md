# 02a — Findings: Performance & Bugs

Severity: **P0** correctness/security/data · **P1** real bug/user-impact/perf ·
**P2** quality/debt · **P3** nit. Evidence = `file:line` vs `main@b4b85b307`.

## Performance

### PERF-1 — Roster read does 8 D1 round-trips with in-memory filter/pagination [P1]

**Evidence:** `roster-repository.ts:630-688` — 1 project-list + 4 parallel +
3 parallel D1 queries; `composePublisherRosterResult` (`:320-445`) applies
status filter (`rowMatchesStatus`), search (`rowMatchesSearch`), sort
(`compareRosterRows`), and pagination (`slice`, `:434`) **all in JS** over the
fetched candidate set.

**Impact:** Every page navigation / filter change re-runs all 8 queries and
re-derives the whole set, then slices. On a workspace with many projects the
candidate set is bounded (publication scan `LIMIT 100`, `:19,507`; estimate
scan `LIMIT 1000`, `:20,570`) so it won't blow up unboundedly, but it
over-fetches and over-computes per request, and the `100` publication cap means
**workspaces with >100 publications silently truncate** (`truncated` flag set at
`:684`, surfaced as "(capped)" in UI `PublisherRosterClient.tsx:363` — but
filtering/sorting still only sees those 100).

**Fix shape (UNIT-1):** push status/search/pagination into SQL where cheap;
consolidate the 3 grouped aggregate reads (`recipientCounts`, `latestComment`,
`latestResponse`) into fewer queries (e.g. one `LEFT JOIN` aggregate or a single
multi-table CTE); reduce round-trips from 8 → ~3-4. Gate any change behind a
`TEST_PROPOSAL` (data-integrity invariant: roster row counts/statuses must match
current JS-derived output exactly).

### PERF-2 — Correlated subquery per project for latest publication status [P1]

**Evidence:** `roster-repository.ts:595-628` — `readLatestPublicationStatusByProjectId`
runs `SELECT … WHERE publication.id = (SELECT latest.id … ORDER BY published_at
DESC, id DESC LIMIT 1)` correlated per row, over `manageableProjectIds`.

**Impact:** O(projects) subquery execution on D1 per roster load. Acceptable at
current scale but scales poorly and duplicates effort already available from
`readRosterPublications` (which already orders by `published_at DESC`).

**Fix shape (UNIT-1, same):** derive latest-per-project status from the already-
fetched publication rows (the roster already loads publications ordered
`published_at DESC`; the first row per project IS the latest) instead of a
separate correlated query.

### PERF-3 — Drawer query staleTime 10s + router.refresh() double-refresh [P2]

**Evidence:** `usePublisherDrawer.ts:24` `staleTime: 10_000`; mutations call
`invalidateQueries` + `router.refresh()` (`:36-40`), and server actions also call
`revalidatePublicationRoutes` (revalidatePath). Belt-and-braces double refresh.

**Impact:** Minor extra work; not a correctness bug. Worth noting for a future
"single source of refresh" cleanup.

### PERF-4 — Staleness cache is a module-level singleton (per-isolate) [P2]

**Evidence:** `workspace-repository.ts:1041-1048` — `readPublicationSnapshotStaleness`
keeps a 5-min in-memory `Map` cache at module scope.

**Impact:** In Cloudflare's multi-isolate model each isolate keeps its own cache,
so staleness warnings can differ briefly across requests. Not a bug; documented
behavior. No action required unless consistency matters.

## Bugs

### BUG-1 — Activity feed source-cap boundary drops rows for dominant sources [P1]

**Evidence:** `activity-repository.ts:293` each source fetches
`sourceLimit = safeLimit + 1` (51) rows with the cursor clause; `:358-486`
merges and `applyCursor` (`:242-244`) further filters in JS.

**Impact:** If a single source (e.g. `estimate_sheet_events`) has a contiguous
run of >51 newest rows older than the cursor's anchor, those rows are never
fetched, so subsequent "Load older activity" pages silently skip them. Real for
busy workspaces dominated by one event type.

**Fix shape (UNIT-2):** either raise `sourceLimit` proportional to the union
window, or paginate each source independently and merge with a proper k-way
merge keyed on `(created_at DESC, id DESC)`. Add a `TEST_PROPOSAL` for the
boundary (single source with >limit+1 contiguous rows).

### BUG-2 — submitClientResponse read-then-write dedupe race [P1]

**Evidence:** `d1-store.ts:760-765` SELECT-then-INSERT dedupe; `:779` INSERT
does not catch the unique-violation. The partial unique index
`idx_shared_link_responses_recipient_publication` (migration `0014:149-151`) is
the real guard.

**Impact:** Two concurrent submissions by the same recipient could both pass the
SELECT (no existing row yet) and the second INSERT throws a unique-violation
instead of returning `null` (idempotent). Surfaces as an unhandled error to the
client. Low probability but real for double-clicks / retries.

**Fix shape (UNIT-3):** catch the `23505`-equivalent on the INSERT and return
`null` (idempotent), matching the existing dedupe intent. `TEST_PROPOSAL` for
the concurrent-double-submit invariant.

### BUG-3 — Manager mutations throw on D1 error with no client error handling [P1]

**Evidence:** `assertProjectPublicationManager` (`actions.ts:394`) and
create/republish/rotate/revoke/add/remove/resend throw without try/catch (only
`refreshProjectPublicationSummary` uses `withActionErrors`). `usePublisherDrawer`
has no `onError` on any mutation (`:42-58`); `PublisherDrawer.runPublicationUpdate`
(`:144-168`) does wrap in try/catch and shows feedback, but `ShareWizard` /
`PublisherRosterClient` paths vary.

**Impact:** A D1 blip during rotate/revoke/republish surfaces as an unhandled
server-action rejection. The drawer shows a generic "Shared link update failed."
(`PublisherDrawer.tsx:161`) but the wizard's per-action feedback is inconsistent
and there is no global mutation-error toast. User has no clear recovery path.

**Fix shape (UNIT-5):** add `onError` to the three mutations in
`usePublisherDrawer` (or a shared error handler) that surfaces a consistent,
recoverable message; consider wrapping the throw-prone actions in
`withActionErrors` for parity with `refreshProjectPublicationSummary`.

### BUG-4 — `ShareLinkDisplay` message never auto-clears [P2]

**Evidence:** `ShareLinkDisplay.tsx:20,31,33,44,47,78` — `message` state set on
copy/share, never cleared; persists for the component's lifetime.

**Impact:** Minor UX: a "Copied" / error message stays visible after the action.
Not a correctness bug.

**Fix shape (UNIT-7):** add a short `setTimeout` to clear `message` (e.g. 3-4s),
or reset on copy re-attempt.

### BUG-5 — Activity publications capped at 250 silently [P2]

**Evidence:** `activity-repository.ts:280-284` — `project_publications` fetch
`LIMIT 250`. Only DB query errors set `partial:true`/`unavailableSources`
(`:230-240`); the 250 cap does not.

**Impact:** Activity for publications beyond the 250 newest is silently missing
from the feed; the user sees no "partial" indicator for this ceiling.

**Fix shape (UNIT-7 or UNIT-2):** either surface a `partial`/capped indicator
when the publication scan hits 250, or document the cap. Low priority (250
publications/workspace is far beyond first-user scale).

### BUG-6 — `PublisherProjectMembersPanel` is dead production code [P1 → classified as DEADCODE]

**Evidence:** `PublisherProjectMembersPanel.tsx` is a re-export shim of
`ProjectMembersAccessPanel`; `rg -l PublisherProjectMembersPanel src/` returns
only the file itself (zero production importers; only tests reference it).

**Impact:** If the Publisher drawer was intended to surface project members
(tab or panel), the wiring is missing — the feature is absent from the live UI.
If it was scaffolding for a dropped feature, it is dead code kept alive by tests.

**Fix shape (UNIT-6):** confirm intent with owner. Either (a) wire it into the
drawer if members access was intended, or (b) delete the shim + its test
references. Not auto-deleted (User Test Authorization Gate + needs owner intent).

## Cloudflare posture notes (not bugs)

- **No paid add-ons needed:** roster/activity read paths use standard D1
  parameterized queries; rate-limit table (`security_rate_limit_events`) and
  recipient/email flows use bound resources only. No action violates the
  free-tier cost posture in `AGENTS.md`.
- **D1 round-trip count (PERF-1/2) is the main Cloudflare-relevant concern** —
  each round-trip is a Workers↔D1 call; consolidation reduces wall time and
  isolate CPU.
- **Email:** recipient invitations go through Cloudflare Email
  (`transactional-email-client.ts`); `resend_*` columns are misnomers. No Resend
  dependency.
- **Migration 0066** (FK rebuild) is recent (Jul 12); confirm it has been
  applied to the target D1 before relying on cascade behavior in fixes. (Read-
  only audit did not apply or verify migrations.)
