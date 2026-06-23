# 04 — Implementation Plan

Date: 2026-06-23
Owner lane: **IU-19 (Operations/provider)** | Phase: **3** | Scope: **Provider/proof readiness, support workflow**

## Pre-Implementation Gates

- [ ] Read 01-ISSUE-DEFINITION, 02-CURRENT-STATE-ANALYSIS, 03-TARGET-EXPERIENCE.
- [ ] Verified cited paths exist.
- [ ] Conflict group **Operations/provider** has no in-flight change.
- [ ] No decision gate applies.
- [ ] Targeted verification IDs confirmed: **TV-OPS-SUPPORT, TV-OPS-MONITORING, TV-OPS-LEGAL**.

---

## Wave-Ordered Task List

### Wave 0 — Discovery (no code change)

- [ ] Read every cited path in 02-CURRENT-STATE-ANALYSIS.
- [ ] Grep for existing callers/consumers of `launch:*` scripts.
- [ ] Glob for existing tests covering the operational surface.
- [ ] Document any drift from canonical audit.
- [ ] Confirm the 18 `launch:*` scripts in `package.json` are still present and bound.
- [ ] Confirm the 11 readiness check scripts in `scripts/` are still present.

### Wave 1 — Persona Definition Documentation (no code change)

- [ ] Write the six persona definitions into `.ai/10_state/operational-personas.md`.
- [ ] For each persona, document: name, description, proof obligations, stop condition, handoff trigger, required view.
- [ ] Document the handoff flow diagram.
- [ ] Review with owner for approval.

### Wave 2 — Canonical CSV Update (no code change)

- [ ] Update `canonical-feature-status.csv` to split operational rows by persona.
- [ ] Add rows for: Incident Commander, Provider Owner, Privacy/Legal Owner, Support Triage, Support Response, Launch Operations.
- [ ] Each row must have: persona name, proof obligations, stop condition, acceptance criteria.
- [ ] Ensure no information is lost from the original compressed rows.

### Wave 3 — Launch Script Owner Assignment (no code change)

- [ ] Document which `launch:*` script is owned by which persona.
- [ ] Update script headers or comments to indicate the assigned owner.
- [ ] Update `.ai/10_state/operational-runbooks.md` with per-persona runbook sections.
- [ ] Confirm no script is orphaned (every script has an owner).

### Wave 4 — Support and Launch Operations Playbooks (no code change)

- [ ] Document the Support Triage playbook: feedback queue, categorization rules, escalation path.
- [ ] Document the Support Response playbook: resolution process, repair actions, audit note template, engineering escalation.
- [ ] Document the Launch Operations playbook: checklist, cohort composition, campaign safety, go/no-go vote.
- [ ] Store playbooks in `.ai/10_state/operational-runbooks.md`.

### Wave 5 — Verification Matrix Update (no code change)

- [ ] Update `06-verification-matrix-and-proof-runbook.md` to decompose TV-OPS-SUPPORT by persona.
- [ ] Add per-persona verification gates: TV-OPS-MONITORING, TV-OPS-PROVIDERS, TV-OPS-LEGAL, TV-OPS-TRIAGE, TV-OPS-RESPONSE, TV-OPS-LAUNCH.
- [ ] Each gate must list: proof obligations, verification command, pass condition.

### Wave 6 — Decision Ledger Update (no code change)

- [ ] Update `09-decision-ledger.md` with any persona boundary decisions.
- [ ] Document owner decisions on: who is the Incident Commander, who is the Provider Owner, etc.
- [ ] Document fallback decisions for unstaffed personas.

---

## Files Expected To Change

| Path | Why | Wave |
|---|---|---|
| `.ai/10_state/operational-personas.md` | New persona definitions | 1 |
| `canonical-feature-status.csv` | Split rows by persona | 2 |
| `scripts/check-support-monitoring-readiness.ts` | Add owner comment | 3 |
| `scripts/check-resend-readiness.ts` | Add owner comment | 3 |
| `scripts/check-legal-owner-readiness.ts` | Add owner comment | 3 |
| `scripts/check-supabase-linked-readiness.ts` | Add owner comment | 3 |
| `scripts/check-vercel-env-readiness.ts` | Add owner comment | 3 |
| `scripts/check-vercel-health-readiness.ts` | Add owner comment | 3 |
| `scripts/check-vercel-production-readiness.ts` | Add owner comment | 3 |
| `.ai/10_state/operational-runbooks.md` | Per-persona runbooks | 4 |
| `06-verification-matrix-and-proof-runbook.md` | Decompose TV-OPS-SUPPORT | 5 |
| `09-decision-ledger.md` | Persona boundary decisions | 6 |

---

## Validation Gate

Complete when:

- [ ] All Wave 0–6 checkboxes checked.
- [ ] Six personas are documented with proof obligations, stop conditions, and handoff triggers.
- [ ] Canonical CSV operational rows are split by persona with no data loss.
- [ ] Every `launch:*` script has a documented owner.
- [ ] Support Triage, Support Response, and Launch Operations playbooks are documented.
- [ ] Verification matrix is decomposed by persona.
- [ ] Decision ledger records any owner decisions on persona boundaries.
- [ ] `../LOOP_LEDGER.md` records completion.

---

## Linkage

- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [05-ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md)
