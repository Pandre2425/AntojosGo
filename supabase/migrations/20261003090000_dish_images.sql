-- Fase 5: dish photos in Supabase Storage.
-- Bucket "restaurant-media": public read (photos of published dishes are public content; object
-- names are random so drafts are not discoverable by listing), 5 MB max, JPEG/PNG/WebP only.
-- Layout: <restaurant_id>/dishes/<dish_id>/<random>.<ext>. Owners may write only under their
-- restaurant folder. foods.image_url is set only through set_dish_image (path-checked),
-- never by a direct client UPDATE. No DROP statements (idempotent via IF NOT EXISTS / OR REPLACE).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-media', 'restaurant-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.owns_restaurant_folder(p_name text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.restaurants r
     where r.auth_owner_id = (select auth.uid())
       and r.id::text = split_part(p_name, '/', 1)
  ) and split_part(p_name, '/', 2) = 'dishes'
$$;
revoke all on function public.owns_restaurant_folder(text) from public, anon;
grant execute on function public.owns_restaurant_folder(text) to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'restaurant_media_owner_insert') then
    create policy restaurant_media_owner_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'restaurant-media' and public.owns_restaurant_folder(name));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'restaurant_media_owner_delete') then
    create policy restaurant_media_owner_delete on storage.objects for delete to authenticated
      using (bucket_id = 'restaurant-media' and public.owns_restaurant_folder(name));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'restaurant_media_owner_select') then
    create policy restaurant_media_owner_select on storage.objects for select to authenticated
      using (bucket_id = 'restaurant-media' and public.owns_restaurant_folder(name));
  end if;
end $$;

-- Sets or clears a dish photo. The object path must live in the dish's own folder.
create or replace function public.set_dish_image(p_dish_id uuid, p_path text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_restaurant uuid; v_url text;
begin
  select f.restaurant_id into v_restaurant
    from public.foods f join public.restaurants r on r.id = f.restaurant_id
   where f.id = p_dish_id and r.auth_owner_id = (select auth.uid());
  if not found then raise exception 'dish not found' using errcode = 'P0002'; end if;
  if p_path is null then
    update public.foods set image_url = null where id = p_dish_id;
    return null;
  end if;
  if p_path !~ ('^' || v_restaurant::text || '/dishes/' || p_dish_id::text || '/[A-Za-z0-9_-]{8,64}\.(jpg|png|webp)$') then
    raise exception 'invalid image path' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'restaurant-media' and o.name = p_path) then
    raise exception 'image not uploaded' using errcode = 'P0002';
  end if;
  v_url := p_path; -- stored as storage path; clients build the public URL
  update public.foods set image_url = v_url where id = p_dish_id;
  return v_url;
end $$;
revoke all on function public.set_dish_image(uuid, text) from public, anon;
grant execute on function public.set_dish_image(uuid, text) to authenticated;

-- Public menu with photo path. get_public_menu (no image) is kept for compatibility because
-- changing its return type needs a DROP; remove it later from the SQL Editor.
create or replace function public.get_public_dishes(p_branch_id uuid)
returns table (id uuid, name text, price numeric, category text, description text, is_available boolean, image_path text)
language sql stable security definer set search_path = public, pg_temp as $$
  select f.id, f.name, f.price, f.category, f.description, f.is_available, f.image_url
    from public.restaurant_branches b
    join public.foods f on f.restaurant_id = b.restaurant_id
   where b.id = p_branch_id and b.status = 'published' and f.status = 'published'
   order by f.category nulls last, f.name, f.id
   limit 300;
$$;
revoke all on function public.get_public_dishes(uuid) from public;
grant execute on function public.get_public_dishes(uuid) to anon, authenticated;
