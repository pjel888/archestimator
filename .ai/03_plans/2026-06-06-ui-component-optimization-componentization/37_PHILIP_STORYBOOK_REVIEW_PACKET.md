# Philip Storybook Review Packet

**Status:** Human review packet for the implemented Storybook MVP on
`feat/ui-component-optimization`.
**Review target:** local Storybook first; no public hosting unless separately approved.

## Implementation Entry - 2026-06-06

Local review target:

- `bun run storybook`
- Open `http://localhost:6006` when available; if that port is already in use,
  start with `bun run storybook -- --host 127.0.0.1 --port 6007` and open
  `http://127.0.0.1:6007/`
- Start with `Documentation / Story Coverage Dashboard`, then review
  `Foundations`, `Icon System`, `Actions and Status`, `Form Field Primitives`,
  `Menus and Overlays`, `Navigation and Layout`, `Data Display`, `Domain
  Workshop`, `Domain Share`, `Domain Notifications`, and `Motion`.

Implemented proof:

- Storybook manager loads locally.
- Static build passes.
- Storybook boundary check passes with 24 scanned files, 809 inventory rows,
  and 703 story rows.
- Local Playwright smoke loaded seven representative story iframes with
  nonblank screenshots and no final-run console/page errors.
- Stories use static fixtures and story-only decorators.
- No production app migration is included.

Full `bun run validate` passes. Treat local Storybook review approval as
separate from app migration approval.

## Review Entry Conditions

Review may start after:

- `bun run storybook` starts locally.
- `bun run build-storybook` succeeds.
- P0 stories are `REVIEW_READY`.
- P1 stories are either `REVIEW_READY` or explicitly `DEFERRED`.
- Storybook uses static fixtures only.
- No production app migration files are in the diff.

## Review Order

1. Foundations: colors, typography, density, radius, spacing, focus, status colors.
2. Icons: Phosphor regular style, semantic map, icon-only controls, decorative icons.
3. P0 primitives: Button, IconButton, Field/Input/Search, Select, Badge/Chip, ActionMenu, ContextMenu, Modal, Tooltip, Toast, Empty/Skeleton/Loading.
4. P1 compositions: Combobox, checkbox/radio/switch, Tabs, AppShell/Sidebar, DataTable, EditableCell, TreeShell.
5. Domain stories: project cards/tables, estimate tree/sheet states, component library, share review, notifications, release modal.
6. Motion and landing-only effects: confirm app/workshop-safe vs landing-only labels.
7. Governance: checklist, story coverage, migration notes.

## Review Labels

| Label | Meaning | Next action |
|---|---|---|
| `APPROVED_FOR_STORYBOOK_MVP` | Acceptable for MVP review surface. | Keep story/component; eligible for future migration planning only after all required P0/P1 approvals. |
| `NEEDS_REVISION` | Useful direction but not acceptable yet. | Future agent patches component/story and re-runs validation. |
| `REJECTED_FOR_APP_WORKSHOP` | Should not enter app/workshop UI. | Mark as rejected; keep or remove story depending usefulness. |
| `LANDING_ONLY` | Allowed only for landing/marketing/proposal surfaces. | Keep isolated from workshop/app stories. |
| `DEFERRED` | Not required for current Storybook MVP. | Leave in backlog. |
| `BLOCKS_MIGRATION` | Issue prevents any app migration planning. | Fix or document blocker before future route migration plan. |

## Acceptance Checklist

For each reviewed component/story:

- [ ] Looks like ArchEstimator app/workshop UI, not generic external library output.
- [ ] Text follows compact scale and does not exceed app/workshop limits.
- [ ] Radius is 3px / `rounded-xs` where relevant.
- [ ] Icons are regular outline Phosphor or explicitly justified.
- [ ] Long labels and long values do not overlap or shift controls.
- [ ] Empty/loading/error/success states are realistic.
- [ ] Keyboard and focus behavior are documented.
- [ ] Reduced-motion behavior exists for motion stories.
- [ ] Story uses fake/static data.
- [ ] Story does not imply production migration is done.

## Evidence To Capture

| Evidence | Required for | Format |
|---|---|---|
| Storybook local URL | Review start | `http://localhost:6006` or selected port. |
| Static build output | Review start | Command output summary. |
| Story list export or screenshot index | P0/P1 completeness | Text table or screenshots. |
| Rejected component notes | Any `NEEDS_REVISION`/`REJECTED` label | Component id, story path, issue, expected change. |
| Accessibility notes | Interactive components | Keyboard walkthrough and addon result if approved. |
| Migration gate note | Closeout | Statement that app migration is still blocked. |

## Migration Approval Rule

Philip approving a component in Storybook is not the same as approving production migration. Migration approval requires a separate future prompt or decision that names the route/component migration scope.

## Suggested Review Script

```txt
Review P0 stories first. Mark each story APPROVED_FOR_STORYBOOK_MVP, NEEDS_REVISION, REJECTED_FOR_APP_WORKSHOP, LANDING_ONLY, or DEFERRED. Do not approve app migration in this review unless a separate route-by-route migration plan is also present.
```
