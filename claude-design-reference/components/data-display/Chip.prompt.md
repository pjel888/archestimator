Chip is a compact, keyboard-operable toggle/filter/tag. `active` fills it solid ink; `removable` adds a dismiss affordance for selected-filter tags.

```jsx
<Chip active onClick={toggle}>Materials</Chip>
<Chip tone="neutral">Labor</Chip>
<Chip removable onRemove={clear}>Supplier: Wilcon</Chip>
```
Tones: `neutral` (default), `accent`, `danger`. Use for facet filters and small multi-select sets — not for primary actions (use Button).
