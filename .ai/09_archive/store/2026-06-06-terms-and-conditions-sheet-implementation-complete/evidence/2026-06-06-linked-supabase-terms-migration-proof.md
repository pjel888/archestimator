# Linked Supabase Terms Migration Proof

**Date:** 2026-06-06
**Branch/worktree:** `codex/terms-and-conditions` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-terms-and-conditions`
**Supabase project:** ArchEstimator `ebxxqidacheyapmmzavr`
**Migration:** `supabase/migrations/20260606095935_legal_terms_acceptance.sql`
**Status:** TERMS MIGRATION APPLIED AND VERIFIED ON LINKED PROJECT / BROAD DB PUSH STILL BLOCKED BY UNRELATED MIGRATION-HISTORY DRIFT

## Commands / evidence

- `supabase link --project-ref ebxxqidacheyapmmzavr --yes` succeeded in this worktree.
- `supabase db push --linked --dry-run` was not usable as the release path because the linked project has pre-existing migration-history drift: remote versions not present in local migrations and local migrations not yet recorded remotely. This drift is tracked separately in `.ai/15_Bugs/2026-06-06-linked-supabase-migration-history-drift-blocks-db-push.md`.
- Exact-file migration apply was used instead: `supabase db query --linked --file supabase/migrations/20260606095935_legal_terms_acceptance.sql --output json`.
- Remote migration history was repaired only for this new version: `supabase migration repair --linked --status applied 20260606095935 --yes --output pretty` returned `Repaired migration history: [20260606095935] => applied`.
- `supabase migration list --linked --output pretty` showed `20260606095935 | 20260606095935 | 2026-06-06 09:59:35` after repair.
- Linked schema readback confirmed `public.legal_terms_acceptances` exists and migration `20260606095935` is recorded.
- Linked schema readback confirmed grants/policies: authenticated role has SELECT only, no INSERT/UPDATE/DELETE; service role has INSERT; one RLS policy exists, `legal_terms_acceptances_select_own`, with own-user `auth.uid()` predicate.
- Linked schema readback confirmed columns: `id`, `user_id`, `terms_key`, `terms_version`, `terms_effective_date`, `terms_content_hash`, `privacy_policy_version`, `acceptance_method`, `acceptance_context`, `metadata_json`, `accepted_at`, and `created_at`.
- Transactional RLS own-row smoke with valid constrained values returned `own_visible_count: 1` and rolled back.
- Transactional cross-user denial was previously verified in this branch run as `other_visible_count: 0`; a later replay after repeated CLI auth failures was blocked by Supabase temp-role/circuit-breaker authentication errors, so the earlier proof plus policy readback are the current evidence until the temp-role circuit resets.
- `select count(*) as legal_terms_acceptances_total_rows from public.legal_terms_acceptances` returned `0`, confirming no test-row residue after the proof.
- `supabase gen types typescript --linked --schema public > /tmp/archestimator-linked-types.ts` succeeded earlier in this branch run; brace-count comparison showed the committed `legal_terms_acceptances` block in `src/lib/supabase/types.ts` exactly matched the linked-generated block: 45 local lines, 45 linked lines, `blocks_match True`.

## Current interpretation

This closes the Terms-specific provider migration/type-shape proof for the linked ArchEstimator project. It does **not** close global Supabase migration parity because the project still has unrelated migration-history drift that makes broad `supabase db push --linked` unsafe. Future schema work should continue to use exact-file apply/repair/readback or a dedicated migration-parity reconciliation task before using broad `db push`.

## Remaining legal/product gates

- Qualified lawyer review is still required before public/paid launch enforcement.
- Exact legal entity, notices address, venue/dispute language, arbitration/class-action posture, and future billing/refund language remain owner/legal decisions.
- Hosted authenticated browser proof of a real user accepting Terms is still a separate release smoke, not a migration-schema proof.
