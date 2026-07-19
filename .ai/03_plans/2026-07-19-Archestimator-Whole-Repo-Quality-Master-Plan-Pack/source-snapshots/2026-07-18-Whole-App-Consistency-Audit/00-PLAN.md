# 2026-07-18 Whole-App Consistency Audit — Plan Pack

**Plan pack:** `.ai/03_plans/2026-07-18-Whole-App-Consistency-Audit/`
**Suite version:** `2026-07-11` (manifest); these docs follow the `2026-07-12` schema notes.
**Status:** `CONDITIONALLY_READY` / `NOT_STARTED` / `NOT_EVALUATED` · `next_unit: UNIT-001`.
**Validated:** `bun run validate:plan-pack` PASS (manifest hash refreshed via `--write`).
**Generated:** 2026-07-18, against `main` (clean at session start, commit `a41a07d01`)
**Audit method:** 6 parallel general-purpose audit agents partitioned by domain, each mandated to surface only concrete logical/factual/feature bugs and inconsistencies with `file:line` evidence. The lead then deep-verified every CRITICAL/HIGH finding against current source before encoding it here. Speculation and style nits were rejected.

> **Status terminology:** the human-readable tables below use `TODO | IN PROGRESS | DONE | BLOCKED | REJECTED`. The canonical `plan-pack.json` uses the validator's `PLANNED | READY | IN_PROGRESS | DONE | VERIFIED | BLOCKED | SUPERSEDED` taxonomy — they map 1:1 (`TODO`≡`PLANNED`/`READY`, `DONE`≡`DONE`/`VERIFIED`, `REJECTED`≡`SUPERSEDED`). Tier-1 units (001–009) are `READY` in `SLICE-001`; the rest are `PLANNED`, hence `CONDITIONALLY_READY`.

This pack is **distinct from** `.ai/03_plans/2026-07-18-Codebase-Improve-Audit-Plan-Pack/`
(the `/improve` audit). That pack is a broad nine-category improvement backlog; this pack
is a focused **logical/factual/feature inconsistency and bug** audit. Where the two
overlap, this pack cross-references the `/improve` plan rather than duplicating it
(see §11 Cross-Reference Map).

---

## 1. Objective And Stop Condition

Surface and disposition every concrete logical, factual, and feature-level
inconsistency and bug found across the whole application, then encode each as a
dependency-ordered, evidence-backed implementation unit.

The **planning stage** is complete when every verified finding is reconciled to a
unit with current-source evidence, a fix direction, a test decision, and a
dependency ordering. The **execution stage** (separately authorized) is complete
when every CORE requirement unit is implemented and verified with the cheapest
decisive evidence per the Validation Matrix.

## 2. Scope

**In scope:** logical errors, factual errors, wrong-feature behavior, state-machine
deadlocks/skips, money/currency/state divergence across surfaces, authz gaps,
orphaned infrastructure, stale-cache bugs, and lifecycle inconsistencies across
the following surfaces:

- Estimate core (estimate sheet, rows, totals, component library, templates,
  variants, linked instances, reusable sources, favorites, bulk selection).
- Publish / share / client-portal / proposal-export pipeline.
- Auth, authorization, accounts, membership, middleware, invites, compliance.
- `/admin` control plane (support inbox, feature flags, analytics, saved replies).
- Uploads, R2/Images, worker, queues, cron, webhooks, internal proof endpoints.
- Client state (Zustand, TanStack Query, hooks), cross-cutting utilities,
  notifications, onboarding, charts, email.

**Out of scope (non-goals):**

- Style, formatting, naming, a11y, visual design, and test-coverage expansion.
- The `/improve` backlog items that are improvements rather than defects.
- Supabase / legacy provider surfaces (frozen; not to be mutated).
- Hosted/production deployment proof, paid services, or external cross-provider work.
- Refactors not required to fix a verified defect.

## 3. Summary Of Verified Findings

31 findings total: **1 CRITICAL**, 8 HIGH, 13 MEDIUM, 9 LOW. One finding (F-01)
was verified at deeper precision than the initial audit and corrected: the labor
divergence has **5** drop sites (not 4), and charts is a PASS site (not a drop).

Counts by area: Estimate core 7; Publish/Share/Portal 5; Auth/Security 7;
Admin 3; Uploads/Infra 4; UI State/Cross-cutting 5.

### 3a. RE-VERIFICATION PASS (2026-07-19) — read this before trusting any row

After F-01 (labor) turned out to be **unreachable dead code misdiagnosed as a live
CRITICAL**, every other finding was re-verified against a strict **reachability**
standard: *can the buggy state actually occur in a real user/server flow?* The
re-check materially changed the pack. Several "HIGH" findings were unreachable
dead code, guarded upstream, or built on a false premise — the same disease as F-01.

**Headline result: the pack's CRITICAL count is now 0, and only ~9 findings
remain genuinely actionable.** Distribution of the 24 re-reviewed findings:

- **CONFIRMED (reachable as stated or close):** F-06, F-11, F-12, F-15, F-21, F-23, F-25, F-26 (8)
- **WEAKENED (real but overstated → severity dropped):** F-05, F-07, F-09, F-13, F-14, F-16, F-17, F-20, F-22 (9)
- **REFUTED (unreachable / dead code / misread — drop or convert to dead-code cleanup):** F-02, F-03, F-04, F-08, F-10, F-18, F-19 (7)

**Root-cause of the false positives (so future audits avoid it):** the initial
audit inferred a bug from *code shape* without checking whether the triggering
input/state is ever produced. Patterns that recurred:
- A function with a bug that has **zero callers** (F-04 `voidClientPortalDecisionAction`, F-10 `getSelectionState`, F-08 `FirstEstimateChecklist` mounted nowhere, F-21 `resetEstimateWorkspaceState` unused).
- A "stale cache" bug where the value is **never actually cached** (F-03).
- A downstream check that's **guarded upstream** so the bad state can't be reached (F-02 variant deletion is blocked when a row references it).
- A **feature currently disabled** so the bypass is dormant (F-09 closed-beta is OFF).
- A field the audit claimed leaks, that **isn't actually rendered** (F-17 `invited_email`).

**New issues discovered during re-verification (not in original pack):**
- `N-01` (P3): `listLinkedEstimateRowTargets` (`component-mutation-d1.ts:485`) only scans `estimate_row_items`, not `estimate_template_row_items` — template-definition rows referencing a removed variant aren't re-pointed. Surfaces as `template_component_unavailable` at next publish. (Found while tracing F-02.)
- `N-02` (LOW): TanStack Query cache is not cleared on `signOut` (`lib/auth/actions.ts:223`) — same cross-user shared-device leak class as F-21. (Found while tracing F-21.)
- `N-03` (cleanup): `src/lib/client-portal/decision-actions.ts` is an orphaned module (zero importers) — candidate for deletion. (Found while tracing F-04.)
- `N-04` (cleanup): `tests/vitest/getting-started-route.test.ts` references the removed `FirstEstimateChecklist` rendering and is stale. (Found while tracing F-08.)

The findings register (§5) and per-unit docs now carry the re-verdict in the
Status/Severity columns. REFUTED findings are kept in the register (not deleted)
with their refutation evidence, so the same claim isn't re-raised later.

## 4. Requirements

| ID | Requirement (statement) | Source | Class |
| --- | --- | --- | --- |
| `REQ-001` | A single estimate row must show the same total across every surface (UI editor, D1 authoritative, charts, proposal export, publication snapshot, duplication, list summaries). | F-01 | CORE |
| `REQ-002` | Variant deletion during linked-Template propagation must fall back to the default variant instead of bricking all instances. | F-02 | CORE |
| `REQ-003` | Proposal export must reflect the authoritative server-resolved sheet adjustment (including a cleared/0% mode), not a cached prior value. | F-03 | CORE |
| `REQ-004` | Voiding a Client Portal decision must recompute the issue status so an issue is not stuck in a terminal state after its qualifying decision is voided. | F-04 | CORE |
| `REQ-005` | Every share/client-portal password-gate response must use one body shape so clients gating on `passwordRequired` detect the gate on all paths. | F-05 | CORE |
| `REQ-006` | The support inbox `unread_for_admin` flag must clear on admin reply/thread-read so the action inbox does not stay permanently elevated. | F-06 | CORE |
| `REQ-007` | The `UPLOAD_JOBS_QUEUE` binding must either receive messages or be removed; dead queue infrastructure must not ship. | F-07 | CORE |
| `REQ-008` | The onboarding checklist must not mark "Create an estimate" complete before any project/estimate exists. | F-08 | CORE |
| `REQ-009` | Closed-beta access must be enforced on every protected route so a route that forgets `getCurrentUserContext` cannot bypass it. | F-09 | CORE |
| `REQ-010` | Cross-cutting state/correctness gaps (selection indeterminacy, column-width reset scope, thread pagination cursors, share route guards, constant-time secret compare, invite CSRF/PII, cursor-broadcast deps, notification feed pagination, ephemeral store reset, locale consistency) must each be fixed at their root. | F-10..F-22 | CORE |
| `REQ-011` | Low-severity inconsistencies (preview cache signature, field naming, dry-run default inversion, DO timer leak, locale drift, limit clamping, inbox pagination, bearer timing, invite redirect trust) must each be dispositioned. | F-23..F-31 | AUXILIARY |

## 5. Findings Register (Authoritative)

Each finding has a dedicated unit doc `NNN-*.md` with full evidence. Severity is
the audit's; Priority is the execution ranking. Effort uses S/M/L. Risk is
reversibility/blast-radius.

| ID | Orig Sev | Re-verdict (2026-07-19) | Eff. Sev | Title | Unit | Pri | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-01 | CRITICAL | REFUTED (unreachable; removed as dead code) | — (DONE) | `laborUnitCost` dead field — ripped out 2026-07-18 | `001` | — | DONE |
| F-02 | HIGH | **REFUTED** (variant delete is blocked upstream when a row references it) | — | `selectedVariantId` deletion throws instead of falling back | `002` | — | REJECTED |
| F-03 | HIGH | **REFUTED** (rate is never cached; re-resolved fresh each request) | — | Sheet adjustment rate silently dropped when `percentage === 0` | `003` | — | REJECTED |
| F-04 | HIGH | **REFUTED** (`voidClientPortalDecisionAction` has zero callers — dead code) | — | Voiding a Client Portal decision never reverts issue status | `004` | — | REJECTED |
| F-05 | HIGH | **WEAKENED** (no client reads `passwordRequired` on GET) | LOW | Legacy share decision GET password-error body shape | `005` | P4 | TODO |
| F-06 | HIGH | CONFIRMED (live; cosmetic ops noise) | LOW | Support inbox `unread_for_admin` never resets on admin reply | `006` | P3 | TODO |
| F-07 | HIGH | **WEAKENED** (queue IS alive via jobs-proof-router; only one enqueue fn dead) | LOW | `enqueueCloudflareScheduledUploadJobs` unused; queue misframed | `007` | P4 | TODO |
| F-08 | HIGH | **REFUTED** (checklist mounted nowhere; `workspace_ready` emitted *with* `project_created`) | — | Onboarding "Create an estimate" gated on wrong milestone | `008` | — | REJECTED |
| F-09 | HIGH | **WEAKENED** (closed-beta currently OFF → dormant) | LOW (latent) | Closed-beta gate not enforced in middleware | `009` | P4 | TODO |
| F-10 | MEDIUM | **REFUTED** (`getSelectionState` has zero production callers) | — | Selection indeterminacy under selected parent | `010` | — | REJECTED |
| F-11 | MEDIUM | CONFIRMED (wired to UI reset action) | LOW | `resetEstimateColumnWidths` wipes global last-used key | `011` | P4 | TODO |
| F-12 | MEDIUM | CONFIRMED (reachable; harm = pagination gap, not corruption) | MED | Client Portal thread pagination cursor keys off filtered-out row | `012` | P3 | TODO |
| F-13 | MEDIUM | **WEAKENED** (legacy tokens get harmless 404; guard is hardening) | LOW | `share/[token]/sections/*` missing token-type guard | `013` | P4 | TODO |
| F-14 | MEDIUM | **WEAKENED** (timing attack on high-entropy Bearer impractical) | LOW (hygiene) | Proof routers use `===` not `timingSafeEqual` | `014` | P4 | TODO |
| F-15 | MEDIUM | CONFIRMED (RPC guard robust → defense-in-depth only) | LOW | `acceptInvite` POST forwards null user to RPC | `015` | P4 | TODO |
| F-16 | MEDIUM | **WEAKENED** (browsers always send Origin or Referer on legit POST) | LOW | `isAllowedInviteOrigin` fails open when both headers absent | `016` | P4 | TODO |
| F-17 | MEDIUM | **WEAKENED** (`invited_email` NOT rendered; tokens unguessable) | LOW | Invite preview info disclosure | `017` | P4 | TODO |
| F-18 | MEDIUM | **REFUTED** (all callers pass stable `displayName`/`null`) | — (latent) | Cursor broadcast re-subscribes on displayName/userId change | `018` | — | REJECTED |
| F-19 | MEDIUM | **REFUTED** (no mid-session identity change without reload) | — (latent) | Cursor broadcast cleanup resets identity refs to stale props | `019` | — | REJECTED |
| F-20 | MEDIUM | **WEAKENED** (feed is single-page; no `fetchNextPage` exists) | LOW | Notification feed optimistic update skips paginated cursors | `020` | P4 | TODO |
| F-21 | MEDIUM | CONFIRMED (genuine shared-device leak; reset fn unused) | LOW-MED | `useEstimateWorkspaceState` never resets on sign-out | `021` | P3 | TODO |
| F-22 | MEDIUM | **WEAKENED** (rare admin actions; 15s propagation acceptable) | LOW (hygiene) | `featureFlagCache` cross-isolate staleness | `022` | P4 | TODO |
| F-23 | LOW | CONFIRMED (`quantityBase`/`quantityContingencyAmount` editable → stale preview; drop labor part) | MED | Proposal preview signature omits contingency fields | `023` | P3 | TODO |
| F-24 | LOW | (not re-reviewed; minor) | LOW | Share snapshot GET labels opaque id as `publicationId` | `024` | P4 | TODO |
| F-25 | LOW | **CONFIRMED** (real footgun if prod sets ENABLED=1 without DRY_RUN=0) | MED | `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN` default inverted | `025` | P3 | TODO |
| F-26 | LOW | CONFIRMED (debounced; one short timer) | LOW | `GlobalPresence` DO leaks broadcast timer on idle | `026` | P4 | TODO |
| F-27 | LOW | (not re-reviewed; minor) | LOW | `NotificationListItem` locale drift | `027` | P4 | TODO |
| F-28 | LOW | (not re-reviewed; minor) | LOW | `clampNotificationLimit` swallows NaN/empty cursor | `028` | P4 | TODO |
| F-29 | LOW | (not re-reviewed; minor) | LOW | Support inbox caps at 100 with no total | `029` | P4 | TODO |
| F-30 | LOW | (not re-reviewed; minor) | LOW | Bearer-auth secret loop runs past a match | `030` | P4 | TODO |
| F-31 | LOW | (not re-reviewed; minor) | LOW | `buildAcceptedInviteRedirect` trusts form-body display fields | `031` | P4 | TODO |

**New findings from re-verification (added 2026-07-19):**

| ID | Sev | Title | Unit | Pri | Status |
| --- | --- | --- | --- | --- | --- |
| N-01 | MED | `listLinkedEstimateRowTargets` ignores `estimate_template_row_items` → template rows referencing a removed variant aren't re-pointed | `032` | P3 | TODO |
| N-02 | LOW | TanStack Query cache not cleared on `signOut` (same shared-device leak class as F-21) | `033` | P3 | TODO |
| N-03 | LOW (cleanup) | `src/lib/client-portal/decision-actions.ts` is an orphaned module (zero importers) — delete | `034` | P4 | TODO |
| N-04 | LOW (cleanup) | `tests/vitest/getting-started-route.test.ts` references removed `FirstEstimateChecklist` rendering — stale | `035` | P4 | TODO |

### Effective actionable shortlist (after re-verification)

The genuinely actionable items, in priority order:
1. **F-25** (MED) — dry-run default footgun; clear config robustness fix
2. **F-12** (MED) — thread pagination gap
3. **F-23** (MED) — stale proposal preview on contingency edit
4. **F-21** (LOW-MED) + **N-02** (LOW) — shared-device state leak on sign-out (one fix: clear stores + queryClient)
5. **N-01** (MED) — template-row variant re-pointing gap
6. The LOW cluster (F-05/06/07/09/11/13/14/15/16/17/20/22/24/26-31) — hygiene/cosmetic; batch opportunistically

The 7 REFUTED findings (F-02, F-03, F-04, F-08, F-10, F-18, F-19) need no code change; their unit docs are rewritten to record the refutation evidence so they aren't re-raised.

## 6. Decisions And Boundaries

| Decision | Status | Rationale |
| --- | --- | --- |
| `DEC-001` Separate pack from `/improve` audit | Active | Different intent (defects vs improvements); avoids diluting either. Cross-reference overlaps instead of duplicating. |
| `DEC-002` Group the MEDIUM UI-state cluster into one unit where fixes are mechanical and disjoint | Active | F-18/F-19 share a file; batching reduces churn. Other mediums stay standalone for clear ownership. |
| `DEC-003` Money-math (F-01) fix follows the existing oracle, not a new abstraction | Active | The canonical `computeEstimateRowCostParts` is correct; the defect is call sites that omit `labor_rate`. Fix the call sites + the record type, do not invent a parallel calculator. |
| `DEC-004` Closed-beta (F-09) gate moves to a single shared helper, not middleware-only nor handler-only | Active | Centralize so forgetting the helper cannot bypass it. |
| `DEC-005` Dead queue (F-07): prefer wired-in queue over deletion if the retry/DLQ semantics are wanted; else delete | Active | Decision deferred to owner during execution (see `AUTH-001`). Both are safe; pick by whether retry semantics are wanted. |
| `DEC-006` No new tests unless user authorizes | Active | `NOT_REQUIRED` default; `TEST_PROPOSAL` only where money/auth logic materially benefits. |

**Authorization boundary:**

- `AUTH-001` — **Not a blocker.** All fixes are local source/migration work inside bound
  `ARCH_DB` and the existing Worker/queue/cron resources (standing authorization in
  `AGENTS.md`). F-07's "wire the queue" option uses the already-bound
  `UPLOAD_JOBS_QUEUE`; F-01 may add a read-only/select-only schema normalization but
  requires no destructive migration (see unit 001 for the chosen approach). Remote
  apply, deployment, paid services, and cross-provider work remain excluded.

## 7. Execution Graph

```mermaid
flowchart LR
  U001["001 labor-cost divergence (CRITICAL)"]
  U002["002 variant fallback"]
  U003["003 sheet adjustment 0%"]
  U004["004 decision void recompute"]
  U005["005 share password body"]
  U006["006 support unread reset"]
  U007["007 dead upload queue"]
  U008["008 onboarding milestone"]
  U009["009 closed-beta centralization"]
  U010["010 selection indeterminacy"]
  U011["011 column-width reset scope"]
  U012["012 thread pagination cursor"]
  U013["013 share sections token-type guard"]
  U014["014 proof router constant-time"]
  U015["015 invite 401"]
  U016["016 invite origin fail-closed"]
  U017["017 invite PII gating"]
  U018["018+019 cursor broadcast deps+cleanup"]
  U020["020 notification feed pagination"]
  U021["021 workspace state reset on sign-out"]
  U022["022 feature flag cache staleness"]
  U023["023 proposal preview signature"]
  U024LOW["024-031 LOW cluster"]

  U001 --> U023
  U004 --> U012
  U005 --> U013
  U009 --> U015
  U009 --> U016
  U009 --> U017
```

Most units are independent. Hard dependencies:
- `001 → 023` (the preview signature must include the labor fields once 001 defines them).
- `009 → 015/016/017` (invite hardening should land after the beta gate is centralized so the auth surface is stable).
- `004 → 012` (the thread-pagination cursor fix is simpler once void recompute lands).

## 8. Execution Order (Tiered)

Status values: `TODO | IN PROGRESS | DONE | BLOCKED (reason) | REJECTED (rationale)`.

### Tier 1 — CRITICAL + money/auth-coupled HIGH (do first)

| Unit | Title | Pri | Effort | Risk | Depends | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 001 | labor-cost divergence | P1 | M | HIGH | — | TODO |
| 002 | variant deletion fallback | P1 | S | LOW | — | TODO |
| 003 | sheet adjustment 0% passthrough | P1 | S | LOW | — | TODO |
| 004 | decision void status recompute | P1 | S | MED | — | TODO |
| 005 | share password body unify | P1 | S | LOW | — | TODO |
| 006 | support unread_for_admin reset | P1 | S | LOW | — | TODO |
| 008 | onboarding milestone fix | P1 | S | LOW | — | TODO |

### Tier 2 — Security hardening + infra (M effort)

| Unit | Title | Pri | Effort | Risk | Depends | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 007 | dead upload queue disposition | P2 | S | LOW | — | TODO |
| 009 | closed-beta centralization | P2 | M | MED | — | TODO |
| 012 | thread pagination cursor | P2 | M | MED | 004 | TODO |
| 014 | proof router constant-time | P2 | S | LOW | — | TODO |
| 016 | invite origin fail-closed | P2 | S | LOW | 009 | TODO |
| 017 | invite PII gating | P2 | S | LOW | 009 | TODO |
| 021 | workspace state reset on sign-out | P2 | S | LOW | — | TODO |

### Tier 3 — Correctness, UX, state (M effort)

| Unit | Title | Pri | Effort | Risk | Depends | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 010 | selection indeterminacy | P3 | S | LOW | — | TODO |
| 011 | column-width reset scope | P3 | S | LOW | — | TODO |
| 013 | share sections token-type guard | P3 | S | LOW | 005 | TODO |
| 015 | invite 401 | P3 | S | LOW | 009 | TODO |
| 018 | cursor broadcast deps + cleanup | P3 | S | LOW | — | TODO |
| 020 | notification feed pagination | P3 | M | LOW | — | TODO |
| 022 | feature flag cache staleness | P3 | S | MED | — | TODO |
| 023 | proposal preview signature | P3 | S | LOW | 001 | TODO |

### Tier 4 — LOW cluster (batch; optional)

| Unit | Title | Pri | Effort | Risk | Depends | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 024–031 | See §10 LOW register | P4 | S | LOW | — | TODO |

## 9. Test Strategy

Default `test_requirement = NOT_REQUIRED` for every unit (ValidationMatrix +
User Test Authorization Gate). Verification uses the cheapest decisive evidence:
source diff, type-check, scoped lint, and SQL/migration inspection.

`TEST_PROPOSAL` (does NOT authorize execution — only the user does):

- **Unit 001 (money math):** propose running the existing focused estimate-total
  tests (`CHEAPEST_DECISIVE_EXISTING_TEST`) to prove labor is included at every
  call site after the fix. Risk: silent money divergence is exactly the class of
  bug a unit test catches and static review misses.
- **Unit 004 (decision void):** propose the client-portal decision test to prove
  issue status recomputes after void.
- **Unit 006 (support unread):** propose the support-repository test to prove the
  flag clears on admin reply.

No browser automation, screenshots, builds-as-gates, or broad QA is requested.

## 10. LOW Register (Tier 4 detail)

| Unit | Title | file:line | Fix direction |
| --- | --- | --- | --- |
| 024 | share snapshot `publicationId` naming | `src/app/api/share/[token]/route.ts:88` | thread real `publicationAccess.publicationId` or rename |
| 025 | dry-run default inverted | `src/lib/cloudflare/scheduled-upload-jobs.ts:63-65` | default dry-run only when `UPLOAD_JOBS_ENABLED !== "1"` |
| 026 | GlobalPresence timer leak | `src/lib/cloudflare/global-presence.ts:74,187-193` | clear `broadcastTimer` in `webSocketClose` when no authorized sockets remain |
| 027 | notification locale drift | `src/features/notifications/components/NotificationListItem.tsx:47` | pin `en-PH` via shared formatter |
| 028 | limit clamping swallows bad input | `src/lib/notifications/repository.ts:66-69` | distinguish `undefined`/`null` (default) from non-numeric (reject) |
| 029 | inbox cap 100 with no total | `src/app/api/admin/support/conversations/route.ts:10` | return total or surface "showing newest 100" |
| 030 | bearer secret loop timing | `src/lib/security/bearer-auth.ts:30-33` | precompute valid digests at module load |
| 031 | invite redirect trusts form fields | `src/app/invite/[token]/accept/route.ts:35-71` | source display fields from server-resolved invitation row |

## 11. Cross-Reference Map (vs `/improve` pack)

To avoid duplicate execution, units here that overlap `/improve` plans are noted.
If both are executed, pick one owner and close the other.

| This pack | `/improve` plan | Relationship |
| --- | --- | --- |
| 001 (labor divergence) | `008-money-arithmetic-through-oracle` | Same root: route all money through the oracle. `/improve` 008 is the general principle; this unit 001 is the specific labor-leak bug with the exact call-site list. Execute **001** (more precise) and let it satisfy `/improve` 008's labor aspect. |
| 014 (proof router constant-time) | `004-csrf-constant-time-compare`, `015-fail-closed-on-missing-secrets` | Adjacent. `/improve` 004 covers CSRF; this 014 covers the proof-router Bearer compare. Both should land. |
| 030 (bearer loop timing) | `004-csrf-constant-time-compare` | Same theme; `/improve` 004 + this 030 can be one PR. |
| 007 (dead upload queue) | `009-upload-queue-cross-batch-idempotency`, `010-scope-cron-secret-off-upload-job-routes` | `/improve` 009 assumes the queue is live; this 007 proves it is dead. **Resolve 007 first** — if the queue is deleted, `/improve` 009 is moot. |

Everything else in this pack is **net-new** relative to `/improve`.

## 12. Recovery / Resume State

- **Current mode:** planning complete; execution not started.
- **First ready unit:** `001` (P1, no dependencies, CRITICAL).
- **Git:** `main`, clean at pack creation. Do not branch/commit unless requested.
- **Resume rule:** pick the lowest-numbered TODO unit whose dependencies are DONE;
  reread current source before editing; update the status table after each unit.

## 13. Stop Condition

Planning stops here (all 31 findings reconciled to units with evidence). Execution
stops when every CORE unit (001–022) is DONE with decisive evidence and every
AUXILIARY unit (023–031) is DONE or explicitly REJECTED with rationale. Terminal
status `ACHIEVED` requires the requirement-by-requirement audit in `LOOP_LEDGER.md`.
