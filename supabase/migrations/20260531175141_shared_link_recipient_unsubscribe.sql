-- Shared-link recipient unsubscribe suppression.
-- Additive only: preserves existing delivery_status values while letting
-- transactional recipient sends skip rows that opted out of follow-up email.

alter table public.shared_link_recipients
  add column if not exists email_unsubscribed_at timestamptz;

create index if not exists shared_link_recipients_email_unsubscribed_idx
  on public.shared_link_recipients(publication_id, email_unsubscribed_at desc)
  where email_unsubscribed_at is not null;
