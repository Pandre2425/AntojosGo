create table public.restaurant_branches (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  department text not null check (char_length(btrim(department)) between 2 and 100),
  municipality text not null check (char_length(btrim(municipality)) between 2 and 100),
  address text not null check (char_length(btrim(address)) between 5 and 300),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  status text not null default 'draft' check (status in ('draft','published','inactive')),
  created_at timestamptz not null default now(),
  constraint branch_coordinate_pair check ((latitude is null) = (longitude is null)),
  constraint branch_name_per_business unique (restaurant_id, name)
);
create index restaurant_branches_business_idx on public.restaurant_branches(restaurant_id,created_at,id);
alter table public.restaurant_branches enable row level security;
revoke all on public.restaurant_branches from anon, authenticated;
grant select on public.restaurant_branches to authenticated;
grant insert(id,restaurant_id,name,department,municipality,address) on public.restaurant_branches to authenticated;
grant update(name,department,municipality,address) on public.restaurant_branches to authenticated;
create policy branches_read_own on public.restaurant_branches for select to authenticated
using (exists(select 1 from public.restaurants r where r.id=restaurant_id and r.auth_owner_id=(select auth.uid())));
create policy branches_create_own on public.restaurant_branches for insert to authenticated
with check (exists(select 1 from public.restaurants r where r.id=restaurant_id and r.auth_owner_id=(select auth.uid())));
create policy branches_update_own on public.restaurant_branches for update to authenticated
using (exists(select 1 from public.restaurants r where r.id=restaurant_id and r.auth_owner_id=(select auth.uid())))
with check (exists(select 1 from public.restaurants r where r.id=restaurant_id and r.auth_owner_id=(select auth.uid())));
comment on table public.restaurant_branches is 'Private branch drafts. Auth-owner policies are transitional until explicit Firebase migration; clients cannot publish or change business ownership.';
