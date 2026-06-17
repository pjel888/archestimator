# 05 — Workflow Friction Analysis

The canonical contract is already lean and proportional; the friction is concentrated in the
adapter layer and in auto-generated tool blocks, not in `.ai/00_system`.

## What slows agents down today

- **Absolutist graph mandates (now neutralized at the entrypoints).** `CLAUDE.md`/`AGENTS.md`/
  `GEMINI.md` told agents to run impact analysis before editing *any* symbol and to use the graph
  *before* `rg`/Read. On narrow edits this forces unnecessary MCP round-trips and token burn, and
  directly contradicts the proportional canonical policy. Fixed by a governing "proportional wins"
  note; fully resolved only when the generators stop re-injecting the blocks.
- **Graph-first skills with no off-ramp.** `.agents/skills/{review-changes,debug-issue,refactor-safely,
  explore-codebase}` prescribe a fixed 5-6 step graph workflow plus a hardcoded ≤5-call/≤800-token
  cap, regardless of task size — friction for small changes and a rigid budget that conflicts with
  the effort-mode tiers.
- **Capability ambiguity in CommandCode.** 16 sentinels expose `tools:"*"` while the roster says
  review-default; an agent must read the README/payload to learn it may not mutate — a missing
  inline guardrail.

## What causes repeated context loading

- **Three coexisting reading orders** (`AGENTS.md` start-here, `.ai/README.md` new-agent order,
  `AGENT_SELF_DIAGNOSTIC` chain) overlap but list slightly different docs (framework protocol vs
  self-diagnostic). Minor, but a new agent reads more than necessary to be sure it has the chain.
- **Large state docs** (`current-state.md` ~459 KB, `decisions.md` ~147 KB) are loaded wholesale
  when a targeted grep would do. The canonical map's "active authority shortcuts" already mitigate
  this; agents should be reminded to grep, not dump (the self-diagnostic protocol says so at :79).
- **Duplicated Codex-delegation policy** in `CLAUDE.md` restates `CODEX.md`/payload content, so two
  files must be kept in sync (and "Review gate is enabled" can silently go stale).

## What causes validation overkill

- Little — `VALIDATION_MATRIX.md` is genuinely proportional (docs-only = path checks + `git diff
  --check`; broad `validate`/`build` reserved for shared/auth/db/release). The risk is the opposite:
  an agent reading the absolutist graph blocks might over-run impact/detect_changes on trivial edits.
- `.commandcode/taste/taste.md` previously pushed the *under*-validation extreme ("skip heavy
  regression … DB can be reset") — now corrected to proportional.

## What can be made thinner

- `CLAUDE.md`: collapse the duplicated Codex-delegation block to a pointer; drop auto-injected
  stale graph statistics.
- `GEMINI.md`: done — the dead-weight graph block on a deprecated lane is gone.
- The injected GitNexus/code-review-graph blocks themselves: regenerate to a thin proportional
  stub rather than the full MUST/NEVER template.

## Where graph tools/indexes should replace brute-force reads

The proportional policy already gets this right: graph/code-review-graph for **broad architecture
questions, high-risk shared-symbol/API refactors, unfamiliar call chains** — exactly the cases
where manual tracing is expensive. The fix was never "use the graph less"; it was "stop mandating
the graph for narrow edits where `rg`/targeted reads/LSP are cheaper and sufficient."

## Which rules are useful but too duplicated

- The proportional graph policy is correctly stated 3× in canonical docs (operating, framework,
  AGENTS Tooling Guidance) — acceptable redundancy because they're consistent and cross-anchored.
- The DB-mandate boundaries are restated across AGENTS / operating / framework / current-state /
  decisions. Consistent, so low-risk, but it's the most-copied block; future edits must touch all
  copies or they drift (the CommandCode taste file is exactly how that drift happened).
- The agent roster appears in `12_agents/README.md` and `AGENT_OPERATING_PROTOCOL.md` "Default
  roles." Keep `12_agents/README.md` canonical; the operating-protocol copy should stay a summary.
