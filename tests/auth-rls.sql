begin;
select set_config('test.user_a', gen_random_uuid()::text, true);
select set_config('test.user_b', gen_random_uuid()::text, true);
insert into auth.users(id) values (current_setting('test.user_a')::uuid), (current_setting('test.user_b')::uuid);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',current_setting('test.user_a'),'role','authenticated')::text,true);
insert into public.account_profiles(user_id,display_name) values ((select auth.uid()),'Prueba A');
insert into public.restaurants(auth_owner_id,name) values ((select auth.uid()),'Restaurante de prueba');
insert into public.restaurants(auth_owner_id,name) values ((select auth.uid()),'Restaurante de prueba') on conflict(auth_owner_id,name) do nothing;
do $test$ begin
  if (select count(*) from public.restaurants) <> 1 then raise exception 'Owner read or idempotency failed'; end if;
  begin
    update public.restaurants set description=repeat('x',2001);
    raise exception 'Oversized description accepted';
  exception when check_violation then null; end;
  begin
    update public.restaurants set auth_owner_id=current_setting('test.user_b')::uuid;
    raise exception 'Owner reassignment allowed';
  exception when insufficient_privilege then null; end;
  update public.restaurants set name='Perfil editado', description='Descripcion propia';
  if not exists (select 1 from public.restaurants where name='Perfil editado' and description='Descripcion propia') then
    raise exception 'Owner profile update failed';
  end if;
  begin
    insert into public.restaurants(auth_owner_id,name) values (current_setting('test.user_b')::uuid,'Forbidden');
    raise exception 'Ownership spoofing was allowed';
  exception when insufficient_privilege then null; end;
end $test$;
select set_config('request.jwt.claims', json_build_object('sub',current_setting('test.user_b'),'role','authenticated')::text,true);
do $test$ declare affected integer; begin
  if (select count(*) from public.restaurants) <> 0 then raise exception 'Cross-owner read allowed'; end if;
  if (select count(*) from public.account_profiles) <> 0 then raise exception 'Cross-user profile read allowed'; end if;
  update public.restaurants set name='Forbidden edit', description='Forbidden description';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner update allowed'; end if;
  begin
    insert into public.account_profiles(user_id,display_name) values(current_setting('test.user_a')::uuid,'Forged profile');
    raise exception 'Cross-user profile insert allowed';
  exception when insufficient_privilege then null; end;
end $test$;
reset role;
select 'PASS: owner read, idempotency, cross-owner isolation, profile isolation, ownership spoof prevention' as verification;
rollback;
