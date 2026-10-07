-- Dish tags (fixed list, see shared/contracts/menu.ts) and the diner assistant's search.
-- assistant_search receives "groups" built ONLY by the server (shared/contracts/assistant.ts):
-- each group is { re: 'term1|term2', tags: [...] } where terms are sanitized to [a-z0-9 ]
-- (never raw client text), so the regex cannot be abused. Results are ranked by how many
-- groups a restaurant or one of its published dishes matches; the best dish explains the match.
-- No DROP statements.

alter table public.foods add column if not exists tags text[] not null default '{}';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'foods_tags_allowed') then
    alter table public.foods add constraint foods_tags_allowed check (
      tags <@ array['picante', 'vegetariano', 'vegano', 'sin_gluten', 'desayuno', 'postre', 'frio', 'caliente', 'bebida']::text[]
      and cardinality(tags) <= 9);
  end if;
end $$;
grant select (tags), insert (tags), update (tags) on public.foods to authenticated;

create or replace function public.assistant_search(
  p_groups jsonb, p_lat double precision default null, p_lng double precision default null,
  p_radius_m integer default 5000, p_limit integer default 10, p_exclude uuid[] default '{}')
returns table (
  id uuid, restaurant_id uuid, name text, branch_name text, category text, address text, municipality text,
  latitude double precision, longitude double precision, distance_m double precision, opening_hours jsonb,
  match_dish text, match_price numeric, score integer)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with g as (
    select coalesce(e->>'re', '') as re,
           coalesce(array(select jsonb_array_elements_text(e->'tags')), '{}'::text[]) as tags
      from jsonb_array_elements(case when jsonb_typeof(p_groups) = 'array' then p_groups else '[]'::jsonb end) e
     limit 6
  ),
  origin as (
    select case when p_lat is not null and p_lng is not null
      then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as o
  ),
  br as (
    select b.id, b.restaurant_id, r.name::text as rname, b.name::text as bname, r.category::text as rcat,
           r.description::text as rdesc, b.address::text as address, b.municipality::text as municipality,
           b.latitude::double precision as latitude, b.longitude::double precision as longitude, b.opening_hours,
           case when (select o from origin) is not null then st_distance(
             st_setsrid(st_makepoint(b.longitude, b.latitude), 4326)::geography, (select o from origin)) end as dist
      from public.restaurant_branches b
      join public.restaurants r on r.id = b.restaurant_id
     where b.status = 'published' and not (b.id = any(coalesce(p_exclude, '{}'::uuid[])))
  ),
  dish_scores as (
    select f.restaurant_id, f.name::text as dname, f.price,
           (select count(*) from g
             where (g.re <> '' and lower(unaccent(concat_ws(' ', f.name, f.category, f.description))) ~ g.re)
                or f.tags && g.tags)::int as score
      from public.foods f
     where f.status = 'published' and f.restaurant_id in (select restaurant_id from br)
  ),
  best as (
    select distinct on (restaurant_id) restaurant_id, dname, price, score
      from dish_scores where score > 0
     order by restaurant_id, score desc, price asc
  )
  select br.id, br.restaurant_id, br.rname, br.bname, br.rcat, br.address, br.municipality,
         br.latitude, br.longitude, br.dist, br.opening_hours, best.dname, best.price,
         greatest(coalesce(best.score, 0),
           (select count(*) from g where g.re <> '' and lower(unaccent(concat_ws(' ', br.rname, br.rcat, br.rdesc))) ~ g.re)::int)
    from br left join best on best.restaurant_id = br.restaurant_id
   where ((select count(*) from g) = 0
          or coalesce(best.score, 0) > 0
          or exists (select 1 from g where g.re <> '' and lower(unaccent(concat_ws(' ', br.rname, br.rcat, br.rdesc))) ~ g.re))
     and ((select o from origin) is null or (br.latitude is not null and st_dwithin(
           st_setsrid(st_makepoint(br.longitude, br.latitude), 4326)::geography, (select o from origin),
           least(greatest(coalesce(p_radius_m, 5000), 1), 200000))))
   order by 14 desc, br.dist asc nulls last, br.rname, br.id
   limit least(greatest(coalesce(p_limit, 10), 1), 30);
$$;
revoke all on function public.assistant_search(jsonb, double precision, double precision, integer, integer, uuid[]) from public;
grant execute on function public.assistant_search(jsonb, double precision, double precision, integer, integer, uuid[]) to anon, authenticated;
