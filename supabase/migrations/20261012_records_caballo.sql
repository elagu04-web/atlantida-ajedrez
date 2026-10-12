-- Conserva las marcas semanales y muestra los récords de todo el historial.
begin;
create or replace function public.obtener_reto_caballo()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 with fecha as (select (now() at time zone 'America/Montevideo')::date as dia),
 reto as (select dia-((extract(isodow from dia))::integer-1) as semana from fecha)
 select jsonb_build_object('semana',semana::text,'fin',(semana+7)::text,
 'inicial',((56+((semana-date '2026-10-05')/7)*17)%64+64)%64,
 'registrable',true,
 'marca',coalesce((select c.casillas from public.minijuegos_caballo c where c.usuario_id=auth.uid() and c.semana=reto.semana),0),
 'record',coalesce((select max(c.casillas) from public.minijuegos_caballo c where c.usuario_id=auth.uid()),0)) from reto;
$$;
revoke all on function public.obtener_reto_caballo() from public;
grant execute on function public.obtener_reto_caballo() to anon,authenticated;

create or replace function public.tabla_reto_caballo_records()
returns table(jugador_id text,nombre text,casillas integer,puesto bigint,es_mio boolean)
language sql stable security definer set search_path=pg_catalog,public as $$
 with identidades as (
 select u.id as usuario_id,min(j.id::text) as jugador_id,min(coalesce(nullif(trim(j.apodo),''),trim(j.nombre))) as nombre
 from auth.users u join public.jugadores j on lower(trim(j.email))=lower(trim(u.email))
 where u.email is not null group by u.id having count(*)=1
 ), mejores as (
 select usuario_id,max(c.casillas) as casillas from public.minijuegos_caballo c group by usuario_id
 ), marcas as (
 select i.jugador_id,i.nombre,c.casillas,rank() over(order by c.casillas desc) as puesto,coalesce(c.usuario_id=auth.uid(),false) as es_mio
 from mejores c join identidades i using(usuario_id)
 ) select * from marcas order by puesto,nombre,jugador_id limit 200;
$$;
revoke all on function public.tabla_reto_caballo_records() from public;
grant execute on function public.tabla_reto_caballo_records() to anon,authenticated;
notify pgrst,'reload schema';
select public.obtener_reto_caballo();
select * from public.tabla_reto_caballo_records();
commit;
