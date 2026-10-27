-- Superadmin panel (/admin, plan in docs/PLAN-SUPERADMIN.md, phase 1).
-- Every admin_* function starts with require_admin(): listed in app_admins AND a session with second factor (aal2).
-- Every change writes admin_audit_log, which is append-only (a trigger rejects update, delete and truncate).
-- Suspend and delete reuse branch status 'inactive', which owners cannot change (set_branch_published refuses it).
-- No service key: account actions (ban, sign out, delete) run here as security definer on auth.users / auth.sessions.

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  admin_id uuid not null,            -- no FK: the log outlives deleted accounts
  admin_email text,
  action text not null,
  target_type text not null,
  target_id text,
  target_label text,
  reason text,
  before jsonb,
  after jsonb
);
create index if not exists admin_audit_log_at_idx on public.admin_audit_log (at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

create or replace function public.admin_audit_immutable()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin raise exception 'admin_audit_log is append-only'; end $$;
create or replace trigger admin_audit_no_change before update or delete on public.admin_audit_log
  for each row execute function public.admin_audit_immutable();
create or replace trigger admin_audit_no_truncate before truncate on public.admin_audit_log
  for each statement execute function public.admin_audit_immutable();

alter table public.restaurants add column if not exists suspended_at timestamptz;
alter table public.restaurants add column if not exists suspension_reason text;
alter table public.restaurants add column if not exists deleted_at timestamptz;

-- Owners no longer see restaurants the admin deleted (soft delete; restorable from the panel).
alter policy restaurant_read_own on public.restaurants using ((select auth.uid()) = auth_owner_id and deleted_at is null);
alter policy restaurant_update_own on public.restaurants using ((select auth.uid()) = auth_owner_id and deleted_at is null);

-- Admin checks now demand the second factor too (also covers get_reported_reviews / moderate_review).
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()))
     and coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2'
$$;

-- For the panel's gate: listed as admin, regardless of the second factor (the page then asks for it).
create or replace function public.admin_whoami()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()))
$$;

create or replace function public.require_admin()
returns uuid language plpgsql stable security definer set search_path = public, pg_temp as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or not exists (select 1 from public.app_admins where user_id = uid) then
    raise exception 'admin only' using errcode = '42501', hint = 'forbidden';
  end if;
  if coalesce((select auth.jwt()) ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'second factor required' using errcode = '42501', hint = 'mfa';
  end if;
  return uid;
end $$;

create or replace function public.admin_reason(p_reason text)
returns text language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason required' using errcode = 'P0001', hint = 'reason'; end if;
  return left(btrim(p_reason), 500);
end $$;

create or replace function public.admin_log(p_action text, p_type text, p_id text, p_label text, p_reason text, p_before jsonb, p_after jsonb)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, target_label, reason, before, after)
  values ((select auth.uid()), (select email from auth.users where id = (select auth.uid())), p_action, p_type, p_id, p_label, p_reason, p_before, p_after)
$$;

-- ---------- Dashboard ----------
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'users_new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'users_banned', (select count(*) from auth.users where banned_until > now()),
    'restaurants', (select count(*) from public.restaurants where deleted_at is null),
    'restaurants_suspended', (select count(*) from public.restaurants where suspended_at is not null and deleted_at is null),
    'restaurants_deleted', (select count(*) from public.restaurants where deleted_at is not null),
    'branches_published', (select count(*) from public.restaurant_branches where status = 'published'),
    'branches_draft', (select count(*) from public.restaurant_branches where status = 'draft'),
    'dishes_published', (select count(*) from public.foods where status = 'published'),
    'reviews', (select count(*) from public.dish_reviews),
    'reviews_reported', (select count(*) from public.dish_reviews where reported_at is not null and hidden_at is null),
    'feedback_avg', (select round(avg(rating), 2) from public.app_feedback),
    'feedback_count', (select count(*) from public.app_feedback),
    'searches_7d', (select coalesce(sum(hits), 0) from public.search_concept_hits where day > current_date - 7),
    'top_searches', (select coalesce(jsonb_agg(x), '[]') from (
        select concept, sum(hits)::int hits from public.search_concept_hits where day > current_date - 30
         group by concept order by 2 desc limit 8) x),
    'published_no_dishes', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)), '[]') from public.restaurants r
        where exists (select 1 from public.restaurant_branches b where b.restaurant_id = r.id and b.status = 'published')
          and not exists (select 1 from public.foods f where f.restaurant_id = r.id and f.status = 'published')),
    'published_no_hours', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name || ' · ' || b.name)), '[]')
        from public.restaurant_branches b join public.restaurants r on r.id = b.restaurant_id
        where b.status = 'published' and coalesce(jsonb_array_length(b.opening_hours), 0) = 0),
    'stale_empty', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)), '[]') from public.restaurants r
        where r.deleted_at is null and r.created_at < now() - interval '14 days'
          and not exists (select 1 from public.foods f where f.restaurant_id = r.id))
  );
end $$;

-- ---------- Restaurants ----------
create or replace function public.admin_restaurants(p_q text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform public.require_admin();
  return (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select r.id, r.name, r.business_type, r.created_at, r.suspended_at, r.suspension_reason, r.deleted_at,
           r.auth_owner_id owner_id, u.email owner_email,
           (select count(*) from public.foods f where f.restaurant_id = r.id) dishes,
           (select count(*) from public.foods f where f.restaurant_id = r.id and f.status = 'published') dishes_published,
           (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'municipality', b.municipality, 'status', b.status,
                    'has_location', b.latitude is not null, 'has_hours', coalesce(jsonb_array_length(b.opening_hours), 0) > 0) order by b.created_at), '[]')
              from public.restaurant_branches b where b.restaurant_id = r.id) branches
      from public.restaurants r left join auth.users u on u.id = r.auth_owner_id
     where q is null or r.name ilike '%' || q || '%' or u.email ilike '%' || q || '%'
     order by r.created_at desc limit 300) x);
end $$;

create or replace function public.admin_set_branch_status(p_branch_id uuid, p_publish boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare b record; why text;
begin
  perform public.require_admin(); why := public.admin_reason(p_reason);
  select br.status, br.latitude, br.name, r.name rname, r.suspended_at, r.deleted_at into b
    from public.restaurant_branches br join public.restaurants r on r.id = br.restaurant_id where br.id = p_branch_id for update of br;
  if not found then raise exception 'branch not found' using errcode = 'P0002'; end if;
  if b.suspended_at is not null or b.deleted_at is not null then raise exception 'restaurant suspended' using errcode = 'P0001', hint = 'suspended'; end if;
  if p_publish and b.latitude is null then raise exception 'location required' using errcode = 'P0001', hint = 'location'; end if;
  update public.restaurant_branches set status = case when p_publish then 'published' else 'draft' end where id = p_branch_id;
  perform public.admin_log(case when p_publish then 'branch.publish' else 'branch.unpublish' end, 'branch', p_branch_id::text,
    b.rname || ' · ' || b.name, why, jsonb_build_object('status', b.status), jsonb_build_object('status', case when p_publish then 'published' else 'draft' end));
  return jsonb_build_object('ok', true);
end $$;

-- Suspend: all branches go 'inactive' (hidden; the owner cannot republish). Lift: back to 'draft', the owner republishes.
create or replace function public.admin_suspend_restaurant(p_id uuid, p_suspend boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; why text; prev jsonb;
begin
  perform public.require_admin(); why := public.admin_reason(p_reason);
  select * into r from public.restaurants where id = p_id for update;
  if not found then raise exception 'restaurant not found' using errcode = 'P0002'; end if;
  select coalesce(jsonb_object_agg(id, status), '{}') into prev from public.restaurant_branches where restaurant_id = p_id;
  if p_suspend then
    update public.restaurants set suspended_at = now(), suspension_reason = why where id = p_id;
    update public.restaurant_branches set status = 'inactive' where restaurant_id = p_id;
  else
    update public.restaurants set suspended_at = null, suspension_reason = null where id = p_id;
    if r.deleted_at is null then update public.restaurant_branches set status = 'draft' where restaurant_id = p_id and status = 'inactive'; end if;
  end if;
  perform public.admin_log(case when p_suspend then 'restaurant.suspend' else 'restaurant.unsuspend' end, 'restaurant', p_id::text, r.name, why,
    jsonb_build_object('suspended_at', r.suspended_at, 'branches', prev), jsonb_build_object('suspended', p_suspend));
  return jsonb_build_object('ok', true);
end $$;

-- Soft delete: hidden from everyone (owner included) and restorable. Restore brings branches back as 'draft'.
create or replace function public.admin_delete_restaurant(p_id uuid, p_delete boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; why text; prev jsonb;
begin
  perform public.require_admin(); why := public.admin_reason(p_reason);
  select * into r from public.restaurants where id = p_id for update;
  if not found then raise exception 'restaurant not found' using errcode = 'P0002'; end if;
  select coalesce(jsonb_object_agg(id, status), '{}') into prev from public.restaurant_branches where restaurant_id = p_id;
  if p_delete then
    update public.restaurants set deleted_at = now() where id = p_id;
    update public.restaurant_branches set status = 'inactive' where restaurant_id = p_id;
  else
    update public.restaurants set deleted_at = null where id = p_id;
    if r.suspended_at is null then update public.restaurant_branches set status = 'draft' where restaurant_id = p_id and status = 'inactive'; end if;
  end if;
  perform public.admin_log(case when p_delete then 'restaurant.delete' else 'restaurant.restore' end, 'restaurant', p_id::text, r.name, why,
    jsonb_build_object('deleted_at', r.deleted_at, 'branches', prev), jsonb_build_object('deleted', p_delete));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_transfer_restaurant(p_id uuid, p_email text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; why text; new_owner uuid;
begin
  perform public.require_admin(); why := public.admin_reason(p_reason);
  select * into r from public.restaurants where id = p_id for update;
  if not found then raise exception 'restaurant not found' using errcode = 'P0002'; end if;
  select id into new_owner from auth.users where lower(email) = lower(btrim(p_email));
  if new_owner is null then raise exception 'account not found' using errcode = 'P0001', hint = 'no_account'; end if;
  if exists (select 1 from public.restaurants where auth_owner_id = new_owner and name = r.name and id <> p_id) then
    raise exception 'duplicate name' using errcode = 'P0001', hint = 'duplicate';
  end if;
  update public.restaurants set auth_owner_id = new_owner where id = p_id;
  perform public.admin_log('restaurant.transfer', 'restaurant', p_id::text, r.name, why,
    jsonb_build_object('owner_id', r.auth_owner_id, 'owner_email', (select email from auth.users where id = r.auth_owner_id)),
    jsonb_build_object('owner_id', new_owner, 'owner_email', lower(btrim(p_email))));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Users ----------
create or replace function public.admin_users(p_q text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform public.require_admin();
  return (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select u.id, u.email, p.display_name name, u.raw_app_meta_data ->> 'provider' provider, u.created_at, u.last_sign_in_at,
           u.email_confirmed_at is not null confirmed, u.banned_until,
           exists (select 1 from public.app_admins a where a.user_id = u.id) is_admin,
           (select count(*) from public.restaurants r where r.auth_owner_id = u.id and r.deleted_at is null) restaurants,
           (select count(*) from public.dish_reviews v where v.user_id = u.id) reviews,
           (select count(*) from public.favorites f where f.user_id = u.id) favorites
      from auth.users u left join public.account_profiles p on p.user_id = u.id
     where q is null or u.email ilike '%' || q || '%' or p.display_name ilike '%' || q || '%'
     order by u.created_at desc limit 300) x);
end $$;

-- p_days: null lifts the suspension, 0 = indefinite, otherwise days. Suspending also ends the user's sessions.
create or replace function public.admin_ban_user(p_user_id uuid, p_days integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := public.require_admin(); why text := public.admin_reason(p_reason); u record; ban_until timestamptz;
begin
  select id, email, banned_until into u from auth.users where id = p_user_id;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;
  if p_user_id = me or exists (select 1 from public.app_admins where user_id = p_user_id) then
    raise exception 'admin account' using errcode = 'P0001', hint = 'admin_target';
  end if;
  ban_until := case when p_days is null then null when p_days = 0 then now() + interval '100 years' else now() + make_interval(days => least(greatest(p_days, 1), 3650)) end;
  update auth.users set banned_until = ban_until where id = p_user_id;
  if ban_until is not null then delete from auth.sessions where user_id = p_user_id; end if;
  perform public.admin_log(case when ban_until is null then 'user.unban' else 'user.ban' end, 'user', p_user_id::text, u.email, why,
    jsonb_build_object('banned_until', u.banned_until), jsonb_build_object('banned_until', ban_until));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_signout_user(p_user_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := public.require_admin(); why text := public.admin_reason(p_reason); u record; n integer;
begin
  select id, email into u from auth.users where id = p_user_id;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics n = row_count;
  perform public.admin_log('user.signout', 'user', p_user_id::text, u.email, why, jsonb_build_object('sessions', n), null);
  return jsonb_build_object('ok', true, 'sessions', n);
end $$;

-- Irreversible: the account and its reviews, favorites and opinions go away. Restaurants must be transferred or deleted first.
create or replace function public.admin_delete_user(p_user_id uuid, p_confirm_email text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := public.require_admin(); why text := public.admin_reason(p_reason); u record;
begin
  select id, email, created_at into u from auth.users where id = p_user_id;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;
  if p_user_id = me or exists (select 1 from public.app_admins where user_id = p_user_id) then
    raise exception 'admin account' using errcode = 'P0001', hint = 'admin_target';
  end if;
  if lower(btrim(coalesce(p_confirm_email, ''))) <> lower(u.email) then raise exception 'confirmation' using errcode = 'P0001', hint = 'confirm'; end if;
  if exists (select 1 from public.restaurants where auth_owner_id = p_user_id) then
    raise exception 'owns restaurants' using errcode = 'P0001', hint = 'has_restaurants';
  end if;
  perform public.admin_log('user.delete', 'user', p_user_id::text, u.email, why, jsonb_build_object(
    'created_at', u.created_at,
    'reviews', (select count(*) from public.dish_reviews where user_id = p_user_id),
    'favorites', (select count(*) from public.favorites where user_id = p_user_id)), null);
  delete from auth.users where id = p_user_id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Reviews ----------
create or replace function public.admin_reviews(p_filter text default 'reported', p_q text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform public.require_admin();
  return (select coalesce(jsonb_agg(x order by x.updated_at desc), '[]') from (
    select v.id, r.name restaurant_name, f.name dish_name, v.rating, v.comment, v.reply, v.report_reason, v.reported_at, v.hidden_at,
           v.updated_at, u.email author_email
      from public.dish_reviews v
      join public.foods f on f.id = v.dish_id join public.restaurants r on r.id = f.restaurant_id
      left join auth.users u on u.id = v.user_id
     where case coalesce(p_filter, 'reported')
             when 'reported' then v.reported_at is not null and v.hidden_at is null
             when 'hidden' then v.hidden_at is not null
             else true end
       and (q is null or r.name ilike '%' || q || '%' or f.name ilike '%' || q || '%' or v.comment ilike '%' || q || '%' or u.email ilike '%' || q || '%')
     order by v.updated_at desc limit 300) x);
end $$;

create or replace function public.admin_moderate_review(p_id uuid, p_action text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare why text; v record;
begin
  perform public.require_admin(); why := public.admin_reason(p_reason);
  if p_action not in ('keep', 'hide', 'unhide') then raise exception 'bad action' using errcode = '22023'; end if;
  select v2.reported_at, v2.report_reason, v2.hidden_at, v2.comment, f.name dish into v
    from public.dish_reviews v2 join public.foods f on f.id = v2.dish_id where v2.id = p_id for update of v2;
  if not found then raise exception 'review not found' using errcode = 'P0002'; end if;
  update public.dish_reviews set
      reported_at = case when p_action in ('keep', 'unhide') then null else reported_at end,
      report_reason = case when p_action in ('keep', 'unhide') then null else report_reason end,
      hidden_at = case p_action when 'hide' then now() when 'unhide' then null else hidden_at end
   where id = p_id;
  perform public.admin_log('review.' || p_action, 'review', p_id::text, v.dish, why,
    jsonb_build_object('reported_at', v.reported_at, 'report_reason', v.report_reason, 'hidden_at', v.hidden_at, 'comment', v.comment), null);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Admins and audit ----------
create or replace function public.admin_admins()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.require_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', u.email, 'since', a.created_at,
      'mfa', exists (select 1 from auth.mfa_factors m where m.user_id = a.user_id and m.status = 'verified')) order by a.created_at), '[]')
    from public.app_admins a join auth.users u on u.id = a.user_id);
end $$;

-- Add by e-mail or remove. Nobody removes themselves and the last admin always stays.
create or replace function public.admin_set_admin(p_email text, p_add boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := public.require_admin(); why text := public.admin_reason(p_reason); target uuid;
begin
  select id into target from auth.users where lower(email) = lower(btrim(p_email));
  if target is null then raise exception 'account not found' using errcode = 'P0001', hint = 'no_account'; end if;
  if p_add then
    insert into public.app_admins (user_id) values (target) on conflict do nothing;
  else
    if target = me then raise exception 'self' using errcode = 'P0001', hint = 'self'; end if;
    lock table public.app_admins in exclusive mode;
    if (select count(*) from public.app_admins) <= 1 then raise exception 'last admin' using errcode = 'P0001', hint = 'last_admin'; end if;
    delete from public.app_admins where user_id = target;
  end if;
  perform public.admin_log(case when p_add then 'admin.add' else 'admin.remove' end, 'user', target::text, lower(btrim(p_email)), why, null, null);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_audit(p_q text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform public.require_admin();
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc), '[]') from (
    select * from public.admin_audit_log l
     where q is null or l.action ilike '%' || q || '%' or l.target_label ilike '%' || q || '%' or l.admin_email ilike '%' || q || '%' or l.reason ilike '%' || q || '%'
     order by l.id desc limit 300) x);
end $$;

-- Grants: helpers are internal; panel functions are callable by signed-in users and refuse non-admins inside.
revoke all on function public.require_admin(), public.admin_reason(text), public.admin_log(text, text, text, text, text, jsonb, jsonb),
  public.admin_audit_immutable() from public, anon, authenticated;
revoke all on function public.admin_whoami(), public.admin_overview(), public.admin_restaurants(text),
  public.admin_set_branch_status(uuid, boolean, text), public.admin_suspend_restaurant(uuid, boolean, text),
  public.admin_delete_restaurant(uuid, boolean, text), public.admin_transfer_restaurant(uuid, text, text),
  public.admin_users(text), public.admin_ban_user(uuid, integer, text), public.admin_signout_user(uuid, text),
  public.admin_delete_user(uuid, text, text), public.admin_reviews(text, text), public.admin_moderate_review(uuid, text, text),
  public.admin_admins(), public.admin_set_admin(text, boolean, text), public.admin_audit(text) from public, anon;
grant execute on function public.admin_whoami(), public.admin_overview(), public.admin_restaurants(text),
  public.admin_set_branch_status(uuid, boolean, text), public.admin_suspend_restaurant(uuid, boolean, text),
  public.admin_delete_restaurant(uuid, boolean, text), public.admin_transfer_restaurant(uuid, text, text),
  public.admin_users(text), public.admin_ban_user(uuid, integer, text), public.admin_signout_user(uuid, text),
  public.admin_delete_user(uuid, text, text), public.admin_reviews(text, text), public.admin_moderate_review(uuid, text, text),
  public.admin_admins(), public.admin_set_admin(text, boolean, text), public.admin_audit(text) to authenticated;
