-- Usa el archivo deportivo público ya existente. No recibe jugadas del cliente
-- ni concede acceso a las mesas privadas: sólo los primeros 40 medios movimientos.
create function partidas_publicas_privado.aperturas(p_jugador uuid,p_desde integer,p_limite integer)
returns jsonb language sql stable security definer set search_path='' as $$
 with candidatas as (
  select * from partidas_publicas_privado.oficiales
  where p_jugador in (blancas_id,negras_id) and jsonb_array_length(movimientos) between 4 and 2000
 ), pagina as (
  select jsonb_build_object('id',id,'fecha',created_at,'resultado',resultado,
   'color',case when blancas_id=p_jugador then 'w' else 'b' end,
   'rival',case when blancas_id=p_jugador then negras else blancas end,
   'movimientos',(select jsonb_agg(m.valor order by m.orden) from jsonb_array_elements(movimientos) with ordinality m(valor,orden) where m.orden<=40)) datos,
   created_at,id
  from candidatas order by created_at,id
  limit greatest(1,least(coalesce(p_limite,100),100)) offset greatest(coalesce(p_desde,0),0)
 ) select jsonb_build_object('total',(select count(*) from candidatas),
  'partidas',coalesce((select jsonb_agg(datos order by created_at,id) from pagina),'[]'::jsonb));
$$;
revoke all on function partidas_publicas_privado.aperturas(uuid,integer,integer) from public;
grant execute on function partidas_publicas_privado.aperturas(uuid,integer,integer) to anon,authenticated,service_role;

create function public.aperturas_partidas_jugador(p_jugador uuid,p_desde integer default 0,p_limite integer default 100)
returns jsonb language sql stable security invoker set search_path='' as $$
 select partidas_publicas_privado.aperturas(p_jugador,p_desde,p_limite);
$$;
revoke all on function public.aperturas_partidas_jugador(uuid,integer,integer) from public;
grant execute on function public.aperturas_partidas_jugador(uuid,integer,integer) to anon,authenticated,service_role;
notify pgrst,'reload schema';
