-- Shared-link provider performance gate read-only EXPLAIN capture.
-- Target project: ebxxqidacheyapmmzavr.
-- This file intentionally avoids mutating statements with ANALYZE.
-- SELECT paths use EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON).
-- DELETE/UPDATE-shaped paths use EXPLAIN (BUFFERS, FORMAT JSON) only.

explain (analyze, buffers, format json)
with sample as (
  select token_hash
  from public.project_publications
  where token_hash is not null
  limit 1
)
select id, status, revoked_at, expires_at, password_hash, snapshot_json, snapshot_version
from public.project_publications
where token_hash = (select token_hash from sample)
limit 1;

explain (buffers, format json)
delete from public.security_rate_limit_events
where expires_at <= now();

explain (analyze, buffers, format json)
with sample as (
  select scope, key_hash
  from public.security_rate_limit_events
  limit 1
)
select count(*)::integer
from public.security_rate_limit_events
where scope = coalesce((select scope from sample), 'perf-oracle-empty-scope')
  and key_hash = coalesce((select key_hash from sample), 'perf-oracle-empty-hash')
  and occurred_at >= now() - interval '1 minute';

explain (analyze, buffers, format json)
with sample as (
  select publication_id
  from public.shared_link_comments
  limit 1
)
select id, publication_id, created_at
from public.shared_link_comments
where publication_id = coalesce((select publication_id from sample), '00000000-0000-0000-0000-000000000000'::uuid)
  and is_internal = false
order by created_at desc
limit 101;

explain (buffers, format json)
with sample as (
  select id
  from public.project_publications
  limit 1
)
update public.shared_link_recipients
set
  recipient_token_hash = recipient_token_hash,
  delivery_status = 'pending',
  resend_email_id = null,
  resend_last_event_at = null,
  resend_last_event_type = null,
  updated_at = now()
where publication_id = (select id from sample);
