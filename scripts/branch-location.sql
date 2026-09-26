-- Column grants preserve existing owner RLS, paired coordinates and range checks.
grant update(latitude,longitude) on public.restaurant_branches to authenticated;
