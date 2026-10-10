-- MANUAL: run once in the Supabase SQL editor (contains DROP, which the MCP refuses).
-- Why: PostGIS in `public` exposes spatial_ref_sys (owned by supabase_admin, RLS off) to anon/authenticated
-- for INSERT/UPDATE/DELETE through the REST API; REVOKE from `postgres` has no effect on it.
-- Effect: PostGIS moves to `extensions`. Drops the legacy, unused column restaurants.location
-- (its value is kept as text in restaurants.location_legacy_wkt) and recreates the geo index.
-- App functions already use `search_path = public, extensions`, so search keeps working.

begin;

alter table public.restaurants add column if not exists location_legacy_wkt text;
update public.restaurants set location_legacy_wkt = public.st_astext(location) where location is not null;

drop extension postgis cascade;   -- also drops restaurants.location and restaurant_branches_published_geo_idx
create extension postgis schema extensions;

create index if not exists restaurant_branches_published_geo_idx on public.restaurant_branches
  using gist ((extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography))
  where status = 'published' and latitude is not null and longitude is not null;

-- Smoke test: must return rows with distances (fails the transaction otherwise).
do $$ begin
  if not exists (select 1 from public.search_catalog_v2('[]'::jsonb, 14.84, -91.52, 50000) where distance_m is not null) then
    raise exception 'distance search broken after moving PostGIS';
  end if;
end $$;

commit;
