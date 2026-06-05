# Vercel Current-Head Read-Only Evidence - 2026-06-02

Status: Partial/blocked. Current `main` preview is Ready, but this is not production/custom-domain launch proof.

## Scope

- Repository: `/Users/philiplewis/archestimator`
- Local/remote head: `638f6813017fd3460c35fcf5917b3049ff7403cf`
- Vercel CLI: `54.6.1`
- Vercel user: `OWNER_HANDLE_PLACEHOLDER`
- Linked project: `.vercel/project.json` points to project `archestimator`, project id `VERCEL_PROJECT_ID_PLACEHOLDER`, org id `VERCEL_TEAM_ID_PLACEHOLDER`
- Provider posture: read-only. No `vercel deploy`, `promote`, `alias set`, `env add`, `rollback`, or protection change was run.

## Commands And Results

### Deployment list

Command:

```bash
vercel list --format json --non-interactive
```

Current top deployments:

```text
READY  VERCEL_DEPLOYMENT_URL_PLACEHOLDER   638f6813017fd3460c35fcf5917b3049ff7403cf  main
READY  VERCEL_DEPLOYMENT_URL_PLACEHOLDER   51e72e158c613b45e252ce44ecf0cb432c76b406  main
READY  VERCEL_DEPLOYMENT_URL_PLACEHOLDER   567f3c5ad3547fdd349c5c14ef255e691e1f16a3  main
```

### Current preview inspect

Command:

```bash
vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive
```

Result:

- Deployment id: `DEPLOYMENT_ID_PLACEHOLDER`
- Target: `preview`
- Status: `Ready`
- URL: `https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER`
- Created: `Tue Jun 02 2026 10:24:19 GMT+0800`
- Branch alias: `https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER`

### Protected health proof

Commands:

```bash
vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
```

Result:

```json
{"ok":true,"service":"archestimator","timestamp":"2026-06-02T02:26:59.527Z"}
{"ok":true,"service":"archestimator","timestamp":"2026-06-02T02:26:59.634Z"}
```

### Public preview health proof

Commands:

```bash
curl -I -sS https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -I -sS https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
```

Result:

- Current preview health: HTTP `401`, Vercel SSO protection, `x-robots-tag: noindex`.
- Branch alias health: HTTP `401`, Vercel SSO protection, `x-robots-tag: noindex`.

This means protected health is proven through Vercel CLI auth, but a public uptime monitor cannot call the preview or branch alias without a protection bypass.

### Environment variables

Command:

```bash
vercel env ls --non-interactive
```

Result:

```text
No Environment Variables found for VERCEL_SCOPE_PLACEHOLDER/archestimator
```

### Custom domains and production deployment

Commands:

```bash
vercel alias ls --non-interactive
vercel domains ls --non-interactive
vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive
curl -I -sS https://archestimator.com/api/health
curl -I -sS https://www.archestimator.com/api/health
curl -I -sS https://archestimator.vercel.app/api/health
```

Result:

- `archestimator.com`, `www.archestimator.com`, and `archestimator.vercel.app` are still aliased to `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- That deployment is production deployment `DEPLOYMENT_ID_PLACEHOLDER`, created `Sat May 30 2026 21:09:26 GMT+0800`.
- `https://archestimator.com/api/health` redirects to `https://www.archestimator.com/api/health`.
- `https://www.archestimator.com/api/health` returns HTTP `404`.
- `https://archestimator.vercel.app/api/health` returns HTTP `404`.

## Launch Meaning

Current `main` preview for `638f681` is deployed and protected `/api/health` works through `vercel curl`.

Closed beta remains **NO-GO** because:

- Vercel environment variables are absent.
- Public preview and branch-alias health return HTTP `401` behind deployment protection.
- Custom domains still point at the older production coming-soon deployment and return HTTP `404` for `/api/health`.
- Rollback rehearsal is missing.
- Hosted Google auth, allowlist, Supabase linked migrations/RLS/RPC/storage, Resend delivery/webhook, support monitoring, legal review, spreadsheet-app, and hosted manual E2E proof remain missing.
