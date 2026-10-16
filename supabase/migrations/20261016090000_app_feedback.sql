-- App rating (1–5) with an optional suggestion. One per account, editable; owner-only via RLS.
-- Read the results with the SQL editor / service role (no public read).

create table if not exists public.app_feedback (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  platform text not null check (platform in ('web', 'android')),
  app_version text check (char_length(app_version) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_feedback enable row level security;
comment on table public.app_feedback is 'App rating 1-5 and optional suggestion; one row per account.';

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_feedback' and policyname = 'app_feedback_select_own') then
    create policy app_feedback_select_own on public.app_feedback for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_feedback' and policyname = 'app_feedback_insert_own') then
    create policy app_feedback_insert_own on public.app_feedback for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_feedback' and policyname = 'app_feedback_update_own') then
    create policy app_feedback_update_own on public.app_feedback for update to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
end $$;

revoke all on public.app_feedback from anon, authenticated;
grant select on public.app_feedback to authenticated;
grant insert (rating, comment, platform, app_version, updated_at), update (rating, comment, platform, app_version, updated_at) on public.app_feedback to authenticated;
