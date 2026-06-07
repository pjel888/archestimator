# Future App Migration Roadmap Deferred

**Status:** Deferred by design.

## Roadmap Thesis

App migration should be route-by-route and approval-gated after Storybook is proven. Do not treat Storybook component completion as permission to replace production UI automatically.

## Candidate Migration Order After Approval

1. Low-risk decorative/status primitives already used in app.
2. Buttons/icon buttons where tests and visual parity are straightforward.
3. Form field wrappers with no mutation behavior change.
4. Empty/loading/error states.
5. Notification/release modal composition.
6. Project cards/tables.
7. Component library manager/card/folder views.
8. Share review read-only trees.
9. Workshop tree chrome.
10. Editable estimate sheet/tree surfaces last.

## Per-Route Migration Requirements

- Before evidence: screenshots or Storybook parity.
- Graph/GitNexus impact.
- Focused tests.
- Manual smoke if protected route behavior changes.
- Small commit.
- Rollback note.

## High-Risk Surfaces

- `Button` and `SearchInput` are critical-impact shared symbols.
- `WorkshopTree` is high impact.
- Editable estimate sheet/tree surfaces own mutations, optimistic updates, rollback, DnD/reorder, selection, and row editing.
- Provider-connected domain components must not be replaced by story-only fixture assumptions.

## Stop Rule

If a migration changes behavior, data flow, auth/provider access, persistence, or app routing, it is not a component migration anymore. Write a separate implementation plan.
