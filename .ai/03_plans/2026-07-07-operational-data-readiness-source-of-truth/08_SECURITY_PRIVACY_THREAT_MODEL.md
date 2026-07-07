# 08 — Security, Privacy, and Threat Model

## Applicability

Docs/scripts feature. The security surface is small but real: the snapshot and canonical home must not leak secrets, and the detector must not become a vector for confusing agents (a "garbage-in" doc that the detector passes could mislead every future agent). Threat modeling is proportionate, not omitted.

## Trust boundaries

| Boundary | Trust level | Notes |
|---|---|---|
| Substrate files (`wrangler.jsonc`, `migrations/`, `worker.ts`) | trusted (committed, reviewed) | generator input |
| Generated snapshot JSON | trusted (derived from trusted input) | committed |
| Canonical home Markdown | trusted (curated) | committed |
| Narrative docs (`AGENTS.md`, etc.) | trusted-but-drift-prone | assertion targets |
| CI / pre-commit environment | trusted (repo-controlled) | runs the detector |
| Cloudflare API / remote D1 | **out of scope** | feature does not call it |

## Threat model

### T-SEC-1 (P0): Secret leakage into the snapshot/home
- **Actor:** any agent or human reading the committed repo (and any mirror).
- **Scenario:** the generator echoes `vars` or secret names/values from `wrangler.jsonc` into the snapshot, or the home pastes a Worker secret.
- **Current `wrangler.jsonc` `vars`** are all public operational knobs (`ARCH_UPLOAD_HOSTED_*`) — not secrets. Worker **secrets** (`CRON_SECRET`, Better Auth secrets, publication secrets) are **not** in `wrangler.jsonc`; they are Worker secrets set via `cf:sync-worker-secrets`. So the generator reading `wrangler.jsonc` `vars` alone does not leak secrets.
- **Control (SEC-1):** generator has an allowlist of fields it may echo (binding names, ids, counts, cron expressions, public `vars`); it **must not** dump the full `vars` object verbatim, and **must not** read `dev.vars` / `.env` / secrets. A secret-pattern regex scan (AC-SEC-1a) fails the build if a known secret shape appears in the generated JSON or home.
- **Denial test:** seed a fake `dev.vars` with a plausible secret; confirm the generator ignores it and the JSON contains no match.

### T-SEC-2 (P1): `databaseId` treated as sensitive
- The D1 `database_id` is a Cloudflare **binding identifier**, already public in `AGENTS.md:40` and committed `wrangler.jsonc`. It is not a credential (it does not grant access without the Worker's authz context). **Decision:** not a secret; safe to echo. Documented in the home to prevent over-redaction confusion.
- If the owner later classifies it as sensitive, the generator redacts to a prefix — but this is not the current posture.

### T-SEC-3 (P0): Detector false-negative misleads agents
- **Scenario:** a narrative doc drifts but the detector's regex misses it → CI green → agents read stale fact → wrong plan/code.
- **Control:** AC-FR-3e (per-fact summary, no silent skip) + TEST-1 adversarial suite must cover every asserted fact-class. Each fact-class assertion has at least one "inject stale value → expect non-zero" test.
- **Residual risk:** a fact-class the detector doesn't know about (e.g. a future binding type). Mitigation: generator pins expected fields; adding a binding requires updating the generator → visible in PR review.

### T-SEC-4 (P2): Detector crash fails open
- **Scenario:** malformed `wrangler.jsonc` makes the parser throw; if uncaught, the detector might exit 0.
- **Control:** REL-1 — wrap parse in try/catch, exit non-zero on any throw. Tested (AC-REL-1a).

### T-SEC-5 (P1): Prompt-injection via narrative doc content
- **Scenario:** a narrative doc contains text that, when read by an agent, instructs it to ignore the canonical home. (This already happens — the stale PROMPT premise is a benign instance.)
- **Control:** the canonical home and `AGENTS.md` handoff rule (FR-5) explicitly state the home outranks narrative prose for operational facts, and that detector failures must be fixed, not worked around. This is a policy control, not a technical one; recorded as such.

## Privacy

- No user data, no PII, no cookies, no sessions. The snapshot is operational config only.
- Data minimization: the snapshot echoes only what each assertion needs (e.g. binding *names*, not full consumer config unless asserted). `vars` values are echoed only if non-secret and relevant.

## Abuse / rate limits

- Not applicable. The feature makes no network calls and has no external input path.

## CSP / frame / referrer

- Not applicable (no rendered page).

## Supply chain

- The detector is `.mjs` with **no dependencies** (Node built-ins + regex) to keep CI fast and the supply chain minimal. The generator is `.ts` run by `bun`, also zero added deps if it uses Node built-ins for file reading. **Do not add a JSONC parser dependency** if a tolerant `JSON.parse` after comment-stripping suffices for the well-formed, repo-controlled `wrangler.jsonc`; if a parser is unavoidable, prefer the smallest audited one and record it in `18_STACK_CONTRACT`.

## Security testing

- Secret-pattern scan over generated artifacts (SEC-1).
- Adversarial mutation suite (TEST-1) doubles as a tamper-detection test.
- No role-matrix needed (no authz surface).
