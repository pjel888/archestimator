# 30 — Handoff

> Created 2026-06-25 by the Improve-Plan-Prompt audit pass. This doc captures the open work and verification gaps left by that pass so a future agent can pick up cleanly.
>
> Companion to [29-AUDIT-REPORT.md](./29-AUDIT-REPORT.md) § "Verification depth and limitations" — this doc is the actionable handoff; that doc is the narrative.

## TL;DR for the next agent

The Improve-Plan-Prompt audit pass delivered **8 new docs (22-29)** plus **3 targeted edits** to existing docs, raising the weighted plan score from **80.9 → 83.2**. The pass is sound but **not independently verified** because every subagent attempt timed out. The next agent's job is one or more of the tracks below.

## What this audit left undone

### Track 1 — Independent verification (highest value, lowest effort)

**Problem.** The Improve-Plan-Prompt mandates an independent verifier ("a separate final-verification agent that did not author the primary revisions"). The audit attempted this via 6 parallel oracle scorers + 1 adversarial reviewer; **all 7 timed out at the 30-minute infrastructure queue limit**. Two were retried; same result. The audit fell back to direct lane-by-lane scoring (per the prompt's explicit fallback clause) and emulated the adversarial pass by re-reading the new docs in a different mental posture.

**Why this matters.** The scores in [28-SCORECARD.md](./28-SCORECARD.md) are author-as-scorer. An independent reader might:
- Catch scoring bias (e.g., docs the author wrote scored higher than they should).
- Surface contradictions the author is blind to.
- Challenge the readiness verdict.

**What to do.**
1. Open a **fresh session** (no context carry-over).
2. Read **only** these docs:
   - [28-SCORECARD.md](./28-SCORECARD.md)
   - [29-AUDIT-REPORT.md](./29-AUDIT-REPORT.md)
   - [22-RISK-REGISTER.md](./22-RISK-REGISTER.md)
   - [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md)
   - [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md)
   - [25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md)
   - [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md)
   - [27-THREAT-MODEL.md](./27-THREAT-MODEL.md)
3. Skip the original 22 docs (00-21) initially; reference them only to spot-check specific claims.
4. Challenge:
   - Is the 83.2 weighted score defensible? Where is it inflated?
   - Does the "Implementation-ready: YES, conditional on RR-18" verdict hold up?
   - Are there gaps the audit did NOT close?
   - Are cross-references between new docs correct (file:line where cited)?
5. Write findings as a new doc: `31-INDEPENDENT-VERIFICATION.md`.
6. If findings are non-trivial, update [28-SCORECARD.md](./28-SCORECARD.md) with adjusted scores and `Δ vs author-scorer` column.

**Effort estimate:** 1-2 hours for a fresh agent with no subagent timeouts.

**Definition of done:** `31-INDEPENDENT-VERIFICATION.md` exists with either (a) "Scores confirmed, no changes" + rationale, or (b) a delta table showing before/after scores with the reviewer's justification.

### Track 2 — RR-18 RLS verification (highest risk, blocks production)

**Problem.** [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) and [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) RR-18 depend on RLS being enabled on 8 sidebar tables. The original audit (doc 15) marked this as "pending background agent." It has not been closed.

**Why this matters.** Every "Information disclosure" row in [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) carries **Medium residual risk** until verified. If any of these 8 tables lacks RLS, cross-workspace data leakage is possible.

**Tables to verify (from [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) Assets section):**
- `cost_library_items`
- `cost_library_item_price_options`
- `cost_library_item_variant_cost_entries`
- `library_folders`
- `estimate_templates`
- `estimate_template_nodes`
- `estimate_template_row_items`
- `estimate_nodes` + `estimate_row_items` + `estimate_tabs` (for reusable sources)

**What to do.**
1. Run `rg "ENABLE ROW LEVEL SECURITY" supabase/migrations/` and cross-check each table.
2. For each table, confirm: (a) RLS enabled, (b) policies exist for SELECT / INSERT / UPDATE / DELETE as appropriate, (c) policies reference `workspace_id` or project-membership join.
3. If any gap: write a migration to enable RLS + add policies. Per `AGENTS.md`, Philip grants standing authorization for Archestimator Supabase changes in project `ebxxqidacheyapmmzavr`.
4. Update RR-18 status in [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) from `Open` → `Closed` (or document what was found).
5. Update residual risks in [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) § "Highest-priority open threats".

**Effort estimate:** 1-4 hours depending on what's found. Could be minutes if RLS is already everywhere.

**Definition of done:** RR-18 in [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) shows `Status: Closed`, with either `Residual risk: Low` (RLS confirmed) or `Residual risk: Medium` + a remediation migration reference (if gaps were found and fixed).

### Track 3 — Open threats in [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) § "Highest-priority open threats"

Beyond RR-18, three open threats remain:

1. **Server-side MIME / size enforcement on upload routes.** Verify `/api/component-library/images` and `/api/component-library/attachments` enforce MIME + Content-Length server-side, not just client-side.
2. **Storage bucket RLS for images and attachments.** Verify bucket policies require workspace membership.
3. **External image Referer leakage.** Add `referrerPolicy="no-referrer"` to external `<img>` tags.

**What to do.** Read the route handlers in `src/app/api/component-library/` and the storage bucket policies in `supabase/migrations/`. Remediate where needed. These do not all need to close before Phase 1 ships, but they should close before public launch.

**Effort estimate:** 2-4 hours.

### Track 4 — Performance-budget CI enforcement script

**Problem.** [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md) proposes concrete bundle-size budgets (60KB sidebar chunk, 30KB AddComponentModal, etc.) but the CI check to enforce them does not exist yet.

**What to do.**
1. Write `scripts/check-bundle-budget.mjs` that parses `.next/static/chunks/*.js` sizes after `bun run build` and compares against the budget table.
2. Add `bun run check-bundle-budget` (or similar) to the `validate` script in `package.json`.
3. CI fails if any chunk exceeds budget without an exception filed in the PR.

**Effort estimate:** 1-2 hours.

**Definition of done:** `scripts/check-bundle-budget.mjs` exists, runs in `bun run validate`, fails intentionally when a budget is breached (verify with a temporary over-budget chunk).

### Track 5 — Observability wiring

**Problem.** [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) specifies 14 telemetry events and 6 metrics. None are wired yet — they are Phase 1 implementation work.

**What to do.** When Phase 1 Task 1.1 (Delete wired to archive RPC) lands, also wire these events:
- `sidebar_persistence_honesty_v1_archive_invoked`
- `sidebar_persistence_honesty_v1_archive_succeeded`
- `sidebar_persistence_honesty_v1_archive_failed`
- `sidebar_persistence_honesty_v1_restore_invoked`
- `sidebar_persistence_honesty_v1_restore_succeeded`

Same for Tasks 1.2, 1.3, 1.4, 1.6 — wire the corresponding events from the table in doc 24.

Also: build the dashboard described in doc 24 § "Dashboards". Verify the `library_telemetry_events` table exists (migration check); if not, create it under the standing database authorization.

**Effort estimate:** 4-8 hours, woven into Phase 1 implementation.

### Track 6 — UX state matrix gap closure

**Problem.** [25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) flags ~10 `N/S — gap` items: empty states, missing copy, stale-preview handling, facet empty-options behavior, mobile-fallback message.

**What to do.** When implementing Phase 1 / Phase 2 surfaces, close the `N/S — gap` items in the surfaces you touch. Each closure is a small copy + component change.

**Effort estimate:** 1-2 hours per gap, woven into Phase 1 / Phase 2 implementation.

## What this audit completed (so the next agent does not redo it)

- ✓ Read all 22 original docs in full
- ✓ Scored every doc across Strategy / Doc Quality / Impl Readiness (direct lane-by-lane, 6 lanes + adversarial pass)
- ✓ Created [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) with 22 risks (15 finding-derived + 7 cross-cutting), each with owner / deadline / mitigation / residual risk
- ✓ Created [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md) with per-task rollback paths, feature flag design, 4-stage release
- ✓ Created [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) with 14 events, 6 metrics, 4 alerts, 7 dashboard panels
- ✓ Created [25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) with per-surface state coverage for 9 surfaces
- ✓ Created [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md) with concrete P50/P95/P99 latency, bundle, payload, memory ceilings
- ✓ Created [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) with STRIDE per surface, assets, threat agents, controls
- ✓ Created [28-SCORECARD.md](./28-SCORECARD.md) with before/after per-doc scoring
- ✓ Created [29-AUDIT-REPORT.md](./29-AUDIT-REPORT.md) narrative deliverable
- ✓ Updated [00-README.md](./00-README.md) artifact index to include the 8 new docs
- ✓ Cross-linked [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md) to risk register
- ✓ Cross-linked [18-IMPLEMENTATION-PLAN.md](./18-IMPLEMENTATION-PLAN.md) to rollout/rollback + observability plans
- ✓ Emulated adversarial pass surfaced one minor contradiction (RR-16 threshold wording vs doc 24)

## Notepad from this audit

The audit's working notepad lives at:
`/var/folders/xg/_lqq86w138vctk9_ll6g8h840000gn/T/opencode/ulw-plan-audit-20260624-232946.md`

It is a temp file and may be cleaned up by the OS. If gone, the audit's reasoning is reconstructable from [29-AUDIT-REPORT.md](./29-AUDIT-REPORT.md) and [28-SCORECARD.md](./28-SCORECARD.md).

## Suggested next-session prompt

If you are a fresh agent picking this up, the highest-value 1-hour task is Track 1 (independent verification):

```
Read .ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/30-HANDOFF.md
for context. Then independently verify the audit pass: read only docs 22-29
and challenge the scores in 28-SCORECARD.md. Write findings as
31-INDEPENDENT-VERIFICATION.md. Do not re-read the original 22 docs unless
spot-checking a specific claim.
```

If you have 4 hours, do Track 2 (RLS verification) — it is the highest-risk open item.

## Open decisions that need Philip

These do not need an agent — they need a product owner:

1. **Feature-flag default at launch.** [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md) recommends `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1=true` (Phase 1 fixes are correct behavior). Philip confirms.
2. **Alerting infrastructure.** If Vercel / Supabase does not have alerting configured at launch, fall back to daily dashboard review during the 48-hour hold. Eng owner documents the dashboard URL location.
3. **Mobile/tablet scope (RR-12).** Sidebar is hidden below 1024px with no fallback. Currently accepted as "desktop-first." Revisit if mobile feedback warrants.

## Audit contact

This audit was executed in a single session on 2026-06-25 by the Sisyphus orchestrator. The session log is in the notepad path above. Re-running the audit fresh is the right way to verify it — that is Track 1.
