-- Vincula las rachas a la cuenta y al jugador usado en las inscripciones.
-- Requiere la migración de desafíos ya activada. No modifica jugadores ni torneos.
begin;

-- Los nombres pueden repetirse: la identidad es auth.uid(), no el nombre.
drop index if exists public.desafios_nombre_unico;
alter table public.desafios_participantes drop constraint if exists desafios_participantes_nombre_check;
alter table public.desafios_participantes add constraint desafios_participantes_nombre_check
  check (char_length(trim(nombre)) between 1 and 200 and nombre !~ '[[:cntrl:]]');

create or replace function public.mi_nombre_jugador_desafio()
returns text language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare d_usuario uuid := auth.uid(); d_email text; d_nombre text; d_cantidad integer;
begin
  if d_usuario is null then raise exception 'Iniciá sesión para participar.'; end if;
  select lower(trim(u.email)) into d_email from auth.users u where u.id=d_usuario;
  select count(*),min(coalesce(nullif(trim(j.apodo),''),trim(j.nombre))) into d_cantidad,d_nombre
    from public.jugadores j where d_email is not null and lower(trim(j.email))=d_email;
  if d_cantidad=0 then raise exception 'Vinculá tu jugador del club antes de guardar la racha.'; end if;
  if d_cantidad<>1 then raise exception 'Tu cuenta tiene varios jugadores vinculados. Avisale al club.'; end if;
  if char_length(d_nombre) not between 1 and 200 or d_nombre ~ '[[:cntrl:]]' then
    raise exception 'El nombre del jugador necesita ser corregido por el club.';
  end if;
  return d_nombre;
end;
$$;
revoke all on function public.mi_nombre_jugador_desafio() from public,anon;
grant execute on function public.mi_nombre_jugador_desafio() to authenticated;

create or replace function public.registrar_desafio_resuelto(p_dia date,p_puzzle_id text,p_nombre text,p_solucion jsonb)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare d_usuario uuid := auth.uid(); d_dia date := (now() at time zone 'America/Montevideo')::date; d_solucion jsonb; d_nombre text;
begin
  if d_usuario is null then raise exception 'Iniciá sesión para participar.'; end if;
  if p_dia is distinct from d_dia then raise exception 'Solo cuenta el problema de hoy.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(d_usuario::text||':'||d_dia::text,0));
  if exists(select 1 from public.desafios_fallados where usuario_id=d_usuario and dia=d_dia) then raise exception 'Un error cortó la racha: el problema de hoy ya no suma.'; end if;
  select datos->'puzzle'->'solution' into d_solucion from public.desafios_diarios where dia=d_dia and puzzle_id=p_puzzle_id;
  if d_solucion is null or p_solucion is distinct from d_solucion then raise exception 'La solución no coincide con el problema de hoy.'; end if;
  -- p_nombre permanece por compatibilidad; el servidor obtiene el nombre real.
  d_nombre := public.mi_nombre_jugador_desafio();
  insert into public.desafios_participantes(usuario_id,nombre) values(d_usuario,d_nombre)
    on conflict(usuario_id) do update set nombre=excluded.nombre;
  insert into public.desafios_resueltos(usuario_id,dia) values(d_usuario,d_dia) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.registrar_desafio_resuelto(date,text,text,jsonb) from public,anon;
grant execute on function public.registrar_desafio_resuelto(date,text,text,jsonb) to authenticated;

create or replace function public.tabla_rachas_desafios()
returns table(nombre text,racha_actual bigint,mejor_racha bigint,total bigint,ultimo_dia date)
language sql stable security definer set search_path=pg_catalog,public as $$
  with identidades as (
    select u.id as usuario_id,min(coalesce(nullif(trim(j.apodo),''),trim(j.nombre))) as nombre
      from auth.users u join public.jugadores j on lower(trim(j.email))=lower(trim(u.email))
      where u.email is not null group by u.id having count(*)=1
  ), dias as (
    select usuario_id,dia,dia-(row_number() over(partition by usuario_id order by dia))::integer as grupo
      from public.desafios_resueltos
  ), rachas as (
    select usuario_id,count(*) as longitud,max(dia) as fin from dias group by usuario_id,grupo
  ), resumen as (
    select usuario_id,max(longitud) as mejor,sum(longitud)::bigint as total,max(fin) as ultimo from rachas group by usuario_id
  )
  select i.nombre,
    case when s.ultimo>=(now() at time zone 'America/Montevideo')::date-1
      and not exists(select 1 from public.desafios_fallados f where f.usuario_id=s.usuario_id and f.dia=(now() at time zone 'America/Montevideo')::date)
      then (select r.longitud from rachas r where r.usuario_id=s.usuario_id and r.fin=s.ultimo) else 0 end,
    s.mejor,s.total,s.ultimo
    from resumen s join identidades i on i.usuario_id=s.usuario_id
    order by 2 desc,3 desc,4 desc,i.nombre,s.usuario_id limit 200;
$$;
revoke all on function public.tabla_rachas_desafios() from public;
grant execute on function public.tabla_rachas_desafios() to anon,authenticated;

notify pgrst, 'reload schema';
commit;
