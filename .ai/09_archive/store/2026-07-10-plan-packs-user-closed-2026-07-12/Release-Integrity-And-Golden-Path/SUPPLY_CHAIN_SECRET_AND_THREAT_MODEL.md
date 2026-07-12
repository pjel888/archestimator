# Supply Chain, Secret, And Threat Model

This supporting security model expands `REQ-001/002/005/007` and
`RISK-001/003/004` under the security applicability gate. It identifies planned
controls, not a clean security result.

| Threat | Failure mode | Required control | Adversarial proof |
|---|---|---|---|
| Mutable/unpinned action | Third-party code changes after review | Full commit SHA pin; least privilege; explicit update review | Workflow parser rejects tag/branch pins |
| Fork secret exposure | Untrusted PR code reads release/provider credentials | Fork-safe triggers; no secret-bearing privileged run of untrusted checkout | Fixture inspects triggers, permissions, and secret use |
| Skipped/neutral laundering | Aggregate gate reports green without required work | Fail closed on missing/skipped/neutral/cancelled/continued jobs | Job-result fixture matrix |
| Rebuild after verification | Deployed bytes differ from checked candidate | Build once; full input graph; same workspace; returned version ID only | Rebuild/ref/SHA/mutated-input fixtures reject |
| OpenNext bypass | Direct Wrangler path omits adapter phases | Installed OpenNext upload contract | Contract test rejects direct-adapter bypass |
| Secret or credential retention | Token/cookie/password appears in trace/log/receipt | Ephemeral secret references; allowlist/redact before persistence | Raw-value canaries absent from every bundle |
| Digest used as bearer | Stored hash becomes route credential | Keyed digest is correlation only; raw token never persisted | Journey/fixture contract rejects digest navigation |
| False-clean provider state | Inaccessible scan/control endpoint renders clean | 401/403/404/503/rate-limit/partial -> `UNKNOWN` | Mocked discovery classifications |
| Cross-environment proof | Staging or old SHA evidence authorizes production | Bind environment/resource/SHA/release ID and freshness | Mixed-environment/release fixtures reject |
| Broad authorization | One approval mutates GitHub, staging, and production | Separate `AUTH-001/002/003` actor/resource/action packets | Packet schema and boundary audit |
| Cleanup damage | Shared/foreign fixture data deleted | Run namespace + owner marker + signed manifest + canary | Double cleanup and foreign canary |

## Secret Handling In CI

Workflow source names secret bindings but never echoes values. Collectors redact
headers, cookies, tokens, addresses, object keys, and raw URLs before stdout,
hashing, or persistence. Secret-scanning readback always requests hidden values.
Screenshots and traces are treated as sensitive diagnostic artifacts and bounded
by the evidence retention contract.

## Security Stop Conditions

Any unpinned action, excessive permission, unsafe fork path, raw secret canary,
incomplete pagination, false-clean endpoint, input-graph mismatch, or boundary
packet overreach blocks the owning unit. Local contract proof cannot establish
live GitHub controls or production safety; those remain hosted boundaries.
