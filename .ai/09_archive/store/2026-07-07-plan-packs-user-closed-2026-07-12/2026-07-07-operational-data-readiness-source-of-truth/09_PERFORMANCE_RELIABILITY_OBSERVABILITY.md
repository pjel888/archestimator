# 09 — Performance, Reliability, and Observability

## Performance

### Scope of performance concern
The feature adds two scripts (generator + detector) run at authoring-time / CI-time. There is **no runtime/per-request** impact: no route handler, no middleware, no Client component, no Worker change. So Core Web Vitals, TTFB, bundle size, RSC payload, hydration — all **not applicable** with this reason.

### Performance contract (PERF-1)
- **Baseline:** N/A (new scripts). **Target:** generator + detector each <2s wall clock on a warm `main` (M2-class dev machine; CI runner).
- **Evaluator:** `time bun run ops:truth:snapshot && time bun run ops:truth:check` on `main`, 5 runs, report median. Fixture = the real repo (no synthetic data needed).
- **Regression threshold:** if either script exceeds 5s, treat as a regression (investigate; likely a file-system scan creep).
- **Why <2s:** so it is comfortable in a pre-commit hook without `--no-verify` temptation.
- **Hot paths:** the generator reads `wrangler.jsonc` (1 file), `migrations/` (1 `readdir`), `worker.ts` (1 read + 1 regex), `package.json` (1 read). All O(1) or O(small). The detector reads 3–4 narrative docs + the snapshot. No scans of `src/`.

### Resource budgets
- **Memory:** trivial (kilobytes of JSON).
- **CPU:** trivial (regex over ~4 small files).
- **CI minutes:** one short job; negligible against free-tier limits (respects repo free-tier cost posture).

## Reliability

### Failure modes
| Failure | Detection | Behavior | Test |
|---|---|---|---|
| `wrangler.jsonc` malformed/missing | generator try/catch | exit non-zero, clear message | AC-REL-1a |
| `migrations/` missing | generator | exit non-zero | unit |
| `worker.ts` missing scheduled branch | generator | `cronDispatched` empty → warning field `cronConfigVsDispatchMismatch` lists the undeclared/dispatched diff | unit |
| Narrative doc missing | detector | skip-with-warning (not error) — a doc may legitimately not hold a fact-class | unit |
| Snapshot not regenerated after substrate change | detector (DATA-1) | exit non-zero: "committed snapshot != fresh generation; run ops:truth:snapshot" | unit |
| Detector regex catastrophic backtracking | code review + fuzz | regexes are anchored/simple; no unbounded quantifiers on doc content | review |

### Retry / idempotency / concurrency
- Generator is **deterministic & idempotent** (same inputs → same output modulo `generatedAt`). Re-running is safe.
- Detector is **stateless & idempotent**.
- Concurrency: not a concern (read-only, no shared mutable state). Two agents regenerating the snapshot concurrently would produce identical content → no conflict beyond a benign race on commit, handled by normal Git.

## Observability

### Scope
This feature's *own* observability is minimal (it is a dev tool, not a runtime service). But it **contributes to system observability** by being a measurable signal: drift count over time.

### Signals produced
- **Detector exit code** (CI check-run): the primary signal.
- **Per-fact-class summary** (stdout): machine-greppable lines like `cron-count: PASS (expected 3, AGENTS.md says 3)`.
- **Snapshot diff in PRs:** reviewers see exactly which operational fact changed.

### Recommended metrics (optional, P2)
If the owner wants trend data, the detector can append a line to a CI artifact: `{date, driftCount, factClassesChecked}`. **Not required** for the stop condition; recorded as future work to avoid scope creep.

### Alerting
- **CI red on drift** *is* the alert. No separate channel needed at this stage.
- If CI is disabled (current state, §3.6), the fallback is a **weekly local regen + check** documented in the runbook (FR-6). Owner-run, not auto-alerted, until Actions is re-enabled.

### Dashboards / runbooks
- A short **runbook section** in the canonical home (or `13_ROLLOUT…`): "If the detector fails: (1) read the file:line in the message; (2) if the doc is wrong, edit it; (3) if the substrate is wrong, fix `wrangler.jsonc`/`migrations/` then `bun run ops:truth:snapshot`; (4) re-run `bun run ops:truth:check`."

### Logging safety
- Detector logs **only** public config (binding names, counts, cron expressions). It must never log secret values — it does not read them (SEC-1). No redaction logic needed because the input does not contain secrets.

## Cold-start / first-use
- First run after clone: `bun install` already done; scripts run immediately. No cold-start concern (no Worker invocation).
