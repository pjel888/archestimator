# Pending-review migrations — Shared Link Improvement Plan (Track T5 / T4 [DB])

**These `.sql` files are REVIEWED but DELIBERATELY NOT APPLIED.** They live OUTSIDE
`supabase/migrations/` so the Supabase CLI will **not** auto-apply them on
`supabase db push`. They were authored by an agent without a DB write channel
(Docker absent + hosted SQL by agents denied), per the plan's
`No DB write channel` constraint
(`.ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/14_IMPLEMENTATION_HANDOFF_PROMPT.md` §2.2).

A human DBA must: review each file, run its **pre-flight** checks, apply it in a
maintenance window, and then **move it into `supabase/migrations/`** with a fresh
timestamp prefix so the migration history stays canonical.

## Index

| File | AC | What it does | Risk |
|---|---|---|---|
| `AC-MOD-04_shared_link_responses_recipient_set_null.sql` | AC-MOD-04 | Make a recipient hard-delete preserve their locked decision row (`recipient_id` → `ON DELETE SET NULL`) instead of CASCADE-destroying it. | Low (additive nullability; mirrors the existing `shared_link_comments` behavior) |
| `AC-MOD-06_one_published_publication_per_project.sql` | AC-MOD-06 | Add a partial unique index so a project can never have two simultaneously-`published` publication rows (closes the rotate/create race window B). | Medium — requires de-duplicating any existing duplicates FIRST |
| `T4-database-pass.sql` | Track T4 (DB pass) | Index hygiene (P2/P4/P5), RLS-on-events (P3), telemetry retention (P1, pg_cron), rate-limit GC (P7, pg_cron), snapshot-size guardrail (P6); OPT-7/OPT-10 noted as larger follow-ups. Each section has its own pre-flight + rollback. | Low (additive) except the P2 index drops (gated on a verified-zero-scan pre-flight) |

## Application order

`AC-MOD-04` and `AC-MOD-06` are independent and can be applied in either order.
Each is additive and backward-compatible with the application code already shipped
on `claude/2026-06-13-Shared-Link-Improvement-Plan`:

- The app already shows a **confirmation dialog** before removing a recipient with a
  decision (AC-MOD-04 UI half is live); applying the SQL makes the underlying delete
  **non-destructive** to the decision row.
- The app already **rotates links in place** (AC-MOD-02), which removes the common
  source of duplicate-published rows; the partial unique index (AC-MOD-06) is the
  belt-and-suspenders DB guarantee.

## Track T4 (deferred DB pass)

The broader Track T4 design-ready DDL (index hygiene, RLS-on-events, event
retention via `pg_cron`, rate-limit GC, snapshot row de-dup, activity UNION RPC)
is specified in `05_DATABASE_AUDIT.md §4-A` and is **execution-deferred** under the
same no-DB-channel constraint. Add those files here when authored.
