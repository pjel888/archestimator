# 08 — Security, Privacy & Threat Model

This is the threat model for the **gate itself** (a read-only build/CI tool) plus the security domains the gate aggregates from sibling packs.

## §1. Trust boundaries

```
[Owner/Operator env] ──► [Gate script (scripts/launch-gate/*)] ──► [Report artifacts]
                                    │
                                    ▼ (opt-in stages)
                        [Anchor scripts (cf:check-*, launch:*)]
                                    │
                                    ▼ (read-only)
                        [Cloudflare APIs / hosted routes]
```

- **Boundary 1:** Operator env → gate. Owner labels are sanitized (SEC-LG-03).
- **Boundary 2:** Gate → anchor scripts. Child-process spawn; only allowlisted anchors.
- **Boundary 3:** Anchor scripts → Cloudflare/hosted. Read-only; the gate never escalates.

## §2. Threat model (gate-specific)

| Threat | Actor | Vector | Impact | Mitigation |
|---|---|---|---|---|
| Secret leak in report | anyone reading the report | anchor artifact contains a token | secret exposure | SEC-LG-01 (redaction test); anchors already sanitize |
| Malicious label injection | operator | env label with `<script>`/MD injection | report renders untrusted content | SEC-LG-03 (sanitizer reuse) |
| Bypass the gate | internal agent | `--allow-missing` overuse | false GO | SEC-LG-02 (allowlisted reasons; status caps) |
| Mutating script sneaks in | internal agent | someone adds `cf:deploy` to local set | provider mutation | OPS-LG-01 (static test) |
| Stale evidence trusted | anyone | old artifact on disk | false GO from stale data | FR-LG-06 (TTL) |
| Forged artifact | internal agent | hand-written JSON claiming pass | false GO | producer pinning (FR-LG-09) + freshness; future: artifact signing (out of scope) |
| Anchor crash hides failure | anyone | anchor throws | missing domain → silent pass | REL-LG-01 (missing-evidence, never silent pass for Hard) |
| Gate internal error | anyone | uncaught exception | exit 0 false GO | REL-LG-01 AC3 (gate-error → exit 1) |
| Concurrent corruption | concurrent agent | two runs write same path | corrupted report | OPS-LG-02 (atomic/timestamped write) |

## §3. Aggregated security domains (from sibling packs)

The gate surfaces — but does not re-derive — the security posture of these domains (each owned by a sibling pack):

| Domain | Sibling pack | Gate's role |
|---|---|---|
| Global nonced CSP | `global-nonced-csp-enforcement` | Surface pass/fail (DOM-41) |
| OWASP API authz matrix | `owasp-api-authz-matrix-refresh` | Surface (DOM-42) |
| Privacy/DSAR/erasure | `privacy-request-operations-and-erasure-workflow` | Surface (DOM-43) |
| Invite token hardening | `invite-token-flow-hardening` | Surface (DOM-44) |
| Auth audit completion | (anchor `check-auth-audit-completion-readiness`) | Surface (DOM-39) |
| Public cache safety | (anchor `check-public-cache-safety`) | Surface (DOM-38) |
| Hosted sensitive routes fail-closed | `launch:verify-hosted-sensitive-routes` | Surface (DOM-25) |
| OWASP compliance audit | `security-owasp-compliance-audit` | Surface (DOM-65) |
| AI safety leakage | `ai-safety-leakage-and-provider-resilience` | Surface (DOM-60) |

The gate does not own the controls; it reports their verdicts.

## §4. Privacy

- The gate processes **no personal data**. Owner/operator labels are operator-provided free text (sanitized).
- No PII enters the report beyond what the operator chooses to put in labels.
- The report is an internal artifact; if shared externally, the owner redacts labels (the gate already strips dangerous chars but does not redact names — that is an operator responsibility).

## §5. Credential material

See `04` §credential-material-taxonomy. The gate handles **no raw credentials**. Only sanitized public-marker labels.

## §6. Logging safety

- The gate's stdout/logs contain the report JSON. The redaction test (SEC-LG-01) scans for secret-like patterns.
- Anchor scripts already state they do not print secrets (`NOTE` blocks in `03` §1).
- No secrets in `.ai` — carrier of the repo-wide rule.

## §7. Abuse scenarios

- **Rate of gate runs:** the gate is local; no rate limit needed. In CI, GitHub Actions concurrency groups prevent runaway.
- **`--allow-missing` abuse:** capped by SEC-LG-02 (recorded reason, status cap).
- **Result manipulation:** the gate reads artifacts; a forged artifact is a risk (mitigated by freshness + producer pinning; full artifact signing is future work, RISK-LG-05).

## §8. Incident-response implications

- A false-GO is a critical incident: rollback the gate (§13), manually verify the domain, hotfix, re-run.
- A false-NO-GO is a productivity incident: rollback the gate, keep anchors.
- The report's `file:line` citations enable rapid root-cause.
