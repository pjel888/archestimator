# UNIT-016 — Performance Budget Doc References Postgres/Vercel/Supabase-Era Assumptions · PERF-DOC-002

**Finding:** PERF-DOC-002 · **Priority:** P3 · **Wave:** 4 (W4-4) · **Effort:** S · **Risk:** Low
**Roadmap item:** W4-4 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

The performance budget doc is a single-source-of-truth Cloudflare/D1 document
with zero references to Vercel/Supabase/Postgres-era assumptions. Agents
extending the doc inherit consistent guidance.

## Affected surface

- `.ai/01_roadmap/27-performance-budget-and-regression-gates.md`
  - `:25` — "Vercel Functions have 60s max (Hobby)"
  - `:183` — `@supabase/ssr` as "acceptable in main bundle"
  - `:226` — `security_rate_limit_events` documented as a "Postgres table"

## Dependencies

- None for the doc change.
- No AUTH_BOUNDARY items.

## Implementation intent

From PERF-DOC-002 "Recommendation":

- Sweep the doc for Vercel / Supabase / Postgres references; replace with
  Cloudflare Workers / D1 / R2 / Queues / DOs equivalents.
- Specifically:
  - `:25` — replace the Vercel function-time reference with the Cloudflare
    Workers CPU/wall-clock limits.
  - `:183` — remove the `@supabase/ssr` guidance (provider exit completed);
    note any Cloudflare-auth equivalent if relevant.
  - `:226` — `security_rate_limit_events` is a D1 table now; correct the
    "Postgres table" label.

Constraints (from finding): **preserve the numeric budgets themselves** —
they remain useful as hypotheses. Only the provider-era language changes.

## Expected evidence

Verification command from PERF-DOC-002 "Verification":

```
grep -nE 'Vercel|supabase|Postgres' .ai/01_roadmap/27-performance-budget-and-regression-gates.md
# returns zero hits after sweep
```

Evidence class: `NOT_REQUIRED` (the grep returning zero hits is the decisive
non-test signal). The numeric budgets are unchanged.

## Completion signal

`grep -nE 'Vercel|supabase|Postgres'` on the budget doc returns zero hits,
and the three cited locations (`:25`, `:183`, `:226`) carry Cloudflare/D1
equivalents.

## Recovery path

Not required (Risk: Low). `git revert` the sweep if a provider-era reference
turns out to be load-bearing (unlikely — the runtime is Cloudflare/D1).
