# Residual Uncertainty And Confidence Register

Date: 2026-06-20. Scope: what still prevents absolute certainty.

## Confidence levels

| Level | Meaning |
|---|---|
| High | Evidence exists and can be independently re-run or inspected. |
| Medium | Plan is sound, but provider/owner/legal/live evidence is still required. |
| Low | Current facts may change before implementation or the authority decision is missing. |

## Register

| Item | Current confidence | Why uncertainty remains | What would raise confidence to high |
|---|---|---|---|
| Beta strategy | Medium | Named design-partner beta is recommended, but owner still chooses cohort and limits. | Owner decision record adopting or changing `07`. |
| B1 CI | Medium | Local docs know desired posture, but GitHub provider state must be changed/read. | Current green required-check run and branch protection proof. |
| B2 validate | Medium | Criteria are clear, but implementation still has to make the hard gate pass. | Fresh hard-gate output on the implementation branch. |
| B4/B7 observability | Medium | Runbook exists, but sink/monitor/owner must be selected and proven. | Test event visible in chosen sink and alert reaches owner. |
| B5 beta env | Medium | Source-side plan is clear; Vercel env must be read for production. | Vercel env readback and hosted auth route proof. |
| B6 DB drift | Low | Live DB/migration state may have changed and any repair is high-blast. | Fresh live-vs-tree inventory, scratch reset parity, reviewer-approved production action. |
| B8 erasure/export | Low | Data-destructive semantics and legal retention exceptions need owner/legal decision. | Dry-run manifest, transaction rehearsal, export delivery proof, owner/legal record. |
| B9 legal copy | Medium | Copy matrix exists but legal/SLA values must be approved. | Owner/legal decision plus deployed copy proof. |
| V1 realtime limits | Medium | Supabase limits are provider settings, not source facts. | Provider readback from `ebxxqidacheyapmmzavr`. |
| V2 consent | Medium | Path A/B is still a decision. | Network proof for Path A or owner/legal record for Path B. |
| C1 AI quota | Medium | AI remains off; quota only matters if enabled. | Package-builder quota tests plus env proof before AI enablement. |
| H2 email cap/rate | Medium | Current plan routes the risk, but implementation is not done. | Tests plus Resend/domain/bounce evidence. |
| H3 storage quota | Medium | Monitor/quota threshold is an owner ops decision. | Quota or alert readback with threshold. |
| H4 readiness endpoint | High for plan, medium for implementation | Endpoint does not exist yet; criteria are clear. | Source/test proof plus monitor config. |

## Certainty statement

The pack can be treated as **100% planning-ready** when implementers use docs `07`-`24` together.
It cannot be treated as **100% launch-proven** until the provider, owner/legal,
DB, and live verification rows above move to high confidence.
