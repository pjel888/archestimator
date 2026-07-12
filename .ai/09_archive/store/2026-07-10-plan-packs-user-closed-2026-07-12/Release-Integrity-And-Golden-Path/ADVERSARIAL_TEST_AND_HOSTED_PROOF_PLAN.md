# Adversarial Test And Hosted Proof Plan

This supporting QA artifact expands `TEST-001..011` and
`GATE-001..004`. Stable test/gate IDs remain in
`VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`.

## Local Proof Lanes

| Tests | Claim | Required negative fixtures | Evidence class |
|---|---|---|---|
| `TEST-001` | CI source contract | Mutable pins, missing typecheck/lint, excessive permission, skipped/neutral/cancelled aggregate, unsafe fork | Local contract |
| `TEST-002` | Candidate identity | Missing/changed input, rebuild, mutable ref, SHA/env mismatch, stale/expired artifact, adapter bypass | Local contract |
| `TEST-003` | Fixture lifecycle | Double setup/cleanup, mid-seed failure, production/unknown host, foreign canary, raw credential canaries | Local integration |
| `TEST-004` | 20-step contract | Missing/extra step, unstable selector, absent server assertion/receipt, default skip, arbitrary sleep | Local contract |
| `TEST-005` | Evidence/smoke schema | Partial/malformed bundle, raw secret, wrong auth/route/SHA/env, stale evidence | Local contract |
| `TEST-006` | Release truth | Missing/stale/conflicting/unknown proof, migration drift, open blocker, manual Markdown contradiction | Local contract |
| `TEST-007` | Workflow security/discovery | 401/403/404/503/rate limit/partial pagination/unsupported plan, unsafe secret response | Local security contract |
| `TEST-008` | Nine-pack and candidate-dependency composition | Missing/stale/superseded receipt, wrong package/artifact/source/release ID, included Corporate source without a validated receipt, or exclusion whose file/revision matches the candidate | Local integration |

Run the smallest targeted test first, then typecheck, error-handling validation,
OpenNext build when implementation touches build inputs, and scoped diff checks.
A maker does not issue the final checker result.

## Hosted Boundary Lanes

- `TEST-009` under `AUTH-001`: approved GitHub mutation plus complete GET
  readback for branch, workflow SHA, checks/source apps, eligibility runs,
  bypasses, environment, retention, and scans.
- `TEST-010` under `AUTH-002`: exact candidate on an approved isolated staging
  surface, Chromium 20-step plus WebKit mobile review, accessibility summary,
  pack receipts, canary preservation, and double cleanup.
- `TEST-011` under `AUTH-003`: full input verification, OpenNext version upload,
  exact version deployment, marker/auth/denial smokes, strict gates, conditional
  rollback rehearsal, exact-candidate re-promotion, rerun, and final traffic
  readback.

Unknown access, stale packets, partial proof, resource mismatch, production host
in the staging lane, or receipt drift fails closed before mutation. Authorization
for one lane never implies another.

## Proof Boundary

This document is planning input only. Browser, GitHub, provider, staging,
deployment, and production claims require their named execution receipts; plan
validation and static review cannot satisfy them.
