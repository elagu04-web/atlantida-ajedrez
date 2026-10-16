begin;
create extension if not exists pg_net with schema extensions;
create schema if not exists atlantida_privado;
revoke all on schema atlantida_privado from public,anon,authenticated;
grant usage on schema atlantida_privado to anon,authenticated;

create table public.entrenamiento_analisis (
 id uuid primary key default gen_random_uuid(), usuario_id uuid not null references auth.users(id) on delete cascade,
 lote_id uuid not null, titulo text not null check(length(titulo)<=200), color text not null check(color in ('w','b')),
 estado text not null default 'pendiente' check(estado in ('pendiente','procesando','terminado','cancelado','error')),
 evaluadas integer not null default 0 check(evaluadas between 0 and 601), total integer not null check(total between 2 and 601),
 sesion_id text not null, error text, creada timestamptz not null default now(), actualizada timestamptz not null default now(),
 check(evaluadas<=total)
);
alter table public.entrenamiento_analisis enable row level security;
revoke all on public.entrenamiento_analisis from public,anon,authenticated;
grant select on public.entrenamiento_analisis to authenticated;
create policy analisis_solo_mio on public.entrenamiento_analisis for select to authenticated using ((select auth.uid())=usuario_id);
create index analisis_usuario_fecha on public.entrenamiento_analisis(usuario_id,creada desc);
create index analisis_cola on public.entrenamiento_analisis(actualizada,id) where estado in ('pendiente','procesando');
create index analisis_lote on public.entrenamiento_analisis(lote_id,usuario_id);

create table atlantida_privado.analisis_datos (
 id uuid primary key references public.entrenamiento_analisis(id) on delete cascade,
 pgn text not null check(octet_length(pgn)<=200000), evaluaciones jsonb not null default '[]' check(jsonb_typeof(evaluaciones)='array' and jsonb_array_length(evaluaciones)<=601),
 token uuid, vence timestamptz, iniciada boolean not null default false,
 intentos integer not null default 0, siguiente timestamptz not null default now()
);
alter table atlantida_privado.analisis_datos enable row level security;
revoke all on atlantida_privado.analisis_datos from public,anon,authenticated;
create table atlantida_privado.analisis_config (id boolean primary key default true check(id),activo boolean not null default false);
insert into atlantida_privado.analisis_config(id,activo) values(true,false);
alter table atlantida_privado.analisis_config enable row level security;
revoke all on atlantida_privado.analisis_config from public,anon,authenticated;

-- Only the scheduler can mint a short-lived capability. It never contains a user JWT.
create function atlantida_privado.despachar_analisis() returns void language plpgsql security definer set search_path='' as $$
declare trabajo public.entrenamiento_analisis; cred uuid;
begin
 if not (select activo from atlantida_privado.analisis_config where id) then return;end if;
 if not pg_try_advisory_xact_lock(142856,1) then return;end if;
 update public.entrenamiento_analisis j set estado='error',error='El servidor no pudo completar el trabajo. Podés reintentarlo.',actualizada=now()
 from atlantida_privado.analisis_datos d where d.id=j.id and j.estado in ('pendiente','procesando') and d.intentos>=5 and (d.vence is null or d.vence<now());
 if exists(select 1 from public.entrenamiento_analisis j join atlantida_privado.analisis_datos d using(id) where j.estado='procesando' and d.vence>now()) then return;end if;
 select j.* into trabajo from public.entrenamiento_analisis j join atlantida_privado.analisis_datos d using(id)
 where j.estado in ('pendiente','procesando') and d.siguiente<=now() and (d.vence is null or d.vence<now()) and d.intentos<5
 order by j.actualizada,j.id limit 1 for update of j skip locked;
 if not found then return;end if;
 cred:=gen_random_uuid();
 update atlantida_privado.analisis_datos set token=cred,vence=now()+interval '90 seconds',iniciada=false,intentos=intentos+1 where id=trabajo.id;
 update public.entrenamiento_analisis set estado='procesando',error=null,actualizada=now() where id=trabajo.id;
 perform net.http_post(url:='https://atlantida-ajedrez.vercel.app/api/entrenamiento/procesar',headers:=jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('id',trabajo.id,'token',cred),timeout_milliseconds:=60000);
end;$$;
revoke all on function atlantida_privado.despachar_analisis() from public,anon,authenticated;

create function atlantida_privado.encolar_analisis(p_partidas jsonb,p_solicitud uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); e jsonb; i uuid; n integer;cantidad integer;
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Iniciá sesión para analizar con la página cerrada.';end if;
 if not (select activo from atlantida_privado.analisis_config where id) then raise exception 'El análisis en servidor todavía no está disponible.';end if;
 if p_solicitud is null or p_partidas is null or jsonb_typeof(p_partidas)<>'array' then raise exception 'Lote inválido.';end if;
 cantidad:=jsonb_array_length(p_partidas);
 if cantidad<1 or cantidad>30 or octet_length(p_partidas::text)>2500000 then raise exception 'Cargá hasta 30 partidas y 2 MB por lote.';end if;
 perform pg_advisory_xact_lock(142856,2);
 if exists(select 1 from public.entrenamiento_analisis where usuario_id=u and lote_id=p_solicitud) then return p_solicitud;end if;
 if (select count(*) from public.entrenamiento_analisis where usuario_id=u and estado in ('pendiente','procesando'))+cantidad>30 then raise exception 'Ya tenés partidas pendientes. Esperá a que terminen o cancelá ese lote.';end if;
 if (select count(*) from public.entrenamiento_analisis where usuario_id=u and creada>now()-interval '24 hours')+cantidad>60 then raise exception 'Llegaste al límite de 60 partidas en 24 horas. Volvé más tarde.';end if;
 if (select count(*) from public.entrenamiento_analisis where creada>now()-interval '24 hours')+cantidad>240 then raise exception 'La cola del club está ocupada. Probá más tarde.';end if;
 for e in select value from jsonb_array_elements(p_partidas) loop
  if jsonb_typeof(e)<>'object' or coalesce(e->>'color','') not in ('w','b') or coalesce(length(e->>'titulo'),0) not between 1 and 200 or coalesce(octet_length(e->>'pgn'),0) not between 1 and 200000 or coalesce(e->>'total','') !~ '^\d{1,3}$' then raise exception 'Una partida no es válida.';end if;
  n:=(e->>'total')::integer;if n not between 2 and 601 then raise exception 'Una partida supera las 600 medias jugadas.';end if;
  i:=gen_random_uuid();
  insert into public.entrenamiento_analisis(id,usuario_id,lote_id,titulo,color,total,sesion_id) values(i,u,p_solicitud,e->>'titulo',e->>'color',n,i::text);
  insert into atlantida_privado.analisis_datos(id,pgn) values(i,e->>'pgn');
 end loop;
 perform atlantida_privado.despachar_analisis();return p_solicitud;
end;$$;
revoke all on function atlantida_privado.encolar_analisis(jsonb,uuid) from public,anon;
grant execute on function atlantida_privado.encolar_analisis(jsonb,uuid) to authenticated;
create function public.encolar_entrenamiento_analisis(p_partidas jsonb,p_solicitud uuid) returns uuid language sql security invoker set search_path='' as $$select atlantida_privado.encolar_analisis(p_partidas,p_solicitud);$$;
revoke all on function public.encolar_entrenamiento_analisis(jsonb,uuid) from public,anon;
grant execute on function public.encolar_entrenamiento_analisis(jsonb,uuid) to authenticated;

create function atlantida_privado.estado_analisis() returns boolean language sql security definer set search_path='' as $$select activo from atlantida_privado.analisis_config where id;$$;
revoke all on function atlantida_privado.estado_analisis() from public;
grant execute on function atlantida_privado.estado_analisis() to anon,authenticated;
create function public.estado_entrenamiento_analisis() returns boolean language sql security invoker set search_path='' as $$select atlantida_privado.estado_analisis();$$;
revoke all on function public.estado_entrenamiento_analisis() from public;
grant execute on function public.estado_entrenamiento_analisis() to anon,authenticated;

-- A capability is claimed once per invocation; guesses and concurrent replays return null.
create function atlantida_privado.tomar_analisis(p_id uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.entrenamiento_analisis; d atlantida_privado.analisis_datos; previa jsonb;
begin
 select * into j from public.entrenamiento_analisis where id=p_id and estado='procesando' for update;
 if not found then return null;end if;
 update atlantida_privado.analisis_datos set iniciada=true where id=p_id and token=p_token and vence>now() and not iniciada returning * into d;
 if not found then return null;end if;
 select datos into previa from public.entrenamiento_documentos where usuario_id=j.usuario_id and clave like 'sesion:%' and datos->>'pgn'=d.pgn and datos->>'color'=j.color order by actualizado_en desc limit 1;
 if previa is not null then update public.entrenamiento_analisis set sesion_id=previa->>'id' where id=p_id returning * into j;end if;
 return jsonb_build_object('id',j.id,'pgn',d.pgn,'color',j.color,'total',j.total,'sesion_id',j.sesion_id,'evaluaciones',d.evaluaciones);
end;$$;
revoke all on function atlantida_privado.tomar_analisis(uuid,uuid) from public;
grant execute on function atlantida_privado.tomar_analisis(uuid,uuid) to anon,authenticated;
create function public.tomar_entrenamiento_analisis(p_id uuid,p_token uuid) returns jsonb language sql security invoker set search_path='' as $$select atlantida_privado.tomar_analisis(p_id,p_token);$$;
revoke all on function public.tomar_entrenamiento_analisis(uuid,uuid) from public;
grant execute on function public.tomar_entrenamiento_analisis(uuid,uuid) to anon,authenticated;

create function atlantida_privado.documento_analisis(p_id uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.entrenamiento_analisis; d public.entrenamiento_documentos;
begin
 select * into j from public.entrenamiento_analisis where id=p_id and estado='procesando';
 if not found or not exists(select 1 from atlantida_privado.analisis_datos where id=p_id and token=p_token and vence>now() and iniciada) then return null;end if;
 select * into d from public.entrenamiento_documentos where usuario_id=j.usuario_id and clave='sesion:'||j.sesion_id;
 return jsonb_build_object('datos',d.datos,'revision',coalesce(d.revision,0));
end;$$;
revoke all on function atlantida_privado.documento_analisis(uuid,uuid) from public;
grant execute on function atlantida_privado.documento_analisis(uuid,uuid) to anon,authenticated;
create function public.documento_entrenamiento_analisis(p_id uuid,p_token uuid) returns jsonb language sql security invoker set search_path='' as $$select atlantida_privado.documento_analisis(p_id,p_token);$$;
revoke all on function public.documento_entrenamiento_analisis(uuid,uuid) from public;
grant execute on function public.documento_entrenamiento_analisis(uuid,uuid) to anon,authenticated;

create function atlantida_privado.avance_analisis(p_id uuid,p_token uuid,p_evaluaciones jsonb,p_liberar boolean,p_sesion jsonb,p_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.entrenamiento_analisis; d atlantida_privado.analisis_datos; doc public.entrenamiento_documentos; cantidad integer;
begin
 select * into j from public.entrenamiento_analisis where id=p_id and estado='procesando' for update;
 if not found then return jsonb_build_object('vigente',false);end if;
 select * into d from atlantida_privado.analisis_datos where id=p_id and token=p_token and vence>now() and iniciada for update;
 if not found then return jsonb_build_object('vigente',false);end if;
 if p_evaluaciones is null or jsonb_typeof(p_evaluaciones)<>'array' or octet_length(p_evaluaciones::text)>1000000 then raise exception 'Avance inválido.';end if;
 cantidad:=jsonb_array_length(p_evaluaciones);
 if cantidad<j.evaluadas or cantidad>j.total or exists(select 1 from jsonb_array_elements(d.evaluaciones) with ordinality as previo(valor,n) where previo.valor is distinct from p_evaluaciones->(previo.n::integer-1)) then raise exception 'Avance desactualizado.';end if;
 if p_sesion is not null then
  if cantidad<>j.total or p_sesion->>'id' is distinct from j.sesion_id or p_sesion->>'pgn' is distinct from d.pgn or p_sesion->>'color' is distinct from j.color or octet_length(p_sesion::text)>1500000 then raise exception 'Resultado inválido.';end if;
  select * into doc from public.entrenamiento_documentos where usuario_id=j.usuario_id and clave='sesion:'||j.sesion_id for update;
  if coalesce(doc.revision,0)<>p_revision then return jsonb_build_object('vigente',true,'conflicto',true);end if;
  insert into public.entrenamiento_documentos(usuario_id,clave,datos,revision) values(j.usuario_id,'sesion:'||j.sesion_id,p_sesion,1)
  on conflict(usuario_id,clave) do update set datos=excluded.datos,revision=public.entrenamiento_documentos.revision+1,actualizado_en=now() where public.entrenamiento_documentos.revision=p_revision;
  if not found then return jsonb_build_object('vigente',true,'conflicto',true);end if;
 end if;
 update atlantida_privado.analisis_datos set evaluaciones=p_evaluaciones,intentos=case when cantidad>j.evaluadas then 0 else intentos end,
  token=case when p_liberar or p_sesion is not null then null else token end,vence=case when p_liberar or p_sesion is not null then null else now()+interval '90 seconds' end,iniciada=not(p_liberar or p_sesion is not null) where id=p_id;
 update public.entrenamiento_analisis set evaluadas=cantidad,estado=case when p_sesion is not null then 'terminado' when p_liberar then 'pendiente' else 'procesando' end,actualizada=now(),error=null where id=p_id;
 if p_liberar or p_sesion is not null then perform atlantida_privado.despachar_analisis();end if;
 return jsonb_build_object('vigente',true,'conflicto',false);
end;$$;
revoke all on function atlantida_privado.avance_analisis(uuid,uuid,jsonb,boolean,jsonb,bigint) from public;
grant execute on function atlantida_privado.avance_analisis(uuid,uuid,jsonb,boolean,jsonb,bigint) to anon,authenticated;
create function public.avance_entrenamiento_analisis(p_id uuid,p_token uuid,p_evaluaciones jsonb,p_liberar boolean default false,p_sesion jsonb default null,p_revision bigint default 0) returns jsonb language sql security invoker set search_path='' as $$select atlantida_privado.avance_analisis(p_id,p_token,p_evaluaciones,p_liberar,p_sesion,p_revision);$$;
revoke all on function public.avance_entrenamiento_analisis(uuid,uuid,jsonb,boolean,jsonb,bigint) from public;
grant execute on function public.avance_entrenamiento_analisis(uuid,uuid,jsonb,boolean,jsonb,bigint) to anon,authenticated;

create function atlantida_privado.fallo_analisis(p_id uuid,p_token uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.entrenamiento_analisis j set estado='pendiente',actualizada=now(),error=null from atlantida_privado.analisis_datos d where d.id=j.id and j.id=p_id and j.estado='procesando' and d.token=p_token and d.vence>now();
 if found then update atlantida_privado.analisis_datos set token=null,vence=null,iniciada=false,siguiente=now()+interval '30 seconds' where id=p_id;end if;
end;$$;
revoke all on function atlantida_privado.fallo_analisis(uuid,uuid) from public;
grant execute on function atlantida_privado.fallo_analisis(uuid,uuid) to anon,authenticated;
create function public.fallo_entrenamiento_analisis(p_id uuid,p_token uuid) returns void language sql security invoker set search_path='' as $$select atlantida_privado.fallo_analisis(p_id,p_token);$$;
revoke all on function public.fallo_entrenamiento_analisis(uuid,uuid) from public;
grant execute on function public.fallo_entrenamiento_analisis(uuid,uuid) to anon,authenticated;

create function atlantida_privado.cambiar_lote_analisis(p_lote uuid,p_reintentar boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Iniciá sesión.';end if;
 update public.entrenamiento_analisis set estado=case when p_reintentar then 'pendiente' else 'cancelado' end,error=null,actualizada=now()
 where usuario_id=u and lote_id=p_lote and estado=any(case when p_reintentar then array['error','cancelado'] else array['pendiente','procesando'] end);
 update atlantida_privado.analisis_datos d set token=null,vence=null,iniciada=false,intentos=0,siguiente=now() from public.entrenamiento_analisis j where j.id=d.id and j.usuario_id=u and j.lote_id=p_lote and j.estado in ('pendiente','cancelado');
 perform atlantida_privado.despachar_analisis();
end;$$;
revoke all on function atlantida_privado.cambiar_lote_analisis(uuid,boolean) from public,anon;
grant execute on function atlantida_privado.cambiar_lote_analisis(uuid,boolean) to authenticated;
create function public.cambiar_lote_entrenamiento_analisis(p_lote uuid,p_reintentar boolean default false) returns void language sql security invoker set search_path='' as $$select atlantida_privado.cambiar_lote_analisis(p_lote,p_reintentar);$$;
revoke all on function public.cambiar_lote_entrenamiento_analisis(uuid,boolean) from public,anon;
grant execute on function public.cambiar_lote_entrenamiento_analisis(uuid,boolean) to authenticated;

select cron.schedule('atlantida-analisis-entrenamiento','* * * * *',$cron$select atlantida_privado.despachar_analisis();$cron$);
notify pgrst,'reload schema';
commit;
