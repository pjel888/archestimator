# Accessibility And Keyboard Matrix

| Component | Keyboard requirements | ARIA/semantic requirements | Story evidence |
|---|---|---|---|
| Button | Tab focus, Enter/Space activate | Native button, `aria-busy` when loading | focus, disabled, loading |
| IconButton | Tab focus, Enter/Space activate | Accessible label required | icon-only examples |
| ButtonLink | Tab focus, Enter activate | Native anchor semantics | internal/external stories |
| TextField | Tab focus, typing, selection | Programmatic label, helper/error ids | invalid/helper stories |
| SearchField | Tab focus, clear button keyboard path | Search role/label as appropriate | search/clear stories |
| SelectField | Open, navigate, select, escape | Label and selected value relationship | open/invalid stories |
| Combobox | Type, arrow navigate, enter select/create, escape | Combobox/listbox roles if custom | loading/no-results stories |
| Checkbox | Space toggles | Native/mixed state | checked/mixed stories |
| RadioGroup | Arrow movement, Space select | Radio group label | selected/disabled stories |
| Switch | Space/Enter toggles | Switch role/state | on/off stories |
| Tabs | Arrow movement, Home/End optional | tablist/tab/tabpanel relationship | selected/disabled stories |
| ActionMenu | Open, arrows, Enter, Escape, focus return | Menu semantics | grouped/destructive stories |
| ContextMenu | Keyboard and pointer open paths where supported | Menu semantics | tree-row stories |
| Tooltip | Show on hover and focus, hide on blur/escape | Tooltip id relationship | icon tooltip stories |
| Dialog/Modal | Trap focus, Escape close, focus return | labelled title/description | form/destructive stories |
| Toast | Does not steal focus | status/live region policy | timed/persistent stories |
| Alert/Banner | Tab to actions | alert/status role by severity | warning/error stories |
| DataTable | Tab through controls, row/cell focus plan | table headers and sorted state | sortable/editable stories |
| EditableCell | Enter edit/commit, Escape cancel, Tab advance | input label/context | saving/error stories |
| TreeShell | Arrow expand/collapse, select, typeahead optional | tree/treeitem/group if custom | expanded/selected stories |
| Tree drag target | Keyboard alternative or documented limitation | Invalid target announcement | invalid target story |
| AppShell/Sidebar | Logical tab order, skip route if needed | landmarks/nav labels | collapsed/active stories |
| NotificationCenter | List action focus, modal focus | list/status/dialog semantics | unread/read stories |
| ReleaseModal | Focus trap, acknowledgement action | dialog labelled title | announcement stories |

## Global A11y Requirements

- Do not use color alone for status.
- Visible focus must meet product contrast.
- Disabled controls must be semantically disabled where possible.
- Long labels must remain readable and not overlap icons.
- Error text must be associated with the failing control.
- Storybook a11y checks are required if the addon is approved and compatible.
