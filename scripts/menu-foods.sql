-- Sprint 1: unify menu on public.foods (canonical per auth-accounts.sql / EXECUTION-PLAN).
-- Apply in Supabase SQL editor. Idempotent where possible.
-- Owner isolation stays via restaurants.auth_owner_id.

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text,
  ingredients text[] not null default '{}',
  category text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  is_special boolean not null default false,
  allergens text[] not null default '{}',
  dietary_info text[] not null default '{}',
  preparation_time integer,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.foods add column if not exists ingredients text[] not null default '{}';
alter table public.foods add column if not exists category text;
alter table public.foods add column if not exists price numeric(10,2);
alter table public.foods add column if not exists image_url text;
alter table public.foods add column if not exists is_available boolean not null default true;
alter table public.foods add column if not exists is_special boolean not null default false;
alter table public.foods add column if not exists allergens text[] not null default '{}';
alter table public.foods add column if not exists dietary_info text[] not null default '{}';
alter table public.foods add column if not exists preparation_time integer;
alter table public.foods add column if not exists status text;
alter table public.foods add column if not exists created_at timestamptz not null default now();
alter table public.foods add column if not exists updated_at timestamptz not null default now();

-- Backfill status from is_available when status is null
update public.foods set status = case when coalesce(is_available, false) then 'published' else 'draft' end
where status is null;

alter table public.foods alter column status set default 'draft';
-- Enforce check when safe (may fail if dirty data; run after backfill)
do $$ begin
  alter table public.foods add constraint foods_status_check check (status in ('draft','published'));
exception when duplicate_object then null;
end $$;

create index if not exists foods_restaurant_id_idx on public.foods(restaurant_id);
create index if not exists foods_restaurant_status_idx on public.foods(restaurant_id, status);

alter table public.foods enable row level security;
revoke all on public.foods from anon, authenticated;

grant select, insert, update, delete on public.foods to authenticated;

-- Drop/recreate owner policies for full CRUD (keep isolation)
drop policy if exists food_owner_read on public.foods;
drop policy if exists food_owner_insert on public.foods;
drop policy if exists food_owner_update on public.foods;
drop policy if exists food_owner_delete on public.foods;

create policy food_owner_read on public.foods for select to authenticated using (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid()))
);
create policy food_owner_insert on public.foods for insert to authenticated with check (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid()))
);
create policy food_owner_update on public.foods for update to authenticated using (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid()))
);
create policy food_owner_delete on public.foods for delete to authenticated using (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.auth_owner_id = (select auth.uid()))
);

comment on table public.foods is 'Canonical menu items. status draft|published; is_available mirrors published for legacy adapters.';
