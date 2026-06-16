-- Harden notification action hrefs so browser-normalized dot segments cannot
-- escape the intended /workshop route boundary.

alter table public.notification_definitions
  drop constraint if exists notification_definitions_action_href_check;

alter table public.notification_definitions
  add constraint notification_definitions_action_href_check
  check (
    action_href is null
    or (
      action_href ~ '^/workshop(/|$|\?)'
      and action_href !~* '(^//|[[:space:]]|javascript:|https?:|%2f|%5c|(^|/)(\.|%2e){2}(/|\?|#|$))'
    )
  );
