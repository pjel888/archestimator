# Vercel Protection Read-Only Evidence - 2026-06-02

Status: Partial/blocked. Deployment protection is enabled, and one env-var-backed automation bypass entry remains for owner review.

## Scope

- Repository: `/Users/philiplewis/archestimator`
- Local/remote head at capture time: `c93ae7a99096`
- Vercel CLI: `54.6.1`
- Vercel project: `philipjonlewis-projects/archestimator`
- Provider posture: read-only. No deploy, promote, alias, env, rollback, bypass create/remove, or protection mutation was run.

## Command

```bash
vercel project protection archestimator --format json --non-interactive
```

## Sanitized Result

```json
{
  "projectId": "prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E",
  "name": "archestimator",
  "ssoProtection": {
    "deploymentType": "all_except_custom_domains"
  },
  "gitForkProtection": true,
  "protectionBypass": {
    "[redacted-bypass-entry-id]": {
      "scope": "automation-bypass",
      "isEnvVar": true,
      "createdAt": 1780348746807,
      "createdBy": "[redacted-user-id]"
    }
  }
}
```

The command output exposed an entry id and creator id for the bypass entry. Those identifiers are redacted here because the launch evidence only needs the posture, not raw provider identifiers.

## Launch Meaning

- Vercel SSO protection remains enabled for preview deployments and excludes custom domains.
- Git fork protection remains enabled.
- One env-var-backed automation bypass entry still exists.
- This does not prove public uptime monitoring, production/custom-domain app health, environment-variable readiness, hosted auth, or rollback.

Closed beta remains **NO-GO** until the owner decides whether the remaining automation bypass is intentional, documents the approved protection posture, and collects the still-missing Vercel env/public-health/custom-domain/rollback proof.
