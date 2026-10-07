-- Business category (fixed list, see shared/contracts/restaurants.ts) and per-branch contact phone.
-- restaurants.category already existed (legacy, all NULL); it is now constrained and owner-editable.
-- Public extras and catalog search are extended with CREATE OR REPLACE (same signatures, no DROP).

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'restaurants_category_allowed') then
    alter table public.restaurants add constraint restaurants_category_allowed check (category is null or category in (
      'Comida típica', 'Cafetería', 'Comida rápida', 'Pizzería', 'Mariscos', 'Carnes y asados', 'Comida china',
      'Comida mexicana', 'Panadería y postres', 'Vegetariana', 'Internacional', 'Otra'));
  end if;
end $$;
grant update (category) on public.restaurants to authenticated;

alter table public.restaurant_branches
  add column if not exists phone text,
  add column if not exists whatsapp boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'restaurant_branches_phone_format') then
    alter table public.restaurant_branches add constraint restaurant_branches_phone_format
      check (phone is null or phone ~ '^\+?[0-9]{8,15}$');
  end if;
end $$;
grant select (phone, whatsapp), insert (phone, whatsapp), update (phone, whatsapp) on public.restaurant_branches to authenticated;

create or replace function public.get_public_branch_extras(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('opening_hours', b.opening_hours, 'phone', b.phone, 'whatsapp', b.whatsapp, 'category', r.category)
    from public.restaurant_branches b
    join public.restaurants r on r.id = b.restaurant_id
   where b.id = p_id and b.status = 'published'
$$;

-- Same as 20261002120000_search_dishes.sql, plus r.category in the text match.
create or replace function public.search_public_catalog(p_query text default ''::text, p_lat double precision default null::double precision, p_lng double precision default null::double precision, p_radius_m integer default 5000, p_limit integer default 20)
 returns table(id uuid, restaurant_id uuid, name text, branch_name text, description text, address text, municipality text, department text, latitude double precision, longitude double precision, distance_m double precision)
 language sql
 stable security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $function$
  with params as (
    select
      case when nullif(btrim(coalesce(p_query, '')), '') is null then null
        else '%' || replace(replace(replace(lower(unaccent(btrim(p_query))), '\', '\\'), '%', '\%'), '_', '\_') || '%' end as pattern,
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
      p.origin, p.radius,
      p.pattern is null
        or lower(unaccent(concat_ws(' ', r.name, r.category, b.name, r.description, b.address, b.municipality, b.department))) like p.pattern
        or exists (select 1 from public.foods f
                    where f.restaurant_id = r.id and f.status = 'published'
                      and lower(unaccent(concat_ws(' ', f.name, f.category))) like p.pattern) as text_match
    from public.restaurant_branches b
    join public.restaurants r on r.id = b.restaurant_id
    cross join params p
    where b.status = 'published'
  )
  select id, restaurant_id, name, branch_name, description, address, municipality, department,
         latitude, longitude, distance_m
  from candidates
  where text_match
    and (origin is null or (latitude is not null and longitude is not null and st_dwithin(
           st_setsrid(st_makepoint(longitude, latitude), 4326)::geography, origin, radius)))
  order by distance_m asc nulls last, name asc, id asc
  limit (select max_rows from params);
$function$;
