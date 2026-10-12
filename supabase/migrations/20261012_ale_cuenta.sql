-- Ale adaptativo y archivo privado de partidas. Conserva avances de la versión local.
begin;
create table if not exists public.ale_partidas_completadas (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 partida_id text not null check(partida_id ~ '^[a-zA-Z0-9-]{1,100}$'),
 resultado text check(resultado in ('victoria','derrota','tablas')),
 orden bigint generated always as identity,
 creado_en timestamptz not null default now(),
 primary key(usuario_id,partida_id)
);
alter table public.ale_partidas_completadas enable row level security;
revoke all on public.ale_partidas_completadas from public,anon,authenticated;

create or replace function public.obtener_progreso_ale()
returns jsonb language plpgsql security definer set search_path='' as $$
declare d_usuario uuid:=auth.uid();d_partidas jsonb;d_resultados jsonb;d_nivel integer:=1400;d_medidas integer:=0;d_paso integer;d_fila record;
begin
 if d_usuario is null then raise exception 'Iniciá sesión para guardar tu recorrido con Ale.';end if;
 select coalesce(jsonb_agg(partida_id order by orden),'[]'::jsonb),coalesce(jsonb_object_agg(partida_id,resultado) filter(where resultado is not null),'{}'::jsonb)
 into d_partidas,d_resultados from public.ale_partidas_completadas where usuario_id=d_usuario;
 for d_fila in select resultado from public.ale_partidas_completadas where usuario_id=d_usuario order by orden loop
  d_paso:=case when d_medidas<10 then 50 when d_medidas<30 then 25 else 10 end;
  d_nivel:=greatest(1320,least(3000,d_nivel+case when d_fila.resultado is null then 50 when d_fila.resultado='victoria' then d_paso when d_fila.resultado='derrota' then -d_paso else 0 end));
  if d_fila.resultado is not null then d_medidas:=d_medidas+1;end if;
 end loop;
 return jsonb_build_object('version',1,'partidas',d_partidas,'resultados',d_resultados,'elo',d_nivel);
end;
$$;
revoke all on function public.obtener_progreso_ale() from public,anon;
grant execute on function public.obtener_progreso_ale() to authenticated;

create or replace function public.sincronizar_progreso_ale(p_partidas jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d_usuario uuid:=auth.uid();d_id jsonb;d_clave text;d_resultado text;
begin
 if d_usuario is null then raise exception 'Iniciá sesión para guardar tu recorrido con Ale.';end if;
 if p_partidas is null or jsonb_typeof(p_partidas)<>'array' then raise exception 'Recorrido inválido.';end if;
 if jsonb_array_length(p_partidas)>10000 then raise exception 'Recorrido demasiado largo.';end if;
 for d_id in select value from jsonb_array_elements(p_partidas) loop
  d_clave:=case when jsonb_typeof(d_id)='string' then d_id#>>'{}' else d_id->>'id' end;
  d_resultado:=case when jsonb_typeof(d_id)='object' then d_id->>'resultado' else null end;
  if d_clave is null or d_clave !~ '^[a-zA-Z0-9-]{1,100}$' or (d_resultado is not null and d_resultado not in ('victoria','derrota','tablas')) then raise exception 'Partida inválida.';end if;
 end loop;
 -- Insertar en el orden recibido; repetir una partida no agrega puntos.
 insert into public.ale_partidas_completadas(usuario_id,partida_id,resultado)
 select d_usuario,case when jsonb_typeof(value)='string' then value#>>'{}' else value->>'id' end,case when jsonb_typeof(value)='object' then value->>'resultado' else null end
 from jsonb_array_elements(p_partidas) with ordinality order by ordinality
 on conflict(usuario_id,partida_id) do nothing;
 return public.obtener_progreso_ale();
end;
$$;
revoke all on function public.sincronizar_progreso_ale(jsonb) from public,anon;
grant execute on function public.sincronizar_progreso_ale(jsonb) to authenticated;

create table if not exists public.partidas_bots_usuario (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 partida_id text not null check(partida_id ~ '^[a-zA-Z0-9-]{1,100}$'),
 partida jsonb not null,
 fecha timestamptz not null,
 primary key(usuario_id,partida_id)
);
alter table public.partidas_bots_usuario enable row level security;
revoke all on public.partidas_bots_usuario from public,anon,authenticated;
create index if not exists partidas_bots_usuario_fecha on public.partidas_bots_usuario(usuario_id,fecha desc);
create or replace function public.registrar_partida_bot(p_partida jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d_usuario uuid:=auth.uid();d_fecha timestamptz;d_id text;d_resultado text;
begin
 if d_usuario is null then raise exception 'Iniciá sesión para guardar tus partidas.';end if;
 if p_partida is null or jsonb_typeof(p_partida)<>'object' then raise exception 'Partida inválida.';end if;
 d_id:=p_partida->>'id';
 if d_id is null or d_id !~ '^[a-zA-Z0-9-]{1,100}$'
 or coalesce(p_partida->>'perfil','') not in ('ale','fonchi','victor','matias','stockfish')
 or coalesce(p_partida->>'color','') not in ('w','b')
 or coalesce(p_partida->>'resultado','') not in ('1-0','0-1','1/2-1/2')
 or jsonb_typeof(p_partida->'pgn') is distinct from 'string'
 or length(p_partida->>'pgn') not between 1 and 200000
 or coalesce(p_partida->>'jugadas','') !~ '^[1-9][0-9]{0,3}$'
 or (p_partida->>'jugadas')::integer>1000 then raise exception 'Partida inválida.';end if;
 begin d_fecha:=(p_partida->>'fecha')::timestamptz;exception when others then raise exception 'Fecha inválida.';end;
 if d_fecha is null then raise exception 'Fecha inválida.';end if;
 insert into public.partidas_bots_usuario(usuario_id,partida_id,partida,fecha)
 values(d_usuario,d_id,p_partida-'sincronizada',d_fecha)
 on conflict(usuario_id,partida_id) do update set partida=excluded.partida,fecha=excluded.fecha
 where excluded.fecha>=partidas_bots_usuario.fecha;
 if p_partida->>'perfil'='ale' and (p_partida->>'jugadas')::integer>=4 then
  d_resultado:=case when p_partida->>'resultado'='1/2-1/2' then 'tablas' when (p_partida->>'color'='w' and p_partida->>'resultado'='1-0') or (p_partida->>'color'='b' and p_partida->>'resultado'='0-1') then 'victoria' else 'derrota' end;
  insert into public.ale_partidas_completadas(usuario_id,partida_id,resultado) values(d_usuario,d_id,d_resultado) on conflict do nothing;
 end if;
 return jsonb_build_object('guardada',true,'progreso',public.obtener_progreso_ale());
end;
$$;
revoke all on function public.registrar_partida_bot(jsonb) from public,anon;
grant execute on function public.registrar_partida_bot(jsonb) to authenticated;

create or replace function public.obtener_partidas_bots(p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d_usuario uuid:=auth.uid();d_partidas jsonb;
begin
 if d_usuario is null then raise exception 'Iniciá sesión para ver tus partidas.';end if;
 if p_offset<0 or p_offset>100000 then raise exception 'Página inválida.';end if;
 select coalesce(jsonb_agg(partida order by fecha desc,partida_id),'[]'::jsonb) into d_partidas
 from (select partida,fecha,partida_id from public.partidas_bots_usuario where usuario_id=d_usuario order by fecha desc,partida_id limit 50 offset p_offset) p;
 return d_partidas;
end;
$$;
revoke all on function public.obtener_partidas_bots(integer) from public,anon;
grant execute on function public.obtener_partidas_bots(integer) to authenticated;
notify pgrst,'reload schema';
select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='sincronizar_progreso_ale') as ale_listo;
commit;
