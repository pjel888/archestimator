-- The original linked-provider scan lifecycle migration was missing this
-- readback timestamp column even though the local contract records it.

alter table public.upload_assets
  add column if not exists scanned_at timestamptz;

select pg_notify('pgrst', 'reload schema');
