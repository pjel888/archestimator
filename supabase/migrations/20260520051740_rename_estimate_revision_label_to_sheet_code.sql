-- Rename estimate revision label to sheet code for clearer estimate-sheet table language.
alter table public.estimates
  rename column revision_label to sheet_code;
