-- Archivo deportivo público. El estado privado, cuentas, relojes y PGN original no se publican.
create schema partidas_publicas_privado;
revoke all on schema partidas_publicas_privado from public;
grant usage on schema partidas_publicas_privado to anon,authenticated,service_role;

create view partidas_publicas_privado.oficiales as
select l.id,l.blancas_id,l.negras_id,l.resultado,l.torneo,l.created_at,l.dia,
 coalesce(nullif(trim(w.apodo),''),w.nombre) blancas,
 coalesce(nullif(trim(b.apodo),''),b.nombre) negras,
 p.torneo_id,
 case when p.estado->>'ritmo' in ('3+2','5+3','10+3') then p.estado->>'ritmo' else null end ritmo,
 case when jsonb_typeof(p.estado->'movimientos')='array' and p.estado->>'porElo'='true'
      then p.estado->'movimientos' else '[]'::jsonb end movimientos
from public.partidas_club_online l
join public.jugadores w on w.id=l.blancas_id
join public.jugadores b on b.id=l.negras_id
left join public.online_partidas p on p.id=l.id
where p.id is null or p.estado->>'fase'='terminada';
revoke all on partidas_publicas_privado.oficiales from public,anon,authenticated;

create function partidas_publicas_privado.listar(p_jugador uuid,p_desde integer,p_limite integer)
returns jsonb language sql stable security definer set search_path='' as $$
 with candidatas as (
  select * from partidas_publicas_privado.oficiales where p_jugador in (blancas_id,negras_id)
 ), pagina as (
  select jsonb_build_object('id',id,'blancasId',blancas_id,'negrasId',negras_id,
   'blancas',blancas,'negras',negras,'resultado',resultado,'torneo',torneo,'torneoId',torneo_id,
   'fecha',created_at,'dia',dia,'ritmo',ritmo,'mediasJugadas',jsonb_array_length(movimientos),
   'reproducible',jsonb_array_length(movimientos)>0) datos,created_at,id
  from candidatas order by created_at desc,id desc
  limit greatest(1,least(coalesce(p_limite,12),24)) offset greatest(coalesce(p_desde,0),0)
 ) select jsonb_build_object('total',(select count(*) from candidatas),
  'reproducibles',(select count(*) from candidatas where jsonb_array_length(movimientos)>0),
  'partidas',coalesce((select jsonb_agg(datos order by created_at desc,id desc) from pagina),'[]'::jsonb));
$$;
create function partidas_publicas_privado.obtener(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',id,'blancasId',blancas_id,'negrasId',negras_id,
  'blancas',blancas,'negras',negras,'resultado',resultado,'torneo',torneo,'torneoId',torneo_id,
  'fecha',created_at,'dia',dia,'ritmo',ritmo,'mediasJugadas',jsonb_array_length(movimientos),
  'reproducible',jsonb_array_length(movimientos)>0,'movimientos',movimientos)
 from partidas_publicas_privado.oficiales where id=p_id;
$$;
revoke all on function partidas_publicas_privado.listar(uuid,integer,integer),partidas_publicas_privado.obtener(uuid) from public;
grant execute on function partidas_publicas_privado.listar(uuid,integer,integer),partidas_publicas_privado.obtener(uuid) to anon,authenticated,service_role;

create function public.partidas_publicas_jugador(p_jugador uuid,p_desde integer default 0,p_limite integer default 12)
returns jsonb language sql stable security invoker set search_path='' as $$
 select partidas_publicas_privado.listar(p_jugador,p_desde,p_limite);
$$;
create function public.partida_publica_club(p_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select partidas_publicas_privado.obtener(p_id);
$$;
revoke all on function public.partidas_publicas_jugador(uuid,integer,integer),public.partida_publica_club(uuid) from public;
grant execute on function public.partidas_publicas_jugador(uuid,integer,integer),public.partida_publica_club(uuid) to anon,authenticated,service_role;
notify pgrst,'reload schema';
