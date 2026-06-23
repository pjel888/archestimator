EstimateCell is one 36px spreadsheet cell. Compose cells into rows for the estimate sheet; pass `numeric` + `align="right"` for money/quantity columns, `selected` for the accent-soft selection background, `editing` for the active-edit ring.

```jsx
<EstimateCell value="Coffee table allowance" />
<EstimateCell value="₱ 6,350.00" numeric align="right" selected />
<EstimateCell value="1" numeric align="center" editing />
```
Changed values in revision comparison should be coloured by commercial meaning (success/warning/danger), never decoratively.
