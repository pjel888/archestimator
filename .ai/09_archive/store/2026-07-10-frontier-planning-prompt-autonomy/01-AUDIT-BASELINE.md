# Audit Baseline

## Inventory

| Prompt | Current role | Initial risk |
|---|---|---|
| `Creating-Plan-Prompt.md` | Creates a multi-document plan pack | Arbitrary verification caps and external-decision dead ends can prevent readiness despite complete local evidence. |
| `Improve-Plan-Prompt.md` | Repairs and scores an existing pack | Owner acceptance and emulated-review caps can preserve conditional status instead of driving internal closure. |
| `Create-Implementation-Prompt.md` | Compiles sources into the execution overlay | Open Decisions assigns responsible owners and allows critical choices to remain unresolved. |
| `Executing-Plan-Prompt.md` | Implements the selected plan | `NOT READY` and planning-only labels can stop execution instead of triggering bounded plan repair; archive-by-copy conflicts with canonical archive policy. |
| `Multi-Agent-Execution-Directive.md` | Generic orchestration overlay | Completion and blocker rules still permit owner-decision handoff and arbitrary verification-mode ceilings. |

## Initial Cross-Suite Findings

1. Readiness and implementation authority are conflated with release proof.
   Missing hosted/manual evidence can improperly block all implementation even
   when a release-safe local result is achievable.
2. The prompts repeatedly assign decisions and risks to an "owner" instead of
   defining an agent role, evidence deadline, default, and reversal trigger.
3. Numeric readiness caps based on delegation availability measure workflow
   shape rather than plan correctness. Verification provenance must remain
   visible, but pass/fail must follow evidence coverage.
4. `CONDITIONALLY READY` and `NOT READY` are terminal-looking states. The
   execution prompt needs a repair loop that converts missing internal evidence
   or decisions into work packages before implementation continues.
5. The suite names many workflows and specialists, but capability invocation is
   not consistently tied to a risk-trigger matrix, deliverable, validator, and
   fallback.
6. "External decision" is too broad. A product tradeoff with reversible options
   is not an external authorization boundary and must be resolved by the AI.
7. Completion accepts blocked/deferred items too readily. Full-goal completion
   must remain false when the requested outcome itself still requires them.
8. The execution prompt's archive-by-copy default conflicts with
   `.ai/03_plans/README.md`, which requires moving the whole completed pack and
   repairing inbound references without leaving a stub.
9. The suite is detailed but duplication creates drift. Each stage needs a
   distinct responsibility and a shared invariant set.
10. Claims such as "world-class" or "100" need operational definitions:
    traceability coverage, decision closure, evaluator evidence, adversarial
    findings, and final completion audit.

## Required Repair Themes

- Frontier evidence and context-engineering rubric.
- Autonomous decision closure hierarchy.
- Planning-readiness vs release-authorization separation.
- Executable fallback and continuation packets for true hard boundaries.
- Plan-repair-before-stop behavior.
- Capability/risk routing and bounded multi-agent recovery.
- Requirement-level verification without arbitrary score caps.
- Canonical archive and durable state closeout.

