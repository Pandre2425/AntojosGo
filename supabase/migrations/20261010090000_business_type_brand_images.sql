-- Free-text business type with suggestions, plus restaurant logo and cover photos.
-- restaurants.category keeps its fixed-list CHECK (removing it would need DROP); the new free-text
-- restaurants.business_type replaces it and is pre-filled from category. Everything public reads
-- coalesce(business_type, category). No DROP statements.

alter table public.restaurants add column if not exists business_type text;
alter table public.restaurants add column if not exists logo_path text;
alter table public.restaurants add column if not exists cover_path text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'restaurants_business_type_size') then
    alter table public.restaurants add constraint restaurants_business_type_size
      check (business_type is null or char_length(btrim(business_type)) between 2 and 60);
  end if;
end $$;
update public.restaurants set business_type = category where business_type is null and category is not null;
grant select (business_type, logo_path, cover_path), update (business_type) on public.restaurants to authenticated;

-- Storage: owners may also write under <restaurant_id>/brand/ (logo, cover).
create or replace function public.owns_restaurant_folder(p_name text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.restaurants r
     where r.auth_owner_id = (select auth.uid())
       and r.id::text = split_part(p_name, '/', 1)
  ) and split_part(p_name, '/', 2) in ('dishes', 'brand')
$$;

-- Sets or clears the logo or cover. The object must exist in the restaurant's brand folder.
create or replace function public.set_restaurant_image(p_restaurant_id uuid, p_kind text, p_path text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_kind not in ('logo', 'cover') then raise exception 'invalid kind' using errcode = '22023'; end if;
  if not exists (select 1 from public.restaurants r where r.id = p_restaurant_id and r.auth_owner_id = (select auth.uid())) then
    raise exception 'restaurant not found' using errcode = 'P0002';
  end if;
  if p_path is not null then
    if p_path !~ ('^' || p_restaurant_id::text || '/brand/[A-Za-z0-9_-]{8,64}\.(jpg|png|webp)$') then
      raise exception 'invalid image path' using errcode = '22023';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'restaurant-media' and o.name = p_path) then
      raise exception 'image not uploaded' using errcode = 'P0002';
    end if;
  end if;
  if p_kind = 'logo' then update public.restaurants set logo_path = p_path where id = p_restaurant_id;
  else update public.restaurants set cover_path = p_path where id = p_restaurant_id; end if;
  return p_path;
end $$;
revoke all on function public.set_restaurant_image(uuid, text, text) from public, anon;
grant execute on function public.set_restaurant_image(uuid, text, text) to authenticated;

-- Suggestions for the business type field and the diner filter: defaults + types in use,
-- deduplicated accent/case-insensitively (the first spelling wins).
create or replace function public.list_business_types()
returns table (name text) language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with all_types as (
    select unnest(array['Comida típica', 'Cafetería', 'Comida rápida', 'Pizzería', 'Mariscos', 'Carnes y asados', 'Comida china',
                        'Comida mexicana', 'Panadería y postres', 'Vegetariana', 'Internacional']) as t, 0 as src
    union all
    select btrim(business_type), 1 from public.restaurants where business_type is not null
  )
  select distinct on (lower(unaccent(t))) t from all_types order by lower(unaccent(t)), src, t limit 200
$$;
revoke all on function public.list_business_types() from public;
grant execute on function public.list_business_types() to anon, authenticated;

-- Logos/covers for search results (published restaurants only).
create or replace function public.get_public_restaurant_images(p_ids uuid[])
returns table (id uuid, logo_path text, cover_path text) language sql stable security definer set search_path = public, pg_temp as $$
  select r.id, r.logo_path, r.cover_path from public.restaurants r
   where r.id = any(coalesce(p_ids, '{}'::uuid[]))
     and exists (select 1 from public.restaurant_branches b where b.restaurant_id = r.id and b.status = 'published')
   limit 100
$$;
revoke all on function public.get_public_restaurant_images(uuid[]) from public;
grant execute on function public.get_public_restaurant_images(uuid[]) to anon, authenticated;

create or replace function public.get_public_branch_extras(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('opening_hours', b.opening_hours, 'phone', b.phone, 'whatsapp', b.whatsapp,
                            'category', coalesce(r.business_type, r.category), 'logo_path', r.logo_path, 'cover_path', r.cover_path)
    from public.restaurant_branches b
    join public.restaurants r on r.id = b.restaurant_id
   where b.id = p_id and b.status = 'published'
$$;

-- search_catalog_v2: same signature and columns; category = business type (free text), matched accent/case-insensitively.
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
           lower(unaccent(concat_ws(' ', f.name, f.category, f.description, array_to_string(f.ingredients, ' ')))) as dtext
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
