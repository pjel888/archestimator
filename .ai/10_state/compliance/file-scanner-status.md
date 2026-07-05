# File Scanner Status (P1.7)

**Source plan:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md` (P1.7)
**Status:** MOSTLY WIRED — OPEN-DEC-006 (provider selection = paid add-on) is the only true residual gate
**Audited:** 2026-07-05

## What's wired (verified from source)

| Component | Path | Status |
|---|---|---|
| ClamAV scanner (INSTREAM) | `src/lib/uploads/clamd-scanner.ts` | Wired; full protocol implementation; environment-configurable host/port/timeout |
| Policy scanner (EICAR + content-type) | `src/lib/uploads/policy-scanner.ts` | Wired; deterministic fallback when ClamAV unreachable; supports PDF/XLS/XLSX |
| Scan job runner | `src/lib/uploads/scan-job.ts` | Wired; queue consumer + DLQ integration |
| Scan state machine | `src/lib/uploads/scanning.ts` | Wired; 8 states (clean, pending, infected, failed_transient, failed_permanent, override_approved, unsupported, not_required) with explicit transition rules |
| DLQ queue | `src/lib/cloudflare/upload-job-queue.ts` | Wired; Cloudflare Queue + DLQ binding |
| Admin override route | `src/app/api/component-library/attachments/scan-override/route.ts` | Wired; service-secret gated |
| Admin override UI | `src/app/workshop/settings/scan-overrides/` | Wired; workshop admin surface for reviewing/overriding scan failures |
| Override logic | `src/lib/uploads/scan-override.ts` | Wired; TTL enforcement via `scan_override_expires_at` column |
| Schema (override + expiry + actor) | Migration `0010_upload_metadata.sql` | Wired; columns: `scan_status` (CHECK enum), `scan_override_actor_user_id`, `scan_override_expires_at`, `scan_result_json` (json_valid) |
| Partial index for "needs review" queue | Migration `0010_upload_metadata.sql` | Wired; excludes `override_approved` rows where `scan_override_actor_user_id IS NOT NULL AND scan_override_expires_at IS NOT NULL` |
| Operations dashboard | `src/lib/uploads/operations-dashboard.ts` + `src/components/workshop/UploadOperationsDashboardPanel.tsx` | Wired; admin-visible scan metrics |
| EICAR denial test | `tests/vitest/uploads-policy-scanner-eicar.test.ts` | 3 tests pass (EICAR-1 + clean regression + unsupported regression) |

## What's NOT wired (the actual gap)

| Gap | Reason | Resolution path |
|---|---|---|
| Production ClamAV provider | ClamAV needs a paid container/sandbox (Cloudflare Containers, fly.io, or dedicated VM) — `OPEN-DEC-006` | Philip: choose provider, deploy ClamAV container, set `CLAMD_HOST`/`CLAMD_PORT` env vars. Policy scanner remains as deterministic fallback. |
| Cloudflare AV partner (alternative) | Cloudflare does not offer native AV scanning; would need third-party (e.g., ScanCloud, VirusTotal API — paid) | Same: Philip selects provider |

## Conclusion

P1.7 is **implementation-complete** at the code level. The only blocker is the provider selection decision (`OPEN-DEC-006`), which is a paid add-on choice that exceeds the standing Cloudflare-resource mandate. The policy-scanner-as-fallback design means the gate already works without ClamAV — EICAR detection at the policy layer proves it (EICAR-1 scenario).

## Recommended next step for OPEN-DEC-006

Cheapest path: deploy ClamAV in a free-tier Fly.io container (or equivalent) and connect via `CLAMD_HOST`/`CLAMD_PORT`. Cost: $0-5/month at low volume. This unblocks P1.7 without a paid Cloudflare add-on.

Alternative: keep policy-scanner-only (free) and document that file-content scanning is limited to signature matching. Acceptable for closed-beta posture; may need real AV for paid launch.

## EICAR test evidence

`tests/vitest/uploads-policy-scanner-eicar.test.ts` runs in CI:
- EICAR-1: infected PDF → `outcome: "infected"`, `provider: "archestimator-policy-scanner"` ✓
- Clean regression: clean PDF → `outcome: "clean"` ✓
- Unsupported regression: text/plain → `outcome: "unsupported"` ✓
