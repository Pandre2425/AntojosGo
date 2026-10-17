-- Moderation of reported reviews by app administrators (never by the restaurant).
-- app_admins: who moderates; no policies, so nobody reads or writes it through the API. Add admins in the SQL editor:
--   insert into public.app_admins (user_id) select id from auth.users where email = '...';
-- An admin keeps a reported review (clears the report) or hides it; hidden reviews leave lists and averages.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()))
$$;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

alter table public.dish_reviews add column if not exists hidden_at timestamptz;

-- Public reads and averages skip hidden reviews (same signatures as 20261017090000_dish_reviews.sql).
create or replace function public.get_dish_reviews(p_dish_id uuid, p_limit integer default 20, p_offset integer default 0)
returns table (rating smallint, comment text, reply text, replied_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select v.rating, v.comment, v.reply, v.replied_at, v.updated_at
    from public.dish_reviews v
    join public.foods f on f.id = v.dish_id and f.status = 'published'
   where v.dish_id = p_dish_id and v.hidden_at is null
     and exists (select 1 from public.restaurant_branches b where b.restaurant_id = f.restaurant_id and b.status = 'published')
   order by v.updated_at desc, v.id
   limit least(greatest(coalesce(p_limit, 20), 1), 50) offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function public.get_dish_ratings(p_dish_ids uuid[])
returns table (dish_id uuid, rating_avg numeric, rating_count integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select v.dish_id, round(avg(v.rating), 2), count(*)::int
    from public.dish_reviews v join public.foods f on f.id = v.dish_id and f.status = 'published'
   where v.dish_id = any((coalesce(p_dish_ids, '{}'::uuid[]))[1:300]) and v.hidden_at is null
   group by v.dish_id
$$;

create or replace function public.get_restaurant_ratings(p_ids uuid[])
returns table (restaurant_id uuid, rating_avg numeric, rating_count integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select f.restaurant_id, round(avg(v.rating), 2), count(*)::int
    from public.dish_reviews v join public.foods f on f.id = v.dish_id and f.status = 'published'
   where f.restaurant_id = any((coalesce(p_ids, '{}'::uuid[]))[1:100]) and v.hidden_at is null
     and exists (select 1 from public.restaurant_branches b where b.restaurant_id = f.restaurant_id and b.status = 'published')
   group by f.restaurant_id
$$;

create or replace function public.get_owner_reviews(p_restaurant_id uuid, p_limit integer default 50, p_offset integer default 0)
returns table (id uuid, dish_id uuid, dish_name text, rating smallint, comment text, reply text, replied_at timestamptz,
               reported_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select v.id, f.id, f.name::text, v.rating, v.comment, v.reply, v.replied_at, v.reported_at, v.updated_at
    from public.dish_reviews v
    join public.foods f on f.id = v.dish_id
    join public.restaurants r on r.id = f.restaurant_id
   where r.id = p_restaurant_id and r.auth_owner_id = (select auth.uid()) and v.hidden_at is null
   order by v.updated_at desc, v.id
   limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
$$;

-- Admin: reported (pending) and hidden reviews, newest report first. Empty for non-admins.
create or replace function public.get_reported_reviews()
returns table (id uuid, restaurant_name text, dish_name text, rating smallint, comment text, reply text,
               report_reason text, reported_at timestamptz, hidden_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select v.id, r.name::text, f.name::text, v.rating, v.comment, v.reply, v.report_reason, v.reported_at, v.hidden_at, v.updated_at
    from public.dish_reviews v
    join public.foods f on f.id = v.dish_id
    join public.restaurants r on r.id = f.restaurant_id
   where public.is_app_admin() and (v.reported_at is not null or v.hidden_at is not null)
   order by v.hidden_at is not null, v.reported_at desc nulls last, v.id
   limit 200
$$;

-- Admin action: 'keep' clears the report, 'hide' hides the review, 'unhide' shows it again. True when applied.
create or replace function public.moderate_review(p_review_id uuid, p_action text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_app_admin() then return false; end if;
  update public.dish_reviews set
      reported_at = case when p_action in ('keep', 'unhide') then null else reported_at end,
      report_reason = case when p_action in ('keep', 'unhide') then null else report_reason end,
      hidden_at = case p_action when 'hide' then now() when 'unhide' then null else hidden_at end
   where id = p_review_id and p_action in ('keep', 'hide', 'unhide');
  return found;
end $$;

revoke all on function public.get_reported_reviews(), public.moderate_review(uuid, text) from public, anon;
grant execute on function public.get_reported_reviews(), public.moderate_review(uuid, text) to authenticated;
