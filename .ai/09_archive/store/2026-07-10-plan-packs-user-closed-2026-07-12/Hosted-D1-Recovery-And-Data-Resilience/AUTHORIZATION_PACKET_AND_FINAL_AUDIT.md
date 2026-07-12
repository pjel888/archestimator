# Authorization Packet And Final Audit

## Authority And Scope

This boundary/final-audit artifact expands `AUTH-001`, `AC-002`, `AC-007`,
`GATE-002`, `UNIT-006`, and the completion audit for `REQ-001..007`. It does not
resolve authorization, create resources, or elevate package/release status.
`plan-pack.json` is the sole live status authority.

## `AUTH-001` Packet Contract

The one-run request must name:

- authorized Cloudflare account and hosted source database by controlled
  identity, plus proof that both are inside the intended Archestimator account;
- exact unique disposable D1 and Worker/environment names, explicit
  `workers_dev=true`, `routes=[]`, no custom domain, disposable-only binding, and
  a pre-deploy Worker-name uniqueness check;
- exact create/export/import/deploy/probe/destroy command identities/digests and
  the controls that prevent defaults to `ARCH_DB`;
- approved export/source-impact window, run expiry, Free plan/limit/storage/size
  preflight, expected RTO/RPO evaluation window, and abort thresholds;
- proof-secret and export-key alias names only, five-minute request window,
  8 KiB streaming body cap, per-request body-arrival deadline, constant-time
  secret comparison, 32-success cap, five-failed-attempts/minute cap, and
  redaction rules;
- data handling, encrypted filesystem and `0700/0600` requirements, plaintext/
  ciphertext/key lifecycle, diagnostic retention, evidence paths, and cleanup
  verifier;
- operator and distinct verifier roles, incident/escalation contact, rollback,
  absence-readback surfaces, and post-run consumer commands.

The packet explicitly excludes `ARCH_DB` Time Travel, another account/project,
paid feature enablement, real-user session use/revocation, canonical/preview/
custom routing, raw proof-key disclosure/reuse, and any resource or action not
listed. Authorization expires after the run window or first complete cleanup.

## Boundary Denials

Missing/stale packet, wrong account/source/target, non-unique name, unsupported
plan/limit, changed command, concurrent lease, changed app/migration/auth/
ingress contract, missing verifier, or incomplete cleanup procedure leaves
`AUTH-001` active and `UNIT-006` blocked. Planning, local tests, provider docs,
an agent summary, or standing authorization for already bound resources cannot
satisfy this boundary.

## Final Audit Matrix

| Requirement | Final question | Required evidence | Planning baseline only |
| --- | --- | --- | --- |
| `REQ-001` | Do readiness/release reject local-only, provider-false, stale, incomplete, and mismatched proof? | `TEST-001`, strict consumers, current source revision | Planned; `AC-001` fails until implementation. |
| `REQ-002` | Was exact authorized disposable lifecycle used with safe preflight and cleanup? | `TEST-002/007`, provider inventory/readback, `AUTH-001` | Boundary. |
| `REQ-003` | Do migration/schema/data/FK/orphan/domain/precision checks match the export digest and target? | `TEST-003`, receipt integrity section | Planned; `AC-003` fails. |
| `REQ-004` | Did offline session treatment precede unique ingress, and did app/authz/write/denial/cleanup proof pass? | `TEST-004`, Worker/URL/binding/route readback, Worker-name uniqueness, constant-time comparison, body-arrival deadline, production-source controlled-write absence, delayed edge re-check | Planned local contract plus hosted boundary. |
| `REQ-005` | Is the old session canary denied offline and after ingress while fresh disposable auth works? | `TEST-005`, redacted canary results (rehearsal proves blanket delete-all; selective production invalidation is out of scope) | Planned; `AC-005` fails. |
| `REQ-006` | Is one current strict `D1-RECOVERY-RECEIPT-v1` accepted by Release and Operating without rerun? | `TEST-006`, exact identities/revisions/timing/result/cleanup | Planned; `AC-006` fails. |
| `REQ-007` | Are free-tier/data/key/secret/resource lifecycles bounded and independently absent? | `TEST-002/007`, cleanup inventory/readback | Boundary. |

## Reviewer And Completion Contract

A maker can prepare the runner, checks, and receipt but cannot verify its own
hosted artifact or cleanup. The distinct verifier checks every receipt field,
provider identity, exact URL/route/binding, app/auth/session result, controlled
write rollback, size/limit/timing claim, and cleanup surface. Any unqueried,
failed, stale, or contradictory item is `FAIL` or `BOUNDARY`, not `PASS`.

The pack is not complete until all internal units are verified, `AUTH-001` has
been resolved for the executed run, the provider receipt is current and strict
consumers pass, cleanup is independently green, and the Program maintainability
N/A receipt is present. This document cannot satisfy any of those conditions.
