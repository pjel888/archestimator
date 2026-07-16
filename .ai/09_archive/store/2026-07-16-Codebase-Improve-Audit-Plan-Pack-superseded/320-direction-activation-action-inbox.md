# Plan UNIT-020 (Direction): Close the activation → founder action-inbox feedback loop — design spike

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/onboarding src/lib/admin/action-inbox-repository.ts src/lib/admin/action-inbox-actions.ts`.

## Status
- **Priority:** — (direction) · **Effort:** M · **Risk:** LOW · **Depends on:** — · **Category:** direction (AUXILIARY)
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** NOT_REQUIRED (design spike)
- **Note:** Design/spike plan; done = reviewed design + open questions resolved.

## Why this is the top pre-beta retention lever
Both halves are already half-built:
- **Activation producers:** `src/lib/onboarding/activation-producer-contract.ts` defines 11 milestones (`invite_accepted` … `recipient_engaged`) with a `requiresProject`/`requiresEstimate` rule matrix; producers are registered in 6 sites (`publication/d1-store.ts`, `estimates/d1-action-client.ts`, `collaboration/invitation-d1-store.ts`, `publication/admin-d1-client.ts`, `app/api/activation/proposal-export-completed/route.ts`, `landing/beta-telemetry-registry.ts`).
- **Founder action-inbox:** just landed (`src/lib/admin/action-inbox-repository.ts`, commits `2be94a2fb` → `d1215f802`, UNIT-001..003 of the Admin Founder Homebase pack).

The missing piece is the **feedback loop**: a founder "Today" view that surfaces *which* activation milestone is stalling, per design partner. Roadmap BETA P0 #11 (onboarding first-value flow) + #16 (beta partner list) both depend on seeing this signal.

## Grounding
- `activation-producer-contract.ts` — the milestone definitions + rule matrix.
- `action-inbox-repository.ts` — the durable, deduped action-item store with severity/priority ranking (the sink).
- `.ai/03_plans/2026-07-12/Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack/` — the active admin owner surface; reconcile.

## Open product questions (resolve before building)
1. **Source mapping:** which activation milestones become which action-item kinds? (e.g. `invite_accepted` stalled > 3d → `followup` item, severity `warning`.)
2. **Dedup/rank:** the inbox already dedupes on `derived_key` + ranks by severity/priority — confirm the activation items fit that model without flooding.
3. **Per-partner view:** group/filter by design partner in `/admin/today`.
4. **Closed-loop:** does resolving the item require a founder action (email nudge) or auto-clear when the milestone fires?

## Scope of this spike
- Map the 11 milestones → action-item kinds + severity thresholds + stale windows.
- Define the new activation producer(s) that write into `admin_action_items` (reuse the `deriveActionItemsFromSources` pattern; note UNIT-005/008 hardening applies).
- List build units: producer(s), `/admin/today` partner grouping, dedup/rank validation.

## Done criteria (spike)
- [ ] Milestone → action-item mapping table
- [ ] Reconciliation note vs the Admin Founder Homebase pack
- [ ] Owner sign-off on stale windows + per-partner view
- [ ] `plan-pack.json` UNIT-020 marked with the decision

## STOP conditions
- The action-inbox dedup would flood (too many activation items) — narrow to the highest-signal milestones first; don't wire all 11.
- A milestone's "stalled" definition needs data not yet produced — add the producer as a prerequisite, don't fake the signal.

## Maintenance notes
- This loop is the founder's #1 retention instrument pre-beta; it composes with the existing action-inbox (UNIT-008) and activation infrastructure.
- Any new activation milestone must register a producer + decide its action-item mapping.
