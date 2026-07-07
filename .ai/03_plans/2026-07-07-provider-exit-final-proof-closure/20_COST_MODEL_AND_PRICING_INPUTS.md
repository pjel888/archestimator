# 20 — Cost Model and Pricing Inputs

> Figures here are planning inputs from `AGENTS.md` cost posture and `wrangler.jsonc`,
> not contractual. Re-validate with `bun run cf:pricing` if precise numbers matter.

## 20.1 Cost posture (binding)

From `AGENTS.md`:
> "Current cost posture: stay on free-tier / bundled Cloudflare limits; do not
> enable paid add-ons (D1 paid plan, R2 paid tier, Workers Smart Placement paid,
> Workers Analytics paid, dedicated egress, etc.) without explicit owner
> approval."

## 20.2 What this plan costs (closure procedure)

| Cost input | Value / assumption | Free-tier impact | Source |
|---|---|---|---|
| Pack generation | local CLI, seconds | none | `cf:provider-exit-pack` |
| Smoke commands | read-only wrangler readback + route probes | within free-tier read/request budgets | `13_…` §13.3 |
| Operator-record edit | local file write | none | local |
| Persona journey (if proof) | one real Google sign-in | none (auth flow, free) | OPEN-PE-03 |
| Mailbox receipt (if proof) | one real email send/receive | within Cloudflare Email free tier | OPEN-PE-04 |
| Supabase export (if `exported`) | one-time logical export | none (Supabase-side, owner-managed) | OPEN-PE-01 |

**Closure adds no ongoing Cloudflare consumption.** It is a one-time, read-only,
free-tier-safe procedure.

## 20.3 What this plan does NOT cost

- No paid add-on enabled.
- No new binding, no new Workers Paid plan, no D1 paid, no R2 paid.
- No dedicated egress, no Smart Placement paid, no Analytics paid.
- No Supabase/Resend/Vercel spend (out of scope; owner-managed if they choose
  to retain/cancel).

## 20.4 Owner-approval gates (cost-related)

- None. Closure does not enable any paid resource. If the owner later chooses
  to cancel Supabase/Resend/Vercel (a separate action, gated on OPEN-PE-01),
  that may *reduce* external spend but is not a Cloudflare cost action and is
  not part of this plan.

## 20.5 No savings claim

This plan makes **no claim of cost savings**. It does not compare Cloudflare
vs Supabase/Vercel/Resend pricing. The provider-exit cost story (if any) lives
in the parent migration pack (`2026-06-29-Cloudflare-Migration-Codex`) and its
pricing snapshots, not here. This plan only confirms closure is free-tier-safe.
