---
name: archestimator-plan-pack
description: "Archestimator-specific planning discipline: when to spin a dated .ai/03_plans/<YYYY-MM-DD>-<slug>/ plan pack with a LOOP_LEDGER.md vs running a lightweight in-session loop, plus the DISCOVER -> PLAN -> EXECUTE -> VERIFY -> RECORD -> DECIDE loop contract. Use when starting non-trivial work and deciding whether a durable plan pack is warranted, or when spinning one up and needing the canonical structure."
---

<!-- ARCHESTIMATOR REPO-LOCAL OVERRIDE — additive; preserve through fleet 3-way merge. Do not delete. -->
> **ArchEstimator repo policy (override):** Generic planning skills (ce-plan, plan, writing-plans) do NOT know the dated `.ai/03_plans/<YYYY-MM-DD>-<slug>/` convention or the `LOOP_LEDGER.md` coordination pattern. This skill binds those generic tools to Archestimator's actual planning contract. Canonical authority: `AGENTS.md` ("Orchestration And Loop Engineering"), `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation criteria and bounds"); `.ai` wins on any conflict.
<!-- END ARCHESTIMATOR REPO-LOCAL OVERRIDE -->

## Archestimator Plan Pack Discipline

This skill is a thin **project-specific binding** on top of generic planning
skills. It encodes the two Archestimator-specific decisions every non-trivial
task must make up front: (1) plan pack vs in-session loop, and (2) the named
loop shape. It does NOT replace `ce-plan`/`plan`/`writing-plans` — it tells the
agent which to use when and where the durable artifact lives.

### 1. Decide: plan pack or in-session loop?

Default to the **lightest path**. A dated `.ai/03_plans/<YYYY-MM-DD>-<slug>/`
plan pack + `LOOP_LEDGER.md` is **required only for HIGH-BLAST-RADIUS** work,
where a wrong move is expensive or hard to reverse:

- Database / Supabase / RLS / RPC / migration / generated-types changes.
- Auth, invites, publication, or shared-link flows.
- Security, data integrity, or launch / release readiness.
- Cross-cutting or codebase-wide refactors / audits / architecture changes.
- Agent-framework / prompt / payload / orchestration changes.
- Anything the owner explicitly asks to be planned exhaustively.

**Ordinary non-trivial work** (a normal feature, a multi-file edit within one
area, a component/hook change, a focused perf fix, routine debugging) does NOT
need a plan pack. Run a lightweight in-session loop and escalate only if the
work turns out to touch a high-blast-radius surface above.

**Trivial work** (typos, narrow docs cleanup, one-line reversible fixes,
bounded formatting) needs neither — edit directly and verify proportionally.

Source: `AGENT_OPERATING_PROTOCOL.md` "Loop activation criteria and bounds".

### 2. Spin a plan pack (when warranted)

Path: `.ai/03_plans/<YYYY-MM-DD>-<slug>/` (date-prefixed, kebab-case slug).

Minimum durable artifacts:

- `00-PLAN.md` (or `00-README.md`) — goal, scope, non-goals, orchestration
  (who owns what / disjoint file scopes), stop condition, acceptance criteria.
- `LOOP_LEDGER.md` — append-only coordination log. Each lane logs STARTED,
  conflicts it hit (first-writer-wins on a name collision), and a final
  COMPLETE marker with a one-line result. Never edit another lane's entry.
- A `GOAL.md` if the lead wants a separate concrete-deliverables + success-
  criteria doc (this repo uses both shapes; match the lead's call).

Optionally add numbered working docs (`NN-TOPIC.md`) for audits, threat models,
data contracts, runbooks, etc. Look at sibling packs (e.g.
`2026-06-20-Library-Page-Overall-Improvement/`, `2026-06-21-ZCode-Skill-Parity/`)
for the established shape before inventing a new one.

### 3. The loop (named, for both plan-pack and in-session work)

```
DISCOVER current repo truth
  -> PLAN in-session OR in .ai/03_plans/<date>-<slug>/ when required
  -> EXECUTE the next smallest coherent change
  -> VERIFY with the narrowest evidence that proves the change
  -> RECORD evidence, proof boundary, gaps, next decision
  -> DECIDE iterate / stop / escalate
```

Stop only when one is true: (1) proven pass against acceptance criteria;
(2) explicit blocker with evidence; (3) owner decision required; (4) a
destructive / paid / production / cross-provider action needs fresh approval;
(5) iteration cap reached (default 3–6) with remaining risks recorded.

Durable loop artifacts live in `.ai` (or `.omx`/`.omo`/issue tracker), not
chat. Reusable prompt: `.ai/08_prompts/templates/codebase-ai-loop-task.md`.

### 4. Loop surface routing (pick by task shape)

- Direct execution — small, reversible, tightly coupled work.
- `ultrawork` — in-session parallel lanes with lightweight evidence.
- `ultragoal` — durable goal state, checkpoints, resume across stories.
- `omo:ulw-loop` — criterion-by-criterion real-surface evidence + receipts.
- `autopilot` — full clarify -> plan -> execute -> review -> QA lifecycle.
- `omo:ultraresearch` / `ultraqa` / `vercel:agent-browser` — when the claim
  depends on exhaustive cited research / adversarial QA / real web behavior.

### 5. Proportionality reminder

A loop/plan increases speed, quality, and memory — it is NOT ceremony.
Verification stays proportional to risk (`VALIDATION_MATRIX.md`).
Maker/checker separation is expected for non-trivial work when practical.
Never stop on a worker self-report, a plan doc, or one green check unless the
whole requested outcome is proven by matching real-surface evidence.
