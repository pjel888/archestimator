# 11 — Implementation Plan

**Authoritative execution guide for the future implementation AI.** Planning-only pack; tasks describe future implementation, not performed here. All tasks assume DEC-MOBILE = **Option B** (desktop guard + deep link + copy-URL). Tasks 1.1–1.3 branch explicitly if Philip chooses Option A/C.

**First read `README.md`** for the start doc, phase order, off-limits files, and stale-revalidation checklist.

---

## Phase 0 — Discovery & revalidation (read-only)

**Objective:** confirm current-state before any edit.
**Prerequisites:** `git status` clean; re-read `03`/`06`/`07`/`11`.
**Requirements addressed:** REQ-PS-02 (no duplication).
**Work packages:**

### Task 0.1 — Revalidate source truth
- **Why:** shared worktree; sibling packs may have landed changes.
- **Target files (read-only):** `src/components/workshop/publisher/PublisherRosterClient.tsx`, `PublisherEmptyState.tsx`, `PublisherRosterRow.tsx`, `PublisherDrawer.tsx`; `src/components/workshop/publication/RecipientEmailComposer.tsx`; `src/lib/publication/actions.ts`.
- **Procedure:** `rg "min-\[768px\]" src/components/workshop/publisher/PublisherRosterClient.tsx` (confirm mobile block still at :224/:228); `rg "assertProjectPublicationManager" src/lib/publication/actions.ts`; confirm `actions.ts` resend rate-limit constants (`SHARED_LINK_RECIPIENT_RESEND_*`); confirm sibling workflow pack status.
- **Exit:** evidence recorded; if sibling pack landed conflicting edits, re-scope per `10`.
- **Validation:** `git diff --check` (no changes from this task).
- **Parallelization:** parallel-safe (read-only).
- **Complexity:** Small.

### Task 0.2 — Confirm DEC-MOBILE with owner
- **Why:** Option B is the planned path; confirm Philip's call.
- **Procedure:** surface `05` DEC-MOBILE options to owner; record decision.
- **Exit:** decision recorded in `15`; tasks 1.x branch accordingly.
- **Complexity:** Small (decision).

---

## Phase 1 — Mobile reachability (Option B) [critical path]

**Objective:** make the mobile guard honest + actionable; advertise deep link.
**Requirements addressed:** REQ-PS-01, REQ-A11Y-02.
**Prerequisites:** Phase 0.

### Task 1.1 — Improve the mobile empty state + add copy-URL
- **Requirement IDs:** REQ-PS-01, REQ-A11Y-01/02.
- **Objective:** the mobile message names unavailable actions + offers one-tap "copy current URL" to open on desktop.
- **Why:** today the message is passive ("Open this workspace on a wider screen"); owners have no recovery affordance.
- **Target files:**
  - `src/components/workshop/publisher/PublisherEmptyState.tsx` (extend `mobile` variant: add a `Button` "Copy link to open on desktop" using `navigator.clipboard.writeText(window.location.href)` + a "copied" state).
  - `src/components/workshop/publisher/PublisherRosterClient.tsx` (no structural change; the `mobile` variant container at :224-226 already renders the empty state — pass nothing new unless Option A).
- **Existing files modified:** the two above.
- **New files:** none (Option B). *(Option A branch: new `PublisherRosterMobileCard.tsx` — not planned.)*
- **Interfaces/contracts:** none new; reuse `Button` from `src/components/ui/`.
- **Security:** copies page URL (no raw token) — see `08`.
- **Performance:** negligible (one button + string).
- **Server/client boundary:** unchanged (`"use client"` already on client).
- **Cache/revalidation:** none.
- **Bundle/RSC impact:** negligible.
- **Tailwind/design-system:** reuse `Button`; respect `DESIGN.md` (no gradients).
- **Validation:** `bun run type-check`; DOM test asserting message + copy button at 375px.
- **Tests to add:** extend `publisher-roster-client.test.tsx` (or a new `publisher-empty-state-mobile.test.tsx`) — assert mobile variant renders copy-URL button + "copied" state on click.
- **Acceptance:** AC3 of REQ-PS-01.
- **Exit:** DOM test green.
- **Rollback:** revert diff.
- **Risks:** RISK-MOBILE-1 (over-building) — mitigated by Option B scope.
- **Parallelization:** parallel-safe (localized).
- **Complexity:** Small.

### Task 1.2 — Advertise deep-link in the mobile message
- **Requirement IDs:** REQ-PS-01.
- **Objective:** the mobile message explains owners can open a specific publication's manage view on desktop via the URL (the `?drawer=<projectId>&tab=recipients` plumbing already exists at `PublisherRosterClient.tsx:88-97`).
- **Why:** discoverability of the recovery path.
- **Target files:** `PublisherEmptyState.tsx` (copy line referencing deep-link behavior); possibly a tooltip/help text.
- **Validation:** DOM assertion of the help text.
- **Tests:** extend the mobile empty-state test.
- **Complexity:** Small.
- **Parallelization:** parallel-safe.

### Task 1.3 — (Option A branch only — NOT planned) mobile card layout
- **Status:** `BLOCKED-EXTERNAL` (owner decision DEC-MOBILE). If Philip chooses Option A, expand this task into a card-list + full-width drawer design with its own a11y/focus/perf tests. Not detailed here to avoid speculative planning.

---

## Phase 2 — Sender action state surfacing

**Objective:** consolidate pending/success/failure/recovery states for each action.
**Requirements addressed:** REQ-FR-01..07, REQ-UX-01.
**Prerequisites:** Phase 0. **Serialize with workflow pack** for drawer/composer files (`10`).

### Task 2.1 — Drawer state/a11y surfacing (republish/rotate/revoke/copy)
- **Requirement IDs:** REQ-FR-01, REQ-FR-02, REQ-FR-05, REQ-FR-07, REQ-A11Y-01.
- **Objective:** each drawer action shows pending/success/failure with specific messages; confirm dialogs name consequences (rotate invalidates recipients; revoke blocks access).
- **Target files:** `src/components/workshop/publisher/PublisherDrawer.tsx` (extend `runPublicationUpdate` :163-193 feedback, `ConfirmDialog` :520-537 text, `copyClientLink` :236-247 fallback); `usePublisherDrawer.ts` (expose per-mutation error states if not already).
- **SERIALIZATION:** if the workflow pack edits this file, land workflow-pack Phase 6 first, then rebase this on top.
- **Security:** no authz change; confirm-dialog text reduces accidental rotate/revoke.
- **Performance:** negligible.
- **Validation:** `bun run type-check`; DOM tests of states + confirm text.
- **Tests:** extend `publisher-drawer-actions.test.ts` (or a new `publisher-drawer-states.test.tsx`).
- **Acceptance:** REQ-FR-01/02/05/07 ACs.
- **Complexity:** Medium.
- **Parallelization:** SEQUENTIAL-DEPENDS-ON-WORKFLOW-PACK.

### Task 2.2 — Composer clarity/states (email/resend/remove)
- **Requirement IDs:** REQ-FR-03, REQ-FR-04, REQ-FR-06.
- **Objective:** resend rate-limit window surfaced specifically; send-before-persist failure surfaced as "prior link active"; honest delivery labels consumed from workflow pack.
- **Target files:** `src/components/workshop/publication/RecipientEmailComposer.tsx` (extend reducer feedback :110-232 for rate-limit window + send-fail-prior-link-intact; consume honest label when available).
- **SERIALIZATION:** workflow pack first.
- **Validation:** `bun run type-check`; extend `recipient-email-composer.test.tsx`.
- **Tests:** rate-limit window message DOM test; send-fail-prior-link DOM test.
- **Acceptance:** REQ-FR-03/04/06 ACs.
- **Complexity:** Medium.
- **Parallelization:** SEQUENTIAL-DEPENDS-ON-WORKFLOW-PACK.

### Task 2.3 — Roster row action clarity (copy/open/manage)
- **Requirement IDs:** REQ-FR-02, REQ-A11Y-01.
- **Objective:** copy states + accessible names + disabled-when-redacted.
- **Target files:** `src/components/workshop/publisher/PublisherRosterRow.tsx`.
- **Validation:** DOM test of copy states + a11y names.
- **Complexity:** Small.
- **Parallelization:** parallel-safe.

---

## Phase 3 — Audit/proof surfacing

**Objective:** surface access/decision events to the owner with honest labels.
**Requirements addressed:** REQ-FR-06.
**Prerequisites:** Phase 0.

### Task 3.1 — Activity tab honest labels
- **Requirement IDs:** REQ-FR-06.
- **Objective:** `PublisherActivityFeed` surfaces `project_publication_events` with honest labels; `sent` not labeled "opened".
- **Target files:** `src/components/workshop/publisher/PublisherActivityFeed.tsx`; consume workflow-pack honest-delivery labels.
- **Validation:** extend `publisher-activity-feed.test.tsx`.
- **Complexity:** Small-Medium.
- **Parallelization:** parallel-safe.

### Task 3.2 — (Optional) structured log for sender transitions
- **Requirement IDs:** REQ-OPS-optional.
- **Objective:** if implemented, redacted structured log per `09`.
- **Status:** optional; not mandated.
- **Complexity:** Small.

---

## Phase 4 — Integration, validation, docs

**Objective:** proportional broad validation + finalize.
**Requirements addressed:** REQ-TEST-01, REQ-PS-02.

### Task 4.1 — Focused + (proportional) broad validation
- **Commands:** `bun run type-check`, `bun run lint`, focused vitest (`project-publication-*`, `publisher-*`, `recipient-email-composer`), targeted Playwright @375px (mobile message + copy-URL + deep-link).
- **Broad `bun run validate`/`build`:** run only because this touches shared logic (publisher/publication) and a11y — per AGENTS.md proportional policy.
- **Exit:** all green; PERF-01 evidence recorded.
- **Complexity:** Small.

### Task 4.2 — Coordination sign-off
- **Objective:** confirm no overlap with workflow/deliverable-trust/recipient-inbox/activity packs landed.
- **Procedure:** `git log --oneline` scan; re-read sibling READMEs.
- **Complexity:** Small.

---

## Durable-goal ledger (per `Creating-Plan-Prompt.md` §4A)

| Phase | Goal ID | Objective | Required evidence | Stop condition | Blocker condition | Review gate | QA gate |
|---|---|---|---|---|---|---|---|
| 0 | G-0 | source truth revalidated | `rg` outputs + git status | evidence recorded | sibling conflict | self | n/a |
| 1 | G-1 | mobile recovery affordance live | DOM test @375px | copy-URL + message present | owner picks Option A | lead | Playwright @375px |
| 2 | G-2 | sender action states live | drawer/composer DOM tests | all 6 actions have states | workflow-pack serialization | lead | vitest |
| 3 | G-3 | audit/proof surfaced | activity feed test | honest labels present | workflow-pack labels not landed | lead | vitest |
| 4 | G-4 | validation clean | type-check/lint/test/build green | PERF-01 within threshold | regression | lead | full validate |

## No `TODO`/`TBD` without owner
All tasks have exact paths + symbols. The only `BLOCKED-EXTERNAL` is DEC-MOBILE Option A (owner decision) — isolated to Task 1.3, which is explicitly not planned. No task has approximate paths.
