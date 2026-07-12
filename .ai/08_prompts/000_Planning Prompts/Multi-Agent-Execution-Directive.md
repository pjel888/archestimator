# Multi-Agent Execution Directive

## Load

Read `Frontier-Planning-Kernel.md`, applicable gates, this directive, then
`Plan-Pack-Schema.md` when a pack is involved.

## Objective

Use the fewest agents that materially improve elapsed time, context isolation,
or risk coverage. Multi-agent activity is not an objective.

## Topology

- Work directly for narrow or tightly coupled scope.
- Parallelize only dependency-independent slices.
- Use one writer/integrator for shared files and contracts.
- Formal leases are only for actual concurrent contention.

## Worker Packet

Include target result, owned scope, relevant paths/context, constraints,
dependencies, prohibited side effects, expected evidence, and return shape.
Specify the installed `agent_type`. Do not send the full plan or prompt suite.

## Recovery

On weak output, timeout, tool failure, or scope drift: preserve useful evidence,
narrow/reissue, change lane, serialize, or complete locally. Optional lane
failure is never an owner blocker.

## Verification

The lead inspects actual artifacts, not summaries. Independent review is optional
and must close a named risk. Tests and browser/build QA require explicit user
authorization.

## Completion

The lead owns the requirement audit, cleanup, durable state, and final claim.
Auxiliary gaps cannot block completed local implementation.
