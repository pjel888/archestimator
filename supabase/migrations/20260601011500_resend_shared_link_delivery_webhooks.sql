-- Resend delivery webhook reconciliation for shared-link recipient emails.
-- Additive only: stores provider message/event metadata on recipient rows so
-- webhook events can update the existing delivery_status chip.

alter table public.shared_link_recipients
  add column if not exists resend_email_id text,
  add column if not exists resend_last_event_id text,
  add column if not exists resend_last_event_type text,
  add column if not exists resend_last_event_at timestamptz,
  add column if not exists resend_delivery_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists shared_link_recipients_resend_email_id_idx
  on public.shared_link_recipients(resend_email_id)
  where resend_email_id is not null;

create index if not exists shared_link_recipients_resend_last_event_at_idx
  on public.shared_link_recipients(resend_last_event_at desc)
  where resend_last_event_at is not null;
