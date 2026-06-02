# Current-Head Local Validation / Build Refresh - 2026-06-02

## Scope

Local command evidence only. This refresh does not mutate Vercel, Supabase, Resend, DNS, auth providers, production data, backups, rollback state, or legal/manual QA artifacts.

## Git Anchor

- Branch: `main`
- Commit: `bc1c715dc895aaa003ca1b853d017fcca3991c18`
- Short SHA: `bc1c715`
- Evidence time: `2026-06-02T02:50:44Z`

## Commands

### `bun install --frozen-lockfile`

Result: pass.

Summary:

- Bun version: `1.3.10`
- Resolved/downloaded/extracted: `1`
- Checked installs: `703` installs across `775` packages
- Lockfile/dependency changes: none

### `bun run validate`

Result: pass.

Validation command expanded to:

```bash
bun run type-check && bun run lint && bun run lint:design-system && bun run test && bun run test:dom
```

Summary:

- `bun run type-check`: pass.
- `bun run lint`: pass with 14 warnings and 0 errors.
- `bun run lint:design-system`: pass.
- `bun run test`: pass, 4 unit tests / 129 expectations.
- `bun run test:dom`: pass, 136 files / 1050 passed / 2 skipped.

Known lint warnings:

- 10 unused-variable warnings in `archestimator_pitch deck/deck-stage.js`.
- 1 unused eslint-disable warning in `src/components/performance-monitor.tsx`.
- 1 React Compiler incompatible-library warning for TanStack Table in `src/components/workshop/ProjectEstimatesTable.tsx`.
- 2 unused-variable warnings in `tests/vitest/share/reconstruct-share-tree.test.ts`.

Known DOM-suite console output:

- `Not implemented: navigation to another Document` from jsdom navigation behavior. The suite still exited 0.

### `bun run build`

Result: pass.

Summary:

- Next.js: `16.2.6`
- Bundler: Turbopack
- Compile time: 4.5s
- TypeScript stage: pass, 7.9s
- Static pages generated: 32
- Dynamic routes listed include `/api/health`, `/api/ai/ask`, `/api/ai/package-builder`, `/beta/access-required`, `/workshop/feedback`, `/workshop/settings/beta-users`, `/workshop/settings/feedback`, protected workshop routes, share routes, invite routes, and the proposal workbook export route.

## Launch Meaning

This proves the current local install, validation, and production-build baseline at `bc1c715`.

It does not prove hosted/provider/manual launch gates. Closed beta remains **NO-GO** until linked Supabase backup/migration/RLS/storage/RPC proof, hosted auth allowed/denied/revoked smoke, Vercel env/public health/custom-domain/rollback proof, Resend proof before email workflows are re-enabled, spreadsheet-app open/recalc/print proof, legal/owner review, monitored support proof, demo rehearsal, and hosted/manual E2E evidence are captured and linked.
