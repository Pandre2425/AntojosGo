-- Public catalog v2: replaces scripts/public-catalog.sql (do NOT apply v1).
-- v1 granted SELECT on whole tables to anon; RLS limits rows, not columns, so any
-- client could read auth_owner_id and other private fields of published rows.
-- v2 exposes only two SECURITY DEFINER functions returning diner-safe columns.
-- No table grants or public policies are added; drafts stay owner-only.
-- Filtering, distance and ordering run in Postgres (fixes the 200-row JS truncation).
-- Requires PostGIS (installed in the project). Idempotent.

set search_path = public, extensions;

-- Undo v1 if it was ever applied.
drop policy if exists branches_public_read_published on public.restaurant_branches;
drop policy if exists restaurants_public_read_published on public.restaurants;
revoke select on public.restaurant_branches from anon;
revoke select on public.restaurants from anon;
drop view if exists public.public_catalog_branches;

create index if not exists restaurant_branches_published_geo_idx
  on public.restaurant_branches
  using gist ((st_setsrid(st_makepoint(longitude, latitude), 4326)::geography))
  where status = 'published' and latitude is not null and longitude is not null;

create or replace function public.search_public_catalog(
  p_query text default '',
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m integer default 5000,
  p_limit integer default 20
)
returns table (
  id uuid,
  restaurant_id uuid,
  name text,
  branch_name text,
  description text,
  address text,
  municipality text,
  department text,
  latitude double precision,
  longitude double precision,
  distance_m double precision
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with params as (
    select
      nullif(btrim(coalesce(p_query, '')), '') as term,
      case when p_lat is not null and p_lng is not null
        then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as origin,
      least(greatest(coalesce(p_radius_m, 5000), 1), 200000) as radius,
      least(greatest(coalesce(p_limit, 20), 1), 100) as max_rows
  ),
  candidates as (
    select
      b.id, r.id as restaurant_id, r.name::text as name, b.name::text as branch_name,
      r.description::text as description, b.address::text as address,
      b.municipality::text as municipality, b.department::text as department,
      b.latitude::double precision as latitude, b.longitude::double precision as longitude,
      case when p.origin is not null then st_distance(
        st_setsrid(st_makepoint(b.longitude, b.latitude), 4326)::geography, p.origin) end as distance_m,
      p.origin, p.radius, p.term
    from public.restaurant_branches b
    join public.restaurants r on r.id = b.restaurant_id
    cross join params p
    where b.status = 'published'
  )
  select id, restaurant_id, name, branch_name, description, address, municipality, department,
         latitude, longitude, distance_m
  from candidates
  where (term is null or concat_ws(' ', name, branch_name, description, address, municipality, department)
           ilike '%' || replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (origin is null or (latitude is not null and longitude is not null and st_dwithin(
           st_setsrid(st_makepoint(longitude, latitude), 4326)::geography, origin, radius)))
  order by distance_m asc nulls last, name asc, id asc
  limit (select max_rows from params);
$$;

create or replace function public.get_public_branch(p_id uuid)
returns table (
  id uuid,
  restaurant_id uuid,
  name text,
  branch_name text,
  description text,
  address text,
  municipality text,
  department text,
  latitude double precision,
  longitude double precision
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.id, r.id, r.name::text, b.name::text, r.description::text, b.address::text,
         b.municipality::text, b.department::text,
         b.latitude::double precision, b.longitude::double precision
  from public.restaurant_branches b
  join public.restaurants r on r.id = b.restaurant_id
  where b.id = p_id and b.status = 'published';
$$;

revoke all on function public.search_public_catalog(text, double precision, double precision, integer, integer) from public;
revoke all on function public.get_public_branch(uuid) from public;
grant execute on function public.search_public_catalog(text, double precision, double precision, integer, integer) to anon, authenticated;
grant execute on function public.get_public_branch(uuid) to anon, authenticated;

comment on function public.search_public_catalog is 'Diner catalog: published branches only, safe columns, DB-side text/radius filter.';
comment on function public.get_public_branch is 'Diner detail: one published branch, safe columns.';
