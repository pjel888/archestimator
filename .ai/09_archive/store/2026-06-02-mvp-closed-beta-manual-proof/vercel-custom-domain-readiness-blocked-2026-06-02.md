# Vercel Custom Domain Readiness Blocked - 2026-06-02

Scope: read-only Vercel custom-domain, alias, DNS, and public route checks.

Result: blocked/negative for MVP closed-beta production/custom-domain readiness. The custom domains are attached to Vercel and resolve, but they point at an older Ready production coming-soon deployment that does not expose the current app health route.

## Commands

```bash
vercel domains ls --non-interactive
vercel alias ls --non-interactive
vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive
curl -sS -i --max-time 20 https://archestimator.com/api/health
curl -sS -i --max-time 20 https://www.archestimator.com/api/health
curl -sS -i --max-time 20 https://www.archestimator.com/
curl -sS -i --max-time 20 https://archestimator.vercel.app/api/health
dig +short archestimator.com A
dig +short www.archestimator.com CNAME
dig +short www.archestimator.com A
```

## Vercel Domain And Alias Evidence

- `vercel domains ls --non-interactive` found `archestimator.com` under `VERCEL_SCOPE_PLACEHOLDER`, registrar `Third Party`, nameservers `Third Party`, creator `OWNER_HANDLE_PLACEHOLDER`.
- `vercel alias ls --non-interactive` maps `archestimator.com`, `www.archestimator.com`, `archestimator.vercel.app`, `archestimator-VERCEL_SCOPE_PLACEHOLDER.vercel.app`, and `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` to `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- `vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive` reported deployment id `DEPLOYMENT_ID_PLACEHOLDER`, target `production`, status `Ready`, created `Sat May 30 2026 21:09:26 GMT+0800`.

## Public Route Evidence

- `https://archestimator.com/api/health` returned HTTP `307` redirecting to `https://www.archestimator.com/api/health`.
- `https://www.archestimator.com/api/health` returned HTTP `404`, with `x-matched-path: /404`.
- `https://archestimator.vercel.app/api/health` returned HTTP `404`, with `x-matched-path: /404`.
- `https://www.archestimator.com/` returned HTTP `200` and page metadata `Archestimator — Coming Soon`.

## DNS Evidence

- `archestimator.com A` returned `216.198.79.1`.
- `www.archestimator.com CNAME` returned `bb7ab57cfa50fcad.vercel-dns-017.com`.
- `www.archestimator.com A` returned `64.29.17.65` and `216.198.79.65`.

## Launch Meaning

This proves the custom domains are attached and resolving through Vercel, but they are not serving the current closed-beta app deployment. Production/custom-domain health remains **NO-GO** until the current app deployment is promoted or aliased to the custom domains and `/api/health` returns the expected health JSON without relying on a preview-protection bypass.
