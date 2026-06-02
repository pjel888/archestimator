# Current-Head Local Validation And Build Evidence - 2026-06-02

Status: Local command baseline pass. This is not closed-beta launch approval.

## Scope

- Repository: `/Users/philiplewis/archestimator`
- Local/remote head before this evidence-sync edit: `51e72e1`
- Working tree caveat: unrelated skill/config churn and untracked `.ai/08_prompts/mvp-launch-goal.md` were present; no launch evidence files were staged before the commands.
- Environment: local machine, `.env.local` loaded by Bun/Next.

## Commands

### Dependency install

Command:

```bash
bun install --frozen-lockfile
```

Result:

- Pass.
- Bun: `1.3.10`.
- Checked 703 installs across 775 packages.
- No dependency or lockfile changes.

### Validation

Command:

```bash
bun run validate
```

Result:

- Pass.
- Covered subcommands:
  - `bun run type-check`: pass.
  - `bun run lint`: pass with 14 warnings and 0 errors.
  - `bun run lint:design-system`: pass.
  - `bun run test`: pass, 4 unit tests / 129 expectations.
  - `bun run test:dom`: pass, 136 files / 1050 passed / 2 skipped.
- Known lint warning shape: 14 existing warnings across the pitch deck, `performance-monitor.tsx`, `ProjectEstimatesTable.tsx` React Compiler/TanStack warning, and one share reconstruction test.

### Production build

Command:

```bash
bun run build
```

Result:

- Pass.
- Next.js: `16.2.6`.
- Turbopack compiled successfully.
- TypeScript finished during build.
- Static generation completed: 32 / 32.
- Route summary included app Proxy plus `/api/health`, disabled-by-default AI routes, proposal export route, share/invite routes, beta access route, and protected workshop/settings/feedback/beta-users routes.

## Launch Meaning

This refresh proves the local install, validation, and production build commands still pass at `51e72e1`.

Closed beta remains **NO-GO** because this evidence does not prove:

- linked Supabase backup/PITR, migrations, RLS/storage/RPC, or restore drill;
- hosted Google auth allowlist, denied/revoked/session-expiry, or first-run smoke;
- Vercel env, public/custom-domain app health, or rollback rehearsal;
- Resend delivery/webhook proof;
- Excel plus secondary spreadsheet-app open/recalc/print proof;
- owner/counsel legal review;
- monitored support inbox/table/alert ownership;
- hosted/manual E2E or live demo rehearsal.
