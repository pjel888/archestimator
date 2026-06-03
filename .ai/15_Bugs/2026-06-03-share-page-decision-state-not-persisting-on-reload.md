# Bug: Share Page Decision State Does Not Persist on Page Reload

**Title:** Share page `SharePageDecision` stores decision in component state only — decision lost on reload
**Classification:** UX Defect / Data Loading Gap
**Date Discovered:** 2026-06-03 (second-pass plan refinement)
**Discovery Context:** Second-pass audit of share page UX/UI overhaul plan. Confirmed via code inspection and existing plan UX audit.

## Evidence

**File:** `src/components/share/SharePageDecision.tsx:25`
```typescript
const [decided, setDecided] = useState<DecisionState | null>(null);
```

The `decided` state is initialized to null. It is only set after successful POST submission via `submitDecision()`. There is no `useEffect` or data-fetching hook that loads the recipient's prior decision from the server on mount.

**Per plan's UX audit (14_SHARE_PAGE_UX_AUDIT.md:81-84):**
- UX-011: "Decision State Doesn't Survive Reload"
- "After submitting a decision and reloading the page, the client sees the decision buttons again — confusing and potentially leading to duplicate submission attempts."

**Per plan's codebase research (02_CODEBASE_RESEARCH.md:227):**
- "Decision state persistence: Decision state is stored in useState only — it's not loaded from the server on page load."

## Reproduction

1. Recipient opens share page with valid recipient session
2. Recipient submits a decision (Accept/Decline/Request Revision)
3. Decision confirmation appears — client sees their decision
4. Recipient reloads the page (or navigates away and returns)
5. Observe: decision state is gone — Accept/Decline/Request Revision buttons are shown again
6. Recipient may try to submit again → receives 409 "Decision already submitted" error

## Expected Behavior

After submitting a decision, the recipient should see their decision state persisted across page reloads. On subsequent visits, they should see their prior decision with the decision type and any note they provided. The decision buttons should not reappear after a decision has been finalized.

## Actual Behavior

Decision state is lost on reload. Buttons reappear. Submitting again returns a 409 conflict, which is handled but confusing — the client doesn't understand why their "first" submission is being rejected.

## Suspected Root Cause

No server-side decision state loading is implemented in the share page decision component. The only data source is local `useState` with the result from POST submission. The API route `POST /api/share/[token]/decision` exists for writing and handles duplicate detection (409 response) but no corresponding GET route exists for reading the recipient's prior decision.

## Affected Files/Modules

- `src/components/share/SharePageDecision.tsx` (or `SharePageDecisionBar.tsx` after plan's component extraction)
- Potentially `src/app/api/share/[token]/decision/route.ts` (needs GET handler)
- `src/lib/publication/public-repository.ts` (may need a public decision read function)

## Impact

- **Severity:** High (confusing UX, potential for duplicate submissions, erodes trust)
- **User Impact:** Returning clients don't see their prior decision, leading to confusion and potential duplicate submission attempts that result in error messages. Undermines the finality of the decision process.

## Relationship to Current Plan

Directly addressed by Phase 5 (State & Data Loading) in `.ai/09_archive/store/2026-06-03-share-page-client-review-ux-ui-overhaul-complete/04_IMPLEMENTATION_SEQUENCE.md`. Acceptance criterion `AC-FUNC-009` (SHOULD priority) covers this. However, this is currently marked SHOULD not MUST — making it technically optional despite being an important UX fix and trust concern.

Note: `AC-FUNC-003` is marked MUST ("Decision state is maintained on page reload") but this contradicts the SHOULD priority of `AC-FUNC-009` ("Prior decision state loads and displays on page reload"). These two ACs describe the same requirement at different priority levels.

## Proposed Fix Plan

1. Add a GET handler to `/api/share/[token]/decision` that:
   - Returns the current recipient's prior decision (if any) for this publication
   - Scoped to the authenticated recipient's own decision only
   - Respects password gate
2. Add a `useEffect` in `SharePageDecision` (or `SharePageDecisionBar`) to fetch prior decision on mount
3. If a prior decision exists, show the "decided" state with decision type and note
4. Handle loading and error states
5. Add corresponding Vitest DOM test

## Verification Plan

1. DOM test: `SharePageDecision` with mock fetch → shows prior decision on mount
2. DOM test: `SharePageDecision` with mock fetch returning null → shows decision buttons
3. DOM test: `SharePageDecision` with mock fetch error → shows error state with retry
4. Manual QA: Submit decision, reload page, verify decision badge appears
5. Manual QA: Try to submit duplicate decision, verify 409 message is clear

## Status

**CLOSED (local implementation verified 2026-06-03) — additive `GET /api/share/[token]/decision`, `loadSharedLinkRecipientDecision`, and `SharePageDecision` mount loading now display prior recipient decisions after reload. Verified by GET contract tests, decision tests, full validation, and production build.**

## References

- Plan folder: `.ai/09_archive/store/2026-06-03-share-page-client-review-ux-ui-overhaul-complete/`
- Acceptance criteria: `AC-FUNC-003` (MUST) and `AC-FUNC-009` (SHOULD) in `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`
- Implementation step: Phase 5, Step 5.2 in `04_IMPLEMENTATION_SEQUENCE.md`
- UX audit issue: UX-011 in `14_SHARE_PAGE_UX_AUDIT.md`
- Codebase research gap: `02_CODEBASE_RESEARCH.md` line 227


## Resolution Evidence (2026-06-03)

CLOSED (local implementation verified 2026-06-03) — additive `GET /api/share/[token]/decision`, `loadSharedLinkRecipientDecision`, and `SharePageDecision` mount loading now display prior recipient decisions after reload. Verified by GET contract tests, decision tests, full validation, and production build.

Validation: `bun run validate` (typecheck + ESLint + design-system + unit + 172 Vitest DOM files: 1318 passed / 2 skipped), `bun run build` (Next.js 16.2.6 production build), targeted share/publication suites (77/77), CRG detect_changes risk 0.55/no affected flows, and GitNexus detect-changes medium risk (12 files, 94 symbols, 2 GET/POST flows).
