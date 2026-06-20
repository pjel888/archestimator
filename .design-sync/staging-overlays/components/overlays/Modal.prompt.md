Modal is the centered app dialog: white paper on a dim scrim, 3px radius, hairline border, an 11px medium title with a 10px tertiary description, and the signature soft-red close chip. Body text is 10px secondary; `footer` right-aligns actions.

```jsx
<Modal
  title="Rename sheet"
  description="This updates the sheet across the project."
  footer={<>
    <Button variant="ghost">Cancel</Button>
    <Button variant="primary">Save</Button>
  </>}
>
  <Field label="Sheet name"><Input defaultValue="Structural Works" /></Field>
</Modal>
```

Sizes `xs|sm|md|lg|xl` cap the width. `tone` (`success|warning|danger|destructive`) tints the border + title and, for destructive, switches the role to alertdialog. It renders open by default and scrims its positioned parent when `inline`. For a yes/no decision use ConfirmDialog; for an edge panel use Sheet.
