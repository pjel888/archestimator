alter table public.estimate_row_items
  drop constraint if exists estimate_row_items_contingency_percentage_check;

alter table public.estimate_row_items
  add constraint estimate_row_items_contingency_percentage_check
  check (contingency_percentage >= -100 and contingency_percentage <= 100);

alter table public.estimate_template_row_items
  drop constraint if exists estimate_template_row_items_contingency_percentage_check;

alter table public.estimate_template_row_items
  add constraint estimate_template_row_items_contingency_percentage_check
  check (contingency_percentage >= -100 and contingency_percentage <= 100);
