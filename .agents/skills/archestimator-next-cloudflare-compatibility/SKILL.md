---
name: archestimator-next-cloudflare-compatibility
description: "Check Archestimator Next.js 16 and React 19 changes against OpenNext and the Cloudflare Workers runtime, including routing, rendering, caching, images, headers, runtime APIs, bundling boundaries, and local development adapters. Do not use for provider inventory drift alone, deploy by default, or run builds, browser automation, or automated tests unless explicitly requested."
---

# Archestimator Next Cloudflare Compatibility

## Authority

- Read `AGENTS.md`, `.ai/00_system/VALIDATION_MATRIX.md`, and `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md` when loading or mount behavior changes.
- Read the relevant installed Next.js guide under `node_modules/next/dist/docs/` and the installed OpenNext package guidance in `node_modules/@opennextjs/cloudflare/README.md` before changing framework or adapter conventions.
- Treat `next.config.ts`, `open-next.config.ts`, `worker.ts`, `wrangler.jsonc`, and `wrangler.next-dev.jsonc` as the current compatibility set.

## Workflow

1. Define the Next.js behavior, Worker runtime requirement, affected routes or modules, authorized evidence, and stop condition.
2. Inspect `git status --short --branch` and trace the current config and runtime path. For broad, high-risk, or unfamiliar shared-symbol changes, use available Code Review Graph or GitNexus impact analysis when configured; for narrow reversible work, targeted source, `rg`, and LSP inspection is sufficient.
3. Confirm the chosen API and route convention against installed Next.js 16 documentation rather than model memory. Confirm the adapter or runtime behavior against the installed OpenNext version.
4. Check server-only boundaries, Node compatibility, Edge or Worker API availability, dynamic rendering and cache semantics, images, headers, aliases, and local-development initialization only where the change can affect them.
5. Prefer the existing configuration and runtime adapters. Avoid Node-only dependencies, broad shims, compatibility layers, and config duplication unless current evidence requires them.

## Boundaries

- Stay on the current branch and shared worktree. Do not reset, clean, stash, revert, commit, push, or overwrite unfamiliar config changes.
- Keep provider changes within resources bound by current `wrangler.jsonc`. Do not deploy, purchase services, mutate unrelated Cloudflare projects, touch legacy `supabase/migrations/`, or make irreversible external changes without explicit authority.
- Default to `NOT_REQUIRED`. Do not run `build`, `cf:build`, preview, deploy, browser automation, screenshots, Storybook, or automated tests unless the user explicitly requests that evidence. Use `TEST_PROPOSAL` when a build or runtime proof materially reduces risk.

## Evidence And Stop

- Use documentation comparison, focused source and config diff, type or LSP, lint, static imports, and non-test dry-run evidence that does not implicitly build or contact Cloudflare.
- Stop when the change is supported by the installed versions, the Next/OpenNext/Worker configuration remains coherent, and any unproved bundle or hosted-runtime claim is labeled as a gap rather than success.
