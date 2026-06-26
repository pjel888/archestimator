---
title: Agent Workstreams and Prompts
type: docs
date: 2026-06-25
---

# Agent Workstreams and Prompts

These prompts are for the future implementation pass. They are intentionally scoped to avoid shared-file conflicts. Every agent must read `AGENTS.md`, this orchestration package, and the specific source plan docs named in its prompt.

## Shared Rules for All Future Agents

- Do not edit outside assigned ownership without lead approval.
- Do not revert unrelated user or agent changes.
- Start with RED tests/proofs for assigned behavior.
- Record validation evidence and known gaps.
- Treat `bun run validate` as final/interpretable when baseline reds exist; do not use it as the only proof.
- For DB/provider work, stay inside Supabase project `ebxxqidacheyapmmzavr`.
- Do not apply SQL sketches from planning docs without live schema/function/grant/RLS/constraint/index introspection.

## Workstream Prompts

### W1 Lead Integrator

Goal: run MOP-0, own contracts, sequencing, and final evidence.

Prompt:

```text
You are the lead integrator for the estimate sheet orchestration implementation. Read AGENTS.md and `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration`. Do not start feature code until MOP-0 contracts are written: feature flags/rollback, telemetry storage/sink, redaction allow-list, permission matrix, shared event payloads, RPC names, Supabase project-boundary proof, live schema/RLS/grants inventory, validation baseline, and file ownership. Maintain the implementation ledger and block shared-file conflicts.
```

### W2 Data/RPC/Migration Owner

Goal: implement and prove server-side integrity for MOP-2 and MOP-3.

Prompt:

```text
Own all Supabase migrations, generated types, RLS/grants, and `src/lib/estimates/actions.ts` changes for center and tree integrity work. Confirm project ref `ebxxqidacheyapmmzavr`, inspect live schema/function/grant/RLS/constraint/index state, and capture dump scope before writing migrations. Implement/prove center atomic row move, center all-or-nothing bulk row delete, tree authz/delete return/sort contracts as selected by MOP-0. Add RED SQL/RPC/action tests first. Do not touch UI except action wrappers required by your API.
```

### W3 Right Sidebar Owner

Goal: implement MOP-1 persistence honesty.

Prompt:

```text
Own `src/components/workshop/component-library/*`, right-sidebar modal handoff, and component-library action usage for MOP-1. Persist delete/archive/restore/edit/duplicate or remove affordances; remove local-only template group creation; add latest-wins project-source search; replace live/read-through copy with snapshot-copy copy. Characterize `AddComponentModal` identity semantics before edit wiring. Do not claim project-source insertion safety until the center project-source revision gate passes.
```

### W4 Center Grid Owner

Goal: implement MOP-2 center behavior after data contracts are proven.

Prompt:

```text
Own `EstimateSheetContent.tsx`, row hooks, and center row components for MOP-2. Wire the proven server contracts into component move, selected-row bulk delete, project-source revision gate, stale trust gate, read-only gating, row save chips, destructive copy, and virtualization pinning. Do not edit right sidebar or tree implementation except through already approved shared contracts.
```

### W5 Tree Sidebar Owner

Goal: implement MOP-3 tree security and reliability.

Prompt:

```text
Own `EstimateSheetTree.tsx`, tree state/query/reorder helpers, and tree-specific tests for MOP-3. Fix app-layer edit gates, authoritative delete semantics, share-token header/referrer policy, structure signature, create/delete/rename/reorder races, selection/expansion recovery, max depth, and sort/reorder logic after the data owner proves schema/type readiness. Do not edit shared `ui/tree.tsx` without the primitive owner and regression tests for right sidebar trees.
```

### W6 Shared Contract Owner

Goal: implement MOP-4 drag, events, permissions, feedback, and keyboard contract.

Prompt:

```text
Own shared drag MIME readers, window event validators, mutation permission gates, keyboard equivalence model, mutation feedback semantics, cache reconciliation, selection recovery, and success/recents semantics for MOP-4. Coordinate with center/right/tree owners so emitters and consumers share one typed contract. Malformed or unauthorized events must safely no-op with telemetry and without optimistic mutation.
```

### W7 UX/A11y/Responsive Owner

Goal: implement MOP-5 workspace honesty and accessibility.

Prompt:

```text
Own UX/a11y/responsive improvements in MOP-5. Keep center grid primary; align right dock width with DESIGN.md; add below-1024 fallback unless drawer is explicitly scoped; implement disabled-not-hidden read-only reasons, live regions, table/tree semantics, keyboard alternatives, focus restoration, and hit target fixes. Use browser proof only for claims that require it.
```

### W8 Test/QA Owner

Goal: enforce RED->GREEN evidence.

Prompt:

```text
Own test strategy and regression gates for all implementation phases. Add failing tests before each fix, keep them focused, classify known baseline reds, and record evidence. Cover SQL/RPC proof, server actions, DOM races, read-only gates, persistence refresh, a11y semantics, performance budgets, telemetry storage, and browser-only claims.
```

### W9 Security/Data Reviewer

Goal: review authz, RLS, public/share, PII.

Prompt:

```text
Review data and security changes after implementation drafts. Check transaction boundaries, grants/RLS, viewer/editor/cross-workspace denial, public/share referrer/cache policy, telemetry PII redaction, event validation, and rollback/fix-forward safety. Report blockers before merge.
```

### W10 Performance/Observability Owner

Goal: ensure scale and rollout visibility.

Prompt:

```text
Own MOP-5 performance and observability. Prove tree signature/payload changes avoid re-render cliffs, center active editor stays stable under virtualization, right sidebar search/prefetch stays bounded, and telemetry can monitor rollout. Define dashboard/alert or daily review cadence and rollback drill.
```

### W11 Documentation and Handoff Owner

Goal: keep `.ai` current without over-editing.

Prompt:

```text
After implementation evidence exists, update the before/after report, decisions/state docs as needed, and the final handoff. Do not modify AGENTS.md or DESIGN.md unless the implementation truly changes canonical policy. Do not claim provider, browser, or user proof from local-only checks.
```

### W12 Adversarial/Final Verification

Goal: challenge the claim.

Prompt:

```text
Read the implementation diff, orchestration package, source plans, and evidence. Look for unsupported claims, missed conflicts, stale baseline assumptions, hidden shared-file edits, unproven DB/browser/provider claims, and missing rollback. Findings first, then residual risk.
```
