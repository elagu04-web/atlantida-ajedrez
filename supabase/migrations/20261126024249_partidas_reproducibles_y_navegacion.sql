-- El archivo de repaso incluye sólo encuentros con movimientos guardados.
-- El historial deportivo y el cálculo del Elo conservan todos los resultados.
create or replace function partidas_publicas_privado.listar(p_jugador uuid,p_desde integer,p_limite integer)
returns jsonb language sql stable security definer set search_path='' as $$
 with candidatas as (
  select * from partidas_publicas_privado.oficiales
  where p_jugador in (blancas_id,negras_id) and jsonb_array_length(movimientos) between 1 and 2000
 ), pagina as (
  select jsonb_build_object('id',id,'blancasId',blancas_id,'negrasId',negras_id,
   'blancas',blancas,'negras',negras,'resultado',resultado,'torneo',torneo,'torneoId',torneo_id,
   'fecha',created_at,'dia',dia,'ritmo',ritmo,'mediasJugadas',jsonb_array_length(movimientos),
   'reproducible',true) datos,created_at,id
  from candidatas order by created_at desc,id desc
  limit greatest(1,least(coalesce(p_limite,12),24)) offset greatest(coalesce(p_desde,0),0)
 ) select jsonb_build_object('total',(select count(*) from candidatas),'reproducibles',(select count(*) from candidatas),
  'partidas',coalesce((select jsonb_agg(datos order by created_at desc,id desc) from pagina),'[]'::jsonb));
$$;

create function partidas_publicas_privado.navegar(p_jugador uuid,p_partida uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with ordenadas as (
  select id,row_number() over w posicion,count(*) over() total,
   lag(id) over w anterior,lead(id) over w siguiente
  from partidas_publicas_privado.oficiales
  where p_jugador in (blancas_id,negras_id) and jsonb_array_length(movimientos) between 1 and 2000
  window w as(order by created_at desc,id desc)
 ) select jsonb_build_object('posicion',posicion,'total',total,'anterior',anterior,'siguiente',siguiente)
 from ordenadas where id=p_partida;
$$;
revoke all on function partidas_publicas_privado.navegar(uuid,uuid) from public;
grant execute on function partidas_publicas_privado.navegar(uuid,uuid) to anon,authenticated,service_role;
create function public.navegacion_partidas_jugador(p_jugador uuid,p_partida uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select partidas_publicas_privado.navegar(p_jugador,p_partida);
$$;
revoke all on function public.navegacion_partidas_jugador(uuid,uuid) from public;
grant execute on function public.navegacion_partidas_jugador(uuid,uuid) to anon,authenticated,service_role;
notify pgrst,'reload schema';
