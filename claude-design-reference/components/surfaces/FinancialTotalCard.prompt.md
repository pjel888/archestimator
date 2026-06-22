FinancialTotalCard presents a money figure with minimal decoration and tabular numerals. `primary` is the ink-filled grand-total; `default` is a bordered white sub-total (markup, contingency, prior-version delta, etc).

```jsx
<FinancialTotalCard variant="primary" label="Grand total" value="₱ 3,964,714.00" sublabel="198% of budget" />
<FinancialTotalCard label="Materials" value="₱ 2,840,200.00" />
```
Never use subtle/tertiary text for a total — totals are strong ink (or white on the primary card).
