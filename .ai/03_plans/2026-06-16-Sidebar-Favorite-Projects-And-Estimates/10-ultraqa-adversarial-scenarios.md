# 10 — UltraQA Adversarial Scenarios

## Goal

Prove the implementation cannot falsely look correct while sidebar, local surface, server state,
query cache, or access scope diverge.

## Scenario matrix

| ID | Scenario | Expected signal |
|---|---|---|
| QA-01 | Favorite a project on Projects page. | Card and sidebar update before reload; no `router.refresh()` dependency. |
| QA-02 | Unfavorite a project with nested sheets. | Project and nested sheets disappear; reload matches. |
| QA-03 | Favorite an estimate under visible sidebar favorite project within the top-8 cap. | Row and nested sidebar sheet update. |
| QA-04 | Favorite an estimate under non-favorited project. | Row updates, sidebar unchanged. |
| QA-05 | Favorite a 9th project. | Visible sidebar trims to top 8 by timestamp. |
| QA-06 | Favorite a 6th sheet. | Visible nested sheets trim to top 5. |
| QA-07 | Favorite an estimate under favorited parent outside visible top-8. | Row updates; sidebar unchanged until parent enters visible set. |
| QA-08 | Rapid project favorite -> unfavorite -> favorite. | Latest intent wins. |
| QA-09 | Rapid estimate toggle with in-flight query refetch. | No stale refetch wins over latest intent. |
| QA-10 | Project server action rejects. | Card/sidebar rollback and accessible error. |
| QA-11 | Estimate server action rejects. | Row/sidebar rollback and accessible error. |
| QA-12 | Scope changes user/workspace. | Old favorites are not rendered or prefetched. |
| QA-13 | Invalid UUID or non-boolean favorite reaches action. | Fails closed with client-safe error. |
| QA-14 | Cross-workspace project/estimate id. | No persistence; no favorite data leakage. |
| QA-15 | Long/unicode/instruction-like project names. | Render as text only; no layout break. |
| QA-16 | Browser/auth proof unavailable. | Gap recorded; component/type evidence still run. |
| QA-17 | Sign out, then a different user signs in in the same browser. | No prior favorites render or are prefetched; favorites cache cleared on logout (`13` C5). |
| QA-18 | Focused favorite link is removed by unfavorite or rollback. | Focus moves to nearest remaining link, else the Favorites header; never escapes to `<body>` (`08` Focus management). |
| QA-19 | Navigate between workshop routes, then favorite changes server-side. | Query refetches on remount/invalidation (`staleTime: 0`); sidebar reconciles to server truth, no 5-min staleness. |
| QA-20 | Rapid toggles with a screen reader active. | Polite advisory announcements do not stack (previous cleared before next); failure uses the assertive region (`08` Live-region). |
| QA-21 | Unfavorite the project/sheet currently being viewed. | Item removed from sidebar immediately; no ghost entry; `aria-current` not emitted for the unrendered link; page content unaffected (`08`). |
| QA-22 | Favorite-derived strings as render input. | No string reaches `dangerouslySetInnerHTML`; `title`/`aria` carry raw text (`13` C6). |

## Final implementation report shape

```md
## Sidebar Favorites QA Evidence

| Scenario | Status | Evidence |
|---|---|---|
| QA-01 | PASS/FAIL | command/test/manual note |

Commands:
- [exit code] command

Residual risks:
- ...

Cleanup:
- Temporary harnesses removed or intentionally tracked.
```
