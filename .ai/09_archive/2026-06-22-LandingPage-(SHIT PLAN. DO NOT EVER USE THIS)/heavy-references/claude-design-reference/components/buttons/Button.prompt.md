Button is the single button primitive for every app/workshop action — use it instead of raw `<button>` markup so the SF Pro 10px scale, 3px radius, and state styling stay consistent.

```jsx
<Button variant="primary" size="md">Create estimate</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger" size="sm">Delete revision</Button>
```

Variants: `primary` (strong-neutral #3D3D3D — the default emphasis, NOT orange), `secondary` (bordered white), `soft`, `outline`, `ghost`, `plain` (text-only), `danger` (white with danger text), and `add` (the named light-orange estimate-sheet affordance only). Sizes `xs|sm|md|lg` map to 28/32/36/40px heights; all keep a 96px min-width except when you pass icon-only content (use IconButton for that).
