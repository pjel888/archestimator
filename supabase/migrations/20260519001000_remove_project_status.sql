-- Project status is not part of the project model.
-- Estimate status remains unchanged through public.estimate_status.

alter table public.projects drop column if exists status;
