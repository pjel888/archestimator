# Skills

This folder documents reusable Archestimator procedures and playbooks.

## Role

Use `11_skills/` for repeatable workflows such as:
- estimation-source verification
- cost-data normalization
- quantity takeoff review
- AI-agent handoff patterns
- UX review patterns
- calculation audit procedures
- agent run logs
- agent compliance dry-runs
- provider proof packets
- bug-plan creation

## Payloads

`payloads/` is reserved for agent-loadable skill files. Payloads should reference shared `.ai` docs instead of duplicating policy.

## External advisor skills

External advisor/planning skills such as `shadcn/improve` must route plan
artifacts into `.ai/03_plans/<YYYY-MM-DD>-<topic-slug>/`, not root `plans/`.
`shadcn/improve` is installed globally on this machine, so this repo should not
keep a duplicate `.agents/skills/improve/` copy. Archestimator's `.ai`
source-of-truth, proof-boundary, approval-gate, and plan-folder standards still
override any generic upstream default that points at root `plans/`.

## Framework playbooks

- `agent-run-log.md`
- `agent-compliance-dry-run.md`
- `provider-proof-packet.md`
- `bug-plan-creation.md`
