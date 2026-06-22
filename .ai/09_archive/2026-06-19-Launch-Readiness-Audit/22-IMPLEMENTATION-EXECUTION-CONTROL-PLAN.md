# Launch Readiness Implementation Execution Control Plan

> **For agentic workers:** REQUIRED EXECUTION LOOP: use the Archestimator loop
> `DISCOVER -> PLAN -> EXECUTE -> VERIFY -> RECORD -> DECIDE` for every gate lane.
> Use `superpowers:subagent-driven-development`, `superpowers:executing-plans`,
> `ultrawork`, `ultragoal`, `team`, `autopilot`, `omo:ulw-loop`, or an
> agent-neutral equivalent only after the lead selects the surface. Steps use
> checkbox syntax for tracking.

**Goal:** Close the launch-readiness gates in least-risk-first order, while forcing
every implementation lane to loop until its pass criteria are proven, owner-accepted,
or explicitly blocked.

**Architecture:** This document is the execution controller for the launch-readiness
pack. `03-LAUNCH-GATE-DECISION-REGISTER.md` defines the gates, `19` defines blast
radius, `20` defines pass/fail criteria, `21` defines residual uncertainty, and
`23-IMPLEMENTATION-COORDINATION-LEDGER.md` is the live coordination surface.
`24-OVERNIGHT-AUTONOMOUS-IMPLEMENTATION-RUNBOOK.md` defines how to proceed when
the owner is unavailable and questions arise.

**Tech Stack:** Next.js 16, React 19, Bun, TypeScript, Tailwind v4, Supabase/Postgres
project `ebxxqidacheyapmmzavr`, Vercel, GitHub Actions, Resend, provider evidence
packets, and `.ai` durable state.

---

## Non-goals

- Do not implement the gates from this document alone. Each lane must read its owner
  pack, `03`, `08`, `19`, `20`, `21`, and `23`.
- Do not archive this folder until every required gate is closed, owner-accepted, or
  recorded as not applicable.
- Do not mutate Supabase, Vercel, GitHub, Resend, DNS, production, or legal copy
  without the authority required by `04-PROOF-TAXONOMY-AND-AUTHORITY.md`.
- Do not allow workers to choose their own scope, model tier, or stop condition.
  The lead orchestrator owns routing and final evidence.
- In overnight mode, do not stop on ordinary unanswered questions. Use the
  question classes and defaults in `24`, park only authority-gated lanes, and
  keep moving while safe lanes remain.

## Required execution loop per lane

Each gate lane must run this loop until one stop condition is met:

1. **DISCOVER**
   - Read `AGENTS.md`, the Fast Path block in `.ai/10_state/current-state.md`,
     this file, `23-IMPLEMENTATION-COORDINATION-LEDGER.md`, the gate row in `03`,
     the blast row in `19`, the criteria row in `20`, the uncertainty row in `21`,
     and the owner pack's `00` through `03` plus `LOOP_LEDGER.md`.
   - Run `git status --short` and inspect claimed/conflicting files in `23`.
2. **PLAN**
   - Select the smallest coherent change that can move the gate closer to closure.
   - Record the planned write scope in `23` or, in a multi-agent run, report it to
     the lead for `23` update before editing.
3. **EXECUTE**
   - Make only the scoped change.
   - Keep provider, DB, legal, and production mutations separate from local source
     edits unless the gate explicitly requires them and the required authority exists.
4. **VERIFY**
   - Run the narrowest proof that satisfies `20`.
   - For score 4-5 gates, also satisfy the controls in `19` and the residual-risk
     closure in `21`.
5. **RECORD**
   - Write or update a durable closeout artifact under `.ai/05_logs/launch-readiness/`
     or the gate's owner pack.
   - Include the close artifact schema from `08-IMPLEMENTATION-HANDOFF.md`.
6. **DECIDE**
   - If the criteria pass, mark the lane closed in `23`.
   - If criteria fail and the next action is still reversible and authorized,
     iterate.
   - If the next action is destructive, paid, production/provider-mutating without
     authority, or materially changes cohort strategy, stop with a blocker row in
     `23` and escalate to the owner.
   - If the owner is unavailable overnight, classify the question through `24`;
     apply safe defaults for Q0-Q1, park Q2-Q4 lanes, and continue with the next
     unblocked lane.

## Global stop conditions

The launch-readiness implementation is not complete until all of these are true:

- B1-B9 are closed or owner-accepted with durable evidence.
- V1-V2 are verified or owner-accepted with durable evidence.
- C1 is closed before any AI route enablement, or recorded as not applicable while
  AI remains disabled.
- H1-H4 are closed before their triggering cohort/surface is exposed.
- `23-IMPLEMENTATION-COORDINATION-LEDGER.md` has no `Active`, `Blocked`, `Parked`,
  or `Needs lead integration` rows for required launch gates.
- `21-RESIDUAL-UNCERTAINTY-AND-CONFIDENCE-REGISTER.md` has no low-confidence row
  for any gate claimed as closed.
- The lead has run integration verification and recorded the proof boundary.

## Risk-ordered implementation ladder

The order below is canonical unless the lead records a better evidence-backed reason
in `23`. Lower-score gates come first, but dependency edges still apply.

| Wave | Gates / work | Blast score | Why here | Parallelization rule | Close condition |
|---|---|---:|---|---|---|
| 0 | Orchestration bootstrap: appoint lead, create/update `23`, split lanes, confirm dirty worktree boundaries. | 1 | No product mutation; prevents concurrent-agent conflicts. | Lead only writes shared control docs. | `23` has lane claims, owner packs, and conflict zones recorded. |
| 1 | B2 validate hard-gate repair; FE-PERF lint/test fixes required for validate; advisory split only if owner-approved. | 2-3 | Local source/script work gates later CI. | Can run with B3/B9 only if write scopes do not overlap. | `bun run validate` passes, or hard/advisory split is owner-approved and proven. |
| 2 | B3 root/global/not-found boundaries; H1 public-route headers; SEO-01 share unfurl hardening. | 3 | Source-only, reversible, user-facing recovery/security posture. | B3 owns root `src/app` error files; H1 owns header config; avoid shared `next.config` conflicts. | Forced-error/source proof and header samples satisfy `20`. |
| 3 | V1 Supabase realtime limit readback; B1 GitHub CI enablement after B2; CI timeout/required-check posture. | 3 | Provider read or moderate provider workflow changes after hard gate is green. | V1 read-only can run in parallel; B1 waits for B2. | Provider/GitHub artifacts exist and first required run is green or owner-accepted. |
| 4 | B9 honest DSAR/legal copy and manual runbook; V2 consent Path A/B decision and proof. | 4 | Public privacy/legal posture, but still mostly source/copy/decision work. | Legal/copy worker owns `/privacy`, `/terms`, settings copy; consent worker owns analytics behavior. | Copy matches actual capability; network proof or owner/legal decision exists. |
| 5 | B5 beta env fail-loud assertion and Vercel env proof. | 4 | Auth/access control can fail closed if wrong, so run after lower-risk local gates. | Single owner; do not combine with unrelated auth refactors. | Vercel readback plus signed-out/allowed/denied proof. |
| 6 | H2 email recipient cap/rate and bounce UX; C1 package-builder quota if AI enablement is planned. | 4 | Cost/abuse controls before wider send or AI surfaces. | Email and AI lanes may run in parallel because write scopes differ. | Targeted tests, provider proof where applicable, env proof for AI disabled/enabled state. |
| 7 | B4 durable log/error sink; B7 support monitoring; H4 readiness endpoint abuse controls. | 3-4 | Ops surfaces depend on chosen sink and can affect production noise/cost. | B4 precedes B7; H4 can run after B4 sink choice. | Test event visible, named owner alerted, readiness endpoint controls proven. |
| 8 | H3 storage quota/spend monitor. | 4 | Spend/user upload control before broader external uploads. | Keep separate from DSAR/storage deletion work. | Quota or monitor threshold has owner evidence and cleanup path. |
| 9 | B6 migration tree/ledger reconciliation. | 5 | Highest DB/DR blast radius except destructive privacy operations. | Must be serialized; no concurrent Supabase migration/type work. | Fresh live-vs-tree inventory, scratch reset parity, reviewer/advisor output, rollback/recovery evidence. |
| 10 | B8 erasure/export capability and runbook. | 5 | Destructive privacy/data operation; run last after DB drift and legal posture are stable. | Must be serialized; DB reviewer separate from implementer. | Count-only dry run, transaction rehearsal, grant proof, owner/legal signoff, runbook evidence. |
| 11 | Final integration, residual-risk review, owner go/no-go, archive move. | 1-5 | Only after all closure evidence exists. | Lead only; verifier/reviewer separate if available. | Folder archived under `.ai/09_archive` and active README/current-state updated. |

## Required lane cards

Before a worker starts a gate, the lead must create or update a lane card in `23`
with these fields:

| Field | Requirement |
|---|---|
| Gate/lane | Exact gate id and short name, such as `B2 validate`. |
| Lead owner | Session/agent that owns integration. |
| Worker owner | Session/agent assigned to the lane, or `lead` for solo work. |
| Write scope | Exact files, folders, provider settings, DB objects, or `read-only`. |
| Conflict zones | Any shared files or provider settings that block parallel work. |
| Loop surface | Direct, `ultrawork`, `ultragoal`, `team`, `autopilot`, `omo:ulw-loop`, or equivalent. |
| Validation | Exact command/provider proof/manual proof expected. |
| Close artifact | Path or provider artifact that will satisfy `08` and `20`. |
| Status | `Unclaimed`, `Active`, `Needs lead integration`, `Parked`, `Blocked`, `Closed`, or `Owner-accepted`. |

## Multi-agent orchestration contract

- The lead orchestrator owns shared docs: `00`-`23`, `.ai/03_plans/README.md`,
  `.ai/10_state/current-state.md`, and any final archive move.
- Workers own only their assigned write scope and their closeout artifact.
- If multiple agents are active, workers do not edit `23` directly unless the lead
  assigned that write scope. They report lane status to the lead, who integrates.
- Workers must re-run `git status --short` and inspect `23` immediately before
  editing and immediately before final report.
- If two lanes need the same source file, migration folder, provider setting, or
  legal copy surface, the lower-risk lane pauses and the lead serializes the work.
- Read-only evidence lanes can run in parallel with source lanes when they do not
  mutate provider state or shared docs.
- Score 5 lanes require maker/checker separation: implementation owner and DB/privacy
  reviewer cannot be the same lane.

## Archive protocol after full resolution

Archive only after Wave 11 passes.

1. Confirm `23` has no active/blocker rows and every required gate has a close artifact.
2. Confirm no implementation work remains uncommitted or unrecorded.
3. Create a final closeout note in the pack named `25-FINAL-RESOLUTION-CLOSEOUT.md`
   or in `.ai/05_logs/launch-readiness/` with:
   - final gate table;
   - validation commands and provider proof references;
   - owner decisions;
   - known accepted risks;
   - archive target.
4. Move the folder to:
   `.ai/09_archive/2026-06-19-Launch-Readiness-Audit-resolved/`.
5. Update `.ai/03_plans/README.md` so the active row points to the archive path and
   says the implementation is resolved.
6. Add a new `.ai/10_state/current-state.md` entry with the archive path and proof
   boundary.
7. Run `git diff --check` on the archive, README, and current-state changes.

Do not archive a partially resolved pack. If only a subset closes, keep this folder
active and update `23`.
