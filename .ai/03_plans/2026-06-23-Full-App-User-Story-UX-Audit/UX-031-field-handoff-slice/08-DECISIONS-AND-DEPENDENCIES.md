# UX-031 — Decisions And Dependencies

Date: 2026-06-23

## Conflict Group Assignment

**Primary conflict group:** Collaboration/access paths

Per the canonical [conflict matrix](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-031 is owned by the **Field/collaboration** lead integrator.

---

## Decision Gate

**DEC-UX-031-FIELD-WORKFLOWS (Decision required) + DEC-UX-BETA-COHORT (Decision required) GATE-LOCKED** — see canonical decision ledger for stop/go status. Do NOT implement until resolved.

---

## Dependencies

### Blocking Dependencies (must complete first)

GATE-LOCKED; UX-020, UX-021 (same conflict group); do not add new permission roles without RBAC/RLS plan

### Blocked-By Issues (these wait on UX-031)

```sh
rg 'UX-031' .ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/ | grep -E 'dependencies|Depends'
```

---

## Phase Sequencing

Per [03-sequencing](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-031 is in **Phase 4** (IU-15).

---

## Open Questions

| Question | Owner | Resolution | Date |
|---|---|---|---|
| (pending) | (pending) | (pending) | (pending) |

---

## Cross-References

- [../00-README-INDEX.md](../00-README-INDEX.md)
- [../LOOP_LEDGER.md](../LOOP_LEDGER.md)
- Canonical sequencing: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md`
- Canonical decision ledger: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/09-decision-ledger.md`
