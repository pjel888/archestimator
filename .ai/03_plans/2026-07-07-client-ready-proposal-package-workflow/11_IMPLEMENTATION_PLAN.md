# 11 — Implementation Plan

Entrypoint for the future implementation AI. Phases are dependency-aware. Each phase carries a durable-goal contract (ultragoal-style): Goal ID, objective, scope, requirements covered, required evidence, completion audit, checkpoint artifacts, stop condition, blocker condition, review gate, QA gate.

**Before the first edit**: re-read this whole doc, `03`, `06`, `07`. Run `git status` + `rg` to confirm no concurrent-agent changes in target files. Verify `migrations/0036_*.sql` is still the latest migration. Confirm `bun run type-check` is green on main before starting (baseline).

**Files off-limits**: none hard-blocked, but do **not** touch recipient-inbox code (`src/components/workshop/proposals-page/*`, `src/lib/recipient-proposals/*`, `src/lib/repositories/recipient-proposals-repository.ts`) — that's the sibling plan's scope. Do not touch the XLSX workbook writer (`xlsx-workbook.ts`) or export route caps.

**Files intentionally unaffected**: see `10`.

---

## Phase 0 — Discovery (read-only, must complete first)

**Goal ID**: GOAL-0-DISCOVERY
**Objective**: Resolve DATA-04 (do the notification tables exist?) and confirm baseline facts haven't drifted.
**Scope**: read-only inspection.
**Requirements covered**: unblocks DATA-04 / FR-08.
**Required evidence**:
- `PRAGMA table_info(notification_deliveries)` + `PRAGMA table_info(notification_definitions)` output (local D1), OR grep `migrations/` for those table names.
- `ls migrations/ | tail -1` shows `0036`.
- `bun run type-check` exit 0 on clean main.
**Completion audit**: DATA-04 resolved to `exists` or `absent`.
**Stop condition**: evidence captured in run log.
**Blocker condition**: if `notification_*` tables absent, FR-08 is downgraded to BLOCKED-EVIDENCE and Phase 5 is skipped (record in `15`).
**Review gate**: lead only (trivial).
**QA gate**: n/a (read-only).

---

## Phase 1 — Readiness model (spine)

**Goal ID**: GOAL-1-READINESS
**Objective**: Build the server-only `proposal-readiness` module + DTO + unit tests.
**Requirements covered**: FR-01, FR-02, FR-03, ARCH-01, ARCH-02, SEC-02, DATA-01, PERF-01.
**Prerequisites**: Phase 0.
**Dependencies**: reuses `buildProposalExportModel`, `readPublicationSnapshotStaleness`, `countUnsavedEditableRows`, `applyAudiencePolicy`, `readEmailDeliveryConfig`.

### Work package 1.1 — New module

New files (exact repo-relative paths):
- `src/lib/proposal-readiness/types.ts` — `ProposalReadinessResult`, `ReadinessCheck`, `ReadinessCheckId`, `ReadinessSeverity`, client-safe DTO type.
- `src/lib/proposal-readiness/compute-proposal-readiness.ts` — `computeProposalReadiness(input): ProposalReadinessResult` (pure server-only function).
- `src/lib/proposal-readiness/index.ts` — barrel (server-only).

Public contract:
```ts
type ReadinessCheckId =
  | "no_estimates" | "no_priced_rows" | "no_currency"
  | "email_not_configured" | "client_name_missing" // blockers
  | "snapshot_stale" | "unsaved_edits" | "empty_estimate"
  | "cost_split_compatibility_mode" | "link_expired_or_revoked"
  | "no_recipients" | "audience_internal_stripped"; // warnings
```
Responsibility: assemble blockers + warnings from the reused helpers; never return internal-only fields.
Imports: `proposal-export/build-proposal-export-model`, `publisher/roster-repository` (staleness helper), `proposal-preview-model` (unsaved-edits count, via a server-callable variant — note `countUnsavedEditableRows` is currently in a client file; if it can't be imported server-side, extract a shared pure helper into `proposal-readiness/` or `lib/estimates/` and have the client re-import — **DISCOVERY-REQUIRED within this task**: confirm the import boundary, do not duplicate logic).
Why no existing file owns this: it's a new concern spanning export + publisher + publication.

### Work package 1.2 — Tests

New files:
- `tests/vitest/proposal-readiness/compute-proposal-readiness.test.ts` — TEST-01/02/03 (each blocker + each warning case).
- `tests/vitest/proposal-readiness/redaction.test.ts` — TEST-14 (DTO contains no `sourceBreakdown`/`supplier`/internal fields).
- `tests/vitest/perf/proposal-readiness.bench.test.ts` — PERF-01 evaluator.

**Required evidence**: focused vitest green; bench p95 ≤ 50 ms printed.
**Completion audit**: every FR-02 blocker id + every FR-03 warning id has a passing case.
**Checkpoint artifacts**: test output.
**Stop condition**: TEST-01/02/03/14 + PERF-01 green.
**Blocker condition**: if `countUnsavedEditableRows` import boundary blocks server use, extract a shared helper (small refactor) before proceeding.
**Review gate**: maker-checker — a different lane/agent reviews the readiness lib + tests.
**QA gate**: adversarial — feed malformed inputs (null estimates, huge node count) and assert graceful `readiness_unavailable` (REL-02).
**Complexity**: Medium.
**Validation commands**:
- `bunx vitest run tests/vitest/proposal-readiness --maxWorkers=1`
- `bunx vitest run tests/vitest/perf/proposal-readiness.bench.test.ts --maxWorkers=1`
- `bun run type-check`

---

## Phase 2 — Send/Publish gate

**Goal ID**: GOAL-2-GATE
**Objective**: Wire FR-04 readiness gate into `createProjectPublication` + `republishProjectPublication`.
**Requirements covered**: FR-04, REL-02, SEC-03.
**Prerequisites**: Phase 1.
**Dependencies**: `proposal-readiness` lib.

### Work package 2.1 — Gate in actions

Modify (exact paths):
- `src/lib/publication/actions.ts` — in `createProjectPublication` (line ~773) and `republishProjectPublication` (line ~843): after existing input validation + auth, call `computeProposalReadiness(...)`; if `blockers.length > 0`, return the existing action-error shape with `error:"readiness_blocked"` + `blockers`. Preserve the existing "Select at least one estimate" path (it becomes the `no_estimates` blocker message).

Symbols touched: `createProjectPublication`, `republishProjectPublication`.
Security: gate is inside the action (direct POST safe). Auth unchanged (`assertProjectPublicationManager`).
Cache/revalidation: unchanged (gate runs before write).
DB impact: none (gate is pre-write).
Bundle/RSC impact: none (server-only).
Performance: readiness adds ≤ 50 ms p95; acceptable.
Rollback gate: feature flag (OPS-01) — when off, gate is skipped (pass-through) preserving today's behavior.

### Work package 2.2 — Test

- Extend `tests/vitest/publication/` (or create `tests/vitest/publication/readiness-gate.test.ts`) — TEST-04: each blocker id → action returns `readiness_blocked` + writes nothing; no blocker → unchanged happy path.
- TEST-15 (security): direct POST with a blocker is rejected (no client bypass).

**Required evidence**: TEST-04 green; existing publish tests still green (regression).
**Completion audit**: each FR-02 blocker id proven to block; happy path unchanged.
**Stop condition**: TEST-04 + regression green.
**Blocker condition**: none expected.
**Review gate**: code-reviewer lane reviews the action change.
**QA gate**: adversarial — concurrent publish during revoke (existing optimistic lock still holds).
**Complexity**: Small.
**Validation**:
- `bunx vitest run tests/vitest/publication/readiness-gate.test.ts --maxWorkers=1`
- `bunx vitest run tests/vitest/publication --maxWorkers=1` (regression)
- `bun run type-check`

---

## Phase 3 — `responded` status writer

**Goal ID**: GOAL-3-RESPONDED
**Objective**: Wire FR-07 `responded` flip into the decision path.
**Requirements covered**: FR-07, SEC-06.
**Prerequisites**: none (independent of Phase 1/2 — can run in parallel).
**Dependencies**: existing decision path.

### Work package 3.1 — Flip in same txn

Modify:
- `src/lib/publication/d1-store.ts` — `submitClientResponse` (line ~644): add `UPDATE shared_link_recipients SET delivery_status='responded', updated_at=? WHERE publication_id=? AND id=?` to the same `db.batch` as the `shared_link_responses` upsert.
- `src/lib/publication/public-repository.ts` — `submitSharedLinkDecision` (line ~1011): ensure the recipient identity context is passed through so the UPDATE is scoped correctly (SEC-06: scope by the publication resolved from the token, not from client input).

Symbols: `submitClientResponse`, `submitSharedLinkDecision`.
Data implications: sets `delivery_status` to an existing CHECK-allowed value; no migration.
Security: scope by token-resolved publication + recipient id; a recipient from pub A cannot flip pub B (TEST-15).
Concurrency: same txn → no drift.
Rollback: feature flag; when off, status stays `opened` (harmless).

### Work package 3.2 — Test

- `tests/vitest/publication/responded-status.test.ts` — TEST-10: submit decision → subsequent recipient read shows `responded`.
- TEST-15 (security): cross-publication recipient id rejected / no-op.

**Required evidence**: TEST-10 + TEST-15 green.
**Completion audit**: `responded` proven on decision; cross-pub scoping proven.
**Stop condition**: tests green.
**Blocker condition**: none.
**Review gate**: code-reviewer + data-integrity reviewer.
**QA gate**: adversarial — concurrent duplicate decision (existing dedup holds); decision after revoke (existing active-publication gate holds).
**Complexity**: Small.
**Validation**:
- `bunx vitest run tests/vitest/publication/responded-status.test.ts --maxWorkers=1`
- `bun run type-check`

---

## Phase 4 — Owner-composed recipient message

**Goal ID**: GOAL-4-MESSAGE
**Objective**: FR-05 owner message end-to-end.
**Requirements covered**: FR-05, UX-03, SEC-01, DATA-02.
**Prerequisites**: Phase 0 (migration ordering).
**Dependencies**: migration `0037`, existing email builder.

### Work package 4.1 — Migration

New file: `migrations/0037_shared_link_recipients_invitation_message.sql` (additive: 2 nullable TEXT columns). See `07` blueprint. Apply local: `bun run cf:d1-apply-local 0037`. Confirm via `PRAGMA table_info`.
Remote apply is implementation-time under the standing Cloudflare mandate.

### Work package 4.2 — Backend plumbing

Modify:
- `src/lib/publication/actions.ts`:
  - `RecipientInput` type: add `invitationSubject?: string`, `invitationMessage?: string`.
  - `addSharedLinkRecipients` (line ~1350): validate (zod 120/1000, trim, reject control chars), sanitize (plain text; HTML-escape at render time in the email builder), persist on the recipient row.
  - `sendSharedLinkRecipientInvitationEmail` (line ~1265): accept message params; render escaped message into the body ("Message from {sender}:"); subject override falls back to default.
  - `resendSharedLinkRecipientEmail` (line ~1552): accept optional override; default to stored message.
- `src/lib/publication/email-links.ts` / a small new `email-templates/shared-link-invitation.ts` helper if the body assembly is non-trivial (keep it in `lib/publication/`).

### Work package 4.3 — UI

Modify:
- `src/components/workshop/publication/RecipientEmailComposer.tsx` — add collapsible "Add a personal message" with subject + body inputs + live char counts + validation feedback. Reuse existing `Input`/`Textarea` primitives.
- Pass message through `addSharedLinkRecipients`/`resend` calls.

### Work package 4.4 — Tests

- `tests/vitest/publication/owner-message.test.ts` — TEST-07: over-limit rejected; HTML in input is escaped in rendered output; default copy when omitted; resend reuses stored.
- `tests/vitest/dom/recipient-composer-message.test.tsx` — TEST-08: inputs render, validate, char counts.

**Required evidence**: TEST-07/08 green; existing recipient tests green (regression); migration applied locally.
**Completion audit**: send + resend + render + sanitization proven.
**Stop condition**: tests green; `git diff --check` clean.
**Blocker condition**: if DEC-02 reverses to "ephemeral only", skip 4.1 and persist nothing (still implementation-ready).
**Review gate**: security reviewer (SEC-01 sanitization) + UX reviewer.
**QA gate**: adversarial — oversized payload, control chars, attempt to inject `<script>`/`<a>`, empty subject with body, unicode.
**Complexity**: Medium.
**Validation**:
- `bun run cf:d1-apply-local 0037`
- `bunx vitest run tests/vitest/publication/owner-message.test.ts --maxWorkers=1`
- `bunx vitest run tests/vitest/dom/recipient-composer-message.test.tsx --maxWorkers=1`
- `bun run lint:design-system` (no new primitive violations)
- `bun run type-check`

---

## Phase 5 — Notifications dispatch (conditional on DATA-04)

**Goal ID**: GOAL-5-NOTIFY
**Objective**: FR-08 dispatch `publication_activity` notifications.
**Requirements covered**: FR-08, SEC-04, REL-03.
**Prerequisites**: Phase 0 resolves DATA-04 to `exists`.
**Dependencies**: notification tables confirmed.

### Work package 5.1 — Dispatcher

New files (exact paths):
- `src/lib/notifications/dispatch.ts` — `dispatchPublicationActivityNotification({workspaceId, projectId, publicationId, eventKind, actorUserId})`: workspace-scoped write into `notification_deliveries` for owner/manager members; dedup per (user, eventKind, publicationId) within digest window; best-effort (try/catch + log; never throw).
Modify:
- `src/lib/publication/actions.ts` — call `dispatchPublicationActivityNotification` at: publish (`createProjectPublication`), republish, comment insert (`insertClientComment` path), decision submit (`submitClientResponse`/`submitSharedLinkDecision`). Wrap each in try/catch (REL-03).

### Work package 5.2 — Test

- `tests/vitest/notifications/dispatch.test.ts` — TEST-11: each event → unread count bumps for managers; cross-workspace user unaffected (SEC-04); dispatch failure doesn't fail parent action (REL-03).

**Required evidence**: TEST-11 green.
**Completion audit**: dispatch proven for publish/comment/decision; non-blocking proven; scope proven.
**Stop condition**: tests green.
**Blocker condition**: if DATA-04 = absent, **skip this phase**, mark FR-08 BLOCKED-EVIDENCE in `15`, and Phase 5 deliverable becomes a design-only stub.
**Review gate**: security reviewer (SEC-04 scope).
**QA gate**: adversarial — mass events (rate limit/dedup), dispatch during publish failure (parent must still succeed/fail independently).
**Complexity**: Medium.
**Validation**:
- `bunx vitest run tests/vitest/notifications/dispatch.test.ts --maxWorkers=1`
- `bun run type-check`

---

## Phase 6 — Owner UX (Preflight + honest delivery + resend/revoke gating + terms note)

**Goal ID**: GOAL-6-UX
**Objective**: UX-01 Preflight, UX-02 export-dialog hints, FR-06 honest labels, FR-09 resend/revoke gating, UX-04 terms note.
**Prerequisites**: Phase 1 (DTO), Phase 2 (gate error shape), Phase 3 (`responded`), Phase 4 (message UI lives here too or in Phase 4 — keep message UI in Phase 4).

### Work package 6.1 — Drawer data + Preflight panel

Modify:
- `src/lib/publisher/drawer-actions.ts` — `readPublisherPublicationDrawerData`: add a parallel `computeProposalReadiness(...)` call; return a `readiness` block (DTO). PERF-02 (parallel).
- `src/components/workshop/publisher/PublisherDrawer.tsx` — add Preflight panel above tabs; render blockers (destructive, disable Send/Resend/Revoke) + warnings (caution). `role="status"` + `aria-live`. Reuse alert primitives.

### Work package 6.2 — Export-dialog hints

Modify:
- `src/components/workshop/ProposalExportPreviewDialog.tsx` — render the readiness warnings subset (UX-02) in the existing "export notes to review" area. The dialog already has the export model; it can call a thin client-side projection of the same warning ids (or receive them as a prop from the host page). Keep it a subset + consistent with the drawer.

### Work package 6.3 — Honest delivery labels + resend/revoke gating + terms note

Modify:
- `src/components/workshop/publication/RecipientEmailComposer.tsx` — FR-06: relabel `sent` with honest tooltip; render `responded` on decision; document `bounced` as deferred. FR-09: disable Resend while a blocker is active. UX-04: terms note near Send.

### Work package 6.4 — Tests

- `tests/vitest/dom/publisher-drawer-preflight.test.tsx` — TEST-05: blockers disable Send; warnings don't; a11y roles present.
- `tests/vitest/dom/proposal-export-preview-readiness.test.tsx` — TEST-06: warnings subset rendered.
- `tests/vitest/dom/recipient-composer-delivery-labels.test.tsx` — TEST-09: honest `sent` tooltip; `responded` shown.
- `tests/vitest/dom/publisher-drawer-resend-revoke-gating.test.tsx` — TEST-12: Resend/Revoke disabled while blocked.
- `tests/vitest/dom/publisher-drawer-terms-note.test.tsx` — TEST-13: terms note + link render.

**Required evidence**: all DOM tests green; existing drawer/composer/dialog tests green (regression).
**Completion audit**: each UX/FR requirement proven in DOM.
**Stop condition**: tests green.
**Blocker condition**: none.
**Review gate**: UX/a11y reviewer.
**QA gate**: keyboard-only traversal of Preflight + dialog; screen-reader announcement of blocker → warning transition.
**Complexity**: Medium-Large (most UI surface).
**Validation**:
- `bunx vitest run tests/vitest/dom/publisher-drawer-preflight.test.tsx tests/vitest/dom/proposal-export-preview-readiness.test.tsx tests/vitest/dom/recipient-composer-delivery-labels.test.tsx tests/vitest/dom/publisher-drawer-resend-revoke-gating.test.tsx tests/vitest/dom/publisher-drawer-terms-note.test.tsx --maxWorkers=1`
- `bun run lint:design-system`
- `bun run type-check`

---

## Phase 7 — Integration, flags, docs

**Goal ID**: GOAL-7-INTEGRATE
**Objective**: OPS-01 flags, OPS-02 rollback no-op, DOC-01 state log.
**Prerequisites**: Phases 1–6.

### Work package 7.1 — Feature flags

Wire each slice (readiness gate, owner message, `responded`, notifications, Preflight UI) to the existing rollout/flag mechanism so each can be dark-shipped + toggled + rolled back independently. Confirm rollback = no-op pass-through for the gate (OPS-02).

### Work package 7.2 — Docs

- Append `.ai/10_state/current-state.md` entry on completion (DOC-01).
- Add `.ai/10_state/decisions.md` entries for DEC-01 (client-name warn-vs-block) and DEC-02 (persist vs ephemeral message).

**Required evidence**: `bun run validate` (broad, since this touches shared/auth/data surfaces — justified per AGENTS.md proportional verification) green; `bun run build` green.
**Completion audit**: flags wired; rollback proven (disable flag → baseline behavior); docs updated.
**Stop condition**: validate + build green.
**Blocker condition**: none.
**Review gate**: integration reviewer + final verifier.
**QA gate**: full adversarial matrix (`19`).
**Complexity**: Small-Medium.
**Validation**:
- `bun run validate`
- `bun run build`
- `git diff --check`

---

## Blocked / discovery tasks (consolidated)

| ID | Task | Status | Owner | Options | Recommendation | Impact |
|---|---|---|---|---|---|---|
| REL-01 | Bounce/complaint ingestion webhook | BLOCKED-EXTERNAL | owner + provider | (a) wait for CF Email webhook; (b) switch provider; (c) poll; (d) accept the gap | (a) wait + honestly label; revisit when CF Email adds inbound events | Delivery "bounce" proof unavailable; `bounced` never written |
| DATA-04 | Confirm `notification_*` tables exist | DISCOVERY-REQUIRED (Phase 0) | implementer | read `migrations/` + `PRAGMA table_info` | run the discovery; if absent, FR-08 → BLOCKED-EVIDENCE | Notification dispatch slice may defer |
| count-unsaved-import | Confirm `countUnsavedEditableRows` server-importable | DISCOVERY-REQUIRED (Phase 1) | implementer | import as-is / extract shared helper | extract shared pure helper if boundary blocks | Small refactor |
| DEC-01 | client-name warn vs block | owner-delegated planning decision | planner (decided: **warn** for v1, upgrade to block after closed-beta feedback) | warn / block | warn (avoids blocking owners with informal clients; revisit post-beta) | FR-02(e) priority P1 not P0 |
| DEC-02 | persist vs ephemeral owner message | owner-delegated planning decision | planner (decided: **persist** on `shared_link_recipients` via `0037`) | persist / ephemeral | persist (audit + resend consistency; cheap) | Migration `0037` in scope |

No task has an unresolved architecture/path/contract blocker except the explicit external one (REL-01) and the two safe discovery steps (DATA-04, count-unsaved-import).
