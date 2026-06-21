# 91 — Forward Execution Plan (Sequenced DAG + Acceptance Criteria)

Date: 2026-06-21 · Status: **READY-TO-EXECUTE BACKLOG.** Converts the backward-looking
consolidated backlog into a dependency-ordered, lane-assigned, acceptance-criteria-bearing plan an
executor can run with zero questions. **Every ID, severity, and status below is bound to
[`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md); if this doc disagrees with 75, 75 wins.**

Scope = the **Open** / **Partial** rows in [`75` §8 roll-up](75_FINDING_ID_REGISTRY.md):
SEC-SHARE-05, SEC-SHARE-06, SEC-SHARE-08; MANAGER-F-01 (residual), F-03, F-04, F-05, F-06;
QA-G01..G10; PERF-01A, 05, 06, 09, 12; RUX-11, 12, 13, 14; SHF-01. The **Decision**-status rows
(SEC-SHARE-07, SEC-SHARE-10, SHF-02/03) are not Open-backlog items here but are tracked via their
owner calls below — SEC-SHARE-10 (OG total+clientName leak) is gated on **D3**. Decision-gated
items (D1–D11) cannot start until their owner call lands — see
[§4 Owner-decision block](#4-owner-decision-block) and
[`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md).

Cross-links: backlog [`70`](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) · decisions
[`71`](71_OPEN_DECISIONS_REGISTER.md) · blast-radius [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md) ·
registry [`75`](75_FINDING_ID_REGISTRY.md) · UX acceptance [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) ·
deploy runbook [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md). **The deploy/migration runbook is NOT
duplicated here — DB/security items reference [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) for apply
order, drift reconciliation, and rollback.**

---

## 0. How to read this plan

- **Lanes:** `BE` backend (routes/RPC/server actions) · `DB` migrations/schema · `FE` frontend
  (receiver + manager UI) · `QA` test rigor · `OBS`/`UX` cross-lane (point to `92`/`85`).
- **Gate:** every item is binary pass/fail. An item is **done** only when its acceptance criteria
  pass AND the shared [Definition of Done](#5-definition-of-done-shared-gate) gate is green.
- **Verification command:** runnable as-is from repo root. Targeted vitest uses
  `bunx vitest run <files> --maxWorkers=1`; type safety uses `bun run type-check`.
- **Blast radius:** every item names the conflict-risk files; the authoritative collision map is
  [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md). If two in-flight items touch the same file in 72's
  hot-file list, serialize them (see [§1 DAG](#1-sequencing-dag)).
- **UNVERIFIED** markers carry the exact command to resolve them; do not treat them as fact.

---

## 1. Sequencing DAG

Edges are `A -> B` = "A must land (or its decision must resolve) before B starts." Decision nodes
(`Dn`) are diamonds owned by [`71`](71_OPEN_DECISIONS_REGISTER.md). Waves are the recommended
execution order; items inside a wave are parallel-safe **unless** they share a hot file per
[`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md).

```
WAVE 0 — unblock decisions + retire stale (no code risk)
  QA-G01 (retire stale-invalid) ─┐
  QA-G02 (already Fixed → regression test) ─┤  no upstream; pure QA
  RUX-12 (stale test comments / docs-only) ─┘
  D1..D11 owner calls  ───────────────────────────────► unblock gated waves

WAVE 1 — test-rigor hardening on already-Fixed surfaces (no source change)
  QA-G03 (DOM escaping)      ◄── independent
  QA-G04 (session init)      ◄── independent
  QA-G05 (circuit breaker)   ◄── independent
  QA-G07 (offline queue + tampered 409) ◄── independent
  QA-G08 (comments-after-decision) ◄── independent
  QA-G09 (tighten permissive status arrays) ◄── independent (shares activity/comments test files)
  QA-G06 (durable duplicate-decision DB race) ◄── needs provider/local-Supabase harness (see 90)

WAVE 2 — receiver UX polish (FE, low blast radius)
  RUX-13 (proposalPaper utility + lint guard) ──► RUX-14 only shares Hero? no → parallel
  RUX-14 (cover scrim AA)   ◄── needs D-none; acceptance bar in 85
  RUX-11 (Storybook receiver matrix) ◄── needs RUX-13 utility landed for visual fidelity
                                          (spec in 85)

WAVE 3 — manager workflow (FE + BE)
  MANAGER-F-03 (invalid-link copy parity) ──► (page + API copy)
  MANAGER-F-04 (per-recipient partial-send retry) ◄── UX spec in 35
  MANAGER-F-06 (dashboard quick-actions) ◄── UX spec in 35
  MANAGER-F-01 residual (full RBAC matrix) ──► MANAGER-F-05 (behavioral action tests)
  MANAGER-F-05 (behavioral republish/rotate/loadActivity tests) ◄── after F-01 matrix shape settles

WAVE 4 — security/notification (BE/DB, HIGH BLAST RADIUS → 90 + Codex gate)
  D5 ─► SEC-SHARE-05 (unsubscribe CSRF/rate hardening)        [Open-Deferred unless D5 says do-now]
  D9 ─► SEC-SHARE-06 (owner digest from public routes via service-role)
  D8 ─► SEC-SHARE-08 (atomic revoke+insert)  ── shares actions.ts with MANAGER-F-01/F-05
                                                  → serialize against Wave 3 (see 72)

WAVE 5 — performance (measure-first; mostly gated on a measurement, not a decision)
  PERF-01A ◄── gated on D2 (server-redirect session flow needs location-exposure call)
  PERF-05  ◄── "one-RPC path only after security review" → Codex review gate + 90
  PERF-06  ── measure snapshot bytes FIRST (evidence/) ──► redesign only if budget breached
  PERF-09  ── measure scrypt+sync-write latency FIRST (evidence/) ──► tune only if budget breached
  PERF-12  ── measure rotate cost FIRST ──► credential-version model is scale backlog

WAVE 6 — spec/architecture decision
  D7 ─► SHF-01 (realtime owner feed) — implement realtime OR ratify focus-refresh as intended V2
```

**Conflict-risk hot files (authoritative list in [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md)):**
`src/lib/publication/actions.ts` (SEC-SHARE-06, SEC-SHARE-08, MANAGER-F-01/F-05) — **serialize**;
`src/app/api/share/[token]/activity/route.ts` (SEC-SHARE-06 trigger path, QA-G09);
`tests/vitest/project-publication-activity.test.tsx` (QA-G09, SEC-SHARE-06 regression);
`tests/vitest/project-publication-comments.test.tsx` (QA-G03/05/07/08/09);
`src/components/share/SharePageDecision.tsx` (RUX-13, QA-G08).

---

## 2. Reconciliation of 40's gaps to canonical QA-G01..G10

[`40`](40_TEST_QA_ULTRAQA_MATRIX.md) surfaced QA gaps without first-class ids; [`75` §4](75_FINDING_ID_REGISTRY.md)
assigned them. This plan executes the canonical ids only:

| Canonical id | 40 origin | 75 status | This plan's action |
|---|---|---|---|
| QA-G01 | "comment sanitizer weak/not asserted to RPC" (40 §1 note, 40:50) | **Stale-invalid** | **Retire.** Test already asserts payload at `project-publication-comments.test.tsx:259-278`. No new test; only QA-G09 tightening survives. |
| QA-G02 | "decision note not server-sanitized/truncated" (40 P0) | **Stale-invalid → Fixed** | **Convert to regression test (P2).** Already done at `decision/route.ts:145`. |
| QA-G03 | real DOM-escaping render gap (40:57) | **Open** P1 | New `recipient-content-escaping.test.tsx`. |
| QA-G04 | session-init integration gap (40:49) | **Open** P1 | New init redirect/cookie test. |
| QA-G05 | circuit-breaker route gap (40:58) | **Open** P1 | New circuit-open route test. |
| QA-G06 | durable duplicate-decision race (40:51) | **Open** P1 | Provider-backed race test (needs harness, see [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md)). |
| QA-G07 | offline queue + tampered viewToken (40:58) | **Open** P1 | Queue-flush + 409 route tests. |
| QA-G08 | comments-after-decision (40:52) | **Open** P1 | Behavioral same-session test. |
| QA-G09 | permissive status arrays (40 §1 note, 40:53) | **Open** P2 | Tighten `comments:~287`, `activity:451-460,604-610`. |
| QA-G10 | live header smoke + visual proof (40:59-60) | **Open** P2 | Header smoke command + defer visual to [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md). |

---

## 3. Per-item execution entries

Each entry: **lane · severity (bound to 75) · upstream deps · Given/When/Then acceptance ·
target source · target test · verification command · blast radius.** Severities are P0–P3 only.

### WAVE 0 — Retire stale / docs-only

#### QA-G01 — Retire stale-invalid sanitizer-weakness claim · QA · P-N/A (Stale-invalid) · deps: none
- **Given** `project-publication-comments.test.tsx:259-278` already asserts the inserted body
  excludes `<script>/<img>/<b>/onerror`, includes `bold`, length ≤1000, **When** the QA backlog is
  reconciled, **Then** QA-G01 is removed from the active worklist with a one-line pointer to that
  assertion and to QA-G09 (the only surviving permissive-RPC tightening).
- **Target:** docs only (this row + [`40`](40_TEST_QA_ULTRAQA_MATRIX.md) remediation, owned elsewhere). No source/test change.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx --maxWorkers=1`
  (confirms the existing assertion is green — evidence the claim is stale).
- **Blast radius:** none (no code touched).
- **Gate:** PASS iff the comments suite is green AND no QA-G01 work item remains open.

#### QA-G02 — Convert already-Fixed decision-note sanitization to a regression test · QA · P2 · deps: none
- **Given** `decision/route.ts:145` calls `sanitizeSharedLinkRecipientText(note, 2000)`, **When** a
  decision POST carries a 3000-char note with markup, **Then** the route persists a sanitized note
  truncated to ≤2000 chars with markup stripped, and a regression test pins that exact RPC payload.
- **Target source:** `src/app/api/share/[token]/decision/route.ts` (no change — pin behavior).
- **Target test:** extend `tests/vitest/project-publication-decision.test.tsx` (new
  `note sanitization/truncation regression` case).
- **Verify:** `bunx vitest run tests/vitest/project-publication-decision.test.tsx --maxWorkers=1`
- **Blast radius:** test-only; decision route untouched.
- **Gate:** PASS iff the new case asserts truncation-to-2000 + markup-strip and is green.

#### RUX-12 — Fix stale test comments + portal type exemption note · FE/QA · P3 · deps: none
- **Given** comments in `project-publication-page.test.tsx` reference `text-[10/9/11px]` against a
  surface now rendering `13px` (drifted), **When** the comments are corrected, **Then** the test
  comments match the rendered class and the portal type-exemption rationale is documented in-line.
- **Target test:** `tests/vitest/project-publication-page.test.tsx` (comment text at/around `:660`
  confirmed as the `text-[10px]` reference; re-anchor against current render).
- **Verify:** `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1`
- **Blast radius:** docs/comment-only; no assertion logic changes.
- **Gate:** PASS iff suite green AND no stale px references remain in the touched comments.

### WAVE 1 — Test-rigor hardening (no source change to already-Fixed surfaces)

#### QA-G03 — Real DOM-escaping render test · QA · P1 · deps: none
- **Given** comment/decision/activity render recipient text as React text nodes
  (`SharePageComments.tsx:350-358`, `SharePageDecision.tsx:247-249`, `SharedLinkActivityFeed.tsx:145-148`),
  **When** a recipient submits `<img src=x onerror=alert(1)>`, **Then** the rendered DOM contains
  the literal escaped string and **no** `img` element / no executed handler.
- **Target test (NEW):** `tests/vitest/share/recipient-content-escaping.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/share/recipient-content-escaping.test.tsx --maxWorkers=1`
- **Blast radius:** test-only; complements the static `share/no-dangerous-html.test.ts` guard.
- **Gate:** PASS iff the rendered query finds the escaped literal and `queryByRole('img')` is null.

#### QA-G04 — Recipient-session init redirect/cookie integration test · QA · P1 · deps: none
- **Given** `SharePageRecipientSessionInitializer.tsx` posts to `/session` then `replace`s the URL,
  **When** the initializer mounts with a recipient token, **Then** the test asserts the POST fires,
  a `Set-Cookie` HttpOnly session cookie is returned, `router.replace` is called, and the sanitized
  URL no longer contains the raw token.
- **Target test (NEW):** `tests/vitest/share/recipient-session-init-integration.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/share/recipient-session-init-integration.test.tsx --maxWorkers=1`
- **Blast radius:** test-only.
- **Gate:** PASS iff all four assertions (POST, Set-Cookie, replace, sanitized URL) hold.

#### QA-G05 — Comment circuit-breaker route test · QA · P1 · deps: none
- **Given** the comment route opens a circuit breaker (`comment/route.ts:19-59,269-276`), **When**
  >50% of recent attempts return 5xx, **Then** the route returns `503` with `Retry-After: 120`.
- **Target test (NEW or extend):** `tests/vitest/project-publication-comments.test.tsx`
  (circuit-open case). **HOT FILE** — see [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md); coordinate with QA-G03/07/08/09.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx --maxWorkers=1`
- **Blast radius:** test-only, shared file.
- **Gate:** PASS iff the open-circuit response is `503` + `Retry-After: 120`.

#### QA-G06 — Durable duplicate-decision DB race · QA · P1 · deps: provider/local-Supabase harness
- **Given** two concurrent decision POSTs for the same recipient/snapshot, **When** both race against
  the DB uniqueness/RPC, **Then** exactly one persists and the other returns `409` — proven against a
  **real** provider/local Supabase, not mocks.
- **Target test (NEW):** `tests/vitest/share/duplicate-decision-race.provider.test.ts` (gated behind
  the provider harness flag). **Harness availability is UNVERIFIED.**
- **Verify (harness up):** `bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1`
- **Verify harness exists:** `pg_isready -h 127.0.0.1 -p 54322` (per [`70`:60](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) local Supabase was down) — if not ready, see [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) for bring-up.
- **Blast radius:** test-only; requires DB harness.
- **Gate:** PASS iff exactly-one-persists + one-409 under real concurrency. If harness unavailable, item stays **Open/UNVERIFIED** (do not claim Fixed).

#### QA-G07 — Offline queue flush + tampered-viewToken 409 · QA · P1 · deps: none
- **Given** the client offline queue (`SharePageComments.tsx:57-216`) and route view-token locking,
  **When** the queue flushes after reconnect AND when a `comment`/`decision` POST carries
  `viewToken:"tampered"`, **Then** queued items flush in order and the tampered POST returns `409`.
- **Target test (NEW or extend):** `tests/vitest/project-publication-comments.test.tsx` +
  `tests/vitest/project-publication-decision.test.tsx`. **HOT FILE** (comments) — coordinate with QA-G05.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx --maxWorkers=1`
- **Blast radius:** test-only.
- **Gate:** PASS iff flush-order asserted AND tampered viewToken → `409`.

#### QA-G08 — Comments-after-decision behavioral test · QA · P1 · deps: none
- **Given** spec P7 ("post-decision comments allowed") and `SharePageDecision.tsx:249` copy, **When**
  a recipient submits a final decision then a comment in the same session, **Then** the comment POST
  succeeds (not blocked by the decision lock).
- **Target test (NEW or extend):** `tests/vitest/project-publication-comments.test.tsx` (same-session
  post-decision case). **HOT FILE** — coordinate with QA-G05/07.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx --maxWorkers=1`
- **Blast radius:** test-only.
- **Gate:** PASS iff a comment after a decision returns success in one session.

#### QA-G09 — Tighten permissive status arrays · QA · P2 · deps: none
- **Given** tests accept broad `[200,201,…,503]` sets (`comments:~287`, `activity:451-460,604-610`),
  **When** they are tightened, **Then** each asserts the exact expected status for its case.
- **Target test:** `tests/vitest/project-publication-comments.test.tsx`,
  `tests/vitest/project-publication-activity.test.tsx`. **HOT FILES** — coordinate with SEC-SHARE-06 regression + QA-G05/07/08.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`
- **Blast radius:** test-only; tightening may surface latent status drift (intended).
- **Gate:** PASS iff no remaining broad status array AND both suites green.

#### QA-G10 — Live security-header smoke + visual proof · QA/UX · P2 · deps: none
- **Given** CSP/security headers apply to `/share` pages, **When** a header smoke runs against a
  served instance, **Then** required headers (CSP, no-store, X-Frame/Frame-Options per current
  policy) are present; mobile/print visual proof is deferred to [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Target:** new smoke script (e.g. `scripts/smoke-share-headers.mjs`) + visual matrix in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Verify:** `curl -sI "$SHARE_BASE_URL/share/<token>" | grep -iE 'content-security-policy|cache-control|x-frame-options'`
  (**`$SHARE_BASE_URL` UNVERIFIED** — set to the served instance; if no instance, item stays Open).
- **Blast radius:** none (read-only smoke).
- **Gate:** PASS iff all required headers present AND visual matrix signed off in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).

### WAVE 2 — Receiver UX polish

#### RUX-13 — `bg-proposalPaper` utility + lint guard for `#FFFDF8` · FE · P2 · deps: none
- **Given** 8 hard-coded `#FFFDF8` literals across 4 files (`SharePageDecision.tsx:138/242/261/317`,
  `ShareEstimateTreePanel.tsx:256`, `not-found.tsx:5`, `loading.tsx:9/47` — file set re-verified),
  **When** a `bg-proposalPaper` utility replaces them and a lint guard forbids the literal, **Then**
  zero `#FFFDF8` literals remain under `src/components/share` + `src/app/share` and the guard fails
  on reintroduction.
- **Target source:** the 4 files above + token/utility definition + a design-allowlist/lint guard
  (extend the existing `design-enforcer-share-allowlist` contract).
- **Target test:** `tests/vitest/design-enforcer-share-allowlist.test.ts` (add `#FFFDF8` ban).
- **Verify:** `rg -n "#FFFDF8" src/components/share src/app/share` (expect zero) then
  `bunx vitest run tests/vitest/design-enforcer-share-allowlist.test.ts --maxWorkers=1`
- **Blast radius:** receiver-only visual; `SharePageDecision.tsx` is shared with QA-G08 (test) but not the same lines.
- **Gate:** PASS iff `rg` returns zero hits AND the guard test is green.

#### RUX-14 — Cover-image scrim AA contrast · FE/UX · P3 · deps: none (acceptance bar in 85)
- **Given** `SharePageHero.tsx:42-43` uses `from-black/35` + `text-white/90`, **When** the scrim is
  tuned, **Then** the overlay label meets AA (≥4.5:1) over the worst-case (lightest) cover image per
  the acceptance bar in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Target source:** `src/components/share/SharePageHero.tsx`.
- **Target test:** visual/contrast acceptance recorded in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) (no pure-unit AA assertion).
- **Verify:** contrast check per [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) matrix; `bun run type-check` for the edit.
- **Blast radius:** Hero-only.
- **Gate:** PASS iff AA ≥4.5:1 on the lightest sampled cover AND [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) sign-off.

#### RUX-11 — Storybook receiver state matrix (real routes/session/comments/password) · FE · P2 · deps: RUX-13
- **Given** receiver stories are fixture-only, **When** integrated stories mock the real
  routes/session/comments/password states, **Then** designers can inspect the full state matrix
  spec'd in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Target source:** new `.stories.tsx` under the share components (per [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) matrix).
- **Verify:** `bun run type-check` + Storybook build (`bun run build-storybook` if defined — **UNVERIFIED**; confirm with `rg -n "build-storybook" package.json`).
- **Blast radius:** stories-only; depends on RUX-13's `bg-proposalPaper` for visual fidelity.
- **Gate:** PASS iff every state in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md)'s matrix has a story AND Storybook builds.

### WAVE 3 — Manager workflow

#### MANAGER-F-03 — Invalid-link error-copy parity (page vs API) · FE/BE · P2 · deps: none
- **Given** the page and API emit inconsistent invalid-link copy, **When** copy is unified, **Then**
  a recipient hitting an unknown/revoked/expired link sees the **same** branded message on both the
  page (`share/[token]/not-found.tsx`) and any API error envelope.
- **Target source:** `src/app/share/[token]/not-found.tsx` + the API error path in the share routes.
- **Target test:** extend `tests/vitest/project-publication-route.test.ts` + a page render assertion.
- **Verify:** `bunx vitest run tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-page.test.tsx --maxWorkers=1`
- **Blast radius:** receiver error surfaces.
- **Gate:** PASS iff page + API copy strings match the single source.

#### MANAGER-F-04 — Per-recipient partial-send failure surface + retry · FE · P2 · deps: UX spec in 35
- **Given** `RecipientEmailComposer.tsx:163-207` sends to multiple recipients, **When** a subset
  fails, **Then** each failed recipient is surfaced with a retry affordance and successes are not
  re-sent (per the UX spec in [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md)).
- **Target source:** `src/components/.../RecipientEmailComposer.tsx` (confirm path via
  `rg -n "RecipientEmailComposer" src` before editing) + send action in `src/lib/publication/actions.ts`.
- **Target test:** extend `tests/vitest/project-publication-rotate-resend.test.ts`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-rotate-resend.test.ts --maxWorkers=1`
- **Blast radius:** **`actions.ts` HOT FILE** — serialize with SEC-SHARE-06/08, MANAGER-F-01/F-05 (see [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md)).
- **Gate:** PASS iff partial-failure rows render + retry re-sends only failures.

#### MANAGER-F-06 — Dashboard quick-actions (copy/rotate/revoke) · FE · P3 · deps: UX spec in 35
- **Given** no dashboard quick-actions exist, **When** copy/rotate/revoke are added, **Then** each
  fires the corresponding action with confirm-on-destructive per [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md).
- **Target source:** dashboard/manager surface (confirm via `rg`) + reuse existing rotate/revoke actions.
- **Target test:** extend `tests/vitest/project-publication-header.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-header.test.tsx --maxWorkers=1`
- **Blast radius:** manager UI; reuses existing actions (no new mutation).
- **Gate:** PASS iff each quick-action invokes its action and destructive ones confirm.

#### MANAGER-F-01 residual — Full RBAC role-rejection matrix · BE/QA · P1 · deps: none
- **Given** 80 §11 landed only assertion-ordering + rotate double-click (`75` marks this **Partial**),
  **When** the full matrix is built, **Then** every mutation endpoint rejects owner/member/viewer/
  recipient roles per the access policy — each role × each mutation asserted.
- **Target source:** `src/lib/publication/actions.ts` (assertion ordering already present at the
  `requireCurrentUserContext()` gates, e.g. `:163`, `:240`, `:1386`) + route guards.
- **Target test:** `tests/vitest/project-publication-actions.test.ts` (extend to the full matrix).
- **Verify:** `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1`
- **Blast radius:** **`actions.ts` HOT FILE** — serialize (see [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md)). HIGH-BLAST → Codex review gate per [§5](#5-definition-of-done-shared-gate).
- **Gate:** PASS iff every role×mutation cell has an asserted reject/allow and the suite is green.

#### MANAGER-F-05 — Behavioral action tests (republish/rotate/loadActivity) · QA · P3 · deps: MANAGER-F-01 residual
- **Given** action tests are symbol-presence/smoke today, **When** behavioral contracts replace them,
  **Then** republish/rotate/loadActivity assert observable outcomes (rows written, tokens rotated,
  activity payload shape) not just symbol existence.
- **Target test:** `tests/vitest/project-publication-actions.test.ts`,
  `tests/vitest/project-publication-rotate-resend.test.ts`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-rotate-resend.test.ts --maxWorkers=1`
- **Blast radius:** test-only; depends on F-01 matrix shape.
- **Gate:** PASS iff each action asserts a behavioral outcome (no symbol-presence-only cases remain).

### WAVE 4 — Security / notification (HIGH BLAST RADIUS → 90 + Codex gate)

#### SEC-SHARE-05 — Unsubscribe POST CSRF/rate hardening · BE · P3 (Open-Deferred) · deps: **D5**
- **Given** `unsubscribe/route.ts:70` uses `assertSameOrigin` (allows absent Origin), with no CSRF
  pair and no rate limit, **When** D5 chooses to harden vs accept, **Then** (if harden) a missing
  Origin is rejected, a CSRF token pair is required, and the route is rate-limited — affecting only
  email-suppression for a known token.
- **Target source:** `src/app/api/share/[token]/unsubscribe/route.ts`.
- **Target test:** extend `tests/vitest/share-unsubscribe-interstitial.test.ts`.
- **Verify:** `bunx vitest run tests/vitest/share-unsubscribe-interstitial.test.ts --maxWorkers=1`
- **Blast radius:** unsubscribe route only; public surface → Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Gate (BLOCKED until D5):** PASS iff D5 = harden → all three controls asserted; D5 = accept → documented deferral, no code, no gate.

#### SEC-SHARE-06 — Owner digest fires from public recipient routes · BE · P3 · deps: **D9**
- **Given** `maybeTriggerSharedLinkActivityDigest` (`actions.ts:1526`) calls
  `requireCurrentUserContext()` (`:1532`) and returns `digest-auth-required` (`:1534`), swallowed on
  the public path, **When** D9 approves the fix, **Then** a public comment/decision triggers the
  owner digest via a service-role helper (no user-context requirement) without leaking recipient PII.
- **Target source:** `src/lib/publication/actions.ts` (new service-role digest helper) + the public
  comment/decision/activity trigger call sites.
- **Target test:** new digest-fires-from-public case in `tests/vitest/project-publication-activity.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`
- **Blast radius:** **`actions.ts` HOT FILE** — serialize with SEC-SHARE-08/MANAGER-F-01 (see [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md)). Service-role = HIGH-BLAST → Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Gate (BLOCKED until D9):** PASS iff a public write triggers a digest with no `digest-auth-required` and no PII leak.

#### SEC-SHARE-08 — Atomic revoke+insert in `createProjectPublication` · DB/BE · P3 · deps: **D8**
- **Given** the revoke-then-insert sequence (`actions.ts:553-554` revoke, `:688` "revoke + insert"
  comment, `:710` `revokeProjectPublication`) has a transient-failure window, **When** D8 selects the
  reconciliation/atomicity strategy, **Then** the operation is atomic (single transaction or the
  pending-review `AC-MOD-06_one_published_publication_per_project.sql` constraint enforces one live
  publication), with no window where zero or two live publications exist.
- **Target source:** `src/lib/publication/actions.ts` + migration promotion per [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Target test:** `tests/vitest/project-publication-one-published-index.test.ts` (extend) + the race in QA-G06's harness.
- **Verify:** `bunx vitest run tests/vitest/project-publication-one-published-index.test.ts --maxWorkers=1` then provider-apply proof per [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Blast radius:** **`actions.ts` HOT FILE + migration** — HIGH-BLAST → Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) (drift reconciliation via `migration repair --status applied`, NOT re-apply).
- **Gate (BLOCKED until D8):** PASS iff no zero/two-live-publication window AND provider-apply proof recorded per [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).

### WAVE 5 — Performance (measure-first)

#### PERF-01A — Eliminate render+session-POST+reload for recipient links · BE/FE · P2 · deps: **D2**
- **Given** recipient personalization needs render + client session POST + reload (session analytics
  already deferred via `after()`), **When** D2 resolves location-exposure (server-redirect flow needs
  the security call), **Then** a server cookie/redirect flow removes the client reload while keeping
  token-leakage protections, improving first personalized TTI.
- **Target source:** `src/app/share/[token]/page.tsx` + `session/route.ts` + initializer.
- **Target test:** extend `tests/vitest/project-publication-page.test.tsx` (no client reload path).
- **Verify:** `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1` + a measured TTI delta in `evidence/` (**UNVERIFIED baseline** — capture before/after).
- **Blast radius:** receiver entry flow; public surface → Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Gate (BLOCKED until D2):** PASS iff no client reload remains AND token-leakage review passes.

#### PERF-05 — Single secure RPC path for comment/decision · BE · P2 · deps: security review
- **Given** comment/decision repeat app-layer + RPC-layer publication/recipient lookups, **When** a
  single secure RPC path replaces the double validation **only after security review**, **Then** one
  round trip performs lookup+write with identical authz guarantees.
- **Target source:** `comment/route.ts`, `decision/route.ts`, RPC migration.
- **Target test:** `tests/vitest/project-publication-comments.test.tsx`, `...-decision.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx --maxWorkers=1`
- **Blast radius:** HIGH (authz on public writes) → mandatory Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Gate:** PASS iff authz parity proven AND security review signs off (do NOT collapse before review).

#### PERF-06 — Snapshot-byte budget (measure first) · DB/BE · P2 · deps: none
- **Given** snapshot JSON duplicates row data and grows O(n), **When** snapshot bytes + publish
  duration are measured for a large package, **Then** a byte-size budget is recorded in `evidence/`;
  a normalized-snapshot redesign is scheduled **only if** the budget is breached.
- **Target:** measurement script + `evidence/` record (no redesign yet).
- **Verify:** measure (**UNVERIFIED tool** — confirm/author a `scripts/measure-snapshot-bytes.mjs`; until then item is measure-Open).
- **Blast radius:** none (measurement-only) until a redesign is greenlit.
- **Gate:** PASS iff a byte budget + current p95 are recorded; redesign deferred unless breached.

#### PERF-09 — Password-unlock latency (measure first; don't weaken hashing) · BE · P3 · deps: none
- **Given** scrypt + synchronous writes add unlock latency, **When** latency is measured, **Then** a
  number is recorded in `evidence/`; tuning happens **only if** budget-breached and **never** weakens
  the hashing parameters.
- **Verify:** measure unlock latency (**UNVERIFIED harness** — note baseline command in `evidence/`).
- **Blast radius:** none until tuning greenlit; security-sensitive (hashing).
- **Gate:** PASS iff latency recorded AND hashing parameters unchanged.

#### PERF-12 — Rotate cost O(recipient count) (measure first) · BE · P3 · deps: none
- **Given** rotate is O(recipient count), **When** rotate cost is measured at representative
  recipient counts, **Then** a number is recorded; the credential-version model stays a scale backlog
  item unless the measurement shows a beta-blocking cost.
- **Verify:** measure rotate duration vs recipient count (**UNVERIFIED harness**).
- **Blast radius:** none until model change greenlit.
- **Gate:** PASS iff cost-vs-N recorded; model change deferred unless breached.

### WAVE 6 — Spec / architecture

#### SHF-01 — Realtime owner activity feed vs ratify focus-refresh · FE/BE · P2 · deps: **D7**
- **Given** `SharedLinkActivityFeed.tsx:81-95,175` refreshes on focus/visibility only (no
  WebSocket/polling/SSE/Supabase-realtime — **source-verified**, distinct from the Fixed RUX-10),
  **When** D7 decides, **Then** EITHER realtime updates land (new activity appears without manual
  refresh) OR the focus-refresh behavior is ratified as intended V2 and documented (no code).
- **Target source:** `src/components/share/SharedLinkActivityFeed.tsx` (+ realtime channel if chosen).
- **Target test:** new realtime-update test (if implemented) under `tests/vitest/`.
- **Verify (if implemented):** `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`
- **Blast radius:** owner feed only; realtime adds a subscription channel (review for auth/RLS).
- **Gate (BLOCKED until D7):** PASS iff D7=realtime → live-update test green; D7=ratify → documented decision, no code.

---

## 4. Owner-decision block

Each Open item blocked on a [`71`](71_OPEN_DECISIONS_REGISTER.md) decision. **No blocked item may
start coding until its decision lands.** (Decisions also affect doc remediation, omitted here.)

| Decision | Question (abbrev.) | Unblocks item(s) |
|---|---|---|
| **D1** | Content-only republish forces recipient reload? | SEC-SHARE-01 already-Fixed posture; informs MANAGER-F-03 copy. (No Open coding item gated solely on D1.) |
| **D2** | Expose exact `project.location` to recipients? (`SharePageProposalHeader.tsx:11`) | **PERF-01A** (server-redirect flow) |
| **D3** | Expose `clientName`/totals/public IDs publicly? (incl. OpenGraph unfurl) | **SEC-SHARE-10** (suppress/genericize the OG `description` total+clientName leak; AC-PRIV-01 in [`13`](13_DATA_PRIVACY_DISCLOSURE_DECISION.md)) |
| **D4** | In-memory vs durable digest/rate-limit throttle for beta? | Posture for SEC-SHARE-06 / SHF-03 durability (informs, not blocks) |
| **D5** | Cross-origin/absent-Origin unsubscribe: harden vs accept? | **SEC-SHARE-05** |
| **D6** | Floating-nav rail vs single-column canonical? | SHF-02 (deferral, not a coding item here) |
| **D7** | Realtime activity vs focus-refresh? | **SHF-01** |
| **D8** | Pending-review migration reconciliation + atomicity strategy? | **SEC-SHARE-08** |
| **D9** | Fix SEC-SHARE-06 digest now vs beta backlog? | **SEC-SHARE-06** |
| **D10** | Manager-read RLS on `project_publication_events` as release gate? | (gates the `AC-MOD-T4-P3` migration promotion in [`90`]; not a code item here) |
| **D11** | Recipient e-signature on decision (vs typed-name acceptance)? (from [`25`](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)) | (scope/UX decision; no Open coding item in this plan until ratified) |

Items with **no decision dependency** (start anytime): QA-G01..G10, RUX-11/12/13/14,
MANAGER-F-01/F-03/F-04/F-05/F-06, PERF-05 (security-review-gated, not owner-decision-gated),
PERF-06/09/12 (measurement-gated).

---

## 5. Definition of Done (shared gate)

An item is **DONE** only when ALL apply (binary):

1. **Acceptance criteria pass** — the item's Given/When/Then holds (evidence captured).
2. **Targeted vitest green** — the item's exact verification command passes with `--maxWorkers=1`.
3. **Type-check green** — `bun run type-check` passes for any source-touching item.
4. **DB/security provider-apply proof** — for DB-touching or security-surface items
   (SEC-SHARE-05/06/08, PERF-01A/05, SHF-01-if-realtime), the provider apply/drift proof is recorded
   per [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) (`migration repair --status applied <version>`,
   never blind re-apply; two duplicate-named pairs flagged there).
5. **Codex review pass** — for HIGH-BLAST-RADIUS items (DB/RLS/RPC/migrations, auth/security/public
   writes, cross-cutting `actions.ts` edits), a passing `/codex:review` is required before stop, per
   CLAUDE.md's MVP-scoped review gate. Ordinary reversible items (test-only, receiver visual polish)
   may skip the round-trip.
6. **Registry bound** — the item's status is updated in [`75`](75_FINDING_ID_REGISTRY.md) (Open →
   Fixed/Partial/Deferred) by the registry owner; this plan does not self-mark.

**Pack-level stop condition:** all non-decision-gated items DONE; every decision-gated item either
DONE (decision landed + executed) or explicitly Deferred with rationale in
[`71`](71_OPEN_DECISIONS_REGISTER.md); final verdict recorded in
[`99`](99_QUALITY_SCORECARD_AND_SIGNOFF.md). Per [`75`:134](75_FINDING_ID_REGISTRY.md), no P1
*source-fix* finding is open today — the P1 surface here is **test-rigor** (QA-G03..G08) plus the
SHF-01 question, so "ready" stays conditional until this plan's Wave 1 + the D7 call land.

---

## 6. Reconciliation note: PERF-01 vs PERF-01A

(Distinct from [§2](#2-reconciliation-of-40s-gaps-to-canonical-qa-g01g10), which reconciles 40's QA
gaps to canonical ids; this note reconciles the PERF-01 / PERF-01A id mismatch only.)

[`70`:53](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) and [`50`](50_PERFORMANCE_SPEED_AUDIT.md) use
`PERF-01`; the canonical id is **PERF-01A** ([`75`:89](75_FINDING_ID_REGISTRY.md)). This plan tracks
**PERF-01A** only. Likewise [`70`:17](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) lists PERF-01A as
"Fixed" for the **analytics-deferral** sub-fix; the **render+POST+reload elimination** is the
**Open** residual tracked in §3 (Wave 5, the PERF-01A entry) above — no contradiction with 75
(75 marks PERF-01A **Open** for the residual). The deferral landing is recorded in
[`80`](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md).
