# Vercel Deployment State After PR-0B Branch Push

Generated: 2026-06-06T02:25:14.545876Z

## Result

No Vercel deployment exists for current branch commit `e55d29178cc751f3791cc37740a043a1616a3cbe` (`e55d291`) in the read-only `vercel ls archestimator --format=json -m githubCommitSha=<sha>` lookup. This means hosted post-deploy cache proof cannot yet be captured for the proxy no-store patch from this branch.

Latest production remains a `main` deployment, not this branch:

- URL: `archestimator-lz829v0ad-philipjonlewis-projects.vercel.app`
- Target: `production`
- State: `READY`
- Commit ref: `main`
- Commit SHA: `2d9e12d4d8b3f08a6da686bcb06f753474590511`
- Commit message: `Record shared-link clickthrough proof`

## Latest deployments sampled

| URL | Target | State | Ref | Commit | Message |
| --- | --- | --- | --- | --- | --- |
| archestimator-lz829v0ad-philipjonlewis-projects.vercel.app | production | READY | main | 2d9e12d4d8b3f08a6da686bcb06f753474590511 | Record shared-link clickthrough proof |
| archestimator-p66mgz1mc-philipjonlewis-projects.vercel.app | production | READY | main | 14e0a61774c30c4244a9e41aaecc616ccc4a92c4 | Emit absolute recipient URLs in share emails |
| archestimator-2oid4rslf-philipjonlewis-projects.vercel.app | production | READY | main | 2d49b6bcfd9d17a3f2a98f4d51ed72b6cde26143 | Keep beta launch instrumentation and agentic routing truthful |
| archestimator-3torz4dzn-philipjonlewis-projects.vercel.app | production | READY | main | 19c6b90887a2b443c60c9bf87451cdc85ad3b033 | Prevent owners from sending shared links to themselves |
| archestimator-bni1ukxvs-philipjonlewis-projects.vercel.app | production | READY | main | 535b68c1f111c003223b3cda03af4c3610a861f3 | Add owner logout and scoped security acceptance proof |

## Interpretation

This is read-only provider evidence. It does not deploy or mutate Vercel. It explains why current hosted auth/private-image probes still show pre-deploy `Cache-Control: public, max-age=0, must-revalidate` redirects: production is not serving the branch commit that added the local proxy no-store wrapper. Re-run hosted auth and sensitive-route probes only after an approved preview/production deployment for this branch exists.
