Badge is a small uppercase pill for counts, types, and inline labels — tone is reserved for meaning (success/warning/danger), `neutral`/`accent` for the rest. It holds a 96px min-width so badges line up in dense tables.

```jsx
<Badge tone="neutral">Material</Badge>
<Badge tone="success" size="xs">Linked</Badge>
<Badge tone="warning">Source review</Badge>
```
For estimate/proposal *state*, prefer StatusBadge (it adds an optional status dot and the canonical status vocabulary).
