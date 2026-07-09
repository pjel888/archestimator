# 28 — Execution Overlay

**Created:** 2026-07-09 (Asia/Manila)
**Purpose:** Convert `11_IMPLEMENTATION_PLAN.md` into a per-task
verification-gated execution checklist. Closes GAP-8 from `20`.

**Authority:** `11` remains the authoritative implementation plan. This
doc is a **checkpoint overlay** that adds per-task pre-conditions,
acceptance scenarios, and verification commands. It does NOT change scope,
phase order, or durable goals.

---

## 28.1 How to use this overlay

For every task in `11`:
1. Confirm the **pre-conditions** (dependencies, file leases, baseline
   checks).
2. Execute the task per `11`.
3. Run the **acceptance scenarios** listed here.
4. Run the **verification commands** listed here.
5. Capture evidence in the loop ledger.
6. Only then mark the task complete.

If any acceptance scenario fails: do not proceed to dependent tasks. Fix
root cause, re-verify, then continue.

---

## 28.2 Pre-execution baseline (run once before Phase 0)

| Check | Command | Expected |
|---|---|---|
| Working tree is clean enough | `git status --short --branch` | No unexpected changes; note any from other agents |
| No whitespace errors | `git diff --check` | Exit 0 |
| TypeScript clean | `bun run type-check` | Exit 0 |
| Lint clean | `bun run lint` | Exit 0 |
| Existing tests pass (or known-reds documented) | `bun run test` | Pass or known-reds noted |
| Build succeeds | `bun run build` | Exit 0 |
| Wrangler types current | `bun run cf:typegen && git diff cloudflare-env.d.ts` | No diff (or diff is from this plan's intended changes) |
| Migration number | `ls migrations/ \| tail -1` | `0040_*.sql` (the plan uses `0041`–`0048` now per `27`) |

Record baseline in `LOOP_LEDGER.md` before starting.

---

## 28.3 Phase 0 — Foundation

### Task 0.1 — `isPlatformAdminEmail()` helper + env

**Pre-conditions:**
- File lease acquired on `src/lib/auth/roles.ts` (`00_AGENT_COORDINATION.md`).
- Re-read `src/lib/auth/roles.ts` immediately before edit.

**Implementation per `11`.**

**Acceptance scenarios:**
1. `isPlatformAdminEmail('philipjonlewis@gmail.com')` returns `true` with
   default env.
2. `isPlatformAdminEmail('other@example.com')` returns `false` with
   default env.
3. `isPlatformAdminEmail('PHILIPJONLEWIS@GMAIL.COM')` returns `true`
   (case-insensitive).
4. `isPlatformAdminEmail('a@x.com,b@x.com')` returns true for both when
   env is comma-separated.
5. `isPlatformAdminEmail(null)` and `(undefined)` return `false`.
6. `isPlatformAdmin({role:'ceo', email:'any@x.com'})` returns `true`
   (role-based).
7. `isPlatformAdmin({role:'member', email:'philipjonlewis@gmail.com'})`
   returns `true` (email-based).

**Verification commands:**
- `bun run type-check`
- `bun run test -- admin-roles` (new test file)

**Evidence to capture:**
- Test output showing all 7 scenarios pass.
- Diff of `roles.ts` showing the new helper.

### Task 0.2 — Master flag seed

**Pre-conditions:** Task 0.1 done.

**Acceptance scenarios:**
1. Migration `0042_feature_flags.sql` applies cleanly to local D1.
2. `SELECT * FROM feature_flags` returns 4 rows (admin_dashboard_enabled,
   admin_support_realtime, admin_analytics_server_pulls,
   admin_maintenance_mode per `27`).
3. All flags default to `enabled=0` except `admin_dashboard_enabled`
   (operator toggles on first use; default off is safer).

**Verification:**
- `wrangler d1 migrations apply ARCH_DB --local`
- `wrangler d1 execute ARCH_DB --local --command "SELECT key, enabled FROM feature_flags"`

### Task 0.3 — Proxy `/admin` gate

**Pre-conditions:**
- File lease on `src/lib/auth/request-proxy.ts`.
- Re-read file immediately before edit.

**Acceptance scenarios:**
1. Anonymous GET `/admin` → 302 to `/login?next=/admin`.
2. Authenticated non-admin GET `/admin` → 302 to `/access-required`.
3. Authenticated admin GET `/admin` with flag on → 200 admin shell.
4. Authenticated admin GET `/admin` with flag off → 302 to `/workshop`.
5. Direct POST to `/api/admin/*` with non-admin session → 403.

**Verification:**
- `bun run test -- admin-access`

---

## 28.4 Phase 1 — Migrations + repositories + audit + cache

### Tasks 1.1, 1.2, 1.3 — Migrations

**Pre-conditions:** Phase 0 done.

**Acceptance scenarios (per migration):**
1. Applies cleanly to local D1: `wrangler d1 migrations apply ARCH_DB --local`.
2. Read-back: `wrangler d1 execute ARCH_DB --local --command "SELECT COUNT(*) FROM <table>"` returns 0 (new tables).
3. Rollback SQL runs cleanly (per `07` blueprints).

**Verification:**
- Apply + rollback + re-apply cycle on local D1.

### Task 1.4 — users-repository

**Acceptance scenarios:**
1. `listAdminUsers({page:1, limit:50})` returns paginated rows.
2. `listAdminUsers({search:'jane@'})` returns only matching users.
3. `countSignups(7)` returns integer count.
4. `listRecentSignups(10)` returns 10 rows ordered by created_at desc.

**Verification:**
- `bun run test -- admin-users-repository`

### Task 1.5 — audit helper

**Acceptance scenarios:**
1. `writeAdminAuditEvent({...})` inserts exactly one row.
2. Returns `{ id }`.
3. Does NOT throw on transient D1 errors (logs via emitLogRecord).

**Verification:**
- `bun run test -- admin-audit`

### Task 1.6 — metric-cache helper

**Acceptance scenarios:**
1. `getMetricCache('foo')` returns null on first call.
2. `setMetricCache('foo', {x:1}, 60)` then `getMetricCache('foo')` returns
   `{x:1}`.
3. After 61 seconds (mock time), `getMetricCache('foo')` returns null.
4. `refreshIfStale('foo', 60, async () => ({x:2}))` returns `{x:2}` and
   updates cache.

**Verification:**
- `bun run test -- metric-cache`

### Task 1.7, 1.8 — incidents-repository, health-probes

Similar shape: repository test passes.

---

## 28.5 Phase 2 — Realtime DOs

### Task 2.1 — GlobalPresence DO

**Pre-conditions:**
- File lease on `worker.ts`, `wrangler.jsonc`.
- `wrangler.jsonc` `new_sqlite_classes` includes `GlobalPresence` with
  migration tag.
- `cf:typegen` re-run after `wrangler.jsonc` edit.

**Acceptance scenarios:**
1. WS connect with valid Ed25519 token → `authorize` succeeds; socket tagged.
2. `getWebSockets().length` reflects connected count.
3. New connection triggers broadcast `{type:'presence', count:N}` (debounced).
4. Disconnect decrements count.
5. Hibernation: DO sleeps when idle; wakes on WS message; count survives.
6. Invalid token → `authorize` fails; socket closed.
7. Reconnect: client auto-reconnects with backoff; state transitions
   connecting → live.

**Verification:**
- `bun run test -- global-presence-do`
- `bun run cf:typegen` (verify no diff after)
- Local `wrangler dev` smoke: open admin in 2 browsers, count updates.

### Task 2.2 — SupportInbox DO

**Acceptance scenarios:**
1. WS connect with valid token for conversation X → authorized.
2. WS connect with token for conversation Y but client requests X → rejected.
3. New message broadcast to all connected clients for that conversation.
4. Disconnect → no duplicate messages on reconnect (idempotency).
5. Non-admin, non-owner user → rejected.

**Verification:**
- `bun run test -- support-inbox-do`

---

## 28.6 Phase 3 — Admin shell + Overview + Users

### Task 3.1 — recharts dep + chart wrappers

**Pre-conditions:** OPEN-6 approved (Philip okays recharts + DO bindings).

**Acceptance scenarios:**
1. `bun add recharts` succeeds.
2. `bun run build` succeeds.
3. Admin chunk gzip ≤ 250 KB (per PERF-BUNDLE-01).
4. Non-admin routes do NOT load recharts (verify via bundle analyzer).

**Verification:**
- `bun run build`
- Bundle analyzer output saved to `logs/admin-perf-baseline.md`.

### Task 3.2 — Admin layout + shell + sidebar

**Acceptance scenarios:**
1. Authenticated admin visit `/admin` → shell renders with sidebar + header.
2. Sidebar nav items: Overview, Users, Support, Analytics, Flags, Audit,
   Observability.
3. Each sidebar item links to its route.
4. `<nav aria-label="Admin sections">` present.
5. `aria-current="page"` on active item.
6. Mobile (<640px): sidebar hidden by default; hamburger opens SheetDrawer.
7. Keyboard: Tab through sidebar items in order; Esc closes mobile drawer.

**Verification:**
- `bun run test:dom -- admin-shell`
- Manual: resize browser to <640px; verify drawer.

### Task 3.3 — Overview data + tiles

**Acceptance scenarios:**
1. Overview renders all tiles (Users online, Signups, Open tickets,
   Incident strip, Recent signups, Health strip, Onboarding funnel,
   Closed-beta funnel, CF trend link-out).
2. Each tile streams independently via Suspense.
3. Per-tile Skeleton on load; no full-page blocking.
4. Per-tile error state on failure; siblings unaffected.
5. Refresh button visible.
6. Live count announces via `aria-live="polite"`.
7. TTFB p95 ≤ 600 ms at 1000 seeded users.

**Verification:**
- `bun run test:dom -- admin-overview`
- `bun run admin:perf:eval` (new script) → record in `logs/admin-perf-baseline.md`

### Task 3.4 — Users page

**Acceptance scenarios:**
1. `/admin/users` renders DataTable with 50 rows on first page.
2. Search by email prefix filters server-side.
3. Pagination navigates pages.
4. CSV export downloads file.
5. Row click opens user drawer (P2) or navigates.
6. Empty state shows when no users.
7. No PII in client bundle (server-rendered).

**Verification:**
- `bun run test:dom -- admin-users-table`
- `bun run build` + grep admin chunk for email-pattern strings → none.

---

## 28.7 Phase 4 — Support inbox

### Task 4.1 — Support repositories + actions

**Acceptance scenarios:**
1. `sendSupportReply` happy path: row inserted with `send_status='sent'`,
   email sent, audit row written.
2. Email failure path: row inserted with `send_status='send_failed'`,
   error returned, draft preserved.
3. Idempotency: same `client_message_id` twice → only one row, no duplicate
   email, no duplicate audit.
4. Unauthorized: non-admin direct POST → 403.
5. Body validation: > 10000 chars → validation error.

**Verification:**
- `bun run test -- support-actions`
- `bun run test -- support-idempotency`
- `bun run test -- support-reply-failure`

### Task 4.2 — Inbox UI

**Acceptance scenarios:**
1. `/admin/support` renders split view (list + thread).
2. Selecting conversation opens thread with messages.
3. Reply composer: type + Cmd/Ctrl+Enter sends.
4. Optimistic insert appears immediately.
5. WS push: new inbound message appears within 5s.
6. WS disconnect banner shows amber; auto-reconnect.
7. Send failure: toast + draft kept + retry button.
8. Status badge colors (open/pending/resolved) match spec; not color-only.
9. Mobile (<640px): single-pane navigation.

**Verification:**
- `bun run test:dom -- admin-support-inbox`
- Browser proof (Playwright) recommended for the realtime flow per `22.13`.

### Task 4.3 — API routes

Trivial: each route returns 200 with correct DTO shape; 401/403 for auth
failures.

---

## 28.8 Phase 5 — Flags + Audit + Observability + Analytics tiles

### Task 5.1 — Flags reader + UI

**Acceptance scenarios:**
1. `/admin/flags` lists all flags.
2. Toggle optimistic update works.
3. Toggle failure reverts.
4. Audit row written per toggle.
5. App reads new flag value within TTL.

**Verification:**
- `bun run test -- feature-flags`
- `bun run test:dom -- admin-flags`

### Task 5.2 — Audit viewer

**Acceptance scenarios:**
1. `/admin/audit` paginates events.
2. Filter by action / actor / date works.
3. CSV export downloads file.
4. DSAR tab shows queue.
5. Mass-ops tab shows recent events.

**Verification:**
- `bun run test:dom -- admin-audit`

### Task 5.3 — Observability page

**Acceptance scenarios (per `27`):**
1. System status tile shows uptime strip.
2. Cron health strip shows 3 crons with status.
3. Queue health shows depth + DLQ count.
4. Client errors top 10 list.
5. Web Vitals p75 for LCP/INP/CLS.
6. Free-tier gauge (link-out if OPEN-3 unresolved).
7. Backup status indicator.
8. Data residency static.
9. Maintenance mode toggle with confirmation.

**Verification:**
- `bun run test:dom -- admin-observability`
- Manual: toggle maintenance mode on; verify `/workshop` writes 503.

### Task 5.4 — Analytics tiles

**Acceptance scenarios:**
1. `/admin/analytics` shows 3 provider tiles (CF, Clarity, GA4).
2. Each tile shows cached metrics or "not configured" state.
3. Each tile has "Open in [provider]" link.
4. Refresh button forces cache invalidation.

**Verification:**
- `bun run test:dom -- admin-analytics`

---

## 28.9 Phase 6 — Hardening

### Task 6.1 — Rate-limit bindings

**Acceptance scenarios:**
1. `wrangler.jsonc` has `ratelimit` bindings `ADMIN_LOGIN_LIMIT`,
   `ADMIN_WRITE_LIMIT`.
2. Admin login attempts throttled after N failed.
3. Admin write actions throttled after N rapid.
4. `cf:typegen` regenerated.

**Verification:**
- `bun run cf:typegen && git diff cloudflare-env.d.ts`
- Local smoke: rapid POSTs trigger throttle.

### Task 6.2 — Perf gate + bundle audit

**Acceptance scenarios:**
1. `/admin` TTFB p95 ≤ 600 ms.
2. Admin chunk gzip ≤ 250 KB.
3. Baseline recorded in `logs/admin-perf-baseline.md`.

**Verification:**
- `bun run admin:perf:eval`
- Bundle analyzer output.

### Task 6.3 — Consolidate email literals

**Acceptance scenarios:**
1. `rg "philipjonlewis@gmail.com" src/` returns 0 hits (or only in
   `.env.example` / `.dev.vars.example`).
2. All 4 original sites now call `isPlatformAdminEmail(context.email)` or
   equivalent.
3. Behavior preserved (admin detection still works).

**Verification:**
- `rg "philipjonlewis@gmail.com" src/` → 0 (or only docs)
- `bun run test` green

### Task 6.4 — Runbook + state update

**Acceptance scenarios:**
1. `src/app/admin/README.md` or `.ai/.../admin-runbook.md` exists with
   env vars, secrets, Access setup, DO behavior, rollback steps.
2. `.ai/10_state/current-state.md` has an entry for the admin dashboard.

**Verification:**
- File exists.
- `git diff` shows additive entry in current-state.md.

### Task 6.5 — DSAR extension

**Acceptance scenarios:**
1. `privacy_requests` handler extended to cover `support_conversations`
   and `support_messages`.
2. Test: given a DSAR delete request, support data is included in
   deletion.

**Verification:**
- `bun run test -- dsar-support-extension`

---

## 28.10 Phase 7 — Owner-gated (BLOCKED-EXTERNAL)

Only after each OPEN resolved. See `11` §Phase 7.

Each Phase 7 task has its own acceptance scenarios documented in `11`
and gated on provider proof (read-back of real data).

---

## 28.11 Per-task evidence capture

For every task, capture in `LOOP_LEDGER.md`:

```
## Task T-X.Y
- Status: completed | blocked | skipped
- Pre-conditions met: yes/no
- Files changed: list
- Tests run: list with pass/fail counts
- Acceptance scenarios: all listed scenarios pass (link to test output)
- Verification commands: list with exit codes
- Evidence artifacts: list (perf report, bundle analyzer, screenshots)
- Residual: any caveats
- Reviewed by: reviewer name (or "emulated")
```

Tasks without this evidence are NOT complete.

---

## 28.12 Cross-phase validation gates

After each phase, run the full integration gate:

| Gate | When | Command | Expected |
|---|---|---|---|
| Type-check | every task | `bun run type-check` | exit 0 |
| Lint | every task | `bun run lint` | exit 0 |
| Error-handling | every task touching server/actions | `bun run validate:error-handling` | exit 0 |
| Design-system lint | UI changes | `bun run lint:design-system` | exit 0 |
| Unit tests (Bun) | every task | `bun run test -- <area>` | green or known-reds |
| DOM tests (Vitest) | UI tasks | `bun run test:dom -- <area>` | green |
| Build | end of each phase | `bun run build` | exit 0 |
| Full validate | end of each phase | `bun run validate` | exit 0 (or known-reds documented) |
| E2E smoke | end of Phase 3, 4, 6 | `bun run test:e2e -- admin` | green |
| Hosted proof | end of Phase 6 | `wrangler d1 execute ARCH_DB` read-back of migrations 0041-0048 | tables exist |

---

## 28.13 Adversarial QA gate (end of Phase 4 + Phase 6)

Run the AQ-1..14 matrix from `12`:

- AQ-1: anonymous GET `/admin` → redirect (TEST-AUTH-01).
- AQ-2: non-admin GET `/admin` → redirect (TEST-AUTH-01).
- AQ-3: non-admin POST admin action → 403 (TEST-AUTH-01).
- AQ-4: admin duplicate `client_message_id` → one row (TEST-INBOX-01).
- AQ-5: admin reply EMAIL fail → `send_failed`, draft kept.
- AQ-6: oversized body → validation error.
- AQ-7: XSS body → rendered as text.
- AQ-8: concurrent flag toggle → last-write + 2 audit rows.
- AQ-9: WS disconnect → reconnect-safe.
- AQ-10: provider token revoked → degrade to link.
- AQ-11: D1 read fails → section error + retry.
- AQ-12: attacker flood → ratelimit throttle.
- AQ-13: stale cache past TTL → refresh triggers.
- AQ-14: prompt-injection in support body → treated as text.

All must pass.

---

## 28.14 Path to declare "Phase N done"

A phase is done when:
1. All tasks in `11` for that phase have evidence captured per §28.11.
2. Cross-phase validation gates (§28.12) pass.
3. Adversarial QA (§28.13, if applicable) passes.
4. Durable goal ledger row updated to `complete` with evidence links.
5. The README's stale-plan revalidation checklist still passes (re-run
   before next phase).

---

## 28.15 Stop conditions

- **Stop and ask user:** any BLOCKED-EXTERNAL item is required for the
  next step.
- **Stop and ask user:** any irreversible action without explicit fresh
  authorization (per AGENTS.md shared-worktree rules).
- **Stop and re-plan:** if a task fails 3 consecutive times after root-cause
  analysis (per `00` failure-recovery).
- **Stop on conflict:** if another agent edited a file in this plan's
  scope (per `00` shared-worktree rules).

---

## 28.16 Handoff to reviewer

When all phases complete (or a slice is ready for review):

1. Compile evidence from `LOOP_LEDGER.md`.
2. Run final adversarial pass (emulated or independent reviewer).
3. Produce final readiness scorecard update to `17`.
4. Hand to Philip for approval.

---

## 28.17 What this doc does NOT do

- Replace `11`. It is a checkpoint overlay.
- Change phase order or durable goals.
- Authorize implementation. It assumes the package is approved (lifts the
  emulated-verification cap per `17`).
- Replace maker/checker separation. The reviewer pass is still required.

---

## 28.18 Confirmation

No application code, tests, migrations, schemas, `wrangler.jsonc`,
`package.json`, provider state, or runtime data were modified. All writes
are confined to `.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`.
