# design-sync notes — Archestimator Design System

Target project: **Archestimator Design System** (`3fbb6ffb-52c6-4972-abad-1735b92179a9`, owner Philip Lewis), claude.ai/design.

## How this repo syncs (off-script, NOT the converter)

Archestimator is a **Next.js 16 / React 19 App-Router app**, not a published component
library with a `dist/` bundle or a Storybook. There is therefore **nothing for the
design-sync converter to bundle**. This project is maintained as a **hand-authored
static design system** reconciled **FROM the live code** (`code → design system`):

- **Foundations** live in `tokens/*.css` (`colors`, `typography`, `spacing`, `glass`,
  `fonts`, `base`) behind a single `styles.css` `@import` entry, mirrored verbatim from
  `src/app/globals.css`.
- **Components** (`components/<group>/<Name>.{jsx,d.ts,prompt.md}` + `*.card.html`)
  recreate `src/components/ui/*` as static React-18-UMD + Babel-standalone (no TS, no
  `import`/`export`), read off the global namespace `window.ArchestimatorDesignSystem_3fbb6f`.
- **UI kits** (`ui_kits/{dashboard,workshop,proposal,landing}/`) are full-screen static
  prototypes: an `index.html` (first line `<!-- @dsCard group="…" … -->`, embeds the
  live layout CSS verbatim from `globals.css`) + a hand-authored `<Name>.jsx` (sample
  data) + a `README.md`.
- **Guidelines** (`guidelines/*.html`) are the Design-System-tab spec cards.

**Never** hand-edit `_ds_manifest.json` or `_ds_bundle.js` — the app compiles the manifest
from each card HTML's first-line `<!-- @dsCard … -->` marker. Keep that marker intact.

Push from a local staging dir via `DesignSync` `finalize_plan` → `write_files`
(`localPath`). `finalize_plan` needs both `writes` and `deletes` (use `[]` for none).
Keep writes **scoped** to the files being reconciled — this is a live, hand-curated
project; do not wholesale-replace.

## Overlays component group (added 2026-06-20)

New `components/overlays/` group — the modal family — reconciled FROM
`src/components/ui/overlays/*` and the live settings modal:

| DS component | Live source |
|---|---|
| `Modal` | `AppModal` + the `Dialog` primitive (`src/components/ui/overlays/modal.tsx`, `dialog.tsx`) |
| `ConfirmDialog` | `src/components/ui/overlays/confirm-dialog.tsx` (destructive/danger tones) |
| `Sheet` | `src/components/ui/overlays/sheet-drawer.tsx` (right/left/bottom drawer) |
| `SettingsModal` | `WorkshopSettingsModal` + `WorkshopSettingsModalContent.tsx` — composed pattern, the headline of this sync |

Cards: `components/overlays/overlays.card.html` (primitives gallery) +
`components/overlays/settings.card.html` (the settings modal at 920px). The DS
components are **presentational** (render OPEN inline, `inline` scrims the
nearest positioned stage) — they drop the live portal/focus-trap/scroll-lock
machinery, which is harness behaviour, not visual design. Signature kept: the
soft-red close chip (`#B84646`/`#8B2E2E` on `#FBE8E8`/`#F2CCCC`), 11px medium
title, 10px tertiary description, hairline header/footer rules.

**How the bundle was extended (off-script, repeatable):** the four `.jsx` were
Babel-compiled (`@babel/standalone`, classic runtime) and spliced into a copy of
the real `_ds_bundle.js` (format 3) — new `try{(()=>{…Object.assign(__ds_scope,
{Name})})()}catch` blocks before the ui_kit blocks, matching `__ds_ns.Name =
__ds_scope.Name` exposure lines, and the `@ds-bundle` header JSON
(`components` + `sourceHashes`) updated. ConfirmDialog/SettingsModal read
`Modal`/`Button` off `window.ArchestimatorDesignSystem_3fbb6f` at render time
(populated by eval end). Build/verify scripts live in
`.design-sync/staging-overlays/` (`build/build-bundle.mjs`, `verify.mjs`); the
local `styles.css` there is a **verify-only token stub — NOT uploaded** (the real
project `styles.css` is untouched). Pushed with `_ds_needs_recompile` so the app
recompiles `_ds_manifest.json` from the `@dsCard` markers + bundle header — do
**not** hand-edit the manifest.

## Brand-orange rule (owner decision 2026-06-19)

Product brand orange = **clay `#AA412A`** (dark `#8C3623`, amber/peach bloom stops).
Campaign/marketing orange = **Signal `#F24405`** — editorial/poster surfaces only,
**never** product/workshop chrome. If a sync shows signal as the product mark, treat it
as drift unless `globals.css` actually migrated.

## Kit ↔ live-code map

| DS kit | Live source |
|---|---|
| `ui_kits/dashboard/` | `/workshop` homebase — `src/components/workshop/dashboard/WorkshopDashboard.tsx` + subcomponents + the dashboard layer in `src/app/globals.css` |
| `ui_kits/workshop/` | estimate workspace — `EstimateWorkspaceClient.tsx` + glass surface tokens |
| `ui_kits/proposal/` | client cost proposal document |
| `ui_kits/landing/` | editorial marketing hero |

The per-project **Project Dashboard command surface**
(`src/components/workshop/ProjectDashboardClient.tsx`, `/workshop/projects/[id]`) is
**not yet a DS kit** (as of 2026-06-19 it was still being actively built).
