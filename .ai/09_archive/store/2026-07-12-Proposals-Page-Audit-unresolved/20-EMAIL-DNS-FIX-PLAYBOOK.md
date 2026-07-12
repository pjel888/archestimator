# 20 — Email DNS Fix Playbook (P0-1 → downgraded P2 after round-11 live check)

> **MAJOR UPDATE (round 11, 2026-07-12):** the original playbook assumed a full
> DNS migration (Option A) because round 7 read stale June-30 state docs. **Live
> verification on 2026-07-12 found the fix is ~90% done already.** This document
> now reflects reality.

## Live state verified 2026-07-12

| Component | Status | Evidence |
|---|---|---|
| Nameservers | ✅ **Cloudflare** (`carl.ns.cloudflare.com`, `ziggy.ns.cloudflare.com`) | `dig +short NS archestimator.com` |
| Email Sending enabled | ✅ **yes** (tag `894a8c44…`, since 2026-07-01) | `bunx wrangler email sending list` |
| `cf-bounce` MX (3 routes) | ✅ **published** (route1/2/3.mx.cloudflare.net) | `dig +short MX cf-bounce.archestimator.com` |
| `cf-bounce` SPF | ✅ **published** (`include:_spf.mx.cloudflare.net ~all`) | `dig +short TXT cf-bounce.archestimator.com` |
| `cf-bounce` DKIM | ✅ **published** (RSA key, selector `cf-bounce`) | `dig +short TXT cf-bounce._domainkey.archestimator.com` |
| DMARC alignment | ✅ **relaxed-aligned** (cf-bounce → archestimator.com org domain) | analysis |
| Deployed Worker secrets | ✅ all present (`EMAIL_PROVIDER`, `CLOUDFLARE_EMAIL_FROM`, `REPLY_TO`, `DELIVERY_ENABLED`) | `bunx wrangler secret list` |
| `_dmarc` enforcement | ❌ `p=none` (monitor only — **not blocking**, just not enforced) | `dig +short TXT _dmarc.archestimator.com` |

**Conclusion: outbound Cloudflare Email should already pass SPF + DKIM + DMARC** on the `cf-bounce` return-path. The feature-blocking substrate problem is resolved. The original P0 was correct based on the June-30 evidence but is now downgraded to **P2**.

## The ONLY remaining actions

### Action 1 — DMARC tightening (owner dashboard, safe, optional for beta)

`_dmarc.archestimator.com` is `p=none`. This does **not block** delivery — it only means non-compliant mail isn't rejected/quarantined. For beta, `p=none` is acceptable (monitoring mode). To harden:

1. In Cloudflare dashboard → DNS → edit `_dmarc.archestimator.com` TXT:
   - Change `"v=DMARC1; p=none;"` → `"v=DMARC1; p=quarantine; rua=mailto:dmarc@archestimator.com; pct=100"`
   - Wait 1 week of monitoring (check rua reports for false positives).
   - Then tighten to `p=reject`.

**Safe because:** Cloudflare Email Sending signs via `cf-bounce.archestimator.com` (return-path), which has correct SPF+DKIM and is relaxed-aligned to the header-from `archestimator.com`. The apex SPF (Namecheap forwarding) only affects inbound-forwarded mail, not Cloudflare outbound. **Caution:** if any system sends mail directly from the apex (not via Cloudflare), `p=quarantine`/`reject` could affect it — verify all outbound paths use Cloudflare first.

### Action 2 — Real-send verification (`TEST_TASK`)

The owner authorized this fix. To verify end-to-end:

```bash
# Send a test via the Cloudflare Email Sending builder:
bunx wrangler email sending send \
  --from "no-reply@archestimator.com" \
  --to "<your-real-gmail-or-outlook-address>" \
  --subject "Archestimator proposals email verification" \
  --text "If you received this in your inbox (not spam), SPF/DKIM/DMARC are passing for archestimator.com proposals email." \
  --from-name "Archestimator"
```

**Pass criteria:**
- Received in inbox (not spam) within 60s.
- In Gmail: "Show original" → Authentication Results show `spf=PASS`, `dkim=PASS`, `dmarc=PASS` for `archestimator.com`.
- In Outlook: similar authentication headers.

**If it lands in spam:** check the received headers for which authentication failed — most likely the `from` address domain doesn't match the configured `CLOUDFLARE_EMAIL_FROM`, or the header-from isn't aligned. The fix would be adjusting the `from` to match the deployed secret.

### What does NOT need to change
- **No code changes.** `sendCloudflareEmail` (`cloudflare-email-client.ts`) is correct.
- **No apex DNS changes.** The apex SPF/MX (Namecheap forwarding for inbound) can stay — Cloudflare Email Sending uses the `cf-bounce` subdomain for the envelope-from.
- **No wrangler.jsonc changes.** The `EMAIL` binding is correct.
- **No new Worker secrets.** All 4 are deployed.

## How this affects the rest of the pack

- **P0-1 is downgraded to P2** in `02`. The bug count is now **0×P0, 7×P1, 17×P2, 7×P3 = 31**.
- **`03` readiness verdict returns to CONDITIONAL** (no longer "NOT-READY" — the email blocker is resolved).
- **Slice 0 in `IMPLEMENTATION_PLAN.md`** becomes "DMARC tighten + real-send verify" (minutes, not a migration).
- **The proposals feature's email substrate is production-wired.** The remaining P1s (one-bad-row, `responded` status) are the actual priority fixes now.

## Lesson for the audit pack

Round 7's P0-1 was based on `.ai/10_state/current-state.md` quoting June-30 evidence. The state doc was stale — the Cloudflare zone migration and Email Sending onboarding happened between June 30 and July 1, but the state doc wasn't updated. **This is the strongest argument yet for live verification over doc-reading** — and it's why this round's `wrangler email sending list` + `dig` checks were essential rather than more code reading.
