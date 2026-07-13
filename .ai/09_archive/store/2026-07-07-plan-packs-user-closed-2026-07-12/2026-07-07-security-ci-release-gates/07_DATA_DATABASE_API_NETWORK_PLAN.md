# 07 — Data, Database, API, and Network Plan

## Applicability statement

This is a **CI/automation/release-policy** pack. It introduces **no database changes, no API contracts, and no new network egress from the application runtime**. This document records that boundary explicitly (required by the exhaustive profile) and covers the narrow data/network surfaces the gates themselves touch.

## §1. Database / D1 — explicitly unaffected

- **No migration**, no schema change, no repository helper, no app-authorization change.
- `migrations/` (38 files, latest `0038_component_draft_resource_limits.sql`) is **off-limits** for this pack.
- The gates do not read D1. The smoke gate hits app routes over HTTP; whether those routes read D1 is the app's concern (owned by sibling packs), not the gate's.
- Standing Cloudflare-resource authorization is **not invoked** by this pack (no D1/R2/DO/Queue/Email change).

**Evidence:** `wrangler.jsonc` is not a planned edit target (`10` blast radius). `11` WP list contains no `migrations/` or `wrangler.jsonc` task.

## §2. API / network — the gates' own egress

The gates themselves make these network calls (CI/local only, never from the deployed Worker):

| Gate | Egress | Purpose | Auth |
|---|---|---|---|
| `bun audit` | npm registry (read) | advisory DB lookup | none (public) |
| gitleaks | **none** (offline pattern match) | secret detection | n/a |
| Syft | **none** (local file parse) | SBOM generation | n/a |
| coverage | **none** (local file read) | threshold check | n/a |
| route-smoke | `localhost:<port>` (the dev server it booted) | route probe | none (local dev) |
| provenance attestation | GitHub Actions API (via `actions/attest-*`) | sign artifact | `GITHUB_TOKEN` (Actions-provided, scoped `permissions: attestations: write`) |

**No third-party SaaS egress** in the default Tier-A path. No tokens, no API keys, no credentials created or stored. The `GITHUB_TOKEN` for attestation is Actions-injected and scope-limited per-step.

## §3. Data the gates produce (artifacts, not databases)

| Artifact | Producer | Location | Retention | PII risk |
|---|---|---|---|---|
| `security-gate-report-<sha>.txt/json` | aggregator | workflow artifact (CI), `.security-gate-report.json` (local, gitignored) | 14 days (CI, `09`); not committed | none — contains gate names, counts, paths |
| `sbom.cdx.json` | Syft | workflow artifact + `.open-next/sbom.cdx.json` (gitignored) | 90 days (release evidence) | none — dep names + versions (public) |
| gitleaks report | gitleaks | workflow artifact (ephemeral) | 1 day (redacted) | **redacted by gitleaks** — verify AC-03e |
| coverage summary | Vitest | `coverage/` (gitignored) | ephemeral | none |
| build-provenance attestation | `actions/attest-build-provenance` | GitHub attestation store (off-repo) | per GitHub policy | none |

**No PII, no user data, no secrets stored.** The gitleaks report is the only artifact that could theoretically contain a detected secret; gitleaks redacts by default and the report is ephemeral + gitignored + short-retention. The allowlist (`SEC-CI-03` AC-03a) excludes test fixtures.

## §4. Provider boundary (Cloudflare vs GitHub)

- **Cloudflare:** untouched. The deployed Worker, D1, R2, DO, Queue, Email, Images — all unchanged. The gates do not call Cloudflare APIs.
- **GitHub:** the CI workflows run on GitHub-hosted runners (ubuntu-24.04, Linux 1× minute multiplier). Dependabot creates PRs. Artifact attestations use GitHub's Sigstore CA. **No GitHub billing change** in Tier A; Tier B (GHAS/Pro) is owner-decision.
- **No cross-provider action.** Standing authorization for Cloudflare resources does not extend to GitHub plan changes (`02` C7).

## §5. Database-change blueprint — N/A

No database change → no blueprint required. Recorded as `not_applicable_with_reason`: this pack is CI/automation, not data-layer.

## §6. API contracts

- **Internal artifact contract** (`06` §4): `SecurityGateArtifact` v1 schema, consumed by the launch-readiness-evidence-gate. Breaking this schema is a P0 defect (`10`).
- **No external API** introduced. The gates are CLI tools + CI steps.
- The smoke gate's route manifest (`smoke-routes.json`) is a **local data contract**, not an API; it must be maintained when routes are added/removed (documented in `13` operations).

## §7. Rate limits / quotas

- **GitHub Actions:** 2,000 free min/mo (private-Free). The security workflow budget is estimated in `09` §1 at ~1,286 min/mo Tier A (~36% headroom). Within free tier; confirm with first month of real billing.
- **npm registry:** `bun audit` is rate-limited client-side by Bun; no gate concern.
- **No application rate-limit change.** Application rate limits are owned by the invite/share/public-share sibling packs.

## §8. Migration / rollback

- **No migration.** Rollback = disable the workflow (move back to `workflows-disabled/`) + remove `security:*` scripts. Fully reversible; documented in `13` §3.
