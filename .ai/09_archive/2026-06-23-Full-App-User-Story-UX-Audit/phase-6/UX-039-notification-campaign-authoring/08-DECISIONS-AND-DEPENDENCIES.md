# UX-039 — Decisions And Dependencies

Date: 2026-06-23

## Conflict Group Assignment

**Primary conflict group:** Operations/provider

Per the canonical [conflict matrix](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-039 is owned by the **Notifications/ops** lead integrator.

---

## Decision Gate

**DEC-UX-039-CAMPAIGNS (Accepted as lightweight first step)** — implement seeded/manual release campaign rows, CTA validation, and delivery inspection only. Do not build a rich campaign composer in Wave 1.

---

## Dependencies

### Blocking Dependencies (must complete first)

UX-028, UX-029, UX-038 (same conflict group); provider proof required before delivery claims. Do not add a new workshop notifications route unless a later rich-composer decision explicitly creates it.

### Blocked-By Issues (these wait on UX-039)

```sh
rg 'UX-039' .ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/ | grep -E 'dependencies|Depends'
```

---

## Phase Sequencing

Per [03-sequencing](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md), UX-039 is in **Phase 3** (IU-18).

---

## Open Questions

| Question | Owner | Resolution | Date |
|---|---|---|---|
| Should Wave 1 build rich campaign authoring/preview/targeting? | Philip | No. Seeded/manual rows first. | 2026-06-23 |

---

## Cross-References

- [../00-README-INDEX.md](../../00-README-INDEX.md)
- [../LOOP_LEDGER.md](../../LOOP_LEDGER.md)
- Canonical sequencing: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md`
- Canonical decision ledger: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/09-decision-ledger.md`
