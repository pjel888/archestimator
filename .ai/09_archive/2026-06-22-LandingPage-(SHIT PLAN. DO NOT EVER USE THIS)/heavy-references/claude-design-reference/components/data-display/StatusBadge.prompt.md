StatusBadge maps an estimate/proposal lifecycle state to its semantic color, with an optional leading dot. Use it for row/version/proposal status — not for generic labels (use Badge for those).

```jsx
<StatusBadge status="approved" showDot>Approved</StatusBadge>
<StatusBadge status="review" showDot>In review</StatusBadge>
<StatusBadge status="draft">Draft</StatusBadge>
```
Statuses: `approved`/`active` → success, `review` → warning, `danger` → danger, `draft`/`inactive` → neutral.
