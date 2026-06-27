-- Component library images are now served through app-brokered resolver routes.
-- Filename uses the linked-provider migration ledger version assigned by the
-- Supabase connector; the embedded name preserves the planned local timestamp.
-- The linked provider aggregate scan found no persisted legacy public
-- component-image URLs before this bucket privacy flip.

update storage.buckets
set public = false
where id = 'component-images';

drop policy if exists "component images are publicly readable" on storage.objects;
