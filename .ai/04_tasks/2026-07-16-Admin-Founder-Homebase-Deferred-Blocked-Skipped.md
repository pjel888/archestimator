# Admin Founder Homebase — Deferred, Blocked & Skipped Work

**Date:** 2026-07-16 (updated end-of-pass)
**Author:** Claude (autonomous implementation pass)
**Plan pack:** `.ai/03_plans/2026-07-12/Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack`
**Scope:** UNIT-001–011 (F0–F10)
**Execution ledger:** `…/Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack/LOOP_LEDGER.md`

This is the single source of truth for everything **not** fully completed during the
2026-07-16 pass — deferred, blocked, and skipped — with the reason and the unblock
condition for each. It supersedes the earlier mid-pass version (which predates the
F2/F3/F4/F5/F6/F7/F8/F9/F10 work).

---

## 0. At-a-glance — all 11 units now have a delivered surface

Every unit has committed, `tsc`-clean, `react-doctor`-clean work. "Surface" = the
buildable part exists; the gaps below are what remains beyond it.

| Unit | Surface delivered | Commit | Fully complete? |
|------|-------------------|--------|-----------------|
| F0 | 10 correctness/security defects fixed | `c350f8bf8` | ✅ Yes |
| F1 | ⌘K federated search + grouped nav | `c350f8bf8` | 🟡 pins/recents/context-drawer deferred |
| F2 | Action inbox state machine (incident + support sources) | `d1215f802`, `7656c7706` | 🟡 more derivation sources deferred |
| F3 | Founder notes (User + Account 360) | `e7e35e802` (+`59a7c5414`) | 🟡 activation/health/cohorts deferred |
| F4 | Support triage (via inbox) + saved replies | `7656c7706`, `dee2f0da8` | 🟡 internal conv notes/close-loop/signals/retry-claim deferred |
| F5 | Release Center (log + go/no-go) | `0874aa9da` | 🟡 typed checks/rollback-refs/flag-expiry deferred |
| F6 | Data-quality findings (3 checks) | `f6cafe881` | 🟡 repair framework/more checks deferred |
| F7 | Project 360 + list | `9a821b51a` | 🟡 estimate/pub 360/diagnostics deferred |
| F8 | Financials honest "unavailable until provider" | `100ede9c5` | ⛔ provider integration blocked |
| F9 | Comms manager (in-app) + email honest-unavailable | `f86fc15df` | ⛔ email provider blocked |
| F10 | AI Copilot honest "not activated" + contract | `484b0c743` | ⛔ actual AI wiring gated (but **buildable** — see §3.3) |

---

## 1. Deferred (deliberate, with rationale + unblock condition)

### 1.1 F1 — pins, recents, saved views, header env/status, context drawer, URL filter standard
- **Why deferred:** pins/saved views need **new schema** (`admin_pins` / `admin_preferences`). Header env/status and context drawer are UI framework work with lower marginal value than search. URL filter standard is cross-cutting, best done once multiple filtered list pages exist.
- **Unblock:** add pins/preferences migration + repo + action; wire into palette/header. Touchpoints: new `pins-repository.ts`/`pins-actions.ts`; edit `AdminCommandPalette.tsx`, `AdminHeader.tsx`.

### 1.2 F2 — more action-inbox derivation sources
- **Current:** incident + support sources implemented. The derivation registry is generalized (`buildUpsert`/`buildResolve` per source kind in `action-inbox-repository.ts`), so adding sources is additive.
- **Deferred sources:** feedback, identity mismatch, failed jobs, upload scans, founder follow-ups.
- **Unblock per source:** add a `list…()` function returning items, then map it through `buildUpsert("source_kind", …)` + a `buildResolve("source_kind", …)` in `deriveActionItemsFromSources`. Feedback is blocked on a list function (only `getFeedbackAggregateForPlatformAdmin` aggregate exists today).

### 1.3 F3 — full Customer 360
- **Deferred:** activation stage, rule-based health, customer attention queue, cohorts, next-best-action rules. (Notes — the highest-value seed — are done on both 360s.)
- **Unblock:** activation/health rule tables + read queries; also fixes the missing-auth/profile silent-loss path noted in the pack.

### 1.4 F4 — remaining support/signals deliverables
- **Done:** support triage (priority/waiting surfaced through the action inbox, awaiting-reply first) + saved replies (create/delete).
- **Deferred:** internal conversation notes (distinct from customer-facing replies), close-loop queue, signal themes + affected-user counts, pending/uncertain reply retry-claim queue.
- **Unblock:** each is a discrete feature with its own table/repo (e.g. `admin_support_internal_notes`, `admin_close_loop_items`). Retry-claim needs a stable client-message idempotency contract.

### 1.5 F5 — remaining release-center deliverables
- **Done:** release records + go/no-go status (pending/shipped/blocked/rolled_back).
- **Deferred:** typed pre-deploy checks, commit/provider/evidence links, migration/flag rollback refs, post-deploy monitoring period, release↔incident correlation, feature-flag owner/review/expiry registry, stale-flag action items.
- **Unblock:** typed-checks table + flag-expiry columns; correlate via existing `operational_incidents`.

### 1.6 F6 — remaining ops/data-quality deliverables
- **Done:** 3 read-only referential-integrity checks (orphan estimates, orphan project workspaces, profiles missing role), isolated per check.
- **Deferred:** jobs/queues/outbox status, DLQ backlog/replay, Workers log freshness, integration-health registry, data-quality check registry + dry-run repair framework, backup/restore freshness, privacy-request intake/status/owner/due.
- **Unblock:** check registry table + bounded dry-run/apply repair (idempotent, audited).

### 1.7 F7 — remaining entity-360 deliverables
- **Done:** read-only Project 360 (summary + estimates + Workshop link) + projects list.
- **Deferred:** Estimate 360, Publication/client-portal funnel, diagnostics, data-quality/action items on entities.
- **Unblock:** estimate/publication read repos + diagnostic rules; mirror the Project 360 pattern.

---

## 2. Blocked (external dependency or missing prerequisite)

### 2.1 F8 — billing/financials actual integration
- **Blocker:** no billing provider connected. The pack (DEC-AUTO-*) forbids fabricating revenue/MRR/attribution.
- **Current honest state:** `/admin/financials` renders every metric as explicit "unavailable — no billing provider connected" (unavailable ≠ zero).
- **Unblock:** select + connect a provider (Stripe); build the provider-owned billing read adapter (customers, subscriptions, invoices, failed payments, refunds, disputes, MRR movement) + integration-health/reconciliation. Requires your **provider account + API keys** — not codeable without them.

### 2.2 F9 — email channel actual integration
- **Blocker:** no email provider. Email is "unavailable until provider authentication, suppression, delivery-event, unsubscribe, reputation, and reconciliation contracts exist."
- **Current honest state:** the in-app channel is fully built (broadcast hardened in F0-6, atomic + typed); `/admin/communications` shows in-app history + delivery counts and states email is provider-gated.
- **Unblock:** provision an email provider (SendGrid/SES/Postmark) + implement those contracts. Requires your **provider account + credentials**.

### 2.3 F10 — actual AI operator wiring (buildable, but gated)
- **Finding:** this repo **already has LLM infrastructure** — `src/lib/ai/deepseek.ts:41` `askDeepSeek(messages)`, plus `read-context.ts` (read-only AI context), `auth.ts`, `audit.ts`, `rate-limit.ts`. It is gated on `DEEPSEEK_API_KEY` (`isDeepSeekConfigured()`).
- **Current honest state:** `/admin/copilot` states the activation contract (read-only, source-grounded, human-controlled, gated) without fabricating an AI.
- **Unblock:** a read-only admin copilot is **buildable with existing infra** — a server action that gathers admin-gated read context (via `read-context.ts`), calls `askDeepSeek`, and returns a grounded answer — **if `DEEPSEEK_API_KEY` is configured**. If the key is unset, the surface stays honestly "not activated." Requires confirming the key is provisioned.

---

## 3. Skipped / out-of-scope (with rationale)

### 3.1 Grouped nav links only existing routes
The pack's target IA names routes that didn't exist; linking them would create dead links. New links are added as their pages ship.

### 3.2 F0-9 — partial maintenance-mode enforcement rejected
Pack offered "enforce at the boundary or remove the flag." Partial enforcement at one boundary = a new deception ("maintenance on" but other writes still work). Removed the inert toggle; real cross-cutting enforcement is F5/F6 (flag row retained).

### 3.3 Other agents' concurrent WIP — not touched
Working tree carried uncommitted WIP from other agents in `src/components/workshop/**`, `src/components/ui/status-badge.tsx`, `src/lib/ai/package-builder/**`, `AGENTS.md`, `CLAUDE.md`, the `2026-07-14/Component-Variant` pack, and `e2e/`. Every commit here selectively staged **only** admin files — never swept in others' WIP. One overlap (account-notes) converged cleanly with another agent (commits `118754971`/`59a7c5414`).

### 3.4 Pre-existing defects outside this pack — not fixed
`react-doctor`: `AdminCharts.tsx` (eager recharts), `estimate-system-map/*` (another agent's active file). `tsc`: `component-library/actions.ts` (`insertTemplate`, `unknown`), `AddComponentModal.tsx` (`category` prop), `EstimateSystemKnowledgeGraph.tsx` (`KnowledgeStatusBadge` missing). All pre-existing concurrent WIP, outside this pack.

### 3.5 Tests — not authored/run
Pack defaults every AC to `test_requirement: NOT_REQUIRED`; project policy gates test execution/edits behind explicit `TEST_TASK` (none authorized). Evidence = source/diff review + `tsc` + `react-doctor`.

### 3.6 React-doctor pre-commit notice — confirmed false positive
The "staged regressions" notice fires on every commit, but scanning `src/components/admin` shows **0 findings** in any component authored/edited this pass (findings are only in pre-existing `AdminCharts` + `estimate-system-map`).

---

## 4. Decisions log

- **D-1 (F0-9)** Removed maintenance toggle vs. partial enforcement. Safe, honest, recoverable.
- **D-2 (F2)** Shipped Today read-only first, then the state machine as a tested-by-review increment.
- **D-3 (F1)** Nav links only existing routes.
- **D-4 (F0-7)** Removed (not wired) the two zero-consumer stub API routes.
- **D-5 (F4)** Delivered support triage **through the action inbox** (no duplicate inbox UI) + registered support as an F2 derivation source.
- **D-6 (F8/F9/F10)** Built honest "unavailable/not-activated" scaffolds rather than fabricating providers/AI — per pack DEC-AUTO-*.
- **D-7 (concurrency)** Selective `git add` of admin-only files on `main`; committed slices as they verified.

---

## 5. Verification limitations

- **Full `next build` not run green:** concurrent WIP has pre-existing `tsc` errors (§3.4) that fail a full build — not caused by this pass. All admin files are `tsc`-clean in isolation (verified repeatedly during low-load windows).
- **Machine saturation:** load cycled 6–118 from many concurrent agents; `tsc` intermittently took 2–6+ min or had to be killed. Verification was done during low-load windows.
- **No runtime/D1 verification:** admin reads/writes need the Cloudflare D1 binding (deploy), not available locally. Per NOT_REQUIRED default, evidence is static.
- **`use-server` export shape unchanged** across edited `"use server"` files (all async) — no build-only export regression.

---

## 6. Recommended next steps (priority order)

1. **F10 real copilot** (§2.3) — highest leverage; buildable with existing DeepSeek infra once `DEEPSEEK_API_KEY` confirmed. Read-only, grounded via `read-context.ts`.
2. **F2 more derivation sources** — feedback (needs a list fn), then jobs/scans; additive to the generalized registry.
3. **F1 pins/recents** — schema + palette integration.
4. **F3 activation/health** — full Customer 360.
5. **F4 internal notes / close-loop**, **F5 typed checks / flag-expiry**, **F6 repair framework**, **F7 estimate/publication 360** — in dependency order.
6. **F8/F9** — only after provider accounts + keys are connected.

---

*End of document. Maintained alongside `LOOP_LEDGER.md`. Update when a deferred/blocked item is resolved or a new one appears.*
