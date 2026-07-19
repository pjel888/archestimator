# Apple Human Interface Research for Archestimator

Research date: 2026-07-19

Source boundary: current, primary Apple Developer guidance only

Target: a compact, professional, desktop-first web estimating workspace

## Purpose and Translation Rule

This reference extracts sensibilities from Apple's Human Interface Guidelines
(HIG); it does not make Archestimator an Apple-platform app or replace
`DESIGN.md`, current source, the existing component library, or web accessibility
requirements.

This is optional research provenance, not a runtime-mandatory payload. Load it
selectively when an Apple-informed desktop sensibility is relevant; do not make
every invocation of `$archestimator-design` absorb or enforce it.

Use these labels when applying the research:

- **Transferable** — a principle that remains useful on the desktop web.
- **Apple-specific** — a native-platform convention, API, asset, material, point
  value, or input assumption that must not be copied blindly.
- **Archestimator adaptation** — a project recommendation derived from the
  principle, not a claim that Apple prescribes the value.

The desired influence is Apple's clarity, hierarchy, restraint, consistency,
and respect for input preferences. It is not pixel imitation, Liquid Glass,
SF Symbols, native control replicas, or iOS spacing transplanted into a browser.

## Executive Synthesis

1. **Density belongs on the Mac-like side of Apple's guidance.** Apple describes
   desktop work as sustained, precise, multiwindow productivity and recommends
   using large displays to show more content in fewer nested levels with less
   modality, while retaining comfortable density. That maps well to an estimate
   tree, cost table, totals, and inspector sharing the workspace. It does not
   justify miniature text. ([Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/))
2. **Hierarchy should do more work than decoration.** Reading order, alignment,
   consistent spacing, typography, and restrained color should establish what
   is primary. Chrome should remain quiet but perceptible. ([Layout](https://developer.apple.com/design/human-interface-guidelines/layout),
   [Typography](https://developer.apple.com/design/human-interface-guidelines/typography))
3. **Frequent actions stay visible; advanced actions stay nearby.** Toolbars
   should prioritize common tasks and group them by function and frequency;
   disclosure controls can defer advanced details without burying core work.
   ([Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars),
   [Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls))
4. **Compactness must come from structure, not reflexive shrinking.** Apple's
   current accessibility guidance gives macOS a 13 pt default and 10 pt minimum
   for custom text, discourages light weights at small sizes, and calls for text
   enlargement to at least 200 percent. CSS pixels and Apple points are not
   interchangeable, so these values are comparison evidence rather than a
   direct verdict on Archestimator's 8–12 px web tokens. ([Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
   [Larger Text evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/))
5. **Every state needs a nonvisual and noncolor path.** Focus, selection, hover,
   pressed, loading, error, and disabled states need clear semantics, keyboard
   behavior, and more than color alone. ([Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/),
   [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility))
6. **Motion communicates; it does not perform.** Use restrained transitions to
   explain state or hierarchy, and provide a reduced-motion alternative that
   keeps the meaning without scaling, spinning, parallax, animated blur, or
   large spatial travel. ([Motion](https://developer.apple.com/design/human-interface-guidelines/motion),
   [Reduced Motion evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria))

## Transfer Matrix

| Topic | Apple evidence | Transferable sensibility | Do not transplant |
| --- | --- | --- | --- |
| Typography | Legible defaults, few typefaces, hierarchy preserved as text grows | Semantic type roles, regular-to-semibold weights, scalable text | SF font files, Dynamic Type APIs, point-to-pixel conversion |
| Layout | Reading order, alignment, adaptable windows, consistent spacing | Stable grid, aligned rows, resizable panes, responsive reflow | Apple safe-area values or device templates |
| Controls | Clear purpose, discernible shape, adequate hit region, interaction states | Native web semantics, visible affordances, generous target around compact chrome | A universal 44 pt control height or Apple-native bezel styling |
| Focus and keyboard | Keyboard-only operation, standard shortcuts, stable focus | Logical DOM order, `:focus-visible`, predictable Tab/arrow behavior | macOS/iPadOS focus APIs or Command-only shortcuts |
| Color | Semantic colors, contrast in every appearance, not color alone | Tokenized roles, light/dark/high-contrast validation, icon/text reinforcement | Apple system color values or translucent materials |
| Motion | Motion explains status and hierarchy; reduced alternatives remain meaningful | Short state transitions and `prefers-reduced-motion` handling | Springs, parallax, blur, or depth effects as brand decoration |
| Information density | Large screens support more visible content and less modality | Dense tables, persistent context, progressive disclosure | Mobile-first whitespace or hiding common desktop actions in menus |

## Typography

### What Apple Actually Says

- Use sizes most people can read at expected viewing distances and conditions.
- Prefer Regular, Medium, Semibold, or Bold over Ultralight, Thin, or Light when
  text is small.
- Use size, weight, and color to express hierarchy, and preserve that relative
  hierarchy when text grows.
- Limit typeface variety because too many faces weaken hierarchy and consistency.
- The current macOS built-in styles use 13 pt body and headline text, 12 pt
  callouts, 11 pt subheadlines, and 10 pt footnotes/captions. Apple separately
  lists 13 pt as the macOS default and 10 pt as the minimum for custom styles.
- Ideally support enlargement to at least 200 percent, allowing content to reflow
  instead of overlap or truncate into ambiguity.

Sources: [Typography](https://developer.apple.com/design/human-interface-guidelines/typography),
[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
and [Larger Text evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/).

### Platform-Specific Caveats

- **Apple-specific:** Apple point sizes depend on native rendering, display scale,
  system fonts, and platform text styles. A CSS pixel is not an Apple point.
- **Apple-specific:** Dynamic Type is an Apple API. The web equivalents are
  relative CSS units, browser zoom/text scaling, responsive reflow, and user
  preferences.
- **Apple-specific:** SF Pro and SF Symbols are platform resources. Apple tells
  native developers to obtain the system font through platform APIs rather than
  embedding it. On the web, use the existing system font stack and fallbacks;
  do not bundle Apple font files or make legibility depend on SF-specific metrics.

### Tension With Archestimator's Current 8–12 px Scale

`DESIGN.md` currently specifies 12 px titles, 11 px subtitles, 10 px body,
controls, inputs, tables, and numeric values, 9 px labels, and 8 px small labels.
This creates a legibility question against Apple's native guidance, but cannot
establish web nonconformance by simple point-to-pixel comparison:

| Current role | Current size | Assessment against Apple guidance |
| --- | ---: | --- |
| `app-title` | 12 px | Compact relative to Apple's native default; verify separation and zoom behavior in the real web surface |
| `app-subtitle` | 11 px | Native point metrics cannot be mapped directly; verify hierarchy and legibility rather than copying the point value |
| `app-body`, inputs, buttons | 10 px | A high-density project choice that warrants sustained-use, contrast, zoom, and reflow scrutiny |
| table cells and numerics | 10 px | Preserve alignment and density, while ensuring financial values remain fully available and distinguishable |
| labels and metadata | 8–9 px | Keep genuinely secondary; do not use for essential instructions, errors, actions, or values |

The conflict is not resolved by claiming that 10 px resembles Apple's 10 pt
caption. It does not. Nor should the product copy Apple's 13 pt value as 13 px.
The safe response is to preserve the project register while verifying contrast,
zoom, text spacing, reflow, and sustained readability in the actual surface.
Nothing here claims that WCAG defines a universal minimum CSS font size; it does
not. The comparison scale below is a research scenario, not the project default,
a statement of current source compliance, or a standalone web-conformance test.

### External Comparison Scale

Use this only to compare what a more conventional web product scale would do.
The project-specific decision lives in `design-doctrine.md`; this is not an
Apple mandate or an automatic rewrite of any surface:

| Archestimator role | Recommended web starting point | Use |
| --- | --- | --- |
| Workspace title | `1rem/1.25rem` (16/20 px at default settings), weight 500–600 | Estimate/project identity and primary panel titles |
| Section title / strong control label | `0.875rem/1.125rem` (14/18 px), weight 500–600 | Inspector groups, modal titles, high-value actions |
| Body / form value | `0.875rem/1.25rem` (14/20 px), weight 400–500 | Instructions, inputs, errors, helpers, primary values |
| Dense table / numeric value | `0.8125rem/1.125rem` (13/18 px), weight 400–500 | Estimate grid, quantities, unit costs, totals |
| Metadata / shortcut / eyebrow | `0.75rem/1rem` (12/16 px), weight 500 | Timestamps, secondary IDs, keyboard hints |

Questions exposed by the comparison:

- Keep 8–9 px genuinely secondary and never use it for essential instructions,
  errors, actions, decisions, totals, or field values.
- Give long-form guidance and client-facing prose a dedicated document scale
  rather than inheriting workshop microcopy.
- Preserve compact rows and inputs where they remain usable; do not enlarge all
  surrounding whitespace merely because another design system uses larger text.
- Create density through structure, alignment, row height, cell padding, panel
  gaps, and visible columns—not by shrinking below the established project role.
- Use `rem` for type and allow browser zoom. At 200 percent text size, paired
  fields can stack, toolbars can wrap or overflow deliberately, and full values
  must remain reachable without overlapping or destructive truncation.
- Preserve hierarchy as text grows. Do not enlarge every micro-label equally if
  that destroys the relationship, but never keep essential errors, field labels,
  totals, or state text artificially tiny.
- Use tabular numerals for estimate data, but never treat tabular alignment as a
  substitute for readable size or contrast.

## Layout and Spacing

### Transferable Guidance

- Place the most important information first in reading order and account for
  right-to-left layouts rather than hard-coding left as synonymous with primary.
- Align components to make scanning and relationships obvious. In an estimate
  sheet, column alignment, numeric baselines, and stable indentation communicate
  more than extra borders or shadows.
- Keep control placement close to the content it modifies. Row actions belong
  with the row or its inspector; project-level actions belong in the project
  toolbar.
- Adapt without becoming unrecognizable. Resizing a pane or increasing text can
  change the arrangement while preserving command names, grouping, and order.
- Use consistent spacing. Inconsistent gaps make a grid harder to scan and make
  related content appear unrelated.

Sources: [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
and [UI Design Dos and Don'ts](https://developer.apple.com/design/tips/).

### Archestimator Adaptation

- Use the project's compact spacing rhythm intentionally: 4 px for internal
  micro-alignment, 8 px for tight related items, 12–16 px for field/control
  groups, and 24–32 px for section separation. This is an Archestimator scale,
  not an Apple spacing specification.
- Treat a paired form row as one layout contract: align label baselines, input
  tops and heights, and helper/error rows together. Reserve helper/error space
  for the normal state, but allow it to grow and cause responsive stacking at
  enlarged text sizes rather than clipping.
- Preserve dropdown chevrons and inline clear buttons with enough end padding to
  remain visually separate from field borders and typed values.
- Keep resizable tree, grid, and inspector panes when they reduce back-and-forth.
  At narrow widths, collapse secondary panes predictably and keep the current
  estimate context visible.
- Prefer one stable vertical scrollbar per major pane. Avoid nested scroll areas
  that make keyboard and pointer navigation ambiguous.

### Platform-Specific Caveats

Do not copy Apple safe areas, native window margins, iOS sheet padding, sidebar
widths, or device grids. Their measurements solve Apple hardware and native
container constraints. Reproduce the relationships—alignment, hierarchy,
consistent rhythm, responsive adaptation—not the point values.

## Information Density for an Estimating Workspace

Apple's macOS guidance supports more visible content, fewer nested levels, less
modality, precise pointer work, keyboard acceleration, and user-customizable
windows. Apple's table guidance also recognizes productivity apps that need
multicolumn, sortable data and recommends resizable columns and, when useful,
alternating row treatments for wide tables.

Sources: [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/)
and [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables).

Apply that sensibility as follows:

- Keep location hierarchy, estimate rows, totals, and the selected-row inspector
  simultaneously available on wide screens when this reduces modal navigation.
- Use descriptive, succinct column headings; align numbers consistently; let
  people resize important columns; and preserve the full value through a detail
  view, tooltip, expansion, or accessible label when truncation is necessary.
- Keep the selected row persistently distinct from hover and keyboard focus.
  Selection explains context; focus explains the next keyboard target.
- Use subtle row alternation only when it materially improves cross-column
  tracking. Do not add zebra striping as decoration.
- Keep common commands visible and grouped by function/frequency. Move less-used
  commands to a labeled overflow menu, but never make the overflow the only path
  to a critical action.
- Use progressive disclosure for advanced markup, revision, or calculation
  controls. Keep the high-frequency estimating path visible and avoid deep
  cascades of hidden menus.
- Prefer a detail inspector or expandable row over an oversized row containing
  every possible attribute.

## Controls and Forms

### Transferable Guidance

- Use controls whose shape, label, and state make their purpose clear.
- Give custom buttons pressed, hover, focus, disabled, loading, and selected
  states as applicable; do not use one color change to represent all of them.
- Use one visually prominent action for the most likely action in a view. Other
  actions should remain clear without competing at the same emphasis.
- Prefer a short verb phrase when text is clearer than an icon. Icon-only actions
  need a familiar symbol, accessible name, and discoverable tooltip.
- Keep permanent field labels. Placeholder text can suggest input or format, but
  it disappears during entry and cannot carry the field identity alone.
- Space and align fields so labels, inputs, helpers, and errors remain associated.
  Tabbing must follow the visual and logical sequence.
- Validate at a useful time and state the remedy near the field; do not rely on a
  red border alone.

Sources: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons),
[Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields),
and [Writing](https://developer.apple.com/design/human-interface-guidelines/writing).

### Target Size Without Blindly Copying iOS

Apple's general button guidance discusses a 44×44 pt hit region, while its
platform accessibility table distinguishes the denser macOS context with 28×28
pt defaults and 20×20 pt minimums. These values are native platform metrics, not
web conformance rules.

**Archestimator adaptation:** use roughly 32×32 CSS px as the minimum compact
desktop hit region for standalone pointer controls, preserve 36–40 px form and
primary button heights, and expand to at least 44×44 CSS px for coarse-pointer or
touch layouts. A glyph may remain smaller than its hit box. Validate these
choices against current web accessibility requirements separately; Apple HIG is
not a web compliance standard.

Source: [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).

## Focus and Keyboard

### Transferable Guidance

- Every common task must be operable by keyboard alone.
- Use native HTML controls first so activation, disabled semantics, focus, and
  assistive technology behavior do not have to be recreated.
- Keep DOM order aligned with reading order. Avoid positive `tabindex` values and
  CSS reordering that causes focus to jump unexpectedly.
- Use a visible `:focus-visible` treatment that survives light and dark themes.
  Do not remove the browser outline without an equally clear replacement.
- Use a focus ring for fields and a row/cell highlight for collection navigation,
  while keeping focus visually distinct from selection.
- Do not move focus merely because data refreshes or a panel rerenders. If the
  focused estimate row is deleted, move focus to the nearest logical row or the
  containing grid and announce the result; otherwise preserve it.
- Use Tab and Shift+Tab between regions and form controls. Within composite tree
  or grid widgets, use the appropriate arrow-key model without creating multiple
  tabbable descendants per row.
- Preserve expected browser and operating-system shortcuts. Define app shortcuts
  only for frequent estimating commands, use both Command and Control variants
  where appropriate, and expose shortcuts in labels, menus, or a help surface.
- `Escape` should dismiss transient UI or exit an edit mode without destroying
  work; `Enter` or `Space` should activate the focused control according to its
  native semantics.

Sources: [Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/),
[Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards),
and [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).

### Apple-Specific Caveats

- Do not copy macOS focus-ring colors or iPadOS focus-group APIs.
- Do not show Command-only shortcut notation to Windows/Linux users.
- Do not assume that Full Keyboard Access will repair a custom web widget. The
  page itself must expose correct HTML semantics and predictable keyboard logic.

## Color and Contrast

### What Apple Says

- Check contrast in every supported appearance, including dark and increased-
  contrast contexts.
- Apple uses WCAG Level AA values as guidance: 4.5:1 for normal text up to 17 pt,
  3:1 for 18 pt text or bold text, and commonly 3:1 for meaningful non-text
  controls and states.
- Translucency and blur can reduce legibility even when nominal colors look
  acceptable.
- Never use color alone to distinguish function or state; add text, shape,
  iconography, or another persistent cue.

Sources: [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
[Color](https://developer.apple.com/design/human-interface-guidelines/color),
and [Sufficient Contrast evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/sufficient-contrast-evaluation-criteria/).

### Archestimator Findings and Adaptation

- `DESIGN.md`'s subtle `#7F7F7F` on white calculates to about 4.00:1 using the
  WCAG formula Apple references. It is below the 4.5:1 criterion for normal
  text, and the readability risk is magnified when paired with 8–10 px labels.
- `#5D5D5D` on white is about 6.58:1 and is a safer starting color for compact
  semantic text. Preserve `#7F7F7F` for nonessential large-enough metadata only
  after contrast and zoom checks, or darken the subtle token.
- `#F2F2F2` and `#D9D9D9` are quiet separators, not sufficient sole indicators
  for an input boundary, selected state, focus, error, or other meaningful
  control state. Add a stronger outline, fill, icon, or text cue where the
  boundary communicates function.
- Use semantic tokens such as text-primary, text-secondary, border-control,
  focus, selection, success, warning, and danger. Do not copy Apple's system
  color values; recreate their adaptive role in Archestimator's palette.
- Pair status color with icon and text: for example, a check plus “Approved,” a
  warning symbol plus “Needs review,” or an error icon plus an actionable message.
- Treat dark mode as a separate contrast problem. Do not mechanically invert the
  light palette or rely on low-contrast gray-on-black styling.

## Motion and Accessibility

### Transferable Guidance

- Animate to clarify cause and effect, status, insertion/removal, hierarchy, or
  continuity—not to make routine work feel cinematic.
- Keep microinteractions brief and interruptible. As an Archestimator starting
  point, 120–200 ms is enough for most hover, focus, selection, and disclosure
  transitions; this duration is a project adaptation, not an Apple value.
- Avoid perpetual motion, auto-advancing content, decorative parallax, large
  zooms, bouncy springs, animated blur, spinning, and simultaneous multi-axis
  movement in the estimating workspace.
- Respect `prefers-reduced-motion: reduce`. Stop decorative motion and replace
  spatial transitions with an instant change, short opacity fade, highlight, or
  color shift while preserving the state feedback.
- Do not remove every meaningful transition in reduced-motion mode. Apple notes
  that animation can improve understanding; keep the information and replace the
  triggering motion pattern.
- Never use animation or color as the only announcement of save, validation,
  calculation, upload, or publication status. Provide persistent text and
  appropriate live-region semantics where status changes asynchronously.
- Avoid auto-dismiss timers for important errors, confirmation, or undo. People
  using assistive technology may need more time to reach and understand them.

Sources: [Motion](https://developer.apple.com/design/human-interface-guidelines/motion),
[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
and [Reduced Motion evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria).

## Compact Professional UI Checklist

### Do

- Show estimate hierarchy, rows, totals, and inspector together when space allows.
- Preserve active Archestimator type roles. Consider a 13–14px operational scale
  only during an explicit shared type-system evolution task, never as a local
  override or as an Apple or WCAG mandate.
- Keep 32–36 px desktop rows and 36–40 px controls when the text and hit targets fit.
- Align paired fields as a complete label/input/helper/error system.
- Keep common actions visible; group overflow by meaning and frequency.
- Distinguish hover, focus, selection, editing, error, and disabled states.
- Support keyboard-only operation, browser zoom, 200 percent text growth, light
  and dark contrast, and reduced motion.
- Use restrained color, borders, and transitions to explain structure.

### Do Not

- Recreate macOS chrome, iOS cards, Liquid Glass, SF Symbols, or Apple point values.
- Bundle SF Pro to force Apple typography on non-Apple browsers.
- Use tiny type, thin weight, or muted gray as the mechanism for visual subtlety.
- Hide frequent estimating commands behind an icon-only overflow menu.
- Use placeholders as labels or red/green as the only status distinction.
- Remove focus outlines, hijack standard shortcuts, or move focus on background refresh.
- Clip helpers/errors into fixed-height slots when text grows.
- Add decorative motion to a high-concentration financial workflow.

## Primary Apple Sources

All links below are direct official Apple URLs reviewed on 2026-07-19.

- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/)
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields)
- [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- [Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls)
- [Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/)
- [Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards)
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Writing](https://developer.apple.com/design/human-interface-guidelines/writing)
- [Larger Text evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/)
- [Sufficient Contrast evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/sufficient-contrast-evaluation-criteria/)
- [Reduced Motion evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria)
- [UI Design Dos and Don'ts](https://developer.apple.com/design/tips/)
