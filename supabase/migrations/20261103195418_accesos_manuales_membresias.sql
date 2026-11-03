begin;
create table membresias_privado.acceso_config (
 id boolean primary key default true check(id), entrenamiento_abierto boolean not null default true,
 revision integer not null default 1, actualizada timestamptz not null default now(), actualizada_por uuid
);
insert into membresias_privado.acceso_config(id) values(true);
create table membresias_privado.accesos (
 id uuid primary key,usuario_id uuid not null references auth.users(id) on delete cascade,
 entrenamiento boolean not null,docentes boolean not null,desde date not null,hasta date not null,
 nota text not null default '' check(length(nota)<=400),solicitud jsonb not null,
 creada timestamptz not null default now(),creada_por uuid not null,
 revocada boolean not null default false,motivo text,revocada_en timestamptz,revocada_por uuid,
 check(entrenamiento or docentes),check(hasta>desde and hasta<=desde+3660)
);
create index accesos_cuenta_vigencia on membresias_privado.accesos(usuario_id,hasta) where not revocada;
alter table membresias_privado.acceso_config enable row level security;
alter table membresias_privado.accesos enable row level security;
revoke all on membresias_privado.acceso_config,membresias_privado.accesos from public,anon,authenticated;

-- Internal projection. It has no client EXECUTE grant; only the checked
-- definer functions below can look up somebody else's account.
create function membresias_privado.estado_acceso(p_usuario uuid,p_recurso text) returns jsonb
language sql stable security invoker set search_path='' as $$
 with manual as (
  select max(hasta) hasta from membresias_privado.accesos
  where usuario_id=p_usuario and not revocada and desde<=(now() at time zone 'America/Montevideo')::date
  and hasta>(now() at time zone 'America/Montevideo')::date
  and case p_recurso when 'entrenamiento' then entrenamiento when 'docentes' then docentes else false end
 ),cuotas as (
  select max(hasta) hasta from membresias_privado.periodos where usuario_id=p_usuario and not anulada
  and desde<=(now() at time zone 'America/Montevideo')::date and hasta>(now() at time zone 'America/Montevideo')::date
  and p_recurso='entrenamiento' and plan in('completo','entrenamiento')
 ),base as (
  select greatest(manual.hasta,cuotas.hasta) hasta,
  (p_recurso='entrenamiento' and (select entrenamiento_abierto from membresias_privado.acceso_config where id)) abierto
  from manual,cuotas
 ) select jsonb_build_object('permitido',coalesce(p_usuario='f2c0ea67-e4e3-454e-81ee-f3175df90b3d'::uuid,false) or abierto or hasta is not null,'abierto',abierto,'hasta',hasta) from base;
$$;
revoke all on function membresias_privado.estado_acceso(uuid,text) from public,anon,authenticated;

create function membresias_privado.mi_acceso(p_recurso text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if p_recurso is null or p_recurso not in('entrenamiento','docentes') then return false;end if;
 if coalesce(auth.jwt()->>'is_anonymous','false')='true' then u:=null;end if;
 return (membresias_privado.estado_acceso(u,p_recurso)->>'permitido')::boolean;
end $$;
revoke all on function membresias_privado.mi_acceso(text) from public,anon,authenticated;
grant execute on function membresias_privado.mi_acceso(text) to anon,authenticated;
grant usage on schema membresias_privado to anon;
create function public.tiene_acceso_membresia(p_recurso text) returns boolean
language sql stable security invoker set search_path='' as $$select membresias_privado.mi_acceso(p_recurso)$$;
revoke all on function public.tiene_acceso_membresia(text) from public,anon,authenticated;
grant execute on function public.tiene_acceso_membresia(text) to anon,authenticated;

create function membresias_privado.mis_accesos() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if coalesce(auth.jwt()->>'is_anonymous','false')='true' then u:=null;end if;
 return jsonb_build_object('hoy',(now() at time zone 'America/Montevideo')::date,
 'entrenamiento',membresias_privado.estado_acceso(u,'entrenamiento'),'docentes',membresias_privado.estado_acceso(u,'docentes'));
end $$;
revoke all on function membresias_privado.mis_accesos() from public,anon,authenticated;
grant execute on function membresias_privado.mis_accesos() to anon,authenticated;
create function public.mi_acceso_membresia() returns jsonb language sql stable security invoker set search_path='' as $$select membresias_privado.mis_accesos()$$;
revoke all on function public.mi_acceso_membresia() from public,anon,authenticated;
grant execute on function public.mi_acceso_membresia() to anon,authenticated;

create function membresias_privado.gestion_accesos(p_accion text,p_datos jsonb,p_usuario uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();v_id uuid;v_cuenta uuid;v_desde date;v_hasta date;v_ent boolean;v_doc boolean;previo membresias_privado.accesos;cfg membresias_privado.acceso_config;cuentas jsonb;historial jsonb;
begin
 if u is null or u is distinct from p_usuario or u<>'f2c0ea67-e4e3-454e-81ee-f3175df90b3d'::uuid or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Solo el administrador puede gestionar accesos.';end if;
 if p_datos is null or jsonb_typeof(p_datos)<>'object' or octet_length(p_datos::text)>5000 then raise exception 'Solicitud inválida.';end if;
 if p_accion='habilitar' then
  v_id:=(p_datos->>'id')::uuid;v_cuenta:=(p_datos->>'cuenta')::uuid;v_desde:=(p_datos->>'desde')::date;v_hasta:=(p_datos->>'hasta')::date;v_ent:=(p_datos->>'entrenamiento')::boolean;v_doc:=(p_datos->>'docentes')::boolean;
  if v_id is null or v_cuenta is null or v_ent is null or v_doc is null or not(v_ent or v_doc) or v_desde is null or v_hasta is null or v_desde<'2000-01-01'::date or v_desde>(now() at time zone 'America/Montevideo')::date+366 or v_hasta<=v_desde or v_hasta>v_desde+3660 or length(coalesce(p_datos->>'nota',''))>400 then raise exception 'Revisá cuenta, accesos y fechas.';end if;
  if not exists(select 1 from auth.users where id=v_cuenta and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then raise exception 'Elegí una cuenta confirmada.';end if;
  perform pg_advisory_xact_lock(hashtextextended('acceso-cuenta:'||v_cuenta::text,0));
  select * into previo from membresias_privado.accesos where id=v_id;
  if found then
   if previo.solicitud is distinct from p_datos then raise exception 'Esta operación ya se usó con otros datos.';end if;
  else
   insert into membresias_privado.accesos(id,usuario_id,entrenamiento,docentes,desde,hasta,nota,solicitud,creada_por)
   values(v_id,v_cuenta,v_ent,v_doc,v_desde,v_hasta,coalesce(trim(p_datos->>'nota'),''),p_datos,u);
  end if;
 elsif p_accion='revocar' then
  if length(trim(coalesce(p_datos->>'motivo',''))) not between 5 and 400 then raise exception 'Escribí el motivo de la baja.';end if;
  update membresias_privado.accesos set revocada=true,motivo=trim(p_datos->>'motivo'),revocada_en=now(),revocada_por=u where id=(p_datos->>'id')::uuid and not revocada;
 elsif p_accion='prueba' then
  select * into cfg from membresias_privado.acceso_config where id for update;
  if (p_datos->>'revision')::integer is distinct from cfg.revision or jsonb_typeof(p_datos->'abierto') is distinct from 'boolean' then raise exception 'El modo de acceso cambió. Actualizá antes de guardar.';end if;
  update membresias_privado.acceso_config set entrenamiento_abierto=(p_datos->>'abierto')::boolean,revision=revision+1,actualizada=now(),actualizada_por=u where id;
 elsif p_accion is distinct from 'resumen' then raise exception 'Acción inválida.';
 end if;
 select * into cfg from membresias_privado.acceso_config where id;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'nombre',coalesce((select coalesce(nullif(j.apodo,''),j.nombre) from public.jugadores j where membresias_privado.cuenta_jugador(j.id)=a.id),nullif(trim(a.raw_user_meta_data->>'full_name'),''),nullif(trim(a.raw_user_meta_data->>'name'),''),split_part(a.email,'@',1),'Sin nombre'),'correo',a.email,'entrenamiento',membresias_privado.estado_acceso(a.id,'entrenamiento'),'docentes',membresias_privado.estado_acceso(a.id,'docentes')) order by a.created_at desc),'[]') into cuentas
 from auth.users a where a.email_confirmed_at is not null and not coalesce(a.is_anonymous,false);
 select coalesce(jsonb_agg(to_jsonb(t) order by t.creada desc,t.id),'[]') into historial from (select id,usuario_id as cuenta,entrenamiento,docentes,desde,hasta,nota,creada,revocada,motivo from membresias_privado.accesos) t;
 return jsonb_build_object('hoy',(now() at time zone 'America/Montevideo')::date,'abierto',cfg.entrenamiento_abierto,'revision',cfg.revision,'cuentas',cuentas,'historial',historial);
end $$;
revoke all on function membresias_privado.gestion_accesos(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function membresias_privado.gestion_accesos(text,jsonb,uuid) to authenticated;
create function public.gestionar_accesos_membresia(p_accion text,p_datos jsonb,p_usuario uuid) returns jsonb language sql security invoker set search_path='' as $$select membresias_privado.gestion_accesos(p_accion,p_datos,p_usuario)$$;
revoke all on function public.gestionar_accesos_membresia(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.gestionar_accesos_membresia(text,jsonb,uuid) to authenticated;

-- Only the game distribution's current version, read-only, for accounts with
-- a current teacher grant. No writes or public bucket setting.
create policy "Juegos docentes con acceso vigente" on storage.objects for select to authenticated
using(bucket_id='clases-mesa' and name like 'v1-f92404c69cf2cc3b06492a0f6e694366f330f8f7bf374d8c/%' and (select public.tiene_acceso_membresia('docentes')));

-- Existing work remains readable/exportable. New saves and analysis submissions
-- require access when the administrator ends the open beta.
create policy entrenamiento_acceso_insert on public.entrenamiento_documentos as restrictive for insert to authenticated
with check ((select public.tiene_acceso_membresia('entrenamiento')));
create policy entrenamiento_acceso_update on public.entrenamiento_documentos as restrictive for update to authenticated
using(true) with check ((select public.tiene_acceso_membresia('entrenamiento')));
create function membresias_privado.exigir_acceso_analisis() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not public.tiene_acceso_membresia('entrenamiento') then raise exception 'Tu acceso al entrenamiento no está vigente. Consultá Mi membresía.';end if;
 return new;
end $$;
revoke all on function membresias_privado.exigir_acceso_analisis() from public,anon,authenticated;
create trigger acceso_antes_de_analizar before insert on public.entrenamiento_analisis for each row execute function membresias_privado.exigir_acceso_analisis();
create or replace function public.cambiar_lote_entrenamiento_analisis(p_lote uuid,p_reintentar boolean default false) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if p_reintentar and not public.tiene_acceso_membresia('entrenamiento') then raise exception 'Tu acceso al entrenamiento no está vigente. Consultá Mi membresía.';end if;
 perform atlantida_privado.cambiar_lote_analisis(p_lote,p_reintentar);
end $$;
revoke all on function public.cambiar_lote_entrenamiento_analisis(uuid,boolean) from public,anon,authenticated;
grant execute on function public.cambiar_lote_entrenamiento_analisis(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
