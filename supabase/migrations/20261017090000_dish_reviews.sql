-- Dish reviews: whole stars 1–5 and an optional comment, one per account and dish (editable).
-- Shown anonymously. The restaurant shows the average of its dishes. Owners can reply once (editable)
-- and report, never delete or hide. Diners never read the table directly: public reads go through
-- SECURITY DEFINER functions that return no author.

create table if not exists public.dish_reviews (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.foods (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  reply text check (char_length(reply) <= 1000),
  replied_at timestamptz,
  reported_at timestamptz,
  report_reason text check (char_length(report_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dish_id, user_id)
);
create index if not exists dish_reviews_dish_idx on public.dish_reviews (dish_id, updated_at desc);
create index if not exists dish_reviews_user_idx on public.dish_reviews (user_id);
alter table public.dish_reviews enable row level security;
comment on table public.dish_reviews is 'Dish reviews (1-5 whole stars). Public reads only via get_dish_reviews / get_*_ratings.';

-- A diner may review a published dish of a restaurant with a published branch, never their own restaurant's.
create or replace function public.can_review_dish(p_dish_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.foods f join public.restaurants r on r.id = f.restaurant_id
     where f.id = p_dish_id and f.status = 'published'
       and r.auth_owner_id is distinct from (select auth.uid())
       and exists (select 1 from public.restaurant_branches b where b.restaurant_id = r.id and b.status = 'published'))
$$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dish_reviews' and policyname = 'dish_reviews_select_own') then
    create policy dish_reviews_select_own on public.dish_reviews for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dish_reviews' and policyname = 'dish_reviews_insert_own') then
    create policy dish_reviews_insert_own on public.dish_reviews for insert to authenticated
      with check (user_id = (select auth.uid()) and public.can_review_dish(dish_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dish_reviews' and policyname = 'dish_reviews_update_own') then
    create policy dish_reviews_update_own on public.dish_reviews for update to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dish_reviews' and policyname = 'dish_reviews_delete_own') then
    create policy dish_reviews_delete_own on public.dish_reviews for delete to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;

-- Diners write only their own rating/comment; reply and report columns are set by the owner functions below.
revoke all on public.dish_reviews from anon, authenticated;
grant select, delete on public.dish_reviews to authenticated;
grant insert (dish_id, rating, comment, updated_at), update (rating, comment, updated_at) on public.dish_reviews to authenticated;

-- Public: reviews of a public dish, newest first, without author.
create or replace function public.get_dish_reviews(p_dish_id uuid, p_limit integer default 20, p_offset integer default 0)
returns table (rating smallint, comment text, reply text, replied_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select v.rating, v.comment, v.reply, v.replied_at, v.updated_at
    from public.dish_reviews v
    join public.foods f on f.id = v.dish_id and f.status = 'published'
   where v.dish_id = p_dish_id
     and exists (select 1 from public.restaurant_branches b where b.restaurant_id = f.restaurant_id and b.status = 'published')
   order by v.updated_at desc, v.id
   limit least(greatest(coalesce(p_limit, 20), 1), 50) offset greatest(coalesce(p_offset, 0), 0)
$$;

-- Public: average and count per dish / per restaurant (all its public dishes).
create or replace function public.get_dish_ratings(p_dish_ids uuid[])
returns table (dish_id uuid, rating_avg numeric, rating_count integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select v.dish_id, round(avg(v.rating), 2), count(*)::int
    from public.dish_reviews v join public.foods f on f.id = v.dish_id and f.status = 'published'
   where v.dish_id = any((coalesce(p_dish_ids, '{}'::uuid[]))[1:300])
   group by v.dish_id
$$;

create or replace function public.get_restaurant_ratings(p_ids uuid[])
returns table (restaurant_id uuid, rating_avg numeric, rating_count integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select f.restaurant_id, round(avg(v.rating), 2), count(*)::int
    from public.dish_reviews v join public.foods f on f.id = v.dish_id and f.status = 'published'
   where f.restaurant_id = any((coalesce(p_ids, '{}'::uuid[]))[1:100])
     and exists (select 1 from public.restaurant_branches b where b.restaurant_id = f.restaurant_id and b.status = 'published')
   group by f.restaurant_id
$$;

-- Owner: all reviews of their restaurant's dishes.
create or replace function public.get_owner_reviews(p_restaurant_id uuid, p_limit integer default 50, p_offset integer default 0)
returns table (id uuid, dish_id uuid, dish_name text, rating smallint, comment text, reply text, replied_at timestamptz,
               reported_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select v.id, f.id, f.name::text, v.rating, v.comment, v.reply, v.replied_at, v.reported_at, v.updated_at
    from public.dish_reviews v
    join public.foods f on f.id = v.dish_id
    join public.restaurants r on r.id = f.restaurant_id
   where r.id = p_restaurant_id and r.auth_owner_id = (select auth.uid())
   order by v.updated_at desc, v.id
   limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
$$;

-- Owner: public reply (empty text removes it) and report. True when the review belongs to their restaurant.
create or replace function public.reply_to_review(p_review_id uuid, p_reply text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
begin
  if char_length(v_reply) > 1000 then raise exception 'reply too long' using errcode = '22001'; end if;
  update public.dish_reviews v set reply = v_reply, replied_at = case when v_reply is null then null else now() end
    from public.foods f join public.restaurants r on r.id = f.restaurant_id
   where v.id = p_review_id and f.id = v.dish_id and r.auth_owner_id = (select auth.uid());
  return found;
end $$;

create or replace function public.report_review(p_review_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 300);
begin
  update public.dish_reviews v set reported_at = now(), report_reason = v_reason
    from public.foods f join public.restaurants r on r.id = f.restaurant_id
   where v.id = p_review_id and f.id = v.dish_id and r.auth_owner_id = (select auth.uid());
  return found;
end $$;

revoke all on function public.can_review_dish(uuid), public.get_dish_reviews(uuid, integer, integer), public.get_dish_ratings(uuid[]),
  public.get_restaurant_ratings(uuid[]), public.get_owner_reviews(uuid, integer, integer), public.reply_to_review(uuid, text),
  public.report_review(uuid, text) from public, anon;
grant execute on function public.get_dish_reviews(uuid, integer, integer), public.get_dish_ratings(uuid[]),
  public.get_restaurant_ratings(uuid[]) to anon, authenticated;
grant execute on function public.can_review_dish(uuid), public.get_owner_reviews(uuid, integer, integer),
  public.reply_to_review(uuid, text), public.report_review(uuid, text) to authenticated;
