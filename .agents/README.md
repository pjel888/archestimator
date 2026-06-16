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

`shadcn/improve` is installed globally for this machine. Do not add a duplicate
repo-local `.agents/skills/improve/` copy unless the global skill cannot be made
to respect Archestimator's `.ai/03_plans` routing policy.
