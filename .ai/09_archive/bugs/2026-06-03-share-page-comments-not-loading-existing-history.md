# Bug: Share Page Comments Does Not Load Existing Server Comments

**Title:** Share page `SharePageComments` only shows locally-added optimistic comments — existing server comments never loaded
**Classification:** UX Defect / Data Loading Gap
**Date Discovered:** 2026-06-03 (second-pass plan refinement)
**Discovery Context:** Second-pass audit of share page UX/UI overhaul plan. Confirmed via code inspection and existing plan UX audit.

## Evidence

**File:** `src/components/share/SharePageComments.tsx:28`
```typescript
const [comments, setComments] = useState<Comment[]>([]);
```

The `comments` state is initialized to an empty array. The component only adds to this array via the `addComment()` function after successful POST submission. There is no `useEffect` or data-fetching hook that loads existing comments from the server on mount.

**Per plan's UX audit (14_SHARE_PAGE_UX_AUDIT.md:75-78):**
- UX-010: "Comments Don't Show History"
- "Comments start empty on every page load. A returning client sees no prior discussion, making the feature feel broken or unused."

**Per plan's codebase research (02_CODEBASE_RESEARCH.md:227):**
- "Comment history loading: Current implementation only shows optimistically added comments. The GET /api/share/[token]/comment route does not appear to exist."

## Reproduction

1. As a project manager, publish a project and add comments via the workshop-side publication manager
2. Share the link with a recipient
3. Recipient opens the share page with a valid recipient session
4. Observe: no existing comments are visible — only new comments they add themselves appear
5. Recipient reloads the page → all comments they added disappear

## Expected Behavior

When a recipient opens the share page with a valid session, all existing public comments for that publication should be visible in chronological order. New comments should be appended to the existing list. Comments should survive page reload.

## Actual Behavior

Comments list is always empty on initial load. Only comments added during the current session are visible. Reload clears all comments.

## Suspected Root Cause

No server-side comment loading is implemented in the share page comment component. The only data source is local `useState` with optimistic adds. The API route `POST /api/share/[token]/comment` exists for writing but no corresponding GET route exists for reading.

## Affected Files/Modules

- `src/components/share/SharePageComments.tsx`
- Potentially `src/app/api/share/[token]/comment/route.ts` (needs GET handler)
- `src/lib/publication/public-repository.ts` (may need a public comment read function)

## Impact

- **Severity:** High (functional gap for core share page feature)
- **User Impact:** Returning clients see an empty comment section, making the feature appear broken. Discussion history is lost between visits. Reduces trust in the collaboration aspect of the review process.

## Relationship to Current Plan

Directly addressed by Phase 5 (State & Data Loading) in `.ai/09_archive/store/2026-06-03-share-page-client-review-ux-ui-overhaul-complete/04_IMPLEMENTATION_SEQUENCE.md`. Acceptance criterion `AC-FUNC-008` (SHOULD priority) covers this. However, this is currently marked SHOULD not MUST — making it technically optional despite being an important UX fix.

## Proposed Fix Plan

1. Add a GET handler to `/api/share/[token]/comment` that:
   - Reads existing comments for the publication (not internal/workshop comments)
   - Supports the publication's password gate
   - Scoped to publicly-visible comments only (internal comments excluded)
2. Add a `useEffect` in `SharePageComments` to fetch existing comments on mount
3. Handle loading, empty, and error states
4. Merge newly-added comments with loaded history
5. Add corresponding Vitest DOM test

## Verification Plan

1. DOM test: `SharePageComments` with mock fetch → renders existing comments on mount
2. DOM test: `SharePageComments` with mock fetch → appends new comment to loaded list
3. Manual QA: Add comments via one session, verify they appear for another recipient
4. Manual QA: Reload the page, verify comments persist

## Status

**CLOSED (local implementation verified 2026-06-03) — additive `GET /api/share/[token]/comment`, `loadSharedLinkPublicComments`, and `SharePageComments` mount loading now load public discussion history. Verified by GET contract tests, focused share/publication suites, `bun run validate`, and `bun run build`.**

## References

- Plan folder: `.ai/09_archive/store/2026-06-03-share-page-client-review-ux-ui-overhaul-complete/`
- Acceptance criterion: `AC-FUNC-008` in `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`
- Implementation step: Phase 5, Step 5.1 in `04_IMPLEMENTATION_SEQUENCE.md`
- UX audit issue: UX-010 in `14_SHARE_PAGE_UX_AUDIT.md`
- Codebase research gap: `02_CODEBASE_RESEARCH.md` line 227


## Resolution Evidence (2026-06-03)

CLOSED (local implementation verified 2026-06-03) — additive `GET /api/share/[token]/comment`, `loadSharedLinkPublicComments`, and `SharePageComments` mount loading now load public discussion history. Verified by GET contract tests, focused share/publication suites, `bun run validate`, and `bun run build`.

Validation: `bun run validate` (typecheck + ESLint + design-system + unit + 172 Vitest DOM files: 1318 passed / 2 skipped), `bun run build` (Next.js 16.2.6 production build), targeted share/publication suites (77/77), CRG detect_changes risk 0.55/no affected flows, and GitNexus detect-changes medium risk (12 files, 94 symbols, 2 GET/POST flows).
