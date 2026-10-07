-- Weekly opening hours per branch, plus public extras for published branches.
-- opening_hours: [{ "day": 0-6 (0 = domingo), "open": "HH:MM", "close": "HH:MM" }]. close <= open means
-- the range ends after midnight. Shape is validated by the API (shared/contracts/hours.ts); the DB
-- enforces type and size. No DROP statements: get_public_branch keeps its return type and the
-- extras live in a jsonb function that later migrations can extend with CREATE OR REPLACE.

alter table public.restaurant_branches
  add column if not exists opening_hours jsonb not null default '[]'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'restaurant_branches_opening_hours_shape') then
    alter table public.restaurant_branches add constraint restaurant_branches_opening_hours_shape
      check (jsonb_typeof(opening_hours) = 'array' and jsonb_array_length(opening_hours) <= 21);
  end if;
end $$;

grant select (opening_hours), update (opening_hours) on public.restaurant_branches to authenticated;

create or replace function public.get_public_branch_extras(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('opening_hours', b.opening_hours)
    from public.restaurant_branches b
   where b.id = p_id and b.status = 'published'
$$;
revoke all on function public.get_public_branch_extras(uuid) from public;
grant execute on function public.get_public_branch_extras(uuid) to anon, authenticated;
