# Component API And Composition Contracts

## API Principles

- Prefer small explicit props over broad style escape hatches.
- Keep primitives accessible by default.
- Keep styling variants aligned with ArchEstimator token roles.
- Avoid making product-domain components depend on live provider data.
- Keep Storybook fixtures and decorators out of production imports.

## Export Strategy

Future implementation should decide whether to keep exports in:

- Existing `src/components/ui/index.tsx`.
- A new story/library barrel.
- Per-component imports only.

Default posture:

- Do not change broad export paths until story coverage and impact evidence justify it.
- Avoid circular imports between domain components and primitives.

## Client/Server Boundaries

| Component type | Boundary |
|---|---|
| Pure visual primitives | Server-compatible unless interactivity requires client. |
| Menus/dialogs/tooltips/comboboxes | Client components. |
| Domain story wrappers | Story-only client wrappers with static fixtures. |
| Provider-connected app components | Do not import into stories unless isolated from live data. |
| Server actions/repos | Never import into stories. |

## Composition Rules

- Compose from primitives upward.
- Domain components may use primitives but primitives must not import domain components.
- Blocks may compose domain components and static fixtures.
- Story-only mocks must live outside production runtime paths or be clearly named.

## Variant Naming

Recommended variant axes:

- `variant`: `primary`, `secondary`, `ghost`, `danger`, `neutral`.
- `size`: `xs`, `sm`, `md` only if needed; app/workshop defaults stay compact.
- `density`: avoid unless necessary; app/workshop is already compact.
- `state`: prefer real props such as `disabled`, `loading`, `selected`, `invalid`.

## Event Contracts

- Native controls should use native events where possible.
- Domain callbacks should have typed payloads and avoid browser/global events for new library APIs.
- Destructive actions require explicit callback naming and confirmation story coverage.

## Accessibility Contract

Every interactive component must define:

- Focus behavior.
- Keyboard behavior.
- Required labels/ids.
- Disabled behavior.
- Error/invalid behavior if applicable.
- Whether children may be arbitrary or constrained.
