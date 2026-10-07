-- Aditiva: no modifica tablas de jugadores, torneos ni políticas existentes.
-- Ejecutar una vez en el SQL Editor del proyecto Supabase del club.
begin;
create extension if not exists http with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.desafios_diarios (
  dia date primary key,
  puzzle_id text not null unique check (puzzle_id ~ '^[a-zA-Z0-9]{5}$'),
  rating integer not null check (rating between 1700 and 1900),
  datos jsonb not null,
  creado_en timestamptz not null default now()
);
create table if not exists public.desafios_busquedas (
  dia date primary key,
  ultimo_intento timestamptz not null default now()
);
create table if not exists public.desafios_participantes (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 40 and nombre !~ '[[:cntrl:]]'),
  creado_en timestamptz not null default now()
);
create unique index if not exists desafios_nombre_unico on public.desafios_participantes(lower(nombre));
create table if not exists public.desafios_resueltos (
  usuario_id uuid not null references public.desafios_participantes(usuario_id) on delete cascade,
  dia date not null references public.desafios_diarios(dia),
  resuelto_en timestamptz not null default now(),
  primary key(usuario_id,dia)
);
alter table public.desafios_diarios enable row level security;
alter table public.desafios_busquedas enable row level security;
alter table public.desafios_participantes enable row level security;
alter table public.desafios_resueltos enable row level security;
revoke all on public.desafios_diarios,public.desafios_busquedas,public.desafios_participantes,public.desafios_resueltos from anon,authenticated;

create or replace function public.desafios_actualizar()
returns boolean language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare
  d_dia date := (now() at time zone 'America/Montevideo')::date;
  d_status integer; d_contenido text; d_json jsonb; d_candidato jsonb;
begin
  if exists(select 1 from public.desafios_diarios where dia=d_dia) then return true; end if;
  if not pg_try_advisory_xact_lock(18300407) then return false; end if;
  if exists(select 1 from public.desafios_diarios where dia=d_dia) then return true; end if;
  if exists(select 1 from public.desafios_busquedas where dia=d_dia and ultimo_intento>now()-interval '10 minutes') then return false; end if;
  insert into public.desafios_busquedas(dia) values(d_dia)
    on conflict(dia) do update set ultimo_intento=now();
  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS','8000');
    select status,content into d_status,d_contenido from extensions.http_get('https://lichess.org/api/puzzle/batch/mix?difficulty=harder&nb=5');
    perform extensions.http_reset_curlopt();
    if d_status<>200 then return false; end if;
    d_json := d_contenido::jsonb;
    for d_candidato in
      select x from jsonb_array_elements(d_json->'puzzles') x
      where (x->'puzzle'->>'rating')::integer between 1700 and 1900
      and not exists(select 1 from public.desafios_diarios where puzzle_id=x->'puzzle'->>'id')
      order by abs((x->'puzzle'->>'rating')::integer-1800)
    loop
      if jsonb_typeof(d_candidato->'puzzle'->'solution')<>'array'
        or jsonb_array_length(d_candidato->'puzzle'->'solution')%2<>1
        or d_candidato->'game'->>'pgn' is null then continue; end if;
      insert into public.desafios_diarios(dia,puzzle_id,rating,datos) values
        (d_dia,d_candidato->'puzzle'->>'id',(d_candidato->'puzzle'->>'rating')::integer,
         jsonb_build_object('game',jsonb_build_object('pgn',d_candidato->'game'->>'pgn'),'puzzle',d_candidato->'puzzle'));
      return true;
    end loop;
    return false;
  exception when others then
    perform extensions.http_reset_curlopt();
    return false;
  end;
end;
$$;
revoke all on function public.desafios_actualizar() from public,anon,authenticated;

create or replace function public.obtener_desafio_diario()
returns jsonb language plpgsql security definer set search_path=pg_catalog, public as $$
declare d_dia date := (now() at time zone 'America/Montevideo')::date; d_resultado jsonb;
begin
  perform public.desafios_actualizar();
  select jsonb_build_object('fecha',dia::text,'datos',datos) into d_resultado
    from public.desafios_diarios where dia=d_dia;
  return d_resultado;
end;
$$;
revoke all on function public.obtener_desafio_diario() from public;
grant execute on function public.obtener_desafio_diario() to anon,authenticated;

create or replace function public.registrar_desafio_resuelto(p_dia date,p_puzzle_id text,p_nombre text,p_solucion jsonb)
returns boolean language plpgsql security definer set search_path=pg_catalog, public as $$
declare d_usuario uuid := auth.uid(); d_dia date := (now() at time zone 'America/Montevideo')::date; d_solucion jsonb;
begin
  if d_usuario is null then raise exception 'Iniciá sesión para participar.'; end if;
  if p_dia<>d_dia then raise exception 'Solo cuenta el problema de hoy.'; end if;
  select datos->'puzzle'->'solution' into d_solucion from public.desafios_diarios where dia=d_dia and puzzle_id=p_puzzle_id;
  if d_solucion is null or p_solucion is distinct from d_solucion then raise exception 'La solución no coincide con el problema de hoy.'; end if;
  if char_length(trim(p_nombre)) not between 2 and 40 or trim(p_nombre) ~ '[[:cntrl:]]' then raise exception 'Elegí un nombre público de 2 a 40 caracteres.'; end if;
  insert into public.desafios_participantes(usuario_id,nombre) values(d_usuario,trim(p_nombre))
    on conflict(usuario_id) do update set nombre=excluded.nombre;
  insert into public.desafios_resueltos(usuario_id,dia) values(d_usuario,d_dia) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.registrar_desafio_resuelto(date,text,text,jsonb) from public,anon;
grant execute on function public.registrar_desafio_resuelto(date,text,text,jsonb) to authenticated;

create or replace function public.mi_desafio_resuelto()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('nombre',p.nombre,'resuelto',exists(
    select 1 from public.desafios_resueltos r where r.usuario_id=auth.uid()
      and r.dia=(now() at time zone 'America/Montevideo')::date))
  from public.desafios_participantes p where p.usuario_id=auth.uid();
$$;
revoke all on function public.mi_desafio_resuelto() from public,anon;
grant execute on function public.mi_desafio_resuelto() to authenticated;

create or replace function public.tabla_rachas_desafios()
returns table(nombre text,racha_actual bigint,mejor_racha bigint,total bigint,ultimo_dia date)
language sql stable security definer set search_path=pg_catalog,public as $$
  with dias as (
    select usuario_id,dia,dia-(row_number() over(partition by usuario_id order by dia))::integer as grupo
      from public.desafios_resueltos
  ), rachas as (
    select usuario_id,count(*) as longitud,max(dia) as fin from dias group by usuario_id,grupo
  ), resumen as (
    select usuario_id,max(longitud) as mejor,sum(longitud)::bigint as total,max(fin) as ultimo from rachas group by usuario_id
  )
  select p.nombre,
    case when s.ultimo>=(now() at time zone 'America/Montevideo')::date-1
      then (select r.longitud from rachas r where r.usuario_id=s.usuario_id and r.fin=s.ultimo) else 0 end,
    s.mejor,s.total,s.ultimo
    from resumen s join public.desafios_participantes p on p.usuario_id=s.usuario_id
    order by 2 desc,3 desc,4 desc,p.nombre limit 200;
$$;
revoke all on function public.tabla_rachas_desafios() from public;
grant execute on function public.tabla_rachas_desafios() to anon,authenticated;

-- Primer intento 03:05 UTC = 00:05 Uruguay. Reintenta cada hora si falla la fuente.
-- Tras guardar el problema del día, los siguientes intentos no hacen solicitudes HTTP.
-- El nombre estable impide duplicar el trabajo.
select cron.schedule('atlantida-desafio-diario','5 * * * *','select public.desafios_actualizar();');
select public.desafios_actualizar();
notify pgrst, 'reload schema';
commit;
