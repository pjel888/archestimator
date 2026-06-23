# IMPLEMENTATION — Start Here

**Purpose:** This folder is the operational front door for the codebase AI to execute the UX audit plan pack. The 709 planning files in the parent folder are READ-ONLY specifications; this folder is the LIVE execution layer.

**Started:** 2026-06-23
**Owner:** Codebase AI (any agent: Claude, Codex, OpenCode, etc.) under Sisyphus orchestrator discipline.
**Canonical plan source:** [../00-README-INDEX.md](../00-README-INDEX.md) · [../PHASE-ANALYSIS.md](../PHASE-ANALYSIS.md)
**Canonical audit source (read-only):** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)

---

## What this folder is (and is not)

| Is | Is not |
|---|---|
| The "open this first" entry point for any coding agent | A replacement for the per-issue plan folders |
| A live ledger of execution status across all 44 UX issues | A duplicate of the planning `LOOP_LEDGER.md` (which tracks planning completeness, not execution) |
| A binding operating contract (rules the agent must follow) | A spec; specs live in the canonical audit and per-issue folders |
| A session handoff mechanism | A git commit log or CI surface |

---

## Read order (mandatory)

A coding agent picking up this pack for the first time must read, in order:

1. **This file** (`README.md`) — orientation.
2. **[01-AGENT-OPERATING-CONTRACT.md](01-AGENT-OPERATING-CONTRACT.md)** — binding rules. Non-negotiable.
3. **[02-EXECUTION-SEQUENCE.md](02-EXECUTION-SEQUENCE.md)** — what to pick next, exit gates per phase.
4. **[03-EXECUTION-LEDGER.md](03-EXECUTION-LEDGER.md)** — current status of every `UX-NNN`. Update this as you work.
5. **[04-SESSION-HANDOFF-TEMPLATE.md](04-SESSION-HANDOFF-TEMPLATE.md)** — copy this when ending a session mid-issue.

Then read the per-issue folder for whatever you pick (e.g. `../phase-1/UX-002-beta-access-status/00-README.md` first, then `01`–`08` in order).

---

## The 60-second contract (TL;DR)

If you read nothing else, read this:

1. **Pick by phase, then by conflict-group safety.** Phase 1 first (beta gate). Never two issues from the same conflict group in parallel without the named lead.
2. **RED before GREEN.** Every issue gets a failing test first. Capture RED output to `06-VERIFICATION-AND-PROOF.md` in the issue folder. No exceptions, no "I'll add tests later."
3. **No-shift toast feedback.** Transient errors are fixed-position toasts with scoped IDs. No reflowing inline errors, banners, or focus jumps. See [../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md](../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md).
4. **Decision gates are hard stops.** UX-015, UX-031, UX-039 are gated. Do not start them without a fresh owner decision recorded in `03-EXECUTION-LEDGER.md`. Scope locks on UX-027, UX-032, UX-039 are binding.
5. **Update the ledger.** Move an issue from `planned` → `in-progress` → `implemented` → `verified` in [03-EXECUTION-LEDGER.md](03-EXECUTION-LEDGER.md) as you work. Stale ledger = broken handoff.
6. **Proportional verification per AGENTS.md.** Narrow source change → type/LSP check or targeted test. Shared logic, auth, DB, security, release → targeted tests + broader `bun run validate`/`bun run build`.
7. **No provider claims from local checks.** Local type-check passing ≠ Vercel/Supabase/GitHub/production proof. Tag evidence honestly: `not-run`, `local-only`, `browser-verified`, `provider-verified`, `manual-verified`.
8. **Ponytail on diff size.** Smallest coherent edit. No unrequested abstractions. No boilerplate for later. No cleanup of surrounding code unless asked.
9. **Branch per issue (or per conflict group).** Never commit to `main` without explicit owner request. See [04-SESSION-HANDOFF-TEMPLATE.md](04-SESSION-HANDOFF-TEMPLATE.md).
10. **Honest reporting.** Tests fail → say so with output. Did not run → say "did not run." Pre-existing failures → note them separately.

---

## File index

| # | File | Status | Purpose |
|---|---|---|---|
| 01 | [01-AGENT-OPERATING-CONTRACT.md](01-AGENT-OPERATING-CONTRACT.md) | binding | Loop contract, RED/GREEN, no-shift toast, conflict groups, decision gates, evidence vocabulary |
| 02 | [02-EXECUTION-SEQUENCE.md](02-EXECUTION-SEQUENCE.md) | binding | Phase order, wave structure, parallelization rules, exit gates |
| 03 | [03-EXECUTION-LEDGER.md](03-EXECUTION-LEDGER.md) | **live** | Per-issue status tracker. Update every session. |
| 04 | [04-SESSION-HANDOFF-TEMPLATE.md](04-SESSION-HANDOFF-TEMPLATE.md) | template | Copy when handing off mid-issue |

---

## Quick navigation

- **"What do I work on next?"** → [02-EXECUTION-SEQUENCE.md § Next Pick](02-EXECUTION-SEQUENCE.md#next-pick)
- **"What's the current status of UX-NNN?"** → [03-EXECUTION-LEDGER.md](03-EXECUTION-LEDGER.md)
- **"Can I parallelize UX-X and UX-Y?"** → [../00-README-INDEX.md § Conflict Groups](../00-README-INDEX.md#conflict-groups-parallelization-hazard-map)
- **"Is UX-NNN gated?"** → [03-EXECUTION-LEDGER.md § Decision Gates](03-EXECUTION-LEDGER.md#decision-gates)
- **"What copy/states must the UI render?"** → `../phase-N/UX-NNN-slug/03-TARGET-EXPERIENCE.md`
- **"What tests prove this is done?"** → `../phase-N/UX-NNN-slug/06-VERIFICATION-AND-PROOF.md`
- **"I'm stuck / blocked."** → [03-EXECUTION-LEDGER.md § Blockers](03-EXECUTION-LEDGER.md#blockers) + [04-SESSION-HANDOFF-TEMPLATE.md](04-SESSION-HANDOFF-TEMPLATE.md)

---

## Authority and precedence

This folder is subordinate to:

1. `AGENTS.md` (repo root) — operating mode, verification policy, ponytail proportional graph rule.
2. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — loop activation criteria and bounds.
3. `../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md` — 2026-06-23 owner decisions and no-shift toast contract.
4. `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/` — canonical audit (read-only).

If this folder ever conflicts with the above, the above wins. Update this folder to match.
