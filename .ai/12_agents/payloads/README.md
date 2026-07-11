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

The shared validation contract keeps verification mandatory and defaults
`test_requirement` to `NOT_REQUIRED`. Tests are reserved for explicit
testing/QA work or MVP mission-critical claims that cheaper evidence cannot
prove. Target tests narrowly when required; use broad suites, builds, or browser
proof only for explicit or integrated critical claims. Ordinary edits use the
cheapest decisive non-test evidence and do not create or run tests. Payloads
reference this contract; they must not invent always-on TDD, coverage, or broad
regression gates.

<!-- supermemory-bootstrap: required -->
All payloads inherit the Supermemory local memory contract from
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`. Before meaningful work, run
`bun run supermemory:ensure`. Search configured Supermemory memory before
broad/non-trivial/recovery work and add one sanitized durable update at closeout
when project truth changes. Treat memories as advisory until verified against
`.ai`, source, tests, or provider evidence. Never store secrets there and never
commit `.supermemory/`.

Use `_template.md` for new payloads. Deprecated, unapproved, and non-agent
payloads must still state their fail-closed behavior. Run
`bun run validate:agents` after payload changes to enforce the shared header
schema, allowed status values, fail-closed wording, and `.ai/00_system`
references.
