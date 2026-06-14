select
  conname,
  confdeltype
from pg_constraint
where conname = 'shared_link_responses_recipient_id_fkey';
