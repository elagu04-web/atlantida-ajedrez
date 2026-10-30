begin;
-- Stamp the rules on NEW games, including games created by tournament SQL.
-- Existing active games and their clocks are deliberately untouched.
create schema online_reglas_privado;
revoke all on schema online_reglas_privado from public,anon,authenticated;
create function online_reglas_privado.inicio() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.estado->>'fase' in('espera','activa') and jsonb_array_length(new.estado->'movimientos')=0 then
  new.estado:=new.estado||jsonb_build_object('inicioLibre',2);
 end if;
 return new;
end $$;
revoke all on function online_reglas_privado.inicio() from public,anon,authenticated;
create trigger online_inicio_libre before insert on public.online_partidas for each row execute function online_reglas_privado.inicio();

create or replace function torneos_online_privado.obtener(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=torneos_online_privado.usuario();t public.online_torneos;begin
 select * into t from public.online_torneos where id=p_id;
 if not found then raise exception 'No encontramos el torneo.';end if;
 if t.estado='en_curso' and t.ronda_actual>=t.max_rondas and not exists(
 select 1 from public.online_torneo_cruces c left join public.online_partidas p on p.id=c.partida_id where c.torneo_id=p_id and c.negras_id is not null and c.resultado_manual is null and coalesce(p.estado->>'fase','pendiente')<>'terminada') then
 update public.online_torneos set estado='finalizado',version=version+1,actualizada=now() where id=p_id and estado='en_curso' returning * into t;
 if not found then select * into t from public.online_torneos where id=p_id;end if;
 end if;
 return jsonb_build_object('torneo',to_jsonb(t),'jugadores',coalesce((select jsonb_agg((to_jsonb(j)||jsonb_build_object('jugador_id',coalesce(j.jugador_id,club_online_privado.jugador(j.usuario_id)))) order by j.creada,j.usuario_id) from public.online_torneo_jugadores j where j.torneo_id=p_id),'[]'),
 'cruces',coalesce((select jsonb_agg(jsonb_build_object('ronda',c.ronda,'mesa',c.mesa,'blancasId',c.blancas_id,'negrasId',c.negras_id,'partidaId',c.partida_id,
 'resultado',coalesce(c.resultado_manual,case when p.estado->>'fase'='terminada' then p.estado->>'resultado' else null end),'manual',c.resultado_manual is not null,
 'fase',case when c.negras_id is null then 'descanso' when c.resultado_manual is not null then 'terminada' else coalesce(p.estado->>'fase','coordinar') end,
 'vence',case when p.estado->>'fase'='activa' then (p.estado->>'desde')::numeric+case when p.estado->>'inicioLibre'='2' and jsonb_array_length(p.estado->'movimientos')<4 then 120000 when p.estado->>'turno'='w' then (p.estado->>'blancasMs')::numeric else (p.estado->>'negrasMs')::numeric end else null end,
 'coordinacion',case when u in(c.blancas_id,c.negras_id) then (select to_jsonb(co)-'torneo_id'-'ronda'-'mesa' from torneos_online_privado.coordinacion co where (co.torneo_id,co.ronda,co.mesa)=(c.torneo_id,c.ronda,c.mesa)) else null end) order by c.ronda,c.mesa)
 from public.online_torneo_cruces c left join public.online_partidas p on p.id=c.partida_id where c.torneo_id=p_id),'[]'));
end $$;


notify pgrst,'reload schema';
commit;
