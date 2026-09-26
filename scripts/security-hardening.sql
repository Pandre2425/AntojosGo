-- Preserve legacy records while removing unused API access.
revoke all on public.users from anon, authenticated;
alter table public.restaurants add constraint restaurants_description_length
  check (description is null or char_length(description) <= 2000) not valid;
alter table public.restaurants validate constraint restaurants_description_length;
