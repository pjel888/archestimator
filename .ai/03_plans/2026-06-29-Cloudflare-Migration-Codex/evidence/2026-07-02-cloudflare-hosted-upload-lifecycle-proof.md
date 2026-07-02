# Cloudflare Hosted Upload Lifecycle Proof

Generated: 2026-07-02T08:28:39.375Z
Base URL: https://archestimator.com
Endpoint: /api/internal/upload-lifecycle-proof
Response status: 200
Secret input present: yes
Secret input source: process.env

Calls the deployed Cloudflare Worker upload lifecycle proof endpoint with a local bearer secret, then records sanitized R2 write/read, D1 upload asset, scanner execution, clean scan persistence, approved attachment eligibility, and cleanup evidence. It does not print secret values, raw R2 keys, uploaded bytes, session cookies, customer data, or provider credentials.

## Summary

| Gate | Ready |
| --- | --- |
| D1 binding | yes |
| R2 binding | yes |
| R2 write/read | yes |
| Upload asset record | yes |
| Scanner queue listed | yes |
| Scanner job ran | yes |
| Clean scan persisted | yes |
| Attachment download eligible | yes |
| Cleanup zero | yes |
| Hosted upload lifecycle proof | yes |
| Production cutover | no |

## Sanitized Results

- Object path shape: {workspaceId}/{userId}/codex-upload-proof-object-{runId}.pdf
- Object path hash: c892c7450cb2be8eb1f1be8d56a337285ed3c2720ad87e6d7719cfc326ca3afb
- R2 content type: application/pdf
- R2 size bytes: 77
- R2 checksum matches fixture: yes
- Initial upload scan status: pending
- Scanner listed records: 1
- Scanner target found: yes
- Scanner scanned count: 1
- Scanner outcome counts: {"clean":1,"infected":0,"unsupported":0,"failed_transient":0,"failed_permanent":0}
- Persisted scan status: clean
- Persisted scan provider: archestimator-policy-scanner
- Scan event types: scan_pending, scan_clean
- Approved attachment present: yes
- Finalized clean asset present: yes
- Attachment storage bytes readable: yes
- Cleanup after: {"workspaces":0,"profiles":0,"workspaceMembers":0,"uploadSessions":0,"uploadAssets":0,"uploadEvents":0,"attachments":0}

## Blockers

- (none)
