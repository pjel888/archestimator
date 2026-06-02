create table if not exists public.beta_feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  user_email text not null,
  feedback_type text not null check (feedback_type in ('bug', 'confusing_ux', 'missing_feature', 'export_issue', 'estimate_accuracy', 'other')),
  severity text not null check (severity in ('blocker', 'high', 'medium', 'low')),
  page_path text,
  message text not null check (char_length(trim(message)) between 10 and 4000),
  metadata_json jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists beta_feedback_submissions_set_updated_at on public.beta_feedback_submissions;
create trigger beta_feedback_submissions_set_updated_at
  before update on public.beta_feedback_submissions
  for each row execute function public.set_updated_at();

create index if not exists beta_feedback_submissions_created_at_idx
  on public.beta_feedback_submissions(created_at desc);

create index if not exists beta_feedback_submissions_user_created_at_idx
  on public.beta_feedback_submissions(user_id, created_at desc);

alter table public.beta_feedback_submissions enable row level security;

revoke all on public.beta_feedback_submissions from anon;
revoke all on public.beta_feedback_submissions from authenticated;

grant insert on public.beta_feedback_submissions to authenticated;

drop policy if exists "beta_feedback_submissions_insert_own" on public.beta_feedback_submissions;
create policy "beta_feedback_submissions_insert_own"
  on public.beta_feedback_submissions
  for insert
  to authenticated
  with check (auth.uid() = user_id);
