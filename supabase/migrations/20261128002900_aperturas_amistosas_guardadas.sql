-- El álbum se deriva de partidas terminadas guardadas, nunca del explorador.
-- Las amistosas conservan la privacidad de las mesas: sólo las lee su jugador
-- autenticado. La visita pública mantiene el archivo deportivo oficial.
create function partidas_publicas_privado.para_aperturas(p_jugador uuid)
returns table(id uuid,fecha timestamptz,resultado text,color text,rival text,movimientos jsonb,amistosa boolean)
language sql stable security invoker set search_path='' as $$
 select o.id,o.created_at,o.resultado,
  case when o.blancas_id=p_jugador then 'w' else 'b' end,
  case when o.blancas_id=p_jugador then o.negras else o.blancas end,o.movimientos,false
 from partidas_publicas_privado.oficiales o
 where p_jugador in(o.blancas_id,o.negras_id) and jsonb_array_length(o.movimientos) between 4 and 2000
 union all
 select p.id,p.actualizada,p.estado->>'resultado',
  case when p.creador_id=auth.uid() then p.estado->>'colorCreador'
   else case p.estado->>'colorCreador' when 'w' then 'b' else 'w' end end,
  case when (p.creador_id=auth.uid())=(p.estado->>'colorCreador'='w')
   then coalesce(nullif(trim(p.estado->>'negras'),''),'Rival')
   else coalesce(nullif(trim(p.estado->>'blancas'),''),'Rival') end,
  p.estado->'movimientos',true
 from public.online_partidas p
 where p_jugador=club_online_privado.jugador(auth.uid())
  and auth.uid() in(p.creador_id,p.rival_id) and p.rival_id is not null and p.creador_id<>p.rival_id
  and p.estado->>'fase'='terminada' and p.estado->>'porElo'='false'
  and p.estado->>'colorCreador' in('w','b') and p.estado->>'resultado' in('1-0','0-1','1/2-1/2')
  and jsonb_array_length(case when jsonb_typeof(p.estado->'movimientos')='array' then p.estado->'movimientos' else '[]'::jsonb end) between 4 and 2000
  and not exists(select 1 from partidas_publicas_privado.oficiales o where o.id=p.id and jsonb_array_length(o.movimientos)>=4);
$$;
revoke all on function partidas_publicas_privado.para_aperturas(uuid) from public,anon,authenticated;

create or replace function partidas_publicas_privado.aperturas(p_jugador uuid,p_desde integer,p_limite integer)
returns jsonb language sql stable security definer set search_path='' as $$
 with candidatas as materialized(select * from partidas_publicas_privado.para_aperturas(p_jugador)), pagina as (
  select jsonb_build_object('id',id,'fecha',fecha,'resultado',resultado,'color',color,'rival',rival,'amistosa',amistosa,
   'movimientos',(select jsonb_agg(m.valor order by m.orden) from jsonb_array_elements(movimientos) with ordinality m(valor,orden) where m.orden<=40)) datos,fecha,id
  from candidatas order by fecha,id
  limit greatest(1,least(coalesce(p_limite,100),100)) offset greatest(coalesce(p_desde,0),0)
 ) select jsonb_build_object('total',(select count(*) from candidatas),'partidas',coalesce((select jsonb_agg(datos order by fecha,id) from pagina),'[]'::jsonb));
$$;

create or replace function album_privado.sobre_aperturas(p_partida uuid,p_abrir boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare usuario uuid:=auth.uid();jugador uuid;
begin
 if usuario is null then raise exception 'Iniciá sesión para abrir tus sobres.' using errcode='42501';end if;
 jugador:=club_online_privado.jugador(usuario);
 if jugador is null then raise exception 'Vinculá tu jugador del club.' using errcode='42501';end if;
 if p_abrir then
  if p_partida is null or not exists(select 1 from partidas_publicas_privado.para_aperturas(jugador) where id=p_partida)
   then raise exception 'Ese sobre no corresponde a una partida guardada tuya.' using errcode='42501';end if;
  insert into album_privado.sobres_aperturas_abiertos(usuario_id,partida_id) values(usuario,p_partida) on conflict do nothing;
 end if;
 return jsonb_build_object('abiertos',coalesce((select jsonb_agg(partida_id order by abierto_en,partida_id)
  from album_privado.sobres_aperturas_abiertos where usuario_id=usuario),'[]'::jsonb));
end;
$$;
notify pgrst,'reload schema';
