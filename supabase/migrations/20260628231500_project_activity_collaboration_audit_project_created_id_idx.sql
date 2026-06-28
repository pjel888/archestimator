create index if not exists collaboration_audit_events_project_created_id_idx
  on public.collaboration_audit_events(project_id, created_at desc, id desc);
