# Overnight Autonomous Implementation Runbook

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`,
> `superpowers:subagent-driven-development`, `ultrawork`, `ultragoal`, `team`,
> `autopilot`, `omo:ulw-loop`, or an agent-neutral equivalent selected by the lead.
> Steps use checkbox syntax for tracking. This runbook is the sleeping-owner protocol:
> do not stop on ordinary unanswered questions; classify them, apply the default when
> safe, record the assumption, and keep moving to the next authorized lane.

**Goal:** Let a codebase AI agent implement launch-readiness gates overnight without
blocking on low-risk questions, while still protecting source, provider, database,
legal, and production safety boundaries.

**Architecture:** `22-IMPLEMENTATION-EXECUTION-CONTROL-PLAN.md` controls gate order,
`23-IMPLEMENTATION-COORDINATION-LEDGER.md` tracks active/parked/closed lanes, and
this file defines autonomy defaults for unanswered questions. Questions become
records, not chat blockers, unless they cross a hard safety boundary.

**Tech Stack:** Next.js 16, React 19, Bun, TypeScript, Tailwind v4, Supabase/Postgres
project `ebxxqidacheyapmmzavr`, Vercel, GitHub Actions, Resend, `.ai` durable state,
and git with Lore-protocol commit messages when committing is used.

---

## User authorization interpretation

Philip's instruction "I trust you with everything" authorizes autonomous progress
inside this launch-readiness implementation scope. It does not cancel the standing
safety boundaries in `AGENTS.md`, `.ai/10_state/current-state.md`, or `04`.

| Action class | Overnight default |
|---|---|
| Local source edits inside claimed lane scope | Authorized. Proceed, test, record. |
| Docs, run logs, close artifacts, coordination ledger updates | Authorized. Proceed. |
| Git commits for closed, verified lane checkpoints | Authorized if the executing agent has commit authority; use Lore trailers and do not commit unrelated dirty work. |
| Supabase/Postgres changes in project `ebxxqidacheyapmmzavr` | Authorized under the standing DB mandate, but score-5 lanes still require dry run, reviewer/maker separation, rollback/recovery proof, and no irreversible real-user data loss. |
| Provider reads for GitHub, Vercel, Supabase, Resend | Authorized when credentials are available and the project/account is verified. Record readback evidence. |
| Reversible provider mutations required by a gate | Authorized only when rollback is documented, the exact project/account is verified, and no paid add-on or production deploy is triggered. |
| Paid add-ons, PITR enablement, new billing commitments | Not authorized overnight. Park the lane and record the question. |
| Production deploy or promotion | Not authorized overnight unless the current execution prompt explicitly asks for deploy. Build/test locally instead. |
| Irreversible destructive action on real user/provider data | Not authorized overnight. Implement dry-run/test/rehearsal only, then park for owner review. |
| Unrelated provider project, secrets, credentials, or private data exposure | Not authorized. Stop that lane immediately and record a blocker. |

## Unanswered-question protocol

When an unanswered question appears, classify it within 10 minutes of discovery.
Do not wait in chat while the owner is asleep unless no safe lane remains.

| Class | Meaning | Default action | Record in `23` |
|---|---|---|---|
| Q0 source-resolvable | The answer can be found in source, tests, `.ai`, provider readback, or official docs. | Research it, cite the local/provider evidence, then continue. | Closure or assumption row only if the answer affects scope. |
| Q1 preference with safe default | Product/copy/UX preference where a conservative default exists. | Choose the safer, stricter, more reversible default and continue. | Question ledger row with chosen default. |
| Q2 credential/provider unavailable | Credentials, dashboard, provider API, or account access is missing. | Complete all local/source/test work, then park provider proof. Move to next lane. | Parked-lane row. |
| Q3 paid/destructive/production/legal authority | The answer would authorize spend, production deploy, real-user deletion, legal promise, or irreversible state. | Do not guess. Park the lane after local dry-run/rehearsal work. | Blocker or parked-lane row requiring owner decision. |
| Q4 contradiction or stale plan conflict | Canonical docs or source disagree and no local evidence resolves it. | Spend one focused discovery loop. If unresolved, choose the stricter safety path or park. | Conflict log row with evidence. |

## Default answers while owner is unavailable

These defaults are preselected for overnight work. A future owner decision may change
them, but agents should not stop for these questions during the run.

| Question | Default answer | Why this default is safe |
|---|---|---|
| What beta cohort should fixes target? | Named design-partner beta, not public/self-serve launch. | Matches `07`; limits blast radius and avoids accidental broad release. |
| Should validation be fixed or split? | Fix `bun run validate` to pass. Split only if a check is intentionally advisory and the hard gate remains strict. | Stronger gate, less policy ambiguity. |
| What should happen on missing beta env? | Fail closed and loud. | Prevents accidental access expansion. |
| Which consent path should be implemented if legal is unavailable? | Path A: do not fire analytics before consent. | More privacy-preserving than relying on legitimate-interest judgment. |
| What should DSAR/legal copy promise overnight? | Honest manual process, no self-serve promise, no precise SLA unless already recorded. | Prevents false capability/legal claims. |
| Who is the support owner if a name is required? | Use Philip for owner-only closed beta records, but do not close wider-beta B7 without an alert path and coverage evidence. | Records current reality without overclaiming operational readiness. |
| Which observability sink should be used if provider choice is unanswered? | Build source-safe logging/error boundaries and park external sink selection unless a no-cost reversible provider path is already available. | Avoids surprise dependencies, billing, or PII retention choices. |
| Should AI be enabled? | No. Keep AI disabled unless the prompt explicitly enables it after C1 quota proof. | Avoids cost/write-risk expansion. |
| Should DB drift or erasure touch real user data overnight? | No irreversible real-user destructive action. Use scratch reset, dry run, transaction rehearsal, and tests. | Preserves recovery and owner review. |
| Should browser/Playwright proof run? | Only when the gate requires interaction/routing/auth/data/responsive/accessibility proof that static/tests cannot prove. | Matches Codex App speed guardrail and avoids slow irrelevant proof. |
| Should unrelated dirty files be touched? | No. Avoid them or create an isolated worktree if the executor supports it. | Prevents overwriting other work. |

## Overnight lane loop

Use this loop for every lane selected from `22`.

- [ ] **Step 1: Bootstrap**
  - Read `AGENTS.md`, `.ai/10_state/current-state.md` Fast Path, `22`, `23`, and this file.
  - Run `git status --short`.
  - Record the lane claim in `23` before editing.

- [ ] **Step 2: Boundary check**
  - Confirm the gate id, blast score, authority class, write scope, conflict zones,
    validation command, and close artifact path.
  - If the lane touches a dirty file outside the claim, pause that file and either
    pick a non-conflicting lane or create an isolated worktree if available.

- [ ] **Step 3: First failing proof**
  - For source behavior, add or identify a focused test/proof that fails or currently
    demonstrates the missing gate.
  - For provider/readback gates, capture before-state readback.
  - For docs/legal/copy, capture the stale or missing text.

- [ ] **Step 4: Minimal implementation**
  - Make the smallest coherent change that moves the gate toward closure.
  - Do not bundle unrelated cleanup.

- [ ] **Step 5: Verification**
  - Run the gate's focused proof.
  - Run `bun run type-check` when TypeScript contracts changed.
  - Run `git diff --check` before recording closure.
  - Run broader validation only when the gate's blast radius justifies it.

- [ ] **Step 6: Record**
  - Update `23` with status, evidence, unanswered questions, conflicts, or closure.
  - Write the close artifact under `.ai/05_logs/launch-readiness/` or the owner pack.
  - If committing, commit only the closed lane scope with a Lore-protocol message.

- [ ] **Step 7: Decide**
  - If closed, move to the next wave.
  - If blocked by Q2-Q4, park the lane and move to the next safe lane.
  - If no safe lane remains, stop and leave a morning handoff.

## Parking protocol

A parked lane is not a failure. It is the correct state when the agent made all safe
progress and the remaining action needs unavailable authority or evidence.

To park a lane:

1. Leave the working tree clean for that lane, or clearly record any partial diff.
2. Add a row to `23` under `Parked lane log`.
3. Include the exact unanswered question, question class, evidence already collected,
   local work completed, and the next command/action once the owner answers.
4. Continue with the next lower-risk unblocked lane.

## Overnight hard stops

Stop the whole run only when all are true: no safe unclaimed or parked-independent
lane remains, and at least one of these blockers exists:

- required credential/provider access is unavailable;
- next action is paid, production-deploying, or destructive without recovery;
- migration/generated-type conflicts cannot be isolated from unrelated dirty work;
- tests/build are red from outside the current lane and cannot be separated;
- source and canonical docs contradict each other after one focused discovery loop;
- security compromise or secret exposure is suspected.

## Morning handoff format

The overnight agent's final message or close artifact must include:

| Field | Required content |
|---|---|
| Gates closed | Gate ids, evidence paths, commit ids if any. |
| Gates parked | Gate ids, question class, owner answer needed, safe work already completed. |
| Validation run | Commands/provider reads/manual proof and pass/fail. |
| Files changed | Exact paths, grouped by lane. |
| Provider/DB mutations | Exact account/project, before/after, rollback path. |
| Residual risk | Any row still medium/low in `21`. |
| Next safe lane | The next recommended unblocked lane from `22`. |
