# Research And Current Audit

## Inputs Reviewed

- User goal: comprehensively improve the project activity page UX/UI, understand
  the activities being presented, and plan around strong dislike of layout
  shifting.
- Active browser URL:
  `http://localhost:3000/workshop/projects/79aa8609-9545-4163-ab6f-2ecbcbd04cd2/activity`
- Product/register docs loaded by Impeccable:
  `PRODUCT.md`, `DESIGN.md`
- Relevant app source and tests under:
  `src/app/workshop/projects/[projectId]/activity/`,
  `src/components/workshop/project-activity/`,
  `src/lib/activity/`,
  `src/lib/repositories/project-activity-feed-repository.ts`,
  `tests/vitest/project-activity-page/`
- External references:
  - web.dev CLS guidance:
    https://web.dev/articles/optimize-cls
  - WAI-ARIA Authoring Practices feed pattern:
    https://www.w3.org/WAI/ARIA/apg/patterns/feed/
  - WCAG 2.2 target size:
    https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
  - WCAG 2.2 name/role/value and label guidance:
    https://www.w3.org/TR/WCAG22/
  - Nielsen Norman Group scanning patterns:
    https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/
  - Nielsen Norman Group layer-cake scanning:
    https://www.nngroup.com/articles/layer-cake-pattern-scanning/

## Current Route And Data Flow

The activity page is server-prefetched and editor-gated:

- `src/app/workshop/projects/[projectId]/activity/page.tsx`
  - Resolves the current user and project.
  - Checks edit access through D1-backed authorization.
  - Reads initial activity with `readProjectActivityFeed`.
  - Reads estimate, member, and client dropdown options in parallel.
  - Passes URL-backed state to the client component.
- `src/app/api/projects/[projectId]/activity/route.ts`
  - Handles load-more requests.
  - Is `force-dynamic`, private/no-store, editor-gated, and clamps limits.
  - Keeps cursor state transient rather than canonical in the URL.
- `src/components/workshop/project-activity/ProjectActivityClient.tsx`
  - Owns filters, URL replacement, refresh, loading, empty/no-match, partial,
    and pagination states.

The URL-backed filters are valuable and should be preserved:

- `scope`
- `action`
- `actor`
- `client`

The cursor should remain transient and must not become a canonical URL state.

## Activity Families

The data model already supports richer presentation than the current UI shows.

| Family | Sources/actions | User question it answers | UX treatment |
| --- | --- | --- | --- |
| Estimate work | row, node, tab, sheet, version, template, metadata changes | What changed in the estimate and where? | Show estimate/sheet/location, before/after or count facts, and a compact impact badge. |
| Sharing/publication | publication, sent, resent, proposal/share actions | Was something published or sent? | Emphasize destination class, version/share state, and safe non-PII recipient label. |
| Client conversation | shared-link comments, internal/public comments | What was discussed? | Show comment type, thread/recipient context, and a short snippet with stable height. |
| Client decision | approved, declined, requested revision | What did the client decide? | Use explicit decision status and proposal context. |
| Client access/security | viewed, password attempted | Who accessed or attempted access? | Show access/security label and safe recipient/client context without emails. |
| Collaboration/admin | invite, role, member removal, project metadata | Who changed project membership or settings? | Treat as admin activity, visually distinct from estimate edits. |
| Unknown/fallback/system | future or unmapped event types | Something happened but copy is not mapped yet | Avoid repeated generic rows; show "System activity recorded" plus safe event family/context where available. |

Known repository feed source names:

- `estimate_sheet_events`
- `project_publications`
- `shared_link_comments`
- `shared_link_responses`
- `shared_link_events`
- `collaboration_audit_events`

Known action buckets:

- `created`
- `edited`
- `deleted`
- `reordered`
- `shared`
- `commented`
- `decided`
- `invited`
- `viewed`
- `versioned`
- `system`

The live page currently shows many fallback "Activity recorded." rows. That is a
copy/composition problem as much as a layout problem: the user sees a feed, but
the feed does not consistently explain the work.

## Current Visual Audit

Current desktop screenshot:
`.omx/artifacts/project-activity-ux-plan/01-current-desktop-top.png`

Measured in the in-app browser:

| Viewport | Surface | Header/filter behavior | First item position | Notes |
| --- | --- | --- | --- | --- |
| 2318 x 1324 | Activity surface width 2124px, height 1202px | Filter form height 172px, action chips one row | y = 334px | Large unused horizontal space; each activity is a huge full-width card. |
| 1024 x 768 | Activity surface width 830px, height 646px | Header/filter area height 257px | y = 334px | First useful event appears low; controls dominate. |
| 390 x 844 | Activity surface width 372px, height 722px | Header/filter area height 281px, chips wrap to two rows | y = 358px | No horizontal overflow, but the feed starts very late. |

Current strengths:

- The page has clear authorization gating.
- URL-backed filters are already in place.
- The API and repository preserve recipient privacy and cursor behavior.
- Empty, no-match, denied, partial, error, load-more, and refresh states exist.
- Tests already cover much of the behavior surface.

Current UX/UI problems:

- The page reads like a generic card feed, not an audit ledger.
- Wide desktop rows waste most horizontal space.
- Header and filters consume too much vertical space, especially on mobile.
- The loading skeleton does not reserve the same header/filter height as the
  settled UI, creating a high-risk layout shift path.
- Filter controls are always in the document flow, so chip wrapping can push the
  feed down.
- Partial-source banners and load-more states can push content unless space is
  reserved.
- The row anatomy is not optimized for scanning "when, who, what, where, impact,
  source."
- Fallback copy collapses different event types into the same generic message.
- Active action chips appear visually selected but need an explicit accessible
  selected/pressed state in the implementation.
- Chips are visually compact enough to risk target-size problems on touch unless
  spacing/target rules are designed deliberately.

## External UX Evidence

Layout stability:

- web.dev recommends reserving sufficient space for late-loading or dynamic UI
  and warns that changes near the top of the viewport are especially disruptive.
  This applies directly to the activity toolbar, partial-warning banner, filter
  controls, and pagination states.
- web.dev also recommends matching placeholders to final content dimensions, not
  collapsing a placeholder before final content arrives.

Activity/feed semantics:

- WAI-ARIA APG describes a feed as a dynamic list of article-like entries where
  assistive technology can move article by article and trigger loading while
  reading. The project activity page is not a social feed, but the same dynamic
  append/accessibility concerns apply.

Scanning:

- NN/g research on scanning patterns supports designing the page for selective
  reading rather than forcing every entry to be read in full. A ledger with
  predictable scan columns and meaningful row headings fits that behavior better
  than undifferentiated cards.
- NN/g layer-cake scanning supports clear, repeated headings and labels for fast
  section scanning. Date groups and consistent source/action labels should help.

Accessibility:

- WCAG 2.2 Target Size Minimum sets a 24 x 24 CSS pixel baseline for pointer
  targets unless a listed exception applies. Compact chips are acceptable only if
  they still meet target or spacing requirements, with larger targets on touch.
- WCAG Name, Role, Value and Label in Name guidance applies to filter controls,
  refresh/clear buttons, row expansion buttons, and dynamic load-more status.

## Design Audit Verdict

The current page is functionally valuable but visually under-shaped. The highest
leverage improvement is not decoration; it is information architecture and
layout stability:

1. Make the page a project ledger.
2. Keep the toolbar/filter region dimensionally stable.
3. Show the activity family and impact in a repeatable row structure.
4. Move secondary filters out of the normal flow.
5. Reserve space for dynamic states.
6. Improve fallback copy so the user can distinguish unknown/system activity.
