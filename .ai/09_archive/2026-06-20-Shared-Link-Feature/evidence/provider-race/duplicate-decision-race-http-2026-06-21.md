# QA-G06 provider duplicate-decision race proof

Status: **PASS**

- Generated: `2026-06-21T13:32:36.752Z`
- Mode: `qa-g06-provider-http-race-proof`
- Publication fixture: `b597d4a0-4e63-4b2b-9418-d23c66e1d298`
- Recipient fixture: `21852e62-d113-4382-8730-fd2a15c8ef6e`

## Assertions

| Assertion | Value |
| --- | ---: |
| Successful RPC calls | 1 |
| Duplicate-decision RPC failures | 1 |
| Response rows before cleanup | 1 |

## RPC outcomes

| Attempt | Result | HTTP status | Duration | Error |
| ---: | --- | ---: | ---: | --- |
| 1 | error | 400 | 989.2 ms | Decision already submitted. |
| 2 | success | 200 | 650.47 ms | none |

## Cleanup verification

| Object set | Remaining rows |
| --- | ---: |
| responses | 0 |
| recipients | 0 |
| publications | 0 |
| projects | 0 |
| workspaces | 0 |

Provider-safe service-role HTTP/RPC proof. It mutates only temporary qa-g06-* rows, verifies one accepted decision plus one duplicate rejection, and verifies cleanup counts are zero.
