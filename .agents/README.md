# `.agents` Compatibility Adapter

`.agents/` contains local skill/playbook compatibility files only. It is not a
separate Archestimator project brain.

Canonical rules live in:

1. `AGENTS.md`
2. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
3. `.ai/12_agents/README.md`
4. `.ai/12_agents/payloads/`
5. `.ai/11_skills/`

If a skill here conflicts with `.ai/00_system` or `.ai/12_agents`, the `.ai`
source wins. Do not store secrets or durable project decisions in this folder.

Every local or installed skill/plugin, including Ultragoal, UltraQA, Ultrawork,
Autopilot, Autoresearch, Autoresearch Goal, and Compound Engineering, is
subordinate to the Lean Engineering Ethos. Map the evidence-supported blast
radius, prefer the smallest coherent change and fewest useful lanes/artifacts,
minimize token/time/tool cost, and never auto-run tests/builds/browser QA without
an explicit user-authorized `TEST_TASK`.

<!-- supermemory-bootstrap: required -->
Skills and compatibility adapters inherit the shared Supermemory workflow from
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`: run `bun run supermemory:ensure`
before meaningful work, search relevant memory before broad/non-trivial work,
and add a sanitized durable update at closeout when project truth changes.
Supermemory is advisory; `.ai` and current source remain authoritative.

`shadcn/improve` is installed globally for this machine. Do not add a duplicate
repo-local `.agents/skills/improve/` copy unless the global skill cannot be made
to respect Archestimator's `.ai/03_plans` routing policy.
