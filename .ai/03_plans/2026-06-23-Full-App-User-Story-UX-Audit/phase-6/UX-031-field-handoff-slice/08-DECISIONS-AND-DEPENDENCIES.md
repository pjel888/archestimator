# UX-031 — Decisions And Dependencies

Date: 2026-06-23

## Conflict Group Assignment

**Primary conflict group:** Collaboration/access paths

Per the canonical [conflict matrix](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-031 is owned by the **Field/collaboration** lead integrator.

---

## Decision Gate

**DEC-UX-031-FIELD-WORKFLOWS (later shared-link field package) + DEC-UX-BETA-COHORT (Wave 1 estimator/PM-only)** — see canonical decision ledger for stop/go status. Do not implement field package code in Wave 1.

---

## Dependencies

### Blocking Dependencies (must complete first)

Deferred until cohort expansion; UX-020 and UX-021 remain same-conflict-group dependencies for any future implementation. Do not add new permission roles, invite roles, or RLS changes without an RBAC/RLS plan.

### Blocked-By Issues (these wait on UX-031)

```sh
rg 'UX-031' .ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/ | grep -E 'dependencies|Depends'
```

---

## Phase Sequencing

Per [03-sequencing](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-031 is in **Phase 4** (IU-15).

---

## Open Questions

| Question | Owner | Resolution | Date |
|---|---|---|---|
| What is the first field workflow slice? | Philip | Shared-link field package, later. | 2026-06-23 |
| Is the Wave 1 cohort field/contractor-inclusive? | Philip | No. Estimator/PM only. | 2026-06-23 |

---

## Cross-References

- [../00-README-INDEX.md](../../00-README-INDEX.md)
- [../LOOP_LEDGER.md](../../LOOP_LEDGER.md)
- Canonical sequencing: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md`
- Canonical decision ledger: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/09-decision-ledger.md`
