# Checklist: T4 Shared-Link DB Hygiene

- [x] Read startup docs and task prompt.
- [x] Recorded starting `git status --short`.
- [x] Split T4 into independent units.
- [x] Added preflight, post-check, and rollback for each unit.
- [x] Marked `pg_cron` work as provider-gated.
- [x] Marked index drops as zero-scan/EXPLAIN gated.
- [x] Kept OPT-7 and OPT-10 out of implementation scope.
- [x] Ran diff/static checks or documented blockers.
- [x] Updated same-folder reports.
- [x] Updated `PASS_STATUS.md` with final result and proof boundary.
- [x] Appended this pass to `PASS_HISTORY.md` without rewriting older entries.
- [x] Renamed folder with pass-result prefix or documented safe-rename blocker in `BLOCKERS.md`.
