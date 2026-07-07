# 06 — Architecture & Technical Design

This is the **design contract** for the unified launch gate. It is implementation-ready for the local + script-contract slices. No code is written here.

## §1. Current-state architecture (the fragmentation problem)

```
                       ┌──────────────────────────────────────────┐
                       │  ~50 fragmented scripts                   │
                       │  cf:*, launch:*, perf:*, validate, etc.   │
                       └──────────────┬───────────────────────────┘
                                      │ (no orchestrator)
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
          ┌──────────────────┐ ┌──────────────┐ ┌────────────────┐
          │ cf:release-gates │ │ launch:*     │ │ perf:* / dbidx │
          │ (artifact        │ │ (env-driven  │ │ (evidence      │
          │  aggregator,     │ │  hard        │ │  producers)    │
          │  no exec)        │ │  blockers)   │ │                │
          └────────┬─────────┘ └──────┬───────┘ └────────┬───────┘
                   │                  │                  │
                   ▼                  ▼                  ▼
          JSON/MD artifacts    stdout JSON         JSON/MD artifacts
          (evidence/)          (no file default)  (evidence/)

          ┌──────────────────────────────────────────────────┐
          │  OUT-OF-BAND: stale NO-GO verdict in              │
          │  current-state.md (2026-06-02 → 2026-07-04)       │
          │  + CI disabled (workflows-disabled/)              │
          └──────────────────────────────────────────────────┘
```

**Problems:**
1. No single command, no single status.
2. Mixed exit semantics (hard vs advisory).
3. Mixed evidence classes collapsed together.
4. No freshness enforcement → stale verdicts trusted.
5. Owner has no one-line GO/NO-GO.

## §2. Target-state architecture (the unified gate)

```
                           ┌─────────────────────────────┐
                           │  bun run launch:gate         │  ← one command
                           │  scripts/run-launch-          │
                           │  evidence-gate.ts             │
                           └──────────────┬───────────────┘
                                          │
                       ┌──────────────────┴──────────────────┐
                       │  Domain Registry                    │
                       │  (single source of domain truth)    │
                       │  domains.ts: {id, name, class,      │
                       │   anchor, artifact, ttl, stage,     │
                       │   hardOrAdvisory, evidenceClass}    │
                       └──────────────────┬──────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                              ▼
   ┌─────────────────┐         ┌────────────────────┐          ┌──────────────────┐
   │ Reader lane     │         │ Executor lane      │          │ Classifier lane  │
   │ (Stage 0-1)     │         │ (Stage 2+ opt-in)  │          │ (pure)           │
   │ reads existing  │         │ runs anchor script │          │ verdict → class  │
   │ JSON artifacts  │         │ child processes    │          │ status aggregate │
   └────────┬────────┘         └─────────┬──────────┘          └────────┬─────────┘
            │                            │                              │
            └────────────────────────────┼──────────────────────────────┘
                                         ▼
                          ┌──────────────────────────────┐
                          │  Report emitter               │
                          │  JSON + Markdown + stdout     │
                          │  canonical schema (versioned) │
                          └──────────────┬────────────────┘
                                         │
                          ┌──────────────▼────────────────┐
                          │  Exit-code policy              │
                          │  GO/COND→0, NO-GO→1,           │
                          │  --strict: COND→1              │
                          └────────────────────────────────┘
```

**Key invariants:**
- The gate is a **thin orchestrator**. It contains zero domain thresholds.
- Domain logic lives in the anchor scripts; the gate reads their artifacts (Stage 0–1) or runs them as child processes (Stage 2+, opt-in).
- The **classifier** is a pure function: `(domain verdicts) → (status, report)`. Fully unit-testable.
- The **reader** is the default path; it never executes anything, only reads JSON/MD. This makes the default mode safe, fast, and parallel.

## §3. Launch readiness matrix (domains × criteria × proof × anchor × location × class × TTL × stage × hard/advisory)

Legend — `Stage`: 0=local-static(read), 1=local-automated(exec), 2=provider-backed, 3=hosted-production, 4=owner/operator. `H/A`: Hard blocker / Advisory.

| Domain ID | Domain | Minimum criterion | Anchor script | Evidence artifact | Class | TTL | Stage | H/A |
|---|---|---|---|---|---|---|---|---|
| DOM-01 | Local code quality | `validate` passes (type/lint/design/unit/dom) | `validate` | (transient stdout) | local-automated | 1 run | 1 | H |
| DOM-02 | Production build | `next build` succeeds | `build` | (`.next/`) | local-automated | 1 run | 1 | H |
| DOM-03 | CF release gates (local composite) | `localReleaseGateReportReady=true` | `cf:release-gates` | `evidence/2026-07-01-cloudflare-release-gates.json` | local-static | 7d | 0 | H |
| DOM-04 | CF release gates (production cutover) | `productionCutoverReady=true` | `cf:release-gates` (same artifact) | same | local-static | 7d | 0 | A |
| DOM-05 | Legal/owner signoff | `legalOwnerReady=true` | `launch:check-legal-owner` | (operator env → stdout) | local-static | 14d | 4 | H |
| DOM-06 | Support/monitoring | `supportMonitoringReady=true` | `launch:check-support-monitoring` | (operator env → stdout) | local-static | 14d | 4 | H |
| DOM-07 | Provider-exit (app runtime) | `appRuntimeExitPrerequisitesReady=true` (strict) | `cf:provider-exit-pack` (`STRICT_READINESS_EXIT=1`) | `evidence/2026-07-03-cloudflare-provider-exit-pack.json` | local-static | 7d | 0 | H |
| DOM-08 | Provider-exit (external/operator) | `providerExitReady=true` | `cf:provider-exit-pack` (same artifact) | same | local-static | 7d | 4 | A |
| DOM-09 | No active legacy provider runtime | legacy scan `blockers=[]` | `cf:provider-exit-pack` (scan sub-report) | same | local-static | 7d | 0 | H |
| DOM-10 | D1/auth/realtime readiness | `productionD1AuthRealtimeReady=true`, no blockers | `cf:check-d1-auth-realtime` | `evidence/...d1-auth-realtime-readiness.json` | provider-backed | 7d | 2 | H |
| DOM-11 | Provider resources readback | resources readable for bound bindings | `cf:check-provider-resources` | `evidence/...provider-resource-readback.json` | provider-backed | 7d | 2 | H |
| DOM-12 | Wrangler auth | wrangler authenticated | `cf:check-wrangler-auth` | `evidence/...wrangler-auth.json` | provider-backed | 7d | 2 | H |
| DOM-13 | Deploy dry-run | `wrangler deploy --dry-run` valid | `cf:check-deploy-dry-run` | `evidence/...deploy-dry-run.json` | local-automated | 7d | 1 | H |
| DOM-14 | Worker readiness | manifest + preview OK | `cf:check-readiness` | `evidence/...worker-readiness.json` | local-automated | 7d | 1 | H |
| DOM-15 | Platform toolchain | wrangler/opennext/typegen OK | `cf:check-toolchain` | `evidence/...platform-toolchain.json` | local-automated | 7d | 1 | A |
| DOM-16 | Email readiness | cloudflare email ready | `cf:check-email` | `evidence/...cloudflare-email-readiness.json` | provider-backed | 7d | 2 | H |
| DOM-17 | DNS delegation | nameservers = Cloudflare | `cf:check-dns-delegation` | (stdout) | provider-backed | 7d | 2 | H |
| DOM-18 | Support email DNS | support DNS configured | `launch:check-support-dns` | (stdout) | provider-backed | 7d | 2 | A |
| DOM-19 | Queues/Cron proof | retry + DLQ proof | `cf:jobs-proof` | (artifact) | provider-backed | 7d | 2 | H |
| DOM-20 | Provider proof (coupling) | provider coupling proven | `cf:provider-proof` | (artifact) | provider-backed | 7d | 2 | A |
| DOM-21 | D1 runtime perf | runtime perf budgets hold | `cf:d1-runtime-proof` | (artifact) | provider-backed | 7d | 2 | A |
| DOM-22 | D1 restore rehearsal | restore drill recorded | `cf:d1-restore-rehearsal` | (artifact) | provider-backed | 30d | 2 | H |
| DOM-23 | Hosted routes | route matrix live + contract | `cf:verify-hosted-routes` | `evidence/...hosted-routes.json` | hosted-production | 3d | 3 | H |
| DOM-24 | Hosted auth routes | auth routes live | `launch:verify-hosted-auth` | (artifact) | hosted-production | 3d | 3 | H |
| DOM-25 | Hosted sensitive routes fail-closed | sensitive routes deny | `launch:verify-hosted-sensitive-routes` | (artifact) | hosted-production | 3d | 3 | H |
| DOM-26 | Hosted export route | export route live | `launch:verify-hosted-export` | (artifact) | hosted-production | 3d | 3 | H |
| DOM-27 | Hosted performance | p95 budgets hold | `cf:verify-hosted-performance` | (workbook artifact) | hosted-production | 3d | 3 | A |
| DOM-28 | Route transition readiness | perf:check-routes passes | `perf:check-routes` | (artifact) | local-automated | 7d | 1 | A |
| DOM-29 | Performance budgets | check-performance-budgets passes | `scripts/check-performance-budgets.mjs` | (stdout) | local-automated | 1 run | 1 | A |
| DOM-30 | Upload lifecycle proof | hosted upload lifecycle proven | `cf:verify-hosted-upload-lifecycle` | (artifact) | hosted-production | 3d | 3 | H |
| DOM-31 | Upload operations/runtime/UI | upload proofs pass | `cf:verify-hosted-upload-operations/runtime/ui` | (artifacts) | hosted-production | 3d | 3 | H |
| DOM-32 | Collaboration invitation (hosted) | hosted collab-invitation proven | `cf:verify-hosted-collaboration-invitation` | (artifact) | hosted-production | 3d | 3 | H |
| DOM-33 | Collaboration UI (hosted) | hosted collab-UI proven | `cf:verify-hosted-collaboration-ui` | (artifact) | hosted-production | 3d | 3 | A |
| DOM-34 | Estimate history (hosted) | hosted estimate-history proven | `cf:verify-hosted-estimate-history` | (artifact) | hosted-production | 3d | 3 | A |
| DOM-35 | Latest deploy source smoke | smoke recorded | `cf:check-latest-deploy-source-smoke` | `evidence/...latest-deploy-source-smoke.json` | hosted-production | 3d | 3 | H |
| DOM-36 | Better Auth provider proof | better-auth provider proven | `cf:better-auth-provider-proof` | (artifact) | provider-backed | 7d | 2 | H |
| DOM-37 | DB index audit | dbidx:audit-repo clean | `dbidx:audit-repo` | (stdout) | local-automated | 7d | 1 | A |
| DOM-38 | Public cache safety | check-public-cache-safety passes | `check-public-cache-safety.ts` | (stdout) | local-automated | 7d | 1 | H |
| DOM-39 | Auth audit completion | check-auth-audit-completion passes | `check-auth-audit-completion-readiness.ts` | (stdout) | local-static | 14d | 0 | H |
| DOM-40 | Storybook boundary/coverage | storybook:validate passes | `storybook:validate` | (transient) | local-automated | 7d | 1 | A |
| DOM-41 | CSP enforcement | (sibling pack `global-nonced-csp-enforcement`) | (future anchor) | (future) | local-static | — | 0 | H | *(missing-evidence until sibling lands)* |
| DOM-42 | OWASP API authz matrix | (sibling pack `owasp-api-authz-matrix-refresh`) | (future) | (future) | local-static | — | 0 | H | *(missing-evidence)* |
| DOM-43 | Privacy/DSAR workflow | (sibling pack `privacy-request-operations-and-erasure-workflow`) | (future) | (future) | local-static | — | 0 | H | *(missing-evidence)* |
| DOM-44 | Invite token hardening | (sibling pack `invite-token-flow-hardening`) | (future) | (future) | local-static | — | 0 | H | *(missing-evidence)* |
| DOM-45 | D1 hot-path budgets/indexes | (sibling pack `d1-hot-path-query-budgets-and-indexes`) | `dbidx:audit-repo` + `cf:d1-performance-proof` | (artifacts) | provider-backed | 7d | 2 | A |
| DOM-46 | D1 migration/schema integrity | (sibling pack `d1-migration-state-and-schema-integrity`) | (migration audit) | (artifact) | local-static | 7d | 0 | H |
| DOM-47 | D1/R2 backup-restore ops | (sibling pack `d1-r2-backup-restore-operational-readiness`) | `cf:d1-restore-rehearsal` | (artifact) | provider-backed | 30d | 2 | H |
| DOM-48 | D1/R2 referential integrity | (sibling pack `d1-r2-referential-integrity-orphan-audit`) | (audit) | (artifact) | local-static | 7d | 0 | A |
| DOM-49 | Durable Object realtime scale | (sibling pack `durable-object-realtime-scale-readiness`) | (load test) | (artifact) | provider-backed | 7d | 2 | A |
| DOM-50 | Queues/Cron prod ops | (sibling pack `cloudflare-queues-cron-production-ops`) | `cf:jobs-proof` | (artifact) | provider-backed | 7d | 2 | H |
| DOM-51 | Worker observability/budgets | (sibling pack `cloudflare-worker-production-observability-and-budgets`) | (observability) | (artifact) | provider-backed | 7d | 2 | A |
| DOM-52 | Observability alert/log retention | (sibling pack `observability-alert-proof-and-log-retention`) | (future) | (future) | provider-backed | — | 2 | H | *(missing-evidence)* |
| DOM-53 | RUM/CWV telemetry | (sibling pack `production-rum-and-cwv-telemetry`) | (future) | (future) | hosted-production | — | 3 | A | *(missing-evidence)* |
| DOM-54 | Bundle/route perf gate | (sibling pack `bundle-and-route-performance-gate-hardening`) | `perf:check-routes` + `check-performance-budgets.mjs` | (artifacts) | local-automated | 7d | 1 | A |
| DOM-55 | Security CI release gates | (sibling pack `security-ci-release-gates`) | (future) | (future) | local-static | — | 0 | H | *(missing-evidence)* |
| DOM-56 | Test harness stability/flake | (sibling pack `test-harness-stability-and-flake-budget`) | (future) | (future) | local-automated | — | 1 | A | *(missing-evidence)* |
| DOM-57 | E2E fixture smoke | (sibling pack `e2e-fixture-smoke-harness`) | `test:e2e` | (transient) | local-automated | 1 run | 1 | H |
| DOM-58 | First-user activation/empty workspace | (sibling pack `first-user-activation-empty-workspace`) | (UX audit) | (artifact) | local-static | 30d | 0 | H |
| DOM-59 | Beta support/feedback loop | (sibling pack `beta-support-feedback-operating-loop`) | `launch:check-support-monitoring` | (artifact) | local-static | 14d | 4 | H |
| DOM-60 | AI safety leakage | (sibling pack `ai-safety-leakage-and-provider-resilience`) | (audit) | (artifact) | local-static | 30d | 0 | H |
| DOM-61 | Cost-library governance | (sibling pack `cost-library-data-governance-and-source-trust`) | (audit) | (artifact) | local-static | 30d | 0 | A |
| DOM-62 | Client-ready proposal workflow | (sibling pack `client-ready-proposal-package-workflow`) | (UX) | (artifact) | local-static | 30d | 0 | H |
| DOM-63 | Upload production proof | (sibling pack `upload-production-proof-closure`) | `cf:verify-hosted-upload-*` | (artifacts) | hosted-production | 3d | 3 | H |
| DOM-64 | Operational data source-of-truth | (sibling pack `operational-data-readiness-source-of-truth`) | (future) | (future) | local-static | — | 0 | A | *(missing-evidence)* |
| DOM-65 | Security OWASP compliance | (sibling pack `security-owasp-compliance-audit`) | (audit) | (artifact) | local-static | 90d | 0 | H |
| DOM-66 | Terms/Privacy legal copy reviewed | `/privacy` + `/terms` reviewed copy live | (manual: route probe + content check) | (hosted) | hosted-production | 30d | 3 | H |
| DOM-67 | Hosted manual smoke | owner smoke against `archestimator.com` | (manual) | (runbook record) | browser-manual | 14d | 4 | H |

**Domain count: 67.** Domains marked `*(missing-evidence)*` have no anchor script yet; the gate reports them as `missing-evidence` (Hard → NO-GO until the sibling pack lands an anchor).

## §4. Hard blockers vs advisory warnings (taxonomy)

### Hard blockers (any fail → NO-GO)
All domains with `H/A = H`. Notable: DOM-01 (validate), DOM-02 (build), DOM-03 (release-gates local), DOM-05 (legal), DOM-06 (support), DOM-07 (provider-exit app runtime), DOM-09 (no legacy runtime), DOM-10/11/12 (D1/provider/wrangler), DOM-13 (dry-run), DOM-16/17 (email/DNS), DOM-19 (queues/cron), DOM-22 (restore rehearsal), DOM-23–26 (hosted routes/auth/sensitive/export), DOM-30–32 (upload/collab hosted), DOM-35 (deploy smoke), DOM-36 (better-auth), DOM-38 (public cache safety), DOM-39 (auth audit), DOM-41–44 (CSP/OWASP/privacy/invite — missing-evidence today), DOM-46/47 (migration integrity/restore), DOM-50 (queues prod), DOM-52 (obs alerts — missing), DOM-55 (security CI — missing), DOM-57 (E2E), DOM-58 (first-user), DOM-59 (beta loop), DOM-60 (AI safety), DOM-62 (proposal), DOM-63 (upload prod), DOM-65 (OWASP), DOM-66 (Terms/Privacy copy), DOM-67 (manual smoke).

### Advisory warnings (fail → CONDITIONAL, do not block first users alone)
All domains with `H/A = A`. Notable: DOM-04 (production cutover composite), DOM-08 (provider-exit external), DOM-15 (toolchain), DOM-18 (support DNS), DOM-20 (provider coupling), DOM-21 (D1 runtime perf), DOM-27 (hosted perf p95), DOM-28/29/54 (route/bundle perf), DOM-33/34 (collab UI/estimate-history hosted), DOM-37 (dbidx), DOM-40 (storybook), DOM-45 (D1 hot-path), DOM-48 (referential integrity), DOM-49 (DO scale), DOM-51 (worker obs), DOM-53 (RUM/CWV — missing), DOM-56 (test flake — missing), DOM-61 (cost-library governance), DOM-64 (ops data — missing).

**Why advisory:** these are either performance budgets (a slow route does not make the app unsafe for first users), external operator records (owner actions, not code), or informational coverage. They surface as remaining work but do not flip NO-GO on their own.

### Special: missing-evidence handling
- A Hard domain with no anchor (DOM-41, 42, 43, 44, 52, 55, etc.) → **NO-GO** until the sibling pack lands its anchor. This is intentional: the gate must not silently pass a domain that has no proof.
- An Advisory domain with no anchor (DOM-53, 56, 64) → **CONDITIONAL** (missing-evidence advisory).
- `--allow-missing <domain>` lets the owner explicitly defer a missing-evidence domain for a beta launch; recorded in the report.

## §5. Aggregation algorithm (the classifier — pure function)

```
function classify(domains: DomainVerdict[]): Status {
  const hard = domains.filter(d => d.hardOrAdvisory === 'H');
  const advisory = domains.filter(d => d.hardOrAdvisory === 'A');

  const hardBlockerFailed = hard.some(d =>
    d.verdict === 'blocker' ||
    (d.verdict === 'missing-evidence' && !d.allowedMissing)
  );
  if (hardBlockerFailed) return 'NO-GO';

  const advisoryOutstanding = advisory.some(d =>
    d.verdict === 'advisory' ||
    d.verdict === 'missing-evidence' ||
    d.verdict === 'stale-evidence'
  ) || hard.some(d => d.verdict === 'advisory' || d.verdict === 'stale-evidence');

  return advisoryOutstanding ? 'CONDITIONAL' : 'GO';
}
```

**Exit code:**
- `GO` → 0
- `CONDITIONAL` → 0 (or 1 with `--strict`)
- `NO-GO` → 1
- Gate internal error → 1 with `gate-error` verdict

## §6. Evidence freshness (TTL) — DEC-LG-04

- Each domain has a `ttl` (see matrix §3).
- The reader checks artifact `mtime` (or `generatedAt` field inside JSON).
- Expired → `stale-evidence`.
- For required (Hard) domains, `stale-evidence` = `missing-evidence` = NO-GO trigger (unless `--allow-stale`).
- `--no-freshness` disables for development (report marks it disabled, status cannot be GO).

## §7. Conflict resolution — DEC (in `15`)

Precedence (highest wins) for a domain with overlapping anchors:
1. **Hosted-production** verdict (freshest direct observation) — for DOM-23..27, 30..35, 63, 66.
2. **Provider-backed** verdict — for DOM-10..12, 16..22, 45, 47, 49..51.
3. **Release-gates composite** — for DOM-03/04 (it is itself an aggregator; trust its composite but surface the underlying artifact).
4. **Local-automated** — for DOM-01/02/13/14/28/29/37/40/54/57.

When two anchors of the same class disagree, the **pessimistic** verdict wins (fail → blocker). Both are surfaced in the report `conflicts[]`.

## §8. Report schema (versioned)

```jsonc
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-07T...",
  "mode": "local" | "with-provider" | "with-hosted" | "full",
  "strict": false,
  "status": "GO" | "CONDITIONAL" | "NO-GO",
  "suiteLabel": "IMPLEMENTATION-READY" | "CONDITIONALLY READY" | "NOT READY",
  "summary": {
    "total": 67,
    "pass": N,
    "advisory": N,
    "blocker": N,
    "skipped": N,
    "missingEvidence": N,
    "staleEvidence": N
  },
  "domains": [
    {
      "id": "DOM-01",
      "name": "Local code quality",
      "hardOrAdvisory": "H",
      "stage": 1,
      "verdict": "pass" | "advisory" | "blocker" | "skipped" | "missing-evidence" | "stale-evidence",
      "evidenceClass": "local-automated",
      "producer": "validate",
      "artifact": null,
      "artifactAge": null,
      "ttl": "1 run",
      "detail": "...",
      "citation": "package.json:98"
    }
  ],
  "conflicts": [],
  "remainingWork": [
    { "domain": "DOM-05", "action": "Set LEGAL_OWNER_* env and re-run launch:check-legal-owner", "owner": "owner/counsel", "blocks": "GO" }
  ],
  "blockers": [ "DOM-..." ],
  "note": "Read-only aggregator; no provider mutation; no provider/hosted proof from local checks."
}
```

Markdown mirrors this with a banner, a table, and a "remaining work" action list.

## §9. Execution modes & safety

| Mode flag | Stages run | Network | Cloudflare auth | Safe to run anytime |
|---|---|---|---|---|
| (default) / `--local` | 0, 1 | none | none | ✅ yes |
| `--with-provider` | 0, 1, 2 | read-only CF API | required | ✅ yes (read-only) |
| `--with-hosted` | 0, 1, 2, 3 | read-only HTTP to `archestimator.com` | required | ✅ yes (read-only) |
| `--full` | 0, 1, 2, 3, 4 | as above + operator env | required | ✅ yes |
| `--strict` | (any) | — | — | exit 1 on CONDITIONAL |
| `--regenerate` | re-runs producers for chosen stages | depends | depends | ⚠️ owner-gated for stage 2+ |
| `--allow-missing <id>` | skips a missing-evidence domain | — | — | records in report |
| `--no-freshness` | disables TTL | — | — | dev only; status ≠ GO |

**Provider/hosted stages never run implicitly.** The default mode is pure-local and safe.

## §10. Alternatives considered (full set in `15`)

| Alt | Description | Rejected because |
|---|---|---|
| Monolithic gate re-running everything | One script re-implements all checks | Diverges from anchors; high maintenance; violates ARCH-LG-01 |
| CI-only YAML matrix | GitHub Actions matrix of all scripts | CI is disabled; doesn't help local; no single status artifact |
| Boolean pass/fail | One bit | Collapses external gates with code defects (FR-LG-03) |
| 5-level scorecard | 0–100 score | Owner wants a decision, not a number; ambiguous thresholds |
| Trust-on-disk artifacts | No freshness | Stale NO-GO would persist (DEC-LG-04 rationale) |
| Immediately blocking CI | Required check from day 1 | CI disabled; needs owner decision (OPEN-LG-05) |

## §11. Architectural decision record summary

(See `15` for full ADRs.) DEC-LG-01..06 are the load-bearing choices. All have evaluated alternatives.

## §12. Integration points

- **Anchor scripts:** invoked as child processes (Stage 1+) or read via artifacts (Stage 0). The gate never imports anchor code.
- **Evidence directory:** `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/` (existing) + proposed `launch-gate/` subdir for gate's own outputs.
- **package.json:** new `launch:gate` script + optional `launch:gate:strict`, `launch:gate:full`.
- **CI:** new workflow snippet (advisory job) in `13`.
- **Sibling packs:** cited, not re-implemented.

## §13. Failure boundaries

- Anchor script crash → gate catches, marks `missing-evidence`, continues other domains, exits per status.
- Artifact read error → `missing-evidence`.
- Gate internal error → exit 1, `gate-error` verdict, full diagnostic.
- Network/CF auth missing in opt-in stage → `skipped(auth)` (advisory), status ≤ CONDITIONAL.

This design is the contract. `11` turns it into phased implementation tasks.
