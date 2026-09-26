begin;
select set_config('test.branch_owner',gen_random_uuid()::text,true);
select set_config('test.branch_other',gen_random_uuid()::text,true);
select set_config('test.branch_business',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('test.branch_owner')::uuid),(current_setting('test.branch_other')::uuid);
insert into public.restaurants(id,auth_owner_id,name) values(current_setting('test.branch_business')::uuid,current_setting('test.branch_owner')::uuid,'Branch test');
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.branch_owner'),'role','authenticated')::text,true);
insert into public.restaurant_branches(restaurant_id,name,department,municipality,address)
select current_setting('test.branch_business')::uuid,'Sede '||n,'Quetzaltenango','Quetzaltenango','Direccion de prueba' from generate_series(1,21) n;
do $test$ begin
  update public.restaurant_branches set latitude=14.84,longitude=-91.52;
  if (select count(*) from public.restaurant_branches where latitude=14.84 and longitude=-91.52) <> 21 then raise exception 'Location save failed'; end if;
  begin
    update public.restaurant_branches set latitude=91;
    raise exception 'Invalid latitude accepted';
  exception when check_violation then null; end;
  begin
    update public.restaurant_branches set longitude=null;
    raise exception 'Incomplete pair accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.restaurant_branches) <> 21 then raise exception 'Multiple branches failed'; end if;
  begin
    update public.restaurant_branches set status='published';
    raise exception 'Client could publish';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.restaurant_branches(restaurant_id,name,department,municipality,address) values(current_setting('test.branch_business')::uuid,'Invalid','Quetzaltenango','Quetzaltenango','x');
    raise exception 'Invalid address accepted';
  exception when check_violation then null; end;
end $test$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.branch_other'),'role','authenticated')::text,true);
do $test$ declare affected integer; begin
  if (select count(*) from public.restaurant_branches) <> 0 then raise exception 'Other owner read branches'; end if;
  update public.restaurant_branches set latitude=0,longitude=0;
  get diagnostics affected=row_count;
  if affected <> 0 then raise exception 'Other owner updated branches'; end if;
  begin
    insert into public.restaurant_branches(restaurant_id,name,department,municipality,address) values(current_setting('test.branch_business')::uuid,'Forbidden','Quetzaltenango','Quetzaltenango','Direccion ajena');
    raise exception 'Other owner inserted branch';
  exception when insufficient_privilege then null; end;
end $test$;
reset role;
select 'PASS: multiple branches, ownership, unpublished state, address validation' as verification;
rollback;
