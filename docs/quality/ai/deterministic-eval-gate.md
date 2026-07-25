# Deterministic AI evaluation gate

## Scope

The v1 gate evaluates the live handler contracts for:

- grounded use of server-derived account context
- approved source selection and minimization before provider access
- authentication, workspace, tenant, and data-access denial
- prompt injection and mutation/tool-abuse boundaries
- the implemented read-only refusal prompt contract
- provider timeout, error, and malformed-output behavior
- redaction of provider and identity details
- explicit local-handler latency and provider-reported token cost budgets

All provider and data dependencies are deterministic fakes implementing the
same interfaces injected by the handlers. No network, D1, R2, Durable Object,
or external provider is contacted.

This is deliberately a handler-contract gate, not a claim that a live language
model's prose was semantically graded. Grounding is checked at the implemented
boundary: exact authorized facts and approved compact sources must reach the
provider request, untrusted text must remain labeled as data, and prohibited
identity or route fields must not cross that boundary.

## Failure policy

Ask is fail-closed: context failures stop before provider access, and provider
failures return a generic audited error.

Package-builder Draft is fail-safe: provider failures or rejected provider
identity fields fall back to deterministic server-side draft construction.
Draft cases must never invoke the Apply dependency and must return
`productionWrite: false`.

## Cost model

The implemented provider adapters expose prompt, completion, and total token
usage but do not expose a billing amount. The deterministic cost budget
therefore gates provider-reported total tokens. It does not invent currency
rates or claim access to provider billing. Cases that reach the provider require
complete, nonnegative, internally consistent usage; cases that must stop before
provider access require usage to be absent.

## Machine contract

The stable case manifest is `evals/ai/v1/cases.json`. The generated, volatile
report is `artifacts/ai-evals/ai-eval-v1.json` and conforms to
`evals/ai/schemas/case-report.schema.json`.

The gate passes only when all contract checks pass and each case remains within
its latency and token-cost budgets. Manifest parsing, required-capability
coverage, executor coverage, usage completeness, usage arithmetic, report
cardinality, and budget grading all fail closed. Reports deliberately contain
only case metadata, boolean checks, aggregate metrics, budgets, and sanitized
failure labels.

The local latency measurement is machine-dependent and therefore belongs only
in ignored run artifacts. The 1,000 ms per-handler ceiling is a fixed
regression budget for synchronous local handler execution with deterministic
dependencies; it is not hosted provider latency evidence.
