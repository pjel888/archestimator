# 11 — Asset / Env / Flag / Config Cleanup Audit

Full flag table in `evidence/feature-flag-inventory.md`. `public/` total ≈ 20 MB.

## Assets — unreferenced (CLEAN-F12, Safe delete, ~9.9 MB)

| Path | Size | Reference result |
|---|---|---|
| `public/Cards/Components-Card.jpg` | 1.8 MB | 0 src refs |
| `public/Cards/Projects-Card.jpg` | 1.9 MB | 0 src refs |
| `public/Cards/Templates-Card.jpg` | 2.2 MB | 0 src refs |
| `public/landing/archestimator-frosted-construction.png` | 2.3 MB | 0 refs (hero uses `/landing/hero-slides/*`) |
| `public/archestimator_logo.png` | 700 KB | 0 refs (logo uses `.svg` variants) |
| `public/Screenshot 2026-05-18 at 9.00.39 PM.png` | 968 KB | 0 refs (working artifact) |
| `public/{file,globe,next,vercel,window}.svg` | tiny | Next.js scaffold defaults, 0 refs |
| `public/.DS_Store` | tiny | macOS artifact — confirm `.gitignore` |

Action: delete; validate landing renders. Gate: `build` + landing visual + `e2e/landing-audit`. Decision: DELETE_NOW.

**KEEP assets:** `public/favicon_io/*` (layout metadata/manifest), `public/archestimator_logo.svg` + `_white.svg` (`ArchestimatorLogo`), `public/sidebar-BG.png` (`SidebarHeader`), `public/component-thumbnails/*.jpg` (seed/demo via `estimate-tree-data.ts` path strings), `public/landing/hero-slides/construction-slide-01..09.jpg` (HeroSection).

## CSS — dead blocks in `globals.css` (CLEAN-F13, Safe delete)

| Block | Lines | Evidence |
|---|---|---|
| `.halftone-panel` (+`::before/::after`) | ~147–171 | 0 className/class matches |
| `.halftone-field` | ~173–177 | 0 matches |
| `.arch-sketch-line` | ~179–184 | 0 matches |

Borderline (low priority): `.scale-in` + `@keyframes scale-in` — no TSX usage found; small; leave unless doing a CSS pass.
**KEEP CSS:** `.rough-annotation`, all `landing-hero-*`/`landing-testimonial-*`/`landing-quote-grid-paper` classes + keyframes, `.animate-in`/`.fade-in`/`.slide-in-*` + duration utils (used by `bulk-action-toolbar`, `context-menu`), `[data-motion-reveal]` states, scrollbar/number-input/base styles.

## Feature flags / env (highlights — full table in evidence)

- **No flag is permanently-true-and-safely-removable.** `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST` defaults true but is an intentional kill-switch for a shipped feature → keep.
- **CLEAN-F07 (follow mode):** `isFollowModeEnabled()` + `readTeamspaceFeatureFlags()` have 0 callers → `NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE` is read by nothing reachable. Owner gate (cut vs keep-staged) — see `07`.
- **CLEAN-F26 (project page cursors):** `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS` default false, capacity-gated (D-1 Supabase tier). Keep-deferred; do not enable pre-launch without Pro confirmed.
- **CLEAN-F25 (AI flags):** `ARCHESTIMATOR_AI_ENABLED`, `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` default false (fail-closed). Owner gate. **`.env.example` gap:** `DEEPSEEK_API_KEY`/`DEEPSEEK_MODEL` are read in code but absent from `.env.example` — add with AI-deferred note.
- **Dynamic-access caution:** AI flags read via `process.env[name]` bracket notation — confirm `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` is statically inlined at build (bracket access can defeat Next's `NEXT_PUBLIC_` replacement).
- **`RUN_SUPABASE_INTEGRATION`:** declared in `.env.example`, not read in `src/` — verify it's a test-config gate before any cleanup; keep in `.env.example` for now.

**KEEP (security/launch/legal/provider/Next/dev):** all Supabase/Resend/publication-secret/origin-allowlist vars, dev-auth bypass vars (non-prod guarded), `ANALYZE`/`NODE_ENV`/`PERF_TRACE`/`ARCHESTIMATOR_E2E_*`, `DATABASE_URL` (scripts).

## next.config.ts
Clean (covered in `09`): `optimizePackageImports`, `staleTimes`, Supabase image `remotePatterns`, security `headers()`; no dead redirects/rewrites; CSP `unsafe-inline` removal is a tracked deferred hardening item (out of scope). No cleanup action.

## AI provider env status (CLEAN-F25 sub)
`DEEPSEEK_API_KEY`/`DEEPSEEK_MODEL`/`AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` — read only when AI enabled; deferred → KEEP code, add Deepseek vars to `.env.example`. **No OpenAI integration exists** anywhere (no action).

## Verify `@next/bundle-analyzer` placement
Confirmed in `devDependencies` (package.json line 79) — correct. No action.
