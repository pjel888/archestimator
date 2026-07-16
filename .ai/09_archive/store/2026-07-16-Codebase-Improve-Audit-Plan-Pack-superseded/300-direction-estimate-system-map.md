# Plan UNIT-018 (Direction): Expand Estimate-System-Map beyond admin — design spike

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/app/admin/estimate-system src/components/admin/estimate-system-map src/lib/admin/estimate-system-map-data.ts`.

## Status
- **Priority:** — (direction) · **Effort:** M · **Risk:** LOW · **Depends on:** — · **Category:** direction (AUXILIARY)
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** NOT_REQUIRED (design spike — no code yet)
- **Note:** This is a *design/spike* plan, not a build-everything plan. Done = reviewed design + open questions resolved.

## Why this is the highest-leverage direction
The Estimate-System-Map is the one feature structurally unique to archestimator vs generic estimating tools: a live knowledge graph of component/estimate/project relationships. It is built (~3,753 LOC: `EstimateSystemKnowledgeGraph.tsx` 995 + `EstimateSystemUx.tsx` 708 + `EstimateSystemMap.tsx` 517 + `estimate-system-map-data.ts` 1,297) and **routed** at `/admin/estimate-system` (`page.tsx` renders `<EstimateSystemMap>` — confirmed during vetting; an earlier draft wrongly called it unrouted). It is admin-only today; it carries zero signal for end users and sits behind the mature AI context layer (`src/lib/ai/read-context.ts` ~2,200 LOC, `package-builder/*`).

## Grounding
- `src/app/admin/estimate-system/page.tsx` — renders the map.
- `.ai/03_plans/2026-07-15/Estimate-System-Map/` — prior plan pack exists; reconcile with it.
- `d3` is a single-consumer heavy dep (only `EstimateSystemKnowledgeGraph.tsx`); `recharts` is single-consumer too (`AdminCharts.tsx`).

## Open product questions (resolve before building)
1. **Audience:** admin-only (today) vs workshop user-facing vs both? Admin-first is the right alpha call (low blast radius).
2. **d3 vs recharts:** keep d3 for the bespoke graph, or re-derive with recharts/SVG to drop a heavy dep? Until user-facing, at minimum `next/dynamic({ ssr:false })` the graph so d3 stays out of the admin bundle.
3. **Data freshness:** live (per request) vs derived/scheduled from `read-context.ts`? Live may repeat the AI-context cost.
4. **Interaction:** read-only graph vs actionable nodes (jump to component/estimate)?

## Scope of this spike
- Reconcile with `.ai/03_plans/2026-07-15/Estimate-System-Map/` (avoid re-planning).
- Decide audience + the d3/recharts question.
- Define the user-facing route + data-loading shape (reuse `read-context.ts` / `estimate-system-map-data.ts`).
- List the build units this would decompose into (route, data loader, interaction model, perf/dynamic-import).

## Done criteria (spike)
- [ ] Design doc appended here (or a sibling) capturing the 4 decisions
- [ ] Reconciliation note vs the 2026-07-15 pack
- [ ] Owner sign-off on audience (admin-first vs user-facing)
- [ ] `plan-pack.json` UNIT-018 marked with the decision

## STOP conditions
- The 2026-07-15 pack already specifies the user-facing build — defer to it; mark this spike SUPERSEDED rather than duplicating.

## Maintenance notes
- This is the differentiating surface; treat any perf work on `read-context.ts` as enabling this.
