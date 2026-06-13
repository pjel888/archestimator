# Loop Engineering For Agentic Product Development

**Date:** 2026-06-13
**Status:** source-backed workflow research
**Primary external source:** Addy Osmani, "Loop Engineering", published
2026-06-07, accessed 2026-06-13:
https://addyosmani.com/blog/loop-engineering/
**Related plan pack:** `.ai/09_archive/store/2026-06-13-loop-engineering-mandate-and-research/`

## Research Question

How should Archestimator update its usual product-development flow so agents do
less one-off prompting and more loop engineering while preserving the existing
`.ai/03_plans` audit/plan-pack and research habits across coding agents?

## Source Summary

Osmani describes loop engineering as designing the system that prompts coding
agents. The loop performs discovery, assigns work, checks results, writes down
what happened, and decides the next step until the goal is complete.

The article identifies six practical loop ingredients:

1. Automations for scheduled discovery and triage.
2. Worktrees or isolation for safe parallel agent work.
3. Skills for durable project knowledge.
4. Plugins/connectors for real tool access.
5. Sub-agents for maker/checker separation.
6. Memory outside the current conversation.

The article also warns that loops can increase token cost, unattended mistakes,
and comprehension debt if engineers stop reviewing the output.

## Local Workflow Evidence Loaded

The current Archestimator session inspected these local workflow contracts on
2026-06-13:

- `AGENTS.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/03_plans/README.md`
- `.ai/13_research/README.md`
- `.ai/12_agents/README.md`
- `.ai/12_agents/payloads/README.md`
- `/Users/philiplewis/.codex/skills/ultragoal/SKILL.md`
- `/Users/philiplewis/.codex/skills/ultraqa/SKILL.md`
- `/Users/philiplewis/.codex/skills/ultrawork/SKILL.md`
- `/Users/philiplewis/.codex/skills/autopilot/SKILL.md`
- `/Users/philiplewis/.codex/plugins/cache/sisyphuslabs/omo/4.9.2/skills/ultraresearch/SKILL.md`
- `/Users/philiplewis/.codex/plugins/cache/sisyphuslabs/omo/4.9.2/skills/ulw-loop/SKILL.md`
- `/Users/philiplewis/.codex/plugins/cache/openai-curated/vercel/c6ea566d/skills/agent-browser/SKILL.md`

## Archestimator Loop Mapping

| Loop ingredient | Archestimator surface | Mandate implication |
|---|---|---|
| Discovery and triage | `.ai/10_state`, audits, plan packs, issue/provider evidence | Start non-trivial work by proving current reality. |
| Durable plan | `.ai/03_plans/<YYYY-MM-DD>-<slug>/` | Keep the plan pack as the loop's work contract. |
| Research | `.ai/13_research/` and `omo:ultraresearch` when exhaustive | Put source-dated claims outside chat. |
| Parallel helpers | `ultrawork`, native subagents, `team` when active | Split independent lanes only when it improves speed or coverage. |
| Durable execution | `ultragoal`, `omo:ulw-loop`, `.omx`/`.omo` ledgers | Use a ledger when work must resume or criteria must be proven. |
| Full lifecycle | `autopilot` | Use for clarify -> plan -> execute -> review -> adversarial QA. |
| Adversarial checking | `ultraqa` | Require dynamic scenario proof where false greens are likely. |
| Browser proof | `vercel:agent-browser` | Use real browser action/screenshot/snapshot proof for browser claims. |
| Memory | `.ai`, `.omx`, `.omo`, issues, provider proof packets | Do not rely on chat as the durable memory layer. |

## Cross-Agent Compatibility

The loop mandate is tool-neutral. Claude, Codex, OpenCode, CommandCode,
Antigravity, Kimi, DeepSeek, Cursor where approved, Gemini only if explicitly
reapproved, and future agents should all use the same repo-local loop spine:

```text
discover/audit -> .ai plan pack -> source-backed research -> loop execution
-> maker/checker verification -> real-surface proof -> durable memory
-> next decision
```

Agent-specific features can differ. A Claude team, Codex goal, OpenCode session,
Antigravity terminal lane, or future connector should map to the same roles:
lead orchestrator, bounded worker, reviewer/checker, QA/evidence lane, durable
state, and stop condition. If a tool lacks a named surface, use its nearest safe
equivalent and record the substitution in the plan or run log.

## Mandate Recommendation

Archestimator should describe non-trivial product work as loop-engineered and
agent-neutral. The loop must stay proportional. Narrow reversible fixes can run
directly. Broad, ambiguous, user-facing, provider-facing, research-heavy, or
multi-lane work should preserve the loop spine and record evidence outside chat.

## Caveats

- This research updates repo-local governance. It does not prove that any
  runtime workflow is available in every surface.
- Some OMX surfaces are runtime-dependent and may require an attached tmux OMX
  CLI shell.
- Workflow claims should be refreshed if future implementation depends on
  current external product docs rather than the installed local skill contracts.
