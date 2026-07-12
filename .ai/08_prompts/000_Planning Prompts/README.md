# Planning Suite

Use this suite only for explicitly requested planning or Plan Pack lane work.
Ordinary work uses Direct or Brief lanes from `AGENTS.md`.

## Canonical Files

Load only:

1. `Frontier-Planning-Kernel.md`;
2. applicable `Frontier-Applicability-Gates.md` sections;
3. one stage prompt;
4. `Plan-Pack-Schema.md` when writing or validating a pack.

Stages: create, improve, compile, execute. The multi-agent directive is optional.

## Lean Contract

Archestimator is alpha/pre-beta. Plan the direct target design and fix-forward
path. Do not invent compatibility, flags, rollout, rollback, hosted proof,
approval, tests, agents, or artifacts without a proven requirement.

Use the fewest files a fresh executor needs. Dependencies are execution order,
not handoffs. Internal blockers become owned work.

## Validation

- `bun run validate:planning-prompts` checks this suite's invariants.
- `bun run validate:plan-pack -- <folder>` validates a pack.
- Automated product tests remain user-controlled.

## Progressive Disclosure

Never paste the whole suite into a worker packet. Send goal, owned IDs, relevant
source, constraints, and expected evidence only.
