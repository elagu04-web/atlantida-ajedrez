-- La selección final queda centrada en jugadores y campeones.
-- Se conservan internamente los tres identificadores del prototipo, sin repartirlos.
alter table album_privado.catalogo add column activa boolean not null default true;
update album_privado.catalogo set activa=false where id in ('especial:ernesto-sudamericano','especial:martes','especial:aprender');
insert into album_privado.catalogo(id,jugador_id,peso) values
 ('especial:matias-septiembre',null,3),('especial:gabi-noviembre',null,3),('especial:fonchi-siciliana',null,3);
-- Los sobres se ganan por actividad comprobada desde el lanzamiento del álbum.
create function album_privado.eventos(p_usuario uuid,p_jugador uuid)
returns table(clave text,titulo text,fecha timestamptz,cantidad integer)
language sql stable set search_path='' as $$
 select 'torneo:'||t.id::text,'Participaste en '||t.nombre,coalesce(t.iniciado_en,t.created_at),6
 from public.torneos t
 where t.estado='finalizado' and t.formato in ('suizo','round-robin')
 and coalesce(t.iniciado_en,t.created_at)>='2026-11-24 03:00:00+00'::timestamptz
 and not coalesce(t.excluir_elo,false) and t.jugadores_ids ? p_jugador::text
 and exists(select 1 from jsonb_array_elements(coalesce(t.rondas,'[]')) r
 cross join lateral jsonb_array_elements(coalesce(r->'emparejamientos','[]')) e
 where e->>'negrasId' is not null and e->>'resultado' in ('1-0','0-1','1/2-1/2')
 and p_jugador::text in (e->>'blancasId',e->>'negrasId'))
 union all
 select 'torneo-online:'||t.id::text,'Participaste en '||t.nombre,t.actualizada,6
 from public.online_torneos t join public.online_torneo_jugadores inscr on inscr.torneo_id=t.id
 where inscr.usuario_id=p_usuario and t.estado='finalizado'
 and t.actualizada>='2026-11-24 03:00:00+00'::timestamptz
 and exists(select 1 from public.online_torneo_cruces c left join public.online_partidas p on p.id=c.partida_id
 where c.torneo_id=t.id and c.negras_id is not null and p_usuario in (c.blancas_id,c.negras_id)
 and (c.resultado_manual in ('1-0','0-1','1/2-1/2') or (p.estado->>'fase'='terminada' and p.estado->>'resultado' in ('1-0','0-1','1/2-1/2'))))
 union all
 select 'victoria:'||p.id::text,'Ganaste una partida online',p.actualizada,3
 from public.online_partidas p
 where p.actualizada>='2026-11-24 03:00:00+00'::timestamptz
 and p.estado->>'fase'='terminada' and p.estado->>'resultado' in ('1-0','0-1')
 and p.estado->>'colorCreador' in ('w','b') and p.rival_id is not null and p.creador_id<>p.rival_id
 and jsonb_array_length(coalesce(p.estado->'movimientos','[]'))>=4
 and p_usuario=case when (p.estado->>'resultado'='1-0')=(p.estado->>'colorCreador'='w') then p.creador_id else p.rival_id end
 union all
 select 'desafio:'||d.dia::text,'Resolviste el desafío del '||to_char(d.dia,'DD/MM/YYYY'),d.resuelto_en,3
 from public.desafios_resueltos d
 where d.usuario_id=p_usuario and d.dia>='2026-11-24'::date
 and not exists(select 1 from public.desafios_fallados f where f.usuario_id=d.usuario_id and f.dia=d.dia);
$$;
revoke all on function album_privado.eventos(uuid,uuid) from public,anon,authenticated;

-- Rareza (70/25/5) y acabado (80/15/5) se sortean por separado.
alter table album_privado.catalogo add column rareza text not null default 'comun' check(rareza in ('comun','rara','mitica'));
alter table album_privado.catalogo add column acabado text not null default 'normal' check(acabado in ('normal','foil','full-art'));
alter table album_privado.catalogo add column base_id text;
update album_privado.catalogo set base_id=id;
update album_privado.catalogo c set rareza=j.rareza from jsonb_to_recordset('[{"id":"jugador:20237542-c3f6-4ba4-8400-e9eb3b438101","rareza":"comun"},{"id":"jugador:d0f87bfb-dddf-42ca-beae-f58ee746ab4d","rareza":"comun"},{"id":"jugador:171197d2-fa9e-4a6a-ac3e-3139fbc7ff62","rareza":"comun"},{"id":"jugador:40edddb0-5302-4798-8cf2-80f60317d856","rareza":"rara"},{"id":"jugador:3f3f4d16-98af-482c-9e9b-3f4d6b31883f","rareza":"comun"},{"id":"jugador:b069e33f-1687-4e1f-bacc-1ac7e0d3040d","rareza":"comun"},{"id":"jugador:67c27aa0-dda6-4825-a18c-9d5ee7c90c10","rareza":"comun"},{"id":"jugador:f88a3bd3-bedd-41dc-a115-17ba1378b6bb","rareza":"rara"},{"id":"jugador:2cba15cf-586b-420b-a144-de5ee6d85031","rareza":"comun"},{"id":"jugador:d1c933d4-197b-434a-924c-d404421e02a6","rareza":"rara"},{"id":"jugador:3e6c34fb-23a2-4a15-8de0-009cf51493db","rareza":"comun"},{"id":"jugador:dce120b2-90ea-41b7-848e-9ba4a8f84613","rareza":"comun"},{"id":"jugador:cf9bbe7e-0c1a-4cf7-8708-287ace9daece","rareza":"comun"},{"id":"jugador:21885761-c357-4357-9bb7-a1a6402ea32c","rareza":"comun"},{"id":"jugador:4c2a5198-dc88-49c3-ac3d-d4808e105aa3","rareza":"comun"},{"id":"jugador:f05c3ccd-7807-473c-a922-cd13659625ee","rareza":"comun"},{"id":"jugador:2c191207-a48a-418b-a8ef-210a00e5acc4","rareza":"comun"},{"id":"jugador:adaff79d-3a75-4532-8ff7-3ec7238a21b6","rareza":"rara"},{"id":"jugador:df2fa121-939c-4b5e-84c5-6eb1ca7dc880","rareza":"comun"},{"id":"jugador:4fd7b5ad-c10d-4056-b781-521869063829","rareza":"comun"},{"id":"jugador:db7d23fa-0254-4d6a-91ac-9eb9b41c5c76","rareza":"comun"},{"id":"jugador:a92621c8-239d-4b93-8775-b8246fbcb506","rareza":"comun"},{"id":"jugador:c587628b-2aba-42a6-ba64-63d1d7d510f2","rareza":"comun"},{"id":"jugador:15d021cc-3310-48bf-a7b5-1e521a3c8288","rareza":"comun"},{"id":"jugador:3783ab38-e327-4bf1-888f-7d039b7963e6","rareza":"comun"},{"id":"jugador:df3d49d9-508f-4a76-997c-ee525886f7dc","rareza":"comun"},{"id":"jugador:3059d6c3-44f3-49f7-8b57-8156cae5d0f0","rareza":"comun"},{"id":"jugador:97fa10ca-29a9-4db7-8061-e39414e0c65f","rareza":"comun"},{"id":"jugador:16c583d5-59c1-4a13-af42-575836df9e7f","rareza":"comun"},{"id":"jugador:2000cd88-92a9-4189-baa2-d1ecb89b17e9","rareza":"comun"},{"id":"jugador:44970cf2-4a55-4b9f-93b0-9c9c59ef2557","rareza":"comun"},{"id":"jugador:59086bb0-6a79-43d1-9a88-aea5b4a1436c","rareza":"comun"},{"id":"jugador:aa10113f-5c5c-43a1-8aa3-d9ea29a332f4","rareza":"comun"},{"id":"jugador:49441026-0a70-4e0c-904c-8022c4a5fa3a","rareza":"rara"},{"id":"jugador:95537d79-bdf2-4a78-9e7a-eaa440cde8b2","rareza":"comun"},{"id":"jugador:2eca2178-89cd-47d5-9b72-c7b1c65477bb","rareza":"comun"},{"id":"jugador:d0eb0985-e27c-4eaa-87ff-88c04fa5864b","rareza":"comun"},{"id":"jugador:9cae9999-af4e-48e8-af60-6c25794fad09","rareza":"comun"},{"id":"jugador:6f1b8d21-76f7-4a49-8434-c18f48f91172","rareza":"comun"},{"id":"jugador:9178067e-5b8e-4883-bf17-ac0945ea923a","rareza":"rara"},{"id":"jugador:e315beb3-22ac-4037-a88b-5493824930e5","rareza":"comun"},{"id":"jugador:b298bece-6c2e-4df0-bedc-031c84278c32","rareza":"comun"},{"id":"jugador:1d5a51c1-5ff8-4114-bb0e-d9706ce7b1c3","rareza":"comun"},{"id":"jugador:26671876-13e1-4dbc-8d1c-b249955d83c3","rareza":"comun"},{"id":"jugador:54c74e69-50f0-4324-bcdb-55b8db09a2b5","rareza":"comun"},{"id":"jugador:8232ee05-946c-4f44-bbc8-c64b341bfc11","rareza":"comun"},{"id":"jugador:010839b6-1534-4e59-b9e8-0bc635a36f25","rareza":"comun"},{"id":"jugador:0d188c7b-c5b7-4e75-852b-9a5d17379fdb","rareza":"comun"},{"id":"jugador:0d7d2441-36ff-42b6-a73a-aaef56cff202","rareza":"comun"},{"id":"jugador:d19509c4-4858-4509-a587-1080ce3f3c7d","rareza":"comun"},{"id":"jugador:83728a3c-b558-447a-9ded-570e89112a3c","rareza":"comun"},{"id":"jugador:f9cd88c1-b14f-4755-8d3d-90de781ea7d9","rareza":"comun"},{"id":"especial:gabi-octubre","rareza":"mitica"},{"id":"especial:fonchi-perfecto","rareza":"mitica"},{"id":"especial:tio-ale","rareza":"rara"},{"id":"especial:bruno-minga","rareza":"rara"},{"id":"especial:larita-nacional","rareza":"rara"},{"id":"especial:matias-septiembre","rareza":"mitica"},{"id":"especial:gabi-noviembre","rareza":"rara"},{"id":"especial:fonchi-siciliana","rareza":"rara"}]'::jsonb) as j(id text,rareza text) where c.id=j.id;
alter table album_privado.catalogo alter column base_id set not null;
insert into album_privado.catalogo(id,jugador_id,peso,activa,rareza,acabado,base_id)
 select c.id||':'||v.acabado,null,c.peso,true,c.rareza,v.acabado,c.id
 from album_privado.catalogo c cross join (values('foil'),('full-art')) v(acabado) where c.activa and c.acabado='normal';

-- Sólo se publican retratos reales. Los números de la edición se fijan antes
-- de la entrega inicial y luego las incorporaciones se añaden al final.
alter table album_privado.catalogo add column numero integer;
alter table album_privado.catalogo add column nombre text;
alter table album_privado.catalogo add column detalle text;
alter table album_privado.catalogo add column serie text;
alter table album_privado.catalogo add column foto text;
update album_privado.catalogo set activa=false;
update album_privado.catalogo c set activa=true,numero=m.numero,nombre=m.nombre,detalle=m.detalle,serie=m.serie,foto=m.foto,rareza=m.rareza
 from jsonb_to_recordset('[{"id":"jugador:20237542-c3f6-4ba4-8400-e9eb3b438101","numero":1,"nombre":"Agustín Baudry","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"20237542-c3f6-4ba4-8400-e9eb3b438101","foto":"/imagenes/retratos/agustin-baudry-tablero-20261103-transparente.webp","rareza":"comun"},{"id":"jugador:171197d2-fa9e-4a6a-ac3e-3139fbc7ff62","numero":2,"nombre":"Agustin Nuñez","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"171197d2-fa9e-4a6a-ac3e-3139fbc7ff62","foto":"/imagenes/retratos/agustin-nunez-tablero-20261103-transparente.webp","rareza":"comun"},{"id":"jugador:40edddb0-5302-4798-8cf2-80f60317d856","numero":3,"nombre":"Ale Visi","detalle":"Alejandro Visillac","serie":"Jugadores","jugador_id":"40edddb0-5302-4798-8cf2-80f60317d856","foto":"/imagenes/retratos/ale-visi-tablero-20261103-transparente.webp","rareza":"rara"},{"id":"jugador:67c27aa0-dda6-4825-a18c-9d5ee7c90c10","numero":4,"nombre":"Blanco Ernesto Rudemar","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"67c27aa0-dda6-4825-a18c-9d5ee7c90c10","foto":"/imagenes/retratos/ernesto-blanco-tablero-20261101-transparente.webp","rareza":"comun"},{"id":"jugador:f88a3bd3-bedd-41dc-a115-17ba1378b6bb","numero":5,"nombre":"Bruno Nicolini","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"f88a3bd3-bedd-41dc-a115-17ba1378b6bb","foto":"/imagenes/retratos/bruno-album-transparente.webp","rareza":"rara"},{"id":"jugador:2cba15cf-586b-420b-a144-de5ee6d85031","numero":6,"nombre":"Camilo","detalle":"Camilo La Rosa","serie":"Jugadores","jugador_id":"2cba15cf-586b-420b-a144-de5ee6d85031","foto":"/imagenes/retratos/camilo-tablero-20261027-transparente.webp","rareza":"comun"},{"id":"jugador:d1c933d4-197b-434a-924c-d404421e02a6","numero":7,"nombre":"Coronel Gabriel","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"d1c933d4-197b-434a-924c-d404421e02a6","foto":"/imagenes/retratos/gabi-transparente.webp","rareza":"rara"},{"id":"jugador:3e6c34fb-23a2-4a15-8de0-009cf51493db","numero":8,"nombre":"Cristian González","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"3e6c34fb-23a2-4a15-8de0-009cf51493db","foto":"/imagenes/retratos/cristian-gonzalez-tablero-20261103-transparente.webp","rareza":"comun"},{"id":"jugador:dce120b2-90ea-41b7-848e-9ba4a8f84613","numero":9,"nombre":"CuadrosMan","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"dce120b2-90ea-41b7-848e-9ba4a8f84613","foto":"/imagenes/retratos/cuadroman-tablero-20261027-transparente.webp","rareza":"comun"},{"id":"jugador:21885761-c357-4357-9bb7-a1a6402ea32c","numero":10,"nombre":"De Los Reyes","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"21885761-c357-4357-9bb7-a1a6402ea32c","foto":"/imagenes/retratos/mauro-tablero-20261027-transparente.webp","rareza":"comun"},{"id":"jugador:2c191207-a48a-418b-a8ef-210a00e5acc4","numero":11,"nombre":"Ezequiel Núñez","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"2c191207-a48a-418b-a8ef-210a00e5acc4","foto":"/imagenes/retratos/ezequiel-nunez-tablero-20261110-transparente.webp","rareza":"comun"},{"id":"jugador:adaff79d-3a75-4532-8ff7-3ec7238a21b6","numero":12,"nombre":"Fonchi","detalle":"Fabián Fuentes (Fonchi)","serie":"Jugadores","jugador_id":"adaff79d-3a75-4532-8ff7-3ec7238a21b6","foto":"/imagenes/retratos/fonchi-transparente.webp","rareza":"rara"},{"id":"jugador:db7d23fa-0254-4d6a-91ac-9eb9b41c5c76","numero":13,"nombre":"Fernando","detalle":"Fernando Torterolo","serie":"Jugadores","jugador_id":"db7d23fa-0254-4d6a-91ac-9eb9b41c5c76","foto":"/imagenes/retratos/fernando-tablero-20261027-transparente.webp","rareza":"comun"},{"id":"jugador:3059d6c3-44f3-49f7-8b57-8156cae5d0f0","numero":14,"nombre":"Ismael González","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"3059d6c3-44f3-49f7-8b57-8156cae5d0f0","foto":"/imagenes/retratos/ismael-gonzalez-tablero-20261103-transparente.webp","rareza":"comun"},{"id":"jugador:97fa10ca-29a9-4db7-8061-e39414e0c65f","numero":15,"nombre":"Jorge","detalle":"Jorge Franquez","serie":"Jugadores","jugador_id":"97fa10ca-29a9-4db7-8061-e39414e0c65f","foto":"/imagenes/retratos/jorge-franquez-tablero-20261103-transparente.webp","rareza":"comun"},{"id":"jugador:44970cf2-4a55-4b9f-93b0-9c9c59ef2557","numero":16,"nombre":"Juan Diego","detalle":"Juan Diego Montenegro","serie":"Jugadores","jugador_id":"44970cf2-4a55-4b9f-93b0-9c9c59ef2557","foto":"/imagenes/retratos/juan-diego-tablero-20261027-transparente.webp","rareza":"comun"},{"id":"jugador:aa10113f-5c5c-43a1-8aa3-d9ea29a332f4","numero":17,"nombre":"Kiara Frizza","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"aa10113f-5c5c-43a1-8aa3-d9ea29a332f4","foto":"/imagenes/retratos/kiara-tablero-20261027-transparente.webp","rareza":"comun"},{"id":"jugador:49441026-0a70-4e0c-904c-8022c4a5fa3a","numero":18,"nombre":"Lara Escaris","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"49441026-0a70-4e0c-904c-8022c4a5fa3a","foto":"/imagenes/retratos/lara-transparente.webp","rareza":"rara"},{"id":"jugador:2eca2178-89cd-47d5-9b72-c7b1c65477bb","numero":19,"nombre":"Luis Perez Selios","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"2eca2178-89cd-47d5-9b72-c7b1c65477bb","foto":"/imagenes/retratos/luis-perez-tablero-20261027-transparente.webp","rareza":"comun"},{"id":"jugador:6f1b8d21-76f7-4a49-8434-c18f48f91172","numero":20,"nombre":"Marco Ábalo","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"6f1b8d21-76f7-4a49-8434-c18f48f91172","foto":"/imagenes/retratos/marco-transparente.webp","rareza":"comun"},{"id":"jugador:9178067e-5b8e-4883-bf17-ac0945ea923a","numero":21,"nombre":"Matias","detalle":"Matías Iriondo","serie":"Jugadores","jugador_id":"9178067e-5b8e-4883-bf17-ac0945ea923a","foto":"/imagenes/retratos/matias-transparente.webp","rareza":"rara"},{"id":"jugador:b298bece-6c2e-4df0-bedc-031c84278c32","numero":22,"nombre":"Pablo Pereira","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"b298bece-6c2e-4df0-bedc-031c84278c32","foto":"/imagenes/retratos/pablo-pereira-tablero-20261027-transparente.webp","rareza":"comun"},{"id":"jugador:0d188c7b-c5b7-4e75-852b-9a5d17379fdb","numero":23,"nombre":"Víctor","detalle":"Rodriguez Farias","serie":"Jugadores","jugador_id":"0d188c7b-c5b7-4e75-852b-9a5d17379fdb","foto":"/imagenes/retratos/victor-tablero-20261027-transparente.webp","rareza":"comun"},{"id":"jugador:f9cd88c1-b14f-4755-8d3d-90de781ea7d9","numero":24,"nombre":"Yamandú Martínez","detalle":"Atlántida Ajedrez","serie":"Jugadores","jugador_id":"f9cd88c1-b14f-4755-8d3d-90de781ea7d9","foto":"/imagenes/retratos/yamandu-foto-20261027-transparente.webp","rareza":"comun"},{"id":"especial:gabi-octubre","numero":25,"nombre":"Gabi · campeón de octubre","detalle":"La remontada de octubre de 2026","serie":"Campeones","jugador_id":null,"foto":"/imagenes/retratos/gabi-transparente.webp","rareza":"mitica"},{"id":"especial:fonchi-perfecto","numero":26,"nombre":"Fonchi · cinco de cinco","detalle":"Martes 3 de noviembre de 2026","serie":"Campeones","jugador_id":null,"foto":"/imagenes/retratos/fonchi-transparente.webp","rareza":"mitica"},{"id":"especial:tio-ale","numero":27,"nombre":"El Tío Ale","detalle":"Ganador del segundo torneo de noviembre de 2026","serie":"Campeones","jugador_id":null,"foto":"/imagenes/retratos/ale-visi-tablero-20261103-transparente.webp","rareza":"rara"},{"id":"especial:bruno-minga","numero":28,"nombre":"Bruno en Espacio Minga","detalle":"Un título del club en Canelones","serie":"Campeones","jugador_id":null,"foto":"/imagenes/retratos/bruno-album-transparente.webp","rareza":"rara"},{"id":"especial:larita-nacional","numero":29,"nombre":"Larita sigue sumando","detalle":"Mejor femenino · final nacional Sub 16 de 2026","serie":"Campeones","jugador_id":null,"foto":"/imagenes/retratos/lara-transparente.webp","rareza":"rara"},{"id":"especial:matias-septiembre","numero":30,"nombre":"Matías · campeón de septiembre","detalle":"Campeón mensual del club · septiembre de 2026","serie":"Campeones","jugador_id":null,"foto":"/imagenes/retratos/matias-transparente.webp","rareza":"mitica"},{"id":"especial:gabi-noviembre","numero":31,"nombre":"Gabi · un final con polémica","detalle":"Campeón del torneo del 17 de noviembre de 2026","serie":"Campeones","jugador_id":null,"foto":"/imagenes/retratos/gabi-transparente.webp","rareza":"rara"},{"id":"especial:fonchi-siciliana","numero":32,"nombre":"Fonchi · la Siciliana","detalle":"Campeón del torneo del 13 de octubre de 2026","serie":"Campeones","jugador_id":null,"foto":"/imagenes/retratos/fonchi-transparente.webp","rareza":"rara"}]'::jsonb) as m(id text,numero integer,nombre text,detalle text,serie text,jugador_id uuid,foto text,rareza text)
 where c.base_id=m.id;
-- Las copias anteriores se conservan en el inventario, sin volver a repartirse
-- hasta que su jugador tenga foto y el administrador lo incorpore.
update album_privado.intercambios t set estado='cancelado' where estado='pendiente' and
 (not exists(select 1 from album_privado.catalogo ca where ca.id=t.ofrece and ca.activa) or not exists(select 1 from album_privado.catalogo ca where ca.id=t.pide and ca.activa));
create unique index album_numero_normal on album_privado.catalogo(numero) where activa and acabado='normal';
create function album_privado.catalogo_publico() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'numero',c.numero,'nombre',c.nombre,'detalle',c.detalle,'serie',c.serie,'jugadorId',c.jugador_id,'foto',c.foto,'peso',c.peso,'rareza',c.rareza) order by c.numero),'[]'::jsonb)
 from album_privado.catalogo c where activa and acabado='normal';
$$;
revoke all on function album_privado.catalogo_publico() from public;
grant usage on schema album_privado to anon;
grant execute on function album_privado.catalogo_publico() to anon,authenticated;
create function public.catalogo_album_club() returns jsonb language sql stable security invoker set search_path='' as $$select album_privado.catalogo_publico();$$;
revoke all on function public.catalogo_album_club() from public;
grant execute on function public.catalogo_album_club() to anon,authenticated;
create function album_privado.sortear(p_rareza double precision,p_acabado double precision)
returns text language plpgsql set search_path='' as $$
declare r text;v text;f text;
begin
 if p_rareza is null or p_acabado is null or p_rareza<0 or p_rareza>=1 or p_acabado<0 or p_acabado>=1 then raise exception 'Sorteo fuera de rango.'; end if;
 r:=case when p_rareza<0.70 then 'comun' when p_rareza<0.95 then 'rara' else 'mitica' end;
 v:=case when p_acabado<0.80 then 'normal' when p_acabado<0.95 then 'foil' else 'full-art' end;
 select id into f from album_privado.catalogo where activa and rareza=r and acabado=v order by random() limit 1;
 if f is null then raise exception 'No hay figuritas en ese grupo.'; end if;
 return f;
end;
$$;
revoke all on function album_privado.sortear(double precision,double precision) from public,anon,authenticated;
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
 if p_accion not in ('resumen','sobre','compartir','mercado','proponer','responder','agregar') or p_accion is null then raise exception 'Acción de álbum desconocida.'; end if;
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
 if p_accion in ('sobre','compartir','proponer','responder','agregar') then
  if otro is not null then
   perform pg_advisory_xact_lock(hashtextextended('album:'||least(u,otro)::text,0));
   perform pg_advisory_xact_lock(hashtextextended('album:'||greatest(u,otro)::text,0));
  else perform pg_advisory_xact_lock(hashtextextended('album:'||u::text,0)); end if;
 end if;

 if p_accion='agregar' then
  if u<>'f2c0ea67-e4e3-454e-81ee-f3175df90b3d'::uuid then raise exception 'Sólo el administrador agrega figuritas.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('album-catalogo',0));
  select id,coalesce(nullif(apodo,''),nombre) as nombre,nombre as completo,foto_url into nuevo_jugador from public.jugadores where id=(p_datos->>'jugadorId')::uuid and nullif(trim(foto_url),'') is not null;
  if not found then raise exception 'Primero cargá una foto en el perfil del jugador.'; end if;
  if not exists(select 1 from album_privado.catalogo where id='jugador:'||nuevo_jugador.id::text and activa) then
   select coalesce(max(numero),0)+1 into numero_nuevo from album_privado.catalogo where activa;
   insert into album_privado.catalogo(id,jugador_id,peso,activa,rareza,acabado,base_id,numero,nombre,detalle,serie,foto)
   select 'jugador:'||nuevo_jugador.id::text||case when v.acabado='normal' then '' else ':'||v.acabado end,
    case when v.acabado='normal' then nuevo_jugador.id else null end,10,true,'comun',v.acabado,'jugador:'||nuevo_jugador.id::text,numero_nuevo,nuevo_jugador.nombre,nuevo_jugador.completo,'Jugadores',nuevo_jugador.foto_url
   from (values('normal'),('foil'),('full-art')) v(acabado)
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
    select id into f from album_privado.catalogo where jugador_id=j and activa;
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
