# UX State Matrix

## Tab-Level States

| State | Library | Project | Templates |
| --- | --- | --- | --- |
| Default | Reusable component tree. | Project-owned component tree. | Custom templates plus project-derived template sources. |
| Search | Search reusable components only. | Search project-owned components only. | Search templates and project-derived sources. |
| Empty | Existing library empty behavior. | Explain how to create a Project Component. | Existing template empty behavior. |
| Filtered empty | Reusable component no-results copy. | Project component no-results copy. | Template/source no-results copy. |
| Loading | Existing lazy library skeleton if applicable. | Same lazy library dataset; project tree can be empty while loading. | Existing project-source loading behavior. |
| Error | Existing retry for lazy library failure. | Same retry if dataset unavailable. | Existing Templates inline retry/toast behavior. |
| No project context | Usually unavailable in Estimate Sheet route. | Show unavailable/empty copy if route lacks project id. | Templates still usable if workspace templates are loaded. |

## Project Tab Copy

Recommended labels:

- Tab: `Project`
- Search placeholder: `Search Project Components`
- Tree aria label: `Project components`
- Empty: `No project components yet. Add an inline Project Component or make a Library Component project-specific.`
- Add disabled: `Select an Area before adding.`
- Preview badge: `Project Component`
- Source context: `Local to this project`

Avoid:

- `express`
- `detached-library`
- `projection`
- `source snapshot`
- `projectComponentProjection`

## Toolbar Matrix

| Control | Library | Project | Templates |
| --- | --- | --- | --- |
| Expand/collapse | Yes | Yes | Yes |
| Search | Yes | Yes | Yes |
| Facet filter | Yes | Optional only if scoped; default no | No |
| View by | Yes | Default no | No |
| Add folder | Yes | No | Template group only |
| Add component | Yes | No direct v1 create from sidebar | No |
| Add template | No | No | Yes |
| Bulk add | Yes | Yes if component insert is enabled | Yes |
| Bulk delete | Yes for library rows only | No | Existing template delete only if already designed |

## Tree/Preview States

Project tab should reuse the same compact row rhythm as Library:

- thumbnail if present
- component name
- supplier/unit/price where available
- add button when an Area is selected
- context menu only for safe actions
- preview panel using the existing component preview pattern

Project-specific preview additions:

- show project/estimate source when metadata has it
- show `Project Component`
- keep `Promote to Library` as an estimate-row detail action, not necessarily a sidebar row action in v1

## Keyboard And Accessibility

Code-level requirements:

- `tabsAriaLabel` should change from `Library sections` to something broader like `Estimate source sections`.
- Sidebar `ariaLabel` should change from `Library` to `Estimate sources` or similar.
- Search label should be tab-specific, not always `Search Library Tree`.
- Focus should remain predictable after tab change, search clear, preview close, insertion, and modal close.

Browser proof is intentionally deferred. Unit/DOM tests should cover accessible names and tab state first.

## Layout

The plan should keep current dock constraints:

- default width: 560
- min width: 360
- max width: 560
- no new cards inside cards
- compact app rhythm

If a later implementation needs visual proof, the only browser-only claim is that three tabs fit without overlap at supported sidebar widths.

