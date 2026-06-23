# UX-038 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Monitoring, provider readiness, legal/privacy, support, and launch operations are compressed into broad operator rows.**

### Affected Users

This issue affects **operations personas** users in the Archestimator closed beta. The canonical severity rating is **High**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

The canonical spreadsheet groups monitoring, provider readiness, legal/privacy, support, and launch operations under generic "operator" or "admin" rows. The second-pass audit expanded these to 93 rows, but the operational rows remain compressed. No single operator knows exactly what they are responsible for, what they must prove, and when they can stop. The `TV-OPS-SUPPORT` verification gate covers all operational proof in one command chain, making it impossible to tell which persona owns which subset. The `launch:*` scripts are run by whoever has access, not by a named role with a defined handoff.

### Expected Behavior (post-fix)

Each operator can see their proof obligation and stop condition before widening beta. Six distinct personas are defined: Incident Commander, Provider Owner, Privacy/Legal Owner, Support Triage, Support Response, and Launch Operations. Each persona has documented proof obligations, a stop condition, a handoff trigger to the next persona, and a view of the data they need. The canonical CSV operational rows are split by persona, and every `launch:*` script has a documented owner.

### Best Fix

Split operational personas and acceptance criteria by owner: incident, provider, privacy/legal, support triage, support response, and launch operations.

---

## Severity Rationale

Severity **High** is assigned because:

- The issue touches the **Operations personas** surface, which is beta-blocking.
- The canonical audit's severity column confirms this rating.
- The conflict group **Operations/provider** records the parallelization hazard.

---

## Evidence Inventory

| Source | Reference |
|---|---|
| Canonical CSV | `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv` |
| UX error log | `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md` |
| Implementation decomposition | `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md` |
| Sequencing | `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md` |

### Source-Code Evidence (candidate paths)

```
package.json (launch scripts)
scripts/ readiness checks
.ai/10_state/ operational runbooks
```



## Affected Systems

- `canonical-feature-status.csv` — operational rows must be split by persona.
- `06-verification-matrix-and-proof-runbook.md` — TV-OPS-SUPPORT must be decomposed by persona.
- `09-decision-ledger.md` — persona boundaries may require owner decisions.
- `provider-proof/` artifacts — must be tagged by persona owner.

## Related Issues

- `UX-029` — Provider proof owners (same conflict group, same IU-19; UX-029 assigns providers to owners, UX-038 splits the operator personas who use those assignments).
- `UX-028` — QA route manifest (operations conflict group).
- `UX-039` — Notification campaign authoring (operations conflict group).
- `UX-040` — Admin repair workflow (support boundary).

## Risk If Not Fixed

- Launch proceeds without clear per-role accountability.
- Monitoring gaps are missed because "someone else was supposed to check."
- Legal exposure because terms/privacy review was assumed done by "ops."
- Support issues are dropped because triage and response are not separated.
- Launch operator cannot declare "go" because no stop condition is defined.
- Provider failures are not owned, leading to prolonged outages without a responsible party.
- Privacy compliance gaps expose the project to regulatory risk.
- Support feedback is lost because no one owns the triage queue.
- Launch decisions are made by consensus rather than by a named operator with clear accountability.

## Post-Fix Scenario (the win)

A beta operator opens the operational persona guide and sees:

- **I am the Incident Commander.** My proof obligations are: confirm monitoring inbox, confirm uptime alerts, confirm error alerts, confirm incident escalation path. My stop condition is: all 4 monitoring proof flags are true. My handoff trigger: I hand off to the Provider Owner when monitoring is green.
- **I am the Provider Owner.** My proof obligations are: run Resend, Supabase, Vercel, and Maps checks. My stop condition is: all critical providers are PASS or documented FAIL with fallback. My handoff trigger: I hand off to the Privacy/Legal Owner when providers are proven.
- **I am the Privacy/Legal Owner.** My proof obligations are: confirm terms, privacy, beta copy, data retention, and support comms. My stop condition is: all 5 legal proof flags are confirmed. My handoff trigger: I hand off to Launch Operations when legal is clear.
- **I am Launch Operations.** My proof obligations are: confirm all prior personas have handed off, confirm cohort composition, confirm release campaign safety. My stop condition is: all handoffs complete and go/no-go vote is green. My handoff trigger: I authorize beta widening.

---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)

## Notes

- This issue is documentation-only; no `src/` or `scripts/` code changes are required.
- The fix is structural: define personas, split CSV rows, and document handoffs.
- Owner confirmation of persona assignments is required before beta widening.
