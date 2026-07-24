# Kimi Landing Typography

Apply this scale to every section after the hero and product proof on `/` and
`/kimi3d`. It is intentionally compact: headings carry hierarchy without
turning each section into another hero.

| Role | Desktop scale | Use |
| --- | --- | --- |
| Eyebrow | 11px | Uppercase context labels |
| Body | 16px | Section intros, card copy, lists, FAQ text |
| Feature title | 20px to 24px | Individual product capabilities |
| Subsection title | 32px to 40px | FAQs and local subheadings |
| Section title | 40px to 54px | Primary lower-page sections |

The implementation lives in the `--k-type-*` tokens at the root of
`kimi-landing.module.css`. Use those tokens rather than new one-off values.
On small screens, preserve the hierarchy and cap a section title at 44px.

Intercom is a scale reference, not a visual template: its current desktop
homepage uses 54px section headings, 24px local headings, and 16px body copy.
