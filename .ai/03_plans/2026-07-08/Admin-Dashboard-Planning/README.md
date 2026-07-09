# Admin Dashboard — Implementation Plan Pack

**Plan folder:** `.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`
**Created:** 2026-07-08 (Asia/Manila); **Improved:** 2026-07-09 (planning-improvement pass)
**Plan profile:** `exhaustive`
**Plan status:** **`CONDITIONALLY READY`** (see `17_FINAL_READINESS_REVIEW.md`)
**Verification mode:** `emulated` — caps overall readiness at 97; needs owner or independent reviewer approval to lift.
**Score:** 96 → **97** after the 2026-07-09 improvement pass (see `20_CRITIQUE_AND_IMPROVEMENT_PLAN.md` and `LOOP_LEDGER.md`).

---

## What this is

A production-grade, codebase-specific implementation plan for an **admin dashboard**
gated to the single solo developer (`philipjonlewis@gmail.com`) via the existing
Better Auth + Google OAuth stack. It consolidates everything Philip needs to
operate Archestimator post-launch: live product usage + realtime active users,
user accounts, a unified customer-support inbox, analytics integrations
(Cloudflare / Microsoft Clarity / Google Analytics 4), feature flags, and an
admin audit log.

**This is a planning-only package.** No code, tests, migrations, or infra were
modified. Implementation is future work gated on this package being approved.

## Plan status: CONDITIONALLY READY

The **core dashboard** (Overview, Users, Support inbox, Feature flags,
Audit/Observability — Phases 0–6) is implementation-ready: every P0 task has
exact target paths/symbols, objective acceptance criteria, mapped tests,
rollback, and durable-goal contracts.

The following slices are **BLOCKED-EXTERNAL** and must not move to
implementation until the owner resolves them:

| Slice | Open decision | Effect without it |
|---|---|---|
| GA4 read-tile | OPEN-1 | link-out only |
| Clarity read-tile | OPEN-2 | link-out only |
| CF Analytics trend read-tile | OPEN-3 | link-out only |
| Cloudflare Access edge gate | OPEN-4 | app-layer gate still holds |
| Email-to-ticket inbox | OPEN-5 | in-app chat works; no inbound email |
| `recharts` + new DO bindings | OPEN-6 | gates Phase 2–3 |
| Presence privacy copy | OPEN-7 | non-blocking |

See `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` for options + recommendations.

## Implementation start

**Start at:** `11_IMPLEMENTATION_PLAN.md` → Phase 0 (Foundation: allowlist + env + master flag).

## Phase order + dependency graph

```
Phase 0  Foundation (allowlist + flag + proxy gate)        ← no deps
   │
   ├─→ Phase 1  Migrations + repositories + audit + cache   ← Phase 0
   │      │
   │      ├─→ Phase 3  Admin shell + Overview + Users        ← Phase 1
   │      │      │
   │      │      └─→ Phase 6  Hardening + perf + docs        ← Phases 3,4,5
   │      │
   │      └─→ Phase 5  Flags + Audit + Observability + Analytics tiles ← Phase 1
   │
   ├─→ Phase 2  Realtime DOs (presence + support)            ← Phase 0
   │      │
   │      └─→ Phase 4  Support inbox UI                      ← Phases 1,2
   │
   └─→ Phase 7  Owner-gated provider reads (BLOCKED-EXTERNAL) ← OPEN-1..5
```

Parallelizable: Phase 1 migrations are mutually independent; Phases 3, 4, 5 can
diverge after their prereqs. Shared-file edits (roles.ts, request-proxy.ts,
worker.ts, wrangler.jsonc, package.json) must be serialized via the file-scope
ownership model in `00_AGENT_COORDINATION.md`.

## Blocked decisions table

| ID | Decision | Owner | Recommended | Impact if unresolved |
|---|---|---|---|---|
| OPEN-1 | GA4 service-account + Data API | Philip | defer (MVP link-out) | no GA read-tile |
| OPEN-2 | Clarity Data Export token | Philip | defer (MVP link-out) | no Clarity read-tile |
| OPEN-3 | CF GraphQL Analytics token | Philip | provision (highest value) | no trend read-tile (link-out ok) |
| OPEN-4 | Cloudflare Access OTP allowlist | Philip | enable post-MVP | edge gate (app gate holds) |
| OPEN-5 | Inbound `support@` Email Routing | Philip | Phase 2 | no email-to-ticket |
| OPEN-6 | Approve `recharts` + DO bindings | Philip | approve | gates Phases 2–3 |
| OPEN-7 | Presence privacy copy | Philip | aggregate-only (always-on count) | minor copy/consent |

## Commands to run before the first edit

```bash
git status --short --branch          # shared worktree safety
git diff --check                     # no whitespace errors
bun run type-check                   # baseline clean
bun run cf:typegen                   # regenerate Worker Env types after wrangler.jsonc edits
```

## Files explicitly off-limits (to this plan's implementation)

- Any file under `supabase/migrations/` (historical only — never run/extend).
- The historical Supabase project `ebxxqidacheyapmmzavr` and the unrelated
  `archestimator` provider project — never mutate.
- Public marketing-site analytics wiring (`src/components/landing/*`) — unchanged.
- Better Auth identity tables (`user`/`session`/`account`/`verification`) — read-only.
- Existing `CollaborationRoom` DO — unaffected (new DOs are siblings).

## Files/systems intentionally unaffected

- All user-facing workshop routes (`/workshop/**`).
- Public site analytics injection (consent-gated, unchanged).
- Existing collaboration realtime (per-project DO untouched).

## External proof required before production rollout

- `wrangler d1 execute ARCH_DB` read-back of migrations `0041–0044`.
- Deployed WS smoke for `GlobalPresence` + `SupportInbox` DOs.
- Provider read-back for any read-tile claiming real GA4/Clarity/CF data
  (OPEN-1/2/3).
- Hosted Cloudflare Access proof (OPEN-4) if the edge gate is enabled.

## Traceability

- Requirements → `04_REQUIREMENTS_SPECIFICATION.md` (stable IDs).
- Requirements × tasks × tests × rollout → `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.
- Every task ID in `11_IMPLEMENTATION_PLAN.md` maps to ≥1 requirement.

## Stale-plan revalidation checklist (before implementing)

- [ ] Re-read `src/lib/auth/roles.ts`, `src/lib/auth/request-proxy.ts`,
      `src/lib/auth/session.ts`, `src/lib/auth/better-auth-cloudflare.ts` — confirm
      no concurrent agent changed the gate/role/profile wiring.
- [ ] Re-read `wrangler.jsonc` — confirm bindings + compat date + crons unchanged.
- [ ] Re-read `package.json` — confirm no chart lib was added independently.
- [ ] `rg "philipjonlewis@gmail.com"` — confirm the 4 literals still exist (or
      were already consolidated).
- [ ] Check the latest migration number in `./migrations/` — `0041` must not collide.
- [ ] Confirm `cloudflare-env.d.ts` regen command (`bun run cf:typegen`).
- [ ] Re-verify Better Auth Google OAuth still primary (`socialProviders.google`).

## Archive policy

Do **not** archive automatically. Archive only after the core dashboard
(Phases 0–6) is merged, verified, and Philip has dogfooded it for ≥ 1 week, OR
archive only named completed slices. Phase 7 (provider reads) stays open until
each OPEN-1..5 is resolved or explicitly dropped.

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, lanes, ledger, skills, ownership, open decisions |
| `01_EXECUTIVE_SUMMARY.md` | What/why/how/readiness at a glance |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, interpreted outcome, in/out scope, success/failure metrics |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Full codebase evidence (auth, analytics, schema, UI, docs, gaps) |
| `04_REQUIREMENTS_SPECIFICATION.md` | Stable-ID requirements + shadow-path matrix |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | IA, journeys, states, components, a11y, Tailwind impact (high-level) |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target arch, boundaries, data flow, decisions |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Migration blueprints (0041–0048), API contracts, access-path matrix |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Trust boundaries, STRIDE, credential taxonomy |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets, evaluator, cardinality, rollout gates (perf authority) |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Impact matrix, dependencies, compatibility |
| `11_IMPLEMENTATION_PLAN.md` | Phased tasks (exact paths/symbols), durable-goal ledger (**authoritative**) |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix, adversarial QA, validation gaps |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Flag rings, rollback, runbook summary |
| `14_RISK_REGISTER.md` | Risks with prevention/mitigation/contingency |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Decisions, assumptions, OPEN-1..7 |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Full requirement→task→test mapping (incl. §16.2 new reqs from `21`) |
| `17_FINAL_READINESS_REVIEW.md` | Scores, verifier findings, status (incl. §17.7 re-score) |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack decisions, env vars |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research Q1–Q7, cycle summaries, evidence gaps |
| `20_CRITIQUE_AND_IMPROVEMENT_PLAN.md` | **2026-07-09** critical analysis + gap register |
| `21_INDUSTRY_STANDARD_FACETS_ANALYSIS.md` | **2026-07-09** Stripe/Vercel/Supabase/Sentry/Linear comparison + 40 facets |
| `22_UX_WIREFRAMES_AND_SCREEN_SPECS.md` | **2026-07-09** per-screen wireframes + concrete copy + state matrix |
| `23_COMPONENT_API_CONTRACTS.md` | **2026-07-09** TS prop interfaces for every new admin component |
| `24_DATA_FLOW_AND_SEQUENCE_DIAGRAMS.md` | **2026-07-09** mermaid sequence diagrams for realtime + mutation flows |
| `25_OPERATOR_RUNBOOKS.md` | **2026-07-09** step-by-step workflows (locked out, incident, DSAR, etc.) |
| `26_ACCESSIBILITY_PROOF_MATRIX.md` | **2026-07-09** action-level WCAG 2.2 AA proof per surface |
| `27_OBSERVABILITY_DEEP_DIVE.md` | **2026-07-09** expanded operator telemetry surface + 4 new migrations |
| `28_EXECUTION_OVERLAY.md` | **2026-07-09** per-task verification-gated execution checklist |
| `LOOP_LEDGER.md` | **2026-07-09** this improvement cycle's ledger |

**Reading order for an implementer:** README → `01` → `11` (authoritative plan)
→ `28` (execution overlay) → per-task supporting docs as referenced.

## Key findings (TL;DR for the owner)

- **You already have most of the auth plumbing.** Better Auth + Google OAuth +
  magic link are wired; `profiles.role` + `isPlatformAdminRole` exist; a
  closed-beta allowlist + admin CRUD UI exist at `/workshop/settings/users`.
  The admin dashboard extends these — it does not rebuild them.
- **Your email is already the de-facto admin allowlist** — hard-coded in 4 files.
  The plan consolidates those into one `isPlatformAdminEmail()` helper backed by
  a `PLATFORM_ADMIN_EMAILS` env var.
- **All three analytics providers are already instrumented** (Clarity, GA4, CF
  Web Analytics), consent-gated on public pages, with IDs in `NEXT_PUBLIC_*`.
  The dashboard links to them out-of-the-box; server-side reads need credentials
  you'd provision (OPEN-1/2/3).
- **Realtime presence is the one genuinely new infra** — a new `GlobalPresence`
  Durable Object (SQLite, Hibernation API) giving `getWebSockets().length` as
  the live count. The pattern already exists in your `CollaborationRoom` DO.
- **There is no support/chat schema today** — a new migration (`0041`) and a
  `SupportInbox` DO are required for the inbox.
- **No charting library is installed** — `recharts` is recommended (needs your
  approval, OPEN-6); isolated to the admin chunk via dynamic import.
- **Free-tier posture preserved** — no Logpush/Workers Paid/R2 paid; optional
  Analytics Engine (100K writes/day free) + `ratelimit` binding (free, GA).
