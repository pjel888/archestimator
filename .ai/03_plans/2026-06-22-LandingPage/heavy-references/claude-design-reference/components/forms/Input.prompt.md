Input is the canonical app text control (10px/medium, 3px radius); Field wraps any control with the product's 9px uppercase tertiary label, optional helper/error text, and required marker.

```jsx
<Field label="Unit cost" required>
  <Input align="right" placeholder="0.00" />
</Field>
<Field label="SKU" errorText="Already in use">
  <Input invalid defaultValue="WIL-204" />
</Field>
```
`align="right"` for numeric entry. Use `invalid` to turn the border/ring danger. Numeric values should use tabular figures — pair with the `.ae-app-numeric` helper or `font-variant-numeric: tabular-nums`.
