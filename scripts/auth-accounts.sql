create table public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  created_at timestamptz not null default now()
);
alter table public.account_profiles enable row level security;
revoke all on public.account_profiles from anon, authenticated;
grant select, insert on public.account_profiles to authenticated;
grant update (display_name) on public.account_profiles to authenticated;
create policy profile_read_own on public.account_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profile_create_own on public.account_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profile_update_own on public.account_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);


alter table public.restaurants add column auth_owner_id uuid references auth.users(id) on delete restrict;
alter table public.restaurants add constraint restaurants_auth_owner_name_key unique (auth_owner_id, name);
alter table public.restaurants add constraint restaurants_name_length check (char_length(btrim(name)) between 2 and 100) not valid;
create index restaurants_auth_owner_created_idx on public.restaurants(auth_owner_id, created_at);
alter table public.restaurants enable row level security;
revoke all on public.restaurants from anon, authenticated;
grant select on public.restaurants to authenticated;
grant insert (auth_owner_id, name) on public.restaurants to authenticated;
grant update (name, description, address) on public.restaurants to authenticated;
create policy restaurant_read_own on public.restaurants for select to authenticated using ((select auth.uid()) = auth_owner_id);
create policy restaurant_create_own on public.restaurants for insert to authenticated with check ((select auth.uid()) = auth_owner_id);
create policy restaurant_update_own on public.restaurants for update to authenticated using ((select auth.uid()) = auth_owner_id) with check ((select auth.uid()) = auth_owner_id);

-- Existing tables are preserved. Their business workflows are not enabled in this auth milestone.
alter table public.foods enable row level security;
alter table public.reviews enable row level security;
revoke all on public.foods, public.reviews from anon, authenticated;
grant select on public.foods, public.reviews to authenticated;
create policy food_owner_read on public.foods for select to authenticated using (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid()))
);
create policy review_owner_read on public.reviews for select to authenticated using (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid()))
);
create index if not exists foods_restaurant_id_idx on public.foods(restaurant_id);
create index if not exists reviews_restaurant_id_idx on public.reviews(restaurant_id);
comment on column public.restaurants.auth_owner_id is 'Supabase Auth owner for new accounts. Legacy Firebase owner_id is preserved, never used for new authorization.';
comment on table public.account_profiles is 'Personal profiles. Passwords live only in Supabase Auth. No client-supplied role grants privileges.';

