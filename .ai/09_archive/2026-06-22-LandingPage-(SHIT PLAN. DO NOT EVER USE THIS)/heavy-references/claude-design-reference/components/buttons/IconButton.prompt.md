IconButton is a fixed-square icon-only control on the same scale as Button — for toolbars and chrome where the label would be redundant. Pass a Phosphor (regular weight) icon as children and always give an `aria-label`.

```jsx
<IconButton aria-label="History"><i className="ph ph-clock-counter-clockwise" /></IconButton>
<IconButton variant="add" aria-label="Add area"><i className="ph ph-plus" /></IconButton>
```

Variants: `ghost` (default, transparent), `secondary` (bordered), `add` (light-orange estimate-sheet affordance). Sizes `xs|sm|md|lg` = 28/32/36/40px squares.
