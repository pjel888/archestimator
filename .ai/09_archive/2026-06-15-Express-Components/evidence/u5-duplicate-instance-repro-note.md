---
title: U5 Duplicate-Instance Project-Specific Icon Reproduction Note
type: evidence
date: 2026-06-15
---

# U5 Duplicate-Instance Project-Specific Icon Reproduction Note

## Current Plan Outcome

The audit found that U5 was specified against an unreproduced symptom: "make project-specific" appears only on the second duplicate linked component instance. During plan remediation, no real-project duplicate-instance capture was available in the repository evidence. The plan therefore reframes U5 as verification plus normalization hardening. U5 is not a claimed production duplicate-instance bug fix unless a failing real-project capture is attached here first.

## Required Capture

The first U5 implementation task is to create two rows from the same real DB-backed library component in an editable project estimate and record both rows before any detach action.

| Field | First duplicate instance | Second duplicate instance |
| --- | --- | --- |
| `estimate_row_items.id` | required | required |
| `estimate_row_items.source_library_item_id` | required | required |
| `estimate_row_items.link_state` | required | required |
| client `sourceLibraryItemId` after mapping | required | required |
| client `linkState` after mapping | required | required |
| insertion entrypoint | required | required |
| visible make-project-specific action state | required | required |
| row action rail rendered from `cells.tsx` gate | required | required |

## Allowed Outcomes

1. Reproduced: the first duplicate hides the action while the second shows it. Add the failing test first, keep the captured fields in this note, and implement the smallest fix that explains the captured field difference.
2. Not reproduced with DB-backed components: both instances carry the same source/link fields and both show the action. Keep U5 as fixture/input normalization hardening only. Do not claim a production duplicate-instance fix.
3. Fixture-only failure: malformed seed/test rows such as non-UUID `lib-*` ids or missing `sourceLibraryItemId` hide the action. Fix tests/normalization, name it fixture hardening, and preserve real DB-backed behavior.

## Regression Target

The regression remains: two instances of the same linked library component both show the make-project-specific action before detach; detaching the first changes only that row to project-specific/detached state, while the second row remains eligible.
