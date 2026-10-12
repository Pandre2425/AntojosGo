-- Multi-select dish categories (free text, e.g. 'Hamburguesa', 'Comida rápida'). foods.category keeps a short
-- summary for displays and older app versions; foods.tags is derived from categories by the API. No DROP statements.

alter table public.foods add column if not exists categories text[] not null default '{}';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'foods_categories_size') then
    alter table public.foods add constraint foods_categories_size
      check (cardinality(categories) <= 12 and char_length(array_to_string(categories, ',')) <= 400);
  end if;
end $$;
grant select (categories), insert (categories), update (categories) on public.foods to authenticated;

-- Existing dishes: their old category becomes the first category.
update public.foods set categories = array[btrim(category)] where category is not null and cardinality(categories) = 0;

-- search_catalog_v2: categories are searchable too (same signature and columns).
create or replace function public.search_catalog_v2(
  p_groups jsonb, p_lat double precision default null, p_lng double precision default null,
  p_radius_m integer default 50000, p_limit integer default 30, p_exclude uuid[] default '{}',
  p_require_all boolean default false, p_category text default null,
  p_without text[] default '{}', p_avoid text default '')
returns table (
  id uuid, restaurant_id uuid, name text, branch_name text, category text, description text, address text,
  municipality text, department text, latitude double precision, longitude double precision, distance_m double precision,
  opening_hours jsonb, match_dish text, match_price numeric, match_allergens text[], score integer, groups_total integer)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with g as (
    select row_number() over () as gi, coalesce(e->>'re', '') as re,
           coalesce(array(select jsonb_array_elements_text(e->'tags')), '{}'::text[]) as tags
      from jsonb_array_elements(case when jsonb_typeof(p_groups) = 'array' then p_groups else '[]'::jsonb end) e
     limit 6
  ),
  filtering as (select coalesce(cardinality(p_without), 0) > 0 or coalesce(p_avoid, '') <> '' as on_),
  origin as (
    select case when p_lat is not null and p_lng is not null
      then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as o
  ),
  br as (
    select b.id, b.restaurant_id, r.name::text as rname, b.name::text as bname, coalesce(r.business_type, r.category)::text as rcat,
           r.description::text as rdesc, b.address::text as address, b.municipality::text as municipality,
           b.department::text as department, b.latitude::double precision as latitude,
           b.longitude::double precision as longitude, b.opening_hours,
           lower(unaccent(concat_ws(' ', r.name, r.business_type, r.category, r.description, b.name, b.address, b.municipality, b.department))) as rtext,
           case when (select o from origin) is not null then st_distance(
             st_setsrid(st_makepoint(b.longitude, b.latitude), 4326)::geography, (select o from origin)) end as dist
      from public.restaurant_branches b
      join public.restaurants r on r.id = b.restaurant_id
     where b.status = 'published' and not (b.id = any(coalesce(p_exclude, '{}'::uuid[])))
       and (p_category is null or lower(unaccent(coalesce(r.business_type, r.category, ''))) = lower(unaccent(btrim(p_category))))
  ),
  dishes as (
    select f.restaurant_id, f.name::text as dname, f.price, coalesce(f.tags, '{}') as tags, coalesce(f.allergens, '{}') as allergens,
           lower(unaccent(concat_ws(' ', f.name, f.category, array_to_string(f.categories, ' '), f.description, array_to_string(f.ingredients, ' ')))) as dtext
      from public.foods f
     where f.status = 'published' and f.restaurant_id in (select restaurant_id from br)
       and not (coalesce(f.allergens, '{}') && coalesce(p_without, '{}'::text[]))
       and (coalesce(p_avoid, '') = '' or not (lower(unaccent(concat_ws(' ', f.name, f.description, array_to_string(f.ingredients, ' ')))) ~ p_avoid))
  ),
  dish_scores as (
    select d.*, (select count(*) from g where (g.re <> '' and d.dtext ~ g.re) or d.tags && g.tags)::int as score
      from dishes d
  ),
  best as (
    select distinct on (restaurant_id) restaurant_id, dname, price, allergens
      from dish_scores
     where score > 0 or (select count(*) from g) = 0
     order by restaurant_id, score desc, (cardinality(allergens) > 0) desc, price asc
  ),
  matched as (
    select br.id,
           (select count(*) from g where (g.re <> '' and br.rtext ~ g.re)
              or exists (select 1 from dishes d where d.restaurant_id = br.restaurant_id
                           and ((g.re <> '' and d.dtext ~ g.re) or d.tags && g.tags)))::int as groups_hit,
           exists (select 1 from dishes d where d.restaurant_id = br.restaurant_id) as has_dish
      from br
  )
  select br.id, br.restaurant_id, br.rname, br.bname, br.rcat, br.rdesc, br.address, br.municipality, br.department,
         br.latitude, br.longitude, br.dist, br.opening_hours, best.dname, best.price, best.allergens,
         m.groups_hit, (select count(*) from g)::int
    from br join matched m on m.id = br.id
    left join best on best.restaurant_id = br.restaurant_id
   where (not (select on_ from filtering) or m.has_dish)
     and ((select count(*) from g) = 0
          or (p_require_all and m.groups_hit = (select count(*) from g))
          or (not p_require_all and m.groups_hit > 0))
     and ((select o from origin) is null or (br.latitude is not null and st_dwithin(
           st_setsrid(st_makepoint(br.longitude, br.latitude), 4326)::geography, (select o from origin),
           least(greatest(coalesce(p_radius_m, 50000), 1), 200000))))
   order by m.groups_hit desc, br.dist asc nulls last, br.rname, br.id
   limit least(greatest(coalesce(p_limit, 30), 1), 50);
$$;
