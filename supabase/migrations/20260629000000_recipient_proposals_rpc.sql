-- Recipient proposals inbox RPCs.
-- Lets a signed-in user list and open publications sent to their verified email
-- without exposing share tokens, token hashes, encrypted tokens, or password hashes.

create index if not exists shared_link_recipients_lower_email_idx
  on public.shared_link_recipients (lower(email));

create or replace function public.list_recipient_publications_for_current_user(page_limit integer default 50)
returns table (
  publication_id uuid,
  project_id uuid,
  project_name text,
  project_code text,
  workspace_id uuid,
  workspace_name text,
  sender_display_name text,
  status text,
  has_opened boolean,
  decision text,
  last_activity_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  snapshot_version integer
)
language sql
stable
security definer
set search_path = public
as $$
  with identity as (
    select
      auth.uid() as user_id,
      nullif(lower(auth.email()), '') as email
  ),
  bounds as (
    select least(greatest(coalesce(page_limit, 50), 1), 100) as row_limit
  ),
  recipient_publications as (
    select
      publication.id as publication_id,
      publication.project_id,
      project.name as project_name,
      project.project_code,
      publication.workspace_id,
      workspace.name as workspace_name,
      nullif(trim(sender.display_name), '') as sender_display_name,
      case
        when publication.status = 'revoked' or publication.revoked_at is not null then 'revoked'
        when publication.status = 'expired' or (publication.expires_at is not null and publication.expires_at <= now()) then 'expired'
        else 'published'
      end as status,
      recipient.last_opened_at is not null as has_opened,
      response.decision,
      greatest(
        publication.published_at,
        coalesce(recipient.last_opened_at, publication.published_at),
        coalesce(response.created_at, publication.published_at),
        coalesce(publication.revoked_at, publication.published_at),
        case
          when publication.expires_at is not null and publication.expires_at <= now()
            then publication.expires_at
          else publication.published_at
        end
      ) as last_activity_at,
      publication.published_at,
      publication.expires_at,
      publication.revoked_at,
      publication.snapshot_version
    from identity
    join public.shared_link_recipients recipient
      on lower(recipient.email) = identity.email
    join public.project_publications publication
      on publication.id = recipient.publication_id
    join public.projects project
      on project.id = publication.project_id
     and project.workspace_id = publication.workspace_id
    join public.workspaces workspace
      on workspace.id = publication.workspace_id
    left join public.profiles sender
      on sender.id = publication.published_by
    left join lateral (
      select shared_link_response.decision, shared_link_response.created_at
      from public.shared_link_responses shared_link_response
      where shared_link_response.publication_id = publication.id
        and shared_link_response.recipient_id = recipient.id
      order by shared_link_response.created_at desc
      limit 1
    ) response on true
    where identity.user_id is not null
      and identity.email is not null
      and publication.status in ('published', 'expired', 'revoked')
  )
  select
    publication_id,
    project_id,
    project_name,
    project_code,
    workspace_id,
    workspace_name,
    sender_display_name,
    status,
    has_opened,
    decision,
    last_activity_at,
    published_at,
    expires_at,
    revoked_at,
    snapshot_version
  from recipient_publications
  order by last_activity_at desc, published_at desc, publication_id desc
  limit (select row_limit from bounds);
$$;

create or replace function public.authorize_recipient_publication_for_current_user(p_publication_id uuid)
returns table (
  publication_id uuid,
  recipient_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    publication.id as publication_id,
    recipient.id as recipient_id
  from public.shared_link_recipients recipient
  join public.project_publications publication
    on publication.id = recipient.publication_id
  where auth.uid() is not null
    and nullif(lower(auth.email()), '') is not null
    and lower(recipient.email) = lower(auth.email())
    and recipient.publication_id = p_publication_id
    and publication.status in ('published', 'expired', 'revoked')
  limit 1;
$$;

revoke all on function public.list_recipient_publications_for_current_user(integer) from public, anon, authenticated;
revoke all on function public.authorize_recipient_publication_for_current_user(uuid) from public, anon, authenticated;
grant execute on function public.list_recipient_publications_for_current_user(integer) to authenticated;
grant execute on function public.authorize_recipient_publication_for_current_user(uuid) to authenticated;
