-- Diner favorites (user ↔ published branch). Owner-only via RLS; listing goes through
-- get_my_favorites so unpublished branches are hidden and diners never read branch tables directly.

create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  branch_id uuid not null references public.restaurant_branches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);
alter table public.favorites enable row level security;
comment on table public.favorites is 'Diner favorites. Only published branches can be added; max 200 per user.';

create or replace function public.can_add_favorite(p_branch_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.restaurant_branches where id = p_branch_id and status = 'published')
     and (select count(*) from public.favorites where user_id = (select auth.uid())) < 200
$$;
revoke all on function public.can_add_favorite(uuid) from public, anon;
grant execute on function public.can_add_favorite(uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'favorites' and policyname = 'favorites_select_own') then
    create policy favorites_select_own on public.favorites for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'favorites' and policyname = 'favorites_insert_own') then
    create policy favorites_insert_own on public.favorites for insert to authenticated
      with check (user_id = (select auth.uid()) and public.can_add_favorite(branch_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'favorites' and policyname = 'favorites_delete_own') then
    create policy favorites_delete_own on public.favorites for delete to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;

revoke all on public.favorites from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (branch_id) on public.favorites to authenticated;

create or replace function public.get_my_favorites()
returns table (id uuid, restaurant_id uuid, name text, branch_name text, description text, address text,
               municipality text, department text, latitude double precision, longitude double precision)
language sql stable security definer set search_path = public, pg_temp as $$
  select b.id, r.id, r.name::text, b.name::text, r.description::text, b.address::text, b.municipality::text,
         b.department::text, b.latitude::double precision, b.longitude::double precision
    from public.favorites f
    join public.restaurant_branches b on b.id = f.branch_id and b.status = 'published'
    join public.restaurants r on r.id = b.restaurant_id
   where f.user_id = (select auth.uid())
   order by f.created_at desc
   limit 200
$$;
revoke all on function public.get_my_favorites() from public, anon;
grant execute on function public.get_my_favorites() to authenticated;
