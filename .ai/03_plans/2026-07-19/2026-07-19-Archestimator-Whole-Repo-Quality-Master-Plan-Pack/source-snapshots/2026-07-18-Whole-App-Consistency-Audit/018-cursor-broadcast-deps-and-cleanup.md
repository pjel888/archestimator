# Unit 018 — Cursor Broadcast Channel Thrash (REFUTED — latent)

**Finding:** F-18 + F-19 · **Original severity:** MEDIUM · **Re-verdict (2026-07-19):** **REFUTED (latent)** · **Status:** REJECTED

## Original claims

- **F-18:** subscribe effect deps include `displayName`/`userId` despite a dedicated ref-sync effect, so an unstable `displayName` prop tears down/reopens the realtime channel every render.
- **F-19:** cleanup writes stale-closure `userId`/`displayName` back into refs, racing the newer effect's identity write → briefly broadcasts under the wrong identity.

## Why refuted (the triggering inputs are never produced)

**F-18:** All callers of `useEstimateCursorCollaboration` pass a **stable** `displayName`:
- `EstimateSheetContent.tsx:922` (`EstimateSheetCursorLayer`) passes
  `displayName={collaborationDisplayName}`, prop-drilled from `EstimateWorkspaceClient.tsx:237`
  — which receives it from `page.tsx`, and **`page.tsx` never passes it**. It defaults to `null`
  (`EstimateSheetContent.tsx:1109`). `null` is referentially stable.
- `ProjectCursorLayer.tsx:51` passes `displayName={currentCollaborator?.displayName ?? null}`,
  where `currentCollaborator` is resolved once via Suspense from the streamed collaboration
  summary — a stable string.

No caller passes a fresh string each render. The channel-thrash entry point does not exist.

**F-19:** The stale-closure race requires `userId`/`displayName` to **change mid-session** (to
re-trigger the subscribe effect and run the old cleanup). Same trace: `collaborationUserId` is
also never supplied by `page.tsx` (defaults to `null`); `ProjectCursorLayer`'s `userId` comes
from a summary resolved once per navigation. Account-switching without a reload is not a
supported flow (`signOut` → `/login` is a full redirect/reload). The race window is unreachable.

## Disposition

**REJECTED** as reachable bugs; **latent only.** The redundant `displayName`/`userId` deps are
hygiene (the ref-sync effect at 166-173 makes them unnecessary), and the cleanup ref-writes are
harmless given no mid-session identity change. No user-visible defect. Optional cleanup if the
file is touched for another reason; not worth a dedicated change.
