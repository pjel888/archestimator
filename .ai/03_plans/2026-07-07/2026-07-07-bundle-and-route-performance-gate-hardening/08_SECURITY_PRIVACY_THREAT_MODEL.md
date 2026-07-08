# Security, Privacy, and Threat Model

**Scope note:** This pack introduces no application code, no new endpoints, no new auth flows, and no new data storage. Its security surface is narrow: (a) the credential-free hosted verifier, (b) the authenticated perf fixture's auth material, and (c) the CI secret posture for `PERF_BUDGET_STRICT` and dev-auth bypass.

## Trust boundaries

| Boundary | Trust model | This pack's interaction |
|---|---|---|
| Public internet → Cloudflare edge → Worker | Existing WAF/DDoS, CSP, rate limits | Hosted verifier probes this boundary credential-free |
| Playwright CI runner → localhost preview (future) | CI secret isolation | Dev-auth bypass secret would live as a CI secret |
| Operator workstation → hosted Worker | Operator credentials for `cf:*` scripts | Out of scope; verifier itself is credential-free |

## Threat model (perf-gate scoped)

| ID | Threat | Actor | Entry point | Mitigation (current/proposed) | Status |
|---|---|---|---|---|---|
| SEC-THREAT-01 | Secret leakage via perf logs/artifacts | Anyone with CI artifact access | CI bundle/transition outputs | Bundle gate logs gz KB only (no source); route-transition harness sanitizes secrets (`measure-route-transitions.ts:621-644` `sanitizeBenchmarkText` redacts tokens/cookies/JWTs/paths) | Mitigated (current) |
| SEC-THREAT-02 | Production credentials used in perf | Insider/CI | Authenticated fixture | Dev-auth bypass localhost-only (`:397-408`); storage-state uses throwaway seeded account (SEC-01) | Mitigated; lock in via SEC-01 |
| SEC-THREAT-03 | Hosted verifier used to enumerate/attack real share tokens | Anyone running the verifier | `cf:verify-hosted-performance` | Uses `DEFAULT_FAKE_TOKEN`; probes invalid-token/missing-path routes by design; never reads real tokens (`BODY_NOTE`) | Mitigated (current) |
| SEC-THREAT-04 | `PERF_BUDGET_STRICT` secret flip causes unexpected CI failure | Insider with secret access | CI secret | Secret-gated; `continue-on-error` default; documented promotion path (PERF-02) | Mitigated by process |
| SEC-THREAT-05 | SSRF via hosted base URL | Insider | `verify-cloudflare-hosted-performance.ts` | Rejects localhost/private/non-https (`:153-176`) | Mitigated (current) |
| SEC-THREAT-06 | CI dev-auth bypass secret exfiltration | Anyone with CI secret access | CI secret | Store as masked CI secret; never log; localhost-only reduces blast radius even if leaked | Owner decision (OPEN-PERF-02) |

## Authentication / authorization

- No new authz checks. Perf harnesses access routes as a user would; authenticated harnesses use dev-auth bypass or storage state (above).
- The hosted verifier does **not** authenticate; it deliberately probes credential-free public/invalid paths.

## Input validation

- Bundle gate validates the diagnostics file is an array (`check-performance-budgets.mjs:34-37`); partial reads handled (`:99-110`).
- Hosted verifier validates base URL scheme + non-private host (`:153-176`); parses run counts with caps (`:124-136`).
- Route-transition harness sanitizes all output text (`sanitizeBenchmarkText`).

## Privacy

- No new PII collection. Hosted verifier records TTFB/duration/CF headers only — no user data.
- Sanitization redacts emails, cookies, tokens, JWTs, local filesystem paths (`measure-route-transitions.ts:621-644`).
- No analytics/telemetry added by this pack (RUM owned by sibling plan).

## Logging safety

- Bundle gate logs route names + gz KB (not source, not user data).
- Route-transition logs are sanitized before write.
- Hosted verifier logs JSON/Markdown reports with `fakeTokenLabel: "redacted-fake-token"` and `note` describing the safe scope.

## CSP / frame / referrer

- Not affected. `next.config.ts` CSP is unchanged by this pack.

## Dependency / supply chain

- No new dependencies. `@next/bundle-analyzer` and `@playwright/test` already present. No new imports.

## Residual risk

- **SEC-RESIDUAL-01:** If a future authenticated Tier-B gate runs in CI with a dev-auth bypass secret, the secret's blast radius is localhost-only by code, but a leaked secret + a non-local `BASE_URL` override could be misused. Mitigation: the code refuses non-local hosts for dev-auth bypass (`:397-408`); CI secret hygiene; periodic rotation. Owner acknowledges via OPEN-PERF-02.
