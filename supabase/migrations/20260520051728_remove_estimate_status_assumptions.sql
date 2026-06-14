-- Estimate sheets no longer track lifecycle status or free-text assumptions.

alter table public.estimates drop column if exists status;
alter table public.estimates drop column if exists assumptions;

drop type if exists public.estimate_status;
