# Cloudflare Provider Runtime Proof

Generated: 2026-07-01T21:57:13.851Z
Base URL: https://archestimator.com
Endpoint: /__cloudflare/provider-proof
Provider backed: yes
Response status: 200
Secret input present: yes
Secret input source: process.env

Calls the deployed proof Worker provider-proof endpoint with a local bearer secret, then records only sanitized provider behavior: Cloudflare Images info/transform readiness and ephemeral R2 put/get/delete readiness. It does not print secret values, upload secrets, deploy Workers, change DNS, purchase plans, delete resources, or make production cutover ready.

## Summary

| Gate | Ready |
| --- | --- |
| Images provider proof | yes |
| R2 provider proof | yes |
| Provider runtime proof | yes |
| Production cutover | no |

## Sanitized Results

- Images binding present: yes
- Images info ready: yes
- Images transform ready: yes
- Images error: (none)
- Image format: image/jpeg
- Image dimensions: 32x32
- Image output bytes: 68
- Image info timing: 7 ms
- Image transform timing: 4 ms
- R2 binding present: yes
- R2 put/get/delete ready: yes
- R2 error: (none)
- R2 object bytes: 646
- Proof object deleted: yes
- R2 put timing: 625 ms
- R2 get timing: 101 ms
- R2 delete timing: 111 ms
- R2 round-trip timing: 923 ms

## Blockers

- (none)
