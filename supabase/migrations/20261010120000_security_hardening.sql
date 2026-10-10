-- Security review 2026-10-10 (docs/SEGURIDAD.md). No DROP statements.

-- 1. PostGIS metadata lives in public (moving the extension is deferred). anon/authenticated could
--    INSERT/UPDATE spatial_ref_sys through the REST API (e.g. corrupt SRID 4326 and break distances).
--    App functions are SECURITY DEFINER, so clients need no access at all.
revoke all on table public.spatial_ref_sys from anon, authenticated;
revoke all on table public.geometry_columns from anon, authenticated;
revoke all on table public.geography_columns from anon, authenticated;

-- 2. Legacy catalog functions replaced by search_catalog_v2 / get_public_dishes_full; nothing calls them.
revoke execute on function public.assistant_search(jsonb, double precision, double precision, integer, integer, uuid[]) from public, anon, authenticated;
revoke execute on function public.search_public_catalog(text, double precision, double precision, integer, integer) from public, anon, authenticated;
revoke execute on function public.get_public_dishes(uuid) from public, anon, authenticated;
revoke execute on function public.get_public_menu(uuid) from public, anon, authenticated;

-- 3. Business type suggestions are shown to every visitor: only types of restaurants with a published
--    branch (an unpublished account could otherwise inject arbitrary text into everyone's filter).
create or replace function public.list_business_types()
returns table (name text) language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with all_types as (
    select unnest(array['Comida típica', 'Cafetería', 'Comida rápida', 'Pizzería', 'Mariscos', 'Carnes y asados', 'Comida china',
                        'Comida mexicana', 'Panadería y postres', 'Vegetariana', 'Internacional']) as t, 0 as src
    union all
    select btrim(r.business_type), 1 from public.restaurants r
     where r.business_type is not null
       and exists (select 1 from public.restaurant_branches b where b.restaurant_id = r.id and b.status = 'published')
  )
  select distinct on (lower(unaccent(t))) t from all_types order by lower(unaccent(t)), src, t limit 200
$$;
