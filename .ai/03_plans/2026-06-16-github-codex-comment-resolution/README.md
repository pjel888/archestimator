# GitHub Codex Comment Resolution Tracker

Date: 2026-06-16
Repository: `pjel888/archestimator`
Scope: resolve all currently open, unresolved GitHub review threads authored by `chatgpt-codex-connector` on open PRs.

## Live Inventory Snapshot

Collected with:

- `gh pr list --repo pjel888/archestimator --state open --limit 100 --json number,title,headRefName,baseRefName,author,reviewDecision,isDraft,mergeStateStatus,updatedAt,url`
- GraphQL review-thread fetch using the GitHub skill's `gh-address-comments/scripts/fetch_comments.py`

Open PRs: 21
Open issues: 0
Codex review threads found: 21 across 9 PRs
Final active unresolved non-outdated threads: 0

## Execution Constraints

- Work from live GitHub and local git state; do not rely on older session memory.
- Use isolated git worktrees for PR branch edits so parallel agents do not write into the same checkout.
- Keep fixes scoped to the relevant PR branch unless a conflict requires a different integration decision.
- Do not overwrite unrelated user/agent work.
- Verify each PR branch with targeted checks for its changed behavior.
- Only mark a thread done after the branch contains a direct fix and the thread is gone, resolved, or outdated on GitHub.

## Comment Matrix

| Status | PR | Branch | Thread | Path | Summary | Resolution notes |
| --- | ---: | --- | --- | --- | --- | --- |
| Resolved on GitHub | #83 | `codex/fix-expired-envelope-issue-in-cursor-broadcasts` | `PRRT_kwDOSfSDcs6JxtSJ` | `src/hooks/use-estimate-cursor-broadcast.ts` | Retry identity issuance after clearing expired envelopes | Pushed commit `6582d0a7`; red/green `tests/vitest/estimate-cursor-identity.test.ts`, `bun run type-check`, `git diff --check`. |
| Resolved on GitHub | #81 | `codex/fix-non-atomic-batched-template-insert` | `PRRT_kwDOSfSDcs6JxtTo` | `src/components/workshop/EstimateSheetContent.tsx` | Reconcile partial failures after newer optimistic edits | Pushed commit `95da9d27`; focused regression passes, typecheck and `git diff --check` pass; full file test was not completed after 60s startup stall. |
| Resolved on GitHub | #79 | `codex/fix-indefinite-drag-auto-scroll-issue` | `PRRT_kwDOSfSDcs6Jxp0A` | `src/components/workshop/estimate-sheet/rows/use-drag-edge-autoscroll.ts` | Ignore bubbled child dragleave events | Pushed commits `fb5b19a1`, `b622c054`; verifier blocker fixed for child-to-outside exits; focused autoscroll tests, `bun run type-check`, `git diff --check`. |
| Resolved on GitHub | #78 | `codex/propose-fix-for-supabase-pat-leak` | `PRRT_kwDOSfSDcs6Jxpn9` | `.ai/09_archive/2026-06-14-Database-Migration-Check/evidence/enable-leaked-password-protection.sh` | Accept newline-less token files | Pushed commit `a91a6314`; verified `bash -n`, newline-less token harness, `git diff --check`. |
| Resolved on GitHub | #76 | `codex/propose-fix-for-notification-action-href-vulnerability` | `PRRT_kwDOSfSDcs6Jxm0p` | `supabase/migrations/20260615090000_harden_notification_action_href.sql` | Reject backslash-delimited dot segments | Pushed commit `f626c04d`; migration/runtime rejects literal backslash dot segments. |
| Resolved on GitHub | #76 | `codex/propose-fix-for-notification-action-href-vulnerability` | `PRRT_kwDOSfSDcs6Jxm0u` | `supabase/migrations/20260615090000_harden_notification_action_href.sql` | Clean existing unsafe hrefs before adding the CHECK | Pushed commit `f626c04d`; cleanup-before-CHECK locked by tests and Postgres 17 harness. |
| Resolved on GitHub | #76 | `codex/propose-fix-for-notification-action-href-vulnerability` | `PRRT_kwDOSfSDcs6Jxm0y` | `supabase/migrations/20260615090000_harden_notification_action_href.sql` | Move the hardening migration after existing versions | Pushed commit `f626c04d`; migration re-versioned to `20260615093649_harden_notification_action_href.sql`; focused tests, typecheck, diff check pass. |
| Resolved on GitHub | #72 | `codex/fix-terms-acceptance-bypass-in-api-routes` | `PRRT_kwDOSfSDcs6JxlFp` | `src/lib/auth/session.ts` | Let the Terms acceptance action bypass the gate | Pushed commit `aed3c86c`; legal action opts out so acceptance can persist. |
| Resolved on GitHub | #72 | `codex/fix-terms-acceptance-bypass-in-api-routes` | `PRRT_kwDOSfSDcs6JxlFr` | `src/lib/auth/session.ts` | Gate getCurrentUserContext-only protected endpoints too | Pushed commit `aed3c86c`; direct callers explicitly Terms-checked; targeted auth tests pass. |
| Resolved on GitHub | #72 | `codex/fix-terms-acceptance-bypass-in-api-routes` | `PRRT_kwDOSfSDcs6JxlFv` | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | Keep Terms-check failures inside the export JSON error path | Pushed commit `aed3c86c`; export tests, direct-caller tests, typecheck, `git diff --check` pass. |
| Resolved on GitHub | #69 | `codex/fix-resource-exhaustion-in-search-action` | `PRRT_kwDOSfSDcs6JxkH1` | `src/lib/reusable-sources/actions.ts` | Reserve cap slots for the actual search hit | Pushed commit `b2e173eb`; matching results are prioritized before ancestors. |
| Resolved on GitHub | #69 | `codex/fix-resource-exhaustion-in-search-action` | `PRRT_kwDOSfSDcs6JxkH4` | `src/lib/reusable-sources/actions.ts` | Do not cap away the node that matched the prefilter | Pushed commit `b2e173eb`; prefilter hits are preserved through materialization. |
| Resolved on GitHub | #69 | `codex/fix-resource-exhaustion-in-search-action` | `PRRT_kwDOSfSDcs6JxkH7` | `src/lib/reusable-sources/actions.ts` | Apply estimate cap before fetching sheets | Pushed commit `b2e173eb`; repository/search work bounded before materializing results. |
| Resolved on GitHub | #69 | `codex/fix-resource-exhaustion-in-search-action` | `PRRT_kwDOSfSDcs6JxkH8` | `src/lib/reusable-sources/actions.ts` | Deduplicate estimates before applying the row cap | Pushed commit `b2e173eb`; focused reusable-sources tests pass. |
| Resolved on GitHub | #69 | `codex/fix-resource-exhaustion-in-search-action` | `PRRT_kwDOSfSDcs6JxkH-` | `src/lib/reusable-sources/actions.ts` | Bound project retrieval before slicing | Pushed commit `b2e173eb`; typecheck, diff check, and touched-file lint pass. |
| Resolved on GitHub | #69 | `codex/fix-resource-exhaustion-in-search-action` | `PRRT_kwDOSfSDcs6JxkIE` | `src/lib/reusable-sources/actions.ts` | Limit the tab fan-out before loading trees | Pushed commit `b2e173eb`; tab fan-out bounded before tree materialization. |
| Resolved on GitHub | #68 | `codex/propose-fix-for-dos-vulnerability` | `PRRT_kwDOSfSDcs6JxkvK` | `src/lib/reusable-sources/actions.ts` | Apply the estimate cap after matching | Pushed commit `367df6f0`; caps apply to matched/materialized results; focused tests pass. |
| Resolved on GitHub | #68 | `codex/propose-fix-for-dos-vulnerability` | `PRRT_kwDOSfSDcs6JxkvN` | `src/lib/reusable-sources/actions.ts` | Limit DB matches by distinct estimates | Pushed commit `367df6f0`; DB prefilter rows paged/grouped by distinct estimate; typecheck and diff check pass. |
| Resolved on GitHub | #68 | `codex/propose-fix-for-dos-vulnerability` | `PRRT_kwDOSfSDcs6JxkvP` | `src/lib/reusable-sources/actions.ts` | Search all projects before applying the project cap | Pushed commit `367df6f0`; project cap applies after matching, with targeted regression coverage. |
| Resolved on GitHub | #67 | `codex/fix-search-prefilter-row-truncation` | `PRRT_kwDOSfSDcs6JxirJ` | `src/lib/reusable-sources/actions.ts` | Order prefilter pages before applying ranges | Pushed commit `576c090a`; added stable `estimate_id` ordering before ranged pages. |
| Resolved on GitHub | #67 | `codex/fix-search-prefilter-row-truncation` | `PRRT_kwDOSfSDcs6JxirN` | `src/lib/reusable-sources/actions.ts` | Avoid draining duplicate raw rows per search | Pushed commit `576c090a`; added bounded prefilter scan ceiling; verified `bun run test:dom tests/vitest/reusable-sources-actions.test.ts`, `git diff --check`. |

## Work Waves

1. Single-branch/single-file fixes: #83, #81, #79, #78.
2. Migration hardening branch: #76.
3. Terms/auth branch: #72.
4. Reusable-sources branches: #67, #68, #69. These overlap in one file but live on separate PR branches; use separate worktrees and do not cross-pollinate branch-specific intent without explicit evidence.

## Final Completion Evidence

- All nine edited PR branches pushed successfully.
- All nine PR worktrees report `0 0` divergence against their upstream branches after push.
- GitHub GraphQL thread audit across all 21 open PRs found `total_threads: 21` and `active_unresolved_not_outdated: 0`.
- All 21 Codex review thread IDs in the matrix are resolved on GitHub.
