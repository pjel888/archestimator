-- Phase 0 upload containment: force component uploads through server-mediated routes.
-- Broad direct authenticated writes bypass validation, scanning, and lifecycle gates.

drop policy if exists "project editors can upload own project images" on storage.objects;
drop policy if exists "project editors can update own project images" on storage.objects;
drop policy if exists "project editors can delete own project images" on storage.objects;

drop policy if exists "workspace members can upload own component images" on storage.objects;
drop policy if exists "workspace members can update own component images" on storage.objects;
drop policy if exists "workspace members can delete own component images" on storage.objects;

drop policy if exists "workspace members can upload own component attachments" on storage.objects;
drop policy if exists "workspace members can update own component attachments" on storage.objects;
drop policy if exists "workspace members can delete own component attachments" on storage.objects;

-- Until brokered download + malware scanning exists, pending attachments must
-- not be directly readable from Supabase Storage.
drop policy if exists "workspace members can read component attachments" on storage.objects;
