---
name: archestimator-design
description: Use this skill to generate well-branded interfaces and assets for Archestimator (a cost estimating & proposal workspace for AEC teams), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files (`tokens/`, `components/`, `ui_kits/`, `guidelines/`, `assets/`).

Archestimator reads as a **precise professional instrument** — "documents you would trust, not dashboards that perform." Dense, calm, document-like: compact SF Pro type (12px hard max in app), a restrained neutral palette, thin borders, and color reserved for status and meaning. Brand orange (clay `#AA412A`) is landing / brand / glass-accent only.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out of `assets/` and create static HTML files for the user to view, linking `styles.css` and using the token CSS variables (`--ink`, `--surface-muted`, `--radius-xs`, etc.) and `.ae-*` type helpers. If working on production code, copy assets and apply the rules here to design like a fluent Archestimator engineer.

Match the worlds: **app/workshop** stays strict (SF Pro, 8–12px, 3px radius, zero tracking, neutral); **landing** is editorial (Inter, tight tracking, orange brand); **proposals** are document-like (Source Serif 4, warm paper). Reserve emoji entirely; the only decorative mark is a sparse orange asterisk on brand surfaces.

If the user invokes this skill without other guidance, ask what they want to build or design, ask a few focused questions, and act as an expert designer who outputs HTML artifacts or production code depending on the need.
