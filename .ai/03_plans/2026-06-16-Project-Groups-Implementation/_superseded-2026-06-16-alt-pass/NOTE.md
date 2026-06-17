# Superseded — alternate planning pass (2026-06-16)

These three files were produced by a **second AI agent** that ran its own Project Groups
planning pass in this directory concurrently (~18:39–18:47 on 2026-06-16), while the
canonical multi-agent pass was waiting on the owner's product decisions.

- `07-implementation-plan.md` — a concise work-unit plan (W1–W5).
- `08-traceability-and-qa-matrix.md` — a requirement→task→test matrix.
- `09-implementation-agent-handoff.md` — a crisp implementer handoff.

## Why archived, not deleted

**They converged on the same architecture** as the canonical pack (per-user;
`project_groups` + `project_group_memberships`; no `projects.group_id`; no SECURITY DEFINER;
organize-by None/Date/Group; date-mode DOM-compatible; card kebab + bulk dock; virtual
"Ungrouped" pinned last; identical fast-follow list). That independent agreement is a useful
validation signal, so the work is preserved for provenance.

## Why superseded

1. **They predate the owner's decisions.** Their handoff lists **"Color picker UI" as a
   fast-follow** — i.e. they assumed the *colorless-first* default. The owner **overrode that:
   accents ship in v1** (see `../00-synthesis-and-decisions.md` §4 / D13). So these docs are
   stale on Q3.
2. **Numbering collision.** Their `07/08/09` clashed with the canonical pack's `07`–`12`.
3. **Depth.** The canonical pack carries a contracts spine + four detailed TDD build-phase
   plans (~5,500 lines) bound to the locked decisions, plus an adversarial-review record.

**Canonical source of truth:** the `00`–`12` + `README.md` pack one level up. Do not implement
from the files in this folder.
