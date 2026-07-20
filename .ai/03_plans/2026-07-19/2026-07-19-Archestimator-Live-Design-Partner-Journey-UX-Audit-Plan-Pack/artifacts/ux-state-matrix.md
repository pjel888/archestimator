# UX State Matrix

For every critical journey, the states actually exercised or traced. Legend:
`✓ live-observed`, `◐ source-traced`, `✗ blocked`, `— N/A`.

| Journey | loading | empty | populated | success | validation error | auth denial | network/server fail | retry | duplicate submit | stale optimistic | refresh | bfcache | multi-tab | session expiry | shared device | slow network | small laptop | mobile recipient |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J-01 discovery | ✗ | — | ◐ | ◐ | ◐ | — | ✗ | ◐ | ◐ (UX-LEAD-002 no guard) | — | ◐ | ◐ | — | — | — | ✗ | ◐ | ◐ | — |
| J-02 invite/auth | ✗ | — | — | ◐ | ◐ (UX-MAGIC-001) | ◐ | ✗ | ◐ | ◐ | — | ◐ | ◐ | — | ◐ (UX-SESSION-001) | ◐ | ✗ | ◐ | ◐ | — |
| J-03 first workshop | ✗ | ◐ (UX-EMPTY-003) | ✗ | ✗ | — | ✗ | ✗ (UX-BUILD-001) | — | — | — | ✗ | — | — | ◐ | — | ✗ | ✗ | — | — |
| J-04 first estimate | ✗ | — | ✗ | ✗ | — | ◐ | ✗ (UX-BUILD-001) | — | — | ◐ | ✗ | — | — | ◐ | — | ✗ | ✗ | — | — |
| J-05 reuse/library | ✗ | ◐ (UX-EMPTY-001) | ✗ | ✗ | — | ◐ | ✗ (UX-BUILD-001) | — | — | — | ✗ | — | — | ◐ | — | ✗ | ✗ | — | — |
| J-06 client output | ✗ | — | ✗ | ◐ | — | ◐ | ✗ (UX-BUILD-001) | — | — | — | ✗ | — | — | ◐ | — | ✗ | ◐ | ◐ | — |
| J-07 public proposal | ✗ | ◐ (UX-EMPTY-002) | ✗ | ◐ | ◐ (UX-SHARE-001/002) | ◐ | ✗ (UX-BUILD-001 publisher side) | ◐ | ◐ | — | ◐ | ◐ | — | ◐ (UX-SESSION-001) | ◐ | ✗ | ◐ | ◐ | ◐ (UX-SHARE-002) |
| J-08 revision | ✗ | — | ✗ | ✗ | — | ◐ | ✗ | — | — | — | ✗ | — | — | ◐ | — | ✗ | ✗ | — | ◐ |
| J-09 founder/admin | ✗ | ◐ | ✗ | ◐ (UX-ADMIN-001 positive) | — | ◐ | ✗ (UX-BUILD-001) | — | — | — | ✗ | — | — | ◐ | — | ✗ | ✗ | — | — |

## Reading

- Every `✗` in the network/server-fail column for J-03 through J-09 traces to **UX-BUILD-001**: the action-inbox compile break makes the dev server return HTTP 500 for every authenticated route. Once UX-BUILD-001 is fixed, this column flips to `◐`/`✓` for source-traced/live-observed.
- `UX-BUILD-001` is the single root cause that converts what should be a normal state-matrix audit into an EVIDENCE_BLOCKED exercise. Fixing it is the gating unit.
- The `◐` source-traced cells represent findings already in `findings.json`. After the build is restored, a re-audit pass should advance `◐` cells to `✓` for the journeys in scope.
- The mobile-recipient column applies almost exclusively to J-07; UX-SHARE-002 (touch targets) and UX-INVITE-002 (font sizes) are the only mobile-specific defects.
