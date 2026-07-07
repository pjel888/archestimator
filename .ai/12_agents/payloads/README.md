# Agent Payloads

Payloads define role-specific constraints for each agent or harness. They are
thin adapters to shared project rules, not independent policy.

Default startup is intentionally small:

1. `AGENTS.md`
2. The FAST PATH block at the top of `.ai/10_state/current-state.md`

Pull shared `.ai/00_system` files, decisions, specs, design, roadmap, plans,
bugs, or provider evidence only when the task's scope or risk needs them. Use
`rg` for `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` instead
of preloading the full history files.

All payloads inherit the orchestrator-led routing contract from
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`: the active lead chooses lane,
model/effort tier, loop role, and whether parallel execution is worth the token
cost. Payloads may declare defaults and constraints, but they must not fork that
policy.

All payloads also inherit the loop-engineering contract from
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`: ordinary non-trivial work runs a
bounded in-session loop, while high-blast-radius or explicitly exhaustive work
adds a dated `.ai/03_plans` plan pack + `LOOP_LEDGER.md`. Claude, Codex,
OpenCode, CommandCode, Antigravity, Kimi, DeepSeek, Gemini only if explicitly
reapproved, and future payloads must map their local capabilities back to that
shared loop.

All payloads inherit the Supermemory local memory contract from
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`. Before meaningful work, check
`http://localhost:6767/`; if it is down and the harness can start local
processes, run `bun run supermemory:start` in the background and retry.
Search configured Supermemory memory before broad/non-trivial work and update
it at closeout when durable project truth changes. Treat memories as advisory
until verified against `.ai`, source, tests, or provider evidence. Never store
secrets there and never commit `.supermemory/`.

Use `_template.md` for new payloads. Deprecated, unapproved, and non-agent
payloads must still state their fail-closed behavior. Run
`bun run validate:agents` after payload changes to enforce the shared header
schema, allowed status values, fail-closed wording, and `.ai/00_system`
references.
