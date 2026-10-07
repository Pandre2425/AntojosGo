-- Menu (F02): reconcile remote public.foods with the code and allow owner CRUD.
-- Remote table had only: id, restaurant_id, name, description, price, image_url, created_at,
-- policy food_owner_read and SELECT-only for authenticated. Replaces scripts/menu-foods.sql
-- (its CREATE TABLE IF NOT EXISTS never added constraints to the existing table).
-- Idempotent. Drafts and hidden dishes stay owner-only; no public read yet.

alter table public.foods alter column restaurant_id set not null;
alter table public.foods add column if not exists category text;
alter table public.foods add column if not exists ingredients text[] not null default '{}';
alter table public.foods add column if not exists allergens text[] not null default '{}';
alter table public.foods add column if not exists dietary_info text[] not null default '{}';
alter table public.foods add column if not exists is_available boolean not null default true;
alter table public.foods add column if not exists is_special boolean not null default false;
alter table public.foods add column if not exists preparation_time integer;
alter table public.foods add column if not exists status text not null default 'draft';
alter table public.foods add column if not exists updated_at timestamptz not null default now();

-- Constraints are added NOT VALID so legacy rows can't block the migration, then validated
-- when the data allows; new/updated rows are always checked.
do $$
declare c record;
begin
  for c in select * from (values
    ('foods_name_check', 'check (char_length(btrim(name)) between 1 and 120)'),
    ('foods_price_check', 'check (price > 0 and price < 100000)'),
    ('foods_status_check', 'check (status in (''draft'',''published''))'),
    ('foods_category_check', 'check (category is null or char_length(btrim(category)) between 1 and 60)'),
    ('foods_description_check', 'check (description is null or char_length(description) <= 500)'),
    ('foods_preparation_time_check', 'check (preparation_time is null or preparation_time between 1 and 600)')
  ) as t(name, def) loop
    if not exists (select 1 from pg_constraint where conname = c.name and conrelid = 'public.foods'::regclass) then
      execute format('alter table public.foods add constraint %I %s not valid', c.name, c.def);
    end if;
    begin
      execute format('alter table public.foods validate constraint %I', c.name);
    exception when check_violation then
      raise notice 'foods: % left NOT VALID (legacy rows violate it)', c.name;
    end;
  end loop;
end $$;

create index if not exists foods_restaurant_idx on public.foods(restaurant_id, category, name);

create or replace function public.foods_touch_updated_at() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists foods_touch_updated_at on public.foods;
create trigger foods_touch_updated_at before update on public.foods
for each row execute function public.foods_touch_updated_at();

alter table public.foods enable row level security;
revoke all on public.foods from anon, authenticated;
grant select, delete on public.foods to authenticated;
grant insert (restaurant_id, name, description, price, category, ingredients, allergens, dietary_info,
  is_available, is_special, preparation_time, status) on public.foods to authenticated;
-- restaurant_id, image_url, created_at and updated_at are not client-updatable.
grant update (name, description, price, category, ingredients, allergens, dietary_info,
  is_available, is_special, preparation_time, status) on public.foods to authenticated;

drop policy if exists food_owner_read on public.foods;
drop policy if exists food_owner_insert on public.foods;
drop policy if exists food_owner_update on public.foods;
drop policy if exists food_owner_delete on public.foods;
create policy food_owner_read on public.foods for select to authenticated using (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid())));
create policy food_owner_insert on public.foods for insert to authenticated with check (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid())));
create policy food_owner_update on public.foods for update to authenticated using (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid())));
create policy food_owner_delete on public.foods for delete to authenticated using (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid())));

comment on table public.foods is 'Menu items, owner-only. status draft|published; is_available = temporarily out of stock toggle.';
