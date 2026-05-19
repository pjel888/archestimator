-- Project status is not part of the project model.
-- Estimate status was later removed by 20260519100903_remove_estimate_status_assumptions.sql.

alter table public.projects drop column if exists status;
