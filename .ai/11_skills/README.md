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

## Loop-engineering playbooks

Loop-engineered product work should use the canonical protocol in
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md` and the plan pack at
`.ai/09_archive/store/2026-06-13-loop-engineering-mandate-and-research/`.
Research grounding lives at
`.ai/13_research/loop-engineering-agentic-product-development-2026-06-13.md`.

Use reusable skill payloads only as adapters. They must not fork the
agent-neutral loop routing: direct execution for narrow work, `ultrawork` for
in-session parallel lanes, `ultragoal` for durable goal state, `omo:ulw-loop`
for criterion-led real-surface proof, `autopilot` for the full lifecycle,
`omo:ultraresearch` for exhaustive research, `ultraqa` for adversarial QA, and
`vercel:agent-browser` for browser-facing proof. Agent-specific equivalents in
Claude, Codex, OpenCode, CommandCode, Antigravity, Kimi, DeepSeek, Cursor, or
future tools must still preserve the same `.ai/00_system` contract.
