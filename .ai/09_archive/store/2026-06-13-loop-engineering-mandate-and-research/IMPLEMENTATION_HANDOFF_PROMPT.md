# Implementation Handoff Prompt

Use this when a future agent needs to apply the loop-engineering mandate to a
real product feature.

```txt
Mode: implementation
Scope: <feature, route, provider, or plan pack>
Non-goals: <explicit exclusions>
Allowed writes: <files/folders>
Disallowed writes: secrets, unrelated files, provider/GitHub/Notion mutation
  unless explicitly scoped
Required reading: AGENTS.md, .ai/README.md,
  .ai/00_system/AGENT_OPERATING_PROTOCOL.md,
  .ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md,
  .ai/10_state/current-state.md, .ai/10_state/decisions.md,
  and the active .ai/03_plans pack

Agent-neutral mandate:
Claude, Codex, OpenCode, CommandCode, Antigravity, Kimi, DeepSeek, Cursor where
approved, Gemini only if explicitly reapproved, and future agents all follow
.ai/00_system. Tool-specific payloads and connectors adapt the loop; they do
not fork policy or reduce proof requirements.

Loop contract:
1. Audit current code/docs/provider boundary before editing.
2. Update or create the dated .ai/03_plans pack if the plan is missing or stale.
3. Put current external or uncertain research in .ai/13_research with source
   dates.
4. Choose the smallest adequate loop surface:
   - direct execution for narrow reversible work;
   - ultrawork for independent in-session lanes;
   - ultragoal for durable goal/checkpoint work;
   - omo:ulw-loop for criterion-led real-surface evidence;
   - autopilot for full clarify-plan-execute-review-QA;
   - omo:ultraresearch for exhaustive cited research;
   - ultraqa for adversarial QA;
   - vercel:agent-browser for browser-facing proof;
   - an equivalent surface in the active agent when the named surface is absent.
5. Execute the next smallest coherent step.
6. Verify through the matching real surface and maker/checker separation.
7. Persist evidence, cleanup receipts, proof boundary, and next decision in the
   appropriate .ai/.omx/.omo artifact.

Validation: <targeted checks plus real-surface proof>
Stop condition: <proven pass, explicit blocker, or owner decision>
Final report: changed files, evidence, proof boundary, validation gaps, and
remaining risks.
```
