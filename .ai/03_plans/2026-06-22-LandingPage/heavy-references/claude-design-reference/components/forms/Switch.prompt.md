Switch is a compact square toggle for settings rows (on = ink fill, off = tertiary knob). Controlled via `checked` + `onChange`.

```jsx
<Switch checked={notify} onChange={setNotify} label="Email me on approval" />
```
Keep it for binary settings; for choosing between 2–3 named options use SegmentedControl.
