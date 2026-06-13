# Loop Engineering Research Summary

## Primary External Source

- Addy Osmani, "Loop Engineering", published 2026-06-07, accessed 2026-06-13:
  https://addyosmani.com/blog/loop-engineering/

## Source-Backed Takeaways

Addy Osmani frames loop engineering as designing the system that prompts coding
agents, rather than manually prompting the agent every turn. A loop performs
discovery, hands work out, checks results, records what happened, and decides
the next step until the goal is complete.

The article names the practical ingredients:

- automations for recurring discovery and triage;
- worktrees or equivalent isolation so parallel agents do not collide;
- skills so project knowledge is externalized instead of re-explained;
- plugins/connectors so the loop can touch real tools;
- sub-agents for maker/checker separation;
- durable memory outside the current conversation.

The caution is as important as the leverage: loops can increase token cost and
comprehension debt if the owner stops reviewing the work. Archestimator's
mandate should therefore use loops as a control system with evidence, not as an
excuse to skip engineering judgment.

## Archestimator Interpretation

Archestimator already stores project memory in `.ai`, runtime loop ledgers in
`.omx`/`.omo` when active, and plan packs in `.ai/03_plans`. The update is to
make that flow explicit and portable across coding agents:

```text
discover/audit -> plan pack -> research -> execute -> verify -> persist -> iterate
```

The companion research note with source dates and local skill evidence lives at:
`.ai/13_research/loop-engineering-agentic-product-development-2026-06-13.md`.
