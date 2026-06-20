# Benchmark Artifacts

Expected Loop 1 files:

- `hero-route-transition-local.json` - exact authenticated hero transition runs.
- `hero-route-readiness-local.json` - readiness gate requiring all hero scenarios.
- `hero-route-transition-local.log` - command output when useful.
- `hero-perf-trace.log` - optional `PERF_TRACE=1` dev server output.

Do not treat skipped authenticated scenarios as a pass. If auth is unavailable, record the failure and rerun once dev-auth or storage state is active.
