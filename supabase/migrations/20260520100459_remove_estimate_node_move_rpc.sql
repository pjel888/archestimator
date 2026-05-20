-- Estimate-tree drag/drop reorganization has been removed from the product.
-- Drop the RPC that previously enabled persisted tree moves so authenticated
-- clients cannot keep using the old reorder path outside the UI.
drop function if exists public.move_estimate_nodes(uuid, jsonb);
