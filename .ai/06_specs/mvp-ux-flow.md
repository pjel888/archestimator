# MVP UX Flow

**Status:** Superseded by the 2026-05-17 reset cleanup.

## Current baseline

The active app UX is:

```txt
/          landing page
/workshop  intentionally empty page
```

There is no active MVP app flow beyond this baseline.

## Superseded flow

Earlier versions of this document described project dashboards, estimate workspaces, component libraries, proposal pages, revisions, and local-first route families. Those flows were rejected with the prototype and must not be rebuilt by default.

## Restart rule

The next MVP UX flow must be written from scratch after Philip approves the first focused workflow.

A new flow must include:

- first user type;
- first user job;
- first screen state;
- primary action;
- success state;
- explicit non-goals;
- validation approach.

## Guardrails

- Start with one screen, not a route family.
- No fake dashboard/module nav until the workflow earns it.
- No component library/proposal/revision/settings surfaces until explicitly approved.
- No grid/drag/drop package until a simple interaction fails.
- No persistence layer until an accepted screen needs saved data.
