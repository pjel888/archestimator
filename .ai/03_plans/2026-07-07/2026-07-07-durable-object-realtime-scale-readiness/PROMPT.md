# GLM5.2 Plan Pack Prompt: Durable Object Realtime Scale Readiness

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-durable-object-realtime-scale-readiness`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for Durable Object collaboration readiness: fanout behavior, presence, reconnects, latency, failure recovery, and storage lifecycle.

## Evidence To Start From

- `wrangler.jsonc` binds `COLLAB_ROOMS` to `CollaborationRoom`.
- `src/lib/cloudflare/collaboration-room.ts` and collaboration client code implement realtime behavior.
- Tests such as `tests/vitest/project-collaboration-realtime.test.ts` exist, but scale, reconnect, and hosted latency proof are not fully specified.
- Broadcast and presence behavior may scale with connected sockets.

## Required Plan Pack

Include room lifecycle, socket caps, message fanout budgets, reconnect semantics, stale presence cleanup, storage limits, tests, synthetic load proof, hosted smoke proof, and degradation behavior.

## Constraints

Stay within free-tier limits and current DO binding. Do not require browser automation unless the proof cannot be done with smaller tests or scripts.

## Stop Condition

The pack enables an executor to prove realtime collaboration is safe for first-user load and failure cases.
