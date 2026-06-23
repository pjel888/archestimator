# 08 — Decisions And Dependencies

Date: 2026-06-23

## Conflict Group Assignment

**Primary conflict group:** Operations/provider

Per the canonical `03-sequencing-dependencies-and-conflicts.md`, UX-038 is owned by the **Operations/provider** lead integrator.

---

## Decision Gate

**No hard decision gate applies.** This issue may be implemented directly, subject to conflict-group coordination. However, the following decisions should be recorded in `09-decision-ledger.md`:

1. **Who is the Incident Commander?** — Name or role assignment.
2. **Who is the Provider Owner?** — Name or role assignment.
3. **Who is the Privacy/Legal Owner?** — Name or role assignment.
4. **Who handles Support Triage?** — Name or role assignment.
5. **Who handles Support Response?** — Name or role assignment.
6. **Who is Launch Operations?** — Name or role assignment.
7. **What is the fallback if a persona is unstaffed?** — For example, if no dedicated Incident Commander exists, does the Provider Owner absorb monitoring duties?

These decisions are operational, not technical. They do not block implementation of the persona definitions, but they must be recorded before beta widening.

---

## Dependencies

### Blocking Dependencies (must complete first)

- **UX-029** — Provider proof owners. UX-038 depends on UX-029 for the provider owner assignments (Resend, Supabase, Vercel, Maps). Without UX-029, the Provider Owner persona cannot be fully defined.
- **UX-028** — QA route manifest. UX-038 depends on UX-028 for the verification matrix decomposition (TV-OPS-SUPPORT must be decomposed into per-persona gates).

### Parallel Dependencies (same conflict group, coordinate)

- **UX-039** — Notification campaign authoring. Launch Operations may need to coordinate with UX-039 for release campaign safety checks.

### Blocked-By Issues (these wait on UX-038)

- **UX-040** — Admin repair workflow. Support Response persona definition may inform UX-040's repair action playbook.
- Any future issue that requires a clear operational handoff before launch.

---

## Phase Sequencing

Per `03-sequencing-dependencies-and-conflicts.md`, UX-038 is in **Phase 3** (IU-19).

Sequence within IU-19:
1. UX-029 (provider proof owners) — defines provider assignments.
2. UX-038 (operations persona split) — defines personas and handoffs using those assignments.
3. UX-039 (notification campaigns) — uses Launch Operations persona for campaign coordination.

---

## Open Questions

| Question | Owner | Resolution | Date |
|---|---|---|---|
| Who is the Incident Commander? | Operations lead | Pending assignment | (pending) |
| Who is the Provider Owner? | Operations lead | Pending assignment | (pending) |
| Who is the Privacy/Legal Owner? | Operations lead | Pending assignment | (pending) |
| Who handles Support Triage? | Operations lead | Pending assignment | (pending) |
| Who handles Support Response? | Operations lead | Pending assignment | (pending) |
| Who is Launch Operations? | Operations lead | Pending assignment | (pending) |
| What is the fallback for unstaffed personas? | Operations lead | Pending decision | (pending) |
| Should Support Triage and Support Response be the same person for closed beta? | Operations lead | Pending decision | (pending) |

---

## Decision Categories

### Staffing Decisions

| Persona | Decision | Options | Default |
|---|---|---|---|
| Incident Commander | Who owns monitoring? | Dedicated role, Provider Owner, or Engineering lead | Provider Owner (fallback) |
| Provider Owner | Who owns providers? | Dedicated role, Engineering lead, or DevOps | Engineering lead |
| Privacy/Legal Owner | Who owns legal? | Dedicated role, Founder, or External counsel | Founder |
| Support Triage | Who owns triage? | Dedicated role, Customer success, or Founder | Founder |
| Support Response | Who owns response? | Dedicated role, Engineering, or Founder | Engineering |
| Launch Operations | Who owns launch? | Dedicated role, Product lead, or Founder | Product lead |

### Fallback Decisions

| Unstaffed persona | Fallback owner | Rationale |
|---|---|---|
| Incident Commander | Provider Owner | Monitoring and providers are closely coupled |
| Support Triage | Support Response | For closed beta, triage and response can be combined |
| Privacy/Legal Owner | Launch Operations | Legal clearance is a launch gate |
| Launch Operations | Founder | Final go/no-go should rest with founder for beta |

### Scope Decisions

| Decision | Options | Recommendation |
|---|---|---|
| Should personas be formal roles or hats? | Formal roles vs. hats worn by existing team | Hats for closed beta, formal roles for public launch |
| Should handoffs be documented or automated? | Markdown checklists vs. automated workflow | Markdown checklists for beta, automated for scale |
| Should persona views be a UI dashboard? | UI dashboard vs. markdown runbooks | Markdown runbooks for beta, UI dashboard for scale |

## Cross-References

- [../00-README-INDEX.md](../00-README-INDEX.md)
- [../LOOP_LEDGER.md](../LOOP_LEDGER.md)
- Canonical sequencing: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md`
- Canonical decision ledger: `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/09-decision-ledger.md`
- Related issue: `../UX-029-provider-proof-owners/`
- Related issue: `../UX-028-qa-route-manifest/`
