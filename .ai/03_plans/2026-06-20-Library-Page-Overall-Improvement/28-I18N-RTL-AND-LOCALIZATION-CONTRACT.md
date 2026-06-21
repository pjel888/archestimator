# 28 — i18n, RTL, and Localization Contract

> **Status:** DRAFT — proposed standard pending the Phase 0A i18n runtime
> decision. Sign-offs in §11 are pending, so this doc is **not yet
> authoritative** for the i18n dimension; treat it as the contract-to-be, not
> a closed gap. Path bindings and the copy-key registry below are verified
> against [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md);
> the i18n *runtime* and the *adoption* of keyed strings are Phase 0A/1 work
> owned by the i18n lead + Copy lead (see §3.1, §10). Living document,
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
>
> **2026-06-21 hardening pass.** Verified every file:line binding in this doc
> against `main` via `rg`: `LibraryOverview.tsx:114` (hardcoded stale string),
> `ComponentLibraryManager.tsx:1493/1515/1534`, `AddComponentModal.tsx:963`,
> `component-library/index.tsx:939/1428`, `helpers.ts:667/675`,
> `TemplatesBrowseManager.tsx:855/870` (ConfirmDialog import + usage),
> `component-facet-filter.tsx:12/17/61`. Confirmed there is **no** i18n
> runtime in `src/` (`rg -l "next-intl|react-intl|useTranslations|i18next" src/`
> → 0 hits), no `src/locales/` or `messages/` directory, no `dir="rtl"` or
> `dir="auto"` in any Library surface, and zero axe/jest-axe config. The
> `aria-live="polite"` regions this doc references are confirmed present in
> 6 Library surfaces (see §7).

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

> **Doc-type note.** Under the relaxed scope of
> [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md)
> §3, this is a **dimension-defining contract**: it owns the **i18n/RTL**
> dimension (#11) for the pack. Its rows are informational and delegate the
> other 11 dimensions. Gate rows in *consumer* docs (05, 06, 17, 18, surface
> specs in 10, contract rows in 13/14/15) cite this doc's section pointers to
> satisfy their i18n/RTL field. The two owned canonical names from this doc —
> **locale scope** and **ICU MessageFormat key shape** — are registered in
> `LOOP_LEDGER.md` §2 so docs 03/04/10/22/35 adopt them.

---

## 2. Locale support scope

| Phase | Locales supported | Direction | Rationale | Owner | Evidence |
|---|---|---|---|---|---|
| Closed beta (0A–5) | `en-US` only | LTR only | Beta users are English-speaking; no translation pipeline exists yet | i18n lead | EV-I18N-SCOPE |
| Post-beta (Phase-later) | `en-US`, `en-GB`, `es`, `fr`, `de`, `ja`, `ko`, `zh-CN`, `ar` (RTL) | LTR + 1 RTL (`ar`) | International launch; `ar` chosen as the single RTL representative to prove the bidi contract end-to-end | i18n lead | EV-I18N-SCOPE |
| Future | Full locale list TBD | TBD | Market-driven | i18n lead | — |

**Canonical locale scope (registered in `LOOP_LEDGER.md` §2):**
- Beta: `["en-US"]`
- Post-beta: `["en-US", "en-GB", "es", "fr", "de", "ja", "ko", "zh-CN", "ar"]`
- Default/fallback: `en-US`

**Beta requirement:** Every user-visible string MUST be keyed (not
hardcoded) so that post-beta localization requires no code changes — only
translation files. The single hardcoded beta exception is the anchor at
`src/components/workshop/library/overview/LibraryOverview.tsx:114`
(`health.staleComponentCount === 1 ? "price older than 90 days" : "prices older than 90 days"`)
which §3.1 keys as the very first runtime-adoption task.

---

## 3. Copy key naming convention

### Key structure (canonical — registered in `LOOP_LEDGER.md` §2)

```
<surface>.<element>.<state>.<variant>
```

- `surface`: Library surface (e.g., `library`, `component_card`, `overlay`, `trust`, `folder`, `search`, `validation`, `permission`, `error`, `lifecycle`, `link`, `insert_target`, `templates`, `component_inspector`, `components`, `bulk_archive`, `bulk_delete`)
- `element`: UI element (e.g., `title`, `label`, `tooltip`, `button`, `body`, `lead`, `hint`, `status`, `error`, `announcement`)
- `state`: Optional state (e.g., `empty`, `loading`, `error`, `stale`, `very_stale`, `missing`)
- `variant`: Optional variant (e.g., `short`, `long`, `plural`, `single`, `with_components`, `with_subfolders`, `empty`, `high`, `medium`, `low`, `free_text`)

Keys are **flat dot-paths**, not nested objects — this is what `next-intl`,
`react-intl`, and `i18next` all load as JSON. The flat shape means the
key `folder.delete.body_with_components` is the JSON path
`folder.delete.body_with_components`, not `folder["delete"]["body_with_components"]`.

### Canonical key examples (binding: every key below is REGISTERED in doc 22)

These keys exist ONLY as proposals in [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md)
until §3.1 lands. Once keyed, the i18n lead + Copy lead materialize them in
the messages file (location per §3.1).

```
# Surfaces
library.title = Library
library.subtitle = Your cost component library
library.loading = Loading your library…
library.empty = Your library is empty. Add a component to reuse it across estimates.

# Component card / states
component_card.count = {count, plural, =0 {No components} =1 {1 component} other {# components}}
component_card.state.empty = No components yet

# Trust chips (canonical term: chip, not badge — C-002)
trust.current.label = Current
trust.stale.label = Stale price
trust.very_stale.label = Very stale
trust.missing_date.label = No price date
trust.public_snapshot.label = Snapshot verified on {date}

# Overlays
overlay.component_picker.title = Pick a component
overlay.component_picker.button.cancel = Cancel
overlay.opened_announcement = {overlayName} opened.
overlay.closed_announcement = {overlayName} closed.

# Folder actions (text-prompt dialog)
folder.create.title = New folder
folder.rename.title = Rename folder
folder.action.archive.button = Archive
folder.delete.title = Delete folder?
folder.delete.body_with_components = Delete "{name}"? Its {n} components stay in the library and lose this folder.
folder.delete.body_empty = Delete "{name}"? This folder is empty.
folder.delete.body_with_subfolders = Delete "{name}"? Its {n} components and {m} subfolders move out of this folder; nothing is deleted from the library.

# Search / filter (count-sensitive)
search.result_count = {count, plural, =0 {No results} =1 {1 result} other {# results}}
search.result_announcement = {count, plural, =0 {No results} =1 {1 result found} other {# results found}}
filter.applied_announcement = Filter applied: {filterLabel}.

# Permission / errors
permission.denied_announcement = You do not have permission to {action}.
error.announcement = Error: {message}.
```

The verbatim copy for each key lives in [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md)
(§§4–12A); this doc does NOT re-author the copy, it pins the **key shape**
and the **i18n/RTL rules** the copy must follow.

### Key rules

1. **Keys are lowercase snake_case** — `component_card.state.stale.label`. Hyphens allowed inside a segment (`body_with_components`, never `body-with-components`).
2. **Values are English (`en-US`) for beta** — translation files replace values post-beta.
3. **No hardcoded strings in components** — every string is a key lookup. Anchor: `src/components/workshop/library/overview/LibraryOverview.tsx:114` (the first string to key per §3.1).
4. **Keys are stable** — renaming a key breaks translations; use a NEW key + keep the old one until translation catch-up (doc 22 §13).
5. **Keys are documented in [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md)** — the copy deck is the canonical key registry; this doc is the i18n/RTL contract.
6. **Count-sensitive keys MUST use ICU MessageFormat plural** (§4) — never string concatenation, never `count === 1 ? "x" : "y"` ternaries in component bodies.
7. **Live-region announcement keys** (doc 22 §12A) are i18n keys, not ad-hoc strings — they localize without a DOM/schema change.

### 3.1 i18n runtime decision (Phase 0A — load-bearing, UNDECIDED)

The Library codebase is **not keyed today**: the keystone cites the hardcoded
`"price older than 90 days" / "prices older than 90 days"` UI string at
`src/components/workshop/library/overview/LibraryOverview.tsx:114`, and no
`t()`/`useTranslations()`/`next-intl`/`react-intl`/`i18next` import exists in
`src/` (verified 2026-06-21: `rg -l "next-intl|react-intl|useTranslations|i18next" src/` →
0 hits). Before any of the §3 keys can be adopted, the i18n **runtime** must
be chosen. This is the single load-bearing decision and it is **pending**:

| Decision | Candidate | Owner | Phase | Evidence |
|---|---|---|---|---|
| i18n runtime | `next-intl` (RECOMMENDED — Next.js App Router native, ICU MessageFormat built in via `intl-messageformat`, per-locale message files, server + client components) **or** react-intl / i18next / FormatJS — undecided | i18n lead | 0A | EV-I18N-RUNTIME |
| Call signature | `useTranslations("library")` returning `t("component_card.state.stale.label")` (next-intl default) **or** `t({ id, values })` (react-intl) — follows from runtime | i18n lead | 0A | EV-I18N-RUNTIME |
| Messages location | `src/locales/en-US.json` (next-intl default `messages/` is also acceptable) created by Copy + i18n lead. **Does NOT exist today** (verified: `ls src/locales/ messages/` → "No such file or directory" for both). | Copy lead + i18n lead | 0A/1 | EV-I18N-MESSAGES |
| Default/fallback locale | `en-US` (matches §2 beta scope) | i18n lead | 0A | EV-I18N-RUNTIME |
| Locale routing | No locale segment for beta (`/workshop/library`, not `/en-US/workshop/library`); locale-segment routing is Phase-later with `ar` | i18n lead | Phase-later | EV-I18N-SCOPE |

**Binding:** `src/components/workshop/library/overview/LibraryOverview.tsx:114`
is the canonical "hardcoded today" anchor (per
[19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
§Verified File Paths). Until this decision lands, every copy key in §3/§7 is
**proposed, not live** — see §10 "Current state".

**Why `next-intl` is the recommendation (non-blocking rationale):**
Next.js App Router native (works with RSC), ICU MessageFormat built in
(handles §4 pluralization + §6 `{name}`/`{date}` interpolation without a
separate FormatJS install), and ships per-locale JSON files that match the
§3 flat-dot-path shape. The decision is the i18n lead's; any of the four
candidates can satisfy this contract, the choice is about ecosystem fit not
contract shape.

---

## 4. Pluralization rules

Count-based strings MUST use ICU MessageFormat pluralization. This is the
**canonical ICU plural shape** for this pack (registered in
`LOOP_LEDGER.md` §2):

```
<key> = {count, plural,
  =0 {No items}
  =1 {1 item}
  other {# items}
}
```

- `=0` and `=1` are **explicit forms** — always include both (English only
  distinguishes "one"/"other", but the explicit `=0` form lets copy differ
  for the zero case, e.g., "No results" vs "1 result").
- `other` is the **catch-all** — always present; the runtime falls back to
  it for any count not matched by an explicit form.
- `#` is the **number placeholder** inside the plural — the runtime
  substitutes the formatted count (locale-aware digit formatting).
- The plural variable name in the key is by convention `count` (for
  standalone counts) or `n`/`m` (when multiple counts appear, e.g.,
  `folder.delete.body_with_subfolders` uses `{n}` for components and `{m}`
  for subfolders). Doc 22 uses `count` for single-count strings and `n` /
  `m` for multi-count strings; this doc ratifies that convention.

### Registered ICU plural keys (source: doc 22 §12, ratified here)

| Key | ICU pattern | Surfaces | Owner | Phase | i18n binding |
|---|---|---|---|---|---|
| `component_card.count` | `{count, plural, =0 {No components} =1 {1 component} other {# components}}` | Components tab, overview | Copy lead | 1 | `src/components/workshop/library/overview/LibraryOverview.tsx:114` (first keying target) |
| `folder.item_count` | `{count, plural, =0 {Empty} =1 {1 item} other {# items}}` | Folder tree | Copy lead | 0B | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` |
| `search.result_count` | `{count, plural, =0 {No results} =1 {1 result} other {# results}}` | Search/filter | Copy lead | 1 | `src/components/workshop/library/component-facet-filter.tsx` |
| `search.result_announcement` | `{count, plural, =0 {No results} =1 {1 result found} other {# results found}}` | Search/filter aria-live | A11y lead | 1 | `src/components/workshop/library/component-facet-filter.tsx` (polite region reused — see §7) |
| `bulk_archive.title` | `{n, plural, =1 {Archive 1 component?} other {Archive # components?}}` | Bulk archive modal | Copy lead | 0B | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| `bulk_archive.lead` | `{n, plural, =1 {This will archive 1 component.} other {This will archive # components.}}` | Bulk archive modal | Copy lead | 0B | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| `bulk_archive.partial_blocker` | `{n, plural, =1 {Only the 1 component marked ready will be archived.} other {Only the # components marked ready will be archived.}}` | Bulk archive modal | Copy lead | 0B | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| `folder.delete.body_with_components` | `{n, plural, =1 {Its 1 component stays in the library and loses this folder.} other {Its # components stay in the library and lose this folder.}}` | Folder delete dialog | Copy lead | 0B | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |
| `folder.delete.body_with_subfolders` | `{n, plural, ...} and {m, plural, ...}` (two plural clauses) | Folder delete dialog | Copy lead | 0B | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |
| `validation.import_row_missing_unit` | `{n} is missing a unit.` (row number — uses `{n}` placeholder, not plural — row numbers are not countable) | Future import (Phase-later) | Copy lead | Phase-later | n/a (no current target) |

### Rules

1. **Always use ICU MessageFormat** — not string concatenation, not template-literal ternaries like `` `${count} item${count === 1 ? "" : "s"}` ``. The current `LibraryOverview.tsx:114` ternary is the anti-pattern §3.1 keys away.
2. **Always include `=0`, `=1`, and `other`** for English — never just "singular/plural". The `=0` form lets copy differ for the empty case ("No results" vs "1 result" vs "5 results").
3. **Never hardcode count in the string** — use `#` placeholder inside the plural arm.
4. **Test pluralization for each locale** — some locales have more than 2 plural forms:
   - `ar` (Arabic, Phase-later): 6 plural forms (`zero`, `one`, `two`, `few`, `many`, `other`) — ICU handles this; do NOT hardcode.
   - `ru` (future): 3 plural forms (`one`, `few`, `many`).
   - `ja`, `ko`, `zh-CN` (Phase-later): 1 form (`other`) — no singular/plural distinction.
   - The ICU runtime picks the right form per locale automatically; this is why the runtime decision (§3.1) MUST land before post-beta locales.
5. **Multi-count strings** use multiple plural clauses in one message
   (`folder.delete.body_with_subfolders` has both `{n, plural, ...}` and
   `{m, plural, ...}`). All four candidate runtimes support this.

---

## 5. RTL support

### Beta requirement

Beta ships LTR only (`en-US`). Verified 2026-06-21: zero `dir="rtl"` and
zero `dir="auto"` in any Library surface (`rg "dir=\"rtl\"|dir=\"auto\""
src/components/workshop/library/
src/components/workshop/component-library/
src/components/workshop/component-library-manager/"` → 0 hits). But the
layout MUST be RTL-ready so the post-beta `ar` locale (§2) needs no code
change — only a translation file + `<html dir="rtl">`.

### RTL-ready rules (apply NOW, in beta LTR)

1. **Use CSS logical properties** — `margin-inline-start`/`padding-inline-end` not `margin-left`/`padding-right`; `inset-inline-start` not `left`. Tailwind v4 maps these to `ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*` utilities — prefer them over `ml-*`/`mr-*`/`pl-*`/`pr-*`/`left-*`/`right-*`.
2. **Use `dir="auto"`** on every container that renders user-generated content — folder names, component names, confidence free-text notes, source URLs. This lets a single Arabic folder name render RTL inside an otherwise-LTR workspace.
3. **No hardcoded `left`/`right`** in component styles — use `start`/`end` (CSS) or `ms-*`/`me-*` (Tailwind). The inspector dock anchor (right in LTR) becomes a logical-side anchor that flips in RTL — see doc 12 "Responsive Model" table for the per-breakpoint flip.
4. **Icons are direction-agnostic OR have RTL variants** — a "back" arrow (`←` in LTR) must flip to `→` in RTL. Use Tailwind's `rtl:rotate-180` (or `rtl:-scale-x-100`) on directional icons; do NOT assume a fixed direction.
5. **Flexbox/Grid are RTL-aware** — `flex-row` reverses automatically under `dir="rtl"`; `grid-cols-*` flows start-to-end (right-to-left in RTL). Do NOT set `flex-direction: row-reverse` to "fix" RTL — set it once via `dir` and let the browser handle it.
6. **Z-index tiers are direction-agnostic** — the overlay z-tiers (`z-[1000]` modal / `z-[1050]` menu-popover / `z-[1100]` tooltip, per doc 23) do not flip; only the visual anchor (close-button position, drawer slide side) flips.

### Post-beta RTL verification (when `ar` lands, Phase-later)

1. Set `<html dir="rtl" lang="ar">` and verify layout mirrors correctly.
2. Verify no horizontal overflow on mobile (< 768px) — long Arabic labels must wrap or truncate, never overflow (No-Overlap rule in doc 12).
3. Verify chip/label layout doesn't break with long Arabic text — Arabic is denser than English in some cases, sparser in others; test with real strings, not Lorem Arabic.
4. Verify date/number formats use Arabic-Indic digits if locale specifies (ICU `Intl.NumberFormat("ar")` handles this; do NOT hardcode Western digits).
5. Verify screen reader reads in RTL order (VoiceOver Arabic, NVDA Arabic).
6. Verify the inspector dock anchors LEFT (not right) and the `InspectorDrawer` slides from the start side (right in RTL) — per doc 12 "Responsive Model" table.
7. Verify the modal close/X button mirrors to top-LEFT — per doc 12 "Localization / bidi caveats".

### Per-surface RTL pass conditions (binding — every Library surface)

| Surface | Real binding | RTL pass condition |
|---|---|---|
| Library overview | `src/components/workshop/library/overview/LibraryOverview.tsx` | Grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` at `:268`) mirrors via `dir`; no overflow; stale-string ternary at `:114` keys to a plural (§4) so Arabic 6-form plural works |
| Overview search | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx` (`SearchInput` at `:258`) | Input aligns right under `dir="rtl"`; option list mirrors; aria-live count (`:305`) pluralizes |
| Components tab | `src/components/workshop/LibraryPageClient.tsx` (route-state owner) + `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` (`<input>` at `:383`) | Card grid mirrors; filter chips mirror; result-count `<p aria-live="polite">` at `:978` pluralizes |
| Component inspector dock | `src/components/workshop/library/ComponentInspectorDock.tsx` | Under `dir="rtl"` the dock anchors LEFT (rail order mirrors via workspace track grid, doc 35 §9); fields mirror; `Used in` section aria-live at `:271` pluralizes the row counts |
| Facet filter | `src/components/workshop/library/component-facet-filter.tsx` | Filter chips mirror; input aligns right; result-count `aria-live="polite"` region (present here per keystone) pluralizes |
| Folder tree | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` (`role="status"`/`aria-live="polite"` at `:1146-1147`) | Tree expands right-to-left; `dir="auto"` on each folder-name cell so a mixed-language tree renders correctly; item-count chip pluralizes |
| Component card | `src/components/workshop/component-library/ComponentCard.tsx` | Chip layout mirrors; component name uses `dir="auto"`; trust chip + text mirror together (icon + label do not split) |
| Template gallery | `src/components/workshop/library/templates-browse/TemplateGallery.tsx` (`aria-live="polite"` at `:247`/`:256`) | Cards mirror; insert picker (`InsertIntoEstimatePicker.tsx:142` `role="status"`) disclosure line mirrors |
| Template editor | `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` + `TemplateStructureTree.tsx` | Structure tree mirrors; insert picker disclosure (`insert_target.*` keys, doc 22 §9) interpolates `{estimateName}`/`{projectName}` with `dir="auto"` |
| Templates browse | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` (uses `ConfirmDialog` at `:855`/`:870`) | ConfirmDialog mirrors (close X to top-left); text-prompt input aligns right under `dir="rtl"` |
| Bulk toolbar + archive modal | `src/components/workshop/BulkActionToolbar.tsx` + `src/components/workshop/BulkDestructivePreviewModal.tsx` (`:107-108`) | Toolbar chips mirror; archive modal title/lead pluralize (`bulk_archive.title`/`.lead`, §4); NET-NEW `role="alert"` region for archive success announcement (doc 12) anchors start-side |
| Quick add form | `src/components/workshop/component-library-manager/AddComponentModal.tsx` (`window.confirm` debt at `:963`) | Modal fields mirror; validation messages (`validation.*` keys, doc 22 §11) align right; dirty-discard dialog (`component.dirty_discard.*`) mirrors |
| Overlay/modal | `ui/overlays/confirm-dialog.tsx`, `modal.tsx`, `sheet-drawer.tsx` | Close button mirrors to top-left; `InspectorDrawer` sheet-side flips (slides from start side); z-tiers (`z-[1000]/z-[1050]/z-[1100]`) do not flip |
| Trust chip | `src/components/workshop/component-library/helpers.ts` (`getStalenessTone:667`, `getStalenessLabel:675`) | Icon + label mirror together; `aria-live` announcements (`trust.very_stale.announcement` under `assertive`, doc 22 §8) pluralize/interpolate correctly in `ar` |
| Dense mode row | `src/components/workshop/component-library/` (Phase 5 only — `library_dense_mode`) | All columns mirror; no truncation; `dir="auto"` on name cells |
| Search/filter | `src/components/workshop/library/component-facet-filter.tsx` | Filter chips mirror; input aligns right; result-count `aria-live` region pluralizes |
| Public snapshot | `src/components/workshop/library/` snapshot rendering | `trust.public_snapshot.label = Snapshot verified on {date}` interpolates the date via `Intl.DateTimeFormat(locale, {dateStyle:"medium"})` — Arabic-Indic digits under `ar` |

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

1. **Never use string concatenation** — `"Hello " + name`, `` `Hello ${name}` `` outside an ICU message, and `name + " (" + count + ")"` are all forbidden. Word order varies by locale (English: "Hello {name}", Japanese: "{name}san, konnichiwa" — name FIRST); concatenation hardcodes English order.
2. **Always use ICU MessageFormat for variables** — `{name}`, `{count}`, `{date}`, `{filterLabel}`, `{overlayName}`, `{message}`, `{action}`, `{estimateName}`, `{projectName}`, `{requiredPhrase}`, `{limit}`, `{window}`, `{longWindow}`. The runtime resolves the variable into the locale-correct position.
3. **Escape user-generated content before interpolation** — folder names, component names, confidence free-text, source URLs. React's JSX interpolation (`{t("folder.delete.body_with_components", { name })}`) escapes by default; never use `dangerouslySetInnerHTML` to inject user content.
4. **Never interpolate HTML** — use React's JSX interpolation, not `dangerouslySetInnerHTML`. The only sanctioned HTML-ish content is the ICU `<key>` plural/select syntax, which the runtime parses safely.
5. **URL-encode URL parameters with `encodeURIComponent`** — before inserting a URL into a string (e.g., a source URL displayed in a tooltip). The `pricing_source` column is free-text and may contain arbitrary characters; encode before display.
6. **Never interpolate raw exceptions or PII** — the `error.announcement = Error: {message}.` key interpolates a **stable code or short label**, never a raw exception string (which may leak stack traces or user data). Doc 22 §12A pins this.
7. **Date/number/currency format via `Intl`** — never `date.toLocaleDateString()` inline (it ignores the active locale if the runtime doesn't pass it); always go through the runtime's locale-aware formatter.

### Examples

```
# Safe (ICU MessageFormat)
trust.public_snapshot.label = Snapshot verified on {date}
folder.welcome = Welcome to {folderName}
search.result_announcement = {count, plural, =0 {No results} =1 {1 result found} other {# results found}}

# Unsafe (forbidden — these are the patterns the §8 rg commands detect)
"Hello " + user.name                           # string concatenation
`Snapshot verified on ${date.toLocaleDateString()}`  # ignores active locale
` ${count} item${count === 1 ? "" : "s"}`      # hardcodes English plural
name + " (" + count + " components)"           # hardcodes English word order
<div dangerouslySetInnerHTML={{__html: folder.name}} />  # XSS + no escape
```

### Date/number format (binding — use these exact APIs)

Use `Intl.DateTimeFormat` and `Intl.NumberFormat` with the **active runtime
locale** (passed by the i18n runtime, never hardcoded):

```typescript
// Date (e.g., trust.public_snapshot.label {date})
new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
// → "Nov 21, 2026" (en-US) / "21 nov. 2026" (fr) / "٢٠٢٦/١١/٢١" (ar)

// Currency (e.g., unit_cost display)
new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(price)
// → "$12.50" (en-US) / "12,50 $" (fr) / "١٢٫٥٠ $" (ar)

// Relative time (e.g., very-stale tooltip "Priced over {longWindow} days ago")
new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-180, 'day')
// → "180 days ago" (en-US) / "il y a 180 jours" (fr) / "قبل ١٨٠ يومًا" (ar)

// Standalone count (rare — usually use ICU # inside plural)
new Intl.NumberFormat(locale).format(count)
// → "1,234" (en-US) / "1 234" (fr) / "١٬٢٣٤" (ar)
```

The runtime (§3.1) supplies `locale`; never hardcode `"en-US"` in a
component body.

---

## 7. Per-surface i18n acceptance criteria

Every surface in [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md)
must satisfy the i18n criterion below. **Verified 2026-06-21:** the
`aria-live="polite"` regions this table references are CONFIRMED present in
the codebase today (so the live-region announcements have a real DOM target
once the runtime lands):

| Surface | Real binding (file:line) | i18n criterion | Pass condition | aria-live region present today? |
|---|---|---|---|---|
| Library overview | `src/components/workshop/library/overview/LibraryOverview.tsx:114` | All strings keyed; stale-string ternary → ICU plural | `rg` finds 0 hardcoded strings in `overview/` post-1; `LibraryOverview.tsx:114` keys to `library.stale_price_warning.*` ICU plural | n/a (display string, not live region) |
| Overview search | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx:258/305` | All placeholders + empty states keyed; aria-live count pluralizes | result-count `<p aria-live="polite">` at `:305` reads from `search.result_announcement` ICU plural | YES — `:305` |
| Components tab | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:383/978/979` | All states have copy keys; aria-live count pluralizes | result-count `<p aria-live="polite">` / `role="status"` at `:978-979` reads from `search.result_announcement` ICU plural | YES — `:978-979` |
| Component card | `src/components/workshop/component-library/ComponentCard.tsx` + `helpers.ts:667/675` | All states have copy keys (loading/empty/error/stale/very_stale/missing) | Every state in doc 22 §8 has a key; `getStalenessLabel` at `helpers.ts:675` returns a key id (not a literal) post-1 | n/a (chip, not live region — C-002) |
| Component inspector | `src/components/workshop/library/ComponentInspectorDock.tsx:271` | All field labels, tooltips, errors keyed; Used-in aria-live pluralizes | `<p aria-live="polite">` at `:271` reads the template-row / estimate-row counts from an ICU plural key | YES — `:271` |
| Facet filter | `src/components/workshop/library/component-facet-filter.tsx` | All labels + result-count aria-live keyed + pluralized | result-count `aria-live="polite"` region reads from `search.result_announcement` ICU plural; `filter.applied_announcement` on filter change | YES (keystone-cited) |
| Folder management | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493/1515/1534` + `LibraryFolderTree.tsx:1146-1147` | All dialog text keyed; folder tree aria-live keyed | every folder.create.*/rename.*/delete.* key (doc 22 §§4-5) interpolated; item-count `<p role="status" aria-live="polite">` at `:1146-1147` pluralizes | YES — `:1146-1147` |
| Template preview / gallery | `src/components/workshop/library/templates-browse/TemplateGallery.tsx:247/255/256` + `TemplatePreviewDock.tsx` | All template labels, descriptions, insert buttons keyed; gallery aria-live keyed | every `templates.*` / `insert_target.*` key (doc 22 §§9-10) interpolated; gallery `<p aria-live="polite">` / `role="status"` at `:247/255/256` pluralizes | YES — `:247/255/256` |
| Template editor | `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` + `InsertIntoEstimatePicker.tsx:142` | All labels + insert-target disclosure keyed | every `insert_target.*` key (doc 22 §9) interpolated; picker `<p role="status">` at `:142` keys to `insert_target.single_resolved`/`.choose`/`.none`/`.stale_target`/`.permission` | YES — `:142` |
| Overlay/modal | `ui/overlays/confirm-dialog.tsx`, `modal.tsx`, `sheet-drawer.tsx`; text-prompt pattern at `TemplatesBrowseManager.tsx:855/870` | All titles + buttons + open/close announcements keyed | every `overlay.*` key (doc 22 §12A) interpolated; `overlay.opened_announcement`/`closed_announcement` on open/close (interpolates `{overlayName}`) | NET-NEW — open/close live regions do not exist today (doc 12 flags this as Phase 0B/1 work) |
| Trust chip | `src/components/workshop/component-library/helpers.ts:667/675` + `component-facet-filter.tsx:61` | All chip text + tooltips keyed; very-stale announcement keyed + assertive | every `trust.*` key (doc 22 §8) interpolated; `trust.very_stale.announcement` under `aria-live="assertive"` when the insert-gate confirm fires | NET-NEW — very-stale assertive region does not exist today (doc 12) |
| Search/filter | `src/components/workshop/library/component-facet-filter.tsx` | All placeholders + empty states keyed; result-count aria-live pluralized | every `search.*` / `filter.*` / `components.empty_*` key (doc 22 §§10-11) interpolated | YES (keystone-cited) |
| Quick add form | `src/components/workshop/component-library-manager/AddComponentModal.tsx:963/2204` | All validation messages keyed; added-component aria-live keyed | every `validation.*` + `component.dirty_discard.*` key (doc 22 §§6/11) interpolated; `<div aria-live="polite">` at `:2204` announces validation errors | YES — `:2204` |
| Error states | every host surface | All error messages keyed; aria-live assertive | every `*.error.*` key interpolated; `error.announcement` under `aria-live="assertive"` with stable `{message}` (never raw exception) | NET-NEW per-surface (some host regions exist) |
| Permission denied | every write guard (`is_workspace_editor` RPC/RLS — owner/admin/member; viewer is read-only) | All denial text keyed; aria-live assertive | `permission.denied_announcement` under `aria-live="assertive"` interpolating stable `{action}` | NET-NEW per-surface |
| Public snapshot | snapshot rendering path | All snapshot labels keyed + date-interpolated | `trust.public_snapshot.label = Snapshot verified on {date}` via `Intl.DateTimeFormat(locale, {dateStyle:"medium"})` | n/a (display label) |
| Templates browse (text-prompt dialog) | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:855/870` (ConfirmDialog) | All text-prompt dialog strings keyed | folder create/rename dialog copy (doc 22 §4) keys the same pattern TemplatesBrowseManager already uses | YES (dialog renders) |

### Acceptance template (for every actionable row in consumer docs)

```
i18n: <key-based | n/a> | Copy: <key from doc 22> | RTL: <ready | n/a> | Pluralization: <ICU | n/a> | Binding: <file:line>
```

Example (folder delete dialog row):
```
i18n: key-based (ICU plural {n}/{m}) | Copy: folder.delete.body_with_components | RTL: ready (dialog mirrors, dir="auto" on {name}) | Pluralization: ICU | Binding: src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534
```

---

## 8. Verification

Paths below are the real Library surface directories per
[19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
§Verified File Paths. There is **no** `src/components/library/` — earlier
drafts cited it; those commands returned "No such directory" (verified
2026-06-21: `ls -d src/components/library/` → "No such file or directory").
The three real component roots are `src/components/workshop/library/`,
`src/components/workshop/component-library/`, and
`src/components/workshop/component-library-manager/`; the route root is
`src/app/workshop/library/`.

```bash
# Library surface roots (expect all four to exist)
ls -d src/components/workshop/library/ \
      src/components/workshop/component-library/ \
      src/components/workshop/component-library-manager/ \
      src/app/workshop/library/
# Expected: all four print their path.

# No top-level src/components/library/ (path-bug guard — §3.5b in doc 25)
ls -d src/components/library/ 2>&1
# Expected: "No such file or directory" — the path bug is fixed; never re-introduce.

# Check for hardcoded strings in Library components (should approach 0 for beta; >0 pre-keying is expected — see §10)
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
# Expected: 0 matches.

# Check for margin-left/right / padding-left/right (should use logical properties instead)
rg "margin-left|margin-right|padding-left|padding-right|(\bml-|\bmr-|\bpl-|\bpr-)" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type css --type tsx
# Expected pre-0A: record the actual count as the baseline (do not assume 0 — physical-property hits must be migrated to logical properties per §5).
# Expected post-1: 0 matches (use ms-/me-/ps-/pe- utilities instead).

# Anchor: the canonical hardcoded "older than 90 days" string (keystone binding)
rg -n "older than 90 days" src/components/workshop/library/overview/LibraryOverview.tsx
# Expected pre-0A: 1 hit at :114 — this is the first string to key (per §3.1).
# Expected post-1: 0 hits.

# Check for dir="rtl" / dir="auto" (baseline 0 in Library surfaces today)
rg -n "dir=\"rtl\"|dir=\"auto\"" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/
# Expected pre-0A: 0 matches (no RTL/dir=auto in Library surfaces today — verified 2026-06-21).
# Expected post-1: dir="auto" present on every user-content cell (folder names, component names, confidence notes).

# Check for hardcoded locale ("en-US" in component bodies — should be only in runtime config)
rg "['\"]en-US['\"]" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type ts --type tsx
# Expected pre-0A: 0 matches (no hardcoded locale). Expected post-1: 0 (locale comes from runtime only).

# Check that every copy key in doc 22 has a corresponding key lookup in code (post-runtime-decision only)
rg "t\(['\"](?:library|component_card|overlay|trust|folder|search|filter|validation|permission|error|lifecycle|link|insert_target|templates|component_inspector|components|bulk_archive|bulk_delete)\." \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type ts --type tsx | wc -l
# Expected pre-0A: 0 (no runtime decided yet — §3.1). Expected post-1: matches the number of keys defined in doc 22.

# Check ICU MessageFormat pluralization (post-runtime-decision only)
rg "plural" src/locales/ messages/ --type json 2>/dev/null
# Expected pre-0A: directories do not exist (verified: `ls src/locales/ messages/` → "No such file or directory"). Expected post-1: every count-based key uses plural.

# Check i18n runtime is installed (post-0A)
rg "next-intl|react-intl|i18next|@formatjs" package.json
# Expected pre-0A: 0 matches (verified 2026-06-21). Expected post-0A: exactly one runtime chosen per §3.1.
```

---

## 9. Localization-ready acceptance gate (Phase 0A exit)

This is the **gate** the i18n lead satisfies at Phase 0A exit. It is the
single acceptance gate this doc owns.

| # | Criterion | Verification command | Pass condition | Owner | Phase | Evidence |
|---|---|---|---|---|---|---|
| L1 | i18n runtime chosen + installed (exactly one of `next-intl`/`react-intl`/`i18next`/`@formatjs`) | `rg "next-intl\|react-intl\|i18next\|@formatjs" package.json` | exactly 1 runtime in deps | i18n lead | 0A | EV-I18N-RUNTIME |
| L2 | Messages file exists at the §3.1 location with at least the §3 anchor key | `ls src/locales/en-US.json` OR `ls messages/en-US.json` | file exists, parses as JSON, contains `library.stale_price_warning.*` | Copy lead + i18n lead | 0A | EV-I18N-MESSAGES |
| L3 | First keying lands: `LibraryOverview.tsx:114` reads from `t(...)` not a ternary | `rg -n "older than 90 days" src/components/workshop/library/overview/LibraryOverview.tsx` | 0 hits — the hardcoded ternary is gone | i18n lead | 1 | EV-I18N-FIRST-KEY |
| L4 | No hardcoded `dir="rtl"`/`dir="auto"` regression: `dir="auto"` ADDED to user-content cells; no ad-hoc `dir="rtl"` in LTR beta | `rg "dir=\"rtl\""` in `src/components/workshop/library/` etc. | 0 hits (beta is LTR); `dir="auto"` count > 0 on folder/component/name cells | Frontend lead | 1 | EV-I18N-DIR-AUTO |
| L5 | Physical-property baseline measured; migration plan filed | `rg "margin-left\|margin-right\|padding-left\|padding-right\|\bml-\|\bmr-\|\bpl-\|\bpr-" src/components/workshop/library/ src/components/workshop/component-library/ src/components/workshop/component-library-manager/ --type ts --type css \| wc -l` | count recorded in EV-I18N-PHYSICAL-BASELINE; migration scoped to Phase 1 | i18n lead + Frontend lead | 0A/1 | EV-I18N-PHYSICAL-BASELINE |
| L6 | All §4 ICU plural keys present in messages file | `rg "plural" src/locales/en-US.json` (or `messages/en-US.json`) | every §4 key has a `plural` clause | Copy lead | 1 | EV-I18N-PLURALS |

This gate is the **single Phase 0A exit condition this doc owns**. The
broader Phase 0A exit (axe harness, focus-trap, perf baseline) is owned by
docs 31/12/30.

---

## 10. Gap closure

### Current state (verified 2026-06-21)

- **Copy keys referenced in §3/§7 are PROPOSED, none exist in `src/` today.**
  Verified: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
  cites the hardcoded `"price older than 90 days" / "prices older than 90 days"`
  ternary at `src/components/workshop/library/overview/LibraryOverview.tsx:114`;
  [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) is not yet a
  live key registry.
- **No i18n runtime exists** in `src/` — verified `rg -l
  "next-intl|react-intl|useTranslations|i18next" src/` → 0 hits.
- **No `src/locales/` or `messages/` directory** — verified `ls src/locales/
  messages/` → "No such file or directory" for both.
- **No `dir="rtl"` or `dir="auto"`** in any Library surface — verified `rg
  "dir=\"rtl\"|dir=\"auto\""` → 0 hits in the three component roots.
- **No axe/jest-axe config** — verified `rg "jest-axe|@axe-core|axe-core"
  package.json` → 0 hits (relevant to doc 31, cross-referenced here because
  the aria-live regions this doc depends on are tested manually pre-0A).
- **aria-live regions DO exist** in 6 Library surfaces today (verified — §7
  table "present today?" column) — so once the runtime lands, the
  announcement copy keys have real DOM targets. Two announcement categories
  are NET-NEW (overlay open/close, very-stale assertive) — doc 12 tracks
  those as Phase 0B/1 work.
- Key adoption is itself a Phase 0A/1 task owned by Copy lead + i18n lead —
  the §3.1 runtime decision gates it.
- No i18n contract existed before this doc (this doc fills the gap, pending §3.1).
- No pluralization rules (this doc defines them, pending runtime in §3.1).
- No locale-safe interpolation rules (this doc defines them).

### Required updates to other docs (tracked rows)

| Update | Target doc | Owner | Phase | Evidence |
|---|---|---|---|---|
| Adopt the §3 copy-key shape + §2 locale scope (registered in `LOOP_LEDGER.md` §2) | [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) | Copy lead | 0B | EV-COPY-I18N |
| Add RTL layout rules (CSS logical properties; record current hardcoded physical-property count as baseline) | [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md) | A11y lead + i18n lead | 1 | EV-I18N-RTL |
| Add RTL guidance for chip/label layout (mirroring, `dir="auto"` on user-content cells) | [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md) | Design lead | 1 | EV-I18N-RTL |
| Add i18n criterion per surface row (use the §7 acceptance template) | [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md) | Planning lead | 1 | EV-I18N-SURFACES |
| Add `i18n:` field per actionable row (delegate to this doc §3/§5) | Every doc with actionable rows | Doc owners | 1–5 | per-doc EV |
| Adopt the §4 ICU plural shape for every count-based copy key | [03-MODALS-POPOVERS-AND-OVERLAYS.md](03-MODALS-POPOVERS-AND-OVERLAYS.md), [04-UX-RESEARCH-SYNTHESIS.md](04-UX-RESEARCH-SYNTHESIS.md) (any count copy) | Copy lead | 1 | EV-COPY-I18N |
| Reference the §7 RTL-per-surface table for the glass-shell rail-flip + drawer-flip under `dir="rtl"` | [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §9 | Design lead | 1 | EV-I18N-RTL |

---

## 11. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| i18n lead | pending | — | Gates on §3.1 runtime decision + §9 gate (L1–L6) |
| Copy lead | pending | — | Gates on §3 key shape + doc 22 adoption |
| Planning lead | pending | — | Gates on §7 per-surface criteria + §10 cross-doc updates |
| Reviewer gate (Oracle) | pending | — | — |

The i18n contract is complete (as a planning-achievable contract) when:
1. Every surface in §7 has a pass condition bound to real file:line.
2. Every copy key in 22 follows the naming convention in §3.
3. Every count-based string uses ICU pluralization (§4) — registered table.
4. The §9 gate (L1–L6) defines the Phase 0A exit in pre-registered evidence rows.
5. All four reviewers sign off above.

Execution (L1–L6 green) is tracked in
[24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md); this doc
is **planning-complete** when §1–§10 are internally consistent and bound to
real code, regardless of whether L1–L6 have shipped.
