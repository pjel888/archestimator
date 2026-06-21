# 28 — i18n, RTL, and Localization Contract

> **Status:** DRAFT — proposed standard pending the Phase 0A i18n runtime
> decision. Sign-offs in §10 are pending, so this doc is **not yet
> authoritative** for the i18n dimension; treat it as the contract-to-be, not
> a closed gap. Path bindings and the copy-key registry below are verified
> against [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md);
> the i18n *runtime* and the *adoption* of keyed strings are Phase 0A/1 work
> owned by the i18n lead + Copy lead (see §3.1, §9). Living document,
> initialized 2026-06-21 by the Ultrawork audit loop. Defines the i18n, RTL,
> and localization contract for the Library page. Every user-visible string in
> the pack must satisfy this contract.
>
> **Scope:** Localization strategy, RTL support, pluralization rules,
> locale-safe interpolation, date/number formats, copy key naming, and
> per-surface i18n acceptance criteria.
>
> **Companion docs:** [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md),
> [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md),
> [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md),
> [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) (§9 — glass is visual-only; RTL preserves rail order).

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

### 3.1 i18n runtime decision (Phase 0A — load-bearing, UNDECIDED)

The Library codebase is **not keyed today**: the keystone cites a hardcoded
`"prices older than 90 days"` UI string at
`src/components/workshop/library/overview/LibraryOverview.tsx:114`, and no
`t()`/`useTranslations()` call signature exists in `src/`. Before any of the
§3/§7 keys can be adopted, the i18n **runtime** must be chosen. This is the
single load-bearing decision and it is **pending**:

| Decision | Candidate | Owner | Phase | Evidence |
|---|---|---|---|---|
| i18n runtime | next-intl (recommended for Next.js App Router; ICU MessageFormat built in) **or** react-intl / i18next / FormatJS — undecided | i18n lead | 0A | EV-I18N-RUNTIME |
| Call signature | `useTranslations("library")` returning `t("component_card.state.stale.label")`; or `t({ id, values })` — follows from runtime | i18n lead | 0A | EV-I18N-RUNTIME |
| Messages location | `src/locales/en-US.json` (or `messages/`) created by Copy + i18n lead | Copy lead + i18n lead | 0A/1 | EV-I18N-MESSAGES |

Binding: `src/components/workshop/library/overview/LibraryOverview.tsx:114` is
the canonical "hardcoded today" anchor (per
[19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
§Verified File Paths). Until this decision lands, every copy key in §3/§7 is
**proposed, not registered** — see §9 "Current state".

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

### Glass surfaces and RTL (cross-ref doc 35 §9)

Glass is **visual-only**: the liquid-glass surface-variant slot system in
[35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §2
paints the well/rails/paper/chrome; it introduces **no new user-visible
strings** and therefore no new copy keys. The RTL contract for glass is:

1. **RTL preserves rail order.** The workspace track grid (tree \| centre \|
   dock) mirrors via CSS logical properties; the tree rail and inspector dock
   swap sides under `dir="rtl"` without changing slot semantics
   ([35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §9 Responsive behavior).
2. **Drawers remain single-blur glass panels.** A drawer that slides from the
   start side in LTR slides from the start side in RTL; the blur treatment does
   not change with direction.
3. **No text on glass that isn't already keyed.** Glass chrome buttons and
   warm-CTA copy reuse the existing overlay/CTA keys (§3); glass itself adds
   none.

Glass-variant adoption does **not** block on the §3.1 runtime decision, but
every string rendered *inside* a glass surface must still follow §3/§5 once
keyed.

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

Paths below are the real Library surface directories per
[19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
§Verified File Paths. There is **no** `src/components/library/` — earlier
drafts cited it; those commands returned "No such directory". The three real
component roots are `src/components/workshop/library/`,
`src/components/workshop/component-library/`, and
`src/components/workshop/component-library-manager/`; the route root is
`src/app/workshop/library/`.

```bash
# Library surface roots (expect all four to exist)
ls -d src/components/workshop/library/ \
      src/components/workshop/component-library/ \
      src/components/workshop/component-library-manager/ \
      src/app/workshop/library/

# Check for hardcoded strings in Library components (should approach 0 for beta; >0 pre-keying is expected — see §9)
rg "['\"](?:Library|Component|Folder|Template|Search|Filter|Archive|Delete|Cancel|Save|Add|Edit|Update)['\"]\s*[,)]" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type ts --type tsx
# Expected pre-0A: >0 matches (the codebase is not keyed yet — LibraryOverview.tsx:114 is the anchor).
# Expected post-1: 0 matches (all strings should be key lookups).

# Check for string concatenation with user content (should return 0)
rg "\+ *\w*(name|title|label)" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type ts --type tsx
# Expected: 0 matches

# Check for margin-left/right (should use margin-inline-start/end instead) — record count as the RTL baseline
rg "margin-left|margin-right|padding-left|padding-right" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type css --type tsx
# Expected pre-0A: record the actual count as the baseline (do not assume 0 — physical-property hits must be migrated to logical properties per §5).
# Expected post-1: 0 matches (use logical properties).

# Anchor: the canonical hardcoded "prices older than 90 days" string (keystone binding)
rg -n "older than 90 days" src/components/workshop/library/overview/LibraryOverview.tsx
# Expected: 1 hit at :114 — this is the first string to key.

# Check that every copy key in 22 has a corresponding key lookup in code (post-runtime-decision only)
rg "t\(['\"]library\." \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type ts --type tsx | wc -l
# Expected pre-0A: 0 (no runtime decided yet — §3.1). Expected post-1: matches the number of keys defined in 22.

# Check ICU MessageFormat pluralization (post-runtime-decision only)
rg "plural" src/locales/ --type json 2>/dev/null
# Expected pre-0A: directory does not exist (no runtime decided). Expected post-1: every count-based key uses plural.
```

---

## 9. Gap closure

### Current state

- **Copy keys referenced in §3/§7 are PROPOSED, none exist in `src/` today.**
  Verified: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
  cites the hardcoded `"prices older than 90 days"` string at
  `src/components/workshop/library/overview/LibraryOverview.tsx:114`;
  [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) is not yet a
  live key registry.
- Key adoption is itself a Phase 0A/1 task owned by Copy lead + i18n lead —
  the §3.1 runtime decision gates it.
- No i18n contract existed before this doc (this doc fills the gap, pending §3.1).
- No RTL verification (this doc defines it, pending baseline count from §8).
- No pluralization rules (this doc defines them, pending runtime in §3.1).
- No locale-safe interpolation rules (this doc defines them).

### Required updates to other docs (tracked rows)

| Update | Target doc | Owner | Phase | Evidence |
|---|---|---|---|---|
| Add pluralization rules + ICU MessageFormat examples for every count-based string; register the ~12 new keys defined in §3 (`component_card.state.very_stale.label`, `folder.action.archive.confirm.title`, `folder.action.delete.confirm.title`, `folder.action.delete.confirm.body`, `trust.public_snapshot.label`, etc.) | [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) | Copy lead | 0B | EV-COPY-I18N |
| Add RTL layout rules (CSS logical properties; record current hardcoded physical-property count as baseline) | [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md) | A11y lead + i18n lead | 1 | EV-I18N-RTL |
| Add RTL guidance for chip/label layout | [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md) | Design lead | 1 | EV-I18N-RTL |
| Add i18n criterion per surface row | [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md) | Planning lead | 1 | EV-I18N-SURFACES |
| Add `i18n:` field per actionable row | Every doc with actionable rows | Doc owners | 1–5 | per-doc EV |

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
