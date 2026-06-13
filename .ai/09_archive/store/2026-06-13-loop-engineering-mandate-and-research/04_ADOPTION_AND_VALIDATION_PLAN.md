# Adoption And Validation Plan

## Adoption

1. Update canonical mandate docs:
   - `AGENTS.md`
   - `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
   - `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
2. Add durable decision and current-state links:
   - `.ai/10_state/decisions.md`
   - `.ai/10_state/current-state.md`
   - `.ai/10_state/execution-ledger.md`
3. Add plan/research discoverability:
   - `.ai/03_plans/README.md`
   - `.ai/13_research/README.md`
   - `.ai/11_skills/README.md`
   - `.ai/08_prompts/templates/agent-workflow-template-library.md`
4. Preserve proportionality and cross-agent portability:
   - direct execution for small work;
   - loop surfaces for non-trivial work where durable state, research,
     maker/checker review, or real-surface proof matters;
   - all agent-specific adapters inherit `.ai/00_system`.

## Validation

Docs-only validation is sufficient for this pack:

```bash
git diff --check
test -d .ai/09_archive/store/2026-06-13-loop-engineering-mandate-and-research
test -f .ai/13_research/loop-engineering-agentic-product-development-2026-06-13.md
```

No `bun run validate`, browser smoke, provider check, or `agent-browser` run is
required because this pack does not change application source or runtime
behavior.

## Residual Risks

- Future agents can still overuse loops for small work. The mandate explicitly
  keeps direct execution valid for narrow, reversible changes.
- Runtime workflow availability depends on the surface. For example, some OMX
  team/question surfaces require an attached tmux OMX CLI shell.
- Research can become stale. Time-sensitive workflow claims should be refreshed
  when they drive a future implementation decision.
