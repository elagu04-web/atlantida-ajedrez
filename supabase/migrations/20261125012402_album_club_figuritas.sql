-- Primera edición. Catálogo estable; fotos y textos viven en lib/albumCatalogo.json.
create schema album_privado;
revoke all on schema album_privado from public, anon, authenticated;
create table album_privado.catalogo(id text primary key, jugador_id uuid, peso integer not null check(peso>0));
create table album_privado.perfiles(usuario_id uuid primary key references auth.users(id) on delete cascade, compartir boolean not null default false);
create table album_privado.inventario(
 usuario_id uuid not null references auth.users(id) on delete cascade,
 figurita_id text not null references album_privado.catalogo(id),
 cantidad integer not null check(cantidad>=0), primary key(usuario_id,figurita_id));
create table album_privado.sobres(
 usuario_id uuid not null references auth.users(id) on delete cascade,
 clave text not null, figuritas text[] not null, creado_en timestamptz not null default now(),
 primary key(usuario_id,clave));
create table album_privado.intercambios(
 id uuid primary key, emisor uuid not null references auth.users(id) on delete cascade,
 receptor uuid not null references auth.users(id) on delete cascade,
 ofrece text not null references album_privado.catalogo(id), pide text not null references album_privado.catalogo(id),
 estado text not null default 'pendiente' check(estado in ('pendiente','aceptado','rechazado','cancelado','vencido','sin_stock')),
 creado_en timestamptz not null default now(), vence_en timestamptz not null default now()+interval '7 days',
 check(emisor<>receptor),check(ofrece<>pide));
create index album_intercambios_emisor on album_privado.intercambios(emisor,estado,vence_en);
create index album_intercambios_receptor on album_privado.intercambios(receptor,estado,vence_en);
create index album_inventario_figurita on album_privado.inventario(figurita_id);
create index album_intercambios_ofrece on album_privado.intercambios(ofrece);
create index album_intercambios_pide on album_privado.intercambios(pide);
create unique index album_una_propuesta_por_pareja on album_privado.intercambios(least(emisor,receptor),greatest(emisor,receptor)) where estado='pendiente';
alter table album_privado.catalogo enable row level security;
alter table album_privado.perfiles enable row level security;
alter table album_privado.inventario enable row level security;
alter table album_privado.sobres enable row level security;
alter table album_privado.intercambios enable row level security;
revoke all on all tables in schema album_privado from public,anon,authenticated;
insert into album_privado.catalogo select * from jsonb_to_recordset('[{"id":"jugador:20237542-c3f6-4ba4-8400-e9eb3b438101","jugador_id":"20237542-c3f6-4ba4-8400-e9eb3b438101","peso":10},{"id":"jugador:d0f87bfb-dddf-42ca-beae-f58ee746ab4d","jugador_id":"d0f87bfb-dddf-42ca-beae-f58ee746ab4d","peso":10},{"id":"jugador:171197d2-fa9e-4a6a-ac3e-3139fbc7ff62","jugador_id":"171197d2-fa9e-4a6a-ac3e-3139fbc7ff62","peso":10},{"id":"jugador:40edddb0-5302-4798-8cf2-80f60317d856","jugador_id":"40edddb0-5302-4798-8cf2-80f60317d856","peso":10},{"id":"jugador:3f3f4d16-98af-482c-9e9b-3f4d6b31883f","jugador_id":"3f3f4d16-98af-482c-9e9b-3f4d6b31883f","peso":10},{"id":"jugador:b069e33f-1687-4e1f-bacc-1ac7e0d3040d","jugador_id":"b069e33f-1687-4e1f-bacc-1ac7e0d3040d","peso":10},{"id":"jugador:67c27aa0-dda6-4825-a18c-9d5ee7c90c10","jugador_id":"67c27aa0-dda6-4825-a18c-9d5ee7c90c10","peso":10},{"id":"jugador:f88a3bd3-bedd-41dc-a115-17ba1378b6bb","jugador_id":"f88a3bd3-bedd-41dc-a115-17ba1378b6bb","peso":10},{"id":"jugador:2cba15cf-586b-420b-a144-de5ee6d85031","jugador_id":"2cba15cf-586b-420b-a144-de5ee6d85031","peso":10},{"id":"jugador:d1c933d4-197b-434a-924c-d404421e02a6","jugador_id":"d1c933d4-197b-434a-924c-d404421e02a6","peso":10},{"id":"jugador:3e6c34fb-23a2-4a15-8de0-009cf51493db","jugador_id":"3e6c34fb-23a2-4a15-8de0-009cf51493db","peso":10},{"id":"jugador:dce120b2-90ea-41b7-848e-9ba4a8f84613","jugador_id":"dce120b2-90ea-41b7-848e-9ba4a8f84613","peso":10},{"id":"jugador:cf9bbe7e-0c1a-4cf7-8708-287ace9daece","jugador_id":"cf9bbe7e-0c1a-4cf7-8708-287ace9daece","peso":10},{"id":"jugador:21885761-c357-4357-9bb7-a1a6402ea32c","jugador_id":"21885761-c357-4357-9bb7-a1a6402ea32c","peso":10},{"id":"jugador:4c2a5198-dc88-49c3-ac3d-d4808e105aa3","jugador_id":"4c2a5198-dc88-49c3-ac3d-d4808e105aa3","peso":10},{"id":"jugador:f05c3ccd-7807-473c-a922-cd13659625ee","jugador_id":"f05c3ccd-7807-473c-a922-cd13659625ee","peso":10},{"id":"jugador:2c191207-a48a-418b-a8ef-210a00e5acc4","jugador_id":"2c191207-a48a-418b-a8ef-210a00e5acc4","peso":10},{"id":"jugador:adaff79d-3a75-4532-8ff7-3ec7238a21b6","jugador_id":"adaff79d-3a75-4532-8ff7-3ec7238a21b6","peso":10},{"id":"jugador:df2fa121-939c-4b5e-84c5-6eb1ca7dc880","jugador_id":"df2fa121-939c-4b5e-84c5-6eb1ca7dc880","peso":10},{"id":"jugador:4fd7b5ad-c10d-4056-b781-521869063829","jugador_id":"4fd7b5ad-c10d-4056-b781-521869063829","peso":10},{"id":"jugador:db7d23fa-0254-4d6a-91ac-9eb9b41c5c76","jugador_id":"db7d23fa-0254-4d6a-91ac-9eb9b41c5c76","peso":10},{"id":"jugador:a92621c8-239d-4b93-8775-b8246fbcb506","jugador_id":"a92621c8-239d-4b93-8775-b8246fbcb506","peso":10},{"id":"jugador:c587628b-2aba-42a6-ba64-63d1d7d510f2","jugador_id":"c587628b-2aba-42a6-ba64-63d1d7d510f2","peso":10},{"id":"jugador:15d021cc-3310-48bf-a7b5-1e521a3c8288","jugador_id":"15d021cc-3310-48bf-a7b5-1e521a3c8288","peso":10},{"id":"jugador:3783ab38-e327-4bf1-888f-7d039b7963e6","jugador_id":"3783ab38-e327-4bf1-888f-7d039b7963e6","peso":10},{"id":"jugador:df3d49d9-508f-4a76-997c-ee525886f7dc","jugador_id":"df3d49d9-508f-4a76-997c-ee525886f7dc","peso":10},{"id":"jugador:3059d6c3-44f3-49f7-8b57-8156cae5d0f0","jugador_id":"3059d6c3-44f3-49f7-8b57-8156cae5d0f0","peso":10},{"id":"jugador:97fa10ca-29a9-4db7-8061-e39414e0c65f","jugador_id":"97fa10ca-29a9-4db7-8061-e39414e0c65f","peso":10},{"id":"jugador:16c583d5-59c1-4a13-af42-575836df9e7f","jugador_id":"16c583d5-59c1-4a13-af42-575836df9e7f","peso":10},{"id":"jugador:2000cd88-92a9-4189-baa2-d1ecb89b17e9","jugador_id":"2000cd88-92a9-4189-baa2-d1ecb89b17e9","peso":10},{"id":"jugador:44970cf2-4a55-4b9f-93b0-9c9c59ef2557","jugador_id":"44970cf2-4a55-4b9f-93b0-9c9c59ef2557","peso":10},{"id":"jugador:59086bb0-6a79-43d1-9a88-aea5b4a1436c","jugador_id":"59086bb0-6a79-43d1-9a88-aea5b4a1436c","peso":10},{"id":"jugador:aa10113f-5c5c-43a1-8aa3-d9ea29a332f4","jugador_id":"aa10113f-5c5c-43a1-8aa3-d9ea29a332f4","peso":10},{"id":"jugador:49441026-0a70-4e0c-904c-8022c4a5fa3a","jugador_id":"49441026-0a70-4e0c-904c-8022c4a5fa3a","peso":10},{"id":"jugador:95537d79-bdf2-4a78-9e7a-eaa440cde8b2","jugador_id":"95537d79-bdf2-4a78-9e7a-eaa440cde8b2","peso":10},{"id":"jugador:2eca2178-89cd-47d5-9b72-c7b1c65477bb","jugador_id":"2eca2178-89cd-47d5-9b72-c7b1c65477bb","peso":10},{"id":"jugador:d0eb0985-e27c-4eaa-87ff-88c04fa5864b","jugador_id":"d0eb0985-e27c-4eaa-87ff-88c04fa5864b","peso":10},{"id":"jugador:9cae9999-af4e-48e8-af60-6c25794fad09","jugador_id":"9cae9999-af4e-48e8-af60-6c25794fad09","peso":10},{"id":"jugador:6f1b8d21-76f7-4a49-8434-c18f48f91172","jugador_id":"6f1b8d21-76f7-4a49-8434-c18f48f91172","peso":10},{"id":"jugador:9178067e-5b8e-4883-bf17-ac0945ea923a","jugador_id":"9178067e-5b8e-4883-bf17-ac0945ea923a","peso":10},{"id":"jugador:e315beb3-22ac-4037-a88b-5493824930e5","jugador_id":"e315beb3-22ac-4037-a88b-5493824930e5","peso":10},{"id":"jugador:b298bece-6c2e-4df0-bedc-031c84278c32","jugador_id":"b298bece-6c2e-4df0-bedc-031c84278c32","peso":10},{"id":"jugador:1d5a51c1-5ff8-4114-bb0e-d9706ce7b1c3","jugador_id":"1d5a51c1-5ff8-4114-bb0e-d9706ce7b1c3","peso":10},{"id":"jugador:26671876-13e1-4dbc-8d1c-b249955d83c3","jugador_id":"26671876-13e1-4dbc-8d1c-b249955d83c3","peso":10},{"id":"jugador:54c74e69-50f0-4324-bcdb-55b8db09a2b5","jugador_id":"54c74e69-50f0-4324-bcdb-55b8db09a2b5","peso":10},{"id":"jugador:8232ee05-946c-4f44-bbc8-c64b341bfc11","jugador_id":"8232ee05-946c-4f44-bbc8-c64b341bfc11","peso":10},{"id":"jugador:010839b6-1534-4e59-b9e8-0bc635a36f25","jugador_id":"010839b6-1534-4e59-b9e8-0bc635a36f25","peso":10},{"id":"jugador:0d188c7b-c5b7-4e75-852b-9a5d17379fdb","jugador_id":"0d188c7b-c5b7-4e75-852b-9a5d17379fdb","peso":10},{"id":"jugador:0d7d2441-36ff-42b6-a73a-aaef56cff202","jugador_id":"0d7d2441-36ff-42b6-a73a-aaef56cff202","peso":10},{"id":"jugador:d19509c4-4858-4509-a587-1080ce3f3c7d","jugador_id":"d19509c4-4858-4509-a587-1080ce3f3c7d","peso":10},{"id":"jugador:83728a3c-b558-447a-9ded-570e89112a3c","jugador_id":"83728a3c-b558-447a-9ded-570e89112a3c","peso":10},{"id":"jugador:f9cd88c1-b14f-4755-8d3d-90de781ea7d9","jugador_id":"f9cd88c1-b14f-4755-8d3d-90de781ea7d9","peso":10},{"id":"especial:gabi-octubre","jugador_id":null,"peso":3},{"id":"especial:fonchi-perfecto","jugador_id":null,"peso":3},{"id":"especial:tio-ale","jugador_id":null,"peso":3},{"id":"especial:bruno-minga","jugador_id":null,"peso":3},{"id":"especial:larita-nacional","jugador_id":null,"peso":3},{"id":"especial:ernesto-sudamericano","jugador_id":null,"peso":3},{"id":"especial:martes","jugador_id":null,"peso":3},{"id":"especial:aprender","jugador_id":null,"peso":3}]'::jsonb) as c(id text,jugador_id uuid,peso integer);

-- Sólo el motor privado consulta reservas. Nunca se ofrece la última copia.
create function album_privado.disponibles(p_usuario uuid,p_figurita text,p_excluir uuid default null)
returns integer language sql stable set search_path='' as $$
 select greatest(0,coalesce((select cantidad from album_privado.inventario where usuario_id=p_usuario and figurita_id=p_figurita),0)-1-
 (select count(*)::integer from album_privado.intercambios where emisor=p_usuario and ofrece=p_figurita and estado='pendiente' and vence_en>now() and (p_excluir is null or id<>p_excluir)));
$$;

-- El único punto de escritura valida la sesión y serializa todas las mutaciones
-- de cada cuenta. Los intercambios bloquean las dos cuentas en el mismo orden.
create function album_privado.operar(p_accion text,p_datos jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); j uuid; otro uuid; t album_privado.intercambios%rowtype;
 solicitud uuid; oferta text; pedido text; clave_sobre text; f text;
 cartas text[]; nuevas text[]:='{}'; repetidas text[]:='{}'; n integer; i integer;
 hoy text:=((now() at time zone 'America/Montevideo')::date)::text;
 resultado jsonb; sobre jsonb:=null; accion text;
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Iniciá sesión para usar tu álbum.' using errcode='42501'; end if;
 j:=club_online_privado.jugador(u);
 if p_accion not in ('resumen','sobre','compartir','mercado','proponer','responder') or p_accion is null then raise exception 'Acción de álbum desconocida.'; end if;
 if p_accion not in ('resumen') and j is null then raise exception 'Vinculá tu jugador del club antes de coleccionar.'; end if;

 if p_accion='proponer' then
  otro:=(p_datos->>'destino')::uuid;
  if otro is null or otro=u then raise exception 'Elegí otro coleccionista.'; end if;
 elsif p_accion='responder' then
  solicitud:=(p_datos->>'id')::uuid;
  select * into t from album_privado.intercambios where id=solicitud and u in (emisor,receptor);
  if not found then raise exception 'No encontré esa propuesta.' using errcode='42501'; end if;
  otro:=case when t.emisor=u then t.receptor else t.emisor end;
 end if;
 if p_accion in ('sobre','compartir','proponer','responder') then
  if otro is not null then
   perform pg_advisory_xact_lock(hashtextextended('album:'||least(u,otro)::text,0));
   perform pg_advisory_xact_lock(hashtextextended('album:'||greatest(u,otro)::text,0));
  else perform pg_advisory_xact_lock(hashtextextended('album:'||u::text,0)); end if;
 end if;

 if p_accion='sobre' then
  if p_datos->>'tipo' not in ('bienvenida','diario') or p_datos->>'tipo' is null then raise exception 'Ese sobre no existe.'; end if;
  clave_sobre:=case when p_datos->>'tipo'='bienvenida' then 'bienvenida' else 'diario:'||hoy end;
  select figuritas into cartas from album_privado.sobres where usuario_id=u and clave=clave_sobre;
  if not found then
   cartas:='{}';
   if clave_sobre='bienvenida' then
    select id into f from album_privado.catalogo where jugador_id=j;
    if f is not null then cartas:=array_append(cartas,f); end if;
   end if;
   n:=case when clave_sobre='bienvenida' then 6 else 3 end;
   for i in (cardinality(cartas)+1)..n loop
    select id into f from album_privado.catalogo order by -ln(greatest(random(),0.000001))/peso limit 1;
    cartas:=array_append(cartas,f);
   end loop;
   foreach f in array cartas loop
    if exists(select 1 from album_privado.inventario where usuario_id=u and figurita_id=f and cantidad>0) then repetidas:=array_append(repetidas,f);
    else nuevas:=array_append(nuevas,f); end if;
    insert into album_privado.inventario values(u,f,1) on conflict(usuario_id,figurita_id) do update set cantidad=album_privado.inventario.cantidad+1;
   end loop;
   insert into album_privado.sobres(usuario_id,clave,figuritas) values(u,clave_sobre,cartas);
   sobre:=jsonb_build_object('figuritas',cartas,'nuevas',nuevas,'repetidas',repetidas,'yaAbierto',false);
  else sobre:=jsonb_build_object('figuritas',cartas,'nuevas','[]'::jsonb,'repetidas','[]'::jsonb,'yaAbierto',true); end if;
 elsif p_accion='compartir' then
  if jsonb_typeof(p_datos->'activo') is distinct from 'boolean' then raise exception 'Indicá si querés compartir tus repetidas.'; end if;
  insert into album_privado.perfiles values(u,(p_datos->>'activo')::boolean) on conflict(usuario_id) do update set compartir=excluded.compartir;
  if not (p_datos->>'activo')::boolean then
   update album_privado.intercambios set estado='cancelado' where estado='pendiente' and u in (emisor,receptor);
  end if;
 elsif p_accion='proponer' then
  solicitud:=(p_datos->>'id')::uuid; oferta:=p_datos->>'ofrece'; pedido:=p_datos->>'pide';
  if solicitud is null or oferta is null or pedido is null or oferta=pedido then raise exception 'Elegí dos figuritas diferentes.'; end if;
  select * into t from album_privado.intercambios where id=solicitud;
  if found then
   if t.emisor<>u or t.receptor<>otro or t.ofrece<>oferta or t.pide<>pedido then raise exception 'La propuesta ya existe con otros datos.'; end if;
  else
   if not exists(select 1 from album_privado.perfiles where usuario_id=u and compartir) or not exists(select 1 from album_privado.perfiles where usuario_id=otro and compartir) or club_online_privado.jugador(otro) is null then raise exception 'Ambos tienen que habilitar los intercambios.'; end if;
   update album_privado.intercambios set estado='vencido' where estado='pendiente' and vence_en<=now() and (emisor in (u,otro) or receptor in (u,otro));
   if (select count(*) from album_privado.intercambios where emisor=u and estado='pendiente')>=5 or (select count(*) from album_privado.intercambios where receptor=otro and estado='pendiente')>=10 then raise exception 'Hay varias propuestas pendientes. Resolvé alguna antes de enviar otra.'; end if;
   if exists(select 1 from album_privado.intercambios where estado='pendiente' and least(emisor,receptor)=least(u,otro) and greatest(emisor,receptor)=greatest(u,otro)) then raise exception 'Ya tienen una propuesta pendiente.'; end if;
   if album_privado.disponibles(u,oferta)<1 or album_privado.disponibles(otro,pedido)<1 then raise exception 'Una de esas figuritas ya no está disponible. Actualizá las repetidas.'; end if;
   insert into album_privado.intercambios(id,emisor,receptor,ofrece,pide) values(solicitud,u,otro,oferta,pedido);
  end if;
 elsif p_accion='responder' then
  select * into t from album_privado.intercambios where id=solicitud for update;
  accion:=p_datos->>'respuesta';
  if accion not in ('aceptar','rechazar','cancelar') or accion is null then raise exception 'Respuesta desconocida.'; end if;
  if (accion='cancelar' and t.emisor<>u) or (accion in ('aceptar','rechazar') and t.receptor<>u) then raise exception 'No podés responder esa propuesta.' using errcode='42501'; end if;
  if t.estado='pendiente' then
   if t.vence_en<=now() then update album_privado.intercambios set estado='vencido' where id=t.id;
   elsif accion='aceptar' then
    if not exists(select 1 from album_privado.perfiles where usuario_id=t.emisor and compartir) or not exists(select 1 from album_privado.perfiles where usuario_id=t.receptor and compartir) then
     update album_privado.intercambios set estado='cancelado' where id=t.id;
    elsif album_privado.disponibles(t.emisor,t.ofrece,t.id)<1 or album_privado.disponibles(t.receptor,t.pide)<1 then
     update album_privado.intercambios set estado='sin_stock' where id=t.id;
    else
     update album_privado.inventario set cantidad=cantidad-1 where usuario_id=t.emisor and figurita_id=t.ofrece;
     update album_privado.inventario set cantidad=cantidad-1 where usuario_id=t.receptor and figurita_id=t.pide;
     insert into album_privado.inventario values(t.emisor,t.pide,1) on conflict(usuario_id,figurita_id) do update set cantidad=album_privado.inventario.cantidad+1;
     insert into album_privado.inventario values(t.receptor,t.ofrece,1) on conflict(usuario_id,figurita_id) do update set cantidad=album_privado.inventario.cantidad+1;
     update album_privado.intercambios set estado='aceptado' where id=t.id;
    end if;
   else update album_privado.intercambios set estado=case when accion='cancelar' then 'cancelado' else 'rechazado' end where id=t.id; end if;
  end if;
 end if;

 if p_accion='mercado' then
  if not exists(select 1 from album_privado.perfiles where usuario_id=u and compartir) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(x) from (
   select p.usuario_id as cuenta,coalesce(nullif(jj.apodo,''),jj.nombre) as nombre,jj.id as "jugadorId",
    (select jsonb_agg(jsonb_build_object('id',v.figurita_id,'disponibles',album_privado.disponibles(p.usuario_id,v.figurita_id)))
     from album_privado.inventario v where v.usuario_id=p.usuario_id and album_privado.disponibles(p.usuario_id,v.figurita_id)>0) as repetidas
   from album_privado.perfiles p join public.jugadores jj on jj.id=club_online_privado.jugador(p.usuario_id)
   where p.compartir and p.usuario_id<>u and exists(select 1 from album_privado.inventario v where v.usuario_id=p.usuario_id and album_privado.disponibles(p.usuario_id,v.figurita_id)>0)
   order by jj.nombre,p.usuario_id limit 100
  ) x),'[]'::jsonb);
 end if;

 select jsonb_build_object(
  'jugadorId',j,'hoy',hoy,'compartir',coalesce((select compartir from album_privado.perfiles where usuario_id=u),false),
  'bienvenida',not exists(select 1 from album_privado.sobres where usuario_id=u and clave='bienvenida'),
  'diario',not exists(select 1 from album_privado.sobres where usuario_id=u and clave='diario:'||hoy),
  'inventario',coalesce((select jsonb_agg(jsonb_build_object('id',figurita_id,'cantidad',cantidad,'disponibles',album_privado.disponibles(u,figurita_id))) from album_privado.inventario where usuario_id=u and cantidad>0),'[]'::jsonb),
  'intercambios',coalesce((select jsonb_agg(x order by x."creadoEn" desc) from (
   select tr.id,tr.emisor,tr.receptor,tr.ofrece,tr.pide,
    case when tr.estado='pendiente' and tr.vence_en<=now() then 'vencido' else tr.estado end as estado,
    tr.creado_en as "creadoEn",tr.vence_en as "venceEn",
    coalesce(nullif(jj.apodo,''),jj.nombre) as nombre,jj.id as "jugadorId"
   from album_privado.intercambios tr left join public.jugadores jj on jj.id=club_online_privado.jugador(case when tr.emisor=u then tr.receptor else tr.emisor end)
   where u in (tr.emisor,tr.receptor) order by tr.creado_en desc limit 60
  ) x),'[]'::jsonb),'sobre',sobre) into resultado;
 return resultado;
end;
$$;
revoke all on all functions in schema album_privado from public,anon,authenticated;
grant usage on schema album_privado to authenticated;
grant execute on function album_privado.operar(text,jsonb) to authenticated;
create function public.album_club(p_accion text default 'resumen',p_datos jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select album_privado.operar(p_accion,p_datos);
$$;
revoke all on function public.album_club(text,jsonb) from public,anon;
grant execute on function public.album_club(text,jsonb) to authenticated;
notify pgrst,'reload schema';
