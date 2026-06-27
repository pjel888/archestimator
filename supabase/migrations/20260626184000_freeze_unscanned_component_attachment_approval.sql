-- Component attachments are private and scanner-gated. Until the scanner
-- lifecycle is fully active, keep the governance approval path fail-closed so
-- no unscanned attachment can become the current approved document.

create or replace function public.approve_cost_library_attachment(
  target_attachment_id uuid,
  expected_review_revision integer,
  target_applicable_cost_entry_id uuid default null,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Component attachment approval is disabled until upload scanning is enabled.'
    using errcode = 'P0001';
end;
$$;

create or replace function public.supersede_cost_library_attachment(
  target_attachment_id uuid,
  replacement_attachment_id uuid,
  expected_review_revision integer,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Component attachment approval is disabled until upload scanning is enabled.'
    using errcode = 'P0001';
end;
$$;

revoke execute on function public.approve_cost_library_attachment(uuid, integer, uuid, text) from public, anon;
revoke execute on function public.supersede_cost_library_attachment(uuid, uuid, integer, text) from public, anon;

grant execute on function public.approve_cost_library_attachment(uuid, integer, uuid, text) to authenticated;
grant execute on function public.supersede_cost_library_attachment(uuid, uuid, integer, text) to authenticated;
