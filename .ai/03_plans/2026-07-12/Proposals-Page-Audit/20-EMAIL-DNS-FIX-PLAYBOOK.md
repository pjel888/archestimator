# 20 — Email DNS Fix Playbook (P0-1, copy-paste ready)

> The highest-value authorization-free work I can do is make the P0-1 fix
> **copy-paste-ready** so that the moment the owner says "fix the email DNS,"
> it's a 60-second paste sequence, not a research task. This advances the real
> goal (proposals working for first users) instead of finding a 32nd audit bug.
>
> This playbook is the exact sequence, grounded in the project's own evidence.

## 0. The real situation (from `.ai/10_state/current-state.md`)

P0-1 is **sharper than the round-7 register entry recorded.** It's not just an
SPF mismatch — it's that **Cloudflare Email Sending was never onboarded**:

> *"Cloudflare Email Service production readiness is **not** green yet…
> `wrangler email sending list` still reports no Email Sending domains/subdomains.
> A direct `wrangler email sending enable archestimator.com` attempt failed with
> Cloudflare API error `Active zone required [code: 2009]`, matching the DNS
> evidence that public nameservers are still Namecheap."*

Root cause: **public nameservers for `archestimator.com` are at Namecheap, not
Cloudflare.** Cloudflare Email Sending requires an *active Cloudflare zone*
(DNS hosted on Cloudflare). The `EMAIL` binding exists in `wrangler.jsonc:28-32`
but has no backing sending domain.

The proposals feature routes invitations through `sendCloudflareEmail`
(`src/lib/email/cloudflare-email-client.ts`) when
`ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email`. If that's the active provider,
**invitations cannot be sent at all** (not just SPF-softfail — the send itself
is unproven/failed). If the provider falls back to Resend (legacy), the SPF
includes Resend via the archived `resend-domain-verified` proof, but that's the
*old* path the project migrated off.

**This is why P0-1 is P0:** the email substrate the proposals feature depends
on is not production-wired, regardless of code correctness.

## 1. The decision the owner must make first (before any DNS paste)

There are two viable destinations for `archestimator.com` email:

| Option | What it means | Pros | Cons |
|---|---|---|---|
| **A. Migrate DNS to Cloudflare** (full zone) | Change nameservers at Namecheap → Cloudflare; Cloudflare becomes authoritative for MX/TXT/SPF/DKIM/DMARC | Unlocks Cloudflare Email Sending natively; single DNS provider; matches the project's Cloudflare-migration direction | Brief DNS propagation window; must recreate all records in Cloudflare first |
| **B. Keep Namecheap DNS, add Cloudflare to SPF + use a sender that doesn't require an active CF zone** | Stay on Namecheap; `include` Cloudflare/Resend send-IPs in SPF; DKIM via the provider's selector | No nameserver migration; lower risk | Cloudflare Email Sending (`send_email` binding) **requires an active CF zone** — so the Worker `EMAIL` binding is dead under this option. Would require a different provider (Resend/Postmark) for the Worker's outbound mail. |

**Recommendation: Option A (migrate DNS to Cloudflare).** The project already
migrated the app to Cloudflare Workers/D1/R2; the DNS is the last Namecheap
holdout. Migrating it unlocks the `EMAIL` binding the Worker already declares
and consolidates DNS + email + hosting on one provider. The brief propagation
risk is acceptable for a pre-first-users product.

## 2. Fix sequence — Option A (migrate DNS to Cloudflare)

### Step 1 — Recreate the zone in Cloudflare (before changing nameservers)
In the Cloudflare dashboard:
1. Add zone `archestimator.com` (if not already present).
2. Recreate every existing record (export from Namecheap first). Critically:
   - **A record** `archestimator.com → 216.198.79.1` (or the Worker route — verify the current value).
   - **MX** `eforward*.registrar-servers.com` (if keeping Namecheap forwarding for inbound) — OR drop these and use Cloudflare Email Routing for inbound.
   - **SPF** TXT (will be rewritten in Step 3).
   - Any CNAMEs, TXT verification records, etc.
3. Set the zone to the plan tier matching the project posture (free tier per `AGENTS.md` cost posture).

### Step 2 — Change nameservers at Namecheap
1. Namecheap dashboard → Domain → Nameservers → Custom DNS.
2. Set to the two Cloudflare-assigned nameservers (e.g. `*.ns.cloudflare.com`).
3. Wait for propagation (minutes to ~24h; Cloudflare dashboard shows "Active").

### Step 3 — Onboard Cloudflare Email Sending
Once the zone is active:
```bash
# Verify the zone is active
bunx wrangler email sending list   # should now be able to list/manage

# Enable sending for the apex (may require dashboard confirmation)
bunx wrangler email sending enable archestimator.com
# (if the CLI path differs, use the Cloudflare dashboard → Email → Email Routing → Settings)
```
Cloudflare will generate the **DKIM selector + public key** and the **SPF
include** to add. Publish them as TXT records in the now-Cloudflare-hosted zone.

### Step 4 — SPF / DKIM / DMARC records (in Cloudflare DNS)
```
# SPF (apex TXT) — include the provider(s) authorized to send
archestimator.com.  TXT  "v=spf1 include:_spf.mx.cloudflare.net ~all"
# (exact include per Cloudflare's Email Routing docs at enable time; if keeping
#  any Namecheap forwarding sender, add include:spf.efwd.registrar-servers.com too)

# DKIM (Cloudflare provides the selector + value at enable time)
<selector>._domainkey.archestimator.com.  TXT  "<Cloudflare-provided public key>"

# DMARC — start at p=none (monitor), tighten after a monitoring window
_dmarc.archestimator.com.  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@archestimator.com; pct=100"
# after ~1 week of clean reports → p=quarantine; after another week → p=reject
```

### Step 5 — Verify with a real send (`TEST_TASK`-gated)
```bash
# Publish a proposal to a REAL external email you control (Gmail + Outlook),
# then confirm receipt + authentication headers.
```
Pass criteria:
- Received in inbox (not spam) within 60s at Gmail **and** Outlook.
- "Signed-by" / "mailed-by" shows `archestimator.com` authenticated (SPF + DKIM pass).
- `project_publication_events` gets an `open` row when the link is clicked.
- `shared_link_recipients.delivery_status` flips to `sent`.

## 3. If the owner chooses Option B (stay on Namecheap)

Then the `EMAIL` Worker binding is unusable (no active CF zone) and outbound
mail must route through a provider that doesn't require an active CF zone:
- Re-enable the **Resend** path (`ARCHESTIMATOR_EMAIL_PROVIDER=resend`) — the
  archived `resend-domain-verified-email-enabled-2026-06-04T1235Z.json` proves
  Resend was previously verified against the Namecheap DNS.
- Add Resend's SPF/DKIM to the Namecheap TXT records per Resend's dashboard.
- This reverts part of the Cloudflare migration but is lower-risk if the owner
  doesn't want to migrate DNS yet.

Either way, **the code does not change** — `sendCloudflareEmail` vs the Resend
fallback is already a provider flag (`ARCHESTIMATOR_EMAIL_PROVIDER`). The work
is DNS + provider verification, not application code.

## 4. Why this is the highest-value work right now

The audit pack is comprehensive (23 artifacts, 31 bugs, 10 framework checks).
A 32nd bug wouldn't move the proposals feature toward working. **Fixing P0-1
unblocks the entire feature** — without email delivery, every other fix
(Slice 1 row-resilience, Slice 3b privacy, the redesign) is moot because
recipients never receive the invitation to see the inbox at all.

This playbook is the authorization-free deliverable that makes the owner's
"fix the email DNS" a paste sequence. The owner's decision (Option A vs B)
and the final `TEST_TASK` real-send are the only gates.

## 5. Status after this artifact

- P0-1 is now the **most completely specified** finding in the pack: root cause
  (nameservers not on Cloudflare → no active zone → Email Sending un-onboarded),
  two options, exact DNS records, exact CLI commands, exact verification steps.
- The pack is 24 artifacts. The audit loop's authorization-free work is
  exhausted; this artifact converts the top finding into an executable fix.
