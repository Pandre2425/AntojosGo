-- Legacy functions no code calls anymore (replaced by search_catalog_v3, get_public_dishes_v3 and the /api/v1 routes).
-- Nobody can execute them now; supabase/manual/20261020_drop_legacy.sql removes them and the empty legacy tables.
revoke all on function public.search_catalog_v2(jsonb, double precision, double precision, integer, integer, uuid[], boolean, text, text[], text) from public, anon, authenticated;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('get_public_dishes_full', 'get_public_dishes', 'get_public_menu', 'search_public_catalog', 'assistant_search')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
