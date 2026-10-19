-- MANUAL (contains DROP, which the Supabase connector refuses): paste in the SQL Editor and click Run.
-- Removes what is left from the Firebase/first version and that no code uses since October 2026:
--   * public.users (1 Firebase test user, e-mail @test.com) and public.reviews (0 rows; reviews live in dish_reviews)
--   * restaurants.owner_id (old owner link; the app uses auth_owner_id) and «Restaurante Demo», the only restaurant
--     without an AntojosGo owner, with no locations and no dishes (nobody can see or edit it)
--   * six old functions already closed to everyone (supabase/migrations/20261020100000_revoke_legacy_functions.sql)
-- Runs as one transaction: if any check fails, nothing changes. Take a backup first: scripts/backup-db.mjs.

begin;

do $$ begin
  if (select count(*) from public.reviews) > 0 then raise exception 'reviews has rows; stop'; end if;
  if (select count(*) from public.users) > 1 then raise exception 'users has more rows than expected; stop'; end if;
end $$;

delete from public.restaurants r
 where r.auth_owner_id is null
   and not exists (select 1 from public.restaurant_branches b where b.restaurant_id = r.id)
   and not exists (select 1 from public.foods f where f.restaurant_id = r.id);

drop table public.reviews;
alter table public.restaurants drop constraint if exists restaurants_owner_id_fkey;
alter table public.restaurants drop column if exists owner_id;
drop table public.users;

drop function if exists public.search_catalog_v2(jsonb, double precision, double precision, integer, integer, uuid[], boolean, text, text[], text);
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('get_public_dishes_full', 'get_public_dishes', 'get_public_menu', 'search_public_catalog', 'assistant_search')
  loop
    execute format('drop function %s', f.sig);
  end loop;
end $$;

commit;
