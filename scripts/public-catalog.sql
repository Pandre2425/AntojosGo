-- Sprint 1: public catalog of published branches (diner-safe fields only).
-- Apply in Supabase after restaurant-branches.sql. Idempotent policy names.

-- Safe columns for diners: branch identity/location + business name/description.
-- Does NOT expose auth_owner_id, email, password hashes, or private owner coords of drafts.

create or replace view public.public_catalog_branches
with (security_invoker = true)
as
select
  b.id,
  b.restaurant_id,
  b.name as branch_name,
  b.department,
  b.municipality,
  b.address,
  b.latitude,
  b.longitude,
  b.status,
  r.name as business_name,
  r.description as business_description
from public.restaurant_branches b
join public.restaurants r on r.id = b.restaurant_id
where b.status = 'published';

revoke all on public.public_catalog_branches from anon, authenticated;
grant select on public.public_catalog_branches to anon, authenticated;

-- Direct table policies for published rows (needed for PostgREST embeds used by the app).
drop policy if exists branches_public_read_published on public.restaurant_branches;
create policy branches_public_read_published on public.restaurant_branches
for select to anon, authenticated
using (status = 'published');

-- Allow reading business name/description for restaurants that have at least one published branch.
drop policy if exists restaurants_public_read_published on public.restaurants;
create policy restaurants_public_read_published on public.restaurants
for select to anon, authenticated
using (
  exists (
    select 1 from public.restaurant_branches b
    where b.restaurant_id = restaurants.id and b.status = 'published'
  )
);

grant select on public.restaurant_branches to anon;
grant select on public.restaurants to anon;

comment on view public.public_catalog_branches is 'Diner-facing projection of published branches. Draft/inactive remain owner-only.';
