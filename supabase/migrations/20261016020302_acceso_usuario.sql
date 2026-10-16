begin;
-- Only the trusted Auth relay can resolve a username to its Auth identity.
create table atlantida_privado.accesos_usuario(
 usuario text primary key check(usuario ~ '^[a-z0-9][a-z0-9_]{2,23}$'),
 usuario_id uuid not null unique references auth.users(id) on delete cascade,
 creada timestamptz not null default now()
);
alter table atlantida_privado.accesos_usuario enable row level security;
revoke all on atlantida_privado.accesos_usuario from public,anon,authenticated;
create table atlantida_privado.limites_acceso(
 clave text primary key check(length(clave)<=100),
 ventana timestamptz not null, intentos integer not null
);
alter table atlantida_privado.limites_acceso enable row level security;
revoke all on atlantida_privado.limites_acceso from public,anon,authenticated;

create function atlantida_privado.resolver_acceso(p_usuario text) returns text
language sql stable security definer set search_path='' as $$
 select u.email from atlantida_privado.accesos_usuario a join auth.users u on u.id=a.usuario_id
 where a.usuario=p_usuario and u.email_confirmed_at is not null
 and (u.banned_until is null or u.banned_until<now())
$$;
create function atlantida_privado.nombre_acceso(p_id uuid) returns text
language sql stable security definer set search_path='' as $$
 select usuario from atlantida_privado.accesos_usuario where usuario_id=p_id
$$;
create function atlantida_privado.asignar_acceso(p_id uuid,p_usuario text) returns void
language plpgsql security definer set search_path='' as $$
begin
 -- An account has one immutable login name; retries of the same name are safe.
 insert into atlantida_privado.accesos_usuario(usuario,usuario_id) values(p_usuario,p_id)
 on conflict(usuario_id) do update set usuario=excluded.usuario
 where atlantida_privado.accesos_usuario.usuario=excluded.usuario;
 if not found then raise exception 'Esta cuenta ya tiene otro usuario.';end if;
end $$;
create function atlantida_privado.limitar_acceso(p_clave text,p_max integer,p_segundos integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;t timestamptz:=clock_timestamp();
begin
 if p_max not between 1 and 1000 or p_segundos not between 1 and 86400 then return false;end if;
 delete from atlantida_privado.limites_acceso where ventana<t-interval '2 days';
 insert into atlantida_privado.limites_acceso(clave,ventana,intentos) values(p_clave,t,1)
 on conflict(clave) do update set
 intentos=case when atlantida_privado.limites_acceso.ventana<=t-make_interval(secs=>p_segundos) then 1 else least(atlantida_privado.limites_acceso.intentos+1,1001) end,
 ventana=case when atlantida_privado.limites_acceso.ventana<=t-make_interval(secs=>p_segundos) then t else atlantida_privado.limites_acceso.ventana end
 returning intentos into n;
 return n<=p_max;
end $$;
create function public.resolver_acceso_usuario(p_usuario text) returns text language sql security invoker set search_path='' as $$select atlantida_privado.resolver_acceso(p_usuario)$$;
create function public.nombre_acceso_usuario(p_id uuid) returns text language sql security invoker set search_path='' as $$select atlantida_privado.nombre_acceso(p_id)$$;
create function public.asignar_acceso_usuario(p_id uuid,p_usuario text) returns void language sql security invoker set search_path='' as $$select atlantida_privado.asignar_acceso(p_id,p_usuario)$$;
create function public.limitar_acceso_usuario(p_clave text,p_max integer,p_segundos integer) returns boolean language sql security invoker set search_path='' as $$select atlantida_privado.limitar_acceso(p_clave,p_max,p_segundos)$$;
revoke all on function atlantida_privado.resolver_acceso(text),atlantida_privado.nombre_acceso(uuid),atlantida_privado.asignar_acceso(uuid,text),atlantida_privado.limitar_acceso(text,integer,integer) from public,anon,authenticated;
revoke all on function public.resolver_acceso_usuario(text),public.nombre_acceso_usuario(uuid),public.asignar_acceso_usuario(uuid,text),public.limitar_acceso_usuario(text,integer,integer) from public,anon,authenticated;
grant usage on schema atlantida_privado to service_role;
grant execute on function atlantida_privado.resolver_acceso(text),atlantida_privado.nombre_acceso(uuid),atlantida_privado.asignar_acceso(uuid,text),atlantida_privado.limitar_acceso(text,integer,integer),public.resolver_acceso_usuario(text),public.nombre_acceso_usuario(uuid),public.asignar_acceso_usuario(uuid,text),public.limitar_acceso_usuario(text,integer,integer) to service_role;
notify pgrst,'reload schema';
commit;
