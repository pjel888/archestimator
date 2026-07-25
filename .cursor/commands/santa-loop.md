---
description: Optional independent review of a named risk under repository authority.
---

# Santa Loop Compatibility Command

This command is an optional review adapter. `AGENTS.md`,
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, the Validation Matrix, and
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` remain
authoritative.

## Contract

1. Use review only when the current Task Contract names a material risk or the
   user explicitly requests it.
2. Give one independent reviewer the original requirements, acceptance criteria,
   scoped final diff, decisive artifacts, validation results, and known gaps.
3. Select a capability class through
   `.ai/12_agents/codex-role-model-matrix.json`; do not hardcode provider model
   names or fabricate cross-model independence.
4. Require `PASS|FAIL`, severity, exact evidence, and the smallest repair. The
   reviewer remains read-only and must inspect actual artifacts.
5. On failure, repair only grounded findings and rerun invalidated profile
   evidence. A second review pass is optional unless the Task Contract requires
   it for the named risk.
6. Do not commit, push, or mutate branches/remotes. Run local tests, browsers,
   and screenshots selected by the automatic quality profile under standing
   authorization.
7. Stop when the named review risk is resolved or an exact external authority
   boundary remains. Do not impose dual approval, fixed rounds, or automatic Git
   mutation.

## Report

Return the reviewed scope, reviewer capability class, `PASS|FAIL`, findings by
severity, evidence inspected, repairs made, validation actually run, proof gaps,
and remaining risk.
