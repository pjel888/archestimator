# 13 — Rollout, Rollback & Operations

## §1. Staged local→hosted proof ladder

This is the core "staged path from local proof to hosted proof" the PROMPT requires.

| Stage | Evidence class | What it proves | Commands (proposed) | Who runs it | Auth needed | Safe to run anytime |
|---|---|---|---|---|---|---|
| **0 — Local-static (read)** | local-static | Artifacts exist, aggregator logic sound, no missing required inputs | `bun run launch:gate --local` (read mode) | Executor / CI | none | ✅ yes |
| **1 — Local-automated (exec)** | local-automated | `validate` + `build` + `cf:release-gates` local composite + `dbidx:audit-repo` + `check-public-cache-safety` + `perf:check-routes` (advisory) | `bun run launch:gate --local` (exec mode, default) | Executor / CI | none | ✅ yes |
| **2 — Provider-backed (read-only CF API)** | provider-backed | D1/R2/DO/Queue/Email readback via `cf:check-*` (no mutation) | `bun run launch:gate --with-provider` | Operator with Cloudflare auth | Cloudflare (read-only) | ✅ yes (read-only) |
| **3 — Hosted-production** | hosted-production | `cf:verify-hosted-*` route/perf/upload/collaboration proofs against `archestimator.com` | `bun run launch:gate --with-hosted` | Operator | Cloudflare + live deploy | ✅ yes (read-only) |
| **4 — Owner/operator sign-off** | browser-manual + operator | Legal-owner + support-monitoring + provider-exit operator record + hosted manual smoke + Terms/Privacy reviewed copy | `bun run launch:gate --full` + manual checklist | Owner (human) + operator | human signoff | n/a (human) |

**Ladder rules:**
- Each stage is **opt-in**; the default is Stage 0–1.
- A stage cannot be skipped silently; skipped stages surface `skipped(stage)` and cap status at CONDITIONAL.
- Stages 2–4 never mutate provider state (all read-only `cf:check-*`/`cf:verify-*`).
- The report always labels each domain's evidence class so the owner knows what was actually proven.

**Stage gate (go/no-go):**
- First users require **at minimum** Stages 0–4 all passing for Hard domains.
- A beta/closed-beta launch may proceed at the owner's explicit discretion with named advisory domains outstanding (recorded via `--allow-missing`), but never with a Hard blocker.

## §2. Rollout plan (for the gate itself, when implemented)

| Ring | Action | Gate | Rollback trigger |
|---|---|---|---|
| Ring 0 | Land Phase 0–5 (gate script + tests) on `main` | Unit + integration green; `launch:gate --local` emits report | Revert gate script commit; anchors unaffected |
| Ring 1 | Document owner runbook; owner runs `launch:gate --local` manually | Owner confirms report is readable | n/a (docs only) |
| Ring 2 (owner-gated) | Re-enable CI with gate as **advisory** job (`continue-on-error: true`) | OPEN-LG-05 resolved; CI workflow snippet from §5 below | Disable the workflow file |
| Ring 3 (owner-gated) | Promote gate to **required** check on `main` | Owner decision; Hard domains stable | Demote to advisory |
| Ring 4 (owner-gated) | Owner runs `--full` (Stages 0–4) as the launch signoff | All Hard domains pass; legal/support/operator gates closed | Do not launch; iterate |

**Feature flags:** the gate's stages are themselves the flags (`--with-provider`, etc.). No separate feature-flag system needed.

## §3. Rollback criteria & steps

### Rollback triggers (when to roll back the gate)
1. The gate itself misclassifies a domain in a way that blocks legitimate work (false NO-GO) — rollback the gate, keep anchors.
2. The gate exceeds its 2-min budget consistently — investigate; cap stages.
3. A Hard domain is found to be passing when it should fail (false GO) — **this is a critical incident**; rollback the gate, manually verify the domain, hotfix.
4. CI promotion (Ring 3) blocks merges unexpectedly — demote to advisory.

### Rollback steps (gate)
1. `git revert <gate-commit>` (or remove the `launch:gate` package.json entry + `scripts/run-launch-evidence-gate.ts` + `scripts/launch-gate/`).
2. Anchor scripts and existing workflows are **unaffected** (gate is additive).
3. Re-run `bun run validate` to confirm no regression from anchor hook additions (WP-1.2); if a hook broke an anchor, revert that specific anchor's hook commit.
4. Post a note in `.ai/10_state/current-state.md` recording the rollback and reason.

### Rollback steps (the *launch* itself, post-first-users)
If a launch-blocking defect is found after first users:
1. The gate's report identifies the failing domain → its anchor → its fix path.
2. Rollback the **application change** that introduced the defect (e.g., `wrangler rollback` / redeploy previous Worker version via `cf:upload-version` gradual rollout reversal), not the gate.
3. Re-run `launch:gate --with-hosted` to confirm recovery.

### Recovery / data repair
The gate has no data to repair. Anchor scripts that write artifacts may need re-running (`cf:release-gates`, `cf:provider-exit-pack`) after a rollback; the gate's freshness TTL will flag stale artifacts automatically.

## §4. Observability (for the gate's own operation)

- **Logs:** the gate emits its stdout summary JSON (single object) — suitable for CI log scraping.
- **Metrics:** the report's `summary` block (pass/advisory/blocker/missing/stale counts) is the metric.
- **Dashboard:** the Markdown report is the dashboard; no separate Grafana needed for the MVP.
- **Alerts:** in Ring 3 (required CI), a NO-GO on `main` is the alert (CI failure). For the broader launch, the sibling observability pack (`cloudflare-worker-production-observability-and-budgets`) owns app-level alerts; the gate does not duplicate them.

## §5. CI integration options (given the disabled-workflows reality)

**Current state:** `.github/workflows/` is empty; all workflows are in `.github/workflows-disabled/`. Re-enabling CI is `OPEN-LG-05` (owner decision).

### Option A — Advisory job (recommended first step)
```yaml
# .github/workflows/launch-gate.yml (after CI re-enable)
name: launch-gate
on: { pull_request: {}, push: { branches: [main] } }
jobs:
  gate:
    runs-on: ubuntu-24.04
    continue-on-error: true   # advisory initially
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.14 }
      - run: bun install --frozen-lockfile
      - run: bun run launch:gate --local
      - uses: actions/upload-artifact@v4
        with: { name: launch-gate-report, path: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/launch-gate/ }
```

### Option B — Required check (later, owner-gated)
Same as A but remove `continue-on-error` and add to branch protection required checks. Only after Hard domains are stable and the owner accepts the gate's verdict.

### Option C — Local-only (no CI)
Run `bun run launch:gate --local` manually before launch; commit the report artifact. Suitable if CI stays disabled. The gate works fully without CI.

### Option D — Scheduled (cron) hosted proof
A scheduled workflow running `launch:gate --with-hosted` weekly to keep hosted evidence fresh (within the 3-day TTL would need daily). Owner-gated; out of MVP scope.

**Recommendation:** Option A first (after OPEN-LG-05), then B when stable. Option C is always available.

## §6. Rollout performance gates (per directive §13)

| Metric | Baseline | Target | Source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| Gate local wall-clock | TBD (measure at Ring 0) | ≤120s | `/usr/bin/time` | >120s | Ring 0 fail |
| Gate report emit latency | TBD | <5s after verdicts | instrumentation | >10s | investigate |
| CI gate job duration | TBD | <5min | GitHub Actions | >10min | demote to advisory |
| False-NO-GO rate | 0 | 0 | owner review of NO-GO reports | any false NO-GO blocking legit work | rollback gate |
| False-GO rate | 0 | 0 | adversarial test + owner audit | any false GO | critical incident |

Hosted/provider metric owners: operator. Sample size: weekly review for MVP.

## §7. Known gaps when hosted/provider proof is unavailable

- Without Cloudflare auth, Stages 2–4 are `skipped(auth)`; status caps at CONDITIONAL. This is correct, not a defect.
- Without a live deploy, hosted proofs are `missing-evidence`. Correct.
- The gate does **not** probe CodeQL/Dependabot/secret-scan hosted alerts (they return 403/404 today); it should surface them as `skipped(infra-unavailable)` advisory. Resolving the 403/404 is `OPEN-LG-06`.

## §8. Operational runbook (owner-facing summary)

1. **Before any launch decision:** run `bun run launch:gate --full` (after Stages 2–4 prerequisites).
2. **Read the banner.** GO → proceed; CONDITIONAL → review remaining-work list; NO-GO → fix blockers.
3. **For each remaining-work item:** the report names the owner (owner/counsel/operator) and the action (e.g., "set LEGAL_OWNER_* env and re-run launch:check-legal-owner").
4. **Rollback if needed:** see §3.
5. **Record the decision:** append to `.ai/10_state/current-state.md` with the report path + verdict + date.
