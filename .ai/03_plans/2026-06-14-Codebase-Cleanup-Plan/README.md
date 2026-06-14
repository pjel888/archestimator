# Codebase Cleanup Plan — 2026-06-14

**Purpose:** whole-app cleanup intelligence pass — dead/duplicated/stale/superseded/non-MVP code, unused deps, stale schema, and pre-launch MVP simplification, with deletion-readiness, migration-readiness, and validation design.

- **Date:** 2026-06-14
- **Status:** AUDIT / PLANNING / DELETION-READINESS ONLY (no code/files/deps/migrations changed)
- **Folder:** `/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan`
- **Repo root:** `/Users/philiplewis/Documents/archestimator` · GitHub `pjel888/archestimator` · branch `main` · HEAD `2f28daf147ac`
- **Pre-launch posture:** closed beta, owner-only → prefer deletion/consolidation over speculative backward-compat, EXCEPT security/share/auth/audit/legal and the active estimate-tree unification corridor.

## Non-goals (honored)

No source edits · no file deletion · no `package.json` change · no migrations applied · no Supabase/Vercel/GitHub/DNS/provider mutation · no secret exposure · no SlateCamp · no irreversible data loss · DB findings are static (no live DB queried).

## File list & recommended reading order

1. `CURRENT_CANONICAL_PLAN.md` — single source of truth (read first)
2. `00_EXECUTIVE_SUMMARY.md`
3. `18_READINESS_DECISION.md` — decision + top-10 lists + exact next prompt
4. `04_DELETION_CANDIDATE_MATRIX.md` — every candidate (F01–F40), all columns
5. `17_IMPLEMENTATION_PHASE_PLAN.md` — P0–P6
6. `19_OPEN_QUESTIONS_OWNER_GATES.md` — decisions needed
7. Audit docs: `05` routes/API · `06` components/hooks/stores · `07` server/domain · `08` DB/schema/RLS · `09` deps/build · `10` tests/storybook/scripts · `11` assets/env/flags · `12` docs/.ai
8. `03_DEAD_CODE_INVENTORY.md` · `13_CLEANUP_SPEED_AND_COMPLEXITY_MATRIX.md`
9. `14_TESTING_AND_VALIDATION_PROTOCOL.md` · `15_MIGRATION_READINESS_AND_ROLLBACK_PLAN.md` · `16_RISK_REGISTER_AND_BLAST_RADIUS.md`
10. `01_AUDIT_SCOPE_AND_METHOD.md` · `02_REPO_ARCHITECTURE_AND_CURRENT_STATE.md`
11. `evidence/` — command log, inventories, import-reference index, dependency analysis, route/API + DB + flag inventories, test cleanup map, findings index, raw gate logs

## Current cleanup readiness decision

**READY FOR P0+P1 CLEANUP IMPLEMENTATION** (safe code-only deletes + low-risk dependency/asset/doc cleanup). Database cleanup = **MIGRATION CLEANUP PLANNING ONLY** behind a dry-run + owner gate. Not "aggressive" — the biggest cut (AI) is an owner product decision and the unification corridor must stay intact.

## Top safe deletes

Dead landing graveyard (F03) · `cost-library-repository.ts` (F04) · `domain/estimate-totals.ts` (F05) · `ProjectWorkspaceHeaderRow`/`ProjectWorkspaceProjectCode` (F01) · `ArchestimatorMark` (F02) · dead project-action wrappers (F06) · stale `revalidatePath` (F10) · ~9.9 MB public assets (F12) · dead CSS (F13) · deps `three`/`d3`-umbrella/`cva` (F20–F22).

## Top migration candidates

Drop `profile_role_hardening_audit` (F29) · drop `resolve_app_role_for_email` (F30). Both post-beta, destructive, owner-gated, with dump+rollback. Nothing else is a true drop candidate.

## Top owner gates

AI keep-deferred vs cut (OG-1/F25) · follow-mode helpers+flag (OG-2/F07) · project page cursors (OG-3/F26) · aec-classification (OG-4/F17) · story-only UI primitives (OG-6/F15) · BulkActionToolbar consolidation (OG-7/F28) · DB drops DG-1/DG-2 (F29/F30).

## Exact next action

Run the P0+P2+P6 implementation prompt in `18_READINESS_DECISION.md` (§"Exact next implementation prompt") — implements only `DELETE_NOW`/`DELETE_AFTER_LOCAL_PROOF`, leaves DB drops behind the P4/P5 owner gate, and gates every group against the recorded baseline. Then answer `19` to unlock P1.

> Reminder: **do not implement from stale docs** (README/features-page are themselves cleanup targets), and **do not mutate production/provider/database from this audit**.
