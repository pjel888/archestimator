SettingsModal is the workshop's account/settings surface — a wide (920px) Modal whose flush body holds a two-pane layout: a muted left nav of setting groups and a scrolling column of bordered sections, each a list of link rows (label + description + open-affordance). It's a composed pattern (built on Modal + Button), shown so designs reuse the real settings layout rather than reinventing it.

```jsx
<SettingsModal canManagePlatform />
```

The Account section ends with a danger Sign-out row; `canManagePlatform` reveals the closed-beta operations group. Use this as the template for any full-height, sectioned settings/preferences modal: keep the 220px nav rail, the 660px-max centered content column, the bordered `section` cards, and the 66px-min link rows.
