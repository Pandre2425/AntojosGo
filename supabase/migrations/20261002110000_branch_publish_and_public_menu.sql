-- Etapa 2: owner publishes/unpublishes a branch directly (no approval step, user decision 2026-10-02)
-- and diners read the published menu of a published branch.
-- Clients still have no UPDATE grant on restaurant_branches.status; the only path is this function,
-- which enforces ownership and minimum publish requirements. 'inactive' is reserved for AntojosGo
-- (suspension) and cannot be changed by the owner. Idempotent.

create or replace function public.set_branch_published(p_branch_id uuid, p_publish boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare b record;
begin
  select br.status, br.latitude, br.address
    into b
    from public.restaurant_branches br
    join public.restaurants r on r.id = br.restaurant_id
   where br.id = p_branch_id and r.auth_owner_id = (select auth.uid())
   for update of br;
  if not found then
    raise exception 'branch not found' using errcode = 'P0002';
  end if;
  if b.status = 'inactive' then
    raise exception 'branch suspended' using errcode = 'P0001', hint = 'inactive';
  end if;
  if p_publish and b.latitude is null then
    raise exception 'location required' using errcode = 'P0001', hint = 'location';
  end if;
  update public.restaurant_branches
     set status = case when p_publish then 'published' else 'draft' end
   where id = p_branch_id;
  return case when p_publish then 'published' else 'draft' end;
end $$;

-- Published + visible dishes of a published branch. Out-of-stock dishes are returned flagged,
-- so diners see them as "Agotado" instead of the menu silently shrinking.
create or replace function public.get_public_menu(p_branch_id uuid)
returns table (id uuid, name text, price numeric, category text, description text, is_available boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select f.id, f.name, f.price, f.category, f.description, f.is_available
    from public.restaurant_branches b
    join public.foods f on f.restaurant_id = b.restaurant_id
   where b.id = p_branch_id and b.status = 'published' and f.status = 'published'
   order by f.category nulls last, f.name, f.id
   limit 300;
$$;

revoke all on function public.set_branch_published(uuid, boolean) from public, anon;
grant execute on function public.set_branch_published(uuid, boolean) to authenticated;
revoke all on function public.get_public_menu(uuid) from public;
grant execute on function public.get_public_menu(uuid) to anon, authenticated;

comment on function public.set_branch_published is 'Owner-only draft<->published toggle; publishing requires saved coordinates; inactive is admin-only.';
comment on function public.get_public_menu is 'Diner menu: published dishes of a published branch, safe columns.';
