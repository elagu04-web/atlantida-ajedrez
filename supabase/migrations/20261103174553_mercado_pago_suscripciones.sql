begin;
create schema pagos_privado;
revoke all on schema pagos_privado from public,anon,authenticated;

create table pagos_privado.suscripciones (
 id uuid primary key, usuario_id uuid not null references auth.users(id),
 jugador_id uuid not null references public.jugadores(id),
 plan text not null check(plan in('club','completo')),
 importe integer not null check(importe in(40000,55000)), moneda text not null default 'UYU' check(moneda='UYU'),
 produccion boolean not null, estado text not null default 'creando'
 check(estado in('creando','pending','authorized','paused','cancelled','revisar')),
 proveedor_id text unique, checkout text, correo_pagador text not null check(length(correo_pagador)<=254),
 proveedor_actualizada timestamptz, creada timestamptz not null default now(), actualizada timestamptz not null default now(),
 check((plan='club' and importe=40000) or (plan='completo' and importe=55000))
);
-- A pending/uncertain request is deliberately retained: retrying an external POST
-- after a timeout could create a second recurring debit.
create unique index pagos_una_suscripcion on pagos_privado.suscripciones(usuario_id) where estado<>'cancelled';
create index pagos_cuenta_historial on pagos_privado.suscripciones(usuario_id,creada desc);
create index pagos_jugador on pagos_privado.suscripciones(jugador_id);
create table pagos_privado.cobros (
 pago_id text primary key, factura_id text not null,
 suscripcion_id uuid not null references pagos_privado.suscripciones(id),
 estado text not null, importe integer not null, devuelto integer not null default 0,
 desde date not null, hasta date not null check(hasta>desde),
 proveedor_actualizada timestamptz not null, actualizada timestamptz not null default now(),
 periodo_id uuid references membresias_privado.periodos(id)
);
create index pagos_cobros_suscripcion on pagos_privado.cobros(suscripcion_id,desde desc);
create index pagos_cobros_periodo on pagos_privado.cobros(periodo_id) where periodo_id is not null;
-- A failed debit may be retried with another payment ID; the invoice grants once.
create table pagos_privado.facturas (
 id text primary key, suscripcion_id uuid not null references pagos_privado.suscripciones(id),
 periodo_id uuid unique references membresias_privado.periodos(id), pago_aplicado text unique,
 desde date not null,hasta date not null
);
create index pagos_facturas_suscripcion on pagos_privado.facturas(suscripcion_id);
alter table pagos_privado.cobros add constraint pagos_factura_fk foreign key(factura_id) references pagos_privado.facturas(id);
alter table pagos_privado.suscripciones enable row level security;
alter table pagos_privado.cobros enable row level security;
alter table pagos_privado.facturas enable row level security;
revoke all on all tables in schema pagos_privado from public,anon,authenticated;

-- Only the server's service_role RPC can enter this private schema. The Edge
-- Function verifies the user with Auth; the webhook verifies HMAC and re-fetches
-- provider resources. Neither browser nor authenticated SQL callers can write.
create function pagos_privado.operar(p_accion text,p_usuario uuid,p_datos jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s pagos_privado.suscripciones;c pagos_privado.cobros;f pagos_privado.facturas;
 j uuid;v_id uuid;v_importe integer;v_estado text;v_fecha timestamptz;v_desde date;v_hasta date;v_periodo uuid;
begin
 if p_datos is null or jsonb_typeof(p_datos)<>'object' or octet_length(p_datos::text)>12000 then raise exception 'Solicitud inválida.';end if;
 if p_accion='preparar' then
  if p_usuario is null or not exists(select 1 from auth.users where id=p_usuario and email_confirmed_at is not null) then raise exception 'Confirmá tu cuenta antes de suscribirte.';end if;
  perform pg_advisory_xact_lock(hashtextextended('pago-cuenta:'||p_usuario::text,0));
  select * into s from pagos_privado.suscripciones where usuario_id=p_usuario and estado<>'cancelled' order by creada desc limit 1;
  if found then return jsonb_build_object('nueva',false,'suscripcion',to_jsonb(s));end if;
  select q.id into j from public.jugadores q where membresias_privado.cuenta_jugador(q.id)=p_usuario;
  if j is null then raise exception 'Vinculá primero tu cuenta con tu nombre de jugador en Mi acceso.';end if;
  if exists(select 1 from membresias_privado.periodos where jugador_id=j and not anulada and hasta>(now() at time zone 'America/Montevideo')::date) then raise exception 'Ya tenés una cuota registrada. Consultá al club antes de activar una renovación automática.';end if;
  v_id:=(p_datos->>'id')::uuid;
  if p_datos->>'plan' not in('club','completo') or v_id is null then raise exception 'Plan inválido.';end if;
  v_importe:=case p_datos->>'plan' when 'club' then 40000 else 55000 end;
  insert into pagos_privado.suscripciones(id,usuario_id,jugador_id,plan,importe,produccion,correo_pagador)
  values(v_id,p_usuario,j,p_datos->>'plan',v_importe,(p_datos->>'produccion')::boolean,p_datos->>'correo') returning * into s;
  return jsonb_build_object('nueva',true,'suscripcion',to_jsonb(s));
 elsif p_accion='listar' then
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.creada desc) from (select ss.id,ss.plan,ss.importe,ss.estado,ss.checkout,ss.creada,ss.proveedor_id,
   (select coalesce(jsonb_agg(jsonb_build_object('pago',cc.pago_id,'estado',cc.estado,'importe',cc.importe,'devuelto',cc.devuelto,'desde',cc.desde,'hasta',cc.hasta) order by cc.desde desc,cc.pago_id),'[]') from pagos_privado.cobros cc where cc.suscripcion_id=ss.id) cobros
   from pagos_privado.suscripciones ss where ss.usuario_id=p_usuario order by ss.creada desc limit 20) x),'[]');
 elsif p_accion='buscar' then
  select * into s from pagos_privado.suscripciones where (id::text=p_datos->>'id' or proveedor_id=p_datos->>'proveedor') and (p_usuario is null or usuario_id=p_usuario);
  if not found then return null;end if;
  return to_jsonb(s);
 elsif p_accion='pendientes' then
  return coalesce((select jsonb_agg(to_jsonb(x)) from (select id,proveedor_id from pagos_privado.suscripciones where proveedor_id is not null order by actualizada limit 20) x),'[]');
 end if;
 select * into s from pagos_privado.suscripciones where id=(p_datos->>'id')::uuid and (p_usuario is null or usuario_id=p_usuario) for update;
 if not found then raise exception 'No existe esa suscripción en tu cuenta.';end if;
 if p_accion='vincular' or p_accion='estado' then
  v_estado:=p_datos->>'estado';v_fecha:=(p_datos->>'actualizada')::timestamptz;
  if v_estado is null or v_estado not in('pending','authorized','paused','cancelled','revisar') or v_fecha is null then raise exception 'Estado inválido.';end if;
  if s.proveedor_id is not null and s.proveedor_id is distinct from p_datos->>'proveedor' then raise exception 'La suscripción no coincide.';end if;
  if s.proveedor_actualizada is null or v_fecha>=s.proveedor_actualizada then
   update pagos_privado.suscripciones set proveedor_id=p_datos->>'proveedor',checkout=p_datos->>'checkout',estado=v_estado,proveedor_actualizada=v_fecha,actualizada=now() where id=s.id;
  end if;
 elsif p_accion='cobro' then
  v_estado:=p_datos->>'estado';v_fecha:=(p_datos->>'actualizada')::timestamptz;v_importe:=(p_datos->>'importe')::integer;v_desde:=(p_datos->>'desde')::date;v_hasta:=(v_desde+interval '1 month')::date;
  if v_estado is null or v_estado not in('approved','pending','in_process','authorized','rejected','cancelled','refunded','charged_back','in_mediation') or v_fecha is null or v_importe is distinct from s.importe or v_desde is null or p_datos->>'pago' is null or p_datos->>'factura' is null or (p_datos->>'devuelto')::integer not between 0 and s.importe then raise exception 'Cobro inválido.';end if;
  select * into c from pagos_privado.cobros where pago_id=p_datos->>'pago';
  if found and (c.suscripcion_id<>s.id or c.factura_id<>p_datos->>'factura' or c.desde<>v_desde) then raise exception 'El pago ya pertenece a otra factura.';end if;
  if found and c.proveedor_actualizada>v_fecha then return jsonb_build_object('ok',true);end if;
  insert into pagos_privado.facturas(id,suscripcion_id,desde,hasta) values(p_datos->>'factura',s.id,v_desde,v_hasta) on conflict(id) do nothing;
  select * into f from pagos_privado.facturas where id=p_datos->>'factura' for update;
  if f.suscripcion_id<>s.id or f.desde<>v_desde then raise exception 'La factura no coincide.';end if;
  if v_estado='approved' and (p_datos->>'devuelto')::integer=0 and f.periodo_id is null then
   v_periodo:=gen_random_uuid();
   insert into membresias_privado.periodos(id,jugador_id,usuario_id,plan,desde,hasta,importe,medio,referencia,solicitud,creada_por)
   values(v_periodo,s.jugador_id,s.usuario_id,s.plan,v_desde,v_hasta,s.importe,'mercadopago','MP '||(p_datos->>'pago'),jsonb_build_object('factura',f.id,'suscripcion',s.id),s.usuario_id);
   update pagos_privado.facturas set periodo_id=v_periodo,pago_aplicado=p_datos->>'pago' where id=f.id returning * into f;
  end if;
  if f.pago_aplicado=p_datos->>'pago' and (v_estado in('refunded','charged_back') or (p_datos->>'devuelto')::integer=s.importe) then
   update membresias_privado.periodos set anulada=true,motivo_anulacion='Mercado Pago: '||v_estado,anulada_en=now() where id=f.periodo_id and not anulada;
  end if;
  insert into pagos_privado.cobros(pago_id,factura_id,suscripcion_id,estado,importe,devuelto,desde,hasta,proveedor_actualizada,periodo_id)
  values(p_datos->>'pago',f.id,s.id,v_estado,s.importe,(p_datos->>'devuelto')::integer,v_desde,v_hasta,v_fecha,case when f.pago_aplicado=p_datos->>'pago' then f.periodo_id end)
  on conflict(pago_id) do update set estado=excluded.estado,devuelto=excluded.devuelto,proveedor_actualizada=excluded.proveedor_actualizada,periodo_id=excluded.periodo_id,actualizada=now();
  update pagos_privado.suscripciones set actualizada=now() where id=s.id;
 else raise exception 'Acción inválida.';
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function pagos_privado.operar(text,uuid,jsonb) from public,anon,authenticated;
grant usage on schema pagos_privado to service_role;
grant execute on function pagos_privado.operar(text,uuid,jsonb) to service_role;
create function public.pagos_mercadopago(p_accion text,p_usuario uuid,p_datos jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select pagos_privado.operar(p_accion,p_usuario,p_datos)$$;
revoke all on function public.pagos_mercadopago(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pagos_mercadopago(text,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
