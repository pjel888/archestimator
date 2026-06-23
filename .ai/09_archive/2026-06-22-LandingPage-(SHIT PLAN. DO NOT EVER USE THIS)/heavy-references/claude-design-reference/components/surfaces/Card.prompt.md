Card is the flat, white, thin-bordered surface that owns a work zone (project tiles, panels, list items). `interactive` adds a quiet hover lift for clickable cards. Do not nest cards inside cards — one surface per zone; use whitespace and hairlines for internal structure.

```jsx
<Card interactive style={{ padding: 16 }}>
  <div className="ae-app-title">Lewis Residence</div>
  <div className="ae-app-body">ES-001 · 4 sheets</div>
</Card>
```
