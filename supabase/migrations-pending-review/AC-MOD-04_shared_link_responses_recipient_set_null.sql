-- =============================================================================
-- AC-MOD-04 — Preserve a recipient's locked decision when the recipient is removed
-- STATUS: READY FOR REVIEW — *** DO NOT AUTO-APPLY *** (no DB write channel for agents)
-- Plan: .ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/13_OWNER_MODAL_FUNCTIONAL_AUDIT.md §5.2
-- -----------------------------------------------------------------------------
-- PROBLEM
--   public.shared_link_responses.recipient_id is `NOT NULL ... ON DELETE CASCADE`
--   (migration 20260528220000_project_shared_link_overhaul.sql:59). Removing a
--   recipient (hard DELETE in removeSharedLinkRecipient) therefore CASCADE-destroys
--   that recipient's single locked accept/decline/revision decision — an
--   audit-relevant artifact — with no way to recover it.
--
-- FIX (recommended, minimal): mirror the sibling table. shared_link_comments.recipient_id
--   is already `ON DELETE SET NULL` (same migration, lines 46/69). Make
--   shared_link_responses.recipient_id nullable + SET NULL so the decision row
--   survives a recipient removal (the response is retained; only the link to the
--   now-deleted recipient is cleared). The app already requires an explicit confirm
--   before removing a recipient who has a decision (AC-MOD-04 UI, shipped).
--
-- WHY SET NULL IS SAFE HERE
--   * The unique constraint is on (recipient_id, publication_id); NULLs do not
--     conflict in a Postgres unique index, so retained-but-detached rows coexist.
--   * The `on conflict (recipient_id, publication_id) do nothing` in
--     submit_shared_link_response only fires for non-null recipient_id (live recipients).
--   * `decision`, `note`, `snapshot_version_at_decision`, `publication_id`,
--     `created_at` are all preserved — the audit trail stays intact, only attribution
--     to the deleted recipient is lost.
--
-- ALTERNATIVE (more thorough, NOT in this file): soft-delete recipients
--   (add shared_link_recipients.deleted_at, filter it everywhere it is read, and keep
--   the FK as-is). That preserves attribution but requires app-code changes in
--   listSharedLinkRecipients / addSharedLinkRecipients (unique index) / the modal.
--   Prefer this if attribution must be retained; it is a larger change.
--
-- PRE-FLIGHT (run first; informational — how many decisions would otherwise be lost)
--   SELECT count(*) AS decisions_at_risk
--   FROM public.shared_link_responses r
--   WHERE r.recipient_id IS NOT NULL;
--
-- ROLLBACK
--   Re-adding NOT NULL is only possible if no row has a NULL recipient_id. To revert:
--     ALTER TABLE public.shared_link_responses
--       DROP CONSTRAINT shared_link_responses_recipient_id_fkey;
--     ALTER TABLE public.shared_link_responses
--       ADD CONSTRAINT shared_link_responses_recipient_id_fkey
--       FOREIGN KEY (recipient_id) REFERENCES public.shared_link_recipients(id) ON DELETE CASCADE;
--     -- (only if no NULLs:) ALTER TABLE public.shared_link_responses ALTER COLUMN recipient_id SET NOT NULL;
-- =============================================================================

BEGIN;

-- 1) Allow the decision row to outlive its recipient.
ALTER TABLE public.shared_link_responses
  ALTER COLUMN recipient_id DROP NOT NULL;

-- 2) Replace the CASCADE foreign key with SET NULL.
--    NOTE: the auto-generated constraint name is shared_link_responses_recipient_id_fkey.
--    Verify with:  \d+ public.shared_link_responses   (or query pg_constraint)
--    and adjust the DROP CONSTRAINT name below if your environment differs.
ALTER TABLE public.shared_link_responses
  DROP CONSTRAINT shared_link_responses_recipient_id_fkey;

ALTER TABLE public.shared_link_responses
  ADD CONSTRAINT shared_link_responses_recipient_id_fkey
  FOREIGN KEY (recipient_id)
  REFERENCES public.shared_link_recipients(id)
  ON DELETE SET NULL;

COMMIT;

-- POST-CHECK (should report the SET NULL action):
--   SELECT conname, confdeltype  -- 'n' = SET NULL, 'c' = CASCADE
--   FROM pg_constraint
--   WHERE conrelid = 'public.shared_link_responses'::regclass
--     AND contype = 'f' AND conname = 'shared_link_responses_recipient_id_fkey';
