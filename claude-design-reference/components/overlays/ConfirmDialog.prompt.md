ConfirmDialog is the small decision modal — a short `sm` Modal with a ghost Cancel and a primary (or danger) Confirm. Use it for confirm/discard/delete prompts.

```jsx
<ConfirmDialog
  tone="destructive"
  title="Delete estimate sheet?"
  description="This permanently removes the sheet and its line items."
  confirmLabel="Delete"
>
  Structural Works · ES-021 will be removed for everyone on the project.
</ConfirmDialog>
```

`tone="destructive"` (or `danger`) makes the confirm a danger button, sets the alertdialog role, and tints the head. `busy` disables and relabels the confirm to "Working"; `error` shows a soft-red banner above the message. It composes the shared Modal + Button, so it inherits the dialog chrome automatically.
