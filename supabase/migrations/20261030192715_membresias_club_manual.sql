begin;
create schema membresias_privado;
revoke all on schema membresias_privado from public,anon,authenticated;
grant usage on schema membresias_privado to authenticated;

-- Prices are a private simulation. Nothing here changes tournament fees or beta access.
create table membresias_privado.configuracion (
 id boolean primary key default true check(id),
 torneo integer not null default 20000 check(torneo between 0 and 100000000),
 club integer not null default 50000 check(club between 0 and 100000000),
 completo integer not null default 75000 check(completo between 0 and 100000000),
 entrenamiento integer not null default 30000 check(entrenamiento between 0 and 100000000),
 revision integer not null default 1,actualizada timestamptz not null default now(),actualizada_por uuid
);
insert into membresias_privado.configuracion(id) values(true);
create table membresias_privado.periodos (
 id uuid primary key,jugador_id uuid not null references public.jugadores(id),
 usuario_id uuid references auth.users(id) on delete set null,
 plan text not null check(plan in('club','completo','entrenamiento')),
 desde date not null,hasta date not null check(hasta>desde),
 importe integer not null check(importe between 0 and 100000000),
 medio text not null check(medio in('efectivo','transferencia','mercadopago','bonificacion')),
 referencia text not null default '' check(length(referencia)<=120),
 solicitud jsonb not null,creada timestamptz not null default now(),creada_por uuid not null,
 anulada boolean not null default false,motivo_anulacion text,anulada_por uuid,anulada_en timestamptz,
 check((medio='bonificacion' and importe=0) or (medio<>'bonificacion' and importe>0))
);
create index membresias_jugador on membresias_privado.periodos(jugador_id,hasta desc);
create index membresias_usuario on membresias_privado.periodos(usuario_id,hasta desc) where usuario_id is not null;
alter table membresias_privado.configuracion enable row level security;
alter table membresias_privado.periodos enable row level security;
revoke all on membresias_privado.configuracion,membresias_privado.periodos from public,anon,authenticated;
-- Closed tables: only the checked private functions below can access them.

create function membresias_privado.cuenta_jugador(p_jugador uuid) returns uuid
language sql stable security invoker set search_path='' as $$
 select case when count(*)=1 then (array_agg(u.id))[1] else null end
 from public.jugadores j join auth.users u on lower(trim(u.email))=lower(trim(j.email))
 where j.id=p_jugador and u.email_confirmed_at is not null
 and 1=(select count(*) from public.jugadores otro where lower(trim(otro.email))=lower(trim(j.email)));
$$;
revoke all on function membresias_privado.cuenta_jugador(uuid) from public,anon,authenticated;

create function membresias_privado.mis_periodos(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();r jsonb;
begin
 if u is null or p_usuario is distinct from u or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'La cuenta cambió. Iniciá sesión de nuevo.';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'jugadorId',p.jugador_id,'nombre',coalesce(nullif(j.apodo,''),j.nombre),'cuentaVinculada',true,'plan',p.plan,'desde',p.desde,'hasta',p.hasta,'importe',p.importe,'medio',p.medio,'referencia',p.referencia,'anulada',p.anulada,'motivoAnulacion',p.motivo_anulacion,'creada',p.creada) order by p.creada desc,p.id),'[]') into r
 from membresias_privado.periodos p join public.jugadores j on j.id=p.jugador_id where p.usuario_id=u;
 return jsonb_build_object('hoy',(now() at time zone 'America/Montevideo')::date,'periodos',r);
end $$;
revoke all on function membresias_privado.mis_periodos(uuid) from public,anon,authenticated;
grant execute on function membresias_privado.mis_periodos(uuid) to authenticated;

create function membresias_privado.gestion(p_accion text,p_datos jsonb,p_usuario uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();hoy date:=(now() at time zone 'America/Montevideo')::date;
 j uuid;v_id uuid;v_plan text;v_desde date;v_hasta date;v_meses integer;v_importe integer;v_medio text;v_ref text;v_motivo text;v_uid uuid;previa membresias_privado.periodos;config membresias_privado.configuracion;ps jsonb;js jsonb;
begin
 if u is null or p_usuario is distinct from u or u<>'f2c0ea67-e4e3-454e-81ee-f3175df90b3d'::uuid or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Solo el administrador puede gestionar membresías.';end if;
 if p_datos is null or jsonb_typeof(p_datos)<>'object' or octet_length(p_datos::text)>5000 then raise exception 'Datos inválidos.';end if;
 if p_accion='registrar' then
  v_id:=(p_datos->>'id')::uuid;j:=(p_datos->>'jugadorId')::uuid;v_plan:=p_datos->>'plan';v_desde:=(p_datos->>'desde')::date;v_meses:=(p_datos->>'meses')::integer;v_importe:=(p_datos->>'importe')::integer;v_medio:=p_datos->>'medio';v_ref:=trim(coalesce(p_datos->>'referencia',''));
  if v_id is null or j is null or v_plan is null or v_plan not in('club','completo','entrenamiento') or v_desde is null or v_desde<'2000-01-01'::date or v_desde>hoy+366 or v_meses is null or v_meses not between 1 and 12 or v_importe is null or v_importe not between 0 and 100000000 or v_medio is null or v_medio not in('efectivo','transferencia','mercadopago','bonificacion') or length(v_ref)>120 or (v_medio='bonificacion')<>(v_importe=0) then raise exception 'Revisá jugador, plan, fechas, importe y medio.';end if;
  perform pg_advisory_xact_lock(hashtextextended('membresia:'||j::text,0));
  select * into previa from membresias_privado.periodos where id=v_id;
  if found then
   if previa.solicitud is distinct from p_datos then raise exception 'Esta operación ya fue utilizada con otros datos.';end if;
  else
   if not exists(select 1 from public.jugadores where id=j) then raise exception 'El jugador ya no existe.';end if;
   -- Extend shared benefits; never consume already-paid days or double-book them.
   select greatest(v_desde,coalesce(max(hasta),v_desde)) into v_desde from membresias_privado.periodos
   where jugador_id=j and not anulada and ((v_plan in('club','completo') and plan in('club','completo')) or (v_plan in('entrenamiento','completo') and plan in('entrenamiento','completo')));
   v_hasta:=(v_desde+make_interval(months=>v_meses))::date;
   v_uid:=membresias_privado.cuenta_jugador(j);
   insert into membresias_privado.periodos(id,jugador_id,usuario_id,plan,desde,hasta,importe,medio,referencia,solicitud,creada_por) values(v_id,j,v_uid,v_plan,v_desde,v_hasta,v_importe,v_medio,v_ref,p_datos,u);
  end if;
 elsif p_accion='anular' then
  v_id:=(p_datos->>'id')::uuid;v_motivo:=trim(p_datos->>'motivo');
  if v_id is null or v_motivo is null or length(v_motivo) not between 5 and 400 then raise exception 'Escribí un motivo de al menos 5 caracteres.';end if;
  select jugador_id into j from membresias_privado.periodos where id=v_id;
  if j is null then raise exception 'No existe ese registro.';end if;
  perform pg_advisory_xact_lock(hashtextextended('membresia:'||j::text,0));
  update membresias_privado.periodos set anulada=true,motivo_anulacion=v_motivo,anulada_por=u,anulada_en=now() where id=v_id and not anulada;
 elsif p_accion='vincular' then
  j:=(p_datos->>'jugadorId')::uuid;v_uid:=membresias_privado.cuenta_jugador(j);
  if v_uid is null then raise exception 'El jugador necesita una cuenta confirmada y un vínculo único.';end if;
  perform pg_advisory_xact_lock(hashtextextended('membresia:'||j::text,0));
  update membresias_privado.periodos set usuario_id=v_uid where jugador_id=j and usuario_id is null;
 elsif p_accion='configurar' then
  if exists(select 1 from jsonb_each_text(p_datos) e where e.key in('torneo','club','completo','entrenamiento') and (e.value !~ '^\d{1,9}$' or e.value::numeric>100000000)) or not (p_datos ?& array['torneo','club','completo','entrenamiento','revision']) then raise exception 'Revisá los precios.';end if;
  select * into config from membresias_privado.configuracion where id for update;
  if (p_datos->>'revision') is null or config.revision<>(p_datos->>'revision')::integer then raise exception 'La propuesta cambió en otra pestaña. Actualizá antes de guardar.';end if;
  update membresias_privado.configuracion set torneo=(p_datos->>'torneo')::integer,club=(p_datos->>'club')::integer,completo=(p_datos->>'completo')::integer,entrenamiento=(p_datos->>'entrenamiento')::integer,revision=revision+1,actualizada=now(),actualizada_por=u where id;
 elsif p_accion<>'resumen' or p_accion is null then raise exception 'Operación inválida.';
 end if;
 select * into config from membresias_privado.configuracion where id;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'jugadorId',p.jugador_id,'nombre',coalesce(nullif(j.apodo,''),j.nombre),'cuentaVinculada',p.usuario_id is not null,'plan',p.plan,'desde',p.desde,'hasta',p.hasta,'importe',p.importe,'medio',p.medio,'referencia',p.referencia,'anulada',p.anulada,'motivoAnulacion',p.motivo_anulacion,'creada',p.creada) order by p.creada desc,p.id),'[]') into ps
 from membresias_privado.periodos p join public.jugadores j on j.id=p.jugador_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'nombre',coalesce(nullif(j.apodo,''),j.nombre),'cuentaDisponible',membresias_privado.cuenta_jugador(j.id) is not null) order by coalesce(nullif(j.apodo,''),j.nombre)),'[]') into js from public.jugadores j;
 return jsonb_build_object('hoy',hoy,'config',jsonb_build_object('torneo',config.torneo,'club',config.club,'completo',config.completo,'entrenamiento',config.entrenamiento,'revision',config.revision),'jugadores',js,'periodos',ps);
end $$;
revoke all on function membresias_privado.gestion(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function membresias_privado.gestion(text,jsonb,uuid) to authenticated;

create function public.mi_membresia(p_usuario uuid) returns jsonb language sql stable security invoker set search_path='' as $$select membresias_privado.mis_periodos(p_usuario)$$;
create function public.gestionar_membresias(p_accion text,p_datos jsonb,p_usuario uuid) returns jsonb language sql security invoker set search_path='' as $$select membresias_privado.gestion(p_accion,p_datos,p_usuario)$$;
revoke all on function public.mi_membresia(uuid),public.gestionar_membresias(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.mi_membresia(uuid),public.gestionar_membresias(text,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
