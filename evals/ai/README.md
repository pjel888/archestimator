# Deterministic AI evals

`v1/cases.json` is the versioned source of case identity, requirement mapping,
implemented route scope, expected outcome, local latency budget, and
provider-reported token budget. The focused Vitest gate executes the live
`/api/ai/ask` and `/api/ai/package-builder` handlers with deterministic,
contract-faithful dependency fakes.

Run:

```bash
bun x vitest run tests/vitest/ai-evals/deterministic-ai-eval.test.ts --maxWorkers=1
```

The gate writes the volatile run report to the ignored path
`artifacts/ai-evals/ai-eval-v1.json`. Q2/Q3 consumers should read that JSON and
require:

- `schemaVersion === "ai-eval-report/v1"`
- top-level `status === "pass"`
- every case `status === "pass"`
- `summary.failed === 0`
- `summary.total === 14`

The report contains no prompts, response bodies, user identifiers, workspace
identifiers, credentials, or raw provider errors.

The cost gate uses the provider contract's returned `total_tokens` field. It
does not convert tokens to currency because this repository does not contain a
versioned provider price catalog or billing readback. Missing, malformed, or
internally inconsistent usage fails every case that requires provider usage.
