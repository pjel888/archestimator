-- Reset Luna Heights Residence estimate contents before rebuilding the tree model.
-- Preserves Philip's private demo project, baseline estimate shell, and reusable cost library.
-- Deletes the estimate sheet/tree content so the next seed can rebuild from the refined contract:
-- General Nodes -> General Nodes / Area Nodes; Area Nodes -> Cost Estimate Nodes only.

do $$
begin
  delete from public.estimate_row_items
  where estimate_id = '33333333-3333-4333-8333-333333333333';

  delete from public.estimate_nodes
  where estimate_id = '33333333-3333-4333-8333-333333333333';
end $$;
