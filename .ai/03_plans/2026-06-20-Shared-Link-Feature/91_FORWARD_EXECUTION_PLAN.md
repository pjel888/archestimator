# 91 — Forward Execution Plan (Sequenced DAG + Acceptance Criteria)

Date: 2026-06-21 · Status: **RUNBOOK-READY BACKLOG; D1-D11 owner decisions resolved; deploy/harness gates still required.** Converts the backward-looking
consolidated backlog into a dependency-ordered, lane-assigned, acceptance-criteria-bearing plan an
executor can run after the ratified decisions and evidence gates are satisfied. **Every ID, severity, and status below is bound to
[`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md); if this doc disagrees with 75, 75 wins.**

Scope = the **Open** / **Partial** rows in [`75` §8 roll-up](75_FINDING_ID_REGISTRY.md):
SEC-SHARE-05, SEC-SHARE-08;
QA-G06 provider proof, QA-G10; PERF-01A, 05, 09, 12; SHF-01. RUX-12, QA-G07, and PERF-06 are fixed locally but retained below as completed checkpoints. The **Decision**-status rows
(SEC-SHARE-07, SHF-02/03) are now governed by ratified owner calls below. SEC-SHARE-06 and SEC-SHARE-10 are now code-fixed; D9/D3 remain broader implementation/signoff surfaces. Formerly decision-gated
items (D1-D11) are now eligible for implementation — see
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

### 0.1 Required evidence helper contracts

These helper surfaces make the open QA/performance/visual gates executable. If the named script does not
exist when the item starts, author it exactly to this contract first, then run the listed command.

| Helper | Owner item(s) | Contract | Required output |
|---|---|---|---|
| `scripts/smoke-share-headers.mjs` | QA-G10 | Accept `SHARE_URL`; issue `HEAD` then fallback `GET --headers-only`; assert `content-security-policy`, `cache-control: no-store`, and frame policy per the current route contract. | Markdown + JSON under `evidence/shared-link-smoke/headers-<date>.{md,json}` with URL redacted to origin + path shape, status, headers, PASS/FAIL. |
| `scripts/seed-shared-link-smoke.ts` | QA-G10 | For local/dev-auth environments only, create or select a no-password published share link and print `SHARE_URL=<url>`. If required env is missing, exit non-zero with the missing keys. | `.ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-smoke/url.env` containing only `SHARE_URL=`; no tokens committed outside ignored evidence. |
| `scripts/measure-shared-link-perf-budgets.ts` | PERF-01A, PERF-06, PERF-09, PERF-12 | Accept `--mode recipient-session-tti\|snapshot-bytes\|password-unlock\|rotate-cost`, `--rows`, `--samples`, and `--out`. Use fixture data for local modes and hosted `SHARE_URL` only for route TTI. | `evidence/perf-budgets.md` table columns: date, git SHA, env, fixture, mode, rows/N, samples, p50, p95, budget, PASS/FAIL. |
| `scripts/measure-share-hero-contrast.mjs` | RUX-14 / QA-G10 visual | Accept `--storybook-url`, `--story`, `--selector`, `--out`; sample rendered pixels behind the label and compute WCAG contrast. Requires bitmap fixtures from [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) §4. | `evidence/shared-link-v2/contrast-hero-light.json` with fixture, viewport, sampled color(s), text color, contrast ratio, PASS/FAIL. |

**Storybook command is verified in `package.json`:** use `bun run storybook:validate` for the full local
Storybook gate, or `bun run build-storybook -- --output-dir /tmp/archestimator-storybook-shared-link-v2`
for the build-only gate.

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
  RUX-12 (stale test comments / docs-only) ◄── Fixed locally
  D1..D11 owner calls  ───────────────────────────────► unblock gated waves

WAVE 1 — test-rigor hardening on already-Fixed surfaces (no source change)
  QA-G03 (DOM escaping)      ◄── Fixed locally
  QA-G04 (session init)      ◄── Fixed locally
  QA-G05 (circuit breaker)   ◄── Fixed locally
  QA-G07 (tampered 409 + offline queue flush) ◄── Fixed locally
  QA-G08 (comments-after-decision) ◄── Fixed locally
  QA-G09 (tighten permissive status arrays) ◄── Fixed locally
  QA-G06 (durable duplicate-decision DB race) ◄── harness added; needs provider/local-Supabase proof (see 90)

WAVE 2 — receiver V2 UX redesign (FE, client-facing, visual-QA gated)
  RUX-13 (proposalPaper utility + lint guard) ──► Fixed locally
  RUX-14 (cover scrim AA)   ◄── source fixed; visual evidence still in 85
  RUX-11 (Storybook receiver matrix) ◄── Fixed locally; visual fixture/browser coverage remains QA-G10/RUX-14
                                          (spec in 85)

WAVE 3 — manager workflow (FE + BE)
  MANAGER-F-03 (invalid-link copy parity) ◄── Fixed locally
  MANAGER-F-04 (per-recipient partial-send retry) ◄── Fixed locally
  MANAGER-F-06 (dashboard quick-actions) ◄── Fixed locally
  MANAGER-F-01 (full RBAC matrix) ◄── Fixed locally
  MANAGER-F-05 (behavioral republish/rotate/loadActivity tests) ◄── Fixed locally

WAVE 4 — security/notification (BE/DB, HIGH BLAST RADIUS → 90 + Codex gate)
  D5 ─► SEC-SHARE-05 (unsubscribe/session DELETE CSRF/rate hardening) [ratified do-now]
  D9 ─► SEC-SHARE-06 beta posture / digest log / delivery evidence    [code fixed + hardening open]
  D8 ─► SEC-SHARE-08 (atomic revoke+insert)  ── shares actions.ts with fixed MANAGER-F-01 coverage
                                                  → serialize against Wave 3 (see 72)

WAVE 5 — performance (measure-first; mostly gated on a measurement, not a decision)
  PERF-01A ◄── D2 ratified (location_visibility first; then token-leakage review)
  PERF-05  ◄── "one-RPC path only after security review" → Codex review gate + 90
  PERF-06  ── fixed locally: compact v1.3 rowIds; keep byte histogram green
  PERF-09  ── measure scrypt+sync-write latency FIRST (evidence/) ──► tune only if budget breached
  PERF-12  ── measure rotate cost FIRST ──► credential-version model is scale backlog

WAVE 6 — spec/architecture decision
  D7 ─► SHF-01 (focus-refresh ratified for beta; GA realtime backlog)
```

**Conflict-risk hot files (authoritative list in [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md)):**
`src/lib/publication/actions.ts` (SEC-SHARE-08; MANAGER-F-01, SEC-SHARE-06, and MANAGER-F-05 already fixed here) — **serialize**;
`src/app/api/share/[token]/activity/route.ts` (QA-G09);
`tests/vitest/project-publication-activity.test.tsx` (QA-G09, SEC-SHARE-06 regression);
`tests/vitest/project-publication-comments.test.tsx` (QA-G05/07 plus fixed QA-G03/08/09 regression coverage);
`src/components/share/SharePageDecision.tsx` (RUX-13 plus fixed QA-G08 regression coverage).

---

## 2. Reconciliation of 40's gaps to canonical QA-G01..G10

[`40`](40_TEST_QA_ULTRAQA_MATRIX.md) surfaced QA gaps without first-class ids; [`75` §4](75_FINDING_ID_REGISTRY.md)
assigned them. This plan executes the canonical ids only:

| Canonical id | 40 origin | 75 status | This plan's action |
|---|---|---|---|
| QA-G01 | "comment sanitizer weak/not asserted to RPC" (40 §1 note, 40:50) | **Stale-invalid** | **Retire.** Test already asserts payload at `project-publication-comments.test.tsx:259-278`. No new test; adjacent QA-G09 exact-status tightening is already Fixed. |
| QA-G02 | "decision note not server-sanitized/truncated" (40 P0) | **Stale-invalid → Fixed** | **Convert to regression test (P2).** Already done at `decision/route.ts:145`. |
| QA-G03 | real DOM-escaping render gap (40:57) | **Fixed** P1 | `tests/vitest/share/recipient-content-escaping.test.tsx` landed. |
| QA-G04 | session-init integration gap (40:49) | **Fixed** P1 | `share-recipient-session-initializer.test.tsx` covers POST, CSRF, cookie, and sanitized URL. |
| QA-G05 | circuit-breaker route gap (40:58) | **Fixed** P1 | Exact 503 + `Retry-After: 120` route test landed. |
| QA-G06 | durable duplicate-decision race (40:51) | **Partial** P1 | Provider-backed race harness added; needs local-Supabase/provider execution, see [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md). |
| QA-G07 | offline queue + tampered viewToken (40:58) | **Fixed** P1 | Tampered comment/decision 409 tests landed; offline queue flush now asserts sessionStorage persistence, reconnect flush, queue clearing, posted body/viewToken, and fresh CSRF headers. |
| QA-G08 | comments-after-decision (40:52) | **Fixed** P1 | Real decision lock + follow-up comment behavior landed in `project-publication-decision.test.tsx`. |
| QA-G09 | permissive status arrays (40 §1 note, current verifier re-anchor) | **Fixed** P2 | Broad status arrays were tightened to exact status/payload expectations. |
| QA-G10 | live header smoke + visual proof (40:59-60) | **Open** P2 | Header smoke/seed helpers landed; live SHARE_URL execution + visual matrix remain deferred to [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md). |

---

## 3. Per-item execution entries

Each entry: **lane · severity (bound to 75) · upstream deps · Given/When/Then acceptance ·
target source · target test · verification command · blast radius.** Severities are P0–P3 only.

### WAVE 0 — Retire stale / docs-only

#### QA-G01 — Retire stale-invalid sanitizer-weakness claim · QA · P-N/A (Stale-invalid) · deps: none
- **Given** `project-publication-comments.test.tsx:259-278` already asserts the inserted body
  excludes `<script>/<img>/<b>/onerror`, includes `bold`, length ≤1000, **When** the QA backlog is
  reconciled, **Then** QA-G01 is removed from the active worklist with a one-line pointer to that
  assertion and to the now-Fixed QA-G09 exact-status tightening.
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

#### RUX-12 — Fix stale test comments + portal type exemption note · FE/QA · P3 · deps: none · **Fixed 2026-06-21**
- **Given** comments in `project-publication-page.test.tsx` referenced `text-[10/9/11px]` against a
  surface rendering `13px`, **When** the comments were corrected, **Then** the test now asserts the
  rendered `text-[13px]` class and documents the path-scoped `/share` Client Portal type-scale
  exemption in-line.
- **Target test:** `tests/vitest/project-publication-page.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1`
- **Blast radius:** test assertion/comment-only; no product source changes.
- **Gate:** PASS iff suite green AND no stale px references remain in the touched comments.
  **Status:** PASS — stale `text-[10px]`/`[9px]`/`[11px]` language was removed from the estimate-tab test.

### WAVE 1 — Test-rigor hardening (no source change to already-Fixed surfaces)

#### QA-G03 — Real DOM-escaping render test · QA · P1 · deps: none · **Fixed 2026-06-21**
- **Given** comment/decision/activity render recipient text as React text nodes
  (`SharePageComments.tsx:350-358`, `SharePageDecision.tsx:247-249`, `SharedLinkActivityFeed.tsx:145-148`),
  **When** a recipient submits `<img src=x onerror=alert(1)>`, **Then** the rendered DOM contains
  the literal escaped string and **no** `img` element / no executed handler.
- **Target test (NEW):** `tests/vitest/share/recipient-content-escaping.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/share/recipient-content-escaping.test.tsx --maxWorkers=1`
- **Blast radius:** test-only; complements the static `share/no-dangerous-html.test.ts` guard.
- **Gate:** PASS iff the rendered query finds the escaped literal and `queryByRole('img')` is null.
  **Status:** PASS — `tests/vitest/share/recipient-content-escaping.test.tsx` landed.

#### QA-G04 — Recipient-session init redirect/cookie integration test · QA · P1 · deps: none · **Fixed 2026-06-21**
- **Given** `SharePageRecipientSessionInitializer.tsx` posts to `/session` then `replace`s the URL,
  **When** the initializer mounts with a recipient token, **Then** the test asserts the POST fires,
  a `Set-Cookie` HttpOnly session cookie is returned, `router.replace` is called, and the sanitized
  URL no longer contains the raw token.
- **Target test:** `tests/vitest/share-recipient-session-initializer.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/share-recipient-session-initializer.test.tsx --maxWorkers=1`
- **Blast radius:** test-only.
- **Gate:** PASS iff all four assertions (POST, Set-Cookie, replace, sanitized URL) hold.
  **Status:** PASS — implemented in the existing initializer suite.

#### QA-G05 — Comment circuit-breaker route test · QA · P1 · deps: none
- **Given** the comment route opens a circuit breaker (`comment/route.ts:19-59,269-276`), **When**
  >50% of recent attempts return 5xx, **Then** the route returns `503` with `Retry-After: 120`.
- **Target test (NEW or extend):** `tests/vitest/project-publication-comments.test.tsx`
  (circuit-open case). **HOT FILE** — see [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md); coordinate with QA-G07.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx --maxWorkers=1`
- **Blast radius:** test-only, shared file.
- **Gate:** PASS iff the open-circuit response is `503` + `Retry-After: 120`.

#### QA-G06 — Durable duplicate-decision DB race · QA · P1 · deps: provider/local-Supabase harness
- **Given** two concurrent decision POSTs for the same recipient/snapshot, **When** both race against
  the DB uniqueness/RPC, **Then** exactly one persists and the other returns `409` — proven against a
  **real** provider/local Supabase, not mocks.
- **Target test:** `tests/vitest/share/duplicate-decision-race.provider.test.ts` (gated behind
  `SUPABASE_DB_URL`). **Harness is present; real DB execution remains UNVERIFIED.**
- **Verify (local harness):**
  ```bash
  supabase start
  pg_isready -h 127.0.0.1 -p 54322
  SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
    bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1
  ```
- **Verify (linked-provider alternative):** run only after [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) §1.4-§1.8 snapshots are captured; set `SUPABASE_DB_URL` to the provider connection string in the local shell (never commit it) and run the same test command. Capture PASS/FAIL in `evidence/provider-race/duplicate-decision-race.md`.
- **Evidence file:** `evidence/provider-race/duplicate-decision-race.md` records harness behavior and the
  local Docker/Supabase blocker.
- **Blast radius:** test-only; requires DB harness.
- **Gate:** PASS iff exactly-one-persists + one-409 under real concurrency. Until the gated test passes
  against local Supabase or the linked provider, item stays **Partial/UNVERIFIED** (do not claim Fixed).

#### QA-G07 — Offline queue flush + tampered-viewToken 409 · QA · P1 · **Fixed 2026-06-21**
- **Given** the client offline queue (`SharePageComments.tsx:57-216`) and route view-token locking,
  **When** the queue flushes after reconnect AND when a `comment`/`decision` POST carries
  `viewToken:"tampered"`, **Then** queued items flush in order and the tampered POST returns `409`.
- **Target test:** `tests/vitest/project-publication-comments.test.tsx` +
  `tests/vitest/project-publication-decision.test.tsx`. **HOT FILE** (comments) — coordinate with QA-G05.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx --maxWorkers=1`
- **Blast radius:** test-only.
- **Gate:** PASS — offline queue persistence/reconnect/clear/CSRF assertions passed in `project-publication-comments.test.tsx`; tampered viewToken 409 coverage remains green.

#### QA-G08 — Comments-after-decision behavioral test · QA · P1 · deps: none · **Fixed 2026-06-21**
- **Given** spec P7 ("post-decision comments allowed") and `SharePageDecision.tsx:249` copy, **When**
  a recipient submits a final decision then a comment in the same session, **Then** the comment POST
  succeeds (not blocked by the decision lock).
- **Target test:** `tests/vitest/project-publication-decision.test.tsx` (same-session
  decision lock plus `SharePageComments` follow-up case).
- **Verify:** `bunx vitest run tests/vitest/project-publication-decision.test.tsx --maxWorkers=1`
- **Blast radius:** test-only.
- **Gate:** PASS iff a comment after a decision returns success in one session.
  **Status:** PASS — test drives the decision component to locked state and then posts a comment.

#### QA-G09 — Tighten permissive status arrays · QA · P2 · deps: none · **Fixed 2026-06-21**
- **Given** tests accept broad status sets (`comments:287`, `activity:484`, `activity:491`, `activity:657`),
  **When** they are tightened, **Then** each asserts the exact expected status for its case.
- **Target test:** `tests/vitest/project-publication-comments.test.tsx`,
  `tests/vitest/project-publication-activity.test.tsx`. **HOT FILES** — coordinate with SEC-SHARE-06 regression + QA-G05/07/08.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`
- **Blast radius:** test-only; tightening may surface latent status drift (intended).
- **Gate:** PASS iff no remaining broad status array AND both suites green.
  **Status:** PASS — exact expectations landed and a status-array grep is clean.

#### QA-G10 — Live security-header smoke + visual proof · QA/UX · P2 · deps: none
- **Given** CSP/security headers apply to `/share` pages, **When** a header smoke runs against a
  served instance, **Then** required headers (CSP, no-store, X-Frame/Frame-Options per current
  policy) are present; mobile/print visual proof is deferred to [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Target:** `scripts/smoke-share-headers.mjs` + `scripts/seed-shared-link-smoke.ts` per §0.1; visual matrix in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Verify:**
  ```bash
  bun scripts/seed-shared-link-smoke.ts > .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-smoke/url.env
  set -a
  . .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-smoke/url.env
  set +a
  SHARE_URL="$SHARE_URL" bun scripts/smoke-share-headers.mjs
  ```
  If using a hosted/provider link instead of local seed, create the same `url.env` manually from a known-published no-password link and keep the file in ignored evidence.
- **Blast radius:** none (read-only smoke).
- **Gate:** PASS iff all required headers present AND visual matrix signed off in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
  **Status:** PARTIAL — `scripts/smoke-share-headers.mjs` and `scripts/seed-shared-link-smoke.ts`
  landed with unit tests; no live `SHARE_URL` smoke or visual matrix has run yet.

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

#### RUX-11 — Storybook receiver state matrix (real routes/session/comments/password) · FE · P2 · deps: RUX-13 · **Fixed 2026-06-21**
- **Given** receiver stories previously were fixture-only, **When** integrated stories mock the real
  routes/session/comments/password states, **Then** designers can inspect the full state matrix
  spec'd in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- **Target source:** `src/stories/domain/share/receiver-states.stories.tsx` + `scripts/check-storybook-component-coverage.mjs`.
- **Verify:** `node scripts/check-storybook-component-coverage.mjs` + `bunx vitest run tests/vitest/storybook-component-coverage.test.ts tests/vitest/storybook-provider-boundary.test.ts --maxWorkers=1` + `bun run type-check`
- **Blast radius:** stories-only; depends on RUX-13's `bg-proposalPaper` for visual fidelity.
- **Gate:** PASS iff every state in [`85`](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md)'s matrix has a real-component story and provider/route boundaries stay mocked.
  **Status:** PASS for source/story coverage; browser visual review remains QA-G10/RUX-14.

### WAVE 3 — Manager workflow

#### MANAGER-F-03 — Invalid-link error-copy parity (page vs API) · FE/BE · P2 · deps: none · **Fixed 2026-06-21**
- **Given** the page and API emitted inconsistent invalid-link copy, **When** copy was unified, **Then**
  a recipient hitting an unknown/revoked/expired link sees the same branded message on both the
  page (`share/[token]/not-found.tsx`) and share API 404 envelopes.
- **Target source:** `src/lib/publication/share-copy.ts`, `src/app/share/[token]/not-found.tsx`,
  public share API 404 paths.
- **Target test:** `tests/vitest/project-publication-route.test.ts` + `tests/vitest/share-no-store-invariants.test.ts`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-page.test.tsx --maxWorkers=1`
- **Blast radius:** receiver error surfaces.
- **Single source:** `src/lib/publication/share-copy.ts` exports
  `SHARED_LINK_UNAVAILABLE_COPY = { title: "This shared proposal is unavailable", body: "Ask the sender for a fresh link." }`.
  `not-found.tsx` and API error envelopes import this object; tests assert identity against the export, not duplicated literals.
- **Gate:** PASS iff page + API copy strings import and match `SHARED_LINK_UNAVAILABLE_COPY`.
  **Status:** PASS — route/page/no-store tests passed in the targeted 6-file suite.

#### MANAGER-F-04 — Per-recipient partial-send failure surface + retry · FE · P2 · deps: UX spec in 35 · **Fixed 2026-06-21**
- **Given** `RecipientEmailComposer.tsx:163-207` sends to multiple recipients, **When** a subset
  fails, **Then** each failed recipient is surfaced with a retry affordance and successes are not
  re-sent (per the UX spec in [`35`](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md)).
- **Target source:** `src/components/workshop/publication/RecipientEmailComposer.tsx`.
- **Target test:** `tests/vitest/recipient-email-composer.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/recipient-email-composer.test.tsx --maxWorkers=1`
- **Blast radius:** manager modal UI; no server action rewrite needed for this retry-surface closure.
- **Gate:** PASS iff partial-failure rows render + retry re-sends only failures.
  **Status:** PASS — partial-failure test preserves the sent recipient and retries the failed recipient only.

#### MANAGER-F-06 — Dashboard quick-actions (copy/rotate/revoke) · FE · P3 · **Fixed 2026-06-21**
- **Given** no dashboard quick-actions existed, **When** copy/preview/rotate/revoke were added to published dashboard rows, **Then** each
  manager action is keyboard reachable, uses tooltip semantics, and destructive actions confirm before mutation; viewer rows expose copy/preview only.
- **Target source:** `src/components/workshop/dashboard/PublishedProjectQuickActions.tsx` + `src/components/workshop/dashboard/WorkshopDashboard.tsx`; rotate/revoke reuse existing publication server actions with no new mutation primitive.
- **Target test:** `tests/vitest/workshop-reset.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/workshop-reset.test.tsx tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx --maxWorkers=1`
- **Blast radius:** manager UI; reuses existing actions (no new mutation).
- **Gate:** PASS — 3 files / 107 tests passed, `ok:false` action results render as errors without refresh, and `bun run type-check` passed.

#### MANAGER-F-01 — Full RBAC role-rejection matrix · BE/QA · P1 · **Fixed 2026-06-21**
- **Given** the prior implementation only had assertion-ordering smoke, **When** every publication
  mutation is invoked by signed-in no-access, workspace member, project member, project viewer, and
  public/recipient-token visitor actors, **Then** each rejects and produces zero write/RPC/revalidate
  side effects.
- **Target source:** `src/lib/publication/actions.ts` (`roleRank` now includes `member`; shared
  `assertProjectPublicationManager` remains the mutation gate).
- **Target test:** `tests/vitest/project-publication-actions.test.ts`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1`
- **Blast radius:** **`actions.ts` HOT FILE** — preserve coverage before further SEC-SHARE-08 edits.
- **Gate:** PASS — latest focused run passed 1 file / 25 tests; canonical shared-link suite passed 23 files / 353 tests.

#### MANAGER-F-05 — Behavioral action tests (republish/rotate/loadActivity) · QA · P3 · **Fixed 2026-06-21**
- **Given** action tests were symbol-presence/smoke, **When** behavioral contracts were added,
  **Then** republish/rotate/loadActivity assert observable outcomes (rows written, tokens rotated,
  activity payload shape) not just symbol existence.
- **Target test:** `tests/vitest/project-publication-actions.test.ts`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1`
- **Blast radius:** test-only; no production source changed.
- **Gate:** PASS — latest focused run passed 1 file / 24 tests, covering republish success/invalid-password failure, rotate success/stale-token conflict, and activity-load success/inactive-token error.

### WAVE 4 — Security / notification (HIGH BLAST RADIUS → 90 + Codex gate)

#### SEC-SHARE-05 — Unsubscribe/session DELETE CSRF/rate hardening · BE · P3 (Open) · deps: **D5 ratified**
- **Given** `unsubscribe/route.ts:70` uses `assertSameOrigin` (allows absent Origin), with no CSRF
  pair and no rate limit, and `session/route.ts` DELETE lacks the public same-origin guard, **When** the
  ratified D5 hardening lands, **Then** missing Origin is rejected where appropriate, an unsubscribe CSRF
  token pair is required, and the unsubscribe route is rate-limited — affecting only email-suppression
  for a known token plus session cleanup.
- **Target source:** `src/app/api/share/[token]/unsubscribe/route.ts`, `src/app/api/share/[token]/session/route.ts`, `src/lib/publication/security.ts`.
- **Target test:** extend `tests/vitest/share-unsubscribe-interstitial.test.ts`.
- **Verify:** `bunx vitest run tests/vitest/share-unsubscribe-interstitial.test.ts --maxWorkers=1`
- **Blast radius:** unsubscribe route only; public surface → Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Gate:** PASS iff stricter origin, CSRF nonce, and rate limit controls are asserted.

#### SEC-SHARE-06 — Owner digest fires from public recipient routes · BE · P3 · **Fixed; D9 signoff remains**
- **Given** the prior implementation returned `digest-auth-required` from public recipient routes, **When** a public
  comment/decision is posted now, **Then** the digest helper resolves publication/owner context through service-role
  data and triggers the owner digest without a browser user context or recipient PII leak.
- **Target source:** `src/lib/publication/actions.ts` (new service-role digest helper) + the public
  comment/decision/activity trigger call sites.
- **Target test:** new digest-fires-from-public case in `tests/vitest/project-publication-activity.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`
- **Blast radius:** **`actions.ts` HOT FILE** — serialize with SEC-SHARE-08 and preserve MANAGER-F-01 coverage (see [`72`](72_BLAST_RADIUS_DEPENDENCY_MAP.md)). Service-role = HIGH-BLAST → Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Gate:** PASS locally; a public write triggers a digest with no `digest-auth-required`. D9 remains for beta acceptance/delivery evidence, not for the code fix.

#### SEC-SHARE-08 — Atomic revoke+insert in `createProjectPublication` · DB/BE · P3 · deps: **D8 ratified**
- **Given** the revoke-then-insert sequence (`actions.ts:553-554` revoke, `:688` "revoke + insert"
  comment, `:710` `revokeProjectPublication`) has a transient-failure window, **When** the ratified D8
  reconciliation/atomicity strategy runs, **Then** the operation is atomic (single transaction or the
  pending-review `AC-MOD-06_one_published_publication_per_project.sql` constraint enforces one live
  publication), with no window where zero or two live publications exist.
- **Target source:** `src/lib/publication/actions.ts` + migration promotion per [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Target test:** `tests/vitest/project-publication-one-published-index.test.ts` (extend) + the race in QA-G06's harness.
- **Verify:** `bunx vitest run tests/vitest/project-publication-one-published-index.test.ts --maxWorkers=1` then provider-apply proof per [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Blast radius:** **`actions.ts` HOT FILE + migration** — HIGH-BLAST → Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) (drift reconciliation via `migration repair --status applied`, NOT re-apply).
- **Gate:** PASS iff no zero/two-live-publication window AND provider-apply/ledger proof recorded per [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).

### WAVE 5 — Performance (measure-first)

#### PERF-01A — Eliminate render+session-POST+reload for recipient links · BE/FE · P2 · deps: **D2 ratified**
- **Given** recipient personalization needs render + client session POST + reload (session analytics
  already deferred via `after()`), **When** D2's `location_visibility` model and token-leakage review are in
  place, **Then** a server cookie/redirect flow removes the client reload while keeping
  token-leakage protections, improving first personalized TTI.
- **Target source:** `src/app/share/[token]/page.tsx` + `session/route.ts` + initializer.
- **Target test:** extend `tests/vitest/project-publication-page.test.tsx` (no client reload path).
- **Verify:**
  ```bash
  bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1
  bun scripts/measure-shared-link-perf-budgets.ts \
    --mode recipient-session-tti \
    --samples 20 \
    --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md
  ```
- **Blast radius:** receiver entry flow; public surface → Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Gate:** PASS iff no client reload remains AND token-leakage review passes.

#### PERF-05 — Single secure RPC path for comment/decision · BE · P2 · deps: security review
- **Given** comment/decision repeat app-layer + RPC-layer publication/recipient lookups, **When** a
  single secure RPC path replaces the double validation **only after security review**, **Then** one
  round trip performs lookup+write with identical authz guarantees.
- **Target source:** `comment/route.ts`, `decision/route.ts`, RPC migration.
- **Target test:** `tests/vitest/project-publication-comments.test.tsx`, `...-decision.test.tsx`.
- **Verify:** `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx --maxWorkers=1`
- **Blast radius:** HIGH (authz on public writes) → mandatory Codex review gate + [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md).
- **Gate:** PASS iff authz parity proven AND security review signs off (do NOT collapse before review).

#### PERF-06 — Snapshot-byte budget · DB/BE · P2 · deps: none
- **Given** snapshot JSON used to duplicate row data at estimate and tab levels, **When** tabbed snapshots are built, **Then** compact schema v1.3 stores tab membership as `rowIds` while preserving estimate-level rows and legacy v1.2 `tab.rows` reads.
- **Current evidence (2026-06-21):** compact v1.3 landed with `evidence/perf-budgets.md` updated. Local synthetic tabbed snapshot bytes: 100 rows 29.7 KiB PASS, 1k rows 263.1 KiB PASS, 10k rows 2.55 MiB **PASS** vs 4 MiB.
- **Target:** keep compact v1.3 writes plus legacy v1.2 read support.
- **Verify:**
  ```bash
  bun scripts/measure-shared-link-perf-budgets.ts \
    --mode snapshot-bytes \
    --rows 100,1000,10000 \
    --samples 5 \
    --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md
  ```
- **Blast radius:** medium (snapshot producer + public renderer compatibility).
- **Gate:** PASS iff rerun byte histogram is at or below budget and v1.2/v1.3 snapshot tests pass. Current gate: **PASS locally**.

#### PERF-09 — Password-unlock latency (measure first; don't weaken hashing) · BE · P3 · deps: none
- **Given** scrypt + synchronous writes add unlock latency, **When** latency is measured, **Then** a
  number is recorded in `evidence/`; tuning happens **only if** budget-breached and **never** weakens
  the hashing parameters.
- **Verify:**
  ```bash
  bun scripts/measure-shared-link-perf-budgets.ts \
    --mode password-unlock \
    --rows 500,2500,10000 \
    --samples 20 \
    --append \
    --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md
  ```
- **Blast radius:** none until tuning greenlit; security-sensitive (hashing).
- **Gate:** PASS iff latency recorded AND hashing parameters unchanged.
  **Status:** PARTIAL — local CPU-only scrypt verify recorded PASS (10k p95 30.46 ms vs 500 ms);
  hosted route DB writes/backoff evidence remains open.

#### PERF-12 — Rotate cost O(recipient count) (measure first) · BE · P3 · deps: none
- **Given** rotate is O(recipient count), **When** rotate cost is measured at representative
  recipient counts, **Then** a number is recorded; the credential-version model stays a scale backlog
  item unless the measurement shows a beta-blocking cost.
- **Verify:**
  ```bash
  bun scripts/measure-shared-link-perf-budgets.ts \
    --mode rotate-cost \
    --rows 1,10,50,100 \
    --samples 10 \
    --append \
    --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md
  ```
- **Blast radius:** none until model change greenlit.
- **Gate:** PASS iff cost-vs-N recorded; model change deferred unless breached.
  **Status:** PARTIAL — local CPU-only token-hash loop recorded PASS (100-recipient p95 0.23 ms vs 2 s);
  provider lock/update evidence remains open.

### WAVE 6 — Spec / architecture

#### SHF-01 — Focus-refresh beta copy / GA realtime backlog · FE/BE · P2 · deps: **D7 ratified**
- **Given** `SharedLinkActivityFeed.tsx:81-95,175` refreshes on focus/visibility only (no
  WebSocket/polling/SSE/Supabase-realtime — **source-verified**, distinct from the Fixed RUX-10),
  **When** the ratified D7 beta posture lands, **Then** the UI copy honestly says it refreshes on focus/return
  and Realtime stays a GA backlog item.
- **Target source:** `src/components/share/SharedLinkActivityFeed.tsx`.
- **Target test:** existing activity/feed component coverage or copy-focused DOM test.
- **Verify:** `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`
- **Blast radius:** owner feed only; no realtime subscription at beta.
- **Gate:** PASS iff focus-refresh copy is visible and docs keep Supabase Realtime in GA backlog.

---

## 4. Resolved owner-decision block

Each formerly blocked item now has a ratified [`71`](71_OPEN_DECISIONS_REGISTER.md) decision. Coding may
start, but the feature remains NO-GO until implementation, deploy, QA, and perf evidence pass.

| Decision | Question (abbrev.) | Unblocks item(s) |
|---|---|---|
| **D1** | Content-only republish forces recipient reload? | SEC-SHARE-01 already-Fixed posture; informs MANAGER-F-03 copy. (No Open coding item gated solely on D1.) |
| **D2** | Expose exact `project.location` to recipients? (`SharePageProposalHeader.tsx:11`) | **PERF-01A** (server-redirect flow) |
| **D3** | Expose `clientName`/totals/public IDs publicly? | OG leak is fixed; D3 now governs broader in-page/DTO disclosure policy. |
| **D4** | In-memory vs durable digest/rate-limit throttle for beta? | Posture for SEC-SHARE-06 / SHF-03 durability (informs, not blocks) |
| **D5** | Cross-origin/absent-Origin unsubscribe: harden vs accept? | **SEC-SHARE-05** |
| **D6** | Floating-nav rail vs single-column canonical? | SHF-02 (deferral, not a coding item here) |
| **D7** | Realtime activity vs focus-refresh? | **SHF-01** |
| **D8** | Pending-review migration reconciliation + atomicity strategy? | **SEC-SHARE-08** |
| **D9** | Accept SEC-SHARE-06 digest posture for beta? | SEC-SHARE-06 code fix is landed; D9 governs beta notification/delivery signoff. |
| **D10** | Manager-read RLS on `project_publication_events` apply-now vs post-launch? | Apply now through [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) ledger/promotion path + guard test. |
| **D11** | Recipient e-signature on decision (vs typed-name acceptance)? (from [`25`](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)) | Implement named confirmation + visible audit line; full legal e-signature remains GA/legal review. |

Items with **no decision dependency** (start anytime): remaining QA-G06 provider proof, QA-G10, RUX-14 visual proof,
PERF-05 (security-review-gated, not owner-decision-gated),
and PERF-09/12 measurement. PERF-06 is now a keep-green checkpoint rather than an open normalization task.

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
   writes, cross-cutting `actions.ts` edits), record one review artifact at
   `evidence/review/codex-review-shared-link-2026-06-21.md` before stop. Acceptable sources: `/codex:review`, a native
   `code-reviewer` subagent final report, or an explicit owner waiver recorded in
   [`LOOP_LEDGER.md`](LOOP_LEDGER.md). Ordinary reversible items (test-only, receiver visual polish)
   may skip the round-trip.
6. **Registry bound** — the item's status is updated in [`75`](75_FINDING_ID_REGISTRY.md) (Open →
   Fixed/Partial/Deferred) by the registry owner; this plan does not self-mark.

**Pack-level stop condition:** all non-decision-gated items DONE; every ratified decision item either
DONE (implemented + evidenced) or explicitly Deferred with rationale in
[`71`](71_OPEN_DECISIONS_REGISTER.md); final verdict recorded in
[`99`](99_QUALITY_SCORECARD_AND_SIGNOFF.md). Per [`75`:134](75_FINDING_ID_REGISTRY.md), no P1
*source-fix* finding is open today — the remaining P1 surface here is **test-rigor** (QA-G06 provider race) plus the
SHF-01 beta posture, so "ready" stays conditional until the remaining QA/deploy/perf gates and ratified decision implementation land.

---

## 6. Reconciliation note: PERF-01 vs PERF-01A

(Distinct from [§2](#2-reconciliation-of-40s-gaps-to-canonical-qa-g01g10), which reconciles 40's QA
gaps to canonical ids; this note reconciles the PERF-01 / PERF-01A id mismatch only.)

[`50`](50_PERFORMANCE_SPEED_AUDIT.md) uses the older `PERF-01` label in historical prose; the canonical
id is **PERF-01A** ([`75`:89](75_FINDING_ID_REGISTRY.md)). This plan tracks **PERF-01A** only. The
analytics-deferral sub-fix is recorded in [`80`](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md), but it does
not close PERF-01A. The **render+POST+reload elimination** is the Open residual tracked in §3 (Wave 5,
the PERF-01A entry) above.
