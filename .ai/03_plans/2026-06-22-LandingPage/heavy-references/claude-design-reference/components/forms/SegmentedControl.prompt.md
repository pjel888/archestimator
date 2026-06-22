SegmentedControl is a single-select group on a muted track; the active option lifts to a white pill. It's the product's view-switcher (e.g. the library's Default / Suppliers / Brand toggle) and chart break-down selector. One tab stop, arrow keys move + select.

```jsx
<SegmentedControl
  ariaLabel="View by"
  value={view}
  onValueChange={setView}
  options={[{value:'default',label:'Default'},{value:'suppliers',label:'Suppliers'},{value:'brand',label:'Brand'}]}
/>
```
Best for 2–4 short options. Past that, use a dropdown select.
