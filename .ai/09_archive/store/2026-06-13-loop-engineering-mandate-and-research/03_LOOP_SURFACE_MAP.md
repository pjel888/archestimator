# Loop Surface Map

## Routing Rule

Use the narrowest loop surface that preserves quality. Do not use a heavyweight
workflow when direct execution proves the result. Do not use direct execution
when the task needs durable state, research convergence, maker/checker
separation, or real-surface proof.

Tool names differ by agent. The policy does not. Claude, Codex, OpenCode,
CommandCode, Antigravity, Kimi, DeepSeek, Cursor where approved, Gemini only if
explicitly reapproved, and future agents must map their local features back to
the same `.ai/00_system` loop contract.

## Surface Matrix

| Surface | Use When | Evidence Boundary |
|---|---|---|
| Direct execution | Narrow, reversible, tightly coupled docs/source changes | Focused command, path, diff, or test proof |
| `ultrawork` | Independent in-session lanes improve speed or coverage | Lightweight integrated evidence; no durable completion claim by itself |
| `ultragoal` | Work needs durable goal state, checkpoints, or resume across stories | `.omx/ultragoal` ledger plus fresh Codex goal snapshots |
| `omo:ulw-loop` | Success criteria need criterion-by-criterion real-surface evidence and cleanup receipts | `.omo/ulw-loop` goals, ledger, criteria evidence, and cleanup receipts |
| `autopilot` | Full lifecycle is desired: clarify, plan, durable execution, review, adversarial QA | Phase state plus handoff artifacts from each gate |
| `omo:ultraresearch` | Research itself must be exhaustive, cited, expansion-driven, and journaled | `.omo/ultraresearch` journal plus `.ai/13_research` synthesis when durable |
| `ultraqa` | User-facing, CLI/runtime, integration, security, or reliability behavior could false-green | Scenario matrix, adversarial checks, commands, artifacts, cleanup |
| `vercel:agent-browser` | Browser-facing claims need real web interaction, screenshots, or DOM proof | Browser action log, snapshot, screenshot, URL/title/text evidence |

## Product Development Defaults

- Plan packs go in `.ai/03_plans/<YYYY-MM-DD>-<slug>/`.
- External or time-sensitive research goes in `.ai/13_research/`.
- Run evidence and proof boundaries go in `.ai/05_logs/` when the run is major.
- Current project truth changes update `.ai/10_state/current-state.md`.
- Durable policy changes update `.ai/10_state/decisions.md`.
- Runtime loop state remains in `.omx`/`.omo` unless a distilled artifact should
  become durable repo knowledge under `.ai`.
