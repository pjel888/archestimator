# GLM5.2 Plan Pack Prompt: Security CI Release Gates

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-security-ci-release-gates`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for practical security gates in CI and release: dependency risk, secret scanning, SAST/CodeQL, SBOM/provenance, DAST-like smoke, coverage thresholds, and release blocking policy.

## Evidence To Start From

- `.github/workflows/ci.yml` and CodeQL workflows exist but do not provide one consolidated security release gate.
- `package.json` contains validation and Cloudflare proof scripts.
- Security-specific route/API work is covered by separate OWASP/CSP/invite/share plans; this pack should focus on automation and release policy.
- No secrets may be committed or included in evidence.

## Required Plan Pack

Define gate categories, selected tools/scripts, pass/fail thresholds, local developer escape hatches, CI runtime cost, artifact retention, and mapping to launch readiness.

## Constraints

Prefer existing tooling and GitHub-native checks. Do not add dependencies or paid services unless justified and explicitly marked as owner-decision.

## Stop Condition

The pack is complete when security automation can be implemented as a reviewable, proportional release gate.
