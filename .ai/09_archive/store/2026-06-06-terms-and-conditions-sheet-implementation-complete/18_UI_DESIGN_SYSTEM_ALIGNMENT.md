# UI Design-System Alignment Plan

## Applicable surfaces

- Public `/terms` and `/privacy` use landing/public shell but should remain conservative/readable.
- Protected acceptance gate and settings/account card are app/workshop UI and must follow strict `DESIGN.md` rules.

## Required constraints

- SF Pro system stack.
- Regular/medium weights only.
- 12px maximum visible app/workshop text unless explicitly approved.
- Normal controls/body/input/button text around 10px.
- Label/meta/helper text around 8-9px.
- Zero letter spacing.
- `xs` / 3px radius only.
- Phosphor regular outline icons if icons are needed.
- Reuse `src/components/ui` and `src/components/workshop` primitives before local controls.
- `bun run lint:design-system` is blocking.

## Component plan

| Component | Role | Design guidance |
| --- | --- | --- |
| `TermsAcceptancePanel` | Shows summary, version, links, checkbox, accept/retry. | Compact panel, 10px body, 8-9px helper, shared Button/Input/Checkbox. |
| `LegalStatusCard` | Settings/account accepted-version status. | Reuse workshop card/list primitives; no new visual language. |
| `TermsVersionBadge` | Shows version/effective date. | Text badge with xs radius, no heavy color fill. |
| `LegalLinks` | Terms/Privacy/support links. | Underlined text links, keyboard focus visible. |

## Lint/test expectations

- Design-system lint passes.
- DOM tests assert visible copy and link accessibility.
- Manual review checks focus, spacing, mobile scroll, and no oversized type.
