# RS-5 / RS-6 / Error taxonomy — smaller correctness & UX items

**Last updated:** 2026-06-14
**Status:** Deferred — low severity / latent.
**Severity:** Low–Medium · **Effort:** Small each · **Risk:** Low

---

## RS-6 — Bulk project-source insert can clobber itself (display race)

**Where:** `src/components/workshop/component-library/index.tsx` (~`bulkProjectSourceTargets.forEach(addProjectSource)`) → each `insertProjectSourceIntoParentById` (`EstimateSheetContent.tsx`).
**Problem:** Bulk-add launches multiple project-source inserts in parallel. Each is **non-optimistic** and applies a full post-insert tree snapshot on resolve; whichever server read snapshots last wins, so an earlier-committed insert can drop from view until reload. (Server data stays consistent — each RPC is idempotent + history-stamped; this is a client display race.)
**Why no per-insert guard:** the single project-source handler is intentionally non-optimistic, so a revision guard there would make the insert *vanish* (documented inline in `insertProjectSourceIntoParentById`). The correct fix is at the **loop**, not the handler.
**Fix:** Serialize the bulk loop — `await` each insert before the next (so each server read sees prior commits), or batch them into one server action that copies all selected sources and refreshes once (mirrors the template `insertEstimateTemplatesIntoEstimate` batch added 2026-06-14).
**Acceptance:** bulk-adding K sources shows all K after settle, deterministically.

---

## RS-5 — Cross-workspace source can be browsed but the RPC rejects the insert (latent)

**Where:** browse scope (`listReusableProjectSources` → `listCurrentWorkspaceProjects`, includes shared/cross-workspace projects) vs. the RPC's same-workspace guard (`insert_estimate_subtree_into_estimate_with_history` → "Source does not belong to the target estimate workspace.").
**Problem:** A project shared into the user from another workspace can appear as an insertable source, but the insert RPC throws a same-workspace error → surfaces as the generic "Couldn't insert the project source. Try again." (Verified **0 cross-workspace shared memberships exist today**, so it's latent, not active.)
**Fix:** Either (a) filter cross-workspace projects out of reusable sources when a target estimate is in context, or (b) map the RPC's workspace-mismatch error to a clear message ("Sources from other workspaces can't be inserted").
**Acceptance:** a cross-workspace source is either not offered, or fails with a specific, honest message.

---

## INS-8 / RS-7 — Error taxonomy: stop leaking raw DB messages; map to friendly copy

**Where:** server actions interpolate raw Postgres `error.message` into thrown errors (`src/lib/estimates/actions.ts` template inserts; `src/lib/reusable-sources/actions.ts:380`).
**Problem:** Today the client `.catch` shows a fixed friendly toast (the 2026-06-14 pass added those for template inserts), so raw text isn't shown — but (a) distinct failure modes (edit-denied, source-deleted, workspace-mismatch, validation) are indistinguishable to the user, and (b) the raw message still travels in the server-action error.
**Fix:** Log the raw `error.message` server-side; throw a generic user-facing message. Map known signatures (access denied, target not found, workspace mismatch) to specific friendly copy so the toast can be precise.
**Acceptance:** no raw DB/constraint text in thrown errors; known failures get distinct messages.

## References

- Audit findings RS-5, RS-6, INS-8, RS-7 (insert-flows + reusable-sources audits).
