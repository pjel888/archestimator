# 07 — Blast Radius And Rollback

Date: 2026-06-23

## Affected Files

| Path | Change type | Risk |
|---|---|---|
| `canonical-feature-status.csv` | Split operational rows by persona | 3 — data reorganization risk |
| `.ai/10_state/operational-personas.md` | New persona definitions | 1 — additive docs |
| `.ai/10_state/operational-runbooks.md` | New runbook sections | 1 — additive docs |
| `scripts/check-support-monitoring-readiness.ts` | Add owner comment | 1 — comment only |
| `scripts/check-resend-readiness.ts` | Add owner comment | 1 — comment only |
| `scripts/check-legal-owner-readiness.ts` | Add owner comment | 1 — comment only |
| `scripts/check-supabase-linked-readiness.ts` | Add owner comment | 1 — comment only |
| `scripts/check-vercel-env-readiness.ts` | Add owner comment | 1 — comment only |
| `scripts/check-vercel-health-readiness.ts` | Add owner comment | 1 — comment only |
| `scripts/check-vercel-production-readiness.ts` | Add owner comment | 1 — comment only |
| `06-verification-matrix-and-proof-runbook.md` | Decompose TV-OPS-SUPPORT | 2 — matrix reorganization |
| `09-decision-ledger.md` | Add persona boundary decisions | 1 — additive docs |

### Aggregate Risk

- **Blast radius class:** Medium — documentation and comment changes only, no code logic changes.
- **Conflict group:** Operations/provider — coordinate with Operations/provider lead.
- **RLS / auth risk:** No — no permission/RLS changes.
- **Data migration risk:** No — no database changes.
- **Provider state risk:** No — no provider configuration changes.

## What Could Go Wrong

1. **Canonical CSV split loses information** — if the split is done incorrectly, some operational rows may lose their original acceptance criteria or stop conditions.
2. **Script owner comments become stale** — if personas are reassigned, the comments in scripts may drift from reality.
3. **Verification matrix decomposition creates gaps** — if TV-OPS-SUPPORT is split without care, some proof obligations may be orphaned between personas.
4. **Operational runbooks are not maintained** — if the runbooks are written but not updated, they become stale and misleading.

## Mitigations

1. **Canonical CSV split** — preserve original rows until new rows are verified; use additive edits, not destructive replacements.
2. **Script owner comments** — use a single source of truth (`.ai/10_state/operational-personas.md`) and reference it from scripts rather than duplicating owner names.
3. **Verification matrix** — map every original TV-OPS-SUPPORT proof item to a new persona-specific gate; verify no items are orphaned.
4. **Operational runbooks** — include a "last updated" date and a revision history in each runbook section.

---

## Migration / Data Impact

No data migration. No database changes. No provider state changes. All changes are documentation, CSV reorganization, and script comments.

---

## Rollback Plan

### Documentation Rollback

```sh
git revert <commit-sha>
```

If the persona split is rejected:
- Revert the canonical CSV split.
- Revert the operational personas and runbooks.
- Revert the verification matrix decomposition.
- Revert the decision ledger updates.

### Script Comment Rollback

- Revert the owner comments in readiness check scripts.
- These are comment-only changes; no functional impact.

### Data Rollback

No data rollback needed — no data changes.

---

## Conflict-Group Parallel Hazards

Issue is in **Operations/provider**. Per `03-sequencing-dependencies-and-conflicts.md`:

- Do NOT implement concurrently with other group members (UX-028, UX-029, UX-039) without Operations/provider lead integrator.
- Lead signs off in `../LOOP_LEDGER.md` before merge.
- UX-038 depends on UX-029 (provider proof owners) for provider owner assignments.

---

## Pre-Merge Checklist

- [ ] All acceptance scenarios PASS with RED→GREEN proof.
- [ ] Canonical CSV split verified against original rows (no data loss).
- [ ] Every `launch:*` script has a documented owner.
- [ ] Verification matrix decomposed with no orphaned proof items.
- [ ] `lsp_diagnostics` clean (for any script comment changes).
- [ ] No regression in conflict-group siblings.
- [ ] `bun run validate` passes or quarantined suites documented.
- [ ] Rollback plan tested locally (revert commit and verify no functional impact).
- [ ] `../LOOP_LEDGER.md` updated.

---

## Linkage

- [06-VERIFICATION-AND-PROOF.md](06-VERIFICATION-AND-PROOF.md)
- [08-DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md)
