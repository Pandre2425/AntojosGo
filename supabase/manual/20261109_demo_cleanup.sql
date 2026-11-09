-- Removes the presentation data loaded on 9 November 2026 and schedules it for 23 November 2026, 06:00 Guatemala (12:00 UTC).
-- Run once in the Supabase SQL editor. Only touches accounts with raw_user_meta_data.seed = 'demo-xela' and the
-- restaurants they own; real accounts and restaurants stay. The job unschedules itself after running.
-- Run now by hand instead: select public.demo_cleanup();

create extension if not exists pg_cron;

create or replace function public.demo_cleanup()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare demo uuid[]; n_rest integer; n_users integer;
begin
  select coalesce(array_agg(id), '{}') into demo from auth.users where raw_user_meta_data ->> 'seed' = 'demo-xela';
  -- Branches first (restrict FK); favorites on them cascade. Then restaurants: dishes, their reviews and «no me interesa» cascade.
  delete from public.restaurant_branches where restaurant_id in (select id from public.restaurants where auth_owner_id = any(demo));
  delete from public.restaurants where auth_owner_id = any(demo);
  get diagnostics n_rest = row_count;
  -- Accounts: profiles, reviews, favorites, app ratings, identities and sessions cascade.
  delete from auth.users where id = any(demo);
  get diagnostics n_users = row_count;
  perform cron.unschedule(jobid) from cron.job where jobname = 'antojosgo-demo-cleanup';
  return jsonb_build_object('restaurants', n_rest, 'accounts', n_users);
end $$;
revoke all on function public.demo_cleanup() from public, anon, authenticated;

select cron.schedule('antojosgo-demo-cleanup', '0 12 23 11 *', 'select public.demo_cleanup()');
