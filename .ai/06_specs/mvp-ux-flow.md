# MVP UX Flow

**Status:** Superseded by the 2026-05-17 reset cleanup. Do not use this file as the active app-flow source of truth.

Use `.ai/10_state/current-state.md` for the live route state and `.ai/06_specs/restart-guardrails.md` for restart constraints.

## Current baseline

The old full MVP UX flow is superseded. The immediate reset baseline was `/` plus blank `/workshop`, but the repo has since moved into a small post-reset workshop route slice. This file does not define that slice; it only records that the earlier broad MVP flow is not active.

## Superseded flow

Earlier versions of this document described project dashboards, estimate workspaces, component libraries, proposal pages, revisions, and local-first route families. Those flows were rejected with the prototype and must not be rebuilt by default.

## Restart rule

The next durable MVP UX flow must be written as a fresh/current spec after Philip approves the first focused workflow or after the current route slice is accepted as a direction.

A new flow must include:

- first user type;
- first user job;
- first screen state;
- primary action;
- success state;
- explicit non-goals;
- validation approach.

## Guardrails

- Start from the current approved route slice, not from the rejected full prototype.
- Prefer one screen/workflow over a broad route family.
- No fake dashboard/module nav until the workflow earns it.
- No full component library/proposal/revision/settings surfaces until explicitly approved.
- No grid/drag/drop package until a simple interaction fails.
- No persistence layer until an accepted screen needs saved data.
