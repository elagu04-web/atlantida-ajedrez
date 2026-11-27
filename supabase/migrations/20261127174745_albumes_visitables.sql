-- Lectura social solicitada por el club. Sólo identidades deportivas públicas y
-- figuritas obtenidas; nunca cuentas, correos, sobres, reservas o intercambios.
create schema albumes_publicos_privado;
revoke all on schema albumes_publicos_privado from public;
grant usage on schema albumes_publicos_privado to anon,authenticated,service_role;

create function albumes_publicos_privado.leer(p_jugador uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with cuentas as materialized (
  select u.id usuario,club_online_privado.jugador(u.id) jugador from auth.users u
 ), existencias as materialized (
  select q.jugador,i.figurita_id,sum(i.cantidad)::integer cantidad,c.base_id
  from album_privado.inventario i
  join cuentas q on q.usuario=i.usuario_id
  join album_privado.catalogo c on c.id=i.figurita_id and c.activa
  where q.jugador is not null and i.cantidad>0 and (p_jugador is null or q.jugador=p_jugador)
  group by q.jugador,i.figurita_id,c.base_id
 ), jugadores as (
  select j.id,coalesce(nullif(trim(j.apodo),''),j.nombre) nombre,j.foto_url foto,
   (select count(distinct e.base_id) from existencias e where e.jugador=j.id) figuritas,
   (select count(*) from existencias e where e.jugador=j.id) versiones
  from public.jugadores j where p_jugador is null or j.id=p_jugador
 ) select case when p_jugador is null then jsonb_build_object(
  'jugadores',coalesce((select jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'foto',foto,'figuritas',figuritas,'versiones',versiones) order by figuritas desc,lower(nombre),id) from jugadores),'[]'::jsonb))
 else (select jsonb_build_object('jugador',jsonb_build_object('id',id,'nombre',nombre,'foto',foto,'figuritas',figuritas,'versiones',versiones),
  'inventario',coalesce((select jsonb_agg(jsonb_build_object('id',e.figurita_id,'cantidad',e.cantidad) order by e.figurita_id) from existencias e where e.jugador=j.id),'[]'::jsonb)) from jugadores j) end;
$$;
revoke all on function albumes_publicos_privado.leer(uuid) from public;
grant execute on function albumes_publicos_privado.leer(uuid) to anon,authenticated,service_role;

create function public.albumes_publicos_club(p_jugador uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select albumes_publicos_privado.leer(p_jugador);
$$;
revoke all on function public.albumes_publicos_club(uuid) from public;
grant execute on function public.albumes_publicos_club(uuid) to anon,authenticated,service_role;
notify pgrst,'reload schema';
