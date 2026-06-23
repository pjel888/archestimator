# UX-032 — Decisions And Dependencies

Date: 2026-06-23

## Conflict Group Assignment

**Primary conflict group:** Project/dashboard/readiness

Per the canonical [conflict matrix](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-032 is owned by the **PM/owner governance** lead integrator.

---

## Decision Gate

**DEC-UX-032-OWNER-READINESS (Accepted as lightweight first step)** — implement readiness checklist, notes, and owner-visible gaps only.

---

## Dependencies

### Blocking Dependencies (must complete first)

UX-006, UX-007, UX-009 (same conflict group); use existing project/share state. No approval workflow, actor approval state, owner margin alert, or final-package lifecycle audit in Wave 1.

### Blocked-By Issues (these wait on UX-032)

```sh
rg 'UX-032' .ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/ | grep -E 'dependencies|Depends'
```

---

## Phase Sequencing

Per [03-sequencing](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-032 is in **Phase 4** (IU-16).

---

## Open Questions

| Question | Owner | Resolution | Date |
|---|---|---|---|
| Should Wave 1 include approval workflow, margin alerts, or final-package lifecycle audit? | Philip | No. Checklist/notes/gaps only. | 2026-06-23 |

---

## Cross-References

- [../00-README-INDEX.md](../00-README-INDEX.md)
- [../LOOP_LEDGER.md](../LOOP_LEDGER.md)
- Canonical sequencing: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md`
- Canonical decision ledger: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/09-decision-ledger.md`
