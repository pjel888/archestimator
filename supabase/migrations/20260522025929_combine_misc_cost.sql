alter table public.estimate_row_items
  add column misc_cost numeric(14, 2) not null default 0 check (misc_cost >= 0);

update public.estimate_row_items
set misc_cost = coalesce(supplementary_cost, 0) + coalesce(labor_cost, 0);

alter table public.cost_library_items
  add column misc_cost numeric(14, 2) not null default 0 check (misc_cost >= 0);

update public.cost_library_items
set misc_cost = coalesce(supplementary_cost, 0) + coalesce(labor_cost, 0);

alter table public.estimate_row_items
  drop column supplementary_cost,
  drop column labor_cost;

alter table public.cost_library_items
  drop column supplementary_cost,
  drop column labor_cost;
