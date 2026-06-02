-- Lock down shared-link recipient bearer credentials.
-- Managers only need display/delivery fields; recipient_token_hash is credential material
-- used by server-side publication flows and must not be readable through the Data API.

revoke all on table public.shared_link_recipients from public, anon, authenticated;

grant select (
  id,
  publication_id,
  email,
  display_name,
  email_unsubscribed_at,
  invited_by,
  invited_at,
  delivery_status,
  last_opened_at,
  resend_email_id,
  resend_last_event_at,
  resend_last_event_type,
  created_at,
  updated_at
) on table public.shared_link_recipients to authenticated;

-- These RPCs accept hashed recipient credentials. They are intentionally callable
-- only through server-side service-role repository functions that first verify a
-- raw recipient token/session and look up the hash internally.
revoke all on function public.insert_client_comment(text, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_client_response(text, text, text, text) from public, anon, authenticated;
grant execute on function public.insert_client_comment(text, text, uuid, uuid, text) to service_role;
grant execute on function public.submit_client_response(text, text, text, text) to service_role;
