-- Native PostgreSQL rehearsal: local restore instance only; all test rows roll back.
begin;
set local search_path=public,extensions;
do $$ begin
 if inet_server_port() is distinct from 55439 or host(inet_server_addr()) not in ('127.0.0.1','::1') then
  raise exception 'This rehearsal must run on the isolated local restore server';
 end if;
end $$;
do $$
declare u uuid:=gen_random_uuid(); pw text:='Synthetic-Test-Password-Only!'; h text; n int;
begin
 if has_table_privilege('anon','public.staff_temporary_credentials','SELECT') or
    has_table_privilege('authenticated','public.staff_temporary_credentials','SELECT') or
    has_function_privilege('authenticated','public.save_staff_temporary_credential(uuid,text,text,uuid)','EXECUTE') then
  raise exception 'Credential access grants are unsafe';
 end if;
 insert into auth.users(id,email,encrypted_password) values(u,'credential-rehearsal@example.invalid',crypt(pw,gen_salt('bf')));
 perform public.save_staff_temporary_credential(u,pw,'v1.encrypted-test-payload',u);
 select count(*) into n from public.staff_temporary_credentials where user_id=u;
 if n<>1 then raise exception 'Temporary credential was not saved'; end if;
 update auth.users set email='renamed-rehearsal@example.invalid' where id=u;
 if not exists(select 1 from public.staff_temporary_credentials where user_id=u) then raise exception 'Unchanged password copy was lost'; end if;
 update auth.users set encrypted_password=crypt('Personal-password-is-not-retained!',gen_salt('bf')) where id=u;
 if exists(select 1 from public.staff_temporary_credentials where user_id=u) then raise exception 'Password change did not invalidate credential'; end if;
 begin
  perform public.save_staff_temporary_credential(u,pw,'v1.stale-copy',u);
  raise exception 'Stale password was accepted';
 exception when raise_exception then
  if sqlerrm <> 'Password changed before temporary credential could be saved' then raise; end if;
 end;
 perform public.save_staff_temporary_credential(u,'Personal-password-is-not-retained!','v1.replacement-test-payload',u);
 delete from auth.users where id=u;
 if exists(select 1 from public.staff_temporary_credentials where user_id=u) then raise exception 'Deleted account retained credential'; end if;
end $$;
rollback;
select 'PASS: private grants, bcrypt match, persistence, password-change invalidation, stale-write rejection and deletion cleanup' as result;
