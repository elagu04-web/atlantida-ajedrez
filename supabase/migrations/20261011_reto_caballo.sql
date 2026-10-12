-- Reto semanal del caballo. No modifica rachas, torneos ni el juego del otro proyecto.
begin;
create table if not exists public.minijuegos_caballo (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 semana date not null,
 recorrido integer[] not null check(cardinality(recorrido) between 2 and 64),
 casillas integer generated always as (cardinality(recorrido)) stored,
 actualizado_en timestamptz not null default now(),
 primary key(usuario_id,semana)
);
alter table public.minijuegos_caballo enable row level security;
revoke all on public.minijuegos_caballo from public,anon,authenticated;
create index if not exists minijuegos_caballo_clasificacion on public.minijuegos_caballo(semana,casillas desc);

create or replace function public.obtener_reto_caballo()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 with fecha as (select (now() at time zone 'America/Montevideo')::date as dia),
 reto as (select dia-((extract(isodow from dia))::integer-1) as semana from fecha)
 select jsonb_build_object('semana',semana::text,'fin',(semana+7)::text,
 'inicial',((56+((semana-date '2026-10-05')/7)*17)%64+64)%64,
 'registrable',true,'marca',coalesce((select c.casillas from public.minijuegos_caballo c where c.usuario_id=auth.uid() and c.semana=reto.semana),0)) from reto;
$$;
revoke all on function public.obtener_reto_caballo() from public;
grant execute on function public.obtener_reto_caballo() to anon,authenticated;

create or replace function public.registrar_recorrido_caballo(p_semana date,p_recorrido jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 d_usuario uuid:=auth.uid();d_reto jsonb;d_camino integer[]:='{}';d_v jsonb;d_i integer;d_anterior integer;
 d_dr integer;d_dc integer;d_marca integer;
begin
 if d_usuario is null then raise exception 'Iniciá sesión para guardar tu marca.';end if;
 perform public.mi_nombre_jugador_desafio();
 d_reto:=public.obtener_reto_caballo();
 if p_semana is distinct from (d_reto->>'semana')::date then raise exception 'El reto cambió de semana. Empezá el recorrido nuevo.';end if;
 if p_recorrido is null or jsonb_typeof(p_recorrido)<>'array' then raise exception 'Recorrido inválido.';end if;
 if jsonb_array_length(p_recorrido) not between 2 and 64 then raise exception 'El recorrido debe tener de 2 a 64 casillas.';end if;
 for d_v in select value from jsonb_array_elements(p_recorrido) loop
  if jsonb_typeof(d_v)<>'number' or d_v::text !~ '^(0|[1-9][0-9]?)$' then raise exception 'Casilla inválida.';end if;
  d_i:=d_v::text::integer;
  if d_i not between 0 and 63 or d_i=any(d_camino) then raise exception 'No se puede repetir una casilla.';end if;
  if d_anterior is null then
   if d_i<>(d_reto->>'inicial')::integer then raise exception 'Todos empiezan en la casilla del reto.';end if;
  else
   d_dr:=abs(d_i/8-d_anterior/8);d_dc:=abs(d_i%8-d_anterior%8);
   if not ((d_dr=2 and d_dc=1) or (d_dr=1 and d_dc=2)) then raise exception 'El caballo tiene que saltar en L.';end if;
  end if;
  d_camino:=array_append(d_camino,d_i);d_anterior:=d_i;
 end loop;
 insert into public.minijuegos_caballo(usuario_id,semana,recorrido) values(d_usuario,p_semana,d_camino)
 on conflict(usuario_id,semana) do update set recorrido=excluded.recorrido,actualizado_en=now()
 where cardinality(excluded.recorrido)>minijuegos_caballo.casillas;
 select casillas into d_marca from public.minijuegos_caballo where usuario_id=d_usuario and semana=p_semana;
 return jsonb_build_object('marca',d_marca,'semana',p_semana::text);
end;
$$;
revoke all on function public.registrar_recorrido_caballo(date,jsonb) from public,anon;
grant execute on function public.registrar_recorrido_caballo(date,jsonb) to authenticated;

create or replace function public.tabla_reto_caballo()
returns table(jugador_id text,nombre text,casillas integer,puesto bigint,es_mio boolean)
language sql stable security definer set search_path=pg_catalog,public as $$
 with identidades as (
 select u.id as usuario_id,min(j.id::text) as jugador_id,min(coalesce(nullif(trim(j.apodo),''),trim(j.nombre))) as nombre
 from auth.users u join public.jugadores j on lower(trim(j.email))=lower(trim(u.email))
 where u.email is not null group by u.id having count(*)=1
 ), marcas as (
 select i.jugador_id,i.nombre,c.casillas,rank() over(order by c.casillas desc) as puesto,c.usuario_id=auth.uid() as es_mio
 from public.minijuegos_caballo c join identidades i using(usuario_id)
 where c.semana=(public.obtener_reto_caballo()->>'semana')::date
 ) select * from marcas order by puesto,nombre,jugador_id limit 200;
$$;
revoke all on function public.tabla_reto_caballo() from public;
grant execute on function public.tabla_reto_caballo() to anon,authenticated;
notify pgrst,'reload schema';
select public.obtener_reto_caballo();
commit;
