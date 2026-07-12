# 05 — Acceptance Criteria

Date: 2026-06-23

## Scenario 1 — Incident Commander Completes Monitoring Proof

**Given** the Incident Commander is assigned and the monitoring scripts are bound.

**When** the Incident Commander runs the monitoring verification.

**Then** all 4 monitoring proof flags are confirmed true.

### Pass Condition (binary)

- [ ] Monitoring inbox flag is true.
- [ ] Uptime alert flag is true.
- [ ] Error alert flag is true.
- [ ] Incident escalation path flag is true.
- [ ] No console errors during verification.
- [ ] Verification completes within response budget.

### Real-Surface Proof

| Surface | How |
|---|---|
| Script | `bun run launch:check-support-monitoring` output showing all flags true |
| Artifact | `provider-proof/monitoring-<timestamp>.json` with all flags true |
| Handoff | Incident Commander records handoff to Provider Owner in operational runbook |

---

## Scenario 2 — Provider Owner Proves All Critical Providers

**Given** the Provider Owner is assigned and the provider scripts are bound.

**When** the Provider Owner runs the provider verification suite.

**Then** all critical providers are PASS or documented FAIL with fallback.

### Pass Condition

- [ ] Resend env vars are present.
- [ ] Supabase project is linked (67 migrations in parity).
- [ ] Vercel env is configured and health checks pass.
- [ ] Any FAIL provider has a documented fallback plan.
- [ ] No console errors during verification.

### Real-Surface Proof

| Surface | How |
|---|---|
| Script | `bun run launch:check-resend-readiness`, `launch:check-supabase-linked-readiness`, `launch:check-vercel-env`, `launch:check-vercel-health` outputs |
| Artifact | `provider-proof/providers-<timestamp>.json` with PASS/FAIL per provider |
| Handoff | Provider Owner records handoff to Privacy/Legal Owner in operational runbook |

---

## Scenario 3 — Privacy/Legal Owner Confirms Legal Proof

**Given** the Privacy/Legal Owner is assigned and the legal checklist is defined.

**When** the Privacy/Legal Owner reviews and confirms each legal item.

**Then** all 5 legal proof flags are confirmed true.

### Pass Condition

- [ ] Terms of Service flag is true.
- [ ] Privacy Policy flag is true.
- [ ] Beta copy flag is true.
- [ ] Data retention flag is true.
- [ ] Support comms flag is true.
- [ ] Each flag has a reviewer name and review date.

### Real-Surface Proof

| Surface | How |
|---|---|
| Script | `bun run launch:check-legal-owner` output showing all flags true |
| Artifact | `provider-proof/legal-<timestamp>.json` with reviewer and date per flag |
| Handoff | Privacy/Legal Owner records handoff to Launch Operations in operational runbook |

---

## Scenario 4 — Support Triage Documents Queue and Rules

**Given** the Support Triage persona is assigned.

**When** the Support Triage operator reviews the feedback queue and categorization rules.

**Then** all 4 triage proof items are documented and the queue is actively monitored.

### Pass Condition

- [ ] Feedback queue is documented (where it lives, how to access it).
- [ ] Beta access request process is documented.
- [ ] Categorization rules are documented (bug vs feature vs question).
- [ ] Escalation path to Support Response is documented.
- [ ] At least one feedback item has been categorized.

### Real-Surface Proof

| Surface | How |
|---|---|
| Document | `.ai/10_state/operational-runbooks.md` triage section |
| Artifact | Screenshot or log of categorized feedback item |
| Handoff | Support Triage records handoff to Support Response when issue requires resolution |

---

## Scenario 5 — Support Response Documents Resolution and Audit

**Given** the Support Response persona is assigned.

**When** the Support Response operator resolves an issue and documents the audit note.

**Then** all 4 response proof items are documented and at least one audit note exists.

### Pass Condition

- [ ] Resolution process is documented.
- [ ] Repair action playbook is documented.
- [ ] Audit note template is defined.
- [ ] Escalation path to engineering is documented.
- [ ] At least one resolved issue has a completed audit note.

### Real-Surface Proof

| Surface | How |
|---|---|
| Document | `.ai/10_state/operational-runbooks.md` response section |
| Artifact | Completed audit note for at least one resolved issue |
| Handoff | Support Response records handoff to engineering or Launch Operations |

---

## Scenario 6 — Launch Operations Authorizes Beta Widening

**Given** all prior personas have confirmed handoff.

**When** the Launch Operations operator reviews the launch readiness summary.

**Then** all 4 launch proof items are confirmed and the go/no-go vote is green.

### Pass Condition

- [ ] All prior persona handoffs are confirmed.
- [ ] Cohort composition is documented.
- [ ] Release campaign safety is confirmed.
- [ ] Go/no-go vote is recorded with rationale.
- [ ] Vote is green (authorize widening).

### Real-Surface Proof

| Surface | How |
|---|---|
| Document | `.ai/10_state/operational-runbooks.md` launch section |
| Artifact | Launch readiness summary with all handoffs and vote |
| Handoff | Launch Operations records authorization in operational runbook |

---

## Scenario 7 — Adjacent-Surface Regression

**Given** the fix for UX-038 shipped (persona definitions and CSV split).

**When** a caller or sibling that depends on the same canonical CSV runs.

**Then** no regression.

### Pass Condition

- [ ] All existing tests in affected surface pass.
- [ ] No new lint / type errors.
- [ ] Conflict group **Operations/provider** has no parallel-change hazard.

### Real-Surface Proof

| Surface | How |
|---|---|
| Test runner | Full surface suite passes |
| `bun run validate` | Passes or quarantined per UX-028 |

---

## Scenario 8 — Conflict-Group Coordination

**Given** UX-038 is in the Operations/provider conflict group.

**Pass condition:** no merge race; the Operations/provider lead signs off in `../LOOP_LEDGER.md`.

---

## Linkage

- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
- [06-VERIFICATION-AND-PROOF.md](06-VERIFICATION-AND-PROOF.md)
