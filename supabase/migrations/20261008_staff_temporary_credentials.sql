begin;

-- Only encrypted admin-issued credentials are retained. Personal passwords stay in Auth.
create table if not exists public.staff_temporary_credentials (
 user_id uuid primary key references auth.users(id) on delete cascade,
 ciphertext text not null check (ciphertext like 'v1.%'),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.staff_temporary_credentials enable row level security;
revoke all on public.staff_temporary_credentials from public,anon,authenticated;
grant select,insert,update,delete on public.staff_temporary_credentials to service_role;

create or replace function public.save_staff_temporary_credential(p_user uuid,p_password text,p_ciphertext text,p_actor uuid) returns void
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare current_hash text;
begin
 -- Lock against concurrent password changes; never save a stale issued password.
 select encrypted_password into current_hash from auth.users where id=p_user for update;
 if not found or current_hash is null or current_hash='' or crypt(p_password,current_hash) is distinct from current_hash then
  raise exception 'Password changed before temporary credential could be saved';
 end if;
 insert into public.staff_temporary_credentials(user_id,ciphertext,created_by)
 values(p_user,p_ciphertext,p_actor)
 on conflict(user_id) do update set ciphertext=excluded.ciphertext,created_by=excluded.created_by,created_at=now();
end $$;
revoke all on function public.save_staff_temporary_credential(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.save_staff_temporary_credential(uuid,text,text,uuid) to service_role;

create or replace function public.clear_staff_temporary_credential() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.encrypted_password is distinct from new.encrypted_password then
  delete from public.staff_temporary_credentials where user_id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.clear_staff_temporary_credential() from public,anon,authenticated;
drop trigger if exists clear_staff_temporary_credential on auth.users;
create trigger clear_staff_temporary_credential after update of encrypted_password on auth.users
for each row execute function public.clear_staff_temporary_credential();

notify pgrst, 'reload schema';
commit;
