# CommandCode Taste Notes

Advisory only. `AGENTS.md`, `.ai/00_system`, current source, and provider
evidence override these preferences. Current runtime is OpenNext on Cloudflare
Workers with D1, R2, Durable Objects, Queues/Cron, Email, Images, and Better
Auth. Historical provider examples are not implementation guidance.

## Workflow

- Use parallel agents only for bounded independent work; the lead owns scope,
  integration, verification, and the final claim.
- Verification is always required. Classify `quality_profile` automatically as
  `Q0_CONTRACT_ONLY`, `Q1_CHANGE_GATE`, `Q2_CRITICAL_CHANGE_GATE`, or
  `Q3_RELEASE_GATE` and run every selected local evidence layer under standing
  authorization.
- Profiles may escalate and never downgrade. Missing, red, skipped, flaky,
  weakened, or malformed required evidence fails closed.
- Plans use adaptive document depth and one canonical execution artifact. Do
  not require fixed document counts, perfect scores, or ceremonial passes.

See [workflow/taste.md](workflow/taste.md).

## Product And Architecture

- Prefer existing UI primitives and `react-complex-tree` where it remains the
  established estimate-tree engine.
- Keep server state in repositories/TanStack Query and transient UI state local.
  Optimistic mutations require scoped rollback and current D1 authorization.
- Group nodes sort before area nodes when both are siblings.
- Hide `ProjectMiniSidebar` on estimate-detail routes.
- The brand name is `archestimator`, always lowercase.

## Design

See [ui/taste.md](ui/taste.md). Treat `DESIGN.md` as alpha-stage guidance and
defer final design judgment to the owner. Reuse Storybook components when they
are current and actually fit the task; do not imitate them with duplicate code.

For external research, prefer primary sources. For UI work, browser or visual
proof runs when interaction, responsive behavior, or accessibility is
the claim being verified.
