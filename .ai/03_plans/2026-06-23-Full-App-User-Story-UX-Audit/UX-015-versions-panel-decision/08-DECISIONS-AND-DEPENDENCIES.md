# UX-015 — Decisions And Dependencies

Date: 2026-06-23

## Conflict Group Assignment

**Primary conflict group:** Estimate sheet (secondary)

Per the canonical [conflict matrix](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-015 is owned by the **Proposal/export** lead integrator.

---

## Decision Gate

**DEC-UX-015-VERSIONS (Accepted dormant posture)** — named versions stay dormant for Wave 1. Do not build a full Versions panel unless a newer beta recovery objective explicitly supersedes this decision.

---

## Dependencies

### Blocking Dependencies (must complete first)

No blocking dependency for Wave 1 because the accepted action is no code. Later recovery work requires a fresh productization decision plus migration/RLS/test plan if it exceeds activity/history discoverability and restore-as-copy explanation.

### Blocked-By Issues (these wait on UX-015)

```sh
rg 'UX-015' .ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/ | grep -E 'dependencies|Depends'
```

---

## Phase Sequencing

Per [03-sequencing](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-015 is in **Phase 1** (IU-07).

---

## Open Questions

| Question | Owner | Resolution | Date |
|---|---|---|---|
| Should Wave 1 build a Versions panel? | Philip | No. Keep named versions dormant. | 2026-06-23 |

---

## Cross-References

- [../00-README-INDEX.md](../00-README-INDEX.md)
- [../LOOP_LEDGER.md](../LOOP_LEDGER.md)
- Canonical sequencing: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md`
- Canonical decision ledger: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/09-decision-ledger.md`
