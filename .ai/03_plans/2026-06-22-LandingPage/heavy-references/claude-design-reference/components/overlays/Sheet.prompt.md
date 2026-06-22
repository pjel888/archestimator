Sheet is the edge-anchored panel / drawer. Same paper, hairline border, header/body/footer chrome and soft-red close chip as Modal, but pinned full-height to the `right` or `left`, or full-width along the `bottom`. Use it for inspectors, filters, and contextual editing that should keep the page behind partly visible.

```jsx
<Sheet
  side="right"
  size="wide"
  title="Component details"
  description="Coffee table allowance · WIL-204"
  footer={<Button variant="primary">Apply</Button>}
>
  {/* fields, totals, history */}
</Sheet>
```

`size` is `narrow|md|wide` (height presets when `side="bottom"`). Set `scrim={false}` for a non-modal inspector that doesn't dim the page. For a centered decision use Modal/ConfirmDialog instead.
