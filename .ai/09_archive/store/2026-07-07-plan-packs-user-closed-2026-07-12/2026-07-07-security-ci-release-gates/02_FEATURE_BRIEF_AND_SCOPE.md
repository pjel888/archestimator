# 02 — Feature Brief and Scope

## Source brief (PROMPT.md, verbatim scope)

> Create a plan pack for practical security gates in CI and release: dependency risk, secret scanning, SAST/CodeQL, SBOM/provenance, DAST-like smoke, coverage thresholds, and release blocking policy.

**Goal (brief):** practical security gates in CI and release.
**Evidence to start from (brief):**
- `.github/workflows/ci.yml` and CodeQL workflows exist but do not provide one consolidated security release gate.
- `package.json` contains validation and Cloudflare proof scripts.
- Security-specific route/API work is covered by separate OWASP/CSP/invite/share plans; **this pack should focus on automation and release policy**.
- No secrets may be committed or included in evidence.

**Required plan pack (brief):** Define gate categories, selected tools/scripts, pass/fail thresholds, local developer escape hatches, CI runtime cost, artifact retention, and mapping to launch readiness.

**Constraints (brief):** Prefer existing tooling and GitHub-native checks. Do not add dependencies or paid services unless justified and explicitly marked as owner-decision.

**Stop condition (brief):** The pack is complete when security automation can be implemented as a reviewable, proportional release gate.

## Scope interpretation (what "automation + release policy" owns)

This pack owns the **security-automation + release-policy layer**. Concretely:

### In scope
1. **Gate categories** — the canonical taxonomy of security gates for this repo (dependency, secret, SAST, SBOM/provenance, DAST-smoke, coverage, policy).
2. **Tool/script selection** per category, with free vs paid classification (`19` matrix).
3. **Pass/fail thresholds** per gate (severity levels, coverage %, allowed advisory windows).
4. **Local developer escape hatches** — how a dev skips/bypasses a gate locally and when that's safe.
5. **CI runtime cost** — minute budget per gate against the 2,000 free min/mo on GitHub Free private.
6. **Artifact retention** — SBOM, attestations, reports; what's kept, where, for how long.
7. **Release-blocking policy** — what blocks merge vs what blocks release; the two-tier model.
8. **Mapping to launch readiness** — how `security:gate` feeds `launch:gate` (the integration target).
9. **CI re-enablement path** — restoring `ci.yml` + `dependabot.yml` from `workflows-disabled/`, plus the new security workflow.
10. **`SECURITY.md`** — vulnerability reporting policy (currently missing).

### Out of scope (owned by siblings — referenced, not redefined)
- **Route/API authorization matrix** → `2026-07-07-owasp-api-authz-matrix-refresh`.
- **CSP nonce pipeline** → `2026-07-07-global-nonced-csp-enforcement`.
- **Invite token hardening** → `2026-07-07-invite-token-flow-hardening`.
- **Share activity minimization** → `2026-07-07-public-share-activity-minimization`.
- **AI safety / provider resilience** → `2026-07-07-ai-safety-leakage-and-provider-resilience`.
- **Privacy request / DSAR** → `2026-07-07-privacy-request-operations-and-erasure-workflow`.
- **Retention / data lifecycle** → `2026-07-07-retention-and-dsar-data-lifecycle`.
- **The unified launch gate itself** → `2026-07-07-launch-readiness-evidence-gate` (this pack *feeds* it; does not redefine it).
- **Application code, DB migrations, Cloudflare bindings, wrangler config.**
- **Migrating off Cloudflare or changing providers.**

### Boundary clarifications
- This pack **does** specify the CI workflow YAML and `package.json` scripts as *planning artifacts* (exact proposed content). It does **not** create them (planning-only mode).
- This pack **does** recommend new tooling — one true devDep (`@vitest/coverage-v8`) plus four **CI-installed Go binaries** (gitleaks, Syft, cosign, osv-scanner — NOT npm packages, NOT `bunx`-invokable; R4 correction) — flagged for owner sign-off (`OPEN-CI-05`) because the brief says "do not add dependencies unless justified".
- This pack **does not** recommend any paid service as part of the default path. Paid options are isolated as Tier-B owner-decisions.

## Stakeholders

| Role | Interest |
|---|---|
| Owner (Philip) | Launch readiness, cost ($0 baseline), velocity, no false-positive blocking |
| Implementer (future AI/human) | Exact paths, commands, thresholds, escape hatches |
| Reviewer | Traceability, evidence classes, proportionality to `VALIDATION_MATRIX.md` |
| First users (indirect) | A release that passed a security gate, not just a green build |

## Assumptions (ASSUMP-CI-*, validated in `03`/`19`)

- **ASSUMP-CI-01**: The repo remains private on GitHub Free for the pre-launch horizon. (Validated: `current-state.md` "pre-launch closed-beta MVP"; no plan to go public or buy GHAS.) — **If this changes, Tier-B gates become free/cheap and the model simplifies.**
- **ASSUMP-CI-02**: Bun 1.3.14 remains the package manager; `bun.lock` is authoritative. (Validated: `package.json` `packageManager`.)
- **ASSUMP-CI-03**: The existing `ci.yml` step list (`validate` + `build` + perf-budget + `lint:design` + Playwright E2E + perf smoke) is the intended CI baseline to restore. (Validated: `workflows-disabled/ci.yml`.)
- **ASSUMP-CI-04**: The owner accepts the `PERF_BUDGET_STRICT` advisory→blocking ratchet pattern as the template for new security gates. (Validated: existing pattern in `ci.yml`; matches `VALIDATION_MATRIX.md` velocity stance.)
- **ASSUMP-CI-05**: GitHub Artifact Attestations remain free for private repos through the pre-launch horizon. (Validated 2026-07; recheck before rollout — see `13` stale-revalidation.)

## Constraints

- **C1**: No secrets in evidence (brief). All example workflow YAML, config, and reports must use placeholders/redaction.
- **C2**: Stay inside GitHub Free for the default path; paid options isolated and owner-marked.
- **C3**: Proportional to `VALIDATION_MATRIX.md` — pre-launch = fast iteration; gates ratchet, don't hard-stop on day one.
- **C4**: No application code, DB, or Cloudflare changes.
- **C5**: Reuse existing tooling (`bun audit`, existing `validate`, existing perf-budget pattern) before adding new tools.
- **C6**: All workflow actions pinned to 40-char SHA (existing pattern in `workflows-disabled/*.yml`).
- **C7**: Standing Cloudflare-resource authorization does NOT extend to GitHub billing/plan changes — those are owner decisions.
- **C8 (R4)**: The restored `ci.yml` trigger is **narrowed from `push: [main, feat/**]` to `push: [main]`** — a deliberate behavior change to existing CI (`OPEN-CI-11`), documented for owner ack. This is in-scope as a cost-predictability decision, not silent. Reference: AGENTS.md "shared-workspace assumption" branch-hazard note.

## Success metrics (for the *planning* task)

- A reviewer can determine, for each of the 7 gate categories, the tool, threshold, cost, escape hatch, and release/merge policy without re-discovery.
- An implementer can write the CI YAML + scripts from `11` without ambiguity.
- The launch-readiness-evidence-gate pack's `OPEN-LG-05` (CI re-enable) and the CI slice of `OPEN-LG-06` (hosted security) have a concrete answer from this pack.

## Failure metrics (what "done badly" looks like)

- A gate that hard-blocks velocity on day one (violates `VALIDATION_MATRIX.md`).
- A recommendation that silently assumes GHAS/Pro is free.
- A duplication of a sibling pack's security surface.
- A new dependency recommendation without owner-decision flagging.
