# GOAL — Canonical IMPLEMENTATION_PLAN.md (Create-Implementation-Prompt pass)

> Created: 2026-06-25 by the Sisyphus lead orchestrator running the
> `Create-Implementation-Prompt.md` template against this plan pack.
> Companion to [LOOP_LEDGER.md](./LOOP_LEDGER.md) and the eventual
> `IMPLEMENTATION_PLAN.md`.

## Intended outcome

Produce one authoritative, executable, source-traceable
`<PLANNING_FOLDER>/IMPLEMENTATION_PLAN.md` that satisfies the 22-section
contract defined in
`.ai/08_prompts/000_Planning Prompts/Create-Implementation-Prompt.md`. Any
future codebase AI must be able to execute the plan without reinterpreting the
original feature intent.

## Scope and non-goals

**In scope**

- Reading all 31 source documents inside this plan pack.
- Synthesizing one canonical `IMPLEMENTATION_PLAN.md` (no number prefix, exact
  name per template line 113-115) with the 22 mandated sections.
- Source-citing every requirement, assumption, and inference.
- Scoring the plan 1-100 across the eight template dimensions.
- Adversarial review and independent verification passes per template
  lines 314-344.

**Non-goals (hard)**

- No app code, component, hook, route, server action, RPC, migration,
  infrastructure, environment, CI, or production changes.
- No execution of the implementation itself — this is a *planning* task per
  template line 7.
- No execution of Tracks 1-6 in [30-HANDOFF.md](./30-HANDOFF.md) — those are
  separate future work.
- No edits to the existing stub at
  [18-IMPLEMENTATION-PLAN.md](./18-IMPLEMENTATION-PLAN.md); it remains as a
  historical artifact and is referenced (not replaced) by the new canonical
  plan.
- No edits outside this plan pack folder. The worktree has 30+ unrelated
  modified files from other agents and must not be touched.

## Major workstreams

The template mandates at least six specialist agents plus a lead coordinator,
an adversarial reviewer, and an independent verifier. Lane assignments:

| Lane | Specialist | Template sections owned |
|---|---|---|
| L1 | Source & Requirements Analyst | §2 Source References, §3 Scope, §18 Pros/Cons, §19 SWOT, §21 Requirements Traceability, §22 Open Decisions |
| L2 | Architecture & Tech Lead | §4 Current-State Analysis, §7 Technical Architecture, §13 File-Level Change Map |
| L3 | UX/UI/A11y Designer | §6 UX and Interface Plan |
| L4 | Backend + DB + Security Lead | §8 Data and Database Plan, §9 Security and Privacy, §11 Blast-Radius Analysis |
| L5 | Performance + Testing + Deployment Lead | §10 Performance and Reliability, §14 Testing Strategy, §15 Deployment and Rollout, §16 Observability and Operations |
| L6 | Risk & Phased Implementation Lead | §12 Phased Implementation, §17 Risk Register, §20 Definition of Done |
| Lead | Sisyphus (this orchestrator) | §1 Executive Summary, §5 Target-State Design (synthesis) |
| R1 | Adversarial Reviewer | Challenge plan completeness, traceability, technical/operational risks |
| R2 | Independent Verifier | Implementation-readiness verification pass |

Lanes run in **two waves**: Wave 1 (L1-L6 parallel) → Wave 2 (lead synthesis)
→ Wave 3 (R1 + R2 parallel) → Wave 4 (lead reconciliation + scoring).

## Constraints and safety requirements

- **File ownership**: each lane only reads source docs and writes to its own
  scratch section content returned to the lead. The lead is the sole writer of
  the canonical `IMPLEMENTATION_PLAN.md`.
- **No fabrication**: every requirement must trace to a source doc. Label
  inferences and assumptions explicitly (template line 89).
- **Concurrent-repository safety**: the worktree is shared. Before any write,
  re-check git state. Never overwrite, revert, or delete unfamiliar changes.
- **Time budget**: the prior `Improve-Plan-Prompt` pass had 7 subagents time
  out at the 30-minute queue limit (see
  [30-HANDOFF.md](./30-HANDOFF.md) Track 1). If any Wave-1 lane times out, the
  lead falls back to direct authoring of that lane's sections using the source
  docs (template line 70 fallback clause).
- **Scope boundary**: this is a docs-only deliverable. No Supabase, no Vercel,
  no GitHub, no env, no CI changes. The standing DB-autonomy mandate is **not
  invoked** by this task.

## Acceptance criteria

1. `<PLANNING_FOLDER>/IMPLEMENTATION_PLAN.md` exists with all 22 sections in
   the template's numbered order.
2. Every requirement citation in the plan resolves to a real file:section in
   this plan pack (spot-checked by R2).
3. No fabricated requirements; every assumption labeled.
4. Phased plan covers Phase 1 (Persistence Honesty) tasks 1.1-1.6 and
   references Phases 2-4 stubs from the existing 18-IMPLEMENTATION-PLAN.md.
5. Adversarial reviewer (R1) returns a verdict.
6. Independent verifier (R2) returns a verdict and an implementation-readiness
   score.
7. The plan is scored 1-100 across the eight dimensions in template
   lines 322-331.
8. [00-README.md](./00-README.md) artifact index gains an entry pointing to
   the new canonical plan.
9. [LOOP_LEDGER.md](./LOOP_LEDGER.md) records lane STARTED + COMPLETE markers
   for every lane.

## Validation requirements

- `grep -c "^## " IMPLEMENTATION_PLAN.md` returns >= 22.
- `git diff --name-only` shows ONLY files inside this plan pack folder.
- `git status` shows `18-IMPLEMENTATION-PLAN.md` unchanged.
- Manual spot-check: pick 5 random source citations from the new plan; each
  must resolve to the cited file and section heading.

## Final deliverables

1. `<PLANNING_FOLDER>/IMPLEMENTATION_PLAN.md` — the canonical 22-section plan.
2. Updated [00-README.md](./00-README.md) — artifact index entry.
3. Updated [LOOP_LEDGER.md](./LOOP_LEDGER.md) — Wave 1/2/3/4 markers + final
   COMPLETE entry with score.
4. Optional: `31-INDEPENDENT-VERIFICATION.md` if R2 produces one (per
   Track 1 of [30-HANDOFF.md](./30-HANDOFF.md)).
