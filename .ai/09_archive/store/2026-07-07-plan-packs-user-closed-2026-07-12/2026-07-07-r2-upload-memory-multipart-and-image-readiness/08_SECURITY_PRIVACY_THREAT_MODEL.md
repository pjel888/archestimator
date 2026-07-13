# 08 — Security, Privacy, and Threat Model

## Trust boundaries

1. **Internet → Cloudflare edge** (WAF/DDoS, rate limit — plan-tier).
2. **Edge → Worker** (OpenNext Route Handlers, `nodejs` runtime).
3. **Worker → R2** (binding `ARCH_UPLOADS_R2`, single physical bucket, logical-bucket namespace).
4. **Worker → D1** (binding `ARCH_DB`, app-authz predicates).
5. **Worker → clamd** (optional, `node:net` to reachable endpoint — network egress).
6. **Worker → Cloudflare Images binding** (`IMAGES`, optional).
7. **Cron/Queue → internal routes** (bearer secret).

## Actors / roles

- Anonymous internet user (must fail-closed).
- Authenticated workspace member (viewer/editor/owner) — `d1-access.ts` predicates.
- Platform admin (scan-override authority — `canApproveUploadScanOverride`).
- Cron/system (bearer-secret jobs).
- Worker service (R2/D1 via bindings — no raw presigned URLs issued).

## Threat model

| ID | Threat | Attack surface | Vector | Mitigation | Status |
|---|---|---|---|---|---|
| T-01 | Memory-exhaustion DoS (OOM isolate) | All 5 upload routes | Concurrent large uploads buffer whole bodies | FR-01 stream + FR-02 enforced cap + admission (advisory) + durable direct-upload capacity | Resolved by plan |
| T-02 | Oversize upload | All routes | Body > cap | content-length pre-check + post-stream size guard (FR-02) | Resolved |
| T-03 | Content-type spoofing | All routes | Declared MIME ≠ bytes | magic-byte sniff (existing) + (attachments) scan gate | Retained (SEC-02) |
| T-04 | Malicious file (malware) | Attachments | Infected PDF/XLS/XLSX | Policy scanner (floor) + ClamAV (upgrade) + scan gate + override (admin) | FR-07 honest posture |
| T-05 | Path traversal in object key | R2 keys | Crafted fileName | `assertSafeStoragePath` + `assertSafeLogicalBucket` + per-route path ownership | Retained (SEC-03) |
| T-06 | IDOR / cross-workspace access | All routes | Guess asset/project id | `canEdit*`/`canManageLibrary` + direct-upload owner check + durable capacity | Retained (SEC-01) |
| T-07 | Direct Server-Action POST bypass | n/a (uploads are Route Handlers, not Server Actions) | n/a | Routes enforce authz at handler | n/a |
| T-08 | XSS via uploaded image/attachment served back | Image/attachment GET | Stored content rendered | Images served as bytes with correct content-type; attachments download-gated + content-disposition; no `dangerouslyAllowSVG`; SVG not in MIME allowlist | Retained |
| T-09 | SSRF via outbound fetch | Scan path (clamd) | clamd host injection | clamd host from env, not user input; no user-controlled outbound fetch | Retained |
| T-10 | CSRF on upload POST | Upload routes | Cross-site form POST | Same-site cookies (Better Auth); routes are JSON/form POST to same origin; verify during impl | Verify |
| T-11 | Privilege escalation via scan override | Override route | Non-admin calls override | `canApproveUploadScanOverride` platform-admin only | Retained |
| T-12 | Presigned-URL leak | Direct upload | "signed" URL leaked | App-owned URL re-enters Worker (no raw R2 presign); session 300 s expiry | Retained |
| T-13 | Orphan R2 object (data retention/privacy leak) | R2 + D1 drift | D1 row purged, R2 object remains | FR-05 list reconcile + FR-06 retention R2 delete | Resolved by plan |
| T-14 | Quota-exhaustion DoS (R2 Class A/B, Images transforms) | Upload flood | Many uploads/transforms | admission + durable capacity + per-workspace caps + Images quota monitor (DEC-07) | Partial (advisory admission) |
| T-15 | Sensitive data in logs/telemetry | All paths | Bytes/checksums/paths logged | operational-telemetry redacts; never log raw bytes; checksum prefixes only | Retained |

## Credential material (summary — full taxonomy in `04`)

- Upload session id: **public marker** (UUID), client-visible, URL `?uploadSessionId=`, 300 s expiry.
  Not a secret; ownership checked server-side.
- Scan override: **no new token** — platform-admin auth-gated action.
- Direct upload URL: **app-owned** (re-enters Worker), not a raw R2 presign.
- Cron bearer secrets: **raw env secrets**, operator-rotated.

No raw tokens, hashes-as-substitutes-for-bearers, or recipient credentials are introduced. No public
route requires a raw bearer value.

## Privacy / data minimization

- File bytes stored only in bound R2; metadata only in bound D1.
- `customMetadata` (FR-04) stores **non-PII** fields (ids, content-type, checksum prefix, timestamp)
  — no file content or user PII. Confirm during implementation that no PII leaks into metadata.
- Retention deletes bytes + rows per cutoffs (failed 7d, deleted 30d, expired 1d, events 365d).
- No raw content in this plan pack (hashes/prefixes/sizes/types/file:line only).
- CSP/frame/referrer: upload GET routes serve bytes with correct content-type + cache-control; no
  cross-origin framing; verify `next.config.ts` headers unaffected.

## Security testing expectations

- Denial tests: cross-workspace upload (403); cross-project image GET (403); direct-upload session
  hijack (403); oversize (413); bad type (415); scan-pending download (409); path-traversal key
  (rejected).
- Magic-byte/scan tests stay green (`upload-attachment-scan-freeze`, `uploads-policy-scanner-eicar`).
- New: streaming path must not bypass magic-byte sniff (sniff first bytes, then stream rest).
- New: multipart abort must not leave orphan parts beyond retention.

## Honest scanner posture (FR-07)

The default `createUploadPolicyScannerProvider` is **not antivirus**. It checks: empty file,
macro-enabled rejection (`.xlsm`), content-type/extension allowlist, and EICAR test-signature ASCII
substring. This is a defensible **first-user content-validation floor**, not malware protection.
Implementation must document this in `18_STACK_CONTRACT` and the runbook (`13`). ClamAV
(`UPLOAD_SCAN_PROVIDER=clamd`) is the documented upgrade but requires a reachable clamd endpoint
(network egress from the Worker — owner decision, OPEN-02). Cloudflare CDR is a future paid option
(recorded, not recommended now).

## Residual risks

- Admission control is in-process/advisory (not distributed); under multi-isolate concurrency the
  per-actor/workspace caps are best-effort. Durable direct-upload capacity (D1) is the hard limit for
  that surface.
- Policy scanner will not catch non-EICAR malware. Accepted as first-user floor; owner may enable
  ClamAV (OPEN-02).
- CSRF posture on upload routes needs a verify-during-implementation check (T-10) — Better Auth
  same-site cookies are expected to cover it.
