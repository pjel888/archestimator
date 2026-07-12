# Cloudflare Provider Runtime Proof

Generated: 2026-06-30T07:48:31.630Z
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
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
- R2 binding present: yes
- R2 put/get/delete ready: yes
- R2 error: (none)
- R2 object bytes: 646
- Proof object deleted: yes

## Blockers

- (none)
