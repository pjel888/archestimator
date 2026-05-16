# DESIGN.md for Archestimator Agentic Design Workflow

**Date accessed:** 2026-05-16
**Subject:** Google's DESIGN.md spec and CLI
**Purpose:** Define how Archestimator should use DESIGN.md to guide agentic UI development.
**Status:** Research and workflow recommendation.

## Sources reviewed

- GitHub repository: https://github.com/google-labs-code/design.md
- Official spec: https://github.com/google-labs-code/design.md/blob/main/docs/spec.md
- npm package: https://www.npmjs.com/package/@google/design.md
- CLI source paths reviewed by research worker:
  - `packages/cli/src/commands/lint.ts`
  - `packages/cli/src/commands/diff.ts`
  - `packages/cli/src/commands/export.ts`
  - `packages/cli/src/commands/spec.ts`

## What DESIGN.md is

DESIGN.md is a plain-text design-system format intended for both humans and AI coding agents.

A DESIGN.md file contains:

1. YAML front matter with machine-readable tokens.
2. Markdown body with human-readable rationale, rules, and usage guidance.

The important concept is:

> Tokens give exact values. Prose explains judgment.

This fits Archestimator because agentic UI work needs both:

- exact colors, typography, radius, spacing, and component tokens;
- qualitative rules about density, calmness, contractor trust, proposal polish, and spreadsheet familiarity.

## File structure

DESIGN.md can include optional YAML front matter delimited by `---` lines.

Expected token categories include:

- `version`
- `name`
- `description`
- `colors`
- `typography`
- `rounded`
- `spacing`
- `components`

Common token types:

- color: hex sRGB, such as `"#111827"`;
- dimension: `px`, `em`, or `rem`;
- token reference: `{colors.primary}`;
- typography object with `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, and optional OpenType/variation fields.

## Canonical markdown section order

The spec defines the following canonical order:

1. Overview / Brand & Style
2. Colors
3. Typography
4. Layout / Layout & Spacing
5. Elevation & Depth / Elevation
6. Shapes
7. Components
8. Do's and Don'ts

Sections may be omitted, but present sections should follow order.

## CLI commands

Official package:

`@google/design.md`

Observed version:

`0.1.1`

### Lint

```bash
npx -y @google/design.md lint DESIGN.md
```

Purpose:

- validates structure;
- catches broken token references;
- catches invalid colors/dimensions/typography;
- reports contrast findings;
- returns non-zero exit code on errors.

### Diff

```bash
npx -y @google/design.md diff DESIGN.md DESIGN-v2.md
```

Purpose:

- compares token changes;
- reports added/removed/modified tokens;
- detects regressions.

### Export

```bash
npx -y @google/design.md export DESIGN.md --format tailwind
npx -y @google/design.md export DESIGN.md --format json-tailwind
npx -y @google/design.md export DESIGN.md --format css-tailwind
npx -y @google/design.md export DESIGN.md --format dtcg
```

Purpose:

- creates downstream implementation tokens for Tailwind or Design Tokens Community Group compatible pipelines.

### Spec introspection

```bash
npx -y @google/design.md spec --rules-only --format json
```

Purpose:

- lets agents query the active spec/rules instead of relying on stale assumptions.

## Why this matters for Archestimator

Archestimator will likely involve multiple AI agents across planning, design, implementation, review, and testing. Without a formal design source of truth, each agent may invent slightly different:

- button sizes;
- card radius;
- grid density;
- table typography;
- accent colors;
- status colors;
- proposal preview styling;
- layout rhythm.

DESIGN.md gives the project a repo-level contract.

## Recommended Archestimator agentic workflow

### Step 1 — Create root DESIGN.md before UI implementation

Place at:

`/Users/philiplewis/archestimator/DESIGN.md`

This should sit beside future app source files, not buried only in `.ai`.

### Step 2 — Keep expanded rationale in `.ai`

Use root `DESIGN.md` as the canonical agent-readable spec.

Use `.ai/06_specs/` for deeper supporting rationale, such as:

- proposal-package UI details;
- estimate sheet density;
- version history UI;
- library panel behavior;
- marketing/landing direction.

### Step 3 — Lint every material design-token change

Run:

```bash
npx -y @google/design.md lint DESIGN.md
```

before claiming a design-system update is valid.

### Step 4 — Diff before accepting major visual changes

If an agent proposes a new design direction, save it as a candidate file and run:

```bash
npx -y @google/design.md diff DESIGN.md DESIGN.candidate.md
```

This helps catch accidental token drift.

### Step 5 — Export after stack decision

When the app stack is selected, export tokens:

```bash
npx -y @google/design.md export DESIGN.md --format tailwind > tailwind.theme.json
npx -y @google/design.md export DESIGN.md --format dtcg > tokens.dtcg.json
```

If using Tailwind v4, prefer `css-tailwind` if the app setup supports it.

## Recommended first DESIGN.md direction for Archestimator

These are not final tokens yet, but they are the direction to test.

### Brand feel

- precise;
- professional;
- calm;
- contractor-trustworthy;
- architectural but not decorative;
- premium enough for architects, direct enough for contractors.

### Interface feel

- spreadsheet familiarity;
- proposal-package polish;
- clear status language;
- restrained color;
- strong typography hierarchy;
- dense but not cramped;
- low fatigue for long estimating sessions.

### Avoid

- playful startup gradients;
- generic construction orange everywhere;
- overly decorative blueprint clichés;
- tiny low-contrast spreadsheet text;
- hiding primary estimating actions;
- weak distinction between internal costs and client-facing totals.

## Suggested DESIGN.md content areas for Archestimator

The root file should eventually define:

1. brand overview;
2. color tokens;
3. typography tokens for:
   - display/marketing;
   - app headings;
   - estimate sheet cells;
   - tabular numbers;
   - proposal document text;
4. spacing scale;
5. radius scale;
6. elevation scale;
7. component tokens for:
   - primary button;
   - secondary button;
   - danger/destructive button;
   - estimate sheet cell;
   - selected row;
   - library card;
   - proposal preview page;
   - version badge;
   - scope status pill;
   - financial total card;
8. do/don't rules for agentic UI work.

## Archestimator-specific design rules to encode

### Estimate sheet

- Maintain spreadsheet-like scanability.
- Use tabular numbers for quantities, unit costs, and totals.
- Keep row density high enough for professional estimating.
- Use color sparingly; totals, changes, and warnings deserve more emphasis than decoration.

### Material/cost library

- Library cards must show source, unit, default cost, and pricing date when available.
- Inserted library items should visibly indicate linked/overridden/detached state.
- "Add custom item" should be visually available when search fails.

### Proposal package

- Proposal previews should feel like professional contractor documents.
- Do not make client-facing documents look like raw admin dashboards.
- Terms, exclusions, and OSCI/owner-supplied items must be visually explicit.

### Versioning

- Version states must be visible and understandable.
- Issued proposal snapshots should look locked/official.
- Draft working estimates should not be visually confused with issued proposals.

### Status colors

- Green: accepted/approved/safe.
- Yellow/amber: provisional/review/allowance.
- Red: excluded/error/risk/increase that needs attention.
- Blue or neutral accent: linked/source/info.

## Important caution

DESIGN.md is not a replacement for UX specs. It should not carry detailed product workflows. It should define reusable visual identity and design rules, while `.ai/06_specs/` defines feature behavior.

## Recommended next action

Before MVP screen architecture, create an initial root `DESIGN.md` for Archestimator and lint it. This gives future agents a visual contract before they produce UI plans or code.
