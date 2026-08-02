# UNIT-004 — Align email DNS topology + deliverability posture

## Goal

Resolve the mail-topology inconsistency: outbound via Cloudflare Workers Send
Email vs. inbound MX via Namecheap eforward; and harden SPF/DMARC/DKIM so
cohort emails deliver reliably and `archestimator.com` is not a phishing/spoof
surface during controlled beta.

## Source findings / requirements

- `OPS-EMAIL-MX-007` (Medium) — inbound/outbound topology inconsistency
- `OPS-EMAIL-DNS-008` (Medium) — SPF/DMARC/DKIM hardening
- `REQ-004` (CORE)

## Dependencies

- Operator decision: choose one of two topology directions (see below)

## Owned paths / resources

- `artifacts/auth-email-hosted-readiness.md`
- `artifacts/release-gate.json` (`GATE-EMAIL-004`)
- DNS records (Cloudflare-managed per NS, but DNS changes are operator-gated)

## Non-goals

- Email boundary CRLF/HTML chokepoint (current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Infosec UNIT-004)
- Email queue delivery contract (current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Quality Master
  UNIT-024/055-057)
- Inbound `email()` Worker handler — only if Option A chosen

## Implementation boundary

Two operator decision paths:

### Option A — App-visible inbound (recommended for full cohort comms)

1. Migrate MX from Namecheap eforward to Cloudflare Email Routing.
2. Add a Worker `email()` handler in `worker.ts` to ingest inbound messages
   (new code — separate engineering unit).
3. Update SPF to include Cloudflare Workers Send Email.
4. Publish DKIM for the Worker Send Email signing selector.
5. Move DMARC to `p=quarantine` after monitoring.

### Option B — Documented operational split (acceptable for controlled beta)

1. Keep MX at Namecheap eforward for inbound.
2. Add SPF include for Cloudflare Workers Send Email so outbound does not
   softfail.
3. Publish DKIM for the Worker Send Email selector.
4. Keep DMARC `p=none` during beta; move to `p=quarantine` after a monitoring
   period.
5. Document in runbook: outbound From via Workers Send Email; replies land in
   Namecheap mailbox; bounces are invisible to app; operator must manually
   monitor.

Operator chooses Option A or B; either resolves the findings. Option B is the
minimum for controlled beta.

## Invariants

- No real outbound email sent during this unit (use synthetic test addresses
  or mail-tester.com).
- No customer PII in evidence artifacts.
- DNS changes are operator-gated.

## Acceptance evidence

- `evidence/email-dns-<date>.md` with post-change DNS records + SPF/DMARC/DKIM
  validation.
- A mail-tester.com (or equivalent) report showing authentication pass for a
  Worker-sent test message.
- `release-gate.json` `CONDITIONAL_items[GATE-EMAIL-004]` moved to resolved.

## Test decision

`NOT_REQUIRED` — operator-driven DNS + deliverability verification.

## Recovery / fix-forward

If deliverability fails: revert DNS changes; document failure mode. Cohort
admit blocked from relying on magic-link until resolved.

## Completion signal

`release-gate.json` removes `GATE-EMAIL-004`.

## Status

`PLANNED` — ready for operator; Option B is the minimum bar.
