# Checklist: T4 Shared-Link DB Hygiene

- [ ] Read startup docs and task prompt.
- [ ] Recorded starting `git status --short`.
- [ ] Split T4 into independent units.
- [ ] Added preflight, post-check, and rollback for each unit.
- [ ] Marked `pg_cron` work as provider-gated.
- [ ] Marked index drops as zero-scan/EXPLAIN gated.
- [ ] Kept OPT-7 and OPT-10 out of implementation scope.
- [ ] Ran diff/static checks or documented blockers.
- [ ] Updated same-folder reports.
- [ ] Updated `PASS_STATUS.md` with final result and proof boundary.
- [ ] Appended this pass to `PASS_HISTORY.md` without rewriting older entries.
- [ ] Renamed folder with pass-result prefix or documented safe-rename blocker in `BLOCKERS.md`.
