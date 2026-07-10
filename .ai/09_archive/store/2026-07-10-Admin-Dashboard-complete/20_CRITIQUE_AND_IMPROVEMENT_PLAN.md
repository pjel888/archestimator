# 20 — Critique and Improvement Plan

**Created:** 2026-07-09 (Asia/Manila)
**Author:** lead coordinator, planning-improvement pass
**Purpose:** Critical analysis of the Admin-Dashboard-Planning package
(blast radius, scope, document quality) and the gap register that drove the
2026-07-09 improvements (docs `21`–`28` + upgrades to `05`, `09`, `11`, `16`,
`17`, `README`).

This is **planning-only**. No code, tests, migrations, infra, or runtime
state were modified.

---

## 20.1 What this pass reviewed

Every document in this folder (21 files: `README` + `00`–`19`). For each
document the lead recorded: purpose, source authority, current/stale status,
main claims, requirements/decisions/risks, evidence cited, dependencies,
gaps/contradictions/duplications. The full inventory lives in the lead's
working notes; this doc records the **load-bearing findings** that affect
implementation readiness.

---

## 20.2 Initial verdict (before this pass)

| Dimension | Verdict | Reason |
|---|---|---|
| Strategic clarity | Strong | Brief → interpreted outcome → non-goals is clean (`01`, `02`). |
| Codebase grounding | Excellent | `03` cites exact files, symbols, line numbers. |
| Requirements | Strong | Stable IDs + source strength + shadow-path matrix (`04`). |
| Architecture | Strong | Target arch + rejected alternatives (`06`, `15`). |
| Data | Strong | 4 migration blueprints with rollback (`07`). |
| Security | Strong | STRIDE + credential taxonomy + denial tests (`08`). |
| Implementation plan | Strong | Phased, dependency-aware, durable-goal ledger (`11`). |
| Traceability | Strong | Every req → task → test mapped (`16`). |
| Readiness honesty | Strong | `17` caps at 97 with emulated verification + 7 OPEN-* blocker-external items. |
| **UX / UI** | **Thin** | `05` is 138 lines; IA described but no wireframes, copy, component APIs, or visual QA gates. |
| **Observability surface** | **Thin** | `09` is 89 lines; admin is operator surface but doesn't cover cron health, queue DLQ, client errors, web vitals, cost. |
| **Industry-standard comparison** | **Missing** | No doc examines what Stripe / Vercel / Supabase / Sentry / Linear admin panels do that we should adopt or deliberately reject. |
| **Operator runbooks** | **Missing** | No step-by-step workflows for locked-out, incident, DSAR, complaint, token rotation. |
| **Sequence diagrams** | **Missing** | Realtime flows (presence, support inbox) described in prose but not diagrammed. |
| **Accessibility proof matrix** | **Missing at action level** | `05` lists a11y reqs but no action-level proof matrix (keyboard path, focus target, live region, proof type). |
| **Task-level acceptance scenarios** | **Thin in `11`** | Durable-goal ledger is phase-level; tasks themselves lack per-task acceptance scenarios. |

Initial aggregate: **96 / 100** (matches `17`). Status: `CONDITIONALLY READY`
(emulated verification + 7 OPEN-*).

---

## 20.3 Blast-radius analysis

### 20.3.1 Repository-surface blast radius (unchanged by this pass)

The plan touches (see `10_BLAST_RADIUS_AND_DEPENDENCIES.md` for the full
matrix). Summary classification:

- **Additive (low risk):** `src/app/admin/**`, `src/lib/admin/**`,
  `src/components/admin/**`, 4 new migrations (`0041`–`0044`), 2 new DO
  classes (`GlobalPresence`, `SupportInbox`), optional `analytics_engine`
  + `ratelimit` bindings.
- **Targeted edits (medium risk):** `src/lib/auth/roles.ts`,
  `src/lib/auth/request-proxy.ts`, `worker.ts`, `wrangler.jsonc`,
  `package.json` (add `recharts`; P2 `postal-mime`),
  `src/app/providers.tsx` (admin hooks), `cloudflare-env.d.ts` (regen),
  `.env.example` / `.dev.vars.example`, retention cron (extend prune scope).
- **Refactor (medium risk, separately landable):** consolidate 4
  `philipjonlewis@gmail.com` literals into `isPlatformAdminEmail` (T-6.3).
- **Shared-file collision risk:** `roles.ts`, `request-proxy.ts`, `worker.ts`,
  `wrangler.jsonc`, `package.json` are owned by other features → must be
  leased via the file-scope ownership model in `00_AGENT_COORDINATION.md`.
- **Explicitly unaffected:** public marketing site, `/workshop/**` routes,
  Better Auth identity tables, existing `CollaborationRoom` DO.

### 20.3.2 Plan-internal blast radius (this pass)

This pass adds **8 new planning documents** and **edits 6 existing documents**
plus `README`. Every edit is inside the plan folder. No code, tests,
migrations, or infra are touched.

**Cross-document coherence risk:** new docs introduce new req IDs
(`FR-OPS-*`, `FR-UX-*`, `FR-OBS-*` extensions) that must reconcile with `04`
and `16`. The upgrade to `16` (traceability matrix) closes this — every new
req is traced.

---

## 20.4 Scope analysis

### 20.4.1 In-scope (the brief, verbatim)

> "plan the admin dashboard... monitor the necessary things... cloudflare,
> microsoft clarity, google analytics... current number of users... amount of
> users using the platform at any given time... chat inbox... customer
> support... Research on what needs to be included."

### 20.4.2 Scope decomposed

The plan correctly decomposes the brief into six core sections (Overview,
Users, Support inbox, Analytics, Flags, Audit/Observability) plus deferred
billing/experiments/log-search. This decomposition is sound and aligned with
research Q1 (`19`).

### 20.4.3 Scope gaps (this pass surfaced)

The original 6 sections answer the brief but **under-coverage of operator
telemetry that the codebase already produces**. Concretely:

| Existing codebase asset | Currently surfaced in admin plan? | Gap |
|---|---|---|
| `operational_incidents` + `operational_incident_events` (`0040`) | Strip lists open incidents (`FR-OVERVIEW-05`) | No incident lifecycle viewer (declare/note/status/close from admin) |
| `security_rate_limit_events` (`0006`) | Not surfaced | No rate-limit/denial trend visibility |
| `client-error-report.ts` | Not surfaced | No client error trend (RUM) in admin |
| `useReportWebVitals` (referenced in `providers.tsx`) | Not surfaced | No field Web Vitals tile |
| `mass_deletion_events` (`0023`) | Not surfaced | No mass-op audit viewer |
| `privacy_requests` (`0033`) | Mentioned as DSAR extend target only | No DSAR queue viewer in admin |
| `ai_action_runs` / `ai_tool_calls` / `ai_data_access_events` (`0006`) | Not surfaced | AI features are deferred, but when enabled, admin should have a viewer |
| Cron triggers (`wrangler.jsonc` 3 crons: `0 3 * * *`, `15 3 * * *`, `30 3 * * *`) | Not surfaced | No cron health/last-success dashboard |
| Queue `UPLOAD_JOBS_QUEUE` + DLQ | "Reads depth only" | No DLQ inspection/replay viewer |
| `closed_beta_allowlist_audit_events` (`0001`) | Mentioned but not in admin | No closed-beta funnel/attribution viewer |
| `user_onboarding_profiles` (`0005`) | Not surfaced | No onboarding funnel viewer |
| `estimate_sheet_events`, `shared_link_events`, `component_library_telemetry_events` | Not surfaced | No product-activity trend (deferred to GA4 — but in-app proof of activity exists) |
| `data_retention_events` (`0034`/`0040`) | Not surfaced | No retention pass history viewer |

These are not all MVP-required, but they are **industry-standard operator
facets** that the plan should explicitly adopt/defer/reject. The new
`21_INDUSTRY_STANDARD_FACETS_ANALYSIS.md` closes this.

### 20.4.4 Scope non-goals (reaffirmed)

All non-goals in `02` §"Out of scope" remain valid. This pass adds **two
explicit non-goals** to prevent scope creep from the new facets doc:

- **Non-goal: build a SIEM or observability platform.** The admin links to
  Cloudflare Workers Observability for raw log search; it does not rebuild it.
- **Non-goal: build a status page** (`status.archestimator.com`). Public
  status page is deferred until paying customers exist.

---

## 20.5 Document quality analysis

### 20.5.1 Per-document scoring (this pass, using the prompt's rubric)

| Doc | Initial (per `17`) | This pass | Change | Reason for change |
|---|---|---|---|---|
| `00` Agent coordination | 95 | 95 | — | Adequate. |
| `01` Executive summary | 96 | 96 | — | Adequate. |
| `02` Feature brief + scope | 97 | 97 | — | Adequate. |
| `03` Source + codebase audit | 98 | 98 | — | Excellent. |
| `04` Requirements spec | 97 | 97 | — | Strong; shadow-path matrix is a highlight. |
| `05` UX/UI/a11y plan | 95 | **96** | +1 | References new `22`/`23`/`26` after upgrade; copy/states now concrete. |
| `06` Architecture | 97 | 97 | — | Strong. |
| `07` Data/DB/API/network | 97 | 97 | — | Strong. |
| `08` Security/privacy/threat | 96 | 96 | — | Strong. |
| `09` Performance/reliability/observability | 95 | **96** | +1 | References new `27` observability deep dive after upgrade. |
| `10` Blast radius + deps | 97 | 97 | — | Adequate. |
| `11` Implementation plan | 96 | **97** | +1 | Adds per-task acceptance scenarios + sequence-diagram references + execution-overlay cross-link after upgrade. |
| `12` Test/validation strategy | 96 | 96 | — | Adequate; AQ matrix is solid. |
| `13` Rollout/rollback/ops | 96 | 96 | — | Adequate. |
| `14` Risk register | 96 | 96 | — | Adequate. |
| `15` Decisions/assumptions/alternatives | 97 | 97 | — | Strong. |
| `16` Traceability matrix | 98 | **98** | — | Extended to trace new reqs from `21`; remains complete. |
| `17` Final readiness review | 96 | **97** | +1 | Re-scored to reflect doc upgrades + new facets doc; emulated-verification cap still applies. |
| `18` Stack contract | 96 | 96 | — | Adequate. |
| `19` Research review + QA evidence | 96 | 96 | — | Adequate. |
| **New** `20` Critique + improvement plan | — | n/a (meta) | — | This document. |
| **New** `21` Industry-standard facets | — | **95** | — | Closes the missing industry-comparison gap. |
| **New** `22` UX wireframes + screen specs | — | **95** | — | Closes the wireframe/copy/state gap. |
| **New** `23` Component API contracts | — | **95** | — | Closes the component-shape gap. |
| **New** `24` Data flow + sequence diagrams | — | **95** | — | Closes the realtime-flow-visualization gap. |
| **New** `25` Operator runbooks | — | **95** | — | Closes the runbook gap. |
| **New** `26` Accessibility proof matrix | — | **95** | — | Closes the action-level a11y proof gap. |
| **New** `27` Observability deep dive | — | **95** | — | Closes the operator-telemetry gap. |
| **New** `28` Execution overlay | — | **95** | — | Closes the per-task execution-checklist gap. |

### 20.5.2 Aggregate score

Before this pass: **96 / 100** (`17`).
After this pass: **97 / 100** (the cap remains — emulated verification + 7
OPEN-* external decisions still unresolved).

Status remains **`CONDITIONALLY READY`** for the same two structural reasons
(emulated verification; OPEN-1..5 provider/infra gates). The **content
gaps** that previously held the score at 96 — not the structural caps — are
now closed. The path to `IMPLEMENTATION-READY` (98+) is now crisp:
(1) Philip approves, (2) resolve OPEN-6, (3) run an independent verifier.

---

## 20.6 Gap register (what this pass closed)

| Gap ID | Description | Affected docs | Status after pass |
|---|---|---|---|
| GAP-1 | No industry-standard admin-dashboard comparison | (none) → `21` | **Closed** |
| GAP-2 | No text wireframes / concrete copy per screen | `05` → `22` | **Closed** |
| GAP-3 | No TS prop interfaces for new admin components | (none) → `23` | **Closed** |
| GAP-4 | No sequence diagrams for realtime + mutation flows | (none) → `24` | **Closed** |
| GAP-5 | No operator runbooks (locked-out, incident, DSAR, etc.) | (none) → `25` | **Closed** |
| GAP-6 | No action-level WCAG 2.2 AA proof matrix | `05` → `26` | **Closed** |
| GAP-7 | Thin observability surface (cron, DLQ, client errors, web vitals, cost) | `09` → `27` | **Closed** |
| GAP-8 | No per-task verification-gated execution checklist | `11` → `28` | **Closed** |
| GAP-9 | `11` tasks lacked acceptance scenarios at task granularity | `11` | **Closed** (upgrade) |
| GAP-10 | `16` did not trace new reqs from `21` | `16` | **Closed** (upgrade) |
| GAP-11 | `17` did not reflect the new-doc accounting | `17` | **Closed** (upgrade) |
| GAP-12 | README document index missing new docs | `README` | **Closed** (upgrade) |
| GAP-13 | No LOOP_LEDGER for this improvement cycle | (none) → `LOOP_LEDGER.md` | **Closed** |

### 20.6.1 Residual gaps (still open, by design)

| Gap | Why still open | Unblock action |
|---|---|---|
| Emulated verification | Lead authored and verified — no independent native verifier agent ran | Run independent reviewer or get Philip sign-off |
| OPEN-1 GA4 service-account | External owner action (Google Cloud) | Philip provisions SA + Data API creds |
| OPEN-2 Clarity Export token | External owner action (Clarity dashboard) | Philip mints token |
| OPEN-3 CF GraphQL Analytics token | External owner action (Cloudflare account) | Philip mints scoped read token |
| OPEN-4 CF Access OTP allowlist | External owner action (Zero Trust config) | Philip enables Access on `/admin` |
| OPEN-5 Inbound `support@` Email Routing | External owner action (Email Routing + DNS) | Philip provisions inbound address |
| OPEN-6 Approve `recharts` + new DO bindings | Owner approval gate (AGENTS package/wrangler discipline) | Philip approves |
| OPEN-7 Presence privacy copy | Owner product/privacy call | Philip confirms aggregate-only count is acceptable |

None of these are closable by additional planning work. They are the honest
residual of a planning-only task scope.

---

## 20.7 Critical-adversarial findings (this pass)

The lead re-ran an emulated adversarial pass focused on the new docs. Findings
and resolutions:

| ID | Finding | Severity | Resolution |
|---|---|---|---|
| CAF-1 | New `21` facets list could tempt scope creep (e.g., add cron viewer, AI viewer in MVP) | Med | `21` explicitly tags each facet `adopt-MVP` / `defer-post-MVP` / `reject`. Only `adopt-MVP` items map to new reqs in `16`. |
| CAF-2 | `22` wireframes are text-only — implementer might infer different visuals | Low | `22` §"Visual fidelity disclaimer" states explicitly that final visuals defer to Philip; `26` adds visual-QA gate triggers only when browser-only claims arise. |
| CAF-3 | `23` TS interfaces are plan-shaped, not final | Low | `23` §"Authority" states interfaces are planning contracts; implementer may rename/refine during code if behavior preserves the contract. |
| CAF-4 | `25` runbooks reference `wrangler d1 execute` write commands (e.g., role fix) | Med | `25` flags these as `owner-gated runtime action` — they require fresh owner approval at execution time; planning does not authorize them. |
| CAF-5 | `27` observability expansion could inflate bundle | Low | `27` ties each new surface to a `next/dynamic` admin chunk; PERF-BUNDLE-01 unchanged. |
| CAF-6 | `28` execution overlay could be confused with the authoritative `11` | Med | `28` §"Authority" explicitly states `11` remains authoritative; `28` is a checkpoint overlay, not a replacement. |
| CAF-7 | New reqs from `21` (FR-OBS-*, FR-UX-*) might duplicate existing `04` reqs | Low | `16` upgrade cross-references — new IDs are additive (no overlaps). |
| CAF-8 | DSAR extension (T-6.5) is P2 but now appears in `25` runbooks as if MVP | Low | `25` clearly labels DSAR runbook as "post-MVP (when privacy request arrives)". |

All CAF-* findings resolved in-doc. No adversarial P0 remained.

---

## 20.8 Cross-document coherence check

- `04` (requirements) ↔ `16` (traceability) ↔ `11` (implementation) ↔ `12`
  (tests): all aligned on stable req IDs. New reqs from `21` added to `16`.
- `05` (UX) ↔ `22` (wireframes) ↔ `23` (component APIs) ↔ `26` (a11y proof):
  cross-referenced; `05` upgraded to point at the three new docs.
- `08` (security) ↔ `25` (runbooks): `25`'s incident/rotation runbooks align
  with `08` credential taxonomy and `13` rollback table.
- `09` (perf/observability) ↔ `27` (observability deep dive): `09` upgraded
  to reference `27` for the expanded surface; budgets unchanged.
- `11` (implementation) ↔ `28` (execution overlay): `11` upgraded to
  cross-link `28`; phase order and durable goals unchanged.
- `17` (readiness) ↔ all new docs: `17` upgraded to score the new docs and
  recompute aggregate.
- `README` ↔ all: index refreshed.

No cross-document contradictions introduced.

---

## 20.9 Industry-standard facets explicitly examined

The new `21` doc covers ~30 facets observed in Stripe / Vercel / Supabase /
Sentry / Linear / Notion / Retool / Plane admin surfaces, with explicit
adopt/defer/reject decisions. Highlights:

- **Adopt-MVP:** uptime strip (via existing alert scenarios S-01), cron
  health strip (existing 3 crons), queue depth + DLQ count (existing
  `UPLOAD_JOBS_QUEUE`), recent client-error count (existing
  `client-error-report.ts` source), DSAR queue viewer (existing
  `privacy_requests`), maintenance mode flag (existing
  `admin_dashboard_enabled` extends naturally).
- **Defer-post-MVP:** external uptime probe (Better Stack / Cron Job Monitor
  / Pingdom), Sentry-style stack trace aggregation, status page
  (`status.archestimator.com`), on-call paging (Slack/Opsgenie), AI usage
  viewer (AI features deferred), A/B experiment viewer (deferred to GA4).
- **Reject:** user impersonation (single-operator; not worth the risk surface
  for MVP), command palette (operator-only; sidebar suffices), saved-view
  presets (YAGNI for one user), in-dashboard log search (Logpush is paid;
  link out to Workers Observability).

See `21` for the full matrix and rationale.

---

## 20.10 What did NOT change in this pass

- **Stack baseline.** Next.js 16, React 19, Bun, Cloudflare Workers/OpenNext
  + D1 + R2 + DO + Queue + Email + Better Auth. Untouched.
- **Architecture decisions.** DEC-1..8 in `15` remain valid.
- **Migration numbers.** `0041`–`0044` unchanged.
- **OPEN-1..7.** Unchanged (still BLOCKED-EXTERNAL).
- **Phase structure.** Phase 0–7 order, dependencies, and durable goals
  unchanged.
- **Verification mode.** Still `emulated`. The cap at 97 remains until an
  independent verifier or Philip approves.
- **Performance budgets.** TTFB ≤ 600 ms p95, admin JS ≤ 250 KB gzip,
  presence ≤ 5 s. Unchanged.
- **Test matrix.** AQ-1..14 unchanged. New a11y proof rows added in `26`
  but not in `12` (which already covered a11y at the test layer).
- **`recharts` recommendation.** Still OPEN-6.

---

## 20.11 Path from `CONDITIONALLY READY` → `IMPLEMENTATION-READY`

The structural caps cannot be lifted by more planning work. They require:

1. **Philip approves the package** (lifts the emulated-verification cap to
   allow `verification_mode: independent` by owner acceptance).
2. **Resolve OPEN-6** (approve `recharts` + new DO bindings) — unblocks
   Phase 2–3 implementation.
3. **(Optional for MVP) Resolve OPEN-3** (CF GraphQL Analytics token) —
   enables the trend read-tile; link-out remains the fallback.
4. **Independent verifier pass** — a fresh human or agent reviewer produces
   a separate audit artifact; recorded as `verification_mode: independent`.

After (1)+(2)+(4): status moves to `IMPLEMENTATION-READY`, score 98+.
After (3): the trend tile moves from link-out to read.

Phase 7 (GA4, Clarity, Email-to-ticket, CF Access edge) proceeds only as
each OPEN-1/2/4/5 is resolved.

---

## 20.12 Confirmation

No application code, tests, migrations, schemas, `wrangler.jsonc`,
`package.json`, provider state, or runtime data were modified by this
planning-improvement pass. All writes are confined to
`.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`.

Verification: `git diff --check` after this pass. Scope: docs-only inside
the plan folder.
