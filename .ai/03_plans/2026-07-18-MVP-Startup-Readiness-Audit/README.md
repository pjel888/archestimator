# 2026-07-18 MVP Startup Readiness Audit

## Audit baseline

- **Audit dates:** 2026-07-18 (1st pass); 2026-07-19 (2nd pass: schema
  conformance, defect repair, variant accommodation).
- **Branch:** `main`
- **Full commit SHA:** `a41a07d0143abf72289a97cd8bd023cfa9986361`
- **Worktree status (session start):** clean `main` with two then-untracked
  sibling audit folders. They are now preserved at
  `.ai/09_archive/store/2026-07-18-Archestimator-Whole-Repo-Performance-Audit-superseded/`
  and `.ai/09_archive/store/2026-07-18-Whole-App-Consistency-Audit-superseded/`.
- **Audit mode:** READ-ONLY. No product source, migrations, provider
  configuration, deployments, branches, commits, tests, or builds were touched.
  See `AGENTS.md` "Operating Constraints" and the master prompt's §5.
- **Audit type:** whole-company MVP startup readiness & gap audit, distinct
  from the engineering-focused audits of the same date (see §Relationship to
  other audits below).
- **Validator status:** `bun run validate:plan-pack
  .ai/03_plans/2026-07-18-MVP-Startup-Readiness-Audit` → **PASS**. Manifest
  hash refreshed via `--write`. Pack conforms to `suite_version: 2026-07-12`.

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
| `00-PLAN.md` | **Canonical execution index.** Requirements (`REQ-*`), autonomous decisions (`DEC-AUTO-*`), units (`UNIT-*`), criteria (`AC-*`), evidence (`EVID-*`), risks (`RISK-*`), execution graph, execution order, cross-reference map. The artifact referenced by `canonical_execution_artifact` in `plan-pack.json`. |
| `plan-pack.json` | Machine-readable manifest; passes `bun run validate:plan-pack`. |
| `LOOP_LEDGER.md` | Append-only coordination log: current state, event ledger, decision ledger, authorization ledger, gate ledger, risks, continuation. |
| `00-EXECUTIVE-VERDICT.md` | Stage verdicts table, beachhead, core loop, activation/retention events, north-star, top gaps, dangerous assumptions, defer list, single next action. |
| `01-CAPABILITY-AND-GAP-AUDIT.md` | Capability truth map, ten mandatory journeys, twelve audit lenses, documentation drift, evidence-backed gap register. |
| `02-PRIORITIZED-MVP-BACKLOG.md` | Seven operating milestones (before recruiting → before public self-service → deferred/killed) with outcome/reason/scope/files/manual-alt/acceptance/metric/effort/dependency/owner/priority/risk. Stage A/B list consolidated under 15 items. |
| `03-EXPERIMENTS-METRICS-AND-OPERATING-PLAN.md` | Six experiments with pass/fail/inconclusive/kill rules, minimum event taxonomy, founder operating cadence. |
| `04-FOUNDER-DECISION-PACKET.md` | Four genuine founder decisions only (2nd pass: down from 12). Each with options, recommended default, evidence, cost of delay, latest responsible decision date, what stays reversible. |
| `001-*.md` … `013-*.md` | Per-unit execution docs (one per `UNIT-*`). Source evidence, implementation, acceptance evidence, test decision, recovery, completion signal. |

All findings cite exact `file:line` evidence from commit `a41a07d01`.

## Relationship to other 2026-07-18 audits

Three other audit packs exist for the same date. This audit is distinct in lens
and does not duplicate their findings; it cites them where engineering defects
have startup-side consequences.

- `.ai/03_plans/2026-07-31/Code-Improvement/` is the current engineering
  authority for whole-repository code improvement. The retired July 19 quality
  master's `AUDIT-AND-DISPOSITION.md` remains historical provenance: it
  re-audits all 85 source IDs, records
  `CONSISTENCY-001` row-total divergence as already implemented, keeps
  `CONSISTENCY-009` closed-beta enforcement evidence-gated, refutes the stale
  onboarding claim, and routes performance/loading plus library-import context
  through its audit-time dispositions. The original audit text remains
  available only under the predecessor's immutable source snapshots and
  recorded archive destinations.

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
near-zero** — GA4 is mounted for landing pageviews/A-B variant events but no
first-party activation-funnel or attribution events are emitted, and the
founder dashboard is scattered across exactly 21 admin pages with the
overview explicitly punting "Active teams" to "Repository lane pending"
(G-04/G-05). The single highest-leverage move is to ship a working lead-capture
+ activation-telemetry spike (≈3–5 days) before recruiting the cohort, because
right now Philip cannot tell which CTA produced a signup, cannot tell whether a
design partner reached first value, and cannot run a pricing conversation
without that evidence.

## 2nd-pass improvements (2026-07-19)

Per `Improve-Plan-Prompt.md` and `Multi-Agent-Execution-Directive.md`. Three
parallel verification agents (pack-defect, validator-shape,
variant-accommodation) surfaced a 40-item defect register. Repairs:

- **Schema conformance (BLOCKER fixes):** added canonical `00-PLAN.md` with
  stable IDs (`REQ-001..016`, `DEC-AUTO-001..013`, `UNIT-001..013`,
  `AC-001..016`, `EVID-001..013`, `RISK-001..003`, `GATE-PLAN-001`,
  `SLICE-001`); added `plan-pack.json` passing `bun run validate:plan-pack`;
  added `LOOP_LEDGER.md`; added 13 per-unit docs (`001-*.md`..`013-*.md`).
- **Evidence correction (DEF-30):** GA4 IS wired (`@next/third-parties` at
  `package.json:140`, `LandingAnalyticsLoader.tsx:3,27`). G-04 framing
  corrected from "no GA4 wiring" to "no first-party funnel events"; the
  narrower claim is the load-bearing point.
- **Evidence correction (DEF-31):** activation framing expanded to
  acknowledge sibling consistency-audit F-08 REFUTED verdict — the entire
  activation-progress subsystem (display + producer) is dead.
- **Evidence correction (DEF-37):** admin route count is exactly 21 (not
  "~22"); `find src/app/admin -name page.tsx | wc -l`.
- **Speculative-scope cut (DEF-11, DEF-12):** Stage C/D items (M5/M6) removed
  from the executable backlog; kept only as deferred narrative. Pricing
  speculation in `03-…md` §D trimmed to a one-paragraph evidence-first note.
- **Ceremonial-artifact cut (DEF-13):** `01-…md` §P (30 mandatory questions)
  compressed to a cross-reference index.
- **False-blocker removal (DEF-14, DEF-17..23):** 8 of 12 founder decisions
  downgraded to `DEC-AUTO-*` records (resolved autonomously per Kernel §4);
  FD-12 removed entirely (non-decision). The packet now contains 4 genuine
  founder decisions (FD-01, FD-06, FD-07, FD-09).
- **Context-preload trim (DEF-16):** documentation-drift §M cut from 11 rows
  to 6 startup-side rows; provider-era and dead-code drift items live in
  their canonical homes and are not re-stated here.
- **Variant accommodation (G-19, new finding):** PH bid-prep uses 2–3 supplier
  variants per line; the variant schema is mature but the import spike
  (`031-spike-library-bulk-import.md`) and BOQ export are variant-blind. Added
  REQ-005 / UNIT-006 (DEC-AUTO-010 declares variants CORE, not auxiliary).
- **Trust precondition (UNIT-013):** row-total divergence (consistency F-01
  CRITICAL) recorded as an external-owner trust precondition for cohort
  recruitment, not re-derived.
