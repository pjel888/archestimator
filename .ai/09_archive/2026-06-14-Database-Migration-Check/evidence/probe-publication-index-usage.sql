select
  schemaname,
  relname,
  indexrelname,
  idx_scan
from pg_stat_user_indexes
where indexrelname in (
  'project_publications_token_hash_idx',
  'shared_link_recipients_token_hash_idx'
)
order by indexrelname;
