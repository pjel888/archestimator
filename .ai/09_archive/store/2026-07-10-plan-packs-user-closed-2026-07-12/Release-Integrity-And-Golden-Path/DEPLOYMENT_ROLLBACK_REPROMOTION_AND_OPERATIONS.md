# Deployment, Rollback, Re-Promotion, And Operations

This supporting operations contract expands `REQ-011`, `RISK-003`, `AUTH-003`,
and `UNIT-010`. It performs no external action and does not grant deployment
authority.

## Preflight

Require current green local, GitHub, staging, operating, observability, support,
recovery, and cross-pack receipts for one release ID. Verify every digest in the
full upload-input manifest in the exact CI workspace. Confirm the retained code
rollback version is provider-eligible and current bindings, resource state, and
Durable Object migrations permit code rollback. Data/schema recovery remains a
separate current receipt.

## Ordered Deployment Contract

1. Use the OpenNext-backed `bun run cf:upload-version` without rebuilding.
2. Capture the returned candidate Worker version ID.
3. Deploy only that ID using the frozen `production-release-packet.json` command;
   capture the initial deployment ID.
4. Run exact-SHA marker, authenticated smoke, denial smoke, observability/support/
   recovery checks, and strict production release gates.
5. When eligibility is proven, deploy the retained rollback version and capture
   rollback version/deployment IDs. Verify 100% code traffic on it.
6. Re-promote the exact uploaded candidate version ID without rebuilding and
   capture the new deployment ID.
7. Rerun marker, authenticated/denial smokes, strict gates, and read back 100%
   traffic on the candidate. Only then regenerate release truth.

## Code Rollback Versus Data Recovery

A Worker rollback creates a new deployment and does not revert D1, R2, KV,
Durable Object, Queue, or other data/schema state. If binding/migration/data
compatibility prevents code rollback, do not improvise a destructive down
migration; execute the separate recovery/fix-forward packet and record the actual
traffic/data state.

## Failure Matrix

| Failure | Decision | Required record |
|---|---|---|
| Candidate/input digest mismatch or rebuild | `NO_GO`, no upload/deploy | Mismatch path and workspace/candidate identity |
| Version/deployment ID mismatch | `NO_GO`, stop before traffic change where possible | Returned vs requested IDs |
| Marker/auth/denial/gate failure | `NO_GO`; apply approved rollback/fix-forward | Actual final version, smoke/gate results |
| Rollback ineligible | `NO_GO`; preserve current traffic and use recovery plan | Eligibility facts and data/schema state |
| Re-promotion or final readback mismatch | `NO_GO`; do not report release success | Candidate/rollback/final deployment IDs and actual traffic |

## Resume And Support

Checkpoint every upload/deployment ID, exact command digest, smoke/gate result,
traffic readback, and data-recovery reference before the next action. Resume only
from a revalidated, unexpired packet and current provider readback. An interrupted
rollback rehearsal is never assumed to have restored the candidate.
