# 15 — Webhook Threat Model

The third pass takes the Codex threat model (webhook replay and signature bypass) and applies it to the webhook surface. Archestimator has one inbound webhook: Resend.

## Webhook surface inventory

| Surface | Type | Auth | Status |
|---|---|---|---|
| `/api/webhooks/resend/route.ts` | POST | Signature (Svix) | F-WEB-01..07 |

## Resend webhook security (third-pass reconfirmation)

### F-WEB-01 — Svix signature verification (strength, restated)

**Evidence:**
- `src/lib/email/resend-webhooks.ts` — uses the Svix library to verify the `svix-signature` header
- Verification includes timestamp tolerance (replay protection)
- 503 returned when verification fails

**Verdict:** **Confirmed.** Strong design. Svix is the canonical signature library for webhooks.

### F-WEB-02 — Missing secret returns 503 (strength, restated)

**Evidence:**
- `src/app/api/webhooks/resend/route.ts` — `if (!process.env.RESEND_WEBHOOK_SECRET) { return new Response("Webhook secret not configured", { status: 503 }); }` — fail-closed

**Verdict:** **Confirmed.** Strong defense against accidental bypass when env var is missing.

### F-WEB-03 — Resend placeholder default (Low after 3P recalibration)

**Evidence:**
- `src/lib/email/resend-webhooks.ts:40` — `const resend = new Resend("re_webhook_verifier");`
- The route handler returns 503 when `RESEND_API_KEY` is missing
- The placeholder string is never used to actually send email

**Verdict:** **Confirmed (downgraded from Medium to Low).** See SEC-20260601-3P-004 in `06_FALSE_NEGATIVES_FROM_CODEX.md`. The risk is **drift only** — if a future developer changes the 503 to a 200, the placeholder could become active.

**Recommendation:** Replace the placeholder default with an explicit null check (R-3P-03).

### F-WEB-04 — Delivery event persistence (strength, restated)

**Evidence:**
- `20260601011500_resend_shared_link_delivery_events.sql` — `shared_link_delivery_events` table records every delivery event
- Service-role-only writes
- RLS-protected

**Verdict:** **Confirmed.** Strong audit trail for email delivery.

### F-WEB-05 — Replay protection (Low, restated as evidence gap)

**Evidence:**
- Svix library provides timestamp tolerance — not explicitly verified in code
- No event_id deduplication (F-WEB-06)

**Verdict:** **Confirmed (Svix handles timestamps).** The exact tolerance window is library-default; not configurable from the application code.

### F-WEB-06 — Webhook idempotency (Low, restated)

**Evidence:**
- No `event_id`-based deduplication observed
- A replayed event within Svix's tolerance window would be processed twice

**Verdict:** **Confirmed (Low).** Resend events are informational (delivery status); duplicate processing is not a security risk.

### F-WEB-07 — Auth callback route (Info, restated)

**Evidence:**
- `src/app/auth/callback/route.ts` handles OAuth/OTP callback
- `src/lib/auth/redirects.ts` sanitizes the `next` parameter

**Verdict:** **Confirmed.** No open-redirect risk.

## Codex-driven webhook threat model (third-pass)

### "Webhook endpoints should have replay protection"

**Verdict:** **Restated as Low.** Svix provides timestamp tolerance. The exact tolerance window is library-default. The third pass does not add a new finding; it confirms F-WEB-05 / F-WEB-06.

## Net change to webhook threat model (third-pass)

| Item | 1P | 2P | 3P |
|---|---|---|---|
| Svix signature verification | Info | Info | **Info (restated, strength)** |
| Missing secret 503 | Info | Info | **Info (restated, strength)** |
| Resend placeholder | Medium | Medium | **Low (SEC-20260601-3P-004, drift only)** |
| Delivery event persistence | Info | Info | **Info (restated, strength)** |
| Replay protection | Low | Low | **Low (restated, Svix handles)** |
| Webhook idempotency | Low | Low | **Low (restated, informational events)** |
| Auth callback | Info | Info | **Info (restated)** |

One severity change: F-WEB-03 (Resend placeholder) downgraded from Medium to Low.

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` Codex claims #4, #7, #24, #25
- See `04_FINDING_RECONCILIATION_MATRIX.md` for mapping
- See `05_FALSE_POSITIVES_FROM_CODEX.md` for rejected claims
- See `06_FALSE_NEGATIVES_FROM_CODEX.md` SEC-20260601-3P-004
