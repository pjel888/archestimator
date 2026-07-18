# 2026-07-18 MVP Startup Readiness Audit

## Audit baseline

- **Audit date:** 2026-07-18
- **Branch:** `main`
- **Full commit SHA:** `a41a07d0143abf72289a97cd8bd023cfa9986361`
- **Worktree status (session start):** clean `main` with two pre-existing
  untracked planning folders unrelated to this audit:
  - `.ai/03_plans/2026-07-18-Archestimator-Whole-Repo-Performance-Audit/`
  - `.ai/03_plans/2026-07-18-Whole-App-Consistency-Audit/`
- **Audit mode:** READ-ONLY. No product source, migrations, provider
  configuration, deployments, branches, commits, tests, or builds were touched.
  See `AGENTS.md` "Operating Constraints" and the master prompt's §5.
- **Audit type:** whole-company MVP startup readiness & gap audit, distinct
  from the engineering-focused audits of the same date (see §Relationship to
  other audits below).

## Audit scope

A startup/learning-system audit of the Archestimator codebase at HEAD, against
four readiness stages (Stage A controlled design-partner MVP, Stage B
learning-complete beta, Stage C paid MVP, Stage D public self-service) and
twelve audit lenses (beachhead ICP, core product loop, acquisition pipeline,
activation/onboarding, retention/habit, product analytics, feedback system,
pricing/monetization, founder operations, trust/reliability/legal, PH AEC
market fit, scope discipline).

The central question (master prompt §1):

> Can Philip recruit 5–8 highly qualified design partners, get them to
> meaningful value quickly, observe what they do, support them without
> operational chaos, retain the right users, and obtain credible
> willingness-to-pay evidence — without unacceptable trust, data, or workflow
> risk?

In scope: every public marketing surface, the auth/onboarding/first-value path,
estimate/library/templates/import, proposal/share/collaboration/support,
founder/admin operations, product analytics vs operational telemetry, billing
absence, legal posture, PH AEC fit, and feature scope discipline.

Out of scope (master prompt §5): product source edits, migrations, provider
changes, deploy, paid services, DNS, commits, branches, tests, builds,
browser automation, padded backlogs, enterprise ceremony.

## Source-of-truth hierarchy used

Per master prompt §4 and `AGENTS.md`:

1. Current source code at `HEAD` (commit `a41a07d01`).
2. `AGENTS.md` and `.ai/00_system/*` canonical docs.
3. `README.md`.
4. `wrangler.jsonc`, active `migrations/`, `package.json`, env examples.
5. `.ai/10_state/current-state.md` (FAST PATH first).
6. `.ai/10_state/decisions.md`.
7. Active specifications and plans.
8. Archived evidence and historical roadmaps.

## Documents produced

| Document | Purpose |
|---|---|
| `README.md` (this file) | Baseline, scope, source hierarchy, headline conclusion. |
| `00-EXECUTIVE-VERDICT.md` | Stage verdicts table, beachhead, core loop, activation/retention events, north-star, top gaps, dangerous assumptions, defer list, single next action. |
| `01-CAPABILITY-AND-GAP-AUDIT.md` | Capability truth map, ten mandatory journeys, twelve audit lenses, documentation drift, evidence-backed gap register. |
| `02-PRIORITIZED-MVP-BACKLOG.md` | Seven operating milestones (before recruiting → before public self-service → deferred/killed) with outcome/reason/scope/files/manual-alt/acceptance/metric/effort/dependency/owner/priority/risk. Stage A/B list consolidated under 15 items. |
| `03-EXPERIMENTS-METRICS-AND-OPERATING-PLAN.md` | Six experiments with pass/fail/inconclusive/kill rules, minimum event taxonomy, founder operating cadence. |
| `04-FOUNDER-DECISION-PACKET.md` | ≤12 owner decisions only, each with options, recommended default, evidence, cost of delay, latest responsible decision date, what stays reversible. |

All findings cite exact `file:line` evidence from commit `a41a07d01`.

## Relationship to other 2026-07-18 audits

Three other audit packs exist for the same date. This audit is distinct in lens
and does not duplicate their findings; it cites them where engineering defects
have startup-side consequences.

- `.ai/03_plans/2026-07-18-Codebase-Improve-Audit-Plan-Pack/` — engineering
  `/improve` audit (33 plans across 9 categories: D1 atomicity, CSRF
  constant-time, rate-limiter durability, upload scanning, money arithmetic,
  error consolidation, god-component decomposition, library bulk-import spike,
  cost-intelligence-layer spike, etc.). Status: PLANNED only, nothing
  implemented. Its `031-spike-library-bulk-import.md` is directly relevant to
  this audit's #1 activation blocker (§01 Gap G-02); this audit treats it as a
  confirmed direction and prioritizes it.
- `.ai/03_plans/2026-07-18-Whole-App-Consistency-Audit/` — 31 logical/factual/
  feature bugs (1 CRITICAL: row-total divergence across 5 sites; 8 HIGH).
  Relevant to startup side: closed-beta enforcement gap (F-09), onboarding
  milestone bug (F-08), support unread flag (F-06). This audit cites these as
  trust/correctness risks but does not re-derive them.
- `.ai/03_plans/2026-07-18-Archestimator-Whole-Repo-Performance-Audit/` —
  performance/loading audit. Findings recorded under `artifacts/findings.json`
  and `artifacts/profiles/`. Relevant to first-load and large-estimate behavior
  in journey 3.

These three audits are engineering lenses. This audit is the
startup/ICP/pricing/beta-ops/learning lens: who is the user, what loop must
work, what must be measured, what must Philip decide, and what is overbuilt
relative to unproven demand. The same codebase, viewed from a different
vantage, yields different prioritization: e.g. `closed_beta_allowed_emails`
works fine as a security mechanism (engineering pass) but is the bottleneck of
a manual, scattered, hard-to-scale beta-ops process (startup finding S-04).

## Evidence limitations

- **Hosted/live proof not verified.** All evidence is from local source at HEAD.
  Per `AGENTS.md` and the FAST PATH, hosted D1/R2/email/browser/authenticated
  runtime proof is a separate release boundary. This audit can cite what the
  code does, not what the deployed system has been observed doing with real
  users.
- **No real users interviewed.** All ICP/segment scoring is inference from
  code, public copy, and the existing plan-pack record. Van Westendorp / WTP
  interviews are explicitly recommended experiments, not performed here.
- **Cloudflare cost data not surfaced.** Unit-economics estimates cite binding
  configuration in `wrangler.jsonc` (D1, R2, DO, Queues, Images, Email, four
  crons) but do not reflect actual monthly bills; Philip should reconcile these
  before any pricing publication.
- **Audit performed by AI against the prompt at
  `~/Downloads/ARCHESTIMATOR_MVP_STARTUP_READINESS_AUDIT_PROMPT.md`.** It does
  not replace founder judgement, legal counsel, accounting, or live customer
  evidence.

## Headline conclusion (one paragraph)

Archestimator is engineering-rich but startup-loop-thin. The core estimating
engine, BOQ export, totals oracle, price history, templates, linked instances,
client portal, shared-link security, and operational telemetry are
production-grade and trustworthy for a closed beta. But the loop that turns a
visitor into a qualified design partner into a paying advocate is materially
incomplete on three fronts: (1) **acquisition collapses to a mailto** — no
lead table, no qualification fields, no pipeline visibility, and the
`ClosedBetaGate` form `POST /contact` has no server handler (G-01); (2)
**activation is fragile** — onboarding routes are redirect stubs, the
first-value checklist component is built but never mounted, there is no
spreadsheet import, and the activation milestone `health_reviewed` is
declared but never emitted (G-02/G-03); (3) **learning instrumentation is
near-zero** — zero first-party product-funnel events are emitted, no GA4/PostHog
wiring, and the founder dashboard is scattered across ~22 admin pages with the
overview explicitly punting "Active teams" to "Repository lane pending"
(G-04/G-05). The single highest-leverage move is to ship a working lead-capture
+ activation-telemetry spike (≈3–5 days) before recruiting the cohort, because
right now Philip cannot tell which CTA produced a signup, cannot tell whether a
design partner reached first value, and cannot run a pricing conversation
without that evidence.
