# 28 — i18n, RTL, and Localization Contract

> **Status:** Living document. Initialized 2026-06-21 by the Ultrawork audit
> loop. Defines the i18n, RTL, and localization contract for the Library
> page. Every user-visible string in the pack must satisfy this contract.
>
> **Scope:** Localization strategy, RTL support, pluralization rules,
> locale-safe interpolation, date/number formats, copy key naming, and
> per-surface i18n acceptance criteria.
>
> **Companion docs:** [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md),
> [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md),
> [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md).

---

## 1. Purpose

The Library page must be localizable from day one — even if closed beta
ships English-only. Retrofitting i18n is significantly more expensive than
building it in. This doc defines:

1. **Locale support scope** — which locales are supported for beta vs future.
2. **Copy key naming convention** — how strings are keyed.
3. **Pluralization rules** — how count-based strings are handled.
4. **RTL support** — how right-to-left layouts are handled.
5. **Locale-safe interpolation** — how variables are inserted into strings.
6. **Date/number formats** — how dates and numbers are localized.
7. **Per-surface i18n acceptance criteria** — pass conditions for each surface.
8. **Verification** — how to confirm i18n compliance.

---

## 2. Locale support scope

| Phase | Locales supported | Rationale |
|---|---|---|
| Closed beta (0A–5) | `en-US` only | Beta users are English-speaking |
| Post-beta (Phase-later) | `en-US`, `en-GB`, `es`, `fr`, `de`, `ja`, `ko`, `zh-CN`, `ar` (RTL) | International launch |
| Future | Full locale list TBD | Market-driven |

**Beta requirement:** Every user-visible string MUST be keyed (not
hardcoded) so that post-beta localization requires no code changes — only
translation files.

---

## 3. Copy key naming convention

### Key structure

```
<surface>.<element>.<state>.<variant>
```

- `surface`: Library surface (e.g., `library`, `component_card`, `overlay`, `trust_chip`)
- `element`: UI element (e.g., `title`, `label`, `tooltip`, `button`, `error`)
- `state`: Optional state (e.g., `empty`, `loading`, `error`, `stale`, `very_stale`)
- `variant`: Optional variant (e.g., `short`, `long`, `plural`)

### Examples

```
library.title=Library
library.subtitle=Your cost component library
component_card.title=Component
component_card.state.empty=No components yet
component_card.state.stale.label=Stale
component_card.state.very_stale.label=Very stale
component_card.state.very_stale.tooltip=Pricing last verified over 180 days ago
overlay.component_picker.title=Pick a component
overlay.component_picker.button.cancel=Cancel
trust.public_snapshot.label=Snapshot verified on {date}
folder.action.archive.button=Archive
folder.action.archive.confirm.title=Archive this folder?
folder.action.delete.confirm.title=Delete this folder?
folder.action.delete.confirm.body=This action is permanent and cannot be undone.
```

### Key rules

1. **Keys are lowercase snake_case** — `component_card.state.stale.label`
2. **Values are English for beta** — translation files replace values post-beta
3. **No hardcoded strings in components** — every string is a key lookup
4. **Keys are stable** — renaming a key breaks translations; use a new key instead
5. **Keys are documented in [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md)** — the copy deck is the canonical key registry

---

## 4. Pluralization rules

Count-based strings MUST use ICU MessageFormat pluralization.

### Pattern

```
<key> = {count, plural,
  =0 {No items}
  =1 {1 item}
  other {# items}
}
```

### Examples

```
component_card.count = {count, plural,
  =0 {No components}
  =1 {1 component}
  other {# components}
}

folder.item_count = {count, plural,
  =0 {Empty}
  =1 {1 item}
  other {# items}
}

search.result_count = {count, plural,
  =0 {No results}
  =1 {1 result}
  other {# results}
}
```

### Rules

1. **Always use ICU MessageFormat** — not string concatenation
2. **Always include `=0`, `=1`, and `other`** — never just "singular/plural"
3. **Never hardcode count in the string** — use `#` placeholder
4. **Test pluralization for each locale** — some locales have more than 2 plural forms (e.g., Arabic has 6, Russian has 3)

---

## 5. RTL support

### Beta requirement

Beta ships LTR only. But the layout MUST be RTL-ready:

1. **Use CSS logical properties** — `margin-inline-start` not `margin-left`, `padding-inline-end` not `padding-right`
2. **Use `dir="auto"`** for user-generated content (folder names, component names)
3. **No hardcoded `left`/`right`** in component styles — use `start`/`end`
4. **Icons are direction-agnostic** — or have RTL variants (e.g., back arrow flips)
5. **Flexbox/Grid are RTL-aware** — `flex-row` reverses automatically with `dir="rtl"`

### Post-beta RTL verification

When `ar` locale is added (Phase-later):

1. Set `<html dir="rtl">` and verify layout mirrors correctly
2. Verify no horizontal overflow on mobile
3. Verify chip/label layout doesn't break with long Arabic text
4. Verify date/number formats use Arabic-Indic digits if locale specifies
5. Verify screen reader reads in RTL order

### Per-surface RTL pass conditions

| Surface | RTL pass condition |
|---|---|
| Library overview | Grid mirrors, no overflow |
| Component card | Chip layout mirrors, text aligns right |
| Component inspector | Panel slides from right, fields mirror |
| Overlay/modal | Close button mirrors to top-left |
| Folder tree | Tree expands right-to-left |
| Search/filter bar | Filter chips mirror, input aligns right |
| Trust chip | Icon + text mirror correctly |
| Dense mode row | All columns mirror, no truncation |

---

## 6. Locale-safe interpolation

### Rules

1. **Never use string concatenation** — `"Hello " + name` is unsafe
2. **Always use ICU MessageFormat** — `{name} → Hello {name}`
3. **Escape user-generated content** — names, URLs, file names
4. **Never interpolate HTML** — use React's JSX interpolation, not `dangerouslySetInnerHTML`
5. **URL-encode URL parameters** — `encodeURIComponent` before inserting into URLs

### Examples

```
# Safe
trust.public_snapshot.label = Snapshot verified on {date}
folder.welcome = Welcome to {folderName}

# Unsafe (forbidden)
"Hello " + user.name
`Snapshot verified on ${date.toLocaleDateString()}`
```

### Date/number format

Use `Intl.DateTimeFormat` and `Intl.NumberFormat`:

```typescript
// Date
new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)

// Number
new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(price)

// Relative time (for "stale" labels)
new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-180, 'day')
```

---

## 7. Per-surface i18n acceptance criteria

Every surface in [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md) must satisfy:

| Surface | i18n criterion | Pass condition |
|---|---|---|
| Library overview | All strings keyed | `rg` finds 0 hardcoded strings in overview components |
| Component card | All states have copy keys | Every state (loading, empty, error, stale, very_stale, missing) has a key in 22 |
| Component inspector | All labels keyed | Every field label, tooltip, error message has a key |
| Quick add form | All validation messages keyed | Every validation error has a key |
| Folder management | All dialog text keyed | Every dialog title, body, button has a key |
| Template preview | All labels keyed | Every template label, description, insert button has a key |
| Overlay/modal | All titles + buttons keyed | Every overlay title, close button, action button has a key |
| Trust chip | All chip text keyed | Every trust state label, tooltip has a key |
| Search/filter | All placeholders + empty states keyed | Every search placeholder, filter label, empty state has a key |
| Error states | All error messages keyed | Every error message has a key + is locale-safe |
| Permission denied | All denial text keyed | Every permission-denied message has a key |
| Public snapshot | All snapshot labels keyed | Every snapshot label has a key + uses {date} interpolation |

### Acceptance template (for every actionable row)

```
i18n: <key-based | n/a> | Copy: <key from 22> | RTL: <ready | n/a> | Pluralization: <ICU | n/a>
```

---

## 8. Verification

```bash
# Check for hardcoded strings in Library components (should return 0 for beta)
rg "['\"](?:Library|Component|Folder|Template|Search|Filter|Archive|Delete|Cancel|Save|Add|Edit|Update)['\"]\s*[,)]" src/components/library/ --type ts --type tsx
# Expected: 0 matches (all strings should be key lookups)

# Check for string concatenation with user content (should return 0)
rg "\+ *\w*(name|title|label)" src/components/library/ --type ts --type tsx
# Expected: 0 matches

# Check for margin-left/right (should use margin-inline-start/end instead)
rg "margin-left|margin-right|padding-left|padding-right" src/components/library/ --type css --type tsx
# Expected: 0 matches (use logical properties)

# Check that every copy key in 22 has a corresponding key lookup in code
rg "t\(['\"]library\." src/components/library/ --type ts --type tsx | wc -l
# Expected: matches the number of keys defined in 22

# Check ICU MessageFormat pluralization
rg "plural" src/locales/ --type json
# Expected: every count-based key uses plural
```

---

## 9. Gap closure

### Current state

The pack currently has:
- Copy keys defined in [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) ✓
- No i18n contract (this doc fills that gap)
- No RTL verification (this doc defines it)
- No pluralization rules (this doc defines them)
- No locale-safe interpolation rules (this doc defines them)

### Required updates to other docs

- [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md): add pluralization rules + ICU MessageFormat examples for every count-based string
- [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md): add RTL layout rules (CSS logical properties)
- [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md): add RTL guidance for chip/label layout
- [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md): add i18n criterion per surface row
- Every doc with actionable rows: add `i18n:` field per row

---

## 10. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| i18n lead | pending | — | — |
| Copy lead | pending | — | — |
| Planning lead | pending | — | — |
| Reviewer gate (Oracle) | pending | — | — |

The i18n contract is complete when:
1. Every surface in §7 has a pass condition.
2. Every copy key in 22 follows the naming convention in §3.
3. Every count-based string uses ICU pluralization (§4).
4. Every component uses CSS logical properties (§5).
5. All four reviewers sign off above.
