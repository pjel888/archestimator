# Button Architecture Unification Plan

## Task Contract

Unify Archestimator's ordinary action controls behind one styling and state foundation while preserving correct native semantics for actions, links, icon actions, toolbars, tabs, switches, menus, trees, segmented controls, and public-owned surfaces. Fix the onboarding checklist's text-only hit targets and migrate every appropriate app-wide ordinary button or button-shaped link without changing business behavior.

## Audit Baseline

- Current source contains 542 shared `Button` uses, 198-200 raw `<button>` tags across 113 files, and 197 anchors or Next.js `Link` elements.
- The shared `Button` is a native button with 12 variants and nine sizes, but it has no reusable link recipe, no pending API, and text sizes impose a 96px minimum width that callers frequently override.
- Browser measurement on `/workshop/getting-started` proved shared path CTAs are fully clickable, while checklist `Open` links expose only a roughly 25 by 14 CSS-pixel text target.
- Authenticated feature code contains 122 raw button occurrences across 63 files; some are ordinary actions and some are specialized semantic controls that must remain native implementation details.
- Existing tests cover a small class subset but not native type, keyboard activation, disabled denial, icon naming, link semantics, full hitbox behavior, focus visibility, or raw-button enforcement.

## Requirements

### REQ-001 — One action styling contract

Provide one exported class recipe for hierarchy, density, focus, disabled, busy, icon spacing, and target-size behavior. Keep native semantics out of the recipe.

### REQ-002 — Typed semantic wrappers

Keep `Button` as a native action/form control. Add an explicit `ButtonLink` for Next.js navigation and retain `IconButton`, `ToolbarIconButton`, and `ButtonGroup` as focused wrappers over the same recipe. Do not expose a universal public `asChild` API.

### REQ-003 — Flexible visual API

Support filled, outlined/surface, borderless, backgroundless/text, destructive, inverse/overlay, icon-only, full-width, disabled, and pending presentations. Preserve current variants through the migration unless every caller and specialist use has been safely remapped.

### REQ-004 — App-wide ordinary-action migration

Migrate ordinary feature-local raw buttons and button-shaped links to the shared family. Include onboarding, authenticated workshop/admin/share/client-portal surfaces, and ordinary public/provider wrappers where the shared recipe can be used without erasing their visual ownership.

### REQ-005 — Semantic-control preservation

Do not replace tabs, switches, segmented controls, menu items, combobox internals, tree rows, pagination internals, date-picker cells, drag handles, upload controls, chips, or other controls whose keyboard/focus/state contract is not an ordinary command button. Record exact approved primitive paths for enforcement.

### REQ-006 — Future drift prevention

Extend deterministic design enforcement so new authenticated feature-local ordinary raw buttons are rejected while exact shared UI primitive implementations and public-owned routes remain intentionally scoped.

### REQ-007 — Q2 proof

Produce fresh machine-readable Q2 evidence for semantics, keyboard activation, disabled/pending denial, accessible naming, target sizing, hitbox behavior, Storybook state coverage, enforcement, changed-code coverage, mutation, build, browser checks, and independent reviews.

## Decisions

### DEC-AUTO-001 — Foundation, not universal DOM polymorphism

Use one action class recipe with semantic wrappers. Buttons trigger actions; links navigate. This follows current Shadcn guidance to export button variants for links, Next.js anchor semantics, and Radix's warning that `asChild` transfers accessibility and ref/event responsibilities to arbitrary children.

### DEC-AUTO-002 — Explicit `ButtonLink`

Use `ButtonLink` rather than making `ButtonProps` pretend to type both buttons and anchors. `ButtonLink` does not expose native `disabled`; unavailable navigation renders a non-link state or is omitted.

The implementation contract is exact:

```tsx
export type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function buttonVariants(options?: ButtonStyleOptions): string;

export type ButtonProps = Omit<React.ComponentPropsWithRef<"button">, "className"> &
  ButtonStyleOptions;

export function Button(props: ButtonProps): React.JSX.Element;

export type ButtonLinkProps = Omit<React.ComponentPropsWithRef<typeof Link>, "className"> &
  ButtonStyleOptions;

export function ButtonLink(props: ButtonLinkProps): React.JSX.Element;
```

- `buttonVariants()` defaults to `variant="secondary"` and `size="md"` and merges `className` last through `cn`, preserving caller override precedence.
- `Button` defaults to `type="button"`, forwards its React 19 `ref`, events, form attributes, ARIA, and data attributes to the native button, and adds `data-slot="button"`, `data-variant`, and `data-size`.
- `ButtonLink` requires Next.js `href`, forwards its anchor ref and Link props, renders exactly one anchor, and adds `data-slot="button-link"`, `data-variant`, and `data-size`.
- `ButtonLink` has no `disabled`, `type`, `form*`, or `pending` prop. Unavailable navigation renders a non-link status or omits the action; it is never a fake-disabled anchor.
- The public API does not expose `asChild`; Radix trigger composition remains inside the relevant semantic primitive.

### DEC-AUTO-003 — Preserve compatibility during migration

Keep current variant and size names initially to avoid a 542-call-site visual rewrite. Add the shared recipe, data hooks, ref support, and link wrapper first; consolidate aliases only when source evidence proves no caller depends on them.

Loading remains explicit composition rather than a `pending` prop. A loading action uses native `disabled`, `aria-busy="true"`, a decorative shared `Spinner`, and a still-meaningful visible label. This follows the current Shadcn pattern, avoids ambiguous disabled navigation, and prevents `ToolbarIconButton`'s manual activation layer from bypassing an internal pending flag. No wrapper may hide or replace the accessible label with spinner-only content.

Before the recipe is changed, characterization must lock every existing variant and size, default `type="button"`, explicit submit forwarding, class override precedence, event delivery, React 19 refs, arbitrary ARIA/data forwarding, `IconButton` naming, and current `ToolbarIconButton` activation. The initial foundation change may add exports and data attributes but may not remove variant aliases, change default geometry, or simplify toolbar pointer behavior.

### DEC-AUTO-004 — Target-size tiers

Maintain a 24 by 24 CSS-pixel hard floor for non-inline targets, compact 28-32px workspace controls, 40px standard controls, and 44px touch/coarse-pointer controls. Do not globally inflate dense estimate grids.

### DEC-AUTO-005 — Public visual ownership remains intact

Public and provider wrappers may consume the shared recipe while retaining surface-owned classes. The migration centralizes interaction fundamentals without imposing authenticated typography or visual language on public routes.

## Non-Goals

- Redesigning every route or changing business workflows.
- Converting links into buttons or buttons into links.
- Flattening specialized widgets into `Button`.
- Adding Radix Slot or CVA solely to copy Shadcn when the existing `cn` utility can express the required recipe.
- Deploying, publishing, or mutating external resources.

## Units

### UNIT-001 — Shared foundation and characterization

Owned paths: `src/components/ui/button.tsx`, `src/components/ui/icon-button.tsx`, focused stories/tests, and only directly required helpers.

Implementation: first add a pre-change characterization matrix for every current variant/size and native behavior. Then export the action class recipe; add `ButtonLink`; add data hooks and React 19 refs; preserve all current variants, sizes, defaults, geometry, loading composition, and toolbar behavior.

Evidence: focused Vitest behavior tests, type checking, Storybook boundary/component checks, and source impact analysis.

Recovery: revert only the foundation diff while preserving unrelated work; no data or external recovery applies.

### UNIT-002 — Onboarding and button-link migration

Depends on UNIT-001.

Owned paths: onboarding and representative button-shaped navigation CTA files.

Implementation: replace text-only and duplicated button-like links with `ButtonLink`; verify the entire rendered hitbox, keyboard navigation, focus visibility, and route behavior.

Evidence: focused component tests and signed-in browser measurements/screenshots on `/workshop/getting-started`.

### UNIT-003 — App-wide ordinary action migration

Depends on UNIT-001.

Owned paths: authenticated feature-local ordinary actions plus suitable public/provider wrappers. Shared semantic primitives are excluded.

Implementation starts by generating `quality/button-architecture-inventory.json`. Every raw `<button>` and button-shaped `<a>`/`Link` receives an exact source path, nearest enclosing symbol, stable normalized opening-tag fingerprint, occurrence ordinal, disposition, and reason. Allowed dispositions are `MIGRATE_BUTTON`, `MIGRATE_ICON_BUTTON`, `MIGRATE_BUTTON_LINK`, `SPECIALIZED_SEMANTIC_CONTROL`, or `PUBLIC_SEMANTIC_EXCEPTION`. Public ownership alone is not an exception and does not count as migration. Replace every ordinary-action disposition with `Button`, `IconButton`, `ButtonLink`, or a focused wrapper; preserve event handlers, form types, ARIA, refs, class overrides, and visual behavior.

Evidence: deterministic inventory showing no unapproved feature-local ordinary raw buttons, targeted tests for changed behavior, React Doctor, typecheck, lint, and source-level blast-radius review.

### UNIT-004 — Enforcement and documentation

Depends on UNIT-002 and UNIT-003.

Owned paths: design enforcement, its tests, shared Button stories, and the applicable design contract.

Implementation: reject raw ordinary buttons and hand-styled button-like links after migration. Remaining raw semantic controls are allowed only by exact inventory fingerprints and occurrence ordinals; no whole-file or directory allowlist is permitted. Enforcement fails on any unclassified occurrence, fingerprint change, disposition growth, or new ordinary action—even inside a file that already contains an approved specialized control. Public route ownership may scope authenticated design rules, but the app-wide inventory still classifies public raw controls and rejects unrecorded growth. Document when to use each wrapper and add complete state examples.

Evidence: positive/negative enforcement fixtures, design-system lint, Storybook validation, and inventory counts.

### UNIT-005 — Q2 verification and independent review

Depends on UNIT-004.

Implementation: run focused tests first, then Q2 aggregate evidence; verify representative action, icon, link, disabled/pending, keyboard, focus, and target-size states in the user-approved in-app browser; run architect and code-review passes.

Exact Q2 evidence mapping:

```powershell
bun x vitest run tests/vitest/ui-button.test.tsx tests/vitest/button-architecture-enforcement.test.ts --maxWorkers=1
bun run quality:classify               # artifacts/quality/classification.json
bun run quality:contracts              # artifacts/quality/contracts.json
bun run quality:adapters               # artifacts/quality/adapter-validation.json
bun run quality:anti-bypass            # artifacts/quality/anti-bypass.json
bun run quality:workflows              # artifacts/quality/workflows.json
bun run quality:reviews                # artifacts/quality/reviews.json
bun run quality:static                 # artifacts/quality/static.json
bun run test:unit:coverage             # artifacts/quality/unit.json
bun run test:component:critical        # artifacts/quality/component.json
bun run quality:diff-coverage          # artifacts/quality/diff-coverage.json
bun run test:property                  # artifacts/quality/property.json
bun run test:workers:coverage          # artifacts/quality/workers.json
bun run test:bdd:smoke                 # artifacts/quality/bdd-smoke.json
bun run test:a11y                      # artifacts/quality/a11y.json
bun run build                          # artifacts/quality/build.json
bun run test:e2e:smoke                 # artifacts/quality/e2e-smoke.json
bun run test:e2e:matrix                # artifacts/quality/e2e-matrix.json
bun run quality:bundle-budget          # artifacts/quality/bundle-budget.json
bun run test:mutation:critical
bun run quality:security               # artifacts/quality/security.json
bun run test:ai-evals                  # artifacts/quality/ai-eval.json
bun run quality:operations             # artifacts/quality/operations.json
bun run quality:critical
```

`test:mutation:critical` must produce `artifacts/quality/mutation.json`. The focused onboarding browser audit additionally records before/after screenshots, computed target bounds, element roles/tags, keyboard activation, and destination in the plan-pack evidence directory. Independent architect and quality-reviewer handoffs are captured in `artifacts/quality/reviews.json` or a plan-pack receipt that the quality command consumes. The final command set may be narrowed only when the canonical Q2 profile explicitly maps an equivalent command; required evidence may not be skipped or weakened.

## Acceptance Criteria

### AC-001

All ordinary action visuals resolve through one action recipe, and native action/link wrappers expose correct element-specific props.

### AC-002

The onboarding checklist's button-like navigation targets include their complete visible control area and meet the non-inline target-size contract.

### AC-003

Every appropriate ordinary raw button or button-shaped link is migrated without changing business handlers, form submission, navigation, disabled, loading, toggle, or disclosure behavior.

### AC-004

Specialized semantic controls remain specialized and are covered by exact enforcement exclusions rather than broad directory exemptions.

### AC-005

Focused behavior, accessibility, visual-state, enforcement, browser, changed-code, mutation, build, and independent-review evidence is freshly green under Q2.

## Risks

### RISK-001 — Broad caller blast radius

Changing the shared class recipe affects 542 current `Button` uses. Mitigate through compatibility-first API additions, GitNexus/source impact inspection, focused characterization, and browser comparison before variant cleanup.

### RISK-002 — Semantic regression

Blanket replacement can break tabs, menus, switches, trees, and drag handles. Mitigate with explicit taxonomy, exact path allowlists, and per-file classification before edits.

### RISK-003 — Visual drift

Removing implicit width or renaming variants can alter dense workflows. Preserve existing names and geometry first; remove one-off overrides only when measured evidence proves equivalence.

### RISK-004 — False enforcement confidence

A broad allowlist can hide future drift. Keep exclusions to shared primitive implementation files and verify negative fixtures.

## Stop Condition

Stop only when all core requirements are reconciled to fresh Q2 evidence, the before/after browser audit proves the onboarding hitbox fix, independent reviews report no unresolved critical finding, and GitNexus `detect_changes` confirms the expected symbol and flow scope. No hosted or production claim is required.
