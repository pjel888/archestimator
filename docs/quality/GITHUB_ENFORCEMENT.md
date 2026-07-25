# GitHub enforcement and readback

Status: **EXTERNAL_ENFORCEMENT_PENDING**

The repository contains active workflows and an exact target policy, but no remote ruleset, code-scanning, Dependabot, secret-scanning, or push-protection state was changed or claimed in this work. Apply enforcement only after the new workflows have emitted stable checks on `main`.

Fresh read-only verification on 2026-07-25 against the private
`pjel888/archestimator` repository returned HTTP 403 for both the repository
rulesets endpoint and the `main` branch-protection endpoint. GitHub reported
that the repository must be public or the owner must upgrade to GitHub Pro to
enable those controls. This is a provider-plan limitation, not a local
configuration pass. Keep enforcement pending until the plan or visibility
changes and the target policy can be applied and read back.

## Required checks

Configure strict, up-to-date pull-request checks for:

- `quality / gate`
- `security / codeql`
- `security / dependency review`

`quality / gate` validates profile-specific dependencies, including `quality / operations` for Q2/Q3. Do not require every conditional child job directly; Q0/Q1 legitimately omit higher-profile jobs and the aggregate is responsible for proving applicability.

## Main ruleset target

Apply a branch ruleset targeting `refs/heads/main` with:

1. Ruleset active, not evaluate-only.
2. Pull requests required.
3. Required status checks strict/up-to-date with the three names above.
4. All review conversations resolved.
5. Force pushes blocked.
6. Branch deletion blocked.
7. Non-fast-forward updates blocked.
8. Bypass limited to an explicit break-glass administrator role.
9. Every bypass requires an incident record and follow-up.

CODEOWNERS lists the actual repository owner. Do not enable required code-owner review while only one eligible maintainer exists and that setting would deadlock the repository. Enable it after a second eligible reviewer is confirmed, then require it for workflow/quality policy, migrations, auth/security/privacy, provider configuration, and dependency/release integrity.

## Security settings target

In repository **Settings → Code security and analysis**:

- enable dependency graph;
- enable Dependabot alerts and security updates;
- enable CodeQL default or advanced setup, but not both;
- enable secret scanning;
- enable push protection;
- enable validity checks where supported;
- configure private vulnerability reporting if the repository visibility and plan support it.

The checked-in advanced CodeQL workflow is the intended CodeQL setup. If GitHub reports that default setup is active, disable default setup before treating the advanced workflow as authoritative.

## Readback

Use an authenticated read-only GitHub CLI session. Replace only `<owner>/<repo>` if the remote slug differs.

```bash
repo="<owner>/<repo>"

gh api "repos/$repo/rulesets" --paginate \
  --jq '.[] | {id,name,enforcement,target,conditions,rules,bypass_actors}'

gh api "repos/$repo/branches/main/protection" \
  --jq '{required_status_checks,enforce_admins,required_pull_request_reviews,required_conversation_resolution,allow_force_pushes,allow_deletions}'

gh api "repos/$repo/code-scanning/alerts?state=open" --paginate \
  --jq '[.[] | {number,state,rule:.rule.id,severity:.rule.security_severity_level,tool:.tool.name}]'

gh api "repos/$repo/dependabot/alerts?state=open" --paginate \
  --jq '[.[] | {number,state,severity:.security_advisory.severity,dependency:.dependency.package.name}]'

gh api "repos/$repo/secret-scanning/alerts?state=open" --paginate \
  --jq '[.[] | {number,state,secret_type,validity,push_protection_bypassed}]'

gh api "repos/$repo/actions/workflows" \
  --jq '[.workflows[] | {name,path,state}]'
```

Then inspect a current pull request and confirm the exact required contexts:

```bash
gh pr checks <number> --repo "$repo" --required
gh api "repos/$repo/commits/<full-sha>/check-runs" \
  --jq '[.check_runs[] | {name,status,conclusion,app:.app.slug}]'
```

Readback passes only when:

- the active ruleset targets `main` and contains the target rules;
- the exact required checks are emitted for a current commit;
- code-scanning, dependency, and secret-scanning endpoints are available and their open high/critical findings are zero;
- secret scanning and push protection are visibly enabled;
- active workflow paths match `.github/workflows/**`;
- bypass actors match the documented break-glass policy.

Store sanitized readback JSON as external release evidence. Do not commit organization IDs, private URLs, raw alert details, credentials, or exploit material.

Until all items are applied and authoritatively read back, report **EXTERNAL_ENFORCEMENT_PENDING**.
