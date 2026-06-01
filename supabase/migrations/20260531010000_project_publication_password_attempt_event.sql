-- Align the legacy publication event enum with the password hardening route.
-- The shared_link_events table stores password_attempt as text, but
-- project_publication_events uses this enum.

alter type public.project_publication_event_type
  add value if not exists 'password_attempt';
