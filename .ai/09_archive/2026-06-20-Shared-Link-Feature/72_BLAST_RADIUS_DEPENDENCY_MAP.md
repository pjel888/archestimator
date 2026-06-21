# 72 — Blast-Radius & Dependency Map

Date: 2026-06-21 · Status: **AUTHORED — source-verified against working tree (branch `main`, dirty)**

Purpose: consolidate the per-lane "handoffs / conflicts" notes and the file-ownership confusion
[`60`](60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md) flags into one shared-symbol/file dependency map,
a cross-lane edit-collision matrix, a multi-agent dirty-worktree protocol, the shared-symbol
sequencing constraints, and an ownership glossary that ends the "manager modal vs receiver page"
confusion.

Canonical IDs, severities, and statuses are owned by [`75`](75_FINDING_ID_REGISTRY.md); decisions by
[`71`](71_OPEN_DECISIONS_REGISTER.md); source-verified facts by [`_COORDINATION.md` §4](_COORDINATION.md).
**If this doc disagrees with `75`, `75` wins.**

All line anchors below were re-verified against the current working tree on 2026-06-21
(`public-repository.ts` = 1124 lines, `security.ts` = 589, `actions.ts` = 1538,
`SharePageTabs.tsx` = 677, `ProjectPublicationHeader.tsx` = 1172, `SharedLinkActivityFeed.tsx` = 178).
Re-pin to a commit SHA before execution; anchors drift.

---

## 1. Shared symbol / file dependency table (hot surfaces)

Each row: shared file/symbol → dependents (routes / RPCs / components / tests) → owning lane →
merge-collision risk. Owning lane = the lane whose open findings will mutate the file most.

### 1.1 `src/lib/publication/public-repository.ts` (1124 lines)

The public data-access seam. **Imported by every `/api/share/[token]/*` route** plus the receiver
page and the proposal-xlsx export route (verified import graph below). It also wraps the two public
SECURITY DEFINER RPCs, so it sits on the SEC-SHARE-01, PERF-04/05, and QA-G05/G06 paths simultaneously.

| Dependent | Anchor | Lane(s) touching |
|---|---|---|
| `app/api/share/[token]/route.ts` (snapshot GET) | imports repo + security | SEC-SHARE-03, PERF-02 |
| `app/api/share/[token]/comment/route.ts` | `insertSharedLinkComment` (`public-repository.ts:983`) via `comment/route.ts:288` | SEC-SHARE-01, PERF-05, QA-G05/G07 |
| `app/api/share/[token]/decision/route.ts` | `submitSharedLinkDecision` (`public-repository.ts:1067`) via `decision/route.ts:214` | SEC-SHARE-01, PERF-05, QA-G06 plus QA-G07 regression coverage |
| `app/api/share/[token]/activity/route.ts` | `loadSharedLinkPublicComments` (`:909`) | SEC-SHARE-09, QA-G09 |
| `app/api/share/[token]/session/route.ts` | `verifySharedLinkRecipientToken` (`:801`), `checkSharedLinkSessionStartRateLimit` (`:492`) | SEC-SHARE-02, PERF-01A |
| `app/api/share/[token]/events/route.ts` | `recordProjectPublicationEvent` (`:724`), `checkProjectPublicationEventRateLimit` (`:462`) | SEC-SHARE-03, PERF-02 |
| `app/api/share/[token]/password/route.ts` | `verifyProjectPublicationPasswordByToken` (`:664`), password rate-limit (`:510`) | PERF-09 |
| `app/api/share/[token]/unsubscribe/route.ts` | `unsubscribeSharedLinkRecipientByToken` (`:841`) | SEC-SHARE-05 |
| `app/share/[token]/page.tsx` (receiver RSC) | `resolveProjectPublicationSnapshotByToken` (`:648`) | RUX-*, PERF-01A |
| `app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | `checkProposalExportRateLimit` (`:444`) | **out-of-feature dependent — regression-watch** |
| Tests | `tests/vitest/project-publication-public-repository.test.ts`, `project-publication-comments.test.tsx`, `project-publication-activity.test.tsx` | QA |

**Merge-collision risk: HIGH.** Eight `/api/share` routes plus the export route depend on it; any
signature change to `insertSharedLinkComment` / `submitSharedLinkDecision` / the rate-limit helpers
ripples to multiple lanes. **Owning lane: Security** (it controls the RPC seam); Perf coordinates via §4.

### 1.2 `src/lib/publication/security.ts` (589 lines)

Token, cookie, CSRF, same-origin, and password-hash primitives. **Imported by all 8 `/api/share`
routes + the receiver page** (verified). Touch points are concentrated and high-risk because a
single helper (`assertSameOriginPublicPost`, `:358`) gates every public POST.

| Symbol | Anchor | Dependents | Lane(s) |
|---|---|---|---|
| `assertSameOrigin` | `security.ts:346` | `unsubscribe/route.ts` | SEC-SHARE-05 (allows absent Origin) |
| `assertSameOriginPublicPost` | `security.ts:358` | `session/route.ts:29`, comment/decision/events POSTs | SEC-SHARE-02 |
| `readPublicationViewSnapshotVersion` | `security.ts:253` | comment/decision routes (the SEC-SHARE-01 viewToken path) | SEC-SHARE-01 |
| `verifyPublicationPassword` / `hashPublicationPassword` | `security.ts:150` / `:135` | password route | PERF-09 (do **not** weaken scrypt) |
| `deriveCredentialVersion` | `security.ts:179` | rotate flow + cookie validation | SEC-SHARE-01 / D1 |
| Tests | — | `project-publication-security.test.ts`, `project-publication-security-hardening.test.ts`, `security-findings-publication-contracts.test.ts` | QA |

**Merge-collision risk: HIGH** for `assertSameOrigin*` (SEC-SHARE-02 and SEC-SHARE-05 both edit
same-origin logic — see §3 sequencing). **Owning lane: Security.**

### 1.3 `src/lib/publication/actions.ts` (1538 lines — most-edited file in the pack)

The owner/manager server-action surface (`"use server"`). **Imported by the manager header
(`ProjectPublicationHeader.tsx`), the recipient composer (`RecipientEmailComposer.tsx`), the
receiver-mounted `SharedLinkActivityFeed.tsx`, and the comment/decision routes** (verified). It owns
`rotate_project_publication_credentials` (`actions.ts:691`) and the digest gate
(`maybeTriggerSharedLinkActivityDigest`, `:1526`).

> ⚠️ **`"use server"` gate:** every export here must be `async` or `next build` fails (`tsc`/Vitest
> miss it — see memory `use-server-exports-only-async`). Any lane adding a helper to this file MUST
> run `bun run build` before claiming done.

| Symbol | Anchor | Dependents | Lane(s) / finding |
|---|---|---|---|
| `createProjectPublication` | `actions.ts:515` | header create flow | SEC-SHARE-08 (non-atomic revoke+insert), MANAGER-F-01 |
| `republishProjectPublication` | `actions.ts:579` | header republish | SEC-SHARE-01/D1, MANAGER-F-05 |
| `rotateProjectPublicationLink` | `actions.ts:652` → RPC `rotate_project_publication_credentials` (`:691`) | header rotate button | MANAGER-F-02 (Fixed), PERF-12 |
| `revokeProjectPublication` | `actions.ts:711` | header revoke | MANAGER-F-01/F-06 |
| `addSharedLinkRecipients` / `resendSharedLinkRecipientEmail` | `:1038` / `:1205` | `RecipientEmailComposer.tsx:163-207` | MANAGER-F-04 (Fixed), PERF-08 (Fixed) |
| `loadSharedLinkActivity` | `actions.ts:1381` | `SharedLinkActivityFeed.tsx` (owner mode) | PERF-04, SHF-01/D7, QA-G09 |
| `maybeTriggerSharedLinkActivityDigest` | `actions.ts` | comment/decision routes (public) | **SEC-SHARE-06 (Fixed)** / D9 delivery signoff |
| Tests | — | `project-publication-actions.test.ts`, `project-publication-rotate-resend.test.ts` | QA (MANAGER-F-05 behavioral action contracts now fixed locally) |

**Merge-collision risk: CRITICAL.** Most-edited, multi-lane (Manager, Perf, Security all queue
edits), 1538 lines, and `"use server"`-fragile. **Owning lane: Manager**, with Security and Perf
edits serialized through §3.

### 1.4 Public SECURITY DEFINER RPCs

| RPC | Wrapped at | Migration | Finding |
|---|---|---|---|
| `insert_client_comment` | `public-repository.ts:1034` | `20260620142000_restore_shared_link_snapshot_equality_lock.sql` (`is distinct from`) | SEC-SHARE-01 (Fixed, belt+suspenders), PERF-05 |
| `submit_client_response` | `public-repository.ts:1114` | same migration | SEC-SHARE-01, PERF-05 |
| `rotate_project_publication_credentials` | `actions.ts:691` | — | MANAGER-F-02, PERF-12 |

**Merge-collision risk: HIGH (cross-layer).** These are the only place app-layer and DB-layer
validation overlap, which is exactly PERF-05's "double validation" target. A PERF-05 RPC
consolidation rewrites both the wrapper (`public-repository.ts:983/1067`) AND the migration — it
cannot land before SEC-SHARE-01's equality lock is confirmed in both (see §3).

### 1.5 Receiver vs Manager component ownership (the `60` confusion)

| File | Role | Owning lane | Collision note |
|---|---|---|---|
| `src/components/workshop/ProjectPublicationHeader.tsx` (1172) | **Manager modal** (tabbed) | Manager (`35` redesign) | imports `actions.ts`; tab labels at `:660-666` |
| `src/components/share/SharePageTabs.tsx` (677) | **Receiver** estimate tablist (Sheets/Grid/Tree inside the single page) | Receiver UX (`25` redesign) | imports `lib/publication/types`, NOT `actions.ts` |
| `src/components/share/SharedLinkActivityFeed.tsx` (178) | Dual-mode feed: owner mode (in header) + recipient mode (in receiver page) | Shared (Manager + Receiver) | imports `actions.ts`; SHF-01/D7 realtime gap lives here (`:81-95,175` focus/visibility only) |

> **`60`'s framing was wrong** ([`_COORDINATION.md` §4.10/4.11](_COORDINATION.md)): `SharePageTabs.tsx`
> is NOT the manager modal and `ProjectPublicationHeader.tsx` is NOT the receiver. They are different
> surfaces in different lanes. See the glossary in §5. `SharedLinkActivityFeed.tsx` is the one file
> genuinely shared between the two redesign lanes (`25` and `35`) — it needs joint sign-off.

---

## 2. Cross-lane edit-collision matrix

Cell = the file/symbol where two lanes' open work physically overlaps → coordination required.

| | Security | Perf | Manager | Receiver UX |
|---|---|---|---|---|
| **Security** | — | `public-repository.ts` RPC wrappers (SEC-SHARE-01 ↔ PERF-05); `security.ts` `assertSameOrigin*` (SEC-SHARE-02 ↔ -05) | `actions.ts` digest gate `:1533` (SEC-SHARE-06/D9 ↔ Manager edits); `createProjectPublication:515` (SEC-SHARE-08 ↔ MANAGER-F-01) | activity route body-leak guard (SEC-SHARE-09) ↔ feed mount (RUX-10) |
| **Perf** | (above) | — | `actions.ts:1381` `loadSharedLinkActivity` (PERF-04 ↔ SHF-01/D7); rotate `:691` (PERF-12 ↔ MANAGER-F-02) | `SharePageTabs.tsx` row caps (PERF-07/07B ↔ RUX-07 mobile rows) |
| **Manager** | (above) | (above) | — | `SharedLinkActivityFeed.tsx` (owner mode ↔ recipient mode); `35` modal redesign ↔ `25` receiver redesign share the dual-mode feed |
| **Receiver UX** | (above) | (above) | (above) | — |

**Hottest cells (serialize, do not parallelize):**
1. `public-repository.ts` RPC wrappers — Security (SEC-SHARE-01) **must precede** Perf (PERF-05).
2. `security.ts` `assertSameOrigin*` — SEC-SHARE-01/-02 already Fixed; SEC-SHARE-05 (Open) edits the
   same function family → rebase on the Fixed state, don't fork.
3. `actions.ts` (1538, `"use server"`) — Manager owns; Security (SEC-SHARE-06/-08) and Perf (PERF-04/12)
   land as serialized PRs, each followed by `bun run build`.
4. `SharedLinkActivityFeed.tsx` — joint Manager+Receiver file; SHF-01/D7 decision gates its edits.

---

## 3. Shared-symbol sequencing constraints (DAG)

These orderings are forced by shared symbols, not by preference. Violating them creates a merge
conflict or silently reverts a security fix.

1. **SEC-SHARE-01 equality lock (Fixed) → PERF-05 RPC consolidation (Open).**
   PERF-05 ("one-RPC path") rewrites `insertSharedLinkComment`/`submitSharedLinkDecision`
   (`public-repository.ts:983/1067`) and the `20260620142000` migration. The `viewedSnapshotVersion !==
   access.snapshotVersion` route gate (`comment/route.ts:228`, `decision/route.ts:186`) and the RPC's
   `is distinct from` lock MUST be preserved through the consolidation.
   **Gate:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/security-findings-publication-contracts.test.ts --maxWorkers=1` stays green BEFORE and AFTER PERF-05. PERF-05 is **blocked** until the security review in [`71`](71_OPEN_DECISIONS_REGISTER.md) clears (D1).
   Binary pass/fail: PERF-05 PR that drops the equality assertion → **FAIL**, reject.

2. **SEC-SHARE-02/-05 same-origin family — rebase, don't fork.**
   SEC-SHARE-02 (Fixed at `session/route.ts:29`) and the Open SEC-SHARE-05 (`unsubscribe/route.ts`)
   both touch `security.ts:346-358`. SEC-SHARE-05 work branches from the Fixed `assertSameOriginPublicPost`.
   **Gate:** `bunx vitest run tests/vitest/project-publication-security.test.ts tests/vitest/project-publication-security-hardening.test.ts --maxWorkers=1` green.

3. **SEC-SHARE-09 activity-leak guard (Fixed) → any future receiver activity edit.**
   The receiver page currently does not mount an activity feed, but `/api/share/[token]/activity`
   remains a public-safe route and no longer returns comment bodies. Any redesign that reintroduces
   receiver activity must keep the no-body invariant. **Gate:** `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`; assert response has no `comment` body field.

4. **MANAGER-F-01 RBAC matrix (Fixed) remains the guardrail for MANAGER-F-06's fixed dashboard UX work.**
   The full five-actor-class × every-mutation matrix sits on the same `actions.ts`
   mutation exports that future quick-actions or behavioral action tests extend. MANAGER-F-04's
   composer retry surface is already Fixed, but any future recipient mutation extension should still
   inherit this RBAC contract. **Gate:** `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1`.

5. **D7 (realtime vs focus-refresh) decision precedes `25`/`35` feed work.**
   `SharedLinkActivityFeed.tsx:81-95,175` is the shared dual-mode file; whether it gains realtime
   changes both lanes' redesign scope. No feed redesign edits until D7 is resolved in [`71`](71_OPEN_DECISIONS_REGISTER.md).

6. **D8 migration reconciliation before any new shared-link migration.**
   `schema_migrations` ledger is drifted ([`_COORDINATION.md` §4.5](_COORDINATION.md)); reconcile with
   `supabase migration repair --status applied <version>` (ledger-only) per [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md)
   BEFORE PERF-05 or SEC-SHARE-08 author new SQL, or the new migration stacks on a phantom baseline.

---

## 4. Multi-agent dirty-worktree coordination protocol

**Observed state (2026-06-21):** branch `main`, **26 modified/deleted files** in the working tree
(estimate-sheet glass work: `globals.css`, `EstimateWorkspaceClient.tsx`, `estimate-surface-variant.tsx`,
data-route files, plus `.ai/10_state/current-state.md`). **None are shared-link feature files**, but
`globals.css` is global and a `git stash`/checkout would disturb in-flight glass work. The pack repeatedly
notes this dirty tree; here is the binding protocol.

1. **Isolate per lane via worktree, never share the dirty checkout.** Each implementation lane runs in
   its own `git worktree add` off a clean branch point (APFS CoW clone is cheap — see memory
   `workshop-dashboard-no-scroll-fix`). Do **not** branch off the current dirty `main` HEAD; branch off
   the last clean commit so the unrelated glass changes don't ride along.
   **Verify:** `git -C <worktree> status --porcelain` shows ONLY that lane's files.

2. **Do not `git stash` the shared checkout.** The 26 dirty files belong to an unrelated in-flight task;
   stashing risks losing `globals.css`/glass work. Snapshot first if you must: `git stash list` before,
   `git stash show -p` to inspect.

3. **One owner per file (pack rule).** Re-affirm [`_COORDINATION.md` §3](_COORDINATION.md): every agent
   owns exactly ONE file. For the shared hot files in §1, the *owning lane* in the table is the single
   writer; other lanes raise a handoff in `_COORDINATION.md` §6 rather than editing.

4. **`"use server"` + global-CSS guard.** Any lane editing `actions.ts` runs `bun run build` (not just
   `vitest`) before declaring done. Any lane editing `globals.css` coordinates with the live glass task
   first — it is currently dirty and globally scoped.

5. **Pre-merge collision check.** Before opening a lane PR:
   `git diff --name-only <base>...HEAD` must not intersect another open lane's owned-file set from §1.
   Intersection → serialize per §3, do not parallel-merge.

6. **Graph/index hygiene.** After a shared-symbol rename, use the call-graph-aware rename, not
   find-and-replace, then `bun run graph:reindex` (proportional policy) so blast-radius tooling stays
   accurate for the next lane.

---

## 5. Ownership glossary (ends the manager-vs-receiver confusion)

- **Manager modal** = `src/components/workshop/ProjectPublicationHeader.tsx` (1172 lines). A **tabbed**
  surface with tabs **Link / Estimates / Access / Recipients / Activity**. Internal tab key for
  "Estimates" is `"sheets"` (`ProjectPublicationHeader.tsx:661` maps `"sheets"` → label `"Estimates"`);
  spec/archive said "Sheets" — **standardize on "Estimates"** ([`_COORDINATION.md` §4.11](_COORDINATION.md)).
  Imports `lib/publication/actions.ts`. Redesigned in [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md).

- **Receiver page** = the public `/share/[token]` surface, rendered by `app/share/[token]/page.tsx`. It is a
  **single-column page** (`ShareContainer.tsx:8` — "Single column only (no xl sticky-rail / grid split — that
  is a deferred follow-up)"), **NOT a tabbed dashboard.** It mounts receiver review content inline,
  including `SharePageTabs` and `SharePageComments`; it does not currently mount `SharedLinkActivityFeed`.
  Redesigned in [`25`](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md).

- **`SharePageTabs.tsx`** (677 lines) = the receiver's **estimate view switcher** (Sheets / Grid / Tree of the
  estimate data) **inside** the single-column page — it is a tablist component, not the manager modal and not
  the page's nav chrome. Imports `lib/publication/types`, NOT `actions.ts`.

- **`SharedLinkActivityFeed.tsx`** (178 lines) = a **dual-mode** feed. Owner mode renders inside the manager
  modal's Activity tab; recipient mode (`isOwner={false}`) renders inline in the receiver page. It refreshes on
  focus/visibility only (`:81-95,175`) — **no realtime** (SHF-01, Open; → D7). This is the one file shared by
  both redesign lanes (`25` and `35`) and needs joint sign-off.

- **SHF-02 "floating nav rail"** = an **intentional deferral**, not a missing file. `ShareContainer.tsx:8`
  states the single-column choice explicitly; `decisions.md` (2026-05-29) records the rail as delivered then
  reshaped. Do not file it as debt ([`75` §6](75_FINDING_ID_REGISTRY.md), → D6).

---

## 6. Verification commands (re-pin before execution)

| Check | Command | Pass/fail gate |
|---|---|---|
| Hot-file line counts unchanged | `wc -l src/lib/publication/public-repository.ts src/lib/publication/security.ts src/lib/publication/actions.ts src/components/share/SharePageTabs.tsx src/components/workshop/ProjectPublicationHeader.tsx src/components/share/SharedLinkActivityFeed.tsx` | matches §header (1124/589/1538/677/1172/178) or re-anchor |
| Import graph (repo) | `grep -rln "publication/public-repository" src/app src/components` | 8 `/api/share` routes + receiver page + xlsx export |
| Import graph (actions) | `grep -rln "publication/actions" src/app src/components` | comment+decision routes + header + composer + feed |
| SEC-SHARE-01 route gate intact | `grep -n "viewedSnapshotVersion !== access.snapshotVersion" src/app/api/share/\[token\]/comment/route.ts src/app/api/share/\[token\]/decision/route.ts` | hits at comment:228, decision:186 |
| RPC wrappers intact | `grep -n "insert_client_comment\|submit_client_response\|rotate_project_publication_credentials" src/lib/publication/public-repository.ts src/lib/publication/actions.ts` | 1034/1114 (repo) + 691 (actions) |
| Shared-link test suite green | `bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-security.test.ts tests/vitest/project-publication-security-hardening.test.ts --maxWorkers=1` | all pass |
| `"use server"` integrity after `actions.ts` edits | `bun run build` | build succeeds |
| Worktree isolation per lane | `git -C <worktree> status --porcelain` | only that lane's owned files |

Owner-lane for this doc: **planning/coordination (Claude lead)**. It is a map, not a backlog item;
it carries no finding ID of its own — every cell binds to an existing ID in [`75`](75_FINDING_ID_REGISTRY.md).
