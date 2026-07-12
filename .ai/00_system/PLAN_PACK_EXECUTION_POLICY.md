# Plan-Pack Execution Policy

## Purpose

A plan pack exists to finish an authorized product outcome. It is an execution
contract, not a research archive, approval queue, or catalog of reasons to stop.
For a requested "make the plan pack and implement it" task, the default run scope
is `IMPLEMENT_LOCAL` and the lead owns the outcome through integration and a
truthful completion audit.

## Anti-Blocker Rule

**Every codebase AI must resolve blockers; it must not stop at them.** When an
authorized plan pack exposes a core blocker, the current lead owns converting it
into completed repository work or the narrowest possible external boundary.
Reporting a blocker without exhausting the allowed continuation work is an
incomplete execution, not a valid handoff.

Do not leave a core plan-pack unit `BLOCKED` for an internally resolvable
condition. A dependency, stale plan, missing receipt, absent specialist,
unavailable optional tool, failed first attempt, incomplete test proposal,
uncertain ordinary decision, reviewer finding, or concurrent plan ownership is
work to resolve, not a stopping point.

When such a condition appears, the lead must immediately choose and record the
smallest viable continuation:

1. implement or repair the prerequisite in the same execution run when it is in
   the authorized repository scope;
2. reorder the DAG and finish independent ready units while repairing the
   prerequisite;
3. absorb the prerequisite into the active pack or make a narrow compatible
   boundary that preserves the requested outcome;
4. replace an unavailable optional capability with a local or deterministic
   fallback; or
5. use a safe feature-off, no-op, backward-compatible, or dry-run path while
   completing every remaining local requirement.

Plans must name the recovery unit, owner, evidence, and next action. They must
not use `BLOCKED`, `CONDITIONALLY_READY`, `NOT_READY`, an open decision, or a
missing non-test proof as a terminal implementation state when a repository
action can still move the outcome forward.

## Narrow Boundary Rule

Only a true `AUTH-*` boundary may remain after all safe in-scope work is done:
an exact irreversible, paid, credential-gated, legally restricted, or
out-of-scope external action. It narrows only the claim that needs that action.
It never blocks code, migrations, configuration, compatibility work, dry runs,
documentation, or the completion of unrelated core requirements.

`TECH_BLOCKED` is valid only when a core deliverable is impossible after
materially different local recovery approaches have failed and no compatible
implementation, fallback, or runnable next unit remains. It is never valid for
workflow ceremony, optional infrastructure, unapproved tests, unavailable
reviewers/agents, stale planning artifacts, or dependency bookkeeping.

## Completion And Speed

Treat a dependency as a DAG ordering fact, not a human handoff. Keep the plan
minimal: only artifacts, research, agents, reviews, and checks that change an
implementation decision or prove a required claim belong in it. Do not create
tests, broad validation, browser proof, review loops, or subplans merely to
make the pack look comprehensive. The User Test Authorization Gate still
controls test execution; an unapproved `TEST_PROPOSAL` is visible risk, never a
blocker to completed local implementation.

Before an implementation-complete or archive-ready claim, finish all core
repository-controlled work, reconcile each original requirement to evidence,
and retain only exact external release boundaries with their continuation
packets. If local work remains, continue it; do not hand it back to the user.
