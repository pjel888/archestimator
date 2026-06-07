# External Source Adoption Plan: shadcn/ui, Flowbite, Aceternity

## Adoption Thesis

External libraries are reference sources, not visual authorities. ArchEstimator should borrow structure, accessibility patterns, and component coverage only after adapting them to `DESIGN.md`, package gates, license constraints, and performance constraints.

## Sources Checked

- shadcn/ui Tailwind v4: `https://ui.shadcn.com/docs/tailwind-v4`
- shadcn/ui MCP: `https://ui.shadcn.com/docs/mcp`
- Flowbite introduction: `https://flowbite.com/docs/getting-started/introduction/`
- Flowbite MCP: `https://flowbite.com/docs/getting-started/mcp/`
- Flowbite Blocks: `https://flowbite.com/blocks/`
- Aceternity AI recommendations: `https://ui.aceternity.com/ai-recommendations`
- Storybook Next.js Vite docs: `https://storybook.js.org/docs/get-started/frameworks/nextjs-vite/?renderer=react`
- Storybook accessibility docs: `https://storybook.js.org/docs/writing-tests/accessibility-testing`
- Tailwind v4 upgrade guide: `https://tailwindcss.com/docs/upgrade-guide`

Future implementation must re-check current docs before using any generator, CLI, MCP server, or package.

## shadcn/ui Posture

Allowed future use:

- Reference primitive structure.
- Reference accessibility-oriented Radix-backed patterns.
- Reference Tailwind v4 setup guidance.
- Use MCP/CLI only after package/dependency gate.

Constraints:

- Existing `components.json` says `new-york`, RSC true, aliases to `@/components/ui`, and icon library `lucide`.
- `DESIGN.md` and app/workshop Phosphor rules remain higher authority.
- Generated components must be reviewed, adapted, tested, and Storybooked before migration.
- New Radix packages require owner approval.

## Flowbite Posture

Allowed future use:

- Reference component category coverage.
- Reference form/table/list/modal/block examples conceptually.
- Use public docs for planning.

Constraints:

- Do not copy paid Flowbite Pro content unless Philip approves access and license handling.
- Do not import Flowbite JS runtime into app/workshop without dependency/performance approval.
- Restyle all patterns away from generic large SaaS defaults.

## Aceternity Posture

Allowed future use:

- Landing-only inspiration.
- Motion/effect ideas for review prototypes.
- AI recommendations as discovery input only.

Constraints:

- App/workshop estimating surfaces should not get heavy decorative effects.
- Motion/Framer dependency requires owner approval.
- Every effect needs reduced-motion fallback and performance review.
- Mark all Aceternity-inspired app-incompatible patterns `LANDING_ONLY` or `DEFERRED`.

## Adoption Gate Checklist

Before adopting any external component:

- Confirm license and package status.
- Confirm dependency is already present or owner-approved.
- Rewrite visual design to ArchEstimator tokens.
- Verify keyboard and ARIA behavior.
- Add Storybook stories for required states.
- Add tests if behavior is shared or nontrivial.
- Mark migration status.
