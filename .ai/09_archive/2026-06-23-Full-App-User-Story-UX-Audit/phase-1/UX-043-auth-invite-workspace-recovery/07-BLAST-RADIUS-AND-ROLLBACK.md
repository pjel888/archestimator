# UX-043 — Blast Radius And Rollback

Date: 2026-06-23

## Affected Files

| Path | Change type | Risk |
|---|---|---|
| `src/proxy.ts` | Apply fix | 2 |
| `src/app/login/` | Apply fix | 2 |
| `src/app/auth/callback/` | Apply fix | 2 |
| `src/app/invite/[token]/` | Apply fix | 2 |
| `src/app/workshop/settings/workspace/` | Apply fix | 2 |
| `src/app/workshop/settings/profile/` | Apply fix | 2 |

### Aggregate Risk

- **Blast radius class:** Medium
- **Conflict group:** Auth/support boundary — coordinate with Auth/support lead.
- **RLS / auth risk:** Yes — see 08-DECISIONS-AND-DEPENDENCIES

---

## Migration / Data Impact

No data migration. Code/UI only.

---

## Rollback Plan

### Code Rollback

```sh
git revert <commit-sha>
```

### UI Rollback

- [ ] Disable new state via feature flag (if applicable).
- [ ] Old behavior MUST remain accessible (additive, not destructive).

### Data Rollback

No data rollback needed — code/UI only.

---

## Conflict-Group Parallel Hazards

Issue is in **Auth/support boundary**. Per [03-sequencing](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md):

- Do NOT implement concurrently with other group members without Auth/support lead integrator.
- Lead signs off in `../LOOP_LEDGER.md` before merge.

---

## Pre-Merge Checklist

- [ ] All acceptance scenarios PASS with RED→GREEN proof.
- [ ] `lsp_diagnostics` clean.
- [ ] No regression in conflict-group siblings.
- [ ] `bun run validate` passes or quarantined suites documented.
- [ ] Rollback plan tested locally.
- [ ] `../LOOP_LEDGER.md` updated.

---

## Linkage

- [06-VERIFICATION-AND-PROOF.md](06-VERIFICATION-AND-PROOF.md)
- [08-DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md)
