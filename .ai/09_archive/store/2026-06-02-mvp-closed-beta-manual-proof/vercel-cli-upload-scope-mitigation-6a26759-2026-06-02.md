# Vercel CLI Upload Scope Mitigation at 6a26759 - 2026-06-02

Status: local infrastructure mitigation; external closed beta remains **NO-GO**.

## Scope

- Baseline commit before mitigation: `6a2675946b05238a513981fa03818dfbcb4d7899`.
- Production mutations: none.
- Provider deploy retry: not run, because the prior retry hit Vercel daily deployment limit `api-deployments-free-per-day`.

## Finding

The `c8e25e2` clean preview deploy attempt showed that CLI deployment uploads were including non-runtime repository artifacts. The detached clean worktree measured roughly 145 MiB, with the largest folders being:

- `archestimator_pitch deck` at roughly 98 MiB.
- `.ai` at roughly 25 MiB.
- `.ai/09_archive/store` at roughly 17 MiB.

Those folders are evidence, planning, and presentation material, not Next.js runtime inputs.

## Mitigation

Added repo-level `.vercelignore` to keep CLI deployment uploads focused on runtime source and assets. The ignore file excludes:

- `.ai`, agent/plugin state, docs, and local guidance files.
- `archestimator_pitch deck`.
- tests, E2E specs, local reports, coverage, and test results.
- local generated state, local data, logs, OS noise, and `.env*` files.

It intentionally keeps app runtime code, `public`, package manifests, Next config, and `.env.example` available.

## Verification

This mitigation is source-level only. It still requires a future Vercel deployment after quota resets or a Git-triggered preview appears. The required hosted proof remains:

```txt
vercel curl <fresh-c8e25e2-or-later-deployment>/api/health
vercel curl <fresh-c8e25e2-or-later-deployment>/workshop -I
```

## Launch Meaning

This removes a known CLI-upload obstacle for future preview deploy retries, but it does not prove hosted `/workshop` behavior, Vercel env values, production/custom-domain health, rollback, or hosted session allow/deny/revoke behavior. Closed beta remains **NO-GO**.
