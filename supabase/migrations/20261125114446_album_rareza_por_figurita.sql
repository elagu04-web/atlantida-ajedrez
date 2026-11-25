create table album_privado.reinicios_prueba(
 id uuid primary key,usuario_id uuid not null references auth.users(id) on delete cascade,
 creado_en timestamptz not null default now(),respaldo jsonb not null);
create index album_reinicios_cuenta on album_privado.reinicios_prueba(usuario_id,creado_en);
alter table album_privado.reinicios_prueba enable row level security;
revoke all on album_privado.reinicios_prueba from public,anon,authenticated;
-- Cada figurita existe en las tres rarezas y tres acabados.
-- Se mantienen intactos los IDs y las copias que ya se entregaron.
drop index album_privado.album_numero_normal;
create unique index album_numero_normal on album_privado.catalogo(numero) where activa and id=base_id;

insert into album_privado.catalogo(id,jugador_id,peso,activa,rareza,acabado,base_id,numero,nombre,detalle,serie,foto)
 select 'especial:charly-suerte'||case when v.acabado='normal' then '' else ':'||v.acabado end,null,10,true,'comun',v.acabado,'especial:charly-suerte',
 (select coalesce(max(numero),0)+1 from album_privado.catalogo where activa and id=base_id),'El Charly de la Suerte','El amuleto del club. Una sonrisa para acompañar cada sobre.','Especiales','/imagenes/retratos/charly-suerte-original.webp'
 from (values('normal'),('foil'),('full-art')) v(acabado) on conflict(id) do nothing;
update album_privado.catalogo c set jugador_id=j.jugador from jsonb_to_recordset('[{"id":"especial:gabi-octubre","jugador":"d1c933d4-197b-434a-924c-d404421e02a6"},{"id":"especial:gabi-noviembre","jugador":"d1c933d4-197b-434a-924c-d404421e02a6"},{"id":"especial:fonchi-perfecto","jugador":"adaff79d-3a75-4532-8ff7-3ec7238a21b6"},{"id":"especial:fonchi-siciliana","jugador":"adaff79d-3a75-4532-8ff7-3ec7238a21b6"},{"id":"especial:tio-ale","jugador":"40edddb0-5302-4798-8cf2-80f60317d856"},{"id":"especial:bruno-minga","jugador":"f88a3bd3-bedd-41dc-a115-17ba1378b6bb"},{"id":"especial:larita-nacional","jugador":"49441026-0a70-4e0c-904c-8022c4a5fa3a"},{"id":"especial:matias-septiembre","jugador":"9178067e-5b8e-4883-bf17-ac0945ea923a"}]'::jsonb) j(id text,jugador uuid) where c.id=j.id;

insert into album_privado.catalogo(id,jugador_id,peso,activa,rareza,acabado,base_id,numero,nombre,detalle,serie,foto)
 select b.id||':rareza-'||r.rareza||case when v.acabado='normal' then '' else ':'||v.acabado end,
 null,b.peso,true,r.rareza,v.acabado,b.id,b.numero,b.nombre,b.detalle,b.serie,b.foto
 from album_privado.catalogo b cross join (values('comun'),('rara'),('mitica')) r(rareza)
 cross join (values('normal'),('foil'),('full-art')) v(acabado)
 where b.activa and b.id=b.base_id and r.rareza<>b.rareza
 on conflict(id) do nothing;

create or replace function album_privado.catalogo_publico() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'numero',c.numero,'nombre',c.nombre,'detalle',c.detalle,'serie',c.serie,'jugadorId',c.jugador_id,'foto',c.foto,'peso',c.peso,'rareza',c.rareza) order by c.numero),'[]'::jsonb)
 from album_privado.catalogo c where activa and c.id=c.base_id;
$$;
create or replace function album_privado.operar(p_accion text,p_datos jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); j uuid; otro uuid; t album_privado.intercambios%rowtype;
 solicitud uuid; oferta text; pedido text; clave_sobre text; f text;
 cartas text[]; nuevas text[]:='{}'; repetidas text[]:='{}'; n integer; i integer;
 hoy text:=((now() at time zone 'America/Montevideo')::date)::text;
 resultado jsonb; sobre jsonb:=null; accion text; nuevo_jugador record; numero_nuevo integer;
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Iniciá sesión para usar tu álbum.' using errcode='42501'; end if;
 j:=club_online_privado.jugador(u);
 if p_accion not in ('resumen','sobre','compartir','mercado','proponer','responder','agregar','reiniciar_prueba') or p_accion is null then raise exception 'Acción de álbum desconocida.'; end if;
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
 if p_accion in ('sobre','compartir','proponer','responder','agregar','reiniciar_prueba') then
  if otro is not null then
   perform pg_advisory_xact_lock(hashtextextended('album:'||least(u,otro)::text,0));
   perform pg_advisory_xact_lock(hashtextextended('album:'||greatest(u,otro)::text,0));
  else perform pg_advisory_xact_lock(hashtextextended('album:'||u::text,0)); end if;
 end if;

 if p_accion='reiniciar_prueba' then
  if u<>'f2c0ea67-e4e3-454e-81ee-f3175df90b3d'::uuid then raise exception 'Sólo el administrador puede reiniciar su álbum de prueba.' using errcode='42501'; end if;
  solicitud:=(p_datos->>'id')::uuid;
  if solicitud is null then raise exception 'Falta el identificador del reinicio.'; end if;
  if exists(select 1 from album_privado.reinicios_prueba where id=solicitud and usuario_id<>u) then raise exception 'Ese reinicio no corresponde a tu cuenta.' using errcode='42501'; end if;
  if not exists(select 1 from album_privado.reinicios_prueba where id=solicitud) then
   insert into album_privado.reinicios_prueba(id,usuario_id,respaldo)
   select solicitud,u,jsonb_build_object(
    'inventario',coalesce((select jsonb_agg(to_jsonb(inv)) from album_privado.inventario inv where usuario_id=u),'[]'::jsonb),
    'sobres',coalesce((select jsonb_agg(to_jsonb(so)) from album_privado.sobres so where usuario_id=u),'[]'::jsonb),
    'perfil',(select to_jsonb(p) from album_privado.perfiles p where usuario_id=u));
   update album_privado.intercambios set estado='cancelado' where estado='pendiente' and u in (emisor,receptor);
   delete from album_privado.inventario where usuario_id=u;
   delete from album_privado.sobres where usuario_id=u;
   insert into album_privado.perfiles values(u,false) on conflict(usuario_id) do update set compartir=false;
  end if;
 elsif p_accion='agregar' then
  if u<>'f2c0ea67-e4e3-454e-81ee-f3175df90b3d'::uuid then raise exception 'Sólo el administrador agrega figuritas.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('album-catalogo',0));
  select id,coalesce(nullif(apodo,''),nombre) as nombre,nombre as completo,foto_url into nuevo_jugador from public.jugadores where id=(p_datos->>'jugadorId')::uuid and nullif(trim(foto_url),'') is not null;
  if not found then raise exception 'Primero cargá una foto en el perfil del jugador.'; end if;
  if not exists(select 1 from album_privado.catalogo where id='jugador:'||nuevo_jugador.id::text and activa) then
   select coalesce(max(numero),0)+1 into numero_nuevo from album_privado.catalogo where activa;
   insert into album_privado.catalogo(id,jugador_id,peso,activa,rareza,acabado,base_id,numero,nombre,detalle,serie,foto)
   select 'jugador:'||nuevo_jugador.id::text||case when r.rareza='comun' then '' else ':rareza-'||r.rareza end||case when v.acabado='normal' then '' else ':'||v.acabado end,
    case when v.acabado='normal' and r.rareza='comun' then nuevo_jugador.id else null end,10,true,r.rareza,v.acabado,'jugador:'||nuevo_jugador.id::text,numero_nuevo,nuevo_jugador.nombre,nuevo_jugador.completo,'Jugadores',nuevo_jugador.foto_url
   from (values('comun'),('rara'),('mitica')) r(rareza) cross join (values('normal'),('foil'),('full-art')) v(acabado)
   on conflict(id) do update set activa=true,numero=excluded.numero,nombre=excluded.nombre,detalle=excluded.detalle,serie=excluded.serie,foto=excluded.foto;
  end if;
 elsif p_accion='sobre' then
  if p_datos->>'tipo' not in ('bienvenida','recompensa') or p_datos->>'tipo' is null then raise exception 'Los sobres se consiguen participando en torneos, ganando online y resolviendo desafíos.'; end if;
  if p_datos->>'tipo'='bienvenida' then clave_sobre:='bienvenida';
  else
   clave_sobre:=p_datos->>'clave';
   if clave_sobre is null or clave_sobre !~ '^(torneo|torneo-online|victoria|desafio):' then raise exception 'Elegí uno de tus sobres ganados.'; end if;
   if not exists(select 1 from album_privado.sobres where usuario_id=u and clave=clave_sobre)
    and not exists(select 1 from album_privado.eventos(u,j) e where e.clave=clave_sobre) then raise exception 'Esa actividad todavía no figura como completada. Actualizá el álbum.'; end if;
  end if;
  select figuritas into cartas from album_privado.sobres where usuario_id=u and clave=clave_sobre;
  if not found then
   cartas:='{}';
   if clave_sobre='bienvenida' then
    select id into f from album_privado.catalogo where base_id='jugador:'||j::text and rareza='comun' and acabado='normal' and activa;
    if f is not null then cartas:=array_append(cartas,f); end if;
   end if;
   n:=case when clave_sobre='bienvenida' or clave_sobre like 'torneo:%' or clave_sobre like 'torneo-online:%' then 6 else 3 end;
   for i in (cardinality(cartas)+1)..n loop
    f:=album_privado.sortear(random(),random());
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
   if not exists(select 1 from album_privado.catalogo where id=oferta and activa) or not exists(select 1 from album_privado.catalogo where id=pedido and activa) then raise exception 'Esa figurita todavía no está disponible en esta edición con foto.'; end if;
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
     from album_privado.inventario v where v.usuario_id=p.usuario_id and exists(select 1 from album_privado.catalogo ca where ca.id=v.figurita_id and ca.activa) and album_privado.disponibles(p.usuario_id,v.figurita_id)>0) as repetidas
   from album_privado.perfiles p join public.jugadores jj on jj.id=club_online_privado.jugador(p.usuario_id)
   where p.compartir and p.usuario_id<>u and exists(select 1 from album_privado.inventario v where v.usuario_id=p.usuario_id and exists(select 1 from album_privado.catalogo ca where ca.id=v.figurita_id and ca.activa) and album_privado.disponibles(p.usuario_id,v.figurita_id)>0)
   order by jj.nombre,p.usuario_id limit 100
  ) x),'[]'::jsonb);
 end if;

 select jsonb_build_object(
  'catalogo',album_privado.catalogo_publico(),'jugadorId',j,'hoy',hoy,'compartir',coalesce((select compartir from album_privado.perfiles where usuario_id=u),false),
  'bienvenida',not exists(select 1 from album_privado.sobres where usuario_id=u and clave='bienvenida'),
  'recompensas',coalesce((select jsonb_agg(e order by e.fecha,e.clave) from (
   select ev.* from album_privado.eventos(u,j) ev where not exists(select 1 from album_privado.sobres so where so.usuario_id=u and so.clave=ev.clave) order by ev.fecha,ev.clave limit 100
  ) e),'[]'::jsonb),
  'inventario',coalesce((select jsonb_agg(jsonb_build_object('id',figurita_id,'cantidad',cantidad,'disponibles',album_privado.disponibles(u,figurita_id))) from album_privado.inventario where usuario_id=u and cantidad>0 and exists(select 1 from album_privado.catalogo ca where ca.id=figurita_id and ca.activa)),'[]'::jsonb),
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
notify pgrst,'reload schema';
